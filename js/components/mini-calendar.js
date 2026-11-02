// ==== js/components/mini-calendar.js ====
// AgendaKu · Mini Calendar Sidebar Component
// Responsibility: month grid display, dot/check markers, navigation, click/dblclick filter

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.MiniCalendar = {
  name: 'mini-calendar',
  emits: ['filter-date', 'new-on-date'],
  setup(props, { emit }) {
    const U  = window.AgendaKu.utils;
    const St = window.AgendaKu.store;

    const today = U.todayStr();
    const now   = new Date();

    const year  = Vue.ref(now.getFullYear());
    const month = Vue.ref(now.getMonth()); // 0-based

    const grid = Vue.computed(() => U.getMonthGrid(year.value, month.value));

    const monthLabel = Vue.computed(() => U.formatMonth(year.value, month.value));

    // Days of week labels (Mon first)
    const DOW = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

    // Set of dates that have events
    const eventDates = Vue.computed(() => {
      const events = St.state.events;
      const map = {};
      events.forEach(ev => {
        if (!map[ev.date]) map[ev.date] = { total: 0, done: 0 };
        map[ev.date].total++;
        if (ev.done) map[ev.date].done++;
      });
      return map;
    });

    // Dates in current month's dominant category (for legend)
    const categoryLegend = Vue.computed(() => {
      const cats = {};
      St.state.events.forEach(ev => {
        const d = ev.date;
        const y = parseInt(d.slice(0, 4));
        const m = parseInt(d.slice(5, 7)) - 1;
        if (y !== year.value || m !== month.value) return;
        const cat = (St.state.settings.categories || []).find(c => c.id === ev.categoryId);
        if (cat) {
          cats[cat.colorToken] = cats[cat.colorToken] || { token: cat.colorToken, names: new Set() };
          cats[cat.colorToken].names.add(cat.name);
        }
      });
      return Object.values(cats).slice(0, 4);
    });

    function prevMonth() {
      if (month.value === 0) { month.value = 11; year.value--; }
      else month.value--;
    }

    function nextMonth() {
      if (month.value === 11) { month.value = 0; year.value++; }
      else month.value++;
    }

    function goToday() {
      year.value  = now.getFullYear();
      month.value = now.getMonth();
    }

    // Single click: filter
    let clickTimer = null;
    function onDayClick(cell) {
      if (!cell.inMonth) return;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => {
        const current = St.state.activeFilter;
        St.state.activeFilter = current === cell.dateStr ? null : cell.dateStr;
        emit('filter-date', St.state.activeFilter);
      }, 220);
    }

    // Double click: new event on date
    function onDayDblclick(cell) {
      clearTimeout(clickTimer);
      emit('new-on-date', cell.dateStr);
    }

    return {
      U, St, today, year, month, grid, monthLabel, DOW,
      eventDates, categoryLegend,
      prevMonth, nextMonth, goToday,
      onDayClick, onDayDblclick,
    };
  },
  template: `
    <div class="bg-surface rounded-lg border border-border p-4 select-none">
      <!-- Header -->
      <div class="flex items-center justify-between mb-3">
        <button @click="prevMonth"
          class="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
          aria-label="Bulan sebelumnya">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <button @click="goToday"
          class="text-sm font-medium text-ink hover:text-accent transition-colors"
          :aria-label="'Bulan ' + monthLabel">{{ monthLabel }}</button>
        <button @click="nextMonth"
          class="p-1 rounded text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors"
          aria-label="Bulan berikutnya">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      <!-- Day of week headers -->
      <div class="grid grid-cols-7 mb-1">
        <div v-for="d in DOW" :key="d"
          class="text-center text-xs font-medium text-ink-4 py-1">{{ d }}</div>
      </div>

      <!-- Calendar grid -->
      <div class="grid grid-cols-7 gap-y-0.5">
        <div
          v-for="(cell, idx) in grid.flat()"
          :key="idx"
          @click="onDayClick(cell)"
          @dblclick.prevent="onDayDblclick(cell)"
          :class="[
            'relative flex flex-col items-center py-1 rounded-md cursor-pointer transition-colors',
            !cell.inMonth ? 'opacity-30 pointer-events-none' : '',
            cell.dateStr === St.state.activeFilter ? 'bg-accent-soft' : 'hover:bg-surface-2',
            cell.dateStr === today ? 'font-semibold' : '',
          ]"
          :aria-label="cell.dateStr + (eventDates[cell.dateStr] ? ' ada agenda' : '')"
        >
          <span :class="[
            'text-xs w-6 h-6 flex items-center justify-center rounded-full leading-none',
            cell.dateStr === today
              ? 'bg-accent text-accent-ink'
              : cell.dateStr === St.state.activeFilter
                ? 'text-accent font-semibold'
                : 'text-ink',
          ]">{{ cell.day }}</span>

          <!-- Dot markers -->
          <div v-if="eventDates[cell.dateStr]" class="flex items-center justify-center mt-0.5">
            <!-- Check mark if all done, dot otherwise -->
            <span v-if="eventDates[cell.dateStr].done === eventDates[cell.dateStr].total"
              class="text-ok" style="font-size:8px; line-height:1;">&#10003;</span>
            <span v-else
              class="w-1 h-1 rounded-full bg-accent inline-block"></span>
          </div>
          <div v-else class="mt-0.5 h-1.5"></div>
        </div>
      </div>

      <!-- Category legend -->
      <div v-if="categoryLegend.length > 0" class="mt-3 pt-3 border-t border-border space-y-1">
        <p class="text-xs text-ink-4 mb-1.5">Bulan ini</p>
        <div v-for="entry in categoryLegend" :key="entry.token"
          class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full shrink-0"
            :style="'background-color: var(--color-' + entry.token + ')'"></span>
          <span class="text-xs text-ink-3 truncate">{{ Array.from(entry.names).join(', ') }}</span>
        </div>
      </div>

      <!-- Active filter indicator -->
      <div v-if="St.state.activeFilter" class="mt-3 flex items-center justify-between">
        <span class="text-xs text-ink-3">Filter: {{ St.state.activeFilter }}</span>
        <button @click="St.state.activeFilter = null"
          class="text-xs text-accent hover:underline" aria-label="Hapus filter tanggal">Hapus</button>
      </div>
    </div>
  `,
};
