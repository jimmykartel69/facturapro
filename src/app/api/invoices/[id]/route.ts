import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

const ALLOWED_INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
type InvoiceStatus = (typeof ALLOWED_INVOICE_STATUSES)[number];

type JsonRecord = Record<string, unknown>;

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

function parseDate(value: unknown, label: string): { value?: Date; error?: string } {
  if (value == null) {
    return { error: `${label} manquante` };
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return { error: `${label} invalide` };
  }
  return { value: date };
}

function parseInvoiceItem(raw: unknown, index: number): { value?: InvoiceItemInput; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: `Article #${index + 1}: format invalide` };
  }

  const item = raw as JsonRecord;
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

async function getOwnedInvoice(userId: string, invoiceId: string) {
  return db.invoice.findFirst({
    where: { id: invoiceId, userId },
    include: {
      client: true,
      items: { orderBy: { createdAt: 'asc' } },
      devis: { select: { id: true, number: true, status: true, clientId: true } },
    },
  });
}

function parseBodyAsRecord(payload: unknown): JsonRecord | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  return payload as JsonRecord;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de facture invalide' }, { status: 400 });
    }

    const invoice = await getOwnedInvoice(user.id, id);
    if (!invoice) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Invoice GET error:', error);
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
    if (!id) {
      return NextResponse.json({ error: 'ID de facture invalide' }, { status: 400 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Payload JSON invalide' }, { status: 400 });
    }

    const body = parseBodyAsRecord(rawBody);
    if (!body) {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400 });
    }

    const existing = await db.invoice.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        status: true,
        clientId: true,
        devisId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    const hasClientId = body.clientId !== undefined;
    const hasStatus = body.status !== undefined;
    const hasDueDate = body.dueDate !== undefined;
    const hasNotes = body.notes !== undefined;
    const hasGlobalDiscount = body.globalDiscount !== undefined;
    const hasItems = body.items !== undefined;

    if (!hasClientId && !hasStatus && !hasDueDate && !hasNotes && !hasGlobalDiscount && !hasItems) {
      return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 });
    }

    if (
      (existing.status === 'paid' || existing.status === 'cancelled') &&
      (hasClientId || hasDueDate || hasGlobalDiscount || hasItems)
    ) {
      return NextResponse.json(
        { error: 'Cette facture ne peut plus être modifiée sur ses données financières' },
        { status: 400 }
      );
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (hasClientId) {
      const clientId = String(body.clientId ?? '').trim();
      if (!clientId) {
        return NextResponse.json({ error: 'Client invalide' }, { status: 400 });
      }

      const client = await db.client.findFirst({
        where: { id: clientId, userId: user.id },
        select: { id: true },
      });

      if (!client) {
        return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
      }

      if (existing.devisId) {
        const linkedDevis = await db.devis.findFirst({
          where: { id: existing.devisId, userId: user.id },
          select: { clientId: true },
        });

        if (linkedDevis && linkedDevis.clientId !== clientId) {
          return NextResponse.json(
            { error: "Impossible de changer de client: facture liee a un devis d'un autre client" },
            { status: 400 }
          );
        }
      }

      updateData.client = { connect: { id: clientId } };
    }

    if (hasStatus) {
      const status = String(body.status ?? '').trim();
      if (!isInvoiceStatus(status)) {
        return NextResponse.json({ error: 'Statut de facture invalide' }, { status: 400 });
      }
      updateData.status = status;
    }

    if (hasDueDate) {
      const parsedDate = parseDate(body.dueDate, "Date d'échéance");
      if (parsedDate.error || !parsedDate.value) {
        return NextResponse.json({ error: parsedDate.error }, { status: 400 });
      }
      updateData.dueDate = parsedDate.value;
    }

    if (hasNotes) {
      const notesRaw = body.notes;
      if (notesRaw == null) {
        updateData.notes = null;
      } else {
        const notes = String(notesRaw).trim();
        updateData.notes = notes || null;
      }
    }

    if (hasGlobalDiscount) {
      const globalDiscount = Number(body.globalDiscount);
      if (!Number.isFinite(globalDiscount) || globalDiscount < 0 || globalDiscount > 100) {
        return NextResponse.json(
          { error: 'La remise globale doit être comprise entre 0 et 100' },
          { status: 400 }
        );
      }
      updateData.globalDiscount = round2(globalDiscount);
    }

    let parsedItems: InvoiceItemInput[] | null = null;
    if (hasItems) {
      if (!Array.isArray(body.items) || body.items.length === 0) {
        return NextResponse.json(
          { error: 'La facture doit contenir au moins un article' },
          { status: 400 }
        );
      }

      parsedItems = [];
      for (let i = 0; i < body.items.length; i += 1) {
        const parsed = parseInvoiceItem(body.items[i], i);
        if (parsed.error || !parsed.value) {
          return NextResponse.json({ error: parsed.error }, { status: 400 });
        }
        parsedItems.push(parsed.value);
      }
    }

    const invoice = await db.$transaction(async (tx) => {
      const updated = await tx.invoice.update({
        where: { id: existing.id },
        data: {
          ...updateData,
          ...(parsedItems
            ? {
                items: {
                  deleteMany: {},
                  create: parsedItems.map((item) => ({
                    designation: item.designation,
                    description: item.description || null,
                    quantity: item.quantity,
                    unit: item.unit || 'unité',
                    unitPrice: item.unitPrice,
                    tvaRate: item.tvaRate ?? 20,
                  })),
                },
              }
            : {}),
        },
        include: {
          client: true,
          items: { orderBy: { createdAt: 'asc' } },
          devis: { select: { id: true, number: true } },
        },
      });

      return updated;
    });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error('Invoice PUT error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'Conflit de mise à jour: référence déjà utilisée' },
          { status: 409 }
        );
      }
      if (error.code === 'P2003') {
        return NextResponse.json(
          { error: 'Référence invalide: client ou devis non valide' },
          { status: 400 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'ID de facture invalide' }, { status: 400 });
    }

    const existing = await db.invoice.findFirst({
      where: { id, userId: user.id },
      select: {
        id: true,
        status: true,
        devisId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.invoice.delete({ where: { id: existing.id } });

      if (existing.devisId) {
        await tx.devis.updateMany({
          where: {
            id: existing.devisId,
            userId: user.id,
            status: 'converted',
          },
          data: { status: 'sent' },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Invoice DELETE error:', error);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
