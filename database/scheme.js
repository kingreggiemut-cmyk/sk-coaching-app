/* =====================================================================
   THE SCHEME PAGE · scheme.js, rebuilt on THE STAGE, 2026-09-05.
   The record is DESIGN.md beside this file; the boards are the artifact
   "The Stage". Every screen is composed on one fixed 1600 x 900 stage that
   scales to the window, in five regions that never move: HEAD, STAGE, RAIL,
   FOOT, DOCK. Nothing is sized by what fits; everything is placed.

   One thin page per scheme (?key=alabama425). Sections by hash:
     #front      his hero: the name blurring in over the office
     #intro      three beliefs over three fronts, the way in on the rail
     #install/n  the presentation: title card, plays, the section's bucket
     #plays      the picked play open up top, the rows of three below
     #play/<id>  the same play block popped up over the rows
     #book       the library for this scheme's fronts
     #sheet      the playbook's own call sheet module, mounted as is
     #drives     the script rack; the builder opens as a takeover
     #board      the wall: cases, pins, the red string; the drawer for a play
     #personnel  the groups as positions and names; what the coach built
     #role/n     one group as a takeover: the job, the wants, the men
   Data: schemes.json, formations.json, cards/<family>__<set>.json, drawn by
   the shared engine in sk-cards.js. Progress lives in localStorage
   sk_plan_<key> (inked, installed, added), shared with the old room.
   ===================================================================== */
