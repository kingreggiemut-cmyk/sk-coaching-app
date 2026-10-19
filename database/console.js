/* =====================================================================
   THE CONSOLE FRAME (his pick 2026-10-15, board "Database Console Frame",
   nav B "one tidy bar"). A layer over the same engine: sk-app.js and
   schemes.js run untouched; this file swaps the frame around them.
     · one tidy bar: brand, Schemes / Playbooks / Saved / Build, a short
       Find, a two letter O / D switch and the account
     · the Scheme Kings office behind every section, blurred, with parallax
     · Playbooks: Team books, Formations, All plays (The Map is off for now)
       and Skim / Peek / Deep on the team books
     · Find (Ctrl K): one box over every playbook, formation and play
     · Saved: a list on the left and the open play on the right. Saved
       plays are not tied to a scheme, so there is no "open in install"
     · Build: the tab is there, not linked yet
   Loaded last by index.html / defense.html (and the console.html / console-defense.html aliases).
   ===================================================================== */
(function () {
  const D = document, B = D.body, side = (typeof SIDE !== 'undefined' ? SIDE : 'O');
  const PAGE_O = 'index.html', PAGE_D = 'defense.html';   /* (2026-10-19) the console IS the database now: index.html and defense.html */
  B.classList.add('skc');
  const el = (h) => { const t = D.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild; };

  /* ---------- the office behind everything ---------- */
  const bg = el('<div class="skc-bg" aria-hidden="true"><div class="skc-bgimg" id="skcbgimg"></div><div class="skc-bgtint"></div><div class="skc-grain"></div></div>');
  B.prepend(bg);
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && matchMedia('(pointer:fine)').matches) {
    let raf = 0; const img = bg.querySelector('#skcbgimg');
    addEventListener('pointermove', (e) => { const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5; cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { img.style.setProperty('--px', (-x * 26).toFixed(1) + 'px'); img.style.setProperty('--py', (-y * 18).toFixed(1) + 'px'); }); }, { passive: true });
  }

  /* ---------- one tidy bar ---------- */
  /* (2026-10-19, his call) Build is hidden until the builder is ready to go live: SHOW_BUILD brings the tab and its Find entry back */
  const SHOW_BUILD = false;
  const TABS = [['schemes', 'Schemes'], ['library', 'Playbooks'], ['saved', 'Saved']].concat(SHOW_BUILD ? [['build', 'Build']] : []);
  const bar = el(`<header class="skc-bar">
    <a class="skc-brand" href="${side === 'D' ? PAGE_D : PAGE_O}" aria-label="Scheme Kings home"><img src="logos/scheme-kings.png" alt=""><span><b>Scheme Kings</b><small>The playbook database</small></span></a>
    <nav class="skc-tabs" id="skctabs" aria-label="Database">${TABS.map(([k, l]) => `<button class="skc-tab" data-skc="${k}">${l}</button>`).join('')}</nav>
    <div class="skc-tools">
      <button class="skc-find" id="skcfind" title="Find anything (Ctrl K)"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/></svg><span>Find</span></button><button class="skc-find skc-fs" data-fullscreen title="Full screen">&#x26F6; Full screen</button>
      <div class="skc-side" role="group" aria-label="Side of the ball"><button data-skside="O" aria-pressed="${side === 'O'}" title="Offense">Offense</button><button data-skside="D" aria-pressed="${side === 'D'}" title="Defense">Defense</button></div>
      <div class="skc-acct"><button class="skc-me" id="skcme" aria-haspopup="true" aria-expanded="false" title="Account and full screen" aria-label="Account"></button>
        <div class="skc-menu" id="skcmenu" hidden><div class="skc-menuwho" data-skwho></div><button class="skc-mi" data-fullscreen>&#x26F6; Full screen</button><div class="skc-lib" id="skclib"></div></div></div>
    </div></header>`);
  const head = D.querySelector('.head'); head.prepend(bar);
  /* the clean top: the brand, the section you are on and a glowing arrow; hover the group and the sections slide out (hover only, his call) */
  { const nav = el('<div class="skc-nav"></div>'), brand = bar.querySelector('.skc-brand'), tabs = bar.querySelector('.skc-tabs');
    bar.insertBefore(nav, brand); nav.appendChild(brand);
    nav.appendChild(el('<span class="skc-here" id="skchere"></span>'));
    nav.appendChild(el('<span class="skc-chev" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg></span>'));
    nav.appendChild(tabs); }
  /* the old banner's live count moves into the account menu */
  const live = D.getElementById('live'); if (live) bar.querySelector('#skclib').appendChild(live);

  const secNow = () => (typeof sectionOf === 'function' ? sectionOf(VIEW) : 'library');
  let BUILD = false;
  const BUILDER = '../CFB27%20Engine%20Reference/scheme-builder/build-your-offense.html';
  /* (2026-10-19) the builder lives outside the database folder: where it is not served (the live site, until it ships) the
     tab says so instead of opening an empty frame */
  let BUILD_OK = null;
  function openBuild() { if (BUILD_OK === false) { if (window.skcToast) skcToast('Build your offense is on the way'); return; }
    if (BUILD_OK === null) { fetch(BUILDER, { method: 'HEAD' }).then((r) => { BUILD_OK = r.ok; if (BUILD_OK) openBuild(); else if (window.skcToast) skcToast('Build your offense is on the way'); }).catch(() => { BUILD_OK = false; if (window.skcToast) skcToast('Build your offense is on the way'); }); return; }
    let w = D.getElementById('skcbuild');
    if (!w) { w = el('<div class="skc-build" id="skcbuild"><iframe title="Build your offense" allow="fullscreen"></iframe></div>'); B.appendChild(w); w.querySelector('iframe').src = BUILDER; }
    BUILD = true; sync(); scrollTo({ top: 0 }); placeBuild(); setTimeout(() => { try { w.querySelector('iframe').focus(); } catch (x) {} }, 50); }
  function closeBuild() { BUILD = false; }
  /* the frame starts where the bar ends, measured, because the bar is inside the scaled stage */
  function placeBuild() { const w = D.getElementById('skcbuild'); if (!w) return; const r = bar.getBoundingClientRect(); w.style.top = Math.round(Math.max(0, r.bottom)) + 'px'; }
  addEventListener('resize', () => setTimeout(placeBuild, 0));
  function sync() { const s = BUILD ? 'build' : secNow(); bar.querySelectorAll('.skc-tab').forEach((b) => b.setAttribute('aria-current', b.dataset.skc === s ? 'page' : 'false'));
    { const h = D.getElementById('skchere'), cur = bar.querySelector('.skc-tab[aria-current="page"]'); if (h) h.textContent = cur ? cur.textContent : ''; }
    B.dataset.skcsec = BUILD ? 'build' : (s === 'schemes' && typeof SCHEME !== 'undefined' && SCHEME) ? 'inside' : s;
    B.classList.toggle('skc-building', BUILD);
    if (typeof VIEW !== 'undefined') B.dataset.skcview = VIEW;
    if (typeof VIEW !== 'undefined' && VIEW !== 'saved') { const gb = D.getElementById('skcsvby'); if (gb) gb.remove(); }
    densBar(); }
  bar.addEventListener('click', (e) => {
    const t = e.target.closest('[data-skc]'); if (t) { const k = t.dataset.skc;
      { const n = bar.querySelector('.skc-nav'); n.classList.add('tuck'); setTimeout(() => n.classList.remove('tuck'), 400); t.blur(); }
      if (k === 'build') return openBuild();
      closeBuild();
      VIEW = k === 'library' ? 'books' : k; FAM = null; SET = null; BOOK = null; CONCEPT = null; FAMPICK = null; if (k === 'schemes') SCHEME = null;
      if (Q) { D.getElementById('q').value = ''; Q = ''; PRE = null; const qc = D.getElementById('qclear'); if (qc) qc.hidden = true; }
      buildRail(); render(); scrollTo({ top: 0 }); return; }
    const sd = e.target.closest('[data-skside]'); if (sd) { if (sd.dataset.skside !== side) location.href = sd.dataset.skside === 'D' ? PAGE_D : PAGE_O; return; }
    if (e.target.closest('#skcfind')) return palOpen();
    if (e.target.closest('#skcme')) { const m = D.getElementById('skcmenu'); m.hidden = !m.hidden; bar.querySelector('#skcme').setAttribute('aria-expanded', !m.hidden); return; }
  });
  D.addEventListener('click', (e) => { const m = D.getElementById('skcmenu'); if (m && !m.hidden && !e.target.closest('.skc-acct')) { m.hidden = true; bar.querySelector('#skcme').setAttribute('aria-expanded', 'false'); } });
  /* the account button wears the member's initials once they sign in */
  setInterval(() => { const me = D.getElementById('skcme'); if (!me || typeof SK_AUTH === 'undefined') return; const t = SK_AUTH.signedIn && SK_AUTH.email ? SK_AUTH.email.slice(0, 2).toUpperCase() : ''; if (me.dataset.who === t) return; me.dataset.who = t; me.innerHTML = t || '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>'; }, 1500);

  /* ---------- The Map is off for now; the view tabs ride under the title ---------- */
  if (typeof VIEWS !== 'undefined' && VIEWS.library) VIEWS.library = VIEWS.library.filter((v) => v[0] !== 'map');
  if (typeof VIEW !== 'undefined' && VIEW === 'map') VIEW = 'books';
  const body = D.querySelector('.body'), vr = D.getElementById('vrail'), rb = D.getElementById('railbooks');
  body.insertBefore(vr, D.getElementById('hunt'));
  body.insertBefore(rb, D.getElementById('main'));

  /* ---------- Skim / Peek / Deep on the team books ---------- */
  let DENS = 'peek'; try { DENS = localStorage.getItem('skc_dens') || 'peek'; } catch (e) {}
  function densBar() { const f = D.getElementById('filters'); if (!f) return; let d = D.getElementById('skcdens');
    const show = typeof VIEW !== 'undefined' && VIEW === 'books';
    if (!d) { d = el('<div class="skc-dens" id="skcdens" role="group" aria-label="How much to show"><button data-dens="skim">Skim</button><button data-dens="peek">Peek</button><button data-dens="deep">Deep</button></div>'); f.appendChild(d);
      d.addEventListener('click', (e) => { const b = e.target.closest('[data-dens]'); if (!b) return; DENS = b.dataset.dens; try { localStorage.setItem('skc_dens', DENS); } catch (x) {} densBar(); }); }
    d.hidden = !show; d.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.dens === DENS)); B.dataset.skcdens = DENS; }

  /* ---------- hook the engine: every rail rebuild and render resyncs the frame ---------- */
  const _buildRail = buildRail; buildRail = function () { if (VIEW === 'map') VIEW = 'books'; _buildRail.apply(this, arguments); sync(); };
  const _render = render; render = function () { const r = _render.apply(this, arguments); sync(); return r; };

  /* ---------- SAVED: the list on the left, the open play on the right ---------- */
  let SVSEL = null;
  showSaved = function (list, geo) {
    const main = D.getElementById('main');
    const meta = (p) => SAVEDMETA[p.slug] || {};
    const bookKeyOf = (p) => meta(p).book || (p.books && p.books[0]) || '';
    const groupOf = (p) => SAVEDBY === 'formation' ? `${p.family} ${p.set}` : SAVEDBY === 'type' ? p.type : SAVEDBY === 'recent' ? '' : bookKeyOf(p);
    const labelOf = (k, p) => { if (SAVEDBY === 'book') { const b = bookOf(k); return b ? { t: b.team + (b.sideCode === 'D' ? ' defense' : ''), logo: b.logo } : { t: k || 'No playbook', logo: null }; }
      if (SAVEDBY === 'formation') return { t: bookSetName(p.family, p.set) }; if (SAVEDBY === 'type') return { t: p.type + ' plays' }; return { t: 'Newest first' }; };
    const ordered = list.slice().sort((x, y) => (meta(y).t || 0) - (meta(x).t || 0)), groups = new Map();
    for (const p of ordered) { const k = groupOf(p); if (!groups.has(k)) groups.set(k, { k, p, items: [] }); groups.get(k).items.push(p); }
    const flat = [...groups.values()].flatMap((g) => g.items);
    if (!SVSEL || !flat.some((p) => p.slug === SVSEL)) SVSEL = flat[0].slug;
    const by = [['book', 'Playbook'], ['formation', 'Formation'], ['type', 'Play type'], ['recent', 'Newest']];
    const fam = (p) => String(p.family).replace(/_/g, ' ');
    const detail = (p) => `<div class="skc-svdet" id="skcsvdet"><div class="skc-svfld">${drawCard(geo ? geo[p.slug] : null)}</div>
      <div class="skc-svhd"><span class="skc-k">${esc(fam(p))} · ${esc(bookSetName(p.family, p.set))}</span><h3>${esc(bookPlayName(p))}</h3></div>
      <div class="skc-meta"><span class="t-${esc(p.type)}">${esc(p.type)}</span>${p.kind ? `<span>${esc(p.kind)}</span>` : ''}<span>${p.books.length} playbook${p.books.length === 1 ? '' : 's'}</span></div>
      <div class="skc-acts"><button class="skc-go" data-svopen="${p.slug}">Open the play</button><button class="skc-ghost" data-svform="${p.slug}">See its formation</button><button class="skc-link" data-svdrop="${p.slug}">Unstar</button></div></div>`;
    const item = (p) => `<button class="skc-li" role="option" data-svsel="${p.slug}" aria-selected="${p.slug === SVSEL}"><b>${esc(bookPlayName(p))}</b><small>${esc(bookSetName(p.family, p.set))}</small><i aria-hidden="true">✓</i></button>`;
    { const fl = D.getElementById('filters'); let gb = D.getElementById('skcsvby'); if (!gb) { gb = el('<div class="bar skc-svby" id="skcsvby"></div>'); fl.appendChild(gb); }
      gb.innerHTML = `<span class="lbl">Group by</span>${by.map(([k, l]) => `<button class="chip${SAVEDBY === k ? ' on' : ''}" data-svby="${k}">${l}</button>`).join('')}<u>${list.length} saved</u>`;
      gb.onclick = (e) => { const b = e.target.closest('[data-svby]'); if (!b) return; SAVEDBY = b.dataset.svby; try { localStorage.setItem('sk_savedby', SAVEDBY); } catch (x) {} showSaved(list, geo); }; }
    main.innerHTML = `<div class="skc-sv"><div class="skc-svlist" role="listbox" tabindex="0" aria-label="Saved plays">${[...groups.values()].map((g) => { const lb = labelOf(g.k, g.p);
        return `<div class="skc-lg">${lb.logo ? `<img src="logos/${esc(lb.logo)}.png" alt="" onerror="this.remove()">` : ''}<span>${esc(lb.t)}</span><i>${g.items.length}</i></div>${g.items.map(item).join('')}`; }).join('')}</div>
      ${detail(flat.find((p) => p.slug === SVSEL))}</div>`;
    D.getElementById('railbooks').innerHTML = ''; D.getElementById('foot').textContent = '';
    const pick = (slug) => { SVSEL = slug; main.querySelectorAll('.skc-li').forEach((x) => x.setAttribute('aria-selected', x.dataset.svsel === slug)); const d = D.getElementById('skcsvdet'); d.outerHTML = detail(list.find((p) => p.slug === slug)); };
    main.onclick = (e) => {
      const b = e.target.closest('[data-svby]'); if (b) { SAVEDBY = b.dataset.svby; try { localStorage.setItem('sk_savedby', SAVEDBY); } catch (x) {} showSaved(list, geo); return; }
      const s = e.target.closest('[data-svsel]'); if (s) return pick(s.dataset.svsel);
      const o = e.target.closest('[data-svopen]'); if (o) return openPlay(list.find((p) => p.slug === o.dataset.svopen), geo);
      const f = e.target.closest('[data-svform]'); if (f) { const p = list.find((x) => x.slug === f.dataset.svform); VIEW = 'formations'; BOOK = null; FAM = p.family; SET = p.set; CONCEPT = null; FAMPICK = null; buildRail(); render(); scrollTo({ top: 0 }); return; }
      const dr = e.target.closest('[data-svdrop]'); if (dr) { const k = dr.dataset.svdrop, p = list.find((x) => x.slug === k), was = SAVEDMETA[k];
        starDrop(k); saveStars(); const rest = list.filter((x) => x.slug !== k); SVSEL = null;
        if (rest.length) showSaved(rest, geo); else render();
        skcToast(bookPlayName(p) + ' unstarred', () => { starAdd(k); if (was) SAVEDMETA[k] = was; saveStars(); render(); }); return; }
    };
    const lst = main.querySelector('.skc-svlist');
    lst.addEventListener('keydown', (e) => { if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return; e.preventDefault(); const i = flat.findIndex((p) => p.slug === SVSEL), n = flat[Math.max(0, Math.min(flat.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      pick(n.slug); const x = lst.querySelector(`[data-svsel="${n.slug}"]`); if (x) { x.focus(); x.scrollIntoView({ block: 'nearest' }); } });
  };

  /* ---------- FIND (Ctrl K): one box over the whole library ---------- */
  const pal = el(`<div class="skc-pal" id="skcpal" hidden><div class="skc-pbox" role="dialog" aria-label="Find anything"><input id="skcpin" placeholder="Find a playbook, a formation or a play" autocomplete="off" aria-label="Search"><div class="skc-pres" id="skcpres" role="listbox"></div><div class="skc-pfoot"><span>↑ ↓ to move</span><span>Enter to open</span><span>Esc to close</span></div></div></div>`);
  B.appendChild(pal);
  let PR = [], PI = 0, SETS = null;
  const go = (fn) => { palClose(); fn(); scrollTo({ top: 0 }); };
  const DEF = ['Zone', 'Man', 'Blitz'], mine = (p) => side === 'D' ? DEF.includes(p.type) : !DEF.includes(p.type);
  function items(q) { q = q.trim().toLowerCase(); const out = []; if (!IDX) return out;
    if (!SETS) { const m = new Map(); for (const p of IDX.plays) { if (p.drill || !mine(p)) continue; const k = p.family + '||' + p.set; if (!m.has(k)) m.set(k, { family: p.family, set: p.set, n: 0, side: p.side || null }); m.get(k).n++; } SETS = [...m.values()]; }
    if (q) out.push(['Search', `Every result for "${q}"`, 'The full search', () => go(() => { const i = D.getElementById('q'); i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); })]);
    const bk = IDX.books.filter((b) => b.plays > 0 && !b.drill && b.sideCode === side && (!q || (b.team + ' ' + (b.nick || '') + ' ' + (b.identity || '')).toLowerCase().includes(q))).slice(0, q ? 6 : 5);
    bk.forEach((b) => out.push(['Playbooks', b.team, b.plays + ' plays · ' + (b.identity || ''), () => go(() => { BOOK = b.key; VIEW = 'book'; FAM = null; SET = null; buildRail(); render(); })]));
    if (q) { SETS.filter((s) => (s.family + ' ' + s.set).toLowerCase().replace(/_/g, ' ').includes(q)).slice(0, 5).forEach((s) => out.push(['Formations', s.set, String(s.family).replace(/_/g, ' ') + ' · ' + s.n + ' plays', () => go(() => { VIEW = 'formations'; BOOK = null; FAM = s.family; SET = s.set; CONCEPT = null; FAMPICK = null; buildRail(); render(); })]));
      const seen = new Set(); IDX.plays.filter((p) => !p.drill && mine(p) && (p._s || p.name.toLowerCase()).includes(q)).some((p) => { const k = p.name + '|' + p.set; if (seen.has(k)) return false; seen.add(k);
        out.push(['Plays', p.name, String(p.family).replace(/_/g, ' ') + ' ' + p.set, () => go(async () => { VIEW = 'formations'; BOOK = null; FAM = p.family; SET = p.set; CONCEPT = null; FAMPICK = null; buildRail(); render(); const g = await cardsFor(p.family, p.set); openPlay(p, g); })]); return seen.size >= 8; }); }
    [['Schemes', 'schemes'], ['Playbooks', 'library'], ['Saved plays', 'saved']].concat(SHOW_BUILD ? [['Build your offense', 'build']] : []).forEach(([l, k]) => { if (!q || l.toLowerCase().includes(q)) out.push(['Go to', l, '', () => go(() => bar.querySelector(`[data-skc="${k}"]`).click())]); });
    return out.slice(0, 26); }
  function paint() { PR = items(D.getElementById('skcpin').value); PI = Math.min(PI, Math.max(0, PR.length - 1)); let g = '', h = '';
    PR.forEach(([grp, l, s], i) => { if (grp !== g) { g = grp; h += `<div class="skc-pg">${grp}</div>`; } h += `<button class="skc-pr" role="option" data-i="${i}" aria-selected="${i === PI}"><span>${esc(l)}</span><small>${esc(s)}</small></button>`; });
    const r = D.getElementById('skcpres'); r.innerHTML = IDX ? (h || '<div class="skc-pg">Nothing found. Try a play like mesh or a team like Georgia.</div>') : '<div class="skc-pg">Loading the library…</div>';
    const sel = r.querySelector('[aria-selected="true"]'); if (sel) sel.scrollIntoView({ block: 'nearest' }); }
  async function palOpen() { pal.hidden = false; const i = D.getElementById('skcpin'); i.value = ''; PI = 0; paint(); i.focus(); if (!IDX) { await ensureIndex(); paint(); } }
  function palClose() { pal.hidden = true; }
  pal.addEventListener('click', (e) => { const r = e.target.closest('.skc-pr'); if (r) { const f = PR[+r.dataset.i]; if (f) f[3](); return; } if (e.target === pal) palClose(); });
  D.getElementById('skcpin').addEventListener('input', () => { PI = 0; paint(); });
  D.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); e.stopImmediatePropagation(); return pal.hidden ? palOpen() : palClose(); }
    if (pal.hidden) return; e.stopImmediatePropagation();
    if (e.key === 'Escape') return palClose();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); PI = Math.max(0, Math.min(PR.length - 1, PI + (e.key === 'ArrowDown' ? 1 : -1))); paint(); return; }
    if (e.key === 'Enter') { e.preventDefault(); const f = PR[PI]; if (f) f[3](); }
  }, true);

  /* ---------- toasts, bottom left ---------- */
  const tw = el('<div class="skc-toasts" aria-live="polite"></div>'); B.appendChild(tw);
  window.skcToast = function (m, undo) { const t = el(`<div class="skc-toast"><span>${esc(m)}</span>${undo ? '<button>Undo</button>' : ''}</div>`); if (undo) t.querySelector('button').onclick = () => { undo(); t.remove(); }; tw.appendChild(t); while (tw.children.length > 3) tw.firstChild.remove(); setTimeout(() => t.remove(), 5000); };

  /* one size on every screen: the frame is a 1600 x 900 stage scaled to the window (phones flow instead) */
  const wrap = D.querySelector('.wrap');
  function fit() { const cw = D.documentElement.clientWidth, ch = D.documentElement.clientHeight, s = cw <= 760 ? 1 : Math.min(cw / 1600, ch / 900); wrap.style.zoom = s === 1 ? '' : s.toFixed(4); D.documentElement.style.setProperty('--skc-s', s); }
  addEventListener('resize', fit); fit();

  sync();
})();
