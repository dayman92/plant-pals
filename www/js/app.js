// Plant Pals — UI layer. Plain JS, no framework, no build step.
(function () {
  const $ = (sel, root = document) => root.querySelector(sel);
  const W = window.Watering;

  const state = {
    tab: 'today',
    roomFilter: 'all', // 'all' | roomId | 'unassigned'
    search: '',
  };

  const ROOM_EMOJIS = ['🛋️', '🍳', '☀️', '🛏️', '🌙', '📚', '🚪', '🛁', '🪴', '🌿', '🖥️', '🧺', '🌷', '🏡', '🪟', '🎹'];
  const WATER_TYPES = ['Rainwater', 'Rainwater (bonus)', 'Tap', 'Tap (tepid)', 'Tap (room temp)', 'Filtered'];
  // Soft warm backdrops behind each plant character.
  const AVATAR_TINTS = ['#FFE7A8', '#FFD9B0', '#FFE3C4', '#FCEBB6', '#FFDDB8', '#FFE9C9'];
  const DROP_ICON = '<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path d="M12 2.5C9 7 5.5 10.6 5.5 14.6a6.5 6.5 0 0 0 13 0C18.5 10.6 15 7 12 2.5Z" fill="#fff"/><path d="M9 14.5a3 3 0 0 0 2.6 3" stroke="#3BA7E5" stroke-width="1.8" fill="none" stroke-linecap="round"/></svg>';

  // ---------- helpers ----------
  function esc(s) {
    return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function hash(s) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; }
  function plural(n, word) { return `${n} ${word}${n === 1 ? '' : 's'}`; }
  /** Mid-sentence date: "today" / "tomorrow" / "yesterday", otherwise "on Fri 4 Dec". */
  function when(iso) {
    const f = W.friendly(iso);
    return ['Today', 'Tomorrow', 'Yesterday'].includes(f) ? f.toLowerCase() : `on ${f}`;
  }

  function formatFreq(min, max) {
    if (!min && !max) return '';
    const lo = min || max, hi = max || min;
    if (lo >= 14 && lo % 7 === 0 && hi % 7 === 0) return lo === hi ? `${lo / 7} wks` : `${lo / 7}–${hi / 7} wks`;
    return lo === hi ? `${lo} days` : `${lo}–${hi} days`;
  }

  function avatarHtml(plant, { size = '', mood } = {}) {
    const m = mood || W.status(plant).mood;
    const tint = AVATAR_TINTS[hash(plant.id || plant.name || '') % AVATAR_TINTS.length];
    return `<span class="avatar ${size}" style="--avatar-bg:${tint}">${PlantArt.svg(plant.species, m)}</span>`;
  }

  function roomLabel(p) {
    const room = Store.room(p.roomId);
    return room ? `${room.emoji} ${room.name}` : 'Unassigned';
  }
  function waterPill(p) {
    if (!p.waterType || !Store.showWaterType()) return '';
    const rain = /rain/i.test(p.waterType);
    return `<span class="pill ${rain ? 'pill-rain' : 'pill-tap'}">${rain ? '🌧️' : '🚰'} ${esc(p.waterType)}</span>`;
  }
  /** Small sun drawing: full sun (filled), half sun (half filled), shade (sun behind a cloud). */
  function sunIcon(level, size = 16) {
    const rays = [0, 45, 90, 135, 180, 225, 270, 315].map((a) =>
      `<line x1="12" y1="2.2" x2="12" y2="4.6" transform="rotate(${a} 12 12)"/>`).join('');
    const sun = '#F2A007';
    let body;
    if (level === 'full') {
      body = `<g stroke="${sun}" stroke-width="2" stroke-linecap="round">${rays}</g><circle cx="12" cy="12" r="5" fill="${sun}"/>`;
    } else if (level === 'shade') {
      body = `<g stroke="${sun}" stroke-width="1.8" stroke-linecap="round" opacity=".55">${rays}</g><circle cx="12" cy="12" r="4.4" fill="none" stroke="${sun}" stroke-width="1.8" opacity=".55"/>`
        + '<path d="M7.5 21.5h10a3.6 3.6 0 0 0 .3-7.2 4.8 4.8 0 0 0-9.2-.6A3.9 3.9 0 0 0 7.5 21.5z" fill="#8FA3B8" stroke="#6E8399" stroke-width="1"/>';
    } else {
      body = `<g stroke="${sun}" stroke-width="2" stroke-linecap="round">${rays}</g><circle cx="12" cy="12" r="4.4" fill="none" stroke="${sun}" stroke-width="1.8"/>`
        + `<path d="M12 7.6a4.4 4.4 0 0 0 0 8.8z" fill="${sun}"/>`;
    }
    return `<svg class="sun-icon" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${body}</svg>`;
  }
  function lightPill(p) {
    const l = Catalog.lightInfo(p.light);
    return `<span class="pill pill-light" title="${esc(l.how)}">${sunIcon(l.key)} ${esc(l.short)}</span>`;
  }
  function methodPill(p) {
    const m = Catalog.method(p.waterMethod);
    return `<span class="pill pill-method">${m.emoji} ${esc(m.name)}</span>`;
  }
  function statusPill(p) {
    const s = W.status(p);
    return `<span class="pill s-${s.kind}">${s.kind === 'overdue' ? '🥵' : s.kind === 'due' ? '💧' : '🗓️'} ${esc(s.label)}</span>`;
  }

  let toastTimer;
  function toast(msg, action) {
    const t = $('#toast');
    t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-action">${esc(action.label)}</button>` : ''}`;
    t.hidden = false;
    if (action) $('.toast-action', t).onclick = () => { t.hidden = true; action.run(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, action ? 4500 : 1800);
  }

  // ---------- rendering ----------
  function render() {
    document.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-active', b.dataset.tab === state.tab));
    $('#fab').hidden = state.tab === 'today' || state.tab === 'settings';
    if (state.tab === 'today') renderToday();
    else if (state.tab === 'plants') renderPlants();
    else if (state.tab === 'settings') renderSettings();
    else renderRooms();
    updateTabBadge();
  }

  function updateTabBadge() {
    const n = Store.plants().filter((p) => ['due', 'overdue'].includes(W.status(p).kind)).length;
    const badge = $('#today-badge');
    badge.textContent = n;
    badge.hidden = n === 0;
  }

  // ----- Today -----
  function renderToday() {
    const today = W.today();
    const plants = Store.plants();
    const withStatus = plants.map((p) => ({ p, s: W.status(p, today) }));
    const overdue = withStatus.filter((x) => x.s.kind === 'overdue').sort((a, b) => b.s.days - a.s.days);
    const due = withStatus.filter((x) => x.s.kind === 'due').sort((a, b) => b.s.days - a.s.days);
    const wateredToday = plants.filter((p) => p.lastWatered === today);
    const upcoming = withStatus.filter((x) => x.s.kind === 'upcoming' && x.s.days <= 7)
      .sort((a, b) => a.s.days - b.s.days || a.p.name.localeCompare(b.p.name));

    $('#screen-title').textContent = 'Today';
    $('#screen-subtitle').textContent = W.longDate(today);

    const todo = overdue.length + due.length;
    const total = todo + wateredToday.length;
    const pct = total ? Math.round((wateredToday.length / total) * 100) : 100;
    const nextUp = withStatus.filter((x) => x.s.kind === 'upcoming').sort((a, b) => a.s.days - b.s.days)[0];

    let hero;
    if (plants.length === 0) {
      hero = `
        <div class="hero hero-done hero-welcome">
          <span class="avatar avatar-xl" style="--avatar-bg:${AVATAR_TINTS[0]}">${PlantArt.svg('monstera', 'happy')}</span>
          <div>
            <h2>Welcome to Plant Pals!</h2>
            <p>Add your plants and we’ll tell you who needs a drink each day.</p>
            <div class="row hero-actions">
              <button class="btn btn-primary" id="add-first">＋ Add a plant</button>
              <button class="btn btn-ghost" id="import-btn">Import backup</button>
            </div>
          </div>
        </div>`;
    } else if (todo === 0) {
      const sample = wateredToday[0] || plants[0];
      hero = `
        <div class="hero hero-done">
          ${sample ? avatarHtml(sample, { size: 'avatar-xl', mood: 'happy' }) : ''}
          <div>
            <h2>${total ? 'All watered! 🎉' : 'Nothing to water today'}</h2>
            <p>${total ? `${plural(wateredToday.length, 'plant')} had a drink today.` : 'Everyone’s happy.'}
            ${nextUp ? `Next up: <strong>${esc(nextUp.p.name)}</strong> ${esc(when(nextUp.p.nextDue))}.` : ''}</p>
          </div>
        </div>`;
    } else {
      hero = `
        <div class="hero">
          <div class="hero-top">
            <div>
              <h2>${plural(todo, 'plant')} to water</h2>
              <p>${overdue.length ? `${overdue.length} overdue · ` : ''}${wateredToday.length} done today</p>
            </div>
            <span class="hero-drop">💧</span>
          </div>
          <div class="progress" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div>
        </div>`;
    }

    const rowsDue = (list) => `<ul class="water-list">${list.map(({ p, s }) => waterRow(p, s)).join('')}</ul>`;
    const section = (title, cls, list, allBtn) => list.length ? `
      <section class="water-section ${cls}">
        <div class="section-head"><h2>${title} <span class="muted">${list.length}</span></h2>
          ${allBtn && list.length > 1 ? `<button class="link-btn" data-water-all="${cls}">Water all</button>` : ''}</div>
        ${rowsDue(list)}
      </section>` : '';

    const doneList = wateredToday.length ? `
      <section class="water-section">
        <div class="section-head"><h2>Watered today <span class="muted">${wateredToday.length}</span></h2></div>
        <ul class="water-list">${wateredToday.map((p) => `
          <li class="water-row is-done">
            <button class="row-main" data-plant="${esc(p.id)}">${avatarHtml(p, { mood: 'happy' })}
              <span class="row-text"><span class="plant-name">${esc(p.name)}</span><span class="row-sub">${esc(roomLabel(p))} · next due ${esc(when(p.nextDue))}</span></span>
            </button>
            <span class="tick" aria-label="Watered">✓</span>
          </li>`).join('')}</ul>
      </section>` : '';

    const byDay = {};
    upcoming.forEach(({ p }) => { (byDay[p.nextDue] = byDay[p.nextDue] || []).push(p); });
    const upcomingHtml = Object.keys(byDay).length ? `
      <section class="water-section">
        <div class="section-head"><h2>Coming up</h2></div>
        ${Object.entries(byDay).map(([iso, list]) => `
          <div class="day-group">
            <h3>${esc(W.friendly(iso))}</h3>
            <div class="mini-row">${list.map((p) => `
              <button class="mini" data-plant="${esc(p.id)}" title="${esc(p.name)}">${avatarHtml(p, { mood: 'happy' })}<span>${esc(p.name)}</span></button>`).join('')}
            </div>
          </div>`).join('')}
      </section>` : '';

    $('#screen').innerHTML = seasonBanner() + backupBanner() + (plants.length ? holidayCard() : '') + hero
      + section('Overdue', 'overdue', overdue, true)
      + section('Due now', 'due', due, true)
      + doneList + upcomingHtml;
  }

  function seasonBanner() {
    const s = W.seasonInfo();
    const auto = Store.seasonMode() === 'auto';
    return `
      <button class="season-banner season-${s.key}" id="season-btn" aria-label="Watering schedule: ${esc(s.name)}. Change">
        <span class="season-emoji">${s.emoji}</span>
        <span class="season-text"><strong>${esc(s.name)} schedule</strong>
          <span>${auto ? `Automatic · ${esc(s.months)}` : 'Set manually'}</span></span>
        <span class="season-change">Change</span>
      </button>`;
  }

  function openSeasonPicker() {
    const mode = Store.seasonMode();
    const calendar = W.seasonInfo(W.seasonForDate());
    // Show how the season changes things, using a plant the user actually has.
    const sample = Store.plants().find((p) => p.species === 'boston-fern') || Store.plants()[0];
    const example = (key) => {
      if (!sample) return '';
      const iv = W.interval(sample, key);
      return `${sample.name}: every ${formatFreq(iv.min, iv.max)}`;
    };
    const option = (key, emoji, title, sub) => `
      <button class="season-option ${mode === key ? 'is-active' : ''}" data-season="${key}">
        <span class="season-emoji">${emoji}</span>
        <span class="season-text"><strong>${esc(title)}</strong><span>${esc(sub)}</span></span>
        ${mode === key ? '<span class="tick small-tick">✓</span>' : ''}
      </button>`;
    openSheet('Watering schedule', `
      <p class="muted sheet-intro">Plants drink more in the warm, bright months and much less in winter. Each plant has a range for every season — edit them on the plant.</p>
      <div class="season-options">
        ${option('auto', '📅', `Automatic — ${calendar.name} now`, 'Follows the calendar (UK seasons)')}
        ${W.SEASONS.map((s) => option(s.key, s.emoji, s.name, `${s.months} · ${example(s.key)}`)).join('')}
      </div>
      <p class="muted small sheet-intro">Switching recalculates due dates from each plant’s last watering.</p>`, (body) => {
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-season]');
        if (!b) return;
        e.stopPropagation();
        Store.setSeasonMode(b.dataset.season);
        closeSheet();
        toast(`${W.seasonInfo().emoji} ${W.seasonInfo().name} schedule${b.dataset.season === 'auto' ? ' (automatic)' : ''}`);
      });
    });
  }

  // ---------- monthly backup reminder ----------
  function backupBanner() {
    const b = Store.backupInfo();
    if (!b.due) return '';
    return `
      <div class="backup-banner" role="status">
        <span class="season-emoji">💾</span>
        <span class="season-text"><strong>Monthly backup time</strong>
          <span>${b.lastFile ? `Last backup file saved ${esc(when(b.lastFile))}` : 'You haven’t saved a backup file yet'}</span></span>
        <button class="btn btn-secondary btn-small" id="backup-now">Save</button>
        <button class="link-btn" id="backup-later">Later</button>
      </div>`;
  }

  // ---------- holiday mode ----------
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
  const DEFAULT_DAYS = { 1: [6], 2: [3, 6], 3: [1, 3, 5] };
  const dayList = (days) => WEEK_ORDER.filter((d) => days.includes(d)).map((d) => W.WEEKDAYS[d]).join(', ');
  const firstSentence = (text) => (String(text || '').split(/(?<=[.!?])\s+/)[0] || '').trim();

  function holidayCard() {
    const h = Store.holiday();
    const today = W.today();
    if (!h) {
      return `
        <button class="holiday-row" id="holiday-on" role="switch" aria-checked="false">
          <span class="season-emoji">🏖️</span>
          <span class="season-text"><strong>Holiday mode</strong><span>Going away? Make a watering plan for your plant-sitter</span></span>
          <span class="switch" aria-hidden="true"></span>
        </button>`;
    }
    if (W.diffDays(h.end, today) >= 0) {
      return `
        <div class="holiday-card">
          <div class="holiday-top"><span class="season-emoji">🏡</span>
            <span class="season-text"><strong>Welcome back!</strong><span>Did your plant-sitter follow the plan? We can add their visits to each plant’s watering history.</span></span></div>
          <div class="row"><button class="btn btn-primary" id="holiday-apply">Yes, update plants</button><button class="btn btn-ghost" id="holiday-skip">No, skip</button></div>
        </div>`;
    }
    const plan = Store.holidayPlan();
    const visits = plan.stops.filter((s) => s.who === 'sitter').length;
    const nextStop = plan.stops.find((s) => W.diffDays(today, s.date) >= 0);
    let next = '';
    if (nextStop) {
      const label = nextStop.who === 'you' ? `Before you go (${W.friendly(nextStop.date)})` : `Next visit ${when(nextStop.date)}`;
      next = `${label}: <strong>${nextStop.items.length ? plural(nextStop.items.length, 'plant') + ' to water' : 'nothing needs water'}</strong>`;
    }
    const away = W.diffDays(h.start, today) >= 0;
    return `
      <div class="holiday-card">
        <div class="holiday-top">
          <span class="season-emoji">🏖️</span>
          <span class="season-text"><strong>Holiday mode${away ? ' · you’re away' : ''}</strong>
            <span>${esc(W.friendly(h.start))} → back ${esc(W.friendly(h.end))} · ${plural(visits, 'visit')} (${esc(dayList(h.days))})</span></span>
          <button class="switch is-on" id="holiday-off" role="switch" aria-checked="true" aria-label="Turn off holiday mode"></button>
        </div>
        ${next ? `<p class="holiday-next">${next}</p>` : ''}
        <div class="row"><button class="btn btn-primary" id="holiday-plan">📋 Sitter’s plan</button><button class="btn btn-ghost" id="holiday-edit">Edit</button></div>
      </div>`;
  }

  function openHolidayForm() {
    const today = W.today();
    const h = Store.holiday() || { start: today, end: W.addDays(today, 7), days: DEFAULT_DAYS[2] };
    let days = [...h.days];
    const editing = !!Store.holiday();

    openSheet(editing ? 'Edit holiday' : 'Holiday mode', `
      <p class="muted sheet-intro">Tell us when you’re away and when someone can pop round. We’ll work out exactly which plants they need to water on each visit.</p>
      <form id="holiday-form" class="form">
        <div class="two-col">
          <label>Going away<input name="start" type="date" required value="${esc(h.start)}"></label>
          <label>Back home<input name="end" type="date" required value="${esc(h.end)}"></label>
        </div>
        <fieldset>
          <legend>Visits per week</legend>
          <div class="segmented" id="visit-count">
            ${[1, 2, 3].map((n) => `<button type="button" data-count="${n}">${n === 1 ? 'Once' : n === 2 ? 'Twice' : '3 times'}</button>`).join('')}
          </div>
        </fieldset>
        <fieldset>
          <legend>On these days</legend>
          <div class="day-chips" id="day-chips">
            ${WEEK_ORDER.map((d) => `<button type="button" data-day="${d}">${W.WEEKDAYS[d].slice(0, 2)}</button>`).join('')}
          </div>
        </fieldset>
        <p class="holiday-summary" id="holiday-summary"></p>
        <div class="form-actions">
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${editing ? 'Save' : 'Turn on'}</button>
        </div>
      </form>`, (body) => {
      const form = $('#holiday-form', body);
      const update = () => {
        body.querySelectorAll('[data-day]').forEach((b) => b.classList.toggle('is-active', days.includes(+b.dataset.day)));
        body.querySelectorAll('[data-count]').forEach((b) => b.classList.toggle('is-active', +b.dataset.count === days.length));
        const summary = $('#holiday-summary', body);
        const start = form.start.value, end = form.end.value;
        if (!start || !end || W.diffDays(start, end) < 1) { summary.textContent = 'Your return date needs to be after the day you leave.'; summary.className = 'holiday-summary warn'; return; }
        const visits = W.holidayVisits({ start, end, days });
        summary.className = 'holiday-summary' + (visits.length ? '' : ' warn');
        summary.textContent = visits.length
          ? `${plural(visits.length, 'visit')}: ${visits.map((d) => W.friendly(d)).join(', ')}`
          : (days.length ? 'No visits fall between those dates — pick other days, or plants will just get your pre-trip watering.' : 'Pick at least one day for visits.');
      };
      body.addEventListener('click', (e) => {
        const c = e.target.closest('[data-count]'), d = e.target.closest('[data-day]');
        if (c) { e.stopPropagation(); days = [...DEFAULT_DAYS[c.dataset.count]]; update(); }
        if (d) { e.stopPropagation(); const n = +d.dataset.day; days = days.includes(n) ? days.filter((x) => x !== n) : [...days, n]; update(); }
      });
      form.start.addEventListener('change', update);
      form.end.addEventListener('change', update);
      update();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        if (W.diffDays(form.start.value, form.end.value) < 1) { form.end.focus(); return; }
        Store.setHoliday({ start: form.start.value, end: form.end.value, days: WEEK_ORDER.filter((d) => days.includes(d)) });
        closeSheet();
        toast(editing ? 'Holiday plan updated' : '🏖️ Holiday mode on');
      });
    });
  }

  function planText(plan, h) {
    const lines = [`🪴 Plant-sitting plan`, `${W.friendly(h.start)} → ${W.friendly(h.end)}`, ''];
    let n = 0;
    plan.stops.forEach((stop) => {
      if (stop.who === 'you') return;
      n += 1;
      lines.push(`📅 Visit ${n} — ${W.friendly(stop.date)}`);
      if (!stop.items.length) lines.push('Nothing needs water today — just check nothing looks droopy.');
      groupByRoom(stop.items).forEach(([room, items]) => {
        lines.push(`${room}:`);
        items.forEach(({ plant: p, tight }) => {
          const bits = [p.placement, Catalog.method(p.waterMethod).name.toLowerCase(),
            Store.showWaterType() && p.waterType && (/rain/i.test(p.waterType) ? `${p.waterType} 🌧️` : p.waterType)].filter(Boolean).join(' · ');
          lines.push(`• ${p.name}${bits ? ` (${bits})` : ''}${tight ? ' — give it a thorough soak' : ''}`);
          const tip = firstSentence(p.notes);
          if (tip) lines.push(`   ${tip}`);
        });
      });
      lines.push('');
    });
    if (plan.idle.length) lines.push(`No water needed while I’m away: ${plan.idle.map((p) => p.name).join(', ')}.`, '');
    // Short "how to" for each watering method that appears in the plan.
    const used = [...new Set(plan.stops.filter((s) => s.who === 'sitter').flatMap((s) => s.items.map((it) => it.plant.waterMethod)))];
    if (used.length) {
      lines.push('How to water:');
      used.forEach((k) => { const m = Catalog.method(k); lines.push(`${m.emoji} ${m.name}: ${m.how}`); });
      lines.push('');
    }
    lines.push('Thank you! 💚');
    return lines.join('\n');
  }

  function groupByRoom(items) {
    const groups = new Map();
    items.forEach((it) => {
      const room = Store.room(it.plant.roomId);
      const key = room ? `${room.emoji} ${room.name}` : 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(it);
    });
    return [...groups.entries()];
  }

  function openHolidayPlan() {
    const h = Store.holiday();
    const plan = Store.holidayPlan();
    let visitNo = 0;
    const stopsHtml = plan.stops.map((stop) => {
      const title = stop.who === 'you' ? `Before you go · ${W.friendly(stop.date)}` : `Visit ${++visitNo} · ${W.friendly(stop.date)}`;
      const body = stop.items.length
        ? groupByRoom(stop.items).map(([room, items]) => `
            <h4 class="plan-room">${esc(room)}</h4>
            <ul class="plan-list">${items.map(({ plant: p, tight }) => `
              <li>
                ${avatarHtml(p, { size: 'avatar-sm', mood: 'happy' })}
                <span class="row-text">
                  <span class="plant-name">${esc(p.name)}</span>
                  <span class="row-sub">${p.placement ? `📍 ${esc(p.placement)}` : ''}</span>
                  <span class="pills">${methodPill(p)}${waterPill(p)}${tight ? '<span class="pill s-due">Give a thorough soak</span>' : ''}</span>
                  ${firstSentence(p.notes) ? `<span class="row-hint">${esc(firstSentence(p.notes))}</span>` : ''}
                </span>
              </li>`).join('')}</ul>`).join('')
        : '<p class="muted small">Nothing needs water — just check nothing looks droopy.</p>';
      return `<section class="plan-stop ${stop.who}"><h3>${esc(title)} <span class="muted">${stop.items.length || ''}</span></h3>${body}</section>`;
    }).join('');

    openSheet('Sitter’s plan', `
      <p class="muted sheet-intro">${esc(W.friendly(h.start))} → back ${esc(W.friendly(h.end))}. Share this with whoever’s watering — it works without the app.</p>
      <div class="row sheet-actions">
        <button class="btn btn-primary" id="plan-share">Share</button>
        <button class="btn btn-ghost" id="plan-copy">Copy text</button>
        ${Native.isApp ? '' : '<button class="btn btn-ghost" id="plan-print">Print / PDF</button>'}
        <button class="btn btn-ghost" data-guide="check">? How to water</button>
      </div>
      ${stopsHtml}
      ${plan.idle.length ? `<section class="plan-stop"><h3>No water needed while you’re away</h3><p class="muted small">${esc(plan.idle.map((p) => p.name).join(', '))}</p></section>` : ''}`, (body) => {
      const text = planText(plan, h);
      body.addEventListener('click', async (e) => {
        const b = e.target.closest('button');
        if (!b) return;
        if (b.id === 'plan-share') {
          e.stopPropagation();
          try { if (!(await Native.shareText('Plant-sitting plan', text))) copyText(text); } catch (err) { /* cancelled */ }
        }
        if (b.id === 'plan-copy') { e.stopPropagation(); copyText(text); }
        if (b.id === 'plan-print') { e.stopPropagation(); window.print(); }
      });
    });
  }

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); toast('Plan copied — paste it into a message'); }
    catch (e) { prompt('Copy the plan:', text); }
  }

  function openSnapshots() {
    const snaps = Store.backupInfo().snapshots;
    const label = (r) => (r === 'auto' ? 'Monthly auto-save' : r === 'before clearing' ? 'Saved before “Clear all plants”' : r === 'before import' ? 'Saved before an import' : r);
    openSheet('Restore a snapshot', `
      <p class="muted sheet-intro">The app saves a copy of your plants automatically every 30 days, and before you clear or import. Snapshots live on this device only — export a backup file to be safe if you uninstall.</p>
      <div class="season-options">${snaps.map((s, i) => `
        <button class="season-option" data-snap="${i}">
          <span class="season-emoji">${s.reason === 'auto' ? '🗓️' : '🛟'}</span>
          <span class="season-text"><strong>${esc(W.friendly(s.date))}</strong><span>${esc(label(s.reason))} · ${plural(s.plants, 'plant')}</span></span>
        </button>`).join('')}</div>`, (body) => {
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-snap]');
        if (!b) return;
        e.stopPropagation();
        const s = snaps[+b.dataset.snap];
        if (!confirm(`Replace your current plants with the snapshot from ${W.friendly(s.date)} (${plural(s.plants, 'plant')})?`)) return;
        try { const r = Store.restoreSnapshot(+b.dataset.snap); closeSheet(); toast(`Restored ${plural(r.plants, 'plant')}`); }
        catch (err) { alert(err.message); }
      });
    });
  }

  // ---------- watering guide ----------
  /** Small explanatory drawings for the guide. */
  function guideArt(kind) {
    const pot = (y = 0) => `
      <path d="M40 ${40 + y} L80 ${40 + y} L75 ${76 + y} Q74 ${79 + y} 71 ${79 + y} L49 ${79 + y} Q46 ${79 + y} 45 ${76 + y} Z" fill="#E2733B"/>
      <path d="M70 ${40 + y} L80 ${40 + y} L75 ${76 + y} Q74 ${79 + y} 71 ${79 + y} L67 ${79 + y} Z" fill="#C2582A"/>
      <rect x="36" y="${34 + y}" width="48" height="8" rx="3" fill="#EE8A50"/>
      <path d="M60 ${34 + y} Q50 ${18 + y} 44 ${14 + y} Q58 ${14 + y} 60 ${30 + y} Q62 ${12 + y} 76 ${10 + y} Q70 ${20 + y} 60 ${34 + y} Z" fill="#58B368"/>`;
    const drop = (x, y, s = 1) => `<path d="M${x} ${y} c${2 * s} ${3 * s} ${3.5 * s} ${5 * s} ${3.5 * s} ${7 * s} a${3.5 * s} ${3.5 * s} 0 0 1 -${7 * s} 0 c0 -${2 * s} ${1.5 * s} -${4 * s} ${3.5 * s} -${7 * s}z" fill="#3BA7E5"/>`;
    const arrow = (x, y, up) => `<path d="M${x} ${y} l0 ${up ? -12 : 12} M${x - 5} ${y + (up ? -7 : 7)} l5 ${up ? -5 : 5} l5 ${up ? 5 : -5}" stroke="#2582BC" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    const bowl = (top) => `<path d="M16 ${top} L104 ${top} L98 86 Q97 89 93 89 L27 89 Q23 89 22 86 Z" fill="#CFE7F7" opacity=".95"/><path d="M14 ${top - 2} L106 ${top - 2}" stroke="#9CC6E4" stroke-width="3" stroke-linecap="round"/>`;
    const water = (top) => `<rect x="20" y="${top}" width="80" height="${88 - top}" fill="#7CC4EE" opacity=".55"/>`;
    let inner = '';
    if (kind === 'top') inner = pot(8) + drop(30, 6) + drop(22, 20, 0.8) + drop(34, 26, 0.7) + arrow(98, 30, false) + `<path d="M8 4 q10 -2 18 4" stroke="#9CC6E4" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    if (kind === 'bottom') inner = bowl(66) + pot(4) + water(70) + arrow(60, 80, true) + arrow(48, 76, true) + arrow(72, 76, true);
    if (kind === 'soak') inner = bowl(36) + pot(6) + water(40);
    return `<svg class="guide-art" viewBox="0 0 120 92" aria-hidden="true">${inner}</svg>`;
  }

  function guideHtml() {
    const sec = (id, title, body, art = '') => `
      <details class="guide-sec" id="g-${id}">
        <summary>${title}</summary>
        <div class="guide-content">${art}${body}</div>
      </details>`;
    const m = (k) => Catalog.method(k);
    return `
      <p class="guide-lead">Most watering problems come from watering by the calendar instead of by the plant. Treat Plant Pals’ dates as a reminder to <strong>check</strong>, then water the right way for that plant.</p>
      ${sec('check', '🖐️ Check before you water', `
        <ul>
          <li><strong>Finger test:</strong> push a finger 2–3 cm into the soil. Dry? Water it. Still damp? Tap <em>Not yet</em> and check tomorrow.</li>
          <li><strong>Lift the pot:</strong> a dry pot feels noticeably lighter than a freshly watered one.</li>
          <li><strong>Know the plant:</strong> cacti and succulents should dry out completely; ferns, fittonias and calatheas only want the surface to dry.</li>
        </ul>`)}
      ${sec('top', `${m('top').emoji} Watering from the top`, `
        <ol>
          <li>Use room-temperature water.</li>
          <li>Pour slowly over the soil all round the pot, under the leaves.</li>
          <li>Keep going until water runs out of the drainage holes — that means the whole root ball is wet.</li>
          <li>After 15 minutes, tip away any water left in the saucer or outer pot.</li>
        </ol>
        <p><strong>Good for:</strong> most houseplants. It also flushes out salt and lime build-up from the compost.</p>
        <p><strong>Avoid:</strong> splashing fuzzy leaves (African violets), rosettes (echeveria) and the crowns of snake plants.</p>`, guideArt('top'))}
      ${sec('bottom', `${m('bottom').emoji} Watering from below`, `
        <ol>
          <li>Put 2–5 cm of water in a bowl, sink or deep saucer.</li>
          <li>Stand the pot in it — it needs drainage holes.</li>
          <li>Leave it 15–30 minutes, until the top of the soil feels damp.</li>
          <li>Lift it out and let it drain before putting it back.</li>
        </ol>
        <p><strong>Good for:</strong> plants that hate wet leaves or crowns (African violets, cyclamen, Cape primrose), seedlings and cuttings, pots where leaves cover the soil, and compost so dry it has shrunk from the pot edge (top watering would run straight past). Roots grow down towards the water, which makes for sturdier plants.</p>
        <p><strong>Watch out:</strong> it doesn’t flush out minerals, so give a top watering about once a month. Never leave a pot standing in water for hours.</p>`, guideArt('bottom'))}
      ${sec('soak', `${m('soak').emoji} Soak & drain`, `
        <ul>
          <li><strong>Orchids in bark:</strong> when the roots look silvery, soak the pot for 10–15 minutes, then drain completely.</li>
          <li><strong>Air plants:</strong> soak in rainwater for 20 minutes, shake gently and dry upside down so water doesn’t sit in the base.</li>
          <li><strong>Staghorn ferns:</strong> soak the root ball when the plant feels light.</li>
          <li><strong>Rescue:</strong> also the best way to re-wet any compost that’s gone bone dry.</li>
        </ul>`, guideArt('soak'))}
      ${sec('cup', `${m('cup').emoji} Into the cup (bromeliads)`, `
        <p>Bromeliads drink through the “cup” formed by their leaves. Keep it about a quarter full of rainwater and empty and refill it every month so it doesn’t go stale. Just barely moisten the compost.</p>`)}
      ${sec('tray', `${m('tray').emoji} Standing in a tray (carnivorous plants)`, `
        <p>Venus flytraps, pitcher plants and sundews like constantly damp roots. Keep 1–2 cm of <strong>rainwater</strong> in the saucer during spring and summer. In their winter rest, let the tray dry and keep the compost just moist. Never use tap water — the minerals slowly kill them.</p>`)}
      ${sec('vase', `${m('vase').emoji} Top up the vase (lucky bamboo)`, `
        <p>Keep the roots covered with filtered or rainwater and replace it completely every couple of weeks, rinsing the vase and pebbles.</p>`)}
      ${sec('water', '🌧️ Rain or tap water?', `
        <p><strong>Rainwater</strong> is naturally soft, with no chlorine, fluoride or lime. It’s best for calatheas and prayer plants, ferns, peace lilies, dracaenas (fluoride causes their brown tips), orchids and bromeliads, and essential for carnivorous plants. Collect it in a clean, covered butt or bucket, use it within a few weeks, and bring it indoors to warm up first.</p>
        <p><strong>Tap water</strong> is fine for most tough plants — succulents, cacti, pothos, monstera, ZZ plants. In hard-water areas (much of southern and eastern England) lime builds up as a white crust on soil and pots; flush with a good top watering now and then, or switch sensitive plants to rainwater. Letting tap water stand overnight brings it to room temperature and lets some chlorine escape.</p>
        <p><strong>Also good:</strong> filtered jug water, or boiled and cooled water. Use distilled water for carnivorous plants if you have no rain. <strong>Avoid softened water</strong> from a water softener — the salt in it harms plants.</p>
        <p><strong>Temperature:</strong> always use room-temperature (“tepid”) water — cold water can shock tropical roots and mark leaves.</p>`)}
      ${sec('light', '☀️ How much light?', `
        <p>Light decides how fast a plant drinks: a plant in a sunny window dries out much faster than the same plant in a dark corner. Each plant shows one of three suns:</p>
        <ul class="light-list">
          ${Catalog.lights.map((l) => `<li>${sunIcon(l.key, 22)}<span><strong>${esc(l.name)}:</strong> ${esc(l.how)}</span></li>`).join('')}
        </ul>
        <p><strong>Signs of too little light:</strong> long, stretched stems, small new leaves, plants leaning hard towards the window, and patterned leaves fading to plain green.</p>
        <p><strong>Signs of too much:</strong> bleached, yellow-white or crispy brown patches on the side facing the window.</p>
        <p>UK winters are dark, so move plants closer to the window from November to February, and back a little in high summer.</p>`)}
      ${sec('signs', '🩺 Too much or too little?', `
        <p><strong>Overwatered:</strong> yellow, soft lower leaves · mushy stems · compost that never dries · fungus gnats · a musty smell.</p>
        <p><strong>Underwatered:</strong> crispy brown edges · drooping that perks up after a drink · compost shrinking from the pot edge · a very light pot.</p>
        <p>Far more houseplants die from too much water than too little — if in doubt, wait a day.</p>`)}`;
  }

  function openGuide(section) {
    const g = $('#guide');
    $('#guide-body').innerHTML = guideHtml();
    g.hidden = false;
    requestAnimationFrame(() => g.classList.add('is-open'));
    const target = section && $(`#g-${section}`, g);
    if (target) { target.open = true; setTimeout(() => target.scrollIntoView({ block: 'start' }), 60); }
    else $('#guide-body').scrollTop = 0;
    $('#guide-close').focus({ preventScroll: true });
  }
  function closeGuide() {
    const g = $('#guide');
    g.classList.remove('is-open');
    setTimeout(() => { g.hidden = true; }, 200);
  }

  function waterRow(p, s) {
    return `
      <li class="water-row s-${s.kind}" data-row="${esc(p.id)}">
        <button class="row-main" data-plant="${esc(p.id)}">
          ${avatarHtml(p, { mood: s.mood })}
          <span class="row-text">
            <span class="plant-name">${esc(p.name)}</span>
            <span class="row-sub">${esc(roomLabel(p))}${p.placement ? ` · ${esc(p.placement)}` : ''}</span>
            <span class="pills">${statusPill(p)}${methodPill(p)}${lightPill(p)}${waterPill(p)}</span>
            ${s.hint && s.kind === 'due' ? `<span class="row-hint">${esc(s.hint)}</span>` : ''}
          </span>
        </button>
        <div class="row-actions">
          <button class="water-btn" data-water="${esc(p.id)}" aria-label="Mark ${esc(p.name)} as watered">${DROP_ICON}</button>
          <button class="snooze-btn" data-snooze="${esc(p.id)}" title="Soil still damp? Check again tomorrow">Not yet</button>
        </div>
      </li>`;
  }

  // ----- My plants -----
  function renderPlants() {
    const rooms = Store.rooms();
    const plants = Store.plants();
    const unassigned = Store.plantsInRoom(null);

    $('#screen-title').textContent = 'My plants';
    $('#screen-subtitle').textContent = `${plural(plants.length, 'plant')} · ${plural(rooms.length, 'room')}`;
    $('#fab').setAttribute('aria-label', 'Add plant');

    if (state.roomFilter !== 'all' && state.roomFilter !== 'unassigned' && !Store.room(state.roomFilter)) state.roomFilter = 'all';

    const chip = (id, label, count) =>
      `<button class="chip ${state.roomFilter === id ? 'is-active' : ''}" data-filter="${esc(id)}">${label}<span class="chip-count">${count}</span></button>`;

    const chips = [chip('all', 'All', plants.length)]
      .concat(rooms.map((r) => chip(r.id, `${esc(r.emoji)} ${esc(r.name)}`, Store.plantsInRoom(r.id).length)))
      .concat(unassigned.length ? [chip('unassigned', 'Unassigned', unassigned.length)] : [])
      .join('');

    const q = state.search.trim().toLowerCase();
    const matches = (p) => !q || `${p.name} ${p.detail} ${p.placement}`.toLowerCase().includes(q);

    let groups = rooms.map((r) => ({ room: r, plants: Store.plantsInRoom(r.id) }));
    if (unassigned.length) groups.push({ room: { id: 'unassigned', name: 'Unassigned', emoji: '📦' }, plants: unassigned });
    if (state.roomFilter !== 'all') groups = groups.filter((g) => g.room.id === state.roomFilter);
    groups = groups.map((g) => ({ ...g, plants: g.plants.filter(matches) })).filter((g) => g.plants.length || (!q && state.roomFilter !== 'all'));

    const sections = groups.map((g) => `
      <section class="room-group">
        <h2 class="room-heading"><span>${esc(g.room.emoji)}</span> ${esc(g.room.name)} <span class="muted">${g.plants.length}</span></h2>
        ${g.plants.length ? `<ul class="plant-list">${g.plants.map(plantCard).join('')}</ul>`
          : `<p class="empty">No plants here yet. Tap ＋ to add one.</p>`}
      </section>`).join('');

    $('#screen').innerHTML = `
      <div class="search-wrap">
        <input id="search" class="search" type="search" placeholder="Search plants…" value="${esc(state.search)}" autocomplete="off">
      </div>
      <div class="chips" role="tablist" aria-label="Filter by room">${chips}</div>
      ${sections || `<p class="empty big">${q ? 'No plants match that search.' : 'No plants yet. Tap ＋ to add your first one!'}</p>`}
    `;
  }

  function plantCard(p) {
    const iv = W.interval(p);
    const freq = formatFreq(iv.min, iv.max);
    return `
      <li>
        <button class="plant-card" data-plant="${esc(p.id)}">
          ${avatarHtml(p)}
          <span class="plant-text">
            <span class="plant-name">${esc(p.name)}</span>
            ${p.detail ? `<span class="plant-detail">${esc(p.detail)}</span>` : ''}
            ${p.placement ? `<span class="plant-place">📍 ${esc(p.placement)}</span>` : ''}
            <span class="pills">
              ${statusPill(p)}
              ${freq ? `<span class="pill pill-freq" title="${esc(W.seasonInfo().name)} schedule">${W.seasonInfo().emoji} ${esc(freq)}</span>` : ''}
              ${methodPill(p)}
              ${lightPill(p)}
              ${waterPill(p)}
            </span>
          </span>
        </button>
      </li>`;
  }

  // ----- Rooms -----
  function renderRooms() {
    const rooms = Store.rooms();
    $('#screen-title').textContent = 'Rooms';
    $('#screen-subtitle').textContent = plural(rooms.length, 'room');
    $('#fab').setAttribute('aria-label', 'Create room');

    const cards = rooms.map((r) => {
      const plants = Store.plantsInRoom(r.id);
      const thirsty = plants.filter((p) => ['due', 'overdue'].includes(W.status(p).kind)).length;
      return `
        <li class="room-card">
          <button class="room-main" data-room-view="${esc(r.id)}">
            <span class="room-emoji">${esc(r.emoji)}</span>
            <span class="room-text"><span class="room-name">${esc(r.name)}</span>
              <span class="muted">${plural(plants.length, 'plant')}${thirsty ? ` · <span class="due-text">${thirsty} need water</span>` : ''}</span></span>
          </button>
          <button class="icon-btn" data-room-edit="${esc(r.id)}" aria-label="Edit ${esc(r.name)}">✏️</button>
        </li>`;
    }).join('');

    $('#screen').innerHTML = rooms.length
      ? `<ul class="room-list">${cards}</ul>`
      : '<p class="empty big">No rooms yet. Tap ＋ to create one.</p>';
  }

  // ----- Settings -----
  function renderSettings() {
    $('#screen-title').textContent = 'Settings';
    $('#screen-subtitle').textContent = 'Plant Pals';
    const season = W.seasonInfo();
    const auto = Store.seasonMode() === 'auto';
    const h = Store.holiday();
    const b = Store.backupInfo();
    const lastSnap = b.snapshots[0];
    const theme = window.PlantTheme ? PlantTheme.get() : 'auto';
    const rem = Store.reminders();
    const row = (id, emoji, title, sub, extra = '<span class="chev" aria-hidden="true">›</span>') => `
      <button class="settings-row" id="${id}">
        <span class="season-emoji">${emoji}</span>
        <span class="season-text"><strong>${title}</strong><span>${sub}</span></span>
        ${extra}
      </button>`;

    $('#screen').innerHTML = `
      <section class="settings-group">
        <h2>Watering</h2>
        ${row('set-season', season.emoji, 'Watering schedule', `${esc(season.name)} · ${auto ? 'automatic' : 'set manually'}`)}
        ${row('set-holiday', '🏖️', 'Holiday mode', h ? `On · ${esc(W.friendly(h.start))} → ${esc(W.friendly(h.end))}` : 'Off · make a plan for your plant-sitter')}
        ${row('set-guide', '📖', 'Watering guide', 'From the top or below, rain or tap, light, and spotting problems')}
        <div class="settings-card">
          <div class="reminder-row switch-only">
            <span class="season-text"><strong>🌧️ Show water type</strong><span>Rain or tap water on plant cards and the sitter’s plan. Turn off if you only use tap water.</span></span>
            <button type="button" class="switch ${Store.showWaterType() ? 'is-on' : ''}" id="water-type-toggle" role="switch" aria-checked="${Store.showWaterType()}" aria-label="Show water type"><span></span></button>
          </div>
        </div>
      </section>

      <section class="settings-group">
        <h2>Reminders</h2>
        <div class="settings-card">
          ${Native.isApp ? `
          <div class="reminder-row">
            <span class="season-text"><strong>🔔 Daily watering reminder</strong><span>A notification on days when plants need water</span></span>
            <button type="button" class="switch ${rem.on ? 'is-on' : ''}" id="rem-toggle" role="switch" aria-checked="${rem.on}" aria-label="Daily watering reminder"><span></span></button>
          </div>
          ${rem.on ? `<label class="reminder-time">Remind me at <input type="time" id="rem-time" value="${esc(rem.time)}"></label>` : ''}
          <p class="muted small" id="rem-status"></p>` : `
          <p class="muted small">🔔 Daily watering reminders work in the Plant Pals Android app. In the browser, check the Today tab to see what needs water.</p>`}
        </div>
      </section>

      <section class="settings-group">
        <h2>Appearance</h2>
        <div class="settings-card">
          <span class="settings-label">Theme</span>
          <div class="segmented" id="theme-choice">
            ${[['auto', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']].map(([k, label]) =>
              `<button type="button" data-theme-choice="${k}" class="${theme === k ? 'is-active' : ''}">${label}</button>`).join('')}
          </div>
          <p class="muted small">Automatic follows your phone’s dark mode setting.</p>
        </div>
      </section>

      <section class="settings-group">
        <h2>Your data</h2>
        <div class="settings-card">
          <p class="muted small">Everything is stored on this device only. ${Native.isApp ? 'Uninstalling the app or clearing its storage' : 'Uninstalling the app or clearing browser data'} wipes it, so keep a backup file somewhere safe.</p>
          <ul class="backup-facts">
            <li>💾 Backup file: <strong>${b.lastFile ? esc(W.friendly(b.lastFile)) : 'never saved'}</strong> · we’ll remind you every 30 days</li>
            <li>🗓️ Auto-saved snapshots: <strong>${b.snapshots.length ? `${b.snapshots.length} (latest ${esc(W.friendly(lastSnap.date))})` : 'none yet'}</strong></li>
          </ul>
          <div class="settings-buttons">
            <button class="btn btn-secondary" id="export-btn">💾 Export backup</button>
            <button class="btn btn-ghost" id="import-btn">📂 Import backup</button>
            <button class="btn btn-ghost" id="snapshots-btn" ${b.snapshots.length ? '' : 'disabled'}>🗓️ Restore a snapshot</button>
            <button class="btn btn-ghost btn-danger-text" id="clear-btn" ${Store.plants().length ? '' : 'disabled'}>🗑️ Clear all plants</button>
          </div>
        </div>
      </section>

      <section class="settings-group">
        <h2>About</h2>
        <div class="settings-card about">
          <p><strong>Plant Pals</strong> · ${plural(Store.plants().length, 'plant')} in ${plural(Store.rooms().length, 'room')}</p>
          <p class="muted small">Works offline. No account, no tracking — your plants never leave this device unless you export them.</p>
          <p class="small"><a href="https://dayman92.github.io/plant-pals/privacy.html" target="_blank" rel="noopener">Privacy policy</a> · <a href="https://github.com/dayman92/plant-pals" target="_blank" rel="noopener">Source code on GitHub</a></p>
          <p class="muted small" id="app-version">${Native.isApp ? '' : 'Web version'}</p>
        </div>
      </section>`;
    if (Native.isApp) {
      fillReminderStatus(rem);
      Native.appVersion().then((v) => { const el = $('#app-version'); if (el && v) el.textContent = `Version ${v}`; });
    }
  }

  async function fillReminderStatus(rem) {
    const el = $('#rem-status');
    if (!el) return;
    const perm = await Native.permission();
    let msg = '';
    if (perm === 'denied') msg = '⚠️ Notifications are blocked for Plant Pals. Allow them in your phone’s Settings › Apps › Plant Pals › Notifications.';
    else if (rem.on) {
      const h = Store.holiday();
      msg = Native.reminderSummary() + (h ? ' Paused on your holiday days — your plant-sitter has it covered.' : '');
    }
    if ($('#rem-status') === el) el.textContent = msg;
  }

  // ---------- bottom sheet ----------
  function openSheet(title, bodyHtml, onReady) {
    $('#sheet-title').textContent = title;
    $('#sheet-body').innerHTML = bodyHtml;
    $('#sheet').hidden = false;
    $('#sheet-backdrop').hidden = false;
    $('#sheet').scrollTop = 0;
    requestAnimationFrame(() => { $('#sheet').classList.add('is-open'); $('#sheet-backdrop').classList.add('is-open'); });
    if (onReady) onReady($('#sheet-body'));
  }
  function closeSheet() {
    $('#sheet').classList.remove('is-open');
    $('#sheet-backdrop').classList.remove('is-open');
    setTimeout(() => { $('#sheet').hidden = true; $('#sheet-backdrop').hidden = true; $('#sheet-body').innerHTML = ''; }, 220);
  }

  // ---------- plant picker (new plant) ----------
  function openPicker() {
    let group = 'all';
    const sorted = [...Catalog.all].sort((a, b) => a.name.localeCompare(b.name));
    const tile = (c) => `
      <button class="pick" data-pick="${esc(c.key)}">
        <span class="avatar avatar-md" style="--avatar-bg:${AVATAR_TINTS[hash(c.key) % AVATAR_TINTS.length]}">${PlantArt.svg(c.key, 'happy')}</span>
        <span class="pick-name">${esc(c.name)}</span>
      </button>`;
    const ownTile = (q) => `
      <button class="pick pick-own" data-pick="__own">
        <span class="avatar avatar-md own">✏️</span>
        <span class="pick-name">${q ? `Add “${esc(q)}”` : 'Add your own'}</span>
      </button>`;
    const grid = (q) => {
      const hits = sorted.filter((c) => (group === 'all' || c.group === group)
        && (!q || `${c.name} ${c.latin}`.toLowerCase().includes(q)));
      const sections = Catalog.groups
        .map((g) => ({ g, items: hits.filter((c) => c.group === g.key) }))
        .filter((s) => s.items.length)
        .map(({ g, items }) => `
          <section class="pick-section">
            <h3 class="pick-heading"><span>${g.emoji}</span> ${esc(g.name)} <span class="muted">${items.length}</span></h3>
            <p class="pick-blurb">${esc(g.blurb)}</p>
            <div class="pick-grid">${items.map(tile).join('')}</div>
          </section>`).join('');
      return `<div class="pick-grid">${ownTile(q)}</div>${sections || `<p class="empty">No matches — add it as your own plant.</p>`}`;
    };
    const chips = () => [{ key: 'all', name: 'All', emoji: '✨' }, ...Catalog.groups].map((g) => {
      const n = g.key === 'all' ? Catalog.all.length : Catalog.all.filter((c) => c.group === g.key).length;
      return `<button class="chip ${group === g.key ? 'is-active' : ''}" data-group="${esc(g.key)}">${g.emoji} ${esc(g.name)}<span class="chip-count">${n}</span></button>`;
    }).join('');

    openSheet('Add a plant', `
      <input id="pick-search" class="search" type="search" placeholder="Search ${Catalog.all.length} houseplants…" autocomplete="off">
      <div class="chips pick-chips" id="pick-chips">${chips()}</div>
      <div id="pick-grid">${grid('')}</div>`, (body) => {
      const input = $('#pick-search', body);
      const refresh = () => { $('#pick-grid', body).innerHTML = grid(input.value.trim().toLowerCase()); };
      input.addEventListener('input', refresh);
      $('#pick-chips', body).addEventListener('click', (e) => {
        const b = e.target.closest('[data-group]');
        if (!b) return;
        e.stopPropagation();
        group = b.dataset.group;
        $('#pick-chips', body).innerHTML = chips();
        $('#pick-chips .is-active', body).scrollIntoView({ inline: 'center', block: 'nearest' });
        refresh();
        $('#sheet').scrollTop = 0;
      });
      $('#pick-grid', body).addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]');
        if (!b) return;
        e.stopPropagation();
        if (b.dataset.pick === '__own') {
          const typed = input.value.trim();
          openPlantForm(null, { name: typed ? typed.charAt(0).toUpperCase() + typed.slice(1) : '', species: Catalog.guess(typed) });
        } else {
          const c = Catalog.get(b.dataset.pick);
          openPlantForm(null, { name: c.name, detail: c.latin, species: c.key, waterType: c.waterType, waterMethod: Catalog.defaultMethod(c.key), light: Catalog.defaultLight(c.key), notes: c.note });
        }
      });
    });
  }

  // ---------- plant form ----------
  function openPlantForm(plantId, preset = {}) {
    const existing = plantId ? Store.plant(plantId) : null;
    const today = W.today();
    const defaultRoom = state.roomFilter !== 'all' && state.roomFilter !== 'unassigned' ? state.roomFilter : (Store.rooms()[0]?.id ?? null);
    const p = existing || {
      name: '', detail: '', species: null, roomId: defaultRoom, placement: '',
      waterType: 'Tap (tepid)', notes: '', lastWatered: today, history: [], ...preset,
    };
    if (!existing) {
      const c = Catalog.get(p.species);
      p.schedule = Catalog.schedule(p.species, c ? c.minDays : 7, c ? c.maxDays : 10);
      if (!p.waterMethod) p.waterMethod = Catalog.defaultMethod(p.species);
      p.nextDue = W.dueAfter(p, p.lastWatered || today);
    }

    const roomOptions = `<option value="">Unassigned</option>`
      + Store.rooms().map((r) => `<option value="${esc(r.id)}" ${r.id === p.roomId ? 'selected' : ''}>${esc(r.emoji)} ${esc(r.name)}</option>`).join('')
      + `<option value="__new">＋ Create new room…</option>`;
    const speciesOptions = `<option value="">Other / not sure</option>`
      + Catalog.groups.map((g) => `<optgroup label="${esc(`${g.emoji} ${g.name}`)}">`
        + Catalog.all.filter((c) => c.group === g.key).sort((a, b) => a.name.localeCompare(b.name))
          .map((c) => `<option value="${esc(c.key)}" ${c.key === p.species ? 'selected' : ''}>${esc(c.name)}</option>`).join('')
        + '</optgroup>').join('');
    const history = (p.history || []).slice(0, 6).map((d) => `<span class="hist">${esc(W.friendly(d))}</span>`).join('');

    openSheet(existing ? p.name : 'New plant', `
      <form id="plant-form" class="form" autocomplete="off">
        <div class="form-hero">
          <span id="form-avatar">${avatarHtml(p, { size: 'avatar-lg' })}</span>
          <div class="form-hero-text">
            ${existing ? `${statusPill(p)}<span class="muted small">${p.lastWatered ? `Last watered ${esc(when(p.lastWatered))}` : 'Not watered in the app yet'}</span>
              <button type="button" class="btn btn-water" id="water-now">💧 Watered today</button>`
              : `<span class="muted">${p.species ? 'Fill in the details, then save.' : 'Pick a plant type below to get its picture.'}</span>`}
          </div>
        </div>
        <label>Name<input name="name" required value="${esc(p.name)}" placeholder="e.g. Peace Lily"></label>
        <label>Variety / nickname<input name="detail" value="${esc(p.detail)}" placeholder="optional"></label>
        <label>Plant type<select name="species">${speciesOptions}</select></label>
        <label>Room<select name="roomId">${roomOptions}</select></label>
        <div class="new-room" hidden>
          <label>New room name<input name="newRoom" placeholder="e.g. Hallway"></label>
        </div>
        <label>Spot in the room<input name="placement" value="${esc(p.placement)}" placeholder="e.g. Windowsill"></label>
        <div class="label-row">
          <span class="label-text" id="light-label">Light</span>
          <button type="button" class="help-inline" data-guide="light" aria-label="Light levels: open the watering guide">?</button>
        </div>
        <input type="hidden" name="light" value="${esc(p.light || 'half')}">
        <div class="segmented light-choice" role="radiogroup" aria-labelledby="light-label">
          ${Catalog.lights.map((l) => `<button type="button" role="radio" data-light="${l.key}" aria-checked="${(p.light || 'half') === l.key}" class="${(p.light || 'half') === l.key ? 'is-active' : ''}">${sunIcon(l.key, 20)}<span>${esc(l.short)}</span></button>`).join('')}
        </div>
        <p class="method-hint" id="light-hint">${esc(Catalog.lightInfo(p.light).how)}</p>

        <fieldset class="water-box">
          <legend>💧 Watering</legend>
          <div class="season-table" role="group" aria-label="Water every (days), by season">
            <span class="muted small">Water every… (days)</span>
            ${W.SEASONS.map((s) => {
              const v = p.schedule[s.key] || {};
              const now = s.key === W.season();
              return `
              <div class="season-row ${now ? 'is-current' : ''}">
                <span class="season-name">${s.emoji} ${s.name}${now ? '<em>now</em>' : ''}</span>
                <input name="min-${s.key}" type="number" min="1" max="120" inputmode="numeric" value="${esc(v.min ?? '')}" aria-label="${s.name}: minimum days">
                <span>–</span>
                <input name="max-${s.key}" type="number" min="1" max="120" inputmode="numeric" value="${esc(v.max ?? '')}" aria-label="${s.name}: maximum days">
              </div>`;
            }).join('')}
          </div>
          <div class="two-col">
            <label>Last watered<input name="lastWatered" type="date" max="${today}" value="${esc(p.lastWatered || '')}"></label>
            <label>Next due<input name="nextDue" type="date" value="${esc(p.nextDue || '')}"></label>
          </div>
          <div class="label-row">
            <label for="water-method">How to water</label>
            <button type="button" class="help-inline" id="method-help" data-guide="${esc(p.waterMethod || 'top')}" aria-label="How to water: open the watering guide">?</button>
          </div>
          <select id="water-method" name="waterMethod">
            ${Catalog.methods.map((m) => `<option value="${m.key}" ${m.key === (p.waterMethod || 'top') ? 'selected' : ''}>${m.emoji} ${esc(m.name)}</option>`).join('')}
          </select>
          <p class="method-hint" id="method-hint">${esc(Catalog.method(p.waterMethod).how)}</p>
          <div class="water-type-field" ${Store.showWaterType() ? '' : 'hidden'}>
          <div class="label-row">
            <label for="water-type">Water type</label>
            <button type="button" class="help-inline" data-guide="water" aria-label="Rain or tap water: open the watering guide">?</button>
          </div>
          <input id="water-type" name="waterType" list="water-types" value="${esc(p.waterType)}">
          <datalist id="water-types">${WATER_TYPES.map((w) => `<option value="${esc(w)}">`).join('')}</datalist>
          </div>
          ${history ? `<div class="history"><span class="muted small">Recent waterings</span><div>${history}</div></div>` : ''}
        </fieldset>

        <label>Care notes<textarea name="notes" rows="4">${esc(p.notes)}</textarea></label>
        <div class="form-actions">
          ${existing ? '<button type="button" class="btn btn-danger" id="delete-plant">Delete</button>' : ''}
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`, (body) => {
      const form = $('#plant-form', body);
      const newRoomBox = $('.new-room', body);
      form.roomId.addEventListener('change', () => {
        newRoomBox.hidden = form.roomId.value !== '__new';
        if (!newRoomBox.hidden) form.newRoom.focus();
      });
      const fillSchedule = (sched) => W.SEASONS.forEach((s) => {
        form[`min-${s.key}`].value = sched[s.key].min;
        form[`max-${s.key}`].value = sched[s.key].max;
      });
      form.species.addEventListener('change', () => {
        const species = form.species.value || null;
        $('#form-avatar', body).innerHTML = avatarHtml({ ...p, species }, { size: 'avatar-lg' });
        // New plant: switch to that type's suggested schedule too.
        if (!existing && species) {
          const c = Catalog.get(species);
          fillSchedule(Catalog.schedule(species, c.minDays, c.maxDays));
          form.waterMethod.value = Catalog.defaultMethod(species);
          form.waterMethod.dispatchEvent(new Event('change'));
          setLight(Catalog.defaultLight(species));
          recalcDue();
        }
      });
      function setLight(key) {
        form.light.value = key;
        body.querySelectorAll('[data-light]').forEach((b) => {
          const on = b.dataset.light === key;
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-checked', String(on));
        });
        $('#light-hint', body).textContent = Catalog.lightInfo(key).how;
      }
      body.addEventListener('click', (e) => {
        const b = e.target.closest('[data-light]');
        if (b) setLight(b.dataset.light);
      });
      form.waterMethod.addEventListener('change', () => {
        $('#method-hint', body).textContent = Catalog.method(form.waterMethod.value).how;
        $('#method-help', body).dataset.guide = form.waterMethod.value;
      });
      const currentMin = () => form[`min-${W.season()}`];
      function recalcDue() {
        const min = parseInt(currentMin().value, 10);
        if (form.lastWatered.value && min) form.nextDue.value = W.addDays(form.lastWatered.value, min);
      }
      form.lastWatered.addEventListener('change', recalcDue);
      currentMin().addEventListener('change', recalcDue);
      if (!existing && !p.name) form.name.focus();

      const waterNow = $('#water-now', body);
      if (waterNow) waterNow.addEventListener('click', () => {
        const undo = Store.water(existing.id);
        closeSheet();
        toast(`${existing.name} watered 💧`, { label: 'Undo', run: () => Store.restore(undo) });
      });

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        let roomId = form.roomId.value || null;
        if (roomId === '__new') {
          const name = form.newRoom.value.trim();
          if (!name) { form.newRoom.focus(); return; }
          roomId = Store.addRoom({ name, emoji: '🪴' }).id;
        }
        const schedule = {};
        W.SEASONS.forEach((s) => {
          let min = parseInt(form[`min-${s.key}`].value, 10) || null;
          let max = parseInt(form[`max-${s.key}`].value, 10) || null;
          if (!min && !max) ({ min, max } = p.schedule[s.key] || { min: 7, max: 10 });
          min = min || max; max = max || min;
          if (min > max) [min, max] = [max, min];
          schedule[s.key] = { min, max };
        });
        const lastWatered = form.lastWatered.value || null;
        const history = [...(p.history || [])];
        if (lastWatered && !history.includes(lastWatered)) { history.push(lastWatered); history.sort().reverse(); }
        const fields = {
          name: form.name.value.trim(),
          detail: form.detail.value.trim(),
          species: form.species.value || null,
          roomId,
          placement: form.placement.value.trim(),
          schedule,
          waterType: form.waterType.value.trim(),
          waterMethod: form.waterMethod.value,
          light: form.light.value,
          notes: form.notes.value.trim(),
          lastWatered,
          nextDue: form.nextDue.value || (lastWatered ? W.addDays(lastWatered, schedule[W.season()].min) : W.today()),
          history,
        };
        if (existing) Store.updatePlant(existing.id, fields); else Store.addPlant(fields);
        closeSheet();
        toast(existing ? 'Plant saved' : `${fields.name} added 🌱`);
      });

      const del = $('#delete-plant', body);
      if (del) del.addEventListener('click', () => {
        if (confirm(`Delete ${existing.name}? This can't be undone.`)) {
          Store.deletePlant(existing.id);
          closeSheet();
          toast('Plant deleted');
        }
      });
    });
  }

  // ---------- room form ----------
  function openRoomForm(roomId) {
    const existing = roomId ? Store.room(roomId) : null;
    const r = existing || { name: '', emoji: '🪴' };
    const count = existing ? Store.plantsInRoom(existing.id).length : 0;

    openSheet(existing ? 'Edit room' : 'Create room', `
      <form id="room-form" class="form" autocomplete="off">
        <label>Room name<input name="name" required value="${esc(r.name)}" placeholder="e.g. Hallway"></label>
        <fieldset>
          <legend>Icon</legend>
          <div class="emoji-grid">
            ${ROOM_EMOJIS.map((em) => `<label class="emoji-opt"><input type="radio" name="emoji" value="${em}" ${em === r.emoji ? 'checked' : ''}><span>${em}</span></label>`).join('')}
          </div>
        </fieldset>
        <div class="form-actions">
          ${existing ? '<button type="button" class="btn btn-danger" id="delete-room">Delete</button>' : ''}
          <button type="button" class="btn btn-ghost" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>`, (body) => {
      const form = $('#room-form', body);
      if (!existing) form.name.focus();
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const fields = { name: form.name.value.trim(), emoji: form.emoji.value || '🪴' };
        if (existing) Store.updateRoom(existing.id, fields); else Store.addRoom(fields);
        closeSheet();
        toast(existing ? 'Room saved' : `${fields.name} created`);
      });
      const del = $('#delete-room', body);
      if (del) del.addEventListener('click', () => {
        const msg = count ? `Delete ${existing.name}? Its ${plural(count, 'plant')} will move to Unassigned.` : `Delete ${existing.name}?`;
        if (confirm(msg)) { Store.deleteRoom(existing.id); closeSheet(); toast('Room deleted'); }
      });
    });
  }

  // ---------- watering actions ----------
  function waterWithSplash(ids, message) {
    ids.forEach((id) => { const row = document.querySelector(`[data-row="${CSS.escape(id)}"]`); if (row) row.classList.add('is-splashing'); });
    setTimeout(() => {
      const undo = Store.water(ids);
      toast(message, { label: 'Undo', run: () => Store.restore(undo) });
    }, 420);
  }

  // ---------- events ----------
  document.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-close]');
    if (!t || t.closest('#toast')) return;
    if (t.dataset.tab) { state.tab = t.dataset.tab; render(); window.scrollTo(0, 0); return; }
    if (t.dataset.filter) { state.roomFilter = t.dataset.filter; render(); return; }
    if (t.dataset.water) { const p = Store.plant(t.dataset.water); waterWithSplash([p.id], `${p.name} watered 💧`); return; }
    if (t.dataset.snooze) {
      const p = Store.plant(t.dataset.snooze);
      const undo = Store.snooze(p.id, 1);
      toast(`We’ll check ${p.name} again tomorrow`, { label: 'Undo', run: () => Store.restore(undo) });
      return;
    }
    if (t.dataset.waterAll) {
      const kind = t.dataset.waterAll;
      const ids = Store.plants().filter((p) => W.status(p).kind === kind).map((p) => p.id);
      waterWithSplash(ids, `${plural(ids.length, 'plant')} watered 💧`);
      return;
    }
    if (t.dataset.plant) { openPlantForm(t.dataset.plant); return; }
    if (t.dataset.roomEdit) { openRoomForm(t.dataset.roomEdit); return; }
    if (t.dataset.roomView) { state.tab = 'plants'; state.roomFilter = t.dataset.roomView; render(); window.scrollTo(0, 0); return; }
    if (t.hasAttribute('data-close')) { closeSheet(); return; }
    if (t.id === 'fab') { if (state.tab === 'plants') openPicker(); else openRoomForm(); return; }
    if (t.id === 'help-btn' || t.id === 'set-guide') { openGuide(); return; }
    if (t.dataset.guide !== undefined) { openGuide(t.dataset.guide); return; }
    if (t.id === 'guide-close') { closeGuide(); return; }
    if (t.id === 'season-btn' || t.id === 'set-season') { openSeasonPicker(); return; }
    if (t.id === 'set-holiday') { if (Store.holiday()) openHolidayPlan(); else openHolidayForm(); return; }
    if (t.dataset.themeChoice) { PlantTheme.set(t.dataset.themeChoice); render(); return; }
    if (t.id === 'export-btn') { exportBackup(); return; }
    if (t.id === 'water-type-toggle') {
      const on = !Store.showWaterType();
      Store.setShowWaterType(on);
      toast(on ? 'Water types shown 🌧️' : 'Water types hidden');
      return;
    }
    if (t.id === 'rem-toggle') {
      Native.setReminders(!Store.reminders().on).then((r) => {
        if (r === 'denied') toast('Notifications are blocked — allow them in your phone’s Settings');
        else if (r === 'on') toast('Reminders on 🔔');
      });
      return;
    }
    if (t.id === 'import-btn') { $('#import-file').click(); return; }
    if (t.id === 'backup-now') { exportBackup(); return; }
    if (t.id === 'backup-later') { Store.snoozeBackup(7); toast('We’ll remind you again in a week'); return; }
    if (t.id === 'snapshots-btn') { openSnapshots(); return; }
    if (t.id === 'holiday-on' || t.id === 'holiday-edit') { openHolidayForm(); return; }
    if (t.id === 'holiday-plan') { openHolidayPlan(); return; }
    if (t.id === 'holiday-off') {
      if (confirm('Turn off holiday mode? Your sitter’s plan will be removed.')) { Store.endHoliday(false); toast('Holiday mode off'); }
      return;
    }
    if (t.id === 'holiday-apply') { Store.endHoliday(true); toast('Sitter’s visits added to your plants 💧'); return; }
    if (t.id === 'holiday-skip') { Store.endHoliday(false); toast('Holiday mode off'); return; }
    if (t.id === 'add-first') { state.tab = 'plants'; render(); openPicker(); return; }
    if (t.id === 'clear-btn') {
      const n = Store.plants().length;
      if (confirm(`Delete all ${plural(n, 'plant')} and their watering history? Rooms are kept.\n\nTip: export a backup first if you might want them back.`)) {
        Store.clearPlants();
        toast('All plants cleared');
      }
    }
  });

  $('#import-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const hasData = Store.plants().length > 0;
      if (hasData && !confirm('Importing replaces all your current plants and rooms with the ones in the file. Continue?')) return;
      const { rooms, plants } = Store.importJson(text);
      toast(`Imported ${plural(plants, 'plant')} and ${plural(rooms, 'room')} 🌱`);
    } catch (err) {
      alert(err.message || 'Sorry, that file couldn’t be imported.');
    }
  });

  document.addEventListener('input', (e) => {
    if (e.target.id === 'search') {
      state.search = e.target.value;
      const pos = e.target.selectionStart;
      renderPlants();
      const s = $('#search'); s.focus(); s.setSelectionRange(pos, pos);
    }
  });

  document.addEventListener('change', (e) => {
    if (e.target.id === 'rem-time' && e.target.value) { Store.setReminders({ time: e.target.value }); toast(`Reminders at ${e.target.value} 🔔`); }
  });

  // Android back button: close the guide / sheet, then go back to Today, then leave the app.
  Native.onBack(() => {
    if (!$('#guide').hidden) { closeGuide(); return true; }
    if (!$('#sheet').hidden) { closeSheet(); return true; }
    if (state.tab !== 'today') { state.tab = 'today'; render(); window.scrollTo(0, 0); return true; }
    return false;
  });

  $('#sheet-backdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!$('#guide').hidden) closeGuide();
    else if (!$('#sheet').hidden) closeSheet();
  });

  // Re-render when the app comes back to the foreground on a new day.
  let renderedDay = W.today();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && W.today() !== renderedDay) { renderedDay = W.today(); Store.refreshSeason(); render(); }
  });

  async function exportBackup() {
    if (Native.isApp) {
      try {
        await Native.shareBackupFile(`plant-pals-backup-${W.today()}.json`, Store.exportJson());
        Store.markFileBackup();
        toast('Backup saved 💾');
      } catch (e) {
        if (!/cancel/i.test(String(e && e.message))) alert('Sorry, the backup couldn’t be saved.');
      }
      return;
    }
    const blob = new Blob([Store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `plant-pals-backup-${W.today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    Store.markFileBackup();
    toast('Backup saved to your Downloads 💾');
  }

  Store.subscribe(render);
  render();
})();
