import type { RevenueOverviewData } from './types';

const MONTH_NAMES = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

export interface RevenueDocument {
  globalDiscount: number;
  targetTotalTtc?: number | null;
  items: Array<{ quantity: number; unitPrice: number; tvaRate: number }>;
}

export function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

// Preserve the dashboard's existing TTC calculation, including quote target totals.
export function computeDocumentTotalTtc(document: RevenueDocument): number {
  if (document.targetTotalTtc != null) return roundAmount(document.targetTotalTtc);
  const grossHt = document.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountRate = Math.min(100, Math.max(0, document.globalDiscount || 0));
  const discountAmount = grossHt * (discountRate / 100);
  const netHt = Math.max(0, grossHt - discountAmount);
  const ratio = grossHt > 0 ? netHt / grossHt : 1;
  const totalTva = document.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice * ratio * (item.tvaRate / 100), 0,
  );
  return roundAmount(netHt + totalTva);
}

export function currentRevenueYear(now = new Date()): number {
  return Number(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric' }).format(now));
}

export function parseRevenueYear(raw: string | null, currentYear: number): number {
  if (raw === null) return currentYear;
  if (!/^\d{4}$/.test(raw)) throw new RangeError('Année invalide');
  const year = Number(raw);
  if (year < 1900 || year > currentYear) throw new RangeError('Année invalide');
  return year;
}

export function buildRevenueOverview(
  documents: Array<RevenueDocument & { issueDate: Date | string }>,
  year: number,
  currentYear: number,
  firstInvoiceDate: Date | string | null,
): RevenueOverviewData {
  const monthlyCents = Array<number>(12).fill(0);
  let paidInvoiceCount = 0;
  for (const document of documents) {
    const date = new Date(document.issueDate);
    if (date.getUTCFullYear() !== year) continue;
    monthlyCents[date.getUTCMonth()] += Math.round(computeDocumentTotalTtc(document) * 100);
    paidInvoiceCount++;
  }
  let cumulativeCents = 0;
  const monthlyRevenue = MONTH_NAMES.map((month, index) => {
    cumulativeCents += monthlyCents[index];
    return { month, revenue: monthlyCents[index] / 100, cumulativeRevenue: cumulativeCents / 100 };
  });
  const firstYear = firstInvoiceDate ? new Date(firstInvoiceDate).getUTCFullYear() : currentYear;
  const oldestYear = Math.max(1900, Math.min(currentYear - 4, firstYear, year));
  const availableYears = Array.from({ length: currentYear - oldestYear + 1 }, (_, i) => currentYear - i);
  return { year, currentYear, availableYears, annualRevenue: cumulativeCents / 100, paidInvoiceCount, monthlyRevenue };
}
