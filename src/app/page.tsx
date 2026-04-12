'use client';

import React, { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { Sidebar } from '@/components/facturapro/sidebar';
import { Dashboard } from '@/components/facturapro/dashboard';
import { InvoiceList } from '@/components/facturapro/invoice-list';
import { InvoiceDetail } from '@/components/facturapro/invoice-detail';
import { InvoiceForm } from '@/components/facturapro/invoice-form';
import { ClientList } from '@/components/facturapro/client-list';
import { ClientDetail } from '@/components/facturapro/client-detail';
import { ClientForm } from '@/components/facturapro/client-form';
import { Reports } from '@/components/facturapro/reports';
import { cn } from '@/lib/utils';

export default function FacturaProApp() {
  const {
    currentPage,
    sidebarOpen,
    showInvoiceForm,
    showClientForm,
    selectedInvoiceId,
    selectedClientId,
    editingInvoiceId,
    editingClientId,
    initialized,
    initialize,
    setShowInvoiceForm,
    setShowClientForm,
    invoices,
    clients,
  } = useAppStore();

  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'invoices':
        return selectedInvoiceId ? <InvoiceDetail /> : <InvoiceList />;
      case 'clients':
        return selectedClientId ? <ClientDetail /> : <ClientList />;
      case 'reports':
        return <Reports />;
      default:
        return <Dashboard />;
    }
  };

  const editingInvoice = editingInvoiceId ? invoices.find((inv) => inv.id === editingInvoiceId) || null : null;
  const editingClient = editingClientId ? clients.find((c) => c.id === editingClientId) || null : null;

  return (
    <div className="min-h-screen bg-slate-50/50">
      <Sidebar />
      <main
        className={cn(
          'transition-all duration-300 ease-in-out min-h-screen',
          sidebarOpen ? 'lg:pl-64' : 'lg:pl-[72px]',
        )}
      >
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-6">
          {renderCurrentPage()}
        </div>
      </main>

      {/* Dialogs - key prop forces remount when editing entity changes */}
      <InvoiceForm
        key={editingInvoiceId || 'new'}
        open={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        editingInvoice={editingInvoice}
      />
      <ClientForm
        key={editingClientId || 'new'}
        open={showClientForm}
        onClose={() => setShowClientForm(false)}
        editingClient={editingClient}
      />
    </div>
  );
}
