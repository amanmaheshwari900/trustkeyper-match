// Small shared helpers for both the desk and the tenant pages.

export const $ = (sel, root = document) => root.querySelector(sel);

/** Escapes text from posts before it goes into the page. */
export function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** ₹65,000 in the Indian style. */
export function rupees(n) {
  if (n == null || n === '' || isNaN(n)) return '';
  return '₹' + Math.round(n).toLocaleString('en-IN');
}

/** ₹65k / ₹1.3L — short form for tight places. */
export function short(n) {
  if (!n) return '';
  if (n >= 100000) return `₹${+(n / 100000).toFixed(2)}L`;
  return `₹${+(n / 1000).toFixed(1)}k`;
}

export function phoneText(p) {
  const d = String(p || '').replace(/\D/g, '').slice(-10);
  return d.length === 10 ? `+91 ${d.slice(0, 5)} ${d.slice(5)}` : p || '';
}

export function waLink(phone, text) {
  const d = String(phone || '').replace(/\D/g, '').slice(-10);
  return `https://wa.me/${d ? '91' + d : ''}?text=${encodeURIComponent(text)}`;
}

export function telLink(phone) {
  return `tel:+91${String(phone || '').replace(/\D/g, '').slice(-10)}`;
}

export function ago(iso) {
  if (!iso) return '';
  const d = new Date(iso.replace(/^(\d{4}-\d{2}-\d{2}T\d{2})(\d{2})(\d{2})Z$/, '$1:$2:$3Z'));
  const mins = Math.round((Date.now() - d) / 60000);
  if (isNaN(mins)) return '';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.round(mins / 60)} h ago`;
  const days = Math.round(mins / 1440);
  return days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function dayLabel(date) {
  const d = new Date(date);
  const today = new Date();
  const diff = Math.round((new Date(d.toDateString()) - new Date(today.toDateString())) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function initials(name) {
  return (
    String(name || '?')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '?'
  );
}

// Line icons (24px, stroke = currentColor).
const P = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M10 21v-6h4v6"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14.8c2 .7 3.2 2.4 3.8 5.2"/>',
  today: '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v3M16 2.5v3"/><path d="m9 15 2 2 4-4"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2.5"/><path d="M3 9h18M8 2.5v3M16 2.5v3"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  back: '<path d="m15 5-7 7 7 7"/>',
  next: '<path d="m9 5 7 7-7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  phone: '<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 7.1 7.1l1.4-2.3L21 15.5V19a2 2 0 0 1-2 2A16 16 0 0 1 3 5a2 2 0 0 1 2-2Z"/>',
  chat: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20Z"/>',
  send: '<path d="M21 3 3 10.5l7 3 3 7L21 3Z"/><path d="m10 13.5 4.5-4.5"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  rupee: '<path d="M7 4h11M7 9h11M13 21 7 14h2.5a5 5 0 0 0 0-10"/>',
  bed: '<path d="M3 18V7M3 13h18v5M21 13a3 3 0 0 0-3-3H10v3"/><circle cx="6.5" cy="10.5" r="1.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/>',
  sofa: '<path d="M4 11V8a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v3"/><path d="M2 13a2 2 0 0 1 4 0v2h12v-2a2 2 0 0 1 4 0v5H2v-5Z"/><path d="M5 18v2M19 18v2"/>',
  size: '<path d="M4 20 20 4M4 20v-6M4 20h6M20 4h-6M20 4v6"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
  car: '<path d="M5 17H3v-5l2-5h14l2 5v5h-2"/><circle cx="7.5" cy="17" r="2"/><circle cx="16.5" cy="17" r="2"/><path d="M5 12h14"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  family: '<circle cx="8" cy="6" r="2.5"/><circle cx="16" cy="6" r="2.5"/><circle cx="12" cy="13" r="2"/><path d="M4 21v-5a4 4 0 0 1 4-4M20 21v-5a4 4 0 0 0-4-4M9.5 21v-2.5a2.5 2.5 0 0 1 5 0V21"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 21v-5h-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M5 16H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v1"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m14 6 4 4"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M4 20h16"/>',
  upload: '<path d="M12 21V9M7 14l5-5 5 5M4 4h16"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  photo: '<rect x="3" y="5" width="18" height="15" rx="2.5"/><circle cx="9" cy="10.5" r="2"/><path d="m21 16-5-5-9 9"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
  filter: '<path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
};

export function icon(name, size = 22, cls = '') {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;
}

let toastTimer;
export function toast(text) {
  let el = $('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/** A bottom sheet; resolves with the value passed to close(). */
export function sheet(html, onOpen) {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div>`;
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('open'));
    const close = (value) => {
      wrap.classList.remove('open');
      setTimeout(() => wrap.remove(), 220);
      resolve(value);
    };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) close(null);
    });
    onOpen?.(wrap.querySelector('.sheet'), close);
  });
}

/** Home facts used on cards and detail pages. */
export function facts(h) {
  return [
    h.sqft && ['size', `${Number(h.sqft).toLocaleString('en-IN')} sft`],
    h.furnishing && ['sofa', h.furnishing[0].toUpperCase() + h.furnishing.slice(1)],
    h.floor != null && h.floor !== '' && ['layers', h.floors ? `Floor ${h.floor} of ${h.floors}` : `Floor ${h.floor}`],
    h.facing && ['compass', `${h.facing[0].toUpperCase() + h.facing.slice(1)} facing`],
    h.parking && ['car', `${h.parking} parking`],
    h.who && h.who !== 'any' && ['family', whoText(h.who)],
  ].filter(Boolean);
}

export function whoText(w) {
  return { family: 'Family', 'bachelor-m': 'Bachelor men', 'bachelor-f': 'Bachelor women', bachelor: 'Bachelors', any: 'Anyone' }[w] || w;
}

export function bhkText(b) {
  return b ? `${b} BHK` : 'Home';
}
