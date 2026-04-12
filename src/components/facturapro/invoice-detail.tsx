'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
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
import { useAppStore } from '@/lib/store';
import { formatDate, formatCurrency, getInvoiceStatusBadge, calculateTotals } from '@/lib/helpers';
import type { Invoice, InvoiceStatus } from '@/lib/types';

export function InvoiceDetail() {
  const {
    selectedInvoiceId,
    setSelectedInvoiceId,
    updateInvoiceStatus,
    setEditingInvoiceId,
  } = useAppStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!selectedInvoiceId) return;
    const id = ++fetchIdRef.current;
    fetch(`/api/invoices/${selectedInvoiceId}`)
      .then((r) => r.json())
      .then((data) => {
        if (id === fetchIdRef.current) {
          if (data.invoice) setInvoice(data.invoice);
          else setSelectedInvoiceId(null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (id === fetchIdRef.current) {
          setSelectedInvoiceId(null);
          setLoading(false);
        }
      });
    return () => { fetchIdRef.current++; };
  }, [selectedInvoiceId, setSelectedInvoiceId]);

  const handleStatus = async (status: InvoiceStatus) => {
    if (!selectedInvoiceId) return;
    setActionLoading(status);
    const err = await updateInvoiceStatus(selectedInvoiceId, status);
    setActionLoading(null);
    if (err) alert(err);
    else {
      fetch(`/api/invoices/${selectedInvoiceId}`)
        .then((r) => r.json())
        .then((data) => { if (data.invoice) setInvoice(data.invoice); });
    }
  };

  const handlePdf = () => {
    if (!selectedInvoiceId) return;
    window.open(`/api/invoices/${selectedInvoiceId}/pdf`, '_blank');
  };

  if (!selectedInvoiceId) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!invoice) return null;

  const totals = calculateTotals(invoice.items);
  const discountAmount = totals.totalTtc * (invoice.globalDiscount / 100);
  const finalTotal = totals.totalTtc - discountAmount;
  const canEdit = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => setSelectedInvoiceId(null)} className="text-muted-foreground">
        <ArrowLeft className="w-4 h-4 mr-1.5" />
        Retour à la liste
      </Button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-bold font-mono">{invoice.number}</h2>
            {getInvoiceStatusBadge(invoice.status as InvoiceStatus)}
          </div>
          <p className="text-sm text-muted-foreground">
            {invoice.client.company || invoice.client.name}
            {invoice.client.company && invoice.client.name && ` — ${invoice.client.name}`}
          </p>
          {invoice.devis && (
            <p className="text-xs text-muted-foreground mt-1">
              Devis d&apos;origine : {invoice.devis.number}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <Button variant="outline" size="sm" onClick={() => setEditingInvoiceId(invoice.id)}>Modifier</Button>
          )}
          <Button variant="outline" size="sm" onClick={handlePdf}>
            <Download className="w-4 h-4 mr-1.5" />
            Télécharger PDF
          </Button>
          {invoice.status === 'draft' && (
            <Button variant="outline" size="sm" onClick={() => handleStatus('sent')} disabled={!!actionLoading}>
              {actionLoading === 'sent' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-4 h-4 mr-1.5" />}
              Envoyer
            </Button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <Button size="sm" onClick={() => handleStatus('paid')} disabled={!!actionLoading}>
              {actionLoading === 'paid' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1.5" />}
              Marquer payée
            </Button>
          )}
          {invoice.status !== 'cancelled' && canEdit && (
            <Button variant="outline" size="sm" className="text-red-600" onClick={() => handleStatus('cancelled')} disabled={!!actionLoading}>
              {actionLoading === 'cancelled' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <XCircle className="w-4 h-4 mr-1.5" />}
              Annuler
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Date d&apos;émission</p>
            <p className="text-sm font-medium">{formatDate(invoice.issueDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Date d&apos;échéance</p>
            <p className="text-sm font-medium">{formatDate(invoice.dueDate)}</p>
          </CardContent>
        </Card>
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
              {invoice.items.map((item, idx) => (
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
              {invoice.globalDiscount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600"><span>Remise ({invoice.globalDiscount}%)</span><span>-{formatCurrency(discountAmount)}</span></div>
              )}
              <div className="flex justify-between text-lg font-bold"><span>Net à payer</span><span>{formatCurrency(finalTotal)}</span></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