(() => {
'use strict';
const KEY = window.SK_SCHEME_KEY;
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slug = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
const SIDEWORD = (sc) => sc.side === 'D' ? 'defense' : 'offense';
const RDWORD = (sc) => sc.side === 'D' ? 'key' : 'read';
/* a defense lines up in fronts, an offense in formations */
const FRONTWORD = (sc) => sc.side === 'D' ? 'front' : 'formation';

let SC = null, FORMS = null, GEO = {}, SEC = 'front', AT = 0, DIR = 'fwd', RD = 0;
const ADJ = new Map();                 // play id -> Set of switched-on adjustment indices
const OPEN = new Set();                // which beliefs on the intro are open
let PLAYID = null, CAM = false, FILM = null, PICK = 0, PICKLIST = [], ROWY = null, INDEX = null, TSEL = 0, UNDER = 'plays', SPOT = null, COVVIEW = 'shot';
const FILT = { type: 'all', front: 'all' };
const app = $('#app');

/* ---------- THE GRID ---------- */
const X = (c) => 44 + (c - 1) * 128;                    // left edge of column c
const CW = (n) => n * 104 + (n - 1) * 24;               // width of n columns
const at = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;

/* ---------- THE PLAN: one object per scheme, the coaching app's shape,
   the same store the old room writes (sk_plan_<key>). Read once, kept,
   written whole. inked and added are this page's; drives, cases, board
   and notes are the rooms' (their code is the old room's, unchanged). ---------- */
const PLAN_KEY = 'sk_plan_' + KEY;
let PLAN = null;
const tcase = (s) => String(s || '').toLowerCase().replace(/(^|[\s-])([a-z])/g, (m, a, b) => a + b.toUpperCase());
function seedKeys(sc) { return ((sc.about && sc.about.principles) || []).slice(0, 3).map((p) => ({ t: tcase(p.title), s: p.blurb || '', edited: false })); }
function blankPlan(sc) {
  return { creed: { keys: seedKeys(sc), feed_player: '', feed_play: '', feed_touches: '', when_stuck: '', go_to_run: '', go_to_pass: '',
                    stop_calling: '', stop_after: '', rule: '', opener0: '', opener1: '', opener2: '' },
           installed: [], notes: {}, drives: [], cases: [], board: { cases: {}, pins: [] }, seeded: false, updated: null, inked: [], added: [] };
}
const sheetSecs = (sc) => (sc.sheet && sc.sheet.sections) || [];
/* the script rack's pockets: the moments a coordinator scripts. sec ties a
   pocket to a call-sheet section so the paperclip can hang on that block. */
/* THE POCKETS (his call 2026-09-14): four to start, every one renameable, and
   the coach makes as many more as he wants. The names of the four and the
   pockets he adds live in the plan (pocketNames, pockets), so they travel
   with the account. Backed Up and Shot Drive went; anyone who wants them
   makes them. */
const DRIVE_SLOTS = [
  { id: 'opening',   label: 'Opening Drive', sec: null,        c: '#2e7d43' },
  { id: 'redZone',   label: 'Red Zone',      sec: 'redZone',   c: '#c2554e' },
  { id: 'thirdLong', label: '3rd & Long',    sec: 'thirdLong', c: '#7a5cc2' },
  { id: 'twoMinute', label: 'Two-Minute',    sec: null,        c: '#1E54B7' },
];
const POCKET_COLORS = ['#b98a1c', '#8a6b4a', '#1f8a8a', '#a8407a', '#4b6b2e', '#5c5c8a'];
function driveSlots() { const p = PLAN || planRead(); const names = p.pocketNames || {};
  return DRIVE_SLOTS.map((s) => Object.assign({}, s, { label: names[s.id] || s.label })).concat((p.pockets || []).map((q) => ({ id: q.id, label: q.label, sec: null, c: q.c, own: true }))); }
const slotOf = (id) => driveSlots().find((s) => s.id === id);
/* no pocket is ever empty on first open: two scripts off the coach's own sheet */
function seedDrives(sc, plan) {
  const calls = (id) => ((sheetSecs(sc).find((s) => s.id === id) || {}).calls || []);
  const pairs = (sc.sheet && sc.sheet.pairs) || [];
  const node = (c) => ({ play: c.id, sit: c.formation || '', left: [], right: [] });
  const run = calls('run'), pass = calls('pass'), bz = calls('beatZone'), bombs = calls('bombs'), rz = calls('redZone');
  const seq = [run[0], pass[0], run[1] || bz[0], pass[1] || bombs[0]].filter(Boolean);
  if (seq.length) {
    const main = seq.map(node);
    const pr = pairs.find((p) => p.base && seq.some((c) => c.id === p.base.id));
    if (pr) { const n = main.find((x) => x.play === pr.base.id); if (n && pr.off) n.left.push(node(pr.off)); }
    else if (pairs[0] && pairs[0].base && pairs[0].off) { const n = node(pairs[0].base); n.left.push(node(pairs[0].off)); main.push(n); }
    if (bombs[0] && main.length > 1 && !main.some((x) => x.play === bombs[0].id)) main[main.length - 1].right.push(node(bombs[0]));
    plan.drives.push({ id: 'dr-seed-open', title: 'Opening Script', slot: 'opening', main, seeded: true, updated: null });
  }
  if (rz.length) {
    plan.drives.push({ id: 'dr-seed-rz', title: 'Red Zone Script', slot: 'redZone', main: rz.slice(0, 3).map(node), seeded: true, updated: null });
  }
}
function planRead() {
  if (PLAN) return PLAN;
  let saved = null; try { saved = JSON.parse(localStorage.getItem(PLAN_KEY) || 'null'); } catch (e) {}
  const b = blankPlan(SC), p = Object.assign(b, saved || {});
  p.creed = Object.assign(blankPlan(SC).creed, (saved && saved.creed) || {});
  if (!Array.isArray(p.creed.keys) || !p.creed.keys.length) p.creed.keys = seedKeys(SC);
  p.board = p.board || {}; p.board.cases = p.board.cases || {}; p.board.names = p.board.names || {}; p.board.pins = Array.isArray(p.board.pins) ? p.board.pins : [];
  p.drives = Array.isArray(p.drives) ? p.drives : []; p.cases = Array.isArray(p.cases) ? p.cases : [];
  p.notes = p.notes || {}; p.installed = Array.isArray(p.installed) ? p.installed : [];
  if (!p.seeded) { seedDrives(SC, p); p.seeded = true; }
  p.inked = Array.isArray(p.inked) ? p.inked : []; p.added = Array.isArray(p.added) ? p.added : [];
  PLAN = p; return p;
}
function planWrite(p) { PLAN = p || PLAN; if (!PLAN) return; PLAN.updated = new Date().toISOString(); try { localStorage.setItem(PLAN_KEY, JSON.stringify(PLAN)); } catch (e) {} skPlanPush(); }
/* THE ACCOUNT. The plan (inked, added, board, notes, the presenter step) is
   one row per member per scheme. Every write lands in the browser at once
   and on the account a moment later; at boot the newer of the two wins. The
   saved call sheet comes down when this browser has none. */
let SK_PLAN_T = null;
function skPlanPush() { if (typeof SKDB === 'undefined' || !SKDB.ok() || !SC) return; clearTimeout(SK_PLAN_T); SK_PLAN_T = setTimeout(() => SKDB.plans.save(SC.key, PLAN), 900); }
async function skPlanPull() {
  if (typeof SK_AUTH === 'undefined' || !SC) return false; await SK_AUTH.ready; if (!SKDB.ok()) return false;
  const r = await SKDB.plans.load(SC.key), local = planRead();
  const lt = Date.parse(local.updated || 0) || 0, rt = r ? (Date.parse(r.updated_at || 0) || 0) : 0;
  let changed = false;
  if (r && r.data && rt >= lt) { try { localStorage.setItem(PLAN_KEY, JSON.stringify(r.data)); } catch (e) {} PLAN = null; planRead(); changed = true; }
  else if (lt) SKDB.plans.save(SC.key, local);
  try { const gk = 'gp-sheet-' + (SC.schemeKey || SC.key); if (!localStorage.getItem(gk)) { const sheet = await SKDB.sheets.load(SC.schemeKey || SC.key); if (sheet) { localStorage.setItem(gk, JSON.stringify(sheet)); changed = true; } } } catch (e) {}
  return changed;
}
document.addEventListener('sk-auth', async (e) => { if (!SC || !(e.detail && e.detail.signedIn)) return; if (await skPlanPull()) render(); else if (GP && GP.reload) GP.reload(); });
const savePlan = () => planWrite();
function inkedSet() { const p = planRead(); return new Set(Array.isArray(p.inked) ? p.inked : []); }
function inkPlay(id, on) {
  const p = planRead(); const set = new Set(Array.isArray(p.inked) ? p.inked : []);
  on ? set.add(id) : set.delete(id); p.inked = [...set];
  p.installed = (SC.install.pillars || []).filter((pl) => pl.plays.every((x) => set.has(x))).map((pl) => pl.key);
  planWrite(p);
}
function addedSet() { const p = planRead(); return new Set(Array.isArray(p.added) ? p.added : []); }
function addPlay(sl, on) { const p = planRead(); const set = new Set(Array.isArray(p.added) ? p.added : []); on ? set.add(sl) : set.delete(sl); p.added = [...set]; planWrite(p); }
const byId = (id) => SC.plays.find((p) => p.id === id);
const taught = () => (SC.install.pillars || []).flatMap((pl) => pl.plays.map(byId).filter(Boolean));
const taughtOf = (p) => { for (const pl of SC.install.pillars || []) { const j = pl.plays.indexOf(p.id); if (j >= 0) return { pl, j, n: pl.plays.length }; } return null; };
const own = () => SC.plays.filter((p) => !p.gpOnly);

/* ---------- the engine, and what this page adds to it ---------- */
const DEF_TOKENS = {
  deep: (m) => !!m.zone && m.zk === 'deep',
  hook: (m) => !!m.zone && (m.zk === 'hook' || m.zk === 'curl'),
  flat: (m) => !!m.zone && (m.zk === 'flat' || m.zk === 'seam' || m.zk === 'curlflat'),
  zone: (m) => !!m.zone, rush: (m) => !!m.rush, man: (m) => m.man !== undefined,
};
function keyMen(g) { if (!g || g._keyed) return g;
  g.men.filter((m) => !m.b && !m.qb).sort((a, b) => a.x - b.x).forEach((m, i) => { m._k = 'e' + i; });
  /* a blocker who is not a lineman (a blocking tight end, a receiver kept in) is k0.. so an adjustment can hand him a route and a read can light him */
  g.men.filter((m) => m.b && !m.qb && (Math.abs(m.x) > 3.6 || m.y < -2.6)).sort((a, b) => a.x - b.x).forEach((m, i) => { m._k = 'k' + i; });
  const q = g.men.find((m) => m.qb); if (q) q._k = 'qb'; g._keyed = true; return g; }
function defPick(g, t) {
  if (DEF_TOKENS[t]) return g.men.filter(DEF_TOKENS[t]);
  if (t === 'mid') { const cov = g.men.filter((m) => m.zone || m.man !== undefined); return cov.length ? [cov.reduce((a, b) => Math.abs(b.x) < Math.abs(a.x) ? b : a)] : []; }
  if (t === 'wide') { const out = []; for (const s of [-1, 1]) { const side = g.men.filter((m) => (m.zone || m.man !== undefined) && Math.sign(m.x || s) === s); if (side.length) out.push(side.reduce((a, b) => Math.abs(b.x) > Math.abs(a.x) ? b : a)); } return out; }
  return [];
}
function anchors(g, tokens) {
  const out = []; if (!g || !tokens) return out; keyMen(g);
  for (const t of tokens) {
    if (Array.isArray(t)) { out.push([px(t[0]), py(t[1])]); continue; }
    if (g.def) { for (const m of defPick(g, t)) out.push([px(m.x), py(m.y)]); continue; }
    const m = t === 'mot' ? g.men.find((x) => x.mot) : g.men.find((x) => x._k === t); if (m) { const L = m.mpath && m.mpath.length ? m.mpath[m.mpath.length - 1] : [m.x, m.y]; out.push([px(L[0]), py(L[1])]); }
  }
  return out;
}
function adjustGeo(g, ops) {
  keyMen(g);
  const c = { men: g.men.map((m) => Object.assign({}, m, { pts: m.pts ? m.pts.map((p) => p.slice()) : m.pts, zone: m.zone ? m.zone.slice() : m.zone })), _keyed: true, _flip: false, def: g.def };
  for (const op of ops || []) { if (!op) continue;
    if (op.zone) { const kinds = [].concat(op.zone.kind); for (const m of c.men) { if (m.zone && kinds.some((k) => DEF_TOKENS[k] && DEF_TOKENS[k](m))) m.zone[1] += op.zone.dy; } continue; }
    if (op.align) { for (const m of defPick(c, op.align.who)) { const dy = op.align.y - m.y; m.y = op.align.y; if (m.zone) m.zone[1] -= dy; } continue; }
    if (op.flip) { c._flip = !c._flip; c.men.forEach((m) => { m.x = -m.x; if (m.pts) m.pts = m.pts.map(([dx, dy]) => [-dx, dy]); if (m.mpath) m.mpath = m.mpath.map(([x, y]) => [-x, y]); }); continue; }
    const m = c.men.find((x) => x._k === op.man); if (!m) continue;
    if (op.mirror) { m.x = -m.x; if (m.pts) m.pts = m.pts.map(([dx, dy]) => [-dx, dy]); }
    if (op.mirrorPts && m.pts) m.pts = m.pts.map(([dx, dy]) => [-dx, dy]);
    if (op.route) { m.pts = op.route.map((p) => p.slice()); if (c._flip) m.pts = m.pts.map(([dx, dy]) => [-dx, dy]); m._blk = false; delete m.b; delete m.bk; }
    if (op.block) { m.pts = null; m._blk = true; m.b = 1; }
    /* motion: the path he takes before the snap, absolute field spots; his route starts at its end */
    if (op.mpath) { m.mpath = op.mpath.map((p) => p.slice()); if (c._flip) m.mpath = m.mpath.map(([x, y]) => [-x, y]); m.mot = 1; }
    /* an option route forks from its own stem, so his stored path goes */
    if (op.opt) { m.opt = op.opt; if (op.stem) m.stem = op.stem; if (op.dd) m.dd = c._flip ? -op.dd : op.dd; m.pts = null; delete m.b; delete m.bk; m._blk = false; }
  }
  return c;
}
/* a play may carry a FIX: route ops applied every time it is drawn, where the game's art is not what he teaches */
const geoOf = (p) => { let g = GEO[p.slug]; if (!g) return null;
  if (p.fix && p.fix.length) g = adjustGeo(g, p.fix);
  const on = ADJ.get(p.id); if (!on || !on.size || !p.adjustOps) return g;
  return adjustGeo(g, [...on].sort().map((i) => p.adjustOps[i])); };
/* the drawing, with the rings for whatever the current key points at */
function cardHTML(p, rd) {
  const g = geoOf(p); if (!g) return '<div class="art"></div>';
  let svg = drawCard(g);
  const r = (p.reads || [])[rd - 1];
  const pts = r && r.at ? anchors(g, r.at) : [];
  if (pts.length) svg = svg.replace('</svg>', pts.map(([X0, Y0]) => `<circle class="ring" cx="${X0.toFixed(1)}" cy="${Y0.toFixed(1)}" r="17"/>`).join('') + '</svg>');
  const m = svg.match(/viewBox="([-\d. ]+)"/), b = m ? m[1].split(' ').map(Number) : [0, 0, W, H];
  let style = '';
  if (pts.length) { const cx = pts.reduce((s, q) => s + q[0], 0) / pts.length, cy = pts.reduce((s, q) => s + q[1], 0) / pts.length;
    style = `--ox:${(((cx - b[0]) / b[2]) * 100).toFixed(1)}%;--oy:${(((cy - b[1]) / b[3]) * 100).toFixed(1)}%`; }
  return `<div class="art${pts.length ? ' lit' : ''}" style="${style}">${svg}</div>`;
}
const plainArt = (p) => GEO[p.slug] ? `<div class="art">${drawCard(p.fix ? geoOf(p) : GEO[p.slug])}</div>` : p.formation ? tileHTML(p.formation) : '<div class="art"></div>';
/* a front tile cropped to the men */
function fitTile(svg) {
  const pts = [...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)"/g)].map((m) => [+m[1], +m[2]]);
  if (pts.length < 3) return svg;
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  let x0 = Math.min(...xs) - 44, x1 = Math.max(...xs) + 44, y0 = Math.min(...ys) - 34, y1 = Math.max(...ys) + 46;
  let bw = x1 - x0, bh = y1 - y0; const R = 620 / 340;
  if (bw / bh > R) { const nh = bw / R; y0 -= (nh - bh) / 2; bh = nh; } else { const nw = bh * R; x0 -= (nw - bw) / 2; bw = nw; }
  return svg.replace(/viewBox="[^"]*"/, `viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}"`);
}
/* a play out of a set that is not one of the scheme's formations (the Bears bubble out of Bunch TE) draws its tile from the play's own library set */
const tileHTML = (name) => { const fm = (SC.formations || []).find((x) => x.name === name) || (() => { const q = SC.plays.find((p) => p.formation === name && p.libFamily && p.libSet); return q ? { lib: [q.libFamily, q.libSet] } : null; })(); const key = fm && fm.lib ? slug(fm.lib[0]) + '__' + slug(fm.lib[1]) : slug(SC.family && SC.family.family ? SC.family.family : '4-2-5') + '__' + slug(String(name).replace(/^4-?2-?5\s*/i, '')); const f = FORMS && FORMS[key]; return f ? `<div class="art">${fitTile(drawFormation(f))}</div>` : '<div class="art"></div>'; };
/* the clip: its YouTube id, its thumbnail, and the frame it plays in */
const ytId = (u) => { const m = String(u || '').match(/(?:youtu\.be\/|[?&]v=|embed\/)([\w-]{6,})/); return m ? m[1] : ''; };

/* ---------- chrome: the office, the dock, the scale ---------- */
const ICON = {
  intro: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  install: '<path d="M4 18h5v-5H4zM9.5 13h5V8h-5zM15 8h5V3h-5z"/>',
  plays: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  sheet: '<rect x="5" y="4" width="14" height="17" rx="1"/><path d="M9 3h6v3H9zM8 11h8M8 15h6"/>',
  drives: '<path d="M4 20c6 0 4-12 10-12h6"/><path d="M16 4l4 4-4 4"/>',
  board: '<path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z"/><circle cx="12" cy="10" r="2"/>',
  personnel: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  coverages: '<path d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6z"/><path d="M8 12l3 3 5-6"/>',
};
const ico = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;
const AREAS_ALL = [['intro', 'Intro'], ['install', 'Install'], ['coverages', 'Coverages'], ['plays', 'All plays'], ['sheet', 'Call sheet'], ['drives', 'Drives'], ['board', 'Board'], ['personnel', 'Personnel']];
/* an offense's last door is History & Personnel (his call 2026-09-14); a defense keeps Personnel */
const HIST = () => !!(SC && SC.side !== 'D' && (SC.personnel && SC.personnel.players || []).some((p) => p.player));
/* a scheme of coverages (mode: 'coverages') has no install: the coverages are its section */
const COV = () => !!(SC && SC.mode === 'coverages');
const AREAS_OF = () => AREAS_ALL.filter(([k]) => COV() ? !['install', 'sheet', 'board'].includes(k) : k !== 'coverages').map(([k, a]) => [k, k === 'personnel' && HIST() ? 'History & Personnel' : a]);
let AREAS = AREAS_ALL;
const OLD = (sec) => `${SC.side === 'D' ? 'defense' : 'index'}.html?scheme=${encodeURIComponent(KEY)}&sec=${sec}`;
/* THE DOCK: the crest, the areas, the count. Chrome only; never a button. */
function dockHTML() {
  const ink = inkedSet(), all = taught(); AREAS = AREAS_OF();
  return `<nav class="dock"><div class="in">
    <div class="home"><a href="#front"><img src="logos/${esc(SC.logo)}.png" alt="">${esc(SC.name)}</a></div>
    <div class="areas">${AREAS.filter(([k]) => !(k === 'drives' && SC.side === 'D')).map(([k, a]) => `<a class="${SEC === k || ((SEC === 'play' || SEC === 'book') && k === 'plays') || (SEC === 'role' && k === 'personnel') || (SEC === 'coverage' && k === 'coverages') ? 'on' : ''}" href="#${k}">${ico(k)}<b>${a}</b></a>`).join('')}</div>
    <div class="meter">${COV() ? `<b>${SC.plays.length}</b><i>coverages</i>` : `<b>${all.filter((p) => ink.has(p.id)).length}</b><i>of ${all.length} inked</i>`}</div>
  </div></nav>`;
}
/* THE SCALE: the stage is 1600 wide and scales to the WIDTH of the window.
   Its height in stage units is whatever the window gives (900 on 16:9, less
   on a wider screen, more on a taller one); the vertical layout absorbs
   the difference: the head stays put, the dock is fixed to the bottom, the
   foot sits above it, and the frame takes what is between. */
let STAGE_H = 900;
/* the call sheet's view: the full paper, or the slim list (also what a phone shows) */
let SHEETFS = false; /* the sheet taking over the screen, either view */
let SHEETVIEW = 'full'; try { SHEETVIEW = localStorage.getItem('sk_sheetview') === 'slim' ? 'slim' : 'full'; } catch (e) {}
const stageH = () => Math.max(700, Math.round(innerHeight / (innerWidth / 1600)));
function scale() {
  /* a phone does not scale the stage, it reflows it (body.mob, scheme.css) */
  const MOB = innerWidth < 760; document.body.classList.toggle('mob', MOB);
  const s = MOB ? 1 : innerWidth / 1600;
  document.documentElement.style.setProperty('--s', s.toFixed(4));
  document.documentElement.style.setProperty('--s2', MOB ? '1' : Math.min(0.8 * innerWidth / 1600, 0.82 * innerHeight / 900).toFixed(4));
}
/* the builder keeps the drive being built through a resize: only the scale changes under it */
addEventListener('resize', () => { const h = stageH(); scale(); if (h !== STAGE_H && !(SEC === 'drives' && DRIVEB)) render(); });
/* THE LAYOUT for a stage of height H: the regions, in stage units */
function L(H = STAGE_H) {
  const footY = H - 160, camH = Math.round(H * 0.26);
  const fh = Math.min(548, footY - 16 - 176), fw = Math.round(fh * 1.8235);
  return { H, camH, head: { x: 44, y: 40, w: 1000, h: 110 }, frame: { x: 44, y: 176, w: fw, h: fh }, rail: { x: 1068, y: 176, w: 488, h: 0 }, foot: { x: 44, y: footY, w: 1000, h: 80 } };
}
let PX = false;
function parallax() {
  if (PX) return; PX = true;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let mx = 0, my = 0, raf = 0;
  const apply = () => { raf = 0; document.documentElement.style.setProperty('--bgx', mx.toFixed(3)); document.documentElement.style.setProperty('--bgy', my.toFixed(3)); };
  addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; if (!raf) raf = requestAnimationFrame(apply); }, { passive: true });
}
const camBox = (H) => CAM ? `<div class="cam" style="height:176px"><span>Face cam</span></div>` : '';
const stagewrap = (inner, h = STAGE_H, cls = '', extra = '') => `<div class="stagewrap" style="--h:${h}"><div class="stage${cls ? ' ' + cls : ''}" style="--h:${h}"><a class="dbl" href="${SC.side === 'D' ? 'defense' : 'index'}.html">&larr; The database</a><button class="dbl fsr" data-fullscreen>${(typeof skFsActive === 'function' ? skFsActive() : document.fullscreenElement) ? '&#x2716; Exit full screen' : '&#x26F6; Full screen'}</button><span class="dbl who" data-skwho hidden></span>${inner}${camBox(h)}</div>${extra}</div>`;

/* ---------- THE FRONT: the one screen off the regions ---------- */
function frontHTML() {
  const ab = SC.about || {}, H = STAGE_H;
  const words = SC.name.replace(/\s+(Offense|Defense|Defence)$/i, '').split(' ');
  const last = words.pop();
  const letters = (w, d0) => w.split('').map((ch, i) => `<span style="transition-delay:${d0 + i * 70}ms">${ch === '-' ? '&#8209;' : esc(ch)}</span>`).join('');
  const tagWords = (`${SIDEWORD(SC)[0].toUpperCase() + SIDEWORD(SC).slice(1)}. ` + (SC.tagline || '')).trim().split(' ');
  const nameY = Math.round(H * 0.28), size = Math.min(240, Math.round(H * 0.27));
  return stagewrap(`
    <div class="pennant" style="left:${X(1)}px;transform:rotate(-6deg)"></div><div class="pennant cream" style="left:${X(9)}px;transform:rotate(5deg)"></div>
    <div class="series"><img src="logos/${esc(SC.logo)}.png" alt=""><span class="k">${esc(SC.series || 'Scheme Kings')}</span></div>
    <div class="name" style="top:${nameY}px;--fs:${size}px">
      <div class="line">${letters(words.join(' '), 80)}</div>
      <div class="line slamline"><span class="slab"><span class="h">${letters(last, 80 + words.join(' ').length * 70)}</span></span></div>
      <div class="crest"><img src="logos/${esc(SC.logo)}.png" alt=""></div>
    </div>
    <div class="tag" style="top:${H - 210}px">${tagWords.map((w, i) => `<span style="transition-delay:${900 + i * 90}ms">${esc(w)}&nbsp;</span>`).join('')}<span class="mk" style="transition-delay:${900 + tagWords.length * 90}ms">${esc(ab.era || '')}</span></div>
    <a class="chev" href="#intro" aria-label="Start" style="top:${H - 136}px"></a>`, H, 'front');
}
function wireFront() {
  const f = $('.stage.front'); if (!f) return;
  void f.offsetWidth; setTimeout(() => f.classList.add('in'), 30);
  const c = $('.crest', f); if (!c) return;
  f.addEventListener('pointermove', (e) => { const r = c.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    const near = x > -1 && x < 2 && y > -1 && y < 2;
    c.style.setProperty('--ry', (near ? (x - .5) * 26 : 0).toFixed(2) + 'deg'); c.style.setProperty('--rx', (near ? (.5 - y) * 26 : 0).toFixed(2) + 'deg');
    c.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); c.style.setProperty('--my', (y * 100).toFixed(1) + '%'); c.style.setProperty('--sheen', near ? '.9' : '0'); }, { passive: true });
  f.addEventListener('pointerleave', () => { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); c.style.setProperty('--sheen', '0'); });
}

/* ---------- THE REGIONS ---------- */
/* the head: the eyebrow over the slab, the marker line beside it, and at
   its right end whatever moves you on: the arrows and the count, or the
   one gold button on a screen with no rail */
const arrowsHTML = (n, of) => `<span class="k">${n} of ${of}</span><button class="arr" data-flip="-1" aria-label="Previous">&lsaquo;</button><button class="arr" data-flip="1" aria-label="Next">&rsaquo;</button>`;
const headRight = (act, arrows) => `<div class="right">${act || ''}${arrows ? `<span class="flipper">${arrows}</span>` : ''}</div>`;
const slabSize = (t) => { const n = String(t).replace(/<[^>]+>|&[a-z]+;/g, 'x').length; return n <= 13 ? '' : n <= 19 ? ' style="font-size:56px"' : ' style="font-size:46px"'; };
const head = (k, title, mk, right) => `<div class="head" style="${at(44, 40, 1000, 110)}"><div><div class="k">${k}</div><div class="slab"><div class="h"${slabSize(title)}>${title}</div></div></div>${mk ? `<div class="mk">${mk}</div>` : ''}${right || ''}</div>`;
const frame = (inner, lay) => { const f = lay.frame; return `<div class="frame" style="${at(f.x, f.y, f.w, f.h)}"><div class="tv" data-card>${inner}</div></div>`; };
const rail = (acts, paper, lay) => `<div class="rail" style="${at(lay.rail.x, lay.rail.y, lay.rail.w, lay.H - 80 - lay.rail.y)}">${acts ? `<div class="acts">${acts}</div>` : ''}${paper ? `<div class="paper t2${paper.cls ? ' ' + paper.cls : ''}"><span class="tape" style="left:150px;top:-14px"></span><div class="in">${paper.html}</div></div>` : ''}</div>`;
const foot = (left, right, lay) => (left || right) ? `<div class="foot" style="${at(lay.foot.x, lay.foot.y, lay.foot.w, lay.foot.h)}">${left || '<span></span>'}${right || ''}</div>` : '';
function whose() { const ab = SC.about || {}; const c = (ab.coach || String(ab.era || '').split(/[·|]/)[0] || '').trim();
  const who = c ? c.split(' ').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ') : ''; return who ? `${who}${/s$/i.test(who) ? "'" : "'s"}` : 'The'; }
const shortName = () => SC.name.replace(/\s+(Offense|Defense|Defence|Spread-to-Run)$/i, '').replace(/^[A-Z][a-z]+\s+/, '');
const playChips = (p) => [p.formation ? `<span class="chip">${esc(p.formation)}</span>` : '', p.libType ? `<span class="chip">${esc(p.libType)}</span>` : '', inkedSet().has(p.id) ? '<span class="chip ink">On the sheet</span>' : p.added ? '<span class="chip">Added from the book</span>' : ''].filter(Boolean).join('');
/* animate the drawing in this screen's frame: the engine's own run, one tempo for everybody */
const animBtn = (p) => (p && p.slug && GEO[p.slug]) ? `<button class="btn anim" data-anim="1">&#9654; Animate play call</button>` : '';
function animateHere(btn) { const st = btn.closest('.stage') || document; const svg = st.querySelector('.frame .art svg, .tv .art svg, .frame svg'); if (!svg) return;
  if (skCardRunning()) { skStopCard(); btn.innerHTML = '&#9654; Animate play call'; return; }
  if (skRunCard(svg, () => { btn.innerHTML = '&#9654; Animate play call'; })) btn.innerHTML = '&#9632; Stop'; }
/* the breakdown: the real thumbnail with a play button, in the foot */
function watchHTML(p) {
  const id = ytId(p.videoUrl); if (!id) return '';
  return `<a class="watch" href="${esc(p.videoUrl)}" data-film="${esc(id)}"><span class="thumb"><img src="https://img.youtube.com/vi/${esc(id)}/mqdefault.jpg" alt="" onerror="this.onerror=null;this.src='${esc(p.heroShot || '')}'"><i></i></span><span><span class="k">Watch the full breakdown</span><div class="t">King Reggie breaks down ${esc(p.name)}</div></span></a>`;
}
/* the paper on a play: what the frame shows right now up top, then the
   keys and the adjustments side by side */
function noteHTML(p) {
  const reads = p.reads || [], adj = p.adjustments || [], ops = p.adjustOps || [], on = ADJ.get(p.id) || new Set();
  const still = SC.side === 'D';
  const top = p.whenToUse ? `<div class="h26">When to call it</div><div class="t">${esc(p.whenToUse)}</div>` : `<div class="h26">${esc(p.formation || p.libSet || 'From the book')}</div><div class="k team" style="margin-top:6px">Your addition from the book</div><div class="t s14" style="margin-top:6px">Write what you see: the reads, the adjustment, when you call it. It saves as you type.</div><textarea class="note ynote" data-ynote="${esc(p.id)}" maxlength="1200" placeholder="your notes on this call">${esc(noteOf(SC, p.id))}</textarea>`;
  const keys = reads.length ? `<div><div class="k team">The ${RDWORD(SC)}s</div><ul class="keylist">${reads.map((x, k) => `<li class="${k + 1 === RD ? 'on' : k + 1 < RD ? 'done' : ''}" data-rd="${k + 1}"><b>${k + 1}</b><span>${esc(x.label)}</span></li>`).join('')}</ul></div>` : '';
  const adjs = adj.length ? `<div><div class="k team">Adjustments</div><div style="margin-top:8px">${adj.map((a, k) => { const live = !still && ops[k]; return `<div class="adj${live ? ' live' : ''}${live && on.has(k) ? ' on' : ''}" ${live ? `data-adj="${k}"` : ''}><b>${k + 1}</b><span>${esc(a)}</span>${live ? `<span class="mk">${on.has(k) ? 'showing' : 'see it'}</span>` : ''}</div>`; }).join('')}</div></div>` : '';
  return `<div class="top">${top}</div>${keys || adjs ? `<div class="rule"></div><div class="two">${keys}${adjs}</div>` : ''}`;
}
/* THE PLAY BLOCK, three ways: on the install ('install'), open at the top
   of All Plays ('focus'), in the takeover ('modal') */
function playStage(p, mode, j, n, pl, H) {
  if (p.spots || p.macros) return covStage(p, mode, j, n, H);
  const lay = L(H), ink = inkedSet().has(p.id);
  const inkBtn = `<button class="btn sm${ink ? ' gh' : ''}" data-ink>${ink ? 'On the sheet &#10003;' : 'Add to call sheet'}</button>`;
  const eyebrow = mode === 'install' ? `${esc(pl.name)} &middot; ${esc(p.formation || p.libSet || '')}` : `${mode === 'modal' ? 'The play' : 'All plays'} &middot; ${esc(p.formation || p.libSet || '')}${p.libType ? ' &middot; ' + esc(p.libType) : ''}`;
  const film = FILM === p.id && ytId(p.videoUrl);
  const still = SC.side === 'D';
  const inner = film ? `<div class="film"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId(p.videoUrl))}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><button class="btn gh" data-film="off" style="position:absolute;right:12px;top:12px;height:40px;padding:0 14px;font-size:13px;z-index:3">Back to the drawing &times;</button>` : cardHTML(p, still ? 0 : RD);
  return `${head(eyebrow, esc(p.name), '', headRight(inkBtn, arrowsHTML(j + 1, n)))}${frame(inner, lay)}${rail('', { html: noteHTML(p), cls: 'note' }, lay)}${foot(`<div class="footl">${animBtn(p)}${watchHTML(p)}</div>`, mode === 'focus' ? `<a class="cue" href="#plays" data-rows>See all ${n} plays<i></i></a>` : '', lay)}`;
}

/* ---------- THE INTRO on all twelve columns ----------
   three beliefs of one fixed height (opening swaps the line for the points
   inside the same box), three fronts under them taking the height that is
   left, the plays from each front as chips under each, Start the install at
   the head's right end. */
function introStage() {
  const pr = (SC.about && SC.about.principles) || [], fr = SC.formations || [], ink = inkedSet(), lay = L();
  const points = (p) => String(p.detail || '').split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, 3);
  const by = Math.max(236, lay.camH + 24), bh = 156, fy = by + bh + 24, /* the papers hold their writing; an opened one grows over the fronts */ fh = Math.min(268, lay.H - 80 - 100 - fy), fw = Math.round(fh * 1.8235), hy = fy + fh + 8; /* two rows of chips fit under a front */
  const note = COV() && SC.about && SC.about.rulesNote ? `<div class="paper t3 rules" style="${at(X(5), fy, CW(8), fh)}"><span class="tape" style="left:300px;top:-14px"></span><div class="in"><div class="h26">The rules travel</div><div class="t">${esc(SC.about.rulesNote)}</div><div class="k team" style="margin-top:14px">Lines up in ${esc((fr[0] && fr[0].name) || '')} here &middot; ${SC.plays.length} coverages</div></div></div>` : '';
  const beliefs = pr.slice(0, 3).map((p, i) => `<button class="paper t${i + 1} belief${OPEN.has(i) ? ' open' : ''}" style="${at(X(1 + i * 4), by, 488, bh)}" data-belief="${i}"><span class="tape" style="left:40%;top:-14px"></span><span class="more"></span><div class="in"><div class="bd"><div class="h26"><b>0${i + 1}</b>${esc(p.title)}</div><div class="t">${esc(p.blurb || '')}</div><div class="hint">${points(p).map((s, k) => `<span><b>${k + 1}</b><i>${esc(s.split(' ').slice(0, 3).join(' '))}</i></span>`).join('')}</div><ol class="pts">${points(p).map((s, k) => `<li style="--d:${k * 140}ms"><b>${k + 1}</b><span>${esc(s)}</span></li>`).join('')}</ol></div></div></button>`).join('');
  /* FOUR FORMATIONS (the Bears) sit at three columns each, the frames and their chip rows narrower; three stay at four columns */
  const four = !COV() && fr.length >= 4, span = four ? 3 : 4, fw4 = four ? CW(3) : 488, fh4 = four ? Math.round(CW(3) / 1.8235) : fh;
  const fronts = (COV() ? fr.slice(0, 1) : fr.slice(0, four ? 4 : 3)).map((f, i) => { const x = X(1 + i * span), tags = f.tags || [], tags2 = COV() ? SC.plays.filter((q) => q.formation === f.name) : tags.map((t) => SC.plays.find((q) => q.name === t) || { name: t }), chips = tags2.map((p) => `<a class="chip${p.id && ink.has(p.id) ? ' ink' : ''}" href="${p.id ? (COV() ? '#coverage/' : '#play/') + esc(p.id) : '#plays'}">${esc(COV() && p.id ? covShort(p) : p.name)}</a>`).join('');
    return `<div class="front-c" style="${at(x, fy, four ? fw4 : fw, four ? fh4 : fh)}"><div class="tv"><div class="plate">${esc(f.name)}</div>${tileHTML(f.name)}</div></div>${tags2.length ? `<div class="hang row${tags2.length > 6 ? ' dense' : ''}" style="left:${x}px;top:${four ? fy + fh4 + 8 : hy}px;width:${COV() ? 1000 : fw4}px"><span class="tag">${tags2.length} ${tags2.length === 1 ? (COV() ? 'coverage' : 'play') : (COV() ? 'coverages' : 'plays')}</span>${chips}</div>` : ''}`; }).join('');
  return `${head('The intro', `${esc(whose())} ${esc(shortName())}`, esc(SC.tagline || ''), headRight(`<a class="btn sm" href="${COV() ? '#coverages' : '#install/0'}">${COV() ? 'Start the coverages' : 'Start the install'} <em>&rarr;</em></a>`))}${beliefs}${fronts}${note}`;
}

/* ---------- THE INSTALL: a deck of stages ---------- */
/* the calls of a section as frames across the frame region, centred */
function callsHTML(plays, chipsOf, lay) {
  /* more than seven calls (the Scheme Kings sections on the Madden offenses) go two rows deep so no frame gets tiny */
  const n = plays.length, f = lay.frame, rows = n > 7 ? 2 : 1, per = Math.ceil(n / rows), cw = Math.min((1000 - (per - 1) * 24) / per, f.h * 1.8235), ch = cw / 1.8235, gap = rows > 1 ? 64 : 0, y = f.y + (f.h - rows * ch - gap * (rows - 1)) / 2;
  return `<div class="calls${rows > 1 ? ' many' : ''}">${plays.map((p, j) => `<button class="fr" style="${at(44 + (j % per) * (cw + 24), y + Math.floor(j / per) * (ch + gap), cw, ch)}" data-go="${j + 1}"><div class="tv"><div class="plate">${esc(p.name)}</div>${plainArt(p)}</div>${chipsOf ? `<div class="hang" style="position:absolute;left:14px;top:100%;margin-top:8px"><div class="chips">${chipsOf(p)}</div></div>` : ''}</button>`).join('')}</div>`;
}
function installSlides() {
  const out = []; const pls = SC.install.pillars || [];
  /* THE FORMATIONS FIRST (his call 2026-09-14): on an offense the install opens
     with the looks it lines up in, each drawn with its write-up, before the
     first section. The next stop is section one. */
  const fr = (SC.formations || []).filter((f) => f.desc);
  if (SC.side !== 'D' && fr.length) out.push({ t: 'forms', i: -1, html: (k, tot) => { const lay = L(), n = Math.min(fr.length, 4), span = n > 3 ? 3 : 4, fw = n > 3 ? CW(3) : 488, fh = Math.min(Math.round(fw / 1.8235), lay.H - 80 - 176 - 16 - 24 - 236), py = 176 + fh + 24, ph = lay.H - 80 - py - 16;
    const first = pls[0];
    return `${head('The install', 'The formations', `${n} look${n !== 1 ? 's' : ''}, the whole offense`, headRight(first ? `<button class="btn sm" data-go="1">Start with ${esc(first.name)} <em>&rarr;</em></button>` : '', arrowsHTML(k + 1, tot)))}
      ${fr.slice(0, n).map((f, i) => { const x = X(1 + i * span), calls = SC.plays.filter((p) => p.formation === f.name).length;
        return `<div class="front-c" style="${at(x, 176, fw, fh)}"><div class="tv"><div class="plate">${esc(f.name)}</div>${tileHTML(f.name)}</div></div>
          <div class="paper t${(i % 3) + 1} formpaper" style="${at(x, py, fw, ph)}"><span class="tape" style="left:40%;top:-14px"></span><div class="in"><div class="h26">${esc(f.name)}</div><div class="t">${esc(f.desc || '')}</div></div></div>`; }).join('')}`; } });
  pls.forEach((pl, i) => {
    const plays = pl.plays.map(byId).filter(Boolean);
    /* the title card is a chapter card: the section is introduced with the
       scheme, never with the next call's drawing. The frame holds the
       number, the crest and the plate; the wide paper beside it carries the
       write-up and the checks on the left, the calls and the fronts on the
       right; the section's film sits in the foot when the section has one */
    out.push({ t: 'title', pl, i, html: (k, tot) => { const lay = L(), fh = lay.frame.h, ink = inkedSet();
      const game = (pl.game && Array.isArray(pl.game.checks)) ? pl.game.checks.filter((x) => typeof x === 'string') : [];
      const fronts = [...new Set(plays.map((q) => q.formation).filter(Boolean))], done = plays.filter((q) => ink.has(q.id)).length;
      const film = FILM === 'title' && ytId(pl.video);
      const chap = film ? `<div class="film"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(ytId(pl.video))}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><button class="btn gh" data-film="off" style="position:absolute;right:12px;top:12px;height:40px;padding:0 14px;font-size:13px;z-index:3">Back to the card &times;</button>`
        : `<span class="chap">0${i + 1}</span><span class="chapc"><img src="logos/${esc(SC.logo)}.png" alt=""></span><div class="chapl"><span class="plate2">${esc(pl.name)}</span><span class="k">${plays.length} call${plays.length !== 1 ? 's' : ''} &middot; ${fronts.length} ${FRONTWORD(SC)}${fronts.length !== 1 ? 's' : ''} &middot; ${done} inked</span></div>`;
      const watch = ytId(pl.video) ? `<a class="watch" href="${esc(pl.video)}" data-film="title"><span class="thumb"><img src="https://img.youtube.com/vi/${esc(ytId(pl.video))}/mqdefault.jpg" alt=""><i></i></span><span><span class="k">Watch the ${esc(pl.name.replace(/^The /, ''))} install</span><div class="t">King Reggie walks the section</div></span></a>` : '';
      return `${head(`Section ${i + 1} of ${pls.length}`, esc(pl.name), esc(pl.eyebrow || ''), headRight(`<button class="btn sm" data-go="1">Start with ${esc(plays[0] ? plays[0].name : 'the first call')} <em>&rarr;</em></button>`, arrowsHTML(k + 1, tot)))}
        <div class="frame" style="${at(44, 176, 488, fh)}"><div class="tv chapter">${chap}</div></div>
        <div class="paper t3 chapter${plays.length > 7 ? ' many' : plays.length > 3 ? ' four' : ''}" style="${at(556, 176, 1000, fh)}"><span class="tape" style="left:300px;top:-14px"></span><div class="in">
          <div><div class="h26">${esc(pl.eyebrow || 'This section')}</div><div class="t">${esc(pl.line || '')}</div>${game.length ? `<div class="rule"></div><div class="k team">You know it is in when</div><div class="checks">${game.map((x, kk) => `<div class="adj"><b>${kk + 1}</b><span>${esc(x)}</span></div>`).join('')}</div>` : ''}</div>
          <div><div class="k team">The calls in this section</div>${plays.map((q, kk) => `<div class="callrow"><b>${kk + 1}</b><div><div class="h26">${esc(q.name)}</div><div class="k team" style="margin-top:6px">${esc(q.formation || '')}${q.libType ? ' &middot; ' + esc(q.libType) : ''}</div></div><a class="go" href="#install/${k + 1 + kk}" aria-label="Open ${esc(q.name)}">&rsaquo;</a></div>`).join('')}
            ${fronts.length ? `<div class="rule"></div><div class="k team">Lines up in</div><div class="ftiles">${fronts.map((f) => `<div class="ftile">${tileHTML(f)}<span class="cap">${esc(f)}</span></div>`).join('')}</div>` : ''}</div>
        </div></div>
        ${foot(watch, '', lay)}`; } });
    plays.forEach((p, j) => out.push({ t: 'play', pl, i, p, j, n: plays.length, html: (k, tot) => playStage(p, 'install', k, tot, pl) }));
    out.push({ t: 'bucket', pl, i, html: (k, tot) => { const lay = L(), ink = inkedSet(), next = pls[i + 1], done = plays.filter((p) => ink.has(p.id)).length;
      return `${head('On the sheet', `${esc(pl.name.replace(/^The /, ''))} calls`, done === plays.length ? `${esc(pl.name)} is installed` : `${done} of ${plays.length} inked`, headRight(next ? `<button class="btn sm" data-next="1">Next section: ${esc(next.name)} <em>&rarr;</em></button>` : `<a class="btn sm" href="#sheet">Open the call sheet <em>&rarr;</em></a>`, arrowsHTML(k + 1, tot)))}${callsHTML(plays, (p) => ink.has(p.id) ? '<span class="chip ink">On the sheet</span>' : '<span class="chip">Not yet</span>', lay)}${rail('', { html: `<div class="k team">${esc(pl.name.replace(/^The /, ''))} calls &middot; ${done} of ${plays.length}</div>${plays.map((p) => `<div class="slot${ink.has(p.id) ? ' on' : ''}"><div class="h26">${ink.has(p.id) ? esc(p.name) : '&nbsp;'}</div></div>`).join('')}<div class="rule"></div><div class="t" style="font-size:15px">${done === plays.length ? 'Every call landed in the bucket it belongs to.' : 'The rest are waiting on you. Go back with the arrows.'}</div>`, cls: plays.length > 7 ? 'many' : '' }, lay)}`; } });
  });
  return out;
}

/* the calls you added from the book, as plays: drawn from the library's
   geometry, named from the index, placed under the front whose set they
   came from */
function addedPlays() {
  const fronts = (SC.formations || []).map((f) => ({ name: f.name, key: '-' + slug(f.lib ? f.lib[0] : (SC.family && SC.family.family) || '4-2-5') + '-' + slug(f.lib ? f.lib[1] : String(f.name).replace(/^4-?2-?5\s*/i, '')) }));
  return [...addedSet()].map((sl) => { const g = GEO[sl]; if (!g) return null; const fr = fronts.find((f) => sl.endsWith(f.key));
    return { id: 'lib:' + sl, slug: sl, name: (INDEX && INDEX.bySlug && INDEX.bySlug[sl]) || sl, formation: fr ? fr.name : '', type: 'Star Play', libType: g.def ? (g.men.some((x) => x.rush) && !g.men.some((x) => x.zone) ? 'Blitz' : 'Zone') : '', tags: [], added: true, reads: [], adjustments: [] }; }).filter(Boolean);
}
/* ---------- ALL PLAYS: the picked play up top, the rows below ---------- */
const fronts = () => [...new Set(SC.plays.map((p) => p.formation).filter(Boolean))];
/* the type tabs: a defense splits blitzes from coverages; an offense splits run from pass by the coach's own type (an RPO is run), then the library's */
const isRunPlay = (p) => p.type === 'Run Game' || (p.type !== 'Pass Game' && /run|rpo/i.test(p.libType || ''));
const typeOk = (p, k) => k === 'all' || (k === 'blitz' ? p.libType === 'Blitz' : k === 'cover' ? p.libType !== 'Blitz' : k === 'run' ? isRunPlay(p) : k === 'pass' ? !isRunPlay(p) : true);
function listOf() {
  const tp = FILT.type, fr = FILT.front;
  const added = addedPlays();
  const all = own().concat(added);
  return { all, list: all.filter((p) => typeOk(p, tp) && (fr === 'all' || p.formation === fr)) };
}
/* the rows: chips at y0, three across from y0 + 60, each four columns */
function rowsHTML(list, y0, chips) {
  const cards = list.map((p, k) => `<a class="card${k === PICK && SEC !== 'book' ? ' pick' : ''}${p.added ? ' added' : ''}" style="left:${X(1 + 4 * (k % 3))}px;top:${y0 + 60 + Math.floor(k / 3) * 364}px" href="#play/${esc(p.id)}" data-row="${k}"><div class="tv"><div class="plate">${esc(p.name)}</div>${plainArt(p)}</div><div class="hang"><div class="chips">${playChips(p)}</div></div></a>`).join('');
  return { html: `<div class="rows"><div class="filt" style="top:${y0}px">${chips}</div>${cards}</div>`, h: y0 + 60 + Math.ceil(list.length / 3) * 364 + 40 };
}
function playsPage() {
  const { all, list } = listOf(); PICKLIST = list; if (PICK >= list.length) PICK = 0;
  const tabs = SC.side === 'D' ? [['all', 'Everything'], ['cover', 'Coverages'], ['blitz', 'Blitzes']] : [['all', 'Everything'], ['run', 'Run'], ['pass', 'Pass']];
  const count = (k) => all.filter((p) => typeOk(p, k)).length;
  const chips = `${tabs.map(([k, t]) => `<button class="chip${FILT.type === k ? ' on' : ''}" data-type="${k}">${t} &middot; ${count(k)}</button>`).join('')}<span class="k">${FRONTWORD(SC) === 'front' ? 'Front' : 'Formation'}</span><button class="chip${FILT.front === 'all' ? ' on' : ''}" data-front="all">All</button>${fronts().map((x) => `<button class="chip${FILT.front === x ? ' on' : ''}" data-front="${esc(x)}">${esc(x.replace(/^425 /, ''))} &middot; ${all.filter((p) => p.formation === x).length}</button>`).join('')}<a class="chip door" href="#book">+ Add from the ${esc((SC.about && SC.about.playbook && (SC.about.playbook.cap || SC.about.playbook.title)) || 'book')}</a>`;
  const p = list[PICK];
  const top = p ? playStage(p, 'focus', PICK, list.length) : head('All plays', 'No calls here', `${all.length} in all`);
  const rows = rowsHTML(list, STAGE_H + 40, chips);
  return { html: top + rows.html, h: rows.h + 80 };
}
function bookStage() {
  const bk = (SC.about && SC.about.playbook && (SC.about.playbook.cap || SC.about.playbook.title)) || 'the book';
  if (!INDEX) return head('Add from the book', esc(nice(bk, true)), 'opening the library');
  const fronts = (SC.formations || []).map((f) => ({ name: f.name, fam: f.lib ? f.lib[0] : (SC.family && SC.family.family) || '4-2-5', set: f.lib ? f.lib[1] : String(f.name).replace(/^4-?2-?5\s*/i, '') }));
  if (!fronts.length) return head('Add from the book', esc(nice(bk, true)), 'no fronts on this scheme');
  const on = fronts.find((f) => f.name === FILT.set) || fronts[0];
  const bi = SC.libBook && INDEX.bookKeys ? INDEX.bookKeys.indexOf(SC.libBook) : -1;
  const inBook = (p) => bi < 0 || (p.b || []).includes(bi);
  const rowsOf = (f) => INDEX.plays.filter((p) => p.side === SC.side && p.family === f.fam && p.set === f.set && inBook(p)).map((p) => ({ p, sl: slug(p.name) + '-' + slug(f.fam) + '-' + slug(f.set) }));
  const rows = rowsOf(on), mine = new Set(SC.plays.map((p) => p.slug)), added = addedSet();
  const tabs = fronts.map((f) => `<button class="chip${f === on ? ' on' : ''}" data-set="${esc(f.name)}">${esc(f.name)} &middot; ${rowsOf(f).length}</button>`).join('');
  const cards = rows.map(({ p, sl }) => { const has = added.has(sl), is = mine.has(sl), g = GEO[sl];
    return `<div class="card${is ? ' is' : has ? ' added' : ''}"><div class="tv"><div class="plate">${esc(p.name)}</div><div class="art">${g ? drawCard(g) : ''}</div></div><div class="hang"><div class="chips"><span class="chip">${esc(p.type)}</span>${is ? '<span class="chip ink">In the scheme</span>' : `<button class="chip add${has ? ' ink' : ''}" data-add="${esc(sl)}">${has ? 'Added &#10003;' : '+ Add it'}</button>`}</div></div></div>`; }).join('');
  return `${head(`Add from the ${esc(nice(bk, true))}`, esc(on.name), `${rows.length} in the library out of this ${FRONTWORD(SC)} &middot; ${[...added].length} added to your plays`)}
    <div class="filt" style="${at(44, 176, 1512, 44)}"><span class="k">${FRONTWORD(SC) === 'front' ? 'Front' : 'Formation'}</span>${tabs}<span class="k" style="margin-left:auto">tap a call to add it, tap again to take it back</span></div>
    <div class="bookgrid">${cards || '<div class="t" style="grid-column:1/-1">Nothing in the book out of this ' + FRONTWORD(SC) + '.</div>'}</div>`;
}
function openBook() { closeModal(); app.insertAdjacentHTML('beforeend', `<div class="modal book"><div class="scrim" data-close></div><div class="box"><div class="stage" style="--h:900">${bookStage()}</div><a class="x" href="#plays" aria-label="Close">&times;</a></div></div>`);
  const w = $('.stagewrap'); if (w) w.classList.add('blurred'); document.body.classList.add('lock'); if (!INDEX) loadIndex(); return true; }
function bookRepaint() { const st = $('.modal.book .stage'); if (st) st.innerHTML = bookStage(); }
async function loadIndex() { try { const I = await (await fetch('play-index.json')).json(); I.bySlug = {}; for (const p of I.plays) I.bySlug[slug(p.name) + '-' + slug(p.family) + '-' + slug(p.set)] = p.name; INDEX = I; } catch (e) { INDEX = { plays: [], bySlug: {} }; } if (SEC === 'book' || SEC === 'plays' || SEC === 'play') render(); }

/* ---------- the call sheet: the playbook's own module, on its desk ---------- */
let GP = null;
function sheetMount() {
  const host = $('#gpHost'); if (!host || typeof mountGpSheet !== 'function') return;
  /* a section whose picker was a function in the playbook travels as the ids it let through (s.ids) */
  const secs = (SC.gpSections || []).map((s) => Object.assign({}, s, { tag: s.tag || (s.ids ? (p) => s.ids.includes(p.id) : s.kind === 'plays' ? () => true : undefined) }));
  GP = mountGpSheet({
    /* an offense's sheet picks its X-Factor from real players (gpPersonnel), while the personnel section groups them by position */
    plays: [...SC.plays, ...addedPlays()], formations: SC.formations || [], personnel: SC.gpPersonnel || SC.personnel, schemeKey: SC.schemeKey || SC.key,
    logo: (SC.about && SC.about.logo) || `logos/${SC.logo}.png`,
    auth: (typeof SK_AUTH !== 'undefined') ? SK_AUTH : null, requireLogin: (typeof skRequireLogin === 'function') ? skRequireLogin : (async () => false),
    principles: (SC.about && SC.about.principles) || [], gp: SC.gp, gpSections: secs,
    isOpen: () => SEC === 'sheet',
    asset: (p) => (!p || /^art\//.test(p) || /^https?:/.test(p)) ? p : 'art/' + String(p).replace(/[\\/]/g, '__'),
    tagLabel: (t) => t, toast: (m) => toast(m),
    openPlay: (id) => { if (COV()) { location.hash = `#coverage/${id}`; return; } const s = installSlides().findIndex((x) => x.t === 'play' && x.p.id === id); if (s >= 0) location.hash = `#install/${s}`; },
  }, host);
}
function toast(m) { let t = $('.sk-toast'); if (!t) { t = document.createElement('div'); t.className = 'sk-toast'; document.body.appendChild(t); }
  t.textContent = m; t.style.opacity = '1'; clearTimeout(t._t); t._t = setTimeout(() => { t.style.opacity = '0'; }, 1800); }

/* ---------- the play on the screen right now, whichever way you got to it ---------- */
function curPlay() {
  if (SEC === 'install') { const s = installSlides()[AT]; return s && s.t === 'play' ? { p: s.p, pl: s.pl, j: s.j, n: s.n } : null; }
  if (SEC === 'plays') { const p = PICKLIST[PICK]; if (!p) return null; const t = taughtOf(p); return { p, pl: t ? t.pl : null, list: PICKLIST, j: PICK, n: PICKLIST.length }; }
  if (SEC === 'coverage') { const list = SC.plays, j = list.findIndex((x) => x.id === PLAYID); if (j < 0) return null; return { p: list[j], pl: null, list, j, n: list.length }; }
  if (SEC === 'play') { const id = PLAYID; const p = SC.plays.find((x) => x.id === id) || (id && id.startsWith('lib:') && GEO[id.slice(4)] ? { id, slug: id.slice(4), name: (INDEX && INDEX.bySlug && INDEX.bySlug[id.slice(4)]) || id.slice(4), reads: [], adjustments: [], added: true } : null); if (!p) return null;
    let list = PICKLIST.length ? PICKLIST : own(); let j = list.findIndex((x) => x.id === p.id); if (j < 0) { list = [p]; j = 0; }
    const t = taughtOf(p); return { p, pl: t ? t.pl : null, list, j, n: list.length }; }
  return null;
}

/* ---------- THE TAKEOVER: a play over the rows, 80 percent of the window,
   the page behind goes soft and stays exactly where it was scrolled ---------- */
function modalHTML(c) { return `<div class="modal"><div class="scrim" data-close></div><div class="box"><div class="stage" style="--h:900">${playStage(c.p, 'modal', c.j, c.n, null, 900)}</div><a class="x" href="#${UNDER}" aria-label="Close">&times;</a></div></div>`; }
function openModal() { const c = curPlay(); if (!c) return false; closeModal(); app.insertAdjacentHTML('beforeend', modalHTML(c)); const w = $('.stagewrap'); if (w) w.classList.add('blurred'); document.body.classList.add('lock'); return true; }
function closeModal() { const m = $('.modal'); if (m) m.remove(); const w = $('.stagewrap'); if (w) w.classList.remove('blurred'); document.body.classList.remove('lock'); }

/* =====================================================================
   THE ROOMS: the call sheet, drives and the builder, the board, personnel.
   The code of each is the old room's (schemes.js), kept as it works; only
   the shell is the stage's. Three of them measure the pointer (the sheet
   module, the wall, the builder), so they sit in LIVE regions: siblings of
   the scaled stage, placed on the same twelve columns in screen pixels
   (stage units x --s), never inside the transform.
   ===================================================================== */
const live = (x, y, w, h, cls, inner) => `<div class="live ${cls}" style="left:calc(${x}px*var(--s));top:calc(${y}px*var(--s));width:calc(${w}px*var(--s));height:calc(${h}px*var(--s))">${inner}</div>`;
const playOf = (sc, id) => sc.plays.find((p) => p.id === id);
const isStar = (p) => !!p && (p.type === 'Star Play' || p.exclusive);
const noteOf = (sc, id) => String(planRead().notes[id] || '').trim();
/* ONE function gives the art for a play: the library's drawn card */
function artHTML(sc, p, cls) {
  if (!p) return `<span class="${cls} art-none"></span>`;
  const g = p.slug && GEO[p.slug];
  return g ? `<span class="${cls} art-svg">${drawCard(g)}</span>` : `<span class="${cls} art-none"></span>`;
}
const teamLogo = (name) => { const n = slug(name); if (!n) return '';
  return (slug((SC.about && SC.about.team) || '').includes(n) || slug(SC.name).includes(n) || n === slug(SC.bookKey)) ? `logos/${SC.logo}.png` : ''; };
/* the data is written in capitals; the stage sets it in its own case */
const ACR = ['DL', 'LB', 'DT', 'DB', 'OLB', 'ILB', 'MLB', 'QB', 'RB', 'WR', 'TE', 'CB', 'S', 'DE', 'NT', 'SEC', 'TFL', 'AA', 'II', 'III', 'IV', 'DPOY', 'TD', 'INT', 'NFL', 'CFB', 'X', 'B', 'A', 'G', 'C', 'J', 'CJ'];
const wordCase = (w, title) => { const u = w.replace(/[.,]/g, ''); const up = u.toUpperCase();
  if (ACR.includes(up)) return w.toUpperCase();
  if (/S$/.test(up) && ACR.includes(up.slice(0, -1)) && up.length > 2) return w.slice(0, -1).toUpperCase() + 's';
  const lo = w.toLowerCase(); return title ? lo.replace(/(^|[.\-'])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : lo; };
const nice = (s, title) => String(s || '').split(/\s+/).map((w, i) => wordCase(w, title || i === 0)).join(' ');

/* ---------- THE CALL SHEET: the playbook's own module in a live region ---------- */
/* THE PRESENTER KEY: P on the sheet lays the coach's sheet down one install
   section at a time. The module's own store is written (the same store Full
   and Slim draw from) and the module reloads. A cleared sheet starts over. */
function presentStep() {
  const pls = (SC.install && SC.install.pillars) || [], R = (SC.gp && SC.gp.recommended) || {}; if (!pls.length || !R) return;
  const key = 'gp-sheet-' + (SC.schemeKey || SC.key); let sh = null; try { sh = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) {}
  const secs = (SC.gpSections || []).filter((x) => x.kind === 'plays');
  const empty = !sh || secs.every((x) => !(Array.isArray(sh[x.id]) && sh[x.id].length));
  const plan = planRead(); let step = empty ? 0 : Math.min(plan.pstep || 0, pls.length);
  if (step >= pls.length) { toast('Every section is on the sheet'); return; }
  const upTo = new Set(pls.slice(0, step + 1).flatMap((pl) => pl.plays));
  if (!sh) sh = { key: null, xFactor: null, formations: (R.formations || []).slice(), constraints: [], stickyTags: {} };
  for (const x of secs) { const want = (R[x.id] || []).filter((id) => upTo.has(id)); const have = Array.isArray(sh[x.id]) ? sh[x.id] : [];
    sh[x.id] = [...have, ...want.filter((id) => !have.includes(id))]; }
  if (R.xFactor && R.xFactor.play && upTo.has(R.xFactor.play)) sh.xFactor = Object.assign({}, R.xFactor);
  const co = (SC.gp && SC.gp.constraintOptions) || [];
  sh.constraints = (R.constraints || []).filter((i) => { const c = co[i]; return c && upTo.has(c.base) && upTo.has(c.off); });
  try { localStorage.setItem(key, JSON.stringify(sh)); } catch (e) {}
  if (GP && GP.reload) GP.reload();
  pls[step].plays.forEach((id) => inkPlay(id, true));
  plan.pstep = step + 1; savePlan();
  const d = $('.dock'); if (d) d.outerHTML = dockHTML();
  const tr = $('.tabrow .k'); if (tr) { const ink = inkedSet(), all = taught(); tr.textContent = `Your sheet · ${all.filter((p) => ink.has(p.id)).length} of ${all.length} inked`; }
  toast(`${pls[step].name}: ${pls[step].plays.length} call${pls[step].plays.length === 1 ? '' : 's'} on the sheet${step + 1 < pls.length ? ' · P for ' + pls[step + 1].name : ''}`);
}
/* the takeover: the live region goes fixed over a blurred room, the dock stays */
function sheetFS(on) { SHEETFS = !!on; document.body.classList.toggle('sheetfs', SHEETFS); const r = $('.live.gp-room'); if (r) r.classList.toggle('fs', SHEETFS);
  /* the slim column stays one column: when it runs longer than the screen it zooms down a little, never below 70% */
  const bd = r && r.querySelector('.gp-body'), sh = r && r.querySelector('.gp-sheet'); if (bd) bd.style.zoom = '';
  if (SHEETFS && SHEETVIEW === 'slim' && bd && sh) requestAnimationFrame(() => { const z = Math.max(.7, Math.min(1, (sh.clientHeight - 8) / bd.scrollHeight)); bd.style.zoom = z < 1 ? z.toFixed(3) : ''; });
  dispatchEvent(new Event('resize')); }
function sheetStage() {
  const H = STAGE_H, ink = inkedSet(), all = taught();
  /* the module owns the paper, so the head is one tab row beside the database tab (the name on a small slab, the count) and the region takes everything from 56 down */
  return { html: `<div class="tabrow" style="${at(230, 8, 800, 32)}"><span class="slab"><span class="h">Call sheet</span></span><span class="k">Your sheet &middot; ${all.filter((p) => ink.has(p.id)).length} of ${all.length} inked</span><span class="sw2" title="The full paper, or the slim list"><button class="${SHEETVIEW === 'full' ? 'on' : ''}" data-sheetview="full">Full</button><button class="${SHEETVIEW === 'slim' ? 'on' : ''}" data-sheetview="slim">Slim</button></span><button class="fsbtn" data-sheetfs="on" title="Take the sheet over the whole screen">&#x26F6; View full screen</button></div>`,
    live: live(44, 56, 1512, H - 80 - 56 - 4, 'gp-room' + (SHEETVIEW === 'slim' ? ' slim' : ''), `<div class="ab2-card"><div class="card" id="gpHost"></div></div><button class="x fsx" data-sheetfs="off" aria-label="Close">&times;</button>`) };
}

/* ---------- DRIVES: the script rack, six pockets across the twelve columns ---------- */
function scriptRows(sc, d) {
  const nm = (id) => { const p = playOf(sc, id); return p ? p.name : id; };
  const main = Array.isArray(d.main) ? d.main : [];
  return main.map((n, i) => {
    const br = (side) => (n[side] || []).map((x) => `<span class="script-br ${side === 'left' ? 'ctr' : 'fb'}">${side === 'left' ? '&#9664; ' : ''}${esc(nm(x.play))}${side === 'right' ? ' &#9654;' : ''}</span>`).join('');
    return `<div class="script-row"><span class="script-num">${i + 1}</span><span class="script-name">${esc(nm(n.play))}</span>
      <span class="script-sit">${esc(n.sit || '')}</span>${br('left')}${br('right')}</div>`; }).join('')
    || `<div class="script-row"><span class="script-empty">Empty script</span></div>`;
}
const secLabel = (id) => { const s = (SC.gpSections || []).find((x) => x.id === id) || sheetSecs(SC).find((x) => x.id === id); return s ? s.label : ''; };
/* THE DRIVE BUILDER (the Madden offenses, 2026-09-13): where the page loads
   drive-builder.js (the Oregon original, lifted whole) and the scheme carries
   its drive data, Drives IS the builder: the stage keeps its head, the builder
   fills the box between the head and the dock with its call sheet docked on the
   left. Its two bridges are here: the sheet it mirrors is the call sheet
   module's own store, and Save writes the member's saved_drives the way the
   Oregon playbook did, plus a copy in the plan. */
let DRIVEB = null;
/* HIS CALL 2026-09-14: Drives is the script rack, the way the coaching app and the college pages
   do it (create drives, tag them to a pocket, save), not the Oregon builder full screen. The Oregon
   builder stays wired: a scheme asks for it with drive.mode = 'oregon'. */
const hasBuilder = () => typeof mountDriveBuilder === 'function' && !!(SC && SC.drive && SC.drive.mode === 'oregon');
function builderStage() {
  return { html: head('Drives &middot; the drive builder', 'Drive builder', 'script your drive, branch it, save it'), host: '<div id="dbHost"></div>' };
}
function builderMount() {
  const host = $('#dbHost'); if (!host || !hasBuilder()) return;
  const byIdP = new Map(SC.plays.map((p) => [p.id, p]));
  const playSecs = (SC.gpSections || []).filter((x) => x.kind === 'plays');
  const wrap = (p) => ({ name: p.name, formation: p.formation || '', star: p.type === 'Star Play' });
  const sv = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
  DRIVEB = mountDriveBuilder({
    plays: SC.plays.map((p) => ({ id: p.id, name: p.name, type: p.type, formation: p.formation || '', tags: p.tags || [] })),
    recommended: SC.drive.recommended, sections: SC.drive.sections, video: SC.drive.video,
    logo: (SC.about && SC.about.logo) || `logos/${SC.logo}.png`, skLogo: SC.drive.skLogo || '', sheetTitle: `${SC.nick || shortName()} Call Sheet`,
    padL: Math.round(44 * sv + 334), padR: Math.round(44 * sv + 310),
    openPlay: (id) => { location.hash = '#play/' + encodeURIComponent(id); },
    bridge: {
      callSheet(mode) {
        if (mode === 'empty') return { mode: 'empty', total: 0, cap: 24, sections: playSecs.map((x) => ({ id: x.id, label: x.label, cap: x.n, plays: [] })) };
        let sh = null; try { sh = JSON.parse(localStorage.getItem('gp-sheet-' + (SC.schemeKey || SC.key)) || 'null'); } catch (e) {}
        let total = 0;
        const sections = playSecs.map((x) => { const plays = ((sh && sh[x.id]) || []).map((id) => byIdP.get(id)).filter(Boolean).map(wrap); total += plays.length; return { id: x.id, label: x.label, cap: x.n, plays }; }).filter((x) => x.plays.length);
        return { mode: 'normal', total, cap: 24, sections };
      },
      signedIn() { try { return !!(typeof SK_AUTH !== 'undefined' && SK_AUTH.signedIn); } catch (e) { return false; } },
      async saveDrive(snapshot, meta) {
        meta = meta || {};
        const title = meta.title || `Drive · ${new Date().toLocaleDateString()}`;
        const plan = planRead(); plan.drives.push({ id: 'dr' + Date.now().toString(36), title, slot: null, main: snapshot.main, updated: new Date().toISOString() }); planWrite(plan);
        try {
          if (typeof skRequireLogin !== 'function' || typeof SK_AUTH === 'undefined') return { ok: true, title };
          const ok = await skRequireLogin(meta.reason || 'save this drive');
          if (!ok) return { ok: false, reason: 'cancelled' };
          const { error } = await SK_AUTH.client.from('saved_drives').insert({ member_id: SK_AUTH.memberId, scheme_key: SC.schemeKey || SC.key, title, data: snapshot });
          if (error) throw error;
          toast('Drive saved to your coaching app');
          return { ok: true, title };
        } catch (e) { toast('Could not save the drive, try again'); return { ok: false, reason: 'error', message: e && e.message }; }
      },
    },
  }, host);
}
function builderExit() { if (DRIVEB) { try { DRIVEB.exit(); } catch (e) {} DRIVEB = null; } }
function drivesStage() {
  const sc = SC, plan = planRead(), H = STAGE_H;
  const card = (d) => { const slot = slotOf(d.slot);
    return `<div class="script" data-drive="${esc(d.id)}" title="Open in the builder">
      <div class="script-top"><span class="script-title">${esc(d.title || 'Drive')}</span>
        <span class="script-acts"><button class="slotchip" style="--sc:${slot ? slot.c : '#8a6b4a'}" data-slotmenu="${esc(d.id)}" title="Move to another pocket">${slot ? esc(slot.label) : '+ tag a pocket'}</button>
          <button class="x" data-del="${esc(d.id)}" title="Delete">&times;</button></span></div>
      ${scriptRows(sc, d)}</div>`; };
  const pocketH = H - 80 - 176 - 16;
  const pocket = (slot, i) => { const mine = plan.drives.filter((d) => d.slot === slot.id); const sec = slot.sec && secLabel(slot.sec);
    return `<div class="pocket" style="--sc:${slot.c}" data-pocketid="${esc(slot.id)}"><button class="pocket-l" data-pocket="${esc(slot.id)}" title="Rename this pocket"><span>${esc(slot.label)}</span><i>&#9998;</i></button>
      ${sec ? `<span class="pocket-clip">clips to ${esc(sec)} on the sheet</span>` : ''}
      <div class="pocket-in">${mine.length ? mine.map(card).join('') + `<button class="ghost sm" data-new="${slot.id}"><b>+ another ${esc(slot.label)} script</b></button>`
        : `<button class="ghost" data-new="${slot.id}"><b>+ script this</b><span>counters branch left, fallbacks right</span></button>`}</div></div>`; };
  const un = plan.drives.filter((d) => !slotOf(d.slot));
  const unHTML = un.length ? `<div class="pocket wide" style="${at(44, 176 + pocketH + 24, 1512, 240)};--sc:#8a6b4a"><div class="pocket-l">Unassigned</div><div class="pocket-in">${un.map(card).join('')}</div></div>` : '';
  const n = plan.drives.length;
  /* the last pocket on the row makes pockets: as many as the coach wants, the row scrolls */
  const maker = `<div class="pocket new" style="--sc:#8a6b4a"><div class="pocket-l"><span>Create your own</span></div><div class="pocket-in"><button class="ghost" data-newpocket="1"><b>+ New pocket</b><span>name it what you like: goal line, backed up, a shot drive, whatever the moment is</span></button></div></div>`;
  return { html: `${head(`Drives &middot; the script rack &middot; ${n} script${n !== 1 ? 's' : ''}`, 'Drives', 'script the moment, create your own pockets', headRight(`<button class="btn sm" data-new="">+ Script a drive</button>`))}<div class="rack" style="${at(44, 176, 1512, pocketH)}">${driveSlots().map(pocket).join('')}${maker}</div>${unHTML}`,
    h: un.length ? 176 + pocketH + 24 + 240 + 100 : H };
}
/* the pocket menu on a script */
let POP = null;
/* the outside click that closes a pop is dropped when the pop closes any other way (Enter, Save), or it would close the NEXT pop the moment it opens */
let POPONCE = null;
function popClose() { if (POP) { POP.remove(); POP = null; } if (POPONCE) { document.removeEventListener('click', POPONCE); POPONCE = null; } }
function popOpen(anchor, html) {
  popClose();
  const host = anchor.closest('.pocket') || app;
  const pop = document.createElement('div'); pop.className = 'skpop'; pop.innerHTML = html;
  host.appendChild(pop); POP = pop;
  const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')) || 1;
  const r = anchor.getBoundingClientRect(), h = host.getBoundingClientRect();
  let left = (r.left - h.left) / s, top = (r.bottom - h.top) / s + 6;
  if (left + pop.offsetWidth > h.width / s - 8) left = Math.max(4, h.width / s - 8 - pop.offsetWidth);
  pop.style.left = left + 'px'; pop.style.top = top + 'px';
  pop.addEventListener('click', (e) => e.stopPropagation());
  const once = () => { if (POPONCE === once) popClose(); };
  setTimeout(() => { if (POP === pop) { POPONCE = once; document.addEventListener('click', once, { once: true }); } }, 0);
  return pop;
}
function slotMenu(sc, anchor, driveId, done) {
  const plan = planRead();
  const pop = popOpen(anchor, driveSlots().map((s) => `<button class="skpop-opt" data-v="${s.id}" style="--sc:${s.c}"><i></i>${esc(s.label)}</button>`).join('')
    + `<button class="skpop-opt" data-v="" style="--sc:transparent"><i style="border:1.5px dashed #8A7F6A"></i>Unassigned</button>`);
  pop.querySelectorAll('.skpop-opt').forEach((b) => b.addEventListener('click', () => {
    const d = plan.drives.find((x) => x.id === driveId); if (d) { d.slot = b.dataset.v || null; savePlan(); } popClose(); done(); }));
}

/* THE POCKET EDITOR: the name, and Delete on a pocket the coach made (its scripts go to Unassigned) */
function pocketMenu(anchor, id) {
  const plan = planRead(), slot = slotOf(id); if (!slot) return;
  const pop = popOpen(anchor, `<div class="skpop-edit"><label>Pocket name</label><input maxlength="24" value="${esc(slot.label)}"><div class="row"><button class="btn sm" data-pksave>Save</button>${slot.own ? '<button class="btn sm gh" data-pkdel>Delete pocket</button>' : ''}</div></div>`);
  const inp = pop.querySelector('input'); inp.focus(); inp.select();
  const save = () => { const v = inp.value.trim(); if (!v) return; if (slot.own) { const q = (plan.pockets || []).find((x) => x.id === id); if (q) q.label = v; } else { plan.pocketNames = plan.pocketNames || {}; plan.pocketNames[id] = v; } savePlan(); popClose(); render(); };
  pop.querySelector('[data-pksave]').addEventListener('click', save);
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } if (e.key === 'Escape') popClose(); });
  const del = pop.querySelector('[data-pkdel]'); if (del) del.addEventListener('click', () => { plan.pockets = (plan.pockets || []).filter((x) => x.id !== id); plan.drives.forEach((d) => { if (d.slot === id) d.slot = null; }); savePlan(); popClose(); render(); toast('Pocket removed, its scripts are unassigned'); });
}
function newPocket() { const plan = planRead(); plan.pockets = plan.pockets || []; const id = 'pk' + Date.now().toString(36);
  plan.pockets.push({ id, label: 'New pocket', c: POCKET_COLORS[plan.pockets.length % POCKET_COLORS.length] }); savePlan(); render();
  const rack = $('.rack'); if (rack) rack.scrollLeft = rack.scrollWidth;
  const lb = $(`[data-pocket="${id}"]`); if (lb) pocketMenu(lb, id); }

/* ---- THE BUILDER, a takeover: the plays on paper, the web in a frame, the
   script on paper, Save in the head. The spine layout is the playbooks',
   ported; the box is the stage's takeover box. ---- */
const DBX = { sc: null, drive: null, armed: null, menuKey: null, pan: { x: 0, y: 0, z: 1 }, needsFit: true, mode: 'build', cat: 'all', dirty: false, els: null, was: false };
const DB_ROW = 124, DB_HALFW = 118, DB_GAP = 70;
const dbxClone = (n) => ({ play: n.play, sit: n.sit || '', left: (n.left || []).map(dbxClone), right: (n.right || []).map(dbxClone) });
function dbxEnsure() {
  if (DBX.els) return DBX.els;
  const el = document.createElement('div'); el.id = 'skdb';
  el.innerHTML = `<div class="scrim" id="dbxscrim"></div><div class="box">
    <div class="bhead"><div><div class="k" id="dbxeye">The builder</div><div class="slab"><input class="dbx-title" id="dbxtitle" maxlength="48" placeholder="Name this script"></div></div>
      <div class="right"><button class="btn sm" id="dbxsave">Save to the rack</button><button class="btn sm gh" id="dbxclose">Close</button></div></div>
    <div class="dbx-tabs" id="dbxtabs"><button class="on" data-tab="rail">The plays</button><button data-tab="side">The script</button></div>
    <div class="paper t3 dbx-rail"><span class="tape" style="left:120px;top:-14px"></span><div class="in"><div class="dbx-rail-h"><b>The plays</b><span>tap + to drop one in</span></div>
      <div class="dbx-cats" id="dbxcats"></div><div class="dbx-list" id="dbxlist"></div></div></div>
    <div class="dbx-stage" id="dbxstage">
      <div class="dbx-modes"><button class="dbx-mode on" data-mode="build">Build</button><button class="dbx-mode" data-mode="field">On the field</button><button class="dbx-mode" data-fit="1">Fit</button></div>
      <div class="dbx-persp"><div class="dbx-web" id="dbxweb"><svg class="dbx-strands" id="dbxstrands" style="overflow:visible"></svg><div id="dbxnodes"></div></div></div>
      <div class="dbx-cap" id="dbxcap"></div></div>
    <div class="paper t2 dbx-side"><span class="tape" style="left:150px;top:-14px"></span><div class="in">
      <div class="h26">The script</div><div class="dbx-slots" id="dbxslots"></div>
      <div class="rule"></div><div class="dbx-sum" id="dbxsum"></div>
      <div class="dbx-key"><span><i style="background:#F5A623"></i>the spine</span><span><i style="background:#4fbf72"></i>counters</span><span><i style="background:#6f93ff"></i>fallbacks</span></div></div></div>
    <a class="x" id="dbxx" aria-label="Close">&times;</a></div>`;
  document.body.appendChild(el);
  const E = DBX.els = { root: el, stage: $('#dbxstage'), web: $('#dbxweb'), strands: $('#dbxstrands'), nodes: $('#dbxnodes'), cap: $('#dbxcap'),
    list: $('#dbxlist'), cats: $('#dbxcats'), title: $('#dbxtitle'), slots: $('#dbxslots'), sum: $('#dbxsum'), eye: $('#dbxeye') };
  E.title.addEventListener('input', () => { DBX.drive.title = E.title.value; DBX.dirty = true; });
  $('#dbxsave').addEventListener('click', dbxSave);
  $('#dbxtabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) dbxTab(b.dataset.tab); });
  $('#dbxclose').addEventListener('click', () => dbxClose(false));
  $('#dbxx').addEventListener('click', () => dbxClose(false));
  $('#dbxscrim').addEventListener('click', () => dbxClose(false));
  E.slots.addEventListener('click', (e) => { const b = e.target.closest('[data-slot]'); if (!b) return;
    DBX.drive.slot = DBX.drive.slot === b.dataset.slot ? null : b.dataset.slot; DBX.dirty = true; dbxRenderSide(); });
  E.cats.addEventListener('click', (e) => { const b = e.target.closest('[data-cat]'); if (!b) return; DBX.cat = b.dataset.cat; dbxRenderRail(); });
  E.list.addEventListener('click', (e) => { const b = e.target.closest('[data-add]'); if (b) dbxAdd(b.dataset.add); });
  el.querySelector('.dbx-modes').addEventListener('click', (e) => {
    const m = e.target.closest('[data-mode]'); if (m) { DBX.mode = m.dataset.mode; DBX.needsFit = true; dbxRenderWeb(); return; }
    if (e.target.closest('[data-fit]')) { DBX.needsFit = true; dbxRenderWeb(); }
  });
  /* pan and zoom on the stage: one finger or the mouse pans, two fingers pinch, the wheel zooms */
  let st = null; const ptrs = new Map(); let pinch = null;
  const zoomAt = (mx, my, z1) => { const z0 = DBX.pan.z; z1 = Math.max(.3, Math.min(1.6, z1));
    DBX.pan.x = mx - (mx - DBX.pan.x) * (z1 / z0); DBX.pan.y = my - (my - DBX.pan.y) * (z1 / z0); DBX.pan.z = z1; dbxApply(); };
  E.stage.addEventListener('pointerdown', (e) => { if (e.target.closest('.tn,.tadd,.tact,.dbx-modes')) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); E.stage.setPointerCapture(e.pointerId);
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: DBX.pan.z }; st = null; DBX.was = true; return; }
    st = { x: e.clientX, y: e.clientY, px: DBX.pan.x, py: DBX.pan.y, moved: false }; DBX.was = false; });
  E.stage.addEventListener('pointermove', (e) => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size === 2) { const [a, b] = [...ptrs.values()], r = E.stage.getBoundingClientRect(), d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      zoomAt((a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, pinch.z * d / pinch.d); pinch.z = DBX.pan.z; pinch.d = d; return; }
    if (!st) return; const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) { st.moved = true; DBX.was = true; }
    DBX.pan.x = st.px + dx; DBX.pan.y = st.py + dy; dbxApply(); });
  const up = (e) => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (st && !st.moved) { DBX.menuKey = null; DBX.armed = null; dbxRenderWeb(); } st = null; };
  E.stage.addEventListener('pointerup', up); E.stage.addEventListener('pointercancel', up);
  E.stage.addEventListener('wheel', (e) => { e.preventDefault(); const r = E.stage.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, DBX.pan.z * (e.deltaY < 0 ? 1.1 : .9)); }, { passive: false });
  return E;
}
const dbxIsOpen = () => !!(DBX.els && DBX.els.root.classList.contains('open'));
/* on a phone the plays and the script share the room under the web; the tab picks which shows */
function dbxTab(t) { DBX.tab = t; const E = DBX.els; E.root.dataset.tab = t; E.root.querySelectorAll('#dbxtabs [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === t)); }
function dbxOpen(sc, drive, slot) {
  const E = dbxEnsure();
  DBX.sc = sc;
  DBX.drive = drive ? { id: drive.id, title: drive.title || '', slot: drive.slot || null, seeded: !!drive.seeded, main: (drive.main || []).map(dbxClone) }
                    : { id: 'dr' + Date.now().toString(36), title: '', slot: slot || null, main: [] };
  DBX.armed = drive ? null : { chainPath: [] }; DBX.menuKey = null; DBX.needsFit = true; DBX.mode = 'build'; DBX.cat = 'all'; DBX.dirty = false;
  E.root.classList.add('open'); document.body.classList.add('lock'); const w = $('.stagewrap'); if (w) w.classList.add('blurred');
  dbxTab('rail'); dbxRenderSide(); dbxRenderRail(); dbxRenderWeb();
}
function dbxClose(silent) {
  if (!dbxIsOpen()) return;
  if (!silent && DBX.dirty && !confirm('Close without saving this script?')) return;
  DBX.els.root.classList.remove('open'); document.body.classList.remove('lock'); const w = $('.stagewrap'); if (w) w.classList.remove('blurred');
}
function dbxSave() {
  const sc = DBX.sc, plan = planRead(), d = DBX.drive;
  if (!d.main.length) { toast('Drop a play in first'); return; }
  if (!d.title.trim()) { const p = playOf(sc, d.main[0].play); d.title = (p ? p.name : 'Drive') + ' Script'; }
  const rec = { id: d.id, title: d.title.trim(), slot: d.slot, main: d.main.map(dbxClone), updated: new Date().toISOString() };
  const i = plan.drives.findIndex((x) => x.id === d.id); if (i >= 0) plan.drives[i] = rec; else plan.drives.push(rec);
  savePlan(); DBX.dirty = false; dbxClose(true);
  const sl = slotOf(d.slot); toast(sl ? `On the rack, in ${sl.label}` : 'On the rack');
  if (SEC === 'drives') render();
}
function dbxRenderSide() {
  const E = DBX.els, sc = DBX.sc, d = DBX.drive, sl = slotOf(d.slot);
  E.title.value = d.title;
  E.eye.innerHTML = `The builder${sl ? ' &middot; ' + esc(sl.label) : ''}`;
  E.slots.innerHTML = driveSlots().map((s) => `<button class="dbx-slot${d.slot === s.id ? ' on' : ''}" style="--sc:${s.c}" data-slot="${s.id}">${esc(s.label)}</button>`).join('');
  E.sum.innerHTML = `<div class="k team">${d.main.length} call${d.main.length !== 1 ? 's' : ''} on the spine</div>${scriptRows(sc, d)}`;
}
function dbxRenderRail() {
  const E = DBX.els, sc = DBX.sc;
  const cats = [['all', 'All'], ...((sc.install && sc.install.pillars) || []).map((pl) => [pl.key, pl.key])];
  E.cats.innerHTML = cats.map(([k, l]) => `<button class="dbx-cat${DBX.cat === k ? ' on' : ''}" data-cat="${k}">${l}</button>`).join('');
  const list = sc.plays.filter((p) => DBX.cat === 'all' || p.pillar === DBX.cat).sort((a, b) => a.order - b.order);
  E.list.innerHTML = list.map((p) => `<button class="dbx-play${DBX.armed ? ' armed' : ''}" data-add="${esc(p.id)}">
    ${artHTML(sc, p, '')}
    <span><b>${esc(p.name)}</b><i>${esc(p.formation || '')}</i></span><u>+</u></button>`).join('');
}
const dbxChain = (d, path) => { let ch = d.main; for (let k = 0; k < path.length; k += 2) ch = ch[path[k]][path[k + 1]]; return ch; };
const dbxNode = (d, p) => dbxChain(d, p.slice(0, -1))[p[p.length - 1]];
const dbxKey = (p) => p.join('.'), dbxCKey = (p) => 'c:' + p.join('.');
const dbxParse = (k) => k.replace(/^c:/, '').split('.').filter((s) => s !== '').map((s) => /^\d+$/.test(s) ? +s : s);
function dbxLayout(chain, chainPath, sideClass, connectBase) {
  const sc = DBX.sc, res = { nodes: [], strands: [], addSlots: [] };
  let spanMin = -DB_HALFW, spanMax = DB_HALFW, prevY = 0;
  const isTrunk = sideClass === '';
  chain.forEach((node, idx) => {
    const y = prevY - DB_ROW, path = [...chainPath, idx];
    const first = idx === 0 && !isTrunk, goal = isTrunk && idx === chain.length - 1;
    const p = playOf(sc, node.play);
    res.nodes.push({ x: 0, y, path, name: p ? p.name : node.play, sub: node.sit || (p && p.formation) || '',
      chipCls: goal ? 'goal' : (first ? sideClass : ''), badge: first ? (sideClass === 'br-left' ? '&#9733;' : '&#8635;') : String(idx + 1), badgeCls: first ? sideClass : '' });
    if (idx > 0 || connectBase) res.strands.push({ kind: 'L', x1: 0, y1: prevY, x2: 0, y2: y, cls: '' });
    ['left', 'right'].forEach((side) => {
      const br = node[side]; if (!br || !br.length) return;
      const bCls = side === 'left' ? 'br-left' : 'br-right';
      const sub = dbxLayout(br, [...path, side], bCls, false);
      const offset = side === 'left' ? spanMin - DB_GAP - sub.spanMax : spanMax + DB_GAP - sub.spanMin;
      sub.nodes.forEach((n) => res.nodes.push({ ...n, x: n.x + offset, y: n.y + y }));
      sub.strands.forEach((s) => res.strands.push(dbxShift(s, offset, y)));
      sub.addSlots.forEach((a) => res.addSlots.push({ ...a, x: a.x + offset, y: a.y + y }));
      res.strands.push({ kind: 'C', cls: bCls, x1: 0, y1: y, c1x: offset * .45, c1y: y, c2x: offset, c2y: y - DB_ROW * .5, x2: offset, y2: y - DB_ROW });
      spanMin = Math.min(spanMin, offset + sub.spanMin); spanMax = Math.max(spanMax, offset + sub.spanMax);
    });
    prevY = y;
  });
  const tipY = prevY - DB_ROW;
  res.addSlots.push({ x: 0, y: tipY, chainPath });
  res.strands.push({ kind: 'L', x1: 0, y1: prevY, x2: 0, y2: tipY, cls: '', stub: true });
  res.spanMin = spanMin; res.spanMax = spanMax; return res;
}
const dbxShift = (s, dx, dy) => s.kind === 'L' ? { ...s, x1: s.x1 + dx, y1: s.y1 + dy, x2: s.x2 + dx, y2: s.y2 + dy }
  : { ...s, x1: s.x1 + dx, y1: s.y1 + dy, c1x: s.c1x + dx, c1y: s.c1y + dy, c2x: s.c2x + dx, c2y: s.c2y + dy, x2: s.x2 + dx, y2: s.y2 + dy };
const dbxD = (s) => s.kind === 'L' ? `M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} L ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`
  : `M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} C ${s.c1x.toFixed(1)} ${s.c1y.toFixed(1)}, ${s.c2x.toFixed(1)} ${s.c2y.toFixed(1)}, ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`;
function dbxApply() {
  const E = DBX.els, tilt = DBX.mode === 'field' ? 'rotateX(50deg)' : '';
  E.web.style.transform = `translate(${DBX.pan.x}px,${DBX.pan.y}px) ${tilt} scale(${DBX.pan.z})`;
}
function dbxFit(ctx) {
  const E = DBX.els, r = E.stage.getBoundingClientRect();
  const pts = ctx.nodes.map((n) => ({ x: n.x, y: n.y })).concat(ctx.addSlots.map((s) => ({ x: s.x, y: s.y })));
  if (!pts.length) pts.push({ x: 0, y: 0 });
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  pts.forEach((p) => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
  minX -= 180; maxX += 180; minY -= 80; maxY += 100;
  const W = r.width, H = r.height, tw = Math.max(1, maxX - minX), th = Math.max(1, maxY - minY);
  /* a phone keeps the chips readable (a floor of .65) and lets him pan the rest */
  DBX.pan.z = Math.max(document.body.classList.contains('mob') ? .65 : .3, Math.min(1.1, Math.min((W * .86) / tw, (H * .8) / th)));
  DBX.pan.x = W / 2 - ((minX + maxX) / 2) * DBX.pan.z;
  DBX.pan.y = (DBX.mode === 'field' ? H * .62 : H / 2) - ((minY + maxY) / 2) * DBX.pan.z;
  dbxApply();
}
function dbxRenderWeb() {
  const E = DBX.els, d = DBX.drive, main = d.main;
  E.stage.classList.toggle('field', DBX.mode === 'field');
  E.root.querySelectorAll('[data-mode]').forEach((b) => b.classList.toggle('on', b.dataset.mode === DBX.mode));
  const ctx = dbxLayout(main, [], '', true);
  E.strands.innerHTML = ctx.strands.map((s) => `<path class="tstrand ${s.cls}${s.stub ? ' stub' : ''}" d="${dbxD(s)}"/>`).join('');
  let html = ctx.nodes.map((nd) => { const key = dbxKey(nd.path);
    return `<div class="tn ${nd.chipCls}${DBX.menuKey === key ? ' menu-open' : ''}" data-key="${key}" style="left:${nd.x.toFixed(1)}px;top:${nd.y.toFixed(1)}px">
      <span class="tnum ${nd.badgeCls}">${nd.badge}</span><span class="tnm">${esc(nd.name)}</span>${nd.sub ? `<span class="tsub">${esc(nd.sub)}</span>` : ''}
      <div class="tacts">
        <button class="tact pos" data-act="left" data-key="${key}">+ Counter</button>
        <button class="tact neg" data-act="right" data-key="${key}">+ Fallback</button>
        <button class="tact" data-act="open" data-key="${key}">Open</button>
        <button class="tact rm" data-act="rm" data-key="${key}">Remove</button></div></div>`; }).join('');
  html += ctx.addSlots.map((sl) => { const ck = dbxCKey(sl.chainPath), armed = DBX.armed && dbxCKey(DBX.armed.chainPath) === ck;
    const label = (!sl.chainPath.length && !main.length) ? '+ Add the first call' : '+ Add call';
    return `<button class="tadd${armed ? ' armed' : ''}" data-chain="${ck}" style="left:${sl.x.toFixed(1)}px;top:${sl.y.toFixed(1)}px">${label}</button>`; }).join('');
  if (!main.length) html += `<div class="tempty" style="left:0px;top:${-DB_ROW * 2}px">Pick a play from the list and tap + to drop it in. Every call after that can branch a counter or a fallback.</div>`;
  E.nodes.innerHTML = html;
  E.nodes.querySelectorAll('.tadd').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation();
    const cp = dbxParse(b.dataset.chain);
    DBX.armed = (DBX.armed && dbxCKey(DBX.armed.chainPath) === dbxCKey(cp)) ? null : { chainPath: cp }; DBX.menuKey = null; if (DBX.armed) dbxTab('rail'); dbxRenderWeb(); dbxRenderRail(); }));
  E.nodes.querySelectorAll('.tn').forEach((n) => n.addEventListener('click', (e) => { if (e.target.closest('.tact') || DBX.was) return;
    const key = n.dataset.key; DBX.menuKey = DBX.menuKey === key ? null : key; DBX.armed = null; dbxRenderWeb(); dbxRenderRail(); }));
  E.nodes.querySelectorAll('.tact').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation();
    const path = dbxParse(b.dataset.key), act = b.dataset.act;
    if (act === 'left' || act === 'right') { DBX.armed = { chainPath: [...path, act] }; DBX.menuKey = null; dbxTab('rail'); dbxRenderWeb(); dbxRenderRail(); }
    else if (act === 'open') { const nd = dbxNode(d, path); DBX.menuKey = null; dbxRenderWeb(); if (nd) playDrawer(DBX.sc, nd.play); }
    else if (act === 'rm') { dbxChain(d, path.slice(0, -1)).splice(path[path.length - 1], 1); DBX.menuKey = null; DBX.armed = null; DBX.dirty = true; dbxRenderWeb(); dbxRenderSide(); }
  }));
  E.cap.innerHTML = DBX.armed
    ? (DBX.armed.chainPath.length && DBX.armed.chainPath[DBX.armed.chainPath.length - 1] === 'left' ? 'Adding a counter (if they bite): tap + on a play'
      : DBX.armed.chainPath.length && DBX.armed.chainPath[DBX.armed.chainPath.length - 1] === 'right' ? 'Adding a fallback (it stalled): tap + on a play'
      : 'Adding the next call: tap + on a play')
    : (main.length ? (document.body.classList.contains('mob') ? 'Tap a call to branch it. Drag to pan, pinch to zoom.' : 'Tap a call to branch it. Drag to pan, scroll to zoom.') : 'Empty script. Pick a play and tap + to start.');
  if (DBX.needsFit) { dbxFit(ctx); DBX.needsFit = false; } else dbxApply();
}
function dbxAdd(playId) {
  const d = DBX.drive, p = playOf(DBX.sc, playId);
  const c = { play: playId, sit: (p && p.formation) || '', left: [], right: [] };
  const path = (DBX.armed && DBX.armed.chainPath) || [];
  dbxChain(d, path).push(c); DBX.armed = null; DBX.dirty = true;
  if (document.body.classList.contains('mob')) DBX.needsFit = true;
  dbxRenderWeb(); dbxRenderSide(); dbxRenderRail();
}

