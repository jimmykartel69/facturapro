import { parsePagination } from '@/lib/pagination';
import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { siteReferenceSchema } from '@/lib/site-reference';
import { resolveQuotePricing } from '@/lib/devis-pricing';
import { parseBillingItems } from '@/lib/billing-input';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    let pagination;
    try { pagination = parsePagination(request.nextUrl.searchParams); }
    catch { return NextResponse.json({ error: 'Page invalide' }, { status: 400 }); }
    const status = request.nextUrl.searchParams.get('status');
    const search = request.nextUrl.searchParams.get('search') || '';

    const where: Record<string, unknown> = { userId: user.id };
    if (status) {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { number: { contains: search } },
        { siteReference: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search } } },
        { client: { company: { contains: search } } },
      ];
    }

    const devisList = await db.devis.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: pagination.skip,
      take: pagination.take,
      include: {
        client: {
          select: { id: true, name: true, company: true },
        },
        items: {
          select: {
            designation: true,
            quantity: true,
            unit: true,
            unitPrice: true,
            tvaRate: true,
          },
        },
      },
    });

    return NextResponse.json({ devis: devisList.slice(0, pagination.pageSize),
      pagination: { page: pagination.page, hasNext: devisList.length > pagination.pageSize } });
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
    const referenceResult = siteReferenceSchema.safeParse(body.siteReference);
    if (!referenceResult.success) {
      return NextResponse.json(
        { error: 'La référence du chantier doit être un texte de 120 caractères maximum, sur une seule ligne.' },
        { status: 400 },
      );
    }

    const { clientId, items, notes, globalDiscount, targetTotalTtc, showEarlyExecutionRequest, validUntil, status } = body;

    if (!clientId) {
      return NextResponse.json({ error: 'Client requis' }, { status: 400 });
    }
    const parsedItems = parseBillingItems(items);
    if (!parsedItems.ok) {
      return NextResponse.json({ error: parsedItems.error }, { status: 400 });
    }
    if (status !== undefined && !['draft', 'sent', 'accepted', 'refused'].includes(status)) {
      return NextResponse.json({ error: 'Statut de devis invalide' }, { status: 400 });
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

    if (showEarlyExecutionRequest !== undefined && typeof showEarlyExecutionRequest !== 'boolean') {
      return NextResponse.json({ error: "L'option d'exécution anticipée est invalide" }, { status: 400 });
    }

    let pricing: ReturnType<typeof resolveQuotePricing>;
    try {
      pricing = resolveQuotePricing(parsedItems.items, globalDiscount, targetTotalTtc, user.vatRegime === 'franchise');
    } catch (error) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 });
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
          siteReference: referenceResult.data ?? null,
          globalDiscount: pricing.globalDiscount,
          targetTotalTtc: pricing.targetTotalTtc,
          showEarlyExecutionRequest: showEarlyExecutionRequest === true,
          items: {
            create: parsedItems.items.map((item) => ({
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
