/**
 * Pricing logic shared by the quote form and API.
 * A target TTC amount is authoritative; the displayed discount percentage is
 * rounded only for presentation, never before computing/storing the total.
 */
export interface QuotePriceLine {
  quantity: number;
  unitPrice: number;
  tvaRate: number;
}

export function quoteGrossTtc(items: QuotePriceLine[], vatExempt = false): number {
  return items.reduce((sum, item) => {
    const quantity = Number(item.quantity);
    const price = Number(item.unitPrice);
    const vat = vatExempt ? 0 : Number(item.tvaRate);
    if (![quantity, price, vat].every(Number.isFinite)) return NaN;
    return sum + quantity * price * (1 + vat / 100);
  }, 0);
}

export function quoteDiscountRateForTarget(grossTtc: number, targetTtc: number): number {
  if (!Number.isFinite(grossTtc) || grossTtc < 0 || !Number.isFinite(targetTtc) ||
      targetTtc < 0 || targetTtc > grossTtc + 0.000001) {
    throw new Error('Le total souhaité doit être compris entre 0 € et le total TTC avant remise.');
  }
  return grossTtc === 0 ? 0 : Math.max(0, Math.min(100, (1 - targetTtc / grossTtc) * 100));
}

export function resolveQuotePricing(
  items: QuotePriceLine[],
  rate: unknown,
  target: unknown,
  vatExempt = false,
): { globalDiscount: number; targetTotalTtc: number | null } {
  const gross = quoteGrossTtc(items, vatExempt);
  if (!Number.isFinite(gross) || gross < 0) {
    throw new Error('Les montants des lignes du devis sont invalides.');
  }

  const discount = Number(rate ?? 0);
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
    throw new Error('La remise doit être comprise entre 0 et 100 %.');
  }

  if (target === null || target === undefined || target === '') {
    return { globalDiscount: discount, targetTotalTtc: null };
  }

  const targetAmount = Number(target);
  if (!Number.isFinite(targetAmount) || targetAmount < 0) {
    throw new Error('Le montant TTC souhaité est invalide.');
  }
  const cents = Math.round((targetAmount + Number.EPSILON) * 100);
  if (Math.abs(targetAmount * 100 - cents) > 0.00001) {
    throw new Error('Le montant TTC souhaité doit comporter au maximum deux décimales.');
  }
  const roundedTarget = cents / 100;
  const calculated = quoteDiscountRateForTarget(gross, roundedTarget);
  return { globalDiscount: calculated, targetTotalTtc: roundedTarget };
}
