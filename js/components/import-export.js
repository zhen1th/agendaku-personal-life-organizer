// ==== js/components/import-export.js ====
// AgendaKu · Import / Export Component
// Responsibility: JSON export, JSON import with validation, ICS range export

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.ImportExport = {
  name: 'import-export',
  setup() {
    const U   = window.AgendaKu.utils;
    const St  = window.AgendaKu.store;
    const Cal = window.AgendaKu.calendar;

    const importError   = Vue.ref('');
    const importSuccess = Vue.ref('');
    const icsRange      = Vue.ref('all');  // 'all' | 'today' | 'week' | 'month'
    const importing     = Vue.ref(false);

    // ---- Export JSON --------------------------------------------------------
    function exportJSON() {
      Cal.exportAllAsJSON();
      St.showToast('Data diekspor sebagai JSON.', 'ok');
    }

    // ---- Import JSON --------------------------------------------------------
    function triggerImport() {
      const input = document.createElement('input');
      input.type   = 'file';
      input.accept = '.json,application/json';
      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        importing.value     = true;
        importError.value   = '';
        importSuccess.value = '';
        try {
          const text   = await file.text();
          const parsed = U.safeJSON(text, null);
          if (!parsed) { importError.value = 'File bukan JSON yang valid.'; return; }
          const result = Cal.importFromJSON(parsed);
          if (!result.ok) { importError.value = result.error; return; }
          importSuccess.value = `Import berhasil. ${St.state.events.length} agenda dimuat.`;
          St.showToast('Import berhasil.', 'ok');
        } catch (err) {
          importError.value = 'Gagal membaca file: ' + (err.message || err);
        } finally {
          importing.value = false;
        }
      });
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    }

    // ---- Export ICS range --------------------------------------------------
    function exportICS() {
      const today    = U.todayStr();
      const tomorrow = U.tomorrowStr();
      let events = St.state.events;
      let label  = 'semua';

      if (icsRange.value === 'today') {
        events = events.filter(e => e.date === today);
        label  = 'hari-ini';
      } else if (icsRange.value === 'week') {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        const weekEndStr = `${weekEnd.getFullYear()}-${U.pad(weekEnd.getMonth()+1)}-${U.pad(weekEnd.getDate())}`;
        events = events.filter(e => e.date >= today && e.date <= weekEndStr);
        label  = '7-hari';
      } else if (icsRange.value === 'month') {
        const now = new Date();
        const y   = now.getFullYear();
        const m   = now.getMonth() + 1;
        const prefix = `${y}-${U.pad(m)}`;
        events = events.filter(e => e.date.startsWith(prefix));
        label  = `bulan-${U.pad(m)}`;
      }

      if (events.length === 0) {
        St.showToast('Tidak ada agenda pada rentang yang dipilih.', 'info');
        return;
      }
      Cal.downloadAllICS(events, label);
      St.showToast(`${events.length} agenda diekspor sebagai .ics.`, 'ok');
    }

    return {
      importError, importSuccess, icsRange, importing,
      exportJSON, triggerImport, exportICS,
    };
  },
  template: `
    <div class="space-y-4">
      <!-- Export JSON -->
      <div class="bg-surface-2 rounded-md p-4">
        <p class="text-sm font-medium text-ink mb-1">Ekspor Semua Data (JSON)</p>
        <p class="text-xs text-ink-3 mb-3">Unduh backup lengkap seluruh agenda dan pengaturan.</p>
        <button @click="exportJSON"
          class="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-surface text-ink-2 border border-border hover:border-border-strong hover:text-ink transition-colors"
          aria-label="Ekspor semua data sebagai JSON">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
          </svg>
          Unduh JSON
        </button>
      </div>

      <!-- Import JSON -->
      <div class="bg-surface-2 rounded-md p-4">
        <p class="text-sm font-medium text-ink mb-1">Impor Data (JSON)</p>
        <p class="text-xs text-ink-3 mb-3">Muat data dari file backup. Agenda yang ada akan digabungkan.</p>
        <div v-if="importError"   class="mb-2 text-xs text-urgent bg-urgent-soft px-3 py-2 rounded-md">{{ importError }}</div>
        <div v-if="importSuccess" class="mb-2 text-xs text-ok bg-ok-soft px-3 py-2 rounded-md">{{ importSuccess }}</div>
        <button @click="triggerImport" :disabled="importing"
          class="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-surface text-ink-2 border border-border hover:border-border-strong hover:text-ink transition-colors disabled:opacity-50"
          aria-label="Impor data dari file JSON">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12"/>
          </svg>
          {{ importing ? 'Memuat...' : 'Pilih File JSON' }}
        </button>
      </div>

      <!-- Export ICS range -->
      <div class="bg-surface-2 rounded-md p-4">
        <p class="text-sm font-medium text-ink mb-1">Ekspor ke Kalender (.ics)</p>
        <p class="text-xs text-ink-3 mb-3">Unduh agenda untuk diimpor ke aplikasi kalender perangkat.</p>
        <div class="flex gap-2 flex-wrap items-center">
          <select v-model="icsRange"
            class="flex-1 min-w-0 bg-surface border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent">
            <option value="all">Semua agenda</option>
            <option value="today">Hari ini</option>
            <option value="week">7 hari ke depan</option>
            <option value="month">Bulan ini</option>
          </select>
          <button @click="exportICS"
            class="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm bg-surface text-ink-2 border border-border hover:border-border-strong hover:text-ink transition-colors"
            aria-label="Unduh file ICS">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            Unduh .ics
          </button>
        </div>
      </div>
    </div>
  `,
};
