import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

interface InvoiceLike {
  globalDiscount: number;
  items: Array<{
    quantity: number;
    unitPrice: number;
    tvaRate: number;
  }>;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function computeInvoiceTotalTtc(invoice: InvoiceLike): number {
  const grossHt = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const discountRate = Math.min(100, Math.max(0, invoice.globalDiscount || 0));
  const discountAmount = grossHt * (discountRate / 100);
  const netHt = Math.max(0, grossHt - discountAmount);
  const ratio = grossHt > 0 ? netHt / grossHt : 1;

  const totalTva = invoice.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * ratio * (item.tvaRate / 100),
    0
  );

  return round2(netHt + totalTva);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const startOfYear = new Date(currentYear, 0, 1);
    const startOfNextYear = new Date(currentYear + 1, 0, 1);

    const [paidInvoicesYear, unpaidInvoicesData, devisCount, activeClients, recentInvoicesRaw, recentDevisRaw] =
      await Promise.all([
        db.invoice.findMany({
          where: {
            userId: user.id,
            status: 'paid',
            issueDate: { gte: startOfYear, lt: startOfNextYear },
          },
          select: {
            issueDate: true,
            globalDiscount: true,
            items: {
              select: { quantity: true, unitPrice: true, tvaRate: true },
            },
          },
        }),
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
            client: { select: { name: true, company: true } },
            items: {
              select: { quantity: true, unitPrice: true, tvaRate: true },
            },
          },
        }),
      ]);

    const monthlyTotals = Array.from({ length: 12 }, () => 0);
    for (const invoice of paidInvoicesYear) {
      const monthIndex = new Date(invoice.issueDate).getMonth();
      monthlyTotals[monthIndex] += computeInvoiceTotalTtc(invoice);
    }

    const monthlyRevenue: { month: string; revenue: number }[] = MONTH_NAMES.map((month, index) => ({
      month,
      revenue: round2(monthlyTotals[index]),
    }));

    // Current month revenue
    const currentMonthRevenue = monthlyRevenue[currentMonth].revenue;

    const unpaidInvoices = unpaidInvoicesData.length;
    const unpaidAmount = round2(
      unpaidInvoicesData.reduce((sum, invoice) => sum + computeInvoiceTotalTtc(invoice), 0)
    );

    const recentInvoices = recentInvoicesRaw.map((invoice) => ({
      id: invoice.id,
      number: invoice.number,
      status: invoice.status,
      client: invoice.client,
      totalTtc: computeInvoiceTotalTtc(invoice),
    }));

    const recentDevis = recentDevisRaw.map((devis) => ({
      id: devis.id,
      number: devis.number,
      status: devis.status,
      client: devis.client,
      totalTtc: computeInvoiceTotalTtc(devis),
    }));

    return NextResponse.json({
      currentMonthRevenue,
      devisCount,
      unpaidInvoices,
      unpaidAmount,
      activeClients,
      monthlyRevenue,
      recentInvoices,
      recentDevis,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
