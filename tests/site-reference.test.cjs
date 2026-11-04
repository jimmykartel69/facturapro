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
const billing = load('src/lib/billing-input.ts');
const params = { params: Promise.resolve({ id: 'quote-1' }) };
const request = (body) => ({ json: async () => body });
function route(file, db, user = { id: 'owner' }) {
  return load(file, {
    '@/lib/session': { getCurrentUser: async () => user },
    '@/lib/db': { db },
    '@/lib/site-reference': validation,
    '@/lib/billing-input': billing,
  });
}
test('normalize, clear and reject invalid references', () => {
  const schema = validation.siteReferenceSchema;
  assert.equal(schema.parse('  CH-42  '), 'CH-42');
  assert.equal(schema.parse('   '), null);
  assert.equal(schema.p¶»§q«^