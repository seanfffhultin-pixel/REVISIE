// Run with Playwright available in NODE_PATH: node tests/ui-browser.cjs
// All page assets are served from this checkout; external services are blocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      const contentType = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)];
      return route.fulfill({ path: file, contentType });
    });
    await context.addInitScript(() => {
      if (localStorage.getItem('ui-test-seeded')) return;
      localStorage.setItem('ui-test-seeded', '1');
      localStorage.setItem('revisie-subjects', JSON.stringify([{ name: 'Personal subject with a longer name', topic: 'Personal topic' }]));
      localStorage.setItem('revisie-topics', JSON.stringify({ biology: [{ name: 'Personal biology topic', cards: [] }] }));
      localStorage.setItem('revisie-note-library', JSON.stringify([{ id: 1, title: 'A long note title '.repeat(10), subject: 'biology', body: 'Summary '.repeat(40) }]));
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const goto = (file) => page.goto(`https://revisie.test/${file}.html`);
    const pages = fs.readdirSync(root).filter((file) => file.endsWith('.html'));
    let layouts = 0;
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of pages) {
        await goto(file.replace('.html', ''));
        const state = await page.evaluate(() => {
          const visible = (element) => element.getClientRects().length;
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            outside: [...document.querySelectorAll('.page-wrap *, .auth-card *, .topbar *')].filter((element) => {
              const rect = element.getBoundingClientRect();
              return visible(element) && (rect.right > innerWidth + 1 || rect.left < -1);
            }).map((element) => element.className || element.tagName),
            missingIcons: document.querySelectorAll('[data-lucide]:not(svg)').length,
            placeholders: document.body.innerText.includes('${icon'),
            hasSidebarFooter: !!document.querySelector('.sidebar-bottom'),
            hasTopbar: !!document.querySelector('.topbar'),
            utilityLinks: [...document.querySelectorAll('.top-actions .topbar-link')].map(link => link.getAttribute('href')),
            toastVisible: getComputedStyle(document.querySelector('.toast')).visibility !== 'hidden',
          };
        });
        assert.equal(state.overflow, false, `${file} at ${width}px has horizontal overflow`);
        assert.deepEqual(state.outside, [], `${file} at ${width}px clips content`);
        assert.equal(state.missingIcons, 0, `${file} has unrendered icons`);
        assert.equal(state.placeholders, false, `${file} shows template placeholders`);
        assert.equal(state.toastVisible, false, `${file} shows an empty toast`);
        assert.equal(state.hasSidebarFooter, false, `${file} retains the old workspace footer`);
        if (state.hasTopbar) assert.deepEqual(state.utilityLinks, ['help.html', 'settings.html']);
        layouts += 1;
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await goto('index');
    const sidebarBefore = await page.locator('.sidebar').boundingBox();
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
    const sidebarAfter = await page.locator('.sidebar').boundingBox();
    assert.equal(sidebarBefore.y, sidebarAfter.y, 'Sidebar must stay fixed while scrolling');

    await goto('progress');
    assert.equal(await page.locator('.stat-icon svg').count(), 3);
    await page.locator('#allocationMinutes').fill('50');
    await page.locator('#allocationSubject').selectOption('biology');
    await page.locator('#allocationCards').fill('12');
    assert.equal(await page.locator('#allocationForm').evaluate(form => form.checkValidity()), true);
    await page.locator('#allocationForm button').click();
    await page.waitForFunction(() => document.querySelector('.stat-card strong')?.textContent === '12', null, { timeout: 3000 });
    assert.deepEqual(await page.locator('.stat-card strong').allTextContents(), ['12', '50 mins', '1']);
    assert.match(await page.locator('.allocation-list').innerText(), /Biology\s+12 cards/);
    await page.locator('#allocationSubject').selectOption('german');
    assert.equal(await page.locator('#allocationCards').inputValue(), '0');
    await goto('progress');
    assert.deepEqual(await page.locator('.stat-card strong').allTextContents(), ['12', '50 mins', '1']);

    await goto('subjects');
    await page.locator('[data-filter="science"]').click();
    assert.equal(await page.locator('.custom-subject-wrap:visible').count(), 0);
    assert.equal(await page.locator('[data-subject-card]:visible').count(), 3);
    await page.locator('[data-filter="all"]').click();
    assert.equal(await page.locator('.custom-subject-wrap:visible').count(), 1);

    await goto('biology');
    await page.locator('#subjectAddCard').click();
    assert.equal(await page.evaluate(() => document.querySelector('.app-shell').inert), true);
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('.modal')), true);
    await page.locator('.modal-close').focus();
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('.modal')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.modal').count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.id), 'subjectAddCard');
    await page.locator('[data-action="unit-review"]').first().click();
    await page.locator('#flashcard').click();
    assert.equal(await page.locator('#flashcard').getAttribute('class'), 'flashcard answer');
    await page.keyboard.press('Escape');

    await goto('planner');
    await page.locator('#timetableAdd').click();
    await page.locator('#timetableTitle').fill('Test revision session');
    await page.locator('#timetableSessionForm button').click();
    assert.equal(await page.locator('.session-card').count(), 1);
    assert.equal(await page.locator('.session-card [data-complete-session]').count(), 1);
    await page.locator('[data-complete-session]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.session-card.done').count(), 1);
    assert.equal(await page.locator('.modal').count(), 0, 'Completing a session must not open the slot editor');
    await page.locator('.session-card').focus();
    await page.keyboard.press('Enter');
    assert.match(await page.locator('.modal-header').innerText(), /Edit timetable session/);
    await page.keyboard.press('Escape');

    await page.setViewportSize({ width: 390, height: 650 });
    await goto('biology');
    await page.locator('#mobileMenu').click();
    assert.equal(await page.locator('#mobileMenu').getAttribute('aria-expanded'), 'true');
    assert.equal(await page.evaluate(() => !!document.activeElement.closest('.sidebar')), true);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#mobileMenu').getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.querySelector('.main-content').inert), false);
    await page.locator('#mobileMenu').click();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForFunction(() => !document.body.classList.contains('mobile-menu-open'));
    assert.equal(await page.evaluate(() => document.querySelector('.main-content').inert), false);
    assert.deepEqual(errors, [], 'No JavaScript errors should occur');
    await page.locator('.top-actions a[href="help.html"]').click();
    assert.match(page.url(), /help\.html$/);
    assert.equal(await page.locator('.top-actions a[href="help.html"]').getAttribute('aria-current'), 'page');
    await page.locator('.top-actions a[href="settings.html"]').click();
    assert.match(page.url(), /settings\.html$/);
    assert.equal(await page.locator('.top-actions a[href="settings.html"]').getAttribute('aria-current'), 'page');
    console.log(`Passed ${layouts} responsive page checks, topbar utility navigation, fixed-sidebar checks, progress save/reload, icons, filters, dialog focus, review cards, planner keyboard controls, and mobile navigation.`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
