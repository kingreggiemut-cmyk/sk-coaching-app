/* sk-auth.js — THE MEMBER, shared by the database pages and the scheme page.
   Same Supabase project and the same session as the coaching app and the
   playbooks: on the one Netlify site a member signed in there is already
   signed in here, no second login. Browsing anonymously keeps every star,
   plan and sheet in this browser; signing in lifts them to the account.

   Also here: the embed protocol the playbooks speak (skHello / skHostReady /
   skFullscreen) so a phone inside the Squarespace iframe can take the whole
   screen even where the browser refuses full screen to an iframe.

   Loads AFTER supabase-js (CDN) and BEFORE the page's own script. Defines:
   SK_AUTH, skRequireLogin(), SKDB (stars, plans, sheets), skFullscreen(),
   skFullscreenLabels(), skSay(). Nothing here touches page state. */

const SK_SUPA = {
  url: 'https://ksgxrxqvnfpfhidxsxcs.supabase.co',
  anon: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3hyeHF2bmZwZmhpZHhzeGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzkxMTgsImV4cCI6MjA5NzAxNTExOH0.pUD6sbkjhhTlgl5x4KHFJsThoHVlNkNBlSFES_8HHvM',
};

const SK_AUTH = {
  client: null, user: null, ready: null,
  get memberId() { return this.user ? this.user.id : null; },
  get signedIn() { return !!this.user; },
  get email() { return this.user ? (this.user.email || '') : ''; },
};
SK_AUTH.ready = new Promise((res) => { SK_AUTH._settle = res; });

function skAuthEvent() { skWhoRender(); try { document.dispatchEvent(new CustomEvent('sk-auth', { detail: { signedIn: SK_AUTH.signedIn } })); } catch (e) {} }
(async function skInitAuth() {
  if (typeof supabase === 'undefined' || !supabase.createClient) { SK_AUTH._settle(); skAuthEvent(); return; }
  try {
    SK_AUTH.client = supabase.createClient(SK_SUPA.url, SK_SUPA.anon);
    const { data: { session } } = await SK_AUTH.client.auth.getSession();
    SK_AUTH.user = session ? session.user : null;
    SK_AUTH.client.auth.onAuthStateChange((_evt, sess) => { const was = SK_AUTH.signedIn; SK_AUTH.user = sess ? sess.user : null; if (was !== SK_AUTH.signedIn) skAuthEvent(); else skWhoRender(); });
  } catch (e) { /* an auth hiccup never breaks the page */ }
  SK_AUTH._settle(); skAuthEvent();
})();

