/* =====================================================================
   THE WAR ROOM · the skin a scheme wears when its record says skin:'warroom'.
   His pick from three directions on 2026-09-04 (see the Alabama 4-2-5
   Install canvas). A photographed room: the play on a wall TV, the plan on a
   whiteboard, the calls on a film reel, the sheet on the desk. Titles in
   Barlow Condensed, notes in marker, one crimson, one gold.

   WHAT THIS FILE DOES AND DOES NOT DO. It replaces the room's chrome (the
   bar with its dropdowns) and renders four screens of its own: the room,
   the plan, all plays, and the mount for the lifted call sheet. It does NOT
   touch how the install, the drives or the board operate: the install keeps
   install.js and is restyled in warroom.css under body.sk-warroom, and the
   drives, the board and personnel keep their renderers and are only
   re-housed. The call sheet is the playbook's own module (gp-sheet.js).

   Loads after install.js and shares its scope.
   ===================================================================== */
const WR = {
  is: (sc) => !!(sc && sc.skin === 'warroom'),
  room: (sc) => (sc && sc.about && sc.about.room) || 'art/Bama Assets__Alabama Office background.jpg',
};
/* the sections, in the order a member meets them; All Plays is the one the
   database did not have */
const WR_VIEWS = [
  ['home', 'The Room', 'where everything lives'],
  ['plan', 'The Plan', 'the fronts and the principles'],
  ['install', 'The Install', 'six calls, three pillars'],
  ['plays', 'All Plays', 'every blitz and coverage'],
  ['sheet', 'Call Sheet', 'what you take in'],
  ['drives', 'Drives', 'the script rack'],
  ['board', 'The Board', 'cases and answers'],
  ['personnel', 'Personnel', 'who runs it'],
];
let WR_JUMP = null;                                  // a play the bar asked the install to open
const WR_PLAYS = { filter: 'all', pick: null };      // the All Plays screen's state

/* ---------- the bar: crest, title, section plates, and a dropdown per plate ---------- */
const wrPlaysOf = (sc) => sc.plays.filter((p) => !p.gpOnly);
const wrBlitz = (sc) => wrPlaysOf(sc).filter((p) => p.libType === 'Blitz');
const wrCover = (sc) => wrPlaysOf(sc).filter((p) => p.libType !== 'Blitz');
function wrDrop(sc, k) {
  const plan = planOf(sc), ink = inkedSet(sc), pls = pillarsOf(sc);
  const row = (attrs, a, b, on) => `<button class="wr-dd-row${on ? ' on' : ''}" ${attrs}><b>${esc(a)}</b>${b ? `<span>${esc(b)}</span>` : ''}</button>`;
  if (k === 'plan') {
    const pr = (sc.about && sc.about.principles) || [];
    return `<div class="wr-dd-h">The principles</div>` + pr.map((p, i) => row(`data-view="plan"`, p.title, '')).join('')
      + `<div class="wr-dd-h">The fronts</div>` + (sc.formations || []).map((f) => row(`data-view="plan" data-front="${esc(f.name)}"`, f.name, `${(f.tags || []).length} calls`)).join('');
  }
  if (k === 'install') {
    return pls.map((pl, i) => `<div class="wr-dd-h">${esc(pl.name)}<i>${insState(sc, i) === 'lock' ? 'locked' : `${taughtIn(sc, pl).filter((p) => ink.has(p.id)).length} of ${taughtIn(sc, pl).length} inked`}</i></div>`
      + taughtIn(sc, pl).map((p, j) => row(`data-view="install" data-jump="${i}|${j + 1}"`, p.name, p.formation, ink.has(p.id))).join('')).join('');
  }
  if (k === 'plays') {
    return `<div class="wr-dd-h">Blitzes<i>${wrBlitz(sc).length}</i></div>` + wrBlitz(sc).map((p) => row(`data-view="plays" data-pick="${esc(p.id)}"`, p.name, p.formation)).join('')
      + `<div class="wr-dd-h">Coverages<i>${wrCover(sc).length}</i></div>` + wrCover(sc).map((p) => row(`data-view="plays" data-pick="${esc(p.id)}"`, p.name, p.formation)).join('');
  }
  if (k === 'sheet') return [['Game plan', 'the buckets, the fronts, the pairs'], ['Fronts', 'the three looks'], ['Custom adjustments', 'the macros you save in the game']].map(([a, b], i) => row(`data-view="sheet" data-tab="${['plan', 'forms', 'macros'][i]}"`, a, b)).join('');
  if (k === 'drives') return (plan.drives.length ? plan.drives.map((d) => row(`data-view="drives" data-drive="${esc(d.id)}"`, d.title || 'Drive', `${(d.main || []).length} plays`)).join('') : row('data-view="drives"', 'Script one', 'the rack is empty'));
  if (k === 'board') { const pins = plan.board.pins; return row('data-view="board"', pins.length ? `${pins.length} pinned` : 'Nothing pinned', `${allCases(sc).length} cases`); }
  if (k === 'personnel') return ((sc.personnel && sc.personnel.players) || []).map((p) => row('data-view="personnel"', p.name, p.roleRef ? (sc.personnel.roles[p.roleRef] || {}).role : '')).join('');
  return '';
}
/* THE BACKGROUND DRIFTS. The photo behind every screen moves a little with
   the pointer and the scroll, on one rAF, writing two numbers the stylesheet
   turns into a transform. Attached once for the session. */
