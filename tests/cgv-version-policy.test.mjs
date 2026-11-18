import test from 'node:test';
import assert from 'node:assert/strict';
import { canRefreshDocumentCgv } from '../src/lib/cgv-version-policy.ts';

test('only draft quotes can refresh their attached terms', () => {
  assert.equal(canRefreshDocumentCgv('devis', 'draft'), true);
  for (const state of ['sent', 'accepted', 'refused', 'converted']) {
    assert.equal(canRefreshDocumentCgv('devis', state), false, state);
  }
});

test('issued or archived invoices never refresh their attached terms', () => {
  assert.equal(canRefreshDocumentCgv('invoice', 'draft', false), true);
  assert.equal(canRefreshDocumentCgv('invoice', 'draft', true), false);
  for (const state of ['sent', 'overdue', 'paid', 'cancelled']) {
    assert.equal(canRefreshDocumentCgv('invoice', state), false, state);
  }
});
