const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    for (const colorScheme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', colorScheme });
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
      await page.locator('#subjectAddTopic').click();
      await page.locator('#topicName').fill('Extra practice topic');
      await page.locator('.modal [type="submit"]').click();
      await page.waitForFunction(() => document.querySelector('#subjectPractice')?.innerText.includes('Extra practice topic'));
      await page.goto('https://revisie.test/multiple-choice.html?subject=biology&topic=Extra%20practice%20topic');
      assert.match(await page.locator('.practice-card').innerText(), /6 multiple-choice/);
      await page.locator('[data-start-subject]').click();
      assert.equal(await page.locator('.practice-option-status').count(), 0);
      await page.locator('input[value="1"]').check();
      assert.equal(await page.locator('.practice-options .is-correct, .practice-options .is-incorrect').count(), 0);
      await page.locator('#practiceAnswer [type="submit"]').click();
      const wrong = page.locator('.practice-options label.is-incorrect'), right = page.locator('.practice-options label.is-correct');
      assert.equal(await wrong.count(), 1); assert.equal(await right.count(), 1);
      assert.match(await wrong.innerText(), /Your answer — incorrect/);
      assert.match(await right.innerText(), /Correct answer/);
      assert.equal(await page.locator('.practice-options input:disabled').count(), 4);
      const colours = await page.locator('.practice-options label.is-correct, .practice-options label.is-incorrect').evaluateAll(labels => Object.fromEntries(labels.map(label => [label.classList.contains('is-correct') ? 'right' : 'wrong', { background: getComputedStyle(label).backgroundColor, border: getComputedStyle(label).borderColor }])));
      assert.equal(colours.right.background, colorScheme === 'light' ? 'rgb(232, 245, 236)' : 'rgb(24, 60, 40)');
      assert.equal(colours.wrong.background, colorScheme === 'light' ? 'rgb(252, 235, 234)' : 'rgb(71, 39, 36)');
      assert.equal(colours.right.border, colorScheme === 'light' ? 'rgb(39, 132, 72)' : 'rgb(103, 188, 132)');
      assert.equal(colours.wrong.border, colorScheme === 'light' ? 'rgb(196, 68, 61)' : 'rgb(230, 140, 133)');
      assert.match(await page.locator('#practiceFeedback').innerText(), /Incorrect/);
      await page.screenshot({ path: `/tmp/revisie-choice-wrong-${colorScheme}.png`, fullPage: true });
      await page.locator('#nextQuestion').click();
      assert.equal(await page.locator('.practice-option-status').count(), 0);
      assert.equal(await page.locator('.practice-options .is-correct, .practice-options .is-incorrect').count(), 0);
      await page.locator('input[value="0"]').check();
      await page.locator('#practiceAnswer [type="submit"]').click();
      assert.equal(await page.locator('.practice-options .is-incorrect').count(), 0);
      assert.equal(await page.locator('.practice-options .is-correct').count(), 1);
      assert.match(await page.locator('.practice-option-status').innerText(), /Correct — your answer/);
      assert.equal(await page.locator('#practiceFeedback .practice-feedback.is-correct').count(), 1);
      await page.screenshot({ path: `/tmp/revisie-choice-right-${colorScheme}.png`, fullPage: true });
      await page.locator('#nextQuestion').click();
      for (let i = 0; i < 4; i++) await page.locator('#skipQuestion').click();
      assert.match(await page.locator('#practiceSession h3').innerText(), /1 \/ 6 correct/);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      assert.deepEqual(errors, []);
      await context.close();
    }
    console.log('Multiple-choice feedback passed: new topic generates six questions, wrong red/correct green, text labels, locked answers, reset, scoring and mobile light/dark colours.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
