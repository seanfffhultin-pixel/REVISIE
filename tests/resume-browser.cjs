// Run with Playwright available in NODE_PATH: node tests/resume-browser.cjs
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
    const goto = name => page.goto(`https://revisie.test/${name}.html`);
    await goto('index'); assert.equal(await page.locator('#resume-heading').innerText(), 'Start revising');
    await page.evaluate(() => saveWorkspaceItem('revisie-settings', JSON.stringify({ subject: 'mathematics', minutes: 35 })));
    await goto('biology'); const unit = await page.locator('[data-action="unit-review"]').first().getAttribute('data-unit');
    await page.locator('[data-action="unit-review"]').first().click();
    await page.locator('#known').click(); await page.locator('#again').click();
    const next = await page.locator('#flashcard p').innerText();
    const snapshot = await page.evaluate(() => JSON.parse(localStorage.getItem('revisie-last-activity')));
    await page.locator('.modal-close').click(); await goto('index');
    assert.equal(await page.locator('.continue-body .subject-label').innerText(), 'BIOLOGY');
    assert.equal(await page.locator('.continue-body h3').innerText(), unit);
    assert.equal(await page.locator('.continue-body p').innerText(), `1 complete · ${snapshot.queue.length} remaining`);
    await page.reload(); await page.locator('#startReview').click();
    assert.equal(await page.locator('#flashcard p').innerText(), next);
    assert.match(await page.locator('.flashcard-meta').innerText(), /1 complete/i);
    while (await page.locator('#known').count()) await page.locator('#known').click();
    await page.locator('.modal-close').click(); await goto('index');
    assert.equal(await page.locator('#startReview').innerText(), 'Review again');
    // Saved notes take precedence over a previously reviewed deck.
    await page.evaluate(() => {
      noteLibrary.push({ id: 123, subject: 'english', title: 'Essay notes', body: 'My note', updatedAt: new Date().toISOString() });
      saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary)); viewNote(123);
    });
    await page.locator('.modal-close').click(); await page.reload();
    assert.equal(await page.locator('.continue-body h3').innerText(), 'Essay notes');
    await page.locator('#startReview').click(); assert.equal(await page.locator('.modal-header h2').innerText(), 'Essay notes');
    await page.locator('.modal-close').click();
    // Deleting the saved item gives a useful starting point instead of a broken resume button.
    await page.evaluate(() => { noteLibrary.splice(0); saveWorkspaceItem('revisie-note-library', '[]'); setupOverviewRoute(); });
    assert.equal(await page.locator('#resume-heading').innerText(), 'Start revising');
    await goto('biology'); await page.locator('#subjectAddCard').click();
    await page.locator('#cardQuestion').fill('Unfinished question'); await page.locator('.modal-close').click();
    await goto('index'); assert.equal(await page.locator('#startReview').innerText(), 'Continue creating');
    await page.locator('#startReview').click(); assert.equal(await page.locator('#cardQuestion').inputValue(), 'Unfinished question');
    await page.locator('.modal-close').click(); await goto('planner'); await goto('index');
    assert.equal(await page.locator('.continue-body h3').innerText(), 'Revision planner');
    await page.locator('#startReview').click(); assert.match(page.url(), /planner.html$/);
    await goto('settings');
    assert.equal(await page.locator('#defaultSubject, #dailyMinutes').count(), 0);
    await page.locator('#displayName').fill('Alex'); await page.locator('#settingsForm [type="submit"]').click();
    const settings = await page.evaluate(() => JSON.parse(localStorage.getItem('revisie-settings')));
    assert.equal(settings.name, 'Alex'); assert.equal(settings.subject, undefined); assert.equal(settings.minutes, undefined);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    console.log('Passed last-deck selection, remaining queue/order/counts, reload, completed reviews, saved notes, deleted items, draft continuation, planner continuation and removal of unused study defaults.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
