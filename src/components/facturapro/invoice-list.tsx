'use client';

import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  FileText,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { InvoiceStatus } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadge } from '@/lib/helpers';
import { cn } from '@/lib/utils';

const statusFilters = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'draft', label: 'Brouillon' },
  { value: 'sent', label: 'Envoyée' },
  { value: 'pending', label: 'En attente' },
  { value: 'paid', label: 'Payée' },
  { value: 'overdue', label: 'En retard' },
  { value: 'cancelled', label: 'Annulée' },
];

export function InvoiceList() {
  const {
    invoices,
    invoiceFilter,
    searchQuery,
    selectedInvoiceId,
    setInvoiceFilter,
    setSearchQuery,
    selectInvoice,
    setShowInvoiceForm,
    setEditingInvoice,
    deleteInvoice,
    updateInvoiceStatus,
    setPage,
  } = useAppStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);

  const filteredInvoices = useMemo(() => {
    let filtered = [...invoices];

    if (invoiceFilter !== 'all') {
      filtered = filtered.filter((inv) => inv.status === invoiceFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (inv) =>
          inv.number.toLowerCase().includes(q) ||
          inv.clientName.toLowerCase().includes(q) ||
          inv.clientEmail.toLowerCase().includes(q),
      );
    }

    return filtered.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
  }, [invoices, invoiceFilter, searchQuery]);

  const handleDelete = () => {
    if (invoiceToDelete) {
      deleteInvoice(invoiceToDelete);
      setDeleteDialogOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleStatusChange = (id: string, status: InvoiceStatus) => {
    updateInvoiceStatus(id, status);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: invoices.length };
    invoices.forEach((inv) => {
      counts[inv.status] = (counts[inv.status] || 0) + 1;
    });
    return counts;
  }, [invoices]);

  // If an invoice is selected, show the detail
  if (selectedInvoiceId) {
    return null; // Parent will render InvoiceDetail
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Factures</h2>
          <p className="text-muted-foreground mt-1">Gérez et suivez toutes vos factures</p>
        </div>
        <Button onClick={() => setShowInvoiceForm(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 self-start">
          <Plus className="h-4 w-4" />
          Nouvelle facture
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher des factures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={invoiceFilter} onValueChange={setInvoiceFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filtrer par statut" />
              </SelectTrigger>
              <SelectContent>
                {statusFilters.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                    {statusCounts[f.value] !== undefined && (
                      <span className="ml-1.5 text-xs text-muted-foreground">({statusCounts[f.value]})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quick status filter tabs */}
          <div className="flex gap-2 mt-3 flex-wrap">
            {statusFilters.map((f) => (
              <button
                key={f.value}
                onClick={() => setInvoiceFilter(f.value)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                  invoiceFilter === f.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                )}
              >
                {f.label} ({statusCounts[f.value] || 0})
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-medium">Aucune facture trouvée</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {searchQuery ? 'Essayez d\'ajuster votre recherche' : 'Créez votre première facture pour commencer'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowInvoiceForm(true)} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une facture
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Facture</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="hidden md:table-cell">Date d'émission</TableHead>
                  <TableHead className="hidden md:table-cell">Date d'échéance</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="cursor-pointer"
                    onClick={() => selectInvoice(invoice.id)}
                  >
                    <TableCell className="font-medium">{invoice.number}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{invoice.clientName}</p>
                        <p className="text-xs text-muted-foreground">{invoice.clientEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(invoice.issueDate)}</TableCell>
                    <TableCell className="hidden md:table-cell">{formatDate(invoice.dueDate)}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); selectInvoice(invoice.id); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            Voir les détails
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingInvoice(invoice.id); }}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          {(invoice.status === 'draft' || invoice.status === 'pending') && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(invoice.id, 'sent'); }}>
                              <Send className="h-4 w-4 mr-2" />
                              Marquer comme envoyée
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(invoice.id, 'paid'); }}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Marquer comme payée
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'overdue' && invoice.status !== 'cancelled' && invoice.status !== 'paid' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(invoice.id, 'overdue'); }}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Marquer en retard
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== 'cancelled' && (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStatusChange(invoice.id, 'cancelled'); }}>
                              <XCircle className="h-4 w-4 mr-2" />
                              Annuler la facture
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setInvoiceToDelete(invoice.id); setDeleteDialogOpen(true); }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer la facture</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
