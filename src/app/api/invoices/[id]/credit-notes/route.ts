import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import {
  canCreateFullCredit, isInvoiceArchiveSnapshot, makeInvoiceSnapshot,
} from '@/lib/invoice-archive';
import { generateFullCreditPdf } from '@/lib/credit-note-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { id } = await params;
    const invoice = await db.invoice.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, archive: { select: { archivedAt: true } } },
    });
    if (!invoice) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    const notes = await db.creditNote.findMany({
      where: { invoiceId: id, userId: user.id },
      orderBy: { issueDate: 'desc' },
      select: {
        id: true, number: true, issueDate: true, reason: true,
        amountHtCents: true, amountVatCents: true, amountTtcCents: true,
      },
    });
    return NextResponse.json({
      notes,
      originalArchived: Boolean(invoice.archive),
      fullCreditAvailable: canCreateFullCredit(invoice.status, notes.length, 1),
    });
  } catch (error) {
    console.error('Credit notes GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const user = await getCurrentUser(true);
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { id } = await params;
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }); }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }
    const data = body as Record<string, unknown>;
    const reason = typeof data.reason === 'string' ? data.reason.trim() : '';
    if (reason.length < 10 || reason.length > 200) {
      return NextResponse.json({ error: 'Motif requis (10 à 200 caractères)' }, { status: 400 });
    }
    if (data.type !== undefined && data.type !== 'full') {
      return NextResponse.json({ error: 'Seul l’avoir intégral est disponible dans cette version.' }, { status: 400 });
    }

    const original = await db.invoice.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        items: { orderBy: { createdAt: 'asc' } },
        devis: { select: { number: true } },
        archive: { select: { snapshot: true } },
      },
    });
    if (!original) return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    if (!['sent', 'paid', 'overdue'].includes(original.status)) {
      return NextResponse.json({ error: 'Un avoir requiert une facture émise, non annulée.' }, { status: 409 });
    }
    const hasArchive = Boolean(original.archive);
    if (hasArchive && !isInvoiceArchiveSnapshot(original.archive?.snapshot)) {
      return NextResponse.json({ error: 'Archive d’origine illisible. Emission de l’avoir bloquée.' }, { status: 409 });
    }
    if (!hasArchive && data.acknowledgeLegacy !== true) {
      return NextResponse.json({
        error: 'Facture ancienne sans archive figée : vérifiez l’original et confirmez la création.',
        requiresLegacyAcknowledgement: true,
      }, { status: 409 });
    }

    // An issued invoice uses the archived source, not current mutable customer settings.
    const snapshot = original.archive && isInvoiceArchiveSnapshot(original.archive.snapshot)
      ? original.archive.snapshot
      : makeInvoiceSnapshot(original, user);

    if (!canCreateFullCredit(original.status, 0, snapshot.totals.amountTtcCents)) {
      return NextResponse.json({ error: 'Montant initial invalide pour un avoir.' }, { status: 409 });
    }

    const credit = await db.$transaction(async (tx) => {
      // Serialize two requests for the same invoice, avoiding duplicate full credits.
      const locked = await tx.$queryRaw<Array<{ id: string }>>`
        SELECT id FROM "Invoice"
        WHERE id = ${id} AND "userId" = ${user.id}
        FOR UPDATE
      `;
      if (!locked.length) throw new Error('INVOICE_NOT_FOUND');
      const current = await tx.invoice.findFirst({
        where: { id, userId: user.id },
        select: { status: true },
      });
      const existing = await tx.creditNote.count({ where: { invoiceId: id, userId: user.id } });
      if (!current || !canCreateFullCredit(current.status, existing, snapshot.totals.amountTtcCents)) {
        throw new Error('CREDIT_CONFLICT');
      }
      const sequence = await tx.user.update({
        where: { id: user.id },
        data: { nextCreditNoteNumber: { increment: 1 } },
        select: { nextCreditNoteNumber: true },
      });
      const number = `AV-${String(sequence.nextCreditNoteNumber - 1).padStart(4, '0')}`;
      const issueDate = new Date();
      const pdf = await generateFullCreditPdf({ number, issueDate, reason, snapshot });
      const sha256 = createHash('sha256').update(pdf).digest('hex');

      return tx.creditNote.create({
        data: {
          userId: user.id, invoiceId: id, number, issueDate, reason,
          amountHtCents: snapshot.totals.amountHtCents,
          amountVatCents: snapshot.totals.amountVatCents,
          amountTtcCents: snapshot.totals.amountTtcCents,
          snapshot: snapshot as unknown as Prisma.InputJsonValue,
          pdfBytes: new Uint8Array(pdf),
          sha256,
        },
        select: {
          id: true, number: true, issueDate: true, reason: true,
          amountHtCents: true, amountVatCents: true, amountTtcCents: true,
        },
      });
    });

    return NextResponse.json({ creditNote: credit }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'CREDIT_CONFLICT') {
      return NextResponse.json({ error: 'Un avoir intégral existe déjà pour cette facture.' }, { status: 409 });
    }
    if (error instanceof Error && error.message === 'INVOICE_NOT_FOUND') {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Conflit de numérotation, veuillez réessayer.' }, { status: 409 });
    }
    console.error('Credit note POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
