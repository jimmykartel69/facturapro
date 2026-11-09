import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ error: 'Lien invalide' }, { status: 404 });
  }

  const snapshot = await db.cgvSnapshot.findUnique({
    where: { token },
    select: { companyName: true, content: true, version: true, clientType: true },
  });
  if (!snapshot) {
    return NextResponse.json({ error: 'CGV introuvables' }, { status: 404 });
  }

  const doc = new PDFDocument({ size: 'A4', margin: 48, autoFirstPage: true });
  const chunks: Buffer[] = [];
  const buffer = await new Promise<Buffer>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    doc.font('Helvetica-Bold').fontSize(17).fillColor('#0f172a')
      .text('CONDITIONS GÉNÉRALES DE VENTE', { width: 490 });
    doc.moveDown(0.4);
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#2563eb')
      .text(snapshot.companyName, { width: 490 });
    doc.moveDown(0.4);
    doc.font('Helvetica').fontSize(8).fillColor('#64748b')
      .text('Version : ' + snapshot.version.slice(0, 12)
        + ' · CGV ' + (snapshot.clientType === 'business' ? 'professionnels' : 'particuliers'));
    doc.moveDown(1.3);
    doc.font('Helvetica').fontSize(9).fillColor('#1e293b')
      .text(snapshot.content, { width: 493, lineGap: 3, align: 'left' });
    doc.moveDown(1.5);
    doc.font('Helvetica-Oblique').fontSize(8).fillColor('#64748b')
      .text('Copie de la version contractuelle archivée. La publication de ce document ne démontre pas à elle seule sa remise au client.');
    doc.end();
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="CGV-' + snapshot.version.slice(0, 12) + '.pdf"',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
