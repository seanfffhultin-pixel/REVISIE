const { test } = require('node:test');
const assert = require('node:assert/strict');
const { current } = require('../assets/brand.js');
test('June uses Pride, October uses Black History Month and all other months use the standard logo', () => {
  for (let year = 2026; year <= 2028; year++) for (let month = 1; month <= 12; month++) {
    const brand = current(new Date(`${year}-${String(month).padStart(2, '0')}-15T12:00:00Z`));
    assert.equal(brand.season, month === 6 ? 'pride' : month === 10 ? 'black-history' : 'standard');
    assert.match(brand.src, /\.png\?v=/);
    assert.match(brand.alt, /REVISIÉ/);
  }
});
test('branding changes at UK month boundaries even when UTC is still in the previous month', () => {
  for (const [date, season] of [
    ['2026-05-31T22:59:59Z', 'standard'], ['2026-05-31T23:00:00Z', 'pride'],
    ['2026-06-30T22:59:59Z', 'pride'], ['2026-06-30T23:00:00Z', 'standard'],
    ['2026-09-30T22:59:59Z', 'standard'], ['2026-09-30T23:00:00Z', 'black-history'],
    ['2026-10-31T23:59:59Z', 'black-history'], ['2026-11-01T00:00:00Z', 'standard'],
  ]) assert.equal(current(new Date(date)).season, season, date);
});
test('each season selects the supplied artwork for its theme', () => {
  for (const [month, name] of [['01', 'revisie-logo'], ['06', 'revisie-logo-pride'], ['10', 'revisie-logo-black-history']]) {
    const date = new Date(`2026-${month}-15T12:00:00Z`);
    assert.equal(current(date, 'dark').src, `assets/${name}-dark.png?v=2`);
    assert.match(current(date, 'light').src, new RegExp(`${name}\\.png\\?v=`));
    assert.equal(current(date, 'light').alt, current(date, 'dark').alt);
  }
});
