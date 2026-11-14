// Reads a pasted WhatsApp / Facebook post and fills in what it can.
// Always shown to the manager to check before saving.

import { AREAS, area } from './match.js';

const TENANT_WORDS = /\b(looking for|need|required|requirement|wanted|searching|want a|want an|looking)\b/i;
const HOME_WORDS = /\b(available|for rent|to[- ]let|vacant|rent out|ready to move|immediate(ly)? available|letting out)\b/i;

function money(text) {
  // "65k", "65,000", "1.3L", "65+maintenance", "Rs 25000"
  const m = text.match(/(?:rs\.?|₹|inr|rent|budget)?\s*(\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)\s*(k|l|lac|lakh|lakhs|thousand)?\b/gi) || [];
  const values = [];
  for (const raw of m) {
    const p = raw.toLowerCase().match(/(\d{1,3}(?:,\d{2,3})+|\d+(?:\.\d+)?)\s*(k|l|lac|lakh|lakhs|thousand)?/);
    if (!p) continue;
    let n = parseFloat(p[1].replace(/,/g, ''));
    const unit = p[2] || '';
    if (unit === 'k' || unit === 'thousand') n *= 1000;
    else if (unit.startsWith('l')) n *= 100000;
    else if (n < 500 && /rent|budget|₹|rs/i.test(raw)) n *= 1000; // "65+maintenance" written in thousands
    if (n >= 5000 && n <= 1000000) values.push(Math.round(n));
  }
  return values;
}

export function extract(text) {
  const t = String(text || '');
  const low = t.toLowerCase();
  const out = {};
  const isTenant = TENANT_WORDS.test(t) && !HOME_WORDS.test(t.slice(0, 80));
  out.kind = isTenant ? 'tenant' : HOME_WORDS.test(t) ? 'home' : 'tenant';

  const bhk = low.match(/(\d(?:\.5)?)\s*-?\s*(bhk|bed|bhk\b)/);
  if (bhk) out.bhk = parseFloat(bhk[1]);
  else if (/\b(1rk|1 rk|studio)\b/.test(low)) out.bhk = 1;

  const amounts = money(t);
  if (amounts.length) {
    if (out.kind === 'tenant') out.budget = Math.max(...amounts);
    else out.rent = amounts[0];
  }
  const maint = low.match(/maint[a-z]*\s*[:\-]?\s*(?:rs\.?|₹)?\s*(\d[\d,]*)\s*(k)?/);
  if (maint) out.maint = parseInt(maint[1].replace(/,/g, ''), 10) * (maint[2] ? 1000 : 1);

  if (/fully[- ]?furnished|full furnished/.test(low)) out.furnishing = 'fully furnished';
  else if (/semi[- ]?furnished/.test(low)) out.furnishing = 'semi-furnished';
  else if (/unfurnished|non[- ]?furnished/.test(low)) out.furnishing = 'unfurnished';

  if (/\bfamil(y|ies)\b/.test(low)) out.who = 'family';
  else if (/\b(girls?|ladies|female|women)\b/.test(low)) out.who = 'bachelor-f';
  else if (/\b(boys|bachelors?|male|men)\b/.test(low)) out.who = 'bachelor-m';

  const phone = t.replace(/[\s-]/g, '').match(/(?:\+?91)?([6-9]\d{9})/);
  if (phone) out.phone = phone[1];

  const places = AREAS.filter((a) => low.includes(a));
  for (const [k] of Object.entries({ phf: 1, 'prestige high fields': 1, 'asbl spectra': 1, 'aparna zenon': 1, fd: 1 })) {
    if (new RegExp(`\\b${k}\\b`).test(low)) places.push(area(k));
  }
  if (places.length) {
    if (out.kind === 'tenant') out.areas = [...new Set(places)];
    else out.area = places[0];
  }
  const dep = low.match(/deposit\s*[:\-]?\s*(\d)\s*(month|months)/);
  if (dep) out.deposit = `${dep[1]} months`;
  if (/\b(immediate|ready to move|available now)\b/.test(low)) out.available = 'Now';
  out.text = t.trim();
  return out;
}
