// ==== js/components/settings-panel.js ====
// AgendaKu · Settings Panel Modal Component
// Responsibility: theme, density, notification, default reminders, category manager,
//                 data management (clear all, export, import)

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.SettingsPanel = {
  name: 'settings-panel',
  emits: ['close'],
  setup(props, { emit }) {
    const U   = window.AgendaKu.utils;
    const St  = window.AgendaKu.store;
    const Rem = window.AgendaKu.reminder;

    const activeTab = Vue.ref('general'); // 'general' | 'categories' | 'data'

    // ---- General settings --------------------------------------------------
    function toggleTheme() {
      const next = St.state.settings.theme === 'dark' ? 'light' : 'dark';
      St.setSettings({ theme: next });
    }

    function setDensity(d) {
      St.setSettings({ density: d });
    }

    async function requestNotifications() {
      const granted = await Rem.enableNotifications();
      St.setSettings({ notificationEnabled: granted });
      St.showToast(
        granted ? 'Notifikasi diaktifkan.' : 'Izin notifikasi tidak diberikan.',
        granted ? 'ok' : 'info'
      );
    }

    // Default reminders
    const PRESET_REMINDERS = [
      { label: '10 menit', minutes: 10 },
      { label: '30 menit', minutes: 30 },
      { label: '1 jam',    minutes: 60 },
      { label: '2 jam',    minutes: 120 },
      { label: '1 hari',   minutes: 1440 },
    ];

    function addDefaultReminder() {
      if (!St.state.settings.defaultReminders) St.state.settings.defaultReminders = [];
      St.state.settings.defaultReminders.push({ id: U.uid(), minutes: 60 });
      St.save();
    }

    function removeDefaultReminder(idx) {
      St.state.settings.defaultReminders.splice(idx, 1);
      St.save();
    }

    function saveDefaultReminders() {
      St.save();
      St.showToast('Pengaturan pengingat disimpan.', 'ok');
    }

    // ---- Data management ---------------------------------------------------
    const clearStep = Vue.ref(0); // 0=idle, 1=confirm1, 2=confirm2

    function requestClear() { clearStep.value = 1; }
    function confirmClear1() { clearStep.value = 2; }
    function cancelClear()  { clearStep.value = 0; }

    function confirmClear2() {
      St.state.events.splice(0, St.state.events.length);
      St.save();
      clearStep.value = 0;
      St.showToast('Semua data agenda dihapus.', 'info');
    }

    function closePanel() {
      emit('close');
    }

    return {
      U, St, Rem,
      activeTab,
      toggleTheme, setDensity, requestNotifications,
      PRESET_REMINDERS, addDefaultReminder, removeDefaultReminder, saveDefaultReminders,
      clearStep, requestClear, confirmClear1, confirmClear2, cancelClear,
      closePanel,
    };
  },
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         data-modal-open="true"
         @click.self="closePanel"
         role="dialog"
         aria-modal="true"
         aria-label="Pengaturan AgendaKu"
    >
      <div class="absolute inset-0 bg-ink/30 backdrop-blur-sm" @click="closePanel"></div>

      <div class="relative bg-surface rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-xl max-h-screen flex flex-col modal-enter">

        <!-- Header -->
        <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <h2 class="font-display text-lg font-medium text-ink">Pengaturan</h2>
          <button @click="closePanel" class="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors" aria-label="Tutup pengaturan">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Tabs -->
        <div class="flex border-b border-border px-5 shrink-0">
          <button v-for="tab in [{id:'general',label:'Umum'},{id:'categories',label:'Kategori'},{id:'data',label:'Data'}]" :key="tab.id"
            @click="activeTab = tab.id"
            :class="[
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-3 hover:text-ink'
            ]"
            :aria-selected="activeTab === tab.id"
          >{{ tab.label }}</button>
        </div>

        <!-- Tab content -->
        <div class="overflow-y-auto flex-1 px-5 py-4">

          <!-- GENERAL TAB -->
          <div v-if="activeTab === 'general'" class="space-y-5">

            <!-- Theme toggle -->
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-medium text-ink">Tema</p>
                <p class="text-xs text-ink-3 mt-0.5">{{ St.state.settings.theme === 'dark' ? 'Mode Gelap' : 'Mode Terang' }}</p>
              </div>
              <button @click="toggleTheme"
                :class="['relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1',
                  St.state.settings.theme === 'dark' ? 'bg-accent' : 'bg-border-strong']"
                :aria-checked="St.state.settings.theme === 'dark'"
                role="switch"
                aria-label="Toggle tema gelap">
                <span :class="['inline-block h-4 w-4 transform rounded-full bg-surface transition-transform',
                  St.state.settings.theme === 'dark' ? 'translate-x-6' : 'translate-x-1']"></span>
              </button>
            </div>

            <!-- Density -->
            <div>
              <p class="text-sm font-medium text-ink mb-2">Tampilan Daftar</p>
              <div class="flex gap-2">
                <button v-for="d in [{id:'cozy',label:'Longgar'},{id:'compact',label:'Padat'}]" :key="d.id"
                  @click="setDensity(d.id)"
                  :class="[
                    'flex-1 py-2 rounded-md text-sm font-medium border transition-colors',
                    St.state.settings.density === d.id
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-border text-ink-2 hover:border-border-strong'
                  ]"
                  :aria-pressed="St.state.settings.density === d.id"
                >{{ d.label }}</button>
              </div>
            </div>

            <!-- Notifications -->
            <div class="bg-surface-2 rounded-md p-4">
              <div class="flex items-start justify-between gap-3 mb-3">
                <div>
                  <p class="text-sm font-medium text-ink">Notifikasi Browser</p>
                  <p class="text-xs text-ink-3 mt-0.5">
                    {{ St.state.settings.notificationEnabled ? 'Aktif' : 'Tidak aktif — klik untuk mengaktifkan' }}
                  </p>
                </div>
                <button @click="requestNotifications"
                  :class="[
                    'shrink-0 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                    St.state.settings.notificationEnabled
                      ? 'bg-ok-soft text-ok'
                      : 'bg-accent text-accent-ink hover:bg-accent-hover'
                  ]"
                  aria-label="Aktifkan notifikasi">
                  {{ St.state.settings.notificationEnabled ? 'Aktif' : 'Aktifkan' }}
                </button>
              </div>
              <p class="text-xs text-ink-4">
                Notifikasi hanya berfungsi saat tab ini terbuka. Ekspor .ics sebagai alternatif pengingat di kalender perangkat.
              </p>
            </div>

            <!-- Default reminders -->
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-medium text-ink">Pengingat Default</p>
                <button @click="addDefaultReminder" class="text-xs text-accent hover:underline" aria-label="Tambah pengingat default">+ Tambah</button>
              </div>
              <div v-if="St.state.settings.defaultReminders" class="space-y-2">
                <div v-for="(r, idx) in St.state.settings.defaultReminders" :key="r.id"
                  class="flex items-center gap-2">
                  <select v-model.number="r.minutes"
                    class="flex-1 min-w-0 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent">
                    <option v-for="p in PRESET_REMINDERS" :key="p.minutes" :value="p.minutes">{{ p.label }}</option>
                  </select>
                  <input v-model.number="r.minutes" type="number" min="0"
                    class="w-24 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-accent" />
                  <button v-if="St.state.settings.defaultReminders.length > 1"
                    @click="removeDefaultReminder(idx)"
                    class="p-1.5 text-ink-3 hover:text-urgent rounded"
                    :aria-label="'Hapus pengingat default ke-' + (idx+1)">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
              </div>
              <button @click="saveDefaultReminders"
                class="mt-2 px-3 py-1.5 rounded-md text-xs text-accent hover:underline" aria-label="Simpan pengaturan pengingat default">Simpan</button>
            </div>
          </div>

          <!-- CATEGORIES TAB -->
          <div v-if="activeTab === 'categories'">
            <category-manager />
          </div>

          <!-- DATA TAB -->
          <div v-if="activeTab === 'data'" class="space-y-4">
            <import-export />

            <!-- Clear all data -->
            <div class="border-t border-border pt-4">
              <p class="text-sm font-medium text-ink mb-1">Hapus Semua Data</p>
              <p class="text-xs text-ink-3 mb-3">Menghapus seluruh agenda secara permanen. Tidak dapat dibatalkan.</p>

              <div v-if="clearStep === 0">
                <button @click="requestClear"
                  class="px-4 py-2 rounded-md text-sm text-urgent border border-urgent hover:bg-urgent-soft transition-colors"
                  aria-label="Hapus semua data agenda">Hapus Semua Agenda</button>
              </div>
              <div v-else-if="clearStep === 1" class="space-y-2">
                <p class="text-sm text-urgent font-medium">Yakin ingin menghapus semua agenda?</p>
                <div class="flex gap-2">
                  <button @click="confirmClear1" class="px-4 py-2 rounded-md text-sm bg-urgent text-accent-ink hover:opacity-90 transition-opacity">Ya, lanjutkan</button>
                  <button @click="cancelClear"  class="px-4 py-2 rounded-md text-sm text-ink-2 hover:bg-surface-2 transition-colors">Batal</button>
                </div>
              </div>
              <div v-else-if="clearStep === 2" class="space-y-2">
                <p class="text-sm text-urgent font-medium">Konfirmasi terakhir — data tidak dapat dipulihkan.</p>
                <div class="flex gap-2">
                  <button @click="confirmClear2" class="px-4 py-2 rounded-md text-sm bg-urgent text-accent-ink hover:opacity-90 transition-opacity">Hapus Sekarang</button>
                  <button @click="cancelClear"   class="px-4 py-2 rounded-md text-sm text-ink-2 hover:bg-surface-2 transition-colors">Batal</button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `,
};
