'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const login = useAppStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const err = await login(email, password);
      if (err) {
        setError(err);
        toast({
          title: 'Erreur',
          description: err,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Bienvenue !',
        description: 'Connexion réussie.',
      });

      router.push('/');
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

  return (
    <AuthLayout>
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-[#1a1a2e]">
          Connexion
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Accédez à votre espace FacturaPro
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
        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email">Adresse e-mail</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="vous@exemple.fr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="pl-9"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#1a1a2e] hover:text-[#1a1a2e]/80 font-medium underline-offset-2 hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
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

        {/* Submit */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1a1a2e] hover:bg-[#1a1a2e]/90 text-white h-11 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Connexion en cours…
            </>
          ) : (
            'Se connecter'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-white px-2 text-muted-foreground">ou</span>
        </div>
      </div>

      {/* Register link */}
      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{' '}
        <Link
          href="/register"
          className="font-semibold text-[#1a1a2e] hover:text-[#1a1a2e]/80 underline-offset-2 hover:underline"
        >
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
}
