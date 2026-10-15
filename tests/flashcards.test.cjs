const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync(require('node:path').join(__dirname, '../site.js'), 'utf8');
const parserSource = source.slice(source.indexOf('function parseDelimitedFlashcards('), source.indexOf('function refreshFlashcardSurfaces('));
const syncSource = source.slice(source.indexOf('const workspacePendingKey'), source.indexOf('async function restoreSignedInAccount('));
const card = (id, question = id, answer = 'Answer') => ({ id, subject: 'biology', unit: 'Cells', question, answer });
const serialize = JSON.stringify;
function harness(initial = {}, remoteCards = [], options = {}) {
  const storage = new Map(Object.entries(initial));
  const localStorage = Object.freeze({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) });
  let remote = { user_id: 'user-1', updated_at: '2026-01-01T00:00:00.000Z', data: { 'revisie-flashcards': serialize(remoteCards), 'revisie-topics': '{}', 'revisie-note-library': '[{"title":"Remote note"}]' } };
  let writes = 0;
  const client = {
    auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: 'user-1' } } }) },
    from() {
      let payload, operation, filters = {};
      const query = {
        select() { return operation ? query.execute() : query; },
        eq(key, value) { filters[key] = value; return query; },
        maybeSingle: async () => { if (options.offline) return { error: new Error('Offline') }; return { data: structuredClone(remote) }; },
        update(value) { operation = 'update'; payload = value; return query; },
        insert(value) { operation = 'insert'; payload = value; return query; },
        async execute() {
          writes += 1;
          if (options.beforeWrite) await options.beforeWrite({ writes, context, remote });
          if (options.conflict && writes === 1) { remote.data['revisie-flashcards'] = serialize([...JSON.parse(remote.data['revisie-flashcards']), card('other-device')]); remote.updated_at = '2026-02-01T00:00:00.000Z'; }
          if (operation === 'update' && filters.updated_at !== remote.updated_at) return { data: [] };
          remote = { ...remote, ...structuredClone(payload) }; return { data: [{ user_id: 'user-1' }] };
        }
      }; return query;
    }
  };
  const context = vm.createContext({ localStorage, crypto: webcrypto, console: { warn() {} }, setTimeout: () => 1, clearTimeout() {}, window: { addEventListener() {} }, document: { addEventListener() {} }, getSupabaseClient: async () => client, getDeck: () => [], getUnits: () => [{ name: 'Cells' }] });
  vm.runInContext(`
    const syncedStorageKeys = ['revisie-flashcards','revisie-topics','revisie-note-library','revisie-streak','revisie-flashcard-study','revisie-last-activity','revisie-folders','revisie-quiz-questions','revisie-quiz-attempts','revisie-maths-topic-skills'];
    const notePhotoCache = new Map(); function storedNoteMetadata(note) { return note; }
    const workspaceTimestampKey = 'timestamp'; const workspaceOwnerKey = 'owner'; let workspaceSyncTimer;
    const nativeLocalStorageSetItem = localStorage.setItem.bind(localStorage);
    const nativeLocalStorageRemoveItem = localStorage.removeItem.bind(localStorage);
    function normaliseQuestion(value) { return String(value).trim().replace(/\\s+/g,' ').toLowerCase(); }
    function workspaceSnapshot() { return Object.fromEntries(syncedStorageKeys.map(key => [key,localStorage.getItem(key)])); }
    ${syncSource}
    function refreshWorkspaceMemory() {}
    ${parserSource}
  `, context);
  return { context, storage, get remote() { return remote; }, get writes() { return writes; } };
}
const parse = (text, format) => JSON.parse(JSON.stringify(harness().context.parseFlashcardImport(text, format)));
test('imports Quizlet TSV and strips BOM / Windows line endings', () => {
  assert.deepEqual(parse('\uFEFFTerm\tDefinition\r\nOsmosis\tWater movement\r\n'), [{ question: 'Osmosis', answer: 'Water movement' }]);
});
test('imports quoted CSV with commas, quotes, and multiline answers', () => {
  assert.deepEqual(parse('question,answer\n"What, exactly?","A ""quote""\nand another line"', 'csv'), [{ question: 'What, exactly?', answer: 'A "quote"\nand another line' }]);
});
test('imports AI JSON variants and fenced output', () => {
  assert.equal(parse('```json\n[{"front":"Q","back":"A"}]\n```')[0].answer, 'A');
  assert.equal(parse('{"cards":[{"term":"Q","definition":"A"}]}')[0].question, 'Q');
  assert.equal(parse('[["Q","A"]]')[0].question, 'Q');
});
test('imports Markdown, semicolons, and Q/A blocks', () => {
  assert.equal(parse('| Question | Answer |\n| --- | --- |\n| Q | A |')[0].answer, 'A');
  assert.equal(parse('Q;A', 'semicolon')[0].answer, 'A');
  assert.deepEqual(parse('Q: First?\nA: Yes\nMore details\n\nQ: Second?\nA: No'), [{ question: 'First?', answer: 'Yes\nMore details' }, { question: 'Second?', answer: 'No' }]);
});
test('rejects malformed imports instead of dropping rows silently', () => {
  for (const text of ['', 'Q|', 'Q|A|extra', '[{"question":"Q","answer":4}]', 'Q: No answer', 'https://quizlet.com/123', 'question,answer\n"Q","unclosed']) assert.throws(() => parse(text));
  assert.throws(() => parse('a,b\nc,d\ne,f', 'pipe'));
});
test('deduplicates questions within an import and against a deck', () => {
  const { context } = harness(); context.getDeck = () => [['Existing?', 'A']];
  const result = context.prepareFlashcardImport([{ question: 'existing?', answer: 'B' }, { question: ' NEW? ', answer: 'A' }, { question: 'new?', answer: 'B' }], 'biology', 'Cells');
  assert.equal(result.cards.length, 1); assert.equal(result.duplicates, 2);
  assert.equal(context.prepareFlashcardImport([{ question: 'Existing?', answer: 'A' }], 'biology', 'New topic').cards.length, 1);
});
test('explicit saves work with immutable Storage methods', () => {
  const { context, storage } = harness(); context.saveWorkspaceItem('revisie-flashcards', '[{"question":"Saved"}]');
  assert.equal(storage.get('revisie-flashcards'), '[{"question":"Saved"}]');
  assert.ok(JSON.parse(storage.get('revisie-workspace-pending-v2'))['revisie-flashcards']);
});
test('phone adds survive a newer remote workspace without replacing remote notes', async () => {
  const h = harness({ 'revisie-workspace-sync-v2': '1', 'revisie-flashcards': '[]' }, [card('remote')]);
  h.context.saveWorkspaceItem('revisie-flashcards', serialize([card('phone')]));
  assert.equal(await h.context.syncWorkspaceNow(), true);
  assert.deepEqual(JSON.parse(h.remote.data['revisie-flashcards']).map(c => c.id).sort(), ['phone', 'remote']);
  assert.equal(h.storage.get('revisie-note-library'), '[{"title":"Remote note"}]');
});
test('legacy cards without timestamps survive migration', async () => {
  const h = harness({ 'revisie-flashcards': serialize([card('legacy')]) }, [card('remote')]);
  await h.context.restoreWorkspace();
  assert.deepEqual(JSON.parse(h.storage.get('revisie-flashcards')).map(c => c.id).sort(), ['legacy', 'remote']);
});
test('three-way merge keeps deletes, local edits, and remote additions', () => {
  const { context } = harness();
  const merged = JSON.parse(context.mergeWorkspaceCards(serialize([card('deleted'), card('edited')]), serialize([card('edited', 'Updated'), card('local-new')]), serialize([card('deleted'), card('edited'), card('remote-new')])));
  assert.deepEqual(merged.map(c => c.id).sort(), ['edited', 'local-new', 'remote-new']);
  assert.equal(merged.find(c => c.id === 'edited').question, 'Updated');
});
test('concurrent device changes retry rather than overwrite', async () => {
  const h = harness({ 'revisie-workspace-sync-v2': '1', 'revisie-flashcards': '[]' }, [card('remote')], { conflict: true });
  h.context.saveWorkspaceItem('revisie-flashcards', serialize([card('phone')]));
  assert.equal(await h.context.syncWorkspaceNow(), true); assert.equal(h.writes, 2);
  assert.equal(JSON.parse(h.remote.data['revisie-flashcards']).length, 3);
});
test('cards saved while an upload is in flight stay pending and sync next', async () => {
  const h = harness({ 'revisie-workspace-sync-v2': '1', 'revisie-flashcards': '[]' }, [], { beforeWrite({ writes, context }) { if (writes === 1) context.saveWorkspaceItem('revisie-flashcards', serialize([card('first'), card('second')])); } });
  h.context.saveWorkspaceItem('revisie-flashcards', serialize([card('first')]));
  await h.context.syncWorkspaceNow(); assert.equal(JSON.parse(h.storage.get('revisie-flashcards')).length, 2);
  assert.ok(JSON.parse(h.storage.get('revisie-workspace-pending-v2'))['revisie-flashcards']);
  await h.context.syncWorkspaceNow(); assert.equal(JSON.parse(h.remote.data['revisie-flashcards']).length, 2);
});
test('offline and signed-out saves remain durable for the next visit', async () => {
  for (const options of [{ offline: true }, { signedOut: true }]) {
    const h = harness({}, [], options); h.context.saveWorkspaceItem('revisie-flashcards', serialize([card('phone')]));
    assert.equal(await h.context.syncWorkspaceNow(), false); assert.equal(JSON.parse(h.storage.get('revisie-flashcards'))[0].id, 'phone');
    assert.ok(h.storage.get('revisie-workspace-pending-v2'));
  }
});
test('account switch restores only the new account workspace', async () => {
  const h = harness({ owner: 'old-user', 'revisie-flashcards': serialize([card('old-private')]) }, [card('new-user-card')]);
  await h.context.restoreWorkspace(); assert.deepEqual(JSON.parse(h.storage.get('revisie-flashcards')).map(c => c.id), ['new-user-card']);
});
test('topics imported on different devices both survive', () => {
  const { context } = harness();
  const merged = JSON.parse(context.mergeWorkspaceTopics('{}', '{"biology":[{"name":"Phone","cards":[]}]}', '{"biology":[{"name":"Laptop","cards":[]}]}'));
  assert.deepEqual(merged.biology.map(t => t.name).sort(), ['Laptop', 'Phone']);
});

