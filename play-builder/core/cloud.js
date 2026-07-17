// CLOUD SAVE — "Save play" writes the drawn play to the member's Scheme Kings account.
//
// Ported from war_room_test.html's save layer (SK_AUTH / skRequireLogin / skToast),
// deliberately keeping the SAME Supabase project + default session storage. On a
// shared origin that means a member signed into the coaching app is ALREADY signed
// in here — no second login. Off-origin, they get one contextual prompt.
//
// IMPORTANT difference from war_room: its `saved_plays` table only bookmarks a play
// that already exists in a published catalog (member_id + scheme_key + play_key —
// three strings, no play data). Here the member AUTHORS the play, so there's nothing
// to point at. We store the whole spec.
//
// Schema lives in ../supabase-setup.sql — run that once in the Supabase SQL editor.
//
// The whole layer degrades silently: if the Supabase CDN script didn't load, the
// drawer still works 100% — you just can't save.

const SUPABASE_URL = 'https://ksgxrxqvnfpfhidxsxcs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3hyeHF2bmZwZmhpZHhzeGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzkxMTgsImV4cCI6MjA5NzAxNTExOH0.pUD6sbkjhhTlgl5x4KHFJsThoHVlNkNBlSFES_8HHvM';
const TABLE = 'drawn_plays';
const FORM_TABLE = 'formations';

export const AUTH = {
  client: null,
  user: null,
  get memberId() { return this.user ? this.user.id : null; },
  get signedIn() { return !!this.user; },
  get available() { return !!this.client; },
};

const subs = [];
export function onAuth(f) { subs.push(f); }
function emit() { for (const f of subs) { try { f(AUTH.user); } catch (e) { console.error(e); } } }

/* ==========================================================================
   LOCAL TEST BACKEND
   Runs the entire save / load / formation flow against localStorage instead of
   Supabase, so the member experience is fully testable BEFORE the Supabase tables
   exist. Auto-on for localhost (so Reggie's local testing just works); OFF on the
   real domain, where the live Supabase path runs. Override with ?dev=1 / ?live=1.
   This is a dev harness, never a shipping path.
   ========================================================================== */
const LK = { plays: 'pd_dev_plays', forms: 'pd_dev_forms' };
let devLocal = false;
try {
  const q = new URLSearchParams(location.search);
  const isLocal = /^(localhost$|127\.|0\.0\.0\.0$|\[?::1)/.test(location.hostname);
  devLocal = q.get('dev') === '1' || localStorage.getItem('pd_devlocal') === '1'
           || (isLocal && q.get('live') !== '1');
} catch {}
export function isDevLocal() { return devLocal; }
export function setDevLocal(v) { devLocal = !!v; try { localStorage.setItem('pd_devlocal', devLocal ? '1' : '0'); } catch {} emit(); return devLocal; }

/* FREE MODE — the same app, deployed on the un-gated Squarespace page with ?free=1.
   Everything works (draw, run, throw, export) EXCEPT saving: canSave() goes false so
   every save path shows the "join the membership" pitch instead. It also lets us
   PREVIEW that free experience locally (?free=1) where devLocal would otherwise make
   us look like a member. Overrides devLocal + sign-in on purpose. */
let forcedFree = false;
try {
  const q = new URLSearchParams(location.search);
  forcedFree = q.get('free') === '1' || (q.get('free') !== '0' && localStorage.getItem('pd_free') === '1');
} catch {}
export function isFree() { return forcedFree; }
export function setFree(v) { forcedFree = !!v; try { localStorage.setItem('pd_free', forcedFree ? '1' : '0'); } catch {} emit(); return forcedFree; }

const lRead = (k) => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const lWrite = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const lId = () => 'loc_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
const nowISO = () => new Date().toISOString();

export async function initAuth() {
  // supabase-js arrives via CDN; if it's blocked/offline, browse + draw anyway.
  if (typeof supabase === 'undefined' || !supabase.createClient) { emit(); return; }
  try {
    AUTH.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data } = await AUTH.client.auth.getSession();
    AUTH.user = data && data.session ? data.session.user : null;
    AUTH.client.auth.onAuthStateChange((_e, s) => { AUTH.user = s ? s.user : null; emit(); });
  } catch (e) { AUTH.client = null; }
  emit();
}

