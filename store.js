// The desk's data: encrypted lead batches from the site, plus the manager's
// own work (statuses, notes, new leads, visits) kept on this phone.

import { openBatch, unlock } from './crypto.js';

const LOCAL = 'tkm_desk_v1';
const PASS = 'tkm_pass_v1';

const blank = () => ({ edits: {}, added: [], visits: [], sent: [], settings: { name: '', phone: '', fee: 150 } });

export const store = {
  key: null,
  tenants: [],
  homes: [],
  batches: [],
  local: blank(),
  listeners: new Set(),

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  },
  emit() {
    this.listeners.forEach((fn) => fn());
  },

  savedPass() {
    try {
      return localStorage.getItem(PASS);
    } catch {
      return null;
    }
  },

  async signIn(pass, remember) {
    const keys = await (await fetch('keys.json', { cache: 'no-store' })).json();
    this.key = await unlock(keys, pass);
    try {
      remember ? localStorage.setItem(PASS, pass) : localStorage.removeItem(PASS);
    } catch {}
    this.loadLocal();
    await this.refresh();
  },

  signOut() {
    this.key = null;
    try {
      localStorage.removeItem(PASS);
    } catch {}
  },

  loadLocal() {
    try {
      this.local = { ...blank(), ...JSON.parse(localStorage.getItem(LOCAL) || '{}') };
      this.local.settings = { ...blank().settings, ...this.local.settings };
    } catch {
      this.local = blank();
    }
  },

  save() {
    try {
      localStorage.setItem(LOCAL, JSON.stringify(this.local));
    } catch {}
    this.build();
    this.emit();
  },

  /** Loads every batch the reading sessions have published. */
  async refresh() {
    const index = await (await fetch(`batches.json?${Date.now()}`, { cache: 'no-store' })).json();
    const opened = [];
    for (const b of index.batches) {
      try {
        const file = await (await fetch(`${b.file}`)).json();
        opened.push({ ...b, data: await openBatch(file, this.key) });
      } catch (e) {
        console.warn('Could not open', b.file, e);
      }
    }
    this.batches = opened;
    this.build();
    this.emit();
  },

  /** Merges batches (newer wins), then the manager's own changes. */
  build() {
    const byId = new Map();
    for (const b of this.batches) {
      for (const kind of ['tenants', 'homes']) {
        for (const lead of b.data[kind] || []) {
          byId.set(lead.id, { ...(byId.get(lead.id) || {}), ...lead, kind: kind === 'tenants' ? 'tenant' : 'home' });
        }
      }
    }
    for (const lead of this.local.added) byId.set(lead.id, lead);
    for (const [id, edit] of Object.entries(this.local.edits)) if (byId.has(id)) byId.set(id, { ...byId.get(id), ...edit });
    const all = [...byId.values()].filter((l) => !l.deleted);
    const fresh = (a, b) => String(b.at || '').localeCompare(String(a.at || ''));
    this.tenants = all.filter((l) => l.kind === 'tenant').map((t) => ({ status: 'new', ...t })).sort(fresh);
    this.homes = all.filter((l) => l.kind === 'home').map((h) => ({ status: 'available', ...h })).sort(fresh);
  },

  get(id) {
    return this.tenants.find((t) => t.id === id) || this.homes.find((h) => h.id === id);
  },

  edit(id, change) {
    this.local.edits[id] = { ...(this.local.edits[id] || {}), ...change };
    this.save();
  },

  add(lead) {
    const id = `m-${Date.now().toString(36)}`;
    this.local.added.push({ ...lead, id, at: new Date().toISOString(), source: { type: 'Added by hand' } });
    this.save();
    return id;
  },

  /** A shortlist went to a tenant. */
  sent(tenantId, homeIds) {
    this.local.sent.push({ tenantId, homeIds, at: new Date().toISOString() });
    const t = this.get(tenantId);
    if (t && ['new', 'talking'].includes(t.status)) this.local.edits[tenantId] = { ...(this.local.edits[tenantId] || {}), status: 'sent' };
    this.save();
  },

  sentTo(tenantId) {
    return this.local.sent.filter((s) => s.tenantId === tenantId);
  },

  /** A visit booked by a tenant (from their WhatsApp message) or by hand. */
  addVisit(v) {
    if (this.local.visits.some((x) => x.id === v.id)) return false;
    this.local.visits.unshift({ status: 'booked', ...v });
    if (v.tenantId && this.get(v.tenantId)) this.local.edits[v.tenantId] = { ...(this.local.edits[v.tenantId] || {}), status: 'visit' };
    this.save();
    return true;
  },

  setVisit(id, change) {
    const v = this.local.visits.find((x) => x.id === id);
    if (v) Object.assign(v, change);
    this.save();
  },

  exportBackup() {
    return JSON.stringify({ app: 'trustkeyper-match', at: new Date().toISOString(), local: this.local }, null, 1);
  },

  importBackup(text) {
    const j = JSON.parse(text);
    if (j.app !== 'trustkeyper-match') throw new Error('Not a TrustKeyper Match backup');
    this.local = { ...blank(), ...j.local };
    this.save();
  },
};
