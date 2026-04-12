'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Palette,
  FileSpreadsheet,
  Landmark,
  Save,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import type { Settings } from '@/lib/types';

function SettingsForm({ settings }: { settings: Settings }) {
  const { updateSettings } = useAppStore();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('entreprise');

  // Form state - entreprise (initialized from settings prop)
  const [companyName, setCompanyName] = useState(settings.companyName || '');
  const [legalForm, setLegalForm] = useState(settings.legalForm || '');
  const [siret, setSiret] = useState(settings.siret || '');
  const [tvaNumber, setTvaNumber] = useState(settings.tvaNumber || '');
  const [rcsNumber, setRcsNumber] = useState(settings.rcsNumber || '');
  const [socialCapital, setSocialCapital] = useState(settings.socialCapital || '');
  const [address, setAddress] = useState(settings.address || '');
  const [addressComplement, setAddressComplement] = useState(settings.addressComplement || '');
  const [postalCode, setPostalCode] = useState(settings.postalCode || '');
  const [city, setCity] = useState(settings.city || '');
  const [phone, setPhone] = useState(settings.phone || '');
  const [professionalEmail, setProfessionalEmail] = useState(settings.professionalEmail || '');
  const [website, setWebsite] = useState(settings.website || '');
  const [directorName, setDirectorName] = useState(settings.directorName || '');
  const [directorTitle, setDirectorTitle] = useState(settings.directorTitle || '');

  // Apparence
  const [accentColor, setAccentColor] = useState(settings.accentColor || '#1a1a2e');
  const [customNotes, setCustomNotes] = useState(settings.customNotes || '');
  const [logoPreview, setLogoPreview] = useState<string | null>(
    settings.logoBase64 && settings.logoMimeType
      ? `data:${settings.logoMimeType};base64,${settings.logoBase64}`
      : null
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Facturation
  const [paymentTerms, setPaymentTerms] = useState(settings.paymentTerms || '30 jours');
  const [latePenaltyRate, setLatePenaltyRate] = useState(String(settings.latePenaltyRate || 3));
  const [earlyDiscount, setEarlyDiscount] = useState(settings.earlyDiscount ? String(settings.earlyDiscount) : '');
  const [earlyDiscountDays, setEarlyDiscountDays] = useState(settings.earlyDiscountDays ? String(settings.earlyDiscountDays) : '');
  const [devisPrefix, setDevisPrefix] = useState(settings.devisPrefix || 'DEV-');
  const [invoicePrefix, setInvoicePrefix] = useState(settings.invoicePrefix || 'FAC-');
  const [nextDevisNumber, setNextDevisNumber] = useState(String(settings.nextDevisNumber || 1));
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState(String(settings.nextInvoiceNumber || 1));

  // Banque
  const [iban, setIban] = useState(settings.iban || '');
  const [bic, setBic] = useState(settings.bic || '');
  const [bankName, setBankName] = useState(settings.bankName || '');
  const [accountHolder, setAccountHolder] = useState(settings.accountHolder || '');

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const formData = new FormData();
    formData.append('logo', file);
    try {
      const res = await fetch('/api/upload/logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok && data.mimeType) {
        const reader = new FileReader();
        reader.onloadend = () => setLogoPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        alert(data.error || 'Erreur lors du téléchargement');
      }
    } catch {
      alert('Erreur réseau');
    }
    setUploadingLogo(false);
  };

  const removeLogo = async () => {
    setLogoPreview(null);
    await updateSettings({ logoBase64: null, logoMimeType: null });
  };

  const saveSection = async (data: Record<string, unknown>) => {
    setSaving(true);
    const err = await updateSettings(data);
    setSaving(false);
    if (err) alert(err);
  };

  const saveEntreprise = () => {
    saveSection({
      companyName: companyName || null, legalForm: legalForm || null, siret: siret || null,
      tvaNumber: tvaNumber || null, rcsNumber: rcsNumber || null, socialCapital: socialCapital || null,
      address: address || null, addressComplement: addressComplement || null, postalCode: postalCode || null,
      city: city || null, phone: phone || null, professionalEmail: professionalEmail || null,
      website: website || null, directorName: directorName || null, directorTitle: directorTitle || null,
    });
  };

  const saveApparence = () => saveSection({ accentColor, customNotes });

  const saveFacturation = () => {
    saveSection({
      paymentTerms, latePenaltyRate: parseFloat(latePenaltyRate) || 3,
      earlyDiscount: earlyDiscount ? parseFloat(earlyDiscount) : null,
      earlyDiscountDays: earlyDiscountDays ? parseInt(earlyDiscountDays) : null,
      devisPrefix, invoicePrefix, nextDevisNumber: parseInt(nextDevisNumber) || 1,
      nextInvoiceNumber: parseInt(nextInvoiceNumber) || 1,
    });
  };

  const saveBanque = () => {
    saveSection({ iban: iban || null, bic: bic || null, bankName: bankName || null, accountHolder: accountHolder || null });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Paramètres</h2>
        <p className="text-muted-foreground text-sm">Configurez votre espace de facturation</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="entreprise" className="gap-2">
            <Building2 className="w-4 h-4" />
            <span className="hidden sm:inline">Entreprise</span>
          </TabsTrigger>
          <TabsTrigger value="apparence" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Apparence</span>
          </TabsTrigger>
          <TabsTrigger value="facturation" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Facturation</span>
          </TabsTrigger>
          <TabsTrigger value="banque" className="gap-2">
            <Landmark className="w-4 h-4" />
            <span className="hidden sm:inline">Banque</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entreprise" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informations de l&apos;entreprise</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-companyName">Nom de l&apos;entreprise</Label>
                  <Input id="s-companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ma Société" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-legalForm">Forme juridique</Label>
                  <Select value={legalForm} onValueChange={setLegalForm}>
                    <SelectTrigger id="s-legalForm"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SAS">SAS</SelectItem>
                      <SelectItem value="SARL">SARL</SelectItem>
                      <SelectItem value="EURL">EURL</SelectItem>
                      <SelectItem value="SA">SA</SelectItem>
                      <SelectItem value="SASU">SASU</SelectItem>
                      <SelectItem value="Auto-entrepreneur">Auto-entrepreneur</SelectItem>
                      <SelectItem value="Profession libérale">Profession libérale</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-siret">SIRET</Label>
                  <Input id="s-siret" value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789 00012" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-tvaNumber">N° TVA intracommunautaire</Label>
                  <Input id="s-tvaNumber" value={tvaNumber} onChange={(e) => setTvaNumber(e.target.value)} placeholder="FR 12 345678901" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-rcsNumber">N° RCS</Label>
                  <Input id="s-rcsNumber" value={rcsNumber} onChange={(e) => setRcsNumber(e.target.value)} placeholder="RCS Paris B 123 456 789" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-capital">Capital social</Label>
                  <Input id="s-capital" value={socialCapital} onChange={(e) => setSocialCapital(e.target.value)} placeholder="10 000 €" />
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="s-address">Adresse</Label>
                <Input id="s-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12 rue de la Paix" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-address2">Complément d&apos;adresse</Label>
                <Input id="s-address2" value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} placeholder="Bâtiment B, étage 3" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-postal">Code postal</Label>
                  <Input id="s-postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="75001" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-city">Ville</Label>
                  <Input id="s-city" value={city} onChange={(e) => setCity(e.target.value)} placeholder="Paris" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-phone">Téléphone</Label>
                  <Input id="s-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33 1 23 45 67 89" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-proemail">Email professionnel</Label>
                  <Input id="s-proemail" type="email" value={professionalEmail} onChange={(e) => setProfessionalEmail(e.target.value)} placeholder="contact@masociete.fr" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-website">Site web</Label>
                  <Input id="s-website" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://www.masociete.fr" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-directorName">Nom du dirigeant</Label>
                  <Input id="s-directorName" value={directorName} onChange={(e) => setDirectorName(e.target.value)} placeholder="Jean Dupont" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-directorTitle">Titre du dirigeant</Label>
                  <Input id="s-directorTitle" value={directorTitle} onChange={(e) => setDirectorTitle(e.target.value)} placeholder="Président Directeur Général" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveEntreprise} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apparence" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Apparence et documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Logo de l&apos;entreprise</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative w-24 h-24 rounded-lg border bg-white flex items-center justify-center overflow-hidden">
                      <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" />
                      <button onClick={removeLogo} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-muted-foreground/40" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                      <Button variant="outline" size="sm" asChild>
                        <span>
                          {uploadingLogo ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Upload className="w-4 h-4 mr-1.5" />}
                          {logoPreview ? 'Changer le logo' : 'Télécharger un logo'}
                        </span>
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, GIF ou SVG. Max 2 Mo.</p>
                  </div>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label htmlFor="s-accent">Couleur d&apos;accent</Label>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg border overflow-hidden">
                    <input type="color" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-full h-full cursor-pointer border-0 p-0" />
                  </div>
                  <Input id="s-accent" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-32" placeholder="#1a1a2e" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-customNotes">Notes personnalisées (affichées sur les documents)</Label>
                <Textarea id="s-customNotes" value={customNotes} onChange={(e) => setCustomNotes(e.target.value)} placeholder="Mentions légales, conditions de vente, etc." rows={4} />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveApparence} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="facturation" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Paramètres de facturation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="s-paymentTerms">Conditions de paiement</Label>
                <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                  <SelectTrigger id="s-paymentTerms"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="À réception">À réception</SelectItem>
                    <SelectItem value="15 jours">15 jours</SelectItem>
                    <SelectItem value="30 jours">30 jours</SelectItem>
                    <SelectItem value="45 jours">45 jours</SelectItem>
                    <SelectItem value="60 jours">60 jours</SelectItem>
                    <SelectItem value="30 jours fin de mois">30 jours fin de mois</SelectItem>
                    <SelectItem value="45 jours fin de mois">45 jours fin de mois</SelectItem>
                    <SelectItem value="60 jours fin de mois">60 jours fin de mois</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-penalty">Taux de pénalité de retard (%)</Label>
                  <Input id="s-penalty" type="number" step="0.1" min="0" value={latePenaltyRate} onChange={(e) => setLatePenaltyRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-earlyDiscount">Escompte pour paiement anticipé (%)</Label>
                  <Input id="s-earlyDiscount" type="number" step="0.1" min="0" value={earlyDiscount} onChange={(e) => setEarlyDiscount(e.target.value)} placeholder="Optionnel" />
                </div>
              </div>
              {earlyDiscount && (
                <div className="space-y-2">
                  <Label htmlFor="s-earlyDays">Escompte si paiement sous (jours)</Label>
                  <Input id="s-earlyDays" type="number" min="0" value={earlyDiscountDays} onChange={(e) => setEarlyDiscountDays(e.target.value)} />
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-devisPrefix">Préfixe des devis</Label>
                  <Input id="s-devisPrefix" value={devisPrefix} onChange={(e) => setDevisPrefix(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-invPrefix">Préfixe des factures</Label>
                  <Input id="s-invPrefix" value={invoicePrefix} onChange={(e) => setInvoicePrefix(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-nextDevis">Prochain numéro de devis</Label>
                  <Input id="s-nextDevis" type="number" min="1" value={nextDevisNumber} onChange={(e) => setNextDevisNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-nextInv">Prochain numéro de facture</Label>
                  <Input id="s-nextInv" type="number" min="1" value={nextInvoiceNumber} onChange={(e) => setNextInvoiceNumber(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveFacturation} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="banque" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Coordonnées bancaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="s-iban">IBAN</Label>
                <Input id="s-iban" value={iban} onChange={(e) => setIban(e.target.value)} placeholder="FR76 1234 5678 9012 3456 7890 123" className="font-mono" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="s-bic">BIC / SWIFT</Label>
                  <Input id="s-bic" value={bic} onChange={(e) => setBic(e.target.value)} placeholder="BNPAFRPP" className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="s-bankName">Nom de la banque</Label>
                  <Input id="s-bankName" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BNP Paribas" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-holder">Titulaire du compte</Label>
                <Input id="s-holder" value={accountHolder} onChange={(e) => setAccountHolder(e.target.value)} placeholder="Nom de l'entreprise" />
              </div>
              <div className="flex justify-end">
                <Button onClick={saveBanque} disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  <Save className="w-4 h-4 mr-2" />Enregistrer
                </Button>
              </div>
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

  useEffect(() => {
    const id = ++fetchIdRef.current;
    fetchSettings().then(() => {
      if (id === fetchIdRef.current) {
        setLoading(false);
        const s = useAppStore.getState().settings;
        if (!s) setError('Erreur lors du chargement des paramètres');
      }
    });
    return () => { fetchIdRef.current++; };
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
          <Button variant="outline" onClick={() => {
            setLoading(true);
            setError(null);
            const id = ++fetchIdRef.current;
            fetchSettings().then(() => {
              if (id === fetchIdRef.current) {
                setLoading(false);
                const s = useAppStore.getState().settings;
                if (!s) setError('Erreur lors du chargement des paramètres');
              }
            });
          }}>Réessayer</Button>
        </div>
      </div>
    );
  }

  return <SettingsForm key={settings.id} settings={settings} />;
}
