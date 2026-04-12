'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Building2,
  FileText,
  Receipt,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { useAppStore } from '@/lib/store';
import { formatDate, getDevisStatusBadge, getInvoiceStatusBadge } from '@/lib/helpers';
import type { DevisStatus, InvoiceStatus } from '@/lib/types';

interface ClientDetailData {
  id: string;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  addressComplement?: string | null;
  postalCode?: string | null;
  city?: string | null;
  siret?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { devis: number; invoices: number };
  devis?: { id: string; number: string; status: string; createdAt: string }[];
  invoices?: { id: string; number: string; status: string; createdAt: string; dueDate: string }[];
}

export function ClientDetail() {
  const {
    selectedClientId,
    setSelectedClientId,
    setEditingClientId,
    deleteClient,
    setSelectedDevisId,
    setSelectedInvoiceId,
    setPage,
  } = useAppStore();
  const [client, setClient] = useState<ClientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!selectedClientId) return;
    const id = ++fetchIdRef.current;
    fetch(`/api/clients/${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (id === fetchIdRef.current) {
          if (data.client) setClient(data.client);
          else setSelectedClientId(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (id === fetchIdRef.current) {
          setSelectedClientId(null);
          setLoading(false);
        }
      });
    return () => { fetchIdRef.current++; };
  }, [selectedClientId, setSelectedClientId]);

  const handleDelete = async () => {
    if (!selectedClientId) return;
    setDeleting(true);
    const err = await deleteClient(selectedClientId);
    setDeleting(false);
    if (err) alert(err);
    else {
      setShowDelete(false);
      setSelectedClientId(null);
    }
  };

  if (!selectedClientId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!client) return null;

  const fullAddress = [client.address, client.addressComplement, client.postalCode, client.city].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setSelectedClientId(null)} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour à la liste
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{client.name}</h2>
            {client.company && <p className="text-muted-foreground">{client.company}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingClientId(client.id)}>
            <Pencil className="w-4 h-4 mr-1.5" />
            Modifier
          </Button>
          <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDelete(true)}>
            <Trash2 className="w-4 h-4 mr-1.5" />
            Supprimer
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Coordonnées</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <a href={`mailto:${client.email}`} className="hover:underline">{client.email}</a>
            </div>
            {client.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${client.phone}`} className="hover:underline">{client.phone}</a>
              </div>
            )}
            {fullAddress && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <span>{fullAddress}</span>
              </div>
            )}
            {client.siret && (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-muted-foreground font-medium">SIRET:</span>
                <span>{client.siret}</span>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>{client._count?.devis || 0} devis</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span>{client._count?.invoices || 0} factures</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Client depuis le {formatDate(client.createdAt)}
            </div>
          </CardContent>
        </Card>
      </div>

      {client.notes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      <Separator />

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Devis récents</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPage('devis')}>Voir tout</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!client.devis || client.devis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-4">Aucun devis</TableCell>
                </TableRow>
              ) : (
                client.devis.map((d) => (
                  <TableRow key={d.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedDevisId(d.id); setPage('devis'); }}>
                    <TableCell className="font-mono text-xs">{d.number}</TableCell>
                    <TableCell className="text-sm">{formatDate(d.createdAt)}</TableCell>
                    <TableCell>{getDevisStatusBadge(d.status as DevisStatus)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Factures récentes</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPage('invoices')}>Voir tout</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N°</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!client.invoices || client.invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-4">Aucune facture</TableCell>
                </TableRow>
              ) : (
                client.invoices.map((inv) => (
                  <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/50" onClick={() => { setSelectedInvoiceId(inv.id); setPage('invoices'); }}>
                    <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.createdAt)}</TableCell>
                    <TableCell className="text-sm">{formatDate(inv.dueDate)}</TableCell>
                    <TableCell>{getInvoiceStatusBadge(inv.status as InvoiceStatus)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible. Tous les devis et factures associés seront également supprimés.</AlertDialogDescription>
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
