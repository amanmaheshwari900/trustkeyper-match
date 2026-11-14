// The sales desk: leads from groups, matching, sending homes, visits.

import { pack, unpack } from './crypto.js';
import { extract } from './extract.js';
import { AREAS, area, cap, homesFor, monthly, tenantsFor } from './match.js';
import { store } from './store.js';
import { $, ago, bhkText, dayLabel, esc, facts, icon, initials, phoneText, rupees, sheet, short, telLink, toast, waLink, whoText } from './ui.js';
import { LANGS, firstCallMessage, ownerMessage, shortlistMessage } from './words.js';

const T_STATUS = { new: 'To call', talking: 'In touch', sent: 'Homes sent', visit: 'Visit booked', done: 'Closed', lost: 'Not interested' };
const H_STATUS = { available: 'Available', hold: 'On hold', rented: 'Rented', off: 'Not with us' };
const BHKS = [1, 1.5, 2, 2.5, 3, 3.5, 4, 5];
const ui = { tenantFilter: 'open', homeFilter: 'available', q: '', picks: {} };

// ------------------------------------------------------------------ shell

export function deskShell(app, active, body, title, back) {
  const tabs = [
    ['today', 'Today', 'today', '#/'],
    ['tenants', 'Tenants', 'users', '#/tenants'],
    ['homes', 'Homes', 'home', '#/homes'],
    ['visits', 'Visits', 'calendar', '#/visits'],
    ['more', 'More', 'more', '#/more'],
  ];
  const upcoming = store.local.visits.filter((v) => v.status === 'booked').length;
  const last = store.batches.at(-1);
  app.innerHTML = `
  <div class="desk">
    <aside class="d-side" aria-label="Main">
      <a href="#/" class="d-brand"><img src="trustkeyper-logo.png" alt="TrustKeyper"><span>Match desk</span></a>
      <nav>${tabs
        .map(
          ([k, label, ic, href]) =>
            `<a href="${href}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${k === 'visits' && upcoming ? `<i>${upcoming}</i>` : ''}</a>`,
        )
        .join('')}</nav>
      <a class="btn wide" href="#/add">${icon('plus', 18)} Add a lead</a>
      <p class="d-side-foot">${icon('spark', 16)} ${last ? `Groups read ${ago(last.at)}` : 'No group reading yet'}</p>
    </aside>
    <div class="d-body">
    <header class="d-top">
      ${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icon('back')}</a>` : `<img src="trustkeyper-mark.png" alt="" class="d-mark">`}
      <div class="d-title">${title ? `<b>${esc(title)}</b>` : '<b>TrustKeyper</b><span>Match</span>'}</div>
      <button class="icon-btn" data-act="refresh" aria-label="Get new leads">${icon('refresh')}</button>
    </header>
    <main class="d-main">${body}</main>
    </div>
    <nav class="d-nav" aria-label="Main">${tabs
      .map(
        ([k, label, ic, href]) =>
          `<a href="${href}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${k === 'visits' && upcoming ? `<i>${upcoming}</i>` : ''}</a>`,
      )
      .join('')}</nav>
  </div>`;
  app.querySelector('[data-act=refresh]').addEventListener('click', async (e) => {
    e.currentTarget.classList.add('spin');
    try {
      await store.refresh();
      toast('Up to date');
    } catch {
      toast('Could not refresh. Check the internet.');
    }
  });
}

// ---------------------------------------------------------------- sign in

export function signIn(app, after) {
  app.innerHTML = `
  <main class="signin">
    <img src="trustkeyper-logo.png" alt="TrustKeyper" class="signin-logo">
    <h1>Match desk</h1>
    <p class="muted">Tenants and homes from your groups, matched for you. For the TrustKeyper team.</p>
    <form id="si" class="card">
      <label class="field"><span>Team passphrase</span><input id="si-pass" type="password" autocomplete="current-password" required></label>
      <p class="err" id="si-err" hidden></p>
      <label class="check"><input type="checkbox" id="si-keep" checked> Keep me signed in on this device</label>
      <button class="btn wide" id="si-go">Open the desk</button>
    </form>
    <p class="muted small center">Ask Aman for the passphrase.</p>
  </main>`;
  $('#si').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('#si-go');
    btn.disabled = true;
    btn.textContent = 'Opening…';
    try {
      await store.signIn($('#si-pass').value, $('#si-keep').checked);
      after();
    } catch {
      const err = $('#si-err');
      err.hidden = false;
      err.textContent = 'That passphrase is not right.';
      btn.disabled = false;
      btn.textContent = 'Open the desk';
    }
  });
}

/** First time on a phone: who is sending the homes. */
export function setup(app, after) {
  const s = store.local.settings;
  app.innerHTML = `
  <main class="signin">
    <img src="trustkeyper-mark.png" alt="" class="signin-mark">
    <h1>Welcome</h1>
    <p class="muted">Tenants see your name and WhatsApp number on the homes you send.</p>
    <form id="su" class="card">
      <label class="field"><span>Your name</span><input id="su-name" value="${esc(s.name)}" required autocomplete="name"></label>
      <label class="field"><span>Your WhatsApp number</span><div class="phone-in"><b>+91</b><input id="su-phone" inputmode="numeric" maxlength="10" value="${esc(s.phone)}" required></div></label>
      <label class="field"><span>Visit fee tenants pay to book (₹0 to ₹500, usually ₹150)</span><input id="su-fee" inputmode="numeric" value="${esc(s.fee)}"></label>
      <p class="err" id="su-err" hidden></p>
      <button class="btn wide">Continue</button>
    </form>
  </main>`;
  $('#su').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#su-name').value.trim();
    const phone = $('#su-phone').value.replace(/\D/g, '');
    const fee = Math.max(0, Math.min(500, parseInt($('#su-fee').value, 10) || 0));
    const err = $('#su-err');
    if (name.length < 2 || !/^[6-9]\d{9}$/.test(phone)) {
      err.hidden = false;
      err.textContent = name.length < 2 ? 'Type your name' : 'Type your 10-digit WhatsApp number';
      return;
    }
    store.local.settings = { ...s, name, phone, fee };
    store.save();
    after();
  });
}

// ------------------------------------------------------------------ helpers

const openTenants = () => store.tenants.filter((t) => !['done', 'lost'].includes(t.status));
const liveHomes = () => store.homes.filter((h) => h.status !== 'rented' && h.status !== 'off');
const need = (t) =>
  [t.bhk && bhkText(t.bhk), t.budget && `up to ${short(t.budget)}`, (t.areas || []).map(cap).slice(0, 2).join(', ')].filter(Boolean).join(' · ') || 'Needs not clear yet';
const homeLine = (h) => [h.society, h.area].filter(Boolean).map(cap).join(', ') || 'Place not given';
const tName = (t) => t.name || 'Tenant (no name)';
const pill = (status, map) => `<span class="pill p-${status}">${esc(map[status] || status)}</span>`;
const source = (l) => (l.source ? `${esc(l.source.group || l.source.type || '')}${l.at ? ` · ${ago(l.at)}` : ''}` : '');
const today = () => new Date().toISOString().slice(0, 10);

function tenantRow(t) {
  const n = homesFor(t, liveHomes()).length;
  return `<a class="row" href="#/tenant/${esc(t.id)}">
    <span class="avatar">${esc(initials(t.name))}</span>
    <span class="row-main"><b>${esc(tName(t))}</b><span>${esc(need(t))}</span><small>${source(t)}</small></span>
    <span class="row-end">${n ? `<span class="count">${n} ${n === 1 ? 'home' : 'homes'}</span>` : '<span class="count none">no match</span>'}${pill(t.status, T_STATUS)}</span>
  </a>`;
}

function homeRow(h) {
  const n = tenantsFor(h, store.tenants).length;
  return `<a class="row" href="#/home/${esc(h.id)}">
    <span class="avatar sq">${esc(h.bhk || '?')}<small>BHK</small></span>
    <span class="row-main"><b>${esc(homeLine(h))}</b><span>${h.rent ? `${rupees(h.rent)}${h.maint ? ` + ${short(h.maint)}` : ''}` : 'Rent not given'}${h.furnishing ? ` · ${esc(cap(h.furnishing))}` : ''}</span><small>${source(h)}</small></span>
    <span class="row-end">${n ? `<span class="count">${n} ${n === 1 ? 'tenant' : 'tenants'}</span>` : ''}${pill(h.status, H_STATUS)}</span>
  </a>`;
}

// ------------------------------------------------------------------- today

export function todayScreen(app) {
  const s = store.local.settings;
  const homes = liveHomes();
  const ready = openTenants()
    .filter((t) => ['new', 'talking'].includes(t.status))
    .map((t) => ({ t, n: homesFor(t, homes).length }))
    .filter((x) => x.n)
    .sort((a, b) => b.n - a.n);
  const due = store.tenants.filter((t) => t.followUp && t.followUp <= today() && !['done', 'lost'].includes(t.status));
  const visitsToday = store.local.visits.filter((v) => v.status === 'booked' && v.day === today());
  const upcoming = store.local.visits.filter((v) => v.status === 'booked' && v.day >= today());
  const week = Date.now() - 7 * 86400000;
  const sentWeek = store.local.sent.filter((x) => new Date(x.at) > week).length;
  const last = store.batches.at(-1);
  const hour = new Date().getHours();
  const hello = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todo = [
    ...visitsToday.map(
      (v) => `<a class="todo" href="#/visits"><span class="todo-ic v">${icon('calendar', 20)}</span><span><b>Visit at ${esc(v.time)}</b><small>${esc(v.name)} · ${esc(v.home)}</small></span>${icon('next', 18)}</a>`,
    ),
    ...due.map(
      (t) => `<a class="todo" href="#/tenant/${esc(t.id)}"><span class="todo-ic f">${icon('clock', 20)}</span><span><b>Follow up ${esc(tName(t))}</b><small>${esc(t.followNote || need(t))}</small></span>${icon('next', 18)}</a>`,
    ),
    ...ready
      .slice(0, 8)
      .map(
        ({ t, n }) =>
          `<a class="todo" href="#/tenant/${esc(t.id)}"><span class="todo-ic m">${icon('send', 20)}</span><span><b>Send ${n} ${n === 1 ? 'home' : 'homes'} to ${esc(tName(t))}</b><small>${esc(need(t))}</small></span>${icon('next', 18)}</a>`,
      ),
  ];

  deskShell(
    app,
    'today',
    `
    <section class="hello"><p class="muted">${hello}${s.name ? `, ${esc(s.name.split(' ')[0])}` : ''}</p><h1>${ready.length ? `${ready.length} ${ready.length === 1 ? 'tenant is' : 'tenants are'} ready for homes` : 'You are all caught up'}</h1></section>
    <section class="hero">
      <div><span class="big">${ready.reduce((a, x) => a + x.n, 0)}</span><span>good matches waiting to be sent</span></div>
      ${ready[0] ? `<a class="btn light" href="#/tenant/${esc(ready[0].t.id)}">Start with ${esc(tName(ready[0].t).split(' ')[0])}</a>` : `<a class="btn light" href="#/add">Add a lead</a>`}
    </section>
    <section class="tiles">
      <a class="tile" href="#/tenants"><span class="big">${openTenants().length}</span><span>Tenants looking</span></a>
      <a class="tile" href="#/homes"><span class="big">${homes.length}</span><span>Homes available</span></a>
      <a class="tile" href="#/tenants?f=sent"><span class="big">${sentWeek}</span><span>Shortlists sent this week</span></a>
      <a class="tile" href="#/visits"><span class="big">${upcoming.length}</span><span>Visits coming up</span></a>
    </section>
    <div class="split"><div class="col-b">
    <h2 class="sec">Do these now</h2>
    ${todo.length ? `<div class="list">${todo.join('')}</div>` : `<div class="empty small">${icon('check', 28)}<p>Nothing waiting. New leads from groups show up here.</p></div>`}
    </div><div class="col-a">
    <h2 class="sec">Newest tenants</h2>
    <div class="list">${openTenants().slice(0, 6).map(tenantRow).join('') || '<div class="empty small"><p>No tenants yet.</p></div>'}</div>
    <a class="source-strip" href="#/more">${icon('spark', 18)}<span>${last ? `Last read from groups ${ago(last.at)} · ${last.count} leads` : 'No group reading yet'}</span>${icon('next', 16)}</a>
    </div></div>
  `,
  );
}

// ----------------------------------------------------------------- tenants

export function tenantsScreen(app, params) {
  if (params.get('f')) ui.tenantFilter = params.get('f');
  const filters = { open: 'Looking', new: 'To call', talking: 'In touch', sent: 'Homes sent', visit: 'Visit booked', done: 'Closed', lost: 'Not interested' };
  const q = ui.q.toLowerCase();
  const list = store.tenants
    .filter((t) => (ui.tenantFilter === 'open' ? !['done', 'lost'].includes(t.status) : t.status === ui.tenantFilter))
    .filter((t) => !q || JSON.stringify([t.name, t.phone, t.areas, t.bhk, t.source?.text]).toLowerCase().includes(q));
  deskShell(
    app,
    'tenants',
    `
    <div class="search">${icon('search', 18)}<input id="q" placeholder="Search name, number or area" value="${esc(ui.q)}" aria-label="Search tenants"></div>
    <div class="chips scroll">${Object.entries(filters)
      .map(([k, v]) => `<button class="pick ${k === ui.tenantFilter ? 'on' : ''}" data-f="${k}">${v}</button>`)
      .join('')}</div>
    <p class="muted small">${list.length} ${list.length === 1 ? 'tenant' : 'tenants'} · most matches first</p>
    <div class="list">${
      list
        .map((t) => ({ t, n: homesFor(t, liveHomes()).length }))
        .sort((a, b) => b.n - a.n)
        .map(({ t }) => tenantRow(t))
        .join('') || `<div class="empty small"><p>No tenants here.</p></div>`
    }</div>
    <a class="fab" href="#/add?k=tenant" aria-label="Add a tenant">${icon('plus', 26)}</a>
  `,
  );
  bindList(app, () => tenantsScreen(app, new URLSearchParams()), (k) => (ui.tenantFilter = k));
}

function bindList(app, redraw, setFilter) {
  const q = $('#q', app);
  q.addEventListener('input', () => {
    ui.q = q.value;
    clearTimeout(q._t);
    q._t = setTimeout(() => {
      redraw();
      const n = $('#q');
      n.focus();
      n.setSelectionRange(n.value.length, n.value.length);
    }, 250);
  });
  app.querySelectorAll('[data-f]').forEach((b) =>
    b.addEventListener('click', () => {
      setFilter(b.dataset.f);
      redraw();
    }),
  );
}

export function tenantScreen(app, id) {
  const t = store.get(id);
  if (!t) return notFound(app, '#/tenants');
  const s = store.local.settings;
  const matches = homesFor(t, liveHomes());
  if (!ui.picks[id]) ui.picks[id] = new Set(matches.slice(0, 3).map((m) => m.h.id));
  const picks = ui.picks[id];
  const sentBefore = store.sentTo(id);
  const ask = [t.bhk && bhkText(t.bhk), (t.areas || [])[0] && `in ${cap(t.areas[0])}`].filter(Boolean).join(' ') || 'a home';

  deskShell(
    app,
    'tenants',
    `
    <div class="split"><div class="col-a">
    <section class="person">
      <span class="avatar lg">${esc(initials(t.name))}</span>
      <div><h1>${esc(tName(t))}</h1><p class="muted">${t.phone ? esc(phoneText(t.phone)) : 'No number yet'}</p></div>
    </section>
    <div class="btn-row">
      ${t.phone ? `<a class="btn ghost" href="${telLink(t.phone)}">${icon('phone', 18)} Call</a><button class="btn ghost" data-act="hi">${icon('chat', 18)} WhatsApp</button>` : `<button class="btn ghost" data-act="edit">${icon('edit', 18)} Add number</button>`}
    </div>
    <div class="chips scroll status-pick">${Object.entries(T_STATUS)
      .map(([k, v]) => `<button class="pick ${k === t.status ? 'on' : ''}" data-st="${k}">${v}</button>`)
      .join('')}</div>

    <section class="card">
      <div class="row-between"><h2>Looking for</h2><button class="link" data-act="edit">${icon('edit', 16)} Edit</button></div>
      <dl class="kv">
        <div><dt>Size</dt><dd>${t.bhk ? bhkText(t.bhk) : '—'}</dd></div>
        <div><dt>Budget</dt><dd>${t.budget ? `${rupees(t.budget)} / month` : '—'}</dd></div>
        <div><dt>Areas</dt><dd>${esc((t.areas || []).map(cap).join(', ') || '—')}</dd></div>
        <div><dt>Who</dt><dd>${t.who ? esc(whoText(t.who)) : '—'}</dd></div>
        <div><dt>Furnishing</dt><dd>${esc(cap(t.furnishing) || 'Any')}</dd></div>
        <div><dt>Move in</dt><dd>${esc(t.moveIn || '—')}</dd></div>
        ${t.food ? `<div><dt>Food</dt><dd>${esc(t.food)}</dd></div>` : ''}
        ${t.pets ? '<div><dt>Pets</dt><dd>Has a pet</dd></div>' : ''}
      </dl>
      ${!t.budget || !t.areas?.length ? `<p class="hint">${icon('spark', 16)} Ask for their ${[!t.budget && 'budget', !t.areas?.length && 'area'].filter(Boolean).join(' and ')} — matches get much better.</p>` : ''}
    </section>

    </div><div class="col-b">
    <h2 class="sec">${matches.length ? `${matches.length} ${matches.length === 1 ? 'home fits' : 'homes fit'}` : 'No home fits yet'}</h2>
    ${
      matches.length
        ? `<p class="muted small">Tick the homes to send. Best fit first.</p><div class="list">${matches
            .map(
              ({ h, f }) => `<label class="match ${picks.has(h.id) ? 'on' : ''}">
          <input type="checkbox" data-pick="${esc(h.id)}" ${picks.has(h.id) ? 'checked' : ''}>
          <span class="tick">${icon('check', 16)}</span>
          <span class="row-main"><b>${esc(bhkText(h.bhk))} · ${esc(homeLine(h))}</b><span>${rupees(h.rent)}${h.maint ? ` + ${short(h.maint)}` : ''}${h.furnishing ? ` · ${esc(cap(h.furnishing))}` : ''}</span>
          <small class="good">${f.reasons.map(esc).join(' · ')}</small>${f.warnings.length ? `<small class="warn">${f.warnings.map(esc).join(' · ')}</small>` : ''}</span>
          <span class="fit">${f.score}%</span>
          <a class="row-open" href="#/home/${esc(h.id)}" aria-label="Open home">${icon('next', 18)}</a>
        </label>`,
            )
            .join('')}</div>`
        : `<div class="empty small"><p>${t.bhk || t.budget || t.areas?.length ? 'Nothing in the list fits these needs. Check with the tenant or add homes.' : 'Add what they need (size, budget, area) to find homes.'}</p></div>`
    }
    ${matches.length ? `<div class="sticky-cta"><button class="btn wide" data-act="send" ${picks.size ? '' : 'disabled'}>${icon('send', 18)} Send ${picks.size} ${picks.size === 1 ? 'home' : 'homes'}</button></div>` : ''}
    </div><div class="col-a">

    <section class="card">
      <h2>Follow-up</h2>
      <label class="field"><span>Next follow-up</span><input type="date" id="fu" value="${esc(t.followUp || '')}"></label>
      <label class="field"><span>Note</span><textarea id="note" rows="2" placeholder="e.g. Call after 6 pm, wants east facing">${esc(t.note || '')}</textarea></label>
      <button class="btn ghost" data-act="savenote">Save</button>
    </section>

    ${sentBefore.length ? `<section class="card"><h2>Sent before</h2>${sentBefore.map((x) => `<p class="small">${ago(x.at)} · ${x.homeIds.length} ${x.homeIds.length === 1 ? 'home' : 'homes'}</p>`).join('')}</section>` : ''}
    ${t.source?.text ? `<details class="card"><summary><b>Original post</b> <span class="muted small">${source(t)}</span></summary><p class="post">${esc(t.source.text)}</p></details>` : ''}
    </div></div>
  `,
    tName(t),
    '#/tenants',
  );

  app.querySelectorAll('[data-pick]').forEach((c) =>
    c.addEventListener('change', () => {
      c.checked ? picks.add(c.dataset.pick) : picks.delete(c.dataset.pick);
      tenantScreen(app, id);
    }),
  );
  app.querySelectorAll('[data-st]').forEach((b) =>
    b.addEventListener('click', () => {
      store.edit(id, { status: b.dataset.st });
      toast(`Marked: ${T_STATUS[b.dataset.st]}`);
    }),
  );
  app.querySelectorAll('[data-act=edit]').forEach((b) => b.addEventListener('click', () => editLead(t)));
  app.querySelector('[data-act=savenote]').addEventListener('click', () => {
    store.edit(id, { followUp: $('#fu').value, note: $('#note').value.trim() });
    toast('Saved');
  });
  app.querySelector('[data-act=hi]')?.addEventListener('click', () =>
    chooseLang('First message', (lang) => firstCallMessage(lang, { tenant: (t.name || '').split(' ')[0], manager: s.name, ask })).then((m) => {
      if (m) {
        window.open(waLink(t.phone, m), '_blank');
        if (t.status === 'new') store.edit(id, { status: 'talking' });
      }
    }),
  );
  app.querySelector('[data-act=send]')?.addEventListener('click', () => sendHomes(t, matches.filter((m) => picks.has(m.h.id))));
}

/** Builds the tenant's link and opens WhatsApp with it. */
async function sendHomes(t, chosen) {
  const s = store.local.settings;
  const sid = `s-${Date.now().toString(36)}`;
  const data = {
    v: 1,
    id: sid,
    tid: t.id,
    t: (t.name || '').split(' ')[0],
    m: { n: s.name, p: s.phone },
    fee: s.fee || 0,
    h: chosen.map(({ h, f }) => ({
      i: h.id,
      bhk: h.bhk,
      society: h.society,
      area: h.area,
      rent: h.rent,
      maint: h.maint,
      maintIncl: h.maintIncl,
      dep: h.deposit,
      lock: h.lock,
      avail: h.available,
      sqft: h.sqft,
      floor: h.floor,
      floors: h.floors,
      facing: h.facing,
      furnishing: h.furnishing,
      parking: h.parking,
      who: h.who,
      photos: h.photos,
      note: h.publicNote,
      score: f.score,
      why: f.reasons,
    })),
  };
  const link = `${location.origin}${location.pathname}#/s/${pack(data)}`;
  const msg = await chooseLang(`Send ${chosen.length} ${chosen.length === 1 ? 'home' : 'homes'}`, (lang) =>
    shortlistMessage(lang, { tenant: data.t, count: chosen.length, link, manager: s.name }),
    link,
  );
  if (!msg) return;
  if (t.phone) window.open(waLink(t.phone, msg), '_blank');
  else {
    await navigator.clipboard?.writeText(msg).catch(() => {});
    toast('No number saved. Message copied — paste it in WhatsApp.');
  }
  store.sent(t.id, data.h.map((h) => h.i));
}

