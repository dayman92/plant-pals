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
    if (!p.waterType) return '';
    const rain = /rain/i.test(p.waterType);
    return `<span class="pill ${rain ? 'pill-rain' : 'pill-tap'}">${rain ? '🌧️' : '🚰'} ${esc(p.waterType)}</span>`;
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
    $('#fab').hidden = state.tab === 'today';
    if (state.tab === 'today') renderToday();
    else if (state.tab === 'plants') renderPlants();
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
            ${nextUp ? `Next up: <strong>${esc(nextUp.p.name)}</strong> ${esc(W.friendly(nextUp.p.nextDue).toLowerCase())}.` : ''}</p>
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
              <span class="row-text"><span class="plant-name">${esc(p.name)}</span><span class="row-sub">${esc(roomLabel(p))} · next ${esc(W.friendly(p.nextDue).toLowerCase())}</span></span>
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

    $('#screen').innerHTML = seasonBanner() + hero
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

  function waterRow(p, s) {
    return `
      <li class="water-row s-${s.kind}" data-row="${esc(p.id)}">
        <button class="row-main" data-plant="${esc(p.id)}">
          ${avatarHtml(p, { mood: s.mood })}
          <span class="row-text">
            <span class="plant-name">${esc(p.name)}</span>
            <span class="row-sub">${esc(roomLabel(p))}${p.placement ? ` · ${esc(p.placement)}` : ''}</span>
            <span class="pills">${statusPill(p)}${waterPill(p)}</span>
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

    $('#screen').innerHTML = `
      ${rooms.length ? `<ul class="room-list">${cards}</ul>` : `<p class="empty big">No rooms yet. Tap ＋ to create one.</p>`}
      <section class="data-panel">
        <h2>Your data</h2>
        <p class="muted">Everything is stored on this device only. Export a backup now and then — uninstalling the app or clearing browser data wipes it.</p>
        <div class="row">
          <button class="btn btn-secondary" id="export-btn">Export backup</button>
          <button class="btn btn-ghost" id="import-btn">Import backup</button>
          <button class="btn btn-ghost btn-danger-text" id="clear-btn" ${Store.plants().length ? '' : 'disabled'}>Clear all plants</button>
        </div>
      </section>
    `;
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
          openPlantForm(null, { name: c.name, detail: c.latin, species: c.key, waterType: c.waterType, notes: c.note });
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
            ${existing ? `${statusPill(p)}<span class="muted small">${p.lastWatered ? `Last watered ${esc(W.friendly(p.lastWatered).toLowerCase())}` : 'Not watered in the app yet'}</span>
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
          <label>Water type<input name="waterType" list="water-types" value="${esc(p.waterType)}"></label>
          <datalist id="water-types">${WATER_TYPES.map((w) => `<option value="${esc(w)}">`).join('')}</datalist>
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
          recalcDue();
        }
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
    if (t.id === 'season-btn') { openSeasonPicker(); return; }
    if (t.id === 'export-btn') { exportBackup(); return; }
    if (t.id === 'import-btn') { $('#import-file').click(); return; }
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

  $('#sheet-backdrop').addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#sheet').hidden) closeSheet(); });

  // Re-render when the app comes back to the foreground on a new day.
  let renderedDay = W.today();
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && W.today() !== renderedDay) { renderedDay = W.today(); Store.refreshSeason(); render(); }
  });

  function exportBackup() {
    const blob = new Blob([Store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `plant-pals-backup-${W.today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  Store.subscribe(render);
  render();
})();
