const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../site.js'), 'utf8');
const helperSource = source.slice(source.indexOf('const notePhotoCache'), source.indexOf('const workspacePendingKey'));
const hydrateSource = source.slice(source.indexOf('function hydrateNotePhotos()'), source.indexOf('function openNotes('));
const renderSource = source.slice(source.indexOf('function renderNoteSurfaces()'), source.indexOf('function setupNotesPage()'));
const escapeSource = source.slice(source.indexOf('function escapeHtml('), source.indexOf('function subjectRoute('));
const origin = 'https://example.supabase.co';
const path = 'user-1/notes/photo.jpg';
const expiredUrl = `${origin}/storage/v1/object/sign/workspace-files/${path}?token=expired`;
const note = (extra = {}) => ({ id: 1, title: 'Cell notes', body: 'My notes', subject: 'biology', imagePath: path, image: expiredUrl, ...extra });
function harness(notes, options = {}) {
  let requests = 0, uploads = 0, now = Date.now(), saved;
  const library = [...notes];
  const noteArea = { innerHTML: '', querySelectorAll: () => [] };
  const subjectArea = { innerHTML: '', querySelectorAll: () => [] };
  const context = vm.createContext({
    icon: () => '', URL, Date: class extends Date { static now() { return now; } }, noteLibrary: library,
    currentSubject: 'biology', subjectData: { biology: { label: 'Biology' } },
    SUPABASE_URL: origin, RESOURCE_BUCKET: 'workspace-files',
    console: { warn() {} }, document: { querySelectorAll: () => [], querySelector: selector => selector === '.notes-library' ? noteArea : selector === '.subject-notes' ? subjectArea : null },
    getSupabaseClient: async () => ({ auth: { getUser: async () => ({ data: { user: options.signedOut ? null : { id: 'user-1' } }, error: options.authError ? new Error('Offline') : null }) }, storage: { from: () => ({
      createSignedUrl: async (requestedPath, ttl) => { requests += 1; assert.equal(ttl, 3600); if (options.beforeSign) await options.beforeSign(library); return options.linkError ? { error: new Error('Object missing') } : { data: { signedUrl: `${origin}/storage/v1/object/sign/workspace-files/${requestedPath}?token=fresh-${requests}` } }; },
      upload: async () => { uploads += 1; return options.uploadError ? { error: new Error('Upload failed') } : {}; }
    }) } }),
    fetch: async () => ({ blob: async () => new Blob(['data'], { type: 'image/png' }) }),
    saveWorkspaceItem(key, value) { saved = JSON.stringify(JSON.parse(value).map(context.storedNoteMetadata)); }
  });
  vm.runInContext(`${escapeSource}\n${helperSource}\n${hydrateSource}\n${renderSource}`, context);
  return { context, library, noteArea, subjectArea, get requests() { return requests; }, get uploads() { return uploads; }, get saved() { return saved; }, advance(ms) { now += ms; } };
}
test('expired persisted links are renewed even when note.image already has a value', async () => {
  const h = harness([note()]); await h.context.hydrateNotePhotos();
  assert.equal(h.requests, 1); assert.match(h.library[0].image, /token=fresh/);
});
test('old signed URLs recover their durable storage paths', async () => {
  const h = harness([note({ imagePath: '' })]); await h.context.hydrateNotePhotos();
  assert.equal(h.library[0].imagePath, path); assert.match(h.library[0].image, /token=fresh/);
  assert.equal(h.context.notePhotoPath(note({ imagePath: '', image: 'https://other.test/storage/v1/object/sign/workspace-files/x' })), '');
});
test('metadata keeps durable paths and strips expired URLs and runtime errors', () => {
  const h = harness([]); const metadata = h.context.storedNoteMetadata(note({ imagePath: '', photoError: 'Offline' }));
  assert.equal(metadata.imagePath, path); assert.equal(metadata.image, ''); assert.equal('photoError' in metadata, false);
  assert.equal(h.context.storedNoteMetadata(note({ imagePath: '', image: 'data:image/png;base64,abc' })).image, 'data:image/png;base64,abc');
});
test('signed URLs are cached briefly then renewed before expiry', async () => {
  const h = harness([note()]); await h.context.hydrateNotePhotos(); await h.context.hydrateNotePhotos(); assert.equal(h.requests, 1);
  h.advance(56 * 60 * 1000); await h.context.hydrateNotePhotos(); assert.equal(h.requests, 2);
});
test('a sync that replaces note objects does not erase resolved photo URLs', async () => {
  const h = harness([note()], { beforeSign(library) { library.splice(0, 1, note({ image: '' })); } });
  await h.context.hydrateNotePhotos(); assert.match(h.library[0].image, /token=fresh/);
});
test('photos appear in both the notes library and subject notes', async () => {
  const h = harness([note()]); await h.context.hydrateNotePhotos();
  assert.match(h.noteArea.innerHTML, /<img class="saved-note-image"/);
  assert.match(h.subjectArea.innerHTML, /<img class="saved-note-image"/);
});
test('missing files show an error instead of a broken image', async () => {
  const h = harness([note()], { linkError: true }); await h.context.hydrateNotePhotos();
  assert.equal(h.library[0].image, ''); assert.match(h.noteArea.innerHTML, /Photo unavailable/); assert.doesNotMatch(h.noteArea.innerHTML, /<img/);
});
test('signed-out and offline loading have visible states', async () => {
  for (const options of [{ signedOut: true }, { authError: true }]) {
    const h = harness([note()], options); await h.context.hydrateNotePhotos();
    assert.equal(h.library[0].image, ''); assert.match(h.noteArea.innerHTML, /Sign in|Check your connection/);
  }
});
test('legacy embedded photos are retained if migration fails', async () => {
  const h = harness([note({ imagePath: '', image: 'data:image/png;base64,abc' })], { uploadError: true });
  await h.context.hydrateNotePhotos(); assert.equal(h.uploads, 1); assert.equal(h.library[0].image, 'data:image/png;base64,abc'); assert.equal(h.saved, undefined);
});
test('successful legacy migration saves a path and never a temporary URL', async () => {
  const h = harness([note({ imagePath: '', image: 'data:image/png;base64,abc' })]); await h.context.hydrateNotePhotos();
  assert.match(JSON.parse(h.saved)[0].imagePath, /migrated.jpg$/); assert.equal(JSON.parse(h.saved)[0].image, '');
});
test('image load failures renew the link once and then stop retrying automatically', async () => {
  const h = harness([note()]); await h.context.hydrateNotePhotos();
  await h.context.handleNotePhotoError(h.library[0]); assert.equal(h.requests, 2);
  await h.context.handleNotePhotoError(h.library[0]); assert.equal(h.requests, 2); assert.equal(h.library[0].image, '');
});
test('parallel callers share a single photo hydration request', async () => {
  const h = harness([note()]); await Promise.all([h.context.hydrateNotePhotos(), h.context.hydrateNotePhotos()]); assert.equal(h.requests, 1);
});

