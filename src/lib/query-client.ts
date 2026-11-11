'use client';
import { QueryClient } from '@tanstack/react-query';

// Memory only. Every key includes the authenticated account; never persist billing data.
export const queryClient = new QueryClient({ defaultOptions: { queries: {
  staleTime: 30_000, gcTime: 5 * 60_000, retry: false, refetchOnWindowFocus: true,
} } });

export function clearAccountCache() {
  void queryClient.cancelQueries();
  queryClient.clear();
}

export async function invalidateBillingData() {
  await queryClient.cancelQueries();
  await queryClient.invalidateQueries();
}