/** Pick a language, see the message, then send. Resolves with the text. */
function chooseLang(title, make, preview) {
  let lang = 'en';
  return sheet(
    `<h2>${esc(title)}</h2>
     <div class="chips">${Object.entries(LANGS)
       .map(([k, v]) => `<button class="pick ${k === lang ? 'on' : ''}" data-l="${k}">${v}</button>`)
       .join('')}</div>
     <textarea id="msg" rows="8" class="msg"></textarea>
     ${preview ? `<a class="link" href="${preview}" target="_blank" rel="noopener">${icon('link', 16)} See what the tenant sees</a>` : ''}
     <button class="btn wide wa" id="go">${icon('chat', 18)} Open WhatsApp</button>`,
    (el, close) => {
      const box = el.querySelector('#msg');
      const fill = () => (box.value = make(lang));
      fill();
      el.querySelectorAll('[data-l]').forEach((b) =>
        b.addEventListener('click', () => {
          lang = b.dataset.l;
          el.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('on', x === b));
          fill();
        }),
      );
      el.querySelector('#go').addEventListener('click', () => close(box.value));
    },
  );
}

// ------------------------------------------------------------------- homes

export function homesScreen(app) {
  const filters = { available: 'Available', hold: 'On hold', rented: 'Rented', all: 'All' };
  const q = ui.q.toLowerCase();
  const list = store.homes
    .filter((h) => ui.homeFilter === 'all' || h.status === ui.homeFilter)
    .filter((h) => !q || JSON.stringify([h.society, h.area, h.bhk, h.rent, h.ownerName, h.ownerPhone, h.source?.text]).toLowerCase().includes(q));
  deskShell(
    app,
    'homes',
    `
    <div class="search">${icon('search', 18)}<input id="q" placeholder="Search society, area or owner" value="${esc(ui.q)}" aria-label="Search homes"></div>
    <div class="chips scroll">${Object.entries(filters)
      .map(([k, v]) => `<button class="pick ${k === ui.homeFilter ? 'on' : ''}" data-f="${k}">${v}</button>`)
      .join('')}</div>
    <p class="muted small">${list.length} ${list.length === 1 ? 'home' : 'homes'}</p>
    <div class="list">${list.map(homeRow).join('') || `<div class="empty small"><p>No homes here.</p></div>`}</div>
    <a class="fab" href="#/add?k=home" aria-label="Add a home">${icon('plus', 26)}</a>
  `,
  );
  bindList(app, () => homesScreen(app), (k) => (ui.homeFilter = k));
}

