import { Invoice, Client, LineItem } from './types';

const STORAGE_KEYS = {
  invoices: 'facturapro_invoices',
  clients: 'facturapro_clients',
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function generateInvoiceNumber(existing: Invoice[]): string {
  const nums = existing
    .map((inv) => parseInt(inv.number.replace(/\D/g, ''), 10))
    .filter((n) => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `INV-${String(next).padStart(4, '0')}`;
}

export const sampleClients: Client[] = [
  {
    id: 'cl-1',
    name: 'María García López',
    email: 'maria.garcia@techcorp.es',
    company: 'TechCorp Solutions S.L.',
    phone: '+34 612 345 678',
    address: 'Calle Gran Vía 42, Madrid 28013, España',
  },
  {
    id: 'cl-2',
    name: 'Carlos Rodríguez Martínez',
    email: 'carlos.r@innovatech.com',
    company: 'InnovaTech Digital',
    phone: '+34 623 456 789',
    address: 'Passeig de Gràcia 85, Barcelona 08008, España',
  },
  {
    id: 'cl-3',
    name: 'Ana Fernández Ruiz',
    email: 'ana.fernandez@globaltrade.es',
    company: 'Global Trade Solutions',
    phone: '+34 634 567 890',
    address: 'Av. de la Constitución 12, Sevilla 41004, España',
  },
  {
    id: 'cl-4',
    name: 'Pablo Sánchez Torres',
    email: 'pablo.sanchez@creativeagency.com',
    company: 'Creative Agency Studio',
    phone: '+34 645 678 901',
    address: 'Calle Alcalá 120, Madrid 28009, España',
  },
  {
    id: 'cl-5',
    name: 'Laura Martínez Vega',
    email: 'laura.martinez@ecogreen.es',
    company: 'EcoGreen Industries',
    phone: '+34 656 789 012',
    address: 'Carrer de Mallorca 200, Barcelona 08008, España',
  },
  {
    id: 'cl-6',
    name: 'Diego Morales Castillo',
    email: 'diego.morales@financeplus.com',
    company: 'Finance Plus Consulting',
    phone: '+34 667 890 123',
    address: 'Plaza de Colón 8, Madrid 28046, España',
  },
];

export const sampleInvoices: Invoice[] = [
  {
    id: 'inv-1',
    number: 'INV-0001',
    clientName: 'María García López',
    clientEmail: 'maria.garcia@techcorp.es',
    issueDate: '2026-01-15',
    dueDate: '2026-02-15',
    items: [
      { id: 'li-1', description: 'Web Application Development', quantity: 1, unitPrice: 4500, total: 4500 },
      { id: 'li-2', description: 'UI/UX Design Services', quantity: 40, unitPrice: 85, total: 3400 },
      { id: 'li-3', description: 'Project Management', quantity: 20, unitPrice: 60, total: 1200 },
    ],
    subtotal: 9100,
    tax: 1638,
    total: 10738,
    status: 'paid',
    notes: 'Payment received via bank transfer.',
  },
  {
    id: 'inv-2',
    number: 'INV-0002',
    clientName: 'Carlos Rodríguez Martínez',
    clientEmail: 'carlos.r@innovatech.com',
    issueDate: '2026-02-01',
    dueDate: '2026-03-01',
    items: [
      { id: 'li-4', description: 'Cloud Infrastructure Setup', quantity: 1, unitPrice: 3200, total: 3200 },
      { id: 'li-5', description: 'DevOps Configuration', quantity: 16, unitPrice: 95, total: 1520 },
    ],
    subtotal: 4720,
    tax: 849.6,
    total: 5569.6,
    status: 'paid',
    notes: 'Completed ahead of schedule.',
  },
  {
    id: 'inv-3',
    number: 'INV-0003',
    clientName: 'Ana Fernández Ruiz',
    clientEmail: 'ana.fernandez@globaltrade.es',
    issueDate: '2026-02-20',
    dueDate: '2026-03-20',
    items: [
      { id: 'li-6', description: 'E-commerce Platform Development', quantity: 1, unitPrice: 8500, total: 8500 },
      { id: 'li-7', description: 'Payment Gateway Integration', quantity: 1, unitPrice: 1200, total: 1200 },
      { id: 'li-8', description: 'Quality Assurance Testing', quantity: 30, unitPrice: 55, total: 1650 },
    ],
    subtotal: 11350,
    tax: 2043,
    total: 13393,
    status: 'overdue',
    notes: 'Follow-up required for payment.',
  },
  {
    id: 'inv-4',
    number: 'INV-0004',
    clientName: 'Pablo Sánchez Torres',
    clientEmail: 'pablo.sanchez@creativeagency.com',
    issueDate: '2026-03-05',
    dueDate: '2026-04-05',
    items: [
      { id: 'li-9', description: 'Brand Identity Design', quantity: 1, unitPrice: 2800, total: 2800 },
      { id: 'li-10', description: 'Social Media Content Package', quantity: 12, unitPrice: 150, total: 1800 },
    ],
    subtotal: 4600,
    tax: 828,
    total: 5428,
    status: 'sent',
  },
  {
    id: 'inv-5',
    number: 'INV-0005',
    clientName: 'Laura Martínez Vega',
    clientEmail: 'laura.martinez@ecogreen.es',
    issueDate: '2026-03-10',
    dueDate: '2026-04-10',
    items: [
      { id: 'li-11', description: 'Environmental Reporting Dashboard', quantity: 1, unitPrice: 5200, total: 5200 },
      { id: 'li-12', description: 'Data Visualization Module', quantity: 1, unitPrice: 1800, total: 1800 },
      { id: 'li-13', description: 'API Integration Services', quantity: 24, unitPrice: 90, total: 2160 },
    ],
    subtotal: 9160,
    tax: 1648.8,
    total: 10808.8,
    status: 'paid',
  },
  {
    id: 'inv-6',
    number: 'INV-0006',
    clientName: 'Diego Morales Castillo',
    clientEmail: 'diego.morales@financeplus.com',
    issueDate: '2026-03-20',
    dueDate: '2026-04-20',
    items: [
      { id: 'li-14', description: 'Financial Analytics Platform', quantity: 1, unitPrice: 7200, total: 7200 },
      { id: 'li-15', description: 'Custom Reporting Module', quantity: 1, unitPrice: 2400, total: 2400 },
    ],
    subtotal: 9600,
    tax: 1728,
    total: 11328,
    status: 'sent',
  },
  {
    id: 'inv-7',
    number: 'INV-0007',
    clientName: 'María García López',
    clientEmail: 'maria.garcia@techcorp.es',
    issueDate: '2026-04-01',
    dueDate: '2026-05-01',
    items: [
      { id: 'li-16', description: 'Mobile App Development (Phase 2)', quantity: 1, unitPrice: 6800, total: 6800 },
      { id: 'li-17', description: 'Backend API Enhancement', quantity: 32, unitPrice: 85, total: 2720 },
    ],
    subtotal: 9520,
    tax: 1713.6,
    total: 11233.6,
    status: 'pending',
    notes: 'Phase 2 of ongoing project.',
  },
  {
    id: 'inv-8',
    number: 'INV-0008',
    clientName: 'Ana Fernández Ruiz',
    clientEmail: 'ana.fernandez@globaltrade.es',
    issueDate: '2026-04-05',
    dueDate: '2026-05-05',
    items: [
      { id: 'li-18', description: 'Platform Maintenance & Support', quantity: 1, unitPrice: 1500, total: 1500 },
      { id: 'li-19', description: 'Security Audit', quantity: 8, unitPrice: 120, total: 960 },
    ],
    subtotal: 2460,
    tax: 442.8,
    total: 2902.8,
    status: 'draft',
  },
  {
    id: 'inv-9',
    number: 'INV-0009',
    clientName: 'Carlos Rodríguez Martínez',
    clientEmail: 'carlos.r@innovatech.com',
    issueDate: '2026-04-08',
    dueDate: '2026-05-08',
    items: [
      { id: 'li-20', description: 'Machine Learning Model Training', quantity: 1, unitPrice: 4500, total: 4500 },
      { id: 'li-21', description: 'Data Pipeline Development', quantity: 24, unitPrice: 95, total: 2280 },
    ],
    subtotal: 6780,
    tax: 1220.4,
    total: 8000.4,
    status: 'pending',
  },
  {
    id: 'inv-10',
    number: 'INV-0010',
    clientName: 'Pablo Sánchez Torres',
    clientEmail: 'pablo.sanchez@creativeagency.com',
    issueDate: '2026-04-10',
    dueDate: '2026-05-10',
    items: [
      { id: 'li-22', description: 'Website Redesign', quantity: 1, unitPrice: 3500, total: 3500 },
      { id: 'li-23', description: 'SEO Optimization Package', quantity: 1, unitPrice: 800, total: 800 },
      { id: 'li-24', description: 'Content Strategy Session', quantity: 4, unitPrice: 120, total: 480 },
    ],
    subtotal: 4780,
    tax: 860.4,
    total: 5640.4,
    status: 'cancelled',
    notes: 'Project cancelled by client request.',
  },
];

export function loadInvoices(): Invoice[] {
  if (typeof window === 'undefined') return sampleInvoices;
  const stored = localStorage.getItem(STORAGE_KEYS.invoices);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return sampleInvoices;
    }
  }
  return sampleInvoices;
}

export function saveInvoices(invoices: Invoice[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.invoices, JSON.stringify(invoices));
}

export function loadClients(): Client[] {
  if (typeof window === 'undefined') return sampleClients;
  const stored = localStorage.getItem(STORAGE_KEYS.clients);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return sampleClients;
    }
  }
  return sampleClients;
}

export function saveClients(clients: Client[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.clients, JSON.stringify(clients));
}

export { generateId, generateInvoiceNumber };
