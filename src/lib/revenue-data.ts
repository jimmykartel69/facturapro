import { db } from '@/lib/db';
import { buildRevenueOverview } from '@/lib/revenue';

export async function loadRevenueOverview(userId: string, year: number, currentYear: number) {
  // Filter in the database and select only the fields needed for the totals.
  const [paidInvoices, firstInvoice] = await Promise.all([
    db.invoice.findMany({
      where: { userId, status: 'paid', issueDate: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) } },
      select: { issueDate: true, globalDiscount: true, items: { select: { quantity: true, unitPrice: true, tvaRate: true } } },
    }),
    db.invoice.findFirst({
      where: { userId, issueDate: { lt: new Date(Date.UTC(currentYear + 1, 0, 1)) } },
      orderBy: { issueDate: 'asc' }, select: { issueDate: true },
    }),
  ]);
  return buildRevenueOverview(paidInvoices, year, currentYear, firstInvoice?.issueDate ?? null);
}
