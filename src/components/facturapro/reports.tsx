'use client';

import React, { useMemo } from 'react';
import {
  DollarSign,
  TrendingUp,
  PieChart as PieChartIcon,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore, useInvoiceStats, useMonthlyRevenue } from '@/lib/store';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { formatCurrency } from '@/lib/helpers';

const statusLabels: Record<string, string> = {
  paid: 'Payée',
  sent: 'Envoyée',
  pending: 'En attente',
  overdue: 'En retard',
  draft: 'Brouillon',
  cancelled: 'Annulée',
};

const revenueChartConfig = {
  revenue: { label: 'Revenus', color: '#3b82f6' },
  count: { label: 'Factures', color: '#60a5fa' },
};

const pieChartConfig = {
  paid: { label: 'Payée', color: '#10b981' },
  sent: { label: 'Envoyée', color: '#3b82f6' },
  pending: { label: 'En attente', color: '#f59e0b' },
  overdue: { label: 'En retard', color: '#ef4444' },
  draft: { label: 'Brouillon', color: '#94a3b8' },
  cancelled: { label: 'Annulée', color: '#cbd5e1' },
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#94a3b8', '#cbd5e1'];

export function Reports() {
  const { invoices, clients } = useAppStore();
  const stats = useInvoiceStats();
  const monthlyRevenue = useMonthlyRevenue();

  // Payment status breakdown
  const statusBreakdown = useMemo(() => {
    const breakdown: { status: string; count: number; amount: number }[] = [];
    const statusOrder = ['paid', 'sent', 'pending', 'overdue', 'draft', 'cancelled'];
    statusOrder.forEach((status) => {
      const statusInvoices = invoices.filter((inv) => inv.status === status);
      if (statusInvoices.length > 0) {
        breakdown.push({
          status,
          count: statusInvoices.length,
          amount: statusInvoices.reduce((sum, inv) => sum + inv.total, 0),
        });
      }
    });
    return breakdown;
  }, [invoices]);

  // Pie chart data
  const pieData = useMemo(() => {
    return statusBreakdown.map((item) => ({
      name: statusLabels[item.status] || item.status,
      value: item.amount,
      count: item.count,
    }));
  }, [statusBreakdown]);

  // Client revenue ranking
  const clientRanking = useMemo(() => {
    const clientMap = new Map<string, { name: string; total: number; paid: number; count: number }>();
    invoices.forEach((inv) => {
      const existing = clientMap.get(inv.clientEmail) || { name: inv.clientName, total: 0, paid: 0, count: 0 };
      existing.total += inv.total;
      if (inv.status === 'paid') existing.paid += inv.total;
      existing.count += 1;
      clientMap.set(inv.clientEmail, existing);
    });
    return Array.from(clientMap.values())
      .sort((a, b) => b.total - a.total);
  }, [invoices]);

  // Revenue comparison data
  const comparisonData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    const current = invoices.filter((inv) => {
      const d = new Date(inv.issueDate);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const previous = invoices.filter((inv) => {
      const d = new Date(inv.issueDate);
      return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
    });

    return {
      currentRevenue: current.reduce((sum, inv) => sum + inv.total, 0),
      previousRevenue: previous.reduce((sum, inv) => sum + inv.total, 0),
      currentCount: current.length,
      previousCount: previous.length,
      currentPaid: current.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
      previousPaid: previous.filter((inv) => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    };
  }, [invoices]);

  const revenueChange = comparisonData.previousRevenue > 0
    ? ((comparisonData.currentRevenue - comparisonData.previousRevenue) / comparisonData.previousRevenue * 100).toFixed(1)
    : '0';

  const isRevenueUp = Number(revenueChange) >= 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Rapports</h2>
        <p className="text-muted-foreground mt-1">Analyses et indicateurs financiers</p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chiffre d'affaires total</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-emerald-100">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-2">
              {isRevenueUp ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
              )}
              <span className={`text-xs font-medium ${isRevenueUp ? 'text-emerald-600' : 'text-red-500'}`}>
                {revenueChange}%
              </span>
              <span className="text-xs text-muted-foreground">vs mois précédent</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Montant en attente</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.pendingAmount)}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-amber-100">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.pendingCount} factures en attente de paiement</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Montant en retard</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(stats.overdueAmount)}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-red-100">
                <PieChartIcon className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.overdueCount} factures en retard</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total des factures</p>
                <p className="text-2xl font-bold mt-1">{invoices.length}</p>
              </div>
              <div className="rounded-lg p-2.5 bg-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">{stats.paidCount} payées, {clients.length} clients</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Tendance des revenus</CardTitle>
            <CardDescription>Revenus mensuels des factures payées</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[300px] w-full">
              <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                />
                <YAxis
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: 'var(--muted-foreground)' }}
                  tickFormatter={(value) => `${(value / 1000).toFixed(0)}k €`}
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar dataKey="revenue" fill="var(--color-revenue)" radius={[6, 6, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Répartition par statut</CardTitle>
            <CardDescription>Montants des factures par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pieChartConfig} className="h-[300px] w-full">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                  <span className="text-xs text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Comparison & Client Ranking */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        <Card>
          <CardHeader>
            <CardTitle>Comparaison mensuelle</CardTitle>
            <CardDescription>Ce mois vs mois précédent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Ce mois (Revenus)</span>
                  <span className="text-sm font-bold">{formatCurrency(comparisonData.currentRevenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (comparisonData.currentRevenue / Math.max(comparisonData.currentRevenue, comparisonData.previousRevenue, 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Mois précédent (Revenus)</span>
                  <span className="text-sm font-bold">{formatCurrency(comparisonData.previousRevenue)}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-slate-400 transition-all"
                    style={{ width: `${Math.min(100, (comparisonData.previousRevenue / Math.max(comparisonData.currentRevenue, comparisonData.previousRevenue, 1)) * 100)}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Factures (ce mois)</p>
                  <p className="text-lg font-bold text-blue-600">{comparisonData.currentCount}</p>
                </div>
                <div className="text-center p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-muted-foreground">Factures (préc.)</p>
                  <p className="text-lg font-bold text-slate-600">{comparisonData.previousCount}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Revenue Ranking */}
        <Card>
          <CardHeader>
            <CardTitle>Classement clients par revenus</CardTitle>
            <CardDescription>Top clients par montant total facturé</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-center">Factures</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Payé</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientRanking.map((client, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                          {index + 1}
                        </Badge>
                        <span className="text-sm font-medium truncate max-w-[140px]">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">{client.count}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(client.total)}</TableCell>
                    <TableCell className="text-right text-emerald-600">{formatCurrency(client.paid)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Détails par statut de paiement</CardTitle>
          <CardDescription>Répartition complète de toutes les factures par statut</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Statut</TableHead>
                <TableHead className="text-center">Nombre</TableHead>
                <TableHead className="text-right">Montant total</TableHead>
                <TableHead className="text-right">% du total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {statusBreakdown.map((item) => {
                const totalAll = invoices.reduce((sum, inv) => sum + inv.total, 0);
                const percentage = totalAll > 0 ? ((item.amount / totalAll) * 100).toFixed(1) : '0';
                return (
                  <TableRow key={item.status}>
                    <TableCell className="font-medium">{statusLabels[item.status] || item.status}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{item.count}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.amount)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{percentage}%</TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="font-semibold bg-muted/50">
                <TableCell>Total</TableCell>
                <TableCell className="text-center">{invoices.length}</TableCell>
                <TableCell className="text-right">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
                </TableCell>
                <TableCell className="text-right">100%</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
