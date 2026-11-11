'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
const ClientForm = dynamic(() => import('./client-form').then(m => m.ClientForm));
const DevisForm = dynamic(() => import('./devis-form').then(m => m.DevisForm));
const InvoiceForm = dynamic(() => import('./invoice-form').then(m => m.InvoiceForm));
export function FormLoader({ kind, id }: { kind: 'client' | 'devis' | 'invoice'; id: string | null }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    const account = useAppStore.getState().user?.id;
    async function prepare() {
      setError(false);
      const paths = kind === 'client' ? [] : ['/api/settings'];
      if (id) paths.push(`/api/${kind === 'client' ? 'clients' : kind === 'invoice' ? 'invoices' : 'devis'}/${id}`);
      try {
        const values = await Promise.all([...paths.map(async path => {
          const response = await fetch(path, { signal: controller.signal, cache: 'no-store' });
          if (account !== useAppStore.getState().user?.id) throw new Error('Account changed');
          if (!response.ok) { useAppStore.getState().handleAuthError(response); throw new Error('Load failed'); }
          return response.json();
        }), kind === 'client' ? Promise.resolve(null) : useAppStore.getState().fetchClients().then(() => null)]);
        if (controller.signal.aborted || account !== useAppStore.getState().user?.id) return;
        for (const value of values) {
          if (!value) continue;
          if (value.settings) useAppStore.setState({ settings: value.settings });
          for (const [key, entity] of [['clients', value.client], ['devis', value.devis], ['invoices', value.invoice]] as const) {
            if (entity) useAppStore.setState(s => ({ [key]: [...s[key].filter(e => e.id !== entity.id), entity] }));
          }
        }
        setReady(true);
      } catch { if (!controller.signal.aborted) setError(true); }
    }
    void prepare();
    return () => controller.abort();
  }, [kind, id, attempt]);
  const close = () => {
    const store = useAppStore.getState();
    if (kind === 'client') store.setShowClientForm(false);
    else if (kind === 'devis') store.setShowDevisForm(false);
    else store.setShowInvoiceForm(false);
  };
  if (!ready) return <Dialog open onOpenChange={open => { if (!open) close(); }}><DialogContent><DialogTitle>Chargement du formulaire</DialogTitle><DialogDescription>Préparation des données nécessaires à la saisie.</DialogDescription>
    <p role={error ? 'alert' : 'status'}>{error ? 'Impossible de charger le formulaire.' : 'Chargement du formulaire…'}</p>
    {error && <Button onClick={() => setAttempt(n => n + 1)}>Réessayer</Button>}
    <Button variant="outline" onClick={close}>Fermer</Button>
  </DialogContent></Dialog>;
  if (kind === 'client') return <ClientForm editingClientId={id} />;
  if (kind === 'devis') return <DevisForm editingDevisId={id} />;
  return <InvoiceForm editingInvoiceId={id} />;
}
