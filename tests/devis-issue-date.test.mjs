import test from 'node:test';
import assert from 'node:assert/strict';
import { parseDevisIssueDate, canEditDevisIssueDate } from '../src/lib/devis-issue-date.ts';

test('accepts real calendar dates with stable UTC date part', () => {
  for (const value of ['2026-11-18', '2024-02-29', '2026-12-31']) {
    assert.equal(parseDevisIssueDate(value)?.toISOString().slice(0, 10), value);
  }
});

test('rejects invalid, ambiguous and untyped issue dates', () => {
  for (const value of [null, undefined, 1731958800000, '', '18/11/2026', '2026-2-9', '2026-02-29', '2026-13-01', '2026-11-31']) {
    assert.equal(parseDevisIssueDate(value), null);
  }
});

test('only draft quote issue dates are editable', () => {
  assert.equal(canEditDevisIssueDate('draft'), true);
  for (const status of ['sent', 'accepted', 'refused', 'converted']) {
    assert.equal(canEditDevisIssueDate(status), false);
  }
});
