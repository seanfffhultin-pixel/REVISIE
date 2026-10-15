// Derive practice from the current deck rather than keeping stale copies of flashcards.
(function (root) {
  const normalise = text => String(text).trim().replace(/\s+/g, ' ').toLowerCase();
  const answerKey = text => normalise(text).replace(/[.!?]+$/, '');
  function validCards(cards) { return cards.filter(card => Array.isArray(card) && typeof card[0] === 'string' && card[0].trim() && typeof card[1] === 'string' && card[1].trim()); }
  function fromFlashcards(deck, subjectDeck = deck) {
    const cards = validCards(deck), pool = validCards([...deck, ...subjectDeck]);
    const short = cards.map(([prompt, answer]) => ({ prompt, answer, source: 'flashcard' }));
    const choice = []; let forwardCount = 0;
    for (const [prompt, answer] of cards) {
      const seen = new Set([answerKey(answer)]), others = [];
      for (const [, candidate] of pool) {
        const key = answerKey(candidate);
        if (!seen.has(key)) { seen.add(key); others.push(candidate); }
      }
      // Prefer nearby subject answers. Fewer than four options is valid when the subject is small.
      if (others.length) {
        choice.push({ prompt, answer, source: 'flashcard', direction: 'answer', options: [answer, ...others.slice(0, 3)], correct: 0 });
        forwardCount++;
      }
      const seenQuestions = new Set([normalise(prompt)]), otherQuestions = [];
      for (const [candidate, candidateAnswer] of pool) {
        const key = normalise(candidate);
        // Questions sharing this answer are not valid wrong options for reverse matching.
        if (!seenQuestions.has(key) && answerKey(candidateAnswer) !== answerKey(answer)) { seenQuestions.add(key); otherQuestions.push(candidate); }
      }
      if (otherQuestions.length) choice.push({ prompt: `Which saved question goes with this answer?\n\n${answer}`, answer: `Question: ${prompt}\nAnswer: ${answer}`, source: 'flashcard', direction: 'question', matchedValue: prompt, options: [prompt, ...otherQuestions.slice(0, 3)], correct: 0 });
    }
    return { short, choice, unavailable: short.length - forwardCount };
  }
  function combine(...sets) {
    const seen = new Set();
    return sets.flat().filter(item => { const key = item.direction === 'question' ? answerKey(item.prompt) : normalise(item.prompt); if (seen.has(key)) return false; seen.add(key); return true; });
  }
  const api = { fromFlashcards, combine };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.revisiePracticeEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
