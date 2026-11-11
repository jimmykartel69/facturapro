import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { loadRevenueOverview } from '@/lib/revenue-data';
import { computeDocumentTotalTtc, currentRevenueYear, roundAmount } from '@/lib/revenue';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const now = new Date();
    const currentYear = currentRevenueYear(now);
    const currentMonth = Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'numeric' }).format(now)) - 1;

    const [revenueOverview, unpaidInvoicesData, devisCount, activeClients, recentInvoicesRaw, recentDevisRaw] =
      await Promise.all([
        loadRevenueOverview(user.id, currentYear, currentYear),
        db.invoice.findMany({
          where: {
            userId: user.id,
            status: { in: ['sent', 'overdue'] },
          },
          select: {
            globalDiscount: true,
            items: {
              select: { quantity: true, unitPrice: true, tvaRate: true },
            },
          },
        }),
        db.devis.count({
          where: {
            userId: user.id,
            status: { in: ['draft', 'sent'] },
          },
        }),
        db.client.count({
          where: { userId: user.id },
        }),
        db.invoice.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            number: true,
            status: true,
            globalDiscount: true,
            client: { select: { name: true, company: true } },
            items: {
              select: { quantity: true, unitPrice: true, tvaRate: true },
            },
          },
        }),
        db.devis.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            number: true,
            status: true,
            globalDiscount: true,
            targetTotalTtc: true,
            client: { select: { name: true, company: true } },
            items: {
              select: { quantity: true, unitPrice: true, tvaRate: true },
            },
          },
        }),
      ]);

    const monthlyRevenue = revenueOverview.monthlyRevenue;

    // Current month revenue
    const currentMonthRevenue = monthlyRevenue[currentMonth].revenue;

    const unpaidInvoices = unpaidInvoicesData.length;
    const unpaidAmount = roundAmount(
      unpaidInvoicesData.reduce((sum, invoice) => sum + computeDocumentTotalTtc(invoice), 0)
    );

    const recentInvoices = recentInvoicesRaw.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      client: invoice.client,
      totalTtc: computeDocumentTotalTtc(invoice),
    }));

    const recentDevis = recentDevisRaw.map((devis) => ({
      id: devis.id,
      number: devis.number,
      status: devis.status,
      client: devis.client,
      totalTtc: computeDocumentTotalTtc(devis),
    }));

    return NextResponse.json({
      currentMonthRevenue,
      devisCount,
      unpaidInvoices,
      unpaidAmount,
      activeClients,
      monthlyRevenue,
      revenueOverview,
      recentInvoices,
      recentDevis,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
