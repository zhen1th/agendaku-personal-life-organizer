// ==== js/app.js ====
// AgendaKu · Application Bootstrap & Root Component
// Responsibility: createApp, register components, root layout & logic,
//                 search/filter/sort, keyboard shortcuts, toast, sidebar drawer

window.AgendaKu = window.AgendaKu || {};

(function (ns) {
  const U   = ns.utils;
  const St  = ns.store;
  const Rem = ns.reminder;

  // ---- Root component ------------------------------------------------------
  const RootApp = {
    setup() {
      // Load persisted state
      St.load();

      // ---- Modal/panel state ----------------------------------------------
      const showForm      = Vue.ref(false);
      const editId        = Vue.ref(null);
      const detailId      = Vue.ref(null);
      const showSettings  = Vue.ref(false);
      const showSidebar   = Vue.ref(false); // mobile drawer
      const prefillDate   = Vue.ref('');
      const postSaveEvent = Vue.ref(null); // event object shown in post-save modal

      // ---- Computed filters -----------------------------------------------
      const today    = Vue.computed(() => U.todayStr());
      const tomorrow = Vue.computed(() => U.tomorrowStr());

      // All non-done filtered events for search/filter
      const filteredEvents = Vue.computed(() => {
        let list = St.state.events.slice();

        // Date filter from mini-calendar
        if (St.state.activeFilter) {
          list = list.filter(e => e.date === St.state.activeFilter);
        }

        // Search
        const q = (St.state.searchQuery || '').toLowerCase().trim();
        if (q) {
          list = list.filter(e =>
            e.title.toLowerCase().includes(q) ||
            (e.location || '').toLowerCase().includes(q) ||
            (e.dresscode || '').toLowerCase().includes(q) ||
            (e.notes || '').toLowerCase().includes(q) ||
            (e.tags || []).some(t => t.includes(q))
          );
        }

        // Category filter
        if (St.state.filterCatId) {
          list = list.filter(e => e.categoryId === St.state.filterCatId);
        }

        // Tag filter
        if (St.state.filterTags && St.state.filterTags.length > 0) {
          list = list.filter(e =>
            St.state.filterTags.every(t => (e.tags || []).includes(t))
          );
        }

        // Status filter
        if (St.state.filterStatus === 'done') {
          list = list.filter(e => e.done);
        } else if (St.state.filterStatus === 'undone') {
          list = list.filter(e => !e.done);
        }

        // Sort
        const sort = St.state.sortMode;
        if (sort === 'nearest') {
          list.sort((a, b) => {
            const at = U.toDate(a.date, a.startTime).getTime();
            const bt = U.toDate(b.date, b.startTime).getTime();
            return at - bt;
          });
        } else if (sort === 'latest') {
          list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        } else if (sort === 'title') {
          list.sort((a, b) => a.title.localeCompare(b.title, 'id'));
        } else if (sort === 'category') {
          list.sort((a, b) => {
            const ac = (St.state.settings.categories || []).find(c => c.id === a.categoryId)?.name || '';
            const bc = (St.state.settings.categories || []).find(c => c.id === b.categoryId)?.name || '';
            return ac.localeCompare(bc, 'id');
          });
        }

        return list;
      });

      // ---- Grouped sections -----------------------------------------------
      const grouped = Vue.computed(() => {
        const list   = filteredEvents.value;
        const t      = today.value;
        const tmr    = tomorrow.value;
        const groups = {
          today:    list.filter(e => !e.done && e.date === t),
          tomorrow: list.filter(e => !e.done && e.date === tmr),
          upcoming: list.filter(e => !e.done && e.date > tmr),
          done:     list.filter(e => e.done),
        };
        return groups;
      });

      const hasAnyEvent = Vue.computed(() => St.state.events.length > 0);
      const hasFiltered = Vue.computed(() => filteredEvents.value.length > 0);

      // ---- Category chips --------------------------------------------------
      const allCategories = Vue.computed(() => St.state.settings.categories || []);

      function catChipClass(cat) {
        const colors = U.getCatColors(cat.colorToken || 'category-1');
        const isActive = St.state.filterCatId === cat.id;
        return isActive
          ? `${colors.bg} ${colors.text} border border-current`
          : 'bg-surface border border-border text-ink-2 hover:border-border-strong';
      }

      function toggleCatFilter(id) {
        St.state.filterCatId = St.state.filterCatId === id ? null : id;
      }

      // ---- Actions ---------------------------------------------------------
      function openNewForm(date = '') {
        prefillDate.value = date || '';
        editId.value      = null;
        showForm.value    = true;
        showSidebar.value = false;
      }

      function openEdit(id) {
        editId.value   = id;
        detailId.value = null;
        showForm.value = true;
      }

      function openDetail(id) {
        detailId.value = id;
      }

      function closeForm() {
        showForm.value = false;
        editId.value   = null;
        prefillDate.value = '';
      }

      function closeDetail() {
        detailId.value = null;
      }

      function onFormSaved(savedEvent) {
        showForm.value = false;
        editId.value   = null;
        // savedEvent is null for edits; only open post-save modal for new agendas
        if (savedEvent) {
          postSaveEvent.value = savedEvent;
        } else {
          // For edits, show a simple toast (already done in the form for updates)
        }
      }

      function closePostSave() {
        postSaveEvent.value = null;
      }

      // ---- Keyboard shortcuts -----------------------------------------------
      // N → new event (when no modal open)
      U.registerShortcut('n', () => {
        if (!showForm.value && !detailId.value && !showSettings.value) {
          openNewForm();
        }
      });

      // / → focus search
      U.registerShortcut('/', (k, e) => {
        if (!showForm.value && !detailId.value && !showSettings.value) {
          e.preventDefault();
          const el = document.getElementById('global-search');
          if (el) el.focus();
        }
      });

      // Escape → close modals
      U.registerShortcut('escape', () => {
        if (showForm.value)     { /* form handles its own close + dirty check */ return; }
        if (detailId.value)     closeDetail();
        else if (showSettings.value) showSettings.value = false;
        else if (showSidebar.value)  showSidebar.value  = false;
      }, { allowInInput: true });

      // Listen for open-event from notifications
      window.addEventListener('agendaku:open-event', (e) => {
        if (e.detail?.id) openDetail(e.detail.id);
      });

      // ---- Toast -----------------------------------------------------------
      function dismissToast() {
        St.state.toast = null;
        clearTimeout(St.state.toastTimer);
      }

      function undoToast() {
        if (St.state.toast?.undoFn) {
          St.state.toast.undoFn();
        }
        dismissToast();
      }

      // ---- Start scheduler -------------------------------------------------
      Vue.onMounted(() => {
        Rem.startScheduler();
      });

      // ---- Density watch ---------------------------------------------------
      const density = Vue.computed(() => St.state.settings.density || 'cozy');

      return {
        U, St,
        showForm, editId, detailId, showSettings, showSidebar, prefillDate,
        postSaveEvent, closePostSave,
        today, tomorrow, grouped, hasAnyEvent, hasFiltered,
        allCategories, catChipClass, toggleCatFilter,
        openNewForm, openEdit, openDetail, closeForm, closeDetail, onFormSaved,
        density, dismissToast, undoToast,
      };
    },

    template: `
      <div :class="['min-h-screen bg-bg font-body text-ink', density === 'compact' ? 'text-sm' : '']">

        <!-- Toast notification -->
        <Transition name="toast">
          <div v-if="St.state.toast"
            :key="St.state.toast.id"
            class="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border border-border bg-surface text-sm text-ink toast-enter max-w-sm w-full"
            role="alert"
          >
            <span class="flex-1 min-w-0">{{ St.state.toast.message }}</span>
            <button v-if="St.state.toast.undoFn"
              @click="undoToast"
              class="text-accent font-medium hover:underline shrink-0" aria-label="Undo">Pulihkan</button>
            <button @click="dismissToast"
              class="text-ink-3 hover:text-ink shrink-0" aria-label="Tutup notifikasi">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </Transition>

        <!-- Mobile sidebar overlay -->
        <div v-if="showSidebar"
          class="fixed inset-0 z-40 bg-ink/30 lg:hidden"
          @click="showSidebar = false"
          aria-hidden="true"></div>

        <!-- Top navigation bar -->
        <header class="sticky top-0 z-30 bg-surface/90 backdrop-blur-sm border-b border-border">
          <div class="max-w-screen-xl mx-auto px-4 h-14 flex items-center gap-3">
            <!-- Mobile sidebar toggle -->
            <button @click="showSidebar = !showSidebar"
              class="lg:hidden p-2 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
              :aria-label="showSidebar ? 'Tutup sidebar' : 'Buka sidebar'">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <!-- Brand -->
            <span class="font-display text-lg font-medium text-ink">AgendaKu</span>

            <!-- Search bar -->
            <div class="flex-1 max-w-sm mx-auto hidden sm:block">
              <div class="relative">
                <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  id="global-search"
                  v-model="St.state.searchQuery"
                  type="search"
                  placeholder="Cari agenda... (/)"
                  class="w-full bg-surface-2 border border-border rounded-md pl-9 pr-3 py-1.5 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  aria-label="Cari agenda" />
              </div>
            </div>

            <div class="ml-auto flex items-center gap-2">
              <!-- Settings -->
              <button @click="showSettings = true"
                class="p-2 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
                aria-label="Pengaturan">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="3"/>
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
              </button>

              <!-- New agenda button -->
              <button @click="openNewForm()"
                class="flex items-center gap-1.5 px-4 py-2 rounded-md bg-accent text-accent-ink text-sm font-medium hover:bg-accent-hover transition-colors"
                aria-label="Tambah agenda baru (N)">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                </svg>
                <span class="hidden sm:inline">Agenda Baru</span>
              </button>
            </div>
          </div>

          <!-- Mobile search -->
          <div class="sm:hidden px-4 pb-3">
            <div class="relative">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="8"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35"/>
              </svg>
              <input
                v-model="St.state.searchQuery"
                type="search"
                placeholder="Cari agenda..."
                class="w-full bg-surface-2 border border-border rounded-md pl-9 pr-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent"
                aria-label="Cari agenda (mobile)" />
            </div>
          </div>
        </header>

        <!-- Main layout: sidebar + content -->
        <div class="max-w-screen-xl mx-auto px-4 py-5">
          <div class="flex gap-5 items-start">

            <!-- Sidebar — desktop always visible, mobile as drawer -->
            <aside :class="[
              'shrink-0 w-64 space-y-4',
              'fixed inset-y-0 left-0 z-40 bg-bg px-4 py-5 overflow-y-auto transition-transform lg:static lg:transform-none lg:p-0 lg:bg-transparent lg:overflow-visible',
              showSidebar ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'
            ]"
            :aria-hidden="!showSidebar && false">
              <!-- Close on mobile -->
              <div class="flex items-center justify-between mb-4 lg:hidden">
                <span class="font-display text-lg font-medium text-ink">AgendaKu</span>
                <button @click="showSidebar = false" class="p-1.5 text-ink-3 hover:text-ink rounded" aria-label="Tutup sidebar">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <mini-calendar
                @filter-date="(d) => { St.state.activeFilter = d; showSidebar = false; }"
                @new-on-date="(d) => openNewForm(d)" />

              <sidebar-stats />
            </aside>

            <!-- Main content -->
            <main class="flex-1 min-w-0 space-y-4">

              <!-- Filter bar -->
              <div class="bg-surface rounded-lg border border-border px-4 py-3 space-y-3">

                <!-- Category chips (scroll horizontally on mobile) -->
                <div class="flex items-center gap-2 overflow-x-auto hide-scrollbar pb-1">
                  <span class="text-xs font-medium text-ink-3 shrink-0">Kategori:</span>
                  <button
                    @click="St.state.filterCatId = null"
                    :class="[
                      'shrink-0 text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap',
                      !St.state.filterCatId
                        ? 'bg-accent-soft border-accent text-accent'
                        : 'bg-surface border-border text-ink-2 hover:border-border-strong'
                    ]"
                    aria-label="Tampilkan semua kategori">Semua</button>
                  <button
                    v-for="cat in allCategories"
                    :key="cat.id"
                    @click="toggleCatFilter(cat.id)"
                    :class="['shrink-0 text-xs px-3 py-1 rounded-full border transition-colors whitespace-nowrap', catChipClass(cat)]"
                    :aria-pressed="St.state.filterCatId === cat.id"
                    :aria-label="'Filter kategori ' + cat.name"
                  >{{ cat.name }}</button>
                </div>

                <!-- Secondary filters + sort -->
                <div class="flex flex-wrap items-center gap-3 text-xs">
                  <!-- Status filter -->
                  <div class="flex items-center gap-1.5">
                    <span class="text-ink-3 shrink-0">Status:</span>
                    <div class="flex rounded-md border border-border overflow-hidden">
                      <button v-for="s in [{id:'all',label:'Semua'},{id:'undone',label:'Aktif'},{id:'done',label:'Selesai'}]" :key="s.id"
                        @click="St.state.filterStatus = s.id"
                        :class="[
                          'px-2.5 py-1 transition-colors',
                          St.state.filterStatus === s.id
                            ? 'bg-surface-3 text-ink font-medium'
                            : 'text-ink-3 hover:bg-surface-2'
                        ]"
                        :aria-pressed="St.state.filterStatus === s.id"
                      >{{ s.label }}</button>
                    </div>
                  </div>

                  <!-- Sort -->
                  <div class="flex items-center gap-1.5 ml-auto">
                    <span class="text-ink-3 shrink-0">Urut:</span>
                    <select v-model="St.state.sortMode"
                      class="bg-surface-2 border border-border rounded-md px-2 py-1 text-xs text-ink focus:outline-none focus:border-accent"
                      aria-label="Urutan agenda">
                      <option value="nearest">Terdekat</option>
                      <option value="latest">Terbaru</option>
                      <option value="title">Judul A-Z</option>
                      <option value="category">Kategori</option>
                    </select>
                  </div>

                  <!-- Clear all filters -->
                  <button v-if="St.state.filterCatId || St.state.filterStatus !== 'all' || St.state.activeFilter || St.state.searchQuery"
                    @click="St.state.filterCatId = null; St.state.filterStatus = 'all'; St.state.activeFilter = null; St.state.searchQuery = ''; St.state.filterTags = [];"
                    class="text-ink-3 hover:text-accent transition-colors"
                    aria-label="Hapus semua filter">Hapus filter</button>
                </div>
              </div>

              <!-- Active date filter banner -->
              <div v-if="St.state.activeFilter"
                class="flex items-center justify-between bg-accent-soft border border-accent rounded-md px-4 py-2 text-sm">
                <span class="text-accent">Menampilkan: {{ U.formatDateShort(St.state.activeFilter) }}</span>
                <button @click="St.state.activeFilter = null"
                  class="text-xs text-accent hover:underline" aria-label="Hapus filter tanggal">Hapus</button>
              </div>

              <!-- Agenda sections -->

              <!-- TODAY -->
              <section v-if="grouped.today.length > 0">
                <h2 class="font-display text-sm font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Hari Ini</h2>
                <div :class="density === 'compact' ? 'space-y-1.5' : 'space-y-2.5'">
                  <agenda-card
                    v-for="ev in grouped.today"
                    :key="ev.id"
                    :event="ev"
                    :density="density"
                    @open-detail="openDetail" />
                </div>
              </section>

              <!-- TOMORROW -->
              <section v-if="grouped.tomorrow.length > 0">
                <h2 class="font-display text-sm font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Besok</h2>
                <div :class="density === 'compact' ? 'space-y-1.5' : 'space-y-2.5'">
                  <agenda-card
                    v-for="ev in grouped.tomorrow"
                    :key="ev.id"
                    :event="ev"
                    :density="density"
                    @open-detail="openDetail" />
                </div>
              </section>

              <!-- UPCOMING -->
              <section v-if="grouped.upcoming.length > 0">
                <h2 class="font-display text-sm font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Mendatang</h2>
                <div :class="density === 'compact' ? 'space-y-1.5' : 'space-y-2.5'">
                  <agenda-card
                    v-for="ev in grouped.upcoming"
                    :key="ev.id"
                    :event="ev"
                    :density="density"
                    @open-detail="openDetail" />
                </div>
              </section>

              <!-- DONE -->
              <section v-if="grouped.done.length > 0">
                <h2 class="font-display text-sm font-semibold text-ink-3 uppercase tracking-wider mb-2.5">Selesai</h2>
                <div :class="density === 'compact' ? 'space-y-1.5' : 'space-y-2.5'">
                  <agenda-card
                    v-for="ev in grouped.done"
                    :key="ev.id"
                    :event="ev"
                    :density="density"
                    @open-detail="openDetail" />
                </div>
              </section>

              <!-- Empty states -->
              <div v-if="!hasAnyEvent"
                class="bg-surface rounded-lg border border-border px-8 py-14 text-center">
                <div class="w-12 h-12 rounded-lg bg-surface-2 flex items-center justify-center mx-auto mb-4">
                  <svg class="w-6 h-6 text-ink-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                  </svg>
                </div>
                <h3 class="font-display text-lg font-medium text-ink mb-1">Belum ada agenda</h3>
                <p class="text-sm text-ink-3 mb-4">Mulai catat agenda pertamamu — dari rapat kerja hingga janji dokter, semuanya bisa dikelola di sini.</p>
                <button @click="openNewForm()"
                  class="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-accent text-accent-ink text-sm font-medium hover:bg-accent-hover transition-colors"
                  aria-label="Buat agenda pertama">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/>
                  </svg>
                  Buat Agenda Pertama
                </button>
              </div>

              <div v-else-if="!hasFiltered"
                class="bg-surface rounded-lg border border-border px-8 py-10 text-center">
                <h3 class="font-display text-base font-medium text-ink mb-1">Tidak ada hasil</h3>
                <p class="text-sm text-ink-3 mb-3">Tidak ada agenda yang cocok dengan filter atau pencarian saat ini.</p>
                <button @click="St.state.filterCatId = null; St.state.filterStatus = 'all'; St.state.activeFilter = null; St.state.searchQuery = '';"
                  class="text-sm text-accent hover:underline" aria-label="Hapus semua filter">Hapus semua filter</button>
              </div>

            </main>
          </div>
        </div>

        <!-- Modals -->
        <agenda-form
          v-if="showForm"
          :edit-id="editId"
          :prefill-date="prefillDate"
          @close="closeForm"
          @saved="onFormSaved" />

        <agenda-detail
          v-if="detailId"
          :event-id="detailId"
          @close="closeDetail"
          @edit="openEdit" />

        <settings-panel
          v-if="showSettings"
          @close="showSettings = false" />

        <post-save-actions
          v-if="postSaveEvent"
          :event="postSaveEvent"
          @close="closePostSave" />

      </div>
    `,
  };

  // ---- Register components & mount -----------------------------------------
  const app = Vue.createApp(RootApp);

  const comps = ns.components;
  app.component('conflict-warning',  comps.ConflictWarning);
  app.component('agenda-card',       comps.AgendaCard);
  app.component('agenda-form',       comps.AgendaForm);
  app.component('agenda-detail',     comps.AgendaDetail);
  app.component('mini-calendar',     comps.MiniCalendar);
  app.component('sidebar-stats',     comps.SidebarStats);
  app.component('category-manager',  comps.CategoryManager);
  app.component('settings-panel',    comps.SettingsPanel);
  app.component('import-export',     comps.ImportExport);
  app.component('post-save-actions', comps.PostSaveActions);

  app.mount('#app');

})(window.AgendaKu);
