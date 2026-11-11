'use client';

import { useId, useState } from 'react';
import { CalendarDays, TrendingUp } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useApiQuery } from '@/hooks/use-api-query';
import { formatCurrency } from '@/lib/helpers';
import type { RevenueOverviewData } from '@/lib/types';

const compactAmount = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 });

export function RevenueOverview({ initial }: { initial: RevenueOverviewData }) {
  const yearId = useId();
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [mode, setMode] = useState<'monthly' | 'cumulative'>('monthly');
  const year = selectedYear ?? initial.year;
  const isCurrentYear = year === initial.year;
  // Reuse the initial dashboard response: no duplicate request for the current year.
  const history = useApiQuery<RevenueOverviewData>(`/api/dashboard/revenue?year=${year}`, !isCurrentYear);
  const data = isCurrentYear ? initial : history.data;
  const cumulative = mode === 'cumulative';
  const gridColor = 'var(--border)';
  const textColor = 'var(--muted-foreground)';
  const axis = {
    tick: { fontSize: 12, fill: textColor },
    axisLine: { stroke: gridColor }, tickLine: { stroke: gridColor },
  };
  const tooltip = <Tooltip
    formatter={(value: number) => [formatCurrency(value), cumulative ? 'CA cumulé TTC' : 'CA mensuel TTC']}
    labelStyle={{ fontWeight: 600, color: 'var(--foreground)' }}
    contentStyle={{ borderRadius: 8, border: `1px solid ${gridColor}`, background: 'var(--card)', color: 'var(--foreground)' }}
  />;

  return (
    <Card className="min-w-0">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <TrendingUp className="h-4 w-4" aria-hidden="true" />
              Chiffre d&apos;affaires
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">Factures payées · TTC · année d&apos;émission</p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <label htmlFor={yearId} className="text-sm font-medium">Année</label>
            <select id={yearId} value={year} onChange={event => setSelectedYear(Number(event.target.value))}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:outline-2 focus-visible:outline-ring">
              {initial.availableYears.map(value => <option key={value} value={value}>{value}{value === initial.currentYear ? ' · année en cours' : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div aria-live="polite" aria-atomic="true">
            <p className="text-sm text-muted-foreground">CA annuel {year}</p>
            <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">{data ? formatCurrency(data.annualRevenue) : '—'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{data ? `${data.paidInvoiceCount} facture${data.paidInvoiceCount > 1 ? 's' : ''} payée${data.paidInvoiceCount > 1 ? 's' : ''}` : 'Chargement de l’année…'}</p>
          </div>
          <div role="group" aria-label="Affichage du chiffre d’affaires" className="flex w-fit gap-1 rounded-lg bg-muted p-1">
            <Button size="sm" variant={!cumulative ? 'default' : 'ghost'} aria-pressed={!cumulative} onClick={() => setMode('monthly')}>Mensuel</Button>
            <Button size="sm" variant={cumulative ? 'default' : 'ghost'} aria-pressed={cumulative} onClick={() => setMode('cumulative')}>Cumul</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4" aria-busy={!isCurrentYear && history.isFetching}>
        {!isCurrentYear && history.error && <div role="alert" className="flex flex-wrap items-center gap-2 text-sm text-red-700">
          <span>Impossible de charger le chiffre d&apos;affaires de {year}.</span>
          <Button variant="outline" size="sm" onClick={() => { void history.refetch(); }}>Réessayer</Button>
        </div>}
        {!data && !history.error && <p role="status" className="flex h-72 items-center justify-center text-sm text-muted-foreground">Chargement du chiffre d&apos;affaires…</p>}
        {data && <>
          {data.paidInvoiceCount === 0 && <p className="text-sm text-muted-foreground">Aucune facture payée émise en {year}.</p>}
          {data.paidInvoiceCount > 0 && <div className="h-72 w-full" role="img" aria-label={`${cumulative ? 'Cumul du chiffre d’affaires' : 'Chiffre d’affaires mensuel'} ${year}, total ${formatCurrency(data.annualRevenue)}. Détail accessible dans le tableau ci-dessous.`}>
            <ResponsiveContainer width="100%" height="100%">
              {cumulative ? (
                <AreaChart data={data.monthlyRevenue} margin={{ left: 8, right: 8 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" {...axis} />
                  <YAxis {...axis} width={72} tickFormatter={value => `${compactAmount.format(value)} €`} />
                  {tooltip}
                  <Area type="monotone" dataKey="cumulativeRevenue" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
                </AreaChart>
              ) : (
                <BarChart data={data.monthlyRevenue} margin={{ left: 8, right: 8 }} accessibilityLayer>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" {...axis} />
                  <YAxis {...axis} width={72} tickFormatter={value => `${compactAmount.format(value)} €`} />
                  {tooltip}
                  <Bar dataKey="revenue" fill="var(--primary)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>}
          <details className="rounded-lg border px-3 py-2 text-sm">
            <summary className="cursor-pointer font-medium">Voir les montants mois par mois</summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full tabular-nums">
                <caption className="sr-only">Chiffre d&apos;affaires TTC {year}, mensuel et cumulé</caption>
                <thead><tr className="border-b"><th scope="col" className="py-2 text-left">Mois</th><th scope="col" className="text-right">CA mensuel TTC</th><th scope="col" className="text-right">Cumul TTC</th></tr></thead>
                <tbody>{data.monthlyRevenue.map(month => <tr key={month.month} className="border-b last:border-0"><th scope="row" className="py-2 text-left font-normal">{month.month}</th><td className="text-right">{formatCurrency(month.revenue)}</td><td className="text-right font-medium">{formatCurrency(month.cumulativeRevenue)}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
        </>}
      </CardContent>
    </Card>
  );
}