/* ---------- THE BOARD: the wall in the frame, your plays on the rail,
   cases, prints and the red string (ported) ---------- */
const ANSWER_COLS = [
  { id: 'man',   label: 'Vs Man',       c: '#c2554e' },
  { id: 'zone',  label: 'Vs Zone',      c: '#1b8a80' },
  { id: 'blitz', label: 'Vs the Blitz', c: '#7a5cc2' },
  { id: 'money', label: 'Money Downs',  c: '#b98a1c' },
];
/* a defense answers different questions: its cases are defensive flags */
const ANSWER_COLS_D = [
  { id: 'first',     label: '1st and 10',      c: '#b98a1c' },
  { id: 'runstop',   label: 'Run Stoppers',    c: '#2e7d43' },
  { id: 'manblitz',  label: 'Man Blitzes',     c: '#c2554e' },
  { id: 'zoneblitz', label: 'Zone Blitzes',    c: '#7a5cc2' },
  { id: 'match',     label: 'Match Coverages', c: '#1b8a80' },
];
const ANSWER_COLS_OF = (sc) => sc.side === 'D' ? ANSWER_COLS_D : ANSWER_COLS;
const CASE_COLORS = ['#2e7d43', '#1E54B7', '#b3541e', '#7a5cc2', '#1b8a80', '#b98a1c', '#a0342e'];
/* the starting tags keep their id and colour; a renamed one keeps the new name in the plan */
const allCases = (sc) => { const nm = planRead().board.names || {}; return [...ANSWER_COLS_OF(sc).map((c) => nm[c.id] ? Object.assign({}, c, { label: nm[c.id] }) : c), ...planRead().cases]; };
const pinsFor = (sc, pk) => [...new Set(planRead().board.pins.filter((p) => p.pk === pk).map((p) => p.caseId))];
function casePos(sc, cases) {
  const b = planRead().board, out = {}, N = Math.max(1, cases.length);
  cases.forEach((c, i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI / N);
    const mob = document.body.classList.contains('mob'); out[c.id] = b.cases[c.id] || { x: Math.round(Math.cos(a) * (mob ? 330 : 620)), y: Math.round(Math.sin(a) * (mob ? 300 : 360)) }; });
  return out;
}
function pinAdd(sc, caseId, pk, x, y) {
  const b = planRead().board;
  if (x == null) { const cp = casePos(sc, allCases(sc))[caseId] || { x: 0, y: -320 }; const k = b.pins.filter((p) => p.caseId === caseId).length;
    x = cp.x + ((k % 2) ? -125 : 125); y = cp.y + 165 + Math.floor(k / 2) * 200; }
  b.pins.push({ id: 'pin' + Date.now().toString(36) + b.pins.length, caseId, pk, x, y }); savePlan();
}
function pinRemove(sc, pinId) { const b = planRead().board; b.pins = b.pins.filter((p) => p.id !== pinId); savePlan(); }
function pinToggle(sc, pk, caseId) { const b = planRead().board; const ex = b.pins.find((p) => p.pk === pk && p.caseId === caseId);
  if (ex) pinRemove(sc, ex.id); else pinAdd(sc, caseId, pk); }
