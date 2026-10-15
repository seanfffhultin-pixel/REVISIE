# Quizzes and maths practice

Multiple Choice, Short Answer and Maths Practice are available from the sidebar. Subject pages link to both quiz libraries, including links for each subject topic. Mathematics also links to the maths practice library.

Sidebar badges show subject totals, flashcards remaining, available multiple-choice and short-answer questions, maths subject topics, folders, notes, PDF resources and incomplete planner sessions. Their library pages show the corresponding workspace total. Quiz counts use the same deduplicated questions as the libraries, including automatic flashcard conversions and personal questions. Maths counts subject topics rather than the variable number of generated questions. Counts refresh after local edits, account sync and changes in another tab. Overview and Progress do not have item-count badges.

- **Multiple choice:** each current flashcard supplies up to two multiple-choice question forms when its subject has at least two distinct saved answers: choose the saved answer for a question, and identify the saved question from its answer. Reverse questions sharing equivalent answers are deduplicated, and questions with the same saved answer are excluded from reverse distractors. Options come from the same topic first, then other topics in the same subject. Questions have two to four options and explicitly ask for the saved flashcard answer. These choices are existing answers or questions, not AI-written misconception distractors. Adding a topic automatically makes these forms available from its starter or personal flashcards; adding more cards expands the bank. Starter multiple-choice questions remain available. Manual and imported questions use four distinct options and are editable through Manage / add.
- **Short answer:** all current flashcards, including those in manually added topics, are available automatically as written-answer practice. Adding, editing or deleting a flashcard changes its derived questions immediately; no duplicate quiz records are stored. You can also create separate short-answer questions with model answers or marking points. After writing a response, compare it with the model answer and choose whether it needs practice or is correct. Results are labelled self-marked.
- **Maths practice:** subject topics, including manually added ones, appear under Your maths topics. The app suggests linked practice skills from topic names and flashcard questions. Choose skills lets you adjust the mapping or enable an unrecognised topic; choices persist and sync with the workspace. Twelve available skills are grouped into Number, Algebra, Geometry and measures, and Statistics and probability. Each skill has three question forms, covering direct problems, missing values, inverse problems or applications. Topic sessions mix the linked skills and change the numbers. Each session contains ten questions without repeated prompts, and avoids prompts in the ten most recently completed maths sessions when enough alternatives exist. The numerical checker accepts decimals and fractions, including equivalent fractions. Probability questions accept decimals rounded to three decimal places. Each answer has worked steps. Templates vary their numbers; repeats across separate sessions are possible.

After submitting a multiple-choice answer, the correct option is highlighted green. An incorrect selected option is highlighted red. Text labels identify the correct answer and your selection alongside the colours. The explanation uses the matching result colour, and the next question clears all feedback. This works in light and dark mode.

Completed sessions appear in each library's recent results. Answered questions earn a study day using the existing streak system. Quiz results do not change flashcard mastery or add to the flashcard study-time counter.

Personal questions and completed results save locally for guests and use the existing account workspace sync when signed in. Concurrent additions from different devices merge by ID. Quiz topics follow subject topic renames; deleting a topic also deletes its personal quiz questions. Historical session results retain the topic name used at the time.

## Making question sets in chat

The quiz libraries work automatically from flashcards. **Generate / import** is available for rewritten questions with tailored wrong answers, and **Write a question** remains available for manual creation. Explicit manual or imported questions take priority if they use the same prompt as an automatic question.

1. Select a subject, existing topic, question type (multiple choice, short answer or mixed), number, course / exam board and difficulty.
2. The selected topic’s flashcards are included in the prompt by default. You can replace them with pasted study material or a saved written note. Use this topic’s flashcards restores the current deck. Changing the topic loads that topic’s flashcards. Clearing the material asks for general subject knowledge instead.
3. Copy the prepared prompt into the chat and send it. The site itself does not call an AI service. The prompt asks for the question set in the import format.
4. Paste the full response into REVISIÉ and select **Preview questions**. Review the answers and deselect unwanted questions.
5. Save the selected questions. Mixed sets appear in their respective libraries, under the same subject topic. Use **Manage / add** to edit them afterwards.

Imports accept a JSON array (optionally wrapped in a Markdown JSON code block or a `questions` object). Each question has `type` (`multiple_choice` or `short_answer`), `question` and `answer`. Multiple-choice questions also have four distinct `options` and an integer `correctIndex` from 0 to 3. The complete response is validated before saving; malformed rows produce an error rather than silently disappearing. Duplicates are skipped within a set and against existing questions of the same type in the destination topic. Importing supports up to 200 questions per batch.

AI answers still need a content review: format validation checks the structure, not factual accuracy or exam-board alignment. There is no API key or built-in AI request in this version.

The maths generators and skill inference are in `assets/maths-questions.js`, automatic flashcard conversion in `assets/practice-engine.js`, the libraries and study flows in `assets/practice.js`, and their styles in `assets/practice.css`. Unknown maths content needs a supported skill mapping or a prompt/import question set; the app does not invent new mathematical generators from arbitrary text. All are included by the existing static GitHub Pages deployment workflow.

Validation:

```sh
node --test tests/*.test.cjs
# With Playwright available in NODE_PATH and its Chromium browser installed:
node tests/practice-browser.cjs
node tests/auto-practice-browser.cjs
node tests/choice-feedback-browser.cjs
node tests/ui-browser.cjs
```
