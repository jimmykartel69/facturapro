'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Download, FileClock, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

type DocType = 'devis' | 'invoice';
type Version = { version: string; deliveryMode: string; createdAt?: string };
type State = {
  editable: boolean;
  current: Version | null;
  candidate: Omit<Version, 'createdAt'> | null;
  differs: boolean;
  clientType: string | null;
  message?: string;
};

export function CgvVersionChoice({
  type,
  documentId,
}: {
  type: DocType;
  documentId: string;
}) {
  const [data, setData] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const url = `/api/cgv/document/${type}/${documentId}/version`;

  const fetchVersion = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(url, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Erreur de chargement');
      setData(payload);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void fetchVersion();
  }, [fetchVersion]);

  const downloadCgv = async () => {
    setWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/cgv/document/${type}/${documentId}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok || !payload.downloadUrl) throw new Error(payload.error || 'CGV indisponibles.');
      window.location.assign(payload.downloadUrl);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'CGV indisponibles.');
    } finally {
      setWorking(false);
    }
  };

  const choose = async (action: 'keep' | 'refresh') => {
    setWorking(true);
    setFeedback(null);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Mise à jour impossible');
      setFeedback(payload.message || 'Choix enregistré.');
      await fetchVersion();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Mise à jour impossible');
    } finally {
      setConfirm(false);
      setWorking(false);
    }
  };

  const mode = (value?: string) => value === 'qr' ? 'QR code + PDF téléchargeable' : 'Annexe intégrée au PDF';
  const audience = data?.clientType === 'consumer' ? 'Particuliers' : 'Professionnels';

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base"><FileClock className="h-4 w-4" />CGV propres à ce document</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Vérification des versions CGV…</div>
        ) : data ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Version liée au document — {audience}</p>
                <p className="font-medium">{data.current ? `Version ${data.current.version}` : 'Aucune version encore figée'}</p>
                {data.current && <p className="mt-1 text-xs text-muted-foreground">{mode(data.current.deliveryMode)}</p>}
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">CGV actuellement configurées</p>
                <p className="font-medium">{data.candidate ? `Version ${data.candidate.version}` : 'Non disponibles'}</p>
                {data.candidate && <p className="mt-1 text-xs text-muted-foreground">{mode(data.candidate.deliveryMode)}</p>}
              </div>
            </div>

            {data.message && <p className="text-xs text-amber-700">{data.message}</p>}
            {data.current?.deliveryMode === 'qr' && (
              <Button variant="outline" size="sm" disabled={working} onClick={() => void downloadCgv()}>
                <Download className="mr-1.5 h-4 w-4" />Télécharger les CGV archivées
              </Button>
            )}
            {data.current && data.candidate && !data.differs && (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />Le document utilise déjà les CGV actuellement configurées.
              </p>
            )}
            {data.current && !data.candidate && (
              <p className="text-xs text-muted-foreground">
                Les CGV sont désactivées ou non configurées pour ce type de client.
                La version déjà enregistrée sur ce document reste conservée.
              </p>
            )}
            {data.editable && data.differs && data.candidate && (
              <>
                <p className="text-xs text-muted-foreground">
                  Choisis les CGV de ce brouillon. Par défaut, sa version enregistrée reste inchangée.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" disabled={working || !data.current} onClick={() => void choose('keep')}>
                    Conserver les CGV enregistrées
                  </Button>
                  <Button size="sm" disabled={working} onClick={() => setConfirm(true)}>
                    <RefreshCw className="mr-1.5 h-4 w-4" />
                    {data.current ? 'Appliquer les nouvelles CGV' : 'Enregistrer les CGV actuelles'}
                  </Button>
                </div>
              </>
            )}
            {!data.editable && data.current && (
              <p className="text-xs text-muted-foreground">
                Document émis ou verrouillé : la version contractuelle ne peut pas être remplacée rétroactivement.
              </p>
            )}
            {feedback && <p role="status" className="text-xs">{feedback}</p>}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">{feedback || 'Informations CGV indisponibles.'}</p>
        )}
      </CardContent>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Appliquer les CGV actuelles à ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Les prochaines générations PDF de ce document utiliseront les CGV actuelles.
              Les anciennes versions et leurs liens QR restent consultables. Si un ancien PDF
              a déjà été remis à un client, veille à transmettre explicitement la nouvelle version.
              Les autres documents ne seront pas modifiés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Annuler</AlertDialogCancel>
            <AlertDialogAction disabled={working} onClick={(e) => { e.preventDefault(); void choose('refresh'); }}>
              {working ? 'Enregistrement…' : 'Confirmer la mise à jour'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
