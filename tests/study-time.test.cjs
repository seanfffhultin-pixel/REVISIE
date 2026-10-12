const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { webcrypto } = require('node:crypto');
const source = fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8');
const timerSource = source.slice(source.indexOf('const flashcardStudyKey'), source.indexOf('function clearWorkspaceCache('));
const statsSource = source.slice(source.indexOf('function revisionStats('), source.indexOf('function setupProgressRoute('));
function harness() {
  const storage = new Map(), timers = new Map(); let now = 0, nextTimer = 0;
  const document = { visibilityState: 'visible' };
  const context = vm.createContext({ document, crypto: webcrypto, performance: { now: () => now },
    localStorage: { getItem: key => storage.get(key) ?? null }, workspaceOwnerKey: 'owner',
    saveWorkspaceItem: (key, value) => storage.set(key, value),
    setInterval: callback => { timers.set(++nextTimer, callback); return nextTimer; }, clearInterval: id => timers.delete(id), setupProgressRoute() {},
    studyDate: () => '2026-10-12', validStudyDate: value => /^\d{4}-\d{2}-\d{2}$/.test(value),
    topicProgress: () => ({}), plannerItems: () => JSON.parse(storage.get('planner') || '[]'),
    subjectEntries: () => [['biology', { label: 'Biology' }], ['mathematics', { label: 'Mathematics' }]], getUnits: () => [],
  });
  vm.runInContext(timerSource + statsSource, context);
  return { context, storage, document, timers, advance: milliseconds => { now += milliseconds; }, tick: () => { for (const callback of timers.values()) callback(); }, records: () => JSON.parse(storage.get('revisie-flashcard-study') || '{}') };
}
test('five minutes save during review, survive partial closure, and never double count flushes', () => {
  const h = harness(); h.context.beginFlashcardStudy('biology'); h.advance(300000); h.tick();
  assert.equal(h.context.revisionStats().minutes, 5);
  h.context.flushFlashcardStudy(); h.context.endFlashcardStudy(); h.advance(300000); h.tick();
  assert.equal(h.context.revisionStats().minutes, 5); assert.equal(h.timers.size, 0);
  assert.equal(Object.values(h.records())[0].subject, 'biology');
});
test('hidden tabs pause and resume without counting background time', () => {
  const h = harness(); h.context.beginFlashcardStudy('biology'); h.advance(120000);
  h.document.visibilityState = 'hidden'; h.context.flushFlashcardStudy(); h.advance(600000); h.tick();
  assert.equal(h.context.revisionStats().minutes, 2);
  h.document.visibilityState = 'visible'; h.context.resumeFlashcardStudy(); h.advance(60000); h.context.endFlashcardStudy();
  assert.equal(h.context.revisionStats().minutes, 3);
});
test('partial minutes accumulate across sessions and subjects without being rounded away', () => {
  const h = harness(); h.context.beginFlashcardStudy('biology'); h.advance(20000); h.context.endFlashcardStudy();
  assert.equal(h.context.studyMinutesLabel(h.context.revisionStats().minutes), '&lt;1');
  h.context.beginFlashcardStudy('mathematics'); h.advance(40000); h.context.endFlashcardStudy();
  assert.equal(h.context.revisionStats().minutes, 1); assert.equal(Object.keys(h.records()).length, 2);
});
test('account switches stop recording into the next account', () => {
  const h = harness(); h.storage.set('owner', 'first'); h.context.beginFlashcardStudy('biology'); h.advance(60000); h.tick();
  h.storage.set('owner', 'second'); h.advance(120000); h.tick();
  assert.equal(h.context.revisionStats().minutes, 1); assert.equal(h.timers.size, 0);
});
test('cloud merges preserve both devices and the latest duration without counting snapshots twice', () => {
  const h = harness(); const record = milliseconds => ({ subject: 'biology', date: '2026-10-12', milliseconds });
  const local = JSON.stringify({ shared: record(300000), phone: record(60000) });
  const remote = JSON.stringify({ shared: record(120000), laptop: record(180000) });
  const merged = h.context.mergeWorkspaceStudyTime(null, local, remote);
  const values = JSON.parse(merged); assert.equal(Object.keys(values).length, 3); assert.equal(values.shared.milliseconds, 300000);
  assert.deepEqual(JSON.parse(h.context.mergeWorkspaceStudyTime(null, merged, remote)), values);
  assert.equal(h.context.mergeWorkspaceStudyTime(merged, null, remote), null);
});
test('progress adds review time to completed planner durations with correct subject totals', () => {
  const h = harness(); h.storage.set('planner', JSON.stringify([
    { subject: 'biology', minutes: 30, done: true, date: '2026-10-12' },
    { subject: 'biology', minutes: 50, done: false, date: '2026-10-12' },
    { subject: 'biology', minutes: 25, done: true, date: '2026-10-13' },
  ]));
  h.context.beginFlashcardStudy('biology'); h.advance(300000); h.context.endFlashcardStudy();
  const stats = h.context.revisionStats(); assert.equal(stats.minutes, 35); assert.equal(stats.sessions, 1);
  assert.equal(stats.subjects[0].minutes, 35); assert.equal(stats.subjects[1].minutes, 0);
});
test('malformed time records cannot inflate totals or break Progress', () => {
  const h = harness();
  for (const value of ['broken', '[]', 'null', '{"bad":{"subject":"biology","milliseconds":-100}}']) {
    h.storage.set('revisie-flashcard-study', value); assert.equal(h.context.revisionStats().minutes, 0);
  }
});
