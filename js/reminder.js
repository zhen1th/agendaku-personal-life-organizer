// ==== js/reminder.js ====
// AgendaKu · Reminder Scheduler & Notification
// Responsibility: notification permission, scheduler, beep, snooze, fallback banner

window.AgendaKu = window.AgendaKu || {};

(function (ns) {
  const U  = ns.utils;
  const St = ns.store;

  let _schedulerTimer = null;
  let _audioCtx       = null;
  const _snoozed      = {}; // reminderKey → snoozed-until timestamp

  // ---- Audio context (lazy) --------------------------------------------------
  function getAudioCtx() {
    if (!_audioCtx) {
      try { _audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch { _audioCtx = null; }
    }
    return _audioCtx;
  }

  /**
   * Play a short attention beep via Web Audio API.
   */
  function beep() {
    const ctx = getAudioCtx();
    if (!ctx) return;
    try {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type            = 'sine';
      osc.frequency.value = 660;
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.55);
    } catch { /* ignore */ }
  }

  /**
   * Request notification permission.
   * @returns {Promise<boolean>} true if granted
   */
  async function enableNotifications() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied')  return false;
    const result = await Notification.requestPermission();
    const granted = result === 'granted';
    St.setSettings({ notificationEnabled: granted });
    return granted;
  }

  /**
   * Build a unique key for a reminder to prevent double-firing.
   * @param {object} ev
   * @param {object} reminder
   * @returns {string}
   */
  function reminderKey(ev, reminder) {
    return `${ev.id}::${reminder.id || reminder.minutes}`;
  }

  /**
   * Show a browser notification for an event.
   * Falls back to the in-app banner (toast) when notifications are unavailable.
   * @param {object} ev
   * @param {number} minutesBefore
   */
  function fireNotification(ev, minutesBefore) {
    const title = minutesBefore === 0
      ? `Sekarang: ${ev.title}`
      : `${minutesBefore} menit lagi: ${ev.title}`;
    const body  = [
      ev.location  ? `Lokasi: ${ev.location}`   : null,
      ev.dresscode ? `Dresscode: ${ev.dresscode}` : null,
    ].filter(Boolean).join(' | ') || '';

    beep();

    if (
      'Notification' in window &&
      Notification.permission === 'granted' &&
      St.state.settings.notificationEnabled
    ) {
      try {
        const n = new Notification(title, {
          body,
          tag:    `agendaku-${ev.id}-${minutesBefore}`,
          icon:   '',
          silent: false,
        });
        n.onclick = () => {
          window.focus();
          // Dispatch custom event so the app can open the detail
          window.dispatchEvent(new CustomEvent('agendaku:open-event', { detail: { id: ev.id } }));
          n.close();
        };
      } catch { /* fall through to toast */ }
    }

    // Always show in-app toast as fallback
    St.showToast(`${title}${body ? ' — ' + body : ''}`, 'reminder', null, 8000);
  }

  /**
   * Snooze a reminder: suppress the reminder key for 5 minutes.
   * @param {string} key
   */
  function snooze(key) {
    _snoozed[key] = Date.now() + 5 * 60 * 1000;
    St.showToast('Pengingat ditunda 5 menit.', 'info');
  }

  /**
   * Main scheduler: check all events for due reminders.
   */
  function checkReminders() {
    const now    = Date.now();
    const events = St.state.events;

    events.forEach(ev => {
      if (ev.done) return;

      const startMs  = U.toDate(ev.date, ev.startTime).getTime();
      const reminders = ev.reminders && ev.reminders.length
        ? ev.reminders
        : [{ id: ev.id + '-default', minutes: ev.reminderMinutes || 60, notified: ev.notified }];

      reminders.forEach(r => {
        if (r.notified) return;
        const fireAt = startMs - (r.minutes * 60000);
        const key    = reminderKey(ev, r);

        // Check snooze
        if (_snoozed[key] && now < _snoozed[key]) return;

        // Fire window: between fireAt and fireAt + 90 seconds
        if (now >= fireAt && now < fireAt + 90000) {
          r.notified = true;
          if (!ev.reminders) ev.notified = true; // legacy
          St.save();
          fireNotification(ev, r.minutes);
        }
      });
    });
  }

  /**
   * Start the reminder scheduler (every 30 seconds).
   */
  function startScheduler() {
    if (_schedulerTimer) return;
    checkReminders(); // run immediately
    _schedulerTimer = setInterval(checkReminders, 30000);
  }

  /**
   * Stop the scheduler.
   */
  function stopScheduler() {
    if (_schedulerTimer) {
      clearInterval(_schedulerTimer);
      _schedulerTimer = null;
    }
  }

  // ---- Public API ------------------------------------------------------------
  ns.reminder = {
    enableNotifications,
    checkReminders,
    startScheduler,
    stopScheduler,
    fireNotification,
    beep,
    snooze,
    reminderKey,
  };

})(window.AgendaKu);