test('photo preparation rejects failed canvas encoding and revokes the temporary URL', async () => {
  let revoked = false;
  class Image {
    width = 1000; height = 3000;
    set src(value) { this.onload(); }
  }
  const context = vm.createContext({ Image, URL: { createObjectURL: () => 'blob:test', revokeObjectURL: () => { revoked = true; } }, document: { createElement: () => ({ getContext: () => ({ drawImage() {} }), toBlob: callback => callback(null) }) } });
  const preprocessSource = source.slice(source.indexOf('function preprocessImage('), source.indexOf('function imageToDataUrl('));
  vm.runInContext(preprocessSource, context);
  await assert.rejects(context.preprocessImage({}, false), /could not be processed/);
  assert.equal(revoked, true);
});
test('photo preparation limits both dimensions and keeps upload colours', async () => {
  let canvas;
  const drawing = { drawImage() {} };
  class Image { width = 1000; height = 3000; set src(value) { this.onload(); } }
  const context = vm.createContext({ Image, URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} }, document: { createElement: () => (canvas = { getContext: () => drawing, toBlob: callback => callback({ size: 10 }) }) } });
  vm.runInContext(source.slice(source.indexOf('function preprocessImage('), source.indexOf('function imageToDataUrl(')), context);
  await context.preprocessImage({}, false);
  assert.equal(canvas.height, 1800); assert.equal(canvas.width, 600); assert.equal(drawing.filter, undefined);
});
