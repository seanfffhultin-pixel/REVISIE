const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const goto = file => page.goto(`https://revisie.test/${file}`);
    const badge = pageName => page.locator(`.sidebar [data-page="${pageName}.html"] .nav-count`);
    const expected = { subjects: 10, flashcards: 90, 'multiple-choice': 202, 'short-answer': 90, 'maths-practice': 3, folders: 0, notes: 0, resources: 0, planner: 0 };
    for (const file of fs.readdirSync(root).filter(file => file.endsWith('.html'))) {
      await goto(file);
      if (!await page.locator('.sidebar').count()) continue;
      for (const [name, count] of Object.entries(expected)) {
        assert.equal(await badge(name).count(), 1, `${file}: ${name}`);
        assert.equal(await badge(name).innerText(), String(count), `${file}: ${name}`);
        assert.ok((await badge(name).getAttribute('title')).includes(String(count)));
      }
      const name = file.replace('.html', '');
      if (name in expected) assert.match(await page.locator('.library-total').innerText(), new RegExp(`^${expected[name]} `));
    }
    await goto('notes.html');
    await page.evaluate(() => openNotes('biology'));
    await page.locator('#noteTitle').fill('Counted note');
    await page.locator('#notesText').fill('A saved note.');
    await page.locator('.modal [type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('[data-page="notes.html"] .nav-count').textContent === '1');
    assert.match(await page.locator('.library-total').innerText(), /^1 note in your workspace/);
    await goto('folders.html');
    await page.locator('#newFolder').click();
    await page.locator('#folderName').fill('Counted folder');
    await page.locator('.modal [type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('[data-page="folders.html"] .nav-count').textContent === '1');
    assert.match(await page.locator('.library-total').innerText(), /^1 folder in your workspace/);
    await goto('biology.html');
    await page.locator('#subjectAddCard').click();
    await page.locator('#cardQuestion').fill('A new question for count verification?');
    await page.locator('#cardAnswer').fill('A new saved answer.');
    await page.locator('[name="saveMode"][value="close"]').click();
    assert.equal(await badge('flashcards').innerText(), '91');
    assert.equal(await badge('multiple-choice').innerText(), '204');
    assert.equal(await badge('short-answer').innerText(), '91');
    await goto('multiple-choice.html?subject=biology');
    await page.locator('#newQuiz').click();
    await page.locator('#quizPrompt').fill('A separate multiple-choice question?');
    for (let i = 0; i < 4; i++) await page.locator(`#quizOption${i}`).fill(`Choice ${i}`);
    await page.locator('#quizModel').fill('The first choice is correct.');
    await page.locator('.practice-form [type="submit"]').click();
    assert.equal(await badge('multiple-choice').innerText(), '205');
    assert.match(await page.locator('.library-total').innerText(), /^205 multiple-choice questions/);
    await goto('mathematics.html');
    await page.locator('#subjectAddTopic').click();
    await page.locator('#topicName').fill('A manually added maths topic');
    await page.locator('.modal [type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('[data-page="maths-practice.html"] .nav-count').textContent === '4');
    await goto('planner.html');
    await page.evaluate(() => editPlan());
    await page.locator('#planTitle').fill('An incomplete session');
    await page.locator('.modal [type="submit"]').click();
    assert.equal(await badge('planner').innerText(), '1');
    await page.locator('[data-plan-done]').check();
    assert.equal(await badge('planner').innerText(), '0');
    await page.locator('.modal-close').click();
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/index.html');
    await page.evaluate(() => {
      noteLibrary.push({ id: 999, subject: 'biology', title: 'Another tab note', body: 'Saved text.' });
      saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary));
      resourceLibrary.push({ id: 'test-resource', name: 'Test.pdf', subject: 'biology', size: 1000, savedAt: new Date().toISOString() });
      saveWorkspaceItem('revisie-resources', JSON.stringify(resourceLibrary));
    });
    await sibling.waitForFunction(() => document.querySelector('[data-page="notes.html"] .nav-count').textContent === '2');
    await sibling.waitForFunction(() => document.querySelector('[data-page="resources.html"] .nav-count').textContent === '1');
    await sibling.close();
    await goto('short-answer.html');
    await page.reload();
    assert.equal(await badge('notes').innerText(), '2');
    assert.equal(await badge('resources').innerText(), '1');
    assert.equal(await badge('folders').innerText(), '1');
    assert.equal(await page.locator('.sidebar [data-page="index.html"] .nav-count').count(), 0);
    assert.equal(await page.locator('.sidebar [data-page="progress.html"] .nav-count').count(), 0);
    await page.emulateMedia({ colorScheme: 'dark' });
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Overflow at ${width}`);
      if (width < 650) await page.locator('#mobileMenu').click();
      assert.equal(await page.locator('.sidebar .nav-count').evaluateAll(badges => badges.some(badge => { const rect = badge.getBoundingClientRect(); const sidebar = badge.closest('.sidebar').getBoundingClientRect(); return rect.right > sidebar.right; })), false);
      if (width < 650) await page.keyboard.press('Escape');
    }
    assert.deepEqual(errors, []);
    console.log('Navigation counts passed: every page, matching library totals, creation, completion, derived quizzes, maths topics, folders, notes, resources, cross-tab updates, persistence, dark mode and mobile.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
