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
  const originalRequire = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name]
    : name.startsWith('@/lib/') ? load('src/lib/' + name.slice(6) + '.ts', mocks) : originalRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const revenue = load('src/lib/revenue.ts');
const document = (date, amount, extras = {}) => ({ issueDate: new Date(date), globalDiscount: 0, items: [{ quantity: 1, unitPrice: amount, tvaRate: 0 }], ...extras });

test('annual total equals the sum of twelve months and the December cumulative amount', () => {
  const data = revenue.buildRevenueOverview([
    document('2025-01-01T00:00:00Z', 100), document('2025-01-31T23:59:59Z', 25),
    document('2025-03-01T00:00:00Z', 50), document('2025-12-31T23:59:59Z', 10),
    document('2024-12-31T23:59:59Z', 999), document('2026-01-01T00:00:00Z', 999),
  ], 2025, 2026, '2024-01-01');
  assert.equal(data.annualRevenue, 185);
  assert.equal(data.paidInvoiceCount, 4);
  assert.equal(data.monthlyRevenue.length, 12);
  assert.deepEqual(data.monthlyRevenue.slice(0, 3).map(m => [m.revenue, m.cumulativeRevenue]), [[125, 125], [0, 125], [50, 175]]);
  assert.equal(data.monthlyRevenue[11].cumulativeRevenue, 185);
  assert.equal(data.monthlyRevenue.reduce((sum, m) => sum + m.revenue, 0), data.annualRevenue);
});

test('TTC calculation preserves multi-rate VAT, discounts, target totals and zero targets', () => {
  const mixed = { globalDiscount: 10, items: [{ quantity: 2, unitPrice: 100, tvaRate: 20 }, { quantity: 1, unitPrice: 100, tvaRate: 10 }] };
  assert.equal(revenue.computeDocumentTotalTtc(mixed), 315);
  assert.equal(revenue.computeDocumentTotalTtc({ ...mixed, targetTotalTtc: 250.01 }), 250.01);
  assert.equal(revenue.computeDocumentTotalTtc({ ...mixed, targetTotalTtc: 0 }), 0);
  const small = revenue.buildRevenueOverview(Array.from({ length: 10 }, () => document('2025-02-01', 0.1)), 2025, 2026, null);
  assert.equal(small.annualRevenue, 1);
  assert.equal(small.monthlyRevenue[1].cumulativeRevenue, 1);
});

test('empty years are explicit and the year list includes older history and the recent five years', () => {
  const empty = revenue.buildRevenueOverview([], 2025, 2026, null);
  assert.equal(empty.annualRevenue, 0);
  assert.equal(empty.paidInvoiceCount, 0);
  assert.deepEqual(empty.availableYears, [2026, 2025, 2024, 2023, 2022]);
  assert.ok(empty.monthlyRevenue.every(m => m.revenue === 0 && m.cumulativeRevenue === 0));
  assert.deepEqual(revenue.buildRevenueOverview([], 2018, 2026, '2018-01-01').availableYears, [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]);
});

test('year validation rejects malformed and future years, and current year follows Paris at New Year', () => {
  assert.equal(revenue.parseRevenueYear(null, 2026), 2026);
  assert.equal(revenue.parseRevenueYear('2025', 2026), 2025);
  for (const value of ['', '0', '1899', '2027', '2025.5', ' 2025 ', '2025 OR 1=1', 'Infinity']) assert.throws(() => revenue.parseRevenueYear(value, 2026), RangeError);
  assert.equal(revenue.currentRevenueYear(new Date('2026-12-31T23:30:00Z')), 2027);
});

test('history queries isolate the account, only count paid invoices and bound issue dates', async () => {
  const rows = [
    { ...document('2025-06-01', 100), userId: 'owner', status: 'paid' },
    { ...document('2025-06-01', 999), userId: 'other', status: 'paid' },
    { ...document('2025-06-01', 999), userId: 'owner', status: 'sent' },
    { ...document('2026-01-01', 999), userId: 'owner', status: 'paid' },
  ];
  const { loadRevenueOverview } = load('src/lib/revenue-data.ts', {
    '@/lib/db': { db: { invoice: {
      findMany: async ({ where, select }) => {
        assert.equal(where.status, 'paid');
        assert.equal(where.issueDate.gte.toISOString(), '2025-01-01T00:00:00.000Z');
        assert.equal(where.issueDate.lt.toISOString(), '2026-01-01T00:00:00.000Z');
        assert.ok(!select.archive && !select.pdfBytes);
        return rows.filter(r => r.userId === where.userId && r.status === where.status && r.issueDate >= where.issueDate.gte && r.issueDate < where.issueDate.lt);
      },
      findFirst: async ({ where }) => { assert.equal(where.userId, 'owner'); return { issueDate: new Date('2018-01-01') }; },
    } } },
  });
  const data = await loadRevenueOverview('owner', 2025, 2026);
  assert.equal(data.annualRevenue, 100);
  assert.equal(data.paidInvoiceCount, 1);
  assert.ok(data.availableYears.includes(2018));
});

test('history endpoint rejects anonymous requests and invalid years before reading financial data', async () => {
  let reads = 0;
  let user = null;
  const route = load('src/app/api/dashboard/revenue/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200, headers: options?.headers }) } },
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/revenue-data': { loadRevenueOverview: async (...args) => { reads++; return { args }; } },
  });
  const request = year => ({ nextUrl: new URL('https://example.invalid/api/dashboard/revenue?year=' + year) });
  assert.equal((await route.GET(request('2025'))).status, 401);
  user = { id: 'owner' };
  assert.equal((await route.GET(request('9999'))).status, 400);
  assert.equal(reads, 0);
  const response = await route.GET(request('2025'));
  assert.equal(response.status, 200);
  assert.equal(response.body.args[0], 'owner');
  assert.equal(response.body.args[1], 2025);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});

test('current dashboard reuses the annual calculation and retains current activity indicators', async () => {
  const year = revenue.currentRevenueYear();
  const initial = revenue.buildRevenueOverview([document(`${year}-01-01`, 50)], year, year, null);
  let revenueReads = 0;
  const route = load('src/app/api/dashboard/route.ts', {
    'next/server': { NextResponse: { json: body => ({ body }) } },
    '@/lib/session': { getCurrentUser: async () => ({ id: 'owner' }) },
    '@/lib/revenue-data': { loadRevenueOverview: async (id, requestedYear) => { assert.equal(id, 'owner'); assert.equal(requestedYear, year); revenueReads++; return initial; } },
    '@/lib/db': { db: {
      invoice: { findMany: async ({ where }) => where.status ? [document(`${year}-01-01`, 100)] : [] },
      devis: { count: async () => 2, findMany: async () => [] }, client: { count: async () => 6 },
    } },
  });
  const result = await route.GET();
  assert.equal(revenueReads, 1);
  assert.equal(result.body.revenueOverview.annualRevenue, 50);
  assert.equal(result.body.activeClients, 6);
  assert.equal(result.body.unpaidAmount, 100);
  assert.equal(result.body.devisCount, 2);
  assert.equal(result.body.monthlyRevenue.length, 12);
});
