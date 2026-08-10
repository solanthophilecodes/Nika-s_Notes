console.log("Nika's Notes loaded ✦");

// ============================================================
// FAIRY LIGHTS — SVG droopy catenary strings
// ============================================================

function drawFairyStrings() {
    const lightContainers = document.querySelectorAll('.plank-fairy-lights');

    lightContainers.forEach(container => {
        const svg = container.querySelector('.fairy-string-svg');
        const pathEl = container.querySelector('.fairy-string-path');
        if (!svg || !pathEl) return;

        const bulbs = Array.from(container.querySelectorAll('.plank-bulb'));
        if (bulbs.length < 2) return;

        const containerRect = container.getBoundingClientRect();

        let d = '';
        const SAG = 10;

        for (let i = 0; i < bulbs.length - 1; i++) {
            const a = bulbs[i].getBoundingClientRect();
            const b = bulbs[i + 1].getBoundingClientRect();

            const x1 = (a.left + a.width / 2) - containerRect.left;
            const y1 = (a.top + a.height / 2) - containerRect.top;
            const x2 = (b.left + b.width / 2) - containerRect.left;
            const y2 = (b.top + b.height / 2) - containerRect.top;

            const mx = (x1 + x2) / 2;
            const my = Math.max(y1, y2) + SAG;

            if (i === 0) d += `M ${x1} ${y1} `;
            d += `Q ${mx} ${my} ${x2} ${y2} `;
        }

        pathEl.setAttribute('d', d.trim());

        svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height + SAG + 4}`);
        svg.style.width = '100%';
        svg.style.height = `${containerRect.height + SAG + 4}px`;
        svg.style.position = 'absolute';
        svg.style.top = '0';
        svg.style.left = '0';
        svg.style.overflow = 'visible';
    });
}

window.addEventListener('load', () => { setTimeout(drawFairyStrings, 80); });
window.addEventListener('resize', drawFairyStrings);


// ============================================================
// STORAGE HELPERS
// ============================================================

const Store = {
    getSubjects() {
        try { return JSON.parse(localStorage.getItem('subjects') || '[]'); }
        catch { return []; }
    },
    saveSubjects(arr) {
        localStorage.setItem('subjects', JSON.stringify(arr));
    },
    getChapters(subject) {
        try { return JSON.parse(localStorage.getItem(`subject_${subject}`) || '[]'); }
        catch { return []; }
    },
    saveChapters(subject, arr) {
        localStorage.setItem(`subject_${subject}`, JSON.stringify(arr));
    },
    getNoteIds(subject, chapter) {
        try { return JSON.parse(localStorage.getItem(`notes_${subject}_${chapter}`) || '[]'); }
        catch { return []; }
    },
    saveNoteIds(subject, chapter, arr) {
        localStorage.setItem(`notes_${subject}_${chapter}`, JSON.stringify(arr));
    },
    getNote(id) {
        try { return JSON.parse(localStorage.getItem(`note_${id}`)); }
        catch { return null; }
    },
    saveNote(note) {
        localStorage.setItem(`note_${note.id}`, JSON.stringify(note));
    },
    deleteNote(note) {
        localStorage.removeItem(`note_${note.id}`);
        let ids = Store.getNoteIds(note.subject, note.chapter);
        ids = ids.filter(id => id !== note.id);
        Store.saveNoteIds(note.subject, note.chapter, ids);
        if (ids.length === 0) {
            let chapters = Store.getChapters(note.subject);
            chapters = chapters.filter(c => c !== note.chapter);
            Store.saveChapters(note.subject, chapters);
            if (chapters.length === 0) {
                let subjects = Store.getSubjects();
                subjects = subjects.filter(s => s !== note.subject);
                Store.saveSubjects(subjects);
            }
        }
    },
    deleteSubject(subject) {
        const chapters = Store.getChapters(subject);
        chapters.forEach(chapter => {
            const ids = Store.getNoteIds(subject, chapter);
            ids.forEach(id => localStorage.removeItem(`note_${id}`));
            localStorage.removeItem(`notes_${subject}_${chapter}`);
        });
        localStorage.removeItem(`subject_${subject}`);
        let subjects = Store.getSubjects();
        subjects = subjects.filter(s => s !== subject);
        Store.saveSubjects(subjects);
    },
    addNoteToIndex(note) {
        let subjects = Store.getSubjects();
        if (!subjects.includes(note.subject)) {
            subjects.push(note.subject);
            Store.saveSubjects(subjects);
        }
        let chapters = Store.getChapters(note.subject);
        if (!chapters.includes(note.chapter)) {
            chapters.push(note.chapter);
            Store.saveChapters(note.subject, chapters);
        }
        let ids = Store.getNoteIds(note.subject, note.chapter);
        if (!ids.includes(note.id)) {
            ids.push(note.id);
            Store.saveNoteIds(note.subject, note.chapter, ids);
        }
    },
    exportAll() {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            data[key] = localStorage.getItem(key);
        }
        return data;
    },
    importAll(data) {
        Object.entries(data).forEach(([key, val]) => {
            localStorage.setItem(key, val);
        });
    },

    // ── Archive helpers ──────────────────────────────────────────
    getArchivedSubjects() {
        // Derive live list from all archived notes
        const subjects = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key.startsWith('note_')) continue;
            try {
                const n = JSON.parse(localStorage.getItem(key));
                if (n && n.archived && n.subject) subjects.add(n.subject);
            } catch { /* ignore */ }
        }
        return [...subjects];
    },
    getArchivedChapters(subject) {
        const chapters = new Set();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key.startsWith('note_')) continue;
            try {
                const n = JSON.parse(localStorage.getItem(key));
                if (n && n.archived && n.subject === subject && n.chapter) chapters.add(n.chapter);
            } catch { /* ignore */ }
        }
        return [...chapters];
    },
    getArchivedNoteIds(subject, chapter) {
        const ids = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key.startsWith('note_')) continue;
            try {
                const n = JSON.parse(localStorage.getItem(key));
                if (n && n.archived && n.subject === subject && n.chapter === chapter) ids.push(n.id);
            } catch { /* ignore */ }
        }
        return ids;
    },
    archiveNote(id) {
        const note = Store.getNote(id);
        if (!note) return;
        // Remove from active index
        Store.deleteNote(note);
        // Re-save as archived (deleteNote removed from localStorage, so re-save)
        note.archived = true;
        localStorage.setItem(`note_${note.id}`, JSON.stringify(note));
    },
    unarchiveNote(id) {
        const note = Store.getNote(id);
        if (!note) return;
        note.archived = false;
        Store.saveNote(note);
        Store.addNoteToIndex(note);
    },
};


// ============================================================
// NAVIGATION SYSTEM
// ============================================================

const pages = {
    'shelf':        document.getElementById('page-shelf'),
    'note-builder': document.getElementById('page-note-builder'),
    'my-notes':     document.getElementById('page-my-notes'),
    'chapters':     document.getElementById('page-chapters'),
    'note-list':    document.getElementById('page-note-list'),
    'note-view':    document.getElementById('page-note-view'),
    'archive':      document.getElementById('page-archive'),
    'arc-chapters': document.getElementById('page-arc-chapters'),
    'arc-note-list':document.getElementById('page-arc-note-list'),
};

const navStack = [];
let currentPage = 'shelf';

function showPage(name, pushToStack = true) {
    if (pushToStack && currentPage !== name) {
        navStack.push(currentPage);
    }
    currentPage = name;

    Object.entries(pages).forEach(([key, el]) => {
        if (!el) return;
        if (key === name) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });

    document.querySelectorAll('.nav-link').forEach(a => {
        a.classList.remove('active');
        if (a.dataset.nav === name) a.classList.add('active');
    });
}

function goBack() {
    if (navStack.length === 0) {
        showPage('shelf', false);
        return;
    }
    const prev = navStack.pop();
    showPage(prev, false);
}

document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', e => {
        e.preventDefault();
        const target = link.dataset.nav;
        if (target === 'shelf') {
            navStack.length = 0;
            showPage('shelf', false);
        } else if (target === 'my-notes') {
            renderMyNotes();
            showPage('my-notes');
        } else if (target === 'archive') {
            renderArchive();
            showPage('archive');
        }
    });
});

// ============================================================
// SHELF — Subject books on Row 2 + Archive books on Archive row
// ============================================================

const SUBJECT_BOOK_COLORS = [
    { cls: 'b-dusty-rose',    rot: '-2deg' },
    { cls: 'b-sage-green',    rot: '1.5deg' },
    { cls: 'b-burgundy',      rot: '-1deg' },
    { cls: 'b-warm-tan',      rot: '2deg' },
    { cls: 'b-muted-gold',    rot: '-1.5deg' },
    { cls: 'b-dusty-purple',  rot: '1deg' },
    { cls: 'b-antique-brown', rot: '-2.5deg' },
];

function renderShelfSubjectBooks() {
    const container = document.getElementById('shelf-subject-books');
    if (!container) return;
    container.innerHTML = '';
    const subjects = Store.getSubjects();
    subjects.forEach((subject, i) => {
        const color = SUBJECT_BOOK_COLORS[i % SUBJECT_BOOK_COLORS.length];
        const ornaments = ['✦ ❧ ✦', '✾ ❧ ✾', '❋ ❧ ❋'];
        const orn = ornaments[i % ornaments.length];
        const book = document.createElement('div');
        book.className = `book ${color.cls} shelf-subject-book`;
        book.style.height = '138px';
        book.style.transform = `rotate(${color.rot})`;
        book.title = subject;
        book.innerHTML = `
            <div class="book-inner">
                <div class="book-ornament top-ornament">${orn}</div>
                <div class="book-title">${escapeHtml(subject)}</div>
                <div class="book-ornament bottom-ornament">— ❦ —</div>
                <div class="book-pattern"></div>
            </div>
            <button class="book-delete-btn" title="Delete this book" aria-label="Delete ${escapeHtml(subject)}">✕</button>
        `;
        book.addEventListener('click', () => {
            openChapterIndex(subject);
        });
        const deleteBtn = book.querySelector('.book-delete-btn');
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const sure = confirm(`Delete "${subject}" and everything inside it? This can't be undone.`);
            if (!sure) return;
            Store.deleteSubject(subject);
            renderShelfSubjectBooks();
        });
        container.appendChild(book);
    });
}

