'use client';

import React, { useState } from 'react';
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
import { useAppStore } from '@/lib/store';
import { Client } from '@/lib/types';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  editingClient: Client | null;
}

export function ClientForm({ open, onClose, editingClient }: ClientFormProps) {
  const { addClient, updateClient } = useAppStore();

  const [name, setName] = useState(editingClient?.name || '');
  const [email, setEmail] = useState(editingClient?.email || '');
  const [company, setCompany] = useState(editingClient?.company || '');
  const [phone, setPhone] = useState(editingClient?.phone || '');
  const [address, setAddress] = useState(editingClient?.address || '');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;

    const clientData = {
      name: name.trim(),
      email: email.trim(),
      company: company.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
    };

    if (editingClient) {
      updateClient(editingClient.id, clientData);
    } else {
      addClient(clientData);
    }

    onClose();
  };

  const isValid = name.trim() && email.trim() && email.includes('@');

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingClient ? 'Modifier le client' : 'Ajouter un nouveau client'}</DialogTitle>
          <DialogDescription>
            {editingClient ? 'Mettez à jour les informations du client.' : 'Remplissez les informations du client.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Nom complet *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. Marie Dupont"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@exemple.com"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="company">Entreprise</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Nom de l'entreprise (facultatif)"
            />
          </div>
          <div>
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+33 6 12 34 56 78"
            />
          </div>
          <div>
            <Label htmlFor="address">Adresse</Label>
            <Textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Adresse complète (facultatif)"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {editingClient ? 'Mettre à jour' : 'Ajouter le client'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