export function homeScreen(app, id) {
  const h = store.get(id);
  if (!h) return notFound(app, '#/homes');
  const s = store.local.settings;
  const fits = tenantsFor(h, store.tenants);
  deskShell(
    app,
    'homes',
    `
    <div class="split"><div class="col-a">
    <section class="h-head">
      <div class="h-panel"><div class="h-panel-bhk">${esc(bhkText(h.bhk))}</div><div class="h-panel-place">${icon('pin', 16)}${esc(homeLine(h))}</div></div>
      <div class="row-between"><div class="price">${h.rent ? rupees(h.rent) : 'Rent ?'}<small>/month</small></div>${pill(h.status, H_STATUS)}</div>
      <p class="muted small">${h.maint ? `+ ${rupees(h.maint)} maintenance` : h.maintIncl ? 'Maintenance included' : 'Maintenance not given'} · total ${rupees(monthly(h))}</p>
    </section>
    <div class="chips">${facts(h)
      .map(([ic, x]) => `<span class="chip">${icon(ic, 15)}${esc(x)}</span>`)
      .join('')}</div>
    <div class="chips scroll status-pick">${Object.entries(H_STATUS)
      .map(([k, v]) => `<button class="pick ${k === h.status ? 'on' : ''}" data-st="${k}">${v}</button>`)
      .join('')}</div>

    <section class="card">
      <div class="row-between"><h2>Details</h2><button class="link" data-act="edit">${icon('edit', 16)} Edit</button></div>
      <dl class="kv">
        <div><dt>Flat</dt><dd>${esc(h.flat || '—')}</dd></div>
        <div><dt>Deposit</dt><dd>${esc(h.deposit || '—')}</dd></div>
        <div><dt>Lock-in</dt><dd>${esc(h.lock || '—')}</dd></div>
        <div><dt>Available</dt><dd>${esc(h.available || '—')}</dd></div>
        <div><dt>Who</dt><dd>${esc(whoText(h.who || 'any'))}</dd></div>
        <div><dt>Keys</dt><dd>${esc(h.keys || '—')}</dd></div>
        <div><dt>Photos</dt><dd>${h.photos ? `<a href="${esc(h.photos)}" target="_blank" rel="noopener">Open</a>` : '—'}</dd></div>
      </dl>
      ${h.food ? `<p class="small"><b>Food:</b> ${esc(h.food)}</p>` : ''}
      ${h.note ? `<p class="small"><b>Note:</b> ${esc(h.note)}</p>` : ''}
    </section>

    <section class="card">
      <h2>Owner</h2>
      <p>${esc(h.ownerName || 'Name not given')}${h.ownerPhone ? ` · ${esc(phoneText(h.ownerPhone))}` : ''}</p>
      ${h.ownerPhone ? `<div class="btn-row"><a class="btn ghost" href="${telLink(h.ownerPhone)}">${icon('phone', 18)} Call</a><button class="btn ghost" data-act="owner">${icon('chat', 18)} WhatsApp</button></div>` : ''}
      <p class="muted small">${icon('shield', 14)} Owner details and flat number are never sent to tenants.</p>
    </section>

    </div><div class="col-b">
    <h2 class="sec">${fits.length ? `${fits.length} ${fits.length === 1 ? 'tenant fits' : 'tenants fit'}` : 'No tenant fits yet'}</h2>
    <div class="list">${fits
      .map(
        ({ t, f }) => `<a class="row" href="#/tenant/${esc(t.id)}" data-pickfor="${esc(t.id)}">
        <span class="avatar">${esc(initials(t.name))}</span>
        <span class="row-main"><b>${esc(tName(t))}</b><span>${esc(need(t))}</span><small class="good">${f.reasons.map(esc).join(' · ')}</small></span>
        <span class="row-end"><span class="fit">${f.score}%</span>${pill(t.status, T_STATUS)}</span></a>`,
      )
      .join('')}</div>
    ${h.source?.text ? `<details class="card"><summary><b>Original post</b> <span class="muted small">${source(h)}</span></summary><p class="post">${esc(h.source.text)}</p></details>` : ''}
    </div></div>
  `,
    bhkText(h.bhk),
    '#/homes',
  );
  app.querySelectorAll('[data-st]').forEach((b) =>
    b.addEventListener('click', () => {
      store.edit(id, { status: b.dataset.st });
      toast(`Marked: ${H_STATUS[b.dataset.st]}`);
    }),
  );
  // Opening a tenant from here ticks this home for them.
  app.querySelectorAll('[data-pickfor]').forEach((a) =>
    a.addEventListener('click', () => {
      const tid = a.dataset.pickfor;
      ui.picks[tid] = ui.picks[tid] || new Set();
      ui.picks[tid].add(id);
    }),
  );
  app.querySelector('[data-act=edit]').addEventListener('click', () => editLead(h));
  app.querySelector('[data-act=owner]')?.addEventListener('click', () =>
    chooseLang('Message the owner', (lang) => ownerMessage(lang, { owner: (h.ownerName || '').split(' ')[0], manager: s.name, home: `${bhkText(h.bhk)} in ${homeLine(h)}` })).then(
      (m) => m && window.open(waLink(h.ownerPhone, m), '_blank'),
    ),
  );
}

