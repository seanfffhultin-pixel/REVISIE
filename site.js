const subjectData = {
  mathematics: { label: 'Mathematics', topic: 'Algebra and trigonometry', board: 'Exam board', color: 'coral', icon: 'sigma', category: 'core', cards: [['What is the reciprocal of sin x?', 'cosec x'], ['What is the quadratic formula?', 'x = (-b ± √(b² - 4ac)) / 2a'], ['What is the Pythagorean identity?', 'sin²x + cos²x = 1']] },
  english: { label: 'English', topic: 'Language and Literature', board: 'Exam board', color: 'pink', icon: 'book-open', category: 'core', cards: [['What is a semantic field?', 'A group of words related by meaning.'], ['What should an analytical paragraph explain?', 'How a writer’s choice creates a specific effect and meaning.'], ['What is a thesis statement?', 'A clear central argument that guides an essay.']] },
  biology: { label: 'Biology', topic: 'Cell biology', board: 'Exam board', color: 'green', icon: 'leaf', category: 'science', cards: [['What is the role of the cell membrane?', 'It controls what enters and leaves the cell.'], ['Where does aerobic respiration happen?', 'In the mitochondria.'], ['What is osmosis?', 'The net movement of water across a partially permeable membrane.']] },
  chemistry: { label: 'Chemistry', topic: 'Atomic structure', board: 'Exam board', color: 'yellow', icon: 'flask-conical', category: 'science', cards: [['What is an isotope?', 'Atoms of the same element with different numbers of neutrons.'], ['What is oxidation?', 'Loss of electrons, or gain of oxygen.'], ['What is the relative charge of a proton?', '+1.']] },
  physics: { label: 'Physics', topic: 'Energy and forces', board: 'Exam board', color: 'blue', icon: 'atom', category: 'science', cards: [['What is the equation for kinetic energy?', 'Kinetic energy = ½ × mass × speed².'], ['What is the unit of force?', 'The newton (N).'], ['What does conservation of energy mean?', 'Energy cannot be created or destroyed, only transferred.']] },
  german: { label: 'German', topic: 'Themes and communication', board: 'Exam board', color: 'blue', icon: 'languages', category: 'language', cards: [['What is the German word for “because”?', 'weil'], ['What is the perfect tense used for?', 'Describing completed past actions.'], ['What is a modal verb?', 'A verb such as können, müssen, or wollen that changes the meaning of another verb.']] },
  drama: { label: 'Drama', topic: 'Performance and theatre makers', board: 'Exam board', color: 'pink', icon: 'drama', category: 'option', cards: [['What is proxemics?', 'The use of space and distance between performers.'], ['What is a still image?', 'A frozen picture used to communicate a moment or idea.'], ['What is an evaluation?', 'A reasoned judgement about the effectiveness of a performance choice.']] },
  business: { label: 'Business', topic: 'Business activity and operations', board: 'Exam board', color: 'yellow', icon: 'briefcase-business', category: 'option', cards: [['What is a stakeholder?', 'A person or group affected by a business.'], ['What is revenue?', 'The income from sales before costs are deducted.'], ['What is market segmentation?', 'Dividing a market into groups with similar needs or characteristics.']] },
  citizenship: { label: 'Citizenship', topic: 'Politics and participation', board: 'Exam board', color: 'green', icon: 'landmark', category: 'option', cards: [['What is representative democracy?', 'A system where citizens elect people to make decisions on their behalf.'], ['What is the rule of law?', 'The principle that everyone is subject to the law.'], ['How are source questions assessed?', 'By using evidence and explaining its relevance to the issue.']] },
  'religious-studies': { label: 'Religious Studies', topic: 'Religion, philosophy and ethics', board: 'Exam board', color: 'coral', icon: 'scale', category: 'core', cards: [['What is an ethical argument?', 'A reasoned claim about what is right or wrong.'], ['What is the problem of evil?', 'The challenge of explaining suffering if an all-powerful, all-loving God exists.'], ['What is religious pluralism?', 'The belief that different religions can offer valid paths or perspectives.']] },
};

const builtInSubjectKeys = new Set(Object.keys(subjectData));
const SUPABASE_URL = 'https://ezlxermogoenqqecplev.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_iE62VbJU70uzxAB0IeXs-Q_QfJ9P_2c';
const RESOURCE_BUCKET = 'workspace-files';
const MAX_RESOURCE_FILE_SIZE = 25 * 1024 * 1024;
const syncedStorageKeys = ['revisie-subjects', 'revisie-flashcards', 'revisie-note-library', 'revisie-resources', 'revisie-topics', 'revisie-topic-progress', 'revisie-subject-progress', 'revisie-starter-card-overrides', 'revisie-due', 'revisie-settings', 'revisie-planner-items', 'revisie-streak', 'revisie-flashcard-study', 'revisie-last-activity', 'revisie-folders', 'revisie-quiz-questions', 'revisie-quiz-attempts', 'revisie-maths-topic-skills'];
const workspaceTimestampKey = 'revisie-workspace-updated-at';
const workspaceOwnerKey = 'revisie-workspace-owner-id';
const nativeLocalStorageSetItem = localStorage.setItem.bind(localStorage);
const nativeLocalStorageRemoveItem = localStorage.removeItem.bind(localStorage);
let supabaseClient;
let workspaceSyncTimer;
function installBrandAssets() { let favicon = document.querySelector('link[rel="icon"]'); if (!favicon) { favicon = document.createElement('link'); favicon.rel = 'icon'; document.head.appendChild(favicon); } favicon.type = 'image/png'; favicon.href = 'assets/revisie-favicon.png?v=3'; }
installBrandAssets();
async function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;
  if (!window.supabase) await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); });
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  return supabaseClient;
}
function workspaceSnapshot() { return Object.fromEntries(syncedStorageKeys.map((key) => { const value = localStorage.getItem(key); return [key, key === 'revisie-note-library' && value !== null ? JSON.stringify(JSON.parse(value).map(storedNoteMetadata)) : value]; })); }
const notePhotoCache = new Map();
let notePhotoHydration;
function notePhotoPath(note) {
  if (note.imagePath) return note.imagePath;
  if (!note.image || note.image.startsWith('data:')) return '';
  try {
    const url = new URL(note.image); const origin = new URL(SUPABASE_URL).origin;
    if (url.origin !== origin) return '';
    const prefix = `/storage/v1/object/`;
    const match = url.pathname.slice(prefix.length).match(/^(?:sign|authenticated|public)\/workspace-files\/(.+)$/);
    return url.pathname.startsWith(prefix) && match ? decodeURIComponent(match[1]) : '';
  } catch { return ''; }
}
function storedNoteMetadata(note) {
  const { photoError, ...metadata } = note;
  const imagePath = notePhotoPath(note);
  return imagePath ? { ...metadata, imagePath, image: '' } : metadata;
}
function notePhotoErrorMessage(error) {
  const message = String(error?.message || '').toLowerCase();
  if (/not found|does not exist|404/.test(message) || Number(error?.statusCode) === 404) return 'Photo unavailable: the saved file could not be found. Attach the photo again.';
  if (/permission|unauthorized|forbidden|access denied/.test(message) || [401, 403].includes(Number(error?.statusCode))) return 'Photo unavailable: this account cannot access it. Check your account or attach the photo again.';
  return 'Photo unavailable. Check your connection and use Retry photo, or attach it again.';
}
function hasNotePhoto(note) { return Boolean(notePhotoPath(note) || note.image); }
function notePhotoMarkup(note, className = 'saved-note-image') {
  if (!hasNotePhoto(note)) return '';
  const image = note.image && !note.photoError ? `<img class="${className}" src="${escapeHtml(note.image)}" alt="Photo attached to ${escapeHtml(note.title)}">` : `<span class="note-photo-status" role="status">${escapeHtml(note.photoError || 'Loading photo…')}</span>`;
  return `<span class="note-photo-slot" data-note-photo-slot="${escapeHtml(note.id)}" data-photo-class="${className}">${image}</span>`;
}
function updateNotePhotoSlots() {
  document.querySelectorAll('[data-note-photo-slot]').forEach((slot) => {
    const note = noteLibrary.find((item) => String(item.id) === slot.dataset.notePhotoSlot); if (!note) return;
    const className = slot.dataset.photoClass || 'saved-note-image';
    slot.innerHTML = note.image && !note.photoError ? `<img class="${className}" src="${escapeHtml(note.image)}" alt="Photo attached to ${escapeHtml(note.title)}">` : `<span class="note-photo-status" role="status">${escapeHtml(note.photoError || 'Loading photo…')}</span>`;
    const image = slot.querySelector('img');
    if (image) {
      image.addEventListener('error', () => void handleNotePhotoError(note));
      if (className === 'note-view-image') image.addEventListener('click', () => openPhotoZoom(note.image, `Photo attached to ${note.title}`));
    }
  });
}
async function handleNotePhotoError(note) {
  const path = notePhotoPath(note); const cached = notePhotoCache.get(path);
  if (path) note.imagePath = path;
  note.image = ''; note.photoError = 'Photo unavailable. Open the note and retry, or attach the photo again.';
  if (path && cached && !cached.retried) {
    cached.url = ''; cached.expiresAt = 0; cached.retried = true;
    await hydrateNotePhotos();
  }
  updateNotePhotoSlots();
}
const workspacePendingKey = 'revisie-workspace-pending-v2';
const workspaceMigrationKey = 'revisie-workspace-sync-v2';
let workspaceSyncChain = Promise.resolve();
function pendingWorkspaceChanges() { return JSON.parse(localStorage.getItem(workspacePendingKey) || '{}'); }
// Storage methods cannot safely be replaced on a Storage instance (notably Safari).
// Record changes explicitly, including the original value for three-way card merges.
function saveWorkspaceItem(key, value) {
  if (key === 'revisie-note-library') value = JSON.stringify(JSON.parse(value).map(storedNoteMetadata));
  if (!syncedStorageKeys.includes(key)) { nativeLocalStorageSetItem(key, value); return; }
  const pending = pendingWorkspaceChanges();
  pending[key] = { base: pending[key] ? pending[key].base : localStorage.getItem(key), version: crypto.randomUUID() };
  nativeLocalStorageSetItem(workspacePendingKey, JSON.stringify(pending));
  nativeLocalStorageSetItem(key, value);
  nativeLocalStorageSetItem(workspaceTimestampKey, new Date().toISOString());
  queueWorkspaceSync();
  if (typeof window !== 'undefined') window.revisieNavigation?.schedule(key);
}
function removeWorkspaceItem(key) {
  if (!syncedStorageKeys.includes(key)) { nativeLocalStorageRemoveItem(key); return; }
  saveWorkspaceItem(key, 'null');
  nativeLocalStorageRemoveItem(key);
}
// Calendar dates, rather than elapsed milliseconds, keep streaks correct across DST.
function studyDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function shiftStudyDate(date, days) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
function validStudyDate(date) {
  return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date;
}
function studyDays(value) {
  let state;
  try { state = typeof value === 'string' ? JSON.parse(value) : value; } catch { return []; }
  if (!state || typeof state !== 'object') return [];
  if (Array.isArray(state.days)) return [...new Set(state.days.filter(validStudyDate))].sort();
  // The old counter only stored the end date and run length. Preserve that known run.
  if (!validStudyDate(state.lastDate) || !Number.isInteger(state.current) || state.current < 1) return [];
  return Array.from({ length: Math.min(state.current, 36600) }, (_, index) => shiftStudyDate(state.lastDate, -index)).sort();
}
function mergeWorkspaceStreak(baseValue, localValue, remoteValue) {
  if (localValue == null || localValue === 'null') return localValue;
  return JSON.stringify({ version: 2, days: [...new Set([...studyDays(localValue), ...studyDays(remoteValue)])].sort() });
}
function calculateStreak(value, today = studyDate()) {
  const days = studyDays(value).filter((day) => day <= today);
  let best = 0, run = 0, previous = '';
  for (const day of days) {
    run = previous && shiftStudyDate(previous, 1) === day ? run + 1 : 1;
    best = Math.max(best, run); previous = day;
  }
  const lastDate = days.at(-1) || '';
  const completedToday = lastDate === today;
  const current = completedToday || lastDate === shiftStudyDate(today, -1) ? run : 0;
  return { days, lastDate, current, best, completedToday, total: days.length };
}
const subjectColourPalette = {
  coral: ['#faeee8', '#cd6048'], green: ['#e5f2e4', '#4f8955'], yellow: ['#fff4d5', '#a37e2d'], blue: ['#e4f0f7', '#39718c'], pink: ['#f8e6e5', '#ad696d'], purple: ['#eee7f5', '#80619c'],
  red: ['#fbe7e6', '#b94e4a'], orange: ['#fff0df', '#b87533'], amber: ['#fbf1ce', '#9c781e'], lime: ['#eff4d7', '#7c8b36'], olive: ['#e9eddc', '#6e7f48'], teal: ['#e0f0e9', '#3d8571'], cyan: ['#def2f3', '#36818a'], sky: ['#e7f2fc', '#4d86b5'], indigo: ['#e9eafa', '#646bad'], violet: ['#f0e7fb', '#9167ba'], rose: ['#fbe8ef', '#b96884'], slate: ['#e9edf1', '#637587'], sand: ['#f3ede1', '#99815d'], graphite: ['#e8ebe9', '#58645d']
};
const subjectColours = Object.keys(subjectColourPalette);
function folderItemKey(item) {
  if (item?.type === 'deck' && typeof item.subject === 'string' && typeof item.unit === 'string') return JSON.stringify(['deck', item.subject, item.unit]);
  if (['note', 'resource'].includes(item?.type) && ['string', 'number'].includes(typeof item.id)) return JSON.stringify([item.type, String(item.id)]);
  return null;
}
function folderRecords(value = localStorage.getItem('revisie-folders')) {
  try {
    const records = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(records)) return [];
    const folders = new Map();
    for (const record of records) {
      if (!record || typeof record.id !== 'string' || typeof record.name !== 'string' || !record.name.trim()) continue;
      const items = new Map();
      for (const item of Array.isArray(record.items) ? record.items : []) {
        const key = folderItemKey(item); if (!key) continue;
        items.set(key, item.type === 'deck' ? { type: 'deck', subject: item.subject, unit: item.unit } : { type: item.type, id: String(item.id) });
      }
      folders.set(record.id, { id: record.id, name: record.name.trim().slice(0, 80), color: subjectColours.includes(record.color) ? record.color : 'green', items: [...items.values()] });
    }
    return [...folders.values()];
  } catch { return []; }
}
function mergeWorkspaceFolders(baseValue, localValue, remoteValue) {
  const base = new Map(folderRecords(baseValue ?? null).map(folder => [folder.id, folder]));
  const local = new Map(folderRecords(localValue ?? null).map(folder => [folder.id, folder]));
  const remote = new Map(folderRecords(remoteValue ?? null).map(folder => [folder.id, folder]));
  for (const id of base.keys()) if (!local.has(id)) remote.delete(id);
  for (const [id, folder] of local) {
    const original = base.get(id), other = remote.get(id);
    if (!original) { remote.set(id, folder); continue; }
    // A deletion on either device wins over edits to the same folder.
    if (!other) continue;
    const items = new Map(other.items.map(item => [folderItemKey(item), item]));
    const before = new Set(original.items.map(folderItemKey));
    const after = new Set(folder.items.map(folderItemKey));
    for (const key of before) if (!after.has(key)) items.delete(key);
    for (const item of folder.items) if (!before.has(folderItemKey(item))) items.set(folderItemKey(item), item);
    remote.set(id, { ...other, name: folder.name !== original.name ? folder.name : other.name, color: folder.color !== original.color ? folder.color : other.color, items: [...items.values()] });
  }
  return JSON.stringify([...remote.values()]);
}
function workspaceCardIdentity(card) { return card.id || JSON.stringify([card.subject, card.unit, normaliseQuestion(card.question)]); }
function mergeWorkspaceCards(baseValue, localValue, remoteValue) {
  const parse = (value) => JSON.parse(value || '[]') || [];
  const base = new Map(parse(baseValue).map((card) => [workspaceCardIdentity(card), card]));
  const local = new Map(parse(localValue).map((card) => [workspaceCardIdentity(card), card]));
  const merged = new Map(parse(remoteValue).map((card) => [workspaceCardIdentity(card), card]));
  for (const id of base.keys()) if (!local.has(id)) merged.delete(id);
  for (const [id, card] of local) if (!base.has(id) || JSON.stringify(base.get(id)) !== JSON.stringify(card)) merged.set(id, card);
  return JSON.stringify([...merged.values()]);
}
function mergeWorkspaceTopics(baseValue, localValue, remoteValue) {
  const base = JSON.parse(baseValue || '{}'); const local = JSON.parse(localValue || '{}'); const remote = JSON.parse(remoteValue || '{}');
  const result = { ...remote };
  for (const subject of new Set([...Object.keys(base), ...Object.keys(local)])) {
    const before = new Map((base[subject] || []).map((topic) => [topic.name, topic]));
    const after = new Map((local[subject] || []).map((topic) => [topic.name, topic]));
    const merged = new Map((remote[subject] || []).map((topic) => [topic.name, topic]));
    for (const name of before.keys()) if (!after.has(name)) merged.delete(name);
    for (const [name, topic] of after) if (!before.has(name) || JSON.stringify(before.get(name)) !== JSON.stringify(topic)) merged.set(name, topic);
    result[subject] = [...merged.values()];
  }
  return JSON.stringify(result);
}
const lastActivityKey = 'revisie-last-activity';
function readLastActivity(value = localStorage.getItem(lastActivityKey)) {
  try { const activity = JSON.parse(value || 'null'); return activity && typeof activity === 'object' && typeof activity.type === 'string' && Number.isFinite(activity.updatedAt) ? activity : null; } catch { return null; }
}
function mergeWorkspaceActivity(baseValue, localValue, remoteValue) {
  if (localValue == null || localValue === 'null') return localValue;
  const local = readLastActivity(localValue), remote = readLastActivity(remoteValue);
  return JSON.stringify(!local || remote && remote.updatedAt > local.updatedAt ? remote : local);
}
function rememberActivity(activity) {
  const previous = readLastActivity();
  saveWorkspaceItem(lastActivityKey, JSON.stringify({ ...activity, updatedAt: Math.max(Date.now(), (previous?.updatedAt || 0) + 1) }));
  setupOverviewRoute();
}
function lastActivityDestination() {
  const activity = readLastActivity(); if (!activity) return null;
  if (activity.type === 'folder' || activity.type === 'folder-review') return window.revisieFolders?.activityDestination(activity) || null;
  const subject = subjectData[activity.subject];
  if (activity.subject && (!subject || subject.deleted)) return null;
  if (activity.type === 'review') {
    const unit = getUnits(activity.subject).find(item => item.name === activity.unit);
    if (!unit) return null;
    const deck = getDeck(activity.subject, unit.name);
    if (!deck.length) return null;
    const available = new Map(deck.map(card => [JSON.stringify(card), card]));
    const queue = Array.isArray(activity.queue) ? activity.queue.filter(card => available.has(JSON.stringify(card))).map(card => available.get(JSON.stringify(card))) : [];
    const known = Math.max(0, Math.min(Number(activity.known) || 0, deck.length));
    return { subject: subject.label, title: unit.name, detail: queue.length ? `${known} complete · ${queue.length} remaining` : 'Your last review is complete.', button: queue.length ? 'Resume review' : 'Review again', action: () => reviewCards(deck, `${subject.label} / ${unit.name}`, queue.length ? { queue, known } : null) };
  }
  if (activity.type === 'note') {
    const note = noteLibrary.find(item => String(item.id) === String(activity.id));
    if (!note || subjectData[note.subject]?.deleted) return null;
    return { subject: subjectData[note.subject]?.label || 'Notes', title: note.title, detail: activity.editing ? 'Continue editing your note.' : 'Your last opened note.', button: activity.editing ? 'Edit note' : 'Open note', action: () => activity.editing ? openNotes(note.subject, note.id) : viewNote(note.id) };
  }
  if (activity.type === 'resource') {
    const resource = resourceLibrary.find(item => String(item.id) === String(activity.id));
    if (!resource) return null;
    return { subject: subject?.label || 'Resources', title: resource.name, detail: 'Your last opened PDF.', button: 'Open PDF', action: () => void openResource(resource) };
  }
  if (activity.type === 'composer' && subject) {
    if (activity.unit !== '__new__' && !getUnits(activity.subject).some(item => item.name === activity.unit)) return null;
    return { subject: subject.label, title: activity.unit === '__new__' ? 'New flashcard topic' : activity.unit, detail: 'Continue creating flashcards. Any saved draft will reopen.', button: 'Continue creating', action: () => openCardComposer(activity.subject, activity.unit) };
  }
  if (activity.type === 'subject' && subject) return { subject: 'Subjects', title: subject.label, detail: 'Your last opened subject.', button: 'Open subject', action: () => { location.href = subjectRoute(activity.subject); } };
  const pages = { planner: ['Revision planner', 'Your last opened planner.', 'planner.html'], notes: ['Notes', 'Return to your notes.', 'notes.html'] };
  if (activity.type === 'page' && pages[activity.page]) {
    const [title, detail, route] = pages[activity.page];
    return { subject: 'Workspace', title, detail, button: `Open ${activity.page}`, action: () => { location.href = route; } };
  }
  return null;
}
const flashcardStudyKey = 'revisie-flashcard-study';
let flashcardStudySession = null;
let flashcardStudyTimer;
function flashcardStudyRecords(value = localStorage.getItem(flashcardStudyKey)) {
  let records;
  try { records = JSON.parse(value || '{}'); } catch { return {}; }
  if (!records || typeof records !== 'object' || Array.isArray(records)) return {};
  return Object.fromEntries(Object.entries(records).filter(([, record]) => record && typeof record.subject === 'string' && Number.isFinite(record.milliseconds) && record.milliseconds > 0));
}
function mergeWorkspaceStudyTime(baseValue, localValue, remoteValue) {
  if (localValue == null || localValue === 'null') return localValue;
  const merged = flashcardStudyRecords(remoteValue);
  for (const [id, record] of Object.entries(flashcardStudyRecords(localValue))) {
    if (!merged[id] || record.milliseconds > merged[id].milliseconds) merged[id] = record;
  }
  return JSON.stringify(merged);
}
function flashcardStudyOwner() {
  return localStorage.getItem(workspaceOwnerKey) || JSON.parse(localStorage.getItem('revisie-account') || 'null')?.id || '';
}
function beginFlashcardStudy(subject) {
  endFlashcardStudy();
  flashcardStudySession = { id: crypto.randomUUID(), subject, date: studyDate(), milliseconds: 0, startedAt: document.visibilityState === 'hidden' ? null : performance.now(), owner: flashcardStudyOwner() };
  flashcardStudyTimer = setInterval(() => { flushFlashcardStudy(); setupProgressRoute(); }, 5000);
}
function flushFlashcardStudy() {
  const session = flashcardStudySession; if (!session) return;
  if (session.owner !== flashcardStudyOwner()) { clearInterval(flashcardStudyTimer); flashcardStudySession = null; return; }
  const now = performance.now();
  if (session.startedAt !== null) session.milliseconds += Math.max(0, now - session.startedAt);
  session.startedAt = document.visibilityState === 'hidden' ? null : now;
  const milliseconds = Math.floor(session.milliseconds); if (!milliseconds) return;
  const records = flashcardStudyRecords();
  if ((records[session.id]?.milliseconds || 0) >= milliseconds) return;
  records[session.id] = { subject: session.subject, date: session.date, milliseconds };
  saveWorkspaceItem(flashcardStudyKey, JSON.stringify(records));
}
function endFlashcardStudy() {
  if (!flashcardStudySession) return;
  flushFlashcardStudy(); clearInterval(flashcardStudyTimer); flashcardStudySession = null;
}
function resumeFlashcardStudy() {
  if (flashcardStudySession && flashcardStudySession.startedAt === null && document.visibilityState !== 'hidden') flashcardStudySession.startedAt = performance.now();
}
function studyMinutesLabel(minutes) { return minutes > 0 && minutes < 1 ? '&lt;1' : String(Math.floor(minutes)); }
function clearWorkspaceCache() {
  endFlashcardStudy();
  notePhotoCache.clear();
  syncedStorageKeys.forEach((key) => nativeLocalStorageRemoveItem(key));
  [workspaceTimestampKey, workspacePendingKey, workspaceMigrationKey, 'revisie-flashcard-drafts', 'revisie-card-destination'].forEach((key) => nativeLocalStorageRemoveItem(key));
}
function refreshWorkspaceMemory() {
  window.revisieTheme?.apply();
  for (const [key, target] of [['revisie-flashcards', userCards], ['revisie-subjects', customSubjects], ['revisie-note-library', noteLibrary], ['revisie-resources', resourceLibrary]]) {
    target.splice(0, target.length, ...JSON.parse(localStorage.getItem(key) || '[]'));
  }
  for (const [key, target] of [['revisie-topics', customTopics], ['revisie-starter-card-overrides', starterCardOverrides]]) {
    Object.keys(target).forEach((name) => delete target[name]);
    Object.assign(target, JSON.parse(localStorage.getItem(key) || '{}'));
  }
  registerCustomSubjects();
  refreshFlashcardSurfaces();
  setupCustomSubjects(); setupCustomSubjectActions(); setupSubjectFilters(); setupOverviewRoute(); renderSubjectProgress();
  renderNoteSurfaces();
  renderProfile(); setupSubjectAppearanceButtons(); syncSubjectPageLabel(); renderDeletedSubjectRoute(); lucide.createIcons();
  refreshStreakSurfaces();
  void hydrateNotePhotos();
  window.revisieFolders?.refresh();
  window.revisiePractice?.refresh();
}
function syncWorkspaceNow() {
  const run = workspaceSyncChain.then(syncWorkspaceOnce, syncWorkspaceOnce);
  workspaceSyncChain = run.catch(() => false);
  return run;
}
async function syncWorkspaceOnce() {
  try {
    const client = await getSupabaseClient();
    const { data: { user }, error: userError } = await client.auth.getUser();
    if (userError) throw userError;
    if (!user) return false;
    const cachedOwner = localStorage.getItem(workspaceOwnerKey) || JSON.parse(localStorage.getItem('revisie-account') || 'null')?.id;
    const differentAccount = cachedOwner && cachedOwner !== user.id;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data: remote, error: readError } = await client.from('user_workspaces').select('data, updated_at').eq('user_id', user.id).maybeSingle();
      if (readError) throw readError;
      if (differentAccount && attempt === 0) clearWorkspaceCache();
      // Preserve cards created with the old, untracked storage implementation.
      if (!localStorage.getItem(workspaceMigrationKey)) {
        const pending = pendingWorkspaceChanges();
        if (pending['revisie-flashcards']) pending['revisie-flashcards'].base = '[]';
        for (const key of syncedStorageKeys) {
          const value = localStorage.getItem(key);
          if (value !== null && !pending[key] && (key === 'revisie-flashcards' || !remote || remote.data?.[key] == null || (value !== '[]' && remote.data?.[key] === '[]') || Date.parse(localStorage.getItem(workspaceTimestampKey) || '') > Date.parse(remote.updated_at))) {
            pending[key] = { base: key === 'revisie-flashcards' ? '[]' : (remote?.data?.[key] ?? null), version: crypto.randomUUID() };
          }
        }
        nativeLocalStorageSetItem(workspacePendingKey, JSON.stringify(pending));
        nativeLocalStorageSetItem(workspaceMigrationKey, '1');
      }
      const pending = pendingWorkspaceChanges();
      const snapshot = workspaceSnapshot();
      const merged = { ...(remote?.data || {}) };
      for (const key of syncedStorageKeys) {
        if (pending[key]) {
          const merge = key === 'revisie-folders' ? mergeWorkspaceFolders : ['revisie-flashcards', 'revisie-quiz-questions', 'revisie-quiz-attempts', 'revisie-maths-topic-skills'].includes(key) ? mergeWorkspaceCards : key === 'revisie-topics' ? mergeWorkspaceTopics : key === 'revisie-streak' ? mergeWorkspaceStreak : key === flashcardStudyKey ? mergeWorkspaceStudyTime : key === lastActivityKey ? mergeWorkspaceActivity : null;
          merged[key] = merge ? merge(pending[key].base, snapshot[key], remote?.data?.[key]) : snapshot[key];
        }
        else merged[key] = remote ? (remote.data?.[key] ?? null) : snapshot[key];
      }
      const updatedAt = new Date(Math.max(Date.now(), Date.parse(remote?.updated_at || '') + 1 || 0)).toISOString();
      if (Object.keys(pending).length || !remote) {
        // Compare-and-swap prevents a phone and laptop from overwriting each other.
        const result = remote
          ? await client.from('user_workspaces').update({ data: merged, updated_at: updatedAt }).eq('user_id', user.id).eq('updated_at', remote.updated_at).select('user_id')
          : await client.from('user_workspaces').insert({ user_id: user.id, data: merged, updated_at: updatedAt }).select('user_id');
        if (result.error?.code === '23505' || (!result.error && !result.data?.length)) continue;
        if (result.error) throw result.error;
      }
      const remaining = pendingWorkspaceChanges();
      for (const key of syncedStorageKeys) {
        // An edit made during the request stays pending and is never replaced.
        if (remaining[key]?.version !== pending[key]?.version) {
          if (remaining[key]) remaining[key].base = merged[key];
          continue;
        }
        if (merged[key] == null) nativeLocalStorageRemoveItem(key);
        else nativeLocalStorageSetItem(key, merged[key]);
        delete remaining[key];
      }
      nativeLocalStorageSetItem(workspacePendingKey, JSON.stringify(remaining));
      nativeLocalStorageSetItem(workspaceOwnerKey, user.id);
      nativeLocalStorageSetItem(workspaceTimestampKey, updatedAt);
      refreshWorkspaceMemory();
      if (Object.keys(remaining).length) queueWorkspaceSync();
      return true;
    }
    throw new Error('Workspace changed on another device. Will retry.');
  } catch (error) {
    console.warn('Workspace sync failed. Browser data remains saved locally.', error);
    return false;
  }
}
function queueWorkspaceSync() { clearTimeout(workspaceSyncTimer); workspaceSyncTimer = setTimeout(() => { workspaceSyncTimer = undefined; void syncWorkspaceNow(); }, 700); }
function enableWorkspaceSync() {
  window.addEventListener('online', () => void syncWorkspaceNow());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden' || document.visibilityState === 'visible') void syncWorkspaceNow(); });
  window.addEventListener('pagehide', () => { clearTimeout(workspaceSyncTimer); workspaceSyncTimer = undefined; void syncWorkspaceNow(); });
}
async function restoreWorkspace() { return syncWorkspaceNow(); }
async function restoreSignedInAccount() { if (location.pathname.endsWith('account.html')) return; try { const client = await getSupabaseClient(); const { data: { user } } = await client.auth.getUser(); if (!user) return; const account = JSON.parse(localStorage.getItem('revisie-account') || 'null'); await restoreWorkspace(); await hydrateNotePhotos(); if (!account || account.id !== user.id) saveWorkspaceItem('revisie-account', JSON.stringify({ id: user.id, name: user.user_metadata?.display_name || user.email.split('@')[0], email: user.email })); setupGuestTutorial(); } catch (error) { /* Sign-in remains available even if offline. */ } }
enableWorkspaceSync();

