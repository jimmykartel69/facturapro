'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import type { Client } from '@/lib/types';

interface ClientFormProps {
  editingClientId: string | null;
}

export function ClientForm({ editingClientId }: ClientFormProps) {
  const {
    showClientForm,
    clients,
    setShowClientForm,
    createClient,
    updateClient,
  } = useAppStore();

  const existing = editingClientId ? clients.find((c) => c.id === editingClientId) : null;

  const emptyForm = {
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    addressComplement: '',
    postalCode: '',
    city: '',
    siret: '',
    notes: '',
  };

  const [form, setForm] = useState(() => existing
    ? {
        name: existing.name || '',
        company: existing.company || '',
        email: existing.email || '',
        phone: existing.phone || '',
        address: existing.address || '',
        addressComplement: existing.addressComplement || '',
        postalCode: existing.postalCode || '',
        city: existing.city || '',
        siret: existing.siret || '',
        notes: existing.notes || '',
      }
    : emptyForm
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) return;
    setLoading(true);
    const data: Record<string, unknown> = { ...form };
    let err: string | null;
    if (editingClientId) {
      err = await updateClient(editingClientId, data);
    } else {
      err = await createClient(data);
    }
    setLoading(false);
    if (err) alert(err);
    else setShowClientForm(false);
  };

  return (
    <Dialog open={showClientForm} onOpenChange={(open) => { if (!open) setShowClientForm(false); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingClientId ? 'Modifier le client' : 'Nouveau client'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-name">Nom *</Label>
              <Input id="client-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="Dupont" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-company">Entreprise</Label>
              <Input id="client-company" value={form.company} onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))} placeholder="Acme Corp" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-email">Email *</Label>
              <Input id="client-email" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required placeholder="contact@exemple.fr" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-phone">Téléphone</Label>
              <Input id="client-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-address">Adresse</Label>
            <Input id="client-address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} placeholder="12 rue de la Paix" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-address2">Complément d&apos;adresse</Label>
            <Input id="client-address2" value={form.addressComplement} onChange={(e) => setForm((f) => ({ ...f, addressComplement: e.target.value }))} placeholder="Bâtiment B, étage 3" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client-postal">Code postal</Label>
              <Input id="client-postal" value={form.postalCode} onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))} placeholder="75001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="client-city">Ville</Label>
              <Input id="client-city" value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Paris" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-siret">SIRET</Label>
            <Input id="client-siret" value={form.siret} onChange={(e) => setForm((f) => ({ ...f, siret: e.target.value }))} placeholder="123 456 789 00012" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client-notes">Notes</Label>
            <Textarea id="client-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Informations supplémentaires..." rows={3} />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowClientForm(false)}>Annuler</Button>
            <Button type="submit" disabled={loading || !form.name || !form.email}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingClientId ? 'Mettre à jour' : 'Créer le client'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
