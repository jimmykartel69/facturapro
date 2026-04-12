'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCcw,
  Send,
  Check,
  X,
  Trash2,
  Loader2,
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
import { formatDate, formatCurrency, getDevisStatusBadge, calculateTotals } from '@/lib/helpers';
import type { Devis, DevisStatus } from '@/lib/types';

interface DevisDetailFull extends Devis {
  invoice?: { id: string; number: string; status: string } | null;
}

export function DevisDetail() {
  const {
    selectedDevisId,
    setSelectedDevisId,
    updateDevisStatus,
    deleteDevis,
    convertDevisToInvoice,
    setEditingDevisId,
  } = useAppStore();
  const [devis, setDevis] = useState<DevisDetailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!selectedDevisId) return;
    const id = ++fetchIdRef.current;
    fetch(`/api/devis/${selectedDevisId}`)
      .then((r) => r.json())
      .then((data) => {
        if (id === fetchIdRef.current) {
          if (data.devis) setDevis(data.devis);
          else setSelectedDevisId(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (id === fetchIdRef.current) {
          setSelectedDevisId(null);
          setLoading(false);
        }
      });
    return () => { fetchIdRef.current++; };
  }, [selectedDevisId, setSelectedDevisId]);

  const handleStatus = async (status: DevisStatus) => {
    if (!selectedDevisId) return;
    setActionLoading(status);
    const err = await updateDevisStatus(selectedDevisId, status);
    setActionLoading(null);
    if (err) alert(err);
    else refetchDevis();
  };

  const handleConvert = async () => {
    if (!selectedDevisId) return;
    setActionLoading('convert');
    const err = await convertDevisToInvoice(selectedDevisId);
    setActionLoading(null);
    if (err) alert(err);
    else refetchDevis();
  };

  const handleDelete = async () => {
    if (!selectedDevisId) return;
    setActionLoading('delete');
    const err = await deleteDevis(selectedDevisId);
    setActionLoading(null);
    if (err) alert(err);
    else { setShowDelete(false); setSelectedDevisId(null); }
  };

  const handlePdf = () => {
    if (!selectedDevisId) return;
    window.open(`/api/devis/${selectedDevisId}/pdf`, '_blank');
  };

  const refetchDevis = () => {
    if (!selectedDevisId) return;
    fetch(`/api/devis/${selectedDevisId}`)
      .then((r) => r.json())
      .then((data) => { if (data.devis) setDevis(data.devis); });
  };

  if (!selectedDevisId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!devis) return null;

  const totals = calculateTotals(devis.items);
  const discountAmount = totals.totalTtc * (devis.globalDiscount / 100);
  const finalTotal = totals.totalTtc - discountAmount;
  const canEdit = devis.status !== 'converted';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setSelectedDevisId(null)} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour à la liste
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold font-mono">{devis.number}</h2>
            {getDevisStatusBadge(devis.status as DevisStatus)}
          </div>
          <p className="text-sm text-muted-foreground">
            {devis.client.company || devis.client.name}
            {devis.client.company && devis.client.name && ` — ${devis.client.name}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditingDevisId(devis.id)}>Modifier</Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePdf}>
            <Download className="w-4 h-4 mr-1.5" />
            PDF
          </Button>
          {devis.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => handleStatus('sent')} disabled={!!actionLoading}>
              {actionLoading === 'sent' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Envoyer
            </Button>
          )}
          {devis.status === 'sent' && (
            <>
              <Button size="sm" onClick={() => handleStatus('accepted')} disabled={!!actionLoading}>
                {actionLoading === 'accepted' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Check className="w-4 h-4 mr-1.5" />}
                Accepter
              </Button>
              <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleStatus('refused')} disabled={!!actionLoading}>
                {actionLoading === 'refused' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <X className="w-4 h-4 mr-1.5" />}
                Refuser
              </Button>
            </>
          )}
          {(devis.status === 'accepted' || devis.status === 'sent') && (
            <Button size="sm" onClick={handleConvert} disabled={actionLoading === 'convert'}>
              {actionLoading === 'convert' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-1.5" />}
              Convertir en facture
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => setShowDelete(true)}>
              <Trash2 className="w-4 h-4 mr-1.5" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Date d&apos;émission</p>
            <p className="text-sm font-medium">{formatDate(devis.issueDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Valide jusqu&apos;au</p>
            <p className="text-sm font-medium">{formatDate(devis.validUntil)}</p>
          </CardContent>
        </Card>
        {devis.invoice && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Facture associée</p>
              <p className="text-sm font-medium mt-1">{devis.invoice.number}</p>
            </CardContent>
          </Card>
        )}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold">Détail des articles</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Qté</TableHead>
                <TableHead>Unité</TableHead>
                <TableHead className="text-right">P.U. HT</TableHead>
                <TableHead className="text-right">TVA</TableHead>
                <TableHead className="text-right">Total HT</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {devis.items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.description}</TableCell>
                  <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-sm">{item.unit}</TableCell>
                  <TableCell className="text-right text-sm">{formatCurrency(item.unitPrice)}</TableCell>
                  <TableCell className="text-right text-sm">{item.tvaRate}%</TableCell>
                  <TableCell className="text-right text-sm font-medium">{formatCurrency(item.quantity * item.unitPrice)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Separator className="my-4" />
          <div className="flex justify-end">
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-sm"><span>Total HT</span><span>{formatCurrency(totals.totalHt)}</span></div>
              {Object.entries(totals.tvaDetails).map(([rate, amount]) => (
                <div key={rate} className="flex justify-between text-sm text-muted-foreground"><span>TVA {rate}%</span><span>{formatCurrency(amount)}</span></div>
              ))}
              <div className="flex justify-between text-sm"><span>Total TVA</span><span>{formatCurrency(totals.totalTva)}</span></div>
              <Separator />
              <div className="flex justify-between text-sm font-semibold"><span>Total TTC</span><span>{formatCurrency(totals.totalTtc)}</span></div>
              {devis.globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600"><span>Remise ({devis.globalDiscount}%)</span><span>-{formatCurrency(discountAmount)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold"><span>Net à payer</span><span>{formatCurrency(finalTotal)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {devis.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{devis.notes}</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce devis ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={!!actionLoading} className="bg-red-600 hover:bg-red-700">
              {actionLoading === 'delete' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
