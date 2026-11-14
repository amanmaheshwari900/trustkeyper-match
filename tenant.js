// What a tenant sees from the WhatsApp link: the homes picked for them,
// each home's details, and booking a visit with a (test) payment.
// Everything they see travels inside the link; nothing private is in it.

import { pack, unpack } from './crypto.js';
import { cap } from './match.js';
import { $, bhkText, dayLabel, esc, facts, icon, rupees, sheet, toast, waLink, whoText } from './ui.js';

const MINE = 'tkm_my_visits_v1';

function myVisits() {
  try {
    return JSON.parse(localStorage.getItem(MINE) || '[]');
  } catch {
    return [];
  }
}

function keepVisit(v) {
  try {
    localStorage.setItem(MINE, JSON.stringify([v, ...myVisits()].slice(0, 20)));
  } catch {}
}

function header(back) {
  return `<header class="t-top">${back ? `<a class="icon-btn" href="${back}" aria-label="Back">${icon('back')}</a>` : '<span></span>'}<img src="trustkeyper-logo.png" alt="TrustKeyper" class="t-logo"><span></span></header>`;
}

// Card heading as in TrustKeeper 2: the society name, else the area.
function panel(h, big, photoLink = true) {
  const title = h.society || cap(h.area) || 'Hyderabad';
  const sub = [bhkText(h.bhk), h.society && cap(h.area)].filter(Boolean).join(' · ');
  return `<div class="h-panel ${big ? 'big' : ''}">
    <div class="h-panel-bhk">${esc(title)}</div>
    <div class="h-panel-place">${icon('pin', 16)}${esc(sub)}</div>
    ${h.photos && photoLink ? `<a class="h-photos" href="${esc(h.photos)}" target="_blank" rel="noopener">${icon('photo', 16)} Photos</a>` : ''}
  </div>`;
}

function price(h) {
  return `<div class="price">${rupees(h.rent)}<small>/month</small></div>
    <div class="muted small">${h.maint ? `+ ${rupees(h.maint)} maintenance` : h.maintIncl ? 'Maintenance included' : 'Maintenance as per society'}</div>`;
}

export function renderShortlist(app, code, rest) {
  let s;
  try {
    s = unpack(code);
  } catch {
    app.innerHTML = `${header()}<main class="t-main"><div class="empty">${icon('link', 36)}<h2>This link is broken</h2><p>Ask TrustKeyper to send it again.</p></div></main>`;
    return;
  }
  const base = `#/s/${code}`;
  const parts = rest ? rest.split('/') : [];
  if (parts[0] === 'h' && s.h[+parts[1]]) {
    const h = s.h[+parts[1]];
    if (parts[2] === 'book') return book(app, s, h, base, +parts[1]);
    return detail(app, s, h, base, +parts[1]);
  }
  list(app, s, base);
}

function list(app, s, base) {
  const mine = myVisits().filter((v) => v.sid === s.id);
  app.innerHTML = `${header()}
  <main class="t-main">
    <section class="t-hello">
      <p class="eyebrow">Picked for you</p>
      <h1>${s.t ? `${esc(s.t)}, here are` : 'Here are'} ${s.h.length} ${s.h.length === 1 ? 'home' : 'homes'} that fit</h1>
      <p class="muted">${esc(s.m?.n || 'Our team')} from TrustKeyper chose these for you. Book a visit for any you like.</p>
    </section>
    ${mine
      .map(
        (v) => `<div class="booked-strip">${icon('check', 18)}<div><b>Visit booked</b> · ${esc(v.home)}<br><span class="muted small">${esc(dayLabel(v.day))}, ${esc(v.time)} · code <b>${esc(v.code)}</b></span></div></div>`,
      )
      .join('')}
    ${s.h
      .map(
        (h, i) => `<article class="h-card">
        <a href="${base}/h/${i}" class="h-card-link" aria-label="See ${esc(bhkText(h.bhk))} details">${panel(h, false, false)}</a>
        ${h.photos ? `<a class="h-photos" href="${esc(h.photos)}" target="_blank" rel="noopener">${icon('photo', 16)} Photos</a>` : ''}
        <div class="h-body">
          <div class="row-between">${price(h)}${h.score ? `<span class="fit">${h.score}% fit</span>` : ''}</div>
          <div class="chips">${facts(h)
            .slice(0, 4)
            .map(([ic, t]) => `<span class="chip">${icon(ic, 15)}${esc(t)}</span>`)
            .join('')}</div>
          ${h.why?.length ? `<ul class="why">${h.why.map((w) => `<li>${icon('check', 15)}${esc(w)}</li>`).join('')}</ul>` : ''}
          <div class="btn-row"><a class="btn ghost" href="${base}/h/${i}">See details</a><a class="btn" href="${base}/h/${i}/book">Book a visit</a></div>
        </div>
      </article>`,
      )
      .join('')}
    <p class="t-foot">${icon('shield', 16)} Flat number and owner details are shared after your visit is booked.</p>
    ${s.m?.p ? `<a class="btn ghost wide" href="${waLink(s.m.p, `Hi ${s.m.n || ''}, I have a question about the homes you sent.`)}" target="_blank" rel="noopener">${icon('chat', 18)} Ask ${esc(s.m.n || 'us')} on WhatsApp</a>` : ''}
  </main>`;
}