const topicUnits = {
  mathematics: ['Number and algebra', 'Geometry and measures', 'Statistics and probability'],
  english: ['Reading fiction and non-fiction', 'Writing and spoken language', 'Literature texts'],
  biology: ['Cell biology', 'Organisation and bioenergetics', 'Inheritance and ecology'],
  chemistry: ['Atomic structure and the periodic table', 'Bonding and quantitative chemistry', 'Chemical changes and energy'],
  physics: ['Energy and electricity', 'Forces and motion', 'Waves and radioactivity'],
  german: ['Identity and culture', 'Local area, holiday and travel', 'School, future aspirations and international issues'],
  drama: ['Performance skills and design', 'Devising theatre', 'Texts and live theatre evaluation'],
  business: ['Business activity and influences', 'Marketing and people', 'Operations, finance and the external environment'],
  citizenship: ['Living together in the UK', 'Democracy at work in the UK', 'Law, justice and global issues'],
  'religious-studies': ['Christian beliefs and teachings', 'Religion, peace and conflict', 'Philosophy and ethics'],
};
const topicCards = {
  mathematics: { 'Number and algebra': [['What is a prime number?', 'A number greater than 1 with exactly two factors: 1 and itself.'], ['How do you solve 3x + 5 = 20?', 'Subtract 5, then divide by 3: x = 5.'], ['What does it mean to factorise an expression?', 'To write it as a product of its factors.']], 'Geometry and measures': [['What is the sum of angles in a triangle?', '180°.'], ['What is the formula for the area of a circle?', 'πr².'], ['What is Pythagoras’ theorem used for?', 'Finding a missing side in a right-angled triangle.']], 'Statistics and probability': [['What is the probability of an impossible event?', '0.'], ['How is the mean calculated?', 'Add all values and divide by the number of values.'], ['What does the range show in a data set?', 'The difference between the largest and smallest values.']] },
  english: { 'Reading fiction and non-fiction': [['What is a language technique?', 'A deliberate choice of words or structure that creates an effect.'], ['What should you use to support an inference?', 'A relevant quotation or precise reference from the text.'], ['How can a writer structure a text for effect?', 'By controlling the order, focus, pace, and shifts in the text.']], 'Writing and spoken language': [['What should a writing opening establish?', 'A clear purpose, audience, and engaging direction for the piece.'], ['What is a rhetorical question?', 'A question asked for effect rather than to receive an answer.'], ['What does a formal register require?', 'Appropriate vocabulary, tone, and standard grammar.']], 'Literature texts': [['What is a theme in literature?', 'An important idea explored across a text.'], ['What should a literature thesis do?', 'Present a clear argument that answers the question.'], ['How should quotations be used in an essay?', 'Select short evidence and analyse how it supports your point.']] },
  biology: { 'Cell biology': [['What is the function of the nucleus?', 'It contains genetic material and controls the cell’s activities.'], ['Where does aerobic respiration take place?', 'In mitochondria.'], ['What is osmosis?', 'The net movement of water through a partially permeable membrane.']], 'Organisation and bioenergetics': [['What is the role of an enzyme?', 'It catalyses a specific chemical reaction.'], ['What is the word equation for photosynthesis?', 'Carbon dioxide + water → glucose + oxygen.'], ['What does the heart pump around the body?', 'Blood.']], 'Inheritance and ecology': [['What is a gene?', 'A short section of DNA that codes for a characteristic or protein.'], ['What is natural selection?', 'Individuals with advantageous inherited traits are more likely to survive and reproduce.'], ['What is a food chain?', 'A sequence showing how biomass is transferred between organisms.']] },
  chemistry: { 'Atomic structure and the periodic table': [['What is an isotope?', 'Atoms of the same element with different numbers of neutrons.'], ['What is the relative charge of a proton?', '+1.'], ['How are elements arranged in the periodic table?', 'By increasing atomic number.']], 'Bonding and quantitative chemistry': [['What type of bonding involves shared electrons?', 'Covalent bonding.'], ['What is the formula for relative formula mass?', 'Add the relative atomic masses of every atom in the formula.'], ['What is one property of ionic compounds?', 'They conduct electricity when molten or dissolved.']], 'Chemical changes and energy': [['What is oxidation in terms of electrons?', 'Loss of electrons.'], ['What does an exothermic reaction do to the surroundings?', 'Transfers energy to them, raising the temperature.'], ['What is electrolysis?', 'Using electricity to decompose an ionic compound.']] },
  physics: { 'Energy and electricity': [['What is the equation for kinetic energy?', '½ × mass × speed².'], ['What is the unit of electrical current?', 'The ampere, A.'], ['What does conservation of energy mean?', 'Energy cannot be created or destroyed, only transferred.']], 'Forces and motion': [['What is the unit of force?', 'The newton, N.'], ['What is the equation linking speed, distance and time?', 'speed = distance ÷ time.'], ['What does a resultant force cause?', 'A change in an object’s motion or shape.']], 'Waves and radioactivity': [['What is the relationship between wave speed, frequency and wavelength?', 'wave speed = frequency × wavelength.'], ['What is a transverse wave?', 'A wave whose vibrations are perpendicular to the direction of travel.'], ['What is half-life?', 'The time taken for the number of undecayed nuclei to halve.']] },
  german: { 'Identity and culture': [['How do you say “I like” in German?', 'ich mag.'], ['What does “weil” mean?', 'because.'], ['How do you form a simple opinion in German?', 'Use an opinion phrase such as “ich denke, dass…” followed by a reason.']], 'Local area, holiday and travel': [['How do you say “I went” in German?', 'ich bin gegangen.'], ['What does “mit dem Zug” mean?', 'by train.'], ['What question word asks “where?” in German?', 'wo?']], 'School, future aspirations and international issues': [['What does “ich möchte” mean?', 'I would like.'], ['What is the German word for “because” used to give a reason?', 'weil.'], ['What tense is useful for describing future plans?', 'The future tense, often using werden + infinitive.']] },
  drama: { 'Performance skills and design': [['What is proxemics?', 'The use of space and distance between performers.'], ['What can vocal pitch communicate?', 'Status, emotion, age, or intention.'], ['What is the purpose of lighting design?', 'To shape mood, focus attention, and support the action.']], 'Devising theatre': [['What is a stimulus in devising?', 'A starting point that inspires a performance idea.'], ['What is a still image?', 'A frozen picture used to communicate a moment or idea.'], ['Why is rehearsal important in devised work?', 'It develops, refines, and tests performance choices.']], 'Texts and live theatre evaluation': [['What should an evaluation include?', 'A reasoned judgement about the effectiveness of performance choices.'], ['What is an intention of a theatre maker?', 'The response, idea, or meaning they want the audience to receive.'], ['How should you evaluate a live performance?', 'Use specific moments and explain their effect on the audience.']] },
  business: { 'Business activity and influences': [['What is a stakeholder?', 'A person or group affected by a business.'], ['What is an entrepreneur?', 'Someone who organises resources and takes risks to start a business.'], ['What is an external influence on a business?', 'A factor outside the business, such as competition or the economy.']], 'Marketing and people': [['What is market segmentation?', 'Dividing a market into groups with similar needs or characteristics.'], ['What is the marketing mix?', 'The combination of product, price, place, and promotion.'], ['Why is staff training useful?', 'It can improve employee skills, motivation, and productivity.']], 'Operations, finance and the external environment': [['What is revenue?', 'Income from sales before costs are deducted.'], ['What is profit?', 'Revenue minus total costs.'], ['What is productivity?', 'Output per worker or per unit of input.']] },
  citizenship: { 'Living together in the UK': [['What is diversity?', 'The variety of backgrounds, cultures, and identities in society.'], ['What is discrimination?', 'Unfair treatment because of a characteristic or identity.'], ['What is the purpose of the Equality Act 2010?', 'To protect people from unlawful discrimination.']], 'Democracy at work in the UK': [['What is representative democracy?', 'A system where citizens elect people to make decisions on their behalf.'], ['What is the role of an MP?', 'To represent constituents and scrutinise or make laws in Parliament.'], ['What is a general election?', 'An election in which voters choose MPs for Parliament.']], 'Law, justice and global issues': [['What is the rule of law?', 'The principle that everyone is subject to the law.'], ['What is the role of a jury?', 'To decide the verdict in certain criminal trials.'], ['How should source evidence be used in an answer?', 'Select evidence and explain its relevance to the issue.']] },
  'religious-studies': { 'Christian beliefs and teachings': [['What is the Trinity?', 'The Christian belief that God is Father, Son, and Holy Spirit.'], ['What is salvation?', 'Being saved from sin and its consequences.'], ['What does incarnation mean in Christianity?', 'God becoming human in Jesus.']], 'Religion, peace and conflict': [['What is pacifism?', 'The belief that violence and war are never justified.'], ['What is a just war?', 'A war considered morally justifiable under specific conditions.'], ['What is reconciliation?', 'Restoring peaceful relationships after conflict.']], 'Philosophy and ethics': [['What is an ethical argument?', 'A reasoned claim about what is right or wrong.'], ['What is the problem of evil?', 'The challenge of explaining suffering if an all-powerful, all-loving God exists.'], ['What is religious pluralism?', 'The belief that different religions can offer valid paths or perspectives.']] },
};
// Each built-in unit has exactly three topic-specific starter cards.
function normaliseQuestion(question) { return String(question).trim().replace(/\s+/g, ' ').toLocaleLowerCase(); }
function uniqueCards(cards) { const seen = new Set(); return cards.filter((card) => { const key = normaliseQuestion(card[0]); if (!key || seen.has(key)) return false; seen.add(key); return true; }); }
function buildUnitDeck(subjectKey, unitName) {
  const cards = topicCards[subjectKey]?.[unitName] || [[`What is a key idea in ${unitName}?`, 'Define it clearly in your own words.'], [`What example could you use for ${unitName}?`, 'Choose a specific example and explain why it fits the topic.'], [`Why is ${unitName} important?`, 'Explain the key impact, use, or connection in the topic.']];
  return uniqueCards(cards);
}
Object.entries(topicUnits).forEach(([subjectKey, units]) => { if (subjectData[subjectKey]) { subjectData[subjectKey].topics = units.map((name) => ({ name, cards: buildUnitDeck(subjectKey, name) })); subjectData[subjectKey].cards = subjectData[subjectKey].topics[0].cards; } });

