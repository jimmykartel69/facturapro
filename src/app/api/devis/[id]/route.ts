import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { siteReferenceSchema } from '@/lib/site-reference';
import { parseBillingItems } from '@/lib/billing-input';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autoris√©' }, { status: 401 });
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
      return NextResponse.json({ error: 'Devis non trouv√©' }, { status: 404 });
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
      return NextResponse.json({ error: 'Non autoris√©' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const referenceResult = siteR∂ªßq´^