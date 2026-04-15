import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { Prisma } from '@prisma/client';

const ALLOWED_INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
type InvoiceStatus = (typeof ALLOWED_INVOICE_STATUSES)[number];

interface InvoiceItemInput {
  designation: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  tvaRate?: number;
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return ALLOWED_INVOICE_STATUSES.includes(value as InvoiceStatus);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseInvoiceItem(raw: unknown, index: number): { value?: InvoiceItemInput; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: `Article #${index + 1}: format invalide` };
  }

  const item = raw as Record<string, unknown>;
  const designation = String(item.designation ?? '').trim();
  const description = item.description == null ? undefined : String(item.description).trim();
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unitPrice);
  const unit = item.unit == null ? 'unité' : String(item.unit).trim();
  const tvaRate = item.tvaRate == null ? 20 : Number(item.tvaRate);

  if (!designation) {
    return { error: `Article #${index + 1}: désignation requise` };
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return { error: `Article #${index + 1}: quantité invalide` };
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    return { error: `Article #${index + 1}: prix unitaire invalide` };
  }
  if (!Number.isFinite(tvaRate) || tvaRate < 0 || tvaRate > 100) {
    return { error: `Article #${index + 1}: taux TVA invalide` };
  }

  return {
    value: {
      designation,
      description: description || undefined,
      quantity: round2(quantity),
      unit: unit || 'unité',
      unitPrice: round2(unitPrice),
      tvaRate: round2(tvaRate),
    },
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const statusParam = request.nextUrl.searchParams.get('status')?.trim() || '';
    const search = request.nextUrl.searchParams.get('search')?.trim() || '';

    if (statusParam && !isInvoiceStatus(statusParam)) {
      return NextResponse.json({ error: 'Statut de facture invalide' }, { status: 400 });
    }

    const where: Prisma.InvoiceWhereInput = { userId: user.id };
    if (statusParam) {
      where.status = statusParam;
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

    const body = (await request.json()) as Record<string, unknown>;
    const clientId = String(body.clientId ?? '').trim();
    const notes = body.notes == null ? null : String(body.notes).trim();
    const dueDateRaw = body.dueDate == null ? null : String(body.dueDate);
    const statusRaw = body.status == null ? 'draft' : String(body.status).trim();
    const devisIdRaw = body.devisId == null ? null : String(body.devisId).trim();
    const globalDiscountRaw = body.globalDiscount == null ? 0 : Number(body.globalDiscount);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!clientId || rawItems.length === 0) {
      return NextResponse.json(
        { error: 'Le client et au moins un article sont requis' },
        { status: 400 }
      );
    }

    if (!isInvoiceStatus(statusRaw)) {
      return NextResponse.json({ error: 'Statut de facture invalide' }, { status: 400 });
    }

    if (!Number.isFinite(globalDiscountRaw) || globalDiscountRaw < 0 || globalDiscountRaw > 100) {
      return NextResponse.json(
        { error: 'La remise globale doit être comprise entre 0 et 100' },
        { status: 400 }
      );
    }

    const parsedItems: InvoiceItemInput[] = [];
    for (let i = 0; i < rawItems.length; i += 1) {
      const parsed = parseInvoiceItem(rawItems[i], i);
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      parsedItems.push(parsed.value as InvoiceItemInput);
    }

    const due = dueDateRaw ? new Date(dueDateRaw) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    if (Number.isNaN(due.getTime())) {
      return NextResponse.json({ error: "La date d'échéance est invalide" }, { status: 400 });
    }

    const client = await db.client.findFirst({
      where: { id: clientId, userId: user.id },
      select: { id: true },
    });
    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    if (devisIdRaw) {
      const devis = await db.devis.findFirst({
        where: { id: devisIdRaw, userId: user.id },
        select: { id: true, clientId: true, status: true },
      });
      if (!devis) {
        return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
      }
      if (devis.clientId !== clientId) {
        return NextResponse.json(
          { error: 'Le devis ne correspond pas au client sélectionné' },
          { status: 400 }
        );
      }
      if (devis.status === 'converted') {
        return NextResponse.json(
          { error: 'Ce devis est déjà converti en facture' },
          { status: 409 }
        );
      }
    }

    const invoice = await db.$transaction(async (tx) => {
      const sequence = await tx.user.update({
        where: { id: user.id },
        data: { nextInvoiceNumber: { increment: 1 } },
        select: { invoicePrefix: true, nextInvoiceNumber: true },
      });

      const invoiceNumber = `${sequence.invoicePrefix}${String(
        sequence.nextInvoiceNumber - 1
      ).padStart(4, '0')}`;

      const created = await tx.invoice.create({
        data: {
          userId: user.id,
          number: invoiceNumber,
          clientId,
          devisId: devisIdRaw || null,
          status: statusRaw,
          dueDate: due,
          notes: notes || null,
          globalDiscount: round2(globalDiscountRaw),
          items: {
            create: parsedItems.map((item) => ({
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

      if (devisIdRaw) {
        await tx.devis.update({
          where: { id: devisIdRaw },
          data: { status: 'converted' },
        });
      }

      return created;
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error('Invoices POST error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Conflit de création: numéro ou devis déjà lié à une facture' },
          { status: 409 }
        );
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Référence invalide: client ou devis non valide' },
          { status: 400 }
        );
      }
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
