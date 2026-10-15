const { test } = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../assets/practice-engine.js');
test('each valid flashcard becomes short-answer and answer-matching practice', () => {
  const cards = [['First question?', 'First answer'], ['Second question?', 'Second answer'], ['Third question?', 'Third answer'], ['Fourth question?', 'Fourth answer']];
  const result = engine.fromFlashcards(cards);
  assert.equal(result.short.length, 4); assert.equal(result.choice.length, 8);
  for (const q of result.choice) {
    assert.equal(q.options.length, 4); assert.equal(q.options[q.correct], q.matchedValue || q.answer);
    assert.equal(new Set(q.options).size, 4);
    assert.ok(cards.some(([prompt, answer]) => q.direction === 'question' ? prompt === q.matchedValue && q.prompt.includes(answer) : prompt === q.prompt && answer === q.answer));
  }
});
test('small topics borrow options from the supplied subject pool and never invent answers', () => {
  const cards = [['New question?', 'New answer']];
  const result = engine.fromFlashcards(cards, [['Other topic?', 'Other answer']]);
  assert.equal(result.choice.length, 2); assert.deepEqual(result.choice[0].options, ['New answer', 'Other answer']);
  assert.deepEqual(result.choice[1].options, ['New question?', 'Other topic?']);
  assert.equal(engine.fromFlashcards(cards).choice.length, 0);
  assert.equal(engine.fromFlashcards(cards).unavailable, 1);
});
test('empty or equivalent answers do not create fake choices, and changes are derived from the new deck', () => {
  const result = engine.fromFlashcards([['Q', 'Answer.'], ['Other Q', ' answer '], ['', 'Empty question'], ['Blank answer', '']]);
  assert.equal(result.short.length, 2); assert.equal(result.choice.length, 0);
  assert.equal(engine.fromFlashcards([['Q', 'New answer']]).short[0].answer, 'New answer');
  assert.equal(engine.fromFlashcards([]).short.length, 0);
});
test('explicit quiz questions take priority when they share a flashcard prompt', () => {
  const explicit = { prompt: 'What is this?', answer: 'Reviewed answer' };
  const derived = { prompt: ' WHAT  IS THIS? ', answer: 'Original answer' };
  assert.deepEqual(engine.combine([explicit], [derived]), [explicit]);
});
test('reverse questions exclude alternative prompts with the same answer and deduplicate repeated answers', () => {
  const cards = [['Which cell part controls activities?', 'Nucleus'], ['Where is genetic material stored?', 'Nucleus.'], ['Where does respiration take place?', 'Mitochondria']];
  const result = engine.combine(engine.fromFlashcards(cards).choice);
  const reverse = result.filter(q => q.direction === 'question');
  assert.equal(reverse.length, 2);
  for (const q of reverse) if (q.prompt.endsWith('Nucleus') || q.prompt.endsWith('Nucleus.')) assert.ok(!q.options.slice(1).includes('Where is genetic material stored?'));
});
