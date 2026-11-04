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

const invoiceGuards = load('src/lib/invoice-guards.ts');
const billing = load('src/lib/billing-input.ts');
const reference = load('src/lib/site-reference.ts');
const json = (payload, opts = {}) => ({ body: payload, status: opts.status ?? 200 });
const params = { params: Promise.resolve({ id: 'invoice-1' }) };
const request = (data) => ({ json: async () => data });
function route(file, db, owner = { id: 'owner' }) {
  return load(file, {
    'next/server': { NextResponse: { json } },
    '@/lib/session': { getCurrentUser: async () => owner },
    '@/lib/db': { db },
    '@/lib/site-reference': reference,
    '@/lib/billing-input': billing,
    '@/lib/invoice-guards': invoiceGuards,
    '@/lib/invoice-archive': { makeInvoiceSnapshot: () => { throw new Error('Unexpected archive operation'); } },
    '@/lib/pdf': { generateInvoicePDF: async () => { throw new Error('Unexpected PDF operation'); } },
  });
}

test('settings update never returns a password or session token', async () => {
  const db = { user: { update: async () => ({
    id: 'owner', passwordHash: 'sensitive', sessionToken: 'secret', resetToken: 'private',
  }) } };
  const result = await route('src/app/api/settings/route.ts', db).PUT(request({ name: 'NeoVolt' }));
  assert.equal(result.status, 200);
  assert.equal(result.body.settings.id, 'owner');
  assert.ok(!('passwordHash' in result.body.settings));
  assert.ok(!('sessionToken' in result.body.settings));
  assert.ok(!('resetToken' in result.body.settings));
});

test('paid invoice cannot reopen as draft', async () => {
  const db = { invoice: { findFirst: async () => ({ id: 'invoice-1', status: 'paid' }) } };
  const result = await route('src/app/api/invoices/[id]/route.ts', db).PUT(request({ status: 'draft' }), params);
  assert.equal(result.status, 409);
});

test('sent invoice content is immutable', async () => {
  const db = { invoice: { findFirst: async () => ({ id: 'invoice-1', status: 'sent' }) } };
  const result = await route('src/app/api/invoices/[id]/route.ts', db).PUT(request({ notes: 'Change total' }), params);
  assert.equal(result.status, 409);
});

test('sent invoice can be marked paid with status condition', async () => {
  let saved;
  const db = {
    invoice: { findFirst: async () => ({ id: 'invoice-1', status: 'sent' }) },
    creditNote: { count: async () => 0 },
    $transaction: async (fn) => fn({ invoice: { update: async (value) => { saved = value; return value; } } }),
  };
  const result = await route('src/app/api/invoices/[id]/route.ts', db).PUT(request({ status: 'paid' }), params);
  assert.equal(result.status, 200);
  assert.equal(saved.data.status, 'paid');
  assert.equal(saved.where.status, 'sent');
  assert.equal(saved.where.userId, 'owner');
});

test('issued invoice cannot be deleted', async () => {
  const db = { invoice: { findFirst: async () => ({ id: 'invoice-1', status: 'paid' }) } };
  const result = await route('src/app/api/invoices/[id]/route.ts', db).DELETE(request({}), params);
  assert.equal(result.status, 409);
});

test('draft invoice deletion uses optimistic status predicate', async () => {
  let filter;
  const db = {
    invoice: { findFirst: async () => ({ id: 'invoice-1', status: 'draft', devisId: null }) },
    $transaction: async (fn) => fn({ invoice: { delete: async ({ where }) => { filter = where; } } }),
  };
  const result = await route('src/app/api/invoices/[id]/route.ts', db).DELETE(request({}), params);
  assert.equal(result.status, 200);
  assert.equal(filter.status, 'draft');
  assert.equal(filter.userId, 'owner');
});

test('quote cannot be reassigned to a different account client', async () => {
  const db = {
    devis: { findFirst: async () => ({ id: 'quote-1', status: 'draft' }) },
    client: { findFirst: async () => null },
  };
  const result = await route('src/app/api/devis/[id]/route.ts', db).PUT(request({ clientId: 'other-client' }), params);
  assert.equal(result.status, 404);
});

test('converted quote cannot be edited or deleted', async () => {
  const db = { devis: { findFirst: async () => ({ id: 'quote-1', status: 'converted' }) } };
  for (const method of ['PUT', 'DELETE']) {
    const result = await route('src/app/api/devis/[id]/route.ts', db)[method](request({ status: 'draft' }), params);
    assert.equal(result.status, 409);
  }
});

test('quote creation rejects invalid financial lines before DB', async () => {
  const result = await route('src/app/api/devis/route.ts', {}).POST(request({
    clientId: 'client-1',
    items: [{ designation: 'Test', quantity: -1, unitPrice: 50, tvaRate: 0 }],
  }));
  assert.equal(result.status, 400);
});