test('whole app starts with stored personal subjects and safe imported content', async () => {
  const storage = new Map([['revisie-subjects', '[{"name":"My subject","topic":"My unit"}]']]);
  const node = () => ({ dataset: {}, style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], setAttribute() {} });
  const document = { body: node(), documentElement: node(), head: node(), createElement: node, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, addEventListener() {} };
  const context = vm.createContext({ document, window: { addEventListener() {}, supabase: { createClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) } }, localStorage: Object.freeze({ getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }), location: { pathname: '/flashcards.html', search: '', href: 'https://example.test/flashcards.html' }, navigator: {}, lucide: { createIcons() {} }, crypto: webcrypto, URL, URLSearchParams, console, setInterval: () => 1, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(source, context);
  assert.equal(vm.runInContext('subjectData["my-subject"].category', context), 'custom');
  assert.equal(vm.runInContext('getUnits("my-subject")[0].name', context), 'My unit');
  assert.equal(context.escapeHtml('<img src=x onerror=alert(1)>'), '&lt;img src=x onerror=alert(1)&gt;');
  context.persistFlashcards([{ subject: 'my-subject', unit: 'My unit', question: '<script>Q</script>', answer: 'A' }]);
  assert.equal(JSON.parse(storage.get('revisie-flashcards')).length, 1);
  assert.equal(vm.runInContext('getDeck("my-subject", "My unit").length', context), 1);
  await new Promise(resolve => setImmediate(resolve));
});