function detail(app, s, h, base, i) {
  const rows = [
    ['Rent', `${rupees(h.rent)} / month`],
    ['Maintenance', h.maint ? `${rupees(h.maint)} / month` : h.maintIncl ? 'Included in rent' : 'As per society'],
    ['Security deposit', h.dep],
    ['Lock-in', h.lock],
    ['Available', h.avail],
    ['Who can stay', h.who ? whoText(h.who) : 'Anyone'],
  ].filter((r) => r[1]);
  app.innerHTML = `${header(base)}
  <main class="t-main">
    ${panel(h, true)}
    <section class="t-detail">
      <div class="row-between">${price(h)}${h.score ? `<span class="fit">${h.score}% fit</span>` : ''}</div>
      <div class="fact-grid">${facts(h)
        .map(([ic, t]) => `<div class="fact">${icon(ic, 20)}<span>${esc(t)}</span></div>`)
        .join('')}</div>
      ${h.why?.length ? `<h3>Why it suits you</h3><ul class="why">${h.why.map((w) => `<li>${icon('check', 15)}${esc(w)}</li>`).join('')}</ul>` : ''}
      <h3>Money and rules</h3>
      <dl class="kv">${rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${h.note ? `<h3>About this home</h3><p>${esc(h.note)}</p>` : ''}
    </section>
    <div class="sticky-cta"><a class="btn wide" href="${base}/h/${i}/book">Book a visit${s.fee ? ` · ${rupees(s.fee)}` : ''}</a></div>
  </main>`;
}

const SLOTS = ['10:00 AM', '11:00 AM', '12:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM', '6:00 PM', '7:00 PM'];

function book(app, s, h, base, i) {
  const days = [...Array(7)].map((_, k) => {
    const d = new Date();
    d.setDate(d.getDate() + k);
    return d.toISOString().slice(0, 10);
  });
  // Late in the day there is no slot left today: start on tomorrow.
  const lateToday = !SLOTS.some((t) => toHour(t) > new Date().getHours() + 1);
  const st = { day: days[lateToday ? 1 : 0], time: '', name: s.t || '', phone: '', err: {} };
  const fee = s.fee || 0;

  const draw = () => {
    const nowH = new Date().getHours();
    const slotOk = (t) => st.day !== days[0] || toHour(t) > nowH + 1;
    app.innerHTML = `${header(`${base}/h/${i}`)}
    <main class="t-main">
      <h1 class="t-h1">Book a visit</h1>
      <p class="muted">${esc(bhkText(h.bhk))} · ${esc([h.society, cap(h.area)].filter(Boolean).join(', '))}</p>
      <h3>Pick a day</h3>
      <div class="chips scroll">${days.map((d) => `<button class="pick ${d === st.day ? 'on' : ''}" data-day="${d}">${esc(dayLabel(d))}</button>`).join('')}</div>
      <h3>Pick a time</h3>
      <div class="slots">${SLOTS.map((t) => `<button class="pick ${t === st.time ? 'on' : ''}" data-time="${t}" ${slotOk(t) ? '' : 'disabled'}>${t}</button>`).join('')}</div>
      ${st.err.time ? `<p class="err">${st.err.time}</p>` : ''}
      <h3>Your details</h3>
      <label class="field"><span>Your name</span><input id="b-name" value="${esc(st.name)}" autocomplete="name"></label>
      ${st.err.name ? `<p class="err">${st.err.name}</p>` : ''}
      <label class="field"><span>Mobile number</span><div class="phone-in"><b>+91</b><input id="b-phone" inputmode="numeric" maxlength="10" value="${esc(st.phone)}" autocomplete="tel-national"></div></label>
      ${st.err.phone ? `<p class="err">${st.err.phone}</p>` : ''}
      <div class="summary">
        <div class="row-between"><span>Visit fee</span><b>${fee ? rupees(fee) : 'Free'}</b></div>
        ${fee ? '<p class="muted small">Changed your mind? Cancel within 5 minutes to get 98% back. The fee goes to the person who shows you the home.</p>' : ''}
      </div>
      <div class="sticky-cta"><button class="btn wide" id="b-go">${fee ? `Pay ${rupees(fee)} and book` : 'Book the visit'}</button></div>
    </main>`;
    app.querySelectorAll('[data-day]').forEach((b) =>
      b.addEventListener('click', () => {
        keepInputs();
        st.day = b.dataset.day;
        if (!slotOk(st.time)) st.time = '';
        draw();
      }),
    );
    app.querySelectorAll('[data-time]').forEach((b) =>
      b.addEventListener('click', () => {
        keepInputs();
        st.time = b.dataset.time;
        st.err.time = '';
        draw();
      }),
    );
    $('#b-go').addEventListener('click', go);
  };
  const keepInputs = () => {
    st.name = $('#b-name')?.value.trim() ?? st.name;
    st.phone = ($('#b-phone')?.value ?? st.phone).replace(/\D/g, '');
  };
  const go = async () => {
    keepInputs();
    st.err = {};
    if (!st.time) st.err.time = 'Pick a time';
    if (st.name.length < 2) st.err.name = 'Type your name';
    if (!/^[6-9]\d{9}$/.test(st.phone)) st.err.phone = 'Type your 10-digit mobile number';
    if (Object.keys(st.err).length) return draw();
    if (fee && !(await pay(fee))) return;
    const v = {
      id: `v-${Date.now().toString(36)}`,
      sid: s.id,
      tid: s.tid,
      hid: h.i,
      home: `${bhkText(h.bhk)}, ${[h.society, cap(h.area)].filter(Boolean).join(', ')}`,
      name: st.name,
      phone: st.phone,
      day: st.day,
      time: st.time,
      fee,
      code: String(Math.floor(1000 + Math.random() * 9000)),
      at: new Date().toISOString(),
      test: true,
    };
    keepVisit(v);
    done(app, s, v, base);
  };
  draw();
}

