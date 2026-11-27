// Native extras for the Android app (Capacitor). In the browser/PWA every function here
// quietly does nothing (or falls back), so the same files run in both places.
//   • Daily watering reminders: scheduled on the phone itself, no server needed.
//   • Backups and the sitter's plan go through Android's share sheet.
//   • The Android back button closes sheets before leaving the app.
(function () {
  const Cap = window.Capacitor;
  const isApp = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
  const P = isApp ? Cap.Plugins : {};
  const LN = P.LocalNotifications;
  const W = Watering;

  const DAYS_AHEAD = 21; // reminders are planned three weeks ahead and redone on every change
  const BASE_ID = 1000;  // notification ids BASE_ID .. BASE_ID + DAYS_AHEAD - 1 belong to us
  const CHANNEL = 'watering';

  const names = (list) => (list.length <= 2 ? list.join(' and ') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`);

  function onHoliday(h, iso) { return !!h && iso >= h.start && iso <= h.end; }

  /** The reminders we'd want, given today's data: one per day that has plants due. */
  function planReminders() {
    const r = Store.reminders();
    const h = Store.holiday();
    const plants = Store.plants();
    const now = new Date();
    const out = [];
    for (let i = 0; i < DAYS_AHEAD; i++) {
      const day = W.addDays(W.today(), i);
      if (onHoliday(h, day)) continue; // the plant-sitter has it covered
      const due = plants.filter((p) => { const k = W.status(p, day).kind; return k === 'due' || k === 'overdue'; });
      if (!due.length) continue;
      const at = new Date(`${day}T${r.time || '08:00'}:00`);
      if (at <= now) continue;
      const overdue = due.filter((p) => W.status(p, day).kind === 'overdue');
      const shown = due.slice(0, 4).map((p) => p.name);
      const more = due.length - shown.length;
      out.push({
        id: BASE_ID + i,
        channelId: CHANNEL,
        title: due.length === 1 ? `💧 ${due[0].name} needs water today` : `💧 ${due.length} plants need water today`,
        body: (due.length === 1 ? 'Give the soil a quick check first.' : names(more > 0 ? [...shown, `${more} more`] : shown))
          + (overdue.length ? ` · ${overdue.length === 1 ? `${overdue[0].name} is` : `${overdue.length} are`} overdue` : ''),
        // A daily nudge doesn't need to-the-minute timing. Inexact alarms avoid Android's
        // "Alarms & reminders" permission screen (and Play's restrictions on exact alarms).
        schedule: { at, allowWhileIdle: true },
        isExactNotification: false,
        smallIcon: 'ic_stat_plant',
        iconColor: '#F28C28',
      });
    }
    return out;
  }

  let channelReady = false;
  async function ensureChannel() {
    if (channelReady) return;
    try {
      await LN.createChannel({ id: CHANNEL, name: 'Watering reminders', description: 'A daily nudge when plants need water', importance: 4, vibration: true });
    } catch (e) { /* older Android: channels not needed */ }
    channelReady = true;
  }

  async function permission(ask) {
    let p = await LN.checkPermissions();
    if (p.display === 'prompt' || p.display === 'prompt-with-rationale') {
      if (!ask) return 'prompt';
      p = await LN.requestPermissions();
    }
    return p.display; // 'granted' | 'denied'
  }

  /** Cancel our pending reminders and schedule fresh ones. Safe to call often. */
  async function reschedule() {
    if (!isApp || !LN) return;
    try {
      const pending = await LN.getPending();
      const ours = pending.notifications.filter((n) => n.id >= BASE_ID && n.id < BASE_ID + DAYS_AHEAD).map((n) => ({ id: n.id }));
      if (ours.length) await LN.cancel({ notifications: ours });
      if (!Store.reminders().on) return;
      if ((await permission(false)) !== 'granted') return;
      await ensureChannel();
      const list = planReminders();
      if (list.length) await LN.schedule({ notifications: list });
    } catch (e) { console.warn('Reminder scheduling failed', e); }
  }

  let timer = null;
  function rescheduleSoon() { clearTimeout(timer); timer = setTimeout(reschedule, 400); }

  /** Turn reminders on (asking Android for permission) or off. Returns a status string. */
  async function setReminders(on) {
    if (!isApp) return 'unavailable';
    if (on) {
      const p = await permission(true);
      if (p !== 'granted') { Store.setReminders({ on: false }); return 'denied'; }
    }
    Store.setReminders({ on });
    await reschedule();
    return on ? 'on' : 'off';
  }

  /** One line for Settings, worked out from the same plan that gets scheduled. */
  function reminderSummary() {
    const next = planReminders()[0];
    if (!next) return 'No plants due in the next three weeks.';
    const day = W.toIso(next.schedule.at);
    return `Next reminder: ${W.friendly(day)} at ${Store.reminders().time}.`;
  }

  // ----- sharing -----
  async function shareText(title, text) {
    if (isApp && P.Share) { await P.Share.share({ title, text, dialogTitle: title }); return true; }
    if (navigator.share) { await navigator.share({ title, text }); return true; }
    return false;
  }

  /** App: write the backup to a temporary file and open the share sheet (Drive, Files, email…). */
  async function shareBackupFile(fileName, json) {
    const { uri } = await P.Filesystem.writeFile({ path: fileName, data: json, directory: 'CACHE', encoding: 'utf8' });
    await P.Share.share({ title: 'Plant Pals backup', files: [uri], dialogTitle: 'Save your Plant Pals backup' });
  }

  /** The installed app's version name, e.g. "1.2.0" (app only). */
  async function appVersion() {
    try { return isApp && P.App ? (await P.App.getInfo()).version : ''; } catch (e) { return ''; }
  }

  // ----- Android back button -----
  function onBack(handler) {
    if (isApp && P.App) P.App.addListener('backButton', () => { if (!handler()) P.App.exitApp(); });
  }

  // Re-plan reminders whenever data changes, and when the app comes back to the front.
  if (isApp) {
    Store.subscribe(rescheduleSoon);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) rescheduleSoon(); });
    rescheduleSoon();
  }

  window.Native = { isApp, setReminders, reminderSummary, permission: () => (isApp ? permission(false) : Promise.resolve('unavailable')), planReminders, reschedule, shareText, shareBackupFile, onBack, appVersion };
})();
