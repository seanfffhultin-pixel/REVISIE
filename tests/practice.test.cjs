const { test } = require('node:test');
const assert = require('node:assert/strict');
const maths = require('../assets/maths-questions.js');

test('every maths topic produces ten distinct, finite questions with worked answers', () => {
  assert.equal(maths.topics.length, 12);
  assert.equal(new Set(maths.topics.map(topic => topic.category)).size, 4);
  for (const topic of maths.topics) for (let run = 0; run < 20; run++) {
    const questions = maths.session(topic.id);
    assert.equal(questions.length, 10);
    assert.equal(new Set(questions.map(q => q.prompt)).size, 10);
    for (const q of questions) {
      assert.ok(Number.isFinite(q.answer), topic.id);
      assert.ok(q.working.length > 10);
      assert.ok(maths.isCorrect(String(q.answer), q.answer));
      assert.ok(!maths.isCorrect(String(q.answer + 1), q.answer));
    }
  }
  assert.throws(() => maths.session('missing'));
});
test('maths marking accepts equivalent fractions, signed decimals and specified rounding', () => {
  for (const value of ['1/2', '2 / 4', '0.5', '.500']) assert.ok(maths.isCorrect(value, 0.5));
  assert.ok(maths.isCorrect('−3', -3));
  assert.ok(maths.isCorrect('0', 0));
  assert.ok(maths.isCorrect('0.667', 2 / 3));
  assert.ok(!maths.isCorrect('0.66', 2 / 3));
  assert.ok(!maths.isCorrect('0.999', 1));
  for (const value of ['', ' ', '1/0', 'NaN', 'Infinity', '3cm', '1+2', '0x10', '2/3/4', '<script>']) assert.ok(!maths.isCorrect(value, 3), value);
});
test('maths answers satisfy the equations and statistics in their questions', () => {
  for (const topic of maths.topics) for (let run = 0; run < 50; run++) {
    const q = topic.generate();
    const values = q.prompt.match(/-?\d+/g).map(Number);
    if (topic.id === 'linear') { const [a, b, c] = values; assert.equal(a * q.answer + b, c); }
    if (topic.id === 'quadratics') { const [sum, product] = values; assert.equal(q.answer ** 2 - sum * q.answer + product, 0); }
    if (topic.id === 'percentages') assert.equal(q.answer, values[0] * values[1] / 100);
    if (topic.id === 'fractions') assert.equal(q.answer * values[1], values[0] * values[2]);
    if (topic.id === 'ratio') assert.equal(q.answer, values[0] * values[1] / (values[1] + values[2]));
    if (topic.id === 'area') assert.equal(q.answer, values[0] * values[1] / 2);
    if (topic.id === 'pythagoras') assert.equal(q.answer ** 2, values[0] ** 2 + values[1] ** 2);
    if (topic.id === 'angles') assert.equal(q.answer + values[0] + values[1], 180);
    if (topic.id === 'mean') assert.equal(q.answer, values.reduce((a, b) => a + b, 0) / values.length);
    if (topic.id === 'range') assert.equal(q.answer, Math.max(...values) - Math.min(...values));
    if (topic.id === 'probability') assert.equal(q.answer, values[0] / (values[0] + values[1]));
  }
});
test('maths sessions vary question forms, mix linked skills and avoid recently completed questions', () => {
  for (const topic of maths.topics) {
    const first = maths.session(topic.id);
    assert.equal(new Set(first.map(q => q.variant)).size, 3, topic.id);
    const second = maths.session(topic.id, 10, first.map(q => q.prompt));
    assert.ok(second.every(q => !first.some(previous => previous.prompt === q.prompt)), topic.id);
  }
  const mixed = maths.session(['linear', 'percentages'], 12);
  for (const skill of ['linear', 'percentages']) {
    const questions = mixed.filter(q => q.skill === skill);
    assert.equal(questions.length, 6);
    assert.equal(new Set(questions.map(q => q.variant)).size, 3);
  }
});
test('maths topic inference recognises custom titles, renamed topics and category groups', () => {
  assert.deepEqual(maths.inferSkills('My linear equations'), ['linear']);
  assert.deepEqual(maths.inferSkills('Quadratics and sequences'), ['quadratics', 'sequences']);
  assert.deepEqual(maths.inferSkills('Statistics and probability'), ['mean', 'range', 'probability']);
  assert.deepEqual(maths.inferSkills('My revision topic', [['What is Pythagoras’ theorem?', 'Answer']]), ['pythagoras']);
  assert.deepEqual(maths.inferSkills('Unrecognised topic', []), []);
});
test('every alternative maths form has the correct known answer and finite varied outputs', () => {
  const expected = { percentages: [44, 40], fractions: [4, 6], ratio: [2, 4], linear: [-12, -24], quadratics: [2, 2], sequences: [-8, 10], area: [2, 2], pythagoras: [3, 3], angles: [150, 30], mean: [1, 5], range: [-19, -20], probability: [0.5, 2] };
  const random = Math.random;
  try {
    Math.random = () => 0;
    for (const topic of maths.topics) for (const variant of [1, 2]) {
      const q = maths.variantQuestion(topic.id, variant);
      assert.equal(q.answer, expected[topic.id][variant - 1], `${topic.id} form ${variant}`);
      assert.ok(q.working.length > 10);
    }
  } finally { Math.random = random; }
  for (const topic of maths.topics) for (const variant of [0, 1, 2]) for (let run = 0; run < 30; run++) {
    const q = maths.variantQuestion(topic.id, variant);
    assert.ok(q.prompt && q.working && Number.isFinite(q.answer), topic.id);
    assert.ok(maths.isCorrect(String(q.answer), q.answer));
  }
});
