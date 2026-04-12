'use client';

import { Badge } from '@/components/ui/badge';
import { DevisStatus, InvoiceStatus } from './types';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function getDevisStatusBadge(status: DevisStatus) {
  const map: Record<DevisStatus, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
    draft: { label: 'Brouillon', variant: 'outline' },
    sent: { label: 'Envoyé', variant: 'default' },
    accepted: { label: 'Accepté', variant: 'secondary' },
    refused: { label: 'Refusé', variant: 'destructive' },
    converted: { label: 'Converti', variant: 'secondary' },
  };
  const { label, variant } = map[status] || map.draft;
  return <Badge variant={variant}>{label}</Badge>;
}

export function getInvoiceStatusBadge(status: InvoiceStatus) {
  const map: Record<InvoiceStatus, { label: string; variant: 'outline' | 'default' | 'secondary' | 'destructive' }> = {
    draft: { label: 'Brouillon', variant: 'outline' },
    sent: { label: 'Envoyée', variant: 'default' },
    paid: { label: 'Payée', variant: 'secondary' },
    overdue: { label: 'En retard', variant: 'destructive' },
    cancelled: { label: 'Annulée', variant: 'outline' },
  };
  const { label, variant } = map[status] || map.draft;
  return <Badge variant={variant}>{label}</Badge>;
}

interface LineItem {
  quantity: number;
  unitPrice: number;
  tvaRate: number;
}

export function calculateTotals(items: LineItem[]) {
  let totalHt = 0;
  const tvaDetails: Record<number, number> = {};

  for (const item of items) {
    const lineHt = item.quantity * item.unitPrice;
    totalHt += lineHt;
    const rate = Math.round(item.tvaRate * 100) / 100;
    tvaDetails[rate] = (tvaDetails[rate] || 0) + lineHt * (rate / 100);
  }

  let totalTva = 0;
  for (const v of Object.values(tvaDetails)) {
    totalTva += v;
  }

  const totalTtc = totalHt + totalTva;

  return {
    totalHt: Math.round(totalHt * 100) / 100,
    tvaDetails,
    totalTva: Math.round(totalTva * 100) / 100,
    totalTtc: Math.round(totalTtc * 100) / 100,
  };
}
