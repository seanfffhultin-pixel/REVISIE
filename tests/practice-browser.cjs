// NODE_PATH=/tmp/revisie-practice-qa/node_modules node tests/practice-browser.cjs
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
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({ status: 404, body: 'Missing asset' });
      return route.fulfill({ path: file, contentType: { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' }[path.extname(file)] });
    });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const goto = file => page.goto(`https://revisie.test/${file}`);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const file of ['multiple-choice.html', 'short-answer.html', 'maths-practice.html', 'mathematics.html', 'biology.html', 'subject.html?name=Chemistry']) {
        await goto(file);
        assert.equal(await page.locator('.sidebar [data-page="multiple-choice.html"]').count(), 1);
        assert.equal(await page.locator('.sidebar [data-page="short-answer.html"]').count(), 1);
        assert.equal(await page.locator('.sidebar [data-page="maths-practice.html"]').count(), 1);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${file} overflows at ${width}`);
        assert.equal(await page.locator('[data-lucide]:not(svg)').count(), 0);
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await goto('mathematics.html');
    assert.equal(await page.locator('#subjectPractice a[href="maths-practice.html"]').count(), 1);
    assert.equal(await page.locator('.practice-topic-links a').count(), 9);
    await goto('biology.html');
    assert.equal(await page.locator('#subjectPractice a[href="maths-practice.html"]').count(), 0);
    await page.locator('.practice-topic-links a').first().click();
    await page.waitForLoadState();
    assert.equal(await page.locator('.practice-card').count(), 1);
    assert.equal(await page.locator('#practiceSubject').inputValue(), 'biology');
    await page.locator('[data-start-subject]').click();
    for (let i = 0; i < 7; i++) {
      const fromCard = (await page.locator('#practiceSession').innerText()).includes('Flashcard match:');
      await page.locator(`input[value="${fromCard ? 0 : 1}"]`).check();
      await page.locator('#practiceAnswer [type="submit"]').click();
      assert.match(await page.locator('#practiceFeedback').innerText(), /Correct/);
      await page.locator('#nextQuestion').click();
    }
    assert.match(await page.locator('#practiceSession h3').innerText(), /7 \/ 7/);
    await page.locator('#finishPractice').click();
    await page.reload();
    assert.match(await page.locator('.practice-history').innerText(), /7\/7/);

    await goto('short-answer.html?subject=biology&topic=Cell%20biology');
    await page.locator('[data-start-subject]').click();
    for (let i = 0; i < 3; i++) {
      await page.locator('#writtenAnswer').fill('My own explanation <script>unsafe</script>');
      await page.locator('#practiceAnswer [type="submit"]').click();
      await page.locator(i === 1 ? '#markAgain' : '#markCorrect').click();
    }
    assert.match(await page.locator('#practiceSession h3').innerText(), /2 \/ 3 self-marked/);
    assert.equal(await page.locator('#practiceSession script').count(), 0);
    await page.locator('#finishPractice').click();

    await goto('multiple-choice.html?subject=biology');
    await page.locator('#newQuiz').click();
    await page.locator('#quizPrompt').fill('Custom <b>question</b>');
    for (let i = 0; i < 4; i++) await page.locator(`#quizOption${i}`).fill(`Answer ${i + 1}`);
    await page.locator('#quizCorrect').selectOption('2');
    await page.locator('#quizModel').fill('The third option is correct.');
    await page.locator('.practice-form [type="submit"]').click();
    await page.reload();
    assert.match(await page.locator('.practice-card').first().innerText(), /8 multiple-choice/);
    await page.locator('[data-manage-subject]').first().click();
    assert.match(await page.locator('.practice-manage').innerText(), /Custom <b>question<\/b>/);
    assert.equal(await page.locator('.practice-manage b').count(), 0);
    await page.locator('[data-edit]').click();
    await page.locator('#quizPrompt').fill('Edited question');
    await page.locator('.practice-form [type="submit"]').click();

    // Renaming built-in topics keeps both starter and personal questions reachable.
    await goto('biology.html');
    await page.evaluate(() => editTopic('biology', 'Cell biology'));
    await page.locator('#topicName').fill('Cells renamed');
    await page.locator('.modal [type="submit"]').click();
    assert.match(await page.locator('#subjectPractice').innerText(), /Cells renamed/);
    await goto('multiple-choice.html?subject=biology&topic=Cells%20renamed');
    assert.match(await page.locator('.practice-card').innerText(), /8 multiple-choice/);

    // Personal topics refresh immediately, and their questions follow renames/deletes.
    await goto('biology.html');
    await page.locator('#subjectAddTopic').click();
    await page.locator('#topicName').fill('My quiz topic');
    await page.locator('.modal [type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#subjectPractice')?.innerText.includes('My quiz topic'));
    await goto('short-answer.html?subject=biology&topic=My%20quiz%20topic');
    await page.locator('#newQuiz').click();
    await page.locator('#quizPrompt').fill('Explain this topic.');
    await page.locator('#quizModel').fill('A specific model answer.');
    await page.locator('.practice-form [type="submit"]').click();
    await goto('biology.html');
    await page.evaluate(() => editTopic('biology', 'My quiz topic'));
    await page.locator('#topicName').fill('My renamed quiz topic');
    await page.locator('.modal [type="submit"]').click();
    await goto('short-answer.html?subject=biology&topic=My%20renamed%20quiz%20topic');
    assert.match(await page.locator('.practice-card').innerText(), /4 short-answer/);
    await goto('biology.html');
    page.once('dialog', dialog => dialog.accept());
    await page.evaluate(() => deleteTopic('biology', 'My renamed quiz topic'));
    assert.ok(!(await page.locator('#subjectPractice').innerText()).includes('My renamed quiz topic'));
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('revisie-quiz-questions')).filter(q => q.unit === 'My renamed quiz topic').length), 0);

    await goto('maths-practice.html');
    assert.equal(await page.locator('[data-maths-topic]').count(), 12);
    await page.locator('#mathsCategory').selectOption('Algebra');
    assert.equal(await page.locator('[data-maths-topic]').count(), 3);
    await page.locator('[data-maths-topic="linear"]').click();
    await page.locator('#writtenAnswer').fill('not a number');
    await page.locator('#practiceAnswer [type="submit"]').click();
    assert.equal(await page.locator('#writtenAnswer').evaluate(el => el.validity.customError), true);
    const prompts = new Set();
    for (let i = 0; i < 10; i++) {
      const prompt = await page.locator('#practiceSession h3').innerText(); prompts.add(prompt);
      const [a, b, c] = prompt.match(/-?\d+/g).map(Number);
      const answer = prompt.startsWith('A number') ? (c - b) * a : prompt.includes('−') ? (c + b) / a : (c - b) / a;
      await page.locator('#writtenAnswer').fill(String(answer));
      await page.locator('#practiceAnswer [type="submit"]').click();
      assert.match(await page.locator('#practiceFeedback').innerText(), /Correct/);
      await page.locator('#nextQuestion').click();
    }
    assert.equal(prompts.size, 10);
    assert.match(await page.locator('#practiceSession h3').innerText(), /10 \/ 10/);
    await page.locator('#finishPractice').click();
    assert.match(await page.locator('.practice-history').innerText(), /10\/10/);
    const attempts = await page.evaluate(() => JSON.parse(localStorage.getItem('revisie-quiz-attempts')));
    assert.equal(attempts.length, 3);
    assert.deepEqual(attempts.map(a => a.mode), ['choice', 'short', 'maths']);

    // Generate a prompt, preview a mixed response, select questions and import safely.
    await goto('multiple-choice.html?subject=chemistry&topic=Atomic%20structure%20and%20the%20periodic%20table');
    await page.evaluate(() => {
      noteLibrary.push({ id: 'source-note', subject: 'chemistry', title: 'Atom notes', body: 'The nucleus contains protons and neutrons.' });
    });
    await page.locator('#generateQuiz').click();
    await page.locator('#generateMode').selectOption('mixed');
    await page.locator('#generateNote').selectOption('0');
    const prompt = await page.locator('#generatedQuizPrompt').inputValue();
    for (const text of ['Chemistry', 'Atomic structure', 'multiple_choice', 'short_answer', 'The nucleus contains protons and neutrons.']) assert.ok(prompt.includes(text), text);
    await page.evaluate(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.copiedQuizPrompt = text; } } }));
    await page.locator('#copyQuizPrompt').click();
    assert.equal(await page.evaluate(() => window.copiedQuizPrompt), prompt);
    const imported = [
      { type: 'multiple_choice', question: 'Which particle has a negative charge?', options: ['Proton', 'Neutron', 'Electron', 'Alpha particle'], correctIndex: 2, answer: 'An electron has a relative charge of −1.' },
      { type: 'short_answer', question: 'Describe the contents of the nucleus. <script>unsafe</script>', answer: 'The nucleus contains protons and neutrons.' },
      { type: 'short_answer', question: 'This question should be excluded.', answer: 'Excluded model answer.' },
    ];
    await page.locator('#generatedQuizResponse').fill('not JSON');
    await page.locator('#previewQuizImport').click();
    assert.match(await page.locator('#quizImportError').innerText(), /not valid JSON/);
    assert.equal(await page.locator('#saveQuizImport').isDisabled(), true);
    await page.locator('#generatedQuizResponse').fill(JSON.stringify([...imported, imported[0]]));
    await page.locator('#previewQuizImport').click();
    assert.match(await page.locator('#quizImportPreview').innerText(), /3 new questions · 1 duplicate skipped/);
    assert.equal(await page.locator('#quizImportPreview script').count(), 0);
    await page.setViewportSize({ width: 320, height: 800 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: '/tmp/revisie-quiz-import-mobile.png', fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.locator('[data-include-quiz="2"]').uncheck();
    assert.equal(await page.locator('#saveQuizImport').innerText(), 'Save 2 questions');
    await page.locator('#saveQuizImport').click();
    assert.equal(await page.locator('.modal').count(), 0);
    assert.match(await page.locator('.practice-card').innerText(), /8 multiple-choice/);
    await page.reload();
    await page.locator('#generateQuiz').click();
    await page.locator('#generateMode').selectOption('mixed');
    await page.locator('#generatedQuizResponse').fill(JSON.stringify(imported.slice(0, 2)));
    await page.locator('#previewQuizImport').click();
    assert.match(await page.locator('#quizImportPreview').innerText(), /0 new questions · 2 duplicates skipped/);
    assert.equal(await page.locator('#saveQuizImport').isDisabled(), true);
    await page.locator('#generateTopic').selectOption('Bonding and quantitative chemistry');
    assert.equal(await page.locator('#quizImportPreview').innerText(), '');
    await page.locator('.modal-close').click();
    await goto('short-answer.html?subject=chemistry&topic=Atomic%20structure%20and%20the%20periodic%20table');
    assert.match(await page.locator('.practice-card').innerText(), /4 short-answer/);
    await page.locator('[data-manage-subject]').click();
    assert.match(await page.locator('.practice-manage').innerText(), /Describe the contents/);
    await page.locator('[data-edit]').click();
    await page.locator('#quizPrompt').fill('Describe the contents of the nucleus.');
    await page.locator('.practice-form [type="submit"]').click();

    // Cross-tab additions refresh the library without replacing an active session.
    const sibling = await context.newPage();
    await sibling.goto('https://revisie.test/multiple-choice.html?subject=biology&topic=Cells%20renamed');
    await page.evaluate(() => {
      const questions = JSON.parse(localStorage.getItem('revisie-quiz-questions'));
      questions.push({ ...questions[0], id: 'other-tab', prompt: 'Another question' });
      saveWorkspaceItem('revisie-quiz-questions', JSON.stringify(questions));
    });
    await sibling.waitForFunction(() => document.querySelector('.practice-card')?.innerText.includes('9 multiple-choice'));
    await sibling.close();
    await page.emulateMedia({ colorScheme: 'dark' });
    await goto('maths-practice.html');
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.screenshot({ path: '/tmp/revisie-maths-practice.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await goto('short-answer.html?subject=biology');
    await page.screenshot({ path: '/tmp/revisie-short-answer-mobile.png', fullPage: true });
    assert.deepEqual(errors, []);
    console.log('Practice browser checks passed: libraries, subject links, layouts, manual creation, prompt generation, mixed import, preview selection, duplicate handling, editing, topic lifecycle, marking, maths, saved results, tabs and dark mode.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