// ------------------------------------------------------------------ visits

export function visitsScreen(app) {
  const all = store.local.visits;
  const up = all.filter((v) => v.status === 'booked').sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  const past = all.filter((v) => v.status !== 'booked');
  const card = (v) => `<div class="visit">
    <div class="visit-when"><b>${esc(dayLabel(v.day))}</b><span>${esc(v.time)}</span></div>
    <div class="row-main"><b>${esc(v.name)}</b><span>${esc(v.home)}</span><small>${esc(phoneText(v.phone))} · code ${esc(v.code)}${v.fee ? ` · paid ${rupees(v.fee)}${v.test ? ' (test)' : ''}` : ''}</small></div>
    ${
      v.status === 'booked'
        ? `<div class="visit-acts"><a class="icon-btn" href="${telLink(v.phone)}" aria-label="Call">${icon('phone', 18)}</a><button class="btn small" data-v="${esc(v.id)}" data-s="done" data-code="${esc(v.code)}">Enter code</button><button class="btn ghost small" data-v="${esc(v.id)}" data-s="noshow">Did not come</button><button class="link small" data-v="${esc(v.id)}" data-s="cancelled">Cancel</button></div>`
        : `<span class="pill p-${v.status}">${{ done: 'Done', noshow: 'Did not come', cancelled: 'Cancelled' }[v.status]}</span>`
    }
  </div>`;
  deskShell(
    app,
    'visits',
    `
    <h2 class="sec">Coming up</h2>
    ${up.length ? `<div class="list">${up.map(card).join('')}</div>` : `<div class="empty small">${icon('calendar', 28)}<p>No visits yet. When a tenant books from your link, they send it to you on WhatsApp. Tap the link in their message and it lands here.</p></div>`}
    ${past.length ? `<h2 class="sec">Earlier</h2><div class="list">${past.map(card).join('')}</div>` : ''}
  `,
  );
  app.querySelectorAll('[data-v]').forEach((b) =>
    b.addEventListener('click', async () => {
      // As in TrustKeeper 2: the visit counts as done only with the tenant's code.
      if (b.dataset.s === 'done' && !(await askCode(b.dataset.code))) return;
      store.setVisit(b.dataset.v, { status: b.dataset.s });
      if (b.dataset.s === 'done') {
        const v = store.local.visits.find((x) => x.id === b.dataset.v);
        if (v?.tid && store.get(v.tid)) store.edit(v.tid, { status: 'visit' });
      }
      toast('Updated');
    }),
  );
}