function renderShelfArchiveBooks() {
    const container = document.getElementById('shelf-archive-books');
    if (!container) return;
    container.innerHTML = '';
    const subjects = Store.getArchivedSubjects();
    subjects.forEach((subject, i) => {
        const color = SUBJECT_BOOK_COLORS[i % SUBJECT_BOOK_COLORS.length];
        const book = document.createElement('div');
        book.className = `book ${color.cls} shelf-subject-book`;
        book.style.height = '125px';
        book.style.transform = `rotate(${color.rot})`;
        book.style.opacity = '0.75';
        book.title = `[Archive] ${subject}`;
        book.innerHTML = `
            <div class="book-inner">
                <div class="book-ornament top-ornament">◈ ❧ ◈</div>
                <div class="book-title">${escapeHtml(subject)}</div>
                <div class="book-ornament bottom-ornament">— ❦ —</div>
                <div class="book-pattern"></div>
            </div>
        `;
        book.addEventListener('click', () => {
            openArcChapterIndex(subject);
        });
        container.appendChild(book);
    });
}

// Render both shelf book rows on load
window.addEventListener('load', () => {
    setTimeout(() => {
        renderShelfSubjectBooks();
        renderShelfArchiveBooks();
    }, 120);
});

document.getElementById('book-note-builder')?.addEventListener('click', () => {
    openNoteBuilder(null);
    showPage('note-builder');
});

document.getElementById('nb-back-btn')?.addEventListener('click', goBack);
document.getElementById('mn-back-btn')?.addEventListener('click', goBack);
document.getElementById('ch-back-btn')?.addEventListener('click', goBack);
document.getElementById('nl-back-btn')?.addEventListener('click', goBack);
document.getElementById('nv-back-btn')?.addEventListener('click', goBack);


// ============================================================
// NOTE BUILDER
// ============================================================

let editingNoteId = null;
let selectedCharacter = 'deku';

const SECTION_TYPES = {
    'fun-facts': { label: '✦ Fun Facts', icon: '✦' },
    'must-know': { label: '⚠ Must Know', icon: '⚠' },
    'traps':     { label: '◈ Traps',     icon: '◈' },
    'qa':        { label: '◎ Q&A',       icon: '◎' },
    'custom':    { label: '✎ Custom',    icon: '◇' },
    'mcq':       { label: '☑ MCQs',      icon: '☑' },
    'image':     { label: '🖼 Diagrams',  icon: '🖼' },
    'code':      { label: '</> Code',    icon: '</>' },
    'diff':      { label: '⇄ Difference Between', icon: '⇄' },
};

// ============================================================
// IMAGE STORE — IndexedDB, for embedded diagram images
// Keeps big image blobs out of localStorage (which caps ~5-10MB
// total). Notes only ever hold a lightweight "idb:<key>" reference
// (or a plain URL, for pasted image links — those aren't stored here).
// ============================================================
const ImageStore = (() => {
    let dbPromise = null;
    function getDb() {
        if (dbPromise) return dbPromise;
        dbPromise = new Promise((resolve, reject) => {
            const req = indexedDB.open('NikasNotesImages', 1);
            req.onupgradeneeded = () => {
                req.result.createObjectStore('images');
            };
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
        return dbPromise;
    }
    async function putImage(key, blob) {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', 'readwrite');
            tx.objectStore('images').put(blob, key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    async function getImage(key) {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', 'readonly');
            const req = tx.objectStore('images').get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = () => reject(req.error);
        });
    }
    async function deleteImage(key) {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('images', 'readwrite');
            tx.objectStore('images').delete(key);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
    // Resize + compress an uploaded image File down to a reasonable
    // size, return a Blob (JPEG). Keeps IndexedDB usage sane even
    // if the user uploads big phone-camera screenshots.
    function compressImageFile(file, maxDim = 1600, quality = 0.78) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                let { width, height } = img;
                if (width > maxDim || height > maxDim) {
                    const scale = maxDim / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(blob => {
                    URL.revokeObjectURL(url);
                    blob ? resolve(blob) : reject(new Error('Image compression failed'));
                }, 'image/jpeg', quality);
            };
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
            img.src = url;
        });
    }
    // Populate an <img> element given a src that's either a plain
    // URL or an "idb:<key>" reference.
    async function renderInto(imgEl, src) {
        if (!src) return;
        if (src.startsWith('idb:')) {
            const key = src.slice(4);
            try {
                const blob = await getImage(key);
                if (blob) imgEl.src = URL.createObjectURL(blob);
            } catch { /* ignore — leave broken image */ }
        } else {
            imgEl.src = src;
        }
    }
    return { putImage, getImage, deleteImage, compressImageFile, renderInto };
})();

// --- Character selector ---

function initCharSelector() {
    document.querySelectorAll('.nb-char-card').forEach(card => {
        card.addEventListener('click', () => {
            selectCharCard(card.dataset.char);
        });
    });
}

function applyNotebookTheme(char) {
    const notebook = document.getElementById('nb-notebook-themed');
    if (!notebook) return;
    notebook.classList.remove('nb-notebook--deku', 'nb-notebook--katsuki', 'nb-notebook--shoto');
    notebook.classList.add(`nb-notebook--${char}`);

    const bg = document.getElementById('nb-bg');
    if (bg) {
        bg.classList.remove('nb-notebook--deku', 'nb-notebook--katsuki', 'nb-notebook--shoto');
        bg.classList.add(`nb-notebook--${char}`);
    }
}

function selectCharCard(char) {
    selectedCharacter = char;
    document.querySelectorAll('.nb-char-card').forEach(c => {
        c.classList.toggle('selected', c.dataset.char === char);
    });
    applyNotebookTheme(char);
}

initCharSelector();

// --- Subject / Chapter autocomplete ---

const subjectInput    = document.getElementById('nb-subject');
const subjectDropdown = document.getElementById('nb-subject-dropdown');
const chapterInput    = document.getElementById('nb-chapter');
const chapterDropdown = document.getElementById('nb-chapter-dropdown');

subjectInput?.addEventListener('input', () => {
    const val = subjectInput.value.trim().toLowerCase();
    const subjects = Store.getSubjects();
    const matches = subjects.filter(s => s.toLowerCase().includes(val));
    renderDropdown(subjectDropdown, matches, chosen => {
        subjectInput.value = chosen;
        subjectDropdown.classList.remove('open');
        updateChapterDropdown();
    });
    subjectDropdown.classList.toggle('open', matches.length > 0 && val.length > 0);
    updateChapterDropdown();
});

subjectInput?.addEventListener('focus', () => {
    const subjects = Store.getSubjects();
    if (subjects.length > 0) {
        renderDropdown(subjectDropdown, subjects, chosen => {
            subjectInput.value = chosen;
            subjectDropdown.classList.remove('open');
            updateChapterDropdown();
        });
        subjectDropdown.classList.add('open');
    }
});

function updateChapterDropdown() {
    const subject = subjectInput?.value.trim();
    if (!subject) { chapterDropdown.classList.remove('open'); return; }
    const chapters = Store.getChapters(subject);
    const val = chapterInput?.value.trim().toLowerCase() || '';
    const matches = chapters.filter(c => c.toLowerCase().includes(val));
    if (matches.length > 0) {
        renderDropdown(chapterDropdown, matches, chosen => {
            chapterInput.value = chosen;
            chapterDropdown.classList.remove('open');
        });
        chapterDropdown.classList.add('open');
    } else {
        chapterDropdown.classList.remove('open');
    }
}

chapterInput?.addEventListener('input', updateChapterDropdown);
chapterInput?.addEventListener('focus', updateChapterDropdown);

function renderDropdown(container, items, onSelect) {
    container.innerHTML = '';
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'nb-dropdown-item';
        div.textContent = item;
        div.addEventListener('mousedown', e => {
            e.preventDefault();
            onSelect(item);
        });
        container.appendChild(div);
    });
}

function closeAllDropdowns() {
    document.querySelectorAll('.nb-dropdown').forEach(d => d.classList.remove('open'));
}

document.addEventListener('click', e => {
    if (!e.target.closest('.nb-combo')) closeAllDropdowns();
});

// ============================================================
// TOPIC + SECTION BUILDER
// ============================================================

const SECTION_ICONS = ['✦', '⚠', '⚡', '✎', '✿', '★', '◆', '→', '•'];

const ADD_ITEM_LABEL = {
    'mcq':   '+ Add question',
    'qa':    '+ Add question',
    'image': '+ Add image',
    'code':  '+ Add snippet',
    'diff':  '+ Add table',
};

