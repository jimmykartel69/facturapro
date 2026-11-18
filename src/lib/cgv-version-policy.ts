/** Only an unsent draft can select new contractual terms. */
export function canRefreshDocumentCgv(
  documentType: 'devis' | 'invoice',
  status: string,
  isArchivedInvoice = false,
): boolean {
  return status === 'draft' && (documentType !== 'invoice' || !isArchivedInvoice);
}