function askCode(code) {
  return sheet(
    `<h2>Visit code</h2><p class="muted">Ask the tenant for their 4-digit code.</p>
     <input id="vc" inputmode="numeric" maxlength="4" class="code-in" aria-label="Visit code">
     <p class="err" id="vc-err" hidden>That code is not right</p>
     <button class="btn wide" id="vc-go">Confirm visit</button>`,
    (el, close) => {
      const go = () => {
        if (el.querySelector('#vc').value.trim() === code) close(true);
        else el.querySelector('#vc-err').hidden = false;
      };
      el.querySelector('#vc-go').addEventListener('click', go);
      el.querySelector('#vc').addEventListener('keydown', (e) => e.key === 'Enter' && go());
      setTimeout(() => el.querySelector('#vc').focus(), 250);
    },
  );
}

/** A tenant's booking link opened on the desk. */
export function bookingScreen(app, code) {
  let v;
  try {
    v = unpack(code);
  } catch {
    return notFound(app, '#/visits');
  }
  const fresh = store.addVisit(v);
  deskShell(
    app,
    'visits',
    `
    <div class="empty">${icon('check', 36)}<h2>${fresh ? 'Visit added' : 'Already in your visits'}</h2>
    <p><b>${esc(v.name)}</b> · ${esc(phoneText(v.phone))}<br>${esc(v.home)}<br>${esc(dayLabel(v.day))}, ${esc(v.time)} · code <b>${esc(v.code)}</b></p>
    <a class="btn" href="#/visits">See all visits</a></div>
  `,
    'New visit',
    '#/visits',
  );
}