let currentSubject = document.body.dataset.subject || 'mathematics';
const customSubjects = JSON.parse(localStorage.getItem('revisie-subjects') || '[]');
const userCards = JSON.parse(localStorage.getItem('revisie-flashcards') || '[]');
const starterCardOverrides = JSON.parse(localStorage.getItem('revisie-starter-card-overrides') || '{}');
const noteLibrary = JSON.parse(localStorage.getItem('revisie-note-library') || '[]');
const resourceLibrary = JSON.parse(localStorage.getItem('revisie-resources') || '[]');
let resourceDatabasePromise;
const customTopics = JSON.parse(localStorage.getItem('revisie-topics') || '{}');
const customSubjectName = new URLSearchParams(location.search).get('name');
if (customSubjectName) { currentSubject = customSubjectName.toLowerCase().replace(/[^a-z0-9]+/g, '-'); if (!subjectData[currentSubject]) subjectData[currentSubject] = { label: customSubjectName, topic: 'My topic', board: 'Exam board', cards: [['What do you want to remember?', 'Add the answer in your notes, then turn it into a flashcard.']] }; }
const subjectSymbols = ['book-open', 'sigma', 'leaf', 'flask-conical', 'atom', 'landmark', 'brain', 'languages', 'globe', 'palette', 'music', 'calculator', 'code', 'briefcase-business', 'scale', 'heart', 'drama', 'lightbulb', 'pen-tool', 'microscope'];
const defaultSubjectStyles = Object.fromEntries(Object.entries(subjectData).map(([key, subject]) => [key, { color: subject.color || 'blue', icon: subject.icon || 'book-open', emoji: '' }]));
const defaultSubjectBoards = Object.fromEntries(Object.entries(subjectData).map(([key, subject]) => [key, subject.board || 'Exam board']));
function subjectEntries() { return Object.entries(subjectData).filter(([, subject]) => !subject.deleted); }
function subjectEmoji(value) {
  if (typeof value !== 'string') return '';
  const emoji = value.trim();
  if (!emoji || emoji.length > 32 || !/\p{Extended_Pictographic}|\p{Regional_Indicator}|[0-9#*]\uFE0F?\u20E3/u.test(emoji)) return '';
  if (typeof Intl.Segmenter === 'function' && [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(emoji)].length !== 1) return '';
  return emoji;
}
function subjectStyle(value = {}) {
  value = value || {};
  return { color: subjectColours.includes(value.color) ? value.color : 'blue', icon: subjectSymbols.includes(value.icon) ? value.icon : 'book-open', emoji: subjectEmoji(value.emoji) };
}
function subjectSymbol(value) {
  const emoji = subjectEmoji(value?.emoji);
  return emoji ? `<span class="subject-emoji" aria-hidden="true">${escapeHtml(emoji)}</span>` : icon(value?.icon || 'book-open');
}
function subjectAppearanceFields(value = {}) {
  const selected = subjectStyle(value);
  const emojis = ['📚', '🧪', '🧬', '🧮', '🌍', '🎨', '🎵', '💻', '⚖️', '💡', '📝', '🧠'];
  return `<div class="subject-appearance-fields"><fieldset><legend>Colour</legend><div class="subject-colour-options">${subjectColours.map((colour) => `<label title="${colour}"><input class="choice-input" type="radio" name="subjectColor" value="${colour}" ${colour === selected.color ? 'checked' : ''}><span class="colour-swatch ${colour}"><span class="sr-only">${colour}</span></span></label>`).join('')}</div></fieldset><fieldset><legend>Symbol</legend><div class="subject-symbol-options">${subjectSymbols.map((symbol) => `<label title="${symbol.replaceAll('-', ' ')}"><input class="choice-input" type="radio" name="subjectIcon" value="${symbol}" ${!selected.emoji && symbol === selected.icon ? 'checked' : ''}><span>${icon(symbol)}<span class="sr-only">${symbol.replaceAll('-', ' ')}</span></span></label>`).join('')}</div><label class="subject-emoji-label" for="subjectEmoji">Or use an emoji<input id="subjectEmoji" name="subjectEmoji" type="text" maxlength="32" value="${escapeHtml(selected.emoji)}" placeholder="Paste an emoji" autocomplete="off" spellcheck="false"></label><div class="subject-emoji-options" aria-label="Emoji suggestions">${emojis.map((emoji) => `<button type="button" data-subject-emoji="${emoji}" aria-label="Use ${emoji}">${emoji}</button>`).join('')}</div></fieldset><div class="subject-appearance-preview"><div class="subject-icon ${selected.color}">${subjectSymbol(selected)}</div><span>Preview</span></div></div>`;
}
function selectedSubjectStyle(form) {
  return subjectStyle({ color: form.querySelector('[name="subjectColor"]:checked')?.value, icon: form.querySelector('[name="subjectIcon"]:checked')?.value, emoji: form.querySelector('[name="subjectEmoji"]')?.value });
}
function bindSubjectAppearance(form) {
  const emoji = form.querySelector('[name="subjectEmoji"]');
  const update = () => {
    emoji.setCustomValidity(emoji.value.trim() && !subjectEmoji(emoji.value) ? 'Use one emoji, for example 🧪.' : '');
    const preview = form.querySelector('.subject-appearance-preview .subject-icon'); if (!preview) return;
    const style = selectedSubjectStyle(form);
    preview.className = `subject-icon ${style.color}`; preview.innerHTML = subjectSymbol(style); lucide.createIcons();
  };
  form.addEventListener('change', (event) => { if (event.target.name === 'subjectIcon') emoji.value = ''; update(); });
  emoji.addEventListener('input', () => { if (emoji.value.trim()) form.querySelectorAll('[name="subjectIcon"]').forEach((input) => { input.checked = false; }); update(); });
  form.querySelectorAll('[data-subject-emoji]').forEach((button) => button.addEventListener('click', () => {
    emoji.value = button.dataset.subjectEmoji; form.querySelectorAll('[name="subjectIcon"]').forEach((input) => { input.checked = false; }); update();
  }));
}
function customiseSubject(subjectKey) {
  const subject = subjectData[subjectKey]; if (!subject) return;
  const backdrop = openModal(`${subject.label} appearance`, `<form class="notes-form">${subjectAppearanceFields(subject)}<button class="primary-button" type="submit">Save changes</button></form>`);
  const form = backdrop.querySelector('form'); bindSubjectAppearance(form);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
    settings.subjectAppearance = { ...settings.subjectAppearance, [subjectKey]: selectedSubjectStyle(form) };
    saveWorkspaceItem('revisie-settings', JSON.stringify(settings));
    registerCustomSubjects(); closeModal(); refreshSubjectAppearance(); notify('Subject updated.');
  });
}
function editSubjectBoard(subjectKey) {
  const subject = subjectData[subjectKey]; if (!subject || subject.deleted) return;
  const backdrop = openModal(`${subject.label} exam board`, `<form class="notes-form"><label class="upload-label" for="subjectBoard">Exam board</label><input id="subjectBoard" class="note-title" list="examBoards" required maxlength="80" value="${escapeHtml(['Personal deck', 'Exam board'].includes(subject.board) ? '' : subject.board)}" placeholder="Choose or type an exam board"><datalist id="examBoards">${['AQA', 'Pearson Edexcel', 'OCR', 'WJEC', 'Eduqas', 'CCEA', 'Cambridge International', 'SQA'].map((board) => `<option value="${board}"></option>`).join('')}</datalist><button class="primary-button" type="submit">Save changes</button></form>`);
  const input = backdrop.querySelector('#subjectBoard');
  input.addEventListener('input', () => input.setCustomValidity(''));
  backdrop.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault(); const board = input.value.trim();
    if (!board) { input.setCustomValidity('Enter an exam board.'); input.reportValidity(); return; }
    const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
    settings.subjectBoards = { ...settings.subjectBoards, [subjectKey]: board };
    saveWorkspaceItem('revisie-settings', JSON.stringify(settings));
    registerCustomSubjects(); closeModal(); refreshSubjectAppearance(); notify('Exam board updated.');
  });
}
function itemActions(label, buttons) {
  return `<details class="item-actions"><summary aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">${icon('ellipsis')}<span class="sr-only">${escapeHtml(label)}</span></summary><div class="item-actions-list">${buttons}</div></details>`;
}
function itemAction(label, symbol, attributes, destructive = false) {
  return `<button type="button" ${attributes}${destructive ? ' class="destructive-action"' : ''}>${icon(symbol)}<span>${escapeHtml(label)}</span></button>`;
}
function setupSubjectAppearanceButtons() {
  if (location.pathname.endsWith('subjects.html')) {
    document.querySelectorAll('[data-subject-card]').forEach((card) => {
      const key = card.dataset.subjectCard;
      let wrap = card.parentElement;
      if (!wrap.classList.contains('custom-subject-wrap') && !wrap.classList.contains('subject-style-wrap')) {
        wrap = document.createElement('div'); wrap.className = 'subject-style-wrap'; card.replaceWith(wrap); wrap.appendChild(card);
      }
      if (wrap.querySelector('.item-actions')) return;
      const index = customSubjects.findIndex((subject) => subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === key);
      let buttons = itemAction('Colour and symbol', 'palette', `data-subject-appearance="${key}"`) + itemAction('Change exam board', 'graduation-cap', `data-subject-board="${key}"`);
      if (index >= 0 && !builtInSubjectKeys.has(key)) buttons += itemAction('Edit subject', 'pencil', `data-edit-subject="${index}"`);
      buttons += itemAction('Delete subject', 'trash-2', `data-delete-subject="${key}"`, true);
      wrap.insertAdjacentHTML('beforeend', itemActions(`Options for ${subjectData[key]?.label || key}`, buttons));
      wrap.querySelector('[data-subject-appearance]').addEventListener('click', () => customiseSubject(key));
      wrap.querySelector('[data-subject-board]').addEventListener('click', () => editSubjectBoard(key));
      wrap.querySelector('[data-edit-subject]')?.addEventListener('click', () => editSubject(index));
      wrap.querySelector('[data-delete-subject]')?.addEventListener('click', () => void deleteSubject(key));
    });
  }
  const actions = document.querySelector('.library-toolbar .subject-actions, .page-intro .subject-actions');
  if (actions && document.getElementById('subjectAddCard') && !actions.querySelector('[data-subject-appearance]')) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'secondary-button'; button.dataset.subjectAppearance = currentSubject; button.innerHTML = `Appearance ${icon('palette')}`;
    button.addEventListener('click', () => customiseSubject(currentSubject)); actions.appendChild(button);
    const boardButton = document.createElement('button'); boardButton.type = 'button'; boardButton.className = 'secondary-button'; boardButton.dataset.subjectBoard = currentSubject; boardButton.innerHTML = `Exam board ${icon('graduation-cap')}`;
    boardButton.addEventListener('click', () => editSubjectBoard(currentSubject)); actions.appendChild(boardButton);
  }
}
function refreshSubjectAppearance() {
  setupCustomSubjects(); setupCustomSubjectActions(); setupSubjectFilters(); setupOverviewRoute(); setupSubjectUnits(); setupFlashcardLibrary(); setupSubjectAppearanceButtons(); syncSubjectPageLabel(); renderTopicProgress(); renderDeletedSubjectRoute(); lucide.createIcons();
}
function registerCustomSubjects() {
  const keys = new Set(customSubjects.map((subject) => subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')));
  Object.keys(subjectData).forEach((key) => { if (subjectData[key].category === 'custom' && !keys.has(key)) delete subjectData[key]; });
  customSubjects.forEach((subject) => {
    const key = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!builtInSubjectKeys.has(key)) subjectData[key] = { label: subject.name, topic: subject.topic || 'My topic', board: 'Exam board', category: 'custom', ...subjectStyle(subject), cards: [] };
  });
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  const appearances = settings.subjectAppearance || {};
  Object.entries(subjectData).forEach(([key, subject]) => {
    subject.deleted = (settings.deletedSubjects || []).includes(key);
    if (builtInSubjectKeys.has(key)) Object.assign(subject, defaultSubjectStyles[key]);
    if (appearances[key]) Object.assign(subject, subjectStyle(appearances[key]));
    subject.board = settings.subjectBoards?.[key] || (builtInSubjectKeys.has(key) ? defaultSubjectBoards[key] : 'Exam board');
  });
}
registerCustomSubjects();
function getUnits(subjectKey) {
  if (!subjectData[subjectKey] || subjectData[subjectKey].deleted) return [];
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  const removed = settings.deletedTopics?.[subjectKey] || [];
  const names = settings.topicNames?.[subjectKey] || {};
  const builtIn = (subjectData[subjectKey].topics || [{ name: subjectData[subjectKey].topic || 'My topic', cards: subjectData[subjectKey].cards || [] }]).filter((unit) => !removed.includes(unit.name)).map((unit) => ({ ...unit, sourceName: unit.name, name: names[unit.name] || unit.name }));
  const personal = (customTopics[subjectKey] || []).map((topic) => ({ name: topic.name, cards: topic.cards || buildUnitDeck(subjectKey, topic.name), custom: true }));
  const units = [...builtIn, ...personal];
  userCards.filter((card) => card.subject === subjectKey).forEach((card) => {
    if (!removed.includes(card.unit) && !units.some((unit) => unit.name === card.unit)) units.push({ name: card.unit, cards: [], recovered: true });
  });
  return units;
}
function starterCardKey(subjectKey, unitName, index) { return `${subjectKey}::${unitName}::${index}`; }
function getStarterDeck(subjectKey, unitName) {
  const units = getUnits(subjectKey); const unit = unitName ? units.find((item) => item.name === unitName) : units[0];
  if (!unit) return [];
  return unit.cards.map((card, index) => { const saved = starterCardOverrides[starterCardKey(subjectKey, unit.name, index)]; return saved ? [saved.question, saved.answer] : card; });
}
function getDeck(subjectKey, unitName) {
  const units = getUnits(subjectKey); const unit = unitName ? units.find((item) => item.name === unitName) : units[0];
  if (!unit) return [];
  return uniqueCards([...getStarterDeck(subjectKey, unit.name), ...userCards.filter((card) => card.subject === subjectKey && card.unit === unit.name).map((card) => [card.question, card.answer])]);
}
const toast = document.getElementById('toast');
let toastTimer;
function icon(name) { return `<i data-lucide="${name}"></i>`; }
// Shared styles are loaded in the document head, before the first paint.
const featureStyles = document.createElement('style');
featureStyles.textContent = '.modal-backdrop{position:fixed;inset:0;background:#16211f99;display:grid;place-items:center;padding:20px;z-index:20}.modal{width:min(540px,100%);background:#f7f8f2;border-radius:10px;box-shadow:0 20px 80px #16211f40;overflow:hidden}.modal-header{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid #e3e9e3}.modal-header h2{font-size:14px}.modal-close{display:grid;place-items:center;width:28px;height:28px}.modal-body{padding:25px}.flashcard-meta{display:flex;justify-content:space-between;color:#74807b;font:9px "DM Mono",monospace;text-transform:uppercase}.flashcard{width:100%;min-height:190px;background:#fff;border:1px solid #e3e9e3;border-radius:8px;display:grid;place-items:center;text-align:center;padding:32px;margin:18px 0;cursor:pointer}.flashcard p{font-size:21px;font-weight:700}.flashcard small{display:block;color:#ff755d;font:9px "DM Mono",monospace;text-transform:uppercase;margin-top:13px}.flashcard.answer{background:#16211f;color:#fff}.flashcard.answer small{color:#d7eb66}.review-actions{display:flex;gap:8px}.review-actions button{flex:1;padding:12px;border-radius:5px;font-size:10px;font-weight:700}.review-actions .again{background:#f5d9d3;color:#9b4031}.review-actions .known{background:#d7eb66;color:#46520f}.note-title,.note-subject{width:100%;padding:12px;margin-bottom:10px;border:1px solid #e3e9e3;border-radius:6px;background:#fff;font:11px Manrope;color:#16211f}.note-subject{height:38px}.notes-form textarea{width:100%;min-height:180px;border:1px solid #e3e9e3;border-radius:6px;background:#fff;padding:14px;resize:vertical;font:12px/1.6 Manrope;color:#16211f}.upload-label{display:block;margin:14px 0 7px;color:#74807b;font:10px "DM Mono",monospace;text-transform:uppercase}.notes-form input[type=file]{width:100%;font-size:10px}.note-preview{display:block;width:100%;max-height:180px;object-fit:contain;margin-top:12px;border-radius:6px}.ocr-button{margin:12px 0;padding:10px 12px;border:1px solid #376f68;border-radius:5px;color:#376f68;font-size:10px;font-weight:700}.planner-list{display:grid;gap:9px}.planner-row{display:flex;align-items:center;gap:11px;background:#fff;border:1px solid #e3e9e3;border-radius:6px;padding:12px}.planner-row input{accent-color:#376f68}.planner-row label{font-size:11px;flex:1}.planner-row small{font:9px "DM Mono",monospace;color:#74807b}.assistant-answer{border-top:1px solid #394440;margin-top:14px;padding-top:13px;color:#e8eee8;font-size:10px;line-height:1.6}.assistant-answer strong{color:#d7eb66}@media(max-width:650px){.modal-body{padding:20px 17px}.flashcard p{font-size:18px}}';
document.head.appendChild(featureStyles);
const libraryStyles = document.createElement('style');
libraryStyles.textContent = '.notes-section{margin-top:42px;max-width:760px}.notes-library{display:grid;gap:10px}.saved-note{display:flex;justify-content:space-between;gap:15px;background:#fff;border:1px solid #e3e9e3;border-radius:8px;padding:16px}.saved-note h3{font-size:13px;margin:6px 0}.saved-note p{color:#74807b;font-size:10px;line-height:1.5;margin:0}.saved-note-actions{display:flex;gap:5px;align-items:flex-start}.saved-note-actions button,.custom-subject-actions button{display:grid;place-items:center;width:28px;height:28px;border-radius:5px;color:#74807b}.saved-note-actions button:hover,.custom-subject-actions button:hover{background:#edf1eb;color:#16211f}.saved-note-actions svg,.custom-subject-actions svg{width:14px}.empty-state{color:#74807b;font-size:11px}.custom-subject-wrap{position:relative}.custom-subject-wrap>.subject-card{height:100%}.custom-subject-actions{position:absolute;right:9px;top:9px;display:flex;gap:3px}.custom-subject-actions button{background:#fff}.subject-notes{display:grid;gap:8px;max-width:600px}.subject-note{background:#fff;border:1px solid #e3e9e3;border-radius:6px;padding:12px}.subject-note strong,.subject-note small{display:block}.subject-note strong{font-size:11px}.subject-note small{color:#74807b;font-size:10px;margin-top:5px}@media(max-width:650px){.saved-note{padding:12px}.saved-note-actions button{width:24px;height:24px}}';
document.head.appendChild(libraryStyles);
const cardManagementStyles = document.createElement('style');
cardManagementStyles.textContent = '.subject-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:22px}.secondary-button{display:flex;align-items:center;gap:8px;padding:12px 15px;border:1px solid #376f68;border-radius:5px;color:#376f68;font-size:10px;font-weight:700}.secondary-button svg{width:14px}.managed-card-intro{color:#74807b;font-size:10px;margin-bottom:12px}.managed-cards{display:grid;gap:8px;margin-bottom:15px}.managed-card{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;background:#fff;border:1px solid #e3e9e3;border-radius:6px;padding:12px}.managed-card strong,.managed-card small{display:block}.managed-card strong{font-size:10px;line-height:1.4}.managed-card small{color:#74807b;font-size:9px;line-height:1.5;margin-top:4px}.managed-card button{display:inline-grid;place-items:center;width:25px;height:25px;margin-left:3px;color:#74807b}.managed-card button:hover{color:#16211f;background:#edf1eb;border-radius:4px}.managed-card svg{width:13px}.search-results{display:grid;gap:7px;max-height:330px;overflow:auto}.search-result{text-align:left;background:#fff;border:1px solid #e3e9e3;border-radius:6px;padding:11px;transition:background .15s}.search-result:hover{background:#edf1eb}.search-result span,.search-result strong,.search-result small{display:block}.search-result span{color:#376f68;font:8px "DM Mono",monospace;text-transform:uppercase}.search-result strong{font-size:10px;margin-top:3px}.search-result small{color:#74807b;font-size:9px;margin-top:3px}';
document.head.appendChild(cardManagementStyles);
const mobileMenuStyles = document.createElement('style');
mobileMenuStyles.textContent = '.mobile-menu-button,.mobile-nav-backdrop{display:none}@media(max-width:650px){.mobile-menu-button{display:grid}.sidebar{display:flex!important;position:fixed;inset:0 auto 0 0;width:min(280px,86vw);z-index:40;transform:translateX(-105%);transition:transform .24s ease;box-shadow:14px 0 36px #16211f26}.mobile-menu-open .sidebar{transform:translateX(0)}.mobile-nav-backdrop{position:fixed;inset:0;z-index:35;background:#16211f66}.mobile-menu-open .mobile-nav-backdrop{display:block}}';
document.head.appendChild(mobileMenuStyles);
const noteImageStyles = document.createElement('style');
noteImageStyles.textContent = '.saved-note-open{display:flex;align-items:center;justify-content:space-between;gap:14px;min-width:0;flex:1;text-align:left}.saved-note-open:hover h3{color:#376f68}.saved-note-image{width:62px;height:62px;flex:0 0 62px;object-fit:cover;border-radius:5px;border:1px solid #e3e9e3}.subject-note{width:100%;text-align:left}.subject-note:hover{background:#f3f6f1}@media(max-width:650px){.saved-note-image{width:48px;height:48px;flex-basis:48px}}';
document.head.appendChild(noteImageStyles);
const resourceStyles = document.createElement('style');
resourceStyles.textContent = '.note-view{color:#44504a;font-size:12px;line-height:1.8;white-space:normal}.note-view-image{display:block;max-width:100%;max-height:280px;object-fit:contain;margin-top:18px;border:1px solid #e3e9e3;border-radius:6px;cursor:zoom-in}.photo-zoom{display:block;max-width:100%;max-height:72vh;margin:auto;object-fit:contain}.resource-list,.subject-resources{display:grid;gap:12px;max-width:760px}.resource-row{display:flex;align-items:center;gap:12px;background:#fff;border:1px solid #e3e9e3;border-radius:7px;padding:13px}.resource-row>svg{width:20px;color:#d65d48}.resource-row>div:not(.resource-actions){min-width:0;flex:1}.resource-row strong,.resource-row small{display:block}.resource-row strong{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.resource-row small{color:#74807b;font-size:9px;margin-top:3px}.resource-actions{display:flex;align-items:center;gap:2px;flex:none}.resource-row button{padding:7px 9px;font-size:9px;font-weight:700;color:#376f68}.resource-frame{width:100%;height:min(65vh,620px);border:1px solid #e3e9e3;border-radius:6px;background:#fff}@media(max-width:650px){.resource-row{align-items:flex-start;flex-wrap:wrap}.resource-row>div:not(.resource-actions){flex-basis:calc(100% - 32px)}.resource-actions{width:100%;padding-top:4px;border-top:1px solid #edf0ed;gap:3px}.resource-actions button{min-height:36px;flex:1;padding:7px 5px}}';
document.head.appendChild(resourceStyles);
const infoStyles = document.createElement('style');
infoStyles.textContent = '.settings-form{max-width:720px;background:#fff;border:1px solid #e3e9e3;border-radius:8px;padding:22px}.settings-section{display:grid;grid-template-columns:1fr 1.2fr;gap:24px;padding:18px 0;border-bottom:1px solid #e3e9e3}.settings-section:first-child{padding-top:0}.settings-section h2{font-size:14px}.settings-section label{display:block;color:#74807b;font-size:10px}.settings-section input,.settings-section select{display:block;width:100%;margin-top:7px;padding:11px;border:1px solid #e3e9e3;border-radius:5px;background:#f7f8f2;font:11px Manrope;color:#16211f}.setting-toggle{display:flex!important;align-items:center;gap:8px}.setting-toggle input{width:auto!important;margin:0!important;accent-color:#376f68}.settings-form>.primary-button{margin-top:20px}.danger-section{max-width:720px;margin-top:42px;padding-top:20px;border-top:1px solid #e3e9e3}.danger-section h2{font-size:14px}.danger-section p{max-width:550px;color:#74807b;font-size:10px;line-height:1.6}.danger-button{padding:11px 14px;border:1px solid #d78b7b;border-radius:5px;color:#a64e3b;font-size:10px;font-weight:700}.help-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;max-width:850px}.help-card{background:#fff;border:1px solid #e3e9e3;border-radius:8px;padding:18px}.help-icon{display:grid;place-items:center;width:31px;height:31px;margin-bottom:15px;border-radius:6px;background:#eaf0e9;color:#376f68}.help-icon svg{width:15px}.help-card h2{font-size:14px;margin-bottom:8px}.help-card p,.help-callout p{color:#74807b;font-size:10px;line-height:1.65;margin:0}.help-callout{max-width:850px;margin-top:35px;padding:22px;background:#eaf0e9;border:1px solid #dce7dd;border-radius:8px}.help-callout h2{margin-bottom:8px}.help-callout .text-button{margin-top:15px}@media(max-width:650px){.settings-section{grid-template-columns:1fr;gap:12px}.help-grid{grid-template-columns:1fr}}';
document.head.appendChild(infoStyles);
const homeStyles = document.createElement('style');
homeStyles.textContent = '.today-focus{background:#eaf0e9;border:1px solid #dce7dd;border-radius:8px;padding:20px;margin:0 0 45px}.focus-heading{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:12px}.focus-heading h2{font-size:19px}.focus-time{display:flex;align-items:center;gap:6px;color:#376f68;font:10px "DM Mono",monospace}.focus-time svg{width:14px}.focus-list{display:grid;grid-template-columns:repeat(3,1fr);gap:9px}.focus-item{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid #dfe8df;border-radius:6px;padding:11px}.focus-number{align-self:flex-start;color:#ff755d;font:10px "DM Mono",monospace}.focus-detail{min-width:0;flex:1}.focus-detail strong,.focus-detail small{display:block}.focus-detail strong{font-size:10px;line-height:1.35}.focus-detail small{color:#84908a;font-size:9px;margin-top:4px}.focus-detail small span{margin:0 3px;color:#c3cac4}.focus-action{display:grid;place-items:center;width:25px;height:25px;border-radius:4px;background:#f2f5ee;color:#376f68}.focus-action svg{width:13px}.streak-button{width:100%;border-left:0;border-right:0;text-align:left;cursor:pointer}.streak-button:hover{background:#f6f8f3}.streak-modal-summary{display:flex;align-items:center;gap:15px;background:#eaf0e9;border-radius:7px;padding:15px;margin-bottom:16px}.streak-big{font-size:34px;font-weight:800;letter-spacing:-.06em;color:#376f68}.streak-modal-summary strong,.streak-modal-summary small{display:block}.streak-modal-summary strong{font-size:12px}.streak-modal-summary small{font-size:10px;color:#74807b;margin-top:3px}.week-dots{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin:18px 0}.week-day{text-align:center;color:#8b968f;font:9px "DM Mono",monospace}.week-day i{display:grid;place-items:center;width:25px;height:25px;margin:7px auto 0;border-radius:50%;background:#edf1eb;color:#adb8af;font-style:normal}.week-day.done i{background:#d7eb66;color:#596613}.week-day.today i{background:#ff755d;color:#fff}.milestone{border-top:1px solid #e3e9e3;padding-top:14px;color:#74807b;font-size:10px;line-height:1.5}@media(max-width:900px){.focus-list{grid-template-columns:1fr}.today-focus{margin-bottom:35px}}';
document.head.appendChild(homeStyles);
const personalStyles = document.createElement('style');
personalStyles.textContent = '.account-panel{display:flex;align-items:center;gap:9px;padding:15px 8px;border-top:1px solid #e3e9e3;border-bottom:1px solid #e3e9e3;margin-bottom:8px}.account-panel-icon{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#eaf0e9;color:#376f68}.account-panel-icon svg{width:14px}.account-panel strong,.account-panel small{display:block}.account-panel strong{font-size:10px}.account-panel small{color:#74807b;font-size:9px;margin-top:3px}.planner-row{display:flex;align-items:flex-start;gap:10px}.planner-row label{flex:1}.planner-row label strong,.planner-row label small{display:block}.planner-row label small{color:#74807b;font-size:9px;margin-top:4px}.planner-row.complete label strong{text-decoration:line-through;color:#74807b}.planner-row button{display:grid;place-items:center;width:24px;height:24px;color:#74807b}.planner-row button svg{width:13px}.allocation-panel{max-width:900px;margin-top:42px;padding-top:22px;border-top:1px solid #e3e9e3}.allocation-form{display:grid;grid-template-columns:1fr 1.2fr 1fr auto;align-items:end;gap:10px;background:#eaf0e9;border:1px solid #dce7dd;border-radius:8px;padding:16px}.allocation-form label{color:#74807b;font-size:10px}.allocation-form input,.allocation-form select{display:block;width:100%;margin-top:7px;padding:11px;border:1px solid #d3dfd5;border-radius:5px;background:#fff;font:11px Manrope;color:#16211f}.allocation-form .primary-button{height:38px}@media(max-width:650px){.allocation-form{grid-template-columns:1fr 1fr}.allocation-form .primary-button{grid-column:span 2}}';
document.head.appendChild(personalStyles);
function notify(message) { if (!toast) return; toast.textContent = message; toast.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('show'), 2800); }
function normalizeSidebar() { const sidebar = document.querySelector('.sidebar'); if (!sidebar || sidebar.dataset.ready === "true") return; sidebar.innerHTML = `<a class="brand brand-logo" href="index.html" aria-label="REVISIÉ home"><img src="assets/revisie-logo.png?v=2" alt="REVISIÉ" width="148" height="63"></a><div class="workspace-switcher"><div class="avatar small">SH</div><div><strong>Sean's workspace</strong><small>GCSE Higher Tier</small></div>${icon('chevrons-up-down')}</div><nav class="main-nav" aria-label="Main navigation"><p class="nav-label">Workspace</p><a class="nav-item" data-page="index.html" href="index.html">${icon('layout-dashboard')}Overview</a><a class="nav-item" data-page="subjects.html" href="subjects.html">${icon('library')}Subjects<span class="nav-count">10</span></a><a class="nav-item" data-page="flashcards.html" href="flashcards.html">${icon('layers-3')}Flashcards<span class="nav-count">18</span></a><a class="nav-item" data-page="multiple-choice.html" href="multiple-choice.html">${icon('list-checks')}Multiple Choice</a><a class="nav-item" data-page="short-answer.html" href="short-answer.html">${icon('square-pen')}Short Answer</a><a class="nav-item" data-page="maths-practice.html" href="maths-practice.html">${icon('calculator')}Maths Practice</a><a class="nav-item" data-page="folders.html" href="folders.html">${icon('folders')}Folders</a><a class="nav-item" data-page="notes.html" href="notes.html">${icon('notebook-pen')}Notes</a><a class="nav-item" data-page="resources.html" href="resources.html">${icon('folder-open')}Resources</a><p class="nav-label second">Tools</p><a class="nav-item" data-page="planner.html" href="planner.html">${icon('calendar-days')}Revision planner</a><a class="nav-item" data-page="progress.html" href="progress.html">${icon('chart-no-axes-combined')}Progress</a></nav>`; }
function subjectCount() { return subjectEntries().length; }
function remainingFlashcardCount() { const saved = topicProgress(); return subjectEntries().map(([key]) => key).reduce((total, subjectKey) => total + getUnits(subjectKey).reduce((unitTotal, unit) => unitTotal + Math.max(0, getDeck(subjectKey, unit.name).length - Number(saved[topicProgressKey(subjectKey, unit.name)] || 0)), 0), 0); }
function updateNavigationCounts() {
  const counts = {
    'subjects.html': { count: subjectCount(), name: 'Subjects', singular: 'subject', plural: 'subjects' },
    'flashcards.html': { count: remainingFlashcardCount(), name: 'Flashcards', singular: 'flashcard remaining', plural: 'flashcards remaining' },
    'folders.html': { count: folderRecords().length, name: 'Folders', singular: 'folder', plural: 'folders' },
    'notes.html': { count: noteLibrary.length, name: 'Notes', singular: 'note', plural: 'notes' },
    'resources.html': { count: resourceLibrary.length, name: 'Resources', singular: 'PDF resource', plural: 'PDF resources' },
    'planner.html': { count: plannerItems().filter(item => !item.done).length, name: 'Revision planner', singular: 'incomplete planned session', plural: 'incomplete planned sessions' },
    ...(window.revisiePractice?.navigationCounts() || {}),
  };
  for (const [page, item] of Object.entries(counts)) {
    const value = Math.max(0, Math.floor(item.count));
    const description = `${value.toLocaleString('en-GB')} ${value === 1 ? item.singular : item.plural}`;
    for (const link of document.querySelectorAll(`.sidebar [data-page="${page}"]`)) {
      let badge = link.querySelector('.nav-count');
      if (!badge) { badge = document.createElement('span'); badge.className = 'nav-count'; link.appendChild(badge); }
      badge.textContent = value >= 10000 ? new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 }).format(value) : value.toLocaleString('en-GB');
      badge.classList.remove('alert');
      badge.title = description;
      badge.setAttribute('aria-hidden', 'true');
      link.title = description;
      link.setAttribute('aria-label', `${item.name}, ${description}`);
    }
    if (location.pathname.endsWith(page)) {
      const intro = document.querySelector('.page-intro');
      if (!intro) continue;
      let total = intro.querySelector('.library-total');
      if (!total) { total = document.createElement('p'); total.className = 'library-total'; (intro.querySelector('.hero-copy') || intro.querySelector('h1'))?.after(total); }
      total.textContent = `${description} in your workspace`;
    }
  }
}
const navigationStorageKeys = new Set(['revisie-subjects', 'revisie-flashcards', 'revisie-topics', 'revisie-settings', 'revisie-starter-card-overrides', 'revisie-topic-progress', 'revisie-folders', 'revisie-note-library', 'revisie-resources', 'revisie-planner-items', 'revisie-quiz-questions', 'revisie-maths-topic-skills']);
let navigationCountRefreshPending = false;
window.revisieNavigation = {
  schedule(key) {
    if ((key && !navigationStorageKeys.has(key)) || navigationCountRefreshPending) return;
    navigationCountRefreshPending = true;
    Promise.resolve().then(() => { navigationCountRefreshPending = false; updateNavigationCounts(); });
  },
};
window.addEventListener('storage', event => window.revisieNavigation.schedule(event.key));
function normalizeTopbar() {
  const topbar = document.querySelector('.topbar');
  if (!topbar) return;
  const avatar = topbar.querySelector('.avatar');
  let actions = topbar.querySelector('.top-actions');
  if (!actions && avatar) {
    actions = document.createElement('div');
    actions.className = 'top-actions';
    topbar.appendChild(actions);
    actions.appendChild(avatar);
  }
  if (!actions) return;
  if (!actions.querySelector('#siteSearch')) actions.insertAdjacentHTML('afterbegin', `<button class="icon-button" id="siteSearch" type="button" title="Search" aria-label="Search subjects and topics">${icon('search')}</button>`);
  if (!actions.querySelector('#mobileMenu')) actions.insertAdjacentHTML('afterbegin', `<button class="icon-button mobile-menu-button" id="mobileMenu" type="button" aria-label="Open navigation menu" aria-expanded="false">${icon('menu')}</button>`);
  if (!actions.querySelector('a[href="help.html"]')) avatar.insertAdjacentHTML('beforebegin', `<a class="icon-button topbar-link" href="help.html" title="Help centre" aria-label="Help centre">${icon('circle-help')}</a>`);
  if (!actions.querySelector('a[href="settings.html"]')) avatar.insertAdjacentHTML('beforebegin', `<a class="icon-button topbar-link" href="settings.html" title="Settings" aria-label="Settings">${icon('settings-2')}</a>`);
  const path = location.pathname.split('/').pop();
  actions.querySelectorAll('.topbar-link').forEach((link) => {
    const active = link.getAttribute('href') === path;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
}
function activateNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  const subjectPages = ['biology.html', 'mathematics.html', 'history.html', 'psychology.html', 'subject.html'];
  const activePage = subjectPages.includes(path) ? 'subjects.html' : path;
  document.querySelectorAll('.nav-item[data-page]').forEach((item) => {
    const active = item.dataset.page === activePage;
    item.classList.toggle('active', active);
    if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
  });
}
function cleanRemovedAssistant() { document.querySelectorAll('a[href="assistant.html"], [data-page="assistant.html"]').forEach((item) => item.remove()); document.querySelectorAll('.help-card').forEach((card) => { if (card.querySelector('h2')?.textContent.trim() === 'Study assistant') { card.querySelector('h2').textContent = 'Study methods'; card.querySelector('p').textContent = 'Use active recall, spaced practice, and short written summaries to turn each unit into knowledge you can retrieve under exam pressure.'; card.querySelector('.help-icon').innerHTML = icon('brain'); } }); }
let modalFocusTarget = null;
let modalBackground = [];
function trapFocus(event, container) {
  if (event.key !== 'Tab') return;
  const controls = [...container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')].filter((element) => element.getClientRects().length && !element.closest('[hidden], [inert]'));
  const first = controls[0]; const last = controls[controls.length - 1];
  if (!first) { event.preventDefault(); container.focus(); return; }
  if (event.shiftKey && (document.activeElement === first || !container.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !container.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}
function openModal(title, body, options = {}) {
  closeModal(options);
  modalFocusTarget = document.activeElement;
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop open';
  backdrop.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" tabindex="-1"><header class="modal-header"><h2>${escapeHtml(title)}</h2><button class="modal-close" type="button" aria-label="Close">${icon('x')}</button></header><div class="modal-body">${body}</div></section>`;
  modalBackground = [...document.querySelectorAll('.app-shell, .auth-page')].map((element) => ({ element, inert: element.inert }));
  modalBackground.forEach(({ element }) => { element.inert = true; });
  document.body.classList.add('modal-open');
  document.body.appendChild(backdrop);
  lucide.createIcons();
  backdrop.addEventListener('click', (event) => { if (event.target === backdrop || event.target.closest('.modal-close')) closeModal(); });
  backdrop.addEventListener('keydown', (event) => trapFocus(event, backdrop.querySelector('.modal')));
  (backdrop.querySelector('.modal-body input:not([type="file"]), .modal-body textarea, .modal-body button, .modal-close') || backdrop.querySelector('.modal')).focus({ preventScroll: true });
  return backdrop;
}
async function copyShareLink(link) { try { await navigator.clipboard.writeText(link); notify('Share link copied.'); } catch (error) { window.prompt('Copy this share link:', link); } }
async function shareItem(itemType, title, payload) { try { const client = await getSupabaseClient(); const { data: { user } } = await client.auth.getUser(); if (!user) { location.href = 'account.html?mode=login'; return; } const id = crypto.randomUUID(); const { error } = await client.from('shared_items').insert({ id, owner_id: user.id, item_type: itemType, title, payload }); if (error) throw error; const link = new URL(`share.html?id=${id}`, location.href).href; if (navigator.share) { try { await navigator.share({ url: link }); notify('Share link ready.'); return; } catch (error) { if (error.name === 'AbortError') return; } } await copyShareLink(link); } catch (error) { notify(error.message || 'Could not create a share link. Run the sharing SQL setup first.'); } }
function shareNote(noteId) { const note = noteLibrary.find((item) => item.id === Number(noteId)); if (note) shareItem('note', note.title, note); }
function shareResource(resourceId) { const resource = resourceLibrary.find((item) => String(item.id) === String(resourceId)); if (resource) shareItem('pdf', resource.name, resource); }
function shareDeck(subjectKey, unitName) { const subject = subjectData[subjectKey]; if (!subject) return; const cards = getDeck(subjectKey, unitName).map(([question, answer]) => ({ question, answer })); if (!cards.length) { notify('Add some flashcards before sharing this deck.'); return; } return shareItem('deck', `${subject.label}: ${unitName}`, { subject: subjectKey, subjectLabel: subject.label, unit: unitName, cards }); }
function shareSubject(subjectKey) { const custom = customSubjects.find((item) => item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subjectKey); const subject = subjectData[subjectKey] || (custom && { label: custom.name, topic: custom.topic, color: 'blue', icon: 'book-open' }); if (!subject) return; shareItem('subject', subject.label, { sourceKey: subjectKey, subject: { name: subject.label, topic: subject.topic || 'First topic', ...subjectStyle(subject) }, topics: customTopics[subjectKey] || [], cards: userCards.filter((card) => card.subject === subjectKey) }); }
function sharedItemPreview(item) { const payload = item.payload || {}; if (item.item_type === 'note') return `<p>${escapeHtml(payload.body || 'No written content.')}</p>${payload.image ? '<p class="auth-note">Includes an attached photo.</p>' : ''}`; if (item.item_type === 'pdf') return `<p>PDF · ${Math.ceil(Number(payload.size || 0) / 1024)} KB</p>`; if (item.item_type === 'deck') return `<p>${payload.cards?.length || 0} flashcards · ${escapeHtml(payload.subjectLabel || payload.subject || 'Subject')} / ${escapeHtml(payload.unit || 'Topic')}</p>`; if (item.item_type === 'subject') return `<p>${escapeHtml(payload.subject?.topic || 'Personal subject')} · ${payload.cards?.length || 0} personal flashcards</p>`; return '<p>This shared item is not available.</p>'; }
async function addSharedItem(item) { const payload = item.payload || {}; if (item.item_type === 'note') { const note = { ...payload, id: Date.now(), updatedAt: new Date().toISOString() }; noteLibrary.unshift(note); saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary)); return 'Note saved to your workspace.'; } if (item.item_type === 'pdf') { const resource = { ...payload, id: Date.now(), savedAt: new Date().toISOString() }; await persistResourceFile(resource); resourceLibrary.push(resource); saveResourceMetadata(); return 'PDF saved to your workspace.'; } const subjectKey = payload.sourceKey || payload.subject || payload.subject?.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'); const subjectName = payload.subject?.name || payload.subjectLabel || subjectKey; if (!subjectData[subjectKey] && !customSubjects.some((subject) => subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subjectKey)) { customSubjects.push({ name: subjectName, topic: payload.subject?.topic || 'First topic', ...subjectStyle(payload.subject) }); saveWorkspaceItem('revisie-subjects', JSON.stringify(customSubjects)); } if (item.item_type === 'subject' && payload.topics?.length) { customTopics[subjectKey] = [...(customTopics[subjectKey] || []), ...payload.topics.filter((topic) => !(customTopics[subjectKey] || []).some((existing) => existing.name.toLowerCase() === topic.name.toLowerCase()))]; saveWorkspaceItem('revisie-topics', JSON.stringify(customTopics)); } const cards = item.item_type === 'deck' ? (payload.cards || []).map((card) => ({ subject: subjectKey, unit: payload.unit || 'Shared deck', question: card.question, answer: card.answer })) : (payload.cards || []).map((card) => ({ ...card, subject: subjectKey })); let saved = 0; cards.forEach((card) => { if (!userCards.some((existing) => existing.subject === card.subject && existing.unit === card.unit && normaliseQuestion(existing.question) === normaliseQuestion(card.question))) { userCards.push(card); saved += 1; } }); if (cards.length) saveWorkspaceItem('revisie-flashcards', JSON.stringify(userCards)); return item.item_type === 'deck' ? `${saved} flashcards saved to your workspace.` : 'Subject saved to your workspace.'; }
async function setupSharedItemPage() { if (!location.pathname.endsWith('share.html')) return; const id = new URLSearchParams(location.search).get('id'); const title = document.getElementById('sharedTitle'); const description = document.getElementById('sharedDescription'); const preview = document.getElementById('sharedPreview'); const save = document.getElementById('saveSharedItem'); const status = document.getElementById('sharedStatus'); if (!id) { title.textContent = 'Link unavailable.'; description.textContent = 'This share link is missing its item ID.'; return; } try { const client = await getSupabaseClient(); const { data, error } = await client.rpc('get_shared_item', { share_id: id }); if (error) throw error; const item = data?.[0]; if (!item) throw new Error('This share link is unavailable or has been removed.'); title.textContent = item.title; description.textContent = `A shared ${item.item_type === 'pdf' ? 'PDF' : item.item_type}.`; preview.innerHTML = sharedItemPreview(item); save.hidden = false; save.addEventListener('click', async () => { const { data: { user } } = await client.auth.getUser(); if (!user) { location.href = `account.html?mode=login`; return; } const message = await addSharedItem(item); await syncWorkspaceNow(); status.textContent = message; save.disabled = true; save.textContent = 'Saved'; }); } catch (error) { title.textContent = 'Link unavailable.'; description.textContent = error.message || 'This shared item could not be opened.'; } }
function closeModal({ preserveFlashcardSession = false } = {}) {
  if (!preserveFlashcardSession) endFlashcardStudy();
  document.querySelector('.modal-backdrop')?.remove();
  document.body.classList.remove('modal-open');
  modalBackground.forEach(({ element, inert }) => { element.inert = inert; });
  modalBackground = [];
  if (modalFocusTarget?.isConnected) modalFocusTarget.focus({ preventScroll: true });
  modalFocusTarget = null;
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]); }
function subjectRoute(subjectKey) { const subject = subjectData[subjectKey]; return ['mathematics', 'biology', 'history', 'psychology'].includes(subjectKey) ? `${subjectKey}.html` : `subject.html?name=${encodeURIComponent(subject?.label || subjectKey)}`; }
function openSiteSearch() {
  const entries = subjectEntries().flatMap(([key, subject]) => [{ key, type: 'Subject', title: subject.label, detail: getUnits(key)[0]?.name || 'No topics yet' }].concat(getUnits(key).flatMap((unit) => [{ key, type: 'Topic', title: unit.name, detail: subject.label }, ...getDeck(key, unit.name).map(([question]) => ({ key, type: 'Flashcard', title: question, detail: `${escapeHtml(subject.label)} · ${escapeHtml(unit.name)}` }))])));
  const backdrop = openModal('Search', `<form class="notes-form" id="siteSearchForm"><input id="siteSearchInput" class="note-title" type="search" autocomplete="off" placeholder="Search subjects, topics, or flashcards"><div id="siteSearchResults" class="search-results" aria-live="polite"></div></form>`);
  const input = backdrop.querySelector('#siteSearchInput'); const results = backdrop.querySelector('#siteSearchResults');
  const render = () => { const query = normaliseQuestion(input.value); if (!query) { results.innerHTML = '<p class="empty-state">Search your subjects, topics, or flashcard questions.</p>'; return; } const matches = entries.filter((entry) => normaliseQuestion(`${entry.title} ${entry.detail}`).includes(query)).slice(0, 12); results.innerHTML = matches.length ? matches.map((entry) => `<button type="button" class="search-result" data-search-subject="${escapeHtml(entry.key)}"><span>${escapeHtml(entry.type)}</span><strong>${escapeHtml(entry.title)}</strong><small>${escapeHtml(entry.detail)}</small></button>`).join('') : '<p class="empty-state">No matching subjects, topics, or flashcards.</p>'; results.querySelectorAll('[data-search-subject]').forEach((button) => button.addEventListener('click', () => { location.href = subjectRoute(button.dataset.searchSubject); })); };
  input.addEventListener('input', render); backdrop.querySelector('#siteSearchForm').addEventListener('submit', (event) => event.preventDefault()); render(); input.focus();
}
function setupTopbarActions() {
  const search = document.getElementById('siteSearch');
  if (search) search.addEventListener('click', openSiteSearch);
  const menu = document.getElementById('mobileMenu');
  const sidebar = document.querySelector('.sidebar');
  if (menu && sidebar) {
    let backdrop = document.querySelector('.mobile-nav-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('button');
      backdrop.className = 'mobile-nav-backdrop';
      backdrop.type = 'button';
      backdrop.tabIndex = -1;
      backdrop.setAttribute('aria-label', 'Close navigation menu');
      document.body.appendChild(backdrop);
    }
    const content = document.querySelector('.main-content');
    const closeMenu = () => {
      const wasOpen = document.body.classList.contains('mobile-menu-open');
      document.body.classList.remove('mobile-menu-open');
      if (content) content.inert = false;
      menu.setAttribute('aria-expanded', 'false');
      menu.setAttribute('aria-label', 'Open navigation menu');
      if (wasOpen) menu.focus({ preventScroll: true });
    };
    menu.addEventListener('click', () => {
      if (document.body.classList.contains('mobile-menu-open')) { closeMenu(); return; }
      document.body.classList.add('mobile-menu-open');
      menu.setAttribute('aria-expanded', 'true');
      menu.setAttribute('aria-label', 'Close navigation menu');
      if (content) content.inert = true;
      sidebar.querySelector('a')?.focus({ preventScroll: true });
    });
    backdrop.addEventListener('click', closeMenu);
    sidebar.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (event) => {
      if (!document.body.classList.contains('mobile-menu-open')) return;
      if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
      else trapFocus(event, sidebar);
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 650) closeMenu(); });
  }
  const avatar = document.querySelector('.topbar .avatar');
  if (avatar) {
    avatar.setAttribute('role', 'button');
    avatar.setAttribute('tabindex', '0');
    avatar.setAttribute('aria-label', 'Open account');
    avatar.addEventListener('click', () => { location.href = 'account.html'; });
    avatar.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); location.href = 'account.html'; } });
  }
}
function reviewCards(cards, title) { let index = 0; const render = () => { const card = cards[index]; const backdrop = openModal(title, `<div class="flashcard-meta"><span>Card ${index + 1} of ${cards.length}</span><span>Click to reveal</span></div><button class="flashcard" id="flashcard"><div><p>${escapeHtml(card[0])}</p><small>Question</small></div></button><div class="review-actions"><button class="again" id="again">Review again</button><button class="known" id="known">I knew this</button></div>`); const flashcard = backdrop.querySelector('#flashcard'); flashcard.addEventListener('click', () => { const answer = flashcard.classList.toggle('answer'); flashcard.querySelector('p').textContent = answer ? card[1] : card[0]; flashcard.querySelector('small').textContent = answer ? 'Answer' : 'Question'; }); backdrop.querySelector('#again').addEventListener('click', () => { markStudyComplete(); notify('Card moved to the end of your queue.'); index = (index + 1) % cards.length; render(); }); backdrop.querySelector('#known').addEventListener('click', () => { markStudyComplete(); notify('Card marked as known. Nice work.'); index = (index + 1) % cards.length; render(); }); }; render(); }
function parseDelimitedFlashcards(text, delimiter) {
  const rows = []; let row = []; let field = ''; let quoted = false; let closed = false;
  const finishField = () => { row.push(field.trim()); field = ''; closed = false; };
  const finishRow = () => { finishField(); if (row.some(Boolean)) rows.push(row); row = []; };
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (char === '"') { quoted = false; closed = true; }
      else field += char;
    } else if (char === delimiter) finishField();
    else if (char === '\n') finishRow();
    else if (char === '"' && !field.trim() && !closed) { field = ''; quoted = true; }
    else if (closed && char.trim()) throw new Error('Unexpected text after a quoted field. Check the chosen separator.');
    else field += char;
  }
  if (quoted) throw new Error('A quoted field is missing its closing quote.');
  finishRow(); return rows;
}
function parseFlashcardImport(source, format = 'auto') {
  let text = String(source).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!text) throw new Error('Paste some cards or choose a file first.');
  if (text.length > 2 * 1024 * 1024) throw new Error('Import up to 2 MB at a time.');
  text = text.replace(/^```(?:json|csv|tsv|text)?\s*\n([\s\S]*?)\n```$/i, '$1').trim();
  if (/^https?:\/\//i.test(text) && !text.includes('\n')) throw new Error('Paste the Quizlet exported terms and definitions, rather than the set link.');
  let rows;
  if (format === 'json' || (format === 'auto' && /^[\[{]/.test(text))) {
    let parsed; try { parsed = JSON.parse(text); } catch { throw new Error('This JSON is invalid. Use an array of question/answer objects.'); }
    rows = Array.isArray(parsed) ? parsed : parsed.cards || parsed.flashcards;
    if (!Array.isArray(rows)) throw new Error('JSON must contain an array of cards.');
    rows = rows.map((card) => Array.isArray(card) ? card : [card?.question ?? card?.front ?? card?.term, card?.answer ?? card?.back ?? card?.definition]);
  } else if (format === 'qa' || (format === 'auto' && /^(?:Q|Question)\s*:/i.test(text))) {
    rows = []; let question = null; let answer = null;
    const finish = () => { if (question !== null) rows.push([question, answer]); };
    for (const line of text.split('\n')) {
      const q = line.match(/^(?:Q|Question)\s*:\s*(.*)$/i); const a = line.match(/^(?:A|Answer)\s*:\s*(.*)$/i);
      if (q) { finish(); question = q[1]; answer = null; }
      else if (a && question !== null && answer === null) answer = a[1];
      else if (line.trim()) {
        if (question === null) throw new Error('Use Q: question followed by A: answer.');
        if (answer === null) question += '\n' + line; else answer += '\n' + line;
      }
    }
    finish();
  } else {
    let delimiter = { tsv: '\t', csv: ',', pipe: '|', semicolon: ';' }[format];
    if (!delimiter) {
      const first = text.split('\n').find((line) => line.trim()) || '';
      delimiter = first.includes('\t') ? '\t' : first.includes('|') ? '|' : first.includes(';') && !first.includes(',') ? ';' : ',';
    }
    rows = parseDelimitedFlashcards(text, delimiter);
    if (delimiter === '|') {
      rows = rows.map((row) => { if (row[0] === '') row.shift(); if (row[row.length - 1] === '') row.pop(); return row; });
      rows = rows.filter((row) => !row.every((cell) => /^:?-{3,}:?$/.test(cell)));
    }
  }
  if (rows.length && /^(question|front|term)$/i.test(String(rows[0][0])) && /^(answer|back|definition)$/i.test(String(rows[0][1]))) rows.shift();
  if (!rows.length) throw new Error('No cards found. Include a question and answer for each card.');
  if (rows.length > 2000) throw new Error('Import up to 2,000 cards at a time.');
  return rows.map((row, index) => {
    if (row.length !== 2 || row.some((value) => typeof value !== 'string' || !value.trim())) throw new Error(`Card ${index + 1} needs exactly two non-empty text fields. Check the format and separator.`);
    return { question: row[0].trim(), answer: row[1].trim() };
  });
}
function prepareFlashcardImport(cards, subject, unit) {
  const seen = new Set((getUnits(subject).some((topic) => topic.name === unit) ? getDeck(subject, unit) : []).map(([question]) => normaliseQuestion(question)));
  const unique = cards.filter((card) => { const key = normaliseQuestion(card.question); if (seen.has(key)) return false; seen.add(key); return true; });
  return { cards: unique, duplicates: cards.length - unique.length };
}
function refreshFlashcardSurfaces() {
  setupFlashcardLibrary(); setupSubjectUnits(); updateNavigationCounts(); renderTopicProgress(); lucide.createIcons();
}
function persistFlashcards(cards) {
  const next = [...userCards, ...cards.map((card) => ({ ...card, id: card.id || crypto.randomUUID() }))];
  saveWorkspaceItem('revisie-flashcards', JSON.stringify(next));
  userCards.splice(0, userCards.length, ...next);
  refreshFlashcardSurfaces();
}
function downloadFlashcards(cards, filename = 'revisie-flashcards.json') {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ cards }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function openFlashcardImport(subjectKey = currentSubject) {
  if (!subjectEntries().length) { openModal('Add a subject first', '<p class="empty-state">Add a subject from the Subjects page before importing flashcards.</p><a class="primary-button" href="subjects.html">Go to Subjects</a>'); return; }
  if (!subjectData[subjectKey] || subjectData[subjectKey].deleted) subjectKey = subjectEntries()[0][0];
  const options = subjectEntries().map(([key, subject]) => `<option value="${escapeHtml(key)}" ${key === subjectKey ? 'selected' : ''}>${escapeHtml(subject.label)}</option>`).join('');
  const backdrop = openModal('Import flashcards', `<form class="notes-form" id="flashcardImportForm">
    <p class="import-help">Paste many cards at once, or upload a TXT, TSV, CSV, or JSON file. All cards go into the subject and topic you choose below.</p>
    <details class="import-help"><summary>From Quizlet</summary><p>On the Quizlet website, open a set you created → More (…) → Export → choose a tab between terms and definitions and a new line between cards → Copy text. Paste it below. Quizlet only exports your own original sets; the app does not offer export.</p><a href="https://help.quizlet.com/hc/en-us/articles/360034345672-Exporting-your-sets" target="_blank" rel="noopener">Quizlet export guide</a></details>
    <details class="import-help"><summary>From an AI assistant</summary><p>Use this prompt with your notes, then paste its response below. Review the answers before importing.</p><textarea id="flashcardAiPrompt" readonly aria-label="AI flashcard prompt">Turn the study notes below into concise flashcards. Use only facts supported by the notes. Return ONLY a JSON array of objects with exactly two string fields: "question" and "answer". Each card should test one idea. Do not repeat questions. Escape quotes and newlines correctly. Study notes: [paste my notes here]</textarea><button class="secondary-button" type="button" id="copyFlashcardPrompt">Copy prompt</button></details>
    <label class="upload-label" for="importSubject">Subject</label><select id="importSubject" class="note-subject">${options}</select>
    <label class="upload-label" for="importUnit">Topic</label><select id="importUnit" class="note-subject"></select>
    <label class="upload-label" for="importNewTopic">Or create a new topic</label><input id="importNewTopic" class="note-title" placeholder="Optional new topic name">
    <label class="upload-label" for="importFormat">Format</label><select id="importFormat" class="note-subject"><option value="auto">Detect automatically</option><option value="tsv">Tab separated (Quizlet / spreadsheets)</option><option value="csv">Comma separated (CSV)</option><option value="semicolon">Semicolon separated</option><option value="pipe">Question | Answer / Markdown table</option><option value="json">JSON (AI / backup)</option><option value="qa">Q: / A: blocks</option></select>
    <label class="upload-label" for="importFile">Choose a file</label><input id="importFile" type="file" accept=".txt,.tsv,.csv,.json,text/plain,text/csv,application/json">
    <label class="upload-label" for="importText">Or paste cards</label><textarea id="importText" placeholder="Question | Answer&#10;What is osmosis? | Movement of water across a partially permeable membrane."></textarea>
    <p id="importError" class="import-error" role="alert"></p><button class="secondary-button" type="button" id="previewFlashcards">Preview cards</button>
    <div id="importPreview" class="import-preview" aria-live="polite"></div><button class="primary-button" type="submit" id="saveImportedCards" disabled>Import cards</button>
  </form>`);
  const subject = backdrop.querySelector('#importSubject'); const unit = backdrop.querySelector('#importUnit'); const format = backdrop.querySelector('#importFormat'); const text = backdrop.querySelector('#importText'); const newTopic = backdrop.querySelector('#importNewTopic');
  const preview = backdrop.querySelector('#importPreview'); const error = backdrop.querySelector('#importError'); const save = backdrop.querySelector('#saveImportedCards'); let prepared = null; let fileReadVersion = 0;
  const invalidate = () => { prepared = null; preview.innerHTML = ''; error.textContent = ''; save.disabled = true; };
  const updateUnits = () => { unit.innerHTML = getUnits(subject.value).map((topic) => `<option>${escapeHtml(topic.name)}</option>`).join(''); invalidate(); };
  subject.addEventListener('change', updateUnits); updateUnits();
  [unit, format, newTopic, text].forEach((input) => input.addEventListener('input', invalidate));
  text.addEventListener('input', () => { fileReadVersion += 1; });
  backdrop.querySelector('#importFile').addEventListener('change', async (event) => {
    invalidate(); const version = ++fileReadVersion; const file = event.target.files[0]; if (!file) return;
    if (file.size > 2 * 1024 * 1024) { error.textContent = 'Choose a file smaller than 2 MB.'; return; }
    try { const content = await file.text(); if (version !== fileReadVersion) return; text.value = content; format.value = /\.csv$/i.test(file.name) ? 'csv' : /\.tsv$/i.test(file.name) ? 'tsv' : /\.json$/i.test(file.name) ? 'json' : 'auto'; }
    catch { error.textContent = 'This file could not be read. Paste the text instead.'; }
  });
  backdrop.querySelector('#copyFlashcardPrompt').addEventListener('click', async () => { const prompt = backdrop.querySelector('#flashcardAiPrompt'); try { await navigator.clipboard.writeText(prompt.value); notify('Prompt copied.'); } catch { prompt.focus(); prompt.select(); notify('Select and copy the prompt.'); } });
  backdrop.querySelector('#previewFlashcards').addEventListener('click', () => {
    invalidate();
    try {
      const topic = newTopic.value.trim() || unit.value;
      prepared = prepareFlashcardImport(parseFlashcardImport(text.value, format.value), subject.value, topic);
      preview.innerHTML = `<p>${prepared.cards.length} new cards · ${prepared.duplicates} duplicate questions skipped · ${escapeHtml(subjectData[subject.value].label)} / ${escapeHtml(topic)}</p><div class="import-preview-cards">${prepared.cards.slice(0, 30).map((card) => `<div class="managed-card"><div><strong>${escapeHtml(card.question)}</strong><small>${escapeHtml(card.answer)}</small></div></div>`).join('')}</div>${prepared.cards.length > 30 ? '<p>Showing the first 30 cards.</p>' : ''}`;
      save.disabled = !prepared.cards.length; save.textContent = `Import ${prepared.cards.length} cards`;
    } catch (err) { error.textContent = err.message; }
  });
  backdrop.querySelector('form').addEventListener('submit', async (event) => {
    event.preventDefault(); if (!prepared?.cards.length) return;
    const topic = newTopic.value.trim() || unit.value;
    const ready = prepareFlashcardImport(prepared.cards, subject.value, topic).cards;
    if (!ready.length) { invalidate(); error.textContent = 'These questions are already saved. Preview again.'; return; }
    try {
      if (!getUnits(subject.value).some((entry) => entry.name === topic)) {
        const topics = [...(customTopics[subject.value] || []), { name: topic, cards: [] }];
        saveWorkspaceItem('revisie-topics', JSON.stringify({ ...customTopics, [subject.value]: topics })); customTopics[subject.value] = topics;
      }
      persistFlashcards(ready.map((card) => ({ ...card, subject: subject.value, unit: topic })));
    } catch { error.textContent = 'Could not save in this browser. Free some storage and try again.'; return; }
    closeModal(); notify(`${ready.length} flashcards imported on this device.`);
    const synced = await syncWorkspaceNow(); notify(synced ? `${ready.length} flashcards imported and synced.` : 'Imported cards saved on this device. Sign in or reconnect to sync.');
  });
}
function readCardDrafts() {
  try { const value = JSON.parse(localStorage.getItem('revisie-flashcard-drafts') || '{}'); return value && typeof value === 'object' && !Array.isArray(value) ? value : {}; } catch { return {}; }
}
function openCardComposer(subjectKey = '', unitName = '') {
  if (!subjectEntries().length) { openModal('Add a subject first', '<p class="empty-state">Add a subject from the Subjects page before making flashcards.</p><a class="primary-button" href="subjects.html">Go to Subjects</a>'); return; }
  let previous;
  try { previous = JSON.parse(localStorage.getItem('revisie-card-destination') || '{}'); } catch { previous = {}; }
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  const isActive = (key) => subjectData[key] && !subjectData[key].deleted;
  const initialSubject = isActive(subjectKey) ? subjectKey : isActive(previous?.subject) ? previous.subject : isActive(currentSubject) ? currentSubject : subjectEntries()[0][0];
  const initialUnit = unitName || (previous?.subject === initialSubject ? previous.unit : '');
  const backdrop = openModal('Add flashcards', `<form class="notes-form card-composer" id="cardComposer"><div class="card-destination"><label for="cardSubject">Subject<select id="cardSubject" class="note-subject">${subjectEntries().map(([key, subject]) => `<option value="${key}" ${key === initialSubject ? 'selected' : ''}>${escapeHtml(subject.label)}</option>`).join('')}</select></label><label for="cardUnit">Topic<select id="cardUnit" class="note-subject"></select></label></div><label class="new-card-topic" for="cardNewTopic" hidden>New topic<input id="cardNewTopic" class="note-title" placeholder="Topic name" maxlength="120"></label><div class="card-writing"><label for="cardQuestion">Question<textarea id="cardQuestion" required placeholder="What do you want to remember?"></textarea></label><label for="cardAnswer">Answer<textarea id="cardAnswer" required placeholder="Write the answer…"></textarea></label></div><p id="cardSaveStatus" class="card-save-status" role="status"></p><div class="card-composer-footer"><span class="card-draft-hint">Unfinished cards are kept as drafts.</span><div><button class="primary-button" type="submit" name="saveMode" value="another">Save & add another</button><button class="secondary-button" type="submit" name="saveMode" value="close">Save & close</button></div></div><p class="card-shortcut">⌘ / Ctrl + Enter to save and add another</p></form>`);
  backdrop.dataset.cardComposer = 'true';
  const form = backdrop.querySelector('form'); const subject = backdrop.querySelector('#cardSubject'); const unit = backdrop.querySelector('#cardUnit');
  const question = backdrop.querySelector('#cardQuestion'); const answer = backdrop.querySelector('#cardAnswer'); const topic = backdrop.querySelector('#cardNewTopic'); const topicLabel = backdrop.querySelector('.new-card-topic'); const status = backdrop.querySelector('#cardSaveStatus');
  let activeSubject = initialSubject, activeUnit = '', added = 0;
  const draftKey = () => JSON.stringify([activeSubject, activeUnit]);
  const rememberDestination = () => { try { saveWorkspaceItem('revisie-card-destination', JSON.stringify({ subject: activeSubject, unit: activeUnit })); rememberActivity({ type: 'composer', subject: activeSubject, unit: activeUnit }); } catch { /* Card saving still works if storage is full. */ } };
  const saveDraft = () => {
    try {
      const drafts = readCardDrafts();
      if (question.value || answer.value || topic.value) drafts[draftKey()] = { question: question.value, answer: answer.value, topic: topic.value };
      else delete drafts[draftKey()];
      saveWorkspaceItem('revisie-flashcard-drafts', JSON.stringify(drafts));
    } catch { status.textContent = 'Could not keep the draft. Leave this form open until you save the card.'; }
  };
  const restoreDraft = () => {
    const draft = readCardDrafts()[draftKey()] || {};
    question.value = typeof draft.question === 'string' ? draft.question : ''; answer.value = typeof draft.answer === 'string' ? draft.answer : ''; topic.value = typeof draft.topic === 'string' ? draft.topic : '';
    topicLabel.hidden = activeUnit !== '__new__'; topic.required = !topicLabel.hidden;
    status.textContent = question.value || answer.value ? 'Unfinished card restored.' : '';
    question.setCustomValidity(''); answer.setCustomValidity(''); rememberDestination();
  };
  const loadUnits = (selected = '') => {
    const units = getUnits(subject.value);
    unit.innerHTML = units.map((item) => `<option value="${escapeHtml(item.name)}">${escapeHtml(item.name)}</option>`).join('') + '<option value="__new__">+ New topic</option>';
    unit.value = selected === '__new__' || units.some((item) => item.name === selected) ? selected : units[0]?.name || '__new__';
    activeSubject = subject.value; activeUnit = unit.value; restoreDraft();
  };
  loadUnits(initialUnit);
  subject.addEventListener('change', () => { saveDraft(); loadUnits(); });
  unit.addEventListener('change', () => { saveDraft(); activeUnit = unit.value; restoreDraft(); if (!topicLabel.hidden) topic.focus(); });
  [question, answer, topic].forEach((input) => input.addEventListener('input', () => { input.setCustomValidity(''); saveDraft(); }));
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const close = event.submitter?.value === 'close';
    const q = question.value.trim(), a = answer.value.trim();
    question.setCustomValidity(q ? '' : 'Enter a question.'); answer.setCustomValidity(a ? '' : 'Enter an answer.');
    let destination = activeUnit;
    if (destination === '__new__') {
      const name = topic.value.trim(); topic.setCustomValidity(name ? '' : 'Enter a topic name.');
      if (name) destination = getUnits(activeSubject).find((item) => item.name.toLowerCase() === name.toLowerCase())?.name || name;
    }
    if (!form.reportValidity()) return;
    if (getUnits(activeSubject).some((item) => item.name === destination) && getDeck(activeSubject, destination).some((card) => normaliseQuestion(card[0]) === normaliseQuestion(q))) {
      status.textContent = 'This question is already in the topic. Change the question or choose another topic.'; question.focus(); return;
    }
    try {
      if (!getUnits(activeSubject).some((item) => item.name === destination)) {
        const topics = { ...customTopics, [activeSubject]: [...(customTopics[activeSubject] || []), { name: destination, cards: [] }] };
        saveWorkspaceItem('revisie-topics', JSON.stringify(topics)); Object.assign(customTopics, topics);
      }
      persistFlashcards([{ subject: activeSubject, unit: destination, question: q, answer: a }]);
    } catch { status.textContent = 'Could not save the card. Free some browser storage and try again. Your text is still here.'; return; }
    added++; question.value = ''; answer.value = ''; topic.value = ''; saveDraft();
    if (activeUnit !== destination) loadUnits(destination);
    rememberDestination();
    status.textContent = `Saved. ${added} ${added === 1 ? 'card' : 'cards'} added.`;
    if (close) { closeModal(); notify(added === 1 ? 'Flashcard saved.' : `${added} flashcards saved.`); }
    else question.focus();
  });
  form.addEventListener('keydown', (event) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && !event.isComposing) {
      event.preventDefault(); form.requestSubmit(form.querySelector('[value="another"]'));
    }
  });
  question.focus();
}
function addFlashcard() { openCardComposer(); }
function addFlashcardFor(subjectKey, unitName) { openCardComposer(subjectKey, unitName); }
function openCardManager(subjectKey, unitName) {
  const subject = subjectData[subjectKey];
  const starterCards = getStarterDeck(subjectKey, unitName).map((card, index) => ({ card, index }));
  const personalCards = userCards.map((card, index) => ({ ...card, index })).filter((card) => card.subject === subjectKey && card.unit === unitName);
  const starterList = starterCards.map(({ card, index }) => `<div class="managed-card"><div><strong>${escapeHtml(card[0])}</strong><small>${escapeHtml(card[1])}</small></div>${itemActions(`Options for ${card[0]}`, itemAction('Edit flashcard', 'pencil', `data-edit-starter="${index}"`))}</div>`).join('');
  const personalList = personalCards.map((card) => `<div class="managed-card"><div><strong>${escapeHtml(card.question)}</strong><small>${escapeHtml(card.answer)}</small></div>${itemActions(`Options for ${card.question}`, itemAction('Edit flashcard', 'pencil', `data-edit-card="${card.index}"`) + itemAction('Delete flashcard', 'trash-2', `data-delete-card="${card.index}"`, true))}</div>`).join('') || '<p class="empty-state">No personal cards in this topic yet.</p>';
  const options = getUnits(subjectKey).map((unit) => `<option ${unit.name === unitName ? 'selected' : ''}>${escapeHtml(unit.name)}</option>`).join('');
  const backdrop = openModal(`${subject.label} flashcards`, `<label class="upload-label" for="manageUnit">Topic</label><select id="manageUnit" class="note-subject">${options}</select><div class="managed-card-intro">Starter questions — edit any question or answer to personalise it.</div><div class="managed-cards">${starterList}</div><div class="managed-card-intro">Your flashcards</div><div class="managed-cards">${personalList}</div><div class="subject-actions"><button class="primary-button" id="addManagedCard">Add flashcard ${icon('plus')}</button><button class="secondary-button" type="button" data-folder-item="${escapeHtml(JSON.stringify({ type: 'deck', subject: subjectKey, unit: unitName }))}">Add to folder ${icon('folder-plus')}</button><button class="secondary-button" id="shareManagedDeck">Share deck ${icon('share-2')}</button></div>`);
  backdrop.querySelector('#manageUnit').addEventListener('change', (event) => openCardManager(subjectKey, event.target.value));
  backdrop.querySelector('#addManagedCard').addEventListener('click', () => addFlashcardFor(subjectKey, unitName));
  backdrop.querySelector('#shareManagedDeck').addEventListener('click', () => shareDeck(subjectKey, unitName));
  backdrop.querySelectorAll('[data-edit-starter]').forEach((button) => button.addEventListener('click', () => editStarterFlashcard(subjectKey, unitName, Number(button.dataset.editStarter))));
  backdrop.querySelectorAll('[data-edit-card]').forEach((button) => button.addEventListener('click', () => editFlashcard(Number(button.dataset.editCard), subjectKey, unitName)));
  backdrop.querySelectorAll('[data-delete-card]').forEach((button) => button.addEventListener('click', () => { const index = Number(button.dataset.deleteCard); if (confirm('Delete this flashcard?')) { userCards.splice(index, 1); saveWorkspaceItem('revisie-flashcards', JSON.stringify(userCards)); refreshFlashcardSurfaces(); openCardManager(subjectKey, unitName); notify('Flashcard deleted.'); } }));
}
function editStarterFlashcard(subjectKey, unitName, index) {
  const card = getStarterDeck(subjectKey, unitName)[index]; if (!card) return;
  const backdrop = openModal('Edit starter flashcard', `<form class="notes-form"><input id="cardQuestion" class="note-title" required value="${escapeHtml(card[0])}"><textarea id="cardAnswer" required>${escapeHtml(card[1])}</textarea><button class="primary-button" type="submit">Save changes ${icon('check')}</button></form>`);
  backdrop.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); starterCardOverrides[starterCardKey(subjectKey, unitName, index)] = { question: backdrop.querySelector('#cardQuestion').value.trim(), answer: backdrop.querySelector('#cardAnswer').value.trim() }; saveWorkspaceItem('revisie-starter-card-overrides', JSON.stringify(starterCardOverrides)); openCardManager(subjectKey, unitName); notify('Starter flashcard updated.'); });
}
function editFlashcard(index, subjectKey, unitName) { const card = userCards[index]; if (!card) return; const backdrop = openModal('Edit flashcard', `<form class="notes-form"><input id="cardQuestion" class="note-title" required value="${escapeHtml(card.question)}"><textarea id="cardAnswer" required>${escapeHtml(card.answer)}</textarea><button class="primary-button" type="submit">Save changes ${icon('check')}</button></form>`); backdrop.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); card.question = backdrop.querySelector('#cardQuestion').value.trim(); card.answer = backdrop.querySelector('#cardAnswer').value.trim(); saveWorkspaceItem('revisie-flashcards', JSON.stringify(userCards)); refreshFlashcardSurfaces(); openCardManager(subjectKey, unitName); notify('Flashcard updated.'); }); }
async function uploadNotePhoto(file, noteId) {
  const client = await getSupabaseClient(); const { data: { user }, error: authError } = await client.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Sign in to save note photos.');
  const path = `${user.id}/notes/${noteId}-${crypto.randomUUID()}.jpg`;
  const compressed = await preprocessImage(file, false);
  if (!compressed || !compressed.size) throw new Error('The photo could not be processed. Try a JPG or PNG photo.');
  const { error } = await client.storage.from(RESOURCE_BUCKET).upload(path, compressed, { contentType: 'image/jpeg', upsert: false });
  if (error) throw error; return path;
}
function hydrateNotePhotos() {
  if (notePhotoHydration) return notePhotoHydration;
  notePhotoHydration = hydrateNotePhotosOnce().finally(() => { notePhotoHydration = undefined; });
  return notePhotoHydration;
}
async function hydrateNotePhotosOnce() {
  if (!noteLibrary.some(hasNotePhoto)) return;
  try {
    const client = await getSupabaseClient(); const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError) throw authError;
    let migrated = false;
    if (user) {
      for (const note of noteLibrary.filter((item) => item.image?.startsWith('data:') && !item.imagePath)) {
        try {
          const blob = await (await fetch(note.image)).blob(); const path = `${user.id}/notes/${note.id}-migrated.jpg`;
          const { error } = await client.storage.from(RESOURCE_BUCKET).upload(path, blob, { contentType: blob.type || 'image/jpeg', upsert: true });
          if (!error) { note.imagePath = path; migrated = true; }
        } catch (error) { console.warn('Legacy note photo migration failed; the embedded photo is retained.', error); }
      }
    }
    const photoNotes = noteLibrary.filter((note) => notePhotoPath(note));
    await Promise.all(photoNotes.map(async (note) => {
      const path = notePhotoPath(note); note.imagePath = path;
      const cached = notePhotoCache.get(path);
      if (!user) { note.image = ''; note.photoError = 'Sign in to load this photo.'; return; }
      if (cached?.url && cached.expiresAt > Date.now()) { note.image = cached.url; delete note.photoError; return; }
      try {
        const { data, error } = await client.storage.from(RESOURCE_BUCKET).createSignedUrl(path, 3600);
        if (error || !data?.signedUrl) throw error || new Error('Photo link unavailable');
        notePhotoCache.set(path, { url: data.signedUrl, expiresAt: Date.now() + 55 * 60 * 1000, retried: cached?.retried || false });
        note.image = data.signedUrl; delete note.photoError;
      } catch (error) {
        // An embedded legacy image is still usable if its upload/link failed.
        if (!note.image?.startsWith('data:')) { note.image = ''; note.photoError = notePhotoErrorMessage(error); }
        console.warn('Note photo could not be loaded.', error);
      }
    }));
    for (const resolved of photoNotes) {
      const current = noteLibrary.find((note) => note.id === resolved.id);
      if (current && current !== resolved && notePhotoPath(current) === resolved.imagePath) {
        current.image = resolved.image;
        if (resolved.photoError) current.photoError = resolved.photoError; else delete current.photoError;
      }
    }
    if (migrated) saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary));
    renderNoteSurfaces(); updateNotePhotoSlots();
  } catch (error) {
    noteLibrary.filter((note) => notePhotoPath(note)).forEach((note) => { note.image = ''; note.photoError = 'Could not load photos. Check your connection and retry.'; });
    renderNoteSurfaces(); updateNotePhotoSlots(); console.warn('Note photo restore failed.', error);
  }
}