function createSectionCard(topicEl, type, titleOverride, items) {
    const meta = SECTION_TYPES[type] || SECTION_TYPES['custom'];
    const title = (titleOverride !== undefined && titleOverride !== null) ? titleOverride : meta.label;

    const card = document.createElement('div');
    card.className = 'nb-section-card';
    card.dataset.type = type;

    const defaultIcon = meta.icon || '✦';

    const iconOptions = SECTION_ICONS.map(ic =>
        `<option value="${ic}" ${ic === defaultIcon ? 'selected' : ''}>${ic}</option>`
    ).join('');

    card.innerHTML = `
        <div class="nb-section-header">
            <select class="nb-section-icon-select" title="Section icon">${iconOptions}</select>
            <input type="text" class="nb-section-title-input" value="${escapeAttr(title)}" placeholder="Section title…">
            <button class="nb-section-delete-btn" title="Remove section">✕</button>
        </div>
        <ul class="nb-items-list"></ul>
        <button class="nb-add-item-btn">${ADD_ITEM_LABEL[type] || '+ Add item'}</button>
    `;

    card.querySelector('.nb-section-delete-btn').addEventListener('click', () => {
        if (type === 'image') {
            card.querySelectorAll('.nb-image-item').forEach(li => {
                const src = li.dataset.src;
                if (src && src.startsWith('idb:')) ImageStore.deleteImage(src.slice(4)).catch(() => {});
            });
        }
        card.remove();
    });

    const itemsList = card.querySelector('.nb-items-list');
    const addBtn = card.querySelector('.nb-add-item-btn');

    addBtn.addEventListener('click', () => {
        if (type === 'mcq')       addMCQItem(itemsList, null);
        else if (type === 'qa')    addQAItem(itemsList, null);
        else if (type === 'image') addImageItem(itemsList, null);
        else if (type === 'code')  addCodeItem(itemsList, null);
        else if (type === 'diff')  addDiffItem(itemsList, null);
        else                       addItem(itemsList, '');
    });

    const sectionsArea = topicEl.querySelector('.topic-sections-area');
    sectionsArea.appendChild(card);

    if (type === 'mcq') {
        if (items && items.length > 0) items.forEach(q => addMCQItem(itemsList, q));
        else addMCQItem(itemsList, null);
    } else if (type === 'qa') {
        if (items && items.length > 0) items.forEach(q => addQAItem(itemsList, q));
        else addQAItem(itemsList, null);
    } else if (type === 'image') {
        if (items && items.length > 0) items.forEach(im => addImageItem(itemsList, im));
        else addImageItem(itemsList, null);
    } else if (type === 'code') {
        if (items && items.length > 0) items.forEach(c => addCodeItem(itemsList, c));
        else addCodeItem(itemsList, null);
    } else if (type === 'diff') {
        if (items && items.length > 0) items.forEach(t => addDiffItem(itemsList, t));
        else addDiffItem(itemsList, null);
    } else {
        if (items && items.length > 0) items.forEach(text => addItem(itemsList, text));
        else addItem(itemsList, '');
    }
}

// --- Q&A item editor ---
// data shape: { question: string, answer: string }
function addQAItem(list, data) {
    data = data || { question: '', answer: '' };
    const li = document.createElement('li');
    li.className = 'nb-item-row nb-qa-item';

    li.innerHTML = `
        <div class="nb-qa-card">
            <div class="nb-qa-field">
                <span class="nb-qa-field-label">Q</span>
                <textarea class="nb-qa-question-input" rows="1" placeholder="Write the question…">${escapeHtml(data.question)}</textarea>
            </div>
            <div class="nb-qa-field nb-qa-field--answer">
                <span class="nb-qa-field-label nb-qa-field-label--answer">A</span>
                <textarea class="nb-qa-answer-input" rows="1" placeholder="Write the answer…">${escapeHtml(data.answer)}</textarea>
            </div>
            <div class="nb-qa-controls">
                <button class="nb-item-remove-btn" title="Remove question">✕ Remove question</button>
            </div>
        </div>
    `;

    const autosize = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    const questionTa = li.querySelector('.nb-qa-question-input');
    const answerTa   = li.querySelector('.nb-qa-answer-input');
    [questionTa, answerTa].forEach(ta => {
        ta.addEventListener('input', () => autosize(ta));
        setTimeout(() => autosize(ta), 0);
    });

    li.querySelector('.nb-item-remove-btn').addEventListener('click', () => li.remove());

    list.appendChild(li);
    questionTa.focus();
}

