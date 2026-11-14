// Matching one tenant to homes (and one home to tenants). Pure logic.

// Localities of west Hyderabad that are close to each other; a tenant who
// wants one is usually fine with its neighbours.
const NEAR = [
  ['financial district', 'nanakramguda', 'gachibowli', 'puppalaguda', 'narsingi', 'kokapet', 'khajaguda', 'manikonda'],
  ['gachibowli', 'kondapur', 'hitech city', 'madhapur', 'raidurg', 'kothaguda'],
  ['madhapur', 'jubilee hills', 'hitech city', 'kondapur', 'ayyappa society'],
  ['kondapur', 'kothaguda', 'hafeezpet', 'miyapur', 'chanda nagar', 'botanical garden'],
  ['kukatpally', 'kphb', 'miyapur', 'nizampet', 'bachupally', 'pragathi nagar'],
  ['manikonda', 'puppalaguda', 'narsingi', 'tolichowki', 'shaikpet', 'lanco hills'],
  ['tellapur', 'nallagandla', 'gopanpally', 'serilingampally', 'lingampally', 'chandanagar'],
];

// Names people use for the same place.
const ALIAS = {
  fd: 'financial district',
  'fin district': 'financial district',
  'nanakram guda': 'nanakramguda',
  'hi-tech city': 'hitech city',
  'hitec city': 'hitech city',
  hitec: 'hitech city',
  hitech: 'hitech city',
  'hi tech city': 'hitech city',
  gachibowli: 'gachibowli',
  'gachi bowli': 'gachibowli',
  'kokapet sez': 'kokapet',
  phf: 'financial district',
  'prestige high fields': 'financial district',
  'prestige highfields': 'financial district',
  'asbl spectra': 'financial district',
  'aparna zenon': 'puppalaguda',
  'my home bhooja': 'hitech city',
};

export const AREAS = [...new Set(NEAR.flat())].sort();

export function area(s) {
  const k = String(s || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return ALIAS[k] || k;
}

function near(a, b) {
  return NEAR.some((g) => g.includes(a) && g.includes(b));
}

/** Monthly cost the tenant pays (rent + maintenance). */
export const monthly = (h) => (h.rent || 0) + (h.maint || 0);

/**
 * How well a home fits a tenant: {score 0–100, reasons, warnings} or null
 * when it cannot work (wrong size, far over budget, owner won't accept them).
 */
export function fit(t, h) {
  if (!h.rent || ['rented', 'off', 'hold'].includes(h.status)) return null;
  const reasons = [];
  const warnings = [];
  let score = 0;

  // Size
  if (t.bhk) {
    const d = Math.abs((h.bhk || 0) - t.bhk);
    if (!h.bhk || d >= 1) return null;
    if (d === 0) {
      score += 30;
      reasons.push(`${h.bhk} BHK as asked`);
    } else {
      score += 18;
      reasons.push(`${h.bhk} BHK (asked ${t.bhk})`);
    }
  } else score += 15;

  // Money
  if (t.budget) {
    // "65k + maintenance" budgets are compared with the rent alone.
    const cost = t.budgetRentOnly ? h.rent : monthly(h);
    if (cost <= t.budget) {
      score += 30;
      reasons.push('In budget');
    } else if (cost <= t.budget * 1.1) {
      score += 14;
      warnings.push(`₹${Math.round((cost - t.budget) / 1000)}k over budget`);
    } else return null;
  } else score += 15;

  // Place
  const want = (t.areas || []).map(area).filter(Boolean);
  const at = [area(h.area), area(h.society)].filter(Boolean);
  if (want.length) {
    if (want.some((w) => at.includes(w))) {
      score += 25;
      reasons.push(`In ${h.area || h.society}`);
    } else if (want.some((w) => at.some((a) => near(w, a)))) {
      score += 13;
      reasons.push(`Near ${want[0].replace(/\b\w/g, (c) => c.toUpperCase())}`);
    } else return null;
  } else score += 12;

  // Who the owner accepts
  const who = (h.who || 'any').toLowerCase();
  const tw = (t.who || '').toLowerCase();
  if (tw && who !== 'any') {
    const ok = (who === 'family' && tw === 'family') || (who.startsWith('bachelor') && tw.startsWith('bachelor') && (who === 'bachelor' || who === tw));
    if (!ok) return null;
    score += 5;
    reasons.push(who === 'family' ? 'Owner wants a family' : 'Bachelors welcome');
  } else score += 5;

  // Furnishing
  if (t.furnishing && h.furnishing) {
    if (t.furnishing === h.furnishing) {
      score += 5;
      reasons.push(cap(h.furnishing));
    } else warnings.push(`${cap(h.furnishing)} (asked ${t.furnishing})`);
  } else score += 2;

  // Move-in
  if (t.moveIn && h.available && h.available > t.moveIn) warnings.push(`Free from ${h.available}`);
  else score += 3;

  if (t.pets && h.pets === false) warnings.push('Owner does not allow pets');
  return { score: Math.min(100, score), reasons, warnings };
}

export const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Best homes for a tenant, best first. */
export function homesFor(t, homes, limit = 8) {
  return homes
    .map((h) => ({ h, f: fit(t, h) }))
    .filter((x) => x.f)
    .sort((a, b) => b.f.score - a.f.score || monthly(a.h) - monthly(b.h))
    .slice(0, limit);
}

/** Tenants a home suits, best first. */
export function tenantsFor(h, tenants, limit = 8) {
  return tenants
    .filter((t) => !['done', 'lost'].includes(t.status))
    .map((t) => ({ t, f: fit(t, h) }))
    .filter((x) => x.f)
    .sort((a, b) => b.f.score - a.f.score)
    .slice(0, limit);
}
