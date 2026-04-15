'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lock, Eye, EyeOff, ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    if (!password) {
      setError('Le mot de passe est requis');
      return false;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return false;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return false;
    }
    setError('');
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    if (!token) {
      setError('Jeton de réinitialisation manquant. Veuillez utiliser le lien envoyé par e-mail.');
      toast({
        title: 'Erreur',
        description: 'Jeton de réinitialisation manquant.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const message = data.error || 'Erreur lors de la réinitialisation';
        setError(message);
        toast({
          title: 'Erreur',
          description: message,
          variant: 'destructive',
        });
        return;
      }

      setSuccess(true);
      toast({
        title: 'Succès',
        description: 'Votre mot de passe a été réinitialisé.',
      });

      // Redirect to login after a short delay
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch {
      setError('Une erreur réseau est survenue. Veuillez réessayer.');
      toast({
        title: 'Erreur',
        description: 'Une erreur réseau est survenue.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // No token provided
  if (!token) {
    return (
      <AuthLayout>
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-amber-50">
            <AlertTriangle className="size-7 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a2e]">
            Lien invalide
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Le lien de réinitialisation est manquant ou invalide. Veuillez
            demander un nouveau lien de réinitialisation.
          </p>
        </div>

        <Link
          href="/forgot-password"
          className="flex items-center justify-center gap-2 text-sm font-medium text-[#1a1a2e] hover:text-[#1a1a2e]/80 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Demander un nouveau lien
        </Link>
      </AuthLayout>
    );
  }

  // Success state
  if (success) {
    return (
      <AuthLayout>
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-[#1a1a2e]">
            Mot de passe mis à jour
          </h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Votre mot de passe a été réinitialisé avec succès. Vous allez être
            redirigé vers la page de connexion.
          </p>
        </div>

        <Link
          href="/login"
          className="flex items-center justify-center gap-2 text-sm font-medium text-[#1a1a2e] hover:text-[#1a1a2e]/80 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Aller à la connexion
        </Link>
      </AuthLayout>
    );
  }

  // Form state
  return (
    <AuthLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1a1a2e]">
          Nouveau mot de passe
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Choisissez un mot de passe sécurisé pour votre compte
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New Password */}
        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Minimum 8 caractères"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="pl-9 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Retapez le mot de passe"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="pl-9 pr-9"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
            >
              {showConfirmPassword ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </button>
          </div>
        </div>

        {/* Password requirements */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
          <p className="text-xs font-medium text-[#1a1a2e] mb-1.5">
            Le mot de passe doit :
          </p>
          <ul className="space-y-1">
            <li className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${password.length >= 8 ? 'bg-emerald-500' : 'bg-slate-300'}`}
              />
              Contenir au moins 8 caractères
            </li>
            <li className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${password && confirmPassword && password === confirmPassword ? 'bg-emerald-500' : 'bg-slate-300'}`}
              />
              Correspondre dans les deux champs
            </li>
          </ul>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a1a2e] hover:bg-[#1a1a2e]/90 text-white h-11 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Réinitialisation en cours…
            </>
          ) : (
            'Réinitialiser le mot de passe'
          )}
        </Button>
      </form>

      {/* Back to login */}
      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a2e] hover:text-[#1a1a2e]/80 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Retour à la connexion
        </Link>
      </div>
    </AuthLayout>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthLayout>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        </AuthLayout>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
