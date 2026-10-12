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
    const goto = file => page.goto('https://revisie.test/' + file + '.html');
    await goto('index');
    assert.equal(await page.locator('#guestTourInvite').isVisible(), true);
    assert.equal(await page.locator('[role="dialog"]').count(), 0);
    await page.locator('#startGuestTour').click();
    assert.equal(await page.locator('#guestTourInvite').isVisible(), false);
    assert.match(await page.locator('#guestTourStep').innerText(), /Your revision workspace/);
    assert.equal(await page.locator('#previousGuestTour').isDisabled(), true);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'guestTourStep');
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), true);
    for (let step = 2; step <= 6; step++) {
      await page.locator('#nextGuestTour').click();
      assert.equal(await page.locator('.guest-tour-progress').getAttribute('value'), String(step));
      assert.ok((await page.locator('.guest-tour-explore').getAttribute('href')).endsWith('.html'));
    }
    await page.locator('#previousGuestTour').click();
    assert.match(await page.locator('#guestTourStep').innerText(), /Plan and track/);
    await page.locator('#nextGuestTour').click();
    assert.equal(await page.locator('#nextGuestTour').innerText(), 'Done');
    await page.screenshot({ path: '/tmp/revisie-guest-tour-dark.png' });
    await page.locator('#nextGuestTour').click();
    assert.equal(await page.locator('[role="dialog"]').count(), 0);
    assert.equal(await page.locator('.app-shell').evaluate(el => el.inert), false);
    await page.reload(); assert.equal(await page.locator('#guestTourInvite').isVisible(), false);
    await goto('help'); await page.locator('#replayGuestTour').click();
    assert.match(await page.locator('#guestTourStep').innerText(), /Your revision workspace/);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'replayGuestTour');
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      for (const width of [1440, 390, 320]) {
        await page.setViewportSize({ width, height: 700 });
        await goto('help'); await page.locator('#replayGuestTour').click();
        for (let step = 1; step <= 6; step++) {
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
          const rect = await page.locator('#nextGuestTour').boundingBox();
          assert.ok(rect.x >= 0 && rect.x + rect.width <= width, 'Tour controls fit');
          await page.locator('#nextGuestTour').click();
        }
      }
    }
    await page.evaluate(() => localStorage.removeItem('revisie-guest-tour-seen'));
    await goto('index');
    await page.locator('#dismissGuestTour').click();
    await page.reload(); assert.equal(await page.locator('#guestTourInvite').isVisible(), false);
    await page.evaluate(() => {
      localStorage.removeItem('revisie-guest-tour-seen');
      localStorage.setItem('revisie-account', JSON.stringify({ id: 'signed-in-test', name: 'Test User' }));
    });
    await page.reload(); assert.equal(await page.locator('#guestTourInvite').isVisible(), false);
    await page.evaluate(() => localStorage.removeItem('revisie-account'));
    await page.reload(); assert.equal(await page.locator('#guestTourInvite').isVisible(), true);
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/index.html');
    await page.locator('#dismissGuestTour').click();
    await sibling.waitForFunction(() => document.getElementById('guestTourInvite').hidden);
    await sibling.close();
    await goto('help'); await page.locator('#replayGuestTour').click();
    await page.locator('#skipGuestTour').click();
    await page.locator('#replayGuestTour').click();
    await page.locator('.modal-close').click();
    assert.equal(await page.locator('[role="dialog"]').count(), 0);
    assert.deepEqual(errors, []);
    console.log('Guest invitation, six tour steps, Back/Next/Done/Skip, replay, focus, persistence, cross-tab dismissal, signed-in exclusion and six responsive theme layouts passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
