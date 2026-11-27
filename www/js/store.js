// Local data store: everything lives in localStorage on this device.
// Shape (v2):
//   { version: 2,
//     settings: { seasonMode: 'auto'|'spring'|'summer'|'autumn'|'winter', appliedSeason },
//     rooms: [{id,name,emoji}],
//     plants: [{id,name,detail,species,roomId,placement,
//               schedule: {spring:{min,max}, summer:{…}, autumn:{…}, winter:{…}},
//               waterType,notes,lastWatered,nextDue,history:[iso dates, newest first]}] }
(function () {
  const KEY = 'plantPals.data.v2';
  const OLD_KEYS = ['plantPals.data.v1'];
  const VERSION = 2;
  const HISTORY_LIMIT = 60;

  let memoryFallback = null; // used if localStorage is blocked (private mode etc.)

  /** Fill in any fields added since a plant was created (safe to run repeatedly). */
  function upgradePlant(p, scheduleStart) {
    if (!p.id) p.id = newId('p');
    if (p.species === undefined) p.species = Catalog.guess(p.name, p.detail);
    if (!p.schedule) p.schedule = Catalog.schedule(p.species, p.minDays, p.maxDays); // old single range = winter
    if (!p.waterMethod) p.waterMethod = Catalog.defaultMethod(p.species);
    if (!p.light) p.light = Catalog.defaultLight(p.species);
    delete p.minDays; delete p.maxDays; delete p.frequencyLabel;
    if (!Array.isArray(p.history)) p.history = [];
    if (p.lastWatered === undefined) p.lastWatered = null;
    if (!p.nextDue) {
      p.nextDue = Watering.nextFromRota(scheduleStart, p.scheduleDays)
        || Watering.dueAfter(p, p.lastWatered || Watering.today());
    }
    delete p.scheduleDays;
    delete p.avatar;
    return p;
  }

  const effectiveSeason = (d) => (d.settings.seasonMode === 'auto' ? Watering.seasonForDate() : d.settings.seasonMode);

  /** Bring stored or imported data up to the current shape. */
  function prepare(d, scheduleStart) {
    d.version = VERSION;
    d.settings = {
      seasonMode: 'auto', appliedSeason: null,
      backupBaseline: Watering.today(), // backup reminders count from here until the first file backup
      lastFileBackup: null, backupSnoozeUntil: null,
      holiday: null, // { start, end, days: [weekday numbers 0=Sun] }
      reminders: { on: false, time: '08:00' }, // daily notification (Android app only)
      showWaterType: true, // show rain/tap water on cards, rows and the sitter's plan
      ...(d.settings || {}),
    };
    Watering.setSeason(effectiveSeason(d));
    d.plants.forEach((p) => upgradePlant(p, scheduleStart));
    return d;
  }

  function freshEmpty() {
    return prepare({ rooms: [], plants: [] });
  }

  function readKey(key) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }

  function load() {
    const current = readKey(KEY);
    if (current) return prepare(current);
    for (const old of OLD_KEYS) {
      const legacy = readKey(old);
      if (legacy) return prepare(legacy);
    }
    return memoryFallback || freshEmpty();
  }

  let data = load();

  /**
   * Make the active season match the setting. If the season changed since last time,
   * re-base next-due dates on the new season's interval. Returns true if it changed.
   */
  function syncSeason() {
    const s = effectiveSeason(data);
    Watering.setSeason(s);
    const changed = data.settings.appliedSeason !== s;
    if (changed && data.settings.appliedSeason) {
      data.plants.forEach((p) => { if (p.lastWatered) p.nextDue = Watering.dueAfter(p, p.lastWatered); });
    }
    data.settings.appliedSeason = s;
    return changed;
  }

  function save() {
    memoryFallback = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* in-memory only */ }
  }
  // ----- automatic in-app snapshots -----
  // Kept in a separate localStorage key on this device. They protect against mistakes
  // (clear all, a bad import) — not against uninstalling, which is what file backups are for.
  const SNAP_KEY = 'plantPals.snapshots.v1';
  const BACKUP_EVERY_DAYS = 30;
  function readSnaps() { const s = readKey(SNAP_KEY); return Array.isArray(s) ? s : []; }
  function takeSnapshot(reason) {
    if (!data.plants.length) return;
    const list = [{ date: Watering.today(), reason, plants: data.plants.length, data: JSON.parse(JSON.stringify(data)) }, ...readSnaps()];
    const autos = list.filter((s) => s.reason === 'auto').slice(0, 3);
    const safety = list.filter((s) => s.reason !== 'auto').slice(0, 3);
    const keep = [...autos, ...safety].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    try { localStorage.setItem(SNAP_KEY, JSON.stringify(keep)); } catch (e) { /* storage full or blocked */ }
  }
  function autoSnapshot() {
    const lastAuto = readSnaps().find((s) => s.reason === 'auto');
    if (data.plants.length && (!lastAuto || Watering.diffDays(lastAuto.date, Watering.today()) >= BACKUP_EVERY_DAYS)) takeSnapshot('auto');
  }
  /** Before the trip starts, changes you make in the app (watering, undo) update the holiday plan. */
  function syncBaseline(p) {
    const h = data.settings.holiday;
    if (h && h.baseline && Watering.diffDays(Watering.today(), h.start) >= 0) h.baseline[p.id] = p.nextDue;
  }
  const seasonOn = (iso) => (data.settings.seasonMode === 'auto' ? Watering.seasonForDate(iso) : data.settings.seasonMode);

  syncSeason();
  save();
  autoSnapshot();

  function newId(prefix) {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const listeners = new Set();
  function commit() { save(); listeners.forEach((fn) => fn()); }

  const snapshot = (p) => ({ lastWatered: p.lastWatered, nextDue: p.nextDue, history: [...p.history] });

  window.Store = {
    subscribe(fn) { listeners.add(fn); },

    rooms() { return data.rooms; },
    plants() { return data.plants; },
    room(id) { return data.rooms.find((r) => r.id === id) || null; },
    plant(id) { return data.plants.find((p) => p.id === id) || null; },
    plantsInRoom(roomId) { return data.plants.filter((p) => (p.roomId || null) === roomId); },

    // ----- seasons -----
    seasonMode() { return data.settings.seasonMode; },
    /** 'auto' follows the calendar; or pin 'spring' | 'summer' | 'autumn' | 'winter'. */
    setSeasonMode(mode) { data.settings.seasonMode = mode; syncSeason(); commit(); },
    /** Call when the app regains focus: picks up a calendar season change. */
    refreshSeason() { autoSnapshot(); if (syncSeason()) commit(); },
    /** Season that applies on a given date (respects a pinned season). */
    seasonOn,

    // ----- backups -----
    backupInfo() {
      const s = data.settings, today = Watering.today();
      const since = s.lastFileBackup || s.backupBaseline || today;
      const snoozed = s.backupSnoozeUntil && Watering.diffDays(today, s.backupSnoozeUntil) > 0;
      return {
        lastFile: s.lastFileBackup,
        daysSince: Watering.diffDays(since, today),
        due: data.plants.length > 0 && Watering.diffDays(since, today) >= BACKUP_EVERY_DAYS && !snoozed,
        snapshots: readSnaps().map(({ date, reason, plants }) => ({ date, reason, plants })),
      };
    },
    markFileBackup() { data.settings.lastFileBackup = Watering.today(); data.settings.backupSnoozeUntil = null; commit(); },
    snoozeBackup(days = 7) { data.settings.backupSnoozeUntil = Watering.addDays(Watering.today(), days); commit(); },
    restoreSnapshot(index) {
      const snap = readSnaps()[index];
      if (!snap) throw new Error('That snapshot no longer exists.');
      return this.importJson(JSON.stringify(snap.data));
    },

    // ----- holiday mode -----
    holiday() { return data.settings.holiday; },
    // ----- reminders (used by the Android app) -----
    reminders() { return data.settings.reminders; },
    showWaterType() { return data.settings.showWaterType !== false; },
    setShowWaterType(on) { data.settings.showWaterType = !!on; commit(); },
    setReminders(patch) { data.settings.reminders = { ...data.settings.reminders, ...patch }; commit(); },
    /** Turn on / edit holiday mode. Freezes each plant's current due date for the plan. */
    setHoliday(h) {
      const baseline = { ...((data.settings.holiday && data.settings.holiday.baseline) || {}) };
      data.plants.forEach((p) => { if (!baseline[p.id]) baseline[p.id] = p.nextDue; });
      data.settings.holiday = { ...h, baseline };
      commit();
    },
    holidayPlan() { const h = data.settings.holiday; return h ? Watering.planHoliday(data.plants, h, seasonOn) : null; },
    /** Finish holiday mode. If `applyVisits`, record the sitter's planned waterings in each plant's history. */
    endHoliday(applyVisits) {
      const plan = this.holidayPlan();
      if (applyVisits && plan) {
        plan.stops.filter((s) => s.who === 'sitter').forEach((stop) => stop.items.forEach(({ plant }) => {
          const p = this.plant(plant.id);
          if (!p) return;
          if (!p.history.includes(stop.date)) { p.history.push(stop.date); p.history.sort().reverse(); }
          if (!p.lastWatered || stop.date > p.lastWatered) {
            p.lastWatered = stop.date;
            p.nextDue = Watering.addDays(stop.date, Watering.interval(p, seasonOn(stop.date)).min);
          }
        }));
      }
      data.settings.holiday = null;
      commit();
    },

    addRoom({ name, emoji }) {
      const room = { id: newId('r'), name: name.trim(), emoji: emoji || '🪴' };
      data.rooms.push(room);
      commit();
      return room;
    },
    updateRoom(id, changes) {
      Object.assign(this.room(id), changes);
      commit();
    },
    deleteRoom(id) {
      data.rooms = data.rooms.filter((r) => r.id !== id);
      data.plants.forEach((p) => { if (p.roomId === id) p.roomId = null; });
      commit();
    },

    addPlant(fields) {
      const plant = upgradePlant({ id: newId('p'), lastWatered: null, history: [], ...fields });
      data.plants.push(plant);
      commit();
      return plant;
    },
    updatePlant(id, changes) {
      Object.assign(this.plant(id), changes);
      commit();
    },
    deletePlant(id) {
      data.plants = data.plants.filter((p) => p.id !== id);
      commit();
    },

    // ----- watering -----
    /** Mark plants watered on `iso` (default today). Returns snapshots for undo. */
    water(ids, iso = Watering.today()) {
      const undo = [];
      [].concat(ids).forEach((id) => {
        const p = this.plant(id);
        if (!p) return;
        undo.push({ id, before: snapshot(p) });
        p.lastWatered = iso;
        p.nextDue = Watering.dueAfter(p, iso);
        if (p.history[0] !== iso) p.history.unshift(iso);
        p.history.sort().reverse();
        p.history = p.history.slice(0, HISTORY_LIMIT);
        syncBaseline(p);
      });
      commit();
      return undo;
    },
    /** Soil still damp? Push the due date back. */
    snooze(id, days = 1) {
      const p = this.plant(id);
      const undo = [{ id, before: snapshot(p) }];
      p.nextDue = Watering.addDays(Watering.today(), days);
      commit();
      return undo;
    },
    restore(undo) {
      undo.forEach(({ id, before }) => { const p = this.plant(id); if (p) { Object.assign(p, before); syncBaseline(p); } });
      commit();
    },

    exportJson() { return JSON.stringify({ app: 'plant-pals', ...data }, null, 2); },

    /**
     * Replace everything with the contents of a backup / import file.
     * Accepts app exports, older versions, and rota imports (which carry
     * scheduleStart + per-plant scheduleDays to set first due dates).
     * Throws a friendly Error if the file isn't recognisable.
     */
    importJson(text) {
      let d;
      try { d = JSON.parse(text); } catch (e) { throw new Error('That file isn’t valid JSON.'); }
      if (!d || !Array.isArray(d.plants) || !Array.isArray(d.rooms)) throw new Error('That doesn’t look like a Plant Pals backup.');
      const plants = d.plants.filter((p) => p && typeof p.name === 'string' && p.name.trim());
      const rooms = d.rooms.filter((r) => r && r.id && typeof r.name === 'string');
      const mode = data.settings.seasonMode;
      takeSnapshot('before import');
      const keep = data.settings; // backup bookkeeping belongs to this device, not the file
      data = prepare({
        settings: {
          ...(d.settings || {}), seasonMode: (d.settings && d.settings.seasonMode) || mode, appliedSeason: null,
          lastFileBackup: keep.lastFileBackup, reminders: keep.reminders, backupBaseline: Watering.today(), backupSnoozeUntil: null,
        },
        rooms, plants,
      }, d.scheduleStart);
      syncSeason();
      commit();
      return { rooms: rooms.length, plants: plants.length };
    },

    /** Remove every plant (rooms and settings are kept). */
    clearPlants() {
      takeSnapshot('before clearing');
      data.plants = [];
      commit();
    },
  };
})();
