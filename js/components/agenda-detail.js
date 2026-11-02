// ==== js/components/agenda-detail.js ====
// AgendaKu · Agenda Detail Modal Component
// Responsibility: full detail view, checklist, actions (edit, delete, done, export)

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.AgendaDetail = {
  name: 'agenda-detail',
  props: {
    eventId: { type: String, default: null },
  },
  emits: ['close', 'edit'],
  setup(props, { emit }) {
    const U   = window.AgendaKu.utils;
    const St  = window.AgendaKu.store;
    const Cal = window.AgendaKu.calendar;

    const event = Vue.computed(() =>
      St.state.events.find(e => e.id === props.eventId) || null
    );

    const category = Vue.computed(() =>
      event.value
        ? (St.state.settings.categories || []).find(c => c.id === event.value.categoryId)
        : null
    );

    const catColors = Vue.computed(() => {
      const token = category.value?.colorToken || 'category-1';
      return U.getCatColors(token);
    });

    const countdown = Vue.computed(() => {
      if (!event.value) return null;
      if (event.value.done) return { label: 'Selesai', urgent: false, past: true };
      return U.countdown(U.toDate(event.value.date, event.value.startTime));
    });

    const timeRange = Vue.computed(() =>
      event.value ? U.formatTimeRange(event.value.startTime, event.value.endTime) : ''
    );

    const formattedDate = Vue.computed(() =>
      event.value ? U.formatDate(event.value.date) : ''
    );

    const allPacked = Vue.computed(() => {
      if (!event.value || !event.value.items || event.value.items.length === 0) return true;
      return event.value.items.every(i => i.packed);
    });

    function toggleItem(idx) {
      if (!event.value) return;
      St.toggleItem(event.value.id, idx);
    }

    function toggleDone() {
      if (!event.value) return;
      St.toggleDone(event.value.id);
    }

    function editEvent() {
      emit('edit', props.eventId);
    }

    function deleteEvent() {
      if (!event.value) return;
      if (!confirm(`Hapus agenda "${event.value.title}"?`)) return;
      const removed = St.deleteEvent(event.value.id);
      St.showToast(`"${removed.title}" dihapus.`, 'info', () => {
        St.restoreEvent(removed.id);
        St.showToast('Agenda dipulihkan.', 'ok');
      });
      emit('close');
    }

    function duplicateEvent() {
      if (!event.value) return;
      const copy = St.duplicateEvent(event.value.id);
      if (copy) St.showToast(`"${copy.title}" dibuat sebagai salinan.`, 'ok');
    }

    function openGCal() {
      if (!event.value) return;
      window.open(Cal.gcalURL(event.value), '_blank', 'noopener,noreferrer');
    }

    function downloadICS() {
      if (!event.value) return;
      Cal.downloadICS(event.value);
    }

    function closeModal() {
      emit('close');
    }

    // Reminder labels
    const reminderLabels = Vue.computed(() => {
      if (!event.value) return [];
      const reminders = event.value.reminders && event.value.reminders.length
        ? event.value.reminders
        : [{ minutes: event.value.reminderMinutes || 60 }];
      return reminders.map(r => U.formatReminderLabel(r.minutes));
    });

    return {
      U, event, category, catColors, countdown, timeRange, formattedDate,
      allPacked, toggleItem, toggleDone, editEvent, deleteEvent, duplicateEvent,
      openGCal, downloadICS, closeModal, reminderLabels,
    };
  },
  template: `
    <div v-if="event"
         class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         data-modal-open="true"
         @click.self="closeModal"
         role="dialog"
         aria-modal="true"
         :aria-label="'Detail agenda: ' + event.title"
    >
      <!-- Backdrop -->
      <div class="absolute inset-0 bg-ink/30 backdrop-blur-sm" @click="closeModal"></div>

      <!-- Panel -->
      <div class="relative bg-surface rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-lg max-h-screen flex flex-col modal-enter">

        <!-- Header -->
        <div class="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b border-border shrink-0">
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap mb-1.5">
              <span
                v-if="category"
                :class="['text-xs font-medium px-2 py-0.5 rounded-sm', catColors.bg, catColors.text]"
              >{{ category.name }}</span>
              <span
                v-for="tag in (event.tags || [])"
                :key="tag"
                class="text-xs text-ink-3 bg-surface-3 px-1.5 py-0.5 rounded-sm"
              >#{{ tag }}</span>
              <span v-if="event.done"
                class="text-xs px-2 py-0.5 rounded-sm bg-ok-soft text-ok">Selesai</span>
            </div>
            <h2 class="font-display text-xl font-medium text-ink break-words leading-snug">{{ event.title }}</h2>
          </div>
          <button @click="closeModal"
            class="shrink-0 p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors mt-0.5"
            aria-label="Tutup detail">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          <!-- Date & time -->
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span class="text-ink-2">{{ formattedDate }}</span>
            <span class="font-mono text-ink-2">{{ timeRange }}</span>
            <span v-if="countdown"
              :class="['font-mono text-xs font-medium', event.done ? 'text-ink-4' : countdown.urgent ? 'text-urgent' : 'text-accent']"
            >{{ countdown.label }}</span>
          </div>

          <!-- Location -->
          <div v-if="event.location" class="flex items-start gap-2 text-sm">
            <svg class="w-4 h-4 text-ink-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span class="text-ink-2">{{ event.location }}</span>
          </div>

          <!-- Link -->
          <div v-if="event.linkUrl" class="flex items-start gap-2 text-sm">
            <svg class="w-4 h-4 text-ink-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.828 14.828a4 4 0 015.656 0l.506.505a4 4 0 01-5.656 5.656l-1.1-1.1"/>
            </svg>
            <a :href="event.linkUrl" target="_blank" rel="noopener noreferrer"
               class="text-accent hover:underline truncate">{{ event.linkUrl }}</a>
          </div>

          <!-- Contact -->
          <div v-if="event.contactName" class="flex items-start gap-2 text-sm">
            <svg class="w-4 h-4 text-ink-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <span class="text-ink-2">{{ event.contactName }}<span v-if="event.contactPhone"> &mdash; {{ event.contactPhone }}</span></span>
          </div>

          <!-- Dresscode -->
          <div v-if="event.dresscode" class="bg-surface-2 rounded-md px-4 py-3">
            <p class="text-xs font-medium text-ink-3 mb-0.5">Dresscode</p>
            <p class="text-sm text-ink">{{ event.dresscode }}</p>
          </div>

          <!-- Items checklist -->
          <div v-if="event.items && event.items.length > 0" class="bg-surface-2 rounded-md px-4 py-3">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-medium text-ink-3">Barang Bawaan</p>
              <span :class="['text-xs font-mono', allPacked ? 'text-ok' : 'text-ink-3']">
                {{ event.items.filter(i=>i.packed).length }}/{{ event.items.length }} siap
              </span>
            </div>
            <ul class="space-y-1.5">
              <li v-for="(item, idx) in event.items" :key="idx"
                  class="flex items-start gap-2.5 cursor-pointer group"
                  @click="toggleItem(idx)">
                <span :class="['mt-0.5 w-4 h-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors',
                  item.packed ? 'bg-accent border-accent' : 'border-border-strong group-hover:border-accent']">
                  <svg v-if="item.packed" class="w-2.5 h-2.5 text-accent-ink" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/>
                  </svg>
                </span>
                <div class="min-w-0">
                  <span :class="['text-sm', item.packed ? 'line-through text-ink-4' : 'text-ink']">
                    {{ item.name }}<span v-if="item.quantity" class="text-ink-3"> (x{{ item.quantity }})</span>
                  </span>
                  <p v-if="item.description" class="text-xs text-ink-3 mt-0.5">{{ item.description }}</p>
                  <span v-if="item.itemCategory" class="text-xs text-ink-4 bg-surface-3 px-1.5 py-0.5 rounded-sm inline-block mt-0.5">{{ item.itemCategory }}</span>
                </div>
              </li>
            </ul>
          </div>

          <!-- Reminders -->
          <div v-if="reminderLabels.length > 0" class="flex items-start gap-2 text-sm">
            <svg class="w-4 h-4 text-ink-3 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
            </svg>
            <div>
              <span v-for="(label, idx) in reminderLabels" :key="idx"
                class="inline-block text-xs text-ink-2 bg-surface-3 px-2 py-0.5 rounded-sm mr-1 mb-1">{{ label }}</span>
            </div>
          </div>

          <!-- Notes -->
          <div v-if="event.notes" class="text-sm text-ink-2 whitespace-pre-wrap leading-relaxed">
            {{ event.notes }}
          </div>

        </div>

        <!-- Footer actions -->
        <div class="shrink-0 border-t border-border px-5 py-3">
          <!-- Primary actions -->
          <div class="flex flex-wrap gap-2 mb-2.5">
            <button @click="toggleDone"
              :class="[
                'flex-1 min-w-0 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                event.done
                  ? 'bg-surface-3 text-ink-2 hover:bg-surface-2'
                  : 'bg-ok-soft text-ok hover:bg-ok hover:text-accent-ink'
              ]"
              :aria-label="event.done ? 'Tandai belum selesai' : 'Tandai selesai'"
            >{{ event.done ? 'Batal Selesai' : 'Tandai Selesai' }}</button>
            <button @click="editEvent"
              class="flex-1 min-w-0 px-3 py-2 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors"
              aria-label="Edit agenda">Edit</button>
          </div>
          <!-- Secondary actions -->
          <div class="flex flex-wrap gap-2">
            <button @click="openGCal"
              class="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-surface-2 text-ink-2 hover:bg-surface-3 transition-colors"
              aria-label="Buka di Google Calendar">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              Google Calendar
            </button>
            <button @click="downloadICS"
              class="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-surface-2 text-ink-2 hover:bg-surface-3 transition-colors"
              aria-label="Unduh file ICS">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
              </svg>
              Unduh .ics
            </button>
            <button @click="duplicateEvent"
              class="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-surface-2 text-ink-2 hover:bg-surface-3 transition-colors"
              aria-label="Duplikasi agenda">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              Duplikat
            </button>
            <button @click="deleteEvent"
              class="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-surface-2 text-urgent hover:bg-urgent-soft transition-colors ml-auto"
              aria-label="Hapus agenda">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                <polyline points="3 6 5 6 21 6"/>
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
              </svg>
              Hapus
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
};