function openNotes(subjectKey = currentSubject, noteId = null) {
  const existing = noteId === null ? null : noteLibrary.find((note) => note.id === noteId); const subjectOptions = subjectEntries().map(([key, subject]) => `<option value="${key}" ${key === subjectKey ? 'selected' : ''}>${escapeHtml(subject.label)}</option>`).join('');
  const backdrop = openModal(existing ? 'Edit note' : 'New note', `<form class="notes-form"><input id="noteTitle" class="note-title" required placeholder="Note title" value="${escapeHtml(existing?.title || '')}"><select id="noteSubject" class="note-subject">${subjectOptions}${customSubjects.map((subject) => `<option value="${subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}">${escapeHtml(subject.name)}</option>`).join('')}</select><textarea id="notesText" placeholder="Capture an idea, summary, or question...">${escapeHtml(existing?.body || localStorage.getItem('revisie-notes') || '')}</textarea><label class="upload-label" for="noteImage">Add a photo of handwritten notes</label><input id="noteImage" type="file" accept="image/jpeg,image/png,image/webp" capture="environment"><img id="notePreview" class="note-preview" alt="Uploaded note preview" ${existing?.image ? `src="${escapeHtml(existing.image)}"` : 'hidden'}><button class="ocr-button" type="button" id="ocrButton">Extract text from photo</button><button class="primary-button" type="submit">Save note ${icon('check')}</button></form>`);
  rememberActivity(existing ? { type: 'note', id: existing.id, subject: existing.subject, editing: true } : { type: 'page', page: 'notes' });
  const image = backdrop.querySelector('#noteImage'); const preview = backdrop.querySelector('#notePreview'); let photoFile = null;
  if (existing && hasNotePhoto(existing)) void hydrateNotePhotos().then(() => { if (!photoFile && backdrop.isConnected) { const current = noteLibrary.find((note) => note.id === existing.id); if (current?.image) { preview.src = current.image; preview.hidden = false; } } });
  image.addEventListener('change', () => { photoFile = image.files[0] || null; if (photoFile) { preview.src = URL.createObjectURL(photoFile); preview.hidden = false; } }); backdrop.querySelector('#ocrButton').addEventListener('click', () => runOcr(backdrop));
  backdrop.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const id = existing?.id || Date.now(); const button = backdrop.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Saving note…'; try { const imagePath = photoFile ? await uploadNotePhoto(photoFile, id) : (existing?.imagePath || ''); const note = { id, title: backdrop.querySelector('#noteTitle').value.trim(), subject: backdrop.querySelector('#noteSubject').value, body: backdrop.querySelector('#notesText').value.trim(), image: existing?.imagePath ? '' : (photoFile ? '' : (existing?.image || '')), imagePath, updatedAt: new Date().toISOString() }; const index = noteLibrary.findIndex((item) => item.id === note.id); if (index >= 0) noteLibrary[index] = note; else noteLibrary.unshift(note); saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary)); saveWorkspaceItem('revisie-notes', note.body); rememberActivity({ type: 'note', id: note.id, subject: note.subject }); await syncWorkspaceNow(); await hydrateNotePhotos(); closeModal(); renderNoteSurfaces(); notify('Note saved to your library.'); } catch (error) { notify(error.message || 'This note photo could not be saved. Run the storage setup SQL, then try again.'); } finally { button.disabled = false; button.innerHTML = `Save note ${icon('check')}`; lucide.createIcons(); } });
}
function preprocessImage(file, forOcr = true) {
  return new Promise((resolve, reject) => {
    const image = new Image(); const objectUrl = URL.createObjectURL(file);
    const fail = (message) => { URL.revokeObjectURL(objectUrl); reject(new Error(message)); };
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1800 / Math.max(image.width, image.height));
        canvas.width = Math.max(1, Math.round(image.width * scale)); canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext('2d'); if (!context) { fail('This browser could not process the photo.'); return; }
        if (forOcr) context.filter = 'grayscale(1) contrast(1.35) brightness(1.08)';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => { URL.revokeObjectURL(objectUrl); if (blob?.size) resolve(blob); else reject(new Error('The photo could not be processed. Try a smaller JPG or PNG photo.')); }, 'image/jpeg', .92);
      } catch { fail('The photo could not be processed. Try a JPG or PNG photo.'); }
    };
    image.onerror = () => fail('The photo could not be read. Try a JPG, PNG, or WebP photo.'); image.src = objectUrl;
  });
}
function imageToDataUrl(file) { return new Promise((resolve, reject) => { const image = new Image(); const objectUrl = URL.createObjectURL(file); image.onload = () => { const scale = Math.min(1, 1200 / Math.max(image.width, image.height)); const canvas = document.createElement('canvas'); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale); canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height); URL.revokeObjectURL(objectUrl); resolve(canvas.toDataURL('image/jpeg', .8)); }; image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image could not be read.')); }; image.src = objectUrl; }); }
function openPhotoZoom(source, alt = 'Attached note photo') { const backdrop = openModal('Photo', `<img class="photo-zoom" src="${escapeHtml(source)}" alt="${escapeHtml(alt)}">`); backdrop.querySelector('.photo-zoom').addEventListener('click', () => closeModal()); }
function viewNote(noteId) { const note = noteLibrary.find((item) => item.id === noteId); if (!note) return; rememberActivity({ type: 'note', id: note.id, subject: note.subject }); const body = escapeHtml(note.body || '').replace(/\n/g, '<br>'); const backdrop = openModal(note.title, `<div class="flashcard-meta"><span>${subjectData[note.subject]?.label || note.subject}</span><span>${new Date(note.updatedAt).toLocaleDateString()}</span></div><div class="note-view">${body || '<em>No written content.</em>'}</div>${notePhotoMarkup(note, 'note-view-image')}${hasNotePhoto(note) ? '<button class="secondary-button" id="retryNotePhoto" type="button">Retry photo</button>' : ''}<div class="subject-actions"><button class="primary-button" id="editViewedNote">Edit note ${icon('pencil')}</button><button class="secondary-button" type="button" data-folder-item="${escapeHtml(JSON.stringify({ type: 'note', id: note.id }))}">Add to folder ${icon('folder-plus')}</button></div>`); backdrop.querySelector('#editViewedNote').addEventListener('click', () => openNotes(note.subject, note.id)); backdrop.querySelector('#retryNotePhoto')?.addEventListener('click', async () => { const path = notePhotoPath(note); if (path) { notePhotoCache.delete(path); note.imagePath = path; note.image = ''; } delete note.photoError; updateNotePhotoSlots(); await hydrateNotePhotos(); }); updateNotePhotoSlots(); void hydrateNotePhotos(); }
function fileToDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('File could not be read.')); reader.readAsDataURL(file); }); }
function getResourceDatabase() { if (resourceDatabasePromise) return resourceDatabasePromise; resourceDatabasePromise = new Promise((resolve, reject) => { const request = indexedDB.open('revisie-resource-files', 1); request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files', { keyPath: 'id' }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); return resourceDatabasePromise; }
function resourceDatabaseRequest(mode, action) { return getResourceDatabase().then((database) => new Promise((resolve, reject) => { const transaction = database.transaction('files', mode); const request = action(transaction.objectStore('files')); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); })); }
function saveResourceMetadata() { saveWorkspaceItem('revisie-resources', JSON.stringify(resourceLibrary.map(({ data, ...resource }) => resource))); }
async function persistResourceFile(resource) { await resourceDatabaseRequest('readwrite', (store) => store.put({ id: resource.id, data: resource.data })); }
async function removeResourceFile(resourceId) { await resourceDatabaseRequest('readwrite', (store) => store.delete(resourceId)); }
async function prepareResourceLibrary() { try { let migrated = false; for (const resource of resourceLibrary) { if (resource.data) { await persistResourceFile(resource); migrated = true; } else { const stored = await resourceDatabaseRequest('readonly', (store) => store.get(resource.id)); if (stored?.data) resource.data = stored.data; } } if (migrated) saveResourceMetadata(); renderResources(); renderSubjectResources(); } catch (error) { console.warn('PDF storage could not be prepared.', error); } }
function resourceSubjectOptions(selected = '') { const builtIn = subjectEntries().map(([key, subject]) => `<option value="${key}" ${key === selected ? 'selected' : ''}>${escapeHtml(subject.label)}</option>`); const personal = customSubjects.filter((subject) => !subjectData[subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')]).map((subject) => { const key = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); return `<option value="${key}" ${key === selected ? 'selected' : ''}>${escapeHtml(subject.name)}</option>`; }); return [...builtIn, ...personal].join(''); }
function resourceSubjectLabel(subjectKey) { return subjectData[subjectKey]?.label || customSubjects.find((subject) => subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === subjectKey)?.name || subjectKey || 'Unassigned'; }
function resourceFile(resource) { const [header, encoded] = String(resource.data || '').split(','); const mime = header.match(/data:([^;]+)/)?.[1] || 'application/pdf'; const binary = atob(encoded || ''); const bytes = new Uint8Array(binary.length); for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index); return new File([bytes], resource.name || 'revision-pdf.pdf', { type: mime }); }
function resourceObjectUrl(resource) { return URL.createObjectURL(resourceFile(resource)); }
async function resourceUrl(resource) { if (!resource.data && !resource.storagePath) { const stored = await resourceDatabaseRequest('readonly', store => store.get(resource.id)); if (stored?.data) resource.data = stored.data; } if (resource.data) return resourceObjectUrl(resource); if (!resource.storagePath) throw new Error('This PDF is not available in cloud storage.'); const client = await getSupabaseClient(); const { data, error } = await client.storage.from(RESOURCE_BUCKET).createSignedUrl(resource.storagePath, 300); if (error) throw error; return data.signedUrl; }
async function openResource(resource) { try { const url = await resourceUrl(resource); rememberActivity({ type: 'resource', id: resource.id, subject: resource.subject }); const link = document.createElement('a'); link.href = url; link.target = '_blank'; link.rel = 'noopener'; document.body.appendChild(link); link.click(); link.remove(); if (resource.data) setTimeout(() => URL.revokeObjectURL(url), 300000); } catch (error) { notify(error.message || 'This PDF could not be opened.'); } }
async function downloadResource(resource) { try { if (resource.data) { const file = resourceFile(resource); if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], title: resource.name || 'Revision PDF' }); return; } const url = URL.createObjectURL(file); const link = document.createElement('a'); link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); return; } const url = await resourceUrl(resource); const link = document.createElement('a'); link.href = url; link.download = resource.name || 'revision-pdf.pdf'; document.body.appendChild(link); link.click(); link.remove(); if (resource.data) setTimeout(() => URL.revokeObjectURL(url), 1000); } catch (error) { if (error.name !== 'AbortError') notify(error.message || 'This PDF could not be downloaded.'); } }
function renderResourceList(list, resources, emptyMessage) { if (!list) return; list.innerHTML = resources.length ? resources.map((resource) => `<article class="resource-row">${icon('file-text')}<div><strong>${escapeHtml(resource.name)}</strong><small>${escapeHtml(resourceSubjectLabel(resource.subject))} · ${Math.ceil(resource.size / 1024)} KB · saved ${new Date(resource.savedAt).toLocaleDateString()}</small></div><div class="resource-actions"><button data-open-resource="${resource.id}">Open</button><button data-download-resource="${resource.id}">Download</button><button data-folder-item="${escapeHtml(JSON.stringify({ type: 'resource', id: resource.id }))}">Add to folder</button><button data-share-resource="${resource.id}">Share</button><button data-delete-resource="${resource.id}">Delete</button></div></article>`).join('') : `<p class="empty-state">${emptyMessage}</p>`; list.querySelectorAll('[data-open-resource]').forEach((button) => button.addEventListener('click', () => { const resource = resourceLibrary.find((item) => String(item.id) === button.dataset.openResource); if (resource) openResource(resource); })); list.querySelectorAll('[data-download-resource]').forEach((button) => button.addEventListener('click', () => { const resource = resourceLibrary.find((item) => String(item.id) === button.dataset.downloadResource); if (resource) downloadResource(resource); })); list.querySelectorAll('[data-share-resource]').forEach((button) => button.addEventListener('click', () => shareResource(button.dataset.shareResource))); list.querySelectorAll('[data-delete-resource]').forEach((button) => button.addEventListener('click', async () => { const index = resourceLibrary.findIndex((item) => String(item.id) === button.dataset.deleteResource); if (index >= 0 && confirm('Delete this PDF?')) { const [resource] = resourceLibrary.splice(index, 1); if (resource.storagePath) { const client = await getSupabaseClient(); const { error } = await client.storage.from(RESOURCE_BUCKET).remove([resource.storagePath]); if (error) throw error; } else await removeResourceFile(resource.id); saveResourceMetadata(); await syncWorkspaceNow(); renderResources(); renderSubjectResources(); notify('PDF deleted.'); } })); }
function renderResources() { renderResourceList(document.querySelector('.resource-list'), resourceLibrary, 'Save PDFs here so they are ready when you revise.'); }
function renderSubjectResources() { const list = document.querySelector('.subject-resources'); if (list) renderResourceList(list, resourceLibrary.filter((resource) => resource.subject === currentSubject), 'No PDFs for this subject yet.'); }
function setupResourcesPage() { if (!location.pathname.endsWith('resources.html')) return; const form = document.getElementById('resourceUploadForm'); const subjectSelect = document.getElementById('resourceSubject'); if (!form || !subjectSelect) return; const requestedSubject = new URLSearchParams(location.search).get('subject'); const defaultSubject = subjectData[requestedSubject] || customSubjects.some((subject) => subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === requestedSubject) ? requestedSubject : currentSubject; subjectSelect.innerHTML = resourceSubjectOptions(defaultSubject); form.addEventListener('submit', async (event) => { event.preventDefault(); const file = document.getElementById('resourceFile').files[0]; if (!file) { notify('Choose a PDF first.'); return; } if (file.type !== 'application/pdf') { notify('Please choose a PDF file.'); return; } if (file.size > MAX_RESOURCE_FILE_SIZE) { notify('Please choose a PDF smaller than 25 MB.'); return; } const button = form.querySelector('button'); button.disabled = true; button.textContent = 'Saving PDF…'; try { const client = await getSupabaseClient(); const { data: { user } } = await client.auth.getUser(); if (!user) { location.href = 'account.html?mode=login'; return; } const id = crypto.randomUUID(); const storagePath = `${user.id}/${id}.pdf`; const { error: uploadError } = await client.storage.from(RESOURCE_BUCKET).upload(storagePath, file, { contentType: 'application/pdf', upsert: false }); if (uploadError) throw uploadError; const resource = { id, name: file.name, subject: subjectSelect.value, size: file.size, storagePath, savedAt: new Date().toISOString() }; resourceLibrary.push(resource); saveResourceMetadata(); await syncWorkspaceNow(); form.reset(); subjectSelect.value = defaultSubject; renderResources(); notify('PDF saved to your account.'); } catch (error) { notify(error.message || 'This PDF could not be saved. Run the storage setup SQL, then try again.'); } finally { button.disabled = false; button.textContent = 'Save PDF'; } }); renderResources(); }
async function runOcr(backdrop) { const file = backdrop.querySelector('#noteImage').files[0]; if (!file) { notify('Choose a photo first.'); return; } const button = backdrop.querySelector('#ocrButton'); button.textContent = 'Reading photo...'; if (!window.Tesseract) { await new Promise((resolve, reject) => { const script = document.createElement('script'); script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'; script.onload = resolve; script.onerror = reject; document.head.appendChild(script); }); } try { const processedImage = await preprocessImage(file); const result = await Tesseract.recognize(processedImage, 'eng'); const text = result.data.text.trim(); backdrop.querySelector('#notesText').value = text || 'No text detected. Try a brighter, flatter photo.'; button.textContent = text ? 'Text extracted' : 'Try another photo'; } catch (error) { button.textContent = 'OCR unavailable'; notify('OCR could not read that image. You can still type your note.'); } }
function renderNoteSurfaces() { const noteArea = document.querySelector('.notes-library'); if (noteArea) { noteArea.innerHTML = noteLibrary.length ? noteLibrary.map((note) => `<article class="saved-note"><button class="saved-note-open" data-open-note="${note.id}" aria-label="Open ${escapeHtml(note.title)}"><div><span class="subject-label">${subjectData[note.subject]?.label || note.subject}</span><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.body.slice(0, 140))}${note.body.length > 140 ? '...' : ''}</p></div>${notePhotoMarkup(note)}</button><div class="saved-note-actions"><button data-edit-note="${note.id}" aria-label="Edit ${escapeHtml(note.title)}">${icon('pencil')}</button><button data-folder-item="${escapeHtml(JSON.stringify({ type: 'note', id: note.id }))}" aria-label="Add ${escapeHtml(note.title)} to folder">${icon('folder-plus')}</button><button data-share-note="${note.id}" aria-label="Share ${escapeHtml(note.title)}">${icon('share-2')}</button><button data-delete-note="${note.id}" aria-label="Delete ${escapeHtml(note.title)}">${icon('trash-2')}</button></div></article>`).join('') : '<p class="empty-state">Your saved notes will appear here.</p>'; noteArea.querySelectorAll('[data-open-note]').forEach((button) => button.addEventListener('click', () => viewNote(Number(button.dataset.openNote)))); noteArea.querySelectorAll('[data-edit-note]').forEach((button) => button.addEventListener('click', () => openNotes(currentSubject, Number(button.dataset.editNote)))); noteArea.querySelectorAll('[data-share-note]').forEach((button) => button.addEventListener('click', () => shareNote(button.dataset.shareNote))); noteArea.querySelectorAll('[data-delete-note]').forEach((button) => button.addEventListener('click', async () => { const index = noteLibrary.findIndex((note) => note.id === Number(button.dataset.deleteNote)); if (index >= 0 && confirm('Delete this note?')) { noteLibrary.splice(index, 1); saveWorkspaceItem('revisie-note-library', JSON.stringify(noteLibrary)); await syncWorkspaceNow(); renderNoteSurfaces(); notify('Note deleted.'); } })); } const subjectNotes = document.querySelector('.subject-notes'); if (subjectNotes) { const notes = noteLibrary.filter((note) => note.subject === currentSubject); subjectNotes.innerHTML = notes.length ? notes.map((note) => `<button class="subject-note" data-open-note="${note.id}"><strong>${escapeHtml(note.title)}</strong><small>${escapeHtml(note.body.slice(0, 90))}${note.body.length > 90 ? '...' : ''}</small>${notePhotoMarkup(note)}</button>`).join('') : '<p class="empty-state">No notes for this subject yet.</p>'; subjectNotes.querySelectorAll('[data-open-note]').forEach((button) => button.addEventListener('click', () => viewNote(Number(button.dataset.openNote)))); } updateNotePhotoSlots(); }
function setupNotesPage() { if (!location.pathname.endsWith('notes.html')) return; const wrap = document.querySelector('.page-wrap'); if (!wrap || document.querySelector('.notes-library')) return; wrap.insertAdjacentHTML('beforeend', '<section class="notes-section"><div class="section-heading"><div><p class="eyebrow">SAVED KNOWLEDGE</p><h2>All notes</h2></div></div><div class="notes-library"></div></section>'); renderNoteSurfaces(); }
function plannerItems() { return JSON.parse(localStorage.getItem('revisie-planner-items') || '[]'); }
function openPlanner() { const items = plannerItems(); const list = items.length ? items.map((item) => `<div class="planner-row ${item.done ? 'complete' : ''}"><input data-plan-done="${item.id}" type="checkbox" ${item.done ? 'checked' : ''}><label><strong>${item.title}</strong><small>${item.subject} · ${item.date || 'Today'} · ${item.minutes} min</small></label><button data-edit-plan="${item.id}" aria-label="Edit ${item.title}">${icon('pencil')}</button><button data-delete-plan="${item.id}" aria-label="Delete ${item.title}">${icon('trash-2')}</button></div>`).join('') : '<p class="empty-state">Your plan is empty. Add a session to decide what happens next.</p>'; const backdrop = openModal('Organise your revision', `<p class="hero-copy">Build a plan that fits your day. Sessions are saved in this browser.</p><div class="planner-list">${list}</div><button class="primary-button" id="addPlan">Add study session ${icon('plus')}</button>`); backdrop.querySelector('#addPlan').addEventListener('click', () => editPlan()); backdrop.querySelectorAll('[data-plan-done]').forEach((input) => input.addEventListener('change', () => { const item = items.find((entry) => entry.id === Number(input.dataset.planDone)); if (item) { item.done = input.checked; completePlannerStudy(item); saveWorkspaceItem('revisie-planner-items', JSON.stringify(items)); openPlanner(); } })); backdrop.querySelectorAll('[data-edit-plan]').forEach((button) => button.addEventListener('click', () => editPlan(Number(button.dataset.editPlan)))); backdrop.querySelectorAll('[data-delete-plan]').forEach((button) => button.addEventListener('click', () => { if (confirm('Delete this study session?')) { saveWorkspaceItem('revisie-planner-items', JSON.stringify(items.filter((item) => item.id !== Number(button.dataset.deletePlan)))); openPlanner(); } })); }
function editPlan(id = null) { const items = plannerItems(); const existing = items.find((item) => item.id === id); const backdrop = openModal(existing ? 'Edit study session' : 'Add study session', `<form class="notes-form"><input id="planTitle" class="note-title" required placeholder="Session title" value="${escapeHtml(existing?.title || '')}"><select id="planSubject" class="note-subject">${subjectEntries().map(([key, subject]) => `<option value="${key}" ${key === (existing?.subject || currentSubject) ? 'selected' : ''}>${escapeHtml(subject.label)}</option>`).join('')}</select><label class="upload-label" for="planDate">Date</label><input id="planDate" class="note-title" type="date" value="${existing?.date || studyDate()}"><label class="upload-label" for="planStart">Start time</label><input id="planStart" class="note-title" type="time" value="${existing?.start || '16:00'}"><input id="planMinutes" class="note-title" type="number" min="5" max="300" step="5" value="${existing?.minutes || 25}" aria-label="Minutes"><button class="primary-button" type="submit">Save session ${icon('check')}</button></form>`); backdrop.querySelector('form').addEventListener('submit', (event) => { event.preventDefault(); const item = { id: existing?.id || Date.now(), title: backdrop.querySelector('#planTitle').value.trim(), subject: backdrop.querySelector('#planSubject').value, date: backdrop.querySelector('#planDate').value, start: backdrop.querySelector('#planStart').value || '16:00', minutes: Number(backdrop.querySelector('#planMinutes').value) || 25, done: existing?.done || false }; const index = items.findIndex((entry) => entry.id === item.id); if (index >= 0) items[index] = item; else items.push(item); saveWorkspaceItem('revisie-planner-items', JSON.stringify(items)); openPlanner(); }); }
function streakState(today = studyDate()) { return calculateStreak(localStorage.getItem('revisie-streak'), today); }
function markStudyComplete() {
  const today = studyDate();
  const state = streakState(today);
  if (state.completedToday) return false;
  const days = [...new Set([...studyDays(localStorage.getItem('revisie-streak')), today])].sort();
  saveWorkspaceItem('revisie-streak', JSON.stringify({ version: 2, days }));
  refreshStreakSurfaces();
  return true;
}
function completePlannerStudy(item) {
  // Completing a past or future plan must not award a study day today.
  if (item.done && (!item.date || item.date === studyDate())) markStudyComplete();
}
function streakMessage(state) {
  if (state.completedToday) return 'Today is complete. Next study day: tomorrow.';
  if (state.current) return 'Study today to keep your streak alive.';
  return state.total ? 'Your last streak ended. Study today to start again.' : 'No study recorded yet. Review a card or complete a session to start.';
}
function streakMarkup(state = streakState()) {
  const today = studyDate();
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const monday = shiftStudyDate(today, -(weekday + 6) % 7);
  const days = new Set(state.days);
  const milestone = [3, 7, 14, 30, 60, 100, 180, 365].find((day) => day > state.current) || (Math.floor(state.current / 100) + 1) * 100;
  const weekLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(`${monday}T12:00:00Z`));
  return `<div class="streak-view"><div class="streak-heading"><div><h2>Your study streak</h2></div><span class="streak-status${state.completedToday ? ' is-complete' : ''}"><span aria-hidden="true"></span>${state.completedToday ? 'Today complete' : 'Not studied today'}</span></div><div class="streak-main"><div class="streak-summary"><div class="streak-count"><span class="streak-big">${state.current}</span><span>${state.current === 1 ? 'day' : 'days'}<small>in a row</small></span></div><p class="streak-message" role="status">${streakMessage(state)}</p></div><div class="streak-week"><div class="streak-week-heading"><span>This week</span><span>From ${weekLabel}</span></div><div class="week-dots" aria-label="Study activity this week">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label, index) => {
    const date = shiftStudyDate(monday, index); const done = days.has(date);
    const status = done ? 'Studied' : date > today ? 'Upcoming' : 'No study recorded';
    return `<div class="week-day${done ? ' done' : ''}${date === today ? ' today' : ''}${date > today ? ' upcoming' : ''}" aria-label="${label} ${date}: ${status}" ${date === today ? 'aria-current="date"' : ''}><span>${label}</span><i aria-hidden="true">${done ? '✓' : Number(date.slice(-2))}</i></div>`;
  }).join('')}</div><p class="streak-week-note">${[...days].filter((day) => day >= monday && day <= shiftStudyDate(monday, 6)).length} of 7 study days</p></div></div><div class="streak-footer"><div class="streak-records"><span>Best streak<strong>${state.best} ${state.best === 1 ? 'day' : 'days'}</strong></span><span>Study days<strong>${state.total}</strong></span></div><div class="milestone"><div class="streak-milestone-label"><strong>Next milestone: ${milestone} days</strong><span>${state.current} / ${milestone}</span></div><progress class="streak-progress" max="${milestone}" value="${state.current}" aria-label="Progress to ${milestone} day streak"></progress><p>${milestone - state.current} more ${milestone - state.current === 1 ? 'day' : 'days'}. to reach this milestone.</p></div></div><div class="streak-share-entry"><button class="secondary-button" type="button" data-action="share-streak" ${state.current ? '' : 'disabled'}>Share streak</button>${state.current ? '' : '<small>Start a streak to share your progress.</small>'}</div><details class="streak-details"><summary>How streaks work</summary><p>A flashcard review or a planner session completed today earns one study day. Days follow your local calendar. Missing a full day resets your current streak; your best stays saved.</p><p>${localStorage.getItem('revisie-account') ? 'Saved with your workspace.' : 'Saved in this browser. Sign in to sync across devices.'}</p></details></div>`;
}
function openStreak() {
  const backdrop = openModal('Your study streak', streakMarkup());
  backdrop.dataset.streakModal = 'true';
}
function streakShareCaption(state) {
  return `${state.current}-day study streak on REVISIÉ.`;
}
async function drawStreakShareCard(state, today = studyDate()) {
  const logo = new Image();
  await new Promise((resolve, reject) => {
    logo.onload = resolve;
    logo.onerror = () => reject(new Error('Could not load the REVISIÉ logo. Please try again.'));
    logo.src = new URL(window.revisieBrand?.current(new Date(), 'light').src || 'assets/revisie-logo.png?v=2', location.href).href;
  });
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1350;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not create the streak card.');
  const text = (value, y, size, color = '#173d35', weight = 700) => {
    ctx.fillStyle = color; ctx.font = `${weight} ${size}px sans-serif`; ctx.textAlign = 'center';
    ctx.fillText(value, 540, y, 920);
  };
  ctx.fillStyle = '#f5f5e9'; ctx.fillRect(0, 0, 1080, 1350);
  const logoWidth = 420; const logoHeight = logoWidth * logo.naturalHeight / logo.naturalWidth;
  ctx.drawImage(logo, (1080 - logoWidth) / 2, 80, logoWidth, logoHeight);
  ctx.strokeStyle = '#dfe4d4'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(100, 360); ctx.lineTo(980, 360); ctx.stroke();
  text('Study streak', 445, 32, '#557469', 400);
  const countSize = state.current > 999 ? 180 : 230;
  ctx.font = `700 ${countSize}px sans-serif`;
  const countWidth = Math.min(ctx.measureText(String(state.current)).width, 740);
  const flameWidth = 126, flameGap = 38;
  const groupLeft = (1080 - countWidth - flameWidth - flameGap) / 2;
  ctx.save(); ctx.translate(groupLeft, 514); ctx.scale(1.26, 1.26);
  const fire = ctx.createLinearGradient(50, 0, 50, 140);
  fire.addColorStop(0, '#ef9d45'); fire.addColorStop(0.55, '#df713c'); fire.addColorStop(1, '#bd5237');
  ctx.fillStyle = fire; ctx.beginPath(); ctx.moveTo(54, 0);
  ctx.bezierCurveTo(60, 28, 37, 43, 37, 64);
  ctx.bezierCurveTo(37, 75, 42, 82, 48, 88);
  ctx.bezierCurveTo(27, 83, 20, 67, 23, 49);
  ctx.bezierCurveTo(8, 66, 0, 84, 0, 101);
  ctx.bezierCurveTo(0, 126, 20, 142, 50, 142);
  ctx.bezierCurveTo(80, 142, 100, 122, 100, 98);
  ctx.bezierCurveTo(100, 70, 73, 48, 54, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#f7ce7e'; ctx.beginPath(); ctx.moveTo(55, 89);
  ctx.bezierCurveTo(55, 105, 35, 111, 35, 123);
  ctx.bezierCurveTo(35, 134, 43, 140, 52, 140);
  ctx.bezierCurveTo(64, 140, 73, 131, 73, 121);
  ctx.bezierCurveTo(73, 109, 62, 103, 55, 89); ctx.closePath(); ctx.fill(); ctx.restore();
  ctx.fillStyle = '#173d35'; ctx.font = `700 ${countSize}px sans-serif`; ctx.textAlign = 'center';
  ctx.fillText(String(state.current), groupLeft + flameWidth + flameGap + countWidth / 2, 690, 740);
  text(state.current === 1 ? 'day' : 'days', 765, 38, '#557469', 400);
  text('THIS WEEK', 890, 20, '#557469');
  const monday = shiftStudyDate(today, -(new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7);
  const days = new Set(state.days);
  ['M', 'T', 'W', 'T', 'F', 'S', 'S'].forEach((label, index) => {
    const x = 228 + index * 104; const done = days.has(shiftStudyDate(monday, index));
    ctx.fillStyle = done ? '#173d35' : '#dfe4d4'; ctx.beginPath(); ctx.arc(x, 978, 35, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = done ? '#f5f5e9' : '#718275'; ctx.font = '700 24px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(label, x, 986);
    if (done) { ctx.strokeStyle = '#dce9a1'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 9, 1030); ctx.lineTo(x - 2, 1037); ctx.lineTo(x + 12, 1022); ctx.stroke(); }
  });
  text(`PERSONAL BEST: ${state.best} ${state.best === 1 ? 'DAY' : 'DAYS'}`, 1190, 25);
  const dateLabel = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(`${today}T12:00:00Z`));
  text(dateLabel, 1260, 22, '#557469', 400);
  return canvas;
}
function downloadStreakCard(file) {
  const url = URL.createObjectURL(file); const link = document.createElement('a');
  link.href = url; link.download = file.name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function shareStreakCard(file, caption, status) {
  try {
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'My REVISIÉ study streak', text: caption });
      status.textContent = 'Streak shared!';
    } else {
      downloadStreakCard(file); status.textContent = 'Card downloaded. Add it to a message or story to share your streak.';
    }
  } catch (error) {
    if (error.name !== 'AbortError') status.textContent = 'Sharing was unavailable. Use Download card to save and share it.';
  }
}
async function openStreakShare() {
  const state = streakState();
  if (!state.current) { notify('Complete a study session to start a streak you can share.'); return; }
  const backdrop = openModal('Share your streak', `<div class="streak-share"><p>Share or download your streak card.</p><div id="streakSharePreview" class="streak-share-preview" aria-busy="true"></div><p id="streakShareStatus" role="status">Creating your card…</p><div class="streak-share-actions"><button type="button" class="primary-button" id="shareStreakCard" disabled>Share card</button><button type="button" class="secondary-button" id="downloadStreakCard" disabled>Download card</button></div></div>`);
  const status = backdrop.querySelector('#streakShareStatus'); const preview = backdrop.querySelector('#streakSharePreview');
  try {
    const canvas = await drawStreakShareCard(state);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value?.size ? resolve(value) : reject(new Error('Could not create your card. Please try again.')), 'image/png'));
    if (!backdrop.isConnected) return;
    const file = new File([blob], `revisie-${state.current}-day-streak.png`, { type: 'image/png' });
    const image = document.createElement('img'); image.src = canvas.toDataURL('image/png'); image.alt = `${state.current}-day study streak on REVISIÉ. Personal best: ${state.best} days. Study activity this week.`; preview.appendChild(image);
    const share = backdrop.querySelector('#shareStreakCard'); const download = backdrop.querySelector('#downloadStreakCard');
    share.disabled = false; download.disabled = false; status.textContent = '';
    // The card is ready before this click so native sharing retains user activation.
    share.addEventListener('click', async () => { share.disabled = true; try { await shareStreakCard(file, streakShareCaption(state), status); } finally { share.disabled = false; } });
    download.addEventListener('click', () => { downloadStreakCard(file); status.textContent = 'Streak card downloaded.'; });
  } catch (error) { status.textContent = error.message || 'Could not create your streak card. Please try again.'; }
  finally { preview.setAttribute('aria-busy', 'false'); }
}
function refreshStreakSurfaces() {
  const state = streakState();
  const button = document.querySelector('.streak-button');
  if (button) {
    button.querySelector('strong').textContent = `${state.current} day streak`;
    button.querySelector('small').textContent = state.completedToday ? 'Today complete' : 'Study today to build your streak';
    button.querySelector('span')?.remove(); button.onclick = openStreak;
  }
  if (location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('progress.html')) {
    const wrap = document.querySelector('.page-wrap');
    if (wrap && !wrap.querySelector('.streak-panel')) {
      const panel = document.createElement('section'); panel.className = 'streak-panel'; panel.setAttribute('aria-label', 'Your study streak');
      const intro = wrap.querySelector('.page-intro, .overview-intro'); if (intro) intro.after(panel); else wrap.appendChild(panel);
    }
  }
  const renderKey = JSON.stringify([studyDate(), state.days, Boolean(localStorage.getItem('revisie-account'))]);
  const surfaces = [...document.querySelectorAll('.streak-panel, [data-streak-modal="true"] .modal-body')];
  surfaces.forEach((surface) => {
    if (surface.dataset.streakRender === renderKey) return;
    const detailsOpen = Boolean(surface.querySelector('.streak-details')?.open);
    surface.innerHTML = streakMarkup(state);
    surface.dataset.streakRender = renderKey;
    surface.querySelector('.streak-details').open = detailsOpen;
  });
  setupProgressRoute();
}
function profilePhoto(value) { return typeof value === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value) ? value : ''; }
function renderGreeting() {
  const greeting = document.getElementById('overviewGreeting');
  if (!greeting) return;
  const hour = new Date().getHours();
  const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  const account = JSON.parse(localStorage.getItem('revisie-account') || 'null');
  const name = settings.name || account?.name || 'Guest';
  greeting.innerHTML = name === 'Guest' ? `Good ${period}.` : `Good ${period}, <em>${escapeHtml(name)}.</em>`;
}
function renderProfile() {
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  const account = JSON.parse(localStorage.getItem('revisie-account') || 'null');
  const name = settings.name || account?.name || 'Guest';
  const photo = profilePhoto(settings.profilePhoto);
  document.querySelectorAll('.avatar').forEach((avatar) => {
    avatar.textContent = name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    if (photo) { const image = document.createElement('img'); image.src = photo; image.alt = `${name}'s profile picture`; avatar.replaceChildren(image); }
  });
  renderGreeting();
  const workspace = document.querySelector('.workspace-switcher strong');
  if (workspace) workspace.textContent = name === 'Guest' ? 'Guest workspace' : name;
}
async function prepareProfilePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Choose an image smaller than 10 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('This image could not be opened. Try another file.')); image.src = url; });
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 256;
    const context = canvas.getContext('2d'); if (!context) throw new Error('This browser could not prepare the image.');
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.fillStyle = '#f6f7f2'; context.fillRect(0, 0, 256, 256);
    context.drawImage(image, (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side, 0, 0, 256, 256);
    const photo = canvas.toDataURL('image/jpeg', 0.85);
    if (!profilePhoto(photo)) throw new Error('This browser could not prepare the image.');
    return photo;
  } finally { URL.revokeObjectURL(url); }
}
function setupSettingsPage() {
  if (!location.pathname.endsWith('settings.html')) return;
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  const name = document.getElementById('displayName'); if (!name) return;
  const motion = document.getElementById('reduceMotion');
  const appearance = document.getElementById('appearance');
  appearance.value = ['light', 'dark'].includes(settings.theme) ? settings.theme : 'system';
  name.value = settings.name || JSON.parse(localStorage.getItem('revisie-account') || 'null')?.name || '';
  motion.checked = typeof settings.reduceMotion === 'boolean' ? settings.reduceMotion : Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const form = document.getElementById('settingsForm'); const save = form.querySelector('[type="submit"]');
  let stagedPhoto = profilePhoto(settings.profilePhoto), photoVersion = 0;
  const input = document.getElementById('profilePhoto'); const preview = document.getElementById('profilePhotoPreview'); const remove = document.getElementById('removeProfilePhoto'); const status = document.getElementById('profilePhotoStatus');
  const updatePreview = () => {
    preview.textContent = (name.value.trim() || 'You').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
    if (stagedPhoto) { const image = document.createElement('img'); image.src = stagedPhoto; image.alt = 'Profile picture preview'; preview.replaceChildren(image); }
    remove.hidden = !stagedPhoto;
  };
  updatePreview(); name.addEventListener('input', updatePreview);
  input.addEventListener('change', async () => {
    const file = input.files[0]; if (!file) return;
    const version = ++photoVersion; save.disabled = true; status.textContent = 'Preparing photo…';
    try { const photo = await prepareProfilePhoto(file); if (version !== photoVersion) return; stagedPhoto = photo; updatePreview(); status.textContent = 'Photo ready. Save settings to apply it.'; }
    catch (error) { if (version === photoVersion) status.textContent = error.message; }
    finally { if (version === photoVersion) { save.disabled = false; input.value = ''; } }
  });
  remove.addEventListener('click', () => { photoVersion++; stagedPhoto = ''; save.disabled = false; input.value = ''; updatePreview(); status.textContent = 'Photo removed. Save settings to apply it.'; });
  form.addEventListener('submit', (event) => {
    event.preventDefault(); if (save.disabled) return;
    try {
      const current = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
      delete current.subject; delete current.minutes;
      saveWorkspaceItem('revisie-settings', JSON.stringify({ ...current, name: name.value.trim(), reduceMotion: motion.checked, theme: appearance.value, profilePhoto: stagedPhoto }));
      window.revisieTheme?.apply();
      renderProfile(); status.textContent = ''; notify('Settings saved.');
    } catch { notify('Could not save settings. Free some browser storage and try again.'); }
  });
  document.getElementById('resetData').addEventListener('click', () => {
    if (!confirm('Reset your personal subjects, flashcards, notes, folders, resources, and planner data?')) return;
    ['revisie-subjects', 'revisie-flashcards', 'revisie-note-library', 'revisie-notes', 'revisie-note-title', 'revisie-resources', 'revisie-plan', 'revisie-flashcard-study', 'revisie-last-activity', 'revisie-flashcard-drafts', 'revisie-card-destination', 'revisie-folders'].forEach((key) => removeWorkspaceItem(key));
    notify('Personal data reset. Built-in GCSE content is unchanged.');
  });
  setupAccountSettings();
}
function assistantResponse(input) { const value = input.value.trim(); if (!value) return; const lower = value.toLowerCase(); const subject = subjectData[currentSubject] || subjectData.mathematics; const notes = noteLibrary.filter((note) => note.subject === currentSubject).map((note) => note.body).join(' '); const deck = getDeck(currentSubject, getUnits(currentSubject)[0]?.name || ''); let answer = `For ${escapeHtml(subject.label)}, start with the key definition, then apply it to an unfamiliar example. Your current focus is ${subject.topic}.`; if (lower.includes('quiz') || lower.includes('test')) { const card = deck[Math.floor(Math.random() * deck.length)]; answer = `Quick quiz: ${escapeHtml(card[0])} Take a moment to answer from memory, then open the matching ${getUnits(currentSubject)[0]?.name || ''} deck to check it.`; } else if (lower.includes('summar')) answer = notes ? `Here is the beginning of your saved ${escapeHtml(subject.label)} note: ${notes.slice(0, 260)}${notes.length > 260 ? '...' : ''}` : `You do not have a saved ${escapeHtml(subject.label)} note yet. Add one from the Notes page and I can use it here.`; else if (lower.includes('explain') || lower.includes('help')) { const card = deck[0]; answer = `${escapeHtml(card[0])} Answer: ${escapeHtml(card[1])} Next, try explaining that answer without looking.`; } const panel = document.querySelector('.assistant-panel'); if (panel) { panel.querySelector('.assistant-answer')?.remove(); panel.insertAdjacentHTML('beforeend', `<div class="assistant-answer"><strong>${escapeHtml(subject.label)} study assistant</strong><br>${answer}</div>`); } input.value = ''; }
function addSubject() {
  const backdrop = openModal('Add a subject', `<form class="notes-form"><label class="upload-label" for="newSubject">Subject name</label><input id="newSubject" class="note-title" required placeholder="e.g. Economics"><label class="upload-label" for="newTopic">First topic</label><input id="newTopic" class="note-title" placeholder="Optional">${subjectAppearanceFields()}<button class="primary-button" type="submit">Add subject</button></form>`);
  const form = backdrop.querySelector('form'); bindSubjectAppearance(form);
  const nameInput = backdrop.querySelector('#newSubject'); nameInput.addEventListener('input', () => nameInput.setCustomValidity(''));
  form.addEventListener('submit', (event) => {
    event.preventDefault(); const name = nameInput.value.trim(); const key = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (!key || subjectData[key] && !subjectData[key].deleted) { nameInput.setCustomValidity(key ? 'This subject already exists.' : 'Use a subject name containing letters or numbers.'); nameInput.reportValidity(); return; }
    const next = [...customSubjects, { name, topic: backdrop.querySelector('#newTopic').value.trim() || 'First topic', ...selectedSubjectStyle(form) }];
    if (subjectData[key]?.deleted) {
      const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
      settings.deletedSubjects = (settings.deletedSubjects || []).filter((id) => id !== key);
      settings.subjectAppearance = { ...settings.subjectAppearance, [key]: selectedSubjectStyle(form) };
      saveWorkspaceItem('revisie-settings', JSON.stringify(settings));
    }
    try { saveWorkspaceItem('revisie-subjects', JSON.stringify(next)); }
    catch { notify('Could not save the subject. Free some browser storage and try again.'); return; }
    customSubjects.splice(0, customSubjects.length, ...next); registerCustomSubjects(); closeModal(); refreshSubjectAppearance(); updateNavigationCounts(); notify('Subject added.');
  });
}
function libraryToolbar(intro, title) {
  let toolbar = intro.parentElement.querySelector('.library-toolbar');
  if (!toolbar) {
    toolbar = document.createElement('div');
    toolbar.className = 'library-toolbar';
    const heading = document.createElement('h2');
    heading.textContent = title;
    const actions = document.createElement('div');
    actions.className = 'subject-actions';
    toolbar.append(heading, actions);
    intro.after(toolbar);
  }
  return toolbar.querySelector('.subject-actions');
}
function setupCustomSubjects() { if (!location.pathname.endsWith('subjects.html')) return; const intro = document.querySelector('.page-intro'); const grid = document.querySelector('.subject-grid'); if (!intro || !grid) return; if (!document.getElementById('addSubject')) { const button = document.createElement('button'); button.id = 'addSubject'; button.className = 'primary-button'; button.innerHTML = `Add subject ${icon('plus')}`; libraryToolbar(intro, 'Your subjects').appendChild(button); button.addEventListener('click', addSubject); } const entries = subjectEntries().filter(([key]) => key !== 'psychology'); const builtInCards = entries.map(([key, subject]) => { const route = ['mathematics', 'biology', 'history', 'psychology'].includes(key) ? `${key}.html` : `subject.html?name=${encodeURIComponent(subject.label)}`; return `<a class="subject-card" data-subject-card="${key}" data-category="${subject.category}" href="${route}"><div class="subject-top"><div class="subject-icon ${subject.color}">${subjectSymbol(subject)}</div><span class="progress-ring">HIGHER</span></div><strong>${escapeHtml(subject.label)}</strong><small>GCSE Higher · ${escapeHtml(subject.board)}</small><div class="bar"><span style="width:${key === 'biology' ? 72 : key === 'mathematics' ? 68 : 18}%"></span></div></a>`; }).join(''); const customCards = customSubjects.filter((subject) => !subjectData[subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')]).map((subject) => { const key = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'); return `<a class="subject-card" data-subject-card="${key}" data-category="custom" href="subject.html?name=${encodeURIComponent(subject.name)}"><div class="subject-top"><div class="subject-icon blue">${icon('book-open')}</div><span class="progress-ring">HIGHER</span></div><strong>${subject.name}</strong><small>GCSE Higher · ${subject.topic}</small><div class="bar"><span style="width:8%"></span></div></a>`; }).join(''); grid.innerHTML = builtInCards + customCards; }
function editSubject(subjectIndex) { const subject = customSubjects[subjectIndex]; if (!subject) return; const backdrop = openModal('Edit subject', `<form class="notes-form"><input id="editSubjectName" class="note-title" required value="${escapeHtml(subject.name)}"><input id="editSubjectTopic" class="note-title" value="${escapeHtml(subject.topic)}">${subjectAppearanceFields(subjectData[subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')] || subject)}<button class="primary-button" type="submit">Save changes ${icon('check')}</button></form>`); bindSubjectAppearance(backdrop.querySelector('form')); backdrop.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); customSubjects[subjectIndex] = { name: backdrop.querySelector('#editSubjectName').value.trim(), topic: backdrop.querySelector('#editSubjectTopic').value.trim() || 'First topic', ...selectedSubjectStyle(backdrop.querySelector('form')) }; const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}'); if (settings.subjectAppearance) { delete settings.subjectAppearance[subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')]; saveWorkspaceItem('revisie-settings', JSON.stringify(settings)); } saveWorkspaceItem('revisie-subjects', JSON.stringify(customSubjects)); await syncWorkspaceNow(); closeModal(); location.reload(); }); }
function deleteSubject(subjectKey) {
  const key = typeof subjectKey === 'number' ? customSubjects[subjectKey]?.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : subjectKey;
  const subject = subjectData[key]; if (!subject || !confirm(`Delete ${subject.label} and all its flashcards? Your notes and files will stay saved.`)) return;
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  if (builtInSubjectKeys.has(key)) settings.deletedSubjects = [...new Set([...(settings.deletedSubjects || []), key])];
  const remainingSubjects = customSubjects.filter((item) => item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') !== key);
  const remainingCards = userCards.filter((card) => card.subject !== key);
  const topics = { ...customTopics }; delete topics[key];
  saveWorkspaceItem('revisie-settings', JSON.stringify(settings));
  saveWorkspaceItem('revisie-subjects', JSON.stringify(remainingSubjects)); saveWorkspaceItem('revisie-flashcards', JSON.stringify(remainingCards)); saveWorkspaceItem('revisie-topics', JSON.stringify(topics));
  customSubjects.splice(0, customSubjects.length, ...remainingSubjects); userCards.splice(0, userCards.length, ...remainingCards); delete customTopics[key];
  clearDeletedDeckMetadata(key);
  registerCustomSubjects(); refreshSubjectAppearance(); updateNavigationCounts(); notify('Subject deleted.');
}
function clearDeletedDeckMetadata(subjectKey, topicName = null) {
  for (const key of ['revisie-topic-progress', 'revisie-starter-card-overrides', 'revisie-subject-progress', 'revisie-due']) {
    const values = JSON.parse(localStorage.getItem(key) || '{}');
    Object.keys(values).forEach((id) => {
      if (topicName === null ? id === subjectKey || id.startsWith(`${subjectKey}::`) : id === `${subjectKey}::${topicName}` || id.startsWith(`${subjectKey}::${topicName}::`)) delete values[id];
    });
    saveWorkspaceItem(key, JSON.stringify(values));
    if (key === 'revisie-starter-card-overrides') { Object.keys(starterCardOverrides).forEach((id) => delete starterCardOverrides[id]); Object.assign(starterCardOverrides, values); }
  }
  const drafts = readCardDrafts();
  Object.keys(drafts).forEach((id) => { try { const [subject, topic] = JSON.parse(id); if (subject === subjectKey && (topicName === null || topicName === topic)) delete drafts[id]; } catch { /* Ignore old malformed draft keys. */ } });
  saveWorkspaceItem('revisie-flashcard-drafts', JSON.stringify(drafts));
}
function setupCustomSubjectActions() {
  if (!location.pathname.endsWith('subjects.html')) return;
  customSubjects.forEach((subject) => {
    const key = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const card = document.querySelector(`a[data-subject-card="${key}"][data-category="custom"]`);
    if (!card || card.parentElement.classList.contains('custom-subject-wrap')) return;
    const wrap = document.createElement('div'); wrap.className = 'custom-subject-wrap'; card.replaceWith(wrap); wrap.appendChild(card);
  });
}
function setupSubjectFilters() { const filters = document.querySelector('.subject-filter'); if (!filters) return; const hasPersonalSubjects = customSubjects.some((subject) => !subjectData[subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')]); filters.innerHTML = `<button class="active" data-filter="all" aria-pressed="true">All subjects</button><button data-filter="core" aria-pressed="false">Core</button><button data-filter="science" aria-pressed="false">Science</button><button data-filter="language" aria-pressed="false">Languages</button><button data-filter="option" aria-pressed="false">Options</button>${hasPersonalSubjects ? '<button data-filter="custom" aria-pressed="false">Personal</button>' : ''}`; enhanceSubjectFilters(); }
function topicActions(subjectKey, unit) {
  const subjectAttribute = `data-topic-subject="${escapeHtml(subjectKey)}"`;
  const edit = itemAction('Edit topic', 'pencil', `${subjectAttribute} data-edit-topic="${escapeHtml(unit.name)}"`);
  return `<div class="topic-actions">${itemActions(`Options for ${unit.name}`, edit + itemAction('Share deck', 'share-2', `${subjectAttribute} data-share-deck="${escapeHtml(unit.name)}"`) + itemAction('Add to folder', 'folder-plus', `data-folder-item="${escapeHtml(JSON.stringify({ type: 'deck', subject: subjectKey, unit: unit.name }))}"`) + itemAction('Delete topic', 'trash-2', `${subjectAttribute} data-delete-topic="${escapeHtml(unit.name)}"`, true))}</div>`;
}
function bindTopicActions(grid) {
  grid.querySelectorAll('[data-share-deck]').forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation(); shareDeck(button.dataset.topicSubject, button.dataset.shareDeck);
  }));
  grid.querySelectorAll('[data-edit-topic]').forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation(); editTopic(button.dataset.topicSubject, button.dataset.editTopic);
  }));
  grid.querySelectorAll('[data-delete-topic]').forEach((button) => button.addEventListener('click', (event) => {
    event.preventDefault(); event.stopPropagation(); deleteTopic(button.dataset.topicSubject, button.dataset.deleteTopic);
  }));
}
function setupFlashcardLibrary() { if (!location.pathname.endsWith('flashcards.html')) return; const intro = document.querySelector('.page-intro'); const grid = document.querySelector('.subject-grid'); if (!intro || !grid) return; if (!document.getElementById('addFlashcard')) { const button = document.createElement('button'); button.id = 'addFlashcard'; button.className = 'primary-button'; button.innerHTML = `Add flashcards ${icon('plus')}`; libraryToolbar(intro, 'Your decks').appendChild(button); button.addEventListener('click', addFlashcard); } if (!document.getElementById('importFlashcards')) {
  const actions = libraryToolbar(intro, 'Your decks');
  actions.insertAdjacentHTML('beforeend', `<button class="secondary-button" id="importFlashcards">Import flashcards ${icon('upload')}</button><button class="secondary-button" id="exportFlashcards">Back up my cards ${icon('download')}</button>`);
  actions.querySelector('#importFlashcards').addEventListener('click', () => openFlashcardImport());
  actions.querySelector('#exportFlashcards').addEventListener('click', () => { if (!userCards.length) { notify('Create or import some cards first.'); return; } downloadFlashcards(userCards); });
  intro.querySelector('.hero-copy').textContent = 'Create cards or import a whole deck from Quizlet, a spreadsheet, or an AI assistant. Cards save on this device and sync when signed in.';
} grid.innerHTML = subjectEntries().filter(([key]) => key !== 'psychology').flatMap(([key, subject]) => getUnits(key).map((unit) => `<div class="topic-card-wrap"><button class="subject-card" data-action="unit-review" data-subject="${key}" data-unit="${escapeHtml(unit.name)}"><div class="subject-top"><div class="subject-icon ${subject.color}">${subjectSymbol(subject)}</div><span class="progress-ring">${getDeck(key, unit.name).length} CARDS</span></div><strong>${escapeHtml(subject.label)}</strong><small>GCSE Higher · ${escapeHtml(unit.name)}</small><div class="bar"><span style="width:18%"></span></div></button>${topicActions(key, unit)}</div>`)).join('') || '<p class="empty-state">No topics yet. Add a subject or create a flashcard to get started.</p>'; bindTopicActions(grid); }
function setupSubjectUnits() { if (location.pathname.endsWith('subjects.html') || location.pathname.endsWith('flashcards.html') || location.pathname.endsWith('index.html')) return; const grid = document.querySelector('.subject-grid'); const intro = document.querySelector('.page-intro'); const subject = subjectData[currentSubject]; if (!grid || !subject || subject.deleted) return; if (intro && !document.getElementById('subjectAddCard')) { libraryToolbar(intro, 'Your topics').insertAdjacentHTML('beforeend', `<button class="primary-button" id="subjectAddCard">Add flashcards ${icon('plus')}</button><button class="secondary-button" id="subjectImportCards">Import flashcards ${icon('upload')}</button><button class="secondary-button" id="subjectManageCards">Manage flashcards ${icon('settings-2')}</button><button class="secondary-button" id="subjectAddTopic">Add topic ${icon('plus')}</button><button class="secondary-button" id="shareSubject">Share subject ${icon('share-2')}</button>`); document.querySelector('#subjectAddCard').addEventListener('click', () => addFlashcardFor(currentSubject)); document.querySelector('#subjectImportCards').addEventListener('click', () => openFlashcardImport(currentSubject)); document.querySelector('#subjectManageCards').addEventListener('click', () => openCardManager(currentSubject, getUnits(currentSubject)[0]?.name || '')); document.querySelector('#subjectAddTopic').addEventListener('click', () => addTopic(currentSubject)); document.querySelector('#shareSubject').addEventListener('click', () => shareSubject(currentSubject)); } grid.innerHTML = getUnits(currentSubject).length ? getUnits(currentSubject).map((unit, index) => `<div class="topic-card-wrap"><button class="subject-card" data-action="unit-review" data-subject="${currentSubject}" data-unit="${escapeHtml(unit.name)}"><div class="subject-top"><div class="subject-icon ${subject.color || 'blue'}">${subjectSymbol(subject)}</div><span class="progress-ring">${getDeck(currentSubject, unit.name).length} CARDS</span></div><strong>${escapeHtml(unit.name)}</strong><small>GCSE Higher · active recall deck</small><div class="bar"><span style="width:18%"></span></div></button>${topicActions(currentSubject, unit)}</div>`).join('') : '<p class="empty-state">No topics yet. Add a topic or create a flashcard to get started.</p>'; bindTopicActions(grid); window.revisiePractice?.refresh(); }
function addTopic(subjectKey) { const subject = subjectData[subjectKey]; const backdrop = openModal(`Add ${escapeHtml(subject.label)} topic`, `<form class="notes-form"><input id="topicName" class="note-title" required placeholder="Topic or unit name"><button class="primary-button" type="submit">Add topic ${icon('plus')}</button></form>`); backdrop.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const name = backdrop.querySelector('#topicName').value.trim(); if (!name) return; customTopics[subjectKey] = customTopics[subjectKey] || []; if (getUnits(subjectKey).some((unit) => unit.name.toLowerCase() === name.toLowerCase())) { notify('That topic already exists.'); return; } const button = backdrop.querySelector('[type="submit"]'); button.disabled = true; button.textContent = 'Saving…'; customTopics[subjectKey].push({ name }); saveWorkspaceItem('revisie-topics', JSON.stringify(customTopics)); await syncWorkspaceNow(); closeModal(); setupSubjectUnits(); notify('Topic added with three starter flashcards.'); }); }
function editTopic(subjectKey, topicName) {
  const oldName = typeof topicName === 'number' ? customTopics[subjectKey]?.[topicName]?.name : topicName;
  const unit = getUnits(subjectKey).find((topic) => topic.name === oldName); if (!unit) return;
  const backdrop = openModal('Edit topic', `<form class="notes-form"><label class="upload-label" for="topicName">Topic name</label><input id="topicName" class="note-title" required maxlength="120" value="${escapeHtml(oldName)}"><button class="primary-button" type="submit">Save topic ${icon('check')}</button></form>`);
  const input = backdrop.querySelector('#topicName'); input.addEventListener('input', () => input.setCustomValidity(''));
  backdrop.querySelector('form').addEventListener('submit', (event) => {
    event.preventDefault(); const name = input.value.trim();
    if (!name || getUnits(subjectKey).some((topic) => topic.name !== oldName && topic.name.toLowerCase() === name.toLowerCase())) {
      input.setCustomValidity(name ? 'That topic already exists.' : 'Enter a topic name.'); input.reportValidity(); return;
    }
    if (name !== oldName) {
      const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
      if (unit.sourceName) {
        settings.topicNames = { ...settings.topicNames, [subjectKey]: { ...settings.topicNames?.[subjectKey], [unit.sourceName]: name } };
        saveWorkspaceItem('revisie-settings', JSON.stringify(settings));
      } else {
        const topic = (customTopics[subjectKey] || []).find((topic) => topic.name === oldName);
        if (topic) { topic.cards = unit.cards; topic.name = name; }
        else customTopics[subjectKey] = [...(customTopics[subjectKey] || []), { name, cards: unit.cards }];
        saveWorkspaceItem('revisie-topics', JSON.stringify(customTopics));
      }
      userCards.filter((card) => card.subject === subjectKey && card.unit === oldName).forEach((card) => { card.unit = name; });
      saveWorkspaceItem('revisie-flashcards', JSON.stringify(userCards));
      renameTopicMetadata(subjectKey, oldName, name);
    }
    closeModal(); refreshSubjectAppearance(); updateNavigationCounts(); notify('Topic updated.');
  });
}
function renameTopicMetadata(subjectKey, oldName, name) {
  if (!getUnits(subjectKey).find(unit => unit.name === name)?.sourceName) window.revisiePractice?.renameTopic(subjectKey, oldName, name);
  window.revisieFolders?.renameDeck(subjectKey, oldName, name);
  const oldKey = `${subjectKey}::${oldName}`; const newKey = `${subjectKey}::${name}`;
  for (const storageKey of ['revisie-topic-progress', 'revisie-starter-card-overrides', 'revisie-due']) {
    const values = JSON.parse(localStorage.getItem(storageKey) || '{}');
    Object.keys(values).forEach((key) => {
      if (key === oldKey || key.startsWith(`${oldKey}::`)) { values[newKey + key.slice(oldKey.length)] = values[key]; delete values[key]; }
    });
    saveWorkspaceItem(storageKey, JSON.stringify(values));
    if (storageKey === 'revisie-starter-card-overrides') { Object.keys(starterCardOverrides).forEach((key) => delete starterCardOverrides[key]); Object.assign(starterCardOverrides, values); }
  }
  const drafts = readCardDrafts(); const oldDraft = JSON.stringify([subjectKey, oldName]);
  if (drafts[oldDraft]) { drafts[JSON.stringify([subjectKey, name])] = drafts[oldDraft]; delete drafts[oldDraft]; saveWorkspaceItem('revisie-flashcard-drafts', JSON.stringify(drafts)); }
  const destination = JSON.parse(localStorage.getItem('revisie-card-destination') || '{}');
  if (destination.subject === subjectKey && destination.unit === oldName) saveWorkspaceItem('revisie-card-destination', JSON.stringify({ ...destination, unit: name }));
}
function deleteTopic(subjectKey, topicName) {
  const name = typeof topicName === 'number' ? customTopics[subjectKey]?.[topicName]?.name : topicName;
  const topic = getUnits(subjectKey).find((unit) => unit.name === name);
  if (!topic || !confirm(`Delete ${name} and all its flashcards and quiz questions?`)) return;
  const settings = JSON.parse(localStorage.getItem('revisie-settings') || '{}');
  settings.deletedTopics = { ...settings.deletedTopics, [subjectKey]: [...new Set([...(settings.deletedTopics?.[subjectKey] || []), topic.sourceName || name, name])] };
  const topics = { ...customTopics, [subjectKey]: (customTopics[subjectKey] || []).filter((unit) => unit.name !== name) };
  const cards = userCards.filter((card) => card.subject !== subjectKey || card.unit !== name);
  saveWorkspaceItem('revisie-settings', JSON.stringify(settings)); saveWorkspaceItem('revisie-topics', JSON.stringify(topics)); saveWorkspaceItem('revisie-flashcards', JSON.stringify(cards));
  window.revisiePractice?.deleteTopic(subjectKey, topic.sourceName || name);
  Object.assign(customTopics, topics); userCards.splice(0, userCards.length, ...cards); clearDeletedDeckMetadata(subjectKey, name);
  refreshSubjectAppearance(); updateNavigationCounts(); notify('Topic deleted.');
}
function setupSubjectNotes() { const subjectRoutes = ['mathematics.html', 'biology.html', 'history.html', 'psychology.html', 'subject.html']; if (!subjectRoutes.some((route) => location.pathname.endsWith(route))) return; const wrap = document.querySelector('.page-wrap'); if (!wrap || document.querySelector('.subject-notes')) return; wrap.insertAdjacentHTML('beforeend', `<section class="notes-section"><div class="section-heading"><div><p class="eyebrow">SUBJECT NOTES</p><h2>Notes for this subject</h2></div><button class="text-button" data-action="notes">New note ${icon('plus')}</button></div><div class="subject-notes"></div></section>`); renderNoteSurfaces(); }
function setupSubjectResources() { const subjectRoutes = ['mathematics.html', 'biology.html', 'history.html', 'psychology.html', 'subject.html']; if (!subjectRoutes.some((route) => location.pathname.endsWith(route))) return; const wrap = document.querySelector('.page-wrap'); if (!wrap || document.querySelector('.subject-resources')) return; wrap.insertAdjacentHTML('beforeend', `<section class="notes-section"><div class="section-heading"><div><p class="eyebrow">SUBJECT PDFS</p><h2>PDFs for this subject</h2></div><a class="text-button" href="resources.html?subject=${encodeURIComponent(currentSubject)}">Add PDF ${icon('plus')}</a></div><div class="subject-resources"></div></section>`); renderSubjectResources(); }
function wire() { normalizeSidebar(); window.revisieBrand?.apply(); updateNavigationCounts(); cleanRemovedAssistant(); normalizeTopbar(); setupTopbarActions(); activateNav(); setupSettingsPage(); setupCustomSubjects(); setupCustomSubjectActions(); setupSubjectFilters();
  setupFlashcardLibrary();
  setupSubjectUnits();
  setupSubjectNotes(); setupSubjectResources(); setupNotesPage(); setupResourcesPage();
  const subjectCopy = document.querySelector('.page-intro .hero-copy'); if (subjectCopy && location.pathname.endsWith('subject.html')) subjectCopy.textContent = 'GCSE Higher Tier revision profile. Use the starter deck for active recall, then capture examples and questions in your notes.';
  const subjectsNav = document.querySelector('.sidebar .main-nav');
  if (subjectsNav) { const labels = ['Overview', 'Subjects', 'Flashcards', 'Notes', 'Study assistant', 'Revision planner', 'Progress']; subjectsNav.querySelectorAll('.nav-item').forEach((item, index) => { if (item.textContent.trim() === '${icon}') { item.textContent = labels[index] || 'Library'; } }); }
  document.querySelectorAll('[data-subject-card] .subject-icon').forEach((item) => { if (item.textContent.includes('${icon')) { item.innerHTML = icon(item.closest('[data-subject-card]').dataset.subjectCard === 'biology' ? 'leaf' : item.closest('[data-subject-card]').dataset.subjectCard === 'history' ? 'landmark' : 'brain'); } });
  document.querySelectorAll('[data-action="review"]').forEach((button) => button.addEventListener('click', () => reviewCards(subjectData[button.dataset.subject || currentSubject].cards, `${subjectData[button.dataset.subject || currentSubject].label} / ${subjectData[button.dataset.subject || currentSubject].topic}`))); document.querySelectorAll('[data-action="notes"]').forEach((button) => button.addEventListener('click', openNotes)); document.querySelectorAll('[data-action="planner"]').forEach((button) => button.addEventListener('click', openPlanner)); const input = document.getElementById('askInput'); const ask = document.getElementById('askButton'); if (input && ask) { ask.addEventListener('click', () => assistantResponse(input)); input.addEventListener('keydown', (event) => { if (event.key === 'Enter') assistantResponse(input); }); } document.querySelectorAll('[data-prompt]').forEach((button) => button.addEventListener('click', () => { if (input) { input.value = button.dataset.prompt; input.focus(); } })); document.querySelectorAll('.subject-filter button').forEach((button) => button.addEventListener('click', () => { document.querySelectorAll('.subject-filter button').forEach((item) => item.classList.remove('active')); button.classList.add('active'); document.querySelectorAll('[data-subject-card]').forEach((card) => { card.hidden = button.dataset.filter !== 'all' && card.dataset.category !== button.dataset.filter; }); })); document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); }); lucide.createIcons(); }
