import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
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

    const invoice = await db.$transaction(async (tx) => {
      const devis = await tx.devis.findFirst({
        where: { id: devisId, userId: user.id },
        include: {
          items: { orderBy: { createdAt: 'asc' } },
        },
      });

      if (!devis) {
        throw new Error('DEVIS_NOT_FOUND');
      }
      if (devis.status === 'converted') {
        throw new Error('DEVIS_ALREADY_CONVERTED');
      }

      const sequence = await tx.user.update({
        where: { id: user.id },
        data: { nextInvoiceNumber: { increment: 1 } },
        select: { invoicePrefix: true, nextInvoiceNumber: true },
      });

      const invoiceNumber = `${sequence.invoicePrefix}${String(sequence.nextInvoiceNumber - 1).padStart(4, '0')}`;
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const created = await tx.invoice.create({
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

      await tx.devis.update({
        where: { id: devis.id },
        data: { status: 'converted' },
      });

      return created;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Convert devis error:', error);
    if (error instanceof Error) {
      if (error.message === 'DEVIS_NOT_FOUND') {
        return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
      }
      if (error.message === 'DEVIS_ALREADY_CONVERTED') {
        return NextResponse.json(
          { error: 'Ce devis a déjà été converti en facture' },
          { status: 400 },
        );
      }
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflit de conversion: devis déjà converti ou numéro déjà utilisé' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