// --- MCQ item editor ---
// data shape: { question: string, options: string[], correctIndices: number[] }
// (older saved notes may have a single `correctIndex` instead of an array —
// that's normalized to a one-item array below, so old notes still load fine)
function addMCQItem(list, data) {
    data = data || { question: '', options: ['', ''], correctIndices: [0] };
    const correctIndices = Array.isArray(data.correctIndices)
        ? data.correctIndices
        : (typeof data.correctIndex === 'number' ? [data.correctIndex] : [0]);
    const isMulti = correctIndices.length > 1;

    const li = document.createElement('li');
    li.className = 'nb-item-row nb-mcq-item';
    li.dataset.multi = isMulti ? 'true' : 'false';

    // Generated ONCE per question, not per option — every option row must
    // share this exact name so the browser treats them as one exclusive
    // radio group in single-answer mode. (In multi-answer/checkbox mode the
    // shared name is harmless — checkboxes don't group by name.)
    const groupName = `mcq-correct-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;

    const optionsHtml = data.options.map((opt, i) => `
        <div class="nb-mcq-option-row">
            <input type="${isMulti ? 'checkbox' : 'radio'}" class="nb-mcq-correct-input" name="${groupName}" ${correctIndices.includes(i) ? 'checked' : ''} title="Mark as correct answer">
            <input type="text" class="nb-mcq-option-input" placeholder="Option…" value="${escapeAttr(opt)}">
            <button class="nb-mcq-remove-option-btn" title="Remove option">✕</button>
        </div>
    `).join('');

    li.innerHTML = `
        <div class="nb-mcq-card">
            <textarea class="nb-mcq-question-input" rows="1" placeholder="Write the question…">${escapeHtml(data.question)}</textarea>
            <div class="nb-mcq-options-list">${optionsHtml}</div>
            <div class="nb-mcq-controls">
                <label class="nb-mcq-multi-toggle">
                    <input type="checkbox" class="nb-mcq-multi-checkbox" ${isMulti ? 'checked' : ''}>
                    Multiple correct answers
                </label>
                <div class="nb-mcq-controls-right">
                    <button class="nb-mcq-add-option-btn">+ Add option</button>
                    <button class="nb-item-remove-btn" title="Remove question">✕ Remove question</button>
                </div>
            </div>
        </div>
    `;

    const questionTa = li.querySelector('.nb-mcq-question-input');
    const autosize = ta => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    questionTa.addEventListener('input', () => autosize(questionTa));
    setTimeout(() => autosize(questionTa), 0);

    function wireOptionRow(row) {
        row.querySelector('.nb-mcq-remove-option-btn').addEventListener('click', () => {
            const optionsList = li.querySelector('.nb-mcq-options-list');
            if (optionsList.children.length <= 2) { alert('MCQs need at least 2 options.'); return; }
            row.remove();
        });
    }
    li.querySelectorAll('.nb-mcq-option-row').forEach(wireOptionRow);

    li.querySelector('.nb-mcq-add-option-btn').addEventListener('click', () => {
        const optionsList = li.querySelector('.nb-mcq-options-list');
        const row = document.createElement('div');
        row.className = 'nb-mcq-option-row';
        row.innerHTML = `
            <input type="${li.dataset.multi === 'true' ? 'checkbox' : 'radio'}" class="nb-mcq-correct-input" name="${groupName}" title="Mark as correct answer">
            <input type="text" class="nb-mcq-option-input" placeholder="Option…">
            <button class="nb-mcq-remove-option-btn" title="Remove option">✕</button>
        `;
        wireOptionRow(row);
        optionsList.appendChild(row);
        row.querySelector('.nb-mcq-option-input').focus();
    });

    // Toggle between "only one correct answer" (radio — picking a new one
    // automatically clears the previous pick) and "multiple correct answers"
    // (checkboxes — any number can be checked at once).
    li.querySelector('.nb-mcq-multi-checkbox').addEventListener('change', e => {
        const goingMulti = e.target.checked;
        li.dataset.multi = goingMulti ? 'true' : 'false';
        const inputs = Array.from(li.querySelectorAll('.nb-mcq-correct-input'));
        if (goingMulti) {
            inputs.forEach(inp => { inp.type = 'checkbox'; });
        } else {
            // Switching back to single-answer: keep only the first
            // currently-checked option, uncheck the rest so it stays valid.
            const keepIndex = inputs.findIndex(inp => inp.checked);
            inputs.forEach(inp => { inp.type = 'radio'; inp.checked = false; });
            inputs[keepIndex >= 0 ? keepIndex : 0].checked = true;
        }
    });

    li.querySelector('.nb-item-remove-btn').addEventListener('click', () => li.remove());
    list.appendChild(li);
}

// --- Image item editor ---
// data shape: { src: string (idb:<key> or URL), caption: string }
function addImageItem(list, data) {
    data = data || { src: '', caption: '' };
    const li = document.createElement('li');
    li.className = 'nb-item-row nb-image-item';
    li.dataset.src = data.src || '';

    li.innerHTML = `
        <div class="nb-image-card">
            <div class="nb-image-preview-wrap">
                <img class="nb-image-preview" alt="">
                <span class="nb-image-preview-empty">no image yet</span>
            </div>
            <div class="nb-image-controls">
                <label class="nb-image-upload-btn">
                    Upload
                    <input type="file" accept="image/*" class="nb-image-file-input" hidden>
                </label>
                <input type="text" class="nb-image-url-input" placeholder="…or paste an image URL">
                <input type="text" class="nb-image-caption-input" placeholder="Caption (optional)" value="${escapeAttr(data.caption || '')}">
                <button class="nb-item-remove-btn" title="Remove image">✕</button>
            </div>
        </div>
    `;

    const previewImg = li.querySelector('.nb-image-preview');
    const previewEmpty = li.querySelector('.nb-image-preview-empty');
    const urlInput = li.querySelector('.nb-image-url-input');
    const fileInput = li.querySelector('.nb-image-file-input');

    async function refreshPreview() {
        const src = li.dataset.src;
        if (!src) { previewImg.style.display = 'none'; previewEmpty.style.display = ''; return; }
        previewEmpty.style.display = 'none';
        previewImg.style.display = '';
        await ImageStore.renderInto(previewImg, src);
    }

    if (data.src && !data.src.startsWith('idb:')) urlInput.value = data.src;
    refreshPreview();

    urlInput.addEventListener('input', () => {
        li.dataset.src = urlInput.value.trim();
        refreshPreview();
    });

    fileInput.addEventListener('change', async () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        previewEmpty.textContent = 'compressing…';
        previewEmpty.style.display = '';
        previewImg.style.display = 'none';
        try {
            const blob = await ImageStore.compressImageFile(file);
            const key = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            await ImageStore.putImage(key, blob);
            li.dataset.src = `idb:${key}`;
            urlInput.value = '';
            await refreshPreview();
        } catch (err) {
            alert('Could not process that image. Try a different file.');
            previewEmpty.textContent = 'no image yet';
        }
    });

    li.querySelector('.nb-item-remove-btn').addEventListener('click', async () => {
        const src = li.dataset.src;
        if (src && src.startsWith('idb:')) {
            try { await ImageStore.deleteImage(src.slice(4)); } catch { /* ignore */ }
        }
        li.remove();
    });

    list.appendChild(li);
}

// --- Code snippet item editor ---
// data shape: { code: string, language: string }
function addCodeItem(list, data) {
    data = data || { code: '', language: '' };
    const li = document.createElement('li');
    li.className = 'nb-item-row nb-code-item';
    li.innerHTML = `
        <div class="nb-code-card">
            <div class="nb-code-header">
                <input type="text" class="nb-code-lang-input" placeholder="Language (e.g. python, java)…" value="${escapeAttr(data.language || '')}">
                <button class="nb-item-remove-btn" title="Remove snippet">✕</button>
            </div>
            <textarea class="nb-code-input" rows="4" spellcheck="false" placeholder="Paste or write code here…">${escapeHtml(data.code || '')}</textarea>
        </div>
    `;
    const ta = li.querySelector('.nb-code-input');
    const autosize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
    ta.addEventListener('input', autosize);
    setTimeout(autosize, 0);

    li.querySelector('.nb-item-remove-btn').addEventListener('click', () => li.remove());
    list.appendChild(li);
}

// --- Difference Between item editor ---
// data shape: { columns: string[], rows: [{ label: string, values: string[] }] }
// Freely-sized table: any number of columns, any number of rows, and any row's
// label can be left blank (mixed labeled/unlabeled rows in the same table).
function addDiffItem(list, data) {
    const model = data ? JSON.parse(JSON.stringify(data)) : {
        columns: ['', ''],
        rows: [{ label: '', values: ['', ''] }]
    };
    if (model.showLabelCol === undefined) model.showLabelCol = true;

    const li = document.createElement('li');
    li.className = 'nb-item-row nb-diff-item';
    li._diffModel = model;
    list.appendChild(li);

    function render() {
        const labelHeaderCell = model.showLabelCol
            ? `<th class="nb-diff-label-header">
                   <div class="nb-diff-cell-flex">
                       <span>Point of comparison</span>
                       <button class="nb-diff-remove-labelcol-btn" title="Remove this column">✕</button>
                   </div>
               </th>`
            : '';

        const colHeaders = model.columns.map((c, ci) => `
            <th>
                <div class="nb-diff-cell-flex">
                    <input type="text" class="nb-diff-col-input" data-ci="${ci}" placeholder="Item ${ci + 1}" value="${escapeAttr(c)}">
                    <button class="nb-diff-remove-col-btn" data-ci="${ci}" title="Remove column">✕</button>
                </div>
            </th>
        `).join('');

        const bodyRows = model.rows.map((r, ri) => {
            const labelCell = model.showLabelCol
                ? `<td><input type="text" class="nb-diff-label-input" data-ri="${ri}" placeholder="(optional) point of comparison…" value="${escapeAttr(r.label)}"></td>`
                : '';
            return `
                <tr>
                    ${labelCell}
                    ${r.values.map((v, ci) => `<td><input type="text" class="nb-diff-value-input" data-ri="${ri}" data-ci="${ci}" value="${escapeAttr(v)}"></td>`).join('')}
                    <td class="nb-diff-row-actions"><button class="nb-diff-remove-row-btn" data-ri="${ri}" title="Remove row">✕</button></td>
                </tr>
            `;
        }).join('');

        const labelToggleBtn = model.showLabelCol
            ? ''
            : `<button class="nb-diff-add-labelcol-btn" title="Add a 'point of comparison' column">+ Label column</button>`;

        li.innerHTML = `
            <div class="nb-diff-card">
                <div class="nb-diff-table-scroll">
                    <table class="nb-diff-table">
                        <thead>
                            <tr>
                                ${labelHeaderCell}
                                ${colHeaders}
                                <th class="nb-diff-add-col-cell"><button class="nb-diff-add-col-btn" title="Add column">+ Col</button></th>
                            </tr>
                        </thead>
                        <tbody>${bodyRows}</tbody>
                    </table>
                </div>
                <div class="nb-diff-controls">
                    <div class="nb-diff-controls-left">
                        <button class="nb-diff-add-row-btn">+ Add row</button>
                        ${labelToggleBtn}
                    </div>
                    <button class="nb-item-remove-btn" title="Remove table">✕ Remove table</button>
                </div>
            </div>
        `;

        if (model.showLabelCol) {
            li.querySelector('.nb-diff-remove-labelcol-btn').addEventListener('click', () => {
                model.showLabelCol = false;
                model.rows.forEach(r => { r.label = ''; });
                render();
            });
            li.querySelectorAll('.nb-diff-label-input').forEach(inp => {
                inp.addEventListener('input', () => { model.rows[+inp.dataset.ri].label = inp.value; });
            });
        } else {
            li.querySelector('.nb-diff-add-labelcol-btn').addEventListener('click', () => {
                model.showLabelCol = true;
                render();
            });
        }

        li.querySelectorAll('.nb-diff-col-input').forEach(inp => {
            inp.addEventListener('input', () => { model.columns[+inp.dataset.ci] = inp.value; });
        });
        li.querySelectorAll('.nb-diff-value-input').forEach(inp => {
            inp.addEventListener('input', () => { model.rows[+inp.dataset.ri].values[+inp.dataset.ci] = inp.value; });
        });

        li.querySelectorAll('.nb-diff-remove-col-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (model.columns.length <= 1) { alert('Keep at least 1 column.'); return; }
                const ci = +btn.dataset.ci;
                model.columns.splice(ci, 1);
                model.rows.forEach(r => r.values.splice(ci, 1));
                render();
            });
        });
        li.querySelectorAll('.nb-diff-remove-row-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (model.rows.length <= 1) { alert('Keep at least 1 row.'); return; }
                model.rows.splice(+btn.dataset.ri, 1);
                render();
            });
        });
        li.querySelector('.nb-diff-add-col-btn').addEventListener('click', () => {
            model.columns.push('');
            model.rows.forEach(r => r.values.push(''));
            render();
        });
        li.querySelector('.nb-diff-add-row-btn').addEventListener('click', () => {
            model.rows.push({ label: '', values: model.columns.map(() => '') });
            render();
        });
        li.querySelector('.nb-item-remove-btn').addEventListener('click', () => li.remove());
    }

    render();
}

function addItem(list, value) {
    const li = document.createElement('li');
    li.className = 'nb-item-row';
    li.innerHTML = `
        <span class="nb-item-bullet">•</span>
        <textarea class="nb-item-input" rows="1" placeholder="Write here…">${escapeHtml(value)}</textarea>
        <button class="nb-item-remove-btn" title="Remove">✕</button>
    `;

    const textarea = li.querySelector('.nb-item-input');
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    });
    setTimeout(() => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }, 0);

    li.querySelector('.nb-item-remove-btn').addEventListener('click', () => li.remove());
    list.appendChild(li);
    textarea.focus();
}

function addTopic(topicTitle, sections) {
    const container = document.getElementById('nb-topics-container');

    const topicEl = document.createElement('div');
    topicEl.className = 'topic-block';

    topicEl.innerHTML = `
        <div class="topic-block-header">
            <span class="topic-pin-label">📌</span>
            <input type="text" class="topic-title-input" placeholder="Topic title e.g. Constructors…" value="${escapeAttr(topicTitle || '')}">
            <button class="topic-delete-btn" title="Remove topic">×</button>
        </div>
        <div class="topic-sections-area"></div>
        <div class="nb-section-add-bar topic-section-add-bar">
            <button class="nb-section-type-btn" data-type="fun-facts">✦ Fun Facts</button>
            <button class="nb-section-type-btn" data-type="must-know">⚠ Must Know</button>
            <button class="nb-section-type-btn" data-type="traps">⚡ Traps</button>
            <button class="nb-section-type-btn" data-type="qa">◎ Q&amp;A</button>
            <button class="nb-section-type-btn" data-type="custom">✎ Custom</button>
            <button class="nb-section-type-btn" data-type="mcq">☑ MCQs</button>
            <button class="nb-section-type-btn" data-type="image">🖼 Diagram</button>
            <button class="nb-section-type-btn" data-type="code">&lt;/&gt; Code</button>
            <button class="nb-section-type-btn" data-type="diff">⇄ Difference</button>
        </div>
    `;

    topicEl.querySelector('.topic-delete-btn').addEventListener('click', () => {
        topicEl.querySelectorAll('.nb-image-item').forEach(li => {
            const src = li.dataset.src;
            if (src && src.startsWith('idb:')) ImageStore.deleteImage(src.slice(4)).catch(() => {});
        });
        topicEl.remove();
    });

    topicEl.querySelectorAll('.nb-section-type-btn').forEach(btn => {
        btn.addEventListener('click', () => createSectionCard(topicEl, btn.dataset.type, undefined, null));
    });

    container.appendChild(topicEl);

    if (sections && sections.length > 0) {
        sections.forEach(s => createSectionCard(topicEl, s.type, s.title, s.items));
    }

    return topicEl;
}

document.getElementById('nb-add-topic-btn')?.addEventListener('click', () => {
    addTopic('', []);
    // scroll to new topic
    const container = document.getElementById('nb-topics-container');
    container.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

// --- openNoteBuilder ---

function openNoteBuilder(noteId) {
    editingNoteId = noteId;
    const titleInput = document.getElementById('nb-title');
    const topicsContainer = document.getElementById('nb-topics-container');

    if (noteId) {
        const note = Store.getNote(noteId);
        if (note) {
            selectCharCard(note.character || 'deku');
            titleInput.value = note.title || '';
            subjectInput.value = note.subject;
            chapterInput.value = note.chapter;
            topicsContainer.innerHTML = '';

            // Support old notes (flat sections) and new (topics array)
            if (note.topics && note.topics.length > 0) {
                note.topics.forEach(t => addTopic(t.title, t.sections));
            } else if (note.sections && note.sections.length > 0) {
                // Migrate old flat note: put all sections in one topic
                const topicEl = addTopic('Notes', []);
                note.sections.forEach(s => createSectionCard(topicEl, s.type, s.title, s.items));
            }
        }
    } else {
        selectCharCard('deku');
        titleInput.value = '';
        subjectInput.value = '';
        chapterInput.value = '';
        topicsContainer.innerHTML = '';
        addTopic('', []);
    }

    closeAllDropdowns();
    // Clear any stickers from previous session then reload saved ones
    clearStickers('page-note-builder');
    if (noteId) {
        const existing = Store.getNote(noteId);
        if (existing) loadStickers(existing.stickers, 'page-note-builder');
    }
}

// --- Save note ---

document.getElementById('nb-save-btn')?.addEventListener('click', () => {
    const title   = document.getElementById('nb-title').value.trim();
    const subject = subjectInput.value.trim();
    const chapter = chapterInput.value.trim();

    if (!title)   { alert('Please enter a Note Title.'); return; }
    if (!subject) { alert('Please fill in Subject.'); return; }
    if (!chapter) { alert('Please fill in Chapter.'); return; }

    const topicBlocks = document.querySelectorAll('.topic-block');
    const topics = [];
    topicBlocks.forEach(topicEl => {
        const topicTitle = topicEl.querySelector('.topic-title-input').value.trim();
        const sectionCards = topicEl.querySelectorAll('.nb-section-card');
        const sections = [];
        sectionCards.forEach(card => {
            const type   = card.dataset.type;
            const sTitle = card.querySelector('.nb-section-title-input').value.trim();
            let items;

            if (type === 'mcq') {
                items = Array.from(card.querySelectorAll('.nb-mcq-item')).map(li => {
                    const question = li.querySelector('.nb-mcq-question-input').value.trim();
                    const optionRows = Array.from(li.querySelectorAll('.nb-mcq-option-row'));
                    const options = optionRows.map(r => r.querySelector('.nb-mcq-option-input').value.trim());
                    const correctIndices = optionRows.reduce((acc, r, i) => {
                        if (r.querySelector('.nb-mcq-correct-input').checked) acc.push(i);
                        return acc;
                    }, []);
                    if (correctIndices.length === 0) correctIndices.push(0);
                    return { question, options, correctIndices };
                }).filter(q => q.question.length > 0 && q.options.some(o => o.length > 0));
            } else if (type === 'qa') {
                items = Array.from(card.querySelectorAll('.nb-qa-item')).map(li => ({
                    question: li.querySelector('.nb-qa-question-input').value.trim(),
                    answer: li.querySelector('.nb-qa-answer-input').value.trim()
                })).filter(q => q.question.length > 0 || q.answer.length > 0);
            } else if (type === 'image') {
                items = Array.from(card.querySelectorAll('.nb-image-item')).map(li => ({
                    src: (li.dataset.src || '').trim(),
                    caption: li.querySelector('.nb-image-caption-input').value.trim()
                })).filter(im => im.src.length > 0);
            } else if (type === 'code') {
                items = Array.from(card.querySelectorAll('.nb-code-item')).map(li => ({
                    code: li.querySelector('.nb-code-input').value,
                    language: li.querySelector('.nb-code-lang-input').value.trim()
                })).filter(c => c.code.trim().length > 0);
            } else if (type === 'diff') {
                items = Array.from(card.querySelectorAll('.nb-diff-item'))
                    .map(li => li._diffModel)
                    .filter(t => t && t.columns && t.columns.length > 0
                                 && t.rows.some(r => r.label.trim().length > 0 || r.values.some(v => v.trim().length > 0)));
            } else {
                items = Array.from(card.querySelectorAll('.nb-item-input'))
                             .map(ta => ta.value.trim())
                             .filter(v => v.length > 0);
            }

            sections.push({ type, title: sTitle, items });
        });
        if (topicTitle || sections.length > 0) {
            topics.push({ title: topicTitle, sections });
        }
    });

    if (topics.length === 0) { alert('Add at least one topic with sections.'); return; }

    const id = editingNoteId || `note_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const note = {
        id,
        character: selectedCharacter,
        subject,
        chapter,
        title,
        topics,
        stickers: collectStickers('page-note-builder'),
        createdAt: editingNoteId ? (Store.getNote(id)?.createdAt || Date.now()) : Date.now()
    };

    Store.saveNote(note);
    Store.addNoteToIndex(note);

    renderShelfSubjectBooks();

    openNoteView(id);
    showPage('note-view');
});


