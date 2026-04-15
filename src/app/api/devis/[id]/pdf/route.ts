import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { generateDevisPDF } from '@/lib/pdf';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const devis = await db.devis.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!devis) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    const pdfBuffer = await generateDevisPDF(devis, user);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="devis-${devis.number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });
  } catch (error) {
    console.error('Devis PDF error:', error);
    const message = error instanceof Error ? error.message : 'Erreur serveur';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