const toHour = (t) => {
  const [h, rest] = t.split(':');
  return (+h % 12) + (rest.includes('PM') ? 12 : 0);
};

/** Test payment: the real flow's screens, no money moves. */
function pay(fee) {
  return sheet(
    `<div class="pay">
      <div class="test-tag">${icon('shield', 15)} Test payment · no money moves</div>
      <h2>Pay ${rupees(fee)}</h2>
      <p class="muted small">Visit fee, paid to TrustKeyper</p>
      <div class="pay-opts">
        <label class="pay-opt"><input type="radio" name="m" value="upi" checked><span><b>UPI</b><small>Any UPI app</small></span></label>
        <label class="pay-opt"><input type="radio" name="m" value="card"><span><b>Card</b><small>Debit or credit</small></span></label>
        <label class="pay-opt"><input type="radio" name="m" value="nb"><span><b>Net banking</b><small>All major banks</small></span></label>
      </div>
      <button class="btn wide" id="p-go">Pay ${rupees(fee)}</button>
      <button class="btn ghost wide" id="p-no">Cancel</button>
    </div>`,
    (el, close) => {
      el.querySelector('#p-no').addEventListener('click', () => close(false));
      el.querySelector('#p-go').addEventListener('click', (e) => {
        e.target.disabled = true;
        e.target.textContent = 'Paying…';
        setTimeout(() => close(true), 1200);
      });
    },
  );
}

function done(app, s, v, base) {
  const link = `${location.origin}${location.pathname}#/b/${pack(v)}`;
  const msg = `Hi ${s.m?.n || ''}, I booked a visit through TrustKeyper.\n${v.home}\n${dayLabel(v.day)}, ${v.time}\nName: ${v.name}, ${v.phone}\nVisit code: ${v.code}${v.fee ? `\nPaid: ${rupees(v.fee)} (test)` : ''}\n\nDetails: ${link}`;
  app.innerHTML = `${header(base)}
  <main class="t-main center">
    <div class="done-badge">${icon('check', 40)}</div>
    <h1 class="t-h1">Visit booked</h1>
    <p class="muted">${esc(v.home)}</p>
    <div class="ticket">
      <div><span class="muted small">When</span><b>${esc(dayLabel(v.day))}, ${esc(v.time)}</b></div>
      <div><span class="muted small">Visit code</span><b class="code">${esc(v.code)}</b></div>
      ${v.fee ? `<div><span class="muted small">Paid</span><b>${rupees(v.fee)} <span class="test-mini">test</span></b></div>` : ''}
    </div>
    <p class="small muted">At the visit, tell ${esc(s.m?.n || 'the TrustKeyper team')} this code. It confirms your visit. Last step: send the booking so they can meet you there.</p>
    ${s.m?.p ? `<a class="btn wide wa" href="${waLink(s.m.p, msg)}" target="_blank" rel="noopener" id="d-wa">${icon('chat', 18)} Send booking on WhatsApp</a>` : ''}
    <a class="btn ghost wide" href="${base}">Back to my homes</a>
  </main>`;
  $('#d-wa')?.addEventListener('click', () => toast('Opening WhatsApp…'));
}
