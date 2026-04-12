'use client';

import React from 'react';
import {
  ArrowLeft,
  Download,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  Printer,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { InvoiceStatus } from '@/lib/types';
import { formatCurrency, formatDate, getStatusBadge } from '@/lib/helpers';

export function InvoiceDetail() {
  const { invoices, selectedInvoiceId, selectInvoice, setEditingInvoice, updateInvoiceStatus } = useAppStore();

  const invoice = invoices.find((inv) => inv.id === selectedInvoiceId);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">Facture introuvable.</p>
        <Button variant="outline" onClick={() => selectInvoice(null)} className="mt-4">
          Retour aux factures
        </Button>
      </div>
    );
  }

  const handleStatusUpdate = (status: InvoiceStatus) => {
    updateInvoiceStatus(invoice.id, status);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => selectInvoice(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold tracking-tight">{invoice.number}</h2>
              {getStatusBadge(invoice.status)}
            </div>
            <p className="text-muted-foreground mt-0.5">Détails et gestion de la facture</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditingInvoice(invoice.id)} className="gap-1.5">
            <Pencil className="h-3.5 w-3.5" />
            Modifier
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Imprimer
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* Quick Status Actions */}
      {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {(invoice.status === 'draft' || invoice.status === 'pending') && (
                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('sent')} className="gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
                  <Send className="h-3.5 w-3.5" />
                  Marquer comme envoyée
                </Button>
              )}
              {invoice.status !== 'overdue' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('overdue')} className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50">
                  <XCircle className="h-3.5 w-3.5" />
                  Marquer en retard
                </Button>
              )}
              <Button size="sm" onClick={() => handleStatusUpdate('paid')} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Marquer comme payée
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleStatusUpdate('cancelled')} className="gap-1.5 border-red-200 text-red-700 hover:bg-red-50">
                Annuler la facture
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoice Preview */}
      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="max-w-2xl mx-auto">
            {/* Invoice Header */}
            <div className="flex flex-col sm:flex-row justify-between gap-4 mb-8">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                    <span className="text-white font-bold text-lg">F</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">FacturaPro</h3>
                    <p className="text-xs text-slate-500">Gestion de factures</p>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-2xl font-bold text-slate-900">{invoice.number}</h3>
                <div className="mt-1">{getStatusBadge(invoice.status)}</div>
              </div>
            </div>

            {/* Client & Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Facturer à</p>
                <p className="font-semibold text-slate-900">{invoice.clientName}</p>
                <p className="text-sm text-slate-600">{invoice.clientEmail}</p>
              </div>
              <div className="sm:text-right">
                <div className="space-y-1">
                  <div>
                    <span className="text-xs text-slate-500">Date d'émission : </span>
                    <span className="text-sm font-medium">{formatDate(invoice.issueDate)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Date d'échéance : </span>
                    <span className="text-sm font-medium">{formatDate(invoice.dueDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Description</TableHead>
                  <TableHead className="text-center">Qté</TableHead>
                  <TableHead className="text-right">Prix unitaire</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-center">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="flex justify-end mt-6">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Sous-total</span>
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">TVA</span>
                  <span className="font-medium">{formatCurrency(invoice.tax)}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-900">Total</span>
                  <span className="font-bold text-xl text-blue-600">{formatCurrency(invoice.total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="mt-8 p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                <p className="text-sm text-slate-700">{invoice.notes}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
