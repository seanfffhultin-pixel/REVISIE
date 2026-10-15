const { test } = require('node:test');
const assert = require('node:assert/strict');
const importer = require('../assets/quiz-import.js');
const short = { type: 'short_answer', question: ' Explain osmosis. ', answer: 'Net movement of water through a partially permeable membrane.' };
const choice = { type: 'multiple_choice', question: 'Which organelle controls cell activities?', options: ['Nucleus', 'Cell membrane', 'Ribosome', 'Mitochondrion'], correctIndex: 0, answer: 'The nucleus contains genetic material and controls the cell’s activities.' };
test('imports mixed question sets, fences and wrappers into the same canonical format as manual questions', () => {
  const source = JSON.stringify([short, choice]);
  for (const input of [source, `\uFEFF\n\`\`\`json\n${source}\n\`\`\``, JSON.stringify({ questions: [short, choice] })]) {
    const result = importer.parse(input);
    assert.equal(result[0].mode, 'short'); assert.equal(result[0].prompt, 'Explain osmosis.');
    assert.equal(result[1].mode, 'choice'); assert.equal(result[1].correct, 0);
    assert.deepEqual(result[1].options, choice.options);
  }
});
test('rejects malformed question sets and incorrect answer indices without dropping bad rows', () => {
  for (const input of ['', '[]', '{}', '[null]', 'not json', JSON.stringify([short, { ...choice, correctIndex: 4 }]), JSON.stringify([{ ...choice, correctIndex: '0' }]), JSON.stringify([{ ...choice, options: ['A', 'a', 'B', 'C'] }]), JSON.stringify([{ ...short, answer: '' }]), JSON.stringify([{ ...short, type: 'unknown' }]), JSON.stringify([{ ...short, question: 'Q'.repeat(2001) }]), JSON.stringify([{ ...choice, options: ['A', 'B'] }]), JSON.stringify(Array.from({ length: 201 }, () => short))]) assert.throws(() => importer.parse(input), input.slice(0, 80));
  assert.throws(() => importer.parse(JSON.stringify([short]), 'choice'), /Mixed/);
});
test('duplicates compare normalised prompts within each question type and do not merge different types', () => {
  const items = importer.parse(JSON.stringify([short, { ...short, question: '\nEXPLAIN  OSMOSIS.\n' }, choice]));
  const first = importer.prepare(items); assert.equal(first.questions.length, 2); assert.equal(first.duplicates, 1);
  const second = importer.prepare(items, [{ mode: 'short', prompt: 'explain osmosis.' }]); assert.equal(second.questions.length, 1); assert.equal(second.duplicates, 2);
  const differentType = importer.prepare(items, [{ mode: 'choice', prompt: 'Explain osmosis.' }]); assert.equal(differentType.questions.length, 2);
});
test('prompts include selected topic, course, difficulty, format and explicitly supplied study notes', () => {
  const prompt = importer.buildPrompt({ subject: 'Biology', topic: 'Cells', mode: 'mixed', count: 15, level: 'GCSE Higher · AQA', difficulty: 'Challenging', notes: 'Study only these cell facts.' });
  for (const part of ['15', 'Biology', 'Cells', 'AQA', 'Challenging', 'multiple_choice', 'short_answer', 'correctIndex', 'Study only these cell facts.', 'Use only the supplied study material']) assert.ok(prompt.includes(part), part);
  const noNotes = importer.buildPrompt({ subject: 'Chemistry', topic: 'Bonding', mode: 'choice', count: 999 });
  assert.match(noNotes, /Create 50/); assert.match(noNotes, /No study notes were supplied/); assert.ok(!noNotes.includes('BEGIN STUDY MATERIAL'));
});
