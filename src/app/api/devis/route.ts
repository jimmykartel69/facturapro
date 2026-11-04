import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { siteReferenceSchema } from '@/lib/site-reference';
import { parseBillingItems } from '@/lib/billing-input';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisÃ©' }, { status: 401 });
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
        { siteReference: { contains: search, mode: 'insensitive' } },
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

    return NextResponse.json({¶»§q«^