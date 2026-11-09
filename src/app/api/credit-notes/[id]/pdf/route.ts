import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    const { id } = await params;
    const credit = await db.creditNote.findFirst({
      where: { id, userId: user.id },
      select: { number: true, pdfBytes: true },
    });
    if (!credit) return NextResponse.json({ error: 'Avoir non trouvé' }, { status: 404 });
    const content = Buffer.from(credit.pdfBytes);
    const filename = credit.number.replace(/[^a-zA-Z0-9_-]/g, '_');
    return new NextResponse(new Uint8Array(content), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="avoir-${filename}.pdf"`,
        'Content-Length': String(content.length),
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Credit note PDF error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
