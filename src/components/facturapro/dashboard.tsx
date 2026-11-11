'use client';

import { useShallow } from 'zustand/react/shallow';

import React from 'react';
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Users,
  Plus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RevenueOverview } from './revenue-overview';
import { useApiQuery } from '@/hooks/use-api-query';
import type { DashboardData } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { formatCurrency, getDevisStatusBadge, getInvoiceStatusBadge } from '@/lib/helpers';
import type { DevisStatus, InvoiceStatus } from '@/lib/types';

export function Dashboard() {
  const {
    setShowDevisForm,
    setShowInvoiceForm,
    setSelectedDevisId,
    setSelectedInvoiceId,
    setPage,
  } = useAppStore(useShallow(s => ({ setShowDevisForm: s.setShowDevisForm, setShowInvoiceForm: s.setShowInvoiceForm, setSelectedDevisId: s.setSelectedDevisId, setSelectedInvoiceId: s.setSelectedInvoiceId, setPage: s.setPage })));
  const query = useApiQuery<DashboardData>('/api/dashboard');
  const dashboardData = query.data;
  if (!dashboardData) return <div className="space-y-4">
    <h2 className="text-2xl font-bold">Tableau de bord</h2>
    {query.error ? <><p role="alert">{query.error.message}</p><Button onClick={() => { void query.refetch(); }}>Réessayer</Button></> : <p role="status">Chargement…</p>}
  </div>;

  const kpis = [
    { title: 'CA du mois', value: formatCurrency(dashboardData.currentMonthRevenue), icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { title: 'Devis en cours', value: dashboardData.devisCount.toString(), icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
    { title: 'Factures impayées', value: dashboardData.unpaidInvoices.toString(), subtitle: formatCurrency(dashboardData.unpaidAmount), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Clients actifs', value: dashboardData.activeClients.toString(), icon: Users, color: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-muted-foreground text-sm">Vue d&apos;ensemble de votre activité</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setShowDevisForm(true); setSelectedDevisId(null); }} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Créer un devis
          </Button>
          <Button variant="outline" onClick={() => { setShowInvoiceForm(true); setSelectedInvoiceId(null); }} size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            Créer une facture
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.title}</p>
                    <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                    {kpi.subtitle && <p className="text-xs text-muted-foreground mt-0.5">{kpi.subtitle}</p>}
                  </div>
                  <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <RevenueOverview initial={dashboardData.revenueOverview} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Dernières factures</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPage('invoices')} className="text-xs">Voir tout</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.recentInvoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucune facture</TableCell>
                  </TableRow>
                ) : (
                  dashboardData.recentInvoices.map((inv) => {
                    return (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setPage('invoices'); setSelectedInvoiceId(inv.id); }}>
                        <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                        <TableCell className="text-sm">{inv.client.company || inv.client.name}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(inv.totalTtc)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">Derniers devis</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setPage('devis')} className="text-xs">Voir tout</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N°</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardData.recentDevis.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-6">Aucun devis</TableCell>
                  </TableRow>
                ) : (
                  dashboardData.recentDevis.map((d) => {
                    return (
                      <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setPage('devis'); setSelectedDevisId(d.id); }}>
                        <TableCell className="font-mono text-xs">{d.number}</TableCell>
                        <TableCell className="text-sm">{d.client.company || d.client.name}</TableCell>
                        <TableCell>{getDevisStatusBadge(d.status as DevisStatus)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(d.totalTtc)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
