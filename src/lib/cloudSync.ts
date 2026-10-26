import { supabase } from './supabase';

// ── What gets synced ──────────────────────────────────────────────────────────
// Every component keeps reading/writing localStorage synchronously, exactly as
// before. This module mirrors the keys below to the `user_data` table:
//   • hydrate()  — on login, pull everything from the server into localStorage
//   • writes     — intercepted, debounced, and upserted in the background
//   • pull()     — when the app comes back to the foreground, fetch changes
//                  made on other devices
// Device-only preferences (dark-mode, mobile-section, panel widths) are left out.

const SYNCED_KEYS = new Set([
  'habit-tracker-state',
  'goal-navigator',
  'daily-focus',
  'ritual_templates',
  'ritual_entries',
  'habit-tracker-affirmations',
  'habit-tracker-reflection-template',
  'center-widget-order',
]);
const SYNCED_PREFIXES = ['journal-'];

// Stored as plain text in localStorage (not JSON); kept as a JSON string server-side.
const RAW_TEXT_KEYS = new Set(['habit-tracker-affirmations', 'habit-tracker-reflection-template']);

const PENDING_KEY = 'sync-pending';      // keys changed locally but not yet uploaded
const LAST_PULL_KEY = 'sync-last-pull';  // newest server updated_at seen
const UPLOAD_DELAY_MS = 800;

export function isSyncedKey(key: string): boolean {
  return SYNCED_KEYS.has(key) || SYNCED_PREFIXES.some(p => key.startsWith(p));
}

