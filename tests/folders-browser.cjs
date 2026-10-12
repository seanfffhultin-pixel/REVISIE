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
    await context.addInitScript(() => {
      if (localStorage.getItem('folder-test-seeded')) return;
      localStorage.setItem('folder-test-seeded', '1');
      localStorage.setItem('revisie-note-library', JSON.stringify([{ id: 123, title: 'Cell summary', subject: 'biology', body: 'Cells have membranes.', updatedAt: new Date().toISOString() }]));
      localStorage.setItem('revisie-resources', JSON.stringify([{ id: 'pdf-1', name: 'Exam questions.pdf', subject: 'biology', size: 1000, savedAt: new Date().toISOString(), data: 'data:application/pdf;base64,JVBERi0xLjQ=' }]));
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.install({ time: new Date('2026-10-12T19:00:00Z') });
    const goto = file => page.goto('https://revisie.test/' + file + '.html');
    const records = () => page.evaluate(() => folderRecords());
    await goto('folders');
    assert.match(await page.locator('.folder-empty').innerText(), /Your first folder/);
    await page.locator('#newFolder').click();
    assert.equal(await page.locator('[name="folderColor"]').count(), await page.evaluate(() => subjectColours.length));
    assert.equal(await page.locator('[name="subjectIcon"], [name="subjectEmoji"]').count(), 0);
    await page.locator('#folderName').fill('Biology mock'); await page.locator('.subject-colour-options label[title="teal"]').click();
    assert.match(await page.locator('.subject-appearance-preview .subject-icon').getAttribute('class'), /teal/);
    assert.equal(await page.locator('.subject-appearance-preview [data-lucide="folder"]').count(), 1);
    await page.setViewportSize({ width: 320, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Folder palette fits on mobile');
    await page.screenshot({ path: '/tmp/revisie-folder-customise-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('.modal [type="submit"]').click();
    const id = (await records())[0].id;
    assert.equal((await records())[0].color, 'teal');
    await page.locator('.folder-card-link').click();
    assert.equal(new URL(page.url()).searchParams.get('id'), id);
    assert.equal(await page.locator('#reviewFolder').isDisabled(), true);
    await page.locator('#addFolderMaterial').click();
    const choose = async title => { await page.locator('#folderMaterialSearch').fill(title); await page.locator('.folder-choice:not([hidden]) input').first().check(); };
    await choose('Cell biology'); await choose('Number and algebra'); await choose('Cell summary'); await choose('Exam questions.pdf');
    await page.locator('.modal [type="submit"]').click();
    assert.equal((await records())[0].items.length, 4);
    assert.equal(await page.locator('.folder-content-row').count(), 4);
    await page.locator('.folder-content-open').filter({ hasText: 'Cell summary' }).click();
    assert.match(await page.locator('.note-view').innerText(), /Cells have membranes/);
    await page.keyboard.press('Escape');
    await page.reload(); assert.equal(await page.locator('.folder-content-row').count(), 4);
    await page.locator('#reviewFolder').click();
    const first = await page.locator('#flashcard p').innerText();
    await page.locator('#flashcard').click(); assert.notEqual(await page.locator('#flashcard p').innerText(), first);
    await page.locator('#again').click();
    const second = await page.locator('#flashcard p').innerText(); assert.notEqual(second, first);
    const firstSubject = (await page.locator('.folder-review-source').innerText()).startsWith('Biology') ? 'biology' : 'mathematics';
    await page.clock.fastForward(300000);
    await page.locator('#known').click();
    const resumed = await page.locator('#flashcard p').innerText();
    await page.keyboard.press('Escape'); await goto('index');
    assert.match(await page.locator('.continue-body').innerText(), /Biology mock/);
    await page.locator('#startReview').click();
    assert.equal(await page.locator('#flashcard p').innerText(), resumed);
    assert.match(await page.locator('.flashcard-meta').innerText(), /1 complete/i);
    // Finish the first subject, then study the second: each receives its own minutes.
    const firstLabel = firstSubject === 'biology' ? 'Biology' : 'Mathematics';
    while ((await page.locator('.folder-review-source').innerText()).startsWith(firstLabel)) await page.locator('#known').click();
    await page.clock.fastForward(120000);
    while (await page.locator('#known').count()) await page.locator('#known').click();
    assert.match(await page.locator('.flashcard').innerText(), /Review complete/);
    await page.clock.fastForward(300000);
    const time = await page.evaluate(() => {
      const values = Object.values(flashcardStudyRecords());
      return Object.fromEntries(['biology', 'mathematics'].map(subject => [subject, Math.floor(values.filter(record => record.subject === subject).reduce((total, record) => total + record.milliseconds, 0) / 60000)]));
    });
    assert.deepEqual(time, firstSubject === 'biology' ? { biology: 5, mathematics: 2 } : { biology: 2, mathematics: 5 });
    assert.ok(await page.evaluate(() => topicProgress()['biology::Cell biology'] > 0));
    assert.ok(await page.evaluate(() => topicProgress()['mathematics::Number and algebra'] > 0));
    await page.keyboard.press('Escape');
    await goto('folders');
    await page.locator('#newFolder').click(); await page.locator('#folderName').fill('Second collection'); await page.locator('.modal [type="submit"]').click();
    const secondId = (await records()).find(folder => folder.name === 'Second collection').id;
    // Existing deck, note and PDF menus all offer folder membership.
    await goto('flashcards');
    const deck = page.locator('.topic-card-wrap').filter({ hasText: 'Cell biology' }).first();
    await deck.locator('summary').click(); await deck.locator('[data-folder-item]').click();
    await page.locator('.folder-choice').filter({ hasText: 'Second collection' }).locator('input').check();
    await page.locator('.modal [type="submit"]').click();
    assert.equal((await records()).find(folder => folder.id === secondId).items.length, 1);
    await goto('notes');
    await page.locator('[data-folder-item]').first().click();
    await page.locator('.folder-choice').filter({ hasText: 'Second collection' }).locator('input').check();
    await page.locator('.modal [type="submit"]').click();
    await goto('resources');
    await page.setViewportSize({ width: 320, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'PDF actions fit on mobile');
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-folder-item]').first().click();
    await page.locator('.folder-choice').filter({ hasText: 'Second collection' }).locator('input').check();
    await page.locator('.modal [type="submit"]').click();
    assert.equal((await records()).find(folder => folder.id === secondId).items.length, 3);
    await goto('folders');
    await page.locator('.folder-card').filter({ hasText: 'Biology mock' }).locator('summary').click();
    await page.locator('[data-edit-folder="' + id + '"]').click();
    await page.locator('#folderName').fill('Summer mock'); await page.locator('.subject-colour-options label[title="indigo"]').click(); await page.locator('.modal [type="submit"]').click();
    assert.equal((await records()).find(folder => folder.id === id).name, 'Summer mock');
    assert.equal((await records()).find(folder => folder.id === id).color, 'indigo');
    await page.goto('https://revisie.test/folders.html?id=' + encodeURIComponent(id));
    await page.evaluate(() => { noteLibrary[0].title = 'Updated cell summary'; saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary)); window.revisieFolders.refresh(); });
    assert.match(await page.locator('.folder-content-list').innerText(), /Updated cell summary/);
    // Renaming the source deck preserves folder references.
    await page.evaluate(() => {
      const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
      settings.topicNames = { biology: { 'Cell biology': 'Cell structure' } };
      saveWorkspaceItem('revisie-settings', JSON.stringify(settings)); renameTopicMetadata('biology', 'Cell biology', 'Cell structure'); window.revisieFolders.refresh();
    });
    assert.match(await page.locator('.folder-content-list').innerText(), /Cell structure/);
    await page.evaluate(() => { noteLibrary.splice(0); saveWorkspaceItem('revisie-note-library', '[]'); window.revisieFolders.refresh(); });
    assert.match(await page.locator('.is-unavailable').innerText(), /Unavailable note/);
    await page.locator('.is-unavailable summary').click(); await page.locator('.is-unavailable [data-remove-folder-item]').click();
    assert.equal(await page.locator('.is-unavailable').count(), 0);
    assert.equal((await records()).find(folder => folder.id === secondId).items.length, 3, 'Removing from one folder leaves the other intact');
    // Saving an open picker changes only the links the user actually toggled.
    await page.locator('#addFolderMaterial').click();
    await choose('Geometry and measures');
    await page.evaluate(id => {
      const folders = folderRecords();
      folders.find(folder => folder.id === id).items.push({ type: 'deck', subject: 'biology', unit: 'Organisation and bioenergetics' });
      saveWorkspaceItem('revisie-folders', JSON.stringify(folders));
    }, id);
    await page.locator('.modal [type="submit"]').click();
    const concurrent = (await records()).find(folder => folder.id === id).items;
    assert.ok(concurrent.some(ref => ref.unit === 'Geometry and measures'));
    assert.ok(concurrent.some(ref => ref.unit === 'Organisation and bioenergetics'));
    // Guest PDFs can still open from local file storage after metadata refreshes.
    const pdfUrlWorks = await page.evaluate(async () => {
      delete resourceLibrary[0].data;
      const url = await resourceUrl(resourceLibrary[0]);
      const works = url.startsWith('blob:'); URL.revokeObjectURL(url); return works;
    });
    assert.equal(pdfUrlWorks, true);
    // Responsive folder pages and material picker in both themes.
    for (const colorScheme of ['light', 'dark']) {
      await page.emulateMedia({ colorScheme });
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.locator('#addFolderMaterial').click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.keyboard.press('Escape');
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: '/tmp/revisie-folders-dark.png', fullPage: true });
    // Cross-tab folder deletion refreshes the page without deleting source decks or PDFs.
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/folders.html');
    sibling.on('dialog', dialog => dialog.accept());
    await sibling.locator('.folder-card').filter({ hasText: 'Summer mock' }).locator('summary').click();
    await sibling.locator('[data-delete-folder="' + id + '"]').click();
    await page.waitForFunction(() => document.getElementById('foldersApp').textContent.includes('Folder not found'));
    assert.equal(await page.evaluate(() => resourceLibrary.length), 1);
    assert.ok(await page.evaluate(() => getDeck('biology', 'Cell structure').length > 0));
    await sibling.close();
    await goto('folders');
    assert.equal(await page.locator('.folder-card').count(), 1);
    // A guest with no folders can create one directly from a deck menu.
    await page.evaluate(() => saveWorkspaceItem('revisie-folders', '[]'));
    await goto('flashcards');
    await page.locator('.topic-card-wrap summary').first().click();
    await page.locator('.topic-card-wrap [data-folder-item]').first().click();
    await page.locator('#folderName').fill('Quick collection');
    await page.locator('.modal [type="submit"]').click();
    assert.equal((await records()).length, 1); assert.equal((await records())[0].items.length, 1);
    assert.deepEqual(errors, []);
    console.log('Folder creation/colours/rename, mixed material, multi-folder links, source menus, deleted sources, combined reviews, resume, per-subject study time/progress, eight responsive theme layouts and cross-tab deletion passed.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
