'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { toast } = useToast();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'envoi");
        toast({
          title: 'Erreur',
          description: data.error || "Erreur lors de l'envoi",
          variant: 'destructive',
        });
        return;
      }

      setSent(true);
      toast({
        title: 'E-mail envoyé',
        description: data.message || 'Vérifiez votre boîte de réception.',
      });
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
      {sent ? (
        <>
          {/* Success State */}
          <div className="text-center mb-6">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="size-7 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-[#1a1a2e]">
              E-mail envoyé
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Si un compte existe avec cet e-mail, un lien de réinitialisation
              vous sera envoyé. Vérifiez votre boîte de réception et vos
              courriers indésirables.
            </p>
          </div>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm font-medium text-[#1a1a2e] hover:text-[#1a1a2e]/80 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Retour à la connexion
          </Link>
        </>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#1a1a2e]">
              Mot de passe oublié
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Entrez votre adresse e-mail pour recevoir un lien de
              réinitialisation
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

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1a1a2e] hover:bg-[#1a1a2e]/90 text-white h-11 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Envoi en cours…
                </>
              ) : (
                'Envoyer le lien'
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
        </>
      )}
    </AuthLayout>
  );
}
