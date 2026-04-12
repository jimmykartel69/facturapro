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

    const invoiceList = await db.invoice.findMany({
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

    return NextResponse.json({ invoices: invoiceList });
  } catch (error) {
    console.error('Invoices GET error:', error);
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
    const { clientId, items, notes, globalDiscount, dueDate, status, devisId } = body;

    if (!clientId || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Le client et au moins un article sont requis' },
        { status: 400 }
      );
    }

    const invoiceNumber = `${user.invoicePrefix}${String(user.nextInvoiceNumber).padStart(4, '0')}`;
    const due = dueDate ? new Date(dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const invoice = await db.invoice.create({
      data: {
        userId: user.id,
        number: invoiceNumber,
        clientId,
        devisId: devisId || null,
        status: status || 'draft',
        dueDate: due,
        notes: notes || null,
        globalDiscount: globalDiscount || 0,
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

    await db.user.update({
      where: { id: user.id },
      data: { nextInvoiceNumber: { increment: 1 } },
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Invoices POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