let WR_PX = 0;
function wrParallax() {
  if (WR_PX) return; WR_PX = 1;
  /* the pinned backdrop, made once and left in the page */
  if (!document.querySelector('.wr-bg')) {
    const bg = document.createElement('div');
    bg.className = 'wr-bg'; bg.setAttribute('aria-hidden', 'true');
    bg.innerHTML = '<i></i>';
    document.body.insertBefore(bg, document.body.firstChild);
  }
  if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let mx = 0, my = 0, sy = 0, raf = 0;
  const apply = () => { raf = 0; const b = document.body;
    b.style.setProperty('--bgx', mx.toFixed(3));
    b.style.setProperty('--bgy', (my + sy).toFixed(3)); };
  const ask = () => { if (!raf) raf = requestAnimationFrame(apply); };
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; ask(); }, { passive: true });
  addEventListener('scroll', () => { sy = Math.min(1.5, scrollY / 700); ask(); }, { passive: true });
}
function wrBar(sc) {
  wrParallax();
  const inst = installedSet(sc), ink = inkedSet(sc), total = pillarsOf(sc).reduce((n, x) => n + x.plays.length, 0);
  return `<header class="wr-bar">
    <button class="wr-back" data-back="1">&larr; ${esc(navLabel())}</button>
    <div class="wr-id"><span class="skh-crest">${pkCrest(sc)}</span><div><i>${esc(sc.series || 'Scheme Kings')} &middot; ${esc((WR_VIEWS.find((v) => v[0] === SEC) || WR_VIEWS[0])[1])}</i><b>${esc(sc.name)}</b></div></div>
    <nav class="wr-nav">${WR_VIEWS.map(([k, a]) => { const dd = k === 'home' ? '' : wrDrop(sc, k);
      return `<div class="wr-item${SEC === k ? ' on' : ''}"><button class="wr-plate" data-view="${k}">${esc(a)}</button>${dd ? `<div class="wr-dd">${dd}</div>` : ''}</div>`; }).join('')}</nav>
    <div class="wr-meter"><i>Installed</i><b>${ink.size}<span>of ${total}</span></b><u><em style="--p:${(ink.size / Math.max(1, total)).toFixed(3)}"></em></u></div>
  </header>`;
}
function wrRefreshBar(sc) { const b = $('.wr-bar'); if (b) b.outerHTML = wrBar(sc); }

/* ---------- shared bits ---------- */
const wrTV = (inner, plate) => `<div class="wr-tv"><div class="wr-tv-screen">${inner}</div>${plate ? `<div class="wr-plate wr-tv-plate">${plate}</div>` : ''}</div>`;
const wrTile = (sc, name) => { const f = FORMS && FORMS[slug(sc.family && sc.family.family ? sc.family.family : '4-2-5') + '__' + slug(String(name).replace(/^4-?2-?5\s*/i, ''))]; return f ? drawFormation(f) : ''; };
const wrFrontTile = (name) => { const key = '425__' + slug(String(name).replace(/^4-?2-?5\s*/i, '')); const f = FORMS && FORMS[key]; return f ? drawFormation(f) : `<div class="wr-notile">${esc(name)}</div>`; };
const wrStrip = (sc, list, cur, attr) => `<div class="wr-film">${list.map((p) => { const ink = inkedSet(sc).has(p.id);
  return `<button class="wr-slide${p.id === cur ? ' on' : ''}${ink ? ' ink' : ''}" ${attr(p)} title="${esc(p.name)}"><span class="wr-slide-art">${insArt(sc, p)}</span><i>${esc(p.name)}</i></button>`; }).join('')}</div>`;

/* ---------- THE ROOM · the cover, then the situation board ----------
   His call, 2026-09-04: a hero shot mixed with a status screen. Three people
   open this page and it has to serve all three in one screen. A buyer who
   just paid needs to know what this defence IS and why it wins before they
   click anything, so the top is a cover: the name at cover size, the record
   Saban actually put up, and one way in. A member mid-install needs "where
   was I", so the board underneath is the state of their own work. And he
   parks here on camera, so nothing on it is a control panel: it is the
   scheme, stated. Everything on this page is real, out of the book. */
