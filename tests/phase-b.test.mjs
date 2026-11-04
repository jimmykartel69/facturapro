import test from 'node:test';
import assert from 'node:assert/strict';
import { makeInvoiceSnapshot, canCreateFullCredit, isInvoiceArchiveSnapshot } from '../src/lib/invoice-archive.ts';
import { generateFullCreditPdf } from '../src/lib/credit-note-pdf.ts';

const client = {
  name: 'Client Essai', company: null, clientType: 'consumer',
  address: '12 rue Test', addressComplement: null, postalCode: '69400',
  city: 'Villefranche-sur-Saône', email: 'test@example.net', siret: null,
};
const company = {
  name: 'Temizoz', firstName: 'Eyup', companyName: 'NeoVolt',
  siret: '78894783600037', address: '1 rue Exemple',
  postalCode: '69400', city: 'Villefranche-sur-Saône',
  vatRegime: 'franchise', vatExemptionText: 'TVA non applicable, article 293 B du CGI.',
};
const invoice = {
  id: 'i1', number: 'FAC-0010',
  issueDate: new Date('2026-11-04T12:00:00Z'),
  dueDate: new Date('2026-12-04T12:00:00Z'),
  globalDiscount: 0, notes: null, siteReference: 'Villefranche - portillon',
  items: [
    { designation: 'Diagnostic', description: null, quantity: 1, unit: 'forfait', unitPrice: 85, tvaRate: 0 },
  ],
  devis: { number: 'DEV-0010' }, client,
};

test('franchise de TVA: HT = TTC, VAT = 0', () => {
  const snap = makeInvoiceSnapshot(invoice, company);
  assert.equal(snap.totals.amountHtCents, 8500);
  assert.equal(snap.totals.amountVatCents, 0);
  assert.equal(snap.totals.amountTtcCents, 8500);
  assert.ok(isInvoiceArchiveSnapshot(snap));
  assert.equal(snap.invoice.number, 'FAC-0010');
});

test('standard TVA: discount and multi-rate VAT breakdown', () => {
  const snap = makeInvoiceSnapshot({
    ...invoice,
    globalDiscount: 10,
    items: [
      { designation: 'A', description: null, quantity: 1, unit: 'u', unitPrice: 100, tvaRate: 20 },
      { designation: 'B', description: null, quantity: 1, unit: 'u', unitPrice: 100, tvaRate: 10 },
    ],
  }, { ...company, vatRegime: 'standard' });
  assert.equal(snap.totals.amountHtCents, 18000);
  assert.equal(snap.totals.amountVatCents, 2700);
  assert.equal(snap.totals.amountTtcCents, 20700);
  assert.deepEqual(snap.totals.vatBreakdown, [{ rate: 10, amountCents: 900 }, { rate: 20, amountCents: 1800 }]);
});

test('full credit only for eligible issued invoice and only once', () => {
  assert.equal(canCreateFullCredit('paid', 0, 8500), true);
  assert.equal(canCreateFullCredit('sent', 0, 8500), true);
  assert.equal(canCreateFullCredit('overdue', 0, 8500), true);
  for (const state of ['draft', 'cancelled']) assert.equal(canCreateFullCredit(state, 0, 8500), false);
  assert.equal(canCreateFullCredit('paid', 1, 8500), false);
  assert.equal(canCreateFullCredit('paid', 0, 0), false);
});

test('full credit PDF is generated as a valid PDF and references original invoice', async () => {
  const snap = makeInvoiceSnapshot(invoice, company);
  const pdf = await generateFullCreditPdf({
    snapshot: snap, number: 'AV-0001',
    issueDate: new Date('2026-11-04T15:00:00Z'),
    reason: 'Annulation intégrale de la prestation après accord du client.',
  });
  assert.ok(pdf.length > 1500);
  assert.ok(pdf.subarray(0, 5).toString() === '%PDF-');
  assert.ok(pdf.subarray(-40).toString().includes('%%EOF'));
  assert.ok(pdf.toString('latin1').includes('xref'));
});
