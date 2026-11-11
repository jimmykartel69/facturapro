'use client';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { useAppStore } from '@/lib/store';

export function useDebouncedSearch(value: string) {
  const [search, setSearch] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(value.trim()), 300);
    return () => clearTimeout(timer);
  }, [value]);
  return search;
}

export function useApiQuery<T>(path: string, enabled = true) {
  const userId = useAppStore(s => s.user?.id);
  return useQuery<T>({
    queryKey: [userId, path], enabled: Boolean(userId) && enabled,
    queryFn: async ({ signal }) => {
      const response = await fetch(path, { signal, cache: 'no-store', credentials: 'include' });
      if (response.status === 401) {
        // A late response from an old account must not log out the new one.
        if (useAppStore.getState().user?.id === userId) useAppStore.getState().handleAuthError(response);
        throw new Error('Session expirée. Reconnectez-vous.');
      }
      if (!response.ok) throw new Error('Impossible de charger les données. Réessayez.');
      return response.json();
    },
  }, queryClient);
}
