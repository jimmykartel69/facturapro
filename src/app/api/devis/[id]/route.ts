import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { siteReferenceSchema } from '@/lib/site-reference';
import { parseBillingItems } from '@/lib/billing-input';
import { resolveQuotePricing } from '@/lib/devis-pricing';

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
    if (existing.status === 'converted') {
      return NextResponse.json(
        { error: 'Ce devis est déjà converti en facture et ne peut plus être modifié.' },
        { status: 409 }
      );
    }

    if (body.clientId !== undefined) {
      const client = await db.client.findFirst({
        where: { id: String(body.clientId), userId: user.id },
        select: { id: true },
      });
      if (!client) return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    if (body.status !== undefined && !['draft', 'sent', 'accepted', 'refused'].includes(body.status)) {
      return NextResponse.json({ error: 'Statut de devis invalide' }, { status: 400 });
    }
    if (body.validUntil !== undefined && Number.isNaN(new Date(body.validUntil).getTime())) {
      return NextResponse.json({ error: 'Date de validité invalide' }, { status: 400 });
    }
    if (body.globalDiscount !== undefined &&
        (!Number.isFinite(Number(body.globalDiscount)) ||
         Number(body.globalDiscount) < 0 || Number(body.globalDiscount) > 100)) {
      return NextResponse.json({ error: 'Remise globale invalide' }, { status: 400 });
    }
    const parsedItems = body.items !== undefined ? parseBillingItems(body.items) : null;
    if (parsedItems && !parsedItems.ok) {
      return NextResponse.json({ error: parsedItems.error }, { status: 400 });
    }
    if (body.showEarlyExecutionRequest !== undefined && typeof body.showEarlyExecutionRequest !== 'boolean') {
      return NextResponse.json({ error: "L'option d'exécution anticipée est invalide" }, { status: 400 });
    }

    const pricingChanged = body.items !== undefined || body.globalDiscount !== undefined || body.targetTotalTtc !== undefined;
    let pricing: ReturnType<typeof resolveQuotePricing> | undefined;
    if (pricingChanged) {
      const pricingItems = parsedItems?.ok
        ? parsedItems.items
        : await db.devisItem.findMany({
            where: { devisId: id },
            select: { quantity: true, unitPrice: true, tvaRate: true },
          });
      try {
        pricing = resolveQuotePricing(
          pricingItems,
          body.globalDiscount ?? existing.globalDiscount,
          body.targetTotalTtc !== undefined ? body.targetTotalTtc : existing.targetTotalTtc,
          user.vatRegime === 'franchise',
        );
      } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 400 });
      }
    }

    const devis = await db.devis.update({
      where: { id, userId: user.id, status: { not: 'converted' } },
      data: {
        ...(body.clientId !== undefined && { clientId: body.clientId }),
        ...(body.status !== undefined && { status: body.status }),
        ...(body.validUntil !== undefined && { validUntil: new Date(body.validUntil) }),
        ...(body.siteReference !== undefined && { siteReference: referenceResult.data ?? null }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...(pricing !== undefined && { globalDiscount: pricing.globalDiscount, targetTotalTtc: pricing.targetTotalTtc }),
        ...(body.showEarlyExecutionRequest !== undefined && { showEarlyExecutionRequest: body.showEarlyExecutionRequest }),
        ...(parsedItems?.ok && {
          items: {
            deleteMany: {},
            create: parsedItems.items.map((item) => ({
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
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Devis modifié entre-temps. Actualisez la page.' }, { status: 409 });
    }
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
    if (existing.status === 'converted') {
      return NextResponse.json(
        { error: 'Un devis converti en facture ne peut pas être supprimé.' },
        { status: 409 }
      );
    }

    await db.devis.delete({ where: { id, userId: user.id, status: { not: 'converted' } } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Devis DELETE error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Devis modifié entre-temps. Actualisez la page.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