let BOARD_CAM = null, BOARD = null;
function boardStage() {
  const sc = SC, plan = planRead(), b = plan.board, cases = allCases(sc), cpos = casePos(sc, cases), lay = L(), H = STAGE_H;
  b.pins = b.pins.filter((p) => cases.some((x) => x.id === p.caseId));
  const tray = sc.plays.slice().sort((x, y) => (noteOf(sc, y.id) ? 1 : 0) - (noteOf(sc, x.id) ? 1 : 0) || x.order - y.order);
  const trayItem = (p) => { const n = b.pins.filter((x) => x.pk === p.id).length;
    return `<div class="mbb-tray-i" data-pk="${esc(p.id)}">${artHTML(sc, p, '')}
      <span class="mbb-tray-mid"><b>${esc(p.name)}</b><i>${esc((p.formation || '').replace(/^425 /, ''))}</i></span>${n ? `<span class="mbb-tray-n" title="pinned in ${n} case${n !== 1 ? 's' : ''}">${n}</span>` : ''}</div>`; };
  const caseHTML = (c) => `<div class="mbb-item mbb-case" data-id="case-${esc(c.id)}" data-case="${esc(c.id)}" style="--sc:${c.c}"><span class="mb-pin"></span>${esc(c.label)}</div>`;
  const pinHTML = (pn) => { const p = playOf(sc, pn.pk) || {}, note = noteOf(sc, pn.pk);
    return `<div class="mbb-item mbb-print" data-id="${esc(pn.id)}" data-pin="${esc(pn.id)}"><span class="mb-pin"></span>
      ${artHTML(sc, p, '')}
      <b>${isStar(p) ? '&#9819; ' : ''}${esc(p.name || pn.pk)}</b>
      <span class="mbb-noteline${note ? ' on' : ''}">${note ? esc(note.length > 42 ? note.slice(0, 42) + '…' : note) : '+ add your note'}</span></div>`; };
  const model = [...cases.map((c) => ({ id: 'case-' + c.id, kind: 'case', caseId: c.id, x: cpos[c.id].x, y: cpos[c.id].y })),
                 ...b.pins.map((p) => ({ id: p.id, kind: 'pin', pin: p, caseId: p.caseId, pk: p.pk, x: p.x, y: p.y })),
                 ...(b.pins.length ? [] : [{ id: 'how', kind: 'how', x: 0, y: 236 }])];
  /* an empty wall says how a pin gets made, and offers to show it */
  const howHTML = b.pins.length ? '' : `<div class="mbb-item mbb-how" data-id="how"><span class="mb-pin"></span><b>Nothing pinned yet</b><div class="t">A pin is a play under a tag: when they do this, you go to that.</div><ol><li>Drag a play from the tray onto a tag.</li><li>Tap a tag and pick from the list.</li><li>Press <u>+ Pin a play</u> up top.</li></ol><button class="btn sm" data-demo="1">Show me <em>&rarr;</em></button></div>`;
  const wallH = lay.frame.h;
  const html = `${head(`The board &middot; your tags, your answers &middot; ${b.pins.length} pinned`, 'The Board', 'name the problem, pin the answer', headRight(`<button class="btn sm" data-newpin="1">+ Pin a play</button><button class="btn sm gh" data-newcase="1">+ New tag</button>`))}
    <div class="foot mid" style="${at(44, lay.foot.y, 1000, 80)}"><span class="cue">Drag a play onto a tag to pin it &middot; grab the wall to move around<i></i></span></div>`;
  const liveHTML = live(44, 176, 1512, H - 80 - 176, 'boardlive', `<div class="mbb-stage" id="mbb-stage">
      <div class="mbb-wall" id="mbb-wall" style="width:calc(1000px*var(--s));height:calc(${wallH}px*var(--s))"><div class="mbb-canvas" id="mbb-canvas">
        <svg class="mbb-svg" id="mbb-svg" style="overflow:visible"></svg>
        <div class="mbb-item mbb-hub" data-id="hub"><span class="mb-pin"></span>
          ${sc.logo ? `<img src="logos/${esc(sc.logo)}.png" alt="" draggable="false">` : ''}<span class="mbb-hub-l">${esc(sc.name)}</span></div>
        ${cases.map(caseHTML).join('')}${b.pins.map(pinHTML).join('')}${howHTML}</div>
      <div class="mbb-hud"><button class="mbb-zbtn" data-z="in">+</button><button class="mbb-zbtn" data-z="out">&minus;</button><button class="mbb-zbtn" data-z="fit" title="Recenter">&#8962;</button></div></div>
      <div class="mbb-tray paper t2" id="mbb-tray" style="left:calc(1024px*var(--s))"><span class="tape" style="left:150px;top:-14px"></span><div class="in"><div class="mbb-tray-l">Your plays<i>${tray.length}</i></div><div class="t">drag one onto a tag, or tap a tag and pick</div><div class="mbb-tray-list">${tray.map(trayItem).join('')}</div></div></div>
    </div>`);
  return { html, live: liveHTML, model };
}
function boardWire(sc, items) {
  const b = planRead().board;
  const stage = $('#mbb-stage'), wall = $('#mbb-wall'), canvas = $('#mbb-canvas'), svg = $('#mbb-svg'), tray = $('#mbb-tray');
  if (!stage || !wall) return;
  const byEl = new Map();
  items.forEach((it) => { it.el = canvas.querySelector(`[data-id="${CSS.escape(it.id)}"]`); if (!it.el) return;
    it.el.style.left = it.x + 'px'; it.el.style.top = it.y + 'px'; byEl.set(it.el, it); });
  const hub = canvas.querySelector('[data-id="hub"]'); hub.style.left = '0px'; hub.style.top = '0px';
  const MOBW = document.body.classList.contains('mob'); /* a phone sits closer to the wall */
  const fit = () => { const r = wall.getBoundingClientRect(); return { x: r.width / 2, y: r.height / 2, z: Math.max(.3, Math.min(r.width / (MOBW ? 760 : 1750), .9)) }; };
  const cam = (BOARD_CAM && BOARD_CAM.sk === sc.key) ? BOARD_CAM : Object.assign(fit(), { sk: sc.key }); BOARD_CAM = cam;
  const apply = () => { canvas.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.z})`; }; apply();
  const toCanvas = (sx, sy) => { const r = wall.getBoundingClientRect(); return [(sx - r.left - cam.x) / cam.z, (sy - r.top - cam.y) / cam.z]; };
  const pinPt = (it) => [it.x, it.y - (it.el ? it.el.offsetHeight / 2 : 0) + 7];
  const strings = () => {
    const hubPt = [0, -hub.offsetHeight / 2 + 24];
    const seg = (a, c, sag) => { const mx = (a[0] + c[0]) / 2, my = Math.max(a[1], c[1]) + (sag || 30);
      return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)} `; };
    let d = '';
    items.filter((it) => it.kind === 'case').forEach((c) => { const pins = items.filter((p) => p.kind === 'pin' && p.caseId === c.caseId); if (!pins.length) return;
      d += seg(hubPt, pinPt(c), 52); pins.forEach((p) => { d += seg(pinPt(c), pinPt(p)); }); });
    svg.innerHTML = d ? `<path d="${d}" fill="none" stroke="#b3261e" stroke-width="2.4" stroke-linecap="round" opacity=".92" style="filter:drop-shadow(0 2px 1.5px rgba(0,0,0,.4))"/>` : '';
  };
  strings();
  let saveT = null;
  const persist = () => { items.forEach((it) => { if (it.kind === 'case') b.cases[it.caseId] = { x: Math.round(it.x), y: Math.round(it.y) };
      else if (it.pin) { it.pin.x = Math.round(it.x); it.pin.y = Math.round(it.y); it.pin.caseId = it.caseId; } });
    clearTimeout(saveT); saveT = setTimeout(() => savePlan(), 500); };
  const caseElAt = (sx, sy) => { let hit = null; canvas.querySelectorAll('.mbb-case').forEach((el) => { const r = el.getBoundingClientRect();
    if (sx >= r.left - 34 && sx <= r.right + 34 && sy >= r.top - 34 && sy <= r.bottom + 34) hit = el; }); return hit; };
  const clearDrop = () => canvas.querySelectorAll('.mbb-case.drop').forEach((el) => el.classList.remove('drop'));
  const refresh = () => { if (SEC === 'board') render(); };
  let st = null;
  stage.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mbb-hud')) return;
    const trayEl = e.target.closest('.mbb-tray-i'), itemEl = e.target.closest('.mbb-item');
    if (!trayEl && e.target.closest('.mbb-tray')) return;
    if (e.target.closest('[data-demo]')) { e.preventDefault(); demo(); return; }
    if (itemEl && itemEl.dataset.id === 'how') return;
    if (trayEl) { const pk = trayEl.dataset.pk, p = playOf(sc, pk) || {};
      const ghost = document.createElement('div'); ghost.className = 'mbb-ghost';
      ghost.innerHTML = `${artHTML(sc, p, '')}<b>${esc(p.name || pk)}</b>`;
      document.body.appendChild(ghost); ghost.style.left = e.clientX + 'px'; ghost.style.top = e.clientY + 'px';
      st = { mode: 'tray', pk, ghost, sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
    } else if (itemEl && itemEl.dataset.id !== 'hub') {
      st = { mode: 'item', item: byEl.get(itemEl), sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
      if (st.item) st.item.el.classList.add('lift');
    } else st = { mode: 'pan', sx: e.clientX, sy: e.clientY, lx: e.clientX, ly: e.clientY, moved: false };
    stage.setPointerCapture(e.pointerId); e.preventDefault();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!st) return; const dx = e.clientX - st.lx, dy = e.clientY - st.ly; st.lx = e.clientX; st.ly = e.clientY;
    if (Math.abs(e.clientX - st.sx) + Math.abs(e.clientY - st.sy) > 5) st.moved = true;
    if (st.mode === 'tray') { st.ghost.style.left = e.clientX + 'px'; st.ghost.style.top = e.clientY + 'px'; clearDrop(); const hit = caseElAt(e.clientX, e.clientY); if (hit) hit.classList.add('drop'); }
    else if (st.mode === 'item') { const it = st.item; if (!it) return; it.x += dx / cam.z; it.y += dy / cam.z; it.el.style.left = it.x + 'px'; it.el.style.top = it.y + 'px';
      if (it.kind === 'pin') { clearDrop(); const hit = caseElAt(e.clientX, e.clientY); if (hit) hit.classList.add('drop'); } strings(); }
    else { cam.x += dx; cam.y += dy; apply(); }
  });
  stage.addEventListener('pointerup', (e) => {
    if (!st) return; const s = st; st = null; clearDrop();
    if (s.mode === 'tray') { s.ghost.remove(); const hit = s.moved ? caseElAt(e.clientX, e.clientY) : null;
      if (hit) { const [cx, cy] = toCanvas(e.clientX, e.clientY), c = byEl.get(hit);
        const near = Math.abs(cx - c.x) < 110 && Math.abs(cy - c.y) < 70;
        pinAdd(sc, c.caseId, s.pk, Math.round(near ? c.x : cx), Math.round(near ? c.y + 165 : cy)); refresh(); }
      else if (!s.moved) playDrawer(sc, s.pk); else toast('Drop it on a tag');
      return; }
    if (s.mode !== 'item' || !s.item) return;
    const it = s.item; it.el.classList.remove('lift');
    if (!s.moved) { it.kind === 'case' ? caseDrawer(sc, it.caseId) : playDrawer(sc, it.pk, it.id); return; }
    if (it.kind === 'pin') { const hit = caseElAt(e.clientX, e.clientY), c = hit && byEl.get(hit);
      if (c && c.caseId !== it.caseId) { it.caseId = c.caseId; it.y = Math.max(it.y, c.y + 150); it.el.style.top = it.y + 'px'; } }
    persist(); strings();
  });
  /* SHOW ME: the first play in the tray flies onto the first case, the case
     lights the way a drop does, and the pin goes up for real. They can take
     it down from its drawer, or drag it somewhere better. */
  let demoing = false;
  const demo = () => {
    if (demoing) return; const trayEl = tray && tray.querySelector('.mbb-tray-i'), caseIt = items.find((it) => it.kind === 'case' && it.el);
    if (!trayEl || !caseIt) return; demoing = true;
    const pk = trayEl.dataset.pk, p = playOf(sc, pk) || {}, a = trayEl.getBoundingClientRect(), z = caseIt.el.getBoundingClientRect();
    const ghost = document.createElement('div'); ghost.className = 'mbb-ghost';
    ghost.innerHTML = `${artHTML(sc, p, '')}<b>${esc(p.name || pk)}</b>`; document.body.appendChild(ghost);
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = z.left + z.width / 2, y1 = z.top + z.height / 2;
    ghost.style.left = x0 + 'px'; ghost.style.top = y0 + 'px'; trayEl.classList.add('lift');
    const anim = ghost.animate([{ left: x0 + 'px', top: y0 + 'px', offset: 0 }, { left: x0 + 'px', top: y0 + 'px', offset: .18 }, { left: x1 + 'px', top: y1 + 'px', offset: 1 }], { duration: 1500, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
    setTimeout(() => caseIt.el.classList.add('drop'), 950);
    anim.onfinish = () => { setTimeout(() => { ghost.remove(); trayEl.classList.remove('lift'); clearDrop(); demoing = false;
      pinAdd(sc, caseIt.caseId, pk); refresh(); toast(`Pinned ${p.name || pk} under ${(allCases(sc).find((x) => x.id === caseIt.caseId) || {}).label || 'the case'}. Drag any play the same way`); }, 260); };
  };
  wall.addEventListener('wheel', (e) => { e.preventDefault(); cam.z = Math.max(.25, Math.min(1.8, cam.z * (e.deltaY < 0 ? 1.1 : .9))); apply(); }, { passive: false });
  stage.querySelectorAll('.mbb-zbtn').forEach((btn) => btn.addEventListener('click', (ev) => { ev.stopPropagation();
    if (btn.dataset.z === 'fit') Object.assign(cam, fit()); else cam.z = Math.max(.25, Math.min(1.8, cam.z * (btn.dataset.z === 'in' ? 1.18 : .85))); apply(); }));
  if (tray) tray.addEventListener('wheel', (e) => e.stopPropagation());
}

/* ---------- THE DRAWER: one cream panel off the right edge: a play, a case, a new case ---------- */
function drawerEnsure() {
  let el = $('#skdrawer'); if (el) return el;
  el = document.createElement('div'); el.id = 'skdrawer';
  el.innerHTML = `<button id="skdrawer-x" aria-label="Close">&times;</button><div id="skdrawer-in"></div>`;
  document.body.appendChild(el);
  $('#skdrawer-x').addEventListener('click', drawerClose);
  return el;
}
function drawer(html, onClick) { const el = drawerEnsure(); const inn = $('#skdrawer-in'); inn.innerHTML = html; inn.onclick = onClick || null; el.classList.add('open'); }
function drawerClose() { const el = $('#skdrawer'); if (el) el.classList.remove('open'); }
const drawerOpen = () => !!$('#skdrawer.open');
const refreshView = () => { if (SEC === 'board' || SEC === 'drives') render(); };
function playDrawer(sc, pk, pinId) {
  const p = playOf(sc, pk); if (!p) return;
  const note = noteOf(sc, pk), cases = allCases(sc), pins = pinsFor(sc, pk), locked = !taughtOf(p);
  const chips = cases.map((c) => `<button class="mbb-chip${pins.includes(c.id) ? ' on' : ''}" style="--sc:${c.c}" data-pin="${esc(c.id)}">${esc(c.label)}</button>`).join('');
  drawer(`<div class="dr-eye">${isStar(p) ? '&#9819; ' : ''}${esc(p.name)}</div>
    <div class="dr-int">${esc(p.formation || '')}${p.subtype ? ' · ' + esc(p.subtype) : ''}${p.books ? ' · run by ' + p.books + ' playbooks' : ''}</div>
    ${artHTML(sc, p, 'dr-art')}
    ${p.whenToUse ? `<div class="dr-lab">When to call it</div><p class="dr-p">${esc(p.whenToUse)}</p>` : ''}
    ${(p.reads || []).length ? `<div class="dr-lab">The ${RDWORD(sc)}s</div>${p.reads.map((r, i) => `<div class="rd"><i>${i + 1}</i><div><b>${esc(r.label)}</b><p>${esc(r.text)}</p></div></div>`).join('')}` : ''}
    <div class="dr-lab">Pinned under</div><div class="mbb-chips">${chips}</div>
    <div class="dr-lab">Your note</div><textarea class="note" id="dr-note" maxlength="500" placeholder="the stuff you learn the hard way">${esc(note)}</textarea>
    <div class="dr-acts"><button class="btn sm" data-savenote="1">Save note</button>
      ${locked ? '' : `<button class="btn sm gh" data-goinstall="1">Open in the install</button>`}
      ${pinId ? `<button class="btn sm red" data-unpin="${esc(pinId)}">Take it down</button>` : ''}</div>`,
    (e) => {
      const pn = e.target.closest('[data-pin]'); if (pn) { pinToggle(sc, pk, pn.dataset.pin); pn.classList.toggle('on'); refreshView(); return; }
      if (e.target.closest('[data-savenote]')) { planRead().notes[pk] = $('#dr-note').value; savePlan(); drawerClose(); toast('Note saved'); refreshView(); return; }
      const un = e.target.closest('[data-unpin]'); if (un) { pinRemove(sc, un.dataset.unpin); drawerClose(); refreshView(); return; }
      if (e.target.closest('[data-goinstall]')) { drawerClose(); dbxClose(true);
        if (COV()) { location.hash = `#coverage/${pk}`; return; } const s = installSlides().findIndex((x) => x.t === 'play' && x.p.id === pk); location.hash = s >= 0 ? `#install/${s}` : `#play/${pk}`; return; }
    });
}
function caseDrawer(sc, caseId) {
  const col = allCases(sc).find((c) => c.id === caseId); if (!col) return;
  const custom = planRead().cases.some((c) => c.id === caseId), b = planRead().board;
  const row = (p) => { const on = b.pins.some((x) => x.pk === p.id && x.caseId === caseId);
    return `<button class="dr-pick${on ? ' on' : ''}" data-toggle="${esc(p.id)}">${artHTML(sc, p, '')}
      <span><b>${esc(p.name)}</b><i>${esc(p.formation || '')}</i></span><u>${on ? '&#10003;' : '+'}</u></button>`; };
  drawer(`<div class="dr-eye" style="color:${col.c}">${esc(col.label)}</div>
    <div class="dr-lab">Call it what you like</div><div class="dr-free"><input id="dr-rename" maxlength="32" value="${esc(col.label)}"><button data-rename="1" title="Rename">&#10003;</button></div>
    <div class="dr-int" style="margin-top:12px">When they do this, what do you go to? Tap a play to pin it up here.</div>
    <div class="dr-list">${sc.plays.slice().sort((a, c) => a.order - c.order).map(row).join('')}</div>
    ${custom ? `<div class="dr-acts"><button class="btn sm red" data-delcase="1">&times; Delete this tag</button></div>` : ''}`,
    (e) => {
      if (e.target.closest('[data-rename]')) { rename(); return; }
      const t = e.target.closest('[data-toggle]'); if (t) { pinToggle(sc, t.dataset.toggle, caseId); caseDrawer(sc, caseId); refreshView(); return; }
      if (e.target.closest('[data-delcase]')) { const plan = planRead(); plan.cases = plan.cases.filter((c) => c.id !== caseId);
        plan.board.pins = plan.board.pins.filter((p) => p.caseId !== caseId); delete plan.board.cases[caseId]; savePlan(); drawerClose(); refreshView(); return; }
    });
  /* renaming: a custom tag changes in place, a starting tag keeps its id and colour and remembers the new name */
  const rename = () => { const v = String(($('#dr-rename') || {}).value || '').trim().slice(0, 32); if (!v || v === col.label) return; const plan = planRead();
    const cc = plan.cases.find((x) => x.id === caseId); if (cc) cc.label = v; else { plan.board.names = plan.board.names || {}; plan.board.names[caseId] = v; }
    savePlan(); refreshView(); toast(`Renamed to ${v}`); caseDrawer(sc, caseId); };
  const ri = $('#dr-rename'); if (ri) ri.addEventListener('keydown', (e) => { if (e.key === 'Enter') rename(); });
}
function newPinDrawer(sc, pk, caseId) {
  const cases = allCases(sc), plays = sc.plays.slice().sort((a, b) => a.order - b.order), col = cases.find((x) => x.id === caseId), p = pk && playOf(sc, pk);
  drawer(`<div class="dr-eye">Pin a play</div>
    <div class="dr-int">Two picks. The case you are answering, then the play that answers it. It goes up on the wall under that case.</div>
    <div class="dr-lab">1 &middot; Under which tag</div><div class="mbb-chips">${cases.map((x) => `<button class="mbb-chip${caseId === x.id ? ' on' : ''}" style="--sc:${x.c}" data-case="${esc(x.id)}">${esc(x.label)}</button>`).join('')}<button class="mbb-chip gh" data-newcase-in="1">+ a new tag</button></div>
    <div class="dr-lab">2 &middot; Which play</div><div class="dr-list">${plays.map((q) => `<button class="dr-pick${pk === q.id ? ' on' : ''}" data-play="${esc(q.id)}">${artHTML(sc, q, '')}<span><b>${esc(q.name)}</b><i>${esc(q.formation || '')}</i></span><u>${pk === q.id ? '&#10003;' : '+'}</u></button>`).join('')}</div>
    <div class="dr-acts"><button class="btn sm" data-pinit="1"${p && col ? '' : ' disabled'}>Pin ${p ? esc(p.name) : 'it'}${col ? ' under ' + esc(col.label) : ''}</button></div>`,
    (e) => {
      const cs = e.target.closest('[data-case]'); if (cs) { newPinDrawer(sc, pk, cs.dataset.case); return; }
      const pl = e.target.closest('[data-play]'); if (pl) { newPinDrawer(sc, pl.dataset.play, caseId); const el = $('#skdrawer-in .dr-acts'); if (el) el.scrollIntoView({ block: 'nearest' }); return; }
      if (e.target.closest('[data-newcase-in]')) { newCaseDrawer(sc, (id) => newPinDrawer(sc, pk, id)); return; }
      if (e.target.closest('[data-pinit]') && p && col) { pinAdd(sc, caseId, pk); drawerClose(); refreshView(); toast(`Pinned ${p.name} under ${col.label}`); return; }
    });
}
function newCaseDrawer(sc, after) {
  drawer(`<div class="dr-eye">New tag</div>
    <div class="dr-int">Name it after the problem or the spot. "Cover 3 shells." "2nd and short." "The guy who QB spies all game." Then pin your answers under it.</div>
    <div class="dr-free"><input id="dr-case" maxlength="32" placeholder="what are they doing to you, or what is the spot?"><button data-go-case="1">&#10003;</button></div>`,
    (e) => { if (e.target.closest('[data-go-case]')) commit(); });
  const commit = () => { const v = String($('#dr-case').value || '').trim(); if (!v) return; const plan = planRead();
    const id = 'cs' + Date.now().toString(36); plan.cases.push({ id, label: v.slice(0, 32), c: CASE_COLORS[plan.cases.length % CASE_COLORS.length] });
    savePlan(); refreshView(); toast('Tag created'); if (after) after(id); else drawerClose(); };
  const inp = $('#dr-case'); inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); }); setTimeout(() => inp.focus(), 60);
}

