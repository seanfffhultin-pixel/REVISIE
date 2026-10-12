const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8');
const accountSource = source.slice(source.indexOf('async function sendPasswordReset('), source.indexOf('function dueCards('));
function uiHarness({ session = true, updateError = null, resetError = null } = {}) {
  const nodes = new Map(); const calls = [];
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', disabled: false, textContent: '', handlers: {},
      addEventListener(type, fn) { this.handlers[type] = fn; }, querySelector() { return node(id + '-submit'); }, reset() { calls.push('reset'); } });
    return nodes.get(id);
  };
  const client = { auth: {
    resetPasswordForEmail: async (email, options) => { calls.push({ email, options }); return { error: resetError }; },
    onAuthStateChange(fn) { this.listener = fn; },
    getSession: async () => ({ data: { session: session ? {} : null } }),
    getUser: async () => ({ data: { user: session ? { email: 'you@example.com' } : null } }),
    updateUser: async data => { calls.push(data); return { error: updateError }; },
    signOut: async () => { calls.push('signOut'); },
  } };
  const context = vm.createContext({ URL, URLSearchParams, getSupabaseClient: async () => client,
    location: { href: 'https://revisie.test/account.html?mode=recovery', search: '?mode=recovery' },
    history: { replaceState() {} }, document: { getElementById: node, querySelectorAll: () => [] },
    nativeLocalStorageRemoveItem: key => calls.push(key), notify: message => calls.push(message),
  });
  vm.runInContext(accountSource, context);
  const modes = []; context.setupPasswordRecovery(mode => modes.push(mode));
  const submit = async id => node(id).handlers.submit({ preventDefault() {}, currentTarget: node(id) });
  return { node, calls, modes, client, submit, ready: () => new Promise(resolve => setImmediate(resolve)) };
}
test('reset email uses recovery redirect and does not disclose account existence', async () => {
  const h = uiHarness(); await h.ready(); h.node('resetEmail').value = 'you@example.com';
  await h.submit('resetPasswordForm');
  assert.equal(h.calls[0].options.redirectTo, 'https://revisie.test/account.html?mode=recovery');
  assert.match(h.node('resetPasswordStatus').textContent, /If an account exists/);
  assert.equal(h.node('resetPasswordForm-submit').disabled, false);
});
test('expired recovery cannot update a password', async () => {
  const h = uiHarness({ session: false }); await h.ready(); await h.submit('recoveryForm');
  assert.match(h.node('recoveryStatus').textContent, /expired or is invalid/);
  assert.equal(h.calls.length, 0);
});
test('recovery validates confirmation, updates password and returns to login', async () => {
  const h = uiHarness(); await h.ready();
  h.node('newPassword').value = 'new-password'; h.node('newPasswordConfirm').value = 'different';
  await h.submit('recoveryForm'); assert.match(h.node('recoveryStatus').textContent, /do not match/);
  h.node('newPasswordConfirm').value = 'new-password'; await h.submit('recoveryForm');
  assert.equal(h.calls[0].password, 'new-password'); assert.ok(h.calls.includes('signOut'));
  assert.equal(h.modes.at(-1), 'login'); assert.equal(h.node('recoveryForm-submit').disabled, true);
});
test('password service failures are visible and allow retry', async () => {
  const h = uiHarness({ updateError: { message: 'Password too weak' }, resetError: { message: 'Try later' } }); await h.ready();
  await h.submit('resetPasswordForm'); assert.equal(h.node('resetPasswordStatus').textContent, 'Try later');
  h.node('newPassword').value = h.node('newPasswordConfirm').value = 'password'; await h.submit('recoveryForm');
  assert.equal(h.node('recoveryStatus').textContent, 'Password too weak');
  assert.equal(h.node('recoveryForm-submit').disabled, false); assert.ok(!h.calls.includes('signOut'));
});
function serverHarness({ invalidToken = false, wrongPassword = false, failStorage = false } = {}) {
  const calls = []; let handler;
  const files = new Set(['owner/file.pdf', 'owner/photos/photo.jpg']);
  const bucket = {
    async list(prefix) {
      calls.push(['list', prefix]);
      if (failStorage) return { error: new Error('Unavailable') };
      const entries = new Map();
      for (const file of files) if (file.startsWith(prefix + '/')) {
        const remainder = file.slice(prefix.length + 1), name = remainder.split('/')[0];
        entries.set(name, { name, id: remainder.includes('/') ? null : 'file-id' });
      }
      return { data: [...entries.values()] };
    },
    async remove(paths) { calls.push(['remove', paths]); paths.forEach(file => files.delete(file)); return {}; },
  };
  const admin = { auth: { getUser: async token => { calls.push(['token', token]); return { data: { user: invalidToken ? null : { id: 'owner', email: 'you@example.com' } } }; },
    admin: { deleteUser: async id => { calls.push(['delete', id]); return {}; } } }, storage: { from: () => bucket } };
  const verifier = { auth: { signInWithPassword: async () => ({ data: { user: wrongPassword ? null : { id: 'owner' } }, error: wrongPassword ? {} : null }), signOut: async () => ({}) } };
  let raw = fs.readFileSync(path.join(__dirname, '../supabase/functions/delete-account/index.ts'), 'utf8');
  raw = raw.replace(/^import .*;\n/, '');
  const context = vm.createContext({ Request, Response, createClient: (_, key) => key === 'service' ? admin : verifier,
    Deno: { env: { get: key => key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'service' : 'anon' }, serve: fn => { handler = fn; } } });
  vm.runInContext(stripTypeScriptTypes(raw), context);
  const request = (token = 'valid', body = { password: 'password', userId: 'someone-else' }) => handler(new Request('https://example.test', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: JSON.stringify(body) }));
  return { request, calls, files };
}
test('deletion rejects missing/invalid auth and incorrect password before file access', async () => {
  for (const [options, token, status] of [[{}, '', 401], [{ invalidToken: true }, 'invalid', 401], [{ wrongPassword: true }, 'valid', 403]]) {
    const h = serverHarness(options); assert.equal((await h.request(token)).status, status);
    assert.ok(!h.calls.some(call => ['list', 'delete'].includes(call[0])));
  }
});
test('deletion removes nested storage files before deleting only the authenticated user', async () => {
  const h = serverHarness(); const response = await h.request(); assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { deleted: true }); assert.equal(h.files.size, 0);
  assert.deepEqual(h.calls.at(-1), ['delete', 'owner']);
});
test('storage failure preserves the account for retry', async () => {
  const h = serverHarness({ failStorage: true }); assert.equal((await h.request()).status, 500);
  assert.ok(!h.calls.some(call => call[0] === 'delete'));
});
