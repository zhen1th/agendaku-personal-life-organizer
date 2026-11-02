// ==== js/calendar.js ====
// AgendaKu · Calendar Integration & Data Export
// Responsibility: ICS build/download, Google Calendar URL, JSON export/import

window.AgendaKu = window.AgendaKu || {};

(function (ns) {
  const U  = ns.utils;
  const St = ns.store;

  /**
   * Build an ICS VEVENT string for a single event.
   * @param {object} ev
   * @returns {string}
   */
  function buildVEVENT(ev) {
    const start   = U.toDate(ev.date, ev.startTime);
    const end     = ev.endTime ? U.toDate(ev.date, ev.endTime) : new Date(start.getTime() + 3600000);
    const now     = new Date();
    const uid     = `${ev.id}@agendaku`;
    const created = U.toUTCStamp(new Date(ev.createdAt || Date.now()));
    const dtstamp = U.toUTCStamp(now);
    const dtstart = U.toUTCStamp(start);
    const dtend   = U.toUTCStamp(end);

    // Build description with all details
    const descParts = [];
    if (ev.dresscode) descParts.push(`Dresscode: ${ev.dresscode}`);
    if (ev.items && ev.items.length > 0) {
      descParts.push('Barang bawaan:');
      ev.items.forEach(i => {
        const qty   = i.quantity ? ` (x${i.quantity})` : '';
        const note  = i.description ? ` - ${i.description}` : '';
        const check = i.packed ? '[v]' : '[ ]';
        descParts.push(`  ${check} ${i.name}${qty}${note}`);
      });
    }
    if (ev.notes)       descParts.push(`Catatan: ${ev.notes}`);
    if (ev.contactName) descParts.push(`Kontak: ${ev.contactName}${ev.contactPhone ? ' ' + ev.contactPhone : ''}`);
    if (ev.linkUrl)     descParts.push(`Link: ${ev.linkUrl}`);
    if (ev.tags && ev.tags.length > 0) descParts.push(`Tag: ${ev.tags.join(', ')}`);
    const description = descParts.join('\\n');

    let ics = [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `CREATED:${created}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${U.escapeICS(ev.title)}`,
    ];
    if (ev.location) ics.push(`LOCATION:${U.escapeICS(ev.location)}`);
    if (description) ics.push(`DESCRIPTION:${description}`);
    if (ev.linkUrl)  ics.push(`URL:${ev.linkUrl}`);

    // Add reminder alarms
    const reminders = ev.reminders && ev.reminders.length
      ? ev.reminders
      : [{ minutes: ev.reminderMinutes || 60 }];
    reminders.forEach(r => {
      const mins = r.minutes || 60;
      ics.push(
        'BEGIN:VALARM',
        'ACTION:DISPLAY',
        `DESCRIPTION:Pengingat: ${U.escapeICS(ev.title)}`,
        `TRIGGER:-PT${mins}M`,
        'END:VALARM'
      );
    });

    ics.push('END:VEVENT');
    return ics.join('\r\n');
  }

  /**
   * Wrap VEVENT lines in a VCALENDAR envelope.
   * @param {string[]} vevents
   * @returns {string}
   */
  function wrapCalendar(vevents) {
    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//AgendaKu//AgendaKu//ID',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      ...vevents,
      'END:VCALENDAR',
    ].join('\r\n');
  }

  /**
   * Trigger a browser download for a text file.
   * @param {string} content
   * @param {string} filename
   * @param {string} [mime='text/calendar']
   */
  function triggerDownload(content, filename, mime = 'text/calendar;charset=utf-8') {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Download a .ics file for a single event.
   * @param {object} ev
   */
  function downloadICS(ev) {
    const content  = wrapCalendar([buildVEVENT(ev)]);
    const filename = `${U.slug(ev.title) || 'agenda'}.ics`;
    triggerDownload(content, filename);
  }

  /**
   * Download a .ics file for all events in a date range.
   * @param {object[]} events
   * @param {string} [rangeLabel='semua']
   */
  function downloadAllICS(events, rangeLabel = 'semua') {
    if (!events || events.length === 0) return;
    const vevents  = events.map(buildVEVENT);
    const content  = wrapCalendar(vevents);
    const filename = `agendaku-${rangeLabel}.ics`;
    triggerDownload(content, filename);
  }

  /**
   * Build a Google Calendar event URL for a single event.
   * @param {object} ev
   * @returns {string}
   */
  function gcalURL(ev) {
    const start   = U.toDate(ev.date, ev.startTime);
    const end     = ev.endTime ? U.toDate(ev.date, ev.endTime) : new Date(start.getTime() + 3600000);

    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const detailParts = [];
    if (ev.dresscode) detailParts.push(`Dresscode: ${ev.dresscode}`);
    if (ev.items && ev.items.length > 0) {
      ev.items.forEach(i => {
        const qty  = i.quantity ? ` (x${i.quantity})` : '';
        const note = i.description ? ` - ${i.description}` : '';
        detailParts.push(`- ${i.name}${qty}${note}`);
      });
    }
    if (ev.notes)       detailParts.push(ev.notes);
    if (ev.contactName) detailParts.push(`Kontak: ${ev.contactName}${ev.contactPhone ? ' ' + ev.contactPhone : ''}`);
    if (ev.linkUrl)     detailParts.push(ev.linkUrl);

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text:   ev.title,
      dates:  `${fmt(start)}/${fmt(end)}`,
    });
    if (ev.location)             params.set('location', ev.location);
    if (detailParts.length > 0)  params.set('details', detailParts.join('\n'));

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  }

  /**
   * Export all application data (events + settings) as a JSON file.
   */
  function exportAllAsJSON() {
    const payload = {
      version:  2,
      exportedAt: new Date().toISOString(),
      events:   St.state.events,
      settings: St.state.settings,
    };
    const content  = JSON.stringify(payload, null, 2);
    const filename = `agendaku-backup-${new Date().toISOString().slice(0, 10)}.json`;
    triggerDownload(content, filename, 'application/json');
  }

  /**
   * Import application data from a parsed JSON object.
   * Validates schema before applying.
   * @param {object} parsed
   * @returns {{ ok: boolean, error: string }}
   */
  function importFromJSON(parsed) {
    const result = U.validateImport(parsed);
    if (!result.valid) return result;

    // Merge categories (keep defaults, add new ones)
    const incoming = parsed.settings.categories || [];
    const existing = St.state.settings.categories;
    const existingIds = new Set(existing.map(c => c.id));
    incoming.forEach(c => {
      if (!existingIds.has(c.id)) existing.push(c);
    });

    // Replace events
    St.state.events.splice(0, St.state.events.length, ...parsed.events.map(ev => {
      if (!ev.id) ev.id = U.uid();
      if (!ev.categoryId) ev.categoryId = 'cat-other';
      if (!Array.isArray(ev.tags))     ev.tags = [];
      if (!Array.isArray(ev.reminders)) ev.reminders = [{ id: U.uid(), minutes: ev.reminderMinutes || 60, notified: false }];
      return ev;
    }));

    // Merge select settings (don't override theme/density from import)
    if (parsed.settings.templates) {
      St.state.settings.templates = Object.assign({}, St.state.settings.templates, parsed.settings.templates);
    }

    St.save();
    return { ok: true, error: '' };
  }

  // ---- Public API ------------------------------------------------------------
  ns.calendar = {
    buildVEVENT,
    downloadICS,
    downloadAllICS,
    gcalURL,
    exportAllAsJSON,
    importFromJSON,
  };

})(window.AgendaKu);
