// Run with Playwright available in NODE_PATH: node tests/study-time-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url()); if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-12T19:00:00Z') });
    await page.goto('https://revisie.test/biology.html');
    await page.locator('[data-action="unit-review"]').first().click();
    await page.clock.fastForward(300000);
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 5);
    await page.locator('#flashcard').click(); await page.locator('#again').click();
    await page.clock.fastForward(60000);
    await page.locator('#known').click();
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 6);
    await page.locator('.modal-close').click(); await page.clock.fastForward(600000);
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 6);
    // A single-card deck finishes automatically: its result screen must stop the timer.
    await page.evaluate(() => reviewCards([['Question', 'Answer']], 'Biology / Test'));
    await page.clock.fastForward(60000); await page.locator('#known').click(); await page.clock.fastForward(300000);
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 7);
    await page.locator('.modal-close').click();
    await page.evaluate(() => reviewCards([['Question', 'Answer']], 'Biology / Test'));
    await page.clock.fastForward(60000);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward(600000);
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 8);
    await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
    await page.clock.fastForward(60000); await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 9);
    // Navigation saves the final seconds even before the five-second checkpoint fires.
    await page.evaluate(() => reviewCards([['Question', 'Answer']], 'Biology / Test'));
    await page.clock.fastForward(63000); await page.goto('https://revisie.test/progress.html');
    assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 10);
    assert.match((await page.locator('.stat-card strong').allTextContents())[2], /^10 mins$/);
    assert.match(await page.locator('.revision-subject').innerText(), /Biology[\s\S]*10 min/);
    await page.reload(); assert.equal(await page.evaluate(() => Math.floor(revisionStats().minutes)), 10);
    await page.evaluate(() => { saveWorkspaceItem('revisie-planner-items', JSON.stringify([{ id: 1, subject: 'biology', date: studyDate(), minutes: 30, done: true }])); setupProgressRoute(); });
    assert.match((await page.locator('.stat-card strong').allTextContents())[2], /^40 mins$/);
    assert.match(await page.locator('.revision-summary-note').innerText(), /flashcards/);
    assert.deepEqual(errors, []);
    console.log('Passed timed reviews, Again/Known transitions, partial closure, deck completion, hidden-tab pause/resume, Escape, navigation, reload persistence and combined Progress totals.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