// ============================================================
// MY NOTES — Subject cards
// ============================================================

function renderMyNotes() {
    const grid = document.getElementById('mn-subjects-grid');
    grid.innerHTML = '';
    const subjects = Store.getSubjects();

    if (subjects.length === 0) {
        grid.innerHTML = '<div class="mn-empty">No notes yet… click Note Builder to begin ✦</div>';
        return;
    }

    const bookEmojis = ['📘','📗','📙','📕','📓','📔','📒','📚'];

    subjects.forEach((subject, i) => {
        const chapters = Store.getChapters(subject);
        const totalNotes = chapters.reduce((sum, ch) => sum + Store.getNoteIds(subject, ch).length, 0);

        const card = document.createElement('div');
        card.className = 'mn-subject-card';
        card.innerHTML = `
            <span class="mn-subject-icon">${bookEmojis[i % bookEmojis.length]}</span>
            <div class="mn-subject-name">${escapeHtml(subject)}</div>
            <div class="mn-subject-count">${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} · ${totalNotes} note${totalNotes !== 1 ? 's' : ''}</div>
        `;
        card.addEventListener('click', () => openChapterIndex(subject));
        grid.appendChild(card);
    });
}


// ============================================================
// CHAPTER INDEX — Table of contents
// ============================================================

function openChapterIndex(subject) {
    document.getElementById('ch-title').textContent = `📚 ${subject}`;
    const toc = document.getElementById('ch-toc');
    toc.innerHTML = '';

    const chapters = Store.getChapters(subject);
    if (chapters.length === 0) {
        toc.innerHTML = '<div class="nl-empty">No chapters yet.</div>';
    } else {
        chapters.forEach(chapter => {
            const ids = Store.getNoteIds(subject, chapter);
            const row = document.createElement('div');
            row.className = 'ch-toc-row';
            row.innerHTML = `
                <span class="ch-toc-chapter">${escapeHtml(chapter)}</span>
                <span class="ch-toc-dots"></span>
                <span class="ch-toc-count">${ids.length} note${ids.length !== 1 ? 's' : ''}</span>
            `;
            row.addEventListener('click', () => openNoteList(subject, chapter));
            toc.appendChild(row);
        });
    }

    showPage('chapters');
}


// ============================================================
// NOTE LIST — Notes in a chapter
// ============================================================

