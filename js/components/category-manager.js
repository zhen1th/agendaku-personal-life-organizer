// ==== js/components/category-manager.js ====
// AgendaKu · Category Manager Component
// Responsibility: list/add/edit/delete categories, color token picker, validation

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.components = window.AgendaKu.components || {};

window.AgendaKu.components.CategoryManager = {
  name: 'category-manager',
  setup() {
    const U  = window.AgendaKu.utils;
    const St = window.AgendaKu.store;

    const COLOR_TOKENS = [
      'category-1','category-2','category-3','category-4',
      'category-5','category-6','category-7','category-8',
    ];

    const newName  = Vue.ref('');
    const newColor = Vue.ref('category-1');
    const editingId = Vue.ref(null);
    const editName  = Vue.ref('');
    const editColor = Vue.ref('');
    const error     = Vue.ref('');
    const deleteConfirmId = Vue.ref(null);
    const reassignTo      = Vue.ref('');

    const categories = Vue.computed(() => St.state.settings.categories || []);

    function usageCount(id) {
      return St.state.events.filter(e => e.categoryId === id).length;
    }

    function addCategory() {
      error.value = '';
      const result = St.addCategory({ name: newName.value, colorToken: newColor.value });
      if (!result.ok) { error.value = result.error; return; }
      newName.value  = '';
      newColor.value = 'category-1';
    }

    function startEdit(cat) {
      editingId.value = cat.id;
      editName.value  = cat.name;
      editColor.value = cat.colorToken;
      error.value     = '';
    }

    function saveEdit() {
      error.value = '';
      const result = St.updateCategory(editingId.value, { name: editName.value, colorToken: editColor.value });
      if (!result.ok) { error.value = result.error; return; }
      editingId.value = null;
    }

    function cancelEdit() {
      editingId.value = null;
      error.value     = '';
    }

    function requestDelete(id) {
      error.value          = '';
      deleteConfirmId.value = id;
      reassignTo.value      = '';
    }

    function confirmDelete() {
      error.value = '';
      const result = St.deleteCategory(deleteConfirmId.value, reassignTo.value || undefined);
      if (!result.ok) {
        if (result.usedCount) {
          // Show reassignment UI — already visible
        }
        error.value = result.error;
        return;
      }
      deleteConfirmId.value = null;
    }

    function cancelDelete() {
      deleteConfirmId.value = null;
      reassignTo.value = '';
      error.value = '';
    }

    const reassignOptions = Vue.computed(() =>
      categories.value.filter(c => c.id !== deleteConfirmId.value)
    );

    return {
      U, St,
      COLOR_TOKENS, categories, usageCount,
      newName, newColor, addCategory,
      editingId, editName, editColor, startEdit, saveEdit, cancelEdit,
      error,
      deleteConfirmId, reassignTo, reassignOptions,
      requestDelete, confirmDelete, cancelDelete,
    };
  },
  template: `
    <div class="space-y-4">
      <!-- Error -->
      <div v-if="error" class="bg-urgent-soft text-urgent text-sm px-3 py-2 rounded-md">{{ error }}</div>

      <!-- Delete confirmation with reassignment -->
      <div v-if="deleteConfirmId"
        class="bg-warn-soft border border-warn rounded-md px-4 py-3 space-y-3">
        <p class="text-sm font-medium text-ink">Hapus kategori ini?</p>
        <div v-if="St.state.events.some(e => e.categoryId === deleteConfirmId)">
          <label class="text-xs text-ink-3 block mb-1">Pindahkan agenda ke kategori:</label>
          <select v-model="reassignTo"
            class="w-full bg-surface border border-border rounded-md px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent">
            <option value="">-- Pilih kategori tujuan --</option>
            <option v-for="cat in reassignOptions" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
        </div>
        <div class="flex gap-2">
          <button @click="confirmDelete"
            class="px-3 py-1.5 rounded-md text-sm bg-urgent text-accent-ink hover:opacity-90 transition-opacity">Hapus</button>
          <button @click="cancelDelete"
            class="px-3 py-1.5 rounded-md text-sm text-ink-2 hover:bg-surface-2 transition-colors">Batal</button>
        </div>
      </div>

      <!-- Category list -->
      <div class="space-y-2">
        <div v-for="cat in categories" :key="cat.id"
          class="flex items-center gap-3 bg-surface-2 px-3 py-2.5 rounded-md">

          <!-- Color dot -->
          <span class="w-3 h-3 rounded-full shrink-0 mt-0.5"
            :style="'background-color: var(--color-' + cat.colorToken + ')'"></span>

          <!-- Edit mode -->
          <template v-if="editingId === cat.id">
            <input v-model="editName" type="text"
              class="flex-1 min-w-0 bg-surface border border-border rounded px-2 py-1 text-sm text-ink focus:outline-none focus:border-accent" />
            <div class="flex gap-1 flex-wrap">
              <button v-for="token in COLOR_TOKENS" :key="token"
                @click="editColor = token"
                class="w-5 h-5 rounded-full border-2 transition-all"
                :style="'background-color: var(--color-' + token + ')'"
                :class="editColor === token ? 'border-ink scale-110' : 'border-transparent'"
                :aria-label="'Pilih warna ' + token"></button>
            </div>
            <button @click="saveEdit" class="text-xs text-accent hover:underline shrink-0" aria-label="Simpan edit kategori">Simpan</button>
            <button @click="cancelEdit" class="text-xs text-ink-3 hover:text-ink shrink-0" aria-label="Batal edit">Batal</button>
          </template>

          <!-- View mode -->
          <template v-else>
            <span class="flex-1 min-w-0 text-sm text-ink truncate">
              {{ cat.name }}
              <span class="text-xs text-ink-4 ml-1">{{ usageCount(cat.id) > 0 ? '(' + usageCount(cat.id) + ')' : '' }}</span>
              <span v-if="cat.isDefault" class="text-xs text-ink-4 ml-1">(bawaan)</span>
            </span>
            <div class="flex gap-1.5 shrink-0">
              <button @click="startEdit(cat)"
                class="text-xs text-ink-3 hover:text-accent px-2 py-1 rounded transition-colors"
                :aria-label="'Edit kategori ' + cat.name">Edit</button>
              <button v-if="!cat.isDefault"
                @click="requestDelete(cat.id)"
                class="text-xs text-ink-3 hover:text-urgent px-2 py-1 rounded transition-colors"
                :aria-label="'Hapus kategori ' + cat.name">Hapus</button>
            </div>
          </template>
        </div>
      </div>

      <!-- Add new category -->
      <div class="border-t border-border pt-4">
        <p class="text-xs font-medium text-ink-3 mb-2">Tambah Kategori Baru</p>
        <div class="flex gap-2 items-center flex-wrap">
          <input v-model="newName" type="text" placeholder="Nama kategori"
            class="flex-1 min-w-0 bg-surface-2 border border-border rounded-md px-3 py-2 text-sm text-ink placeholder-ink-4 focus:outline-none focus:border-accent" />
          <div class="flex gap-1.5 flex-wrap">
            <button v-for="token in COLOR_TOKENS" :key="token"
              @click="newColor = token"
              class="w-5 h-5 rounded-full border-2 transition-all"
              :style="'background-color: var(--color-' + token + ')'"
              :class="newColor === token ? 'border-ink scale-110' : 'border-transparent'"
              :aria-label="'Pilih warna ' + token"></button>
          </div>
          <button @click="addCategory"
            class="px-3 py-2 rounded-md bg-accent text-accent-ink text-sm hover:bg-accent-hover transition-colors"
            aria-label="Tambah kategori baru">Tambah</button>
        </div>
      </div>
    </div>
  `,
};
