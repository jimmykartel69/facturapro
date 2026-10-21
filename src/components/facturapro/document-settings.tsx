'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Save, ShieldCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';

const DEFAULT_VAT_TEXT =
  'TVA non applicable, article 293 B du CGI.';

export function DocumentSettingsPage() {
  const { settings, fetchSettings, updateSettings } = useAppStore();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    depositEnabled: true,
    depositThreshold: '1000',
    depositRate: '30',
    quotePaymentText: 'Paiement à réception de facture.',
    invoicePaymentText: 'Paiement à réception de facture.',
    paymentMethod: 'Virement bancaire',
    vatRegime: 'unspecified',
    vatExemptionText: DEFAULT_VAT_TEXT,
    showCgv: true,
    customCgvB2c: '',
    customCgvB2b: '',
    mediatorName: '',
    mediatorAddress: '',
    mediatorWebsite: '',
    insuranceEnabled: false,
    insurerName: '',
    insurancePolicyNumber: '',
    insuranceActivities: '',
    insuranceCoverageArea: '',
  });

  useEffect(() => {
    void fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (!settings) return;
    setForm({
      depositEnabled: settings.depositEnabled ?? true,
      depositThreshold: String(settings.depositThreshold ?? 1000),
      depositRate: String(settings.depositRate ?? 30),
      quotePaymentText: settings.quotePaymentText || 'Paiement à réception de facture.',
      invoicePaymentText: settings.invoicePaymentText || 'Paiement à réception de facture.',
      paymentMethod: settings.paymentMethod || 'Virement bancaire',
      vatRegime: settings.vatRegime || 'unspecified',
      vatExemptionText: settings.vatExemptionText || DEFAULT_VAT_TEXT,
      showCgv: settings.showCgv ?? true,
      customCgvB2c: settings.customCgvB2c || '',
      customCgvB2b: settings.customCgvB2b || '',
      mediatorName: settings.mediatorName || '',
      mediatorAddress: settings.mediatorAddress || '',
      mediatorWebsite: settings.mediatorWebsite || '',
      insuranceEnabled: settings.insuranceEnabled ?? false,
      insurerName: settings.insurerName || '',
      insurancePolicyNumber: settings.insurancePolicyNumber || '',
      insuranceActivities: settings.insuranceActivities || '',
      insuranceCoverageArea: settings.insuranceCoverageArea || '',
    });
  }, [settings]);

  const setField = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    const threshold = Number(form.depositThreshold);
    const rate = Number(form.depositRate);

    if (!Number.isFinite(threshold) || threshold < 0) {
      toast({ variant: 'destructive', title: 'Seuil d’acompte invalide' });
      return;
    }

    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast({ variant: 'destructive', title: 'Pourcentage d’acompte invalide' });
      return;
    }

    setSaving(true);
    const error = await updateSettings({
      depositEnabled: form.depositEnabled,
      depositThreshold: threshold,
      depositRate: rate,
      quotePaymentText: form.quotePaymentText.trim(),
      invoicePaymentText: form.invoicePaymentText.trim(),
      paymentMethod: form.paymentMethod.trim(),
      vatRegime: form.vatRegime,
      vatExemptionText: form.vatExemptionText.trim() || DEFAULT_VAT_TEXT,
      showCgv: form.showCgv,
      customCgvB2c: form.customCgvB2c.trim() || null,
      customCgvB2b: form.customCgvB2b.trim() || null,
      mediatorName: form.mediatorName.trim() || null,
      mediatorAddress: form.mediatorAddress.trim() || null,
      mediatorWebsite: form.mediatorWebsite.trim() || null,
      insuranceEnabled: form.insuranceEnabled,
      insurerName: form.insurerName.trim() || null,
      insurancePolicyNumber: form.insurancePolicyNumber.trim() || null,
      insuranceActivities: form.insuranceActivities.trim() || null,
      insuranceCoverageArea: form.insuranceCoverageArea.trim() || null,
    });
    setSaving(false);

    if (error) {
      toast({ variant: 'destructive', title: 'Sauvegarde impossible', description: error });
      return;
    }

    toast({ title: 'Paramètres documents enregistrés' });
  };

  if (!settings) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin" />
      </div>
    );
  }

  const b2cIncomplete =
    form.showCgv && (!form.mediatorName.trim() || !form.mediatorWebsite.trim());

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Paramètres documents</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Règles appliquées aux devis, factures et annexes contractuelles.
        </p>
      </div>

      {b2cIncomplete && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Paramètres B2C incomplets</AlertTitle>
          <AlertDescription>
            Renseigne le médiateur de la consommation avant d’utiliser automatiquement des CGV pour un particulier.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader><CardTitle>Devis et acompte</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="deposit-enabled"
              checked={form.depositEnabled}
              onCheckedChange={(value) => setField('depositEnabled', value === true)}
            />
            <Label htmlFor="deposit-enabled">Activer la règle d’acompte</Label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deposit-threshold">Acompte uniquement au-dessus de (€)</Label>
              <Input
                id="deposit-threshold"
                type="number"
                min="0"
                step="1"
                value={form.depositThreshold}
                onChange={(e) => setField('depositThreshold', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit-rate">Acompte (%)</Label>
              <Input
                id="deposit-rate"
                type="number"
                min="0"
                max="100"
                step="1"
                value={form.depositRate}
                onChange={(e) => setField('depositRate', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quote-payment">Texte de règlement sur devis</Label>
            <Input
              id="quote-payment"
              value={form.quotePaymentText}
              onChange={(e) => setField('quotePaymentText', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Factures et TVA</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="invoice-payment">Texte de règlement facture</Label>
              <Input
                id="invoice-payment"
                value={form.invoicePaymentText}
                onChange={(e) => setField('invoicePaymentText', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Mode de règlement</Label>
              <Input
                id="payment-method"
                value={form.paymentMethod}
                onChange={(e) => setField('paymentMethod', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Régime de TVA</Label>
            <Select
              value={form.vatRegime}
              onValueChange={(value) => setField('vatRegime', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">À définir</SelectItem>
                <SelectItem value="franchise">Franchise en base — TVA non applicable</SelectItem>
                <SelectItem value="standard">Assujetti à la TVA</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Le régime de TVA est indépendant de la forme juridique de l’entreprise.
            </p>
          </div>

          {form.vatRegime === 'franchise' && (
            <div className="space-y-2">
              <Label htmlFor="vat-text">Mention de franchise de TVA</Label>
              <Textarea
                id="vat-text"
                rows={2}
                value={form.vatExemptionText}
                onChange={(e) => setField('vatExemptionText', e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>CGV et médiation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="show-cgv"
              checked={form.showCgv}
              onCheckedChange={(value) => setField('showCgv', value === true)}
            />
            <Label htmlFor="show-cgv">Joindre les CGV aux documents</Label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mediator-name">Médiateur de la consommation</Label>
              <Input
                id="mediator-name"
                value={form.mediatorName}
                onChange={(e) => setField('mediatorName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediator-website">Site du médiateur</Label>
              <Input
                id="mediator-website"
                value={form.mediatorWebsite}
                onChange={(e) => setField('mediatorWebsite', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mediator-address">Adresse du médiateur</Label>
            <Input
              id="mediator-address"
              value={form.mediatorAddress}
              onChange={(e) => setField('mediatorAddress', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cgv-b2c">CGV particuliers personnalisées (optionnel)</Label>
            <Textarea
              id="cgv-b2c"
              rows={8}
              value={form.customCgvB2c}
              onChange={(e) => setField('customCgvB2c', e.target.value)}
              placeholder="Laisser vide pour utiliser le modèle intégré."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cgv-b2b">CGV professionnels personnalisées (optionnel)</Label>
            <Textarea
              id="cgv-b2b"
              rows={8}
              value={form.customCgvB2b}
              onChange={(e) => setField('customCgvB2b', e.target.value)}
              placeholder="Laisser vide pour utiliser le modèle intégré."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assurance professionnelle</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Checkbox
              id="insurance-enabled"
              checked={form.insuranceEnabled}
              onCheckedChange={(value) => setField('insuranceEnabled', value === true)}
            />
            <Label htmlFor="insurance-enabled">Afficher les informations d’assurance</Label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="insurer">Assureur</Label>
              <Input
                id="insurer"
                value={form.insurerName}
                onChange={(e) => setField('insurerName', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy">N° de contrat</Label>
              <Input
                id="policy"
                value={form.insurancePolicyNumber}
                onChange={(e) => setField('insurancePolicyNumber', e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="activities">Activités garanties</Label>
            <Textarea
              id="activities"
              rows={3}
              value={form.insuranceActivities}
              onChange={(e) => setField('insuranceActivities', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="coverage">Zone géographique de couverture</Label>
            <Input
              id="coverage"
              value={form.insuranceCoverageArea}
              onChange={(e) => setField('insuranceCoverageArea', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Save className="mr-2 h-4 w-4" />}
          Enregistrer
        </Button>
      </div>
    </div>
  );
}