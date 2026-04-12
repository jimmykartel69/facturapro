export type Page = 'dashboard' | 'clients' | 'devis' | 'invoices' | 'payments' | 'settings';
export type DevisStatus = 'draft' | 'sent' | 'accepted' | 'refused' | 'converted';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// API response types matching the backend
export interface User {
  id: string;
  email: string;
  name: string;
  firstName: string;
  companyName?: string | null;
  [key: string]: unknown;
}

export interface Client {
  id: string;
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  addressComplement?: string | null;
  postalCode?: string | null;
  city?: string | null;
  siret?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClientWithCounts extends Client {
  _count?: { devis: number; invoices: number };
}

export interface DevisItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
}

export interface Devis {
  id: string;
  number: string;
  clientId: string;
  status: DevisStatus;
  issueDate: string;
  validUntil: string;
  notes?: string | null;
  globalDiscount: number;
  client: Pick<Client, 'id' | 'name' | 'company'>;
  items: DevisItem[];
  createdAt: string;
}

export interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  tvaRate: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  devisId?: string | null;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  notes?: string | null;
  globalDiscount: number;
  client: Pick<Client, 'id' | 'name' | 'company'>;
  devis?: { number: string } | null;
  items: InvoiceItem[];
  createdAt: string;
}

export interface DashboardData {
  currentMonthRevenue: number;
  devisCount: number;
  unpaidInvoices: number;
  unpaidAmount: number;
  activeClients: number;
  monthlyRevenue: { month: string; revenue: number }[];
  recentInvoices: Invoice[];
  recentDevis: Devis[];
}

export interface Settings {
  id: string;
  email: string;
  name: string;
  firstName: string;
  companyName?: string | null;
  legalForm?: string | null;
  siret?: string | null;
  tvaNumber?: string | null;
  rcsNumber?: string | null;
  socialCapital?: string | null;
  address?: string | null;
  addressComplement?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  professionalEmail?: string | null;
  website?: string | null;
  directorName?: string | null;
  directorTitle?: string | null;
  logoBase64?: string | null;
  logoMimeType?: string | null;
  accentColor: string;
  customNotes: string;
  paymentTerms: string;
  latePenaltyRate: number;
  earlyDiscount?: number | null;
  earlyDiscountDays?: number | null;
  devisPrefix: string;
  invoicePrefix: string;
  nextDevisNumber: number;
  nextInvoiceNumber: number;
  iban?: string | null;
  bic?: string | null;
  bankName?: string | null;
  accountHolder?: string | null;
  [key: string]: unknown;
}