// -------------------------------------------------------------------- more

export function moreScreen(app) {
  const s = store.local.settings;
  const batches = [...store.batches].reverse();
  deskShell(
    app,
    'more',
    `
    <section class="card">
      <h2>You</h2>
      <p>${esc(s.name)} · ${esc(phoneText(s.phone))}</p>
      <p class="muted small">Visit fee tenants pay: ${s.fee ? rupees(s.fee) : 'Free'}</p>
      <button class="btn ghost" data-act="setup">${icon('edit', 18)} Change</button>
    </section>
    <a class="row" href="#/add">${icon('plus')}<span class="row-main"><b>Add a lead</b><span>Paste a post, or type a tenant or home</span></span>${icon('next', 18)}</a>
    <h2 class="sec">From groups</h2>
    <p class="muted small">Claude reads the WhatsApp and Facebook groups and adds new tenants and homes here. ${store.tenants.length} tenants and ${store.homes.length} homes so far.</p>
    <div class="list">${
      batches
        .map(
          (b) => `<div class="row"><span class="avatar sq">${icon('spark', 18)}</span><span class="row-main"><b>${esc(b.source)}</b><span>${b.count} leads</span><small>${ago(b.at)}</small></span></div>`,
        )
        .join('') || '<div class="empty small"><p>Nothing read yet.</p></div>'
    }</div>
    <h2 class="sec">Backup</h2>
    <p class="muted small">Your calls, notes, sent homes and visits are kept on this device. Download a backup now and then.</p>
    <div class="btn-row"><button class="btn ghost" data-act="backup">${icon('download', 18)} Download</button><label class="btn ghost">${icon('upload', 18)} Restore<input type="file" accept=".json" id="restore" hidden></label></div>
    <button class="btn ghost wide danger" data-act="out">${icon('logout', 18)} Sign out</button>
  `,
  );
  app.querySelector('[data-act=setup]').addEventListener('click', () => setup(app, () => (location.hash = '#/more')));
  app.querySelector('[data-act=out]').addEventListener('click', () => {
    store.signOut();
    location.hash = '#/';
    location.reload();
  });
  app.querySelector('[data-act=backup]').addEventListener('click', () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([store.exportBackup()], { type: 'application/json' }));
    a.download = `trustkeyper-match-backup-${today()}.json`;
    a.click();
  });
  $('#restore').addEventListener('change', async (e) => {
    try {
      store.importBackup(await e.target.files[0].text());
      toast('Backup restored');
    } catch (err) {
      toast(err.message || 'Could not restore');
    }
  });
}

