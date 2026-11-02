// ==== js/utils/helpers.js ====
// AgendaKu · General Helpers
// Responsibility: uid, DOM query alias, keyboard shortcuts, misc helpers

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.utils = window.AgendaKu.utils || {};

(function (U) {

  /**
   * Simple DOM query alias.
   * @param {string} selector
   * @param {Element} [ctx=document]
   * @returns {Element|null}
   */
  U.$ = (selector, ctx = document) => ctx.querySelector(selector);

  /**
   * Generate a short unique id.
   * @returns {string}
   */
  U.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  /**
   * Deep clone a plain object via JSON round-trip.
   * @param {*} obj
   * @returns {*}
   */
  U.clone = (obj) => JSON.parse(JSON.stringify(obj));

  /**
   * Debounce a function.
   * @param {Function} fn
   * @param {number} delay
   * @returns {Function}
   */
  U.debounce = (fn, delay = 300) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), delay);
    };
  };

  /**
   * Register a global keyboard shortcut handler.
   * Calls callback(key, event) when the key matches and no input is focused.
   * @param {string} key  lowercase key name, e.g. 'n', '/', 'escape'
   * @param {Function} callback
   * @param {object} [options]
   * @param {boolean} [options.allowInInput]  also fire when an input/textarea is focused
   */
  U.registerShortcut = (key, callback, options = {}) => {
    document.addEventListener('keydown', (e) => {
      if (!options.allowInInput) {
        const tag = (e.target.tagName || '').toLowerCase();
        if (tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable) {
          // Allow Escape even inside inputs for closing modals
          if (key !== 'escape') return;
        }
      }
      if (e.key.toLowerCase() === key.toLowerCase()) {
        callback(key, e);
      }
    });
  };

  /**
   * Check if any modal/overlay is visually open (used by shortcut guards).
   * Relies on a data attribute set by the app.
   * @returns {boolean}
   */
  U.isModalOpen = () => !!document.querySelector('[data-modal-open="true"]');

  /**
   * Safely parse JSON, returning fallback on error.
   * @param {string} str
   * @param {*} fallback
   * @returns {*}
   */
  U.safeJSON = (str, fallback = null) => {
    try { return JSON.parse(str); }
    catch { return fallback; }
  };

  /**
   * Return a display-friendly tag list string from an array.
   * @param {string[]} tags
   * @returns {string}
   */
  U.formatTags = (tags) => {
    if (!Array.isArray(tags) || tags.length === 0) return '';
    return tags.map(t => `#${t}`).join(' ');
  };

  /**
   * Normalize a tag string: lowercase, no spaces, no special chars.
   * @param {string} tag
   * @returns {string}
   */
  U.normalizeTag = (tag) => {
    return tag.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
  };

  /**
   * Validate an event import JSON schema (minimal).
   * Returns { valid: boolean, error: string }
   * @param {*} obj
   * @returns {{ valid: boolean, error: string }}
   */
  U.validateImport = (obj) => {
    if (!obj || typeof obj !== 'object') return { valid: false, error: 'Data bukan objek JSON yang valid.' };
    if (!Array.isArray(obj.events))      return { valid: false, error: 'Field "events" tidak ditemukan atau bukan array.' };
    if (!obj.settings || typeof obj.settings !== 'object') return { valid: false, error: 'Field "settings" tidak ditemukan.' };
    if (!Array.isArray(obj.settings.categories)) return { valid: false, error: 'settings.categories bukan array.' };
    return { valid: true, error: '' };
  };

})(window.AgendaKu.utils);
