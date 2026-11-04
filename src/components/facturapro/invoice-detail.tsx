'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Download,
  Send,
  CheckCircle,
  XCircle,
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
import { formatDate, formatCurrency, getInvoiceStatusBadge, calculateTotals } from '@/lib/helpers';
import type { Invoice, InvoiceStatus } from '@/lib/types';

export function InvoiceDetail() {
  const {
    selectedInvoiceId,
    setSelectedInvoiceId,
    updateInvoiceStatus,
    setEditingInvoiceId,
    deleteInvoice,
  } = useAppStore();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const fetchIdRef = useRef(0);

  useEffect(() => {
    if (!selectedInvoiceId) return;
    const id = ++fetchIdRef.current;
    fetch(`/api/invoices/${selectedInvoiceI¶»§q«^