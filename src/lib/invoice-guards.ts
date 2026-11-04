// Pure, testable rules for already-issued invoices.
const transitions: Record<string, readonly string[]> = {
  draft: ['draft', 'sent', 'paid', 'cancelled'],
  sent: ['sent', 'paid', 'overdue'],
  overdue: ['overdue', 'paid'],
  paid: [],
  cancelled: [],
};

export function canEditInvoiceDocument(status: string): boolean {
  return status === 'draft';
}

export function isAllowedInvoiceTransition(from: string, to: string): boolean {
  return transitions[from]?.includes(to) ?? false;
}
