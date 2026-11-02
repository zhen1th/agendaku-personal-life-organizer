// ==== js/utils/format.js ====
// AgendaKu · Formatting & ICS Escape Utilities
// Responsibility: string formatting, ICS text escaping, slug, category color map

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.utils = window.AgendaKu.utils || {};

(function (U) {

  /**
   * Escape HTML special characters.
   * @param {string} str
   * @returns {string}
   */
  U.esc = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /**
   * Escape a string for ICS content (RFC 5545).
   * @param {string} str
   * @returns {string}
   */
  U.escapeICS = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  /**
   * Slugify a string: lowercase, spaces to hyphens, strip special chars.
   * @param {string} str
   * @returns {string}
   */
  U.slug = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\-]/g, '')
      .replace(/-+/g, '-')
      .trim();
  };

  /**
   * Format a time string HH:mm for display (returns same, kept for consistency).
   * @param {string} t
   * @returns {string}
   */
  U.formatTime = (t) => t || '';

  /**
   * Format time range "08:00 – 10:00" or just "08:00" if no end.
   * @param {string} start
   * @param {string} end
   * @returns {string}
   */
  U.formatTimeRange = (start, end) => {
    if (!start) return '';
    return end ? `${start} \u2013 ${end}` : start;
  };

  /**
   * Format a reminder minutes value to a human label.
   * @param {number} mins
   * @returns {string}
   */
  U.formatReminderLabel = (mins) => {
    if (!mins && mins !== 0) return 'Tidak ada';
    if (mins === 0) return 'Saat acara';
    const days  = Math.floor(mins / 1440);
    const hours = Math.floor((mins % 1440) / 60);
    const rem   = mins % 60;
    const parts = [];
    if (days  > 0) parts.push(`${days} hari`);
    if (hours > 0) parts.push(`${hours} jam`);
    if (rem   > 0) parts.push(`${rem} menit`);
    return parts.join(' ') + ' sebelum';
  };

  /**
   * Explicit category colorToken → Tailwind utility class map.
   * Used to apply badge colors from design tokens without dynamic class names.
   * @type {Object<string, {text: string, bg: string, dot: string}>}
   */
  U.CAT_COLOR_MAP = {
    'category-1': { text: 'cat-token-category-1', bg: 'cat-token-bg-category-1', dotVar: '--color-category-1' },
    'category-2': { text: 'cat-token-category-2', bg: 'cat-token-bg-category-2', dotVar: '--color-category-2' },
    'category-3': { text: 'cat-token-category-3', bg: 'cat-token-bg-category-3', dotVar: '--color-category-3' },
    'category-4': { text: 'cat-token-category-4', bg: 'cat-token-bg-category-4', dotVar: '--color-category-4' },
    'category-5': { text: 'cat-token-category-5', bg: 'cat-token-bg-category-5', dotVar: '--color-category-5' },
    'category-6': { text: 'cat-token-category-6', bg: 'cat-token-bg-category-6', dotVar: '--color-category-6' },
    'category-7': { text: 'cat-token-category-7', bg: 'cat-token-bg-category-7', dotVar: '--color-category-7' },
    'category-8': { text: 'cat-token-category-8', bg: 'cat-token-bg-category-8', dotVar: '--color-category-8' },
  };

  /**
   * Get color classes for a colorToken, defaulting to category-1 if unknown.
   * @param {string} colorToken
   * @returns {{ text: string, bg: string, dotVar: string }}
   */
  U.getCatColors = (colorToken) => {
    return U.CAT_COLOR_MAP[colorToken] || U.CAT_COLOR_MAP['category-1'];
  };

  /**
   * Get a CSS variable value string for inline styles (e.g. dot markers).
   * @param {string} colorToken
   * @returns {string}
   */
  U.getCatDotStyle = (colorToken) => {
    const map = U.CAT_COLOR_MAP[colorToken] || U.CAT_COLOR_MAP['category-1'];
    return `background-color: var(${map.dotVar})`;
  };

  /**
   * Build a display label for items summary: "3 barang (1 belum siap)"
   * @param {Array<{name:string,packed:boolean}>} items
   * @returns {string}
   */
  U.itemsSummary = (items) => {
    if (!items || items.length === 0) return '';
    const total   = items.length;
    const notDone = items.filter(i => !i.packed).length;
    if (notDone === 0) return `${total} barang (siap)`;
    return `${total} barang (${notDone} belum siap)`;
  };

  /**
   * Truncate text to maxLen chars, appending ellipsis.
   * @param {string} str
   * @param {number} maxLen
   * @returns {string}
   */
  U.truncate = (str, maxLen = 80) => {
    if (!str) return '';
    return str.length > maxLen ? str.slice(0, maxLen) + '\u2026' : str;
  };

})(window.AgendaKu.utils);
