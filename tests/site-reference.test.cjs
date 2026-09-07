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
  mod.require = (name) => Object.hasOwn(mocks, name) ? mocks[name] : originalRequire(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
const validation = load('src/lib/site-reference.ts');
const params = { params: Promise.resolve({ id: 'quote-1' }) };
const request = (body) => ({ json: async () => body });
function route(file, db, user = { id: 'owner' }) {
  return load(file, {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/db': { db },
    '@/lib/site-reference': validation,
  });
}
test('normalize, clear and reject invalid references', () => {
  const schema = validation.siteReferenceSchema;
  assert.equal(schema.parse('  CH-42  '), 'CH-42');
  assert.equal(schema.parse('   '), null);
  assert.equal(schema.parse(null), null);
  assert.equal(schema.parse(undefined), undefined);
  assert.equal(schema.parse('x'.repeat(120)).length, 120);
  for (const value of ['x'.repeat(121), 'a\nb', 'a\0b', 42, {}, []]) assert.equal(schema.safeParse(value).success, false);
});
test('create saves reference in transaction', async () => {
  let saved;
  const db = {
    client: { findFirst: async ({ where }) => { assert.equal(where.userId, 'owner'); return { id: 'client-1' }; } },
    $transaction: async (fn) => fn({
      user: { update: async () => ({ devisPrefix: 'DEV-', nextDevisNumber: 2 }) },
      devis: { create: async ({ data }) => { saved = data; return data; } },
    }),
  };
  const res = await route('src/app/api/devis/route.ts', db).POST(request({clientId:'client-1', items:[{designation:'Work',quantity:1,unitPrice:10,tvaRate:0}],siteReference:' CH-42 '}));
  assert.equal(res.status, 201);
  assert.equal(saved.siteReference, 'CH-42');
});
test('update replaces, clears or preserves omitted reference', async () => {
  for (const [body, expected] of [[{siteReference:' CH-43 '},'CH-43'],[{siteReference:''},null],[{siteReference:null},null],[{status:'sent'},undefined]]) {
    let saved;
    const db = { devis: {
      findFirst: async ({ where }) => { assert.equal(where.userId,'owner'); return {id:'quote-1'}; },
      update: async ({ data }) => { saved = data; return data; },
    } };
    const res = await route('src/app/api/devis/[id]/route.ts',db).PUT(request(body),params);
    assert.equal(res.status,200);
    assert.equal(saved.siteReference,expected);
    assert.equal(Object.hasOwn(saved,'siteReference'),Object.hasOwn(body,'siteReference'));
  }
});
test('invalid and unauthorized requests do not touch database', async () => {
  for (const [file,method] of [['src/app/api/devis/route.ts','POST'],['src/app/api/devis/[id]/route.ts','PUT']]) {
    assert.equal((await route(file, {})[method](request({siteReference:'x'.repeat(121),items:[{}]}),params)).status,400);
    assert.equal((await route(file, {}, null)[method](request({siteReference:'CH-42'}),params)).status,401);
  }
});
test('another owner cannot edit quote', async () => {
  const db = {devis:{findFirst:async ({where})=>{assert.equal(where.userId,'owner');return null;}}};
  assert.equal((await route('src/app/api/devis/[id]/route.ts',db).PUT(request({siteReference:'CH-42'}),params)).status,404);
});
test('line replacement uses single nested write', async () => {
  let saved;
  const db={devis:{findFirst:async()=>({id:'quote-1'}),update:async({data})=>{saved=data;return data;}}};
  const res=await route('src/app/api/devis/[id]/route.ts',db).PUT(request({siteReference:'CH-42',items:[{designation:'Work',quantity:1,unitPrice:10}]}),params);
  assert.equal(res.status,200);
  assert.deepEqual(saved.items.deleteMany,{});
  assert.equal(saved.items.create.length,1);
});
test('conversion copies reference to invoice', async () => {
  let saved;
  const db={$transaction:async(fn)=>fn({
    devis:{findFirst:async()=>({id:'quote-1',clientId:'client-1',status:'accepted',siteReference:'CH-42',items:[],globalDiscount:0}),update:async()=>({})},
    user:{update:async()=>({invoicePrefix:'FAC-',nextInvoiceNumber:2})},
    invoice:{create:async({data})=>{saved=data;return data;}},
  })};
  assert.equal((await route('src/app/api/convert-devis/route.ts',db).POST(request({devisId:'quote-1'}))).status,201);
  assert.equal(saved.siteReference,'CH-42');
});