/* ---------- who is here: every [data-skwho] shows Sign in, or the member and Sign out ---------- */
function skWhoRender() {
  document.querySelectorAll('[data-skwho]').forEach((el) => {
    if (!SK_AUTH.client) { el.innerHTML = ''; el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = SK_AUTH.signedIn
      ? `<span class="skwho-name" title="${skEsc(SK_AUTH.email)}">${skEsc(SK_AUTH.email.split('@')[0])}</span><button class="skwho-btn" data-sklogout>Sign out</button>`
      : `<button class="skwho-btn on" data-sklogin>Sign in</button>`;
  });
}
document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest && (e.target.closest('[data-sklogin]') || e.target.closest('[data-sklogout]'));
  if (!t) return; e.preventDefault();
  if (t.hasAttribute('data-sklogout')) { if (SK_AUTH.client) SK_AUTH.client.auth.signOut(); return; }
  skRequireLogin('keep your work on your account');
});
const skEsc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- a toast that borrows the page's own if it has one ---------- */
function skSay(m) {
  if (typeof toast === 'function') return toast(m);
  if (typeof flash === 'function') return flash(m);
  let t = document.getElementById('sk-toast'); if (!t) { skInjectAuthCSS(); t = document.createElement('div'); t.id = 'sk-toast'; document.body.appendChild(t); }
  t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- the sign-in: the playbooks' own card, the coaching app's password ---------- */
let skLoginResolve = null, skAuthCSSInjected = false;
function skRequireLogin(reason = 'save this') {
  if (SK_AUTH.signedIn) return Promise.resolve(true);
  if (!SK_AUTH.client) { skSay('Sign-in is unavailable right now'); return Promise.resolve(false); }
  skInjectAuthCSS();
  return new Promise((resolve) => { skLoginResolve = resolve; skOpenLoginModal(reason); });
}
function skSettleLogin(ok) { const r = skLoginResolve; skLoginResolve = null; if (r) r(ok); }
function skOpenLoginModal(reason) {
  const old = document.getElementById('sk-login'); if (old) old.remove();
  const wrap = document.createElement('div'); wrap.id = 'sk-login';
  wrap.innerHTML = `
    <div class="sk-login-backdrop"></div>
    <div class="sk-login-card" role="dialog" aria-modal="true" aria-label="Sign in">
      <button class="sk-login-x" type="button" aria-label="Close">&times;</button>
      <div class="sk-login-emblem"><img src="logos/scheme-kings.png" alt=""></div>
      <div class="sk-login-eyebrow">Scheme Kings</div>
      <h3 class="sk-login-title">Sign in to ${skEsc(reason)}</h3>
      <p class="sk-login-sub">Your stars, call sheets, boards and notes save to your account and follow you to the coaching app and every playbook.</p>
      <form class="sk-login-form" autocomplete="on">
        <input class="sk-login-input" type="email" name="email" placeholder="Email" autocomplete="email" required>
        <input class="sk-login-input" type="password" name="password" placeholder="Password" autocomplete="current-password" required>
        <div class="sk-login-err" role="alert"></div>
        <button class="sk-login-go" type="submit">Sign in</button>
      </form>
      <p class="sk-login-foot">Same email and password as your Scheme Kings coaching app.</p>
    </div>`;
  document.body.appendChild(wrap); void wrap.offsetWidth; wrap.classList.add('open');
  const close = (ok) => { wrap.classList.remove('open'); setTimeout(() => wrap.remove(), 220); document.removeEventListener('keydown', onEsc); skSettleLogin(!!ok); };
  const onEsc = (e) => { if (e.key === 'Escape') close(false); };
  document.addEventListener('keydown', onEsc);
  wrap.querySelector('.sk-login-x').addEventListener('click', () => close(false));
  wrap.querySelector('.sk-login-backdrop').addEventListener('click', () => close(false));
  const form = wrap.querySelector('.sk-login-form'), err = wrap.querySelector('.sk-login-err'), go = wrap.querySelector('.sk-login-go');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); err.textContent = '';
    const email = form.email.value.trim(), password = form.password.value;
    if (!email || !password) { err.textContent = 'Enter your email and password.'; return; }
    go.disabled = true; go.textContent = 'Signing in…';
    try {
      const { data, error } = await SK_AUTH.client.auth.signInWithPassword({ email, password });
      if (error) throw error;
      SK_AUTH.user = data.user; skAuthEvent(); close(true);
    } catch (ex) {
      err.textContent = (ex && /invalid/i.test(ex.message || '')) ? 'That email and password did not match.' : 'Could not sign in. Try again.';
      go.disabled = false; go.textContent = 'Sign in';
    }
  });
  setTimeout(() => { const i = form.querySelector('input'); if (i) i.focus(); }, 80);
}
function skInjectAuthCSS() {
  if (skAuthCSSInjected) return; skAuthCSSInjected = true;
  const css = `
  #sk-login{position:fixed;inset:0;z-index:9000;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s ease}
  #sk-login.open{opacity:1}
  #sk-login .sk-login-backdrop{position:absolute;inset:0;background:rgba(8,14,30,.62);backdrop-filter:blur(3px)}
  #sk-login .sk-login-card{position:relative;width:min(420px,92vw);padding:34px 30px 24px;text-align:center;background:#F6EEDC;border:3px solid #1E54B7;border-radius:18px;box-shadow:inset 0 0 0 2.5px #F5A623,0 26px 60px rgba(0,0,0,.45);transform:translateY(14px) scale(.97);transition:transform .24s cubic-bezier(.2,.75,.2,1);font-family:'Barlow',Arial,sans-serif}
  #sk-login.open .sk-login-card{transform:none}
  #sk-login .sk-login-x{position:absolute;top:10px;right:14px;background:none;border:none;cursor:pointer;font-size:30px;line-height:1;color:#1E54B7;opacity:.6}
  #sk-login .sk-login-x:hover{opacity:1}
  #sk-login .sk-login-emblem{width:56px;height:56px;margin:0 auto 8px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 14px rgba(0,0,0,.25)}
  #sk-login .sk-login-emblem img{width:70%;height:70%;object-fit:contain}
  #sk-login .sk-login-eyebrow{font:800 12px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.22em;color:#1E54B7;opacity:.7}
  #sk-login .sk-login-title{font:400 30px/1.05 'Anton',Impact,sans-serif;text-transform:uppercase;margin:6px 0 8px;color:#15233f}
  #sk-login .sk-login-sub{font-size:14px;line-height:1.45;color:#3a3320;opacity:.85;margin:0 4px 18px}
  #sk-login .sk-login-form{display:flex;flex-direction:column;gap:10px}
  #sk-login .sk-login-input{width:100%;box-sizing:border-box;padding:13px 15px;border-radius:11px;font-size:16px;border:2px solid #9fb3dc;background:#fffdf6;color:#15233f;outline:none}
  #sk-login .sk-login-input:focus{border-color:#1E54B7;box-shadow:0 0 0 3px rgba(245,166,35,.4)}
  #sk-login .sk-login-err{min-height:16px;font-size:13px;font-weight:700;color:#c0392b;text-align:left;padding-left:2px}
  #sk-login .sk-login-go{margin-top:2px;padding:14px;border:none;border-radius:11px;cursor:pointer;font:800 18px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.05em;color:#1a1407;background:#F5A623;box-shadow:0 6px 16px rgba(0,0,0,.25);transition:transform .15s,filter .15s}
  #sk-login .sk-login-go:hover:not(:disabled){transform:translateY(-1px);filter:brightness(1.05)}
  #sk-login .sk-login-go:disabled{opacity:.65;cursor:default}
  #sk-login .sk-login-foot{font-size:12px;color:#3a3320;opacity:.6;margin:14px 0 0}
  #sk-toast{position:fixed;left:50%;bottom:34px;transform:translate(-50%,18px);z-index:9100;padding:12px 20px;border-radius:999px;pointer-events:none;opacity:0;font:800 14px/1 'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:.04em;color:#F6EEDC;background:#15233f;border:2px solid #F5A623;box-shadow:0 12px 30px rgba(0,0,0,.4);transition:opacity .25s ease,transform .25s ease}
  #sk-toast.show{opacity:1;transform:translate(-50%,0)}
  @media (prefers-reduced-motion:reduce){#sk-login,#sk-login .sk-login-card,#sk-toast{transition:none}}`;
  const st = document.createElement('style'); st.id = 'sk-auth-css'; st.textContent = css; document.head.appendChild(st);
}

