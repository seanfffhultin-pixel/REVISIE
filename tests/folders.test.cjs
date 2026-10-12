const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../site.js'), 'utf8');
const context = vm.createContext({ localStorage: { getItem: () => null } });
vm.runInContext(source.slice(source.indexOf('function folderItemKey('), source.indexOf('function workspaceCardIdentity(')), context);
const deck = { type: 'deck', subject: 'biology', unit: 'Cells' };
const note = { type: 'note', id: 'n1' }, pdf = { type: 'resource', id: 'r1' };
const folder = (id, items = [], extra = {}) => ({ id, name: id, color: 'green', items, ...extra });
const merge = (base, local, remote) => JSON.parse(context.mergeWorkspaceFolders(JSON.stringify(base), JSON.stringify(local), JSON.stringify(remote)));
test('folder references deduplicate while allowing the same material in multiple folders', () => {
  const records = JSON.parse(JSON.stringify(context.folderRecords(JSON.stringify([folder('a', [deck, deck, note, { type: 'note', id: 'n1' }]), folder('b', [deck])]))));
  assert.equal(records[0].items.length, 2); assert.equal(records[1].items.length, 1);
});
test('malformed folders and references cannot break the workspace', () => {
  assert.equal(context.folderRecords('invalid').length, 0);
  assert.equal(context.folderRecords('{}').length, 0);
  const result = JSON.parse(JSON.stringify(context.folderRecords(JSON.stringify([null, {}, folder('a', [null, {}, { type: 'deck', subject: 'biology' }, note], { color: 'invalid' })]))));
  assert.equal(result.length, 1); assert.deepEqual(result[0].items, [note]); assert.equal(result[0].color, 'green');
});
test('concurrent folder edits keep remote names, local colours and both added links', () => {
  const base = folder('a', [deck]);
  const result = merge([base], [folder('a', [deck, pdf], { color: 'blue' })], [folder('a', [deck, note], { name: 'Renamed' })]);
  assert.equal(result[0].name, 'Renamed'); assert.equal(result[0].color, 'blue');
  assert.deepEqual(result[0].items, [deck, note, pdf]);
});
test('removing a link keeps unrelated remote additions and other folders', () => {
  const result = merge([folder('a', [deck, note])], [folder('a', [note])], [folder('a', [deck, note, pdf]), folder('b', [deck])]);
  assert.deepEqual(result[0].items, [note, pdf]); assert.deepEqual(result[1].items, [deck]);
});
test('folder deletion wins over concurrent edits without resurrecting it', () => {
  assert.deepEqual(merge([folder('a', [deck])], [], [folder('a', [deck, note])]), []);
  assert.deepEqual(merge([folder('a', [deck])], [folder('a', [deck, note])], []), []);
});
test('new folders from separate devices both survive an initially empty workspace', () => {
  assert.equal(merge([], [folder('phone')], [folder('laptop')]).length, 2);
  const result = JSON.parse(context.mergeWorkspaceFolders(null, JSON.stringify([folder('new')]), undefined));
  assert.equal(result.length, 1); assert.equal(result[0].id, 'new');
});
