'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Palette,
  FileSpreadsheet,
  Landmark,
  Save,
  Loader2,
  Upload,
  X,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAppStore } from '@/lib/store';
import type { Settings } from '@/lib/types';

type SectionKey = 'entreprise' | 'apparence' | 'facturation' | 'banque';

interface FormState {
  companyName: string;
  legalForm: string;
  siret: string;
  tvaNumber: string;
  rcsNumber: string;
  socialCapital: string;
  address: string;
  addressComplement: string;
  postalCode: string;
  city: string;
  phone: string;
  professionalEmail: string;
  website: string;
  directorName: string;
  directorTitle: string;
  accentColor: string;
  customNotes: string;
  paymentTerms: string;
  latePenaltyRate: string;
  earlyDiscount: string;
  earlyDiscountDays: string;
  devisPrefix: string;
  invoicePrefix: string;
  nextDevisNumber: string;
  nextInvoiceNumber: string;
  iban: string;
  bic: string;
  bankName: string;
  accountHolder: string;
}

const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const LEGAL_FORMS = ['SAS', 'SARL', 'EURL', 'SA', 'SASU', 'Auto-entrepreneur', 'Profession libérale', 'Autre'];

function stripSpaces(value: string): string {
  return value.replace(/\s+/g, '');
}

function formatIbanInput(value: string): string {
  const clean = stripSpaces(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return clean.replace(/(.{4})/g, '$1 ').trim();
}

function normalizeWebsite(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64: string } | null {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], base64: match[2] };
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Invalid file'));
    };
    reader.onerror = () => reject(new Error('Read error'));
    reader.readAsDataURL(file);
  });
}

