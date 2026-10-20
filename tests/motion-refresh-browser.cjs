// Run with Playwright available in NODE_PATH: node tests/motion-refresh-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      await context.addInitScript(() => {
        window.entrances = [];
        document.addEventListener('animationstart', event => {
          if (event.target.closest('.page-wrap') && ['revisie-enter', 'revisie-progress'].includes(event.animationName)) {
            window.entrances.push({ name: event.animationName, page: event.target.matches('.page-wrap'), target: event.target.className });
          }
        });
      });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'revisie.test') return route.abort();
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
        // Let the HTML's entrance finish before JS wraps or replaces the cards.
        if (url.pathname === '/site.js') await new Promise(resolve => setTimeout(resolve, 650));
        return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const file of ['subjects', 'flashcards', 'biology', 'notes', 'folders', 'multiple-choice', 'maths-practice', 'index', 'progress']) {
        await page.goto(`https://revisie.test/${file}.html`);
        await page.waitForTimeout(750);
        const initial = await page.evaluate(() => window.entrances);
        assert.equal(initial.length, 1, `${file}/${width}: entrance should run once: ${JSON.stringify(initial)}`);
        assert.equal(initial[0].page, true, `${file}/${width}: nested content should not animate separately`);
        await page.evaluate(() => {
          refreshWorkspaceMemory();
          refreshSubjectAppearance();
          window.revisieFolders?.refresh();
          window.revisiePractice?.refresh();
        });
        await page.waitForTimeout(750);
        assert.deepEqual(await page.evaluate(() => window.entrances), initial, `${file}/${width}: refresh replayed the entrance`);
      }
      await page.locator('#siteSearch').click();
      assert.equal(await page.locator('.modal').evaluate(el => getComputedStyle(el).animationName), 'revisie-dialog');
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Desktop/mobile page entrances run once, survive delayed setup and workspace refreshes, and preserve dialog motion.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