window.revisieTheme?.apply();
wire();
function syncSubjectPageLabel() {
  const eyebrow = document.querySelector('.page-intro .eyebrow');
  if (!document.body.dataset.subject || !eyebrow) return;
  const board = subjectData[currentSubject]?.board;
  if (board) eyebrow.textContent = `GCSE HIGHER · ${board}`;
}
syncSubjectPageLabel();
function enhanceSubjectFilters() { const filters = document.querySelector('.subject-filter'); if (!filters) return; const cards = [...document.querySelectorAll('[data-subject-card]')]; if (!cards.length) return; const status = document.querySelector('.subject-filter-status') || document.createElement('p'); status.className = 'subject-filter-status'; status.hidden = true; status.setAttribute('aria-live', 'polite'); status.textContent = 'No subjects in this group yet.'; filters.after(status); filters.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => { const selected = button.dataset.filter; let visible = 0; filters.querySelectorAll('button').forEach((item) => { const active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active)); }); cards.forEach((card) => { const show = selected === 'all' || card.dataset.category === selected; card.hidden = !show; if (card.parentElement.matches('.custom-subject-wrap, .subject-style-wrap')) card.parentElement.hidden = !show; if (show) visible += 1; }); status.hidden = visible > 0; })); }
function subjectProgress() { return JSON.parse(localStorage.getItem('revisie-subject-progress') || '{}'); }
function topicProgress() { return JSON.parse(localStorage.getItem('revisie-topic-progress') || '{}'); }
function topicProgressKey(subjectKey, unitName) { return `${subjectKey}::${unitName}`; }
function topicProgressPercent(subjectKey, unitName) { const total = getDeck(subjectKey, unitName).length; const complete = Number(topicProgress()[topicProgressKey(subjectKey, unitName)] || 0); return total ? Math.round(Math.min(complete, total) / total * 100) : 0; }
function markTopicCardKnown(subjectKey, unitName, deckSize) { const progress = topicProgress(); const key = topicProgressKey(subjectKey, unitName); progress[key] = Math.min(deckSize || getDeck(subjectKey, unitName).length, Number(progress[key] || 0) + 1); saveWorkspaceItem('revisie-topic-progress', JSON.stringify(progress)); }
function subjectCardTotal(subjectKey) { return subjectData[subjectKey] ? getUnits(subjectKey).reduce((total, unit) => total + getDeck(subjectKey, unit.name).length, 0) : 1; }
function subjectProgressPercent(subjectKey) { const total = subjectCardTotal(subjectKey); return total ? Math.round(Math.min(Number(subjectProgress()[subjectKey] || 0), total) / total * 100) : 0; }
function markCardKnown(subjectKey, deckSize) { const progress = subjectProgress(); const total = Math.max(subjectCardTotal(subjectKey), deckSize || 1); progress[subjectKey] = Math.min(total, Number(progress[subjectKey] || 0) + 1); saveWorkspaceItem('revisie-subject-progress', JSON.stringify(progress)); }
function renderSubjectProgress() { document.querySelectorAll('[data-subject-card]').forEach((card) => { const percent = subjectProgressPercent(card.dataset.subjectCard); const meter = card.querySelector('.bar span'); const label = card.querySelector('.progress-ring'); if (meter) meter.style.width = `${percent}%`; if (label) label.textContent = `${percent}%`; card.setAttribute('aria-label', `${card.querySelector('strong')?.textContent || 'Subject'}: ${percent}% of cards marked known`); }); }
function renderTopicProgress() {
  document.querySelectorAll('[data-action="unit-review"]').forEach((card) => {
    const percent = topicProgressPercent(card.dataset.subject, card.dataset.unit);
    const count = getDeck(card.dataset.subject, card.dataset.unit).length;
    const meter = card.querySelector('.bar span'); const label = card.querySelector('.progress-ring');
    if (meter) meter.style.width = `${percent}%`;
    if (label) { label.textContent = `${count} CARDS`; label.title = `${percent}% marked known`; }
    card.setAttribute('aria-label', `${card.dataset.unit}: ${count} cards, ${percent}% marked known`);
  });
}
function reviewCards(cards, title, resume = null) {
  const subjectKey = subjectEntries().find(([, subject]) => title.startsWith(`${subject.label} /`))?.[0] || currentSubject;
  const unitName = title.split(' / ').slice(1).join(' / ');
  const queue = uniqueCards(resume?.queue || cards);
  let known = resume?.known || 0;
  const total = queue.length + known;
  if (total) beginFlashcardStudy(subjectKey);
  const backdrop = openModal(title, '<div class="flashcard-meta"><span id="reviewProgress"></span><span>Click to reveal</span></div><button class="flashcard" id="flashcard"><div><p></p><small>Question</small></div></button><div class="review-actions"><button class="again" id="again">Review again</button><button class="known" id="known">I knew this</button></div>', { preserveFlashcardSession: true });
  const flashcard = backdrop.querySelector('#flashcard');
  const render = () => {
    rememberActivity({ type: 'review', subject: subjectKey, unit: unitName, queue, known });
    if (!queue.length) {
      endFlashcardStudy();
      backdrop.querySelector('.modal-body').innerHTML = `<div class="flashcard-meta"><span>${known} of ${total} cards complete</span><span>Session complete</span></div><div class="flashcard answer"><div><p>Great work.</p><small>All cards marked known</small></div></div>`;
      backdrop.querySelector('.modal-close').focus({ preventScroll: true });
      renderSubjectProgress(); renderTopicProgress();
      return;
    }
    backdrop.querySelector('#reviewProgress').textContent = `${known} complete · ${queue.length} remaining`;
    flashcard.classList.remove('answer');
    flashcard.querySelector('p').textContent = queue[0][0];
    flashcard.querySelector('small').textContent = 'Question';
  };
  flashcard.addEventListener('click', () => { const answer = flashcard.classList.toggle('answer'); flashcard.querySelector('p').textContent = queue[0][answer ? 1 : 0]; flashcard.querySelector('small').textContent = answer ? 'Answer' : 'Question'; });
  backdrop.querySelector('#again').addEventListener('click', () => { flushFlashcardStudy(); markStudyComplete(); queue.push(queue.shift()); notify('Card moved to the end of your queue.'); render(); });
  backdrop.querySelector('#known').addEventListener('click', () => { flushFlashcardStudy(); markStudyComplete(); markCardKnown(subjectKey, total); if (getUnits(subjectKey).some((unit) => unit.name === unitName)) markTopicCardKnown(subjectKey, unitName, total); updateNavigationCounts(); queue.shift(); known += 1; notify('Card marked as known. Nice work.'); render(); });
  render();
}
renderSubjectProgress();
renderTopicProgress();
document.querySelectorAll('[data-action="streak"]').forEach((button) => button.addEventListener('click', openStreak));
document.addEventListener('click', (event) => { const button = event.target.closest('[data-action="unit-review"]'); if (!button || event.defaultPrevented) return; reviewCards(getDeck(button.dataset.subject, button.dataset.unit), `${subjectData[button.dataset.subject].label} / ${button.dataset.unit}`); });
const topicStyles = document.createElement('style');
topicStyles.textContent = '.topic-card-wrap{position:relative}.topic-card-wrap>.subject-card{height:100%;width:100%}.topic-actions{position:absolute;right:9px;top:9px;display:flex;gap:3px}.topic-actions button{display:grid;place-items:center;width:26px;height:26px;background:#fff;border-radius:4px;color:#74807b}.topic-actions button:hover{color:#16211f;background:#edf1eb}.topic-actions svg{width:13px}.subject-actions{display:flex;gap:8px;flex-wrap:wrap}';
document.head.appendChild(topicStyles);
const quickToolsStyles = document.createElement('style');
quickToolsStyles.textContent = '.quick-tools{background:#fff;border:1px solid #e3e9e3;border-radius:8px;padding:20px;margin-bottom:34px}.tool-link{display:flex;align-items:center;gap:10px;padding:12px 0;border-top:1px solid #e3e9e3}.tool-link>span:nth-child(2){flex:1}.tool-link strong,.tool-link small{display:block}.tool-link strong{font-size:10px}.tool-link small{color:#74807b;font-size:9px;margin-top:3px}.tool-link>svg{width:13px;color:#74807b}.tool-icon{display:grid;place-items:center;width:29px;height:29px;border-radius:6px}.tool-icon svg{width:14px}.tool-icon.coral{background:#fff0eb;color:#ff755d}.tool-icon.blue{background:#e4f0f7;color:#39718c}.tool-icon.lime{background:#f0f5cc;color:#7f921a}';
document.head.appendChild(quickToolsStyles);