/* --------------------------------------------------------------------------
   PAYWALL HOOK — the single place that decides whether Save play is allowed.
   Today: signed in = can save. When membership gating lands, this is the only
   function that changes (check the member's plan and return false for free
   users); the button's disabled/locked state already follows it.
   -------------------------------------------------------------------------- */
export function canSave() { return !forcedFree && (devLocal || AUTH.signedIn); }
export function saveIsAvailable() { return devLocal || AUTH.available; }

/* --------------------------------------------------------------------------
   Saving. `currentId` tracks the row this browser tab is editing, so hitting
   Save twice UPDATES the play instead of spawning a duplicate.
   -------------------------------------------------------------------------- */
let currentId = null;
export function getCurrentId() { return currentId; }
export function setCurrentId(id) { currentId = id || null; }
export function clearCurrent() { currentId = null; }

// A missing table is the one error worth naming precisely — otherwise it reads as
// a generic network failure and you go hunting in the wrong place.
function reasonFor(e) {
  const m = String((e && (e.message || e.hint || e.details)) || '');
  if (/relation .* does not exist|schema cache|Could not find the table/i.test(m)) return 'noschema';
  return 'network';
}

export async function savePlay(name, spec, formation) {
  if (devLocal) {
    const rows = lRead(LK.plays);
    const play = {
      id: currentId || lId(), name: name || 'Untitled play', spec,
      formation_name: (formation && formation.name) || null,
      formation_id: (formation && formation.id) || null,
      is_public: false, share_id: null, updated_at: nowISO(),
    };
    const i = rows.findIndex((r) => r.id === play.id);
    if (i >= 0) { play.share_id = rows[i].share_id; play.is_public = rows[i].is_public; rows[i] = play; }
    else rows.push(play);
    lWrite(LK.plays, rows); currentId = play.id;
    return { ok: true, id: play.id };
  }
  const ok = await requireLogin('save your play');
  if (!ok) return { ok: false, reason: 'auth' };
  try {
    const row = {
      member_id: AUTH.memberId, name: name || 'Untitled play', spec,
      formation_name: (formation && formation.name) || null,
      formation_id: (formation && formation.id) || null,
    };
    if (currentId) row.id = currentId;
    const { data, error } = await AUTH.client.from(TABLE).upsert(row).select('id').single();
    if (error) throw error;
    currentId = data.id;
    return { ok: true, id: data.id };
  } catch (e) {
    console.error('[cloud] save failed', e);
    return { ok: false, reason: reasonFor(e) };
  }
}

export async function listPlays() {
  if (devLocal) {
    const rows = lRead(LK.plays).slice().sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
    return { ok: true, rows: rows.map(({ id, name, formation_name, updated_at, is_public, share_id }) => ({ id, name, formation_name, updated_at, is_public, share_id })) };
  }
  if (!AUTH.signedIn) return { ok: false, reason: 'auth', rows: [] };
  try {
    const { data, error } = await AUTH.client.from(TABLE)
      .select('id,name,formation_name,updated_at,is_public,share_id')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return { ok: true, rows: data || [] };
  } catch (e) { return { ok: false, reason: reasonFor(e), rows: [] }; }
}

export async function loadPlay(id) {
  if (devLocal) {
    const row = lRead(LK.plays).find((r) => r.id === id);
    if (row) currentId = row.id;
    return row || null;
  }
  if (!AUTH.signedIn) return null;
  try {
    const { data, error } = await AUTH.client.from(TABLE)
      .select('id,name,spec,formation_name,formation_id').eq('id', id).single();
    if (error) throw error;
    currentId = data.id;
    return data;
  } catch (e) { return null; }
}

export async function deletePlay(id) {
  if (devLocal) {
    lWrite(LK.plays, lRead(LK.plays).filter((r) => r.id !== id));
    if (currentId === id) currentId = null;
    return true;
  }
  if (!AUTH.signedIn) return false;
  try {
    const { error } = await AUTH.client.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    if (currentId === id) currentId = null;
    return true;
  } catch (e) { return false; }
}