function openNoteList(subject, chapter) {
    document.getElementById('nl-title').textContent = `${subject} — ${chapter}`;
    const list = document.getElementById('nl-list');
    list.innerHTML = '';

    const ids = Store.getNoteIds(subject, chapter);
    if (ids.length === 0) {
        list.innerHTML = '<div class="nl-empty">No notes in this chapter yet.</div>';
    } else {
        ids.forEach(id => {
            const note = Store.getNote(id);
            if (!note) return;
            const date = new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });

            const row = document.createElement('div');
            row.className = 'nl-note-row';
            row.innerHTML = `
                <span class="nl-note-pin">📌</span>
                <span class="nl-note-title">${escapeHtml(note.title || '(untitled)')}</span>
                <span class="nl-note-date">${date}</span>
            `;
            row.addEventListener('click', () => {
                openNoteView(id);
                showPage('note-view');
            });
            list.appendChild(row);
        });
    }

    showPage('note-list');
}


// ============================================================
// NOTE VIEW
// ============================================================

let viewingNoteId = null;
let viewingFromArchive = false;

const SECTION_VIEW_ICONS = {
    'fun-facts': '✦',
    'must-know': '⚠',
    'traps':     '◈',
    'qa':        '◎',
    'custom':    '◇',
    'mcq':       '☑',
    'image':     '🖼',
    'code':      '</>',
    'diff':      '⇄',
};

// Per-note-view state: whether MCQs show answers immediately or hide until clicked
let quizMode = false;

// FAB emoji map — defined here so applyNoteViewTheme can call updateFabEmoji
const charFabEmoji = { deku: '💚', katsuki: '💥', shoto: '🧸' };
function updateFabEmoji(char) {
    const btn = document.getElementById('nv-fab-btn');
    if (btn) btn.textContent = charFabEmoji[char] || '💚';
}

function applyNoteViewTheme(char) {
    const notebook = document.querySelector('#page-note-view .nb-notebook');
    if (!notebook) return;
    notebook.classList.remove('nb-notebook--deku-view', 'nb-notebook--katsuki-view', 'nb-notebook--shoto-view');
    notebook.classList.add(`nb-notebook--${char}-view`);

    // Update FAB emoji to match character
    updateFabEmoji(char);

    // Dynamic print style
    let ps = document.getElementById('dynamic-print-style');
    if (!ps) {
        ps = document.createElement('style');
        ps.id = 'dynamic-print-style';
        document.head.appendChild(ps);
    }

    const configs = {
        deku:    { bg: '#fdf8ee', line: 'rgba(90,140,100,0.4)' },
        katsuki: { bg: '#2a2520', line: 'rgba(224,104,32,0.35)' },
        shoto:   null,
    };

    if (char === 'shoto') {
        ps.textContent = `@media print {
  html, body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background:
      repeating-linear-gradient(180deg,
        transparent, transparent 14px,
        rgba(74,144,200,0.3) 14px, rgba(74,144,200,0.3) 15px,
        transparent 15px, transparent 29px,
        rgba(200,100,60,0.3) 29px, rgba(200,100,60,0.3) 30px),
      #f8fbff !important;
    background-size: 100% 30px !important;
    background-attachment: local !important;
  }
  #page-note-view .nb-notebook { background: transparent !important; }
}`;
    } else {
        const cfg = configs[char] || configs.deku;
        ps.textContent = `@media print {
  html, body {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    background:
      repeating-linear-gradient(180deg,
        transparent, transparent 29px,
        ${cfg.line} 29px, ${cfg.line} 30px),
      ${cfg.bg} !important;
    background-size: 100% 30px !important;
    background-attachment: local !important;
  }
  #page-note-view .nb-notebook { background: transparent !important; }
}`;
    }
}

// Builds one .nv-topic-section element for Note View, dispatching to
// type-specific renderers (mcq / image / code) or the default bullet list.
function buildNvSectionEl(section) {
    const icon = SECTION_VIEW_ICONS[section.type] || '◇';
    const sec = document.createElement('div');
    sec.className = 'nv-topic-section';
    sec.innerHTML = `
        <div class="nv-topic-header">
            <span class="nv-topic-pin nv-section-pin">${icon}</span>
            <span class="nv-topic-title">${escapeHtml(section.title || '—')}</span>
        </div>
        <hr class="nv-topic-rule">
    `;
    const items = section.items || [];

    if (section.type === 'mcq') {
        const wrap = document.createElement('div');
        wrap.className = 'nv-mcq-list';
        if (items.length === 0) wrap.innerHTML = `<div class="nv-empty">No questions yet</div>`;
        items.forEach(q => wrap.appendChild(renderNvMCQItem(q)));
        sec.appendChild(wrap);
    } else if (section.type === 'qa') {
        const wrap = document.createElement('div');
        wrap.className = 'nv-qa-list';
        if (items.length === 0) wrap.innerHTML = `<div class="nv-empty">No questions yet</div>`;
        items.forEach(q => wrap.appendChild(renderNvQAItem(q)));
        sec.appendChild(wrap);
    } else if (section.type === 'image') {
        const wrap = document.createElement('div');
        wrap.className = 'nv-image-list';
        if (items.length === 0) wrap.innerHTML = `<div class="nv-empty">No images yet</div>`;
        items.forEach(im => wrap.appendChild(renderNvImageItem(im)));
        sec.appendChild(wrap);
    } else if (section.type === 'code') {
        const wrap = document.createElement('div');
        wrap.className = 'nv-code-list';
        if (items.length === 0) wrap.innerHTML = `<div class="nv-empty">No snippets yet</div>`;
        items.forEach(c => wrap.appendChild(renderNvCodeItem(c)));
        sec.appendChild(wrap);
    } else if (section.type === 'diff') {
        const wrap = document.createElement('div');
        wrap.className = 'nv-diff-list';
        if (items.length === 0) wrap.innerHTML = `<div class="nv-empty">No comparison tables yet</div>`;
        items.forEach(t => wrap.appendChild(renderNvDiffItem(t)));
        sec.appendChild(wrap);
    } else {
        const ul = document.createElement('ul');
        ul.className = 'nv-section-items';
        if (items.length > 0) {
            items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'nv-section-item';
                li.innerHTML = `<span class="nv-item-bullet">•</span><span>${escapeHtml(item)}</span>`;
                ul.appendChild(li);
            });
        } else {
            const li = document.createElement('li');
            li.className = 'nv-section-item';
            li.innerHTML = `<span class="nv-item-bullet">•</span><span style="opacity:0.35">—</span>`;
            ul.appendChild(li);
        }
        sec.appendChild(ul);
    }
    return sec;
}

function renderNvMCQItem(q) {
    const block = document.createElement('div');
    block.className = 'nv-mcq-block';
    const correctIndices = Array.isArray(q.correctIndices)
        ? q.correctIndices
        : (typeof q.correctIndex === 'number' ? [q.correctIndex] : []);
    const isMulti = correctIndices.length > 1;

    const optionsHtml = (q.options || []).map((opt, i) => `
        <button type="button" class="nv-mcq-option${correctIndices.includes(i) && !quizMode ? ' nv-mcq-option--correct' : ''}" data-index="${i}">
            ${escapeHtml(opt)}
        </button>
    `).join('');
    block.innerHTML = `
        <div class="nv-mcq-question">${escapeHtml(q.question || '')}${isMulti ? ' <span class="nv-mcq-multi-hint">(select all that apply)</span>' : ''}</div>
        <div class="nv-mcq-options">${optionsHtml}</div>
    `;

    if (quizMode && isMulti) {
        // Multi-answer quiz: let the user toggle several picks, then reveal
        // correctness all at once via a "Check answer" button.
        const checkBtn = document.createElement('button');
        checkBtn.type = 'button';
        checkBtn.className = 'nv-mcq-check-btn';
        checkBtn.textContent = 'Check answer';
        block.appendChild(checkBtn);

        const picked = new Set();
        block.querySelectorAll('.nv-mcq-option').forEach((btn, i) => {
            btn.addEventListener('click', () => {
                if (block.classList.contains('nv-mcq-answered')) return;
                btn.classList.toggle('nv-mcq-option--picked');
                if (picked.has(i)) picked.delete(i); else picked.add(i);
            });
        });
        checkBtn.addEventListener('click', () => {
            if (block.classList.contains('nv-mcq-answered')) return;
            block.classList.add('nv-mcq-answered');
            block.querySelectorAll('.nv-mcq-option').forEach((b, i) => {
                b.classList.remove('nv-mcq-option--picked');
                if (correctIndices.includes(i)) b.classList.add('nv-mcq-option--correct');
                else if (picked.has(i)) b.classList.add('nv-mcq-option--wrong');
            });
            checkBtn.remove();
        });
    } else if (quizMode) {
        block.querySelectorAll('.nv-mcq-option').forEach(btn => {
            btn.addEventListener('click', () => {
                if (block.classList.contains('nv-mcq-answered')) return;
                block.classList.add('nv-mcq-answered');
                const chosen = parseInt(btn.dataset.index, 10);
                block.querySelectorAll('.nv-mcq-option').forEach((b, i) => {
                    if (correctIndices.includes(i)) b.classList.add('nv-mcq-option--correct');
                    else if (i === chosen) b.classList.add('nv-mcq-option--wrong');
                });
            }, { once: false });
        });
    }
    return block;
}