const revisieAccount = JSON.parse(localStorage.getItem('revisie-account') || 'null');
function setupPersonalAccount() {
  document.querySelectorAll('.avatar').forEach((avatar) => { const name = revisieAccount?.name || 'Guest'; avatar.textContent = name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase(); });
  const switcher = document.querySelector('.workspace-switcher');
  if (switcher) { switcher.querySelector('strong')?.replaceChildren(document.createTextNode(revisieAccount?.name || 'Guest workspace')); switcher.querySelector('small')?.replaceChildren(document.createTextNode(revisieAccount ? 'Personal Study Workspace' : 'Sign in to save work')); switcher.setAttribute('role', 'button'); switcher.setAttribute('tabindex', '0'); switcher.setAttribute('aria-label', 'Open account'); switcher.onclick = () => { location.href = 'account.html'; }; switcher.onkeydown = (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); switcher.click(); } }; }
  renderProfile();
  refreshStreakSurfaces();
  document.querySelectorAll('.activity-total').forEach((item) => item.remove());
}
function setupAccountRoute() { if (!location.pathname.endsWith('account.html')) return; const loginForm = document.getElementById('loginForm'); const signupForm = document.getElementById('signupForm'); if (!loginForm || !signupForm) return; const parameters = new URLSearchParams(location.search); const panels = document.querySelectorAll('[data-auth-panel]'); const tabs = document.querySelectorAll('[data-auth-mode]'); const setMode = (mode) => { panels.forEach((panel) => { panel.hidden = panel.dataset.authPanel !== mode; }); tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.authMode === mode))); history.replaceState(null, '', `account.html?mode=${mode}${location.hash}`); lucide.createIcons(); }; const requestedMode = parameters.get('mode'); setMode(['signup', 'forgot', 'recovery'].includes(requestedMode) ? requestedMode : 'login'); setupPasswordRecovery(setMode); tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.authMode))); const account = JSON.parse(localStorage.getItem('revisie-account') || 'null'); if (account) document.getElementById('loginEmail').value = account.email || ''; if (parameters.get('deleted') === '1') notify('Your account and saved data have been deleted.'); if (parameters.get('confirmed') === '1') notify('Email confirmed — you can now log in.'); loginForm.addEventListener('submit', async (event) => { event.preventDefault(); const email = document.getElementById('loginEmail').value.trim(); const password = document.getElementById('loginPassword').value; const button = loginForm.querySelector('button'); button.disabled = true; button.textContent = 'Logging in…'; try { const client = await getSupabaseClient(); const { data, error } = await client.auth.signInWithPassword({ email, password }); if (error) throw error; const displayName = data.user?.user_metadata?.display_name || email.split('@')[0]; await restoreWorkspace(); saveWorkspaceItem('revisie-account', JSON.stringify({ id: data.user.id, name: displayName, email })); location.href = 'index.html'; } catch (error) { notify(error.message || 'Could not log in. Confirm your email first if this is a new account.'); } finally { button.disabled = false; button.innerHTML = `Log in ${icon('arrow-right')}`; lucide.createIcons(); } }); signupForm.addEventListener('submit', async (event) => { event.preventDefault(); const name = document.getElementById('signupName').value.trim(); const email = document.getElementById('signupEmail').value.trim(); const password = document.getElementById('signupPassword').value; const confirmation = document.getElementById('signupPasswordConfirm').value; if (password !== confirmation) { notify('Passwords do not match.'); return; } const button = signupForm.querySelector('button'); button.disabled = true; button.textContent = 'Creating account…'; try { const client = await getSupabaseClient(); const emailRedirectTo = new URL('account.html?mode=login&confirmed=1', location.href).href; const { error } = await client.auth.signUp({ email, password, options: { emailRedirectTo, data: { display_name: name } } }); if (error) throw error; document.getElementById('loginEmail').value = email; signupForm.reset(); setMode('login'); notify('Account created. Check your email, confirm it, then log in.'); } catch (error) { notify(error.message || 'Could not create your account.'); } finally { button.disabled = false; button.innerHTML = `Create account ${icon('mail')}`; lucide.createIcons(); } }); }
async function sendPasswordReset(email) {
  const client = await getSupabaseClient();
  const redirectTo = new URL('account.html?mode=recovery', location.href).href;
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}
function setupPasswordRecovery(setMode) {
  const status = document.getElementById('recoveryStatus');
  const recoveryForm = document.getElementById('recoveryForm');
  const submit = recoveryForm.querySelector('[type="submit"]');
  let recoveryReady = false;
  document.getElementById('forgotPassword').addEventListener('click', () => {
    document.getElementById('resetEmail').value = document.getElementById('loginEmail').value;
    setMode('forgot');
  });
  document.querySelectorAll('[data-auth-back]').forEach(button => button.addEventListener('click', () => setMode('login')));
  document.getElementById('resetPasswordForm').addEventListener('submit', async event => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[type="submit"]');
    button.disabled = true;
    const message = document.getElementById('resetPasswordStatus');
    message.textContent = 'Sending reset link…';
    try {
      await sendPasswordReset(document.getElementById('resetEmail').value.trim());
      message.textContent = 'If an account exists for that email, a password reset link will arrive shortly. Check your spam folder too.';
    } catch (error) { message.textContent = error.message || 'Could not send the reset email. Please try again.'; }
    finally { button.disabled = false; }
  });
  const ready = () => { recoveryReady = true; submit.disabled = false; status.textContent = ''; setMode('recovery'); };
  void (async () => {
    try {
      const client = await getSupabaseClient();
      client.auth.onAuthStateChange(event => { if (event === 'PASSWORD_RECOVERY') ready(); });
      // Wait for the SDK to exchange the email link before removing its URL tokens.
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (new URLSearchParams(location.search).get('mode') === 'recovery') {
        history.replaceState(null, '', 'account.html?mode=recovery');
        if (!data.session) throw new Error('This reset link has expired or is invalid. Request a new link.');
        const { error: userError } = await client.auth.getUser();
        if (userError) throw userError;
        ready();
      }
    } catch { status.textContent = 'This reset link has expired or is invalid. Request a new link using Forgot password.'; }
  })();
  recoveryForm.addEventListener('submit', async event => {
    event.preventDefault(); if (!recoveryReady || submit.disabled) return;
    const password = document.getElementById('newPassword').value;
    if (password !== document.getElementById('newPasswordConfirm').value) { status.textContent = 'Passwords do not match.'; return; }
    submit.disabled = true; status.textContent = 'Updating password…';
    try {
      const client = await getSupabaseClient();
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      await client.auth.signOut({ scope: 'local' });
      nativeLocalStorageRemoveItem('revisie-account');
      recoveryReady = false; recoveryForm.reset(); setMode('login');
      notify('Password updated. Log in with your new password.');
    } catch (error) { status.textContent = error.message || 'Could not update your password.'; }
    finally { submit.disabled = !recoveryReady; }
  });
}
function setupAccountSettings() {
  const status = document.getElementById('accountSettingsStatus');
  document.getElementById('settingsPasswordReset').addEventListener('click', async event => {
    const button = event.currentTarget; button.disabled = true;
    try {
      const client = await getSupabaseClient();
      const { data: { user }, error } = await client.auth.getUser();
      if (error || !user?.email) throw new Error('Log in to reset your password, or use Forgot password on the login screen.');
      await sendPasswordReset(user.email);
      status.textContent = 'Password reset email sent. Check your inbox and spam folder.';
    } catch (error) { status.textContent = error.message || 'Could not send the reset email.'; }
    finally { button.disabled = false; }
  });
  document.getElementById('deleteAccount').addEventListener('click', () => {
    const backdrop = openModal('Delete your account?', `<p>This permanently deletes your account, saved workspace, uploaded files and share links. This cannot be undone.</p><form class="notes-form"><label>Current password<input class="note-title" id="deleteAccountPassword" type="password" required autocomplete="current-password"></label><p>Forgot your password? Reset it from Settings first.</p><label>Type DELETE to confirm<input class="note-title" id="deleteAccountConfirm" required pattern="DELETE" autocomplete="off"></label><p id="deleteAccountStatus" role="status"></p><button class="danger-button" type="submit">Permanently delete account</button></form>`);
    backdrop.querySelector('form').addEventListener('submit', async event => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('[type="submit"]'); if (button.disabled) return;
      button.disabled = true;
      const message = backdrop.querySelector('#deleteAccountStatus'); message.textContent = 'Deleting account…';
      try {
        const client = await getSupabaseClient();
        const { data: { user }, error: userError } = await client.auth.getUser();
        if (userError || !user) throw new Error('Log in before deleting your account.');
        const { data, error } = await client.functions.invoke('delete-account', { body: { password: backdrop.querySelector('#deleteAccountPassword').value } });
        if (error || !data?.deleted) throw new Error('Could not delete your account. Check your password and connection, then try again.');
        clearTimeout(workspaceSyncTimer);
        await workspaceSyncChain;
        await client.auth.signOut({ scope: 'local' }).catch(() => {});
        clearWorkspaceCache();
        for (let index = localStorage.length - 1; index >= 0; index--) {
          const key = localStorage.key(index); if (key?.startsWith('revisie-')) nativeLocalStorageRemoveItem(key);
        }
        location.href = 'account.html?deleted=1';
      } catch (error) { message.textContent = error.message || 'Could not delete your account. Please try again.'; button.disabled = false; }
    });
  });
}
function dueCards() { return Object.fromEntries(Object.entries(JSON.parse(localStorage.getItem('revisie-due') || '{}')).filter(([key]) => subjectData[key] && !subjectData[key].deleted)); }
function revisionStats(today = studyDate()) {
  const progress = topicProgress();
  const completed = plannerItems().filter((item) => item.done && (!item.date || validStudyDate(item.date) && item.date <= today));
  const minutes = (item) => Math.max(0, Number(item.minutes) || 0);
  const reviews = Object.values(flashcardStudyRecords()).filter((record) => validStudyDate(record.date) && record.date <= today);
  const subjects = subjectEntries().map(([key, subject]) => {
    const units = getUnits(key);
    const cards = units.reduce((sum, unit) => sum + Math.min(getDeck(key, unit.name).length, Math.max(0, Number(progress[topicProgressKey(key, unit.name)]) || 0)), 0);
    const sessions = completed.filter((item) => item.subject === key);
    return { key, subject, cards, sessions: sessions.length, minutes: sessions.reduce((sum, item) => sum + minutes(item), 0) + reviews.filter((record) => record.subject === key).reduce((sum, record) => sum + record.milliseconds, 0) / 60000 };
  });
  return { cards: subjects.reduce((sum, subject) => sum + subject.cards, 0), sessions: completed.length, minutes: completed.reduce((sum, item) => sum + minutes(item), 0) + reviews.reduce((sum, record) => sum + record.milliseconds, 0) / 60000, subjects };
}
function setupProgressRoute() {
  if (!location.pathname.endsWith('progress.html')) return;
  const wrap = document.querySelector('.page-wrap'); const grid = document.querySelector('.stat-grid');
  if (!wrap || !grid) return;
  const stats = revisionStats();
  grid.innerHTML = `<div class="stat-card"><div class="stat-icon coral">${icon('check-check')}</div><div><span>Cards marked known</span><strong>${stats.cards}</strong></div></div><div class="stat-card"><div class="stat-icon lime">${icon('list-checks')}</div><div><span>Sessions completed</span><strong>${stats.sessions}</strong></div></div><div class="stat-card"><div class="stat-icon blue">${icon('clock-3')}</div><div><span>Study time completed</span><strong>${studyMinutesLabel(stats.minutes)}<small> mins</small></strong></div></div>`;
  let section = wrap.querySelector('.revision-summary');
  if (!section) {
    section = document.createElement('section'); section.className = 'revision-summary'; section.setAttribute('aria-labelledby', 'revisionSummaryTitle'); wrap.appendChild(section);
  }
  const subjects = stats.subjects.filter((subject) => subject.cards || subject.sessions || subject.minutes);
  section.innerHTML = `<div class="section-heading"><div><p class="eyebrow">REVISION DONE</p><h2 id="revisionSummaryTitle">Your work by subject</h2></div></div><p class="revision-summary-note">Cards marked known in your current decks, plus sessions you've marked complete. Study time includes time spent reviewing flashcards while this tab is visible, plus the durations of completed planner sessions.</p><div class="revision-subjects">${subjects.length ? subjects.map((item) => `<a class="revision-subject" href="${subjectRoute(item.key)}"><div class="subject-icon ${item.subject.color || 'blue'}">${subjectSymbol(item.subject)}</div><div class="revision-subject-name"><strong>${escapeHtml(item.subject.label)}</strong><small>${item.cards} ${item.cards === 1 ? 'card' : 'cards'} marked known</small></div><div class="revision-subject-sessions"><strong>${studyMinutesLabel(item.minutes)} min</strong><small>${item.sessions} ${item.sessions === 1 ? 'session' : 'sessions'} complete</small></div>${icon('arrow-up-right')}</a>`).join('') : '<p class="empty-state">No revision recorded yet. Review some flashcards or mark a study session complete to see your progress here.</p>'}</div>`;
  lucide.createIcons();
}
function setupOverviewRoute() {
  if (!location.pathname.endsWith('index.html') && location.pathname !== '/') return;
  const entries = subjectEntries(); const last = lastActivityDestination();
  const label = document.querySelector('.continue-body .subject-label'); const title = document.querySelector('.continue-body h3'); const detail = document.querySelector('.continue-body p'); const button = document.getElementById('startReview'); const grid = document.getElementById('overviewSubjects');
  const heading = document.getElementById('resume-heading');
  if (heading) heading.textContent = last ? 'Pick up where you left off' : 'Start revising';
  if (label) label.textContent = (last?.subject || 'YOUR SUBJECTS').toUpperCase();
  if (title) title.textContent = last?.title || (entries.length ? 'Choose a subject' : 'Add a subject to get started');
  if (detail) detail.textContent = last?.detail || 'Your last activity will appear here once you start.';
  if (button) {
    button.textContent = last?.button || (entries.length ? 'Browse subjects' : 'Add a subject');
    button.dataset.subject = readLastActivity()?.subject || '';
    button.onclick = last?.action || (() => { location.href = 'subjects.html'; });
  }
  if (grid) {
    grid.innerHTML = entries.map(([key, item]) => `<a class="subject-card" href="${subjectRoute(key)}"><div class="subject-top"><div class="subject-icon ${item.color || 'blue'}">${subjectSymbol(item)}</div></div><strong>${escapeHtml(item.label)}</strong><small>${escapeHtml(getUnits(key)[0]?.name || 'No topics yet')}</small></a>`).join('') || '<p class="empty-state">No subjects yet. Add one from the Subjects page.</p>';
    lucide.createIcons();
  }
}
function renderDeletedSubjectRoute() {
  if (!['mathematics.html', 'biology.html', 'history.html', 'psychology.html', 'subject.html'].some((route) => location.pathname.endsWith(route))) return;
  if (!subjectData[currentSubject]?.deleted) return;
  const wrap = document.querySelector('.page-wrap'); if (!wrap) return;
  wrap.innerHTML = `<section class="page-intro"><p class="eyebrow">SUBJECTS</p><h1>Subject deleted.</h1><p class="hero-copy">This subject is no longer in your workspace.</p><a class="primary-button" href="subjects.html">Go to Subjects</a></section>`;
}
const timetableStyles = document.createElement('style');
timetableStyles.textContent = `.timetable-toolbar{display:flex;align-items:center;justify-content:space-between;gap:14px;margin:30px 0 18px}.timetable-date{display:flex;align-items:center;gap:9px}.timetable-date strong{font-size:16px;letter-spacing:-.04em}.timetable-date button,.timetable-add{display:grid;place-items:center;width:32px;height:32px;border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--teal)}.timetable-add{width:auto;padding:0 12px;display:flex;gap:7px;font-weight:700;font-size:10px}.timetable-add svg{width:14px}.timetable-layout{display:grid;grid-template-columns:220px minmax(0,1fr);gap:18px;align-items:start}.subject-tray,.timetable-board{background:#fff;border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(23,35,33,.04)}.subject-tray{padding:16px}.subject-tray h2{font-size:14px;margin-bottom:5px}.subject-tray p{font-size:10px;line-height:1.55;color:var(--muted);margin-bottom:14px}.subject-chip-list{display:grid;gap:7px}.subject-chip{display:flex;align-items:center;gap:8px;width:100%;padding:10px;border:1px solid var(--line);border-radius:7px;background:#fff;text-align:left;font-size:10px;font-weight:700;touch-action:manipulation}.subject-chip:hover,.subject-chip.selected{background:#edf4ee;border-color:#a9c3ae}.subject-chip .subject-dot{width:8px;height:8px;border-radius:50%;background:var(--chip,#376f68);flex:0 0 auto}.subject-chip small{margin-left:auto;color:var(--muted);font-weight:500}.timetable-board{overflow:hidden}.timetable-note{display:flex;align-items:center;gap:7px;padding:12px 15px;background:#f5f8f3;border-bottom:1px solid var(--line);font-size:10px;color:var(--muted)}.timetable-note svg{width:14px;color:var(--teal)}.time-grid{max-height:660px;overflow-y:auto}.time-row{display:grid;grid-template-columns:66px 1fr;min-height:68px;border-bottom:1px solid #edf0eb}.time-row:last-child{border-bottom:0}.time-label{padding:11px 10px;color:#84908a;font:9px 'DM Mono',monospace;text-align:right}.time-slot{position:relative;padding:7px;border-left:1px solid #edf0eb;background:repeating-linear-gradient(to bottom,transparent 0,transparent 33px,#f5f7f4 34px);min-height:68px}.time-slot.drag-over{background:#edf6ef;outline:2px dashed #76a47d;outline-offset:-4px}.time-slot:focus-visible{outline:2px solid var(--coral);outline-offset:-3px}.session-card{display:flex;align-items:center;gap:7px;min-height:52px;width:100%;padding:9px 10px;background:var(--session,#e8f0e8);border-left:3px solid var(--session-strong,#376f68);border-radius:6px;text-align:left;font-size:10px;cursor:grab}.session-card:active{cursor:grabbing}.session-card.done{opacity:.58}.session-card strong,.session-card small{display:block}.session-card strong{font-size:10px}.session-card small{color:#53645c;font-size:9px;margin-top:3px}.session-card .session-complete{margin-left:auto;width:23px;height:23px;border-radius:50%;border:1px solid #9ab59f;color:#376f68}.slot-add-hint{display:none;color:#9aa49e;font-size:9px;padding:13px}.time-slot:hover .slot-add-hint{display:block}.timetable-summary{display:flex;gap:13px;margin:16px 0;color:var(--muted);font-size:10px}.timetable-summary strong{color:var(--ink)}@media(max-width:760px){.timetable-toolbar{margin-top:22px}.timetable-layout{grid-template-columns:1fr}.subject-tray{padding:13px}.subject-tray p{margin-bottom:10px}.subject-chip-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;max-height:177px;overflow:auto}.subject-chip{padding:9px;font-size:9px}.subject-chip small{display:none}.timetable-note{font-size:9px}.time-grid{max-height:none}.time-row{grid-template-columns:53px 1fr;min-height:64px}.time-label{padding-left:4px;padding-right:8px}.time-slot{min-height:64px}.slot-add-hint{display:block}.session-card{min-height:48px}.timetable-summary{margin:12px 0}.timetable-add{padding:0 9px}.timetable-add span{display:none}}`;
document.head.appendChild(timetableStyles);
const timetableFormStyles = document.createElement('style');
timetableFormStyles.textContent = '.timetable-form-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin:0 0 12px}.timetable-form-grid label{font-size:9px;color:#74807b}.timetable-form-grid input{display:block;width:100%;padding:10px 7px;margin-top:6px;border:1px solid #e3e9e3;border-radius:5px;background:#fff;font:10px Manrope}@media(max-width:650px){.timetable-form-grid{grid-template-columns:1fr 1fr}.timetable-form-grid label:last-child{grid-column:span 2}}';
document.head.appendChild(timetableFormStyles);

