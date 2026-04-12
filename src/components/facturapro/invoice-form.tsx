'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Loader2, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { formatCurrency, calculateTotals } from '@/lib/helpers';
import type { Invoice, InvoiceItem } from '@/lib/types';

const UNITS = [
  { value: 'unité', label: 'Unité' },
  { value: 'h', label: 'Heure' },
  { value: 'jour', label: 'Jour' },
  { value: 'mois', label: 'Mois' },
  { value: 'm', label: 'Mètre (m)' },
  { value: 'm²', label: 'Mètre carré (m²)' },
  { value: 'm³', label: 'Mètre cube (m³)' },
  { value: 'ml', label: 'Mètre linéaire (ml)' },
  { value: 'forfait', label: 'Forfait' },
  { value: 'ensemble', label: 'Ensemble' },
  { value: 'lot', label: 'Lot' },
  { value: 'pose', label: 'Pose' },
  { value: 'déplacement', label: 'Déplacement' },
  { value: 'kg', label: 'Kilogramme (kg)' },
  { value: 'ens', label: 'Ensemble' },
];

const emptyItem = (): InvoiceItem => ({
  designation: '',
  description: '',
  quantity: 1,
  unit: 'unité',
  unitPrice: 0,
  tvaRate: 0,
});

interface InvoiceFormProps {
  editingInvoiceId: string | null;
}

export function InvoiceForm({ editingInvoiceId }: InvoiceFormProps) {
  const {
    showInvoiceForm,
    clients,
    invoices,
    setShowInvoiceForm,
    createInvoice,
    updateInvoice,
  } = useAppStore();

  const existing = editingInvoiceId ? invoices.find((i: Invoice) => i.id === editingInvoiceId) : null;

  const d = new Date();
  d.setDate(d.getDate() + 30);

  const [clientId, setClientId] = useState(() => existing?.clientId || '');
  const [items, setItems] = useState<InvoiceItem[]>(
    () => existing?.items.length
      ? existing.items.map((i: InvoiceItem) => ({
          ...i,
          designation: i.designation || '',
          description: i.description || '',
        }))
      : [emptyItem()]
  );
  const [notes, setNotes] = useState(() => existing?.notes || '');
  const [globalDiscount, setGlobalDiscount] = useState(() => existing?.globalDiscount || 0);
  const [dueDate, setDueDate] = useState(
    () => existing?.dueDate ? existing.dueDate.split('T')[0] : d.toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    setItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);
  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totals = calculateTotals(items);
  const discountAmount = totals.totalTtc * (globalDiscount / 100);
  const finalTotal = totals.totalTtc - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || items.length === 0) return;
    setLoading(true);
    const data = {
      clientId,
      items: items.map(({ designation, description, quantity, unit, unitPrice, tvaRate }) => ({
        designation: designation || 'Sans titre',
        description: description || null,
        quantity: Number(quantity),
        unit,
        unitPrice: Number(unitPrice),
        tvaRate: Number(tvaRate),
      })),
      notes: notes || null,
      globalDiscount: Number(globalDiscount),
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    let err: string | null;
    if (editingInvoiceId) {
      err = await updateInvoice(editingInvoiceId, data);
    } else {
      err = await createInvoice(data);
    }
    setLoading(false);
    if (err) alert(err);
    else setShowInvoiceForm(false);
  };

  return (
    <Dialog open={showInvoiceForm} onOpenChange={(open) => { if (!open) setShowInvoiceForm(false); }}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingInvoiceId ? 'Modifier la facture' : 'Nouvelle facture'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Client */}
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sélectionner un client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company ? `${c.company} - ${c.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-base">Articles</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1.5" />
                Ajouter une ligne
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                  {/* Row 1: Designation + Description */}
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-12 sm:col-span-4">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Désignation *
                      </Label>
                      <Input
                        value={item.designation}
                        onChange={(e) => updateItem(idx, 'designation', e.target.value)}
                        placeholder="Ex: Installation tableau électrique"
                        required
                      />
                    </div>
                    <div className="col-span-12 sm:col-span-8">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Description
                      </Label>
                      <Textarea
                        value={item.description || ''}
                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                        placeholder="Détails complémentaires (optionnel)..."
                        className="min-h-[38px] resize-none"
                        rows={1}
                      />
                    </div>
                  </div>

                  {/* Row 2: Quantité, Unité, Prix, TVA, Total, Delete */}
                  <div className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-6 sm:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Quantité
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Unité
                      </Label>
                      <Select value={item.unit} onValueChange={(v) => updateItem(idx, 'unit', v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNITS.map((u) => (
                            <SelectItem key={u.value} value={u.value}>
                              {u.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 sm:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Prix unit. HT
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                        required
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        TVA %
                      </Label>
                      <Select
                        value={String(item.tvaRate)}
                        onValueChange={(v) => updateItem(idx, 'tvaRate', parseFloat(v))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0% (Auto-entrepreneur)</SelectItem>
                          <SelectItem value="5.5">5,5%</SelectItem>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="20">20%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <Label className="text-xs font-medium text-muted-foreground mb-1 block">
                        Total HT
                      </Label>
                      <div className="flex items-center h-9 px-3 bg-muted rounded-md border text-sm font-semibold">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </div>
                    </div>
                    <div className="col-span-6 sm:col-span-1 flex justify-end items-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-muted-foreground hover:text-red-500"
                        onClick={() => removeItem(idx)}
                        disabled={items.length <= 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total HT</span>
              <span className="font-medium">{formatCurrency(totals.totalHt)}</span>
            </div>
            {Object.entries(totals.tvaDetails).map(([rate, amount]) => (
              <div key={rate} className="flex justify-between text-sm text-muted-foreground">
                <span>TVA {rate}%</span>
                <span>{formatCurrency(amount)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm">
              <span>Total TVA</span>
              <span>{formatCurrency(totals.totalTva)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>Total TTC</span>
              <span>{formatCurrency(totals.totalTtc)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Remise (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)}
                  className="w-24 h-8"
                />
              </div>
              <span className="text-lg font-bold">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          {/* Date + Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="inv-due">Date d&apos;échéance</Label>
              <Input
                id="inv-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-notes">Notes / Conditions</Label>
              <Textarea
                id="inv-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Paiement à réception de la facture..."
                className="min-h-[38px] resize-none"
                rows={1}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowInvoiceForm(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading || !clientId || items.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingInvoiceId ? 'Mettre à jour' : 'Créer la facture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
