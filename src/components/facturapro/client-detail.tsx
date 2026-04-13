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
  CalendarDays,
  Clock3,
  ShieldCheck,
  AlertTriangle,
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
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
  const { toast } = useToast();
  const [client, setClient] = useState<ClientDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fetchIdRef = useRef(0);

  const loadClient = async (clientId: string) => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      const data = await res.json();
      if (id !== fetchIdRef.current) return;

      if (!res.ok) {
        const message = data?.error || 'Erreur lors du chargement du client';
        setLoadError(message);
        setClient(null);
        return;
      }

      if (!data.client) {
        setLoadError('Client introuvable');
        setClient(null);
        return;
      }

      setClient(data.client);
    } catch {
      if (id === fetchIdRef.current) {
        setLoadError('Erreur réseau pendant le chargement');
        setClient(null);
      }
    } finally {
      if (id === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!selectedClientId) return;
    void loadClient(selectedClientId);
    return () => {
      fetchIdRef.current++;
    };
  }, [selectedClientId]);

  const handleDelete = async () => {
    if (!selectedClientId) return;
    setDeleting(true);
    const err = await deleteClient(selectedClientId);
    setDeleting(false);
    if (err) {
      toast({ variant: 'destructive', title: 'Suppression impossible', description: err });
      return;
    }
    toast({ title: 'Client supprimé' });
    setShowDelete(false);
    setSelectedClientId(null);
  };

  if (!selectedClientId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (loadError || !client) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedClientId(null)}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Retour à la liste
        </Button>

        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertTitle>Impossible de charger ce client</AlertTitle>
          <AlertDescription>{loadError || 'Une erreur inconnue est survenue.'}</AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void loadClient(selectedClientId)}>
            Réessayer
          </Button>
          <Button variant="ghost" onClick={() => setSelectedClientId(null)}>
            Retour
          </Button>
        </div>
      </div>
    );
  }

  const fullAddress = [client.address, client.addressComplement, client.postalCode, client.city].filter(Boolean).join(', ');
  const devisCount = client._count?.devis || 0;
  const invoiceCount = client._count?.invoices || 0;
  const totalDocs = devisCount + invoiceCount;
  const latestInvoiceDueDate =
    client.invoices && client.invoices.length > 0
      ? client.invoices
          .map((inv) => inv.dueDate)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
      : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setSelectedClientId(null)} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour à la liste
      </Button>

      <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/30 shadow-glass">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold">{client.name}</h2>
                {client.company && <p className="text-muted-foreground">{client.company}</p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Badge variant="outline" className="gap-1">
                    <FileText className="w-3 h-3" />
                    {devisCount} devis
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Receipt className="w-3 h-3" />
                    {invoiceCount} factures
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    {totalDocs} documents
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingClientId(client.id)}>
                <Pencil className="w-4 h-4 mr-1.5" />
                Modifier
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => setShowDelete(true)}
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Supprimer
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-xs text-muted-foreground">
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
              <CalendarDays className="w-3.5 h-3.5" />
              Client depuis le {formatDate(client.createdAt)}
            </div>
            <div className="inline-flex items-center gap-2 rounded-md border bg-card px-2.5 py-1.5">
              <Clock3 className="w-3.5 h-3.5" />
              {latestInvoiceDueDate
                ? `Prochaine échéance: ${formatDate(latestInvoiceDueDate)}`
                : 'Aucune échéance enregistrée'}
            </div>
          </div>
        </CardContent>
      </Card>

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
              <span>{devisCount} devis</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              <span>{invoiceCount} factures</span>
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
                  <TableRow
                    key={d.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedDevisId(d.id);
                      setPage('devis');
                    }}
                  >
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
                  <TableRow
                    key={inv.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setSelectedInvoiceId(inv.id);
                      setPage('invoices');
                    }}
                  >
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
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
