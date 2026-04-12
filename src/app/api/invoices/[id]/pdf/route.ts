// app/api/invoices/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { generateInvoicePDF } from '@/lib/pdf/invoice-pdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ error: 'ID facture manquant' }, { status: 400 });
    }

    const invoice = await db.invoice.findFirst({
      where: {
        id,
        userId: user.id,
      },
      include: {
        client: true,
        items: {
          orderBy: { createdAt: 'asc' },
        },
        devis: {
          select: { number: true },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    const pdfBuffer = await generateInvoicePDF(invoice, user);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="facture-${invoice.number}.pdf"`,
        'Content-Length': String(pdfBuffer.length),
        'Cache-Control': 'private, no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Invoice PDF error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Erreur lors de la génération du PDF',
      },
      { status: 500 }
    );
  }
}
