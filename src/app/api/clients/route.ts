import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const search = request.nextUrl.searchParams.get('search') || '';

    const where: Record<string, unknown> = { userId: user.id };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
        { city: { contains: search } },
      ];
    }

    const clients = await db.client.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        company: true,
        email: true,
        phone: true,
        address: true,
        addressComplement: true,
        postalCode: true,
        city: true,
        siret: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { devis: true, invoices: true },
        },
      },
    });

    return NextResponse.json({ clients });
  } catch (error) {
    console.error('Clients GET error:', error);
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
    const { name, company, email, phone, address, addressComplement, postalCode, city, siret, notes } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Le nom et l\'email sont requis' },
        { status: 400 }
      );
    }

    const client = await db.client.create({
      data: {
        userId: user.id,
        name,
        company: company || null,
        email,
        phone: phone || null,
        address: address || null,
        addressComplement: addressComplement || null,
        postalCode: postalCode || null,
        city: city || null,
        siret: siret || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    console.error('Clients POST error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
