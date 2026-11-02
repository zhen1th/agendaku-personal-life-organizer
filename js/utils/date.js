// ==== js/utils/date.js ====
// AgendaKu · Date & Time Utilities
// Responsibility: parsing, formatting dates/times, countdown, month grid

window.AgendaKu = window.AgendaKu || {};
window.AgendaKu.utils = window.AgendaKu.utils || {};

(function (U) {

  /**
   * Zero-pad a number to 2 digits.
   * @param {number} n
   * @returns {string}
   */
  U.pad = (n) => String(n).padStart(2, '0');

  /**
   * Get today's date string YYYY-MM-DD in local time.
   * @returns {string}
   */
  U.todayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  };

  /**
   * Get tomorrow's date string YYYY-MM-DD in local time.
   * @returns {string}
   */
  U.tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${U.pad(d.getMonth() + 1)}-${U.pad(d.getDate())}`;
  };

  /**
   * Convert YYYY-MM-DD + HH:mm to a local Date object.
   * @param {string} dateStr
   * @param {string} timeStr
   * @returns {Date}
   */
  U.toDate = (dateStr, timeStr) => {
    const [y, mo, d] = dateStr.split('-').map(Number);
    const [h, m] = (timeStr || '00:00').split(':').map(Number);
    return new Date(y, mo - 1, d, h, m, 0, 0);
  };

  /**
   * Format a date string YYYY-MM-DD to a localized human-readable string.
   * @param {string} dateStr
   * @returns {string}
   */
  U.formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = U.toDate(dateStr, '00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  /**
   * Format a date string short: "Sen, 4 Nov 2024"
   * @param {string} dateStr
   * @returns {string}
   */
  U.formatDateShort = (dateStr) => {
    if (!dateStr) return '';
    const d = U.toDate(dateStr, '00:00');
    return d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  /**
   * Format month + year: "November 2024"
   * @param {number} year
   * @param {number} month  0-based
   * @returns {string}
   */
  U.formatMonth = (year, month) => {
    const d = new Date(year, month, 1);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  };

  /**
   * Compute a countdown string from now to a target Date.
   * Returns a short human-readable label.
   * @param {Date} target
   * @returns {{ label: string, urgent: boolean, past: boolean }}
   */
  U.countdown = (target) => {
    const now = Date.now();
    const diff = target.getTime() - now;
    if (diff <= 0) return { label: 'Selesai', urgent: false, past: true };
    const mins  = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days  = Math.floor(hours / 24);
    let label;
    if (days > 0)       label = `${days}h ${hours % 24}j lagi`;
    else if (hours > 0) label = `${hours}j ${mins % 60}m lagi`;
    else                label = `${mins}m lagi`;
    return { label, urgent: diff <= 3600000, past: false };
  };

  /**
   * Build a month grid for the mini calendar.
   * Returns an array of week arrays; each cell is { day, dateStr, inMonth }.
   * @param {number} year
   * @param {number} month  0-based
   * @returns {Array<Array<{day:number, dateStr:string, inMonth:boolean}>>}
   */
  U.getMonthGrid = (year, month) => {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    // Week starts Monday (1); adjust so Monday=0
    const startDow = (first.getDay() + 6) % 7;
    const totalDays = last.getDate();
    const cells = [];

    // Fill leading days from previous month
    const prevLast = new Date(year, month, 0);
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLast.getDate() - i;
      const m = month - 1 < 0 ? 11 : month - 1;
      const y = month - 1 < 0 ? year - 1 : year;
      cells.push({ day: d, dateStr: `${y}-${U.pad(m + 1)}-${U.pad(d)}`, inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      cells.push({ day: d, dateStr: `${year}-${U.pad(month + 1)}-${U.pad(d)}`, inMonth: true });
    }

    // Fill trailing days
    const remaining = 7 - (cells.length % 7);
    if (remaining < 7) {
      const nm = month + 1 > 11 ? 0 : month + 1;
      const ny = month + 1 > 11 ? year + 1 : year;
      for (let d = 1; d <= remaining; d++) {
        cells.push({ day: d, dateStr: `${ny}-${U.pad(nm + 1)}-${U.pad(d)}`, inMonth: false });
      }
    }

    // Split into weeks
    const weeks = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    return weeks;
  };

  /**
   * Convert local Date to a UTC timestamp string for ICS: YYYYMMDDTHHMMSSZ
   * @param {Date} d
   * @returns {string}
   */
  U.toUTCStamp = (d) => {
    return d.getUTCFullYear()
      + U.pad(d.getUTCMonth() + 1)
      + U.pad(d.getUTCDate())
      + 'T'
      + U.pad(d.getUTCHours())
      + U.pad(d.getUTCMinutes())
      + U.pad(d.getUTCSeconds())
      + 'Z';
  };

  /**
   * Returns the set of dateStr values for a list of events.
   * @param {Array} events
   * @returns {Set<string>}
   */
  U.eventDatesSet = (events) => new Set(events.map(e => e.date));

  /**
   * Detect if two agenda time ranges overlap.
   * Both must have date, startTime; endTime is optional (treated as +1h).
   * @param {object} a
   * @param {object} b
   * @returns {boolean}
   */
  U.detectOverlap = (a, b) => {
    if (a.date !== b.date) return false;
    const aStart = U.toDate(a.date, a.startTime).getTime();
    const aEnd   = a.endTime
      ? U.toDate(a.date, a.endTime).getTime()
      : aStart + 3600000;
    const bStart = U.toDate(b.date, b.startTime).getTime();
    const bEnd   = b.endTime
      ? U.toDate(b.date, b.endTime).getTime()
      : bStart + 3600000;
    return aStart < bEnd && bStart < aEnd;
  };

})(window.AgendaKu.utils);
