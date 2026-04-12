import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Monthly revenue for current year
    const currentYear = new Date().getFullYear();
    const invoices = await db.invoice.findMany({
      where: {
        userId: user.id,
        status: 'paid',
        issueDate: {
          gte: new Date(currentYear, 0, 1),
          lte: new Date(currentYear, 11, 31),
        },
      },
      include: { items: true },
    });

    // Monthly revenue data
    const monthlyRevenue: { month: string; revenue: number }[] = [];
    for (let m = 0; m < 12; m++) {
      const monthInvoices = invoices.filter(
        (inv) => new Date(inv.issueDate).getMonth() === m
      );
      const revenue = monthInvoices.reduce((sum, inv) => {
        const ht = inv.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
        const tva = inv.items.reduce(
          (s, item) => s + item.quantity * item.unitPrice * (item.tvaRate / 100),
          0
        );
        return sum + ht + tva;
      }, 0);
      const monthNames = [
        'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun',
        'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc',
      ];
      monthlyRevenue.push({ month: monthNames[m], revenue: Math.round(revenue * 100) / 100 });
    }

    // Current month revenue
    const currentMonth = new Date().getMonth();
    const currentMonthRevenue = monthlyRevenue[currentMonth].revenue;

    // Devis stats
    const devisCount = await db.devis.count({
      where: {
        userId: user.id,
        status: { in: ['draft', 'sent'] },
      },
    });

    // Unpaid invoices
    const unpaidInvoices = await db.invoice.count({
      where: {
        userId: user.id,
        status: { in: ['sent', 'overdue'] },
      },
    });

    const unpaidTotal = await db.invoice.findMany({
      where: {
        userId: user.id,
        status: { in: ['sent', 'overdue'] },
      },
      include: { items: true },
    });
    const unpaidAmount = unpaidTotal.reduce((sum, inv) => {
      const ht = inv.items.reduce((s, item) => s + item.quantity * item.unitPrice, 0);
      const tva = inv.items.reduce(
        (s, item) => s + item.quantity * item.unitPrice * (item.tvaRate / 100),
        0
      );
      return sum + ht + tva;
    }, 0);

    // Active clients
    const activeClients = await db.client.count({
      where: { userId: user.id },
    });

    // Recent invoices
    const recentInvoices = await db.invoice.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        client: { select: { name: true, company: true } },
        items: true,
      },
    });

    // Recent devis
    const recentDevis = await db.devis.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        client: { select: { name: true, company: true } },
        items: true,
      },
    });

    return NextResponse.json({
      currentMonthRevenue,
      devisCount,
      unpaidInvoices,
      unpaidAmount: Math.round(unpaidAmount * 100) / 100,
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
