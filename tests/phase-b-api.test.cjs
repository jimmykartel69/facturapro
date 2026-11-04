const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const orig = mod.require.bind(mod);
  mod.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : orig(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const archive = load('src/lib/invoice-archive.ts');
const user = { id: 'owner', name: 'Temizoz', firstName: 'Eyup', vatRegime: 'franchise' };
const params = { params: Promise.resolve({ id: 'invoice-1' }) };
const request = body => ({ json: async () => body });
const pdf = Buffer.from('%PDF-1.4\nCREDIT FILE');
const invoice = {
  id: 'invoice-1', number: 'FAC-0001', status: 'paid',
  issueDate: new Date('2026-11-04T12:00:00Z'),
  dueDate: new Date('2026-12-04T12:00:00Z'), globalDiscount: 0, siteReference: null,
  notes: null, devis: null, archive: null,
  client: { name: 'Buyer', company: null, email: 'buyer@example.net', clientType: 'consumer' },
  items: [{ designation: 'Test', description: null, quantity: 1, unit: 'unité', unitPrice: 85, tvaRate: 0 }],
};
function route(db, currentUser = user) {
  return load('src/app/api/invoices/[id]/credit-notes/route.ts', {
    'next/server': { NextResponse: { json: (body, opt = {}) => ({ status: opt.status ?? 200, body }) } },
    '@/lib/session': { getCurrentUser: async () => currentUser },
    '@/lib/db': { db },
    '@/lib/invoice-archive': archive,
    '@/lib/credit-note-pdf': { generateFullCreditPdf: async () => pdf },
  });
}

test('credit API rejects unauthenticated requests and invalid reasons', async () => {
  const unauthorized = await route({}, null).POST(request({ reason: 'Avoir intégral' }), params);
  assert.equal(unauthorized.status, 401);
  const invalid = await route({}).POST(request({ reason: 'court' }), params);
  assert.equal(invalid.status, 400);
});

test('legacy invoice requires explicit manual confirmation', async () => {
  const db = { invoice: { findFirst: async () => invoice } };
  const res = await route(db).POST(request({ reason: 'Annulation intégrale de la prestation.' }), params);
  assert.equal(res.status, 409);
  assert.equal(res.body.requiresLegacyAcknowledgement, true);
});

test('full credit is numbered atomically, user-scoped and immutable PDF stored', async () => {
  let saved;
  let sequenceIncrement = 0;
  const db = {
    invoice: { findFirst: async () => invoice },
    $transaction: async fn => fn({
      $queryRaw: async () => [{ id: 'invoice-1' }],
      invoice: { findFirst: async () => ({ status: 'paid' }) },
      creditNote: {
        count: async ({ where }) => {
          assert.equal(where.userId, 'owner');
          assert.equal(where.invoiceId, 'invoice-1');
          return 0;
        },
        create: async ({ data }) => { saved = data; return { id: 'credit-1', number: data.number }; },
      },
      user: { update: async ({ data }) => {
        sequenceIncrement += data.nextCreditNoteNumber.increment;
        return { nextCreditNoteNumber: 2 };
      } },
    }),
  };
  const response = await route(db).POST(request({
    type: 'full', reason: 'Annulation intégrale de la prestation.',
    acknowledgeLegacy: true,
  }), params);
  assert.equal(response.status, 201);
  assert.equal(response.body.creditNote.number, 'AV-0001');
  assert.equal(sequenceIncrement, 1);
  assert.equal(saved.invoiceId, 'invoice-1');
  assert.equal(saved.userId, 'owner');
  assert.equal(saved.amountTtcCents, 8500);
  assert.ok(saved.pdfBytes instanceof Uint8Array);
  assert.equal(saved.sha256.length, 64);
});

test('second full credit is rejected without using a new number', async () => {
  let sequenceChanged = false;
  const db = {
    invoice: { findFirst: async () => invoice },
    $transaction: async fn => fn({
      $queryRaw: async () => [{ id: 'invoice-1' }],
      invoice: { findFirst: async () => ({ status: 'paid' }) },
      creditNote: { count: async () => 1 },
      user: { update: async () => { sequenceChanged = true; } },
    }),
  };
  const response = await route(db).POST(request({
    reason: 'Annulation intégrale après accord avec le client.',
    acknowledgeLegacy: true,
  }), params);
  assert.equal(response.status, 409);
  assert.equal(sequenceChanged, false);
});

test('first invoice emission stores original PDF inside same transaction', async () => {
  const sequence = [];
  let archiveData;
  const original = { id: 'invoice-1', status: 'draft', devisId: null, clientId: 'client-1' };
  const updated = { ...original, number: 'FAC-0001', status: 'sent', client: invoice.client, items: invoice.items, devis: null };
  const db = {
    invoice: { findFirst: async () => original },
    $transaction: async callback => callback({
      invoice: { update: async ({ where, data }) => {
        assert.equal(where.status, 'draft');
        assert.equal(data.status, 'sent');
        sequence.push('update');
        return updated;
      } },
      invoiceArchive: { create: async ({ data }) => { archiveData = data; sequence.push('archive'); } },
    }),
  };
  const invoiceGuards = load('src/lib/invoice-guards.ts');
  const endpoint = load('src/app/api/invoices/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body, opt = {}) => ({ status: opt.status ?? 200, body }) } },
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/db': { db },
    '@/lib/invoice-guards': invoiceGuards,
    '@/lib/invoice-archive': { makeInvoiceSnapshot: () => ({ version: 1, invoice: { number: 'FAC-0001' } }) },
    '@/lib/pdf': { generateInvoicePDF: async () => { sequence.push('render'); return pdf; } },
  });
  const result = await endpoint.PUT(request({ status: 'sent' }), params);
  assert.equal(result.status, 200);
  assert.deepEqual(sequence, ['update', 'render', 'archive']);
  assert.equal(archiveData.invoiceId, 'invoice-1');
  assert.ok(archiveData.pdfBytes instanceof Uint8Array);
  assert.equal(archiveData.sha256.length, 64);
});