/* ---------- PERSONNEL AND HISTORY: the groups standing in the frame as
   positions and names (no cutouts, no custom art: the position, the name,
   the crest), what the coach built on the rail, the role as a takeover ---------- */
const WANT_TAGS = {
  'speed': ['vertical-shot', 'bomb', 'option-run', 'screen'], 'top speed': ['bomb', 'vertical-shot', 'option-run'], 'deep speed': ['bomb', 'vertical-shot'],
  'acceleration': ['run-play', 'screen', 'option-run'], 'agility': ['screen', 'option-run', 'money-play'], 'open field vision': ['screen', 'run-play'],
  'throw on the run': ['play-action', 'vs-all-zone'], 'short accuracy': ['rpo', 'screen', 'third-down'], 'soft hands': ['screen', 'play-action'],
  'ball skills': ['vs-man', 'bomb', 'red-zone'], 'release': ['vs-man', 'third-down'],
};
function wantPlays(sc, want, role) {
  const tags = WANT_TAGS[String(want || '').toLowerCase()] || [];
  const hits = sc.plays.filter((p) => (p.tags || []).some((t) => tags.includes(t))).sort((a, b) => a.order - b.order);
  const feat = (role.plays || []).map((id) => playOf(sc, id)).filter(Boolean);
  const out = []; for (const p of [...feat, ...hits]) if (!out.some((x) => x.id === p.id)) out.push(p);
  return out;
}
const POS_MAP = [[/INTERIOR|\bDL\b|\bDT|NOSE/i, 'DL'], [/RUSH|EDGE|\bDE\b/i, 'EDGE'], [/\bLB|BACKER/i, 'LB'], [/CORNER|\bCB/i, 'CB'], [/SAF|\bS\b/i, 'S'], [/QUARTER|\bQB/i, 'QB'], [/RUNNING|\bRB|\bHB/i, 'RB'], [/RECEIVER|\bWR|\bX\b/i, 'WR'], [/TIGHT|\bTE/i, 'TE'], [/\bLINE|\bOL/i, 'OL']];
const posShort = (pl) => { const s = String(pl.name || ''); for (const [re, k] of POS_MAP) if (re.test(s)) return k; return s.split(/\s+/).map((w) => w[0]).join('').slice(0, 3).toUpperCase(); };
/* one cap height on the main screen; the role's letters fill the frame's width */
const posSize = (k, big) => big ? (k.length <= 1 ? 320 : k.length === 2 ? 270 : k.length === 3 ? 210 : 180) : 100;
const crestHTML = () => `<span class="crest"><img src="logos/${esc(SC.logo)}.png" alt=""></span>`;
const placeName = () => { const team = String((SC.about && SC.about.team) || SC.name).replace(/^THE\s+/i, ''); const nick = String(SC.nick || '').trim();
  const t = (nick && team.toUpperCase().endsWith(nick.toUpperCase()) ? team.slice(0, team.length - nick.length).trim() : team.split(/\s+/)[0]) || team.split(/\s+/)[0]; return tcase(t); };
