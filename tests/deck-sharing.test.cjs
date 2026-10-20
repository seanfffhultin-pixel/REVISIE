const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8');
const extract = (start, end) => source.slice(source.indexOf(start), source.indexOf(end));

function harness({ signedOut = false, nativeShare = true, insertError = null } = {}) {
  const inserted = [], shared = [], copied = [], messages = [];
  const context = vm.createContext({
    subjectData: { biology: { label: 'Biology & cells' } },
    getDeck: () => [['Edited starter?', 'Edited answer'], ['Personal?', 'Personal answer']],
    crypto: { randomUUID: () => 'deck-id' }, URL,
    location: { href: 'https://revisie.test/flashcards.html' },
    navigator: {
      ...(nativeShare ? { share: async data => shared.push(data) } : {}),
      clipboard: { writeText: async link => copied.push(link) }
    },
    notify: message => messages.push(message),
    getSupabaseClient: async () => ({
      auth: { getUser: async () => ({ data: { user: signedOut ? null : { id: 'owner' } } }) },
      from: table => {
        assert.equal(table, 'shared_items');
        return { insert: async item => { inserted.push(item); return { error: insertError }; } };
      }
    })
  });
  vm.runInContext(extract('async function copyShareLink(', 'function shareNote(') + extract('function shareDeck(', 'function shareSubject('), context);
  return { context, inserted, shared, copied, messages };
}

test('shares the selected deck snapshot through the subject-sharing flow', async () => {
  const h = harness();
  await h.context.shareDeck('biology', 'Cells & microscopy');
  const item = JSON.parse(JSON.stringify(h.inserted[0]));
  assert.equal(item.item_type, 'deck');
  assert.equal(item.owner_id, 'owner');
  assert.equal(item.title, 'Biology & cells: Cells & microscopy');
  assert.deepEqual(item.payload, {
    subject: 'biology', subjectLabel: 'Biology & cells', unit: 'Cells & microscopy',
    cards: [{ question: 'Edited starter?', answer: 'Edited answer' }, { question: 'Personal?', answer: 'Personal answer' }]
  });
  assert.equal(h.shared[0].url, 'https://revisie.test/share.html?id=deck-id');
});

test('copies the deck link when native sharing is unavailable', async () => {
  const h = harness({ nativeShare: false });
  await h.context.shareDeck('biology', 'Cells');
  assert.deepEqual(h.copied, ['https://revisie.test/share.html?id=deck-id']);
});

test('all shared item types send only one URL field to the native copy target', async () => {
  for (const type of ['subject', 'deck', 'note', 'pdf']) {
    const h = harness();
    await h.context.shareItem(type, 'Revision material', {});
    assert.deepEqual(JSON.parse(JSON.stringify(h.shared)), [{ url: 'https://revisie.test/share.html?id=deck-id' }]);
    assert.equal(h.copied.length, 0, 'native copy must not also trigger clipboard fallback');
    assert.equal(h.inserted.length, 1);
  }
});

test('native sharing failure copies the URL once', async () => {
  const h = harness();
  h.context.navigator.share = async () => { throw new Error('Native sharing unavailable'); };
  await h.context.shareItem('subject', 'Biology', {});
  assert.deepEqual(h.copied, ['https://revisie.test/share.html?id=deck-id']);
});

test('cancelling native sharing does not copy a link', async () => {
  const h = harness();
  h.context.navigator.share = async () => { const error = new Error('Cancelled'); error.name = 'AbortError'; throw error; };
  await h.context.shareItem('subject', 'Biology', {});
  assert.equal(h.copied.length, 0);
  assert.equal(h.messages.length, 0);
});

test('signed-out deck sharing opens login without creating a link', async () => {
  const h = harness({ signedOut: true });
  await h.context.shareDeck('biology', 'Cells');
  assert.equal(h.context.location.href, 'account.html?mode=login');
  assert.equal(h.inserted.length, 0);
});

test('empty decks explain why sharing is unavailable', async () => {
  const h = harness(); h.context.getDeck = () => [];
  await h.context.shareDeck('biology', 'Empty');
  assert.equal(h.inserted.length, 0);
  assert.match(h.messages[0], /Add some flashcards/);
});

test('a failed share save reports the error without sharing a broken link', async () => {
  const h = harness({ insertError: new Error('Sharing unavailable') });
  await h.context.shareDeck('biology', 'Cells');
  assert.deepEqual(h.messages, ['Sharing unavailable']);
  assert.equal(h.shared.length, 0);
});

test('deck options pass the selected subject and topic without opening review', () => {
  const handlers = {}, calls = [];
  const context = vm.createContext({
    escapeHtml: value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;'),
    icon: () => '',
    shareDeck: (...args) => calls.push(args)
  });
  vm.runInContext(extract('function itemActions(', 'function setupSubjectAppearanceButtons(') + extract('function topicActions(', 'function setupFlashcardLibrary('), context);
  const html = context.topicActions('biology', { name: 'Cells & "microscopy"' });
  assert.match(html, /data-share-deck="Cells &amp; &quot;microscopy&quot;"/);
  assert.match(html, /Share deck/);
  context.bindTopicActions({ querySelectorAll: selector => selector === '[data-share-deck]' ? [{
    dataset: { topicSubject: 'biology', shareDeck: 'Cells & "microscopy"' },
    addEventListener: (event, handler) => { handlers[event] = handler; }
  }] : [] });
  let prevented = false, stopped = false;
  handlers.click({ preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
  assert.deepEqual(calls, [['biology', 'Cells & "microscopy"']]);
  assert.ok(prevented && stopped);
});
