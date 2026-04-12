'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { Devis, DevisItem } from '@/lib/types';

const emptyItem = (): DevisItem => ({
  description: '',
  quantity: 1,
  unit: 'unité',
  unitPrice: 0,
  tvaRate: 20,
});

interface DevisFormProps {
  editingDevisId: string | null;
}

export function DevisForm({ editingDevisId }: DevisFormProps) {
  const {
    showDevisForm,
    clients,
    devis,
    setShowDevisForm,
    createDevis,
    updateDevis,
  } = useAppStore();

  const existing = editingDevisId ? devis.find((d: Devis) => d.id === editingDevisId) : null;

  const d = new Date();
  d.setDate(d.getDate() + 30);

  const [clientId, setClientId] = useState(() => existing?.clientId || '');
  const [items, setItems] = useState<DevisItem[]>(
    () => existing?.items.length ? existing.items.map((i: DevisItem) => ({ ...i })) : [emptyItem()]
  );
  const [notes, setNotes] = useState(() => existing?.notes || '');
  const [globalDiscount, setGlobalDiscount] = useState(() => existing?.globalDiscount || 0);
  const [validUntil, setValidUntil] = useState(
    () => existing?.validUntil ? existing.validUntil.split('T')[0] : d.toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);

  const updateItem = (index: number, field: keyof DevisItem, value: string | number) => {
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
      items: items.map(({ description, quantity, unit, unitPrice, tvaRate }) => ({
        description,
        quantity: Number(quantity),
        unit,
        unitPrice: Number(unitPrice),
        tvaRate: Number(tvaRate),
      })),
      notes: notes || null,
      globalDiscount: Number(globalDiscount),
      validUntil: validUntil || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
    let err: string | null;
    if (editingDevisId) {
      err = await updateDevis(editingDevisId, data);
    } else {
      err = await createDevis(data);
    }
    setLoading(false);
    if (err) alert(err);
    else setShowDevisForm(false);
  };

  return (
    <Dialog open={showDevisForm} onOpenChange={(open) => { if (!open) setShowDevisForm(false); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingDevisId ? 'Modifier le devis' : 'Nouveau devis'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId} onValueChange={setClientId} required>
              <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.company ? `${c.company} - ${c.name}` : c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Articles</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-12 sm:col-span-4">
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <Input value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Description" required className="mt-1" />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Qté</Label>
                    <Input type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="mt-1" required />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Unité</Label>
                    <Input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className="mt-1" />
                  </div>
                  <div className="col-span-3 sm:col-span-2">
                    <Label className="text-xs text-muted-foreground">Prix unit. HT</Label>
                    <Input type="number" min="0" step="0.01" value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)} className="mt-1" required />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">TVA %</Label>
                    <Input type="number" min="0" max="100" step="0.1" value={item.tvaRate} onChange={(e) => updateItem(idx, 'tvaRate', parseFloat(e.target.value) || 0)} className="mt-1" />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <Label className="text-xs text-muted-foreground">Total HT</Label>
                    <div className="mt-1 text-sm font-medium px-2 py-2 bg-muted rounded-md">{formatCurrency(item.quantity * item.unitPrice)}</div>
                  </div>
                  <div className="col-span-3 sm:col-span-2 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => removeItem(idx)} disabled={items.length <= 1}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Total HT</span><span className="font-medium">{formatCurrency(totals.totalHt)}</span></div>
            {Object.entries(totals.tvaDetails).map(([rate, amount]) => (
              <div key={rate} className="flex justify-between text-sm text-muted-foreground"><span>TVA {rate}%</span><span>{formatCurrency(amount)}</span></div>
            ))}
            <div className="flex justify-between text-sm"><span>Total TVA</span><span>{formatCurrency(totals.totalTva)}</span></div>
            <div className="flex justify-between text-sm font-semibold"><span>Total TTC</span><span>{formatCurrency(totals.totalTtc)}</span></div>
            <Separator />
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-sm whitespace-nowrap">Remise (%)</Label>
                <Input type="number" min="0" max="100" step="0.1" value={globalDiscount} onChange={(e) => setGlobalDiscount(parseFloat(e.target.value) || 0)} className="w-20 h-8" />
              </div>
              <span className="text-sm font-bold">{formatCurrency(finalTotal)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="devis-valid">Valide jusqu&apos;au</Label>
              <Input id="devis-valid" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="devis-notes">Notes</Label>
              <Input id="devis-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes ou conditions" />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowDevisForm(false)}>Annuler</Button>
            <Button type="submit" disabled={loading || !clientId || items.length === 0}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingDevisId ? 'Mettre à jour' : 'Créer le devis'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
