'use client';

import React, { useState, useEffect, Component, type ReactNode, useCallback } from 'react';
import { Menu, Loader2, AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/facturapro/sidebar';
import { Dashboard } from '@/components/facturapro/dashboard';
import { InvoiceList } from '@/components/facturapro/invoice-list';
import { InvoiceDetail } from '@/components/facturapro/invoice-detail';
import { InvoiceForm } from '@/components/facturapro/invoice-form';
import { ClientList } from '@/components/facturapro/client-list';
import { ClientDetail } from '@/components/facturapro/client-detail';
import { ClientForm } from '@/components/facturapro/client-form';
import { DevisList } from '@/components/facturapro/devis-list';
import { DevisDetail } from '@/components/facturapro/devis-detail';
import { DevisForm } from '@/components/facturapro/devis-form';
import { SettingsPage } from '@/components/facturapro/settings';
import { cn } from '@/lib/utils';

// --- Error Boundary ---
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
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center animate-entrance">
          <div className="premium-card max-w-md w-full flex flex-col items-center p-8">
            <AlertTriangle className="w-14 h-14 text-[var(--danger)] mb-4 opacity-90" />
            <h3 className="text-xl font-bold mb-2">Oups, une erreur est survenue</h3>
            <p className="text-sm text-muted mb-6">
              {this.state.error?.message || 'Erreur inattendue lors du chargement du composant.'}
            </p>
            <button className="accent-btn" onClick={this.reset}>
              <RefreshCw className="w-4 h-4" />
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function LoginPage(): JSX.Element {
  const { login, register } = useAppStore();
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
    try {
      let err: string | null = null;
      if (isRegister) {
        err = await register(name.trim(), firstName.trim(), email.trim(), password);
      } else {
        err = await login(email.trim(), password);
      }
      if (err) setError(err);
    } catch (errAny) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      setError((errAny as Error)?.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] text-[var(--fg)] px-4 py-8 relative overflow-hidden">
      
      {/* Effets de fond Premium (Glow décoratif) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[var(--primary)]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[var(--accent)]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 animate-entrance">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-600)] rounded-2xl shadow-lg mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <polyline points="10 9 9 9 8 9"/>
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">FacturaPro</h1>
          <p className="text-muted mt-2">
            La gestion financière, simplifiée.
          </p>
        </div>

        <div className="premium-card p-8">
          <h2 className="text-xl font-bold mb-6 text-center">
            {isRegister ? 'Créer votre compte' : 'Bon retour parmi nous'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {isRegister && (
              <div className="grid grid-cols-2 gap-4 animate-entrance">
                <div className="space-y-2">
                  <Label htmlFor="auth-name">Nom *</Label>
                  <Input id="auth-name" className="focus-ring" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dupont" required autoComplete="family-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-firstname">Prénom</Label>
                  <Input id="auth-firstname" className="focus-ring" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jean" autoComplete="given-name" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="auth-email">Adresse email *</Label>
              <Input id="auth-email" type="email" className="focus-ring" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.fr" required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">Mot de passe *</Label>
                {!isRegister && (
                  <a href="#" className="text-xs text-[var(--primary)] font-medium hover:underline">Mot de passe oublié ?</a>
                )}
              </div>
              <Input id="auth-password" type="password" className="focus-ring" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} autoComplete={isRegister ? 'new-password' : 'current-password'} />
              {isRegister && (
                <p className="text-xs text-muted">Minimum 8 caractères requis</p>
              )}
            </div>

            {error && (
              <div role="alert" className="text-sm font-medium text-[var(--danger)] bg-[var(--danger)]/10 border border-[var(--danger)]/20 rounded-md px-4 py-3 flex items-start gap-2 animate-entrance">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <button type="submit" className="accent-btn w-full justify-center py-2.5 mt-2" disabled={loading}>
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {isRegister ? "Créer mon espace" : 'Se connecter'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-[var(--border)] text-center">
            <p className="text-sm text-muted">
              {isRegister ? 'Déjà un compte ?' : 'Nouveau sur FacturaPro ?'}{' '}
              <button
                type="button"
                onClick={() => { setIsRegister(!isRegister); setError(''); }}
                className="text-[var(--primary)] font-semibold hover:text-[var(--primary-600)] transition-colors cursor-pointer"
              >
                {isRegister ? 'Se connecter' : 'Créer un compte'}
              </button>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted mt-8">
          © {new Date().getFullYear()} FacturaPro. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

function AuthenticatedApp(): JSX.Element {
  const {
    currentPage,
    sidebarOpen,
    selectedInvoiceId,
    selectedClientId,
    selectedDevisId,
    editingClientId,
    editingDevisId,
    editingInvoiceId,
    fetchClients,
    fetchDashboard,
  } = useAppStore();

  const setMobileSidebarOpen = useAppStore((s) => s.setMobileSidebarOpen);

  useEffect(() => {
    fetchClients();
    fetchDashboard();
  }, [fetchClients, fetchDashboard]);

  const renderCurrentPage = useCallback(() => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return selectedClientId ? <ClientDetail /> : <ClientList />;
      case 'devis':
        return selectedDevisId ? <DevisDetail /> : <DevisList />;
      case 'invoices':
        return selectedInvoiceId ? <InvoiceDetail /> : <InvoiceList />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  }, [currentPage, selectedClientId, selectedDevisId, selectedInvoiceId]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] font-sans">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]',
        )}
      >
        {/* Header Mobile avec effet Glassmorphism */}
        <header className="lg:hidden sticky top-0 z-20 glass rounded-none border-b border-[var(--glass-border)] px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 text-[var(--fg)] hover:bg-[var(--border)]" onClick={() => setMobileSidebarOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-[var(--primary)] to-[var(--primary-600)] rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <h1 className="font-bold text-lg tracking-tight">FacturaPro</h1>
          </div>
        </header>

        {/* Zone de contenu principale */}
        <div className="p-4 sm:p-6 lg:p-10 pt-6 lg:pt-10 max-w-[1600px] mx-auto">
          <ErrorBoundary>
            {renderCurrentPage()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Modales globales */}
      <ClientForm key={editingClientId || 'new-client'} editingClientId={editingClientId} />
      <DevisForm key={editingDevisId || 'new-devis'} editingDevisId={editingDevisId} />
      <InvoiceForm key={editingInvoiceId || 'new-invoice'} editingInvoiceId={editingInvoiceId} />
    </div>
  );
}

export default function FacturaProApp(): JSX.Element {
  const { authLoading, isAuthenticated, fetchSession } = useAppStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)]">
        {/* Spinner de chargement Premium */}
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 border-4 border-[var(--border)] rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[var(--primary)] rounded-full border-t-transparent animate-spin"></div>
          <svg className="w-6 h-6 text-[var(--primary)] relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <p className="mt-4 text-sm font-medium text-muted animate-pulse">Chargement de votre espace...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}
