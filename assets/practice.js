// Quiz libraries share the subject/topic structure used by flashcards.
(() => {
  const modes = {
    choice: { page: 'multiple-choice.html', title: 'Multiple Choice', symbol: 'list-checks', copy: 'Test your knowledge, choose an answer and learn from the explanation.' },
    short: { page: 'short-answer.html', title: 'Short Answer', symbol: 'square-pen', copy: 'Put your knowledge into words, then compare your response with the model answer.' },
    maths: { page: 'maths-practice.html', title: 'Maths Practice', symbol: 'calculator', copy: 'Choose a category and topic. Practise fresh questions with answers and worked solutions.' },
  };
  const seeds = [
    ['mathematics', 0, 'Which number is prime?', ['21', '29', '39', '51'], 1, '29 has exactly two positive factors: 1 and 29. The other numbers are divisible by 3.'],
    ['mathematics', 1, 'What is the sum of the interior angles of a quadrilateral?', ['90°', '180°', '270°', '360°'], 3, 'A quadrilateral can be divided into two triangles, so its angles sum to 2 × 180° = 360°.'],
    ['mathematics', 2, 'Which value cannot be a probability?', ['0', '0.5', '1', '1.2'], 3, 'A probability lies between 0 and 1 inclusive.'],
    ['biology', 0, 'Which structure controls what enters and leaves a cell?', ['Nucleus', 'Cell membrane', 'Cell wall', 'Mitochondrion'], 1, 'The cell membrane controls the movement of substances into and out of the cell.'],
    ['biology', 1, 'What happens to most enzymes at a very high temperature?', ['Their active site changes shape', 'They become living cells', 'Their active site grows indefinitely', 'They are used up as reactants'], 0, 'High temperatures can denature an enzyme, changing the shape of its active site.'],
    ['biology', 2, 'Which molecule carries genetic information?', ['Starch', 'Glucose', 'DNA', 'Water'], 2, 'DNA contains the genetic information. A gene is a section of DNA.'],
    ['chemistry', 0, 'What differs between isotopes of the same element?', ['Number of protons', 'Number of neutrons', 'Atomic number', 'Charge of each proton'], 1, 'Isotopes have the same number of protons but different numbers of neutrons.'],
    ['chemistry', 1, 'Which type of bonding involves sharing pairs of electrons?', ['Ionic', 'Metallic', 'Covalent', 'Gravitational'], 2, 'Covalent bonds are shared pairs of electrons between atoms.'],
    ['chemistry', 2, 'Oxidation is…', ['Gain of electrons', 'Loss of electrons', 'Gain of neutrons', 'Loss of protons'], 1, 'In terms of electrons, oxidation is loss and reduction is gain.'],
    ['physics', 0, 'If speed doubles while mass stays constant, kinetic energy…', ['Doubles', 'Halves', 'Quadruples', 'Stays the same'], 2, 'Kinetic energy = ½mv². Doubling v multiplies v² by 4.'],
    ['physics', 1, 'Which is the unit of force?', ['Joule', 'Watt', 'Newton', 'Volt'], 2, 'Force is measured in newtons (N).'],
    ['physics', 2, 'In a transverse wave, vibrations are…', ['Parallel to the direction of travel', 'Perpendicular to the direction of travel', 'Always circular', 'Absent'], 1, 'Transverse vibrations are perpendicular to the direction in which the wave transfers energy.'],
    ['english', 0, 'What is an inference?', ['A direct quotation', 'A conclusion drawn from evidence', 'A list of adjectives', 'A spelling correction'], 1, 'An inference uses clues in the text to reach a conclusion that may not be stated explicitly.'],
    ['english', 1, 'Which technique repeats a consonant sound at the start of nearby words?', ['Alliteration', 'Simile', 'Enjambment', 'Personification'], 0, 'Alliteration repeats initial consonant sounds.'],
    ['english', 2, 'A theme is…', ['The length of a text', 'An important idea explored in a text', 'A punctuation mark', 'The name of the publisher'], 1, 'A theme is an idea explored across a text, such as power or conflict.'],
    ['german', 0, 'What does “weil” mean?', ['Although', 'Because', 'But', 'When'], 1, 'Weil means because and introduces a subordinate clause.'],
    ['german', 1, 'What does “mit dem Zug” mean?', ['By car', 'On foot', 'By train', 'By plane'], 2, 'Zug means train; mit dem Zug means by train.'],
    ['german', 2, 'What does “ich möchte” mean?', ['I had to', 'I would like', 'I have been', 'I am allowed'], 1, 'Ich möchte expresses a wish: I would like.'],
    ['drama', 0, 'What is proxemics?', ['The use of space and distance', 'The speed of speech', 'The colour of lighting', 'The volume of music'], 0, 'Proxemics concerns space and distance between performers.'],
    ['drama', 1, 'What is a stimulus in devising?', ['A final ticket price', 'A starting point for ideas', 'A lighting fault', 'A curtain call'], 1, 'A stimulus inspires ideas that can be developed into a performance.'],
    ['drama', 2, 'Which best supports an evaluation of a performance?', ['A list of actors alone', 'A judgement supported by specific moments', 'Only the plot summary', 'The ticket price alone'], 1, 'Evaluation needs a reasoned judgement supported by evidence from the performance.'],
    ['business', 0, 'Who is a stakeholder?', ['Only the business owner', 'Anyone affected by a business', 'Only a shareholder', 'Only a customer'], 1, 'Stakeholders include employees, customers, owners and others affected by the business.'],
    ['business', 1, 'Which belongs to the marketing mix?', ['Price', 'Profit only', 'Population', 'Productivity only'], 0, 'The four Ps are product, price, place and promotion.'],
    ['business', 2, 'A firm has revenue of £900 and total costs of £650. What is its profit?', ['£1,550', '£650', '£250', '£900'], 2, 'Profit = revenue − total costs = £900 − £650 = £250.'],
    ['citizenship', 0, 'What is discrimination?', ['Fair access to services', 'Unfair treatment because of a characteristic or identity', 'Voting in an election', 'Disagreeing with a policy'], 1, 'Discrimination involves unfair treatment related to a characteristic or identity.'],
    ['citizenship', 1, 'In a representative democracy, citizens…', ['Elect representatives', 'Have no vote', 'Must all make every law directly', 'Choose judges for every trial'], 0, 'Citizens elect representatives to make decisions on their behalf.'],
    ['citizenship', 2, 'What does the rule of law mean?', ['Only citizens obey the law', 'Everyone is subject to the law', 'Government is above the law', 'Courts create every policy'], 1, 'The rule of law applies to everyone, including those in government.'],
    ['religious-studies', 0, 'What does incarnation refer to in Christianity?', ['God becoming human in Jesus', 'The creation of angels', 'The end of the world', 'The division of the Church'], 0, 'Incarnation is the belief that God became human in Jesus.'],
    ['religious-studies', 1, 'What is pacifism?', ['Support for all wars', 'The belief that violence and war are never justified', 'A type of election', 'A belief about diet'], 1, 'Pacifism rejects violence and war.'],
    ['religious-studies', 2, 'What is an ethical argument?', ['A reasoned claim about right and wrong', 'An unsupported insult', 'A scientific measurement', 'A list of dates'], 0, 'Ethical arguments give reasons for judgements about what is right or wrong.'],
  ];
  const read = key => { try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; } catch { return []; } };
  const url = (mode, subject, unit) => `${modes[mode].page}${subject ? `?subject=${encodeURIComponent(subject)}${unit ? `&topic=${encodeURIComponent(unit)}` : ''}` : ''}`;
  const shuffle = items => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    return copy;
  };
  function questions(mode, subject, unit) {
    const source = unit.sourceName || unit.name;
    const personal = read('revisie-quiz-questions').filter(q => q.mode === mode && q.subject === subject && q.unit === source);
    const deck = getDeck(subject, unit.name);
    const generated = revisiePracticeEngine.fromFlashcards(deck, getUnits(subject).flatMap(unit => getDeck(subject, unit.name)));
    const starter = mode === 'choice' ? seeds.filter(q => q[0] === subject && topicUnits[subject]?.[q[1]] === source).map(q => ({ prompt: q[2], options: q[3], correct: q[4], answer: q[5] })) : [];
    return revisiePracticeEngine.combine(personal, generated[mode], starter);
  }
  function save(key, items) {
    try { saveWorkspaceItem(key, JSON.stringify(items)); return true; }
    catch { notify('Could not save in this browser. Free some storage and try again.'); return false; }
  }
  function generateImport(mode, subject = '', unitName = '') {
    const entries = subjectEntries();
    if (!entries.length) { notify('Add a subject and topic before making quizzes.'); return; }
    const backdrop = openModal('Generate / import questions', `<div class="quiz-generation">
      <p class="practice-description">Your flashcards already provide automatic practice. Use this prompt with your AI assistant for rewritten questions and tailored wrong answers, then paste the response below to import the new set.</p>
      <div class="practice-form"><div class="quiz-generation-fields">
        <label for="generateSubject">Subject<select id="generateSubject" class="note-subject">${entries.map(([key, data]) => `<option value="${escapeHtml(key)}" ${key === subject ? 'selected' : ''}>${escapeHtml(data.label)}</option>`).join('')}</select></label>
        <label for="generateTopic">Topic<select id="generateTopic" class="note-subject"></select></label>
        <label for="generateMode">Question types<select id="generateMode" class="note-subject"><option value="choice" ${mode === 'choice' ? 'selected' : ''}>Multiple choice</option><option value="short" ${mode === 'short' ? 'selected' : ''}>Short answer</option><option value="mixed">Mixed</option></select></label>
        <label for="generateCount">Number of questions<input id="generateCount" class="note-title" type="number" min="1" max="50" value="10"></label>
        <label for="generateLevel">Course / exam board<input id="generateLevel" class="note-title" maxlength="150" placeholder="e.g. GCSE Higher · AQA"></label>
        <label for="generateDifficulty">Difficulty<select id="generateDifficulty" class="note-subject"><option>Mixed</option><option>Foundation</option><option>Standard</option><option>Challenging</option></select></label>
      </div>
      <button class="secondary-button" id="useTopicFlashcards" type="button">Use this topic’s flashcards</button><p class="practice-description">The topic’s current flashcards are included by default. Use them to ask for rewritten questions and tailored wrong answers.</p>
      <label for="generateNote">Use a saved note (optional)<select id="generateNote" class="note-subject"><option value="">Choose a note</option></select></label>
      <label for="generateNotes">Study notes or specification extract (optional)</label><textarea id="generateNotes" rows="4" maxlength="30000" placeholder="Paste the material you want the questions to test. Without notes, the prompt asks for general questions on your topic."></textarea>
      <p id="generateDestination" class="practice-description"></p>
      <h3>1. Copy the prompt into a chat</h3><p class="practice-description">Send the prompt to your AI assistant to create the question set, then return here with its response.</p>
      <details><summary>View prepared prompt</summary><textarea id="generatedQuizPrompt" readonly rows="7" aria-label="Prepared quiz prompt"></textarea></details><button class="primary-button" id="copyQuizPrompt" type="button">Copy prompt</button>
      <h3>2. Paste the response and review</h3><label for="generatedQuizResponse">Generated questions</label><textarea id="generatedQuizResponse" rows="6" maxlength="1000000" placeholder="Paste the complete generated question set here."></textarea>
      <p class="practice-description">Check the questions, answers and explanations before saving. You can leave out any question you do not want.</p><p id="quizImportError" class="practice-error" role="alert"></p><button class="secondary-button" id="previewQuizImport" type="button">Preview questions</button>
      <div id="quizImportPreview" aria-live="polite"></div><button class="primary-button" id="saveQuizImport" type="button" disabled>Save questions</button>
      </div></div>`);
    const find = id => backdrop.querySelector(`#${id}`);
    let prepared = null;
    const invalidate = () => { prepared = null; find('quizImportPreview').replaceChildren(); find('saveQuizImport').disabled = true; find('quizImportError').textContent = ''; };
    const destination = () => getUnits(find('generateSubject').value).find(unit => (unit.sourceName || unit.name) === find('generateTopic').value);
    const existing = () => {
      const unit = destination();
      return unit ? ['choice', 'short'].flatMap(type => questions(type, find('generateSubject').value, unit).map(q => ({ ...q, mode: type }))) : [];
    };
    const updatePrompt = () => {
      const data = subjectData[find('generateSubject').value], unit = destination();
      find('generatedQuizPrompt').value = revisieQuizImport.buildPrompt({ subject: data.label, topic: unit?.name || 'Choose a topic', mode: find('generateMode').value, count: find('generateCount').value, level: find('generateLevel').value, difficulty: find('generateDifficulty').value, notes: find('generateNotes').value });
      find('generateDestination').textContent = unit ? `Questions will be saved to ${data.label} → ${unit.name}.` : 'This subject has no topics. Add a topic from its subject page first.';
      find('copyQuizPrompt').disabled = !unit;
      find('previewQuizImport').disabled = !unit;
    };
    const useFlashcards = () => {
      const unit = destination();
      find('generateNotes').value = unit ? getDeck(find('generateSubject').value, unit.name).map(([q, a], index) => `${index + 1}. Question: ${q}\nAnswer: ${a}`).join('\n\n') : '';
      find('generateNote').value = '';
      updatePrompt();
    };
    const fillSubject = () => {
      const key = find('generateSubject').value;
      find('generateTopic').innerHTML = getUnits(key).map(unit => `<option value="${escapeHtml(unit.sourceName || unit.name)}" ${[unit.name, unit.sourceName].includes(unitName) ? 'selected' : ''}>${escapeHtml(unit.name)}</option>`).join('');
      find('generateNote').innerHTML = '<option value="">Choose a note</option>' + noteLibrary.map((note, index) => ({ note, index })).filter(({ note }) => note.subject === key && note.body?.trim()).map(({ note, index }) => `<option value="${index}">${escapeHtml(note.title || 'Untitled note')}</option>`).join('');
      find('generateNotes').value = '';
      const board = subjectData[key].board;
      find('generateLevel').value = `GCSE Higher${board && board !== 'Exam board' ? ` · ${board}` : ''}`;
      invalidate(); useFlashcards();
    };
    fillSubject();
    find('generateSubject').addEventListener('change', fillSubject);
    find('generateTopic').addEventListener('change', () => { invalidate(); useFlashcards(); });
    find('generateMode').addEventListener('change', () => { invalidate(); updatePrompt(); });
    find('useTopicFlashcards').onclick = useFlashcards;
    for (const id of ['generateCount', 'generateLevel', 'generateDifficulty', 'generateNotes']) find(id).addEventListener('input', updatePrompt);
    find('generateNote').addEventListener('change', event => { if (event.target.value !== '') { find('generateNotes').value = noteLibrary[Number(event.target.value)]?.body || ''; updatePrompt(); } });
    find('generatedQuizResponse').addEventListener('input', invalidate);
    find('copyQuizPrompt').onclick = async () => {
      if (!find('generateCount').reportValidity()) return;
      updatePrompt();
      try { await navigator.clipboard.writeText(find('generatedQuizPrompt').value); notify('Prompt copied. Paste it into your AI chat, then bring the response back here.'); }
      catch { find('generatedQuizPrompt').closest('details').open = true; find('generatedQuizPrompt').focus(); find('generatedQuizPrompt').select(); notify('Select and copy the prepared prompt.'); }
    };
    find('previewQuizImport').onclick = () => {
      invalidate();
      try {
        if (!destination()) throw new Error('Choose an available subject topic first.');
        const result = revisieQuizImport.prepare(revisieQuizImport.parse(find('generatedQuizResponse').value, find('generateMode').value), existing());
        prepared = result.questions;
        find('quizImportPreview').innerHTML = `<h3>Review your questions</h3><p>${prepared.length} new question${prepared.length === 1 ? '' : 's'} · ${result.duplicates} duplicate${result.duplicates === 1 ? '' : 's'} skipped</p>${prepared.map((q, index) => `<article class="quiz-import-question"><label><input type="checkbox" data-include-quiz="${index}" checked> Include ${q.mode === 'choice' ? 'multiple-choice' : 'short-answer'} question ${index + 1}</label><h4>${escapeHtml(q.prompt)}</h4>${q.options ? `<ol>${q.options.map((option, index) => `<li>${escapeHtml(option)}${index === q.correct ? ' ✓ Correct answer' : ''}</li>`).join('')}</ol>` : ''}<p class="quiz-model-answer">${escapeHtml(q.answer)}</p></article>`).join('') || '<p>No new questions to save. These questions are already in the topic.</p>'}`;
        const updateButton = () => { const count = backdrop.querySelectorAll('[data-include-quiz]:checked').length; find('saveQuizImport').disabled = !count; find('saveQuizImport').textContent = `Save ${count} question${count === 1 ? '' : 's'}`; };
        backdrop.querySelectorAll('[data-include-quiz]').forEach(input => input.addEventListener('change', updateButton));
        updateButton();
      } catch (error) { find('quizImportError').textContent = error.message; }
    };
    find('saveQuizImport').onclick = () => {
      if (!prepared) return;
      const unit = destination();
      if (!unit) { invalidate(); find('quizImportError').textContent = 'This topic is no longer available. Choose another topic and preview again.'; return; }
      const selected = [...backdrop.querySelectorAll('[data-include-quiz]:checked')].map(input => prepared[Number(input.dataset.includeQuiz)]);
      // Recheck duplicates at save time in case another tab added questions after preview.
      const ready = revisieQuizImport.prepare(selected, existing()).questions;
      if (!ready.length) { invalidate(); find('quizImportError').textContent = 'No new questions selected. They may already have been saved in another tab.'; return; }
      const subject = find('generateSubject').value;
      const records = ready.map(q => ({ ...q, id: crypto.randomUUID(), subject, unit: unit.sourceName || unit.name }));
      if (save('revisie-quiz-questions', [...read('revisie-quiz-questions'), ...records])) { closeModal(); refresh(); notify(`${records.length} questions saved. You can edit them from Manage / add.`); }
    };
  }
  function composer(mode, subject = '', unitName = '', existing = null) {
    const entries = subjectEntries();
    if (!entries.length) { notify('Add a subject before creating quiz questions.'); return; }
    const backdrop = openModal(existing ? 'Edit question' : `New ${mode === 'choice' ? 'multiple-choice' : 'short-answer'} question`, `<form class="notes-form practice-form">
      <label for="quizSubject">Subject</label><select id="quizSubject" class="note-subject">${entries.map(([key, data]) => `<option value="${escapeHtml(key)}" ${key === subject ? 'selected' : ''}>${escapeHtml(data.label)}</option>`).join('')}</select>
      <label for="quizTopic">Topic</label><select id="quizTopic" class="note-subject" required></select>
      <label for="quizPrompt">Question</label><textarea id="quizPrompt" required maxlength="2000">${escapeHtml(existing?.prompt || '')}</textarea>
      ${mode === 'choice' ? `<fieldset><legend>Answer options</legend>${[0, 1, 2, 3].map(i => `<label for="quizOption${i}">Option ${i + 1}</label><input class="note-title" id="quizOption${i}" required maxlength="500" value="${escapeHtml(existing?.options?.[i] || '')}">`).join('')}</fieldset><label for="quizCorrect">Correct option</label><select id="quizCorrect" class="note-subject">${[0, 1, 2, 3].map(i => `<option value="${i}" ${i === existing?.correct ? 'selected' : ''}>Option ${i + 1}</option>`).join('')}</select>` : ''}
      <label for="quizModel">${mode === 'choice' ? 'Explanation' : 'Model answer / marking points'}</label><textarea id="quizModel" required maxlength="4000">${escapeHtml(existing?.answer || '')}</textarea>
      <p class="practice-error" role="alert"></p><button class="primary-button" type="submit">Save question</button></form>`);
    const subjectInput = backdrop.querySelector('#quizSubject'), topicInput = backdrop.querySelector('#quizTopic');
    const fill = () => {
      topicInput.innerHTML = getUnits(subjectInput.value).map(unit => `<option value="${escapeHtml(unit.sourceName || unit.name)}" ${[unit.name, unit.sourceName].includes(unitName) ? 'selected' : ''}>${escapeHtml(unit.name)}</option>`).join('');
    };
    fill(); subjectInput.addEventListener('change', fill);
    backdrop.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const prompt = backdrop.querySelector('#quizPrompt').value.trim(), answer = backdrop.querySelector('#quizModel').value.trim();
      const options = mode === 'choice' ? [0, 1, 2, 3].map(i => backdrop.querySelector(`#quizOption${i}`).value.trim()) : undefined;
      const error = backdrop.querySelector('.practice-error');
      if (!prompt || !answer || !topicInput.value || options?.some(option => !option)) { error.textContent = 'Complete the question, topic and all answer fields.'; return; }
      if (options && new Set(options.map(option => option.toLowerCase())).size !== 4) { error.textContent = 'Use four different answer options.'; return; }
      const items = read('revisie-quiz-questions');
      const item = { id: existing?.id || crypto.randomUUID(), mode, subject: subjectInput.value, unit: topicInput.value, prompt, answer, ...(options ? { options, correct: Number(backdrop.querySelector('#quizCorrect').value) } : {}) };
      const index = items.findIndex(q => q.id === item.id);
      if (index >= 0) items[index] = item; else items.push(item);
      if (save('revisie-quiz-questions', items)) { closeModal(); refresh(); notify('Question saved.'); }
    });
  }
  function manage(mode, subject, unit) {
    const source = unit.sourceName || unit.name;
    const items = read('revisie-quiz-questions').filter(q => q.mode === mode && q.subject === subject && q.unit === source);
    const backdrop = openModal('Your quiz questions', `<p class="practice-description">Manage questions you created or imported for ${escapeHtml(unit.name)}. Starter questions stay available.</p><div class="practice-manage">${items.map(q => `<article><p>${escapeHtml(q.prompt)}</p><div><button class="text-button" data-edit="${escapeHtml(q.id)}">Edit</button><button class="text-button" data-delete="${escapeHtml(q.id)}">Delete</button></div></article>`).join('') || '<p>No personal questions in this topic yet.</p>'}</div><div class="practice-actions"><button class="primary-button" id="generateManagedQuiz">Generate / import</button><button class="secondary-button" id="addManagedQuiz">Write a question</button></div>`);
    backdrop.querySelector('#generateManagedQuiz').onclick = () => generateImport(mode, subject, source);
    backdrop.querySelector('#addManagedQuiz').onclick = () => composer(mode, subject, source);
    backdrop.querySelectorAll('[data-edit]').forEach(button => button.onclick = () => composer(mode, subject, source, items.find(q => q.id === button.dataset.edit)));
    backdrop.querySelectorAll('[data-delete]').forEach(button => button.onclick = () => {
      if (!confirm('Delete this quiz question?')) return;
      if (save('revisie-quiz-questions', read('revisie-quiz-questions').filter(q => q.id !== button.dataset.delete))) { refresh(); manage(mode, subject, unit); }
    });
  }
  function start(mode, subject, topic, items) {
    if (!items.length) return;
    const sessionOwner = localStorage.getItem(workspaceOwnerKey);
    const started = Date.now();
    const backdrop = openModal(`${modes[mode].title} · ${topic}`, '<div id="practiceSession" aria-live="polite"></div>');
    const app = backdrop.querySelector('#practiceSession');
    let index = 0, score = 0;
    const responses = [];
    function next(correct, response) {
      score += Number(correct); responses.push({ prompt: items[index].prompt, response, correct, answer: mode === 'maths' ? items[index].working : items[index].answer });
      try { if (sessionOwner === localStorage.getItem(workspaceOwnerKey)) markStudyComplete(); } catch { notify('Your study day could not be saved.'); }
      index++; render();
    }
    function render() {
      if (index === items.length) {
        const attempt = { id: crypto.randomUUID(), mode, subject, topic, score, total: items.length, completedAt: new Date().toISOString(), seconds: Math.round((Date.now() - started) / 1000), ...(mode === 'maths' ? { skills: [...new Set(items.map(item => item.skill))], prompts: items.map(item => item.prompt) } : {}) };
        const saved = sessionOwner === localStorage.getItem(workspaceOwnerKey) && save('revisie-quiz-attempts', [...read('revisie-quiz-attempts'), attempt]);
        app.innerHTML = `<p class="eyebrow">SESSION COMPLETE</p><h3 tabindex="-1">${score} / ${items.length} ${mode === 'short' ? 'self-marked correct' : 'correct'}</h3><p>${saved ? 'Result saved to your practice history.' : 'This result has not been saved.'}</p><div class="practice-review">${responses.map(response => `<details><summary>${response.correct ? '✓' : '↻'} ${escapeHtml(response.prompt)}</summary><p>Your answer: ${escapeHtml(response.response || 'Skipped')}</p><p>${escapeHtml(response.answer)}</p></details>`).join('')}</div><button class="primary-button" id="finishPractice">Done</button>`;
        app.querySelector('#finishPractice').onclick = () => { closeModal(); refresh(); };
      } else {
        const item = items[index];
        app.innerHTML = `<p class="eyebrow">QUESTION ${index + 1} OF ${items.length}</p><progress value="${index}" max="${items.length}" aria-label="Quiz progress"></progress><h3 tabindex="-1">${escapeHtml(item.prompt)}</h3>${mode === 'choice' && item.source === 'flashcard' ? `<p class="practice-description">Flashcard match: ${item.direction === 'question' ? 'choose the saved question that matches this answer.' : 'choose the answer saved with this question.'}</p>` : ''}<form id="practiceAnswer">${mode === 'choice' ? `<fieldset class="practice-options"><legend class="sr-only">Choose an answer</legend>${shuffle(item.options.map((text, value) => ({ text, value }))).map(option => `<label><input type="radio" name="answer" value="${option.value}" required><span>${escapeHtml(option.text)}</span></label>`).join('')}</fieldset>` : `<label for="writtenAnswer">Your answer${mode === 'maths' ? ' (number or fraction)' : ''}</label>${mode === 'short' ? '<textarea id="writtenAnswer" required rows="4" maxlength="4000"></textarea>' : '<input id="writtenAnswer" type="text" autocomplete="off" required>'}`}
          <button class="primary-button" type="submit">${mode === 'short' ? 'Show model answer' : 'Check answer'}</button><button class="text-button" type="button" id="skipQuestion">Skip</button></form><div id="practiceFeedback" role="status"></div>`;
        app.querySelector('#skipQuestion').onclick = () => next(false, 'Skipped');
        app.querySelector('form').onsubmit = event => {
          event.preventDefault();
          const field = app.querySelector('#writtenAnswer');
          const value = mode === 'choice' ? app.querySelector('[name="answer"]:checked')?.value : field.value.trim();
          if (!value) return;
          if (mode === 'maths' && !Number.isFinite(revisieMaths.numericAnswer(value))) { field.setCustomValidity('Enter a number or fraction, for example 0.5 or 1/2.'); field.reportValidity(); return; }
          const correct = mode === 'choice' ? Number(value) === item.correct : mode === 'maths' ? revisieMaths.isCorrect(value, item.answer) : false;
          const response = mode === 'choice' ? item.options[Number(value)] : value;
          app.querySelectorAll('form input, form textarea, form button').forEach(control => control.disabled = true);
          if (mode === 'choice') {
            for (const input of app.querySelectorAll('[name="answer"]')) {
              const label = input.closest('label'), option = Number(input.value);
              if (option === item.correct || option === Number(value)) {
                const isRight = option === item.correct;
                label.classList.add(isRight ? 'is-correct' : 'is-incorrect');
                const status = document.createElement('strong');
                status.className = 'practice-option-status';
                status.textContent = isRight ? (correct ? '✓ Correct — your answer' : '✓ Correct answer') : '✕ Your answer — incorrect';
                label.appendChild(status);
              }
            }
          }
          const feedback = app.querySelector('#practiceFeedback');
          feedback.innerHTML = `<div class="practice-feedback${mode === 'choice' ? correct ? ' is-correct' : ' is-incorrect' : ''}"><strong>${mode === 'short' ? 'Compare with the model answer' : correct ? 'Correct' : mode === 'choice' ? 'Incorrect' : 'Review the working'}</strong><p>${escapeHtml(mode === 'maths' ? item.working : item.answer)}</p>${mode === 'choice' && !correct ? `<p>Correct answer: ${escapeHtml(item.options[item.correct])}</p>` : ''}</div>${mode === 'short' ? '<p>Did your answer include the key points?</p><div class="practice-actions"><button class="secondary-button" id="markAgain">Needs practice</button><button class="primary-button" id="markCorrect">I got it right</button></div>' : '<button class="primary-button" id="nextQuestion">Next</button>'}`;
          if (mode === 'short') { feedback.querySelector('#markAgain').onclick = () => next(false, response); feedback.querySelector('#markCorrect').onclick = () => next(true, response); }
          else feedback.querySelector('#nextQuestion').onclick = () => next(correct, response);
          feedback.querySelector('button').focus();
        };
        app.querySelector('#writtenAnswer')?.addEventListener('input', event => event.target.setCustomValidity(''));
      }
      app.querySelector('h3').focus({ preventScroll: true });
    }
    render();
  }
  function quizLibrary(app, mode) {
    const params = new URLSearchParams(location.search);
    const selected = params.get('subject') || '', topic = params.get('topic') || '';
    app.innerHTML = `<div class="practice-toolbar"><label for="practiceSubject">Subject<select class="note-subject" id="practiceSubject"><option value="">All subjects</option>${subjectEntries().map(([key, data]) => `<option value="${escapeHtml(key)}" ${selected === key ? 'selected' : ''}>${escapeHtml(data.label)}</option>`).join('')}</select></label><div class="practice-actions"><button class="primary-button" id="generateQuiz">Generate / import ${icon('sparkles')}</button><button class="secondary-button" id="newQuiz">Write a question ${icon('plus')}</button></div></div><p class="practice-description">${mode === 'choice' ? 'Practise questions and answers in both directions. Quizzes update automatically with your flashcards.' : 'Answer from memory, then compare with the model answer. Quizzes update automatically with your flashcards.'}</p><div id="quizGroups"></div>`;
    app.querySelector('#generateQuiz').onclick = () => generateImport(mode, selected, topic);
    app.querySelector('#practiceSubject').onchange = event => { history.replaceState(null, '', url(mode, event.target.value)); quizLibrary(app, mode); };
    app.querySelector('#newQuiz').onclick = () => composer(mode, selected, topic);
    const groups = app.querySelector('#quizGroups');
    const entries = subjectEntries().filter(([key]) => !selected || selected === key);
    groups.innerHTML = entries.map(([subject, data]) => `<section class="practice-group"><div class="section-heading"><h2>${escapeHtml(data.label)}</h2></div><div class="practice-grid">${getUnits(subject).filter(unit => !topic || topic === unit.name || topic === unit.sourceName).map(unit => {
      const count = questions(mode, subject, unit).length;
      return `<article class="practice-card"><div class="subject-icon ${data.color || 'blue'}">${icon(modes[mode].symbol)}</div><h3>${escapeHtml(unit.name)}</h3><p>${count} ${mode === 'choice' ? 'multiple-choice' : 'short-answer'} question${count === 1 ? '' : 's'}</p>${mode === 'choice' && !count && getDeck(subject, unit.name).length ? '<p>Add a second distinct flashcard answer in this subject, or use Generate / import to create answer options.</p>' : ''}<div class="practice-actions"><button class="${count ? 'primary-button' : 'secondary-button'}" data-start-subject="${escapeHtml(subject)}" data-unit="${escapeHtml(unit.name)}" ${count ? '' : 'disabled'}>Start quiz</button><button class="text-button" data-manage-subject="${escapeHtml(subject)}" data-unit="${escapeHtml(unit.name)}">Manage / add</button></div></article>`;
    }).join('') || '<p class="empty-state">No topics here. Add topics from the subject page.</p>'}</div></section>`).join('') || '<p class="empty-state">No subjects available. Add a subject from Subjects to get started.</p>';
    groups.querySelectorAll('[data-start-subject]').forEach(button => button.onclick = () => { const subject = button.dataset.startSubject, unit = getUnits(subject).find(unit => unit.name === button.dataset.unit); start(mode, subject, unit.name, shuffle(questions(mode, subject, unit)).slice(0, 10)); });
    groups.querySelectorAll('[data-manage-subject]').forEach(button => button.onclick = () => { const subject = button.dataset.manageSubject; manage(mode, subject, getUnits(subject).find(unit => unit.name === button.dataset.unit)); });
    historyPanel(app, mode, selected);
    lucide.createIcons();
  }
  function mathsSubjects() { return subjectEntries().filter(([key, subject]) => key === 'mathematics' || /\b(?:maths|mathematics)\b/i.test(subject.label)); }
  function topicSkills(subject, unit) {
    const record = read('revisie-maths-topic-skills').find(item => item.subject === subject && item.unit === (unit.sourceName || unit.name));
    return record ? record.skills.filter(id => revisieMaths.topics.some(topic => topic.id === id)) : revisieMaths.inferSkills(unit.name, getDeck(subject, unit.name));
  }
  function startMaths(ids, name, subject = 'mathematics') {
    const recent = read('revisie-quiz-attempts').filter(item => item.mode === 'maths').slice(-10).flatMap(item => item.prompts || []);
    try { start('maths', subject, name, revisieMaths.session(ids, 10, recent)); } catch (error) { notify(error.message); }
  }
  function chooseMathsSkills(subject, unit) {
    const selected = topicSkills(subject, unit), categories = [...new Set(revisieMaths.topics.map(topic => topic.category))];
    const backdrop = openModal(`Practice skills · ${unit.name}`, `<form class="practice-form"><p class="practice-description">Choose the maths skills this subject topic should practise. Each session mixes fresh numbers, direct questions, missing values and applications.</p>${categories.map(category => `<fieldset class="maths-skill-options"><legend>${escapeHtml(category)}</legend>${revisieMaths.topics.filter(topic => topic.category === category).map(topic => `<label><input name="mathsSkill" type="checkbox" value="${topic.id}" ${selected.includes(topic.id) ? 'checked' : ''}>${escapeHtml(topic.name)}</label>`).join('')}</fieldset>`).join('')}<div class="practice-actions"><button class="primary-button" type="submit">Save practice skills</button><button class="secondary-button" type="button" id="resetMathsSkills">Use automatic matching</button></div></form>`);
    const source = unit.sourceName || unit.name;
    const records = () => read('revisie-maths-topic-skills').filter(item => item.subject !== subject || item.unit !== source);
    backdrop.querySelector('form').onsubmit = event => {
      event.preventDefault();
      if (!getUnits(subject).some(item => (item.sourceName || item.name) === source)) { closeModal(); notify('This topic is no longer available.'); return; }
      const skills = [...backdrop.querySelectorAll('[name="mathsSkill"]:checked')].map(input => input.value);
      if (save('revisie-maths-topic-skills', [...records(), { id: JSON.stringify([subject, source]), subject, unit: source, skills }])) { closeModal(); refresh(); }
    };
    backdrop.querySelector('#resetMathsSkills').onclick = () => { if (save('revisie-maths-topic-skills', records())) { closeModal(); refresh(); } };
  }
  function mathsSubjectTopics(app) {
    const params = new URLSearchParams(location.search), subjectFilter = params.get('subject'), topicFilter = params.get('topic');
    const section = document.createElement('section'); section.className = 'practice-group'; section.id = 'mathsSubjectTopics';
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">FROM YOUR SUBJECTS</p><h2>Your maths topics</h2></div></div><p class="practice-description">Topics you add manually appear here too. Practice skills are suggested from the topic name and flashcards; you can change the skills for any topic.</p>${mathsSubjects().filter(([key]) => !subjectFilter || key === subjectFilter).map(([subject, data]) => `<h3>${escapeHtml(data.label)}</h3><div class="practice-grid">${getUnits(subject).filter(unit => !topicFilter || [unit.name, unit.sourceName].includes(topicFilter)).map(unit => {
      const skills = topicSkills(subject, unit);
      return `<article class="practice-card"><h3>${escapeHtml(unit.name)}</h3><p>${skills.map(id => escapeHtml(revisieMaths.topics.find(topic => topic.id === id).name)).join(' · ') || 'Choose practice skills to enable varied questions for this topic.'}</p><div class="practice-actions"><button class="primary-button" data-start-maths-subject="${escapeHtml(subject)}" data-unit="${escapeHtml(unit.name)}" ${skills.length ? '' : 'disabled'}>Practise topic</button><button class="text-button" data-configure-maths="${escapeHtml(subject)}" data-unit="${escapeHtml(unit.name)}">Choose skills</button></div></article>`;
    }).join('') || '<p>No matching subject topics. Add a topic from Subjects.</p>'}</div>`).join('') || '<p>No maths subjects available.</p>'}`;
    app.querySelector('.practice-toolbar').after(section);
    section.querySelectorAll('[data-start-maths-subject]').forEach(button => button.onclick = () => { const subject = button.dataset.startMathsSubject, unit = getUnits(subject).find(unit => unit.name === button.dataset.unit); startMaths(topicSkills(subject, unit), unit.name, subject); });
    section.querySelectorAll('[data-configure-maths]').forEach(button => button.onclick = () => { const subject = button.dataset.configureMaths; chooseMathsSkills(subject, getUnits(subject).find(unit => unit.name === button.dataset.unit)); });
  }
  function mathsLibrary(app) {
    const categories = [...new Set(revisieMaths.topics.map(topic => topic.category))];
    const selected = new URLSearchParams(location.search).get('category') || '';
    app.innerHTML = `<div class="practice-toolbar"><label for="mathsCategory">Skill category<select id="mathsCategory" class="note-subject"><option value="">All categories</option>${categories.map(category => `<option ${category === selected ? 'selected' : ''}>${escapeHtml(category)}</option>`).join('')}</select></label><p>10 different questions · varied formats · worked solutions</p></div>${categories.filter(category => !selected || category === selected).map(category => `<section class="practice-group"><div class="section-heading"><h2>${escapeHtml(category)}</h2></div><div class="practice-grid">${revisieMaths.topics.filter(topic => topic.category === category).map(topic => `<article class="practice-card"><div class="subject-icon coral">${icon('calculator')}</div><h3>${escapeHtml(topic.name)}</h3><p>Fresh numbers, missing values and applications</p><button class="primary-button" data-maths-topic="${topic.id}">Practise skill</button></article>`).join('')}</div></section>`).join('')}`;
    mathsSubjectTopics(app);
    app.querySelector('#mathsCategory').onchange = event => { const params = new URLSearchParams(location.search); if (event.target.value) params.set('category', event.target.value); else params.delete('category'); history.replaceState(null, '', `${modes.maths.page}${params.size ? `?${params}` : ''}`); mathsLibrary(app); };
    app.querySelectorAll('[data-maths-topic]').forEach(button => button.onclick = () => {
      const topic = revisieMaths.topics.find(topic => topic.id === button.dataset.mathsTopic);
      startMaths([topic.id], topic.name);
    });
    historyPanel(app, 'maths'); lucide.createIcons();
  }
  function historyPanel(app, mode, subject = '') {
    const items = read('revisie-quiz-attempts').filter(item => item.mode === mode && (!subject || item.subject === subject)).sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 5);
    app.insertAdjacentHTML('beforeend', `<section class="practice-group practice-history"><div class="section-heading"><h2>Recent results</h2></div>${items.map(item => `<p><strong>${item.score}/${item.total}</strong> · ${escapeHtml(subjectData[item.subject]?.label || item.subject)} · ${escapeHtml(item.topic)}${mode === 'short' ? ' · self-marked' : ''} <small>${escapeHtml(new Date(item.completedAt).toLocaleDateString('en-GB'))}</small></p>`).join('') || '<p>Complete a session to see your results here.</p>'}</section>`);
  }
  function subjectSection() {
    const route = location.pathname.split('/').pop();
    if (!['mathematics.html', 'biology.html', 'history.html', 'psychology.html', 'subject.html'].includes(route)) return;
    document.querySelector('#subjectPractice')?.remove();
    const subject = subjectData[currentSubject];
    if (!subject || subject.deleted) return;
    const section = document.createElement('section'); section.id = 'subjectPractice'; section.className = 'practice-group';
    const maths = mathsSubjects().some(([key]) => key === currentSubject);
    section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">TEST YOUR UNDERSTANDING</p><h2>Quizzes${maths ? ' and maths practice' : ''}</h2></div></div><div class="practice-grid">${['choice', 'short', ...(maths ? ['maths'] : [])].map(mode => `<a class="practice-card" href="${url(mode, mode === 'maths' && currentSubject === 'mathematics' ? '' : currentSubject)}"><div class="subject-icon ${subject.color || 'blue'}">${icon(modes[mode].symbol)}</div><h3>${modes[mode].title}</h3><p>${mode === 'maths' ? 'Your subject topics with varied generated practice.' : 'Your flashcards automatically become quiz questions.'}</p><span class="text-button">${mode === 'maths' ? 'Browse maths topics' : 'Browse quizzes'} →</span></a>`).join('')}</div><div class="practice-topic-links">${getUnits(currentSubject).map(unit => `<div><strong>${escapeHtml(unit.name)}</strong><a class="text-button" href="${url('choice', currentSubject, unit.name)}">Multiple choice</a><a class="text-button" href="${url('short', currentSubject, unit.name)}">Short answer</a>${maths ? `<a class="text-button" href="${url('maths', currentSubject, unit.name)}">Varied maths</a>` : ''}</div>`).join('')}</div>`;
    document.querySelector('.subject-grid')?.after(section);
  }
  function refresh() {
    subjectSection();
    const app = document.querySelector('#practiceApp');
    if (app) { const mode = app.dataset.mode; if (mode === 'maths') mathsLibrary(app); else quizLibrary(app, mode); }
    updateNavigationCounts();
    lucide.createIcons();
  }
  function navigationCounts() {
    const counts = { choice: 0, short: 0 };
    for (const [subject] of subjectEntries()) for (const unit of getUnits(subject)) {
      counts.choice += questions('choice', subject, unit).length;
      counts.short += questions('short', subject, unit).length;
    }
    return {
      'multiple-choice.html': { count: counts.choice, name: 'Multiple Choice', singular: 'multiple-choice question', plural: 'multiple-choice questions' },
      'short-answer.html': { count: counts.short, name: 'Short Answer', singular: 'short-answer question', plural: 'short-answer questions' },
      'maths-practice.html': { count: mathsSubjects().reduce((total, [subject]) => total + getUnits(subject).length, 0), name: 'Maths Practice', singular: 'maths subject topic', plural: 'maths subject topics' },
    };
  }
  function renameTopic(subject, previous, name) {
    const items = read('revisie-quiz-questions'); let changed = false;
    for (const item of items) if (item.subject === subject && item.unit === previous) { item.unit = name; changed = true; }
    if (changed) save('revisie-quiz-questions', items);
    const skills = read('revisie-maths-topic-skills'); let skillsChanged = false;
    for (const item of skills) if (item.subject === subject && item.unit === previous) { item.unit = name; item.id = JSON.stringify([subject, name]); skillsChanged = true; }
    if (skillsChanged) save('revisie-maths-topic-skills', skills);
  }
  function deleteTopic(subject, unit) {
    const items = read('revisie-quiz-questions');
    if (items.some(item => item.subject === subject && item.unit === unit)) save('revisie-quiz-questions', items.filter(item => item.subject !== subject || item.unit !== unit));
    const skills = read('revisie-maths-topic-skills');
    if (skills.some(item => item.subject === subject && item.unit === unit)) save('revisie-maths-topic-skills', skills.filter(item => item.subject !== subject || item.unit !== unit));
  }
  window.revisiePractice = { refresh, renameTopic, deleteTopic, navigationCounts };
  window.addEventListener('storage', event => { if (['revisie-quiz-questions', 'revisie-quiz-attempts', 'revisie-maths-topic-skills'].includes(event.key)) refresh(); });
  refresh();
})();
