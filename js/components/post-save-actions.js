// ==== js/components/post-save-actions.js ====
// AgendaKu · Post-Save Calendar Actions Modal
// Responsibility: shown immediately after a new agenda is saved; lets the user
//                 download an .ics file or open Google Calendar — without
//                 navigating to the detail view first.

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.PostSaveActions = {
  name: 'post-save-actions',
  props: {
    // The full event object that was just saved (read-only; never mutated here)
    event: { type: Object, required: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const U   = window.AgendaKu.utils;
    const St  = window.AgendaKu.store;
    const Cal = window.AgendaKu.calendar;

    // ---- Derived display values -------------------------------------------

    const category = Vue.computed(() =>
      (St.state.settings.categories || []).find(c => c.id === props.event.categoryId)
    );

    const catColors = Vue.computed(() => {
      const token = category.value?.colorToken || 'category-1';
      return U.getCatColors(token);
    });

    const formattedDate = Vue.computed(() =>
      U.formatDate(props.event.date)
    );

    const timeRange = Vue.computed(() =>
      U.formatTimeRange(props.event.startTime, props.event.endTime)
    );

    // Note shown when endTime is absent (default 1-hour duration used for export)
    const durationNote = Vue.computed(() =>
      !props.event.endTime
        ? 'Jam selesai tidak diisi — durasi 1 jam digunakan untuk data kalender eksternal.'
        : null
    );

    // ---- Action state -----------------------------------------------------
    const icsDownloaded = Vue.ref(false);
    const gcalOpened    = Vue.ref(false);
    const downloadError = Vue.ref('');

    // ---- Actions ---------------------------------------------------------

    /**
     * Download .ics for the just-saved event.
     * Uses Cal.downloadICS which already handles Blob + revokeObjectURL.
     */
    function downloadICS() {
      downloadError.value = '';
      try {
        Cal.downloadICS(props.event);
        icsDownloaded.value = true;
      } catch (err) {
        downloadError.value = 'Gagal mengunduh file. Coba lagi atau gunakan Google Calendar.';
      }
    }

    /**
     * Open Google Calendar in a new tab with the event pre-filled.
     */
    function openGCal() {
      const url = Cal.gcalURL(props.event);
      const win = window.open(url, '_blank', 'noopener,noreferrer');
      if (!win) {
        // Popup blocked — surface a fallback link
        downloadError.value = 'Pop-up diblokir browser. Salin tautan: ' + url;
        return;
      }
      gcalOpened.value = true;
    }

    function close() {
      emit('close');
    }

    return {
      U, category, catColors, formattedDate, timeRange, durationNote,
      icsDownloaded, gcalOpened, downloadError,
      downloadICS, openGCal, close,
    };
  },

  template: `
    <div
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      data-modal-open="true"
      role="dialog"
      aria-modal="true"
      aria-labelledby="psa-title"
      @click.self="close"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-ink/30 backdrop-blur-sm" @click="close" aria-hidden="true"></div>

      <!-- Panel -->
      <div class="relative bg-surface rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-md flex flex-col modal-enter">

        <!-- Header -->
        <div class="px-5 pt-6 pb-4 text-center border-b border-border">
          <!-- Success icon -->
          <div class="w-10 h-10 rounded-full bg-ok-soft flex items-center justify-center mx-auto mb-3">
            <svg class="w-5 h-5 text-ok" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <h2 id="psa-title" class="font-display text-lg font-medium text-ink">Agenda berhasil disimpan!</h2>
          <p class="text-sm text-ink-3 mt-1">Agenda kamu sudah tercatat. Mau sekalian menambahkannya ke kalender?</p>
        </div>

        <!-- Agenda summary -->
        <div class="px-5 py-4 bg-surface-2 border-b border-border">
          <!-- Category badge -->
          <div class="flex items-center gap-2 flex-wrap mb-2">
            <span
              v-if="category"
              :class="['text-xs font-medium px-2 py-0.5 rounded-sm', catColors.bg, catColors.text]"
            >{{ category.name }}</span>
          </div>

          <!-- Title -->
          <p class="font-display text-base font-medium text-ink break-words leading-snug">{{ event.title }}</p>

          <!-- Date + time row -->
          <div class="mt-2 space-y-1 text-sm text-ink-2">
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-ink-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{{ formattedDate }}</span>
            </div>
            <div class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-ink-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span class="font-mono">{{ timeRange }}</span>
            </div>
            <div v-if="event.location" class="flex items-center gap-2">
              <svg class="w-3.5 h-3.5 text-ink-3 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              <span class="truncate">{{ event.location }}</span>
            </div>
          </div>

          <!-- Duration note (only when endTime absent) -->
          <p v-if="durationNote" class="mt-2 text-xs text-ink-4 italic">{{ durationNote }}</p>
        </div>

        <!-- Error / feedback -->
        <div v-if="downloadError"
          class="mx-5 mt-3 px-3 py-2 rounded-md bg-warn-soft text-ink-2 text-xs break-all">
          {{ downloadError }}
        </div>

        <!-- Action buttons -->
        <div class="px-5 pt-4 pb-5 space-y-2.5">

          <!-- Download .ics — primary -->
          <button
            @click="downloadICS"
            :class="[
              'w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-md text-sm font-medium transition-colors',
              icsDownloaded
                ? 'bg-ok-soft text-ok border border-ok'
                : 'bg-accent text-accent-ink hover:bg-accent-hover'
            ]"
            aria-label="Unduh file kalender ICS"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
            </svg>
            <span>{{ icsDownloaded ? 'File kalender diunduh' : 'Unduh Kalender (.ics)' }}</span>
          </button>

          <!-- Google Calendar — secondary -->
          <button
            @click="openGCal"
            :class="[
              'w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-md text-sm font-medium border transition-colors',
              gcalOpened
                ? 'border-ok text-ok bg-ok-soft'
                : 'border-border-strong text-ink-2 hover:border-accent hover:text-accent bg-surface'
            ]"
            aria-label="Buka Google Calendar dengan data agenda ini"
          >
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span>{{ gcalOpened ? 'Google Calendar dibuka' : 'Buka Google Calendar' }}</span>
          </button>

          <!-- Skip / close -->
          <button
            @click="close"
            class="w-full py-2.5 text-sm text-ink-3 hover:text-ink transition-colors"
            aria-label="Lewati dan kembali ke daftar agenda"
          >Nanti</button>

        </div>

      </div>
    </div>
  `,
};
