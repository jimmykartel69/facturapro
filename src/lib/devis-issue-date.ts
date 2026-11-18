/** A date-only quote issue date is persisted at noon UTC to avoid time-zone day shifts. */
export function parseDevisIssueDate(value: unknown): Date | null {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

/** An already sent or accepted quote must not be silently re-dated. */
export function canEditDevisIssueDate(status: string): boolean {
  return status === 'draft';
}
