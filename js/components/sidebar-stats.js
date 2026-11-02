// ==== js/components/sidebar-stats.js ====
// AgendaKu · Sidebar Statistics Panel
// Responsibility: agenda counts by status, preparation rate, quick summary

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.SidebarStats = {
  name: 'sidebar-stats',
  setup() {
    const U  = window.AgendaKu.utils;
    const St = window.AgendaKu.store;

    const today    = Vue.computed(() => U.todayStr());
    const tomorrow = Vue.computed(() => U.tomorrowStr());

    const allFuture = Vue.computed(() =>
      St.state.events.filter(e => !e.done && e.date >= today.value)
    );

    const todayCount = Vue.computed(() =>
      St.state.events.filter(e => !e.done && e.date === today.value).length
    );

    const tomorrowCount = Vue.computed(() =>
      St.state.events.filter(e => !e.done && e.date === tomorrow.value).length
    );

    const upcomingCount = Vue.computed(() =>
      St.state.events.filter(e => !e.done && e.date > tomorrow.value).length
    );

    const doneCount = Vue.computed(() =>
      St.state.events.filter(e => e.done).length
    );

    const totalCount = Vue.computed(() => St.state.events.length);

    // Items prep rate
    const prepRate = Vue.computed(() => {
      let total = 0, ready = 0;
      St.state.events.filter(e => !e.done).forEach(e => {
        (e.items || []).forEach(i => { total++; if (i.packed) ready++; });
      });
      if (total === 0) return null;
      return Math.round((ready / total) * 100);
    });

    // Upcoming urgent (within 1 hour, not done)
    const urgentCount = Vue.computed(() =>
      St.state.events.filter(e => {
        if (e.done) return false;
        const target = U.toDate(e.date, e.startTime);
        const diff   = target.getTime() - Date.now();
        return diff > 0 && diff <= 3600000;
      }).length
    );

    return {
      todayCount, tomorrowCount, upcomingCount, doneCount, totalCount,
      prepRate, urgentCount,
    };
  },
  template: `
    <div class="bg-surface rounded-lg border border-border p-4 space-y-3">
      <h3 class="text-xs font-medium text-ink-3 uppercase tracking-wide">Ringkasan</h3>

      <!-- Urgent -->
      <div v-if="urgentCount > 0"
        class="flex items-center justify-between px-3 py-2 rounded-md bg-urgent-soft">
        <span class="text-xs font-medium text-urgent">Segera dimulai</span>
        <span class="font-mono text-sm font-medium text-urgent">{{ urgentCount }}</span>
      </div>

      <!-- Stats grid -->
      <div class="grid grid-cols-2 gap-2">
        <div class="bg-surface-2 rounded-md px-3 py-2.5">
          <p class="text-xs text-ink-3 mb-0.5">Hari Ini</p>
          <p class="font-mono text-xl font-medium text-ink">{{ todayCount }}</p>
        </div>
        <div class="bg-surface-2 rounded-md px-3 py-2.5">
          <p class="text-xs text-ink-3 mb-0.5">Besok</p>
          <p class="font-mono text-xl font-medium text-ink">{{ tomorrowCount }}</p>
        </div>
        <div class="bg-surface-2 rounded-md px-3 py-2.5">
          <p class="text-xs text-ink-3 mb-0.5">Mendatang</p>
          <p class="font-mono text-xl font-medium text-ink">{{ upcomingCount }}</p>
        </div>
        <div class="bg-surface-2 rounded-md px-3 py-2.5">
          <p class="text-xs text-ink-3 mb-0.5">Selesai</p>
          <p class="font-mono text-xl font-medium text-ink">{{ doneCount }}</p>
        </div>
      </div>

      <!-- Prep rate -->
      <div v-if="prepRate !== null" class="bg-surface-2 rounded-md px-3 py-2.5">
        <div class="flex items-center justify-between mb-1.5">
          <p class="text-xs text-ink-3">Kesiapan Barang</p>
          <span class="font-mono text-sm font-medium"
            :class="prepRate >= 80 ? 'text-ok' : prepRate >= 40 ? 'text-warn' : 'text-urgent'">
            {{ prepRate }}%
          </span>
        </div>
        <div class="w-full bg-surface-3 rounded-full h-1.5">
          <div class="h-1.5 rounded-full transition-all"
            :class="prepRate >= 80 ? 'bg-ok' : prepRate >= 40 ? 'bg-warn' : 'bg-urgent'"
            :style="'width: ' + prepRate + '%'"></div>
        </div>
      </div>

      <p class="text-xs text-ink-4 text-right">{{ totalCount }} total agenda</p>
    </div>
  `,
};