/* ---------- the account's data: stars in the library, a plan per scheme, a sheet per scheme ----------
   Every call is safe while signed out (resolves null / false) so the pages
   can call them without checking first. */
const SKDB = {
  ok() { return !!(SK_AUTH.client && SK_AUTH.signedIn); },
  stars: {
    async load() { if (!SKDB.ok()) return null; try { const { data, error } = await SK_AUTH.client.from('saved_library_plays').select('slug,book,created_at').eq('member_id', SK_AUTH.memberId); if (error) throw error; return data || []; } catch (e) { return null; } },
    async set(slug, on, book) { if (!SKDB.ok()) return false; try {
      if (on) { const { error } = await SK_AUTH.client.from('saved_library_plays').upsert({ member_id: SK_AUTH.memberId, slug, book: book || null }, { onConflict: 'member_id,slug' }); if (error) throw error; }
      else { const { error } = await SK_AUTH.client.from('saved_library_plays').delete().eq('member_id', SK_AUTH.memberId).eq('slug', slug); if (error) throw error; }
      return true; } catch (e) { return false; } },
  },
  plans: {
    async load(key) { if (!SKDB.ok()) return null; try { const { data, error } = await SK_AUTH.client.from('saved_plans').select('data,updated_at').eq('member_id', SK_AUTH.memberId).eq('scheme_key', key).maybeSingle(); if (error) throw error; return data || null; } catch (e) { return null; } },
    async save(key, plan) { if (!SKDB.ok()) return false; try { const { error } = await SK_AUTH.client.from('saved_plans').upsert({ member_id: SK_AUTH.memberId, scheme_key: key, data: plan, updated_at: new Date().toISOString() }, { onConflict: 'member_id,scheme_key' }); if (error) throw error; return true; } catch (e) { return false; } },
  },
  sheets: {
    async load(schemeKey) { if (!SKDB.ok()) return null; try { const { data, error } = await SK_AUTH.client.from('saved_sheets').select('data').eq('member_id', SK_AUTH.memberId).eq('scheme_key', schemeKey).maybeSingle(); if (error) throw error; return data ? data.data : null; } catch (e) { return null; } },
  },
};

