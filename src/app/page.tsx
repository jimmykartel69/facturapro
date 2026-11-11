'use client';

import { useShallow } from 'zustand/react/shallow';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import dynamic from 'next/dynamic';
import { FormLoader } from '@/components/facturapro/form-loader';
import React, { useState, useEffect, Component, type ReactNode } from 'react';
import { Menu, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/facturapro/sidebar';
const Dashboard = dynamic(() => import('@/components/facturapro/dashboard').then(m => m.Dashboard), { loading: () => <p role="status">Chargement…</p> });
const InvoiceList = dynamic(() => import('@/components/facturapro/invoice-list').then(m => m.InvoiceList), { loading: () => <p role="status">Chargement…</p> });
const InvoiceDetail = dynamic(() => import('@/components/facturapro/invoice-detail').then(m => m.InvoiceDetail), { loading: () => <p role="status">Chargement…</p> });
const ClientList = dynamic(() => import('@/components/facturapro/client-list').then(m => m.ClientList), { loading: () => <p role="status">Chargement…</p> });
const ClientDetail = dynamic(() => import('@/components/facturapro/client-detail').then(m => m.ClientDetail), { loading: () => <p role="status">Chargement…</p> });
const DevisList = dynamic(() => import('@/components/facturapro/devis-list').then(m => m.DevisList), { loading: () => <p role="status">Chargement…</p> });
const DevisDetail = dynamic(() => import('@/components/facturapro/devis-detail').then(m => m.DevisDetail), { loading: () => <p role="status">Chargement…</p> });
const SettingsPage = dynamic(() => import('@/components/facturapro/settings').then(m => m.SettingsPage), { loading: () => <p role="status">Chargement…</p> });
const DocumentSettingsPage = dynamic(() => import('@/components/facturapro/document-settings').then(m => m.DocumentSettingsPage), { loading: () => <p role="status">Chargement…</p> });
import { cn } from '@/lib/utils';

// --- Error Boundary to catch rendering crashes ---
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Une erreur est survenue</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md">
            {this.state.error?.message || 'Erreur inconnue'}
          </p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoginPage() {
  const { login, register } = useAppStore(useShallow(s => ({ login: s.login, register: s.register })));
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    let err: string | null;
    if (isRegister) {
      err = await register(name, firstName, email, password);
    } else {
      err = await login(email, password);
    }
    setLoading(false);
    if (err) setError(err);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-[#1a1a2e] rounded-lg flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1a1a2e]">FacturaPro</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Gestion de factures professionnelle
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isRegister ? 'Créer un compte' : 'Se connecter'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="auth-name">Nom *</Label>
                  <Input id="auth-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dupont" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-firstname">Prénom</Label>
                  <Input id="auth-firstname" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Email *</Label>
              <Input id="auth-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="auth-password">Mot de passe *</Label>
              <Input id="auth-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
              {isRegister && (
                <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
              )}
            </div>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRegister ? "S'inscrire" : 'Se connecter'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => { setIsRegister(!isRegister); setError(''); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isRegister
                ? 'Déjà un compte ? Se connecter'
                : 'Pas encore de compte ? Créer un compte'}
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 FacturaPro. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

function AuthenticatedApp() {
  const {
    currentPage,
    sidebarOpen,
    selectedInvoiceId,
    selectedClientId,
    selectedDevisId,
    editingClientId,
    editingDevisId,
    editingInvoiceId,
    showClientForm,
    showDevisForm,
    showInvoiceForm,
  } = useAppStore(useShallow(s => ({ currentPage: s.currentPage, sidebarOpen: s.sidebarOpen, selectedInvoiceId: s.selectedInvoiceId, selectedClientId: s.selectedClientId, selectedDevisId: s.selectedDevisId, editingClientId: s.editingClientId, editingDevisId: s.editingDevisId, editingInvoiceId: s.editingInvoiceId, showClientForm: s.showClientForm, showDevisForm: s.showDevisForm, showInvoiceForm: s.showInvoiceForm })));

  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);



  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return selectedClientId ? <ClientDetail /> : <ClientList />;
      case 'devis':
        return selectedDevisId ? <DevisDetail /> : <DevisList />;
      case 'invoices':
        return selectedInvoiceId ? <InvoiceDetail /> : <InvoiceList />;
      case 'document-settings':
        return <DocumentSettingsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]',
        )}
      >
        <header className="lg:hidden sticky top-0 z-20 bg-white/80 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setMobileSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-bold text-[#1a1a2e]">FacturaPro</h1>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 pt-20 lg:pt-8">
          <ErrorBoundary>
            {renderCurrentPage()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Global dialogs - key prop forces remount when editing entity changes */}
      {showClientForm && <FormLoader key={editingClientId || 'new-client'} kind="client" id={editingClientId} />}
      {showDevisForm && <FormLoader key={editingDevisId || 'new-devis'} kind="devis" id={editingDevisId} />}
      {showInvoiceForm && <FormLoader key={editingInvoiceId || 'new-invoice'} kind="invoice" id={editingInvoiceId} />}
    </div>
  );
}

export default function FacturaProApp() {
  const { authLoading, isAuthenticated, fetchSession } = useAppStore(useShallow(s => ({ authLoading: s.authLoading, isAuthenticated: s.isAuthenticated, fetchSession: s.fetchSession })));

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-[#1a1a2e]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <QueryClientProvider client={queryClient}><AuthenticatedApp /></QueryClientProvider>;
}