function wrHome(sc, body) {
  const ab = sc.about || {};
  const nx = insNext(sc), pls = pillarsOf(sc);
  const taught = pls.flatMap((pl) => taughtIn(sc, pl));
  const stat = (id) => (ab.stats || []).find((s) => s.id === id) || {};
  const pr = ab.principles || [];
  const bk = ab.playbook;
  const PROOF = ['natty', 'record', 'ppg', 'picks'].map(stat).filter((s) => s.value !== undefined);
  /* one action, and it is the whole progress story: the bar already carries
     the count, so the button only has to say what comes next */
  const act = (cls) => nx
    ? `<button class="skb gold ${cls}" data-view="install" data-jump="${nx.ch}|${nx.st}">Continue with ${esc(nx.p.name)} <em>&rarr;</em></button>`
    : `<button class="skb gold ${cls}" data-view="install">Open the install <em>&rarr;</em></button>`;

  body.innerHTML = `
  <section class="wr-b1">
    <span class="skh-crest wr-b1-crest">${pkCrest(sc)}</span>
    <div class="wr-ey">${esc(sc.series || 'Scheme Kings')}</div>
    <h1 class="wr-b1-name">${esc(sc.name).replace(/(\d)-(?=\d)/g, '$1&#8209;')}</h1>
    <div class="wr-b1-tag">${esc(sc.tagline || '')}</div>
    <div class="wr-b1-era">${esc(ab.era || '')}</div>
    ${act('wr-b1-go')}
  </section>

  <section class="wr-b2">${PROOF.map((s) => `<div class="wr-pf"><b>${esc(String(s.value))}</b><i>${esc(s.label)}</i></div>`).join('')}</section>

  <section class="wr-b3">
    <div class="wr-ey">What this ${SIDEWORD(sc)} believes</div>
    ${pr.map((p, i) => `<button class="wr-b3-row" data-view="plan">
      <i>0${i + 1}</i><span><b>${esc(p.title)}</b><em>${esc(p.blurb || '')}</em></span><u>&rarr;</u></button>`).join('')}
  </section>

  <section class="wr-b4">
    <div class="wr-b4-count"><b>${wrPlaysOf(sc).length}</b> calls<s></s><b>${(sc.formations || []).length}</b> fronts<s></s><b>${taught.length}</b> in the install</div>
    ${bk ? `<button class="wr-b4-bk" data-view="plan"><i>In game</i><b>${esc(bk.title || bk.cap || '')}</b></button>` : ''}
    ${act('wr-b4-go')}
  </section>`;
}

/* ---------- THE PLAN · the whiteboard: what this defence is, in one look ---------- */
function wrPlan(sc, body) {
  const pr = (sc.about && sc.about.principles) || [];
  const fronts = sc.formations || [];
  body.innerHTML = `<div class="wr-wb">
    <div class="wr-wb-head"><span class="skh-crest">${pkCrest(sc)}</span><b>${esc(sc.name)} &middot; The Plan</b><i class="wr-mk">what this ${SIDEWORD(sc)} is, before a single call</i></div>
    <div class="wr-wb-body">
      <div class="wr-prin">${pr.map((p, i) => `<div class="wr-prin-i"><i class="wr-mk">${i + 1}.</i><b>${esc(p.title)}</b><span class="wr-mk">${esc(p.blurb || '')}</span>${p.detail ? `<p>${esc(p.detail)}</p>` : ''}</div>`).join('')}</div>
      <div class="wr-ey" style="color:#9E1B32;margin:26px 0 10px">The fronts</div>
      <div class="wr-fronts">${fronts.map((f, i) => `<div class="wr-front" style="--r:${(i % 2 ? 1 : -1) * 0.8}deg">
        <span class="wr-tape"></span>
        <div class="wr-front-art" data-form="${esc(f.name)}">${wrFrontTile(f.name)}</div>
        <div class="wr-front-cap"><b>${esc(f.name)}</b><span class="wr-mk">${esc(f.desc || '').slice(0, 90)}</span></div>
        <div class="wr-front-calls">${(f.tags || []).map((t) => { const p = sc.plays.find((x) => x.name === t); return p ? `<button class="wr-chip" data-play="${esc(p.id)}">${esc(t)}</button>` : ''; }).join('')}</div>
      </div>`).join('')}</div>
    </div>
  </div>`;
}

