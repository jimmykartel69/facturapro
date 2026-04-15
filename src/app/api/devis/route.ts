import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search') || '';

    const where: Record<string, unknown> = { userId: user.id };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { number: { contains: search } },
        { client: { name: { contains: search } } },
        { client: { company: { contains: search } } },
      ];
    }

    const devisList = await db.devis.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        items: {
          select: {
            designation: true,
            description: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            tvaRate: true,
          },
        },
      },
    });

    return NextResponse.json({ devis: devisList });
  } catch (error) {
    console.error('Devis GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { clientId, items, notes, globalDiscount, validUntil, status } = body;

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Le client et au moins un article sont requis' },
        { status: 400 }
      );
    }

    const client = await db.client.findFirst({
      where: { id: String(clientId), userId: user.id },
      select: { id: true },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const validDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(validDate.getTime())) {
      return NextResponse.json({ error: 'Date de validité invalide' }, { status: 400 });
    }

    const discount = Number(globalDiscount ?? 0);
    if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
      return NextResponse.json(
        { error: 'La remise globale doit être comprise entre 0 et 100' },
        { status: 400 },
      );
    }

    const devis = await db.$transaction(async (tx) => {
      const sequence = await tx.user.update({
        where: { id: user.id },
        data: { nextDevisNumber: { increment: 1 } },
        select: { devisPrefix: true, nextDevisNumber: true },
      });

      const devisNumber = `${sequence.devisPrefix}${String(sequence.nextDevisNumber - 1).padStart(4, '0')}`;

      return tx.devis.create({
        data: {
          userId: user.id,
          number: devisNumber,
          clientId: String(clientId),
          status: status || 'draft',
          validUntil: validDate,
          notes: notes || null,
          globalDiscount: discount,
          items: {
            create: items.map((item: { designation: string; description?: string; quantity: number; unit: string; unitPrice: number; tvaRate: number }) => ({
              designation: item.designation,
              description: item.description || null,
              quantity: item.quantity,
              unit: item.unit || 'unité',
              unitPrice: item.unitPrice,
              tvaRate: item.tvaRate ?? 20,
            })),
          },
        },
        include: {
          client: true,
          items: true,
        },
      });
    });

    return NextResponse.json({ devis }, { status: 201 });
  } catch (error) {
    console.error('Devis POST error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Conflit de création: numéro de devis déjà utilisé' },
        { status: 409 },
      );
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
