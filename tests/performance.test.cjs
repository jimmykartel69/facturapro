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
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : name.startsWith('@/lib/') ? load('src/lib/' + name.slice(6) + '.ts', mocks) : orig(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}

test('ordinary session does not select or return a large logo; document settings remain available', async () => {
  const record = { id: 'owner', name: 'Test', email: 'test@example.invalid', firstName: '', logoBase64: 'X'.repeat(775000), passwordHash: 'secret', iban: 'private' };
  let selection;
  const { getCurrentUser } = load('src/lib/session.ts', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session' }) }) },
    '@/lib/db': { db: { user: { findFirst: async ({ select, where }) => {
      selection = select;
      assert.equal(where.sessionToken, 'session');
      assert.ok(where.sessionExpiry.gt instanceof Date);
      return Object.fromEntries(Object.keys(select).map(k => [k, record[k]]));
    } } } },
  });
  const identity = await getCurrentUser();
  assert.ok(!selection.logoBase64);
  assert.ok(!selection.iban);
  assert.ok(JSON.stringify(identity).length < 1000);
  const settings = await getCurrentUser(true);
  assert.equal(settings.logoBase64.length, 775000);
  assert.ok(!('passwordHash' in settings));
});

test('list pagination bounds work, preserves account scope and excludes long line descriptions', async () => {
  for (const [resource, model, responseKey] of [['clients', 'client', 'clients'], ['devis', 'devis', 'devis'], ['invoices', 'invoice', 'invoices']]) {
    let query;
    const route = load(`src/app/api/${resource}/route.ts`, {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      '@/lib/session': { getCurrentUser: async () => ({ id: 'owner' }) },
      '@/lib/db': { db: { [model]: { findMany: async options => { query = options; return Array.from({ length: 51 }, (_, i) => ({ id: String(i) })); } } } },
    });
    const response = await route.GET({ nextUrl: new URL('https://example.invalid/api/' + resource + '?page=2') });
    assert.equal(response.status, 200);
    assert.equal(response.body[responseKey].length, 50);
    assert.equal(response.body.pagination.hasNext, true);
    assert.equal(query.where.userId, 'owner');
    assert.equal(query.skip, 50);
    assert.equal(query.take, 51);
    assert.deepEqual(query.orderBy, [{ createdAt: 'desc' }, { id: 'desc' }]);
    if (resource !== 'clients') assert.ok(!query.include.items.select.description);
    query = null;
    const invalid = await route.GET({ nextUrl: new URL('https://example.invalid/api/' + resource + '?page=-1') });
    assert.equal(invalid.status, 400);
    assert.equal(query, null);
  }
});

test('cached navigation deduplicates requests and separates users and filters', async () => {
  const { queryClient, clearAccountCache } = load('src/lib/query-client.ts');
  queryClient.setDefaultOptions({ queries: { staleTime: 30000, gcTime: Infinity, retry: false } });
  let calls = 0;
  const get = (account, filter = '') => queryClient.fetchQuery({ queryKey: [account, '/api/devis?' + filter], queryFn: async () => { calls++; return { owner: account }; } });
  try {
    await Promise.all([get('a'), get('a')]);
    await get('a');
    assert.equal(calls, 1);
    assert.deepEqual(await get('b'), { owner: 'b' });
    await get('a', 'search=other');
    assert.equal(calls, 3);
    clearAccountCache();
    assert.equal(queryClient.getQueryCache().getAll().length, 0);
  } finally { clearAccountCache(); }
});

test('logout cancels pending reads and a late response cannot repopulate cleared cache', async () => {
  const { queryClient, clearAccountCache } = load('src/lib/query-client.ts');
  queryClient.setDefaultOptions({ queries: { staleTime: 30000, gcTime: Infinity, retry: false } });
  let finish;
  let aborted = false;
  const pending = queryClient.fetchQuery({ queryKey: ['a', '/api/invoices'], queryFn: ({ signal }) => {
    signal.addEventListener('abort', () => { aborted = true; });
    return new Promise(resolve => { finish = resolve; });
  } });
  const outcome = pending.catch(() => null);
  clearAccountCache();
  finish({ private: true });
  await outcome;
  assert.equal(aborted, true);
  assert.equal(queryClient.getQueryData(['a', '/api/invoices']), undefined);
});

test('writes invalidate cached filters and dashboard before next navigation', async () => {
  const { queryClient, invalidateBillingData, clearAccountCache } = load('src/lib/query-client.ts');
  queryClient.setDefaultOptions({ queries: { staleTime: 30000, gcTime: Infinity, retry: false } });
  try {
    for (const key of ['/api/dashboard', '/api/invoices?status=paid', '/api/devis?page=2']) queryClient.setQueryData(['a', key], { value: 'old' });
    await invalidateBillingData();
    for (const query of queryClient.getQueryCache().getAll()) assert.equal(query.state.isInvalidated, true);
  } finally { clearAccountCache(); }
});

test('a session response received after logout cannot restore the account', async () => {
  const cache = load('src/lib/query-client.ts');
  const { useAppStore } = load('src/lib/store.ts', { './query-client': cache });
  const originalFetch = global.fetch;
  let finish;
  global.fetch = async url => url === '/api/auth/session'
    ? new Promise(resolve => { finish = resolve; })
    : new Response('{}');
  try {
    const pending = useAppStore.getState().fetchSession();
    await useAppStore.getState().logout();
    finish(new Response(JSON.stringify({ user: { id: 'old', name: 'Old' } })));
    await pending;
    assert.equal(useAppStore.getState().user, null);
    assert.equal(useAppStore.getState().isAuthenticated, false);
  } finally { global.fetch = originalFetch; cache.clearAccountCache(); }
});

test('asynchronous password derivation accepts existing hashes and rejects malformed hashes safely', async () => {
  const crypto = require('node:crypto');
  const { hashPassword, verifyPassword } = load('src/lib/auth.ts');
  const salt = '0123456789abcdef0123456789abcdef';
  const legacy = salt + ':' + crypto.scryptSync('test-password', salt, 64).toString('hex');
  assert.equal(await verifyPassword('test-password', legacy), true);
  assert.equal(await verifyPassword('wrong', legacy), false);
  for (const invalid of ['', 'salt:short', salt + ':00', legacy + ':extra']) assert.equal(await verifyPassword('test-password', invalid), false);
  const created = await hashPassword('new-password');
  assert.equal(await verifyPassword('new-password', created), true);
});

test('document emission and CGV retain the full company settings selection', async () => {
  for (const [file, method, body, context] of [
    ['src/app/api/invoices/[id]/route.ts', 'PUT', null, { params: Promise.resolve({ id: 'test' }) }],
    ['src/app/api/invoices/[id]/credit-notes/route.ts', 'POST', {}, { params: Promise.resolve({ id: 'test' }) }],
    ['src/app/api/cgv/document/[type]/[id]/route.ts', 'GET', {}, { params: Promise.resolve({ type: 'invalid', id: 'test' }) }],
  ]) {
    let full;
    const route = load(file, {
      'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
      '@/lib/session': { getCurrentUser: async withSettings => { full = withSettings; return { id: 'owner' }; } },
      '@/lib/db': { db: {} },
      '@/lib/pdf': {},
    });
    await route[method]({ json: async () => body }, context);
    assert.equal(full, true, file);
  }
});
