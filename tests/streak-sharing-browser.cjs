// Run with Playwright available in NODE_PATH: node tests/streak-sharing-browser.cjs
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
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    await context.addInitScript(() => {
      window.shareMode = 'native'; window.sharedCards = [];
      Object.defineProperty(navigator, 'canShare', { value: () => window.shareMode !== 'download', configurable: true });
      Object.defineProperty(navigator, 'share', { value: async data => {
        if (window.shareMode === 'cancel') throw new DOMException('Cancelled', 'AbortError');
        if (window.shareMode === 'error') throw new DOMException('Unavailable', 'NotAllowedError');
        window.sharedCards.push({ name: data.files[0].name, type: data.files[0].type, size: data.files[0].size, text: data.text });
      }, configurable: true });
      const days = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(); date.setDate(date.getDate() - index);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      });
      localStorage.setItem('revisie-streak', JSON.stringify({ version: 2, days }));
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('https://revisie.test/index.html');
    await page.locator('.streak-panel [data-action="share-streak"]').click();
    await page.waitForFunction(() => !document.getElementById('shareStreakCard').disabled);
    const dimensions = await page.locator('#streakSharePreview img').evaluate(async image => { await image.decode(); return [image.naturalWidth, image.naturalHeight]; });
    assert.deepEqual(dimensions, [1080, 1350]);
    assert.match(await page.locator('#streakSharePreview img').getAttribute('alt'), /7-day study streak/);
    await page.screenshot({ path: '/tmp/revisie-streak-share-preview.png' });
    await page.locator('#shareStreakCard').click();
    const shared = await page.evaluate(() => window.sharedCards[0]);
    assert.equal(shared.name, 'revisie-7-day-streak.png'); assert.equal(shared.type, 'image/png'); assert.ok(shared.size > 1000);
    assert.match(shared.text, /7-day study streak/);
    await page.evaluate(() => { window.shareMode = 'cancel'; }); await page.locator('#shareStreakCard').click();
    assert.equal(await page.locator('#shareStreakCard').isEnabled(), true);
    assert.equal(await page.evaluate(() => window.sharedCards.length), 1);
    await page.evaluate(() => { window.shareMode = 'error'; }); await page.locator('#shareStreakCard').click();
    assert.match(await page.locator('#streakShareStatus').innerText(), /Use Download card/);
    await page.evaluate(() => { window.shareMode = 'download'; });
    let pending = page.waitForEvent('download'); await page.locator('#shareStreakCard').click();
    assert.equal((await pending).suggestedFilename(), 'revisie-7-day-streak.png');
    pending = page.waitForEvent('download'); await page.locator('#downloadStreakCard').click();
    assert.equal((await pending).suggestedFilename(), 'revisie-7-day-streak.png');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('.modal-close').click();
    await page.evaluate(() => { localStorage.removeItem('revisie-streak'); refreshStreakSurfaces(); });
    assert.equal(await page.locator('.streak-panel [data-action="share-streak"]').isDisabled(), true);
    await page.evaluate(() => openStreak());
    assert.equal(await page.locator('.modal [data-action="share-streak"]').isDisabled(), true);
    assert.deepEqual(errors, []);
    console.log('Passed mobile preview, PNG generation, native sharing, cancellation, error/retry, fallback download, direct download and empty streak handling.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