function getSectionBadge(ready: boolean): React.ReactNode {
  return (
    <Badge variant={ready ? 'default' : 'outline'} className="gap-1">
      {ready ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
      {ready ? 'Complet' : 'À compléter'}
    </Badge>
  );
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { updateSettings } = useAppStore();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<SectionKey>('entreprise');
  const [savingSection, setSavingSection] = useState<SectionKey | null>(null);
  const [sectionErrors, setSectionErrors] = useState<Record<SectionKey, string[]>>({
    entreprise: [],
    apparence: [],
    facturation: [],
    banque: [],
  });

  const [form, setForm] = useState<FormState>({
    companyName: settings.companyName || '',
    legalForm: settings.legalForm || '',
    siret: settings.siret || '',
    tvaNumber: settings.tvaNumber || '',
    rcsNumber: settings.rcsNumber || '',
    socialCapital: settings.socialCapital || '',
    address: settings.address || '',
    addressComplement: settings.addressComplement || '',
    postalCode: settings.postalCode || '',
    city: settings.city || '',
    phone: settings.phone || '',
    professionalEmail: settings.professionalEmail || '',
    website: settings.website || '',
    directorName: settings.directorName || '',
    directorTitle: settings.directorTitle || '',
    accentColor: settings.accentColor || '#1a1a2e',
    customNotes: settings.customNotes || '',
    paymentTerms: settings.paymentTerms || '30 jours',
    latePenaltyRate: String(settings.latePenaltyRate || 3),
    earlyDiscount: settings.earlyDiscount ? String(settings.earlyDiscount) : '',
    earlyDiscountDays: settings.earlyDiscountDays ? String(settings.earlyDiscountDays) : '',
    devisPrefix: settings.devisPrefix || 'DEV-',
    invoicePrefix: settings.invoicePrefix || 'FAC-',
    nextDevisNumber: String(settings.nextDevisNumber || 1),
    nextInvoiceNumber: String(settings.nextInvoiceNumber || 1),
    iban: settings.iban || '',
    bic: settings.bic || '',
    bankName: settings.bankName || '',
    accountHolder: settings.accountHolder || '',
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(
    settings.logoBase64 && settings.logoMimeType ? `data:${settings.logoMimeType};base64,${settings.logoBase64}` : null
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const isSaving = (section: SectionKey) => savingSection === section;

  const validateEntreprise = (): string[] => {
    const errors: string[] = [];
    if (form.siret && !/^\d{14}$/.test(stripSpaces(form.siret))) errors.push('SIRET invalide (14 chiffres).');
    if (form.postalCode && !/^\d{5}$/.test(form.postalCode.trim())) errors.push('Code postal invalide (5 chiffres).');
    if (form.professionalEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.professionalEmail.trim())) errors.push('Email professionnel invalide.');
    if (form.website.trim() && /\s/.test(form.website.trim())) errors.push('Le site web ne doit pas contenir d’espaces.');
    return errors;
  };

  const validateFacturation = (): string[] => {
    const errors: string[] = [];
    const penalty = Number(form.latePenaltyRate);
    const discount = form.earlyDiscount ? Number(form.earlyDiscount) : null;
    const days = form.earlyDiscountDays ? Number(form.earlyDiscountDays) : null;
    if (!Number.isFinite(penalty) || penalty < 0 || penalty > 100) errors.push('Pénalité retard: entre 0 et 100.');
    if (discount !== null) {
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) errors.push('Escompte: entre 0 et 100.');
      if (!days || !Number.isInteger(days) || days <= 0) errors.push('Jours escompte invalides.');
    }
    if (!form.devisPrefix.trim()) errors.push('Préfixe devis obligatoire.');
    if (!form.invoicePrefix.trim()) errors.push('Préfixe facture obligatoire.');
    if (!Number.isInteger(Number(form.nextDevisNumber)) || Number(form.nextDevisNumber) < 1) errors.push('Prochain numéro devis invalide.');
    if (!Number.isInteger(Number(form.nextInvoiceNumber)) || Number(form.nextInvoiceNumber) < 1) errors.push('Prochain numéro facture invalide.');
    return errors;
  };

  const validateBanque = (): string[] => {
    const errors: string[] = [];
    const ibanClean = stripSpaces(form.iban).toUpperCase();
    const bicClean = stripSpaces(form.bic).toUpperCase();
    if (ibanClean && !/^[A-Z]{2}[0-9A-Z]{12,32}$/.test(ibanClean)) errors.push('IBAN invalide.');
    if (bicClean && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(bicClean)) errors.push('BIC/SWIFT invalide.');
    return errors;
  };

  const saveSection = async (section: SectionKey, data: Record<string, unknown>, validate?: () => string[]) => {
    if (validate) {
      const errors = validate();
      if (errors.length > 0) {
        setSectionErrors((prev) => ({ ...prev, [section]: errors }));
        toast({ variant: 'destructive', title: 'Validation', description: errors[0] });
        return;
      }
    }
    setSectionErrors((prev) => ({ ...prev, [section]: [] }));
    setSavingSection(section);
    const err = await updateSettings(data);
    setSavingSection(null);
    if (err) {
      toast({ variant: 'destructive', title: 'Sauvegarde échouée', description: err });
      return;
    }
    toast({ title: 'Sauvegarde réussie', description: `Section ${section} mise à jour.` });
  };

  const saveEntreprise = () => {
    void saveSection(
      'entreprise',
      {
        companyName: form.companyName.trim() || null,
        legalForm: form.legalForm || null,
        siret: stripSpaces(form.siret) || null,
        tvaNumber: form.tvaNumber.trim().toUpperCase() || null,
        rcsNumber: form.rcsNumber.trim() || null,
        socialCapital: form.socialCapital.trim() || null,
        address: form.address.trim() || null,
        addressComplement: form.addressComplement.trim() || null,
        postalCode: form.postalCode.trim() || null,
        city: form.city.trim() || null,
        phone: form.phone.trim() || null,
        professionalEmail: form.professionalEmail.trim().toLowerCase() || null,
        website: normalizeWebsite(form.website),
        directorName: form.directorName.trim() || null,
        directorTitle: form.directorTitle.trim() || null,
      },
      validateEntreprise
    );
  };

  const saveApparence = () => {
    void saveSection('apparence', {
      accentColor: /^#[0-9a-fA-F]{6}$/.test(form.accentColor) ? form.accentColor : '#1a1a2e',
      customNotes: form.customNotes,
    });
  };

  const saveFacturation = () => {
    const discount = form.earlyDiscount ? Number(form.earlyDiscount) : null;
    const discountDays = form.earlyDiscountDays ? Number(form.earlyDiscountDays) : null;
    void saveSection(
      'facturation',
      {
        paymentTerms: form.paymentTerms,
        latePenaltyRate: Number(form.latePenaltyRate),
        earlyDiscount: discount,
        earlyDiscountDays: discount !== null ? discountDays : null,
        devisPrefix: form.devisPrefix.trim(),
        invoicePrefix: form.invoicePrefix.trim(),
        nextDevisNumber: Number(form.nextDevisNumber),
        nextInvoiceNumber: Number(form.nextInvoiceNumber),
      },
      validateFacturation
    );
  };

  const saveBanque = () => {
    void saveSection(
      'banque',
      {
        iban: stripSpaces(form.iban).toUpperCase() || null,
        bic: stripSpaces(form.bic).toUpperCase() || null,
        bankName: form.bankName.trim() || null,
        accountHolder: form.accountHolder.trim() || null,
      },
      validateBanque
    );
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Format invalide', description: 'Le fichier doit être une image.' });
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      toast({ variant: 'destructive', title: 'Fichier trop lourd', description: 'Le logo doit être inférieur à 2 Mo.' });
      return;
    }

    setUploadingLogo(true);
    setSavingSection('apparence');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) throw new Error('Invalid data URL');
      const err = await updateSettings({ logoBase64: parsed.base64, logoMimeType: parsed.mimeType });
      if (err) {
        toast({ variant: 'destructive', title: 'Erreur logo', description: err });
        return;
      }
      setLogoPreview(dataUrl);
      toast({ title: 'Logo mis à jour' });
    } catch {
      toast({ variant: 'destructive', title: 'Erreur upload', description: 'Impossible de lire ce fichier.' });
    } finally {
      setUploadingLogo(false);
      setSavingSection(null);
      e.target.value = '';
    }
  };

  const removeLogo = async () => {
    setSavingSection('apparence');
    const err = await updateSettings({ logoBase64: null, logoMimeType: null });
    setSavingSection(null);
    if (err) {
      toast({ variant: 'destructive', title: 'Erreur', description: err });
      return;
    }
    setLogoPreview(null);
    toast({ title: 'Logo supprimé' });
  };

  const dirty = useMemo(() => ({
    entreprise:
      (form.companyName.trim() || '') !== (settings.companyName || '') ||
      form.legalForm !== (settings.legalForm || '') ||
      (stripSpaces(form.siret) || '') !== (settings.siret || '') ||
      (form.tvaNumber.trim().toUpperCase() || '') !== ((settings.tvaNumber || '').toUpperCase()) ||
      (form.rcsNumber.trim() || '') !== (settings.rcsNumber || '') ||
      (form.socialCapital.trim() || '') !== (settings.socialCapital || '') ||
      (form.address.trim() || '') !== (settings.address || '') ||
      (form.addressComplement.trim() || '') !== (settings.addressComplement || '') ||
      (form.postalCode.trim() || '') !== (settings.postalCode || '') ||
      (form.city.trim() || '') !== (settings.city || '') ||
      (form.phone.trim() || '') !== (settings.phone || '') ||
      (form.professionalEmail.trim().toLowerCase() || '') !== ((settings.professionalEmail || '').toLowerCase()) ||
      (normalizeWebsite(form.website) || '') !== (settings.website || '') ||
      (form.directorName.trim() || '') !== (settings.directorName || '') ||
      (form.directorTitle.trim() || '') !== (settings.directorTitle || ''),
    apparence:
      form.accentColor !== (settings.accentColor || '#1a1a2e') ||
      form.customNotes !== (settings.customNotes || ''),
    facturation:
      form.paymentTerms !== (settings.paymentTerms || '30 jours') ||
      form.latePenaltyRate !== String(settings.latePenaltyRate || 3) ||
      form.earlyDiscount !== (settings.earlyDiscount ? String(settings.earlyDiscount) : '') ||
      form.earlyDiscountDays !== (settings.earlyDiscountDays ? String(settings.earlyDiscountDays) : '') ||
      form.devisPrefix !== (settings.devisPrefix || 'DEV-') ||
      form.invoicePrefix !== (settings.invoicePrefix || 'FAC-') ||
      form.nextDevisNumber !== String(settings.nextDevisNumber || 1) ||
      form.nextInvoiceNumber !== String(settings.nextInvoiceNumber || 1),
    banque:
      (stripSpaces(form.iban).toUpperCase() || '') !== ((settings.iban || '').toUpperCase()) ||
      (stripSpaces(form.bic).toUpperCase() || '') !== ((settings.bic || '').toUpperCase()) ||
      (form.bankName.trim() || '') !== (settings.bankName || '') ||
      (form.accountHolder.trim() || '') !== (settings.accountHolder || ''),
  }), [form, settings]);

  const ready = useMemo(() => ({
    entreprise: Boolean(form.companyName.trim() && form.address.trim() && form.postalCode.trim() && form.city.trim() && form.professionalEmail.trim()),
    apparence: Boolean(logoPreview && form.accentColor),
    facturation: Boolean(form.devisPrefix.trim() && form.invoicePrefix.trim() && Number(form.nextDevisNumber) > 0 && Number(form.nextInvoiceNumber) > 0),
    banque: Boolean(stripSpaces(form.iban) && form.accountHolder.trim()),
  }), [form, logoPreview]);

  const completion = Math.round((Object.values(ready).filter(Boolean).length / 4) * 100);

  const renderErrors = (section: SectionKey) => sectionErrors[section].length > 0 ? (
    <Alert variant="destructive">
      <AlertTriangle className="w-4 h-4" />
      <AlertTitle>Validation</AlertTitle>
      <AlertDescription>{sectionErrors[section][0]}</AlertDescription>
    </Alert>
  ) : null;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-br from-card to-secondary/30 shadow-glass">
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
              <p className="text-muted-foreground text-sm">Configurez votre espace de facturation</p>
            </div>
            <Badge className="w-fit gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />Profil {completion}% prêt</Badge>
          </div>
          <Progress value={completion} />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center justify-between rounded-md border px-2 py-1.5"><span>Entreprise</span>{getSectionBadge(ready.entreprise)}</div>
            <div className="flex items-center justify-between rounded-md border px-2 py-1.5"><span>Apparence</span>{getSectionBadge(ready.apparence)}</div>
            <div className="flex items-center justify-between rounded-md border px-2 py-1.5"><span>Facturation</span>{getSectionBadge(ready.facturation)}</div>
            <div className="flex items-center justify-between rounded-md border px-2 py-1.5"><span>Banque</span>{getSectionBadge(ready.banque)}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SectionKey)}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto gap-2 bg-transparent p-0">
          <TabsTrigger value="entreprise" className="gap-2 border bg-card data-[state=active]:border-primary/40"><Building2 className="w-4 h-4" /><span>Entreprise</span></TabsTrigger>
          <TabsTrigger value="apparence" className="gap-2 border bg-card data-[state=active]:border-primary/40"><Palette className="w-4 h-4" /><span>Apparence</span></TabsTrigger>
          <TabsTrigger value="facturation" className="gap-2 border bg-card data-[state=active]:border-primary/40"><FileSpreadsheet className="w-4 h-4" /><span>Facturation</span></TabsTrigger>
          <TabsTrigger value="banque" className="gap-2 border bg-card data-[state=active]:border-primary/40"><Landmark className="w-4 h-4" /><span>Banque</span></TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Informations de l&apos;entreprise</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {renderErrors('entreprise')}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-companyName">Nom de l&apos;entreprise</Label><Input id="s-companyName" value={form.companyName} onChange={(e) => setField('companyName', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-legalForm">Forme juridique</Label><Select value={form.legalForm || undefined} onValueChange={(v) => setField('legalForm', v)}><SelectTrigger id="s-legalForm"><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{LEGAL_FORMS.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-siret">SIRET</Label><Input id="s-siret" value={form.siret} onChange={(e) => setField('siret', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-tvaNumber">N° TVA intracommunautaire</Label><Input id="s-tvaNumber" value={form.tvaNumber} onChange={(e) => setField('tvaNumber', e.target.value.toUpperCase())} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-rcsNumber">N° RCS</Label><Input id="s-rcsNumber" value={form.rcsNumber} onChange={(e) => setField('rcsNumber', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-capital">Capital social</Label><Input id="s-capital" value={form.socialCapital} onChange={(e) => setField('socialCapital', e.target.value)} /></div>
              </div>
              <Separator />
              <div className="space-y-2"><Label htmlFor="s-address">Adresse</Label><Input id="s-address" value={form.address} onChange={(e) => setField('address', e.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="s-address2">Complément d&apos;adresse</Label><Input id="s-address2" value={form.addressComplement} onChange={(e) => setField('addressComplement', e.target.value)} /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-postal">Code postal</Label><Input id="s-postal" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-city">Ville</Label><Input id="s-city" value={form.city} onChange={(e) => setField('city', e.target.value)} /></div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-phone">Téléphone</Label><Input id="s-phone" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-proemail">Email professionnel</Label><Input id="s-proemail" type="email" value={form.professionalEmail} onChange={(e) => setField('professionalEmail', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="s-website">Site web</Label><div className="relative"><Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input id="s-website" className="pl-9" value={form.website} onChange={(e) => setField('website', e.target.value)} /></div></div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-directorName">Nom du dirigeant</Label><Input id="s-directorName" value={form.directorName} onChange={(e) => setField('directorName', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-directorTitle">Titre du dirigeant</Label><Input id="s-directorTitle" value={form.directorTitle} onChange={(e) => setField('directorTitle', e.target.value)} /></div>
              </div>
              <div className="flex justify-end"><Button onClick={saveEntreprise} disabled={isSaving('entreprise') || !dirty.entreprise}>{isSaving('entreprise') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />{dirty.entreprise ? 'Enregistrer' : 'Aucune modification'}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apparence" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Apparence et documents</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Logo de l&apos;entreprise</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative w-24 h-24 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button onClick={() => void removeLogo()} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center"><Building2 className="w-8 h-8 text-muted-foreground/40" /></div>
                  )}
                  <div>
                    <label className="cursor-pointer"><input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} /><Button variant="outline" size="sm" asChild><span>{uploadingLogo || isSaving('apparence') ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}{logoPreview ? 'Changer le logo' : 'Télécharger un logo'}</span></Button></label>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF ou SVG. Max 2 Mo.</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2"><Label htmlFor="s-accent">Couleur d&apos;accent</Label><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-lg border overflow-hidden"><input type="color" value={form.accentColor} onChange={(e) => setField('accentColor', e.target.value)} className="w-full h-full cursor-pointer border-0 p-0" /></div><Input id="s-accent" value={form.accentColor} onChange={(e) => setField('accentColor', e.target.value)} className="w-32 font-mono" /></div></div>
              <div className="space-y-2"><Label htmlFor="s-customNotes">Notes personnalisées (documents)</Label><Textarea id="s-customNotes" value={form.customNotes} onChange={(e) => setField('customNotes', e.target.value)} rows={5} /><p className="text-xs text-muted-foreground">{form.customNotes.length} caractères</p></div>
              <div className="flex justify-end"><Button onClick={saveApparence} disabled={isSaving('apparence') || !dirty.apparence}>{isSaving('apparence') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />{dirty.apparence ? 'Enregistrer' : 'Aucune modification'}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturation" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Paramètres de facturation</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {renderErrors('facturation')}
              <div className="space-y-2"><Label htmlFor="s-paymentTerms">Conditions de paiement</Label><Select value={form.paymentTerms} onValueChange={(v) => setField('paymentTerms', v)}><SelectTrigger id="s-paymentTerms"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="À réception">À réception</SelectItem><SelectItem value="15 jours">15 jours</SelectItem><SelectItem value="30 jours">30 jours</SelectItem><SelectItem value="45 jours">45 jours</SelectItem><SelectItem value="60 jours">60 jours</SelectItem><SelectItem value="30 jours fin de mois">30 jours fin de mois</SelectItem><SelectItem value="45 jours fin de mois">45 jours fin de mois</SelectItem><SelectItem value="60 jours fin de mois">60 jours fin de mois</SelectItem></SelectContent></Select></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-penalty">Taux de pénalité retard (%)</Label><Input id="s-penalty" type="number" step="0.1" min="0" max="100" value={form.latePenaltyRate} onChange={(e) => setField('latePenaltyRate', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-earlyDiscount">Escompte anticipé (%)</Label><Input id="s-earlyDiscount" type="number" step="0.1" min="0" max="100" value={form.earlyDiscount} onChange={(e) => setField('earlyDiscount', e.target.value)} /></div>
              </div>
              {form.earlyDiscount && (<div className="space-y-2"><Label htmlFor="s-earlyDays">Escompte si paiement sous (jours)</Label><Input id="s-earlyDays" type="number" min="1" value={form.earlyDiscountDays} onChange={(e) => setField('earlyDiscountDays', e.target.value)} /></div>)}
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-devisPrefix">Préfixe devis</Label><Input id="s-devisPrefix" value={form.devisPrefix} onChange={(e) => setField('devisPrefix', e.target.value)} maxLength={12} /></div>
                <div className="space-y-2"><Label htmlFor="s-invPrefix">Préfixe factures</Label><Input id="s-invPrefix" value={form.invoicePrefix} onChange={(e) => setField('invoicePrefix', e.target.value)} maxLength={12} /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-nextDevis">Prochain numéro devis</Label><Input id="s-nextDevis" type="number" min="1" value={form.nextDevisNumber} onChange={(e) => setField('nextDevisNumber', e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="s-nextInv">Prochain numéro facture</Label><Input id="s-nextInv" type="number" min="1" value={form.nextInvoiceNumber} onChange={(e) => setField('nextInvoiceNumber', e.target.value)} /></div>
              </div>
              <div className="flex justify-end"><Button onClick={saveFacturation} disabled={isSaving('facturation') || !dirty.facturation}>{isSaving('facturation') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />{dirty.facturation ? 'Enregistrer' : 'Aucune modification'}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banque" className="mt-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Coordonnées bancaires</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {renderErrors('banque')}
              <div className="space-y-2"><Label htmlFor="s-iban">IBAN</Label><Input id="s-iban" value={form.iban} onChange={(e) => setField('iban', formatIbanInput(e.target.value))} className="font-mono" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="s-bic">BIC / SWIFT</Label><Input id="s-bic" value={form.bic} onChange={(e) => setField('bic', stripSpaces(e.target.value).toUpperCase())} className="font-mono" /></div>
                <div className="space-y-2"><Label htmlFor="s-bankName">Nom de la banque</Label><Input id="s-bankName" value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="s-holder">Titulaire du compte</Label><Input id="s-holder" value={form.accountHolder} onChange={(e) => setField('accountHolder', e.target.value)} /></div>
              <div className="flex justify-end"><Button onClick={saveBanque} disabled={isSaving('banque') || !dirty.banque}>{isSaving('banque') && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}<Save className="w-4 h-4 mr-2" />{dirty.banque ? 'Enregistrer' : 'Aucune modification'}</Button></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function SettingsPage() {
  const { settings, fetchSettings } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchIdRef = useRef(0);

  const loadSettings = async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(null);
    try {
      await fetchSettings();
      if (id !== fetchIdRef.current) return;
      const s = useAppStore.getState().settings;
      if (!s) setError('Erreur lors du chargement des paramètres');
    } catch {
      if (id === fetchIdRef.current) setError('Erreur lors du chargement des paramètres');
    } finally {
      if (id === fetchIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
    return () => {
      fetchIdRef.current++;
    };
  }, [fetchSettings]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !settings) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
          <p className="text-muted-foreground text-sm">Configurez votre espace de facturation</p>
        </div>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-muted-foreground mb-4">{error || 'Impossible de charger les paramètres'}</p>
          <Button variant="outline" onClick={() => void loadSettings()}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return <SettingsForm key={settings.id} settings={settings} />;
}