/* ---------- ALL PLAYS · one big card, the rest on the reel below ---------- */
function wrPlays(sc, body) {
  const all = wrPlaysOf(sc);
  const list = WR_PLAYS.filter === 'blitz' ? wrBlitz(sc) : WR_PLAYS.filter === 'cover' ? wrCover(sc) : all;
  if (!WR_PLAYS.pick || !list.some((p) => p.id === WR_PLAYS.pick)) WR_PLAYS.pick = list[0] && list[0].id;
  const p = sc.plays.find((x) => x.id === WR_PLAYS.pick) || list[0];
  if (!p) { body.innerHTML = '<div class="sk-empty">No plays.</div>'; return; }
  const keys = (p.reads || []).slice(0, 4);
  body.innerHTML = `<div class="wr-plays">
    <div class="wr-plays-top">
      <div class="wr-ey">Show</div>
      ${[['all', `All ${all.length}`], ['blitz', `Blitzes ${wrBlitz(sc).length}`], ['cover', `Coverages ${wrCover(sc).length}`]].map(([k, t]) => `<button class="wr-plate${WR_PLAYS.filter === k ? ' gold' : ''}" data-filter="${k}">${t}</button>`).join('')}
      <span class="wr-mk" style="margin-left:auto;color:#F5A623">tap a slide to put it on the screen</span>
    </div>
    <div class="wr-plays-main">
      ${wrTV(insArt(sc, p), `${esc(p.name)} <span>${esc(p.formation || '')} &middot; ${esc(p.subtype || p.type || '')}</span>`)}
      <div class="wr-wb wr-wb-side">
        <div class="wr-wb-body">
          <b class="wr-side-t">${esc(p.name)}</b>
          <span class="wr-mk" style="color:#9E1B32">${esc(p.formation || '')}${p.subtype ? ' · ' + esc(p.subtype) : ''}</span>
          ${p.whenToUse ? `<p class="wr-mk wr-side-p">${esc(p.whenToUse)}</p>` : ''}
          ${keys.length ? `<div class="wr-side-keys">${keys.map((r, i) => `<div><i>${i + 1}</i>${esc(r.label)}</div>`).join('')}</div>` : ''}
          <div class="wr-side-acts"><button class="skb gold" data-play="${esc(p.id)}">Open the breakdown</button>${p.taught ? `<button class="skb ghost" data-view="install" data-jump="${(() => { const pls = pillarsOf(sc); const i = pls.findIndex((pl) => taughtIn(sc, pl).includes(p)); return i < 0 ? '' : `${i}|${taughtIn(sc, pls[i]).indexOf(p) + 1}`; })()}">In the install</button>` : ''}</div>
        </div>
      </div>
    </div>
    <div class="wr-reel">${wrStrip(sc, list, p.id, (x) => `data-pick="${esc(x.id)}"`)}</div>
  </div>`;
  body.onclick = (e) => {
    const f = e.target.closest('[data-filter]'); if (f) { WR_PLAYS.filter = f.dataset.filter; WR_PLAYS.pick = null; wrPlays(sc, body); return; }
    const pk = e.target.closest('[data-pick]'); if (pk) { WR_PLAYS.pick = pk.dataset.pick; wrPlays(sc, body); return; }
  };
}

/* ---------- CALL SHEET · the playbook's own module, on the desk ---------- */
let WR_GP = null;
function wrSheet(sc, body) {
  body.innerHTML = `<div class="gp-room"><div class="ab2-card"><div class="card" id="wrGpHost"></div></div></div>`;
  const host = body.querySelector('#wrGpHost');
  const secs = (sc.gpSections || []).map((s) => Object.assign({}, s, { tag: s.tag || (s.kind === 'plays' ? () => true : undefined) }));
  WR_GP = mountGpSheet({
    plays: sc.plays, formations: sc.formations || [], personnel: sc.personnel, schemeKey: sc.schemeKey || sc.key,
    principles: (sc.about && sc.about.principles) || [], gp: sc.gp, gpSections: secs,
    isOpen: () => SEC === 'sheet' && schemeOpen() === sc,
    asset: (p) => (!p || /^art\//.test(p) || /^https?:/.test(p)) ? p : 'art/' + String(p).replace(/[\\/]/g, '__'),
    tagLabel: (t) => (typeof tagLabel === 'function' ? tagLabel(t) : t),
    toast: (m) => toast(m),
    openPlay: (id) => playDrawer(sc, id),
  }, host);
  /* the bar's dropdown can ask for a tab */
  if (WR_SHEET_TAB) { const b = host.querySelector(`.gp-knob[data-tab="${WR_SHEET_TAB}"]`); if (b) b.click(); WR_SHEET_TAB = null; }
}
let WR_SHEET_TAB = null;

/* ---------- the room router hooks ---------- */
/* the bar's rows carry an intent for the section they open */
function wrIntent(el) {
  const j = el.closest('[data-jump]'); if (j && j.dataset.jump) { const [a, b] = j.dataset.jump.split('|').map(Number); WR_JUMP = { ch: a, st: b }; }
  const pk = el.closest('[data-pick]'); if (pk) WR_PLAYS.pick = pk.dataset.pick;
  const tb = el.closest('[data-tab]'); if (tb) WR_SHEET_TAB = tb.dataset.tab;
}
