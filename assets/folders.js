// Folder contents are references to existing material, never copied study data.
(() => {
  const colors = { green: 'Green', blue: 'Blue', coral: 'Coral', purple: 'Purple', yellow: 'Yellow', pink: 'Pink' };
  const folderUrl = id => `folders.html?id=${encodeURIComponent(id)}`;
  const currentFolder = id => folderRecords().find(folder => folder.id === id);
  const symbol = type => type === 'deck' ? 'layers-3' : type === 'note' ? 'notebook-pen' : 'file-text';
  const typeLabel = type => type === 'deck' ? 'Flashcard deck' : type === 'note' ? 'Note' : 'PDF';
  function resolve(ref) {
    if (ref.type === 'deck') {
      const subject = subjectData[ref.subject];
      const unit = getUnits(ref.subject).find(unit => unit.name === ref.unit);
      if (!subject || subject.deleted || !unit) return null;
      const cards = getDeck(ref.subject, ref.unit);
      return { ref, title: unit.name, detail: `${subject.label} · ${cards.length} cards`, cards, open: () => cards.length ? reviewCards(cards, `${subject.label} / ${unit.name}`) : notify('This deck has no cards yet.') };
    }
    const item = (ref.type === 'note' ? noteLibrary : resourceLibrary).find(item => String(item.id) === String(ref.id));
    if (!item) return null;
    return { ref, title: ref.type === 'note' ? item.title : item.name, detail: `${typeLabel(ref.type)} · ${subjectData[item.subject]?.label || 'General'}`, open: () => ref.type === 'note' ? viewNote(item.id) : void openResource(item) };
  }
  function catalog() {
    return [
      ...subjectEntries().flatMap(([subject]) => getUnits(subject).map(unit => ({ type: 'deck', subject, unit: unit.name }))),
      ...noteLibrary.map(note => ({ type: 'note', id: String(note.id) })),
      ...resourceLibrary.map(resource => ({ type: 'resource', id: String(resource.id) })),
    ].map(resolve).filter(Boolean);
  }
  function save(folders) {
    try { saveWorkspaceItem('revisie-folders', JSON.stringify(folders)); refresh(); return true; }
    catch { notify('Could not save folders. Free some browser storage and try again.'); return false; }
  }
  function focusFolder(id) {
    const app = document.getElementById('foldersApp'); if (!app) return;
    const target = [...app.querySelectorAll('.folder-card-link')].find(link => new URL(link.href).searchParams.get('id') === id) || app.querySelector('.folder-heading h1, #newFolder');
    if (target) { if (target.matches('h1')) target.tabIndex = -1; target.focus({ preventScroll: true }); }
  }
  function editFolder(id = null, initialItem = null) {
    const existing = id ? currentFolder(id) : null;
    if (id && !existing) { notify('This folder is no longer available.'); return; }
    const backdrop = openModal(existing ? 'Edit folder' : 'New folder', `<form class="notes-form"><label class="upload-label" for="folderName">Folder name</label><input class="note-title" id="folderName" required maxlength="80" placeholder="e.g. Biology mock" value="${escapeHtml(existing?.name || '')}"><label class="upload-label" for="folderColor">Colour</label><select class="note-subject" id="folderColor">${Object.entries(colors).map(([color, label]) => `<option value="${color}" ${color === existing?.color ? 'selected' : ''}>${label}</option>`).join('')}</select><button class="primary-button" type="submit">${existing ? 'Save changes' : 'Create folder'} ${icon('check')}</button></form>`);
    backdrop.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const input = backdrop.querySelector('#folderName'), name = input.value.trim();
      if (!name) { input.setCustomValidity('Enter a folder name.'); input.reportValidity(); return; }
      const folders = folderRecords();
      const folder = id ? folders.find(folder => folder.id === id) : { id: crypto.randomUUID(), items: initialItem ? [initialItem] : [] };
      if (!folder) { closeModal(); notify('This folder was deleted on another device.'); return; }
      const color = backdrop.querySelector('#folderColor').value;
      Object.assign(folder, { name: existing && name === existing.name ? folder.name : name, color: existing && color === existing.color ? folder.color : color });
      if (!id) folders.unshift(folder);
      if (save(folders)) { closeModal(); focusFolder(folder.id); notify(initialItem ? 'Folder created and material added.' : existing ? 'Folder updated.' : 'Folder created.'); }
    });
    backdrop.querySelector('#folderName').addEventListener('input', event => event.target.setCustomValidity(''));
  }
  function deleteFolder(id) {
    const folder = currentFolder(id); if (!folder) return;
    if (!confirm(`Delete “${folder.name}”? Its flashcards, notes and PDFs will stay in your workspace.`)) return;
    if (!save(folderRecords().filter(folder => folder.id !== id))) return;
    if (new URLSearchParams(location.search).get('id') === id) {
      history.replaceState(null, '', 'folders.html'); refresh();
    }
    focusFolder(); setupOverviewRoute(); notify('Folder deleted. Your material is still saved.');
  }
  function addToFolders(ref) {
    const item = resolve(ref); if (!item) { notify('This material is no longer available.'); return; }
    const folders = folderRecords();
    if (!folders.length) { editFolder(null, ref); return; }
    const key = folderItemKey(ref);
    const backdrop = openModal('Add to folder', `<form class="notes-form"><p class="folder-dialog-copy">${escapeHtml(item.title)} can belong to more than one folder.</p><div class="folder-choice-list">${folders.map(folder => `<label class="folder-choice"><input type="checkbox" value="${escapeHtml(folder.id)}" ${folder.items.some(item => folderItemKey(item) === key) ? 'checked' : ''}><span class="subject-icon ${folder.color}">${icon('folder')}</span><span>${escapeHtml(folder.name)}</span></label>`).join('')}</div><div class="folder-dialog-actions"><button class="secondary-button" id="createFolderFromItem" type="button">New folder ${icon('plus')}</button><button class="primary-button" type="submit">Save ${icon('check')}</button></div></form>`);
    backdrop.querySelector('#createFolderFromItem').addEventListener('click', () => editFolder(null, ref));
    backdrop.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const choices = new Map([...backdrop.querySelectorAll('input[type="checkbox"]')].filter(input => input.checked !== folders.find(folder => folder.id === input.value).items.some(item => folderItemKey(item) === key)).map(input => [input.value, input.checked]));
      const updated = folderRecords().map(folder => {
        if (!choices.has(folder.id)) return folder;
        const items = folder.items.filter(item => folderItemKey(item) !== key);
        if (choices.get(folder.id)) items.push(ref);
        return { ...folder, items };
      });
      if (save(updated)) { closeModal(); notify('Folder links updated.'); }
    });
  }
  function pickMaterial(id) {
    const folder = currentFolder(id); if (!folder) return;
    const entries = catalog(), selected = new Set(folder.items.map(folderItemKey));
    const backdrop = openModal(`Material in ${folder.name}`, `<form class="notes-form"><label class="upload-label" for="folderMaterialSearch">Find material</label><input class="note-title" id="folderMaterialSearch" type="search" placeholder="Search titles or subjects"><label class="upload-label" for="folderMaterialType">Show</label><select class="note-subject" id="folderMaterialType"><option value="all">All material</option><option value="deck">Flashcard decks</option><option value="note">Notes</option><option value="resource">PDFs</option></select><p class="folder-dialog-copy">Tick material to include it. Unticking removes only its link from this folder.</p><div class="folder-choice-list" id="folderMaterialChoices">${entries.map((item, index) => `<label class="folder-choice" data-entry="${index}"><input type="checkbox" value="${index}" ${selected.has(folderItemKey(item.ref)) ? 'checked' : ''}><span class="folder-material-icon">${icon(symbol(item.ref.type))}</span><span><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></span></label>`).join('')}</div><p class="empty-state" id="folderMaterialEmpty" ${entries.length ? 'hidden' : ''}>No matching material. Create a deck or note, or upload a PDF first.</p><p class="folder-selection-count" id="folderSelectionCount" role="status"></p><button class="primary-button" type="submit">Save material ${icon('check')}</button></form>`);
    const filter = () => {
      const query = backdrop.querySelector('#folderMaterialSearch').value.trim().toLowerCase();
      const type = backdrop.querySelector('#folderMaterialType').value;
      let visible = 0;
      backdrop.querySelectorAll('[data-entry]').forEach(row => {
        const item = entries[Number(row.dataset.entry)];
        row.hidden = !(type === 'all' || type === item.ref.type) || !`${item.title} ${item.detail}`.toLowerCase().includes(query);
        if (!row.hidden) visible++;
      });
      backdrop.querySelector('#folderMaterialEmpty').hidden = visible > 0;
    };
    const count = () => { backdrop.querySelector('#folderSelectionCount').textContent = `${backdrop.querySelectorAll('input[type="checkbox"]:checked').length} selected`; };
    backdrop.querySelector('#folderMaterialSearch').addEventListener('input', filter);
    backdrop.querySelector('#folderMaterialType').addEventListener('change', filter);
    backdrop.querySelector('#folderMaterialChoices').addEventListener('change', count); count();
    backdrop.querySelector('form').addEventListener('submit', event => {
      event.preventDefault();
      const folders = folderRecords(), live = folders.find(folder => folder.id === id);
      if (!live) { closeModal(); notify('This folder was deleted on another device.'); return; }
      const items = new Map(live.items.map(ref => [folderItemKey(ref), ref]));
      backdrop.querySelectorAll('input[type="checkbox"]').forEach(input => {
        const ref = entries[Number(input.value)].ref, key = folderItemKey(ref);
        if (input.checked && !selected.has(key)) items.set(key, ref);
        if (!input.checked && selected.has(key)) items.delete(key);
      });
      live.items = [...items.values()];
      if (save(folders)) { closeModal(); focusFolder(id); notify('Folder material saved.'); }
    });
  }
  function removeItem(id, key) {
    const folders = folderRecords(), folder = folders.find(folder => folder.id === id); if (!folder) return;
    folder.items = folder.items.filter(ref => folderItemKey(ref) !== key);
    if (save(folders)) { focusFolder(id); notify('Removed from this folder. The original material is unchanged.'); }
  }
  function reviewEntries(folder) {
    return folder.items.filter(ref => ref.type === 'deck').flatMap(ref => {
      const item = resolve(ref); if (!item) return [];
      return item.cards.map(card => ({ key: JSON.stringify([ref.subject, ref.unit, ...card]), ref, card, title: `${subjectData[ref.subject].label} / ${ref.unit}`, size: item.cards.length }));
    });
  }
  function reviewFolder(id, resume = null) {
    const folder = currentFolder(id); if (!folder) { notify('This folder is no longer available.'); return; }
    const entries = reviewEntries(folder), available = new Map(entries.map(entry => [entry.key, entry]));
    if (!entries.length) { notify('Add a flashcard deck to this folder to start revising.'); return; }
    let known = new Set((Array.isArray(resume?.known) ? resume.known : []).filter(key => available.has(key)));
    let queue = [...new Set((Array.isArray(resume?.queue) ? resume.queue : entries.map(entry => entry.key)).filter(key => available.has(key) && !known.has(key)))];
    for (const entry of entries) if (!queue.includes(entry.key) && !known.has(entry.key)) queue.push(entry.key);
    const render = () => {
      const liveFolder = currentFolder(id);
      if (!liveFolder) { closeModal(); notify('This folder was deleted.'); return; }
      const live = new Map(reviewEntries(liveFolder).map(entry => [entry.key, entry]));
      queue = queue.filter(key => live.has(key)); known = new Set([...known].filter(key => live.has(key)));
      rememberActivity({ type: 'folder-review', id, queue, known: [...known] });
      if (!queue.length) {
        openModal(liveFolder.name, `<div class="flashcard-meta"><span>${known.size} cards complete</span><span>Session complete</span></div><div class="flashcard answer"><div><p>Review complete.</p><small>All remaining cards marked known</small></div></div><a class="secondary-button" href="${folderUrl(id)}">Back to folder ${icon('folder')}</a>`);
        renderSubjectProgress(); renderTopicProgress(); return;
      }
      const entry = live.get(queue[0]);
      if (!flashcardStudySession || flashcardStudySession.subject !== entry.ref.subject) beginFlashcardStudy(entry.ref.subject);
      const backdrop = openModal(liveFolder.name, `<div class="flashcard-meta"><span>${known.size} complete · ${queue.length} remaining</span><span>Click to reveal</span></div><p class="folder-review-source">${escapeHtml(entry.title)}</p><button class="flashcard" id="flashcard"><div><p>${escapeHtml(entry.card[0])}</p><small>Question</small></div></button><div class="review-actions"><button class="again" id="again">Review again</button><button class="known" id="known">I knew this</button></div>`, { preserveFlashcardSession: true });
      backdrop.dataset.folderReview = id;
      backdrop.querySelector('#flashcard').addEventListener('click', event => {
        const card = event.currentTarget, answer = card.classList.toggle('answer');
        card.querySelector('p').textContent = entry.card[answer ? 1 : 0]; card.querySelector('small').textContent = answer ? 'Answer' : 'Question';
      });
      backdrop.querySelector('#again').addEventListener('click', () => { flushFlashcardStudy(); markStudyComplete(); queue.push(queue.shift()); render(); });
      backdrop.querySelector('#known').addEventListener('click', () => {
        flushFlashcardStudy(); markStudyComplete();
        if (reviewEntries(currentFolder(id) || { items: [] }).some(item => item.key === entry.key)) {
          markCardKnown(entry.ref.subject, entry.size); markTopicCardKnown(entry.ref.subject, entry.ref.unit, entry.size);
        }
        known.add(queue.shift()); updateNavigationCounts(); render();
      });
    };
    render();
  }
  function activityDestination(activity) {
    const folder = currentFolder(activity.id); if (!folder) return null;
    if (activity.type === 'folder-review') {
      const entries = reviewEntries(folder); if (!entries.length) return null;
      const known = new Set(Array.isArray(activity.known) ? activity.known : []);
      const remaining = entries.filter(entry => !known.has(entry.key)).length;
      return { subject: 'Folders', title: folder.name, detail: remaining ? `${remaining} cards remaining in your folder review.` : 'Your last folder review is complete.', button: remaining ? 'Resume review' : 'Review again', action: () => reviewFolder(folder.id, remaining ? activity : null) };
    }
    return { subject: 'Folders', title: folder.name, detail: 'Your last opened folder.', button: 'Open folder', action: () => { location.href = folderUrl(folder.id); } };
  }
  function renameDeck(subject, oldName, name) {
    const folders = folderRecords(); let changed = false;
    for (const folder of folders) for (const ref of folder.items) if (ref.type === 'deck' && ref.subject === subject && ref.unit === oldName) { ref.unit = name; changed = true; }
    if (changed) save(folders);
    const activity = readLastActivity();
    if (activity?.type === 'folder-review') {
      const renameKey = key => { try { const value = JSON.parse(key); if (value[0] === subject && value[1] === oldName) value[1] = name; return JSON.stringify(value); } catch { return key; } };
      saveWorkspaceItem(lastActivityKey, JSON.stringify({ ...activity, queue: (activity.queue || []).map(renameKey), known: (activity.known || []).map(renameKey) }));
    }
  }
  function refresh() {
    const app = document.getElementById('foldersApp');
    const folders = folderRecords();
    document.querySelectorAll('[data-page="folders.html"] .nav-count').forEach(badge => { badge.textContent = folders.length; });
    if (!app) return;
    const id = new URLSearchParams(location.search).get('id');
    const folder = id && folders.find(folder => folder.id === id);
    const intro = document.querySelector('.page-intro');
    if (intro) intro.hidden = Boolean(folder);
    if (id && !folder) {
      app.innerHTML = `<div class="folder-empty"><h2>Folder not found</h2><p>It may have been deleted on another device. Your original material is still in your workspace.</p><a class="secondary-button" href="folders.html">All folders ${icon('arrow-left')}</a></div>`;
    } else if (!folder) {
      app.innerHTML = `<div class="folders-toolbar"><p>${folders.length} ${folders.length === 1 ? 'folder' : 'folders'}</p><button class="primary-button" id="newFolder">New folder ${icon('plus')}</button></div>${folders.length ? `<div class="folder-grid">${folders.map(folder => {
        const available = folder.items.map(resolve).filter(Boolean), decks = available.filter(item => item.ref.type === 'deck').length;
        return `<article class="folder-card"><a class="folder-card-link" href="${folderUrl(folder.id)}"><span class="subject-icon ${folder.color}">${icon('folder')}</span><h2>${escapeHtml(folder.name)}</h2><p>${available.length} ${available.length === 1 ? 'item' : 'items'} · ${decks} ${decks === 1 ? 'deck' : 'decks'}</p></a>${itemActions(`Options for ${folder.name}`, itemAction('Rename or change colour', 'pencil', `data-edit-folder="${escapeHtml(folder.id)}"`) + itemAction('Delete folder', 'trash-2', `data-delete-folder="${escapeHtml(folder.id)}"`, true))}</article>`;
      }).join('')}</div>` : '<div class="folder-empty"><div class="folder-empty-symbol">'+icon('folders')+'</div><h2>Your first folder</h2><p>Create a collection for a mock exam, a tricky topic or your next revision session. Add existing decks, notes and PDFs without copying them.</p></div>'}`;
      app.querySelector('#newFolder').addEventListener('click', () => editFolder());
    } else {
      const available = folder.items.map(resolve).filter(Boolean), count = reviewEntries(folder).length;
      app.innerHTML = `<a class="text-button folder-back" href="folders.html">${icon('arrow-left')} All folders</a><section class="folder-heading"><span class="subject-icon ${folder.color}">${icon('folder')}</span><div><p class="eyebrow">FOLDER</p><h1>${escapeHtml(folder.name)}</h1><p>${available.length} items · ${count} flashcards</p></div>${itemActions(`Options for ${folder.name}`, itemAction('Rename or change colour', 'pencil', `data-edit-folder="${escapeHtml(folder.id)}"`) + itemAction('Delete folder', 'trash-2', `data-delete-folder="${escapeHtml(folder.id)}"`, true))}</section><div class="folder-page-actions"><button class="primary-button" id="addFolderMaterial">Add material ${icon('plus')}</button><button class="secondary-button" id="reviewFolder" ${count ? '' : 'disabled'}>Revise all flashcards ${icon('layers-3')}</button></div><div class="folder-content-list">${folder.items.length ? folder.items.map((ref, index) => {
        const item = resolve(ref);
        return `<article class="folder-content-row ${item ? '' : 'is-unavailable'}"><span class="folder-material-icon">${icon(symbol(ref.type))}</span><${item ? 'button type="button"' : 'div'} class="folder-content-open" ${item ? `data-open-folder-item="${index}"` : ''}><strong>${escapeHtml(item?.title || (ref.type === 'deck' ? ref.unit : `Unavailable ${typeLabel(ref.type).toLowerCase()}`))}</strong><small>${escapeHtml(item?.detail || 'The original material was deleted or is no longer available.')}</small></${item ? 'button' : 'div'}>${itemActions('Options for '+(item?.title || 'unavailable item'), itemAction('Remove from folder', 'folder-minus', `data-remove-folder-item="${index}"`))}</article>`;
      }).join('') : '<div class="folder-empty"><h2>Add your revision material</h2><p>Choose Add material to select decks, notes and PDFs from your workspace.</p></div>'}</div>`;
      app.querySelector('#addFolderMaterial').addEventListener('click', () => pickMaterial(folder.id));
      app.querySelector('#reviewFolder').addEventListener('click', () => reviewFolder(folder.id));
      app.querySelectorAll('[data-open-folder-item]').forEach(button => button.addEventListener('click', () => resolve(folder.items[Number(button.dataset.openFolderItem)])?.open()));
      app.querySelectorAll('[data-remove-folder-item]').forEach(button => button.addEventListener('click', () => removeItem(folder.id, folderItemKey(folder.items[Number(button.dataset.removeFolderItem)]))));
    }
    app.querySelectorAll('[data-edit-folder]').forEach(button => button.addEventListener('click', () => editFolder(button.dataset.editFolder)));
    app.querySelectorAll('[data-delete-folder]').forEach(button => button.addEventListener('click', () => deleteFolder(button.dataset.deleteFolder)));
    lucide.createIcons();
  }
  window.revisieFolders = { refresh, activityDestination, renameDeck, reviewFolder };
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-folder-item]'); if (!button) return;
    event.preventDefault(); event.stopPropagation();
    try { const ref = JSON.parse(button.dataset.folderItem); if (folderItemKey(ref)) addToFolders(ref); } catch { notify('This material could not be added.'); }
  });
  window.addEventListener('storage', event => {
    if (['revisie-folders', 'revisie-note-library', 'revisie-resources', 'revisie-flashcards', 'revisie-topics', 'revisie-subjects', 'revisie-settings'].includes(event.key) || event.key === null) {
      if (event.key === 'revisie-folders') { refresh(); setupOverviewRoute(); }
      else { refreshWorkspaceMemory(); void prepareResourceLibrary(); }
      const active = document.querySelector('[data-folder-review]');
      if (active && !currentFolder(active.dataset.folderReview)) { closeModal(); notify('This folder was deleted in another tab.'); }
    }
  });
  refresh(); setupOverviewRoute();
  const id = new URLSearchParams(location.search).get('id');
  if (document.getElementById('foldersApp') && currentFolder(id)) rememberActivity({ type: 'folder', id });
})();
