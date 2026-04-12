import { create } from 'zustand';
import { Page, Client, Devis, Invoice, DashboardData, Settings, DevisStatus, InvoiceStatus } from './types';

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
  fetchDevis: (status?: string, search?: string) => Promise<void>;
  fetchInvoices: (status?: string, search?: string) => Promise<void>;
  fetchDashboard: () => Promise<void>;
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
    set({ authLoading: true });
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.user) {
        set({
          user: data.user,
          isAuthenticated: true,
          authLoading: false,
        });
      } else {
        set({ user: null, isAuthenticated: false, authLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, authLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || 'Erreur lors de la connexion';
      set({ user: data.user, isAuthenticated: true });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  register: async (name, firstName, email, password) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, firstName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) return data.error || "Erreur lors de l'inscription";
      set({ user: data.user, isAuthenticated: true });
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    set({
      user: null,
      isAuthenticated: false,
      clients: [],
      devis: [],
      invoices: [],
      dashboardData: null,
      settings: null,
      currentPage: 'dashboard',
    });
  },

  // Helper: handle auth errors from API responses
  handleAuthError: (res: Response) => {
    if (res.status === 401) {
      set({
        user: null,
        isAuthenticated: false,
        authLoading: false,
        clients: [],
        devis: [],
        invoices: [],
        dashboardData: null,
        settings: null,
      });
      // Don't redirect - let the SPA handle it via fetchSession
      return true;
    }
    return false;
  },

  // Data fetch
  fetchClients: async (search?: string) => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/clients?${params.toString()}`);
      if (get().handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) set({ clients: data.clients || [] });
    } catch {
      // ignore
    }
  },

  fetchDevis: async (status?: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await fetch(`/api/devis?${params.toString()}`);
      if (get().handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) set({ devis: data.devis || [] });
    } catch {
      // ignore
    }
  },

  fetchInvoices: async (status?: string, search?: string) => {
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (search) params.set('search', search);
      const res = await fetch(`/api/invoices?${params.toString()}`);
      if (get().handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) set({ invoices: data.invoices || [] });
    } catch {
      // ignore
    }
  },

  fetchDashboard: async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (get().handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) set({ dashboardData: data });
    } catch {
      // ignore
    }
  },

  fetchSettings: async () => {
    try {
      const res = await fetch('/api/settings');
      if (get().handleAuthError(res)) return;
      const data = await res.json();
      if (res.ok) set({ settings: data.settings });
    } catch {
      // ignore
    }
  },

  // Client CRUD
  createClient: async (data) => {
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      await get().fetchClients();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateClient: async (id, data) => {
    try {
      const res = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      await get().fetchClients();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  deleteClient: async (id) => {
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set((s) => ({
        selectedClientId: s.selectedClientId === id ? null : s.selectedClientId,
      }));
      await get().fetchClients();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  // Devis CRUD
  createDevis: async (data) => {
    try {
      const res = await fetch('/api/devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set({ showDevisForm: false, editingDevisId: null });
      await get().fetchDevis();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateDevis: async (id, data) => {
    try {
      const res = await fetch(`/api/devis/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set({ showDevisForm: false, editingDevisId: null });
      await get().fetchDevis();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  deleteDevis: async (id) => {
    try {
      const res = await fetch(`/api/devis/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set((s) => ({
        selectedDevisId: s.selectedDevisId === id ? null : s.selectedDevisId,
      }));
      await get().fetchDevis();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateDevisStatus: async (id, status) => {
    return get().updateDevis(id, { status });
  },

  convertDevisToInvoice: async (devisId) => {
    try {
      const res = await fetch('/api/convert-devis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devisId }),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      await get().fetchDevis();
      await get().fetchInvoices();
      await get().fetchDashboard();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  // Invoice CRUD
  createInvoice: async (data) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set({ showInvoiceForm: false, editingInvoiceId: null });
      await get().fetchInvoices();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  updateInvoice: async (id, data) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set({ showInvoiceForm: false, editingInvoiceId: null });
      await get().fetchInvoices();
      return null;
    } catch {
      return 'Erreur réseau';
    }
  },

  deleteInvoice: async (id) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
      set((s) => ({
        selectedInvoiceId: s.selectedInvoiceId === id ? null : s.selectedInvoiceId,
      }));
      await get().fetchInvoices();
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
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return result.error || 'Erreur serveur';
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
