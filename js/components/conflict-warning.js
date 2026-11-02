// ==== js/components/conflict-warning.js ====
// AgendaKu · Conflict Warning Component
// Responsibility: display overlap warning in agenda form

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.ConflictWarning = {
  name: 'conflict-warning',
  props: {
    conflicts: { type: Array, default: () => [] },
  },
  template: `
    <div v-if="conflicts.length > 0"
         class="rounded-md bg-warn-soft border border-warn text-ink-2 px-4 py-3 text-sm"
         role="alert">
      <p class="font-medium text-ink mb-1">Perhatian: Waktu bertabrakan</p>
      <ul class="list-disc list-inside space-y-0.5">
        <li v-for="c in conflicts" :key="c.id">
          {{ c.title }} &mdash; {{ c.date }} {{ c.startTime }}<span v-if="c.endTime"> &ndash; {{ c.endTime }}</span>
        </li>
      </ul>
      <p class="mt-1 text-ink-3 text-xs">Agenda tetap bisa disimpan, namun ada tumpang tindih waktu.</p>
    </div>
  `,
};
