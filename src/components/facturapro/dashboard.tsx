'use client';

import React from 'react';
import {
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Plus,
  BarChart3,
  TrendingUp,
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
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
import { formatCurrency, formatDate, getStatusBadge } from '@/lib/helpers';

const chartConfig = {
  revenue: { label: 'Revenus', color: '#3b82f6' },
};

export function Dashboard() {
  const { invoices, setPage, setShowInvoiceForm, selectInvoice } = useAppStore();
  const stats = useInvoiceStats();
  const monthlyRevenue = useMonthlyRevenue();

  const recentInvoices = [...invoices].sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime()).slice(0, 5);

  const kpis = [
    {
      title: 'Chiffre d\'affaires',
      value: formatCurrency(stats.totalRevenue),
      description: 'Factures payées',
      icon: DollarSign,
      trend: '+12,5%',
      trendUp: true,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
    },
    {
      title: 'Factures en attente',
      value: stats.pendingCount.toString(),
      description: formatCurrency(stats.pendingAmount) + ' au total',
      icon: Clock,
      trend: stats.pendingCount > 0 ? 'Action requise' : 'Tout est en ordre',
      trendUp: false,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      iconBg: 'bg-amber-100',
    },
    {
      title: 'Factures payées',
      value: stats.paidCount.toString(),
      description: 'Encaissement réussi',
      icon: CheckCircle2,
      trend: '+3 ce mois',
      trendUp: true,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      iconBg: 'bg-blue-100',
    },
    {
      title: 'En retard',
      value: stats.overdueCount.toString(),
      description: formatCurrency(stats.overdueAmount) + ' en risque',
      icon: AlertTriangle,
      trend: stats.overdueCount > 0 ? 'Attention requise' : 'Aucune',
      trendUp: false,
      color: 'text-red-600',
      bg: 'bg-red-50',
      iconBg: 'bg-red-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Tableau de bord</h2>
        <p className="text-muted-foreground mt-1">Vue d\'ensemble de votre activité de facturation</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowInvoiceForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="h-4 w-4" />
          Créer une facture
        </Button>
        <Button variant="outline" onClick={() => setPage('reports')} className="gap-2">
          <BarChart3 className="h-4 w-4" />
          Voir les rapports
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold tracking-tight">{kpi.value}</p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${kpi.iconBg}`}>
                    <Icon className={`h-5 w-5 ${kpi.color}`} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-3">
                  {kpi.trendUp ? (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 text-red-500" />
                  )}
                  <span className={`text-xs font-medium ${kpi.trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
                    {kpi.trend}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">{kpi.description}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart & Recent Invoices */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Aperçu des revenus
            </CardTitle>
            <CardDescription>Revenus mensuels des factures payées (6 derniers mois)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
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
                <Bar
                  dataKey="revenue"
                  fill="var(--color-revenue)"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Factures récentes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPage('invoices')} className="text-xs text-blue-600 hover:text-blue-700">
                Tout voir
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-2">
            <div className="space-y-1">
              {recentInvoices.map((invoice) => (
                <button
                  key={invoice.id}
                  onClick={() => {
                    selectInvoice(invoice.id);
                    setPage('invoices');
                  }}
                  className="w-full text-left rounded-lg p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{invoice.number}</span>
                    {getStatusBadge(invoice.status)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">{invoice.clientName}</p>
                  <p className="text-sm font-semibold mt-1">{formatCurrency(invoice.total)}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Toute l'activité récente</CardTitle>
              <CardDescription>Dernières factures tous statuts confondus</CardDescription>
            </div>
            <Badge variant="secondary" className="text-xs">{invoices.length} au total</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className="cursor-pointer"
                  onClick={() => {
                    selectInvoice(invoice.id);
                    setPage('invoices');
                  }}
                >
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{invoice.clientName}</TableCell>
                  <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
