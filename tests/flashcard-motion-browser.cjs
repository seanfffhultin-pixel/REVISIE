const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  try {
    for (const [width, theme] of [[1440, 'light'], [390, 'dark']]) {
      const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'no-preference' });
      await context.addInitScript(theme => localStorage.setItem('revisie-settings', JSON.stringify({ theme })), theme);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'revisie.test') return route.abort();
        const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
        return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
      });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto('https://revisie.test/biology.html');
      await page.locator('[data-action="unit-review"]').first().click();
      await page.waitForTimeout(350);
      const first = await page.locator('#flashcard p').innerText();
      await page.evaluate(() => {
        window.reviewBackdrop = document.querySelector('.modal-backdrop');
        window.reviewCard = document.querySelector('#flashcard');
        window.reviewAnimations = [];
        window.reviewBackdrop.addEventListener('animationstart', event => window.reviewAnimations.push(event.animationName));
      });
      await page.locator('#flashcard').click();
      await page.waitForTimeout(350);
      assert.notEqual(await page.locator('#flashcard p').innerText(), first);
      assert.deepEqual(await page.evaluate(() => window.reviewAnimations), ['revisie-answer']);
      await page.evaluate(() => { window.reviewAnimations.length = 0; });
      await page.locator('#again').click();
      await page.waitForTimeout(350);
      assert.notEqual(await page.locator('#flashcard p').innerText(), first);
      assert.equal(await page.locator('#again').evaluate(el => el === document.activeElement), true);
      await page.locator('#flashcard').click();
      await page.waitForTimeout(350);
      await page.evaluate(() => { window.reviewAnimations.length = 0; });
      await page.locator('#known').click();
      await page.waitForTimeout(350);
      assert.equal(await page.locator('#known').evaluate(el => el === document.activeElement), true);
      assert.match(await page.locator('.flashcard-meta').innerText(), /1 complete/i);
      assert.equal(await page.evaluate(() => window.reviewBackdrop === document.querySelector('.modal-backdrop') && window.reviewCard === document.querySelector('#flashcard')), true);
      assert.deepEqual(await page.evaluate(() => window.reviewAnimations), [], 'Advancing should not animate the dialog or question');
      while (await page.locator('#known').count()) await page.locator('#known').click();
      await page.waitForTimeout(350);
      assert.equal(await page.evaluate(() => window.reviewBackdrop === document.querySelector('.modal-backdrop') && flashcardStudySession === null), true);
      assert.match(await page.locator('.modal-body').innerText(), /All cards marked known/i);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('.modal-backdrop').count(), 0);
      assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), false);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Flashcard grading preserves the dialog/card, keyboard focus and queue without replaying animations; reveal and completion still work on desktop/mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