test('legacy cards remain reachable even when their topic metadata is missing', () => {
  const context = vm.createContext({ subjectData: { biology: { topic: 'Cells', cards: [] } }, customTopics: {}, userCards: [card('saved', 'Legacy question')], buildUnitDeck: () => [], localStorage: { getItem: () => null } });
  const getUnits = source.slice(source.indexOf('function getUnits('), source.indexOf('function starterCardKey('));
  context.userCards[0].unit = 'Old topic';
  vm.runInContext(getUnits, context);
  assert.deepEqual(Array.from(context.getUnits('biology'), unit => unit.name), ['Cells', 'Old topic']);
});

test('workspace sync merges study days across devices and retries conflicts', async () => {
  const h = harness({ 'revisie-workspace-sync-v2': '1' }, [], {
    beforeWrite({ writes, remote }) {
      if (writes === 1) {
        remote.data['revisie-streak'] = JSON.stringify({ days: ['2026-10-09', '2026-10-10'] });
        remote.updated_at = '2026-03-01T00:00:00.000Z';
      }
    }
  });
  h.context.saveWorkspaceItem('revisie-streak', JSON.stringify({ days: ['2026-10-11'] }));
  assert.equal(await h.context.syncWorkspaceNow(), true);
  assert.equal(h.writes, 2);
  assert.deepEqual(JSON.parse(h.remote.data['revisie-streak']).days, ['2026-10-09', '2026-10-10', '2026-10-11']);
  assert.equal(h.storage.get('revisie-streak'), h.remote.data['revisie-streak']);
});

