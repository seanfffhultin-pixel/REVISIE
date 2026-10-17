// Run with Playwright in NODE_PATH. All requests stay inside this checkout.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
    let layouts = 0;
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme: theme });
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        for (const file of pages) {
          await page.goto(`https://revisie.test/${file}`);
          const state = await page.evaluate(() => {
            const wrap = document.querySelector('.page-wrap');
            const intro = wrap?.querySelector(':scope > .page-intro');
            const title = intro?.querySelector('h1');
            const controls = [...document.querySelectorAll('.library-toolbar .subject-actions > button')];
            return {
              loaded: [...document.styleSheets].some(sheet => sheet.href?.includes('/assets/design-system.css')),
              overflow: document.documentElement.scrollWidth > innerWidth,
              header: !wrap || Boolean(intro),
              titleSize: title && getComputedStyle(title).fontSize,
              titleLineHeight: title && getComputedStyle(title).lineHeight,
              titleX: title?.getBoundingClientRect().x,
              contentX: wrap && wrap.getBoundingClientRect().x + parseFloat(getComputedStyle(wrap).paddingLeft),
              countGap: controls.length && intro?.querySelector('.library-total') ? Math.min(...controls.map(button => button.getBoundingClientRect().top)) - intro.querySelector('.library-total').getBoundingClientRect().bottom : null,
              shortControls: controls.filter(button => button.getBoundingClientRect().height < 43.9).map(button => button.id),
              actionsInIntro: Boolean(intro?.querySelector('.primary-button, .subject-actions')),
              unevenSurfaces: wrap ? [...wrap.querySelectorAll('.streak-panel, .resource-list, .subject-resources')].filter(el => {
                const expected = el.parentElement.getBoundingClientRect();
                const style = getComputedStyle(el.parentElement);
                const width = expected.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                return Math.abs(el.getBoundingClientRect().width - width) > 2;
              }).map(el => el.className) : [],
            };
          });
          assert.equal(state.loaded, true, `${file} missing shared styles`);
          assert.equal(state.overflow, false, `${file} overflows at ${width}/${theme}`);
          assert.equal(state.header, true, `${file} has no shared page header`);
          if (state.titleSize) {
            assert.equal(state.titleSize, width <= 650 ? '34px' : `${Math.min(48, Math.max(34, width * .036))}px`, `${file} has inconsistent title sizing`);
            assert.ok(Math.abs(state.titleX - state.contentX) < 1, `${file} title and content do not align`);
          }
          if (state.countGap !== null) assert.ok(state.countGap >= 20, `${file} places controls next to the count`);
          assert.deepEqual(state.shortControls, [], `${file} has undersized toolbar controls`);
          assert.deepEqual(state.unevenSurfaces, [], `${file} has inconsistent section widths`);
          if (['subjects.html', 'flashcards.html', 'notes.html', 'biology.html', 'mathematics.html', 'history.html', 'psychology.html', 'subject.html'].includes(file)) {
            assert.equal(state.actionsInIntro, false, `${file} mixes actions with the page summary`);
          }
          if (width === 1440) {
            const colors = await page.evaluate(() => {
              const palette = () => ['body', '.sidebar', '.topbar', '.primary-button', '.secondary-button', '.subject-card', '.practice-card', '.library-total'].map(selector => {
                const el = document.querySelector(selector);
                if (!el) return null;
                const style = getComputedStyle(el);
                return [selector, style.color, style.backgroundColor, style.borderColor];
              }).filter(Boolean);
              const link = document.querySelector('link[href*="assets/design-system.css"]');
              const current = palette();
              link.disabled = true;
              const previous = palette();
              link.disabled = false;
              return { current, previous };
            });
            assert.deepEqual(colors.current, colors.previous, `${file} changed the ${theme} palette`);
          }
          if ([390, 1440].includes(width)) await page.screenshot({ path: `/tmp/revisie-design-${file.replace('.html', '')}-${width}-${theme}.png` });
          layouts++;
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(`Design system passed ${layouts} page/theme/viewport checks: shared header alignment, separated actions and counts, readable controls, unchanged colors and responsive layouts.`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
