const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const source = fs.readFileSync(path.join(__dirname, '../site.js'), 'utf8');
const core = source.slice(source.indexOf('function studyDate('), source.indexOf('function workspaceCardIdentity('));
const actions = source.slice(source.indexOf('function streakState('), source.indexOf('function refreshStreakSurfaces('));
function harness(initial = null) {
  const storage = new Map(initial ? [['revisie-streak', JSON.stringify(initial)]] : []);
  let saves = 0, refreshes = 0;
  const context = vm.createContext({
    localStorage: { getItem: key => storage.get(key) ?? null },
    saveWorkspaceItem(key, value) { saves++; storage.set(key, value); },
    refreshStreakSurfaces() { refreshes++; },
    openModal(title, body) { return { dataset: {}, title, body }; },
  });
  vm.runInContext(core + actions, context);
  return { context, storage, get saves() { return saves; }, get refreshes() { return refreshes; } };
}
const stored = (...days) => ({ version: 2, days });
const plain = value => JSON.parse(JSON.stringify(value));

test('new streak is empty and malformed data recovers safely', () => {
  const { context: c } = harness();
  for (const value of [null, 'bad json', 'null', '{}', '[]', '{"current":"7","lastDate":"2026-10-10"}']) {
    assert.deepEqual(plain(c.calculateStreak(value, '2026-10-11')), { days: [], current: 0, best: 0, total: 0, lastDate: '', completedToday: false });
  }
});
test('credit is idempotent, persists for guests, and survives reloads', () => {
  const h = harness(); const c = h.context;
  assert.equal(c.markStudyComplete(), true);
  assert.equal(c.markStudyComplete(), false);
  assert.equal(h.saves, 1); assert.equal(h.refreshes, 1);
  assert.equal(c.streakState().current, 1);
  assert.equal(harness(JSON.parse(h.storage.get('revisie-streak'))).context.streakState().current, 1);
});
test('yesterday stays alive, a missed day expires, and studying restarts at one', () => {
  const { context: c } = harness();
  const history = stored('2026-10-08', '2026-10-09', '2026-10-10');
  assert.equal(c.calculateStreak(history, '2026-10-11').current, 3);
  assert.equal(c.calculateStreak(history, '2026-10-12').current, 0);
  const restart = c.calculateStreak(stored(...history.days, '2026-10-12'), '2026-10-12');
  assert.equal(restart.current, 1); assert.equal(restart.best, 3); assert.equal(restart.total, 4);
});
test('duplicates, impossible dates, and future dates cannot inflate the streak', () => {
  const { context: c } = harness();
  const state = c.calculateStreak(stored('2026-10-11', '2026-10-10', '2026-10-10', '2026-02-30', 'invalid', 1, '2026-10-12'), '2026-10-11');
  assert.equal(state.current, 2); assert.equal(state.total, 2); assert.equal(state.best, 2);
});
test('legacy counter migrates its known run and preserves an expired best', () => {
  const { context: c } = harness();
  const state = c.calculateStreak({ current: 7, lastDate: '2026-10-09' }, '2026-10-11');
  assert.equal(state.current, 0); assert.equal(state.best, 7); assert.equal(state.total, 7);
  assert.equal(state.days[0], '2026-10-03');
});
test('calendar arithmetic crosses leap days and years', () => {
  const { context: c } = harness();
  assert.equal(c.shiftStudyDate('2024-03-01', -1), '2024-02-29');
  assert.equal(c.calculateStreak(stored('2025-12-31', '2026-01-01'), '2026-01-02').current, 2);
});
test('device merges preserve both offline histories and deduplicate shared days', () => {
  const { context: c } = harness();
  const left = JSON.stringify(stored('2026-10-09', '2026-10-11'));
  const right = JSON.stringify(stored('2026-10-09', '2026-10-10'));
  const merged = c.mergeWorkspaceStreak(null, left, right);
  assert.equal(c.calculateStreak(merged, '2026-10-11').current, 3);
  assert.equal(c.mergeWorkspaceStreak(null, right, left), merged);
  assert.equal(c.mergeWorkspaceStreak(left, merged, right), merged);
  assert.equal(c.mergeWorkspaceStreak(left, null, right), null);
});
test('only planner sessions completed today qualify and toggling cannot double-credit', () => {
  const h = harness(); const c = h.context; const today = c.studyDate();
  c.completePlannerStudy({ done: false, date: today });
  c.completePlannerStudy({ done: true, date: c.shiftStudyDate(today, 1) });
  c.completePlannerStudy({ done: true, date: c.shiftStudyDate(today, -1) });
  assert.equal(h.saves, 0);
  c.completePlannerStudy({ done: true, date: today });
  c.completePlannerStudy({ done: false, date: today });
  c.completePlannerStudy({ done: true, date: today });
  assert.equal(h.saves, 1);
});
test('weekly view marks real days, today, and fixed milestone targets', () => {
  const { context: c } = harness();
  vm.runInContext("studyDate = () => '2026-10-11'", c);
  const markup = c.streakMarkup(c.calculateStreak(stored('2026-10-09', '2026-10-10'), '2026-10-11'));
  assert.match(markup, /Fri 2026-10-09: Studied/);
  assert.match(markup, /Sun 2026-10-11: No study recorded/);
  assert.match(markup, /aria-current="date"/);
  assert.equal((markup.match(/week-day done/g) || []).length, 2);
  assert.match(markup, /Next milestone: 3 days/);
  assert.match(markup, /Sign in to sync/);
  vm.runInContext("studyDate = () => '2026-10-05'", c);
  assert.match(c.streakMarkup(), /Mon 2026-10-05/);
});
test('local midnight and DST use calendar dates in multiple timezones', () => {
  const script = `${core}\nconst assert = require('node:assert/strict');
    assert.equal(studyDate(new Date(2026, 9, 11, 0, 5)), '2026-10-11');
    for (const [a,b] of [['2026-03-28','2026-03-29'], ['2026-10-24','2026-10-25'], ['2026-11-01','2026-11-02']]) {
      assert.equal(calculateStreak({days:[a,b]}, shiftStudyDate(b,1)).current, 2);
    }`;
  for (const TZ of ['Europe/London', 'America/Los_Angeles', 'Pacific/Auckland']) execFileSync(process.execPath, ['-e', script], { env: { ...process.env, TZ } });
});
