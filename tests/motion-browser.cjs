const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light', reducedMotion: 'no-preference' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const reduced = () => page.locator('html').evaluate(el => el.classList.contains('reduce-motion'));
    await page.goto('https://revisie.test/settings.html');
    assert.equal(await reduced(), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.documentElement.classList.contains('reduce-motion'));
    await page.reload();
    assert.equal(await page.locator('#reduceMotion').isChecked(), true);
    await page.locator('#reduceMotion').uncheck();
    await page.locator('#settingsForm [type="submit"]').click();
    assert.equal(await reduced(), false, 'Explicit choice overrides the device default');
    await page.locator('#reduceMotion').check();
    await page.locator('#settingsForm [type="submit"]').click();
    assert.equal(await reduced(), true);
    await page.reload(); assert.equal(await reduced(), true);
    // Check actual effects, including pseudo-elements and smooth scrolling.
    await page.addStyleTag({ content: '.motion-probe { transition: opacity 2s; animation: probe 2s infinite; scroll-behavior: smooth; } .motion-probe::before { content:"test"; transition: transform 2s; animation: probe 2s infinite; } @keyframes probe { to { opacity: .5; } }' });
    await page.evaluate(() => { const probe = document.createElement('div'); probe.className = 'motion-probe'; document.body.appendChild(probe); });
    const effect = await page.locator('.motion-probe').evaluate(el => {
      const style = getComputedStyle(el), pseudo = getComputedStyle(el, '::before');
      return [style.transitionDuration, style.animationName, style.scrollBehavior, pseudo.transitionDuration, pseudo.animationName, getComputedStyle(document.documentElement).scrollBehavior];
    });
    assert.deepEqual(effect, ['0s', 'none', 'auto', '0s', 'none', 'auto']);
    const hover = page.locator('#settingsForm [type="submit"]'); await hover.hover();
    assert.equal(await hover.evaluate(el => getComputedStyle(el).transform), 'none');
    await page.setViewportSize({ width: 390, height: 844 });
    const sidebar = page.locator('.sidebar');
    assert.equal(await sidebar.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.locator('#mobileMenu').click();
    assert.equal(await sidebar.evaluate(el => Math.round(el.getBoundingClientRect().left)), 0);
    await page.keyboard.press('Escape');
    assert.ok(await sidebar.evaluate(el => el.getBoundingClientRect().right < 0));
    await page.evaluate(() => notify('Motion check'));
    assert.equal(await page.locator('#toast').evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    const toast = await page.locator('#toast').boundingBox();
    assert.ok(toast.y >= 0 && toast.y < 844, 'Toast still appears');
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/index.html');
    assert.equal(await sibling.locator('html').evaluate(el => el.classList.contains('reduce-motion')), true);
    await page.locator('#reduceMotion').uncheck(); await page.locator('#settingsForm [type="submit"]').click();
    await sibling.waitForFunction(() => !document.documentElement.classList.contains('reduce-motion'));
    assert.notEqual(await sidebar.evaluate(el => getComputedStyle(el).transitionDuration), '0s');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    assert.equal(await reduced(), false);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await reduced(), false, 'Explicit disabled preference persists across system changes');
    await page.reload(); assert.equal(await reduced(), false);
    await sibling.close();
    assert.deepEqual(errors, []);
    console.log('Saved/system motion preferences, real transition/animation/pseudo-element/scroll suppression, hover positioning, mobile menu, toast visibility and cross-tab changes passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
