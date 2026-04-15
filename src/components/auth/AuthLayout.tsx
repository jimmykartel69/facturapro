'use client';

import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="auth-shell relative min-h-screen flex flex-col items-center justify-center px-4 py-8 overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div className="auth-orb auth-orb-1" />
        <div className="auth-orb auth-orb-2" />
        <div className="auth-orb auth-orb-3" />
        <div className="auth-noise-layer" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-[#1a1a2e] rounded-lg flex items-center justify-center shadow-lg ring-1 ring-white/35">
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

        {/* Card */}
        <div className="auth-card rounded-2xl border border-white/50 p-6 shadow-glass">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 FacturaPro. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}
