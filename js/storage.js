// ==== js/storage.js ====
// AgendaKu · Reactive State Store & Persistence
// Responsibility: Vue.reactive state, all CRUD mutations, localStorage I/O,
//                 category management, template management, undo trash

window.AgendaKu = window.AgendaKu || {};

(function (ns) {
  const U = ns.utils;
  const STORAGE_KEY   = 'agendaku_v2';
  const TRASH_MAX_AGE = 30 * 60 * 1000; // 30 minutes session trash

  // ---- Default category list ------------------------------------------------
  const DEFAULT_CATEGORIES = [
    { id: 'cat-edu',     name: 'Kampus & Pendidikan',         colorToken: 'category-3', isDefault: true },
    { id: 'cat-work',    name: 'Pekerjaan & Karier',          colorToken: 'category-1', isDefault: true },
    { id: 'cat-org',     name: 'Organisasi & Komunitas',      colorToken: 'category-2', isDefault: true },
    { id: 'cat-family',  name: 'Keluarga',                    colorToken: 'category-4', isDefault: true },
    { id: 'cat-social',  name: 'Teman & Sosial',              colorToken: 'category-5', isDefault: true },
    { id: 'cat-personal',name: 'Pribadi',                     colorToken: 'category-6', isDefault: true },
    { id: 'cat-health',  name: 'Kesehatan',                   colorToken: 'category-2', isDefault: true },
    { id: 'cat-sport',   name: 'Olahraga & Kebugaran',        colorToken: 'category-5', isDefault: true },
    { id: 'cat-travel',  name: 'Perjalanan',                  colorToken: 'category-7', isDefault: true },
    { id: 'cat-finance', name: 'Keuangan & Administrasi',     colorToken: 'category-8', isDefault: true },
    { id: 'cat-event',   name: 'Hiburan & Acara',             colorToken: 'category-4', isDefault: true },
    { id: 'cat-faith',   name: 'Ibadah & Kegiatan Keagamaan', colorToken: 'category-6', isDefault: true },
    { id: 'cat-other',   name: 'Lainnya',                     colorToken: 'category-8', isDefault: true },
  ];

  const DEFAULT_SETTINGS = {
    theme: 'light',
    density: 'cozy',
    notificationEnabled: false,
    defaultReminder: 60,
    defaultReminders: [{ id: U.uid(), minutes: 60 }],
    categories: DEFAULT_CATEGORIES,
    templates: {},
  };

  // ---- In-memory trash (per session) ----------------------------------------
  const _trash = [];

  // ---- Reactive state --------------------------------------------------------
  const state = Vue.reactive({
    events:   [],
    settings: U.clone(DEFAULT_SETTINGS),
    // UI state (not persisted)
    activeFilter: null,    // date string or null
    searchQuery:  '',
    filterCatId:  null,
    filterStatus: 'all',   // 'all' | 'done' | 'undone'
    filterTags:   [],
    sortMode:     'nearest', // 'nearest' | 'latest' | 'title' | 'category'
    density:      'cozy',
    toast:        null,    // { id, message, type, undoFn }
    toastTimer:   null,
  });

  // ---- Persistence -----------------------------------------------------------
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      events:   state.events,
      settings: state.settings,
    }));
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // First run — seed defaults
      state.settings = U.clone(DEFAULT_SETTINGS);
      state.events   = [];
      applyTheme(state.settings.theme);
      state.density  = state.settings.density;
      return;
    }
    const data = U.safeJSON(raw, null);
    if (!data) return;

    // Migrate: ensure all default categories present
    const cats = Array.isArray(data.settings?.categories)
      ? data.settings.categories
      : [];
    const existingIds = new Set(cats.map(c => c.id));
    DEFAULT_CATEGORIES.forEach(dc => {
      if (!existingIds.has(dc.id)) cats.push(U.clone(dc));
    });

    state.settings = Object.assign(U.clone(DEFAULT_SETTINGS), data.settings || {}, { categories: cats });

    // Ensure defaultReminders array exists
    if (!state.settings.defaultReminders) {
      state.settings.defaultReminders = [{ id: U.uid(), minutes: state.settings.defaultReminder || 60 }];
    }

    // Migrate events: legacy 'category' field → 'categoryId'
    state.events = (data.events || []).map(ev => {
      const e = Object.assign({}, ev);
      if (!e.categoryId && e.category) {
        const match = state.settings.categories.find(c => c.name === e.category);
        e.categoryId = match ? match.id : 'cat-other';
        delete e.category;
      }
      if (!e.categoryId) e.categoryId = 'cat-other';
      if (!Array.isArray(e.tags))     e.tags = [];
      if (!Array.isArray(e.reminders)) {
        e.reminders = [{ id: U.uid(), minutes: e.reminderMinutes || 60, notified: !!e.notified }];
      }
      if (!e.id) e.id = U.uid();
      return e;
    });

    applyTheme(state.settings.theme);
    state.density = state.settings.density;
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  // ---- Toast helper ----------------------------------------------------------
  function showToast(message, type = 'info', undoFn = null, duration = 4000) {
    clearTimeout(state.toastTimer);
    state.toast = { id: U.uid(), message, type, undoFn };
    state.toastTimer = setTimeout(() => { state.toast = null; }, duration);
  }

  // ---- Event CRUD ------------------------------------------------------------
  function addEvent(ev) {
    const e = Object.assign({
      id:          U.uid(),
      title:       '',
      categoryId:  'cat-other',
      tags:        [],
      date:        '',
      startTime:   '',
      endTime:     '',
      location:    '',
      dresscode:   '',
      items:       [],
      notes:       '',
      reminderMinutes: state.settings.defaultReminder,
      reminders:   state.settings.defaultReminders.map(r => ({ ...r, id: U.uid(), notified: false })),
      notified:    false,
      done:        false,
      createdAt:   Date.now(),
      linkUrl:     '',
      contactName: '',
      contactPhone:'',
    }, ev);
    state.events.push(e);
    save();
    return e;
  }

  function updateEvent(id, updates) {
    const idx = state.events.findIndex(e => e.id === id);
    if (idx === -1) return;
    // Reset notification flags if date/time changed
    if (updates.date || updates.startTime) {
      if (Array.isArray(state.events[idx].reminders)) {
        state.events[idx].reminders.forEach(r => r.notified = false);
      }
      state.events[idx].notified = false;
    }
    Object.assign(state.events[idx], updates);
    save();
  }

  function deleteEvent(id, { skipTrash = false } = {}) {
    const idx = state.events.findIndex(e => e.id === id);
    if (idx === -1) return;
    const removed = state.events.splice(idx, 1)[0];
    if (!skipTrash) {
      _trash.push({ event: U.clone(removed), deletedAt: Date.now() });
    }
    save();
    return removed;
  }

  function restoreEvent(id) {
    const tidx = _trash.findIndex(t => t.event.id === id);
    if (tidx === -1) return false;
    const { event } = _trash.splice(tidx, 1)[0];
    state.events.push(event);
    save();
    return true;
  }

  function toggleDone(id) {
    const ev = state.events.find(e => e.id === id);
    if (!ev) return;
    ev.done = !ev.done;
    save();
  }

  function toggleItem(eventId, itemIdx) {
    const ev = state.events.find(e => e.id === eventId);
    if (!ev || !ev.items[itemIdx]) return;
    ev.items[itemIdx].packed = !ev.items[itemIdx].packed;
    save();
  }

  function duplicateEvent(id) {
    const ev = state.events.find(e => e.id === id);
    if (!ev) return null;
    const copy = U.clone(ev);
    copy.id        = U.uid();
    copy.title     = copy.title + ' (Salinan)';
    copy.createdAt = Date.now();
    copy.done      = false;
    copy.notified  = false;
    if (Array.isArray(copy.reminders)) copy.reminders.forEach(r => { r.id = U.uid(); r.notified = false; });
    state.events.push(copy);
    save();
    return copy;
  }

  // ---- Settings --------------------------------------------------------------
  function setSettings(updates) {
    Object.assign(state.settings, updates);
    if (updates.theme !== undefined) applyTheme(updates.theme);
    if (updates.density !== undefined) state.density = updates.density;
    save();
  }

  // ---- Category management ---------------------------------------------------
  function addCategory(cat) {
    const existing = state.settings.categories.find(c =>
      c.name.trim().toLowerCase() === cat.name.trim().toLowerCase()
    );
    if (existing) return { ok: false, error: 'Nama kategori sudah ada.' };
    const newCat = {
      id:         U.uid(),
      name:       cat.name.trim(),
      colorToken: cat.colorToken || 'category-1',
      isDefault:  false,
    };
    state.settings.categories.push(newCat);
    save();
    return { ok: true, cat: newCat };
  }

  function updateCategory(id, updates) {
    const cat = state.settings.categories.find(c => c.id === id);
    if (!cat) return { ok: false, error: 'Kategori tidak ditemukan.' };
    if (updates.name) {
      const dup = state.settings.categories.find(c =>
        c.id !== id && c.name.trim().toLowerCase() === updates.name.trim().toLowerCase()
      );
      if (dup) return { ok: false, error: 'Nama kategori sudah ada.' };
      cat.name = updates.name.trim();
    }
    if (updates.colorToken) cat.colorToken = updates.colorToken;
    save();
    return { ok: true };
  }

  function deleteCategory(id, reassignTo) {
    const cat = state.settings.categories.find(c => c.id === id);
    if (!cat) return { ok: false, error: 'Kategori tidak ditemukan.' };
    if (cat.isDefault) return { ok: false, error: 'Kategori bawaan tidak dapat dihapus.' };
    const usedBy = state.events.filter(e => e.categoryId === id);
    if (usedBy.length > 0 && !reassignTo) {
      return { ok: false, error: `Kategori digunakan oleh ${usedBy.length} agenda. Pilih kategori tujuan.`, usedCount: usedBy.length };
    }
    if (usedBy.length > 0 && reassignTo) {
      usedBy.forEach(e => { e.categoryId = reassignTo; });
    }
    const idx = state.settings.categories.findIndex(c => c.id === id);
    state.settings.categories.splice(idx, 1);
    save();
    return { ok: true };
  }

  // ---- Template management ---------------------------------------------------
  function saveTemplate(name, data) {
    state.settings.templates = state.settings.templates || {};
    state.settings.templates[name] = {
      dresscode: data.dresscode || '',
      items:     (data.items || []).map(i => ({ name: i.name, packed: false, description: i.description || '', quantity: i.quantity || '', itemCategory: i.itemCategory || '' })),
      notes:     data.notes || '',
    };
    save();
  }

  function applyTemplate(templateName, target) {
    const tpl = (state.settings.templates || {})[templateName];
    if (!tpl) return;
    target.dresscode = tpl.dresscode;
    target.items     = tpl.items.map(i => Object.assign({}, i));
    if (tpl.notes) target.notes = tpl.notes;
  }

  function deleteTemplate(name) {
    if (state.settings.templates && state.settings.templates[name]) {
      delete state.settings.templates[name];
      save();
    }
  }

  function getTrash() {
    const cutoff = Date.now() - TRASH_MAX_AGE;
    return _trash.filter(t => t.deletedAt >= cutoff);
  }

  // ---- Public API ------------------------------------------------------------
  ns.store = {
    state,
    save,
    load,
    applyTheme,
    showToast,
    // Events
    addEvent,
    updateEvent,
    deleteEvent,
    restoreEvent,
    toggleDone,
    toggleItem,
    duplicateEvent,
    getTrash,
    // Settings
    setSettings,
    // Categories
    addCategory,
    updateCategory,
    deleteCategory,
    // Templates
    saveTemplate,
    applyTemplate,
    deleteTemplate,
  };

})(window.AgendaKu);
