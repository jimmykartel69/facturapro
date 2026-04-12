'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useAppStore, createEmptyLineItem } from '@/lib/store';
import { Invoice, InvoiceStatus, LineItem } from '@/lib/types';
import { todayISO, addDaysISO, formatCurrency } from '@/lib/helpers';

interface InvoiceFormProps {
  open: boolean;
  onClose: () => void;
  editingInvoice: Invoice | null;
}

export function InvoiceForm({ open, onClose, editingInvoice }: InvoiceFormProps) {
  const { clients, addInvoice, updateInvoice } = useAppStore();

  const [clientName, setClientName] = useState(editingInvoice?.clientName || '');
  const [clientEmail, setClientEmail] = useState(editingInvoice?.clientEmail || '');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [issueDate, setIssueDate] = useState(editingInvoice?.issueDate || todayISO());
  const [dueDate, setDueDate] = useState(editingInvoice?.dueDate || addDaysISO(30));
  const [items, setItems] = useState<LineItem[]>(
    editingInvoice?.items?.length ? editingInvoice.items : [createEmptyLineItem()]
  );
  const [tax, setTax] = useState(
    editingInvoice?.subtotal
      ? Math.round((editingInvoice.tax / editingInvoice.subtotal) * 100)
      : 18
  );
  const [status, setStatus] = useState<InvoiceStatus>(editingInvoice?.status || 'draft');
  const [notes, setNotes] = useState(editingInvoice?.notes || '');

  const handleClientSelect = (clientId: string) => {
    setSelectedClientId(clientId);
    const client = clients.find((c) => c.id === clientId);
    if (client) {
      setClientName(client.name);
      setClientEmail(client.email);
    }
  };

  const updateItem = (index: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      if (field === 'description') {
        item.description = value as string;
      } else if (field === 'quantity') {
        item.quantity = Math.max(0, Number(value) || 0);
      } else if (field === 'unitPrice') {
        item.unitPrice = Math.max(0, Number(value) || 0);
      }
      item.total = item.quantity * item.unitPrice;
      updated[index] = item;
      return updated;
    });
  };

  const addItem = () => {
    setItems((prev) => [...prev, createEmptyLineItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.round(subtotal * (tax / 100) * 100) / 100;
  const total = subtotal + taxAmount;

  const handleSubmit = () => {
    if (!clientName.trim() || !clientEmail.trim()) return;
    if (items.every((item) => !item.description.trim())) return;

    const invoiceData = {
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim(),
      issueDate,
      dueDate,
      items: items.filter((item) => item.description.trim()),
      subtotal,
      tax: taxAmount,
      total,
      status,
      notes: notes.trim() || undefined,
    };

    if (editingInvoice) {
      updateInvoice(editingInvoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }

    onClose();
  };

  const isValid = clientName.trim() && clientEmail.trim() && items.some((item) => item.description.trim() && item.unitPrice > 0);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
          <DialogDescription>
            {editingInvoice ? 'Update invoice details and line items.' : 'Fill in the details to create a new invoice.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Client Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Client</Label>
            {clients.length > 0 && (
              <Select value={selectedClientId} onValueChange={handleClientSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name} {client.company ? `(${client.company})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="clientName" className="text-xs text-muted-foreground">Client Name *</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Enter client name"
                />
              </div>
              <div>
                <Label htmlFor="clientEmail" className="text-xs text-muted-foreground">Client Email *</Label>
                <Input
                  id="clientEmail"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
            </div>
          </div>

          {/* Dates & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="issueDate" className="text-xs text-muted-foreground">Issue Date</Label>
              <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="dueDate" className="text-xs text-muted-foreground">Due Date</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Line Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-[1fr_80px_100px_100px_36px] gap-2 items-end">
                  <div>
                    {index === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                    <Input
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="h-9"
                    />
                  </div>
                  <div>
                    {index === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                    <Input
                      type="number"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    {index === 0 && <Label className="text-xs text-muted-foreground">Unit Price</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div>
                    {index === 0 && <Label className="text-xs text-muted-foreground">Total</Label>}
                    <div className="h-9 flex items-center text-sm font-medium text-muted-foreground">
                      {formatCurrency(item.total)}
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Tax & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tax" className="text-xs text-muted-foreground">Tax Rate (%)</Label>
              <Input id="tax" type="number" min="0" max="100" value={tax} onChange={(e) => setTax(Number(e.target.value))} className="w-24" />
            </div>
            <div>
              <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax ({tax}%)</span>
              <span className="font-medium">{formatCurrency(taxAmount)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-lg text-blue-600">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
