import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { siteReferenceSchema } from '@/lib/site-reference';

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
    const devis = await db.devis.findFirst({
      where: { id, userId: user.id },
      include: {
        client: true,
        items: { orderBy: { createdAt: 'asc' } },
        invoice: { select: { id: true, number: true, status: true } },
      },
    });

    if (!devis) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ devis });
  } catch (error) {
    console.error('Devis GET error:', error);
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
    const referenceResult = siteReferenceSchema.safeParse(body.siteReference);
    if (!referenceResult.success) {
      return NextResponse.json(
        { error: 'La référence du chantier doit être un texte de 120 caractères maximum, sur une seule ligne.' },
        { status: 400 },
      );
    }


    const existing = await db.devis.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    const devis = await db.devis.update({
      where: { id },
      data: {
        ...(body.clientId !== undefined && { clientId: body.clientId }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.validUntil !== undefined && { validUntil: new Date(body.validUntil) }),
        ...(body.siteReference !== undefined && { siteReference: referenceResult.data ?? null }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(body.globalDiscount !== undefined && { globalDiscount: body.globalDiscount }),
        ...(body.items && {
          items: {
            deleteMany: {},
            create: body.items.map((item: { designation: string; description?: string; quantity: number; unit: string; unitPrice: number; tvaRate: number }) => ({
              designation: item.designation,
              description: item.description || null,
              quantity: item.quantity,
              unit: item.unit || 'unité',
              unitPrice: item.unitPrice,
              tvaRate: item.tvaRate ?? 20,
            })),
          },
        }),
      },
      include: {
        client: true,
        items: true,
      },
    });

    return NextResponse.json({ devis });
  } catch (error) {
    console.error('Devis PUT error:', error);
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
    const existing = await db.devis.findFirst({
      where: { id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
    }

    await db.devis.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Devis DELETE error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
