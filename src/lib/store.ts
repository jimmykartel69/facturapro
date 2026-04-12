import { create } from 'zustand';
import { Invoice, Client, LineItem, Page, InvoiceStatus } from './types';
import {
  loadInvoices,
  saveInvoices,
  loadClients,
  saveClients,
  generateId,
  generateInvoiceNumber,
} from './data';

interface AppState {
  // Navigation
  currentPage: Page;
  sidebarOpen: boolean;
  mobileSidebarOpen: boolean;

  // Data
  invoices: Invoice[];
  clients: Client[];
  initialized: boolean;

  // UI State
  selectedInvoiceId: string | null;
  selectedClientId: string | null;
  showInvoiceForm: boolean;
  showClientForm: boolean;
  editingInvoiceId: string | null;
  editingClientId: string | null;
  invoiceFilter: string;
  searchQuery: string;

  // Actions - Navigation
  setPage: (page: Page) => void;
  setSidebarOpen: (open: boolean) => void;
  setMobileSidebarOpen: (open: boolean) => void;

  // Actions - Data
  initialize: () => void;
  addInvoice: (invoice: Omit<Invoice, 'id' | 'number'>) => Invoice;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  updateInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  addClient: (client: Omit<Client, 'id'>) => Client;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Actions - UI
  selectInvoice: (id: string | null) => void;
  selectClient: (id: string | null) => void;
  setShowInvoiceForm: (show: boolean) => void;
  setShowClientForm: (show: boolean) => void;
  setEditingInvoice: (id: string | null) => void;
  setEditingClient: (id: string | null) => void;
  setInvoiceFilter: (filter: string) => void;
  setSearchQuery: (query: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Navigation
  currentPage: 'dashboard',
  sidebarOpen: true,
  mobileSidebarOpen: false,

  // Data
  invoices: [],
  clients: [],
  initialized: false,

  // UI State
  selectedInvoiceId: null,
  selectedClientId: null,
  showInvoiceForm: false,
  showClientForm: false,
  editingInvoiceId: null,
  editingClientId: null,
  invoiceFilter: 'all',
  searchQuery: '',

  // Actions - Navigation
  setPage: (page) => {
    set({ currentPage: page, selectedInvoiceId: null, selectedClientId: null, searchQuery: '' });
    get().setMobileSidebarOpen(false);
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),

  // Actions - Data
  initialize: () => {
    const invoices = loadInvoices();
    const clients = loadClients();
    set({ invoices, clients, initialized: true });
  },
  addInvoice: (invoiceData) => {
    const invoices = get().invoices;
    const id = generateId();
    const number = generateInvoiceNumber(invoices);
    const invoice: Invoice = { ...invoiceData, id, number };
    const updated = [invoice, ...invoices];
    set({ invoices: updated });
    saveInvoices(updated);
    return invoice;
  },
  updateInvoice: (id, updates) => {
    const updated = get().invoices.map((inv) => (inv.id === id ? { ...inv, ...updates } : inv));
    set({ invoices: updated });
    saveInvoices(updated);
  },
  deleteInvoice: (id) => {
    const updated = get().invoices.filter((inv) => inv.id !== id);
    set({ invoices: updated, selectedInvoiceId: null });
    saveInvoices(updated);
  },
  updateInvoiceStatus: (id, status) => {
    get().updateInvoice(id, { status });
  },
  addClient: (clientData) => {
    const id = generateId();
    const client: Client = { ...clientData, id };
    const updated = [...get().clients, client];
    set({ clients: updated });
    saveClients(updated);
    return client;
  },
  updateClient: (id, updates) => {
    const updated = get().clients.map((cl) => (cl.id === id ? { ...cl, ...updates } : cl));
    set({ clients: updated });
    saveClients(updated);
  },
  deleteClient: (id) => {
    const updated = get().clients.filter((cl) => cl.id !== id);
    set({ clients: updated, selectedClientId: null });
    saveClients(updated);
  },

  // Actions - UI
  selectInvoice: (id) => set({ selectedInvoiceId: id }),
  selectClient: (id) => set({ selectedClientId: id }),
  setShowInvoiceForm: (show) => set({ showInvoiceForm: show, editingInvoiceId: null }),
  setShowClientForm: (show) => set({ showClientForm: show, editingClientId: null }),
  setEditingInvoice: (id) => set({ editingInvoiceId: id, showInvoiceForm: id !== null }),
  setEditingClient: (id) => set({ editingClientId: id, showClientForm: id !== null }),
  setInvoiceFilter: (filter) => set({ invoiceFilter: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));

// Derived helpers
export function useInvoiceStats() {
  const invoices = useAppStore((s) => s.invoices);
  return {
    totalRevenue: invoices.filter((i) => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
    pendingCount: invoices.filter((i) => i.status === 'pending' || i.status === 'sent').length,
    paidCount: invoices.filter((i) => i.status === 'paid').length,
    overdueCount: invoices.filter((i) => i.status === 'overdue').length,
    pendingAmount: invoices.filter((i) => i.status === 'pending' || i.status === 'sent').reduce((sum, i) => sum + i.total, 0),
    overdueAmount: invoices.filter((i) => i.status === 'overdue').reduce((sum, i) => sum + i.total, 0),
  };
}

export function useMonthlyRevenue() {
  const invoices = useAppStore((s) => s.invoices);
  const months: { month: string; revenue: number; invoices: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    const monthInvoices = invoices.filter((inv) => {
      const invDate = new Date(inv.issueDate);
      return invDate.getMonth() === d.getMonth() && invDate.getFullYear() === d.getFullYear() && inv.status === 'paid';
    });
    months.push({
      month: monthStr,
      revenue: monthInvoices.reduce((sum, inv) => sum + inv.total, 0),
      invoices: monthInvoices.length,
    });
  }
  return months;
}

export function createEmptyLineItem(): LineItem {
  return {
    id: generateId(),
    description: '',
    quantity: 1,
    unitPrice: 0,
    total: 0,
  };
}