test('workspace sync merges flashcard study time from different devices', async () => {
  const h = harness(); const key = 'revisie-flashcard-study';
  const record = milliseconds => ({ subject: 'biology', date: '2026-10-12', milliseconds });
  h.remote.data[key] = JSON.stringify({ laptop: record(120000), shared: record(60000) });
  h.context.saveWorkspaceItem(key, JSON.stringify({ phone: record(300000), shared: record(180000) }));
  assert.equal(await h.context.syncWorkspaceNow(), true);
  const merged = JSON.parse(h.remote.data[key]);
  assert.equal(merged.laptop.milliseconds, 120000); assert.equal(merged.phone.milliseconds, 300000); assert.equal(merged.shared.milliseconds, 180000);
});

test('workspace sync keeps the most recent activity across devices', async () => {
  const h = harness(); const key = 'revisie-last-activity';
  const remote = { type: 'review', subject: 'biology', unit: 'Cells', queue: [['Question', 'Answer']], known: 1, updatedAt: 200 };
  h.remote.data[key] = JSON.stringify(remote);
  h.context.saveWorkspaceItem(key, JSON.stringify({ type: 'page', page: 'planner', updatedAt: 100 }));
  assert.equal(await h.context.syncWorkspaceNow(), true);
  assert.deepEqual(JSON.parse(h.storage.get(key)), remote);
  const newest = { type: 'note', id: 123, subject: 'english', updatedAt: 300 };
  h.context.saveWorkspaceItem(key, JSON.stringify(newest));
  assert.equal(await h.context.syncWorkspaceNow(), true);
  assert.deepEqual(JSON.parse(h.remote.data[key]), newest);
});

test('workspace sync preserves concurrent folder additions and links across devices', async () => {
  const deck = { type: 'deck', subject: 'biology', unit: 'Cells' };
  const folder = { id: 'shared', name: 'Mocks', color: 'green', items: [deck] };
  const { context, remote, storage } = harness({ 'revisie-folders': serialize([folder]) });
  remote.data['revisie-folders'] = serialize([{ ...folder, name: 'Summer mocks', items: [deck, { type: 'note', id: 'remote-note' }] }, { id: 'laptop', name: 'Laptop folder', items: [] }]);
  context.saveWorkspaceItem('revisie-folders', serialize([{ ...folder, color: 'purple', items: [deck, { type: 'resource', id: 'phone-pdf' }] }]));
  assert.equal(await context.syncWorkspaceNow(), true);
  const saved = JSON.parse(storage.get('revisie-folders'));
  assert.equal(saved.length, 2);
  assert.equal(saved[0].name, 'Summer mocks'); assert.equal(saved[0].color, 'purple');
  assert.equal(saved[0].items.length, 3);
});

test('quiz questions and completed results merge across devices without losing additions', async () => {
  for (const key of ['revisie-quiz-questions', 'revisie-quiz-attempts']) {
    const item = id => key === 'revisie-quiz-questions'
      ? { id, subject: 'biology', unit: 'Cells', mode: 'choice', prompt: id, options: ['A', 'B', 'C', 'D'], correct: 0, answer: 'Explanation' }
      : { id, subject: 'biology', topic: 'Cells', mode: 'choice', score: 1, total: 1, completedAt: '2026-10-15T12:00:00Z' };
    const h = harness({ [key]: serialize([item('original')]) });
    h.remote.data[key] = serialize([item('original'), item('laptop')]);
    h.context.saveWorkspaceItem(key, serialize([item('original'), item('phone')]));
    assert.equal(await h.context.syncWorkspaceNow(), true);
    assert.deepEqual(JSON.parse(h.remote.data[key]).map(item => item.id).sort(), ['laptop', 'original', 'phone']);
  }
});

test('maths skills linked to different topics merge across devices', async () => {
  const key = 'revisie-maths-topic-skills';
  const record = (unit, skills) => ({ id: JSON.stringify(['mathematics', unit]), subject: 'mathematics', unit, skills });
  const h = harness({ [key]: '[]' });
  h.remote.data[key] = serialize([record('Algebra', ['linear'])]);
  h.context.saveWorkspaceItem(key, serialize([record('Statistics', ['mean', 'range'])]));
  assert.equal(await h.context.syncWorkspaceNow(), true);
  assert.deepEqual(JSON.parse(h.remote.data[key]).map(item => item.unit).sort(), ['Algebra', 'Statistics']);
});