/* --------------------------------------------------------------------------
   SHARING — flip a play public and hand back a link. Anyone can open it
   read-only (the "public shared plays" RLS policy); it stays private until the
   member explicitly shares it.
   -------------------------------------------------------------------------- */
const SLUG = 'abcdefghijkmnopqrstuvwxyz23456789';   // no look-alikes (l/1, o/0)
function makeSlug(n = 9) {
  const a = new Uint8Array(n); crypto.getRandomValues(a);
  return [...a].map((b) => SLUG[b % SLUG.length]).join('');
}

export async function sharePlay(id) {
  if (devLocal) {
    const rows = lRead(LK.plays), r = rows.find((x) => x.id === id);
    if (!r) return { ok: false, reason: 'network' };
    r.share_id = r.share_id || makeSlug(); r.is_public = true; lWrite(LK.plays, rows);
    return { ok: true, url: shareUrl(r.share_id), share: r.share_id };
  }
  if (!AUTH.signedIn || !id) return { ok: false, reason: 'auth' };
  try {
    const { data: cur } = await AUTH.client.from(TABLE).select('share_id').eq('id', id).single();
    const share = (cur && cur.share_id) || makeSlug();
    const { error } = await AUTH.client.from(TABLE).update({ share_id: share, is_public: true }).eq('id', id);
    if (error) throw error;
    return { ok: true, url: shareUrl(share), share };
  } catch (e) { return { ok: false, reason: reasonFor(e) }; }
}

export async function unsharePlay(id) {
  if (!AUTH.signedIn || !id) return false;
  try {
    const { error } = await AUTH.client.from(TABLE).update({ is_public: false }).eq('id', id);
    return !error;
  } catch (e) { return false; }
}

export function shareUrl(share) {
  return location.origin + location.pathname.replace(/[^/]*$/, '') + '?p=' + share;
}

// Fetch a shared play WITHOUT being signed in — this is what a share link opens.
export async function loadShared(share) {
  if (devLocal) {
    const r = lRead(LK.plays).find((x) => x.share_id === share && x.is_public);
    return r ? { id: r.id, name: r.name, spec: r.spec, formation_name: r.formation_name } : null;
  }
  if (!AUTH.client || !share) return null;
  try {
    const { data, error } = await AUTH.client.from(TABLE)
      .select('id,name,spec,formation_name').eq('share_id', share).eq('is_public', true).single();
    if (error) throw error;
    return data;
  } catch (e) { return null; }
}

/* --------------------------------------------------------------------------
   FORMATIONS — the member's own alignments, alongside the built-ins in code.
   Keyed by (member_id, name) so re-saving a name updates it rather than piling
   up duplicates.
   -------------------------------------------------------------------------- */
export async function listFormations() {
  if (devLocal) return { ok: true, rows: lRead(LK.forms).slice().sort((a, b) => (a.name || '').localeCompare(b.name || '')) };
  if (!AUTH.signedIn) return { ok: false, reason: 'auth', rows: [] };
  try {
    const { data, error } = await AUTH.client.from(FORM_TABLE)
      .select('id,name,spec').order('name');
    if (error) throw error;
    return { ok: true, rows: data || [] };
  } catch (e) { return { ok: false, reason: reasonFor(e), rows: [] }; }
}

export async function saveFormationCloud(name, spec) {
  if (devLocal) {
    const rows = lRead(LK.forms), i = rows.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
    const row = { id: i >= 0 ? rows[i].id : lId(), name, spec };
    if (i >= 0) rows[i] = row; else rows.push(row);
    lWrite(LK.forms, rows);
    return { ok: true, id: row.id, name: row.name };
  }
  const ok = await requireLogin('save your formation');
  if (!ok) return { ok: false, reason: 'auth' };
  try {
    const { data, error } = await AUTH.client.from(FORM_TABLE)
      .upsert({ member_id: AUTH.memberId, name, spec }, { onConflict: 'member_id,name' })
      .select('id,name').single();
    if (error) throw error;
    return { ok: true, id: data.id, name: data.name };
  } catch (e) { return { ok: false, reason: reasonFor(e) }; }
}

