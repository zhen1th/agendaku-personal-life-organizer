// ==== js/components/agenda-card.js ====
// AgendaKu · Agenda Card Component
// Responsibility: display a single agenda card in the list with countdown,
//                 category badge, item summary, dresscode, urgent pulse

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.AgendaCard = {
  name: 'agenda-card',
  props: {
    event:   { type: Object, required: true },
    density: { type: String, default: 'cozy' },
  },
  emits: ['open-detail'],
  setup(props, { emit }) {
    const U  = window.AgendaKu.utils;
    const St = window.AgendaKu.store;

    const category = Vue.computed(() =>
      (St.state.settings.categories || []).find(c => c.id === props.event.categoryId)
    );

    const catColors = Vue.computed(() => {
      const token = category.value?.colorToken || 'category-1';
      return U.getCatColors(token);
    });

    const countdown = Vue.computed(() => {
      if (props.event.done) return { label: 'Selesai', urgent: false, past: true };
      const target = U.toDate(props.event.date, props.event.startTime);
      return U.countdown(target);
    });

    const timeRange = Vue.computed(() =>
      U.formatTimeRange(props.event.startTime, props.event.endTime)
    );

    const itemsSummary = Vue.computed(() =>
      U.itemsSummary(props.event.items)
    );

    // Preparation completeness
    const prepComplete = Vue.computed(() => {
      if (!props.event.items || props.event.items.length === 0) return null;
      return props.event.items.every(i => i.packed);
    });

    const isUrgent = Vue.computed(() =>
      !props.event.done && countdown.value.urgent
    );

    // Compact padding
    const cardPad = Vue.computed(() =>
      props.density === 'compact' ? 'px-3 py-2.5' : 'px-4 py-4'
    );

    function openDetail() {
      emit('open-detail', props.event.id);
    }

    return { U, category, catColors, countdown, timeRange, itemsSummary, prepComplete, isUrgent, cardPad, openDetail };
  },
  template: `
    <article
      :class="[
        'bg-surface rounded-lg border cursor-pointer transition-colors hover:border-border-strong focus-within:ring-2 focus-within:ring-accent focus-within:ring-offset-1',
        isUrgent ? 'border-l-4 pulse-border border-accent' : 'border-border',
        cardPad
      ]"
      @click="openDetail"
      tabindex="0"
      @keydown.enter="openDetail"
      :aria-label="'Agenda: ' + event.title"
    >
      <!-- Top row: category badge + time -->
      <div class="flex items-start justify-between gap-2 min-w-0">
        <div class="flex items-center gap-2 min-w-0 flex-wrap">
          <!-- Category badge -->
          <span
            v-if="category"
            :class="['text-xs font-medium px-2 py-0.5 rounded-sm whitespace-nowrap shrink-0', catColors.bg, catColors.text]"
          >{{ category.name }}</span>
          <!-- Tags -->
          <span
            v-for="tag in (event.tags || []).slice(0, 2)"
            :key="tag"
            class="text-xs text-ink-3 bg-surface-3 px-1.5 py-0.5 rounded-sm"
          >#{{ tag }}</span>
        </div>
        <!-- Time (mono) -->
        <span class="font-mono text-xs text-ink-3 shrink-0 mt-0.5">{{ timeRange }}</span>
      </div>

      <!-- Title -->
      <h3
        :class="[
          'font-display font-medium text-ink leading-snug mt-1.5 break-words min-w-0',
          event.done ? 'line-through text-ink-3' : '',
          density === 'compact' ? 'text-sm' : 'text-base'
        ]"
      >{{ event.title }}</h3>

      <!-- Location (if any) -->
      <p v-if="event.location" class="text-xs text-ink-3 mt-0.5 truncate">{{ event.location }}</p>

      <!-- Bottom row -->
      <div class="flex items-end justify-between gap-2 mt-2.5 min-w-0 flex-wrap">
        <div class="flex flex-col gap-0.5 min-w-0">
          <!-- Dresscode hint -->
          <span v-if="event.dresscode" class="text-xs text-ink-3 truncate">
            Dresscode: <span class="text-ink-2">{{ event.dresscode }}</span>
          </span>
          <!-- Items summary -->
          <span v-if="itemsSummary" class="text-xs"
            :class="prepComplete === false ? 'text-urgent' : 'text-ok'"
          >{{ itemsSummary }}</span>
        </div>
        <!-- Countdown -->
        <span
          :class="[
            'font-mono text-xs font-medium shrink-0',
            event.done ? 'text-ink-4' :
            countdown.urgent ? 'text-urgent' : 'text-accent'
          ]"
        >{{ countdown.label }}</span>
      </div>
    </article>
  `,
};
