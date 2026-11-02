// ==== js/components/agenda-form.js ====
// AgendaKu · Agenda Form Modal Component
// Responsibility: create & edit agenda, multi-reminder, conflict detection,
//                 template apply/save, items checklist builder, tags, duration

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.AgendaForm = {
  name: 'agenda-form',
  props: {
    editId:    { type: String, default: null },   // null = new
    prefillDate: { type: String, default: '' },   // from mini calendar double-click
  },
  emits: ['close', 'saved'],
  setup(props, { emit }) {
    const U   = window.AgendaKu.utils;
    const St  = window.AgendaKu.store;

    // ---- Form state --------------------------------------------------------
    const defaultForm = () => ({
      title:       '',
      categoryId:  St.state.settings.categories[0]?.id || 'cat-other',
      tags:        [],
      date:        props.prefillDate || U.todayStr(),
      startTime:   '',
      endTime:     '',
      location:    '',
      dresscode:   '',
      items:       [],
      notes:       '',
      reminders:   (St.state.settings.defaultReminders || []).map(r => ({ id: U.uid(), minutes: r.minutes, notified: false })),
      linkUrl:     '',
      contactName: '',
      contactPhone:'',
    });

    const form    = Vue.reactive(defaultForm());
    const isDirty = Vue.ref(false);
    const saving  = Vue.ref(false);
    const newTag  = Vue.ref('');
    const newItemName = Vue.ref('');
    const newItemDesc = Vue.ref('');
    const newItemQty  = Vue.ref('');
    const newItemCat  = Vue.ref('');
    const templateNameInput = Vue.ref('');
    const showTemplateSaveInput = Vue.ref(false);
    const conflicts = Vue.ref([]);

    // Load existing event if editing
    if (props.editId) {
      const ev = St.state.events.find(e => e.id === props.editId);
      if (ev) {
        Object.assign(form, U.clone(ev));
        if (!Array.isArray(form.reminders) || form.reminders.length === 0) {
          form.reminders = [{ id: U.uid(), minutes: ev.reminderMinutes || 60, notified: false }];
        }
        if (!Array.isArray(form.tags)) form.tags = [];
      }
    }

    // Track dirty
    Vue.watch(() => ({ ...form }), () => { isDirty.value = true; }, { deep: true });

    // Duration label (computed from startTime & endTime)
    const duration = Vue.computed(() => {
      if (!form.startTime || !form.endTime) return '';
      const s = U.toDate(form.date || '2000-01-01', form.startTime);
      const e = U.toDate(form.date || '2000-01-01', form.endTime);
      const diff = e - s;
      if (diff <= 0) return '';
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      if (h > 0 && m > 0) return `${h} jam ${m} menit`;
      if (h > 0) return `${h} jam`;
      return `${m} menit`;
    });

    // Conflicts
    Vue.watch(
      () => ({ date: form.date, startTime: form.startTime, endTime: form.endTime }),
      () => checkConflicts(),
      { immediate: false }
    );

    function checkConflicts() {
      if (!form.date || !form.startTime) { conflicts.value = []; return; }
      conflicts.value = St.state.events.filter(ev => {
        if (ev.id === props.editId) return false;
        if (ev.done) return false;
        return U.detectOverlap(form, ev);
      });
    }

    // ---- Reminders ---------------------------------------------------------
    const PRESET_REMINDERS = [
      { label: 'Saat acara', minutes: 0 },
      { label: '10 menit',   minutes: 10 },
      { label: '30 menit',   minutes: 30 },
      { label: '1 jam',      minutes: 60 },
      { label: '2 jam',      minutes: 120 },
      { label: '1 hari',     minutes: 1440 },
      { label: '2 hari',     minutes: 2880 },
    ];

    function addReminder() {
      form.reminders.push({ id: U.uid(), minutes: 60, notified: false });
    }

    function removeReminder(idx) {
      form.reminders.splice(idx, 1);
    }

    // ---- Tags --------------------------------------------------------------
    function addTag() {
      const t = U.normalizeTag(newTag.value.trim());
      if (!t) return;
      if (!form.tags.includes(t)) form.tags.push(t);
      newTag.value = '';
    }

    function removeTag(t) {
      form.tags = form.tags.filter(x => x !== t);
    }

    function onTagKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    }

    // ---- Items -------------------------------------------------------------
    function addItem() {
      const n = newItemName.value.trim();
      if (!n) return;
      form.items.push({
        name:         n,
        packed:       false,
        description:  newItemDesc.value.trim(),
        quantity:     newItemQty.value.trim(),
        itemCategory: newItemCat.value.trim(),
      });
      newItemName.value = '';
      newItemDesc.value = '';
      newItemQty.value  = '';
      newItemCat.value  = '';
    }

    function removeItem(idx) {
      form.items.splice(idx, 1);
    }

    function onItemKeydown(e) {
      if (e.key === 'Enter') { e.preventDefault(); addItem(); }
    }

    // ---- Templates ---------------------------------------------------------
    const templates = Vue.computed(() => Object.keys(St.state.settings.templates || {}));

    function applyTemplate(name) {
      St.applyTemplate(name, form);
    }

    function saveTemplate() {
      const name = templateNameInput.value.trim();
      if (!name) return;
      St.saveTemplate(name, { dresscode: form.dresscode, items: form.items, notes: form.notes });
      showTemplateSaveInput.value = false;
      templateNameInput.value = '';
      St.showToast(`Template "${name}" disimpan.`, 'ok');
    }

    // ---- Submit ------------------------------------------------------------
    function submit() {
      if (!form.title.trim()) { alert('Judul agenda wajib diisi.'); return; }
      if (!form.date)         { alert('Tanggal wajib diisi.'); return; }
      if (!form.startTime)    { alert('Jam mulai wajib diisi.'); return; }
      saving.value = true;
      try {
        if (props.editId) {
          St.updateEvent(props.editId, U.clone(form));
          St.showToast('Agenda diperbarui.', 'ok');
          isDirty.value = false;
          emit('saved', null); // null = edit, no post-save modal
          emit('close');
        } else {
          const saved = St.addEvent(U.clone(form));
          // Do NOT show the generic toast here — post-save modal is the feedback
          isDirty.value = false;
          // Pass the full saved object so the parent can show the post-save modal
          emit('saved', saved);
          emit('close');
        }
      } finally {
        saving.value = false;
      }
    }

    function closeForm() {
      if (isDirty.value && !confirm('Ada perubahan yang belum disimpan. Tutup form?')) return;
      emit('close');
    }

    const categories = Vue.computed(() => St.state.settings.categories || []);

    return {
      U, form, isDirty, saving, duration, conflicts, categories,
      newTag, newItemName, newItemDesc, newItemQty, newItemCat,
      templateNameInput, showTemplateSaveInput, templates,
      PRESET_REMINDERS,
      addReminder, removeReminder,
      addTag, removeTag, onTagKeydown,
      addItem, removeItem, onItemKeydown,
      applyTemplate, saveTemplate,
      submit, closeForm,
    };
  },
  template: `
    <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
         data-modal-open="true"
         @click.self="closeForm"
         role="dialog"
         aria-modal="true"
         :aria-label="editId ? 'Edit agenda' : 'Tambah agenda baru'"
    >
      <div class="absolute inset-0 bg-ink/30 backdrop-blur-sm" @click="closeForm"></div>

      <div class="relative bg-surface rounded-t-2xl sm:rounded-lg shadow-xl w-full sm:max-w-2xl max-h-screen flex flex-col modal-enter">

        <!-- Form header -->
        <div class="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
          <h2 class="font-display text-lg font-medium text-ink">
            {{ editId ? 'Edit Agenda' : 'Agenda Baru' }}
          </h2>
          <button @click="closeForm" class="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-surface-2 transition-colors" aria-label="Tutup form">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Scrollable body -->
        <div class="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          <!-- Conflict warning -->
          <conflict-warning :conflicts="conflicts" />

          <!-- Title -->
          <div>
            <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-title">Judul <span class="text-urgent">*</span></label>
            <input id="f-title" v-model="form.title" type="text" placeholder="Nama agenda"
              class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
          </div>

          <!-- Category + Date row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-cat">Kategori</label>
              <select id="f-cat" v-model="form.categoryId"
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent">
                <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-date">Tanggal <span class="text-urgent">*</span></label>
              <input id="f-date" v-model="form.date" type="date"
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
          </div>

          <!-- Time row -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-start">Jam Mulai <span class="text-urgent">*</span></label>
              <input id="f-start" v-model="form.startTime" type="time"
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-end">Jam Selesai</label>
              <input id="f-end" v-model="form.endTime" type="time"
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <p class="text-xs text-ink-3 mb-1">Durasi</p>
              <p class="text-sm font-mono text-ink-2 py-2">{{ duration || '—' }}</p>
            </div>
          </div>

          <!-- Location + Dresscode -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-loc">Lokasi</label>
              <input id="f-loc" v-model="form.location" type="text" placeholder="Tempat acara"
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-dress">Dresscode</label>
              <input id="f-dress" v-model="form.dresscode" type="text" placeholder="Pakaian yang dikenakan"
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
          </div>

          <!-- Link + Contact -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-link">Tautan Acara</label>
              <input id="f-link" v-model="form.linkUrl" type="url" placeholder="https://..."
                class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-cname">Nama Kontak</label>
                <input id="f-cname" v-model="form.contactName" type="text" placeholder="Nama"
                  class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
              <div>
                <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-cphone">Telepon</label>
                <input id="f-cphone" v-model="form.contactPhone" type="tel" placeholder="No. HP"
                  class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              </div>
            </div>
          </div>

          <!-- Tags -->
          <div>
            <label class="block text-xs font-medium text-ink-3 mb-1.5">Tag</label>
            <div class="flex flex-wrap gap-1.5 mb-1.5">
              <span v-for="tag in form.tags" :key="tag"
                class="flex items-center gap-1 text-xs bg-surface-3 text-ink-2 px-2 py-0.5 rounded-sm">
                #{{ tag }}
                <button @click="removeTag(tag)" class="text-ink-3 hover:text-urgent ml-0.5" :aria-label="'Hapus tag ' + tag">&times;</button>
              </span>
            </div>
            <div class="flex gap-2">
              <input v-model="newTag" @keydown="onTagKeydown" type="text" placeholder="urgent, online, deadline..."
                class="flex-1 min-w-0 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent" />
              <button @click="addTag" class="px-3 py-2 rounded-md bg-surface-3 text-ink-2 text-sm hover:bg-surface-2 transition-colors" aria-label="Tambah tag">Tambah</button>
            </div>
          </div>

          <!-- Reminders -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-ink-3">Pengingat</label>
              <button @click="addReminder" class="text-xs text-accent hover:underline" aria-label="Tambah pengingat">+ Tambah</button>
            </div>
            <div class="space-y-2">
              <div v-for="(r, idx) in form.reminders" :key="r.id"
                class="flex items-center gap-2">
                <select v-model.number="r.minutes"
                  class="flex-1 min-w-0 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent">
                  <option v-for="p in PRESET_REMINDERS" :key="p.minutes" :value="p.minutes">{{ p.label }}</option>
                </select>
                <input v-model.number="r.minutes" type="number" min="0" placeholder="menit custom"
                  class="w-28 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm font-mono text-ink focus:outline-none focus:border-accent" />
                <span class="text-xs text-ink-3 whitespace-nowrap hidden sm:block">{{ U.formatReminderLabel(r.minutes) }}</span>
                <button v-if="form.reminders.length > 1" @click="removeReminder(idx)"
                  class="p-1.5 text-ink-3 hover:text-urgent rounded" :aria-label="'Hapus pengingat ke-' + (idx+1)">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Template apply -->
          <div v-if="templates.length > 0">
            <label class="block text-xs font-medium text-ink-3 mb-1.5">Terapkan Template</label>
            <div class="flex flex-wrap gap-2">
              <button v-for="tname in templates" :key="tname"
                @click="applyTemplate(tname)"
                class="text-xs px-3 py-1.5 rounded-md bg-surface-3 text-ink-2 hover:bg-accent-soft hover:text-accent transition-colors">
                {{ tname }}
              </button>
            </div>
          </div>

          <!-- Items -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-xs font-medium text-ink-3">Barang Bawaan</label>
              <div class="flex gap-2">
                <!-- Save as template -->
                <button @click="showTemplateSaveInput = !showTemplateSaveInput"
                  class="text-xs text-ink-3 hover:text-accent" aria-label="Simpan sebagai template">Simpan sbg template</button>
              </div>
            </div>
            <!-- Template name input -->
            <div v-if="showTemplateSaveInput" class="flex gap-2 mb-2">
              <input v-model="templateNameInput" type="text" placeholder="Nama template..."
                class="flex-1 min-w-0 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent" />
              <button @click="saveTemplate" class="px-3 py-2 bg-accent text-accent-ink rounded-md text-sm hover:bg-accent-hover transition-colors">Simpan</button>
            </div>
            <!-- Item list -->
            <div v-if="form.items.length > 0" class="space-y-1.5 mb-3">
              <div v-for="(item, idx) in form.items" :key="idx"
                class="flex items-center gap-2 bg-surface-2 px-3 py-2 rounded-md">
                <span class="flex-1 min-w-0 text-sm text-ink truncate">
                  {{ item.name }}<span v-if="item.quantity" class="text-ink-3"> (x{{ item.quantity }})</span>
                  <span v-if="item.description" class="text-ink-3 text-xs"> — {{ item.description }}</span>
                </span>
                <button @click="removeItem(idx)" class="text-ink-3 hover:text-urgent" :aria-label="'Hapus item ' + item.name">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>
            </div>
            <!-- Add item -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input v-model="newItemName" @keydown="onItemKeydown" type="text" placeholder="Nama barang *"
                class="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent" />
              <div class="grid grid-cols-2 gap-2">
                <input v-model="newItemQty" type="text" placeholder="Jumlah"
                  class="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent" />
                <input v-model="newItemCat" type="text" placeholder="Jenis (opsional)"
                  class="bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent" />
              </div>
              <input v-model="newItemDesc" type="text" placeholder="Keterangan (opsional)"
                class="sm:col-span-2 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent" />
              <button @click="addItem"
                class="sm:col-span-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-ink-3 hover:border-accent hover:text-accent transition-colors"
                aria-label="Tambah barang bawaan">+ Tambah Barang</button>
            </div>
          </div>

          <!-- Notes -->
          <div>
            <label class="block text-xs font-medium text-ink-3 mb-1.5" for="f-notes">Catatan</label>
            <textarea id="f-notes" v-model="form.notes" rows="3" placeholder="Catatan tambahan..."
              class="w-full bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y min-h-16"></textarea>
          </div>

        </div>

        <!-- Footer -->
        <div class="shrink-0 border-t border-border px-5 py-3 flex gap-2 justify-end">
          <button @click="closeForm"
            class="px-4 py-2 rounded-md text-sm text-ink-2 hover:bg-surface-2 transition-colors" aria-label="Batal">Batal</button>
          <button @click="submit" :disabled="saving"
            class="px-5 py-2 rounded-md text-sm font-medium bg-accent text-accent-ink hover:bg-accent-hover transition-colors disabled:opacity-60"
            :aria-label="editId ? 'Simpan perubahan' : 'Simpan agenda baru'">
            {{ saving ? 'Menyimpan...' : (editId ? 'Simpan Perubahan' : 'Simpan Agenda') }}
          </button>
        </div>
      </div>
    </div>
  `,
};