function renderNvQAItem(q) {
    const block = document.createElement('div');
    block.className = 'nv-qa-block';
    block.innerHTML = `
        <div class="nv-qa-question">
            <span class="nv-qa-badge nv-qa-badge--q">Q</span>
            <span class="nv-qa-question-text">${escapeHtml(q.question || '')}</span>
        </div>
        <div class="nv-qa-answer-wrap">
            <span class="nv-qa-badge nv-qa-badge--a">A</span>
            <span class="nv-qa-answer-text">${escapeHtml(q.answer || '')}</span>
        </div>
    `;

    const answerWrap = block.querySelector('.nv-qa-answer-wrap');
    if (quizMode) {
        block.classList.add('nv-qa-hidden');
        answerWrap.addEventListener('click', () => block.classList.remove('nv-qa-hidden'), { once: true });
        answerWrap.title = 'Tap to reveal answer';
    }
    return block;
}

function renderNvImageItem(im) {
    const block = document.createElement('div');
    block.className = 'nv-image-block';
    block.innerHTML = `
        <img class="nv-image" alt="${escapeAttr(im.caption || 'diagram')}">
        ${im.caption ? `<div class="nv-image-caption">${escapeHtml(im.caption)}</div>` : ''}
    `;
    const imgEl = block.querySelector('.nv-image');
    ImageStore.renderInto(imgEl, im.src);
    return block;
}

function renderNvCodeItem(c) {
    const block = document.createElement('div');
    block.className = 'nv-code-block';
    block.innerHTML = `
        <div class="nv-code-block-header">
            <span class="nv-code-lang">${escapeHtml(c.language || 'code')}</span>
            <button class="nv-code-copy-btn" type="button">Copy</button>
        </div>
        <pre class="nv-code-pre"><code>${escapeHtml(c.code || '')}</code></pre>
    `;
    block.querySelector('.nv-code-copy-btn').addEventListener('click', () => {
        navigator.clipboard?.writeText(c.code || '').then(() => {
            const btn = block.querySelector('.nv-code-copy-btn');
            const original = btn.textContent;
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = original; }, 1200);
        });
    });
    return block;
}

// Deletes any IndexedDB-stored images (uploaded diagrams) belonging to a note,
// so removing/replacing them doesn't silently leak storage over time.
function cleanupNoteImages(note) {
    const allSections = [
        ...(note.topics || []).flatMap(t => t.sections || []),
        ...(note.sections || [])
    ];
    allSections.forEach(s => {
        if (s.type !== 'image') return;
        (s.items || []).forEach(im => {
            if (im.src && im.src.startsWith('idb:')) {
                ImageStore.deleteImage(im.src.slice(4)).catch(() => {});
            }
        });
    });
}

function renderNvDiffItem(t) {
    const hasAnyLabel = (t.rows || []).some(r => r.label && r.label.trim().length > 0);
    const block = document.createElement('div');
    block.className = 'nv-diff-block';

    const headerCells = (t.columns || []).map(c => `<th>${escapeHtml(c || '—')}</th>`).join('');
    const bodyRows = (t.rows || []).map(r => {
        const labelCell = hasAnyLabel ? `<td class="nv-diff-row-label">${escapeHtml(r.label || '')}</td>` : '';
        const valueCells = (r.values || []).map(v => `<td>${escapeHtml(v || '')}</td>`).join('');
        return `<tr>${labelCell}${valueCells}</tr>`;
    }).join('');

    block.innerHTML = `
        <div class="nv-diff-table-scroll">
            <table class="nv-diff-table">
                <thead><tr>${hasAnyLabel ? '<th class="nv-diff-row-label"></th>' : ''}${headerCells}</tr></thead>
                <tbody>${bodyRows}</tbody>
            </table>
        </div>
    `;
    return block;
}

function openNoteView(id, fromArchive) {
    viewingNoteId = id;
    viewingFromArchive = !!fromArchive;
    const note = Store.getNote(id);
    if (!note) return;

    document.getElementById('nv-pg-title').textContent = note.title || '(untitled)';
    applyNoteViewTheme(note.character || 'deku');

    // Toggle archive/unarchive buttons
    const archiveBtn   = document.getElementById('nv-archive-btn');
    const unarchiveBtn = document.getElementById('nv-unarchive-btn');
    if (archiveBtn)   archiveBtn.style.display   = fromArchive ? 'none' : '';
    if (unarchiveBtn) unarchiveBtn.style.display = fromArchive ? '' : 'none';

    const body = document.getElementById('nv-body');
    body.innerHTML = '';

    // Subject + Chapter tags
    const tagRow = document.createElement('div');
    tagRow.className = 'nv-tag-row';
    tagRow.innerHTML = `
        <span class="nv-tag">${escapeHtml(note.subject)}</span>
        <span class="nv-tag">${escapeHtml(note.chapter)}</span>
    `;

    const isQuizzable = s => (s.type === 'mcq' || s.type === 'qa') && (s.items || []).length > 0;
    const hasMCQ = (note.topics || []).some(t => (t.sections || []).some(isQuizzable))
                || (note.sections || []).some(isQuizzable);
    if (hasMCQ) {
        const toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.className = 'nv-quiz-toggle';
        toggleBtn.textContent = quizMode ? '☑ Quiz Me' : '👁 Show Answers';
        toggleBtn.addEventListener('click', () => {
            quizMode = !quizMode;
            openNoteView(id, fromArchive);
        });
        tagRow.appendChild(toggleBtn);
    }

    body.appendChild(tagRow);

    // Note title
    const titleEl = document.createElement('div');
    titleEl.className = 'nv-note-title';
    titleEl.textContent = note.title || '(untitled)';
    body.appendChild(titleEl);

    // Support both new (topics) and old (sections) format
    const topics = note.topics || [];
    const legacySections = note.sections || [];

    if (topics.length > 0) {
        topics.forEach(topic => {
            // Topic header
            const topicHeader = document.createElement('div');
            topicHeader.className = 'nv-topic-group';

            const headerEl = document.createElement('div');
            headerEl.className = 'nv-topic-header nv-topic-header--main';
            headerEl.innerHTML = `
                <span class="nv-topic-pin">📌</span>
                <span class="nv-topic-title nv-topic-title--main">${escapeHtml(topic.title || '—')}</span>
            `;
            const ruleEl = document.createElement('hr');
            ruleEl.className = 'nv-topic-rule nv-topic-rule--main';

            topicHeader.appendChild(headerEl);
            topicHeader.appendChild(ruleEl);
            body.appendChild(topicHeader);

            // Sections inside topic
            (topic.sections || []).forEach(section => {
                body.appendChild(buildNvSectionEl(section));
            });
        });
    } else {
        // Legacy flat sections
        legacySections.forEach(section => {
            body.appendChild(buildNvSectionEl(section));
        });
    }

    // Load saved stickers for this note
    clearStickers('page-note-view');
    loadStickers(note.stickers, 'page-note-view');
}

// ============================================================
// FAB DROPDOWN — toggle + close on outside click
// ============================================================

const nvFabBtn = document.getElementById('nv-fab-btn');
const nvDropdown = document.getElementById('nv-dropdown');

nvFabBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    nvDropdown.classList.toggle('open');
});

document.addEventListener('click', (e) => {
    if (!document.getElementById('nv-fab-wrap')?.contains(e.target)) {
        nvDropdown?.classList.remove('open');
    }
});

// Close dropdown after any action item is clicked
['nv-edit-btn','nv-delete-btn','nv-archive-btn','nv-unarchive-btn','nv-print-btn','nv-sticker-fab'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => {
        nvDropdown?.classList.remove('open');
    }, true); // capture so it fires before the action listener
});

// Edit
document.getElementById('nv-edit-btn')?.addEventListener('click', () => {
    if (!viewingNoteId) return;
    openNoteBuilder(viewingNoteId);
    showPage('note-builder');
});

// Delete
document.getElementById('nv-delete-btn')?.addEventListener('click', () => {
    if (!viewingNoteId) return;
    if (!confirm('Delete this note? This cannot be undone.')) return;
    const note = Store.getNote(viewingNoteId);
    if (note) {
        cleanupNoteImages(note);
        Store.deleteNote(note);
    }
    renderShelfSubjectBooks();
    renderShelfArchiveBooks();
    viewingNoteId = null;
    goBack();
});

// Archive
document.getElementById('nv-archive-btn')?.addEventListener('click', () => {
    if (!viewingNoteId) return;
    if (!confirm('Archive this note? It will move to the Archive.')) return;
    Store.archiveNote(viewingNoteId);
    renderShelfSubjectBooks();
    renderShelfArchiveBooks();
    viewingNoteId = null;
    goBack();
});

// Unarchive
document.getElementById('nv-unarchive-btn')?.addEventListener('click', () => {
    if (!viewingNoteId) return;
    Store.unarchiveNote(viewingNoteId);
    renderShelfSubjectBooks();
    renderShelfArchiveBooks();
    viewingNoteId = null;
    goBack();
});

