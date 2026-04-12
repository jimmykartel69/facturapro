'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  DollarSign,
  FileText,
  AlertTriangle,
  Users,
  Plus,
  TrendingUp,
  Loader2,
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { formatCurrency, getDevisStatusBadge, getInvoiceStatusBadge, calculateTotals } from '@/lib/helpers';
import type { DevisStatus, InvoiceStatus } from '@/lib/types';

export function Dashboard() {
  const {
    dashboardData,
    fetchDashboard,
    setShowDevisForm,
    setShowInvoiceForm,
    setSelectedDevisId,
    setSelectedInvoiceId,
    setPage,
  } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    const id = ++fetchIdRef.current;
    fetchDashboard()
      .then(() => {
        if (id === fetchIdRef.current) setLoading(false);
      })
      .catch(() => {
        if (id === fetchIdRef.current) {
          setLoading(false);
          setError('Erreur lors du chargement des données');
        }
      });
    return () => { fetchIdRef.current++; };
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !dashboardData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tableau de bord</h2>
          <p className="text-muted-foreground text-sm">Vue d&apos;ensemble de votre activité</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">{error || 'Aucune donnée disponible'}</p>
          <Button variant="outline" onClick={() => {
            setLoading(true);
            setError(null);
            fetchDashboard().then(() => setLoading(false)).catch(() => {
              setLoading(false);
              setError('Erreur lors du chargement des données');
            });
          }}>
            Réessayer
          </Button>
        </div>
      </div>
    );
  }

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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Chiffre d&apos;affaires mensuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dashboardData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: number) => [formatCurrency(value), 'CA']}
                  labelStyle={{ fontWeight: 600 }}
                  contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="revenue" fill="#1a1a2e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

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
                    const totals = calculateTotals(inv.items);
                    return (
                      <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedInvoiceId(inv.id); setPage('invoices'); }}>
                        <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                        <TableCell className="text-sm">{inv.client.company || inv.client.name}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(totals.totalTtc)}</TableCell>
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
                    const totals = calculateTotals(d.items);
                    return (
                      <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedDevisId(d.id); setPage('devis'); }}>
                        <TableCell className="font-mono text-xs">{d.number}</TableCell>
                        <TableCell className="text-sm">{d.client.company || d.client.name}</TableCell>
                        <TableCell>{getDevisStatusBadge(d.status as DevisStatus)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(totals.totalTtc)}</TableCell>
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
