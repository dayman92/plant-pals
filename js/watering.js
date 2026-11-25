// Watering logic. Dates are local calendar days stored as 'YYYY-MM-DD' strings,
// which avoids time-zone/DST surprises.
//
// Each plant has a range per season, e.g. winter "every 7–10 days" (schedule.winter = {min, max}).
// For the active season:
//   - after watering, it's next due in minDays          -> nextDue
//   - from nextDue it's "due" for (maxDays - minDays) days (the "check the soil" window)
//   - after that window it's "overdue" (and looks thirsty)
(function () {
  const DAY = 86400000;

  function toIso(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function parse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(y, m - 1, d); }
  function today() { return toIso(new Date()); }
  function addDays(iso, n) { const d = parse(iso); d.setDate(d.getDate() + n); return toIso(d); }
  /** Whole days from a to b (b - a). */
  function diffDays(a, b) { return Math.round((parse(b) - parse(a)) / DAY); }

  // ----- seasons -----
  // UK meteorological seasons. Each plant stores a range per season in plant.schedule.
  const SEASONS = [
    { key: 'spring', name: 'Spring', emoji: '🌷', months: 'Mar–May' },
    { key: 'summer', name: 'Summer', emoji: '☀️', months: 'Jun–Aug' },
    { key: 'autumn', name: 'Autumn', emoji: '🍂', months: 'Sep–Nov' },
    { key: 'winter', name: 'Winter', emoji: '❄️', months: 'Dec–Feb' },
  ];
  function seasonForDate(iso) {
    const m = parse(iso || today()).getMonth();
    return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
  }
  let activeSeason = seasonForDate();

  /** Watering range for a plant in a season (defaults to the active season). */
  function interval(plant, season = activeSeason) {
    const s = plant.schedule && plant.schedule[season];
    const min = (s && (s.min || s.max)) || plant.minDays || plant.maxDays || 7;
    const max = Math.max((s && s.max) || plant.maxDays || min, min);
    return { min, max };
  }

  /** Next due date after watering on `iso`. */
  function dueAfter(plant, iso) { return addDays(iso, interval(plant).min); }

  /**
   * Status of a plant on a given day.
   * kind: 'upcoming' | 'due' | 'overdue' | 'unscheduled'
   */
  function status(plant, on = today()) {
    if (!plant.nextDue) return { kind: 'unscheduled', label: 'No due date', mood: 'happy' };
    const { min, max } = interval(plant);
    const d = diffDays(on, plant.nextDue); // >0 = days until due
    if (d > 0) {
      return { kind: 'upcoming', days: d, mood: 'happy', label: d === 1 ? 'Tomorrow' : `In ${d} days` };
    }
    const late = -d;
    const window = max - min;
    if (late <= window) {
      const left = window - late;
      return {
        kind: 'due', days: late, mood: 'due',
        label: late === 0 ? 'Due today' : `Due · ${late}d ago`,
        hint: left > 0 ? `Check the soil — fine to wait up to ${left} more day${left === 1 ? '' : 's'}` : 'Last day of its watering window',
      };
    }
    const over = late - window;
    return { kind: 'overdue', days: over, mood: 'thirsty', label: `${over} day${over === 1 ? '' : 's'} overdue` };
  }

  /** First due date from an imported repeating 28-day rota (day 1 = start). */
  function nextFromRota(startIso, days, on = today()) {
    if (!startIso || !days || !days.length) return null;
    const t = diffDays(startIso, on); // today's 0-based offset into the rota
    const cycle = Math.floor(t / 28);
    const offsets = [];
    for (let c = cycle - 1; c <= cycle + 1; c++) days.forEach((day) => offsets.push(c * 28 + day - 1));
    const next = offsets.filter((o) => o >= t).sort((a, b) => a - b)[0];
    return addDays(startIso, next);
  }

  const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** "Today", "Tomorrow", "Yesterday", or "Fri 27 Nov". */
  function friendly(iso, on = today()) {
    const d = diffDays(on, iso);
    if (d === 0) return 'Today';
    if (d === 1) return 'Tomorrow';
    if (d === -1) return 'Yesterday';
    const dt = parse(iso);
    return `${DAY_NAMES[dt.getDay()]} ${dt.getDate()} ${MONTHS[dt.getMonth()]}`;
  }
  function longDate(iso) {
    const dt = parse(iso);
    return dt.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  window.Watering = {
    today, addDays, diffDays, interval, dueAfter, status, nextFromRota, friendly, longDate,
    SEASONS, seasonForDate,
    season() { return activeSeason; },
    seasonInfo(key = activeSeason) { return SEASONS.find((s) => s.key === key); },
    setSeason(key) { activeSeason = key; },
  };
})();
