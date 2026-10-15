const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto('https://revisie.test/subjects.html');
      const badgeStyle = selector => page.locator(selector).evaluate(el => ({ background: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
      assert.deepEqual(await badgeStyle('[data-page="flashcards.html"] .nav-count'), await badgeStyle('[data-page="notes.html"] .nav-count'));
      assert.equal(await page.locator('.nav-count.alert').count(), 0);
      await page.goto('https://revisie.test/flashcards.html');
      const active = await badgeStyle('[data-page="flashcards.html"] .nav-count');
      await page.goto('https://revisie.test/subjects.html');
      assert.deepEqual(active, await badgeStyle('[data-page="subjects.html"] .nav-count'));
    }
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('https://revisie.test/multiple-choice.html');
    assert.equal(await page.locator('.page-intro').evaluate(el => getComputedStyle(el).marginBottom), '28px');
    assert.ok(await page.locator('.practice-card').first().evaluate(el => el.getBoundingClientRect().height < 180));
    await page.goto('https://revisie.test/planner.html');
    await page.evaluate(() => {
      saveWorkspaceItem('revisie-planner-items', JSON.stringify([
        { id: 'refine-one', title: 'A longer mathematics session title for checking the layout', subject: 'mathematics', date: studyDate(), start: '16:00', minutes: 45, done: false },
        { id: 'refine-two', title: 'Biology recall', subject: 'biology', date: studyDate(), start: '16:30', minutes: 25, done: false },
      ])); renderTimetable();
    });
    for (const width of [1440, 390]) for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      const button = page.locator('[data-complete-session="refine-one"]');
      assert.equal(await button.getAttribute('aria-pressed'), 'false');
      assert.equal(await button.locator('[data-lucide="circle"]').count(), 0);
      assert.equal(await button.locator('svg').evaluate(el => getComputedStyle(el).visibility), 'hidden');
      await button.scrollIntoViewIfNeeded();
      const gap = await page.locator('.session-card').evaluateAll(cards => cards[1].getBoundingClientRect().top - cards[0].getBoundingClientRect().bottom);
      assert.ok(gap >= 8);
      await button.focus(); await page.keyboard.press('Enter');
      assert.equal(await button.getAttribute('aria-pressed'), 'true');
      assert.equal(await button.evaluate(el => document.activeElement === el), true);
      assert.equal(await page.locator('.modal').count(), 0);
      assert.match(await page.locator('[data-session-id="refine-one"] small').innerText(), /Completed/);
      const geometry = await button.evaluate(el => { const a = el.getBoundingClientRect(), b = el.querySelector('svg').getBoundingClientRect(); return { width: a.width, height: a.height, dx: Math.abs(a.x + a.width / 2 - b.x - b.width / 2), dy: Math.abs(a.y + a.height / 2 - b.y - b.height / 2), visible: getComputedStyle(el.querySelector('svg')).visibility }; });
      assert.ok(geometry.dx < 1 && geometry.dy < 1); assert.equal(geometry.visible, 'visible');
      if (width === 390) assert.ok(geometry.width >= 44 && geometry.height >= 44);
      await page.screenshot({ path: `/tmp/revisie-planner-refined-${width}-${theme}.png` });
      await page.keyboard.press('Space');
      assert.equal(await button.getAttribute('aria-pressed'), 'false');
      assert.equal(await button.evaluate(el => document.activeElement === el), true);
      assert.equal(await page.locator('.modal').count(), 0);
    }
    await page.reload();
    assert.equal(await page.locator('[data-complete-session="refine-one"]').getAttribute('aria-pressed'), 'false');
    assert.deepEqual(errors, []);
    console.log('UI refinement passed: matching green badges, compact cards, consistent spacing, separated planner sessions, single centred tick, accessible state, keyboard toggling/focus, 44px mobile controls, light/dark and persistence.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