function toServer(key: string, raw: string): unknown {
  if (RAW_TEXT_KEYS.has(key)) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function toLocal(key: string, value: unknown): string {
  if (RAW_TEXT_KEYS.has(key) && typeof value === 'string') return value;
  return JSON.stringify(value);
}

// ── localStorage interception ─────────────────────────────────────────────────

const nativeSet = Storage.prototype.setItem;
const nativeRemove = Storage.prototype.removeItem;
const nativeGet = Storage.prototype.getItem;

let userId: string | null = null;
let applyingRemote = false;
let uploadTimer: ReturnType<typeof setTimeout> | null = null;

function readPending(): Set<string> {
  try {
    return new Set(JSON.parse(nativeGet.call(localStorage, PENDING_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

function writePending(keys: Set<string>) {
  nativeSet.call(localStorage, PENDING_KEY, JSON.stringify([...keys]));
}

function markDirty(key: string) {
  const pending = readPending();
  pending.add(key);
  writePending(pending);
  if (uploadTimer) clearTimeout(uploadTimer);
  uploadTimer = setTimeout(() => { void flush(); }, UPLOAD_DELAY_MS);
}

let installed = false;
function installInterceptor() {
  if (installed) return;
  installed = true;

  Storage.prototype.setItem = function (key: string, value: string) {
    const changed = this === localStorage && nativeGet.call(this, key) !== value;
    nativeSet.call(this, key, value);
    if (changed && userId && !applyingRemote && isSyncedKey(key)) markDirty(key);
  };

  Storage.prototype.removeItem = function (key: string) {
    const existed = this === localStorage && nativeGet.call(this, key) !== null;
    nativeRemove.call(this, key);
    if (existed && userId && !applyingRemote && isSyncedKey(key)) markDirty(key);
  };
}

// ── Upload ────────────────────────────────────────────────────────────────────

let flushing: Promise<void> | null = null;

export function flush(): Promise<void> {
  if (!supabase || !userId) return Promise.resolve();
  if (flushing) return flushing.then(() => flush());
  if (uploadTimer) { clearTimeout(uploadTimer); uploadTimer = null; }

  const keys = [...readPending()];
  if (keys.length === 0) return Promise.resolve();

  const uid = userId;
  const sent = new Map<string, string | null>();
  const upserts: { user_id: string; key: string; value: unknown }[] = [];
  const deletes: string[] = [];
  for (const key of keys) {
    const raw = nativeGet.call(localStorage, key);
    sent.set(key, raw);
    if (raw === null) deletes.push(key);
    else upserts.push({ user_id: uid, key, value: toServer(key, raw) });
  }

  flushing = (async () => {
    try {
      if (upserts.length) {
        const { error } = await supabase.from('user_data').upsert(upserts, { onConflict: 'user_id,key' });
        if (error) throw error;
      }
      if (deletes.length) {
        const { error } = await supabase.from('user_data').delete().eq('user_id', uid).in('key', deletes);
        if (error) throw error;
      }
      // Only clear what we sent; keys edited mid-flight stay pending.
      const pending = readPending();
      for (const [key, raw] of sent) {
        if (nativeGet.call(localStorage, key) === raw) pending.delete(key);
      }
      writePending(pending);
      window.dispatchEvent(new CustomEvent('cloud-sync', { detail: { ok: true } }));
    } catch (err) {
      console.warn('[sync] upload failed, will retry', err);
      window.dispatchEvent(new CustomEvent('cloud-sync', { detail: { ok: false } }));
      if (uploadTimer) clearTimeout(uploadTimer);
      uploadTimer = setTimeout(() => { void flush(); }, 10_000);
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

// ── Download ──────────────────────────────────────────────────────────────────

interface Row { key: string; value: unknown; updated_at: string }

/** Writes server rows into localStorage. Returns true if anything changed. */
function applyRows(rows: Row[]): boolean {
  const pending = readPending();
  let changed = false;
  let newest = nativeGet.call(localStorage, LAST_PULL_KEY) ?? '';
  applyingRemote = true;
  try {
    for (const row of rows) {
      if (row.updated_at > newest) newest = row.updated_at;
      if (pending.has(row.key)) continue; // local edit not yet uploaded wins
      const next = toLocal(row.key, row.value);
      if (nativeGet.call(localStorage, row.key) !== next) {
        nativeSet.call(localStorage, row.key, next);
        changed = true;
      }
    }
  } finally {
    applyingRemote = false;
  }
  if (newest) nativeSet.call(localStorage, LAST_PULL_KEY, newest);
  return changed;
}

/**
 * Called once after login, before the app renders.
 * Empty server (first login anywhere) → upload this device's data.
 * Otherwise → server data replaces this device's synced keys.
 */
export async function hydrate(uid: string): Promise<void> {
  if (!supabase) return;
  installInterceptor();

  const { data, error } = await supabase.from('user_data').select('key, value, updated_at');
  if (error) throw error;
  const rows = (data ?? []) as Row[];

  // Different account than last time on this device → don't mix data.
  const lastUser = nativeGet.call(localStorage, 'sync-user');
  if (lastUser && lastUser !== uid) {
    clearSyncedLocalData();
  }
  nativeSet.call(localStorage, 'sync-user', uid);
  userId = uid;

  if (rows.length === 0) {
    const pending = readPending();
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isSyncedKey(key)) pending.add(key);
    }
    writePending(pending);
    await flush();
    return;
  }

  // Server is the source of truth; drop local-only journal days etc.
  const serverKeys = new Set(rows.map(r => r.key));
  const pending = readPending();
  applyingRemote = true;
  try {
    for (const key of localKeys()) {
      if (isSyncedKey(key) && !serverKeys.has(key) && !pending.has(key)) nativeRemove.call(localStorage, key);
    }
  } finally {
    applyingRemote = false;
  }
  applyRows(rows);
  await flush();
}

/** Fetches rows changed on other devices. Returns true if local data changed. */
export async function pull(): Promise<boolean> {
  if (!supabase || !userId) return false;
  await flush();
  const since = nativeGet.call(localStorage, LAST_PULL_KEY);
  let query = supabase.from('user_data').select('key, value, updated_at');
  if (since) query = query.gt('updated_at', since);
  const { data, error } = await query;
  if (error) {
    console.warn('[sync] pull failed', error);
    return false;
  }
  return applyRows((data ?? []) as Row[]);
}

// ── Sign-out ──────────────────────────────────────────────────────────────────

function localKeys(): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}

function clearSyncedLocalData() {
  applyingRemote = true;
  try {
    for (const key of localKeys()) {
      if (isSyncedKey(key)) nativeRemove.call(localStorage, key);
    }
    nativeRemove.call(localStorage, PENDING_KEY);
    nativeRemove.call(localStorage, LAST_PULL_KEY);
  } finally {
    applyingRemote = false;
  }
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await flush();
  userId = null;
  clearSyncedLocalData();
  nativeRemove.call(localStorage, 'sync-user');
  await supabase.auth.signOut();
}
