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
    assert.ok(Math.abs(sidebarBefore.y - sidebarAfter.y) < 1, 'Sidebar must stay fixed while scrolling (allow subpixel rounding)');

    await goto('progress');
    assert.equal(await page.locator('.stat-icon svg').count(), 3);
    assert.equal(await page.locator('.allocation-panel, #allocationForm').count(), 0);
    assert.deepEqual(await page.locator('.stat-card strong').allTextContents(), ['0', '0', '0 mins']);
    assert.match(await page.locator('.revision-summary').innerText(), /No revision recorded yet/);
    await page.evaluate(() => {
      const unit = getUnits('biology')[0].name;
      saveWorkspaceItem('revisie-topic-progress', JSON.stringify({[`biology::${unit}`]: 2}));
      saveWorkspaceItem('revisie-planner-items', JSON.stringify([
        { id: 1, subject: 'biology', title: 'Biology revision', date: studyDate(), minutes: 30, done: true },
        { id: 2, subject: 'history', title: 'Planned only', date: studyDate(), minutes: 50, done: false },
        { id: 3, subject: 'biology', title: 'Future plan', date: shiftStudyDate(studyDate(), 1), minutes: 25, done: true }
      ]));
      saveWorkspaceItem('revisie-due', JSON.stringify({biology: 99}));
      setupProgressRoute();
    });
    assert.deepEqual(await page.locator('.stat-card strong').allTextContents(), ['2', '1', '30 mins']);
    assert.match(await page.locator('.revision-subject').innerText(), /Biology[\s\S]*2 cards marked known[\s\S]*30 min[\s\S]*1 session complete/);
    await goto('progress');
    assert.deepEqual(await page.locator('.stat-card strong').allTextContents(), ['2', '1', '30 mins']);
    await page.evaluate(() => { localStorage.removeItem('revisie-topic-progress'); localStorage.removeItem('revisie-planner-items'); localStorage.removeItem('revisie-due'); });

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
    await page.locator('#known').click();
    assert.equal(await page.evaluate(() => streakState().current), 1);
    await page.locator('#flashcard').click();
    await page.locator('#again').click();
    assert.equal(await page.evaluate(() => streakState().total), 1, 'Repeated reviews earn one day');
    await page.keyboard.press('Escape');
    await goto('index');
    assert.match(await page.locator('.streak-panel').innerText(), /Today is complete/);
    assert.equal(await page.locator('.streak-panel .week-day.done').count(), 1);
    await goto('progress');
    assert.match(await page.locator('.streak-panel').innerText(), /Best streak\s+1 day/);

    await goto('planner');
    await page.locator('#timetableAdd').click();
    await page.locator('#timetableTitle').fill('Test revision session');
    await page.locator('#timetableSessionForm button').click();
    assert.equal(await page.locator('.session-card').count(), 1);
    assert.equal(await page.locator('.session-card [data-complete-session]').count(), 1);
    await page.locator('[data-complete-session]').focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.session-card.done').count(), 1);
    assert.equal(await page.evaluate(() => streakState().total), 1, 'Planner completion shares the same daily credit');
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
    await goto('index');
    await page.evaluate(() => {
      localStorage.setItem('revisie-streak', JSON.stringify({ current: 7, lastDate: shiftStudyDate(studyDate(), -2) }));
      refreshStreakSurfaces();
    });
    assert.equal(await page.locator('.streak-big').textContent(), '0');
    assert.match(await page.locator('.streak-records').innerText(), /Best streak\s+7 days/);
    await page.evaluate(() => openStreak());
    assert.match(await page.locator('.modal').innerText(), /last streak ended/);
    await page.keyboard.press('Escape');
    const secondTab = await context.newPage();
    await secondTab.goto('https://revisie.test/index.html');
    await secondTab.evaluate(() => markStudyComplete());
    await page.waitForFunction(() => document.querySelector('.streak-big').textContent === '1');
    await secondTab.close();
    await page.reload();
    assert.equal(await page.locator('.streak-big').textContent(), '1');
    assert.deepEqual(errors, [], 'Streak activity must not cause JavaScript errors');
    console.log(`Passed ${layouts} responsive page checks, topbar utility navigation, fixed-sidebar checks, completed revision stats and reload, icons, filters, dialog focus, review cards, planner keyboard controls, mobile navigation, and streak review/planner credit, history, expiry, persistence, and cross-tab updates.`);
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
