import { InvoiceStatus } from './types';
import { Badge } from '@/components/ui/badge';
import React from 'react';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusBadge(status: InvoiceStatus): React.ReactNode {
  const variants: Record<InvoiceStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
    paid: { variant: 'default', className: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100' },
    sent: { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100' },
    pending: { variant: 'secondary', className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50' },
    overdue: { variant: 'destructive', className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-50' },
    draft: { variant: 'outline', className: 'text-slate-600 hover:bg-slate-50' },
    cancelled: { variant: 'outline', className: 'text-slate-500 hover:bg-slate-50' },
  };

  const config = variants[status];
  return (
    <Badge variant={config.variant} className={`text-xs font-medium ${config.className}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function addDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}
