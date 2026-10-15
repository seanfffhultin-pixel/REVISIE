const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', timezoneId: 'America/Los_Angeles' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-15T12:00:00Z') });
    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
      await page.goto(`https://revisie.test/${file}`);
      const logos = await page.locator('.brand-logo img, .auth-logo img').evaluateAll(images => images.map(image => ({ src: image.getAttribute('src'), alt: image.alt })));
      for (const logo of logos) { assert.match(logo.src, /revisie-logo-black-history/); assert.match(logo.alt, /Black History Month/); }
      assert.equal(await page.locator('html').getAttribute('data-brand-season'), 'black-history');
    }
    for (const [date, asset, season] of [
      ['2026-01-15T12:00:00Z', 'assets/revisie-logo.png?v=2', 'standard'],
      ['2026-06-15T12:00:00Z', 'assets/revisie-logo-pride.png?v=1', 'pride'],
      ['2026-10-15T12:00:00Z', 'assets/revisie-logo-black-history.png?v=1', 'black-history'],
    ]) {
      await page.clock.setFixedTime(new Date(date));
      for (const colorScheme of ['light', 'dark']) {
        await page.emulateMedia({ colorScheme });
        for (const file of ['index.html', 'account.html']) {
          await page.goto(`https://revisie.test/${file}`);
          const logo = page.locator('.brand-logo img, .auth-logo img').first();
          const darkAsset = { standard: 'assets/revisie-logo-dark.png?v=2', pride: 'assets/revisie-logo-pride-dark.png?v=2', 'black-history': 'assets/revisie-logo-black-history-dark.png?v=2' }[season];
          assert.equal(await logo.getAttribute('src'), colorScheme === 'dark' ? darkAsset : asset);
          await logo.evaluate(image => image.decode());
          const style = await logo.evaluate(image => ({ filter: getComputedStyle(image).filter, background: getComputedStyle(image).backgroundColor }));
          assert.equal(style.filter, 'none'); assert.equal(style.background, 'rgba(0, 0, 0, 0)');
          if (file === 'index.html' && colorScheme === 'dark' && season !== 'standard') await page.screenshot({ path: `/tmp/revisie-${season}-logo.png` });
        }
      }
    }
    // Theme changes replace the image immediately, including saved preferences and other tabs.
    await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
    await page.goto('https://revisie.test/settings.html');
    await page.locator('#appearance').selectOption('light');
    await page.locator('#settingsForm [type="submit"]').click();
    assert.equal(await page.locator('.brand-logo img').getAttribute('src'), 'assets/revisie-logo-black-history.png?v=1');
    await page.locator('#appearance').selectOption('dark');
    await page.locator('#settingsForm [type="submit"]').click();
    assert.equal(await page.locator('.brand-logo img').getAttribute('src'), 'assets/revisie-logo-black-history-dark.png?v=2');
    await page.emulateMedia({ colorScheme: 'light' });
    assert.equal(await page.locator('.brand-logo img').getAttribute('src'), 'assets/revisie-logo-black-history-dark.png?v=2');
    await page.locator('#appearance').selectOption('system');
    await page.locator('#settingsForm [type="submit"]').click();
    assert.equal(await page.locator('.brand-logo img').getAttribute('src'), 'assets/revisie-logo-black-history.png?v=1');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForFunction(() => document.querySelector('.brand-logo img').getAttribute('src') === 'assets/revisie-logo-black-history-dark.png?v=2');
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/index.html');
    await page.locator('#appearance').selectOption('light');
    await page.locator('#settingsForm [type="submit"]').click();
    await sibling.waitForFunction(() => document.querySelector('.brand-logo img').getAttribute('src') === 'assets/revisie-logo-black-history.png?v=1');
    await sibling.close();
    await page.locator('#appearance').selectOption('system');
    await page.locator('#settingsForm [type="submit"]').click();
    await page.emulateMedia({ colorScheme: 'light' });
    // A page left open switches automatically, following London rather than Los Angeles.
    await page.clock.setFixedTime(new Date('2026-05-31T22:59:30Z'));
    await page.goto('https://revisie.test/index.html');
    assert.equal(await page.locator('html').getAttribute('data-brand-season'), 'standard');
    await page.clock.setFixedTime(new Date('2026-05-31T23:00:01Z'));
    await page.clock.runFor(60000);
    assert.equal(await page.locator('html').getAttribute('data-brand-season'), 'pride');
    await page.clock.setFixedTime(new Date('2026-06-30T23:00:01Z'));
    await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
    assert.equal(await page.locator('html').getAttribute('data-brand-season'), 'standard');
    await page.clock.setFixedTime(new Date('2026-09-30T23:00:01Z'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    assert.equal(await page.locator('html').getAttribute('data-brand-season'), 'black-history');
    const share = await page.evaluate(async () => { const canvas = await drawStreakShareCard({ current: 3, best: 3, total: 3 }); const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png')); return { type: blob.type, size: blob.size }; });
    assert.equal(share.type, 'image/png'); assert.ok(share.size > 1000);
    assert.deepEqual(errors, []);
    console.log('Seasonal branding passed: every page, all six artworks, no filters/backing, live theme changes, saved/system settings, cross-tab updates, UK month boundaries, account logos and streak images.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