// PDF — build a print header then print
document.getElementById('nv-print-btn')?.addEventListener('click', () => {
    const note = Store.getNote(viewingNoteId);
    // Inject print header dynamically
    let ph = document.getElementById('nv-print-header');
    if (!ph) {
        ph = document.createElement('div');
        ph.id = 'nv-print-header';
        ph.className = 'nv-print-header';
        const notebook = document.querySelector('#page-note-view .nb-notebook');
        if (notebook) notebook.prepend(ph);
    }
    if (note) {
        ph.innerHTML = `
            <div class="nv-print-header-band">
                <span class="nv-print-subject">${escapeHtml(note.subject)}</span>
                <span class="nv-print-sep">·</span>
                <span class="nv-print-chapter">${escapeHtml(note.chapter)}</span>
                <span class="nv-print-sep">·</span>
                <span class="nv-print-title">${escapeHtml(note.title || '(untitled)')}</span>
            </div>
        `;
    }

    // Ensure note-view is visible for print even if .hidden is still on the element.
    // The @media print CSS overrides it, but some browsers apply cascade before
    // computing the print layout — explicitly remove it for the duration of print.
    const pageEl = document.getElementById('page-note-view');
    const wasHidden = pageEl && pageEl.classList.contains('hidden');
    if (wasHidden) pageEl.classList.remove('hidden');

    window.print();

    // Restore hidden state after print dialog closes
    if (wasHidden) pageEl.classList.add('hidden');
});


// ============================================================
// STICKER SYSTEM — shared picker, draggable/resizable stickers
// Works in both Note Builder (#page-note-builder) and Note View (#page-note-view)
// ============================================================

let stickerPickerContext = null; // 'builder' | 'view'

const stickerPanel = document.getElementById('sticker-picker-panel');
const nbStickerFab = document.getElementById('nb-sticker-fab');
const nvStickerFab = document.getElementById('nv-sticker-fab');

function openStickerPicker(context) {
    stickerPickerContext = context;
    stickerPanel.classList.add('open');
}

function closeStickerPicker() {
    stickerPanel.classList.remove('open');
}

nbStickerFab?.addEventListener('click', (e) => {
    e.stopPropagation();
    openStickerPicker('builder');
});

nvStickerFab?.addEventListener('click', (e) => {
    e.stopPropagation();
    openStickerPicker('view');
});

document.getElementById('sticker-picker-close')?.addEventListener('click', closeStickerPicker);

document.addEventListener('click', (e) => {
    if (stickerPanel.classList.contains('open') &&
        !stickerPanel.contains(e.target) &&
        e.target !== nbStickerFab &&
        e.target !== nvStickerFab) {
        closeStickerPicker();
    }
});

document.querySelectorAll('.sticker-option').forEach(img => {
    img.addEventListener('click', () => {
        const char = img.dataset.char;
        const container = stickerPickerContext === 'builder'
            ? document.getElementById('page-note-builder')
            : document.getElementById('page-note-view');
        if (!container) return;
        placeDraggableSticker(char, container, { x: 60, y: 60 }, 120);
        closeStickerPicker();
    });
});

function placeDraggableSticker(char, container, pos, size, id) {
    const stickerId = id || `stk_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;

    const wrapper = document.createElement('div');
    wrapper.className = 'placed-sticker';
    wrapper.dataset.stickerId = stickerId;
    wrapper.dataset.char = char;
    wrapper.style.left  = pos.x + 'px';
    wrapper.style.top   = pos.y + 'px';
    wrapper.style.width = size + 'px';

    const img = document.createElement('img');
    img.src = `stickers/${char}.png`;
    img.alt = char;
    img.draggable = false;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'placed-sticker-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove sticker';
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        wrapper.remove();
    });

    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'placed-sticker-resize';

    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    wrapper.appendChild(resizeHandle);
    container.appendChild(wrapper);

    // — Drag logic —
    let isDragging = false, dragStartX, dragStartY, origLeft, origTop;

    wrapper.addEventListener('mousedown', (e) => {
        if (e.target === resizeHandle || e.target === removeBtn) return;
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        origLeft = parseInt(wrapper.style.left) || 0;
        origTop  = parseInt(wrapper.style.top)  || 0;
        wrapper.style.zIndex = '9999';
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        wrapper.style.left = (origLeft + e.clientX - dragStartX) + 'px';
        wrapper.style.top  = (origTop  + e.clientY - dragStartY) + 'px';
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            wrapper.style.zIndex = '';
        }
    });

    // — Resize logic —
    let isResizing = false, resizeStartX, origWidth;

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        resizeStartX = e.clientX;
        origWidth = parseInt(wrapper.style.width) || 120;
        e.stopPropagation();
        e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const newW = Math.max(40, origWidth + (e.clientX - resizeStartX));
        wrapper.style.width = newW + 'px';
    });

    document.addEventListener('mouseup', () => { isResizing = false; });

    return stickerId;
}

function collectStickers(pageId) {
    const stickers = [];
    document.querySelectorAll(`#${pageId} .placed-sticker`).forEach(el => {
        stickers.push({
            id:   el.dataset.stickerId,
            char: el.dataset.char,
            x:    parseInt(el.style.left) || 0,
            y:    parseInt(el.style.top)  || 0,
            size: parseInt(el.style.width) || 120,
        });
    });
    return stickers;
}

function clearStickers(pageId) {
    document.querySelectorAll(`#${pageId} .placed-sticker`).forEach(el => el.remove());
}

function loadStickers(stickers, pageId) {
    if (!stickers || !stickers.length) return;
    const container = document.getElementById(pageId);
    if (!container) return;
    stickers.forEach(s => placeDraggableSticker(s.char, container, { x: s.x, y: s.y }, s.size, s.id));
}

// ============================================================
// EXPORT / IMPORT JSON
// ============================================================

document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const data = Store.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nikas_notes_backup.json';
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('btn-import-json')?.addEventListener('click', () => {
    document.getElementById('import-file-input').click();
});

document.getElementById('import-file-input')?.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
        try {
            const data = JSON.parse(ev.target.result);
            Store.importAll(data);
            alert('Notes imported successfully ✦');
            e.target.value = '';
        } catch {
            alert('Import failed — invalid JSON file.');
        }
    };
    reader.readAsText(file);
});


// ============================================================
// UTILS
// ============================================================

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
    return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}


// ============================================================
// ARCHIVE PAGE
// ============================================================

function renderArchive() {
    const grid = document.getElementById('arc-subjects-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const subjects = Store.getArchivedSubjects();

    if (subjects.length === 0) {
        grid.innerHTML = '<div class="mn-empty">No archived notes yet ✦</div>';
        return;
    }

    const bookEmojis = ['📘','📗','📙','📕','📓','📔','📒','📚'];
    subjects.forEach((subject, i) => {
        const chapters = Store.getArchivedChapters(subject);
        const totalNotes = chapters.reduce((sum, ch) => sum + Store.getArchivedNoteIds(subject, ch).length, 0);

        const card = document.createElement('div');
        card.className = 'mn-subject-card';
        card.innerHTML = `
            <span class="mn-subject-icon">${bookEmojis[i % bookEmojis.length]}</span>
            <div class="mn-subject-name">${escapeHtml(subject)}</div>
            <div class="mn-subject-count">${chapters.length} chapter${chapters.length !== 1 ? 's' : ''} · ${totalNotes} note${totalNotes !== 1 ? 's' : ''}</div>
        `;
        card.addEventListener('click', () => openArcChapterIndex(subject));
        grid.appendChild(card);
    });
}

function openArcChapterIndex(subject) {
    const titleEl = document.getElementById('arc-ch-title');
    const toc = document.getElementById('arc-ch-toc');
    if (!titleEl || !toc) return;

    titleEl.textContent = `📚 ${subject} (Archive)`;
    toc.innerHTML = '';

    const chapters = Store.getArchivedChapters(subject);
    if (chapters.length === 0) {
        toc.innerHTML = '<div class="nl-empty">No chapters.</div>';
    } else {
        chapters.forEach(chapter => {
            const ids = Store.getArchivedNoteIds(subject, chapter);
            const row = document.createElement('div');
            row.className = 'ch-toc-row';
            row.innerHTML = `
                <span class="ch-toc-chapter">${escapeHtml(chapter)}</span>
                <span class="ch-toc-dots"></span>
                <span class="ch-toc-count">${ids.length} note${ids.length !== 1 ? 's' : ''}</span>
            `;
            row.addEventListener('click', () => openArcNoteList(subject, chapter));
            toc.appendChild(row);
        });
    }

    showPage('arc-chapters');
}

function openArcNoteList(subject, chapter) {
    const titleEl = document.getElementById('arc-nl-title');
    const list = document.getElementById('arc-nl-list');
    if (!titleEl || !list) return;

    titleEl.textContent = `${subject} — ${chapter}`;
    list.innerHTML = '';

    const ids = Store.getArchivedNoteIds(subject, chapter);
    if (ids.length === 0) {
        list.innerHTML = '<div class="nl-empty">No notes here.</div>';
    } else {
        ids.forEach(id => {
            const note = Store.getNote(id);
            if (!note) return;
            const date = new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' });
            const row = document.createElement('div');
            row.className = 'nl-note-row';
            row.innerHTML = `
                <span class="nl-note-pin">📌</span>
                <span class="nl-note-title">${escapeHtml(note.title || '(untitled)')}</span>
                <span class="nl-note-date">${date}</span>
            `;
            row.addEventListener('click', () => {
                openNoteView(id, true);
                showPage('note-view');
            });
            list.appendChild(row);
        });
    }

    showPage('arc-note-list');
}

// Back buttons for archive sub-pages
document.getElementById('arc-back-btn')?.addEventListener('click', goBack);
document.getElementById('arc-ch-back-btn')?.addEventListener('click', goBack);
document.getElementById('arc-nl-back-btn')?.addEventListener('click', goBack);