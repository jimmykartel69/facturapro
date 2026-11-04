'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileMinus2, Download, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface CreditNoteSummary {
  id: string; number: string; issueDate: string; reason: string; amountTtcCents: number;
}
interface CreditNotesResponse {
  notes: CreditNoteSummary[];
  originalArchived: boolean;
  fullCreditAvailable: boolean;
}
const money = (cents: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

export function CreditNotesSection({ invoiceId, status, archived }: {
  invoiceId: string; status: string; archived: boolean;
}) {
  const [records, setRecords] = useState<CreditNotesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [reason, setReason] = useState('');
  const [legacyAccepted, setLegacyAccepted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    const response = await fetch('/api/invoices/' + invoiceId + '/credit-notes', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossible de récupérer les avoirs de cette facture.');
    return response.json() as Promise<CreditNotesResponse>;
  }, [invoiceId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRecords(null);
    load().then(value => {
      if (active) { setRecords(value); setLoading(false); }
    }).catch(() => {
      if (active) { setError('La liste des avoirs est indisponible.'); setLoading(false); }
    });
    return () => { active = false; };
  }, [load]);

  const createCredit = async () => {
    if (reason.trim().length < 10 || processing) return;
    setProcessing(true);
    setError(null);
    try {
      const response = await fetch('/api/invoices/' + invoiceId + '/credit-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'full', reason: reason.trim(), acknowledgeLegacy: legacyAccepted,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Création de l’avoir impossible.');
      setRecords(await load());
      setMessage('Avoir ' + payload.creditNote.number + ' émis et archivé.');
      setShowDialog(false);
      setReason('');
      setLegacyAccepted(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Erreur de création.');
    } finally {
      setProcessing(false);
    }
  };

  if (!['sent', 'paid', 'overdue'].includes(status) && !(records?.notes.length)) return null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <FileMinus2 className="w-4 h-4" /> Avoirs et conservation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          {archived || records?.originalArchived
            ? 'PDF d’origine figé et conservé lors de son émission.'
            : 'Facture historique sans archive figée : vérifiez la version originale avant de créer un avoir.'}
        </p>
        {loading && <p className="text-sm text-muted-foreground flex gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Chargement des avoirs…</p>}
        {records?.notes.map(note => (
          <div key={note.id} className="border rounded-md p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold text-sm">{note.number} — Avoir intégral</p>
              <p className="text-xs text-muted-foreground">{new Date(note.issueDate).toLocaleDateString('fr-FR')} • {note.reason}</p>
              <p className="text-sm font-medium">Montant crédité : {money(note.amountTtcCents)}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => window.open('/api/credit-notes/' + note.id + '/pdf', '_blank', 'noopener,noreferrer')}>
              <Download className="w-4 h-4 mr-2" /> PDF de l’avoir
            </Button>
          </div>
        ))}
        {message && <p role="status" className="text-sm text-green-700">{message}</p>}
        {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
        {records?.fullCreditAvailable && (
          <Button variant="outline" size="sm" onClick={() => { setError(null); setShowDialog(true); }}>
            <FileMinus2 className="w-4 h-4 mr-2" /> Émettre un avoir intégral
          </Button>
        )}
      </CardContent>
      <Dialog open={showDialog} onOpenChange={v => { if (!processing) setShowDialog(v); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Émettre un avoir intégral</DialogTitle>
            <DialogDescription>
              L’avoir annule la totalité du montant de cette facture. Son numéro et son PDF seront définitifs.
              Aucun remboursement bancaire automatique ne sera effectué.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="credit-reason">Motif de l’avoir</label>
            <Textarea id="credit-reason" value={reason} maxLength={200}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex. : annulation de la prestation après accord du client" />
            {!archived && !records?.originalArchived && (
              <label className="flex items-start gap-2 text-xs">
                <input type="checkbox" checked={legacyAccepted}
                  onChange={e => setLegacyAccepted(e.target.checked)} className="mt-0.5" />
                <span className="flex-1"><AlertTriangle className="inline w-3 h-3 mr-1" />
                  J’ai vérifié la facture originale conservée hors application et ses montants.
                  Les données de cette ancienne facture peuvent avoir changé depuis son émission.</span>
              </label>
            )}
            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" disabled={processing} onClick={() => setShowDialog(false)}>Retour</Button>
            <Button disabled={processing || reason.trim().length < 10 ||
              (!archived && !records?.originalArchived && !legacyAccepted)} onClick={createCredit}>
              {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ShieldCheck className="w-4 h-4 mr-2" />}
              Confirmer l’émission
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