// --------------------------------------------------------------- add / edit

export function addScreen(app, params) {
  const kind = params.get('k') || 'tenant';
  deskShell(
    app,
    'more',
    `
    <div class="seg"><a href="#/add?k=tenant" class="${kind === 'tenant' ? 'on' : ''}">Tenant</a><a href="#/add?k=home" class="${kind === 'home' ? 'on' : ''}">Home</a></div>
    <section class="card">
      <h2>Paste a post</h2>
      <p class="muted small">From WhatsApp or Facebook. We fill in what we can; check it before saving.</p>
      <textarea id="post" rows="5" placeholder="e.g. Looking for 2BHK semi furnished in Gachibowli, budget 45k, family. 98xxxxxxxx"></textarea>
      <button class="btn ghost" data-act="fill">${icon('spark', 18)} Fill from post</button>
    </section>
    <form id="lead" class="card">${leadForm(kind, {})}<button class="btn wide">Save ${kind}</button></form>
  `,
    kind === 'tenant' ? 'Add a tenant' : 'Add a home',
    kind === 'tenant' ? '#/tenants' : '#/homes',
  );
  app.querySelector('[data-act=fill]').addEventListener('click', () => {
    const got = extract($('#post').value);
    if (got.kind !== kind) {
      location.hash = `#/add?k=${got.kind}`;
      setTimeout(() => {
        $('#post').value = got.text;
        fillForm(got);
      }, 30);
      return;
    }
    fillForm(got);
  });
  $('#lead').addEventListener('submit', (e) => {
    e.preventDefault();
    const lead = readForm(kind);
    const post = $('#post').value.trim();
    if (post) lead.source = { type: 'Pasted post', text: post };
    const id = store.add(lead);
    toast('Saved');
    location.hash = kind === 'tenant' ? `#/tenant/${id}` : `#/home/${id}`;
  });
}

function fillForm(got) {
  const set = (id, v) => {
    const el = $(`#f-${id}`);
    if (el && v != null && v !== '') el.value = Array.isArray(v) ? v.join(', ') : v;
  };
  ['name', 'phone', 'budget', 'rent', 'maint', 'deposit', 'available', 'area', 'who', 'furnishing'].forEach((k) => set(k, got[k]));
  set('areas', got.areas);
  if (got.phone) set('ownerPhone', got.phone);
  if (got.bhk) set('bhk', got.bhk);
  toast('Filled in. Please check.');
}