/* ---------- full screen, the way the playbooks do it inside the members page ----------
   Ask the browser. Where it refuses (an iframe, iPhone Safari), go "faux":
   the page marks itself and tells the host page, which stretches the frame
   over the whole screen. The host answers skHello with skHostReady so we
   know it is listening; without a host on iPhone, open in a new tab. */
const SK_EMBED = { host: false, faux: false, framed: window.parent !== window };
if (SK_EMBED.framed) {
  addEventListener('message', (e) => { if (e && e.data && e.data.skHostReady) SK_EMBED.host = true; });
  const hello = () => { try { window.parent.postMessage({ skHello: 1 }, '*'); } catch (e) {} };
  hello(); addEventListener('load', hello); setTimeout(hello, 900);
}
function skFsNative() { return document.fullscreenElement || document.webkitFullscreenElement || null; }
function skFsActive() { return !!skFsNative() || SK_EMBED.faux; }
function skSetFaux(on) { SK_EMBED.faux = on; document.documentElement.classList.toggle('faux-fs', on); if (SK_EMBED.framed) { try { window.parent.postMessage({ skFullscreen: on }, '*'); } catch (e) {} } skFullscreenLabels(); }
function skFullscreen(on) {
  if (on === undefined) on = !skFsActive();
  const root = document.documentElement;
  if (!on) { try { if (skFsNative()) { if (document.exitFullscreen) document.exitFullscreen().catch(() => {}); else if (document.webkitExitFullscreen) document.webkitExitFullscreen(); } } catch (e) {} if (SK_EMBED.faux) skSetFaux(false); return; }
  const req = root.requestFullscreen || root.webkitRequestFullscreen;
  const enabled = 'fullscreenEnabled' in document ? document.fullscreenEnabled : document.webkitFullscreenEnabled;
  if (req && enabled !== false) {
    try { const p = req.call(root); if (p && p.catch) p.catch(() => skSetFaux(true)); } catch (e) { skSetFaux(true); }
    setTimeout(() => { if (!skFsNative() && !SK_EMBED.faux) skSetFaux(true); }, 260);
  } else if (SK_EMBED.framed && !SK_EMBED.host) {
    try { window.open(location.href, '_blank', 'noopener'); } catch (e) { skSetFaux(true); }
  } else skSetFaux(true);
}
function skFullscreenLabels() { const on = skFsActive(); document.querySelectorAll('[data-fullscreen]').forEach((b) => { b.innerHTML = on ? '&#x2716; Exit full screen' : '&#x26F6; Full screen'; b.title = on ? 'Back to the window' : 'Take the whole screen'; }); }
document.addEventListener('fullscreenchange', skFullscreenLabels);
document.addEventListener('webkitfullscreenchange', skFullscreenLabels);
document.addEventListener('click', (e) => { const b = e.target && e.target.closest && e.target.closest('[data-fullscreen]'); if (!b) return; e.preventDefault(); skFullscreen(); });