export async function deleteFormation(id) {
  if (devLocal) { lWrite(LK.forms, lRead(LK.forms).filter((r) => r.id !== id)); return true; }
  if (!AUTH.signedIn) return false;
  try { const { error } = await AUTH.client.from(FORM_TABLE).delete().eq('id', id); return !error; }
  catch (e) { return false; }
}

/* --------------------------------------------------------------------------
   requireLogin(reason) — contextual sign-in. NOT a wall: the drawer is free to
   open and free to draw in. We only ask at the moment someone saves.
   -------------------------------------------------------------------------- */
let loginResolve = null;
export function requireLogin(reason = 'save this') {
  if (devLocal) return Promise.resolve(true);   // local test mode = always "logged in"
  if (AUTH.signedIn) return Promise.resolve(true);
  if (!AUTH.client) { toast('Sign-in is unavailable right now'); return Promise.resolve(false); }
  return new Promise((res) => { loginResolve = res; openLoginModal(reason); });
}
function settle(ok) { const r = loginResolve; loginResolve = null; if (r) r(!!ok); }

function openLoginModal(reason) {
  const old = document.getElementById('sk-login'); if (old) old.remove();
  const wrap = document.createElement('div');
  wrap.id = 'sk-login';
  wrap.innerHTML = `
    <div class="sk-login-backdrop"></div>
    <div class="sk-login-card pd-patch" role="dialog" aria-modal="true" aria-label="Sign in">
      <button class="sk-login-x" type="button" aria-label="Close">&times;</button>
      <img class="sk-login-crest" src="assets/sk-logo.png" alt="">
      <h3 class="sk-login-title">Sign in to ${reason}</h3>
      <p class="sk-login-sub">Your plays save to your Scheme Kings account, so they're waiting for you on any device.</p>
      <form class="sk-login-form" autocomplete="on">
        <input class="sk-login-input" type="email" name="email" placeholder="Email" autocomplete="email" required>
        <input class="sk-login-input" type="password" name="password" placeholder="Password" autocomplete="current-password" required>
        <div class="sk-login-err" role="alert"></div>
        <button class="sk-login-go pd-btn go" type="submit">Sign in &amp; save</button>
      </form>
      <p class="sk-login-foot">Same email and password as your Scheme Kings coaching app.</p>
    </div>`;
  document.body.appendChild(wrap);
  void wrap.offsetWidth;
  wrap.classList.add('open');

  const close = (ok) => {
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 220);
    document.removeEventListener('keydown', onEsc);
    settle(ok);
  };
  // stopPropagation: the app binds Esc/keys globally — the modal owns them while open
  const onEsc = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(false); } };
  document.addEventListener('keydown', onEsc, true);
  wrap.querySelector('.sk-login-x').onclick = () => close(false);
  wrap.querySelector('.sk-login-backdrop').onclick = () => close(false);

  const form = wrap.querySelector('.sk-login-form');
  const err = wrap.querySelector('.sk-login-err');
  const go = wrap.querySelector('.sk-login-go');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    err.textContent = '';
    const email = form.email.value.trim(), password = form.password.value;
    if (!email || !password) { err.textContent = 'Enter your email and password.'; return; }
    go.disabled = true; go.textContent = 'Signing in…';
    try {
      const { data, error } = await AUTH.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      AUTH.user = data.user;
      emit();
      close(true);
    } catch (ex) {
      err.textContent = (ex && /invalid/i.test(ex.message || ''))
        ? 'That email or password didn’t match. Try again.'
        : 'Could not sign in right now. Please try again.';
      go.disabled = false; go.textContent = 'Sign in & save';
    }
  });
  setTimeout(() => { const i = wrap.querySelector('.sk-login-input'); if (i) i.focus(); }, 80);
}

export async function signOut() {
  if (!AUTH.client) return;
  try { await AUTH.client.auth.signOut(); } catch {}
  AUTH.user = null; currentId = null; emit();
}

/* ---- toast ---- */
let toastTimer = null;
export function toast(msg) {
  let t = document.getElementById('sk-toast');
  if (!t) { t = document.createElement('div'); t.id = 'sk-toast'; document.body.appendChild(t); }
  t.textContent = msg;
  void t.offsetWidth;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
