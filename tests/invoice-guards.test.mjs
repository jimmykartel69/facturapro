import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditInvoiceDocument, isAllowedInvoiceTransition } from '../src/lib/invoice-guards.ts';

test('only draft invoice content is editable', () => {
  for (const state of ['sent', 'overdue', 'paid', 'cancelled']) {
    assert.equal(canEditInvoiceDocument(state), false, state);
  }
  assert.equal(canEditInvoiceDocument('draft'), true);
});

test('payment transitions work without reopening paid invoices', () => {
  assert.equal(isAllowedInvoiceTransition('draft', 'sent'), true);
  assert.equal(isAllowedInvoiceTransition('sent', 'paid'), true);
  assert.equal(isAllowedInvoiceTransition('sent', 'overdue'), true);
  assert.equal(isAllowedInvoiceTransition('overdue', 'paid'), true);
  for (const state of ['draft', 'sent', 'overdue', 'cancelled']) {
    assert.equal(isAllowedInvoiceTransition('paid', state), false, state);
  }
  assert.equal(isAllowedInvoiceTransition('sent', 'draft'), false);
  assert.equal(isAllowedInvoiceTransition('sent', 'cancelled'), false);
});
