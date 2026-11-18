import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { buildCgvCandidate } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DocType = 'devis' | 'invoice';
type Params = { params: Promise<{ type: string; id: string }> };

async function ownedDocument(type: DocType, id: string, userId: string) {
  if (type === 'devis') {
    const doc = await db.devis.findFirst({
      where: { id, userId },
      include: { client: true },
    });
    return doc ? { client: doc.client, editable: doc.status === 'draft', status: doc.status } : null;
  }
  const doc = await db.invoice.findFirst({
    where: { id, userId },
    include: { client: true, archive: { select: { invoiceId: true } } },
  });
  return doc
    ? { client: doc.client, editable: doc.status === 'draft' && !doc.archive, status: doc.status }
    : null;
}

export async function GET(_request: Request, { params }: Params) {
  const user = await getCurrentUser(true);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  const { type, id } = await params;
  if (type !== 'devis' && type !== 'invoice') {
    return NextResponse.json({ error: 'Type de document invalide' }, { status: 404 });
  }
  const doc = await ownedDocument(type, id, user.id);
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  const current = await db.cgvSnapshot.findFirst({
    where: { documentType: type, documentId: id, userId: user.id, active: true },
    select: { version: true, deliveryMode: true, clientType: true, createdAt: true },
  });
  const candidate = buildCgvCandidate(user, doc.client);
  const differs = Boolean(candidate && (!current
    || current.version !== candidate.version
    || current.deliveryMode !== candidate.deliveryMode
    || current.clientType !== candidate.clientType));
  return NextResponse.json({
    clientType: doc.client.clientType,
    status: doc.status,
    editable: doc.editable,
    current: current && {
      version: current.version.slice(0, 12),
      deliveryMode: current.deliveryMode,
      createdAt: current.createdAt,
    },
    candidate: candidate && {
      version: candidate.version.slice(0, 12),
      deliveryMode: candidate.deliveryMode,
    },
    differs,
    message: !current && !doc.editable
      ? 'Aucune version CGV archivée n’a été retrouvée pour cet ancien document. Ne pas prétendre reconstituer une version antérieure.'
      : undefined,
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function POST(request: Request, { params }: Params) {
  const user = await getCurrentUser(true);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { type, id } = await params;
  if (type !== 'devis' && type !== 'invoice') {
    return NextResponse.json({ error: 'Type de document invalide' }, { status: 404 });
  }
  let body: { action?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
  }
  if (body?.action !== 'keep' && body?.action !== 'refresh') {
    return NextResponse.json({ error: 'Choix CGV invalide' }, { status: 400 });
  }
  const doc = await ownedDocument(type, id, user.id);
  if (!doc) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });
  if (body.action === 'keep') {
    return NextResponse.json({ success: true, changed: false, message: 'Version CGV conservée sur ce document.' });
  }
  if (!doc.editable) {
    return NextResponse.json({
      error: 'Les CGV d’un document envoyé, accepté, converti ou d’une facture émise ne peuvent pas être remplacées.',
    }, { status: 409 });
  }

  const candidate = buildCgvCandidate(user, doc.client);
  if (!candidate) {
    return NextResponse.json({
      error: 'Configurez et activez les CGV applicables à ce type de client avant une mise à jour.',
    }, { status: 422 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Recheck the persisted state in the same transaction as the update.
      if (type === 'devis') {
        const latest = await tx.devis.findFirst({ where: { id, userId: user.id }, select: { status: true } });
        if (!latest || latest.status !== 'draft') throw new Error('DOCUMENT_LOCKED');
      } else {
        const latest = await tx.invoice.findFirst({
          where: { id, userId: user.id },
          include: { archive: { select: { invoiceId: true } } },
        });
        if (!latest || latest.status !== 'draft' || latest.archive) throw new Error('DOCUMENT_LOCKED');
      }

      const current = await tx.cgvSnapshot.findFirst({
        where: { documentType: type, documentId: id, userId: user.id, active: true },
      });
      if (current?.version === candidate.version && current.deliveryMode === candidate.deliveryMode
        && current.clientType === candidate.clientType) {
        return { changed: false, version: current.version.slice(0, 12) };
      }
      if (current) {
        await tx.cgvSnapshot.update({
          where: { id: current.id },
          data: { active: false, supersededAt: new Date() },
        });
      }
      const created = await tx.cgvSnapshot.create({
        data: { ...candidate, documentType: type, documentId: id },
      });
      return { changed: true, version: created.version.slice(0, 12) };
    });

    return NextResponse.json({ success: true, ...result, message: result.changed
      ? 'Nouvelles CGV enregistrées pour ce brouillon. Les anciennes versions restent accessibles.'
      : 'Les CGV du document correspondent déjà aux paramètres actuels.'
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof Error && error.message === 'DOCUMENT_LOCKED') {
      return NextResponse.json({ error: 'Document verrouillé : actualisez la page.' }, { status: 409 });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034')) {
      return NextResponse.json({ error: 'Conflit de modification CGV : actualisez la page.' }, { status: 409 });
    }
    console.error('CGV document refresh error:', error);
    return NextResponse.json({ error: 'Mise à jour des CGV impossible' }, { status: 500 });
  }
}
