// Run with Playwright available in NODE_PATH: node tests/personalization-browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', viewport: { width: 1440, height: 1000 } });
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'revisie.test') return route.abort();
      const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const goto = file => page.goto(`https://revisie.test/${file}.html`);
    const openSubjectOptions = async key => page.locator(`[data-subject-card="${key}"]`).locator('..').locator('.item-actions > summary').click();
    await goto('subjects');
    await openSubjectOptions('biology');
    await page.locator('[data-subject-appearance="biology"]').click();
    assert.equal(await page.locator('[name="subjectColor"]').count(), 20);
    await page.locator('.subject-colour-options label[title="teal"]').click();
    await page.locator('#subjectEmoji').fill('hello');
    assert.equal(await page.locator('#subjectEmoji').evaluate(el => el.checkValidity()), false);
    await page.locator('#subjectEmoji').fill('👩🏽‍🔬');
    assert.equal(await page.locator('#subjectEmoji').evaluate(el => el.checkValidity()), true);
    assert.equal(await page.locator('.subject-appearance-preview .subject-emoji').innerText(), '👩🏽‍🔬');
    await page.locator('.modal [type="submit"]').click();
    await page.reload();
    assert.equal(await page.locator('[data-subject-card="biology"] .subject-icon.teal .subject-emoji').innerText(), '👩🏽‍🔬');
    await goto('index');
    assert.equal(await page.locator('a[href="biology.html"] .subject-emoji').innerText(), '👩🏽‍🔬');
    await goto('biology');
    assert.equal(await page.locator('.subject-grid .subject-emoji').count(), 3);
    const topic = await page.locator('[data-delete-topic]').first().getAttribute('data-delete-topic');
    assert.equal(await page.locator('[data-delete-topic]:visible').count(), 0);
    await page.locator('.topic-actions summary').first().click();
    page.once('dialog', dialog => dialog.dismiss());
    await page.locator('[data-delete-topic]:visible').click();
    assert.equal(await page.locator('.topic-card-wrap').count(), 3);
    // Removing a default topic also removes its personal cards and review metadata.
    await page.evaluate(topic => {
      userCards.push({subject:'biology', unit:topic, question:'Personal question', answer:'Answer'});
      saveWorkspaceItem('revisie-flashcards', JSON.stringify(userCards));
      saveWorkspaceItem('revisie-due', JSON.stringify({['biology::' + topic]: 5}));
    }, topic);
    await page.locator('.topic-actions summary').first().click();
    page.once('dialog', dialog => dialog.accept());
    await page.locator('[data-delete-topic]:visible').click();
    assert.equal(await page.locator('.topic-card-wrap').count(), 2);
    assert.equal(await page.evaluate(topic => getDeck('biology', topic).length, topic), 0);
    assert.equal(await page.evaluate(() => userCards.length), 0);
    await page.reload();
    assert.equal(await page.locator('.topic-card-wrap').count(), 2);
    await goto('flashcards');
    assert.equal(await page.locator('[data-subject="biology"]').filter({has:page.locator('small', {hasText:topic})}).count(), 0);
    const libraryTopic = page.locator('.topic-card-wrap').filter({has:page.locator('[data-subject="biology"]')}).first();
    await libraryTopic.locator('summary').click();
    page.once('dialog', dialog => dialog.accept());
    await libraryTopic.locator('[data-delete-topic]').click();
    assert.equal(await page.locator('[data-action="unit-review"][data-subject="biology"]').count(), 1);
    // Deleting the last topic leaves a usable card composer.
    await goto('biology');
    while (await page.locator('.topic-card-wrap').count()) {
      await page.locator('.topic-actions summary').first().click();
      page.once('dialog', dialog => dialog.accept());
      await page.locator('[data-delete-topic]:visible').click();
    }
    assert.match(await page.locator('.subject-grid').innerText(), /No topics yet/);
    await page.reload(); await page.locator('#subjectAddCard').click();
    assert.equal(await page.locator('#cardUnit').inputValue(), '__new__');
    await page.locator('#cardNewTopic').fill('Fresh topic');
    await page.locator('#cardQuestion').fill('Fresh question');
    await page.locator('#cardAnswer').fill('Fresh answer');
    await page.locator('[name="saveMode"][value="close"]').click();
    assert.equal(await page.evaluate(() => getUnits('biology').length), 1);
    // Icon selection clears an emoji, while suggestions and flags also save correctly.
    await goto('subjects'); await openSubjectOptions('biology');
    await page.locator('[data-subject-appearance="biology"]').click();
    await page.locator('.subject-symbol-options label[title="leaf"]').click();
    assert.equal(await page.locator('#subjectEmoji').inputValue(), '');
    await page.locator('[data-subject-emoji="🧬"]').click();
    assert.equal(await page.locator('.subject-appearance-preview .subject-emoji').innerText(), '🧬');
    await page.locator('#subjectEmoji').fill('🇬🇧');
    assert.equal(await page.locator('#subjectEmoji').evaluate(el => el.checkValidity()), true);
    await page.setViewportSize({width:320,height:740});
    for (const selector of ['.subject-colour-options', '.subject-symbol-options', '.subject-emoji-label', '.subject-emoji-options']) {
      const rect=await page.locator(selector).boundingBox();
      assert.ok(rect.x>=0 && rect.x+rect.width<=320, `${selector} fits mobile`);
    }
    await page.screenshot({path:'/tmp/revisie-emoji-mobile.png', fullPage:true});
    await page.locator('.modal [type="submit"]').click();
    await page.setViewportSize({width:1440,height:1000});
    // A default subject can be deleted through the same menu and stays gone everywhere.
    await openSubjectOptions('biology');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('[data-delete-subject]:visible').click();
    assert.equal(await page.locator('[data-subject-card="biology"]').count(), 0);
    await page.reload();
    assert.equal(await page.locator('[data-subject-card="biology"]').count(), 0);
    await goto('index'); assert.equal(await page.locator('a[href="biology.html"]').count(), 0);
    await goto('biology'); assert.match(await page.locator('h1').innerText(), /Subject deleted/);
    await goto('flashcards'); assert.equal(await page.locator('[data-subject="biology"]').count(), 0);
    await page.locator('#addFlashcard').click();
    assert.equal(await page.locator('#cardSubject option[value="biology"]').count(), 0);
    await page.keyboard.press('Escape');
    // All subjects can be removed without breaking overview, settings, or creation.
    await goto('subjects');
    await page.evaluate(() => { window.confirm=()=>true; subjectEntries().map(([key])=>key).forEach(deleteSubject); });
    await page.reload(); assert.equal(await page.locator('[data-subject-card]').count(), 0);
    await goto('index'); assert.match(await page.locator('#startReview').innerText(), /Add a subject/);
    await goto('settings');
    await goto('flashcards'); await page.locator('#addFlashcard').click();
    assert.match(await page.locator('.modal').innerText(), /Add a subject first/);
    assert.deepEqual(errors, [], 'No browser errors');
    console.log('Passed default subject/topic deletion, persistence, personal card cleanup, empty workspaces, 20 colours, compound/flag emoji, icon switching, and mobile appearance layout.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
