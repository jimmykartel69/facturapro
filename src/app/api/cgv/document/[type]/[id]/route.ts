import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { prepareCgvQr } from '@/lib/pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Authenticated owner download, distinct from the public unguessable QR link.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ type: string; id: string }> },
) {
  const user = await getCurrentUser(true);
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { type, id } = await params;
  if (!['devis', 'invoice'].includes(type)) {
    return NextResponse.json({ error: 'Document non reconnu' }, { status: 404 });
  }

  const document = type === 'devis'
    ? await db.devis.findFirst({ where: { id, userId: user.id }, include: { client: true } })
    : await db.invoice.findFirst({ where: { id, userId: user.id }, include: { client: true, archive: { select: { invoiceId: true } } } });

  if (!document) return NextResponse.json({ error: 'Document introuvable' }, { status: 404 });

  let snapshot = await db.cgvSnapshot.findUnique({
    where: { documentType_documentId: { documentType: type, documentId: id } },
    select: { token: true },
  });

  if (!snapshot) {
    if (user.showCgv !== true || user.cgvDeliveryMode !== 'qr') {
      return NextResponse.json({ error: 'Mode QR CGV non activé pour ce document.' }, { status: 409 });
    }
    // Never retroactively amend an issued/archived invoice.
    if (type === 'invoice' && 'archive' in document && document.archive) {
      return NextResponse.json({ error: 'Cette facture est déjà archivée sans QR CGV.' }, { status: 409 });
    }

    await prepareCgvQr(user, document.client, type as 'devis' | 'invoice', id);
    snapshot = await db.cgvSnapshot.findUnique({
      where: { documentType_documentId: { documentType: type, documentId: id } },
      select: { token: true },
    });
  }

  if (!snapshot) {
    return NextResponse.json({ error: 'Aucune CGV applicable : vérifiez les paramètres CGV B2C/B2B.' }, { status: 422 });
  }

  return NextResponse.json({ downloadUrl: '/api/cgv/' + snapshot.token + '/pdf' }, {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
