import { NextRequest, NextResponse } from 'next/server';
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

    const devisNumber = `${user.devisPrefix}${String(user.nextDevisNumber).padStart(4, '0')}`;
    const validDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const devis = await db.devis.create({
      data: {
        userId: user.id,
        number: devisNumber,
        clientId,
        status: status || 'draft',
        validUntil: validDate,
        notes: notes || null,
        globalDiscount: globalDiscount || 0,
        items: {
          create: items.map((item: { description: string; quantity: number; unit: string; unitPrice: number; tvaRate: number }) => ({
            description: item.description,
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

    await db.user.update({
      where: { id: user.id },
      data: { nextDevisNumber: { increment: 1 } },
    });

    return NextResponse.json({ devis }, { status: 201 });
  } catch (error) {
    console.error('Devis POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