const whoBuilt = () => { const team = String((SC.about && SC.about.team) || SC.name).replace(/^THE\s+/i, ''); const nick = String(SC.nick || '').trim();
  /* the place is the team name with the nickname taken off (New England, Alabama); the first word only when there is no nickname to take off */
  const t = (nick && team.toUpperCase().endsWith(nick.toUpperCase()) ? team.slice(0, team.length - nick.length).trim() : team.split(/\s+/)[0]) || team.split(/\s+/)[0]; return `${tcase(t)} built them`; };
/* ---------- HISTORY & PERSONNEL (the offenses, built to the board 2026-09-14):
   the story of the offense on eight columns (what they do, what they like to
   do, the numbers, what we take from it), the players as a rail of five rows
   with a big position and the number, no pictures; a row opens the player. ---------- */
const POSNAME = { QB: 'Quarterback', WR: 'Wide receiver', TE: 'Tight end', RB: 'Running back', OL: 'Offensive line' };
const stampify = (t) => esc(t).replace(/\{(\w+)\|([^}]+)\}/g, '<span class="stamp">$2</span>');
function historyStage() {
  const P = SC.personnel || {}, players = P.players || [], ab = SC.about || {}, lay = L();
  const stats = (ab.stats || []).slice(0, 5), quote = (ab.extras || []).find((x) => x.kind === 'quote'), pr = (ab.principles || []).slice(0, 3);
  const paper = `<div class="h26">What ${esc(placeName())} does</div>${(ab.copy || []).map((t) => `<div class="t">${stampify(t)}</div>`).join('')}
    <div class="rule"></div><div class="nums n${stats.length}">${stats.map((x) => `<div class="num"><b>${esc(String(x.value))}${x.id === 'winpct' ? '%' : ''}</b><u>${esc(x.label)}</u></div>`).join('')}</div>
    ${pr.length ? `<div class="rule"></div><div class="k team">What we take from it</div><div class="take">${pr.map((p) => `<div><div class="h26 s22">${esc(tcase(p.title))}</div><div class="t s15">${esc(p.blurb || '')}</div></div>`).join('')}</div>` : ''}
    ${quote ? `<div class="quote">&ldquo;${esc(quote.text)}&rdquo;</div>` : ''}`;
  const rows = players.map((g, i) => { const pl = g.player || {}; const pos = pl.pos || posShort(g);
    return `<a class="prow" href="#role/${i}"><span class="posbox"><b>${esc(pos)}</b>${pl.number ? `<i>#${esc(String(pl.number))}</i>` : ''}</span><span class="pt"><span class="nm">${esc(nice(pl.name || g.name, true))}</span><span class="pos">${esc(POSNAME[pos] || nice(g.name, true))}</span><span class="ln">${esc(pl.line || '')}</span></span><span class="go">&rsaquo;</span></a>`; }).join('');
  return `${head('History &amp; Personnel', `The ${esc(SC.nick || shortName())} Offense`, esc(tcase(String(ab.era || '').toLowerCase())))}
    <div class="paper t3 hist2" style="${at(X(1), 176, CW(8), lay.H - 80 - 176 - 16)}"><span class="tape" style="left:300px;top:-14px"></span><div class="in">${paper}</div></div>
    <div class="frame roster" style="${at(X(9), 176, CW(4), lay.H - 80 - 176 - 16)}"><div class="rh">The players &middot; tap one</div>${rows}</div>`;
}
/* the player: a big position and the number in the frame, who he is and what
   he is good at on one paper, what the role is built for on the other */
function playerStage(i, H = 900) {
  const P = SC.personnel || {}, players = P.players || [], g = players[i]; if (!g) return '';
  const pl = g.player || {}, pos = pl.pos || posShort(g), ab = SC.about || {}, n = players.length;
  const era = pl.era ? tcase(String(pl.era).toLowerCase()) : '';
  const good = (pl.goodAt || []).map((x) => `<div class="quote tight">${esc(x)}</div>`).join('');
  const nums = (pl.nums || []).slice(0, 3);
  return `${head(`History &amp; Personnel &middot; player ${i + 1} of ${n}`, esc(nice(pl.name || g.name, true)), esc(POSNAME[pos] || nice(g.name, true)) + (era ? ' &middot; ' + esc(era) : ''), headRight('', arrowsHTML(i + 1, n)))}
    <div class="frame" style="${at(X(1), 176, CW(4), 644)}"><div class="tv locker big"><img class="wm" src="logos/${esc(SC.logo)}.png" alt=""><span class="k">The position</span><span class="pos" style="font-size:${posSize(pos, true)}px">${esc(pos)}</span>${pl.number ? `<span class="jersey">#${esc(String(pl.number))}</span>` : ''}<span class="plate2">${esc(POSNAME[pos] || nice(g.name, true))}</span></div></div>
    <div class="paper t3 pp" style="${at(X(5), 176, CW(4), 644)}"><span class="tape" style="left:150px;top:-14px"></span><div class="in"><div class="h26">Who he is</div><div class="t">${stampify(pl.bio || '')}</div>
      ${good ? `<div class="rule"></div><div class="k team">What he is good at</div>${good}` : ''}
      ${nums.length ? `<div class="rule"></div><div class="nums n3">${nums.map(([v, l]) => `<div class="num"><b>${esc(v)}</b><u>${esc(l)}</u></div>`).join('')}</div>` : ''}</div></div>
    <div class="paper t2 pp" style="${at(X(9), 176, CW(4), 644)}"><span class="tape" style="left:150px;top:-14px"></span><div class="in"><div class="h26">What the role is built for</div>${(pl.roleFor || []).map((t) => `<div class="t">${esc(t)}</div>`).join('')}
      ${pl.oneLine ? `<div class="rule"></div><div class="k team">In one line</div><div class="quote">${esc(pl.oneLine)}</div>` : ''}</div></div>`;
}
function personnelStage() {
  if (HIST()) return historyStage();
  const P = SC.personnel || {}, players = P.players || [], ab = SC.about || {}, lay = L(), fh = lay.frame.h;
  if (!players.length) return head('Personnel', 'Nobody yet', 'no personnel authored for this scheme');
  const cw = Math.floor(1000 / players.length);
  /* five locker panels: the crest stencilled in the corner, the position in
     the middle, the nameplate and the players who played it at the foot */
  const stand = (pl, i) => { const k = posShort(pl), who = (pl.lineage || []).map((c) => esc(nice(c.name, true))).join(' &middot; ');
    return `<a class="stand" href="#role/${i}" style="left:${i * cw}px;width:${cw}px"><img class="stencil" src="logos/${esc(SC.logo)}.png" alt=""><span class="pos" style="font-size:${posSize(k)}px">${esc(k)}</span><span class="plate2">${esc(nice(pl.name, true))}</span><span class="who">${who}</span></a>`; };
  const stampify = (t) => esc(t).replace(/\{(\w+)\|([^}]+)\}/g, '<span class="stamp">$2</span>');
  const stats = ab.stats || [], quote = (ab.extras || []).find((x) => x.kind === 'quote');
  const paper = `<div class="h26">${esc(nice(ab.headline || 'What they built', true))}</div>${(ab.copy || []).map((t) => `<div class="t s15">${stampify(t)}</div>`).join('')}
    <div class="rule"></div><div class="stats">${stats.map((x) => `<div class="stat"><b>${esc(String(x.value))}${x.id === 'winpct' ? '%' : ''}</b><u>${esc(x.label)}</u></div>`).join('')}</div>
    ${quote ? `<div class="quote">&ldquo;${esc(quote.text)}&rdquo;</div>` : ''}`;
  const full = P.full && P.full.img ? `<button class="btn sm" data-lineup>${esc(P.full.label || 'See the full personnel')}</button>` : '<span></span>';
  return `${head('Personnel &amp; history', 'Who runs it', esc(whoBuilt()))}
    <div class="frame" style="${at(44, 176, 1000, fh)}"><div class="tv locker">${players.map(stand).join('')}</div></div>
    ${rail('', { html: paper, cls: 'hist' }, lay)}
    <div class="foot" style="${at(44, lay.foot.y, 1000, 80)}">${full}<span class="cue">Tap a group to open the role and the players who played it<i></i></span></div>`;
}
/* the role: the frame holds the position, the crest as a watermark and the
   vitals; the two papers take the height their writing needs */
function roleStage(i, H = 900) {
  if (HIST()) return playerStage(i, H);
  const P = SC.personnel || {}, players = P.players || [], roles = P.roles || {};
  const pl = players[i]; if (!pl) return '';
  const r = roles[pl.roleRef] || {}, k = posShort(pl), men = pl.lineage || [];
  const traits = (r.wants || []).map((w) => ({ name: w[0], note: w[1] || '', plays: wantPlays(SC, w[0], r) }));
  const call = (r.plays || []).map((id) => playOf(SC, id)).filter(Boolean)[0];
  const tiles = traits.map((t, j) => `<div class="tile${j ? '' : ' lead'}"><u>${j ? 'wanted' : 'must have'}</u><b>${esc(nice(t.name, true))}</b><i>${t.plays.length ? t.plays.length + ' calls lean on it' : esc(t.note || 'the calls lean on it')}</i></div>`).join('');
  const models = men.map((m) => `<div class="rule"></div><div class="model"><img src="${esc(teamLogo(m.team) || 'logos/' + SC.logo + '.png')}" alt=""><div><div class="h26 s22">${esc(nice(m.name, true))}</div><div class="k team s12">${esc(m.team || '')}${m.era ? ' &middot; ' + esc(m.era) : ''}</div></div></div>
    <div class="chips">${(m.stats || []).map((x) => `<span class="chip plain">${esc(x)}</span>`).join('')}</div>${m.brought ? `<div class="t s14">${esc(m.brought)}</div>` : ''}`).join('');
  const vital = (l, v) => `<div class="v"><u>${l}</u><b>${esc(v)}</b></div>`;
  const vitals = [vital(`In this ${SIDEWORD(SC)}`, nice(pl.name, true)), traits[0] ? vital('Non negotiable', nice(traits[0].name, true)) : '', call ? vital('Featured call', call.name) : '', vital('Built like', `${men.length} player${men.length !== 1 ? 's' : ''}`), vital('Role', `${i + 1} of ${players.length}`)].join('');
  const act = call ? `<a class="btn sm" href="#play/${esc(call.id)}">Open ${esc(call.name)}</a>` : '';
  return `${head(`Personnel &middot; role ${i + 1} of ${players.length}`, esc(nice(pl.name, true)), '', headRight(act, arrowsHTML(i + 1, players.length)))}
    <div class="frame" style="${at(44, 176, 488, 644)}"><div class="tv locker one"><img class="wm" src="logos/${esc(SC.logo)}.png" alt=""><span class="k">The position</span><span class="pos" style="font-size:${posSize(k, true)}px">${esc(k)}</span><span class="plate2">${esc(nice(r.role || pl.name, true))}</span><div class="vitals">${vitals}</div></div></div>
    <div class="paper t3 want" style="left:556px;top:176px;width:488px;max-height:644px"><span class="tape" style="left:150px;top:-14px"></span><div class="in"><div class="h26">What we want</div><div class="jobs">${(r.jobs || []).map((j, n) => `<div class="adj"><b>${n + 1}</b><span>${esc(nice(j))}</span></div>`).join('')}</div>
      <div class="rule"></div><div class="h26">The non negotiables</div><div class="tiles">${tiles}</div></div></div>
    <div class="rail auto" style="left:1068px;top:176px;width:488px;max-height:644px"><div class="paper t2 hist"><span class="tape" style="left:150px;top:-14px"></span><div class="in"><div class="h26">Built like</div><div class="t s14" style="margin-top:4px">the players who played it</div>${models}</div></div></div>`;
}
function openRole() {
  const players = (SC.personnel && SC.personnel.players) || []; if (!players[AT]) return false;
  closeModal(); app.insertAdjacentHTML('beforeend', `<div class="modal"><div class="scrim" data-close></div><div class="box"><div class="stage" style="--h:900">${roleStage(AT)}</div><a class="x" href="#personnel" aria-label="Close">&times;</a></div></div>`);
  const w = $('.stagewrap'); if (w) w.classList.add('blurred'); document.body.classList.add('lock'); return true;
}
/* the full personnel grouping, the playbook's own sheet, over the blurred stage */
function openLineup() { const P = SC.personnel || {}; if (!P.full || !P.full.img) return; closeLineup();
  app.insertAdjacentHTML('beforeend', `<div class="modal lineup"><div class="scrim" data-close-lineup></div><div class="box"><img src="${esc(P.full.img)}" alt="${esc(P.full.label || '')}"><a class="x" data-close-lineup aria-label="Close">&times;</a></div></div>`);
  const w = $('.stagewrap'); if (w) w.classList.add('blurred'); document.body.classList.add('lock'); }
function closeLineup() { const m = $('.modal.lineup'); if (!m) return; m.remove(); const w = $('.stagewrap'); if (w) w.classList.remove('blurred'); document.body.classList.remove('lock'); }

/* ---------- THE COVERAGES: a scheme of coverages has no install. Its section
   lists the breakdown films; each coverage is its own screen: the game
   picture with the dots and their rules in the frame, the drawing as a
   switch on its corner, the notes on the rail, the film in the foot. ---------- */
const covShort = (p) => String(p.name).replace(/^Cover 4\s+/i, '');
function coveragesStage() {
  const lay = L(), H = STAGE_H, list = SC.plays, ink = inkedSet(), pr = (SC.about && SC.about.principles) || [];
  const rowH = 96, gap = 12, y0 = 176, avail = H - 80 - 16 - y0, n = list.length;
  const h = Math.min(rowH, Math.floor((avail - gap * (n - 1)) / n));
  const rows = list.map((p, i) => `<a class="filmrow" href="#coverage/${esc(p.id)}" style="${at(44, y0 + i * (h + gap), 1000, h)}"><span class="n">0${i + 1}</span><span class="thumb">${ytId(p.videoUrl) ? `<img src="https://img.youtube.com/vi/${esc(ytId(p.videoUrl))}/mqdefault.jpg" alt="" onerror="this.onerror=null;this.src='${esc(p.heroShot || p.shot || '')}'">` : ''}<i></i></span><span class="bd"><span class="nm">${esc(covShort(p))}</span><span class="k2">${esc(p.sub || p.formation || '')}${ink.has(p.id) ? ' &middot; on the sheet' : ''}</span>${(p.beats || []).length ? `<span class="beats"><u>Beats</u>${p.beats.map((b) => `<span class="chip">${esc(b)}</span>`).join('')}</span>` : ''}</span><span class="go">&rsaquo;</span></a>`).join('');
  const paper = `<div class="h26">What match is</div>${pr[0] ? `<div class="t s15">${esc(pr[0].blurb)}</div>` : ''}<div class="rule"></div>${pr.slice(1).map((x, i) => `<div class="adj"><b>${i + 2}</b><span><span class="ttl">${esc(nice(x.title, true))}</span>${esc(x.blurb)}</span></div>`).join('')}`;
  return `${head(`${esc(SC.series || 'The series')} &middot; ${n} breakdowns`, 'The coverages', esc(SC.taglineSub || 'quarters, then palms, then the rest'), headRight(`<a class="btn sm" href="#coverage/${esc(list[0].id)}">Start with ${esc(covShort(list[0]))} <em>&rarr;</em></a>`))}${rows}<div class="rail auto" style="left:1068px;top:176px;width:488px;max-height:${H - 80 - 176}px"><div class="paper t2 hist"><span class="tape" style="left:150px;top:-14px"></span><div class="in">${paper}</div></div></div>`;
}
window.skFitShot = (img) => { const box = img.closest('.shotbox'), inn = img.closest('.shotin'); if (!box || !inn || !img.naturalWidth) return;
  const W = box.clientWidth, H = box.clientHeight, ar = img.naturalWidth / img.naturalHeight; const w = Math.min(W, H * ar), h = w / ar; inn.style.width = w + 'px'; inn.style.height = h + 'px'; spotPop(); };
function covStage(p, mode, j, n, H) {
  const lay = L(H), ink = inkedSet().has(p.id), spots = p.spots || [], macros = p.macros;
  const inkBtn = '';
  const eyebrow = `${mode === 'modal' ? 'The coverage' : 'The coverages'} &middot; ${j + 1} of ${n}${p.sub ? ' &middot; ' + esc(p.sub) : ''}`;
  const filmId = FILM === p.id ? ytId(p.videoUrl) : FILM && FILM !== p.id && macros ? ytId(FILM) : '';
  const lit = new Set(); if (SPOT) { const sp = spots.find((x) => x.id === SPOT); if (sp && sp.k === 'r') spots.forEach((d) => { if ((d.reads || []).includes(SPOT)) lit.add(d.id); }); }
  const dots = spots.map((sp) => `<button class="dot ${sp.k}${SPOT === sp.id ? ' on' : ''}${lit.has(sp.id) ? ' lit' : ''}" style="left:${sp.x}%;top:${sp.y}%" data-spot="${esc(sp.id)}" title="${esc(sp.t)}">${sp.n}</button>`).join('');
  let inner;
  if (filmId) inner = `<div class="film"><iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(filmId)}?autoplay=1&rel=0&modestbranding=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe></div><button class="btn gh" data-film="off" style="position:absolute;right:12px;top:12px;height:40px;padding:0 14px;font-size:13px;z-index:3">Back ${macros ? 'to the macros' : COVVIEW === 'card' ? 'to the drawing' : 'to the picture'} &times;</button>`;
  else if (macros) inner = `<div class="plate">${esc(p.formation || '')}</div>${tileHTML(p.formation)}`;
  else if (COVVIEW === 'card' || !p.shot) inner = `<div class="sw"><button class="plate off" data-covview="shot">The picture</button><button class="plate" data-covview="card">The drawing</button></div>${plainArt(p)}`;
  else inner = `<div class="sw"><button class="plate" data-covview="shot">The picture</button><button class="plate off" data-covview="card">The drawing</button></div><div class="shotbox"><div class="shotin"><img src="${esc(p.shot)}" alt="" onload="skFitShot(this)">${dots}</div></div>`;
  const notes = (p.notes || []).map((nt, k) => `${k ? '<div class="rule"></div>' : ''}<div class="h26">${esc(nt.t)}</div><ul class="bul">${nt.b.map((b) => `<li>${b}</li>`).join('')}</ul>`).join('');
  const legend = p.legend ? `<div class="rule"></div><div class="t s14">${p.legend}</div>` : '';
  const macroPaper = macros ? `<div class="h26">The two tip films</div><div class="t s14" style="margin-top:4px">where the install ends, these go deeper</div>${macros.breakdowns.map((b) => `<a class="filmrow sm" href="${esc(b.video)}" data-macrofilm="${esc(b.video)}"><span class="thumb"><img src="${esc(b.img)}" alt=""><i></i></span><span class="bd"><span class="nm">${esc(b.t)}</span><span class="k2">King Reggie goes deeper</span></span></a>`).join('')}` : '';
  const paper = macros ? macroPaper : (notes || p.whenToUse ? `${notes || `<div class="h26">When to call it</div><div class="t">${esc(p.whenToUse)}</div>`}${legend}` : '');
  const cue = spots.length ? `<span class="cue">Tap a player for his rule<i></i></span>` : '';
  return `${head(eyebrow, esc(covShort(p)), '', headRight(inkBtn, arrowsHTML(j + 1, n)))}${frame(inner, lay)}<div class="rail auto" style="left:1068px;top:176px;width:488px;max-height:${lay.H - 80 - 176}px"><div class="paper t2 cov"><span class="tape" style="left:150px;top:-14px"></span><div class="in">${paper}</div></div></div>${foot(`<div class="footl">${COVVIEW === 'card' || !p.shot ? animBtn(p) : ''}${watchHTML(p)}</div>`, cue, lay)}`;
}
/* the rule on the dot: the pop-up beside it, inside the frame's edge */
function spotPop() {
  document.querySelectorAll('.spotpop').forEach((x) => x.remove());
  const c = curPlay(); if (!c || !SPOT || !c.p.spots) return;
  const st = SEC === 'play' ? $('.modal .stage') : $('.stage'); const dot = st && st.querySelector('.dot.on'); if (!dot) return;
  const sp = c.p.spots.find((x) => x.id === SPOT); if (!sp) return;
  const sc = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(SEC === 'play' ? '--s2' : '--s'));
  const a = dot.getBoundingClientRect(), b = st.getBoundingClientRect(), H = SEC === 'play' ? 900 : STAGE_H;
  const dx = (a.left - b.left) / sc, dy = (a.top - b.top) / sc, right = dx > 640;
  const left = Math.round(right ? dx - 340 : dx + 44), top = Math.max(176, Math.min(Math.round(dy - 16), H - 80 - 24 - 220));
  st.insertAdjacentHTML('beforeend', `<div class="keypop spotpop paper t4${right ? '' : ' flipped'}" style="left:${left}px;top:${top}px;width:316px"><i class="tip"></i><div class="in"><div class="k team">${esc(sp.t)}${sp.s ? ' &middot; ' + sp.s : ''}</div><div class="h26 s22">${esc(sp.n)}${sp.k === 'r' ? ' &middot; the read' : ''}</div><ul class="bul s14">${(sp.r || []).map((x) => `<li>${x}</li>`).join('')}</ul></div></div>`);
}
function spotStep(d) { const c = curPlay(); if (!c || !c.p.spots) return; const ds = c.p.spots.filter((x) => x.k === 'd'); if (!ds.length) return;
  const i = ds.findIndex((x) => x.id === SPOT); const k = i < 0 ? (d > 0 ? 0 : ds.length - 1) : i + d; SPOT = (k < 0 || k >= ds.length) ? null : ds[k].id; repaint(); }
/* the notes on an added call save as they are typed */
document.addEventListener('input', (e) => { const t = e.target && e.target.closest && e.target.closest('[data-ynote]'); if (!t) return; planRead().notes[t.dataset.ynote] = t.value; savePlan(); });

/* ---------- the router ---------- */
function parseHash() { const h = (location.hash || '#front').slice(1).split('/'); return { sec: h[0] || 'front', at: Math.max(0, parseInt(h[1] || '0', 10) || 0), id: decodeURIComponent(h.slice(1).join('/') || '') }; }
function render() {
  const { sec, at: a, id } = parseHash(); const prev = SEC, prevAt = AT, prevId = PLAYID;
  /* the takeover opens and closes over the rows without rebuilding them */
  /* the takeover opens over All Plays or the intro without rebuilding them; closing over All Plays keeps the scroll, closing over the intro repaints it (a chip may have been inked) */
  if (sec === 'play' && (prev === 'plays' || prev === 'intro' || (prev === 'drives' && DRIVEB)) && $('.stagewrap') && !$('.modal')) { UNDER = prev; SEC = 'play'; PLAYID = id; RD = 0; FILM = null; if (openModal()) { const d = $('.dock'); if (d) d.outerHTML = dockHTML(); document.title = `${SC.name} · Play`; return; } }
  if (sec === 'book' && prev === 'plays' && $('.stagewrap') && !$('.modal')) { UNDER = 'plays'; SEC = 'book'; if (openBook()) { const d = $('.dock'); if (d) d.outerHTML = dockHTML(); document.title = `${SC.name} · The book`; return; } }
  if (sec === 'plays' && prev === 'book' && $('.modal') && $('.stagewrap')) { closeModal(); SEC = 'plays'; }
  if (sec === 'drives' && prev === 'play' && UNDER === 'drives' && DRIVEB && $('.modal') && $('.stagewrap')) { closeModal(); SEC = 'drives'; PLAYID = ''; RD = 0; FILM = null; const d = $('.dock'); if (d) d.outerHTML = dockHTML(); document.title = `${SC.name} · Drives`; return; }
  if (sec === 'plays' && prev === 'play' && UNDER === 'plays' && $('.modal') && $('.stagewrap')) { closeModal(); SEC = 'plays'; PLAYID = ''; RD = 0; FILM = null; const d = $('.dock'); if (d) d.outerHTML = dockHTML(); document.title = `${SC.name} · All plays`; return; }
  if (sec === 'role' && prev === 'personnel' && $('.stagewrap') && !$('.modal')) { SEC = 'role'; AT = a; if (openRole()) { const d = $('.dock'); if (d) d.outerHTML = dockHTML(); document.title = `${SC.name} · Personnel`; return; } }
  if (sec === 'personnel' && prev === 'role' && $('.modal') && $('.stagewrap')) { closeModal(); SEC = 'personnel'; const d = $('.dock'); if (d) d.outerHTML = dockHTML(); document.title = `${SC.name} · Personnel`; return; }
  popClose(); if (sec !== prev) { drawerClose(); dbxClose(true); closeLineup(); builderExit(); }
  if (sec !== 'play') UNDER = 'plays';
  if (sec === 'coverage' && (prev !== 'coverage' || id !== prevId)) { SPOT = null; FILM = null; COVVIEW = 'shot'; }
  SEC = sec; AT = a; PLAYID = id; if (SEC !== prev || (SEC === 'play' && id !== prevId)) { RD = 0; FILM = null; } if (AT !== prevAt || SEC !== prev) TSEL = 0;
  STAGE_H = stageH(); scale();
  AREAS = AREAS_OF();
  document.title = `${SC.name} · ${(AREAS.find((x) => x[0] === SEC) || ['', SEC === 'play' ? 'Play' : SEC === 'book' ? 'The book' : SEC === 'role' ? 'Personnel' : SEC === 'coverage' ? 'Coverages' : 'The front'])[1]}`;
  let body = '';
  if (SEC === 'front') body = frontHTML();
  else if (SEC === 'intro') body = stagewrap(introStage(), STAGE_H, 'in');
  else if (SEC === 'install') { const s = installSlides(); AT = Math.min(AT, s.length - 1); body = stagewrap(s[AT].html(AT, s.length), STAGE_H, 'in'); }
  else if (SEC === 'plays' || SEC === 'play') { const pg = playsPage(); body = stagewrap(pg.html, pg.h); }
  else if (SEC === 'book') { const pg = playsPage(); body = stagewrap(pg.html, pg.h); }
  else if (SEC === 'sheet') { const sh = sheetStage(); body = stagewrap(sh.html, STAGE_H, 'in', sh.live); }
  else if (SEC === 'drives' && hasBuilder()) { builderExit(); const bs = builderStage(); body = stagewrap(bs.html, STAGE_H, 'in') + bs.host; }
  else if (SEC === 'drives') { const dr = drivesStage(); body = stagewrap(dr.html, dr.h, 'in'); }
  else if (SEC === 'board') { BOARD = boardStage(); body = stagewrap(BOARD.html, STAGE_H, 'in', BOARD.live); }
  else if (SEC === 'personnel' || SEC === 'role') body = stagewrap(personnelStage(), STAGE_H, 'in');
  else if (SEC === 'coverages') body = stagewrap(coveragesStage(), STAGE_H, 'in');
  else if (SEC === 'coverage') { const c = curPlay(); if (!c) { location.hash = '#coverages'; return; } body = stagewrap(covStage(c.p, 'screen', c.j, c.n, STAGE_H), STAGE_H, 'in'); }
  else body = stagewrap(`${head((AREAS.find((x) => x[0] === SEC) || ['', SEC])[1], 'Re-housed next', '')}<div class="later"><div class="t">This area keeps its page in the old room for now and moves onto the stage after the front, the intro, the install and All Plays.</div><a class="btn" href="${OLD(SEC)}">Open it there <em>&rarr;</em></a></div>`);
  if (typeof skWhoRender === 'function') setTimeout(skWhoRender, 0);
  app.innerHTML = `<div class="bg" style="--room:url('${esc((() => { const a = SC.about || {}; const pic = (SEC === 'front' && a.front) || a.room; return pic ? new URL(pic, location.href).href : ''; })())}')"><i class="p1"></i><i class="veil"></i><i class="grain"></i></div><div class="hound"></div>${body}${dockHTML()}`;
  parallax();
  if (SEC === 'book') openBook();
  if (SEC === 'front') wireFront();
  if (SEC === 'sheet') sheetMount();
  if (SEC === 'drives' && hasBuilder()) builderMount();
  if (SEC === 'board') boardWire(SC, BOARD.model);
  if (SEC === 'role') { if (!openRole()) location.hash = '#personnel'; }
  document.body.classList.toggle('lock', false);
  if (SEC === 'play') { if (!openModal()) location.hash = '#plays'; }
  if (SEC === 'plays' && ROWY != null) { scrollTo(0, ROWY); ROWY = null; } else scrollTo(0, 0);
  keyPop(); spotPop();
}
/* repaint the stage on screen in place, so a key or an ink does not restart the entrance */
function repaint() { if (SEC === 'role') { const st = $('.modal .stage'); if (st) { st.innerHTML = roleStage(AT); return; } }
  const c = curPlay(); if (!c && SEC !== 'install') return render();
  const st = SEC === 'play' ? $('.modal .stage') : $('.stage'); if (!st) return render();
  const dbl = st.querySelector('.dbl') ? st.querySelector('.dbl').outerHTML : '';
  if (SEC === 'install') st.innerHTML = dbl + installSlides()[AT].html(AT, installSlides().length) + camBox(STAGE_H);
  else if (SEC === 'coverage') st.innerHTML = dbl + covStage(c.p, 'screen', c.j, c.n, STAGE_H) + camBox(STAGE_H);
  else if (SEC === 'plays') { const rows = $('.rows', st); const keep = rows ? rows.outerHTML : ''; st.innerHTML = dbl + playStage(c.p, 'focus', c.j, c.n) + keep + camBox(STAGE_H); document.querySelectorAll('.rows .card').forEach((x) => x.classList.toggle('pick', +x.dataset.row === PICK)); }
  else st.innerHTML = playStage(c.p, 'modal', c.j, c.n, null, 900);
  const d = $('.dock'); if (d) d.outerHTML = dockHTML(); keyPop(); spotPop(); }
/* THE KEY POP-UP: the open key's description on a small paper beside the
   rail, over the frame's edge, pointing at its line; never inside the paper */
function keyPop() {
  document.querySelectorAll('.keypop').forEach((x) => x.remove());
  const c = curPlay(); if (!c || !RD) return;
  const st = SEC === 'play' ? $('.modal .stage') : $('.stage'); const li = st && st.querySelector('.keylist li.on'); if (!li) return;
  const r = (c.p.reads || [])[RD - 1]; if (!r) return;
  const sc = parseFloat(getComputedStyle(document.documentElement).getPropertyValue(SEC === 'play' ? '--s2' : '--s'));
  const a = li.getBoundingClientRect(), b = st.getBoundingClientRect(), H = SEC === 'play' ? 900 : STAGE_H;
  const left = Math.round((a.left - b.left) / sc) - 340, top = Math.min(Math.round((a.top - b.top) / sc) - 14, H - 80 - 24 - 170);
  st.insertAdjacentHTML('beforeend', `<div class="keypop paper t4" style="left:${left}px;top:${top}px;width:316px"><i class="tip"></i><div class="in"><div class="k team">${RDWORD(SC)} ${RD} of ${(c.p.reads || []).length}</div><div class="h26 s22">${esc(r.label)}</div><div class="t s14">${esc(r.text)}</div></div></div>`);
}
const go = (n) => { location.hash = `#${SEC}/${n}`; };
function step(d) { if (SEC !== 'install') return; const n = installSlides().length; if (!n) { location.hash = '#coverages'; return; }
  const nx = AT + d; if (nx < 0) { location.hash = '#intro'; return; } if (nx >= n) { location.hash = '#sheet'; return; } go(nx); }
function landKey(d) { const c = curPlay(); if (!c) return false; const n = (c.p.reads || []).length;
  const nx = RD + d; if (nx < 0 || nx > n) return false; RD = nx; repaint(); if (SC.side === 'D') return true; const art = $('[data-card] .art'); if (art) { art.classList.add('flash'); setTimeout(() => art.classList.remove('flash'), 450); } return true; }
function inkCurrent() { const c = curPlay(); if (!c || COV()) return; const on = !inkedSet().has(c.p.id);
  const from = SEC === 'play' ? $('.modal [data-ink]') : $('.stage [data-ink]'); const a = from && on ? from.getBoundingClientRect() : null;
  inkPlay(c.p.id, on); repaint(); toast(on ? `${c.p.name} is on the sheet` : `${c.p.name} pulled back off the sheet`);
  if (a) inkFly(c.p.name, a); }
/* the name lifts off the button, arcs down to the Call sheet door and lands; the door and the count bump */
function inkFly(name, a) {
  const dock = $('.dock .areas a[href="#sheet"]'); if (!dock || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const b = dock.getBoundingClientRect();
  const el = document.createElement('div'); el.className = 'fly'; el.textContent = name; document.body.appendChild(el);
  const r = el.getBoundingClientRect();
  const x0 = a.left + a.width / 2 - r.width / 2, y0 = a.top + a.height / 2 - r.height / 2, x1 = b.left + b.width / 2 - r.width / 2, y1 = b.top + b.height / 2 - r.height / 2;
  const anim = el.animate([
    { transform: `translate(${x0}px,${y0}px) scale(1) rotate(0deg)`, opacity: 1 },
    { transform: `translate(${(x0 + x1) / 2}px,${Math.min(y0, y1) - 90}px) scale(1.08) rotate(-4deg)`, opacity: 1, offset: .45 },
    { transform: `translate(${x1}px,${y1}px) scale(.25) rotate(0deg)`, opacity: 0 }], { duration: 720, easing: 'cubic-bezier(.4,0,.2,1)' });
  anim.onfinish = () => { el.remove(); const d = $('.dock .areas a[href="#sheet"]'), m = $('.dock .meter b'); [d, m].forEach((x) => { if (!x) return; x.classList.remove('bump'); void x.offsetWidth; x.classList.add('bump'); }); };
}
/* THE SWITCH between two plays: the slab, the frame and the paper slide out
   the way you are going, the next ones slide in behind them */
function swap(d, paint) {
  const st = SEC === 'play' ? $('.modal .stage') : $('.stage'); if (!st || !d) return paint();
  st.classList.add(d > 0 ? 'out-l' : 'out-r');
  setTimeout(() => { paint(); st.classList.remove('out-l', 'out-r'); st.classList.add(d > 0 ? 'in-r' : 'in-l'); void st.offsetWidth; st.classList.remove('in-r', 'in-l'); }, 230);
}
function pick(n, d) { const N = PICKLIST.length; if (!N) return; PICK = ((n % N) + N) % N; RD = 0; FILM = null; if (!$('.stage')) return render(); swap(d, repaint); }
function flip(d) {
  if (SEC === 'install') { step(d); return; }
  if (SEC === 'plays') { pick(PICK + d, d); return; }
  if (SEC === 'coverage') { const c = curPlay(); if (!c) return; const k = ((c.j + d) % c.n + c.n) % c.n; PLAYID = c.list[k].id; SPOT = null; FILM = null; COVVIEW = 'shot'; history.replaceState(null, '', '#coverage/' + PLAYID); swap(d, repaint); return; }
  if (SEC === 'role') { const n = ((SC.personnel && SC.personnel.players) || []).length; if (!n) return; AT = ((AT + d) % n + n) % n; history.replaceState(null, '', '#role/' + AT); swap(d, repaint); return; }
  if (SEC === 'play') { const c = curPlay(); if (!c || !c.list.length) return; const k = ((c.j + d) % c.list.length + c.list.length) % c.list.length;
    PLAYID = c.list[k].id; RD = 0; FILM = null; history.replaceState(null, '', '#play/' + PLAYID); swap(d, repaint); }
}

addEventListener('hashchange', render);
addEventListener('keydown', (e) => {
  if (e.target && e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
  if (SEC === 'sheet') { if (e.key === 'Escape' && SHEETFS) sheetFS(false); else if (e.key === 'p' || e.key === 'P') { e.preventDefault(); presentStep(); } return; }
  if (e.key === 'ArrowRight') { e.preventDefault(); if (SEC === 'intro') location.hash = COV() ? '#coverages' : '#install/0'; else if (SEC === 'coverages') location.hash = '#coverage/' + SC.plays[0].id; else flip(1); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); if (SEC === 'intro') location.hash = '#front'; else flip(-1); }
  else if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); if (SEC === 'coverage' || (SEC === 'play' && curPlay() && curPlay().p.spots)) { spotStep(1); return; } if (!landKey(1)) flip(1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); landKey(-1); }
  else if (e.key === 'ArrowDown') { e.preventDefault(); landKey(1); }
  else if (e.key === 'Enter') { e.preventDefault(); inkCurrent(); }
  else if (e.key === 'Escape') { if (SHEETFS) { sheetFS(false); return; } if (POP) { popClose(); return; } if (dbxIsOpen()) { dbxClose(false); return; } if (drawerOpen()) { drawerClose(); return; } if ($('.modal.lineup')) { closeLineup(); return; } location.hash = SEC === 'play' ? '#' + UNDER : SEC === 'book' ? '#plays' : SEC === 'role' ? '#personnel' : SEC === 'coverage' ? '#coverages' : '#front'; }
  else if (e.key === 'c' || e.key === 'C') { CAM = !CAM; const st = $('.stagewrap .stage'); if (!st) return; const c = $('.cam', st); if (c) c.remove(); if (CAM) st.insertAdjacentHTML('beforeend', camBox(STAGE_H)); }
});
app.addEventListener('click', (e) => {
  if (e.target.closest('[data-close]')) { location.hash = SEC === 'role' ? '#personnel' : '#' + UNDER; return; }
  if (e.target.closest('[data-close-lineup]')) { closeLineup(); return; }
  if (e.target.closest('[data-lineup]')) { openLineup(); return; }
  const nw = e.target.closest('[data-new]'); if (nw) { dbxOpen(SC, null, nw.dataset.new || null); return; }
  const sm = e.target.closest('[data-slotmenu]'); if (sm) { e.stopPropagation(); slotMenu(SC, sm, sm.dataset.slotmenu, () => render()); return; }
  if (e.target.closest('[data-newpocket]')) { newPocket(); return; }
  const pk = e.target.closest('[data-pocket]'); if (pk) { e.stopPropagation(); pocketMenu(pk, pk.dataset.pocket); return; }
  const del = e.target.closest('[data-del]'); if (del) { e.stopPropagation(); const plan = planRead(); plan.drives = plan.drives.filter((d) => d.id !== del.dataset.del); planWrite(); render(); toast('Script torn up'); return; }
  const dr = e.target.closest('[data-drive]'); if (dr) { const d = planRead().drives.find((x) => x.id === dr.dataset.drive); if (d) dbxOpen(SC, d, null); return; }
  if (e.target.closest('[data-newcase]')) { newCaseDrawer(SC); return; }
  if (e.target.closest('[data-newpin]')) { newPinDrawer(SC); return; }
  const an = e.target.closest('[data-anim]'); if (an) { animateHere(an); return; }
  const sf = e.target.closest('[data-sheetfs]'); if (sf) { sheetFS(sf.dataset.sheetfs === 'on'); return; }
  const sv = e.target.closest('[data-sheetview]'); if (sv) { SHEETVIEW = sv.dataset.sheetview; try { localStorage.setItem('sk_sheetview', SHEETVIEW); } catch (x) {}
    const r = $('.live.gp-room'); if (r) r.classList.toggle('slim', SHEETVIEW === 'slim'); document.querySelectorAll('[data-sheetview]').forEach((b) => b.classList.toggle('on', b.dataset.sheetview === SHEETVIEW)); return; }
  const g = e.target.closest('[data-go]'); if (g) { go(AT + (+g.dataset.go)); return; }
  if (e.target.closest('[data-next]')) { step(1); return; }
  if (e.target.closest('[data-ink]')) { inkCurrent(); return; }
  const fl = e.target.closest('[data-flip]'); if (fl) { flip(+fl.dataset.flip); return; }
  const sp = e.target.closest('[data-spot]'); if (sp) { SPOT = SPOT === sp.dataset.spot ? null : sp.dataset.spot; repaint(); return; }
  const cv = e.target.closest('[data-covview]'); if (cv) { COVVIEW = cv.dataset.covview; FILM = null; repaint(); return; }
  const mf = e.target.closest('[data-macrofilm]'); if (mf) { e.preventDefault(); FILM = mf.dataset.macrofilm; repaint(); return; }
  const fm = e.target.closest('[data-film]'); if (fm) { e.preventDefault(); const c = curPlay(); if (!c && !(SEC === 'install' && (fm.dataset.film === 'title' || fm.dataset.film === 'off'))) return; FILM = fm.dataset.film === 'off' ? null : c ? c.p.id : 'title'; repaint(); return; }
  const mo = e.target.closest('[data-rows]'); if (mo) { e.preventDefault(); const r = $('.rows'); if (r) { const y = (parseFloat(r.querySelector('.filt').style.top) - 40) * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--s')); scrollTo({ top: y, behavior: 'smooth' }); } return; }
  const se = e.target.closest('[data-sel]'); if (se) { TSEL = +se.dataset.sel; repaint(); return; }
  const bl = e.target.closest('[data-belief]'); if (bl) { const i = +bl.dataset.belief; OPEN.has(i) ? OPEN.delete(i) : OPEN.add(i); bl.classList.toggle('open', OPEN.has(i)); return; }
  const rd = e.target.closest('[data-rd]'); if (rd) { RD = (+rd.dataset.rd === RD) ? 0 : +rd.dataset.rd; repaint(); return; }
  const ad = e.target.closest('[data-adj]'); if (ad) { const c = curPlay(); if (!c) return; if (!ADJ.has(c.p.id)) ADJ.set(c.p.id, new Set()); const set = ADJ.get(c.p.id), k = +ad.dataset.adj; set.has(k) ? set.delete(k) : set.add(k); repaint(); const art = $('[data-card] .art'); if (art) { art.classList.add('flash'); setTimeout(() => art.classList.remove('flash'), 450); } return; }
  const tp = e.target.closest('[data-type]'); if (tp) { FILT.type = tp.dataset.type; PICK = 0; render(); return; }
  const fr = e.target.closest('[data-front]'); if (fr) { FILT.front = fr.dataset.front; PICK = 0; render(); return; }
  const st = e.target.closest('[data-set]'); if (st) { FILT.set = st.dataset.set; if ($('.modal.book')) bookRepaint(); else render(); return; }
  const ad2 = e.target.closest('[data-add]'); if (ad2) { const on = !addedSet().has(ad2.dataset.add); addPlay(ad2.dataset.add, on); if ($('.modal.book')) bookRepaint(); else render(); toast(on ? 'Added to your plays' : 'Taken back out'); return; }
});

/* ---------- boot ---------- */
(async function boot() {
  /* one scheme, its own file (build-schemes.js writes them); the whole book only as a fallback */
  let one = null; try { const r = await fetch('schemes/' + encodeURIComponent(KEY) + '.json'); if (r.ok) one = await r.json(); } catch (e) {}
  if (!one) { const S = await (await fetch('schemes.json')).json(); one = (S.schemes || []).find((s) => s.key === KEY); }
  SC = one;
  await skPlanPull(); /* the account's plan, if it is newer than this browser's */
  if (!SC) { app.innerHTML = `<div class="sk-boot">No scheme called ${esc(KEY)}</div>`; return; }
  if (window.SK_GAME) document.body.classList.add('g-' + window.SK_GAME);
  document.documentElement.style.setProperty('--team', SC.c1 || '#9E1B32');
  document.documentElement.style.setProperty('--team2', SC.c2 || '#828A8F');
  const sets = [...new Set(SC.plays.filter((p) => p.libFamily && p.libSet).map((p) => slug(p.libFamily) + '__' + slug(p.libSet)))];
  const [forms, ...cards] = await Promise.all([fetch('formations.json').then((r) => r.json()).catch(() => ({})), ...sets.map((k) => fetch('cards/' + k + '.json').then((r) => r.json()).catch(() => ({})))]);
  FORMS = forms; GEO = Object.assign({}, ...cards);
  if (addedSet().size) loadIndex(); /* the added calls want their names */
  render();
})();
})();
