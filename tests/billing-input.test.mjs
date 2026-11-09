import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBillingItems } from '../src/lib/billing-input.ts';

const example = { designation: 'Diagnostic', description: 'Portillon', quantity: 1, unit: 'forfait', unitPrice: 85, tvaRate: 0 };

test('valid commercial line accepted', () => {
  const result = parseBillingItems([example]);
  assert.equal(result.ok, true);
  assert.equal(result.items[0].unitPrice, 85);
});

test('negative or non finite amounts, invalid item collections rejected', () => {
  const invalid = [
    [], null, {}, Array(151).fill(example),
    [{ ...example, designation: '' }],
    [{ ...example, quantity: -1 }],
    [{ ...example, unitPrice: -100 }],
    [{ ...example, unitPrice: 'NaN' }],
    [{ ...example, tvaRate: 140 }],
  ];
  for (const entry of invalid) assert.equal(parseBillingItems(entry).ok, false);
});
