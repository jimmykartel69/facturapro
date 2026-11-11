'use client';

import { useShallow } from 'zustand/react/shallow';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Receipt,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApiQuery, useDebouncedSearch } from '@/hooks/use-api-query';
import { ListFeedback, ListPagination } from './list-feedback';
import type { Invoice } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { formatDate, formatCurrency, getInvoiceStatusBadge, calculateTotals } from '@/lib/helpers';
import type { InvoiceStatus } from '@/lib/types';

const statusFilters: { label: string; value: string }[] = [
  { label: 'Toutes', value: '' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyée', value: 'sent' },
  { label: 'Payée', value: 'paid' },
  { label: 'En retard', value: 'overdue' },
  { label: 'Annulée', value: 'cancelled' },
];

export function InvoiceList() {
  const {
    selectedInvoiceId,
    setSelectedInvoiceId,
    setShowInvoiceForm,
    setEditingInvoiceId,
    deleteInvoice,
  } = useAppStore(useShallow(s => ({ selectedInvoiceId: s.selectedInvoiceId, setSelectedInvoiceId: s.setSelectedInvoiceId, setShowInvoiceForm: s.setShowInvoiceForm, setEditingInvoiceId: s.setEditingInvoiceId, deleteInvoice: s.deleteInvoice })));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deferredSearch = useDebouncedSearch(search);
  const params = new URLSearchParams({ page: String(page), search: deferredSearch, status: statusFilter });
  const query = useApiQuery<{ invoices: Invoice[]; pagination: { hasNext: boolean } }>(`/api/invoices?${params}`);
  const invoices = query.data?.invoices ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const err = await deleteInvoice(deleteId);
    setDeleting(false);
    if (err) alert(err);
    else setDeleteId(null);
  };


  return (
    <div className="space-y-6">
      <ListFeedback error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Factures</h2>
          <p className="text-muted-foreground text-sm">{invoices.length} facture(s) sur cette page</p>
        </div>
        <Button onClick={() => { setShowInvoiceForm(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nouvelle facture
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Rechercher..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map((f) => (
            <Button key={f.value} variant={statusFilter === f.value ? 'default' : 'outline'} size="sm" className="text-xs h-8" onClick={() => { setStatusFilter(f.value); setPage(1); }}>
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Receipt className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Aucune facture trouvée</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowInvoiceForm(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Créer une facture
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N°</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Échéance</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant TTC</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((inv) => {
                    const totals = calculateTotals(inv.items);
                    return (
                      <TableRow key={inv.id} className={selectedInvoiceId === inv.id ? 'bg-muted/50' : ''}>
                        <TableCell className="font-mono text-xs font-medium">{inv.number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{inv.client.company || inv.client.name}</p>
                            {inv.client.company && <p className="text-xs text-muted-foreground">{inv.client.name}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(inv.issueDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(inv.dueDate)}</TableCell>
                        <TableCell>{getInvoiceStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(totals.totalTtc)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedInvoiceId(inv.id === selectedInvoiceId ? null : inv.id)} title="Voir">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingInvoiceId(inv.id)} title="Modifier">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteId(inv.id)} title="Supprimer">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ListPagination page={page} hasNext={query.data?.pagination.hasNext ?? false} onChange={setPage} />
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette facture ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
