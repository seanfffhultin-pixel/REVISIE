# Flashcard imports and saving

Open **Flashcards → Import flashcards**, or **Import flashcards** on a subject page.
Choose a subject and topic (or enter a new topic name), paste your cards or upload
TXT / TSV / CSV / JSON, then select **Preview cards → Import**. Every card goes
into the selected topic. Duplicate questions are skipped, including duplicates
already in that topic. Invalid rows stop the import with an error.

## Quizlet

On the Quizlet website, open a set you created, choose **More (…) → Export**,
select **Tab** between terms and definitions and **New line** between cards,
then **Copy text** and paste it into REVISIÉ.

[Quizlet's official export instructions](https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets)
limit export to original sets you created, using the website. A set URL is not an
export. This importer works with exported text; it does not scrape Quizlet links.

## AI-generated cards

Expand **From an AI assistant** and copy the provided prompt into your preferred
AI assistant with your study notes. Paste the response into the importer and
review the preview before saving. No AI service credentials are needed; REVISIÉ
does not call a generation API itself.

Supported examples:

```json
[{"question":"What does the cell membrane do?","answer":"Controls what enters and leaves the cell."}]
```

```text
What does the cell membrane do? | Controls what enters and leaves the cell.
```

JSON also accepts `front` / `back`, `term` / `definition`, arrays of pairs, and
`cards` or `flashcards` wrappers. Q: / A: blocks and Markdown tables work too.
CSV supports quoted commas, quotes, and multiline answers. Imports are limited
to 2 MB and 2,000 cards; the preview displays the first 30.

## Saving and backups

Cards save locally immediately. Signed-in accounts sync through the existing
Supabase workspace table. Messages distinguish local saves from successful
account sync. Pending changes survive a page reload and retry on the next visit,
when the connection returns, or when the page's visibility changes.

Flashcards merge local additions/edits/deletions with remote changes rather than
replacing the entire deck. Conditional cloud updates retry when another device
changes the workspace during a save. If both devices edit the same card, the
pending local edit wins. Other workspace fields keep pending local values;
personal topics also merge additions/edits/deletions across devices.

**Back up my cards** downloads personal cards as JSON with their original metadata.
Re-importing this file places its cards in the topic you select; it does not
restore the original subject/topic structure or study progress automatically.
Local-only cards depend on retaining this browser's site data. Cross-device
sync requires the same signed-in account and an internet connection.

## Verification

Run `node --test tests/flashcards.test.cjs` and `node --check site.js`.
The tests exercise imports and simulate storage, offline saves, cloud restores,
account switches, edits during uploads, and conflicting device saves.
They do not use a live Supabase account or a physical phone browser.
