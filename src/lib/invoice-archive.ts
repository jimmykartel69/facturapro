import type { Client, Invoice, InvoiceItem } from '@prisma/client';

export interface CreditVatLine {
  rate: number;
  amountCents: number;
}
export interface InvoiceArchiveSnapshot {
  version: 1;
  invoice: {
    id: string; number: string; issueDate: string; dueDate: string;
    globalDiscount: number; siteReference: string | null;
    notes: string | null; devisNumber: string | null;
    items: Array<{
      designation: string; description: string | null;
      quantity: number; unit: string; unitPrice: number; tvaRate: number;
    }>;
  };
  client: {
    clientType: string | null; name: string; company: string | null;
    address: string | null; addressComplement: string | null;
    postalCode: string | null; city: string | null;
    email: string; siret: string | null;
  };
  company: {
    name: string; firstName: string; companyName: string | null;
    legalForm: string | null; siret: string | null;
    address: string | null; addressComplement: string | null;
    postalCode: string | null; city: string | null;
    professionalEmail: string | null; vatRegime: string | null;
    vatExemptionText: string | null; tvaNumber: string | null;
  };
  totals: {
    amountHtCents: number; amountVatCents: number;
    amountTtcCents: number; vatBreakdown: CreditVatLine[];
  };
}

type InvoiceWithClient = Invoice & {
  client: Client;
  items: InvoiceItem[];
  devis?: { number: string } | null;
};
type Company = {
  name: string; firstName: string;
  companyName?: string | null; legalForm?: string | null;
  siret?: string | null; address?: string | null;
  addressComplement?: string | null; postalCode?: string | null;
  city?: string | null; professionalEmail?: string | null;
  vatRegime?: string | null; vatExemptionText?: string | null;
  tvaNumber?: string | null;
};

const cents = (amount: number): number => Math.round(amount * 100);

export function makeInvoiceSnapshot(invoice: InvoiceWithClient, company: Company): InvoiceArchiveSnapshot {
  const discount = Math.min(100, Math.max(0, Number(invoice.globalDiscount) || 0));
  const ratio = 1 - discount / 100;
  const gross = invoice.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const ht = gross * ratio;
  const amounts = new Map<number, number>();
  const exempt = company.vatRegime === 'franchise';

  if (!exempt) {
    for (const item of invoice.items) {
      const rate = Number(item.tvaRate) || 0;
      if (rate <= 0) continue;
      amounts.set(rate, (amounts.get(rate) ?? 0) + item.quantity * item.unitPrice * ratio * rate / 100);
    }
  }

  const vatAmount = Array.from(amounts.values()).reduce((sum, value) => sum + value, 0);
  const vatBreakdown = [...amounts.entries()].sort(([a], [b]) => a - b)
    .map(([rate, amount]) => ({ rate, amountCents: cents(amount) }));
  const vatTotalCents = cents(vatAmount);
  if (vatBreakdown.length) {
    const delta = vatTotalCents - vatBreakdown.reduce((sum, value) => sum + value.amountCents, 0);
    vatBreakdown[vatBreakdown.length - 1].amountCents += delta;
  }

  return {
    version: 1,
    invoice: {
      id: invoice.id,
      number: invoice.number,
      issueDate: invoice.issueDate.toISOString(),
      dueDate: invoice.dueDate.toISOString(),
      globalDiscount: invoice.globalDiscount,
      siteReference: invoice.siteReference ?? null,
      notes: invoice.notes ?? null,
      devisNumber: invoice.devis?.number ?? null,
      items: invoice.items.map(item => ({
        designation: item.designation,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        tvaRate: item.tvaRate,
      })),
    },
    client: {
      clientType: invoice.client.clientType ?? null,
      name: invoice.client.name,
      company: invoice.client.company ?? null,
      address: invoice.client.address ?? null,
      addressComplement: invoice.client.addressComplement ?? null,
      postalCode: invoice.client.postalCode ?? null,
      city: invoice.client.city ?? null,
      email: invoice.client.email,
      siret: invoice.client.siret ?? null,
    },
    company: {
      name: company.name, firstName: company.firstName,
      companyName: company.companyName ?? null, legalForm: company.legalForm ?? null,
      siret: company.siret ?? null, address: company.address ?? null,
      addressComplement: company.addressComplement ?? null,
      postalCode: company.postalCode ?? null, city: company.city ?? null,
      professionalEmail: company.professionalEmail ?? null,
      vatRegime: company.vatRegime ?? null,
      vatExemptionText: company.vatExemptionText ?? null,
      tvaNumber: company.tvaNumber ?? null,
    },
    totals: {
      amountHtCents: cents(ht),
      amountVatCents: vatTotalCents,
      amountTtcCents: cents(ht + vatAmount),
      vatBreakdown,
    },
  };
}

/** All credit notes in this first increment are full credits. */
export function canCreateFullCredit(status: string, count: number, totalCents: number): boolean {
  return ['sent', 'paid', 'overdue'].includes(status) && count === 0 &&
    Number.isSafeInteger(totalCents) && totalCents > 0;
}

export function isInvoiceArchiveSnapshot(value: unknown): value is InvoiceArchiveSnapshot {
  if (!value || typeof value !== 'object') return false;
  const x = value as Partial<InvoiceArchiveSnapshot>;
  return x.version === 1 &&
    typeof x.invoice?.number === 'string' &&
    typeof x.company?.name === 'string' &&
    typeof x.client?.name === 'string' &&
    Number.isSafeInteger(x.totals?.amountTtcCents) &&
    Number.isSafeInteger(x.totals?.amountHtCents) &&
    Number.isSafeInteger(x.totals?.amountVatCents) &&
    Array.isArray(x.totals?.vatBreakdown);
}
