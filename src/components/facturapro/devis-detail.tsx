'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  RefreshCcw,
  Send,
  Check,
  X,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useAppStore } from '@/lib/store';
import { formatDate, formatCurrency, getDevisStatusBadge, calculateTotals } from '@/lib/helpers';
import type { Devis, DevisStatus } from '@/lib/types';

interface DevisDetailFull extends Devis {
  invoice?: { id: string; number: string; status: string } | null;
}

export function DevisDetail() {
  const {
    selectedDevisId,
    setSelectedDevisId,
    updateDevisStatus,
    deleteDevis,
    convertDevisToInvoice,
    setEditingDevisId,
  } = useAppStore();
  const storedDevis = useAppStore((state) => state.devis.find((entry) => entry.id === selectedDevisId));
  const [devis, setDevis] = useState<DevisDetailFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>¶»§q«^