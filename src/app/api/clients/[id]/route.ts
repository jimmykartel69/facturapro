import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const client = await db.client.findFirst({
      where: { id, userId: user.id },
      include: {
        _count: { select: { devis: true, invoices: true } },
        devis: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, number: true, status: true, createdAt: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, number: true, status: true, createdAt: true, dueDate: true },
        },
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client GET error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const existing = await db.client.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const client = await db.client.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        company: body.company ?? existing.company,
        email: body.email ?? existing.email,
        phone: body.phone ?? existing.phone,
        address: body.address ?? existing.address,
        addressComplement: body.addressComplement ?? existing.addressComplement,
        postalCode: body.postalCode ?? existing.postalCode,
        city: body.city ?? existing.city,
        siret: body.siret ?? existing.siret,
        notes: body.notes ?? existing.notes,
      },
    });

    return NextResponse.json({ client });
  } catch (error) {
    console.error('Client PUT error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.client.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    await db.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Client DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
