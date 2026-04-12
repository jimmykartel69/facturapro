import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { devisId } = body;

    if (!devisId) {
      return NextResponse.json({ error: 'Devis ID requis' }, { status: 400 });
    }

    const devis = await db.devis.findFirst({
      where: { id: devisId, userId: user.id },
      include: {
        client: true,
        items: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!devis) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    if (devis.status === 'converted') {
      return NextResponse.json(
        { error: 'Ce devis a déjà été converti en facture' },
        { status: 400 }
      );
    }

    const invoiceNumber = `${user.invoicePrefix}${String(user.nextInvoiceNumber).padStart(4, '0')}`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await db.invoice.create({
      data: {
        userId: user.id,
        number: invoiceNumber,
        clientId: devis.clientId,
        devisId: devis.id,
        status: 'draft',
        issueDate: new Date(),
        dueDate,
        notes: devis.notes,
        globalDiscount: devis.globalDiscount,
        items: {
          create: devis.items.map((item) => ({
            designation: item.designation,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            tvaRate: item.tvaRate,
          })),
        },
      },
      include: {
        client: true,
        items: true,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { nextInvoiceNumber: { increment: 1 } },
    });

    await db.devis.update({
      where: { id: devis.id },
      data: { status: 'converted' },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Convert devis error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
