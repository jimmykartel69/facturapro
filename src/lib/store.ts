import { clearAccountCache, invalidateBillingData, queryClient } from './query-client';
import { create } from 'zustand';
import { Page, Client, Devis, Invoice, DashboardData, Settings, DevisStatus, InvoiceStatus } from './types';

let authenticationVersion = 0;

interface AppState {
  // Auth
  user: { id: string; email: string; name: string; firstName: string } | null;
  isAuthenticated: boolean;
  authLoading: boolean;

  // Navigation
  currentPage: Page;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;

  // UI state
  selectedClientId: string | null;
  selectedDevisId: string | null;
  selectedInvoiceId: string | null;
  showClientForm: boolean;
  showDevisForm: boolean;
  showInvoiceForm: boolean;
  editingClientId: string | null;
  editingDevisId: string | null;
  editingInvoiceId: string | null;

  // Data
  clients: Client[];
  devis: Devis[];
  invoices: Invoice[];
  dashboardData: DashboardData | null;
  settings: Settings | null;

  // Auth actions
  fetchSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<string | null>;
  register: (name: string, firstName: string, email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;

  // Data fetch actions
  fetchClients: (search?: string) => Promise<void>;
  fetchSettings: () => Promise<void>;

  // CRUD actions
  createClient: (data: Record<string, unknown>) => Promise<string | null>;
  updateClient: (id: string, data: Record<string, unknown>) => Promise<string | null>;
  deleteClient: (id: string) => Promise<string | null>;

  createDevis: (data: Record<string, unknown>) => Promise<string | null>;
  updateDevis: (id: string, data: Record<string, unknown>) => Promise<string | null>;
  deleteDevis: (id: string) => Promise<string | null>;
  convertDevisToInvoice: (devisId: string) => Promise<string | null>;

  createInvoice: (data: Record<string, unknown>) => Promise<string | null>;
  updateInvoice: (id: string, data: Record<string, unknown>) => Promise<string | null>;
  deleteInvoice: (id: string) => Promise<string | null>;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => Promise<string | null>;
  updateDevisStatus: (id: string, status: DevisStatus) => Promise<string | null>;

  updateSettings: (data: Record<string, unknown>) => Promise<string | null>;

  // Internal helpers
  handleAuthError: (res: Response) => boolean;

  // Navigation actions
  setPage: (page: Page) => void;
  toggleSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  setSelectedClientId: (id: string | null) => void;
  setSelectedDevisId: (id: string | null) => void;
  setSelectedInvoiceId: (id: string | null) => void;
  setShowClientForm: (show: boolean) => void;
  setShowDevisForm: (show: boolean) => void;
  setShowInvoiceForm: (show: boolean) => void;
  setEditingClientId: (id: string | null) => void;
  setEditingDevisId: (id: string | null) => void;
  setEditingInvoiceId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Auth
  user: null,
  isAuthenticated: false,
  authLoading: true,

  // Navigation
  currentPage: 'dashboard',
  sidebarOpen: true,
  mobileSidebarOpen: false,

  // UI state
  selectedClientId: null,
  selectedDevisId: null,
  selectedInvoiceId: null,
  showClientForm: false,
  showDevisForm: false,
  showInvoiceForm: false,
  editingClientId: null,
  editingDevisId: null,
  editingInvoiceId: null,

  // Data
  clients: [],
  devis: [],
  invoices: [],
  dashboardData: null,
  settings: null,

  // Auth actions
  fetchSession: async () => {
    const version = ++authenticationVersion;
    set({ authLoading: true });
    try {
      const res = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await res.json();
      if (version !== authenticationVersion) return;
      if (data.user) {
        if (get().user?.id !== data.user.id) clearAccountCache();
        set({
          user: data.user,
          isAuthenticated: true,
          authLoading: false,
        });
      } else {
        clearAccountCache();
        set({ user: null, isAuthenticated: false, authLoading: false });
      }
    } catch {
      if (version !== authenticationVersion) return;
      clearAccountCache();
      set({ user: null, isAuthenticated: false, authLoading: false });
    }
  },

  login: async (email, password) => {
    const version = ++authenticationVersion;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (version !== authenticationVersion) return 'La session a changé.';
      if (!res.ok) return data.error || 'Erreur lors de la connexion';
      clearAccountCache();
      set({ user: data.user, isAuthenticated: true });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  register: async (name, firstName, email, password) => {
    const version = ++authenticationVersion;
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, firstName, email, password }),
      });
      const data = await res.json();
      if (version !== authenticationVersion) return 'La session a changé.';
      if (!res.ok) return data.error || "Erreur lors de l'inscription";
      clearAccountCache();
      set({ user: data.user, isAuthenticated: true });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  logout: async () => {
    authenticationVersion++;
    clearAccountCache();
    set({ user: null, isAuthenticated: false, authLoading: false, currentPage: 'dashboard', clients: [], devis: [], invoices: [], settings: null, dashboardData: null, showClientForm: false, showDevisForm: false, showInvoiceForm: false, editingClientId: null, editingDevisId: null, editingInvoiceId: null, selectedClientId: null, selectedDevisId: null, selectedInvoiceId: null });
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {
      // Local credentials and data are already cleared.
    }

  },

  // Helper: handle auth errors from API responses
  handleAuthError: (res: Response) => {
    if (res.status === 401) {
      authenticationVersion++;
      clearAccountCache();
      set({
        user: null,
        isAuthenticated: false,
        authLoading: false,
        clients: [],
        devis: [],
        invoices: [],
        dashboardData: null,
        settings: null,
        showClientForm: false, showDevisForm: false, showInvoiceForm: false,
        editingClientId: null, editingDevisId: null, editingInvoiceId: null,
        selectedClientId: null, selectedDevisId: null, selectedInvoiceId: null,
      });
      // Don't redirect - let the SPA handle it via fetchSession
      return true;
    }
    return false;
  },

  // Data fetch
  fetchClients: async (search?: string) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    if (!account) return;
    const clients = await queryClient.fetchQuery<Client[]>({
      queryKey: [account, 'client-options', search || ''],
      queryFn: async ({ signal }) => {
        const clients: Client[] = [];
        let page = 1;
        while (true) {
          const params = new URLSearchParams({ page: String(page), search: search || '' });
          const res = await fetch(`/api/clients?${params}`, { cache: 'no-store', signal });
          if (version !== authenticationVersion) throw new Error('Session modifiée');
          if (get().handleAuthError(res)) throw new Error('Session expirée');
          if (!res.ok) throw new Error('Impossible de charger les clients');
          const data = await res.json();
          clients.push(...data.clients);
          if (!data.pagination?.hasNext) return clients;
          page++;
        }
      },
    });
    if (version === authenticationVersion) set({ clients });
  },

  fetchSettings: async () => {
    const account = get().user?.id;
    const version = authenticationVersion;
    if (!account) return;
    try {
      const data = await queryClient.fetchQuery<{ settings: Settings }>({
        queryKey: [account, '/api/settings'],
        queryFn: async ({ signal }) => {
          const res = await fetch('/api/settings', { signal, cache: 'no-store' });
          if (version !== authenticationVersion) throw new Error('Session modifiée');
          if (get().handleAuthError(res) || !res.ok) throw new Error('Paramètres indisponibles');
          return res.json();
        },
      });
      if (version === authenticationVersion) set({ settings: data.settings });
    } catch {
      // Existing callers display their own unavailable-settings state.
    }
  },

  // Client CRUD
  createClient: async (data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateClient: async (id, data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  deleteClient: async (id) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set((s) => ({
        selectedClientId: s.selectedClientId === id ? null : s.selectedClientId,
      }));
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  // Devis CRUD
  createDevis: async (data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set({ showDevisForm: false, editingDevisId: null });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateDevis: async (id, data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch(`/api/devis/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set({ showDevisForm: false, editingDevisId: null });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  deleteDevis: async (id) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch(`/api/devis/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set((s) => ({
        selectedDevisId: s.selectedDevisId === id ? null : s.selectedDevisId,
      }));
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateDevisStatus: async (id, status) => {
    return get().updateDevis(id, { status });
  },

  convertDevisToInvoice: async (devisId) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch('/api/convert-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId }),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  // Invoice CRUD
  createInvoice: async (data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set({ showInvoiceForm: false, editingInvoiceId: null });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateInvoice: async (id, data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set({ showInvoiceForm: false, editingInvoiceId: null });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  deleteInvoice: async (id) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set((s) => ({
        selectedInvoiceId: s.selectedInvoiceId === id ? null : s.selectedInvoiceId,
      }));
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateInvoiceStatus: async (id, status) => {
    return get().updateInvoice(id, { status });
  },

  // Settings
  updateSettings: async (data) => {
    const account = get().user?.id;
    const version = authenticationVersion;
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (version !== authenticationVersion || account !== get().user?.id) return "La session a changé. Rechargez la page.";
      if (!res.ok) { get().handleAuthError(res); return result.error || 'Erreur serveur'; }
      await invalidateBillingData();
      if (version !== authenticationVersion) return "La session a changé. Rechargez la page.";
      set({ settings: result.settings });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  // Navigation
  setPage: (page) => {
    set({ currentPage: page, selectedClientId: null, selectedDevisId: null, selectedInvoiceId: null, mobileSidebarOpen: false });
  },
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setSelectedClientId: (id) => set({ selectedClientId: id }),
  setSelectedDevisId: (id) => set({ selectedDevisId: id }),
  setSelectedInvoiceId: (id) => set({ selectedInvoiceId: id }),
  setShowClientForm: (show) => set({ showClientForm: show, editingClientId: show ? null : get().editingClientId }),
  setShowDevisForm: (show) => set({ showDevisForm: show, editingDevisId: show ? null : get().editingDevisId }),
  setShowInvoiceForm: (show) => set({ showInvoiceForm: show, editingInvoiceId: show ? null : get().editingInvoiceId }),
  setEditingClientId: (id) => set({ editingClientId: id, showClientForm: true }),
  setEditingDevisId: (id) => set({ editingDevisId: id, showDevisForm: true }),
  setEditingInvoiceId: (id) => set({ editingInvoiceId: id, showInvoiceForm: true }),
}));
