'use client';

import { useShallow } from 'zustand/react/shallow';

import React, { useState } from 'react';
import {
  Search,
  Plus,
  Building2,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  Loader2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useApiQuery, useDebouncedSearch } from '@/hooks/use-api-query';
import { ListFeedback, ListPagination } from './list-feedback';
import type { ClientWithCounts } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { formatDate } from '@/lib/helpers';

export function ClientList() {
  const {
    selectedClientId,
    setSelectedClientId,
    setShowClientForm,
    setEditingClientId,
    deleteClient,
  } = useAppStore(useShallow(s => ({ selectedClientId: s.selectedClientId, setSelectedClientId: s.setSelectedClientId, setShowClientForm: s.setShowClientForm, setEditingClientId: s.setEditingClientId, deleteClient: s.deleteClient })));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deferredSearch = useDebouncedSearch(search);
  const params = new URLSearchParams({ page: String(page), search: deferredSearch });
  const query = useApiQuery<{ clients: ClientWithCounts[]; pagination: { hasNext: boolean } }>(`/api/clients?${params}`);
  const clients = query.data?.clients ?? [];

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const err = await deleteClient(deleteId);
    setDeleting(false);
    if (err) {
      alert(err);
    } else {
      setDeleteId(null);
    }
  };


  return (
    <div className="space-y-6">
      <ListFeedback error={query.error} pending={query.isFetching} retry={() => { void query.refetch(); }} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground text-sm">{clients.length} client(s) sur cette page</p>
        </div>
        <Button onClick={() => { setShowClientForm(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          Nouveau client
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {clients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Building2 className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">Aucun client trouvé</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setShowClientForm(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              Ajouter un client
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clients.map((client) => (
            <Card
              key={client.id}
              className={`transition-colors cursor-pointer ${
                selectedClientId === client.id ? 'ring-2 ring-[#1a1a2e]' : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedClientId(client.id === selectedClientId ? null : client.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate">{client.name}</h3>
                    {client.company && (
                      <p className="text-xs text-muted-foreground truncate">{client.company}</p>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedClientId(client.id); }}>
                        <Eye className="w-4 h-4 mr-2" />
                        Voir les détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingClientId(client.id); }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => { e.stopPropagation(); setDeleteId(client.id); }}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {(client.city || client.postalCode) && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {[client.postalCode, client.city].filter(Boolean).join(' ')}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <Badge variant="outline" className="text-xs">
                    Client depuis {formatDate(client.createdAt)}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ListPagination page={page} hasNext={query.data?.pagination.hasNext ?? false} onChange={setPage} />
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce client ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Tous les devis et factures associés seront également supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-red-600 hover:bg-red-700">
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
