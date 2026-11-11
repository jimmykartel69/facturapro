'use client';
import { Button } from '@/components/ui/button';
export function ListFeedback({ error, pending, retry }: { error: Error | null; pending: boolean; retry: () => void }) {
  if (error) return <div role="alert" className="flex items-center gap-3 text-sm text-red-700"><span>{error.message}</span><Button variant="outline" onClick={retry}>Réessayer</Button></div>;
  return pending ? <p role="status" className="text-sm text-muted-foreground">Chargement…</p> : null;
}
export function ListPagination({ page, hasNext, onChange }: { page: number; hasNext: boolean; onChange: (page: number) => void }) {
  return <nav aria-label="Pagination" className="flex items-center justify-end gap-3">
    <Button variant="outline" disabled={page === 1} onClick={() => onChange(page - 1)}>Précédent</Button>
    <span className="text-sm">Page {page}</span>
    <Button variant="outline" disabled={!hasNext} onClick={() => onChange(page + 1)}>Suivant</Button>
  </nav>;
}
