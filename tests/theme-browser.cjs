const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'dark', reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const theme = () => page.locator('html').getAttribute('data-theme');
    await page.goto('https://revisie.test/settings.html');
    assert.equal(await theme(), 'dark');
    assert.equal(await page.locator('#appearance').inputValue(), 'system');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await page.locator('#appearance').selectOption('dark');
    await page.locator('#settingsForm [type="submit"]').click();
    assert.equal(await theme(), 'dark');
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('revisie-settings')).theme), 'dark');
    await page.reload(); assert.equal(await theme(), 'dark');
    await page.screenshot({ path: '/tmp/revisie-dark-settings.png', fullPage: true });
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/index.html');
    await sibling.emulateMedia({ colorScheme: 'light' });
    assert.equal(await sibling.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#appearance').selectOption('light');
    await page.locator('#settingsForm [type="submit"]').click();
    await sibling.waitForFunction(() => document.documentElement.dataset.theme === 'light');
    await page.locator('#appearance').selectOption('system');
    await page.locator('#settingsForm [type="submit"]').click();
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    await sibling.close();
    let checks = 0;
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const file of fs.readdirSync(root).filter(name => name.endsWith('.html'))) {
        await page.goto('https://revisie.test/' + file);
        assert.equal(await theme(), 'dark', file);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, file + ' overflows at ' + width);
        const surfaces = await page.locator('.settings-form, .subject-card, .stat-card, .auth-card, .timetable-board, .streak-panel').evaluateAll(elements => elements.map(el => getComputedStyle(el).backgroundColor));
        assert.ok(surfaces.every(color => color !== 'rgb(255, 255, 255)'), file + ' has a light surface');
        checks++;
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    for (const file of ['index', 'planner', 'account']) {
      await page.goto('https://revisie.test/' + file + '.html');
      await page.screenshot({ path: '/tmp/revisie-dark-' + file + '.png', fullPage: true });
    }
    await page.goto('https://revisie.test/flashcards.html');
    await page.locator('.subject-card').first().click();
    await page.screenshot({ path: '/tmp/revisie-dark-flashcards.png' });
    assert.equal(await page.locator('.flashcard').evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(32, 44, 37)');
    await page.locator('.flashcard').click();
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.flashcard.answer')).backgroundColor === 'rgb(48, 74, 55)');
    assert.deepEqual(errors, []);
    console.log(`Theme persistence, system changes, cross-tab updates, flashcard faces and ${checks} responsive dark pages passed.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