function leadForm(kind, l) {
  const opt = (id, label, options, value) =>
    `<label class="field"><span>${label}</span><select id="f-${id}">${Object.entries(options)
      .map(([k, v]) => `<option value="${k}" ${String(value ?? '') === k ? 'selected' : ''}>${v}</option>`)
      .join('')}</select></label>`;
  const inp = (id, label, value, extra = '') => `<label class="field"><span>${label}</span><input id="f-${id}" value="${esc(value ?? '')}" ${extra}></label>`;
  const bhk = opt('bhk', 'Size', { '': 'Not given', ...Object.fromEntries(BHKS.map((b) => [b, `${b} BHK`])) }, l.bhk);
  const furn = opt('furnishing', 'Furnishing', { '': 'Any / not given', 'fully furnished': 'Fully furnished', 'semi-furnished': 'Semi-furnished', unfurnished: 'Unfurnished' }, l.furnishing);
  const who = opt('who', kind === 'tenant' ? 'Who' : 'Owner accepts', { '': 'Not given', any: 'Anyone', family: 'Family', 'bachelor-m': 'Bachelor men', 'bachelor-f': 'Bachelor women' }, l.who);
  if (kind === 'tenant')
    return `<datalist id="areas">${AREAS.map((a) => `<option value="${cap(a)}">`).join('')}</datalist>
    ${inp('name', 'Name', l.name, 'autocomplete="off"')}${inp('phone', 'Phone', l.phone, 'inputmode="numeric" maxlength="13"')}
    <div class="two">${bhk}${inp('budget', 'Budget per month (₹)', l.budget, 'inputmode="numeric"')}</div>
    ${inp('areas', 'Areas (comma between)', (l.areas || []).map(cap).join(', '), 'list="areas"')}
    <div class="two">${who}${furn}</div>
    ${inp('moveIn', 'Move in', l.moveIn, 'placeholder="e.g. 1 Dec"')}`;
  return `<datalist id="areas">${AREAS.map((a) => `<option value="${cap(a)}">`).join('')}</datalist>
    ${inp('society', 'Society / building', l.society)}${inp('area', 'Area', l.area, 'list="areas"')}
    <div class="two">${bhk}${inp('sqft', 'Size (sft)', l.sqft, 'inputmode="numeric"')}</div>
    <div class="two">${inp('rent', 'Rent (₹/month)', l.rent, 'inputmode="numeric"')}${inp('maint', 'Maintenance (₹/month)', l.maint, 'inputmode="numeric"')}</div>
    <div class="two">${inp('deposit', 'Deposit', l.deposit, 'placeholder="e.g. 2 months"')}${inp('lock', 'Lock-in', l.lock, 'placeholder="e.g. 6 months"')}</div>
    <div class="two">${furn}${who}</div>
    <div class="two">${inp('floor', 'Floor', l.floor, 'inputmode="numeric"')}${inp('facing', 'Facing', l.facing)}</div>
    <div class="two">${inp('parking', 'Parking', l.parking)}${inp('available', 'Available from', l.available)}</div>
    ${inp('photos', 'Photos link', l.photos, 'inputmode="url"')}
    <div class="two">${inp('ownerName', 'Owner name', l.ownerName)}${inp('ownerPhone', 'Owner phone', l.ownerPhone, 'inputmode="numeric"')}</div>
    ${inp('keys', 'Keys with', l.keys)}`;
}

function readForm(kind) {
  const v = (id) => $(`#f-${id}`)?.value.trim() ?? '';
  const n = (id) => {
    const x = parseFloat(v(id).replace(/[^\d.]/g, ''));
    return isNaN(x) ? undefined : x;
  };
  const phone = (id) => v(id).replace(/\D/g, '').slice(-10) || undefined;
  if (kind === 'tenant')
    return {
      kind,
      name: v('name'),
      phone: phone('phone'),
      bhk: n('bhk'),
      budget: n('budget'),
      areas: v('areas')
        .split(',')
        .map((a) => area(a))
        .filter(Boolean),
      who: v('who') || undefined,
      furnishing: v('furnishing') || undefined,
      moveIn: v('moveIn'),
    };
  return {
    kind,
    society: v('society'),
    area: area(v('area')) || undefined,
    bhk: n('bhk'),
    sqft: n('sqft'),
    rent: n('rent'),
    maint: n('maint'),
    deposit: v('deposit'),
    lock: v('lock'),
    furnishing: v('furnishing') || undefined,
    who: v('who') || 'any',
    floor: v('floor'),
    facing: v('facing'),
    parking: v('parking'),
    available: v('available'),
    photos: v('photos'),
    ownerName: v('ownerName'),
    ownerPhone: phone('ownerPhone'),
    keys: v('keys'),
  };
}

function editLead(l) {
  sheet(
    `<h2>Edit ${l.kind === 'tenant' ? 'tenant' : 'home'}</h2><form id="ed">${leadForm(l.kind, l)}<button class="btn wide">Save</button></form>`,
    (el, close) => {
      el.querySelector('#ed').addEventListener('submit', (e) => {
        e.preventDefault();
        const change = readForm(l.kind);
        Object.keys(change).forEach((k) => (change[k] === undefined || change[k] === '') && l[k] === undefined && delete change[k]);
        store.edit(l.id, change);
        close(true);
        toast('Saved');
      });
    },
  );
}

function notFound(app, back) {
  deskShell(app, 'today', `<div class="empty"><h2>Not found</h2><p>It may have been removed.</p><a class="btn" href="${back}">Go back</a></div>`, '', back);
}
