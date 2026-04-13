'use client';

import React, {
  useState,
  useEffect,
  Component,
  type ReactNode,
  useCallback,
} from 'react';
import {
  Menu,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Users,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

/* ─────────────────────────────────────────────
   Icône FacturaPro (document stylisé)
───────────────────────────────────────────── */
function BrandIcon({ size = 28, strokeWidth = 2.4 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Error Boundary
───────────────────────────────────────────── */
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

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center py-24 px-4 text-center animate-entrance">
          <div
            className="card-premium max-w-sm w-full flex flex-col items-center gap-4 p-10"
            role="alert"
          >
            {/* Icône d'erreur encadrée */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'var(--status-overdue-bg)', border: '1px solid var(--status-overdue-ring)' }}
            >
              <AlertTriangle className="w-7 h-7" style={{ color: 'var(--status-overdue)' }} />
            </div>

            <div>
              <h3 className="font-display text-lg font-700 mb-1" style={{ fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                Oups — une erreur est survenue
              </h3>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {this.state.error?.message || 'Erreur inattendue lors du chargement du composant.'}
              </p>
            </div>

            <button className="btn btn-primary btn-sm gap-2 mt-2" onClick={this.reset}>
              <RefreshCw className="w-3.5 h-3.5" />
              Réessayer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ─────────────────────────────────────────────
   Atouts produit (panneau gauche du login)
───────────────────────────────────────────── */
const FEATURES = [
  {
    icon: FileText,
    title: 'Facturation instantanée',
    desc: 'Créez et envoyez des factures professionnelles en quelques secondes.',
  },
  {
    icon: Users,
    title: 'Gestion des clients',
    desc: "Un carnet d'adresses complet, centralisé et toujours à jour.",
  },
  {
    icon: TrendingUp,
    title: 'Suivi en temps réel',
    desc: 'Tableau de bord analytique pour piloter votre activité.',
  },
  {
    icon: CheckCircle2,
    title: 'Devis & relances auto',
    desc: 'Convertissez vos devis en factures, relancez automatiquement.',
  },
] as const;

/* ─────────────────────────────────────────────
   Page de Connexion / Inscription
───────────────────────────────────────────── */
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
      const err = isRegister
        ? await register(name.trim(), firstName.trim(), email.trim(), password)
        : await login(email.trim(), password);
      if (err) setError(err);
    } catch (errAny) {
      setError((errAny as Error)?.message || 'Erreur inattendue');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister((v) => !v);
    setError('');
    setName('');
    setFirstName('');
    setEmail('');
    setPassword('');
  };

  return (
    <div
      className="min-h-screen flex items-stretch overflow-hidden"
      style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-body)' }}
    >
      {/* ── Panneau gauche : branding & features (desktop uniquement) ── */}
      <aside
        className="hidden lg:flex flex-col justify-between w-[480px] xl:w-[520px] flex-shrink-0 relative overflow-hidden p-12"
        style={{ background: 'linear-gradient(160deg, #0c1330 0%, #111d4a 60%, #0a1628 100%)' }}
      >
        {/* Halos décoratifs */}
        <div
          className="absolute top-[-15%] left-[-15%] w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(26,60,255,0.25) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(200,151,58,0.18) 0%, transparent 70%)' }}
        />

        {/* Logo */}
        <div className="relative z-10 animate-entrance">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)' }}
            >
              <BrandIcon size={22} strokeWidth={2.5} />
            </div>
            <span
              className="text-2xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
            >
              FacturaPro
            </span>
          </div>
          <p className="text-sm" style={{ color: 'rgba(168,179,214,0.85)' }}>
            La gestion financière, simplifiée pour les indépendants et TPE.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 flex flex-col gap-6 my-auto py-12">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div
              key={title}
              className="flex items-start gap-4 animate-entrance"
              style={{ animationDelay: `${80 + i * 80}ms` }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{
                  background: 'rgba(26,60,255,0.18)',
                  border: '1px solid rgba(77,114,255,0.25)',
                }}
              >
                <Icon className="w-4 h-4" style={{ color: '#7c9dff' }} />
              </div>
              <div>
                <p className="font-semibold text-white text-sm mb-0.5" style={{ fontFamily: 'var(--font-display)' }}>
                  {title}
                </p>
                <p className="text-xs leading-relaxed" style={{ color: 'rgba(168,179,214,0.75)' }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Témoignage / badge de confiance */}
        <div
          className="relative z-10 rounded-xl p-4 animate-entrance delay-500"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <p className="text-xs italic leading-relaxed mb-2" style={{ color: 'rgba(200,210,240,0.80)' }}>
            "FacturaPro a transformé ma gestion administrative. Je gagne 3h par semaine et mes paiements arrivent bien plus vite."
          </p>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--gold, #c8973a))' }}
            >
              M
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Marie L.</p>
              <p className="text-xs" style={{ color: 'rgba(168,179,214,0.6)' }}>Consultante indépendante</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Panneau droit : formulaire ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
        {/* Halos subtils côté form */}
        <div
          className="absolute top-0 right-0 w-72 h-72 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 80% 10%, rgba(26,60,255,0.06) 0%, transparent 60%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 pointer-events-none"
          style={{ background: 'radial-gradient(circle at 20% 90%, rgba(200,151,58,0.05) 0%, transparent 60%)' }}
        />

        <div className="w-full max-w-[420px] relative z-10">

          {/* Logo mobile */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-10 animate-entrance">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)' }}
            >
              <BrandIcon size={22} strokeWidth={2.5} />
            </div>
            <span
              className="text-2xl font-extrabold"
              style={{
                fontFamily: 'var(--font-display)',
                letterSpacing: '-0.03em',
                background: 'linear-gradient(120deg, var(--brand), var(--gold, #c8973a))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              FacturaPro
            </span>
          </div>

          {/* En-tête formulaire */}
          <div className="mb-8 animate-entrance delay-50">
            <h1
              className="text-2xl font-bold mb-1.5"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              {isRegister ? 'Créer votre espace' : 'Bon retour 👋'}
            </h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {isRegister
                ? 'Rejoignez des milliers de professionnels.'
                : 'Connectez-vous pour gérer vos factures.'}
            </p>
          </div>

          {/* Carte formulaire */}
          <div
            className="card-premium animate-entrance delay-100"
            style={{ padding: '2rem' }}
          >
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

              {/* Champs Nom + Prénom */}
              {isRegister && (
                <div className="grid grid-cols-2 gap-3 animate-entrance">
                  <div className="input-group">
                    <label className="input-label" htmlFor="auth-name">Nom *</label>
                    <input
                      id="auth-name"
                      className="input-field"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Dupont"
                      required
                      autoComplete="family-name"
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="auth-firstname">Prénom</label>
                    <input
                      id="auth-firstname"
                      className="input-field"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jean"
                      autoComplete="given-name"
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="input-group animate-entrance delay-100">
                <label className="input-label" htmlFor="auth-email">Adresse email *</label>
                <input
                  id="auth-email"
                  type="email"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.fr"
                  required
                  autoComplete="email"
                />
              </div>

              {/* Mot de passe */}
              <div className="input-group animate-entrance delay-150">
                <div className="flex items-center justify-between mb-0.5">
                  <label className="input-label" htmlFor="auth-password">Mot de passe *</label>
                  {!isRegister && (
                    <a
                      href="#"
                      className="text-xs font-medium transition-opacity hover:opacity-70"
                      style={{ color: 'var(--brand)' }}
                    >
                      Oublié ?
                    </a>
                  )}
                </div>
                <input
                  id="auth-password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                />
                {isRegister && (
                  <p className="text-xs mt-1" style={{ color: 'var(--muted-light)' }}>
                    Minimum 8 caractères requis
                  </p>
                )}
              </div>

              {/* Erreur */}
              {error && (
                <div
                  className="flex items-start gap-2.5 text-sm rounded-lg px-4 py-3 animate-entrance"
                  role="alert"
                  style={{
                    color: 'var(--status-overdue)',
                    background: 'var(--status-overdue-bg)',
                    border: '1px solid var(--status-overdue-ring)',
                  }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                className="btn btn-primary w-full justify-center gap-2 mt-1"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {isRegister ? 'Créer mon espace' : 'Se connecter'}
              </button>
            </form>

            {/* Séparateur */}
            <div className="divider-label my-6">ou</div>

            {/* Switch mode */}
            <p className="text-sm text-center" style={{ color: 'var(--muted)' }}>
              {isRegister ? 'Déjà un compte ?' : 'Nouveau sur FacturaPro ?'}{' '}
              <button
                type="button"
                onClick={switchMode}
                className="font-semibold transition-opacity hover:opacity-70"
                style={{ color: 'var(--brand)' }}
              >
                {isRegister ? 'Se connecter' : 'Créer un compte'}
              </button>
            </p>
          </div>

          {/* Footer */}
          <p
            className="text-center text-xs mt-8 animate-entrance delay-300"
            style={{ color: 'var(--muted-light)' }}
          >
            © {new Date().getFullYear()} FacturaPro — Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Application authentifiée
───────────────────────────────────────────── */
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
      case 'dashboard': return <Dashboard />;
      case 'clients':   return selectedClientId ? <ClientDetail /> : <ClientList />;
      case 'devis':     return selectedDevisId  ? <DevisDetail />  : <DevisList />;
      case 'invoices':  return selectedInvoiceId ? <InvoiceDetail /> : <InvoiceList />;
      case 'settings':  return <SettingsPage />;
      default:          return <Dashboard />;
    }
  }, [currentPage, selectedClientId, selectedDevisId, selectedInvoiceId]);

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg)', color: 'var(--fg)', fontFamily: 'var(--font-body)' }}
    >
      <Sidebar />

      <main
        className={cn(
          'transition-all duration-300 min-h-screen',
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-[72px]',
        )}
      >
        {/* Header mobile avec glassmorphism */}
        <header
          className="lg:hidden sticky top-0 z-20 glass flex items-center gap-3 px-4 py-3"
          style={{ borderBottom: '1px solid var(--glass-border)', borderRadius: 0 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            style={{ color: 'var(--fg)' }}
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)' }}
            >
              <BrandIcon size={16} strokeWidth={2.5} />
            </div>
            <span
              className="font-bold text-base tracking-tight"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.025em' }}
            >
              FacturaPro
            </span>
          </div>
        </header>

        {/* Contenu principal */}
        <div className="p-4 sm:p-6 lg:p-10 pt-6 lg:pt-10 max-w-[1600px] mx-auto">
          <ErrorBoundary>
            {renderCurrentPage()}
          </ErrorBoundary>
        </div>
      </main>

      {/* Modales globales */}
      <ClientForm  key={editingClientId  || 'new-client'}  editingClientId={editingClientId} />
      <DevisForm   key={editingDevisId   || 'new-devis'}   editingDevisId={editingDevisId} />
      <InvoiceForm key={editingInvoiceId || 'new-invoice'} editingInvoiceId={editingInvoiceId} />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Loading screen premium
───────────────────────────────────────────── */
function LoadingScreen(): JSX.Element {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: 'var(--bg)' }}
    >
      {/* Spinner composé */}
      <div className="relative w-16 h-16">
        {/* Anneau extérieur */}
        <div
          className="absolute inset-0 rounded-full animate-spin"
          style={{
            border: '3px solid var(--border)',
            borderTopColor: 'var(--brand)',
            animationDuration: '900ms',
            animationTimingFunction: 'linear',
          }}
        />
        {/* Anneau intérieur (or) */}
        <div
          className="absolute inset-[5px] rounded-full animate-spin"
          style={{
            border: '2px solid transparent',
            borderBottomColor: 'var(--gold, #c8973a)',
            animationDuration: '1400ms',
            animationTimingFunction: 'linear',
            animationDirection: 'reverse',
          }}
        />
        {/* Icône centrale */}
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-dark) 100%)' }}
          >
            <BrandIcon size={16} strokeWidth={2.5} />
          </div>
        </div>
      </div>

      <div className="text-center animate-entrance delay-200">
        <p
          className="text-sm font-medium"
          style={{ color: 'var(--muted)', fontFamily: 'var(--font-body)' }}
        >
          Chargement de votre espace…
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Export principal
───────────────────────────────────────────── */
export default function FacturaProApp(): JSX.Element {
  const { authLoading, isAuthenticated, fetchSession } = useAppStore();

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  if (authLoading)     return <LoadingScreen />;
  if (!isAuthenticated) return <LoginPage />;
  return <AuthenticatedApp />;
}