function timetableDateLabel(date) { return new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${date}T12:00:00`)); }
function shiftTimetableDate(date, days) { return shiftStudyDate(date, days); }
function timetableSubjects() { const personal = customSubjects.map((subject) => [subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), { label: subject.name, color: 'blue' }]); return [...subjectEntries(), ...personal.filter(([key]) => !subjectData[key])]; }
function sessionStartHour(item, position) { const hour = Number(String(item.start || '').slice(0, 2)); return Number.isFinite(hour) && hour >= 8 && hour <= 21 ? hour : Math.min(21, 16 + position); }
function openTimetableSession(item = null, date = studyDate(), start = '16:00') { const items = plannerItems(); const subjectOptions = timetableSubjects().map(([key, subject]) => `<option value="${key}" ${key === (item?.subject || currentSubject) ? 'selected' : ''}>${escapeHtml(subject.label)}</option>`).join(''); const backdrop = openModal(item ? 'Edit timetable session' : 'Add a timetable session', `<form class="notes-form" id="timetableSessionForm"><input id="timetableTitle" class="note-title" required placeholder="What will you revise?" value="${escapeHtml(item?.title || '')}"><select id="timetableSubject" class="note-subject">${subjectOptions}</select><div class="timetable-form-grid"><label>Date<input id="timetableDate" type="date" value="${item?.date || date}"></label><label>Start time<input id="timetableStart" type="time" value="${item?.start || start}"></label><label>Minutes<input id="timetableMinutes" type="number" min="5" max="300" step="5" value="${item?.minutes || 30}"></label></div><button class="primary-button" type="submit">Save to timetable ${icon('check')}</button></form>`); backdrop.querySelector('#timetableSessionForm').addEventListener('submit', (event) => { event.preventDefault(); const next = { id: item?.id || Date.now(), title: backdrop.querySelector('#timetableTitle').value.trim(), subject: backdrop.querySelector('#timetableSubject').value, date: backdrop.querySelector('#timetableDate').value, start: backdrop.querySelector('#timetableStart').value || '16:00', minutes: Number(backdrop.querySelector('#timetableMinutes').value) || 30, done: item?.done || false }; const index = items.findIndex((entry) => entry.id === next.id); if (index < 0) items.push(next); else items[index] = next; saveWorkspaceItem('revisie-planner-items', JSON.stringify(items)); closeModal(); renderTimetable(); notify('Session saved to your timetable.'); }); }
function renderTimetable() { const app = document.getElementById('timetableApp'); if (!app) return; const date = app.dataset.date || studyDate(); const selectedSubject = app.dataset.subject || ''; const allItems = plannerItems(); const dayItems = allItems.filter((item) => item.date === date); const scheduledMinutes = dayItems.reduce((total, item) => total + Number(item.minutes || 0), 0); const allocated = dueCards(); const subjects = timetableSubjects(); const byHour = new Map(); dayItems.forEach((item, index) => { const hour = sessionStartHour(item, index); if (!byHour.has(hour)) byHour.set(hour, []); byHour.get(hour).push(item); }); const rows = Array.from({ length: 14 }, (_, index) => { const hour = index + 8; const time = `${String(hour).padStart(2, '0')}:00`; const sessions = (byHour.get(hour) || []).map((item) => { const subject = subjectData[item.subject] || subjects.find(([key]) => key === item.subject)?.[1] || { label: item.subject, color: 'blue' }; const palette = subjectColourPalette[subject.color] || subjectColourPalette.green; return `<div role="button" tabindex="0" class="session-card ${item.done ? 'done' : ''}" draggable="true" data-session-id="${item.id}" style="--session:${palette[0]};--session-strong:${palette[1]}" title="Drag to move ${escapeHtml(item.title)}"><span><strong>${escapeHtml(item.title)}</strong><small>${item.done ? 'Completed · ' : ''}${escapeHtml(subject.label)} · ${item.start || time} · ${item.minutes} min</small></span><button class="session-complete" type="button" draggable="false" data-complete-session="${item.id}" aria-pressed="${item.done ? 'true' : 'false'}" aria-label="Mark ${escapeHtml(item.title)} ${item.done ? 'not done' : 'done'}" title="${item.done ? 'Mark incomplete' : 'Complete session'}">${icon('check')}</button></div>`; }).join(''); return `<div class="time-row"><div class="time-label">${time}</div><div class="time-slot" data-time="${time}" role="button" tabindex="0" aria-label="${time} time slot">${sessions || '<span class="slot-add-hint">Tap to add here</span>'}</div></div>`; }).join(''); app.innerHTML = `<div class="timetable-toolbar"><div class="timetable-date"><button type="button" data-timetable-day="-1" aria-label="Previous day">${icon('chevron-left')}</button><strong>${timetableDateLabel(date)}</strong><button type="button" data-timetable-day="1" aria-label="Next day">${icon('chevron-right')}</button></div><button class="timetable-add" type="button" id="timetableAdd">${icon('plus')}<span>Add session</span></button></div><div class="timetable-summary"><span><strong>${scheduledMinutes} min</strong> scheduled</span><span><strong>${dayItems.length}</strong> sessions</span></div><div class="timetable-layout"><aside class="subject-tray"><h2>Revision planner</h2><p>Choose a subject, then tap a time. On desktop, you can also drag it into the day.</p><div class="subject-chip-list">${subjects.map(([key, subject]) => `<button class="subject-chip ${selectedSubject === key ? 'selected' : ''}" type="button" draggable="true" data-subject-chip="${key}" style="--chip:${(subjectColourPalette[subject.color]?.[1] || '#376f68')}"><i class="subject-dot"></i>${escapeHtml(subject.label)}<small>${Number(allocated[key] || 0)} cards</small></button>`).join('')}</div></aside><section class="timetable-board" aria-label="Daily revision timetable"><div class="timetable-note">${icon('mouse-pointer-2')} Drag a subject or session into a time slot · tap works on mobile</div><div class="time-grid">${rows}</div></section></div>`; lucide.createIcons();
  app.querySelectorAll('[data-timetable-day]').forEach((button) => button.addEventListener('click', () => { app.dataset.date = shiftTimetableDate(date, Number(button.dataset.timetableDay)); app.dataset.subject = ''; renderTimetable(); }));
  app.querySelector('#timetableAdd').addEventListener('click', () => openTimetableSession(null, date));
  app.querySelectorAll('[data-subject-chip]').forEach((chip) => { chip.addEventListener('click', () => { app.dataset.subject = app.dataset.subject === chip.dataset.subjectChip ? '' : chip.dataset.subjectChip; renderTimetable(); }); chip.addEventListener('dragstart', (event) => { event.dataTransfer.setData('text/plain', `subject:${chip.dataset.subjectChip}`); }); });
  app.querySelectorAll('.session-card').forEach((card) => { card.addEventListener('dragstart', (event) => { event.dataTransfer.setData('text/plain', `session:${card.dataset.sessionId}`); }); card.addEventListener('keydown', (event) => { if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); event.stopPropagation(); card.click(); } }); card.addEventListener('click', (event) => { if (!event.target.closest('[data-complete-session]')) openTimetableSession(allItems.find((item) => String(item.id) === card.dataset.sessionId), date); }); });
  app.querySelectorAll('[data-complete-session]').forEach((button) => button.addEventListener('click', (event) => { event.stopPropagation(); const item = allItems.find((entry) => String(entry.id) === button.dataset.completeSession); if (item) { item.done = !item.done; completePlannerStudy(item); saveWorkspaceItem('revisie-planner-items', JSON.stringify(allItems)); renderTimetable(); [...app.querySelectorAll('[data-complete-session]')].find(control => control.dataset.completeSession === String(item.id))?.focus({ preventScroll: true }); } }));
  app.querySelectorAll('.time-slot').forEach((slot) => { const addToSlot = () => { const time = slot.dataset.time; if (app.dataset.subject) { const subject = subjectData[app.dataset.subject] || subjects.find(([key]) => key === app.dataset.subject)?.[1]; openTimetableSession({ subject: app.dataset.subject, title: `${subject?.label || 'Revision'} revision` }, date, time); } else openTimetableSession(null, date, time); }; slot.addEventListener('click', (event) => { if (!event.target.closest('.session-card')) addToSlot(); }); slot.addEventListener('keydown', (event) => { if (event.target !== slot) return; if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); addToSlot(); } }); slot.addEventListener('dragover', (event) => { event.preventDefault(); slot.classList.add('drag-over'); }); slot.addEventListener('dragleave', () => slot.classList.remove('drag-over')); slot.addEventListener('drop', (event) => { event.preventDefault(); slot.classList.remove('drag-over'); const [kind, value] = event.dataTransfer.getData('text/plain').split(':'); if (kind === 'session') { const item = allItems.find((entry) => String(entry.id) === value); if (item) { item.date = date; item.start = slot.dataset.time; saveWorkspaceItem('revisie-planner-items', JSON.stringify(allItems)); renderTimetable(); notify('Session moved.'); } } if (kind === 'subject') { const subject = subjectData[value] || subjects.find(([key]) => key === value)?.[1]; openTimetableSession({ subject: value, title: `${subject?.label || 'Revision'} revision` }, date, slot.dataset.time); } }); }); }
function setupTimetableRoute() { if (!location.pathname.endsWith('planner.html')) return; rememberActivity({ type: 'page', page: 'planner' }); const app = document.getElementById('timetableApp'); if (app) renderTimetable(); }
setupSubjectAppearanceButtons(); lucide.createIcons(); setupPersonalAccount(); setupAccountRoute(); setupProgressRoute(); setupOverviewRoute(); setupTimetableRoute(); renderDeletedSubjectRoute(); setupSharedItemPage(); void prepareResourceLibrary(); restoreSignedInAccount(); void hydrateNotePhotos();

// Recalculate after midnight, returning to a tab, or activity in another tab.
setInterval(refreshStreakSurfaces, 60000);
setInterval(renderGreeting, 60000);
window.addEventListener('focus', renderGreeting);
window.addEventListener('pageshow', renderGreeting);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') renderGreeting(); });
window.addEventListener('focus', refreshStreakSurfaces);
window.addEventListener('storage', (event) => { if (event.key === 'revisie-streak' || event.key === null) refreshStreakSurfaces(); });
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') refreshStreakSurfaces(); });

window.addEventListener('storage', (event) => { if (event.key === 'revisie-settings') { registerCustomSubjects(); renderProfile(); refreshSubjectAppearance(); } });

// Disclosures keep edit/delete actions out of the card's normal click targets.
document.addEventListener('click', (event) => {
  document.querySelectorAll('.item-actions[open]').forEach((menu) => { if (!menu.contains(event.target)) menu.open = false; });
  const chosen = event.target.closest('.item-actions-list button')?.closest('.item-actions');
  if (chosen) { chosen.open = false; chosen.querySelector('summary').focus(); }
}, true);
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  const menus = [...document.querySelectorAll('.item-actions[open]')];
  if (!menus.length) return;
  event.preventDefault(); event.stopImmediatePropagation();
  menus.forEach((menu) => { menu.open = false; if (menu.contains(document.activeElement)) menu.querySelector('summary').focus(); });
}, true);
document.addEventListener('focusin', (event) => {
  document.querySelectorAll('.item-actions[open]').forEach((menu) => { if (!menu.contains(event.target)) menu.open = false; });
});

document.addEventListener('toggle', (event) => {
  const menu = event.target;
  if (!menu.matches('.item-actions') || !menu.open) return;
  const list = menu.querySelector('.item-actions-list');
  list.style.transform = ''; menu.classList.remove('opens-up');
  const rect = list.getBoundingClientRect();
  const shift = rect.left < 12 ? 12 - rect.left : rect.right > window.innerWidth - 12 ? window.innerWidth - 12 - rect.right : 0;
  if (shift) list.style.transform = `translateX(${shift}px)`;
  const boundary = menu.closest('.modal-body')?.getBoundingClientRect();
  const bottom = Math.min(window.innerHeight - 12, boundary ? boundary.bottom - 8 : Infinity);
  if (rect.bottom > bottom) menu.classList.add('opens-up');
}, true);

document.addEventListener('click', (event) => { if (event.target.closest('[data-action="share-streak"]')) void openStreakShare(); });

document.addEventListener('visibilitychange', () => { flushFlashcardStudy(); resumeFlashcardStudy(); });
window.addEventListener('pagehide', () => { flushFlashcardStudy(); if (flashcardStudySession) flashcardStudySession.startedAt = null; });
window.addEventListener('pageshow', resumeFlashcardStudy);
window.addEventListener('storage', (event) => { if (event.key === flashcardStudyKey) setupProgressRoute(); });

if (['mathematics.html', 'biology.html', 'history.html', 'psychology.html', 'subject.html'].some(route => location.pathname.endsWith(route)) && subjectData[currentSubject] && !subjectData[currentSubject].deleted) {
  const activity = readLastActivity();
  if (!(activity?.type === 'review' && activity.subject === currentSubject)) rememberActivity({ type: 'subject', subject: currentSubject });
}
window.addEventListener('storage', event => { if (event.key === lastActivityKey) setupOverviewRoute(); });


// Guest onboarding stays local to this browser, separate from revision data.
function dismissGuestTutorial() {
  try { localStorage.setItem('revisie-guest-tour-seen', '1'); } catch {}
  const invite = document.getElementById('guestTourInvite');
  if (invite) invite.hidden = true;
}
function openGuestTutorial() {
  const fromInvite = Boolean(document.activeElement?.closest('#guestTourInvite'));
  dismissGuestTutorial();
  const steps = [
    { title: 'Your revision workspace', icon: 'layout-dashboard', place: 'Overview', page: 'index.html', description: 'Overview shows your streak and lets you pick up your last revision activity. On a phone, use the menu button at the top to find the other pages.', tip: 'As a guest, your work is saved in this browser. Sign in to sync it across devices.' },
    { title: 'Start with a subject', icon: 'library', place: 'Sidebar → Subjects', page: 'subjects.html', description: 'Choose a subject to see its topics, flashcards, quizzes and notes. You can also add your own subjects and topics, including maths topics for varied practice.', tip: 'Use a subject’s menu to change its name, colour, symbol or exam board.' },
    { title: 'Practise with flashcards', icon: 'layers-3', place: 'Sidebar → Flashcards', page: 'flashcards.html', description: 'Open a topic’s deck and tap a card to reveal the answer. Choose “I knew this” to move on, or “Review again” to keep practising it.', tip: 'Your cards also become Multiple Choice and Short Answer quizzes automatically. Maths Practice offers fresh numbers and worked solutions. Quiz results appear in each library; flashcard review time appears in Progress.' },
    { title: 'Keep your study material together', icon: 'notebook-pen', place: 'Sidebar → Notes / Resources', page: 'notes.html', description: 'Notes holds your written summaries and photos. Resources keeps PDFs organised by subject. Use Folders in the sidebar to group decks, notes and PDFs for an exam or revision goal.', tip: 'You can use your material as a guest. Sign in when you want to share notes, decks or resources by link.' },
    { title: 'Plan and track your revision', icon: 'calendar-days', place: 'Sidebar → Revision planner / Progress', page: 'planner.html', description: 'Add a revision session to a time slot in the planner. Mark it complete when you finish. Progress shows completed sessions and your recorded flashcard minutes.', tip: 'Reviewing a flashcard, answering a quiz question or completing today’s planner session earns a study day towards your streak. Tap a planner session’s circle to complete it or undo.' },
    { title: 'Settings and help', icon: 'settings-2', place: 'Top bar → Settings / Help centre', page: 'settings.html', description: 'Settings lets you choose Light, Dark or System appearance, change your profile and reduce interface motion.', tip: 'Logos automatically switch for Pride in June and UK Black History Month in October, with matching dark-mode artwork. Replay this tour from Help whenever you need it.' },
  ];
  let index = 0;
  const backdrop = openModal('Quick tour', '<div id="guestTourContent"></div><div class="guest-tour-footer"><button class="text-button" type="button" id="skipGuestTour">Skip tour</button><div><button class="secondary-button" type="button" id="previousGuestTour">Back</button><button class="primary-button" type="button" id="nextGuestTour">Next</button></div></div>');
  backdrop.dataset.guestTour = 'true';
  if (fromInvite) modalFocusTarget = document.querySelector('.topbar-link[href="help.html"]');
  const content = backdrop.querySelector('#guestTourContent');
  const next = backdrop.querySelector('#nextGuestTour');
  const back = backdrop.querySelector('#previousGuestTour');
  const render = () => {
    const step = steps[index];
    content.innerHTML = `<p class="eyebrow">STEP ${index + 1} OF ${steps.length}</p><progress class="guest-tour-progress" value="${index + 1}" max="${steps.length}" aria-label="Tour progress"></progress><div class="guest-tour-location">${icon(step.icon)}<span>${escapeHtml(step.place)}</span></div><h3 id="guestTourStep" tabindex="-1">${escapeHtml(step.title)}</h3><p class="guest-tour-description">${escapeHtml(step.description)}</p><p class="guest-tour-tip">${escapeHtml(step.tip)}</p><a class="text-button guest-tour-explore" href="${step.page}">Open ${step.page === 'index.html' ? 'Overview' : step.page === 'subjects.html' ? 'Subjects' : step.page === 'flashcards.html' ? 'Flashcards' : step.page === 'notes.html' ? 'Notes' : step.page === 'planner.html' ? 'Revision planner' : 'Settings'} ${icon('arrow-up-right')}</a>`;
    back.disabled = index === 0;
    next.textContent = index === steps.length - 1 ? 'Done' : 'Next';
    lucide.createIcons();
    content.querySelector('h3').focus({ preventScroll: true });
  };
  next.addEventListener('click', () => { if (index === steps.length - 1) closeModal(); else { index++; render(); } });
  back.addEventListener('click', () => { if (index > 0) { index--; render(); } });
  backdrop.querySelector('#skipGuestTour').addEventListener('click', () => closeModal());
  render();
}
function setupGuestTutorial() {
  const invite = document.getElementById('guestTourInvite');
  if (invite) {
    let seen = false;
    try { seen = localStorage.getItem('revisie-guest-tour-seen') === '1'; } catch {}
    invite.hidden = Boolean(localStorage.getItem('revisie-account')) || seen;
  }
  for (const id of ['startGuestTour', 'replayGuestTour', 'dismissGuestTour']) {
    const button = document.getElementById(id);
    if (!button || button.dataset.tourReady) continue;
    button.dataset.tourReady = 'true';
    button.addEventListener('click', id === 'dismissGuestTour' ? dismissGuestTutorial : openGuestTutorial);
  }
  lucide.createIcons();
}
setupGuestTutorial();
window.addEventListener('storage', event => {
  if (event.key === 'revisie-guest-tour-seen' || event.key === 'revisie-account' || event.key === null) setupGuestTutorial();
});
