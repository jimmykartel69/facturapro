import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/session';
import { db } from '@/lib/db';
import { canEditInvoiceDocument, isAllowedInvoiceTransition } from '@/lib/invoice-guards';

const ALLOWED_INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue', 'cancelled'] as const;
type InvoiceStatus = (typeof ALLOWED_INVOICE_STATUSES)[number];

type JsonRecord = Record<string, unknown>;

interface InvoiceItemInput {
  designation: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  tvaRate?: number;
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return ALLOWED_INVOICE_STATUSES.includes(value as InvoiceStatus);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(value: unknown, label: string): { value?: Date; error?: string } {
  if (value == null) {
    return { error: `${label} manquante` };
  }
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) {
    return { error: `${label} invalide` };
  }
  return { value: date };
}

function parseInvoiceItem(raw: unknown, index: number): { value?: InvoiceItemInput; error?: string } {
  if (!raw || typeof raw !== 'object') {
    return { error: `Article #${index + 1}: format invalide` };
  }

  const item = raw as JsonRecord;
  const designation = String(item.designation ?? '').trim();
  const description = item.descr¶»§q«^