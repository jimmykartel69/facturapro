'use client';

import { useShallow } from 'zustand/react/shallow';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  FileText,
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
import type { Devis } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { formatDate, formatCurrency, getDevisStatusBadge, calculateTotals } from '@/lib/helpers';
import type { DevisStatus } from '@/lib/types';

const statusFilters: { label: string; value: string }[] = [
  { label: 'Tous', value: '' },
  { label: 'Brouillon', value: 'draft' },
  { label: 'Envoyé', value: 'sent' },
  { label: 'Accepté', value: 'accepted' },
  { label: 'Refusé', value: 'refused' },
  { label: 'Converti', value: 'converted' },
];

export function DevisList() {
  const {
    selectedDevisId,
    setSelectedDevisId,
    setShowDevisForm,
    setEditingDevisId,
    deleteDevis,
  } = useAppStore(useShallow(s => ({ selectedDevisId: s.selectedDevisId, setSelectedDevisId: s.setSelectedDevisId, setShowDevisForm: s.setShowDevisForm, setEditingDevisId: s.setEditingDevisId, deleteDevis: s.deleteDevis })));
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deferredSearch = useDebouncedSearch(search);
  const params = new URLSearchParams({ page: String(page), search: deferredSearch, status: statusFilter });
  const query = useApiQuery<{ devis: Devis[]; pagination: { hasNext: boolean } }>(`/api/devis?${params}`);
  const devis = query.data?.devis ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const err = await deleteDevis(deleteId);
    setDeleting(false);
    if (err) alert(err);
    else setDeleteId(null);
  };


  return (
    <div className="space-y-6">
      <ListFeedback error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Devis</h2>
          <p className="text-muted-foreground text-sm">{devis.length} devis sur cette page</p>
        </div>
        <Button onClick={() => { setShowDevisForm(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau devis
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
          {devis.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Aucun devis trouvé</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowDevisForm(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Créer un devis
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
                    <TableHead>Validité</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Montant TTC</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devis.map((d) => {
                    const totals = calculateTotals(d.items);
                    const displayedTotal = d.targetTotalTtc != null
                      ? d.targetTotalTtc
                      : Math.round(totals.totalTtc * (1 - (d.globalDiscount || 0) / 100) * 100) / 100;
                    return (
                      <TableRow key={d.id} className={selectedDevisId === d.id ? 'bg-muted/50' : ''}>
                        <TableCell className="font-mono text-xs font-medium">{d.number}</TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium">{d.client.company || d.client.name}</p>
                            {d.client.company && <p className="text-xs text-muted-foreground">{d.client.name}</p>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(d.issueDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(d.validUntil)}</TableCell>
                        <TableCell>{getDevisStatusBadge(d.status as DevisStatus)}</TableCell>
                        <TableCell className="text-right text-sm font-medium">{formatCurrency(displayedTotal)}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDevisId(d.id === selectedDevisId ? null : d.id)} title="Voir">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {d.status !== 'converted' && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingDevisId(d.id)} title="Modifier">
                                <Pencil className="w-4 h-4" />
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => setDeleteId(d.id)} title="Supprimer">
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
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
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
