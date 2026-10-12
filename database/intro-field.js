/* intro-field.js: THE PRINCIPLES ON THE FIELD.
   A scheme's three principles as a click-through PAPER BOARD (his pick 2026-10-09): one of the scheme's own plays, with
   his setups on, drawn in ink on a sheet of paper against a College Football 4-2-5 coverage shell. Each click is a step:
   the sheet tilts or flattens, words are stamped on the field, hats are counted in marker, the play runs to a stop.
   Decks are authored on the scheme (about.principles[].deck, see tennessee.js); scheme.js lays the screen out and hands
   over the resolved plays, the game's blocking tables and the formation tiles.

   THE MOVEMENT is a fixed-step simulation cached per deck: speed caps and acceleration, the line assigned by the game's
   own matchup tables (blocking.json), lead and stalk blocks, the defense on its run fits, tackles, motion at six yards a
   second with the snap waiting for it. A sketch of the game, not the game. The first screen (a dark card with a scrubber)
   is kept in CFB27 Engine Reference/_archive. */
(function () {
'use strict';
/* the College Football 4-2-5 Even shells (zone landmarks absolute: x across, y downfield, rx, ry); Cover 0 from Nickel Over */
const SHELLS = {
  c0: [{ x: -5.5, y: 1.2, lb: 'Rush', rush: 1 }, { x: -1, y: 1.2, lb: 'Rush', rush: 1 }, { x: 2.4, y: 1.2, lb: 'Rush', rush: 1 }, { x: 5.5, y: 1.2, lb: 'Rush', rush: 1 }, { x: -10, y: 4, lb: 'Man lock on #4', man: 4 }, { x: -3, y: 5, lb: 'Man lock on #3', man: 3 }, { x: 3.3, y: 5, lb: 'Blitz', rush: 1 }, { x: -17.5, y: 8, lb: 'Man lock on #5', man: 5 }, { x: -8.5, y: 2.5, lb: 'Blitz', rush: 1 }, { x: 8.5, y: 14, lb: 'Man lock on #2', man: 2 }, { x: 17.5, y: 8, lb: 'Man lock on #1', man: 1 }],
  c1: [{ x: -5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -1.7, y: 1.6, lb: 'Rush', rush: 1 }, { x: 1.8, y: 1.6, lb: 'Rush', rush: 1 }, { x: 5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -3, y: 5, lb: '3-receiver hook', zone: [0, 9.5, 5, 2.7] }, { x: 3, y: 5, lb: 'Man lock on #3', man: 3 }, { x: 8.8, y: 3.8, lb: 'Man lock on #2', man: 2 }, { x: -16.2, y: 7, lb: 'Man lock on #5', man: 5 }, { x: -8, y: 11, lb: 'Man lock on #4', man: 4 }, { x: 8, y: 12, lb: 'Deep middle third', zone: [0, 20, 8.5, 3] }, { x: 16.3, y: 7, lb: 'Man lock on #1', man: 1 }],
  c2: [{ x: -5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -1.7, y: 1.6, lb: 'Rush', rush: 1 }, { x: 1.8, y: 1.6, lb: 'Rush', rush: 1 }, { x: 5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -3, y: 5, lb: 'Curl left', zone: [-10, 11, 4.6, 2.7] }, { x: 3, y: 5, lb: 'Middle read (lurk)', zone: [0, 8, 5, 2.7] }, { x: 8.8, y: 3.8, lb: 'Curl right', zone: [10.1, 11.1, 4.6, 2.7] }, { x: -16.2, y: 7, lb: 'Cloud flat left', zone: [-17.4, 5.5, 5, 2.6] }, { x: -8, y: 11, lb: 'Deep right half', zone: [-13.3, 20, 12.8, 3] }, { x: 8, y: 12, lb: 'Deep left half', zone: [13.3, 20, 12.8, 3] }, { x: 16.3, y: 7, lb: 'Cloud flat right', zone: [17.6, 5.5, 5, 2.6] }],
  c3: [{ x: -5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -1.7, y: 1.6, lb: 'Rush', rush: 1 }, { x: 1.8, y: 1.6, lb: 'Rush', rush: 1 }, { x: 5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -3, y: 5, lb: 'Hook to curl left', zone: [-4.7, 10, 4.6, 2.7] }, { x: 3, y: 5, lb: 'Hook to curl right', zone: [4.8, 10, 4.6, 2.7] }, { x: 8.8, y: 3.8, lb: 'Curl to flat right', zone: [14.2, 9.1, 4.8, 2.7] }, { x: -16.2, y: 7, lb: 'Deep right third (bail)', zone: [-17.7, 20, 8.5, 3] }, { x: -8, y: 4.8, lb: 'Curl to flat left (creep)', zone: [-14.1, 9, 4.8, 2.7] }, { x: 8, y: 12, lb: 'Deep middle third', zone: [0, 20, 8.5, 3] }, { x: 16.3, y: 7, lb: 'Deep left third (bail)', zone: [17.8, 20, 8.5, 3] }],
  c2m: [{ x: -5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -1.7, y: 1.6, lb: 'Rush', rush: 1 }, { x: 1.8, y: 1.6, lb: 'Rush', rush: 1 }, { x: 5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -3, y: 5, lb: 'Man lock on #4', man: 4 }, { x: 3, y: 5, lb: 'Man lock on #3', man: 3 }, { x: 8.8, y: 3.8, lb: 'Man lock on #2', man: 2 }, { x: -16.2, y: 7, lb: 'Man lock on #5', man: 5 }, { x: -8, y: 11, lb: 'Deep right half', zone: [-13.3, 20, 12.8, 3] }, { x: 8, y: 12, lb: 'Deep left half', zone: [13.3, 20, 12.8, 3] }, { x: 16.3, y: 7, lb: 'Man lock on #1', man: 1 }],
  c4: [{ x: -5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -1.7, y: 1.6, lb: 'Rush', rush: 1 }, { x: 1.8, y: 1.6, lb: 'Rush', rush: 1 }, { x: 5, y: 1.6, lb: 'Rush', rush: 1 }, { x: -3, y: 5, lb: 'Quarter flat left', zone: [-12.5, 8, 5, 2.7] }, { x: 3, y: 5, lb: '3-receiver hook', zone: [0, 9.5, 5, 2.7] }, { x: 8.8, y: 3.8, lb: 'Quarter flat right', zone: [12.6, 8.1, 5, 2.7] }, { x: -16.2, y: 7, lb: 'Deep outside right quarter', zone: [-19.9, 20, 6.3, 3] }, { x: -8, y: 11, lb: 'Deep inside right quarter', zone: [-6.7, 20, 6.3, 3] }, { x: 8, y: 12, lb: 'Deep inside left quarter', zone: [6.7, 20, 6.3, 3] }, { x: 16.3, y: 7, lb: 'Deep outside left quarter', zone: [20, 20, 6.3, 3] }],
};
const SHELL_NAMES = { c0: 'Cover 0', c1: 'Cover 1', c2: 'Cover 2', c3: 'Cover 3', c2m: 'Cover 2 Man', c4: 'Quarters' };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const ease = (t) => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* a down lineman by position: the first four slots are the line in the Nickel only (3 High Penny has an end at slot five, Dime 1-4 has linebackers at three and four) */
const LN = (m) => /^(DE|DT|NT|DL)$/.test(m.pos || '');
const plen = (p) => p.reduce((a, q, i) => i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0, 0);
function along(pts, d) { let left = d; for (let i = 1; i < pts.length; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], L = Math.hypot(bx - ax, by - ay); if (left <= L) { const t = L ? left / L : 0; return [ax + (bx - ax) * t, ay + (by - ay) * t]; } left -= L; } return pts[pts.length - 1]; }
/* past the end of a path: keep going the way the last leg points */
function alongOn(pts, d) { const L = plen(pts); if (d <= L || pts.length < 2) return along(pts, d); const a = pts[pts.length - 2], b = pts[pts.length - 1], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [b[0] + (b[0] - a[0]) / l * (d - L), b[1] + (b[1] - a[1]) / l * (d - L)]; }
const cssv = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const toward = (from, to, d) => { const dx = to[0] - from[0], dy = to[1] - from[1], L = Math.hypot(dx, dy); if (L <= d || !L) return [to[0], to[1]]; return [from[0] + dx / L * d, from[1] + dy / L * d]; };

let S = null;   /* the one mounted screen */

/* ================= THE MOVEMENT MODEL ================= */
const DT = 1 / 30, MOTION_SPEED = 6, ACCEL = 16;
const SPEED = { wr: 8, rb: 7.5, te: 7, ol: 5, qb: 7, dl: 5.5, lb: 7, db: 8, s: 7.5 };
const REACT = { dl: .1, lb: .35, db: .4, s: .7 };
const offCls = (m) => m.role === 'ol' ? 'ol' : m.role === 'qb' ? 'qb' : Math.abs(m.x) >= 8 ? 'wr' : m.y < -4 ? 'rb' : 'te';
const defCls = (d) => d.rush ? (d.y < 3.5 ? 'dl' : 'lb') : d.zone && d.zone[1] >= 15 ? 's' : d.man ? (Math.abs(d.x) >= 14 || d.y >= 10 ? 'db' : 'lb') : Math.abs(d.x) >= 12 ? 'db' : 'lb';
const numbered = (p) => p.men.filter((m) => m.role !== 'ol' && m.role !== 'qb').map((m) => ({ m, x: m.mot ? m.mot[m.mot.length - 1][0] : m.x })).sort((a, b) => b.x - a.x);
/* the shell for a scene: the coverage's men, with the scene's own moves on top (a linebacker walked out to a slot) */
function shellOf(sc) { const base = (SHELLS[sc.cov] || SHELLS.c2).map((d) => Object.assign({}, d, { zone: d.zone ? d.zone.slice() : undefined }));
  for (const o of sc.def || []) { const d = base.find((q) => q.lb === o.who); if (!d) continue; if (o.x != null) d.x = o.x; if (o.y != null) d.y = o.y; if (o.zone) d.zone = o.zone.slice(); if (o.chase) { d.chase = o.chase; d.until = o.until; d.then = o.then; } if (o.rush) { d.rush = 1; delete d.zone; delete d.man; } }
  return base; }
/* the scene with its clock resolved: motion takes real time, so everything after the authored snap slides later by what the motion needs */
function prepScene(sc, p) {
  const motLen = Math.max(0, ...p.men.filter((m) => m.mot).map((m) => plen(m.mot)));
  const need = motLen ? motLen / MOTION_SPEED + .7 : 0, shift = Math.max(0, need - sc.snap), s0 = sc.snap;
  const sh = (t) => (t == null ? t : t >= s0 ? t + shift : t);
  const R = JSON.parse(JSON.stringify(sc)); R.snap = s0 + shift; R.end = sh(sc.end); R.shift = shift;
  R.beats = (sc.beats || []).map((b) => [sh(b[0]), b[1], b[2], b[3]]);   /* [time, big word, line, hold seconds: the play STOPS here for the hold] */
  R.cam = (sc.cam || [{ t: 0, view: 'wide' }]).map((k) => Object.assign({}, k, { t: sh(k.t || 0) }));
  R.throws = (sc.throws || []).map((th) => Object.assign({}, th, { at: sh(th.at), catch: sh(th.catch) }));
  if (sc.hand) R.hand = Object.assign({}, sc.hand, { at: sh(sc.hand.at) });
  if (sc.run && sc.run.afterCatch) R.run.afterCatch = sh(sc.run.afterCatch);
  if (sc.count) { R.count.from = sh(sc.count.from); if (sc.count.until != null) R.count.until = sh(sc.count.until); }
  if (sc.ring) { if (sc.ring.from != null) R.ring.from = sh(sc.ring.from); if (sc.ring.until != null) R.ring.until = sh(sc.ring.until); }
  if (sc.gap) R.gap.at = sc.gap.at.map(sh);
  R.words = (sc.words || []).map((w) => Object.assign({}, w, { at: w.at.map(sh) }));
  (R.def || []).forEach((o) => { if (o.until != null) o.until = sh(o.until); });
  return R;
}
/* one play, start to finish, at thirty frames a second.
   THIRD PASS (2026-10-08, after the game-file dive): the line is assigned by THE GAME'S OWN matchup tables for the play's
   blocking scheme (blocking.json, from BlockingSchemeDefine: ordered search windows per position, double teams), lead and
   stalk blockers run the game's lead paths, and the defense plays its RUN FITS (technique, gap, job: jet / fill / hammer /
   splatter / force / cutback) from the same files. Plus the animation list: intercept pursuit, freeze on the tackle, shed
   cooldown, routes that keep going or settle, breaks that slow, the back pressing the hole, a cushion in man, zone drops at
   drop speed, a pocket with edge lanes, a play fake, blockers that never overlap. Still a sketch of the game, not the game. */
const TABLE_OF = { BTIso: 'Iso', BTInsideZone: 'InsideZone', BTOutsideZone: 'OutsideZone', BTPower: 'PowerOneBack', BTCounter: 'Counter', BTDuo: 'Duo', BTTrap: 'Trap', BTBuckSweep: 'Power_G', PinPull: 'Pitch', BTVeerMidline: 'InsideVeer', BTWham: 'Wham', CrackToss: 'Pitch' };
const GAP_X = { A: 1.2, B: 3.2, C: 5.5, D: 8.5, E: 12 };
const gapLetter = (mask) => mask & 3 ? 'A' : mask & 12 ? 'B' : mask & 48 ? 'C' : mask & 192 ? 'D' : mask & 768 ? 'E' : '';
function simulate(R, p, BLK) {
  const snap = R.snap, END = R.end > 0 ? R.end : snap + 5, N = Math.ceil(END / DT) + 2, el = numbered(p), shell = shellOf(R);
  const runPath = R.run && R.run.path ? R.run.path : null;
  const fakeMan = R.fake ? p.men.find((m) => m.k === R.fake.who) : null, fakeEnd = fakeMan && fakeMan.r && fakeMan.r.length ? fakeMan.r[fakeMan.r.length - 1] : null;
  const hole = runPath ? (runPath.find((q) => q[1] >= 0) || runPath[runPath.length - 1]) : (fakeEnd ? [fakeEnd[0], 0] : null);
  const ps = hole && Math.abs(hole[0]) > .6 ? Math.sign(hole[0]) : (p.runSide === 'L' ? -1 : 1);   /* the play side */
  /* the offense */
  const O = p.men.map((m) => { const cls = offCls(m), a = { k: m.k, m, cls, x: m.x, y: m.y, v: 0, vmax: SPEED[cls], d: 0, mode: 'hold', path: null, tgt: null, eng: null, engAt: 0, start: [m.x, m.y], prev: null };
    if (m.mot) { a.motLen = plen(m.mot); a.motAt = snap - .3 - a.motLen / MOTION_SPEED; a.start = m.mot[m.mot.length - 1]; }
    return a; });
  const byK = {}; O.forEach((a) => { byK[a.k] = a; }); const qb = O.find((a) => a.cls === 'qb'); byK.qb = qb;
  const branch = (a) => { const m = a.m, b = R.branch && R.branch[m.k]; if (b != null && m.alts && m.alts[b] && m.tip) { const i = m.r.findIndex((q) => q[0] === m.tip[0] && q[1] === m.tip[1]); return m.r.slice(0, i + 1).concat(m.alts[b].slice(1)); } return m.r; };
  const carrierKey = R.run && !R.run.afterCatch ? R.run.who : (R.hand ? R.hand.to : null);
  const isRun = !!runPath && !R.run.afterCatch, runBlock = isRun || !!R.fake;   /* an RPO or play action blocks like a run */
  for (const a of O) { const m = a.m;
    if (a.cls === 'qb') { a.mode = R.run && R.run.who === 'qb' ? 'carry' : 'qb'; if (a.mode === 'carry') { a.path = [[m.x, m.y]].concat(runPath); a.delay = R.run.delay || 0; a.vmax = R.run.speed || SPEED.qb; } }
    else if (R.move && R.move[m.k]) { a.mode = 'move'; a.path = [a.start].concat(R.move[m.k]); }
    else if (carrierKey === m.k) { a.mode = 'carry'; a.path = [a.start].concat(runPath || [[a.start[0], a.start[1] + 6]]); a.vmax = (R.run && R.run.speed) || SPEED[a.cls]; a.delay = (R.run && R.run.delay) || 0; }
    else if (m.r && m.r.length > 1) { a.mode = 'route'; a.path = branch(a); }
    else if (m.role === 'ol') a.mode = 'ol';
    else if (m.bk) { a.mode = m.rel && m.rel.length ? 'lead' : (m.tech === 'stalk block' || a.cls === 'wr' || a.cls === 'te') ? 'stalk' : 'pro'; if (a.mode === 'lead') a.path = [a.start].concat(m.rel); }
    else a.mode = 'hold'; }
  /* position codes for the game's tables: the five linemen by width, backs by depth, an attached blocker is a tight end */
  const ols = O.filter((a) => a.mode === 'ol').sort((a, b) => a.x - b.x); ols.forEach((a, i) => { a.pos = 5 + i; });
  const backs = O.filter((a) => a.cls === 'rb' && a.mode !== 'carry').sort((a, b) => a.y - b.y); backs.forEach((a, i) => { a.pos = i === 0 ? 1 : 2; });
  for (const a of O) if (a.pos == null && a.mode !== 'ol') a.pos = a.cls === 'qb' ? 0 : (a.m.bk && Math.abs(a.x) <= 9.5 && a.y > -3.5) ? 4 : 3;
  /* the defense */
  const D = shell.map((d, i) => Object.assign({ i, x: d.x, y: d.y, v: 0, cls: defCls(d), home: [d.x, d.y], blk: null, blkAt: 0, phase: 0, flags: 1, shedAt: -9, prev: null }, d, { x: d.x, y: d.y }));
  D.forEach((d) => { d.vmax = SPEED[d.cls]; d.react = REACT[d.cls]; if (d.man) { const t = el[d.man - 1]; d.mark = t ? byK[t.m.k] : null; }
    /* his run fit from the game, matched by where he lines up */
    const fits = BLK && BLK.fits && BLK.fits[R.cov]; if (fits) { let best = null, bd = 2.2; for (const f of fits) { const dd = Math.hypot(f.x - d.home[0], f.y - d.home[1]); if (dd < bd) { bd = dd; best = f; } } if (best) { const strong = ps > 0 ? (best.x >= 0) : (best.x < 0); const job = strong ? best.js : best.jw, gap = gapLetter(strong ? best.gs : best.gw); d.fit = { job: job || '', gap, gx: gap ? (d.home[0] >= 0 ? 1 : -1) * GAP_X[gap] : d.home[0] }; } }
    d.flags = 1 | (Math.abs(d.x) <= 6.5 && d.y <= 7 ? 32 : 0) | (d.y >= 3 ? 128 : 0); });
  /* ---- THE GAME'S MATCHUP TABLE for a run: each blocker, in the table's order, searches his windows and takes the first free man ---- */
  const table = runBlock && BLK && BLK.tables && TABLE_OF[p.bscheme] ? BLK.tables[TABLE_OF[p.bscheme]] : null;
  /* a window, with half a yard of give: the game's fronts sit a little tighter than our shells */
  const inWin = (b, d, w) => { const rx = (d.x - b.x) * ps; return rx >= -w[1] - .5 && rx <= w[0] + .5 && d.y >= w[2] - .3 && d.y <= w[3] + .3; };
  /* the table only ever looks at the front: nobody blocks a corner or a safety off a matchup row */
  const front = D.filter((d) => Math.abs(d.x) <= 7.5 && d.y <= 8 && d.cls !== 's');
  const sortBy = (code, b) => (a, c) => code === 0 ? (c.x - b.x) * ps - (a.x - b.x) * ps : code === 1 ? (a.x - b.x) * ps - (c.x - b.x) * ps : code === 2 ? a.y - c.y : c.y - a.y;
  if (table) {
    const takers = O.filter((a) => a.pos != null && (a.mode === 'ol' || a.mode === 'pro' || a.mode === 'hold') && table.some((r) => r[0] === a.pos));
    takers.sort((a, c) => { const oa = Math.min(...table.filter((r) => r[0] === a.pos).map((r) => r[2])), oc = Math.min(...table.filter((r) => r[0] === c.pos).map((r) => r[2])); return oa - oc || (c.x - a.x) * ps; });
    for (const b of takers) { const rows = table.filter((r) => r[0] === b.pos).sort((r, s) => r[1] - s[1]);
      for (const r of rows) { const req = r[8], inv = r[9];
        let cands = front.filter((d) => (d.flags & req) === req && (d.flags & inv) === 0 && inWin(b, d, [r[3], r[4], r[5], r[6]])).sort(sortBy(r[7], b));
        if (cands.length) { b.tgt = cands[0]; cands[0].flags |= 2; break; }
        if (r[10]) { const w = r[10]; cands = front.filter((d) => (d.flags & w[5]) === w[5] && (d.flags & w[6]) === 0 && (d.flags & 2) && !(d.flags & 8) && inWin(b, d, [w[0], w[1], w[2], w[3]])).sort(sortBy(w[4], b)); if (cands.length) { b.tgt = cands[0]; b.double = true; cands[0].flags |= 8; break; } } } }
  }
  /* the pass line, and anyone the table left free: each rusher on the line takes the nearest free lineman */
  const dls = D.filter((d) => d.rush && d.y < 3.5).sort((a, b) => Math.abs(a.x) - Math.abs(b.x));
  for (const d of dls) { if (table && (d.flags & 2)) continue; let best = null, bd = 1e9; for (const o of ols) { if (o.tgt) continue; const dd = Math.abs(o.x - d.x); if (dd < bd) { bd = dd; best = o; } } if (best) { best.tgt = d; d.flags |= 2; } }
  for (const d of D.filter((q) => q.rush && q.y >= 3.5)) { const free = ols.filter((o) => !o.tgt).concat(O.filter((a) => a.mode === 'pro' && !a.tgt)).sort((a, b) => Math.abs(a.x - d.x) - Math.abs(b.x - d.x))[0]; if (free) { free.tgt = d; d.flags |= 2; } }
  /* the ball, the throws */
  let ball = { x: 0, y: 0, z: .3, with: null }, thrown = null, carrier = carrierKey ? byK[carrierKey] : (R.run && R.run.who === 'qb' ? qb : null), tackled = -1;
  const throws = R.throws.map((th) => Object.assign({}, th, { done: false, flight: 0 }));
  const fake = R.fake ? byK[R.fake.who] : null;
  const frames = [];
  const step = (a, target, vmax, dt) => { a.v = Math.min(vmax, a.v + ACCEL * dt); const p2 = toward([a.x, a.y], target, a.v * dt); if (p2[0] === target[0] && p2[1] === target[1]) a.v *= .6; a.x = p2[0]; a.y = p2[1]; };
  const freeDef = (f) => D.filter((d) => !d.blk && f(d));
  const nearest = (from, list, maxD) => { let best = null, bd = maxD == null ? 1e9 : maxD; for (const d of list) { const dd = dist(from, [d.x, d.y]); if (dd < bd) { bd = dd; best = d; } } return best; };
  const canEngage = (a, d, t) => !d.blk && !a.eng && t - d.shedAt > .9 && !(a.noBlock > t);
  const engage = (a, d, t) => { if (!canEngage(a, d, t)) return; d.blk = a; d.blkAt = t; a.eng = d; a.engAt = t; let dir = [d.x - a.x, d.y - a.y]; const L = Math.hypot(dir[0], dir[1]) || 1; a.engDir = [dir[0] / L, dir[1] / L]; };
  const vel = (m) => m.prev ? [(m.x - m.prev[0]) / DT, (m.y - m.prev[1]) / DT] : [0, 0];
  const intercept = (d, m, vmax) => { const v = vel(m), dd = dist([d.x, d.y], [m.x, m.y]), lead = clamp(dd / Math.max(vmax, 1), 0, 1.0); return [m.x + v[0] * lead, m.y + v[1] * lead]; };
  /* who runs to the ball, and when: the box fits; a wide underneath man has the pass first; a man defender stays on a route runner; the safeties stay deep until the ball is past the line */
  const pursues = (d, bm, tp) => { const past = bm.y > 1.5;
    if (d.cls === 's') return past || tp > 2.6;
    if (d.man && d.mark && d.mark.mode === 'route' && !d.mark.caught) return past;
    if (Math.abs(d.x) > 7 && d.cls !== 'dl' && !(d.fit && d.fit.job === 'force')) return past || tp > .9;
    return true; };
  /* a break ahead: within a yard and a half of a sharp vertex, slow down */
  const breakSoon = (path, dd) => { let acc = 0; for (let i = 1; i < path.length - 1; i++) { const L = Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); acc += L; if (acc - dd > 1.6) return false; if (acc - dd >= -0.2) { const a = [path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]], b = [path[i + 1][0] - path[i][0], path[i + 1][1] - path[i][1]]; const la = Math.hypot(a[0], a[1]) || 1, lb = Math.hypot(b[0], b[1]) || 1; const cos = (a[0] * b[0] + a[1] * b[1]) / (la * lb); if (cos < .5) return true; } } return false; };
  const verticalEnd = (path) => { if (path.length < 2) return false; const a = path[path.length - 2], b = path[path.length - 1]; return (b[1] - a[1]) > Math.abs(b[0] - a[0]); };
  for (let i = 0; i < N; i++) {
    const t = i * DT, tp = t - snap;
    if (tackled >= 0) { frames.push(frames[frames.length - 1]); continue; }   /* the whistle: everybody freezes */
    /* ---- before the snap: the motion man walks ---- */
    if (tp < 0) { for (const a of O) { if (a.m.mot && t >= a.motAt) { const q = along(a.m.mot, clamp((t - a.motAt) * MOTION_SPEED, 0, a.motLen)); a.x = q[0]; a.y = q[1]; } } }
    else {
      /* ---- the offense ---- */
      for (const a of O) { const m = a.m;
        if (a.mode === 'route') { const thrower = throws.find((th) => th.from === a.k && !th.flight); if (thrower && t >= thrower.at - .4) { a.v *= .5; continue; }
          if (a.tackled) continue;
          let cap = a.vmax; if (!a.caught && breakSoon(a.path, a.d)) cap = 4.5;
          a.v = Math.min(cap, a.v + ACCEL * DT); const L = plen(a.path);
          if (a.caught || verticalEnd(a.path)) { a.d += (a.d > L ? Math.min(a.v, a.vmax * .75) : a.v) * DT; const q = alongOn(a.path, a.d); a.x = q[0]; a.y = q[1]; }
          else { a.d = Math.min(L, a.d + a.v * DT); const q = along(a.path, a.d); a.x = q[0]; a.y = q[1]; if (a.d >= L) a.v = 0; } }
        else if (a.mode === 'carry') { if (a.tackled) continue; if (tp >= (a.delay || 0)) { let cap = a.vmax; if (tp < (a.delay || 0) + .8 && !a.caught) cap = 5; else if (breakSoon(a.path, a.d)) cap = 5.2; a.v = Math.min(cap, a.v + ACCEL * DT); a.d += a.v * DT; const q = alongOn(a.path, a.d); a.x = q[0]; a.y = q[1]; } }
        else if (a.mode === 'move' || a.mode === 'lead') { if (a.eng) continue; const L = plen(a.path); if (a.d < L) { a.v = Math.min(6.5, a.v + ACCEL * DT); a.d = Math.min(L, a.d + a.v * DT); const q = along(a.path, a.d); a.x = q[0]; a.y = q[1]; const near = nearest([a.x, a.y], freeDef((d) => (d.cls !== 's' || d.y < a.y + 4) && canEngage(a, d, t)), 1.6); if (near) engage(a, near, t); }
          else { const near = nearest([a.x, a.y], freeDef((d) => canEngage(a, d, t) && !(a.cls === 'wr' && d.cls === 'dl')), 5); if (near) { step(a, [near.x, near.y], 5.5, DT); if (dist([a.x, a.y], [near.x, near.y]) < 1.1) engage(a, near, t); } } }
        else if (a.mode === 'ol' || a.mode === 'climb') { if (a.eng) continue;
          if (a.mode === 'climb') { const lb = a.tgt && !a.tgt.blk ? a.tgt : nearest([a.x, a.y], freeDef((d) => d.cls === 'lb' && d.y < 9 && Math.abs(d.x - a.x) < 7 && canEngage(a, d, t)), 9); if (lb) { a.tgt = lb; step(a, intercept(a, lb, SPEED.ol), SPEED.ol, DT); if (dist([a.x, a.y], [lb.x, lb.y]) < 1.1) engage(a, lb, t); } else step(a, [a.start[0], a.start[1] + 2.5], 3, DT); continue; }
          if (a.tgt && (!a.tgt.blk || a.double)) { const d = a.tgt;
            if (runBlock) { const aim = [d.x + (hole ? Math.sign(hole[0] - d.x) || ps : ps) * .5 + (a.double ? Math.sign(a.x - d.x) * .9 : 0), d.y]; step(a, aim, SPEED.ol, DT); if (dist([a.x, a.y], [d.x, d.y]) < (a.double ? 1.5 : 1.1)) { if (d.blk && a.double) { a.eng = d; a.engAt = t; a.second = true; } else engage(a, d, t); } }
            else { step(a, [lerp(a.start[0], d.x, .5), a.start[1] - .4], 4, DT); if (dist([a.x, a.y], [d.x, d.y]) < 1.3) engage(a, d, t); } }
          else if (runBlock && tp > .3) { a.mode = 'climb'; a.tgt = null; }
          else if (!runBlock) step(a, [a.start[0], a.start[1] - .4], 3, DT); }
        else if (a.mode === 'stalk') { if (a.eng) continue; const d = a.tgt && !a.tgt.blk ? a.tgt : nearest([a.x, a.y], freeDef((d) => d.y > a.y - 1 && d.cls !== 'dl' && canEngage(a, d, t)), 13); if (d) { a.tgt = d; const aim = [d.x, Math.min(d.y - .8, a.start[1] + 9)]; step(a, aim, 6.5, DT); if (dist([a.x, a.y], [d.x, d.y]) < 1.4) engage(a, d, t); } }
        else if (a.mode === 'pro') { if (a.eng) continue; const d = a.tgt && !a.tgt.blk ? a.tgt : nearest([a.x, a.y], freeDef((d) => d.rush && d.y < 2.5 && canEngage(a, d, t)), 6); if (d) { step(a, [d.x, d.y], 5, DT); if (dist([a.x, a.y], [d.x, d.y]) < 1.1) engage(a, d, t); } }
        else if (a.mode === 'qb') { const drop = R.drop == null ? 2.5 : R.drop; if (!thrown || !thrown.done) step(a, [a.start[0], a.start[1] - drop], 4, DT); } }
      /* ---- engaged pairs: the blocker drives, the defender rides on his far side; a second blocker on a double sits on the other shoulder, then climbs; second level blocks shed after a while ---- */
      for (const a of O) { if (!a.eng) continue; const d = a.eng, age = t - a.engAt;
        if (a.second) { /* the combo: hold the other shoulder, then leave for the backer */
          if (age > .7 && runBlock) { const lb = nearest([a.x, a.y], freeDef((q) => q.cls === 'lb' && q.y < 9 && Math.abs(q.x - a.x) < 7 && canEngage(a, q, t)), 9); if (lb) { a.eng = null; a.second = false; a.mode = 'climb'; a.tgt = lb; continue; } }
          a.x = d.x - a.engDir[0] * 1.0 + Math.sign(a.x - d.x || 1) * .9; a.y = d.y - a.engDir[1] * 1.0; continue; }
        const second = d.cls !== 'dl';
        if (second && age > 2.6) { d.blk = null; a.eng = null; d.shedAt = t; a.noBlock = t + .6; d.x += a.engDir[0] * 1.2; d.y += a.engDir[1] * 1.2; d.v = 2; continue; }
        let dir; if (runBlock) { const away = hole ? Math.sign(d.x - hole[0]) || (d.x >= 0 ? 1 : -1) : Math.sign(d.x) || 1; dir = [away * .8, .55]; } else { dir = Math.abs(d.home[0]) >= 4 ? [Math.sign(d.home[0]) * .25, -.5] : [0, -.35]; }
        const sp = (age < 1.6 ? 1.1 : .35) * (second ? .8 : 1); const L = Math.hypot(dir[0], dir[1]); a.x += dir[0] / L * sp * DT; a.y += dir[1] / L * sp * DT;
        d.x = a.x + a.engDir[0] * 1.0; d.y = a.y + a.engDir[1] * 1.0; d.v = 0; }
      /* ---- the ball ---- */
      if (!ball.with && !thrown) ball.with = qb;
      if (R.hand && t >= R.hand.at && carrier && ball.with === qb) ball.with = carrier;
      for (const th of throws) { if (th.done) continue; const from = th.from && th.from !== 'qb' ? byK[th.from] : qb, to = byK[th.man]; if (!from || !to) { th.done = true; continue; }
        if (t >= th.at && !th.flight) { th.fromPos = [from.x, from.y]; const d0 = dist(th.fromPos, [to.x, to.y]); th.flight = Math.min(1.15, .36 + .024 * d0); th.t0 = t; th.toA = to; ball.with = null; thrown = th; }
        if (th.flight) { const u = clamp((t - th.t0) / th.flight, 0, 1), d0 = dist(th.fromPos, [to.x, to.y]); ball.x = lerp(th.fromPos[0], to.x, u); ball.y = lerp(th.fromPos[1], to.y, u); ball.z = 1.6 + Math.min(5, .8 + .11 * d0) * 4 * u * (1 - u);
          if (u >= 1) { th.done = true; ball.with = to; to.caught = true; to.v = to.vmax * .8; if (R.run && R.run.afterCatch && R.run.who === to.k) { to.mode = 'carry'; to.path = [[to.x, to.y]].concat(runPath); to.d = 0; to.vmax = R.run.speed || SPEED[to.cls]; to.delay = 0; } carrier = to; } } }
      /* ---- the defense ---- */
      const ballMan = isRun ? carrier : (ball.with && ball.with !== qb ? ball.with : null);
      const keyMan = ballMan || (fake && tp < (R.fake.until == null ? .8 : R.fake.until) ? fake : null);   /* who the run fits key: the ball, or the fake while it lasts */
      const recs = O.filter((a) => a.mode === 'route' || (a.mode === 'carry' && a.caught));
      for (const d of D) { if (d.blk) continue; if (tp < d.react) continue;
        let target = null, vmax = d.vmax, back = false;
        if (d.chase) { const until = d.until == null ? 1e9 : d.until; const who = t <= until ? byK[d.chase] : (d.then ? byK[d.then] : null); target = who ? intercept(d, who, 7) : (d.zone ? [d.zone[0], d.zone[1]] : d.home); vmax = 7; }
        else if (keyMan && (isRun || keyMan === fake || (carrier && carrier.caught)) && pursues(d, keyMan, tp)) {
          const past = keyMan.y > 1.5, fit = d.fit || { job: '' };
          if (past || keyMan.caught) { target = intercept(d, keyMan, vmax); if (d.cls === 'dl') vmax = 5; if (d.cls === 's') vmax = 7; }
          else if (fit.job === 'jet') target = [fit.gx, .6];
          else if (fit.job === 'fill' || fit.job === 'hammer' || fit.job === 'splatter') { target = [lerp(fit.gx, keyMan.x, .35), 1.2]; vmax = fit.job === 'hammer' ? 7 : fit.job === 'splatter' ? 5.5 : 6.5; }
          else if (fit.job === 'force') { target = [keyMan.x + Math.sign(d.home[0] || 1) * 4, Math.max(1.5, keyMan.y + 1)]; vmax = 6.5; }
          else if (fit.job === 'cutback') { target = (Math.sign(keyMan.x) === Math.sign(d.home[0]) && Math.abs(keyMan.x) > 2) ? intercept(d, keyMan, vmax) : [d.home[0] * .7, 1.5]; vmax = 6; }
          else if (d.cls === 'dl') target = [d.x, .6];
          else target = [keyMan.x, Math.max(keyMan.y, .8)]; }
        else if (d.rush) { const edge = Math.abs(d.home[0]) >= 4; if (edge && d.y > qb.y + 1) target = [qb.x + Math.sign(d.home[0]) * 4.5, qb.y - 1]; else target = [qb.x, qb.y]; vmax = 6; if (!thrown && dist([d.x, d.y], [qb.x, qb.y]) < 1.8) target = [d.x, d.y]; if (thrown) target = [d.x, d.y]; }
        else if (d.man && d.mark) { const m = d.mark, v = vel(m), L = Math.hypot(v[0], v[1]); const ux = L > .3 ? v[0] / L : 0, uy = L > .3 ? v[1] / L : 1; const shade = m.x > 0 ? -.8 : .8;
          if (m.y < d.y - 3) { target = [m.x + shade, d.y]; vmax = Math.min(vmax, 4.5); back = true; } else target = [m.x - ux * 1.6 + shade, m.y - uy * 1.6]; }
        else if (d.zone) { const [zx, zy, rx, ry] = d.zone, deep = zy >= 15; if (d.phase === 0 && (dist([d.x, d.y], [zx, zy]) < 1.5 || tp > 1.6)) d.phase = 1;
          if (d.phase === 0) { target = [zx, zy]; vmax = deep ? 6 : 4.5; }
          else { let best = null, bd = 1e9; for (const r of recs) { if (deep) { if (Math.abs(r.x - zx) <= rx + 2 && r.y >= zy - 8 && (best == null || r.y > best.y)) best = r; } else { const dd = Math.hypot((r.x - zx) / (rx * 1.35), (r.y - zy) / (ry * 1.6)); if (dd <= 1 && dd < bd) { bd = dd; best = r; } } }
            if (best) target = deep ? [zx + clamp((best.x - zx) * .45, -rx, rx), clamp(Math.max(zy, best.y + 3), zy, 34)] : [clamp(best.x + (best.x > 0 ? -.8 : .8), zx - rx * 1.2, zx + rx * 1.2), clamp(best.y - .5, zy - ry * 1.5, zy + ry * 1.5)]; else target = [zx, zy]; } }
        else target = d.home;
        if (target) { if (!back && target[1] > d.y + .5 && tp < 1.0 && !d.rush) vmax = Math.min(vmax, 4.5);
          if (ballMan && !ballMan.tackled && dist([d.x, d.y], [ballMan.x, ballMan.y]) < 1.0 && !(thrown && !thrown.done) && (isRun ? tp > .4 : true)) { d.v = 0; ballMan.tackled = true; tackled = t; }
          else step(d, target, vmax, DT); } }
      /* ---- nobody stands inside anybody: push overlapping men apart (engaged pairs and the tackle excepted) ---- */
      const all = O.concat(D);
      for (let x = 0; x < all.length; x++) for (let y = x + 1; y < all.length; y++) { const a = all[x], c = all[y]; if (a.eng === c || c.eng === a || a.blk === c || c.blk === a) continue; const dd = dist([a.x, a.y], [c.x, c.y]); if (dd < .9 && dd > 0) { const push = (.9 - dd) / 2, ux = (c.x - a.x) / dd, uy = (c.y - a.y) / dd; if (!a.blk) { a.x -= ux * push; a.y -= uy * push; } if (!c.blk) { c.x += ux * push; c.y += uy * push; } } }
      O.forEach((a) => { a.prev = [a.x, a.y]; }); D.forEach((d) => { d.prev = [d.x, d.y]; });
    }
    frames.push({ o: O.map((a) => [a.x, a.y]), d: D.map((d) => [d.x, d.y, d.blk ? 1 : 0]), ball: ball.with ? [ball.with.x, ball.with.y, 1.6] : [ball.x, ball.y, ball.z], tackled: tackled >= 0 ? tackled : null, caught: throws.filter((th) => th.done).map((th) => th.man) });
  }
  return { frames, keys: O.map((a) => a.k), defs: D.map((d) => d.lb), shell, el, table: !!table, assign: O.filter((a) => a.tgt).map((a) => a.k + (a.double ? '+' : '') + '>' + a.tgt.lb + '@' + a.tgt.home.join(',')) };
}

/* ================= THE SCREEN: THE PAPER BOARD =================
   His pick (2026-10-09): an ink diagram on a sheet of paper that tilts and flattens as he clicks, words stamped on the field
   in worn ink and marker handwriting, the count in marker, one strip of paper for the sentence. It is a click-through, not a
   clip: every step is a REST STATE (a camera, where the play clock stops, what is painted, what is ringed). A click retargets
   from wherever things are, so it always answers at once; he talks over it untimed. Decks are authored on the scheme
   (about.principles[].deck, see tennessee.js). The top right stays empty for his camera. */
const PVIEWS = {
  title: { pos: [0, -40, 46], tgt: [0, 10, 0], fov: 34 }, wide: { pos: [0, -26, 58], tgt: [0, 6, 0], fov: 34 }, box: { pos: [0, -2, 30], tgt: [0, 2.2, 0], fov: 34 },
  number: { pos: [0, -8, 32], tgt: [0, 4, 0], fov: 36 }, deep: { pos: [0, -30, 60], tgt: [0, 12, 0], fov: 38 }, rule: { pos: [0, -38, 44], tgt: [0, 12, 0], fov: 34 } };
const FIELD = [[-26.67, -15], [26.67, -15], [26.67, 50], [-26.67, 50]];
const INKC = '#17130E', REDC = '#7d1d10', SHEET = '#f8f1de';
/* the marker is the team colour, taken down a little when it is a light one so it reads on cream */
function markerOf(hex) { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return '#db650a'; const n = parseInt(m[1], 16), r = n >> 16, gg = (n >> 8) & 255, b = n & 255, lum = (.299 * r + .587 * gg + .114 * b) / 255; if (lum <= .5) return '#' + m[1]; return 'rgb(' + Math.round(r * .86) + ',' + Math.round(gg * .78) + ',' + Math.round(b * .86) + ')'; }

/* ================= A DEFENSIVE CALL, START TO FINISH (2026-10-09) =================
   The principles of a defense play one of its own calls against a PLAIN offense (his pick): the game's Gun Doubles tile, either
   everybody out on a pass or a plain inside run. Each defender does the job the game's play art gives him: a rusher takes his
   lane and then the quarterback, a dropper runs to the zone he is named to, a man defender carries his receiver, and against
   a run everybody in the fit goes to the ball. The line blocks the man the deck gives each of them (deck.prot, taken from
   his setup lines); a lineman whose man drops out has nobody, and a rusher nobody was given comes free. A free rusher at the
   quarterback is a sack, a free defender at the ball is a tackle, and the play stops there. A sketch, the same honesty as the
   offense's movement. Fixed step, run once per deck. */
const D_SPEED = { dl: 5.5, lb: 7, db: 8 }, D_REACT = { dl: .08, lb: .28, db: .36 }, D_DROP = { dl: 4.6, lb: 6.2, db: 7 };
function plainOffense(tile, kind) {
  const olx = tile.filter((t) => t.p === 'OL').map((t) => t.x).sort((a, b) => a - b), OLN = ['LT', 'LG', 'C', 'RG', 'RT'], recs = tile.filter((t) => t.p === 'WR' || t.p === 'TE').sort((a, b) => a.x - b.x);
  return tile.map((t) => { const role = t.p === 'OL' ? 'ol' : t.p === 'QB' ? 'qb' : t.p === 'RB' ? 'rb' : 'rec', o = { x: t.x, y: t.y, role, pos: role === 'ol' ? OLN[olx.indexOf(t.x)] || 'OL' : t.p };
    o.k = role === 'ol' ? o.pos : role === 'rec' ? 'r' + recs.indexOf(t) : role;
    if (role === 'rec') { const wide = Math.abs(t.x) > 13, sg = t.x < 0 ? -1 : 1;
      o.r = kind === 'run' ? [[t.x, t.y], [t.x - sg * .5, t.y + 3.6]] : wide && t.x < 0 ? [[t.x, t.y], [t.x, 12], [t.x + 1.3, 10.3]] : wide ? [[t.x, t.y], [t.x + .5, 22]] : t.p === 'TE' ? [[t.x, t.y], [t.x + .4, 10], [t.x - .7, 9]] : [[t.x, t.y], [t.x + sg * -.8, 16]]; }
    if (role === 'rb') o.r = kind === 'run' ? [[t.x, t.y], [t.x - 1, t.y + 1.6], [t.x - .6, -1.2], [t.x - .1, 3], [t.x + .3, 9]] : [[t.x, t.y], [t.x + 4.2, t.y + .4], [t.x + 8.2, -3], [t.x + 11, .6]];
    return o; });
}
function simDefense(dk, call, off) {
  const snap = .2, len = dk.len || 3.2, N = Math.ceil((snap + len) / DT) + 2, run = dk.off === 'run', far = (m) => !!m.from && Math.hypot(m.from[0] - m.x, m.from[1] - m.y) > 1.5;
  const O = off.map((m) => ({ m, p: [m.x, m.y], s: 0, d: 0 })), qb = O.find((a) => a.m.role === 'qb'), rb = O.find((a) => a.m.role === 'rb');
  /* the receivers by number, one to five from the offense's right, the way the game numbers a man lock */
  const recv = O.filter((a) => a.m.role === 'rec' || a.m.role === 'rb').sort((a, b) => b.m.x - a.m.x);
  const Dm = call.men.map((m) => { const b = far(m) ? m.from : [m.x, m.y]; return { m, p: b.slice(), s: 0, eng: false, cls: LN(m) ? 'dl' : m.pos === 'LB' ? 'lb' : 'db' }; });
  Object.keys(dk.prot || {}).forEach((k) => { const a = O.find((x) => x.m.k === k), t = Dm.find((x) => x.m.k === dk.prot[k]); if (a && t) a.tgt = t; });
  const go = (a, to, vmax) => { const dx = to[0] - a.p[0], dy = to[1] - a.p[1], L = Math.hypot(dx, dy); if (L < .04) { a.s = 0; return; } a.s = Math.min(vmax, a.s + ACCEL * DT); const st = Math.min(L, a.s * DT); a.p = [a.p[0] + dx / L * st, a.p[1] + dy / L * st]; };
  const route = (a, vmax) => { if (!a.m.r) return; a.s = Math.min(vmax, a.s + ACCEL * DT); a.d = Math.min(plen(a.m.r), a.d + a.s * DT); a.p = along(a.m.r, a.d).slice(0, 2); };
  const frames = []; let stop = null, how = '', who = null, carrier = qb, wrap = null;
  for (let f = 0; f < N; f++) { const tt = f * DT - snap;
    if (tt > 0 && stop == null) {
      /* the backfield */
      if (run) { go(qb, tt < .55 ? [rb.m.x - 1.2, rb.m.y + 1] : [-2.6, -7.4], tt < .55 ? 4 : 3.4); if (tt > .1) route(rb, wrap == null ? 7.4 : 1.1); if (tt >= .55) carrier = rb; }
      else { go(qb, [0, -8.4], 5.2); if (rb && !rb.tgt) route(rb, 7.2); }
      /* blockers on the man they were given; receivers on their routes */
      Dm.forEach((d) => { d.eng = false; });
      for (const a of O) { if (a === qb || (a === rb && !a.tgt)) continue;
        if (a.tgt) { const T = a.tgt, coming = run || !!T.m.rush;
          if (coming) { const aim = run ? carrier.p : qb.p, L = Math.hypot(aim[0] - T.p[0], aim[1] - T.p[1]) || 1, want = [T.p[0] + (aim[0] - T.p[0]) / L * .9, T.p[1] + (aim[1] - T.p[1]) / L * .9]; if (!run) want[1] = Math.min(want[1], a.m.y - .25); go(a, want, run ? 5 : 4.6); if (dist(a.p, T.p) < 1.35) T.eng = true; }
          else go(a, [a.m.x, a.m.y - 1.5], 3.2); }
        else if (a.m.role === 'ol') go(a, [a.m.x, a.m.y - (run ? -1.2 : 1.5)], 3.6);
        else route(a, run ? 3.6 : a.m.pos === 'TE' ? 7 : 7.8); }
      /* the defense */
      for (const d of Dm) { const m = d.m, back = m.pos === 'FS' || m.pos === 'SS', corner = m.pos === 'CB';
        if (run) { const react = d.cls === 'dl' ? .08 : back ? .5 : corner ? .95 : .28; if (tt < react) continue;
          go(d, carrier.p, d.eng ? .6 : D_SPEED[d.cls] * (back || corner ? .94 : 1)); if (!d.eng && carrier === rb && wrap == null && dist(d.p, rb.p) < .95) { wrap = tt; how = 'tackle'; who = m.k; } continue; }
        if (tt < D_REACT[d.cls]) continue;
        if (m.rush) { go(d, tt < .34 ? m.rush[m.rush.length - 1] : qb.p, d.eng ? .9 : D_SPEED[d.cls]); if (!d.eng && dist(d.p, qb.p) < .95) { stop = tt; how = 'sack'; who = m.k; } }
        else if (m.zone) go(d, [m.zone[0], Math.min(m.zone[1], 19)], D_DROP[d.cls]);
        else if (m.man != null && recv[m.man - 1]) { const r = recv[m.man - 1].p; go(d, [r[0], r[1] + Math.max(.9, 4.5 - tt * 4)], 7.6); } } }
    /* the first hat wraps him up and the rest of the fit gets there: the play is over three quarters of a second later */
    if (wrap != null && stop == null && tt > wrap + .75) stop = tt;
    frames.push({ o: O.map((a) => a.p.slice()), d: Dm.map((a) => a.p.slice()), ball: [carrier.p[0], carrier.p[1], 1], caught: [] }); }
  const end = stop != null ? Math.min(snap + len, snap + stop + .5) : snap + len;
  return { frames, snap, end, stop, how, who, base: Dm.map((d) => ({ x: frames[0].d[Dm.indexOf(d)][0], y: frames[0].d[Dm.indexOf(d)][1] })), free: Dm.filter((d) => d.m.rush && !O.some((a) => a.tgt === d)).map((d) => d.m.k), wasted: O.filter((a) => a.tgt && !run && !a.tgt.m.rush).map((a) => a.m.k) };
}

function mount(host, cfg) {
  if (S && S.host === host && S.cfg === cfg) return S;
  unmount();
  const FORMS = cfg.kind === 'forms', PR = FORMS ? cfg.formations : cfg.principles, PLAY = (id) => cfg.plays[id], DEFENSE = cfg.side === 'D', NOUN = DEFENSE ? 'front' : 'formation', MK = markerOf(cssv('--team') || '#ff8200');
  const FD = cssv('--fd') || 'Anton, Impact, sans-serif', FC = cssv('--fc') || "'Barlow Condensed', sans-serif", FM = cssv('--fm') || "'Permanent Marker', cursive";
  const st = S = { host, cfg, kind: cfg.kind || 'intro', pi: FORMS ? -1 : 0, step: 0, prev: -1, t: 0, paused: false, T: 0, Tto: 0, cam: null, camFrom: null, walk: 0, walkFrom: 0, raf: 0, cache: {}, W: 0, H: 0, k: 1 };
  host.innerHTML = `<div class="pb${FORMS ? ' forms' : ''}" tabindex="0" role="group" aria-label="${FORMS ? 'The ' + NOUN + 's' : 'The principles on the field'}. Click to go on."><div class="pbfield"><canvas class="ifield"></canvas></div><div class="pbfront"></div><div class="pbtabs"></div><div class="pbpops" hidden></div><div class="pbstrip"><span class="flag" hidden></span><p class="say"></p><ol class="pts"></ol><div class="chips"></div></div><div class="pbctl"><button type="button" class="pbb back" aria-label="Back">&lsaquo;</button><span class="pbdots"></span><button type="button" class="pbb next">Next &rsaquo;</button><button type="button" class="pbb pause" aria-label="Pause or play">&#10074;&#10074;</button></div></div>`;
  const q = (s) => host.querySelector(s), cv = q('canvas'), main = cv.getContext('2d'), board = q('.pb'); let g = main; const NAVYC = cssv('--team2') || '#002244', GRNC = cssv('--team') || MK;
  const clone = (v) => ({ pos: v.pos.slice(), tgt: v.tgt.slice(), fov: v.fov });
  /* ---- a deck made ready: the play simulated once, every step's clock, camera and alignment resolved ---- */
  const kindOf = (p) => (p.subtype === 'RPO' ? 'rpo' : p.type === 'Run Game' ? 'run' : 'pass');
  /* where a look attacks, BY THE READS: only the men his reads name are counted, the first read of a call three times, the
     second twice, later reads a little, and only the part of the route where the ball is caught (from the last break on).
     A run is counted along its path. Two yard squares, softened once. */
  const rankOf = (p, m) => { const r = p.reads || [], k = m.role === 'qb' ? 'qb' : m.k; for (let i = 0; i < r.length; i++) if (r[i].includes(k)) return i; return 9; };
  const isRun = (p, m) => { if (m.role === 'qb') return true; if (!m.r || m.r.length < 2 || p.type !== 'Run Game') return false; const e = m.r[m.r.length - 1]; return m.y < -4 && Math.abs(m.x) < 8 && e[1] < 8 && Math.abs(e[0]) < 10; };
  const cutAt = (pl, yMax) => { const out = [pl[0]]; for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i]; if (b[1] <= yMax) { out.push(b); continue; } if (a[1] < yMax) { const t = (yMax - a[1]) / (b[1] - a[1]); out.push([lerp(a[0], b[0], t), yMax]); } break; } return out; };
  const catchPart = (pl) => { pl = cutAt(pl, 32); const L = plen(pl); if (pl.length < 2 || L < .5) return pl; let acc = 0, lastV = 0; for (let i = 1; i < pl.length - 1; i++) { acc += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]); lastV = acc; } const from = pl.length > 2 ? Math.min(lastV, L * .55) : L * .55, out = [along(pl, from)]; acc = 0; for (let i = 1; i < pl.length; i++) { acc += Math.hypot(pl[i][0] - pl[i - 1][0], pl[i][1] - pl[i - 1][1]); if (acc > from) out.push(pl[i]); } return out; };
  function heatOf(plays) { const X0 = -27, Y0 = -9, CS = 2, GW = 27, GH = 22, grid = new Float32Array(GW * GH); let deep = 0, mid = 0, short = 0, runs = 0, wide = 0, throws = 0;
    /* den = weight per yard of line; a short catch (a hitch, a sit) is packed up to four yards' worth so it reads as a spot */
    const add = (pl, den) => { for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / .5)); for (let k = 0; k <= n; k++) { const x = lerp(a[0], b[0], k / n), y = Math.min(lerp(a[1], b[1], k / n), Y0 + GH * CS - .01), gx = Math.floor((x - X0) / CS), gy = Math.floor((y - Y0) / CS); if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) grid[gy * GW + gx] += den * L / (n + 1); } } };
    const packed = (pl) => Math.max(1, 4 / Math.max(plen(pl), .5));
    for (const p of plays) { for (const m of p.men) { if (m.role === 'ol') continue; const rk = rankOf(p, m), w = rk === 0 ? 3 : rk === 1 ? 2 : rk < 9 ? .5 : 0; if (!w) continue;
        if (m.role === 'qb' && !(m.r && m.r.length > 1)) add([[m.x, 0], [m.x, 8]], w * .8); else if (!m.r || m.r.length < 2) continue; else if (isRun(p, m)) add(cutAt(m.r, 32), w); else { const c = catchPart(m.r); add(c, w * packed(c)); (m.alts || []).forEach((a) => { const ca = cutAt(a, 32); add(ca, w * .6 * packed(ca)); }); } }
      /* the count beside the map: where the first two reads of this call go */
      (p.reads || []).slice(0, 2).forEach((keys) => { const m = keys.map((k) => p.men.find((q) => (q.role === 'qb' ? 'qb' : q.k) === k)).find((q) => q && (q.role === 'qb' || (q.r && q.r.length > 1))); if (!m) return; if (isRun(p, m)) { runs++; return; } const e = m.r[m.r.length - 1]; throws++; if (e[1] < 5) short++; else if (e[1] < 15) mid++; else deep++; if (Math.abs(e[0]) > 14.2) wide++; }); }
    const soft = new Float32Array(GW * GH); let mx = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let a = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue; const k = dx || dy ? 1 : 3; a += grid[yy * GW + xx] * k; n += k; } soft[y * GW + x] = a / n; mx = Math.max(mx, a / n); }
    const cells = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const v = Math.min(1, soft[y * GW + x] / ((mx || 1) * .8)); if (v > .08) cells.push([X0 + (x + .5) * CS, Y0 + (y + .5) * CS, v]); }
    return { cells, CS, say: 'Where the first two reads go, across ' + plays.length + (plays.length === 1 ? ' call:' : ' calls:'), lines: ['Deep, 15 yards and over: ' + deep, 'Middle, 5 to 15: ' + mid, 'Short or behind the line: ' + short].concat(runs ? ['Runs: ' + runs] : []).concat(throws ? ['Outside the numbers: ' + wide + ' of the ' + throws + ' throws'] : []) }; }
  /* a name stamped across the sheet: one line, or two when it is a long one */
  function nameStamp(name) { let lines = [name]; if (name.length > 15 && name.includes(' ')) { const sp = [...name].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i > 0), mid = sp.reduce((a, b) => (Math.abs(b - name.length / 2) < Math.abs(a - name.length / 2) ? b : a)); lines = [name.slice(0, mid), name.slice(mid + 1)]; }
    const sz = Math.min(4.4, 44 / (Math.max(...lines.map((l) => l.length)) * .5)); return lines.length === 1 ? [{ t: lines[0], x: 0, y: 16, s: sz }] : [{ t: lines[0], x: 0, y: 16 + sz * 1.25, s: sz }, { t: lines[1], x: 0, y: 16, s: sz, c: 'mk' }]; }
  function formDeck(i) { if (DEFENSE) return formDeckD(i); const fm = PR[i], plays = fm.plays.map(PLAY).filter(Boolean), tile = (cfg.tiles && cfg.tiles[fm.name]) || (plays[0] ? plays[0].men.map((m) => ({ x: m.x, y: m.y, p: m.pos })) : []);
    const olx = tile.filter((t) => t.p === 'OL').map((t) => t.x).sort((a, b) => a - b), OLN = ['LT', 'LG', 'C', 'RG', 'RT'];
    const men = tile.map((t) => ({ x: t.x, y: t.y, off: 1, qb: t.p === 'QB', pos: t.p === 'OL' ? OLN[olx.indexOf(t.x)] || 'OL' : t.p })), mix = { run: 0, pass: 0, rpo: 0 }; plays.forEach((p) => { mix[kindOf(p)]++; });
    const n = plays.length, shows = fm.show || [], label = (sh) => { if (!sh) return ''; const ps = (sh.plays || [sh.play]).map(PLAY).filter(Boolean); return sh.label ? String(sh.label).toUpperCase() : ps.length > 2 ? ps.length + ' CALLS' : ps.map((p) => p.name.toUpperCase()).join('  +  '); };
    const steps = [{ k: 'look', cam: 'title', paint: nameStamp(fm.name.toUpperCase()), say: fm.desc || '' },
      { k: 'all', cam: 'wide', paint: [{ t: n + (n === 1 ? ' CALL' : ' CALLS') + ', ONE PICTURE', x: 0, y: -11.6, s: 2.6 }], say: n + (n === 1 ? ' call comes' : ' calls come') + ' out of this one picture. Orange is the first read on each call, dark ink the second.', chips: plays.map((p) => p.name), mix },
      { k: 'heat', cam: 'deep', paint: [{ t: 'WHERE IT ATTACKS', x: 0, y: -11.6, s: 2.6 }], pts: null }]
      .concat((fm.bullets || []).map((b, j) => { const lb = label(shows[j]); const one = shows[j] && !shows[j].plays ? PLAY(shows[j].play) : null, rn = one && one.readNames ? one.readNames.slice(0, 5).filter(Boolean) : []; return { k: 'does', cam: 'wide', show: shows[j] || null, say: b, pts: rn.length ? rn : null, reads: rn.length > 0, paint: lb ? [{ t: lb, x: 0, y: -11.6, s: Math.min(2.6, 40 / (lb.length * .5)) }] : [] }; }));
    const heat = heatOf(plays); steps[2].pts = heat.lines; steps[2].say = heat.say;
    return (st.cache[i] = { form: true, fm, plays, men, mix, heat, steps, tt: steps.map(() => 0), cams: steps.map((x) => x.cam), walks: steps.map(() => 1), counts: steps.map(() => null), R: { snap: 0, end: 0 } }); }
  function deckOf(pi) { if (st.cache[pi]) return st.cache[pi]; if (FORMS) return formDeck(pi); if (DEFENSE) return deckOfD(pi); const dk = PR[pi].deck, p = PLAY(dk.play), snap = .2;
    const sc = Object.assign({}, dk, { snap, end: snap + (dk.len || 4), beats: [], cam: [] });
    sc.throws = (dk.throws || []).map((th) => Object.assign({}, th, { at: th.at + snap, catch: (th.catch == null ? th.at + 1 : th.catch) + snap }));
    if (dk.hand) sc.hand = Object.assign({}, dk.hand, { at: dk.hand.at + snap });
    if (dk.run && dk.run.afterCatch != null) sc.run = Object.assign({}, dk.run, { afterCatch: dk.run.afterCatch + snap });
    sc.def = (dk.def || []).map((o) => (o.until != null ? Object.assign({}, o, { until: o.until + snap }) : o));
    const R = prepScene(sc, p), sim = simulate(R, p, cfg.blocking || null), base = shellOf({ cov: dk.cov }), steps = dk.steps;
    let cur = 0, cam = 'wide', wk = steps.some((s) => s.walk != null) ? 0 : 1, cnt = null;
    const tt = [], cams = [], walks = [], counts = [];
    steps.forEach((s) => { if (s.to != null) cur = s.to === 'pre' ? 0 : s.to === 'set' ? R.snap : s.to === 'end' ? R.end : R.snap + s.to; tt.push(Math.min(cur, R.end)); if (s.cam != null) cam = s.cam; cams.push(cam); if (s.walk != null) wk = s.walk; walks.push(wk); if (s.count) cnt = s.count; counts.push(s.count ? { spec: s.count, live: true } : s.counted && cnt ? { spec: cnt, live: false } : null); });
    return st.cache[pi] = { dk, p, R, sim, base, steps, tt, cams, walks, counts, keys: sim.keys, qbi: p.men.findIndex((m) => m.role === 'qb') }; }
  const D = () => deckOf(st.pi), STEP = () => D().steps[st.step];
  /* ---- where everybody is on the play clock ---- */
  function posNow() { if (D().form) return null; const d = D(), F = d.sim.frames, u = clamp(st.T, 0, d.R.end) / DT, i0 = Math.min(F.length - 1, Math.floor(u)), i1 = Math.min(F.length - 1, i0 + 1), k = u - i0, a = F[i0], b = F[i1], pre = st.T <= d.R.snap + 1e-6;
    return { o: a.o.map((p, i) => [lerp(p[0], b.o[i][0], k), lerp(p[1], b.o[i][1], k)]), d: a.d.map((p, i) => (pre ? [lerp(d.base[i].x, p[0], st.walk), lerp(d.base[i].y, p[1], st.walk)] : [lerp(p[0], b.d[i][0], k), lerp(p[1], b.d[i][1], k)])), ball: pre ? [0, -.3, .3] : a.ball.map((v, i) => lerp(v, b.ball[i], k)), caught: a.caught || [], pre }; }
  const manPos = (key) => { const d = D(); if (d.defDeck) { if (!st.p) return null; const a = d.call.men.findIndex((m) => m.k === key); if (a >= 0) return st.p.d[a]; const b = d.off.findIndex((m) => m.k === key); return b >= 0 ? st.p.o[b] : null; } const i = key === 'qb' ? d.qbi : d.keys.indexOf(key); return i >= 0 ? st.p.o[i] : null; };
  const defIdx = (lb) => D().sim.shell.map((x, i) => i).filter((i) => D().sim.shell[i].lb === lb);
  function viewOf(c) { if (!c) return PVIEWS.wide; if (typeof c === 'string') return PVIEWS[c] || PVIEWS.wide; if (c.follow) { const p = manPos(c.follow) || [0, 0]; return { pos: [p[0] * .6, p[1] - 14, 30], tgt: [p[0] * .6, p[1] + 4, 0], fov: 38 }; } return c; }
  /* ---- the lens: shifted right on a wide board, so the field clears the tabs and the strip on the left ---- */
  const sub = (a, c) => [a[0] - c[0], a[1] - c[1], a[2] - c[2]], dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2], cross = (a, c) => [a[1] * c[2] - a[2] * c[1], a[2] * c[0] - a[0] * c[2], a[0] * c[1] - a[1] * c[0]], nrm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  function proj() { const W = st.W, H = st.H, f = nrm(sub(st.cam.tgt, st.cam.pos)), r = nrm(cross(f, [0, 0, 1])), u = cross(r, f), s = (H / 2) / Math.tan(st.cam.fov * Math.PI / 360), cx = W * (W > 900 ? .6 : .5);
    const P = (p) => { const d = sub(p, st.cam.pos), z = dot(d, f); if (z < .5) return null; return [cx + dot(d, r) / z * s, H / 2 - dot(d, u) / z * s, s / z]; }; P.f = f; return P; }
  function size() { st.W = cv.clientWidth || 1000; st.H = cv.clientHeight || Math.round(st.W / 2.4); let k = Math.min(devicePixelRatio || 1, 2); const stage = host.closest('.stage'); if (stage) { const s = parseFloat(getComputedStyle(stage).getPropertyValue('--s')); if (s > 0) k = Math.min(2, k * s); } st.k = k; cv.width = Math.round(st.W * k); cv.height = Math.round(st.H * k); }
  /* ---- ink ---- */
  let P = null;
  function quad(pts, fill, stroke, lw) { const z = pts.map(([x, y]) => P([x, y, .02])); if (z.some((v) => !v)) return; g.beginPath(); z.forEach((v, i) => (i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = lw || 2; g.stroke(); } }
  function seg(a, b, col, lw, dash, alpha) { const A = P([a[0], a[1], .03]), B = P([b[0], b[1], .03]); if (!A || !B) return; g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.setLineDash(dash || []); g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke(); g.restore(); }
  /* a line along the ground, cut into short pieces so it bends with the sheet; prog draws it on */
  function poly(pts, col, lw, dash, alpha, prog) { const fine = []; for (let i = 0; i < pts.length; i++) { if (!i) { fine.push(pts[0]); continue; } const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5)); for (let s = 1; s <= n; s++) fine.push([lerp(a[0], b[0], s / n), lerp(a[1], b[1], s / n)]); }
    const n = Math.max(2, Math.round(fine.length * (prog == null ? 1 : prog))); g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath(); let on = false, last = null, before = null;
    for (let i = 0; i < n && i < fine.length; i++) { const p = fine[i]; if (p[1] > 47) break; const z = P([p[0], p[1], .04]); if (!z) { on = false; continue; } on ? g.lineTo(z[0], z[1]) : g.moveTo(z[0], z[1]); on = true; before = last; last = z; } g.stroke(); g.restore(); return last && before ? [before, last] : null; }
  function tip(ends, col, size, alpha) { if (!ends) return; const [A, B] = ends, an = Math.atan2(B[1] - A[1], B[0] - A[0]); g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = col; g.translate(B[0], B[1]); g.rotate(an); g.beginPath(); g.moveTo(size, 0); g.lineTo(-size * .6, size * .7); g.lineTo(-size * .6, -size * .7); g.closePath(); g.fill(); g.restore(); }
  function note(x, y, str, px, col, alpha, rot) { const s = P([x, y, 0]); if (!s) return; g.save(); g.translate(s[0], s[1]); g.rotate(rot || 0); g.globalAlpha = alpha == null ? 1 : alpha; g.font = '400 ' + px + 'px ' + FM; g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(str, 0, 0); g.restore(); }
  /* worn ink for the stamps: a fill with the grain knocked out of it, so a stamped word looks pressed onto the paper */
  const PATS = {}; function pat(col) { if (PATS[col]) return PATS[col]; const c = document.createElement('canvas'); c.width = c.height = 160; const x = c.getContext('2d'); x.fillStyle = col; x.fillRect(0, 0, 160, 160); x.globalCompositeOperation = 'destination-out'; let sd = 7; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 340; i++) { x.globalAlpha = .25 + rnd() * .55; const r = rnd() < .93 ? .5 + rnd() * 1.1 : 1.6 + rnd() * 1.8; x.beginPath(); x.arc(rnd() * 160, rnd() * 160, r, 0, 7); x.fill(); }
    for (let i = 0; i < 14; i++) { x.globalAlpha = .1 + rnd() * .18; x.fillRect(rnd() * 160, rnd() * 160, 24 + rnd() * 70, .8 + rnd() * 1.6); }
    return (PATS[col] = g.createPattern(c, 'repeat')); }
  const meas = document.createElement('canvas').getContext('2d'), WC = new Map(); let fontsOk = !(document.fonts && document.fonts.ready); if (!fontsOk) document.fonts.ready.then(() => { fontsOk = true; WC.clear(); if (S !== st) return; if (st.pi < 0) drawFront(); else if (st.cam) draw(); });
  /* words on the field: every letter takes its own slice of the perspective, so the line lies down with the sheet. A stamp is
     block type in worn ink, each letter a hair off true like hand set type; marker is handwriting in the team colour. */
  function paint(str, cx, cy, size, marker, col, alpha) { if (alpha <= .01) return; const font = '400 100px ' + (marker ? FM : FD); meas.font = font; const chars = [...str];
    const ws = chars.map((ch) => { const key = font + ch; if (!WC.has(key) || !fontsOk) WC.set(key, meas.measureText(ch).width / 100); return WC.get(key) * size + (marker ? .01 : .05) * size; });
    let x = cx - ws.reduce((a, b) => a + b, 0) / 2; const k = size / 100 * st.k, fill = marker ? col : pat(col);
    g.save(); g.globalAlpha = alpha * (marker ? .95 : 1); g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillStyle = fill;
    chars.forEach((ch, i) => { const w = ws[i], mx = x + w / 2; x += w; if (ch === ' ') return; const p0 = P([mx, cy, 0]), px = P([mx + 1, cy, 0]), py = P([mx, cy + 1, 0]); if (!p0 || !px || !py) return;
      g.setTransform((px[0] - p0[0]) * k, (px[1] - p0[1]) * k, -(py[0] - p0[0]) * k, -(py[1] - p0[1]) * k, p0[0] * st.k, p0[1] * st.k);
      if (!marker) { g.rotate(Math.sin(i * 12.9898 + str.length * 4.1) * .02); g.translate(0, Math.sin(i * 7.3 + 1) * 1.8); if (fill && fill.setTransform) { try { const ppy = Math.hypot(px[0] - p0[0], px[1] - p0[1]) || 1, sc = 100 / (size * ppy); fill.setTransform(new DOMMatrix().scale(sc).translate((i * 37) % 160, (i * 53) % 160)); } catch (e) {} } }
      g.fillText(ch, 0, 0); });
    g.restore(); }
  function scribble(cx, cy, rx, ry, prog, col, lw, seed) { if (prog <= 0) return; g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.globalAlpha *= .92; g.beginPath(); const n = Math.max(2, Math.floor(72 * prog)); for (let i = 0; i <= n; i++) { const a = -2.3 + (i / 72) * Math.PI * 2.14, w = 1 + .035 * Math.sin(a * 3 + seed) + .02 * Math.sin(a * 7.3 + seed * 2), x = cx + Math.cos(a) * rx * w, y = cy + Math.sin(a) * ry * w; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.restore(); }
  function tally(x, y, h, n, col, lw) { const gap = h * .42; g.save(); g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; for (let i = 0; i < n; i++) { const grp = Math.floor(i / 5), k = i % 5, gx = x + grp * gap * 5.4; g.beginPath(); if (k < 4) { const lx = gx + k * gap, lean = h * (.05 + .03 * Math.sin(i * 2.1)); g.moveTo(lx + lean, y - h / 2); g.lineTo(lx - lean, y + h / 2); } else { g.moveTo(gx - gap * .5, y + h * .32); g.lineTo(gx + gap * 3.5, y - h * .32); } g.stroke(); } g.restore(); }
  /* a defender's position name from the formation tile he came out of, by where he lines up */
  const defPos = (cov, d, b) => { const tile = (cfg.forms && (cov === 'c0' ? cfg.forms.over : cfg.forms.even)) || []; let best = null, bd = 3; for (const t of tile) { const dd = Math.hypot(t.x - b.x, t.y - b.y); if (dd < bd) { bd = dd; best = t; } } return best ? best.p : d.rush ? 'DL' : d.zone && d.zone[1] >= 15 ? 'S' : 'LB'; };
  /* the men: O for us, X for them, the position under each; a mark rings a man, numbers him or tags him */
  function inkMen(list, sq) { const f = P.f; list.sort((a, b) => (b.x * f[0] + b.y * f[1]) - (a.x * f[0] + a.y * f[1]));
    for (const m of list) { const z = P([m.x, m.y, 0]); if (!z) continue; const k = z[2], r = clamp(k * .6, 5, 18), mk = m.mk || {}; g.save();
      if (m.disc) { const rr = clamp(k * .86, 8.5, 24) * (m.grow == null ? 1 : m.grow); if (rr > 1.5) { g.textAlign = 'center';
          if (mk.ring) { g.strokeStyle = mk.ring; g.lineWidth = 3; g.beginPath(); g.ellipse(z[0], z[1], rr + 6, (rr + 6) * sq, 0, 0, 7); g.stroke(); }
          g.fillStyle = NAVYC; g.strokeStyle = GRNC; g.lineWidth = Math.max(1.8, rr * .16); g.beginPath(); g.ellipse(z[0], z[1], rr, rr * sq, 0, 0, 7); g.fill(); g.stroke();
          if (m.num != null) { g.fillStyle = '#fff'; g.font = '400 ' + (rr * (String(m.num).length > 1 ? 1.02 : 1.18) * sq) + 'px ' + FD; g.textBaseline = 'middle'; g.fillText(String(m.num), z[0], z[1] + rr * .05); }
          if (mk.tag) { g.font = '400 ' + clamp(k * 1.3, 14, 26) + 'px ' + FM; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.strokeStyle = SHEET; g.lineWidth = 5; g.strokeText(mk.tag, z[0], z[1] - rr * sq - 9); g.fillStyle = NAVYC; g.fillText(mk.tag, z[0], z[1] - rr * sq - 9); }
          if (m.nm && k > 4) { g.fillStyle = 'rgba(23,19,14,.86)'; g.font = '800 ' + clamp(k * .74, 10, 15) + 'px ' + FC; if (m.up && !mk.tag) { g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.strokeStyle = SHEET; g.lineWidth = 4; g.strokeText(m.nm, z[0], z[1] - rr * sq - 6); g.fillText(m.nm, z[0], z[1] - rr * sq - 6); } else { g.textBaseline = 'top'; g.fillText(m.nm, z[0], z[1] + rr * sq + 3); } } }
        g.restore(); continue; }
      if (mk.ring) { g.strokeStyle = mk.ring; g.lineWidth = 2.8; g.beginPath(); g.ellipse(z[0], z[1], r + 5, (r + 5) * sq, 0, 0, 7); g.stroke(); }
      if (m.ghost) { g.strokeStyle = 'rgba(23,19,14,.32)'; g.lineWidth = 1.6; g.beginPath(); g.ellipse(z[0], z[1], r * .82, r * .82 * sq, 0, 0, 7); g.stroke(); }
      else if (m.off) { g.fillStyle = m.qb ? MK : '#fbf6e8'; g.strokeStyle = m.dim ? 'rgba(23,19,14,.5)' : INKC; g.lineWidth = m.dim ? 1.7 : 2; g.beginPath(); g.ellipse(z[0], z[1], r, r * sq, 0, 0, 7); g.fill(); g.stroke(); }
      else { g.strokeStyle = m.xc || REDC; g.lineWidth = Math.max(2, r * (m.xc ? .36 : .3)); g.lineCap = 'round'; const e = r * .78, ev = e * sq; g.beginPath(); g.moveTo(z[0] - e, z[1] - ev); g.lineTo(z[0] + e, z[1] + ev); g.moveTo(z[0] + e, z[1] - ev); g.lineTo(z[0] - e, z[1] + ev); g.stroke(); }
      g.textAlign = 'center';
      if (mk.num) { g.fillStyle = mk.numCol || INKC; g.font = '400 ' + clamp(k * 1.5, 12, 30) + 'px ' + FM; g.textBaseline = 'alphabetic'; g.fillText(mk.num, z[0], z[1] - r * sq - 6); }
      else if (mk.tag) { g.fillStyle = MK; g.font = '400 ' + clamp(k * 1.25, 13, 26) + 'px ' + FM; g.textBaseline = 'alphabetic'; g.fillText(mk.tag, z[0], z[1] - r * sq - 8); }
      if (k > 5 && m.pos) { g.fillStyle = 'rgba(23,19,14,.78)'; g.font = '700 ' + (m.xc ? clamp(k * .95, 12, 18) : clamp(k * .6, 9, 13)) + 'px ' + FC; g.textBaseline = 'top'; g.fillText(m.pos, z[0], z[1] + r * sq + 3); }
      g.restore(); } }
  /* a formation step: the look, every call, the heat map, or one thing it does well */
  function drawForm(d, s, en, sq, lwM) { const INK7 = 'rgba(23,19,14,.66)', INK5 = 'rgba(23,19,14,.5)';
    const routes = (p, o) => { for (const m of p.men) { if (m.role === 'ol') continue; const hot = !!o.lit && m.k === o.lit, col = hot ? MK : o.col, lw = hot ? lwM : o.lw, pr = hot ? o.hotProg : o.prog, done = pr >= .98 ? 1 : 0, start = m.mot ? m.mot[m.mot.length - 1] : [m.x, m.y];
        if (m.mot) tip(poly(m.mot, hot ? MK : INK5, hot ? lwM * .8 : 2, [5, 6], 1, pr), hot ? MK : INK5, hot ? 8 : 6, done);
        if (m.r && m.r.length > 1) { tip(poly(m.r, col, lw, null, 1, pr), col, hot ? 10 : 6, done); if (o.alts) (m.alts || []).forEach((a) => tip(poly(a, hot ? MK : INK5, 2, [4, 6], 1, pr), hot ? MK : INK5, 6, done)); }
        else if (o.blocks && m.rel && m.rel.length) poly([start].concat(m.rel), INK5, 2, [2, 5], 1, pr); } };
    /* a call drawn by its reads: the first read in marker, the second in dark ink, the rest faint (or one flat colour under the heat map) */
    const byRead = (p, pr, tier, flat) => { for (const m of p.men) { if (m.role === 'ol') continue; const rk = rankOf(p, m), tr = rk === 0 ? 0 : rk === 1 ? 1 : 2; if (tr !== tier) continue; const done = pr >= .98 ? 1 : 0, col = flat || (tr === 0 ? MK : tr === 1 ? 'rgba(23,19,14,.86)' : 'rgba(23,19,14,.2)'), lw = flat ? 1.5 : tr === 0 ? lwM * .8 : tr === 1 ? 2.6 : 1.3;
        if (m.r && m.r.length > 1) { if (m.mot && tr < 2) poly(m.mot, col, 2, [5, 6], .7, pr); tip(poly(m.r, col, lw, null, 1, pr), col, flat ? 5 : tr === 0 ? 9 : tr === 1 ? 7 : 4, done); if (tr < 2) (m.alts || []).forEach((a) => tip(poly(a, col, flat ? 1.3 : 2, [4, 6], .85, pr), col, 5, done)); }
        else if (m.role === 'qb' && tr < 2) tip(poly([[m.x, m.y], [m.x, 7]], col, lw, [9, 8], 1, pr), col, flat ? 5 : 9, done); } };
    let list = d.men.map((m) => Object.assign({}, m)), nums = null;
    const numbersOf = (p0) => { const seen = {}, out = []; (p0.reads || []).slice(0, 5).forEach((keys, i) => { const m = keys.map((k) => p0.men.find((q) => (q.role === 'qb' ? 'qb' : q.k) === k)).find((q) => q && (q.role === 'qb' || (q.r && q.r.length > 1))); if (!m) return; const id = m.role === 'qb' ? 'qb' : m.k; if (seen[id]) { seen[id].n.push(i + 1); return; }
        let at, keep = false; if (m.r && m.r.length > 1) { const c = cutAt(m.r, 21), e = c[c.length - 1], b = c[c.length - 2] || e, L = Math.hypot(e[0] - b[0], e[1] - b[1]) || 1; at = [clamp(e[0] + (e[0] - b[0]) / L * 2, -25, 25), e[1] + (e[1] - b[1]) / L * 2 + .5]; } else { at = [m.x + 3, 3]; keep = true; }
        seen[id] = { n: [i + 1], at, keep, m }; out.push(seen[id]); }); if (out.length === 1) out[0].n = []; return out; };
    if (s.k === 'all') [2, 1, 0].forEach((tier) => d.plays.forEach((p, j) => byRead(p, en(.35 + j * .18, .55), tier)));
    else if (s.k === 'heat') { const grow = en(.3, .9); [1, 0].forEach((tier) => d.plays.forEach((p) => byRead(p, 1, tier, 'rgba(23,19,14,.3)')));
      g.save(); g.fillStyle = MK; for (const c of d.heat.cells) { const z = P([c[0], c[1], .02]); if (!z) continue; const r = z[2] * d.heat.CS * .58 * Math.sqrt(c[2]) * grow; if (r < .6) continue; g.globalAlpha = .3 + .55 * c[2]; g.beginPath(); g.ellipse(z[0], z[1], r, r * sq, 0, 0, 7); g.fill(); } g.restore(); }
    else if (s.k === 'does') { const sh = s.show, ps = sh ? (sh.plays || [sh.play]).map(PLAY).filter(Boolean) : d.plays;
      ps.forEach((p, j) => routes(p, { col: sh ? INK7 : 'rgba(23,19,14,.3)', lw: 2, prog: en(.2 + j * .15, .5), lit: sh && sh.lit, hotProg: en(.45, .75), alts: !!sh, blocks: !!sh }));
      if (sh && sh.box) { const [x0, y0, x1, y1] = sh.box, a = P([x0, (y0 + y1) / 2, 0]), b = P([x1, (y0 + y1) / 2, 0]), c0 = P([(x0 + x1) / 2, y0, 0]), c1 = P([(x0 + x1) / 2, y1, 0]); if (a && b && c0 && c1) scribble((a[0] + b[0]) / 2, (c0[1] + c1[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(c0[1] - c1[1]) / 2, en(.3, .8), MK, lwM, 1.7); }
      if (sh && sh.path) tip(poly(sh.path, MK, lwM * .8, [9, 8], .9, en(.45, .7)), MK, 10, en(.9, .3));
      if (sh && ps.length === 1) { nums = numbersOf(ps[0]); for (const nm of nums) if (nm.keep && !sh.path) tip(poly([[nm.m.x, nm.m.y], [nm.m.x, 6]], MK, lwM * .7, [9, 8], .9, en(.45, .7)), MK, 9, en(.9, .3)); }
      if (ps[0]) list = ps[0].men.map((m) => ({ x: m.x, y: m.y, off: 1, qb: m.role === 'qb', pos: m.pos || '', mk: sh && sh.lit && m.k === sh.lit ? { ring: MK } : null })); }
    inkMen(list, sq);
    /* the reads, written on in marker one after another, each circled */
    if (nums) nums.forEach((nm, j) => { const a = en(.7 + j * .32, .32); if (a <= .01) return; const z = P([nm.at[0], nm.at[1], 0]); if (!z) return; const txt = nm.n.join(','), px = clamp(st.H * .064, 22, 46); if (!txt) return;
      g.save(); g.globalAlpha = a; g.font = '400 ' + px + 'px ' + FM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = SHEET; g.lineWidth = 7; g.strokeText(txt, z[0], z[1]); g.fillStyle = MK; g.fillText(txt, z[0], z[1]);
      scribble(z[0], z[1] - px * .04, px * (.56 + .24 * (txt.length - 1)), px * .64, a, MK, Math.max(2.4, st.H * .005), j * 1.3 + .4); g.restore(); }); }
  /* ================= THE FRONTS: A DEFENSE ON THE SAME BOARD (2026-10-09) =================
     His call: the same presentation for a defense, starting with the fronts, seen from behind the offense the way the
     game shows it. The defense is the star: our eleven are dark ink Xs with the game's position names, the offense is a
     faint plain look. A rusher is a marker lane, a dropper an ink leader to the zone the game names him to, a man
     defender a dashed line to the receiver he is locked on. All of it is read from the game's play art, the same data
     the cards are drawn from; his setups (fm.setups) and who he users (show.user) come from his own setup lines. */
  const ZNAME = { 'deep-quarter': 'QUARTER', 'deep-half': 'DEEP HALF', 'deep-third': 'DEEP THIRD', 'quarter-flat': 'QUARTER FLAT', 'rec-hook': '3 REC HOOK', curl: 'CURL', 'middle-read': 'MID READ', 'cloud-flat': 'CLOUD FLAT', 'curl-flat': 'CURL FLAT', 'hook-curl': 'HOOK CURL', 'seam-flat': 'SEAM FLAT', 'vertical-hook': 'VERT HOOK', 'soft-squat': 'SOFT SQUAT' };
  const QBD = [0, -6], NUMW = { 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven', 8: 'Eight' };
  /* a rusher's lane: the game's first step, then on toward the quarterback */
  const laneOf = (m) => { const a = m.rush[0], b = m.rush[m.rush.length - 1]; return [a, b, [lerp(b[0], QBD[0], .45), lerp(b[1], QBD[1], .45)]]; };
  const walked = (m) => !!m.from && Math.hypot(m.from[0] - m.x, m.from[1] - m.y) > 1.5;
  const callsN = (n) => n + (n === 1 ? ' call' : ' calls');
  function softCells(grid, GW, GH, X0, Y0, CS, floor) { const soft = new Float32Array(GW * GH); let mx = 0; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { let a = 0, n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= GW || yy >= GH) continue; const k = dx || dy ? 1 : 3; a += grid[yy * GW + xx] * k; n += k; } soft[y * GW + x] = a / n; mx = Math.max(mx, a / n); }
    const cells = []; for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) { const v = Math.min(1, soft[y * GW + x] / ((mx || 1) * .8)); if (v > floor) cells.push([X0 + (x + .5) * CS, Y0 + (y + .5) * CS, v]); } return cells; }
  /* where the rush comes from: every rusher's lane, a blitzer off the second level three times a lineman. One yard squares. */
  function pressOf(plays) { const X0 = -14, Y0 = -8, CS = 1, GW = 28, GH = 24, grid = new Float32Array(GW * GH), by = {}; let nb = 0, lb = 0, sf = 0;
    const add = (pl, w) => { for (let i = 1; i < pl.length; i++) { const a = pl[i - 1], b = pl[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L / .4)); for (let k = 0; k <= n; k++) { const gx = Math.floor((lerp(a[0], b[0], k / n) - X0) / CS), gy = Math.floor((lerp(a[1], b[1], k / n) - Y0) / CS); if (gx >= 0 && gx < GW && gy >= 0 && gy < GH) grid[gy * GW + gx] += w * L / (n + 1); } } };
    for (const p of plays) { const rs = p.men.filter((m) => m.rush); by[rs.length] = (by[rs.length] || 0) + 1; if (rs.some((m) => m.pos === 'NB')) nb++; if (rs.some((m) => m.pos === 'LB')) lb++; if (rs.some((m) => m.pos === 'FS' || m.pos === 'SS')) sf++;
      for (const m of rs) { const w = LN(m) ? 1 : 3; if (walked(m)) add([m.from, [m.x, m.y]], w * .4); add(laneOf(m), w); } }
    const who = [nb ? 'the nickel on ' + nb : '', lb ? 'a linebacker on ' + lb : '', sf ? 'a safety on ' + sf : ''].filter(Boolean);
    return { cells: softCells(grid, GW, GH, X0, Y0, CS, .1), CS, say: 'Where the rush comes from, across ' + callsN(plays.length) + '. A blitzer off the second level counts three times a lineman.',
      lines: Object.keys(by).map(Number).sort((a, b) => a - b).map((n) => (NUMW[n] || n) + ' rush: ' + callsN(by[n])).concat(who.length ? ['Besides the line: ' + who.join(', ')] : []) }; }
  /* where the coverage sits: every zone the game names a man to, counted once per call. Two yard squares. */
  function coverOf(plays) { const X0 = -27, Y0 = -9, CS = 2, GW = 27, GH = 22, grid = new Float32Array(GW * GH); let man = 0, drop = 0; const kinds = [];
    for (const p of plays) { if (p.men.filter((m) => m.man != null).length >= 3) man++; if (p.men.some((m) => LN(m) && m.zone)) drop++; if (p.subtype && !kinds.includes(p.subtype)) kinds.push(p.subtype);
      for (const m of p.men) { if (!m.zone) continue; const [cx, cy, rx, ry] = m.zone; for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const x = X0 + (gx + .5) * CS, y = Y0 + (gy + .5) * CS, dx = (x - cx) / (rx + CS * .35), dy = (y - cy) / (ry + CS * .35); if (dx * dx + dy * dy <= 1) grid[gy * GW + gx] += 1; } } }
    const zone = plays.length - man;
    return { cells: softCells(grid, GW, GH, X0, Y0, CS, .12), CS, kinds, say: 'Where the coverage sits, across ' + callsN(plays.length) + '.',
      lines: [zone ? 'Zone or match behind ' + callsN(zone) : '', man ? 'Man behind ' + callsN(man) : '', drop ? 'A lineman drops into coverage on ' + drop : ''].filter(Boolean) }; }
  function formDeckD(i) { const fm = PR[i];
    /* his setup on a call (blitz all linebackers): the man becomes a rusher */
    const setup = (p, su) => { if (!su || !(su.blitz || su.hover)) return p; return Object.assign({}, p, { men: p.men.map((m) => {
        if ((su.blitz || []).includes(m.k)) { const o = Object.assign({}, m, { rush: [[m.x, m.y], [m.x + (m.x > 0 ? -1.1 : 1.1), m.y - 3]], fam: 'rush', lb: 'Blitz' }); delete o.zone; delete o.man; return o; }
        /* the user who shows the blitz and gets out (hover half a second, then you have whoever is uncovered): no lane */
        if ((su.hover || []).includes(m.k)) { const o = Object.assign({}, m, { hover: 1, fam: 'user', lb: 'Hover and get out' }); delete o.rush; delete o.zone; delete o.man; return o; }
        return m; }) }); };
    const plays = fm.plays.map(PLAY).filter(Boolean).map((p) => setup(p, fm.setups && fm.setups[p.id])), byId = (id) => plays.find((p) => p.id === id);
    const tile = (cfg.tiles && cfg.tiles[fm.name]) || (plays[0] ? plays[0].men.map((m) => ({ x: m.x, y: m.y, p: m.pos })) : []);
    const men = tile.map((t, j) => ({ x: t.x, y: t.y, pos: t.p, k: 's' + j, xc: INKC })), off = (cfg.offense || []).map((t) => ({ x: t.x, y: t.y, p: t.p, ghost: 1 }));
    const recv = off.filter((t) => t.p !== 'OL' && t.p !== 'QB').sort((a, b) => b.x - a.x);
    const types = []; plays.forEach((p) => { const t = p.type || 'Call', r = types.find((x) => x[2] === t); if (r) r[1]++; else types.push([t === 'Sim Pressure' ? 'SIM' : t.toUpperCase(), 1, t]); });
    const n = plays.length, shows = fm.show || [], press = pressOf(plays), cover = coverOf(plays), fit = (t, s) => Math.min(s, 44 / (t.length * .5));
    const stamp = nameStamp(fm.name.toUpperCase()).map((w) => Object.assign({}, w, { y: w.y + 3 }));
    const steps = [{ k: 'look', cam: 'title', paint: stamp, say: fm.desc || '' },
      { k: 'all', cam: 'wide', paint: [{ t: n + (n === 1 ? ' CALL' : ' CALLS') + ', ONE PICTURE', x: 0, y: -11.6, s: 2.6 }], say: callsN(n) + (n === 1 ? ' comes' : ' come') + ' out of this one picture. The marker is everybody who can come, the rings are every zone somebody drops into.', chips: plays.map((p) => p.name) },
      { k: 'press', cam: { pos: [0, -17, 43], tgt: [0, 2.5, 0], fov: 34 }, paint: [{ t: 'WHERE THE RUSH COMES FROM', x: 0, y: -10.2, s: 2 }], say: press.say, pts: press.lines },
      { k: 'cover', cam: 'deep', paint: [{ t: 'WHERE THE COVERAGE SITS', x: 0, y: -11.6, s: 2.6 }], say: cover.say, pts: cover.lines, chips: cover.kinds }]
      .concat((fm.bullets || []).flatMap((b, j) => { const sh = shows[j] || null, ps = sh ? (sh.plays || (sh.play ? [sh.play] : [])).map(byId).filter(Boolean) : [], stampOf = (t) => [{ t, x: 0, y: -11.6, s: fit(t, 2.6) }];
        /* two calls in one point: one step each, the call drawn whole, the second over a ghost of the first one's rush */
        if (ps.length > 1) return ps.map((p, q) => ({ k: 'does', cam: 'wide', show: sh, ps: [p], ghost: q ? ps[q - 1] : null, say: b, pts: null, reads: false, paint: stampOf(p.name.toUpperCase()).concat(q ? [{ t: 'dashes = ' + ps[q - 1].name, x: 14.5, y: -6.6, s: 1.35, c: 'mk', f: 'marker' }] : []) }));
        const one = ps.length === 1 ? ps[0] : null, rn = one && Array.isArray(sh.nums) ? (one.readNames || []).slice(0, 5).filter(Boolean) : [];
        return [{ k: 'does', cam: 'wide', show: sh, ps, say: b, pts: rn.length ? rn : null, reads: rn.length > 0, paint: sh && sh.label ? stampOf(String(sh.label).toUpperCase()) : one ? stampOf(one.name.toUpperCase()) : [] }]; }));
    return (st.cache[i] = { form: true, def: true, fm, plays, men, off, recv, mix: {}, mixRows: types, heat: press, press, cover, steps, tt: steps.map(() => 0), cams: steps.map((x) => x.cam), walks: steps.map(() => 1), counts: steps.map(() => null), R: { snap: 0, end: 0 } }); }
  /* a zone drawn on the ground, and the name of the job stamped in it */
  const zoneOn = (z, col, lw, fill, a) => { if (a <= .01) return; const pts = []; for (let i = 0; i < 36; i++) { const an = i / 36 * Math.PI * 2, v = P([clamp(z[0] + Math.cos(an) * z[2], -26.4, 26.4), Math.min(46, z[1] + Math.sin(an) * z[3]), .02]); if (!v) return; pts.push(v); } g.save(); g.globalAlpha = a; g.beginPath(); pts.forEach((v, i) => (i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = col; g.lineWidth = lw; g.stroke(); g.restore(); };
  const zoneName = (m) => ZNAME[m.zj] || String(m.lb || '').replace(/\s*\(.*\)/, '').replace(/\b(left|right)\b/gi, '').trim().toUpperCase();
  function drawFormD(d, s, en, sq, lwM) { const INK8 = 'rgba(23,19,14,.86)', INK6 = 'rgba(23,19,14,.62)', INK4 = 'rgba(23,19,14,.4)', INK2 = 'rgba(23,19,14,.2)', recv = d.recv;
    /* a call's jobs: who comes, who drops where, who is locked on whom */
    const jobs = (p, o) => { const done = o.prog >= .98 ? 1 : 0; for (const m of p.men) { if (o.only && !o.only(m)) continue; const dl = !!o.dl && LN(m) && !!m.rush, rc = dl ? o.dl : o.col;
        if (walked(m)) tip(poly([m.from, [m.x, m.y]], m.rush ? rc : o.zcol, 2, [3, 6], .85, o.prog), m.rush ? rc : o.zcol, 5, done);
        if (m.rush) tip(poly(laneOf(m), rc, dl ? 2 : o.lw, o.rdash || null, 1, o.prog), rc, dl ? 5 : o.rdash ? 6 : 9, done);
        else if (m.zone) { if (o.rings) zoneOn(m.zone, o.zcol, 1.8, o.fill === undefined ? 'rgba(23,19,14,.05)' : o.fill, o.prog); if (!o.noLead) poly([[m.x, m.y], [m.zone[0], m.zone[1]]], o.zcol, o.zlw || 2, o.zdash || null, 1, o.prog);
          if (o.labels) { const t = zoneName(m); paint(t, m.zone[0], Math.min(40, m.zone[1]) - .45, 1.05, false, INKC, o.prog * .85); } }
        else if (m.man != null && recv[m.man - 1] && !o.noMan) { const t = recv[m.man - 1]; poly([[m.x, m.y], [lerp(m.x, t.x, .86), lerp(m.y, t.y, .86)]], o.zcol, 2, [6, 6], .9, o.prog); } } };
    const cellsOn = (h, grow) => { g.save(); g.fillStyle = MK; for (const c of h.cells) { const z = P([c[0], c[1], .02]); if (!z) continue; const r = z[2] * h.CS * .58 * Math.sqrt(c[2]) * grow; if (r < .6) continue; g.globalAlpha = .3 + .55 * c[2]; g.beginPath(); g.ellipse(z[0], z[1], r, r * sq, 0, 0, 7); g.fill(); } g.restore(); };
    let list = d.men.map((m) => Object.assign({}, m)), nums = null; const sh = s.show || null, mark = (k) => (sh && sh.user === k ? { ring: MK, tag: 'USER' } : sh && ((sh.ring || []).includes(k) || sh.lit === k) ? { ring: MK } : null);
    if (s.k === 'all') d.plays.forEach((p, j) => jobs(p, { col: MK, lw: lwM * .7, dl: INK4, zcol: 'rgba(23,19,14,.3)', rings: true, noLead: true, fill: 'rgba(23,19,14,.025)', noMan: true, prog: en(.35 + j * .14, .55) }));
    else if (s.k === 'press') { d.plays.forEach((p) => jobs(p, { col: 'rgba(23,19,14,.3)', lw: 1.5, zcol: INK2, only: (m) => !!m.rush, prog: 1 })); cellsOn(d.press, en(.3, .9)); }
    else if (s.k === 'cover') { d.plays.forEach((p) => jobs(p, { only: (m) => !!m.zone, rings: true, noLead: true, fill: 'rgba(23,19,14,.035)', zcol: INK2, prog: 1 })); cellsOn(d.cover, en(.3, .9)); }
    else if (s.k === 'does') { const ps = s.ps || [];
      if (ps.length === 1) { if (s.ghost) jobs(s.ghost, { col: 'rgba(23,19,14,.34)', lw: 2.2, rdash: [6, 7], zcol: 'rgba(23,19,14,.2)', only: (m) => !!m.rush, prog: 1 });
        jobs(ps[0], { col: MK, lw: lwM, zcol: INK6, rings: true, labels: true, prog: en(.2, .6) }); list = ps[0].men.map((m) => ({ x: m.x, y: m.y, pos: m.pos, k: m.k, xc: INKC }));
        /* the reads, on the man who owns each: past the end of a rusher's lane, over a dropper's zone, on a man defender's line */
        if (sh && Array.isArray(sh.nums)) { const seen = {}; nums = []; sh.nums.forEach((k, r) => { if (!k) return; const m = ps[0].men.find((x) => x.k === k); if (!m) return; if (seen[k]) { seen[k].n.push(r + 1); return; } let at;
            if (m.rush) { const L = laneOf(m), a = L[1], b = L[2], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; at = [b[0] + (b[0] - a[0]) / l * 1.8, b[1] + (b[1] - a[1]) / l * 1.8]; }
            else { /* beside his zone, or beside him: whichever spot is clearest of the men and of the numbers already down */
              const z = m.zone, cands = z ? [[z[0], z[1] + z[3] + 1.4], [z[0] + z[2] + 1.6, z[1]], [z[0] - z[2] - 1.6, z[1]], [z[0], z[1] - z[3] - 1.4]] : [[m.x + (m.x >= 0 ? 2.6 : -2.6), m.y + .3], [m.x + (m.x >= 0 ? -2.6 : 2.6), m.y + .3], [m.x, m.y + 3.4]];
              const busy = ps[0].men.map((x) => [x.x, x.y]).concat(nums.map((x) => x.at)), clear = (c) => Math.min(...busy.map((b) => Math.hypot(b[0] - c[0], (b[1] - c[1]) * .6))) - (Math.abs(c[0]) > 24 ? 9 : 0);
              at = cands.reduce((a, c) => (clear(c) > clear(a) + .4 ? c : a)); }
            seen[k] = { n: [r + 1], at }; nums.push(seen[k]); }); } }
      if (sh && sh.box) { const [x0, y0, x1, y1] = sh.box, a = P([x0, (y0 + y1) / 2, 0]), b = P([x1, (y0 + y1) / 2, 0]), c0 = P([(x0 + x1) / 2, y0, 0]), c1 = P([(x0 + x1) / 2, y1, 0]); if (a && b && c0 && c1) scribble((a[0] + b[0]) / 2, (c0[1] + c1[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(c0[1] - c1[1]) / 2, en(.3, .8), MK, lwM, 1.7); } }
    list.forEach((m) => { m.mk = mark(m.k); });
    inkMen(list.concat(d.off.map((o) => ({ x: o.x, y: o.y, ghost: 1 }))), sq);
    if (nums) nums.forEach((nm, j) => { const a = en(.7 + j * .32, .32); if (a <= .01) return; const z = P([nm.at[0], nm.at[1], 0]); if (!z) return; const txt = nm.n.join(','), px = clamp(st.H * .064, 22, 46);
      g.save(); g.globalAlpha = a; g.font = '400 ' + px + 'px ' + FM; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = SHEET; g.lineWidth = 7; g.strokeText(txt, z[0], z[1]); g.fillStyle = MK; g.fillText(txt, z[0], z[1]);
      scribble(z[0], z[1] - px * .04, px * (.56 + .24 * (txt.length - 1)), px * .64, a, MK, Math.max(2.4, st.H * .005), j * 1.3 + .4); g.restore(); }); }
  /* ================= THE PRINCIPLES OF A DEFENSE (2026-10-09) =================
     The same click-through deck as an offense's principles, with the defense as the star: one of the scheme's own calls
     (deck.call) run against the plain offense by simDefense. A step can draw the zones the call drops into (zones), the
     rush lanes before the snap (lanes), the man locks (manlines), who each lineman was given (blocks), a count written
     on the men one at a time (nums), rings and tags (ring), and a mark where the play ends (hit). Decks are authored on
     the scheme (about.principles[].deck, see seahawks.js), every sentence from his own pages and reads. */
  function deckOfD(pi) { const dk = PR[pi].deck, call = PLAY(dk.call), off = plainOffense(cfg.offense || [], dk.off === 'run' ? 'run' : 'pass'), sim = simDefense(dk, call, off), R = { snap: sim.snap, end: sim.end }, steps = dk.steps;
    let cur = 0, cam = 'wide'; const tt = [], cams = [];
    steps.forEach((s) => { if (s.to != null) cur = s.to === 'pre' ? 0 : s.to === 'set' ? R.snap : s.to === 'end' ? R.end : R.snap + s.to; tt.push(Math.min(cur, R.end)); if (s.cam != null) cam = s.cam; cams.push(cam); });
    /* the receivers by number, the way the game numbers a man lock */
    const recv = off.map((m, i) => ({ m, i })).filter((x) => x.m.role === 'rec' || x.m.role === 'rb').sort((a, b) => b.m.x - a.m.x).map((x) => x.i);
    return (st.cache[pi] = { defDeck: true, dk, call, off, R, sim, base: sim.base, steps, tt, cams, walks: steps.map(() => 1), counts: steps.map(() => null), recv }); }
  function drawDeckD(d, s, en, sq, lwM, p) { const INK6 = 'rgba(23,19,14,.62)', men = d.call.men, pre = p.pre;
    const at = (k) => { const i = men.findIndex((m) => m.k === k); if (i >= 0) return p.d[i]; const j = d.off.findIndex((m) => m.k === k); return j >= 0 ? p.o[j] : null; };
    const pick = (v, f) => (v === true ? men.filter(f) : Array.isArray(v) ? men.filter((m) => v.includes(m.k) && f(m)) : []);
    /* the zones the call drops into, each with its job stamped in it */
    pick(s.zones, (m) => !!m.zone).forEach((m, j) => { const a = en(.3 + j * .07, .5), z = [m.zone[0], Math.min(m.zone[1], 21), m.zone[2], m.zone[3]]; zoneOn(z, INK6, 1.8, 'rgba(23,19,14,.05)', a); paint(zoneName(m), z[0], z[1] - .45, 1.05, false, INKC, a * .85);
      if (pre) { const i = men.indexOf(m); poly([p.d[i], [z[0], z[1]]], INK6, 2, null, .9, a); } });
    /* before the snap: the lanes of the men who come */
    if (pre) pick(s.lanes, (m) => !!m.rush).forEach((m, j) => { const i = men.indexOf(m), L = laneOf(m), pr = en(.3 + j * .1, .55); tip(poly([p.d[i], L[1], L[2]], MK, lwM, null, 1, pr), MK, 9, pr >= .98 ? 1 : 0); });
    /* the man locks: a dashed line from each man defender to the receiver he has */
    if (s.manlines) men.forEach((m, i) => { if (m.man == null || d.recv[m.man - 1] == null) return; const a = p.d[i], b = p.o[d.recv[m.man - 1]]; poly([a, [lerp(a[0], b[0], .88), lerp(a[1], b[1], .88)]], INK6, 2, [6, 6], .9, en(.3 + i * .05, .5)); });
    /* the protection: a tie from each lineman to the man he was given */
    if (s.blocks) Object.keys(d.dk.prot || {}).forEach((k, j) => { const a = at(k), b = at(d.dk.prot[k]); if (a && b) poly([a, b], REDC, 2.4, [3, 5], .85, en(.3 + j * .12, .4)); });
    /* marks authored on the step: a line through spots or men, or a note in marker */
    const colOf = (c) => (c === 'red' ? REDC : c === 'navy' ? NAVYC : c === 'ink' ? INKC : MK), ptOf = (q) => (typeof q === 'string' ? at(q) : q);
    (s.draw || []).forEach((o) => { const dl = o.d || 0; if (o.k === 'note') { note(o.x, o.y, o.t, st.H * (o.s || .055), colOf(o.c), en(dl, .3), o.rot || 0); return; }
      const pts = (o.pts || []).map(ptOf).filter(Boolean), pr = en(dl, o.dur || .7), e = poly(pts, colOf(o.c), lwM * (o.w || 1), o.dash || null, 1, pr); if (o.tip) tip(e, colOf(o.c), 10, pr >= .98 ? 1 : 0); });
    /* the men: a ring and a tag, or a count written on them one at a time */
    const marks = {}; (s.ring || []).forEach((r) => { marks[r.who] = { ring: r.c === 'ink' ? 'rgba(23,19,14,.8)' : r.c === 'red' ? REDC : MK, tag: r.tag || '' }; });
    (s.nums || []).forEach((k, j) => { if (en(.5 + j * .2, .05) <= 0) return; marks[k] = Object.assign({}, marks[k], { num: String(j + 1), numCol: s.numsCol === 'red' ? REDC : MK }); });
    const list = []; d.off.forEach((m, i) => list.push({ x: p.o[i][0], y: p.o[i][1], off: 1, dim: 1, pos: s.them ? '' : m.pos, mk: marks[m.k] })); const TH = s.them || null, lu = TH ? Object.assign({}, d.dk.lineup || {}, TH.lineup || {}) : null, wk = TH && TH.walk ? en(.1, 1.1) : 1;
    men.forEach((m, i) => { const x = p.d[i][0], y = p.d[i][1]; if (TH) list.push({ x: lerp((i - 5) * .55, x, wk), y: lerp(8.5, y, wk), disc: 1, num: lu[m.k], nm: (TH.names || {})[m.k] || '', up: y < 6, grow: en(.02 * i, .3), mk: marks[m.k] }); else list.push({ x, y, pos: m.pos, xc: INKC, mk: marks[m.k] }); });
    inkMen(list, sq);
    const bb = P(p.ball); if (bb) { g.fillStyle = '#8a4a1c'; g.strokeStyle = INKC; g.lineWidth = 1.2; g.beginPath(); g.ellipse(bb[0], bb[1], Math.max(3.5, bb[2] * .34), Math.max(2.2, bb[2] * .21), .5, 0, 7); g.fill(); g.stroke(); }
    /* where it ends: the sack or the tackle, ringed in marker */
    if (s.hit && d.sim.stop != null && st.T >= d.sim.snap + d.sim.stop - .03) { const z = P([p.ball[0], p.ball[1], 0]); if (z) { g.save(); scribble(z[0], z[1], st.H * .075, st.H * .052, 1, MK, lwM, 2.2); g.restore(); note(p.ball[0] + (p.ball[0] > 12 ? -7.5 : 7.5), p.ball[1] - 2.4, s.hit, st.H * .07, MK, 1, -.05); } } }
  /* ---- the front page: every look as a paper card ---- */
  function drawCard(c, i) { const d = deckOf(i), w = c.clientWidth || 340, h = c.clientHeight || 560, k = st.k; c.width = Math.round(w * k); c.height = Math.round(h * k); const x = c.getContext('2d'), keep = g; g = x; x.setTransform(k, 0, 0, k, 0, 0); x.clearRect(0, 0, w, h);
    const ppy = Math.max(3.4, Math.min((w - 30) / 56, (h * .46 - 40) / 29)), LOS = 40 + 20 * ppy, sx = (v) => w / 2 + v * ppy, sy = (v) => LOS - v * ppy;
    x.save(); x.fillStyle = MK; for (const c of d.heat.cells) { if (c[1] > 20 || c[1] < -8) continue; x.globalAlpha = .22 + .5 * c[2]; x.beginPath(); x.arc(sx(c[0]), sy(c[1]), ppy * d.heat.CS * .52 * Math.sqrt(c[2]), 0, 7); x.fill(); } x.restore();
    x.lineCap = 'round'; x.lineJoin = 'round'; for (let y = -5; y <= 20; y += 5) { x.strokeStyle = y === 0 ? 'rgba(23,19,14,.8)' : 'rgba(23,19,14,.16)'; x.lineWidth = y === 0 ? 1.8 : 1; x.beginPath(); x.moveTo(sx(-27), sy(y)); x.lineTo(sx(27), sy(y)); x.stroke(); }
    x.save(); x.beginPath(); x.rect(0, sy(20), w, 29 * ppy + 8); x.clip(); x.strokeStyle = 'rgba(23,19,14,.34)'; x.lineWidth = 1.3; for (const p of d.plays) for (const m of p.men) { if (!m.r || m.r.length < 2 || m.role === 'ol' || rankOf(p, m) > 1) continue; x.beginPath(); m.r.forEach((q, j) => (j ? x.lineTo(sx(q[0]), sy(q[1])) : x.moveTo(sx(q[0]), sy(q[1])))); x.stroke(); } x.restore();
    if (d.def) { x.strokeStyle = 'rgba(23,19,14,.42)'; x.lineWidth = 1.4; for (const p of d.plays) for (const m of p.men) { if (!m.rush || LN(m)) continue; x.beginPath(); laneOf(m).forEach((q, j) => (j ? x.lineTo(sx(q[0]), sy(q[1])) : x.moveTo(sx(q[0]), sy(q[1])))); x.stroke(); }
      x.strokeStyle = 'rgba(23,19,14,.28)'; x.lineWidth = 1.2; for (const o of d.off) { x.beginPath(); x.arc(sx(o.x), sy(o.y), 4, 0, 7); x.stroke(); }
      x.strokeStyle = INKC; x.lineWidth = 2.8; for (const m of d.men) { const X = sx(m.x), Y = sy(m.y), e = 4.8; x.beginPath(); x.moveTo(X - e, Y - e); x.lineTo(X + e, Y + e); x.moveTo(X + e, Y - e); x.lineTo(X - e, Y + e); x.stroke(); } }
    else for (const m of d.men) { x.fillStyle = m.qb ? MK : '#fbf6e8'; x.strokeStyle = INKC; x.lineWidth = 1.6; x.beginPath(); x.arc(sx(m.x), sy(m.y), 5.4, 0, 7); x.fill(); x.stroke(); }
    /* the name, stamped; the count and the mix, in marker */
    const name = d.fm.name.toUpperCase(), words = name.split(' '); let lines = [name]; if (name.length > 13 && words.length > 1) { let best = 1, bd = 1e9; for (let j = 1; j < words.length; j++) { const a = words.slice(0, j).join(' ').length, dd = Math.abs(a - name.length / 2); if (dd < bd) { bd = dd; best = j; } } lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')]; }
    let fs = 52; x.font = '400 ' + fs + 'px ' + FD; const wide = Math.max(...lines.map((l) => x.measureText(l).width)); fs = Math.min(52, Math.floor(fs * (w - 44) / wide)); x.font = '400 ' + fs + 'px ' + FD; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; const flat = (c) => { const pt = pat(c); try { pt.setTransform(new DOMMatrix()); } catch (e) {} return pt; };
    const mixRows = d.mixRows || [['RUN', d.mix.run], ['PASS', d.mix.pass], ['RPO', d.mix.rpo]], rowsN = mixRows.filter((r) => r[1]).length, block = fs * .86 + lines.length * fs * 1.06 + 48 + Math.max(0, rowsN - 1) * 34 + 14, top = sy(-9) + 8, room = h - 50 - top; const kf = Math.min(1, room / block); x.save(); x.translate(w / 2, top); x.scale(kf, kf); x.translate(-w / 2, -top); let y = top + Math.max(4, (room / kf - block) / 2) + fs * .86; lines.forEach((l, j) => { x.fillStyle = flat(j ? MK : INKC); x.fillText(l, w / 2, y); y += fs * 1.06; });
    y += 8; x.fillStyle = MK; x.font = '400 30px ' + FM; x.fillText(d.plays.length + (d.plays.length === 1 ? ' call' : ' calls'), w / 2, y); y += 40;
    mixRows.forEach(([lb, n]) => { if (!n) return; x.fillStyle = 'rgba(23,19,14,.8)'; x.font = '800 15px ' + FC; x.textAlign = 'right'; x.fillText(lb, w / 2 - 36, y + 6); tally(w / 2 - 20, y, 24, n, INKC, 2.8); y += 34; }); x.restore();
    g = keep; }
  function drawFront() { const el = q('.pbfront'); if (!el.children.length) el.innerHTML = PR.map((fm, i) => `<button type="button" class="fmcard" data-fm="${i}" aria-label="${esc(fm.name)}"><canvas></canvas><span class="open">Open &rsaquo;</span></button>`).join(''); el.style.setProperty('--n', Math.min(PR.length, 5)); el.querySelectorAll('canvas').forEach((c, i) => drawCard(c, i)); }
  /* ---- one frame ---- */
  function draw() { if (st.pi < 0) return; const d = D(), s = STEP(), H = st.H, t = REDUCED ? 99 : st.t, p = st.p; P = proj(); g.setTransform(st.k, 0, 0, st.k, 0, 0); g.clearRect(0, 0, st.W, st.H);
    const en = (delay, dur) => ease(clamp((t - (delay || 0)) / (dur || .5), 0, 1)), sq = clamp(Math.abs(P.f[2]) * 1.06, .55, 1), lwM = Math.max(3, H * .008);
    /* the sheet the diagram is drawn on, lying on the board */
    g.save(); g.shadowColor = 'rgba(60,40,10,.32)'; g.shadowBlur = 28; g.shadowOffsetY = 9; quad(FIELD, SHEET); g.restore();
    /* stamped on the field: this step's coming in, the last step's going out */
    const paints = (step, a) => { for (const w of step.paint || []) paint(w.t, w.x, w.y, w.s || 2.4, w.f === 'marker', w.c === 'mk' ? MK : w.c === 'red' ? REDC : w.c === 'navy' ? NAVYC : INKC, a * (w.f === 'marker' || w.c ? .96 : .9)); };
    if (st.prev >= 0 && st.prev !== st.step && d.steps[st.prev]) paints(d.steps[st.prev], 1 - en(0, .3));
    paints(s, en(.25, .6));
    /* the lines of the field, in ink */
    for (let y = -10; y <= 45; y += 5) seg([-26.67, y], [26.67, y], y === 0 ? 'rgba(23,19,14,.85)' : 'rgba(23,19,14,.2)', y === 0 ? 2.5 : 1.2);
    for (let y = -10; y <= 45; y++) for (const hx of [-6.67, 6.67]) seg([hx - .35, y], [hx + .35, y], 'rgba(23,19,14,.3)', 1);
    for (const sx of [-26.67, 26.67]) seg([sx, -15], [sx, 50], 'rgba(23,19,14,.55)', 2);
    if (d.form) { (d.def ? drawFormD : drawForm)(d, s, en, sq, lwM); return; }
    if (d.defDeck) { drawDeckD(d, s, en, sq, lwM, p); return; }
    /* a measure across the field */
    if (s.span) { const pr = en(.5, .8), y = s.span.y; tip(poly([[0, y], [-26.4, y]], MK, lwM, null, 1, pr), MK, 10, pr); tip(poly([[0, y], [26.4, y]], MK, lwM, null, 1, pr), MK, 10, pr); if (s.span.t) paint(s.span.t, s.span.x || 0, y + .9, s.span.s || 2.2, true, MK, en(.9, .4)); }
    /* defenders walking out: a dashed marker arrow from where they stood */
    if (!p.pre ? false : d.walks[st.step] === 1 && (st.step === 0 || d.walks[st.step - 1] === 0)) d.sim.shell.forEach((x, i) => { const b = d.base[i], to = p.d[i]; if (Math.hypot(to[0] - b.x, to[1] - b.y) < .8 || Math.abs(b.x) > 14) return; tip(poly([[b.x, b.y], to], MK, lwM * .8, [7, 6], .9), MK, 8); });
    /* the marker ring round a box (it stays drawn while the next step keeps the same box) */
    if (s.box) { const [x0, y0, x1, y1] = s.box, kept = st.prev >= 0 && d.steps[st.prev] && JSON.stringify(d.steps[st.prev].box) === JSON.stringify(s.box) && st.prev < st.step, a = P([x0, (y0 + y1) / 2, 0]), b = P([x1, (y0 + y1) / 2, 0]), c0 = P([(x0 + x1) / 2, y0, 0]), c1 = P([(x0 + x1) / 2, y1, 0]);
      if (a && b && c0 && c1) scribble((a[0] + b[0]) / 2, (c0[1] + c1[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(c0[1] - c1[1]) / 2, kept ? 1 : en(.25, .8), MK, lwM, 1.7); }
    /* a measured gap: the safety to the seam */
    if (s.gap) { const di = defIdx(s.gap.from)[0], b = manPos(s.gap.to); if (di != null && b) { const a = p.d[di], yd = Math.round(Math.hypot(a[0] - b[0], a[1] - b[1])); poly([a, b], MK, lwM * .8, [8, 7], en(.2, .4)); note((a[0] + b[0]) / 2 - 1, Math.max(a[1], b[1]) + 3.4, yd + ' yards away', H * .056, MK, en(.3, .4), -.04); } }
    /* routes in ink, the one that matters in marker; a run's plan dashed, then the path he has actually run */
    const lit = s.lit, show = s.routes === 'all' ? null : new Set([].concat(s.routes || [], lit || []));
    if (s.routes || lit) for (const m of d.p.men) { if (m.role === 'ol' || m.role === 'qb' || !m.r || m.r.length < 2) continue; if (show && !show.has(m.k)) continue; const hot = m.k === lit, col = hot ? MK : 'rgba(23,19,14,.7)', lw = hot ? lwM : 2;
      if (m.mot && p.pre) poly(m.mot, 'rgba(23,19,14,.55)', 2, [5, 6]);
      const b = d.dk.branch && d.dk.branch[m.k]; if (b != null && m.alts && m.alts[b] && m.tip) { const stem = m.r.slice(0, m.r.findIndex((z) => z[0] === m.tip[0] && z[1] === m.tip[1]) + 1); poly(stem, col, lw); m.alts.forEach((alt, i) => { if (i !== b) tip(poly(alt, 'rgba(23,19,14,.5)', 2, [4, 6]), 'rgba(23,19,14,.5)', 6); }); if (m.r.length > stem.length) tip(poly(m.r.slice(stem.length - 1), 'rgba(23,19,14,.5)', 2, [4, 6]), 'rgba(23,19,14,.5)', 6); tip(poly(m.alts[b], col, lw, null, 1, hot ? en(.2, .7) : 1), col, hot ? 10 : 7, hot ? en(.6, .3) : 1); }
      else tip(poly(m.r, col, lw, null, 1, hot ? en(.2, .7) : 1), col, hot ? 10 : 7, hot ? en(.6, .3) : 1); }
    const run = d.dk.run, carrier = run && !run.afterCatch ? (run.who === 'qb' ? d.qbi : d.keys.indexOf(run.who)) : -1;
    if (carrier >= 0) { const F = d.sim.frames, i0 = Math.round(d.R.snap / DT), i1 = Math.min(F.length - 1, Math.round(st.T / DT));
      if (s.plan && p.pre) { const m = d.p.men[carrier]; tip(poly([[m.x, m.y]].concat(run.path), MK, lwM * .8, [9, 8], .85, en(.7, .6)), MK, 10, en(1.1, .3)); }
      if (i1 > i0) { const pts = []; for (let i = i0; i <= i1; i += 2) pts.push(F[i].o[carrier]); pts.push(p.o[carrier]); poly(pts, MK, Math.max(4, H * .009)); } }
    /* yards, painted beside the man with the ball */
    if (s.yards) { const m = manPos(s.yards), has = s.yards === 'qb' || (run && run.who === s.yards && !run.afterCatch) || p.caught.includes(s.yards); if (m && has && Math.round(m[1]) > 0) paint('+' + Math.round(m[1]), m[0] + 5.2, m[1] - 1.3, 3.1, true, MK, 1); }
    /* the men: O for us, X for them, the position under each; the count numbers them in marker */
    const marks = {}, cn = d.counts[st.step];
    if (cn) { const sp = cn.spec, offs = d.p.men.map((m, i) => i).filter((i) => { const m = d.p.men[i]; return (sp.off || []).some((k) => k === m.k || (k === 'ol' && m.role === 'ol') || (k === 'qb' && m.role === 'qb')); }).sort((a, b) => (d.p.men[a].role === 'qb') - (d.p.men[b].role === 'qb') || d.p.men[a].x - d.p.men[b].x);
      const defs = d.sim.shell.map((x, i) => i).filter((i) => (sp.def || []).includes(d.sim.shell[i].lb)).sort((a, b) => p.d[a][0] - p.d[b][0]), n = cn.live ? clamp(Math.floor((t - 1.0) / .22), 0, offs.length + defs.length) : offs.length + defs.length;
      offs.forEach((i, j) => { if (j < n) marks['o' + i] = { ring: INKC, num: cn.live ? String(j + 1) : '', numCol: INKC }; }); defs.forEach((i, j) => { if (j < n - offs.length) marks['d' + i] = { ring: REDC, num: cn.live ? String(j + 1) : '', numCol: REDC }; });
      const bx = s.box || [-7.9, -2.3, 7.9, 7.3], th = H * .075, tw = Math.max(2.5, H * .007), u = P([bx[0] - 7.3, 1.2, 0]), v = P([bx[2] + 2.3, 3.2, 0]), no = Math.min(offs.length, n), nd = clamp(n - offs.length, 0, defs.length);
      if (u) { tally(u[0], u[1], th, no, INKC, tw); if (no) note(bx[0] - 5.9, 3.7, 'us', H * .055, INKC, 1, -.06); } if (v) { tally(v[0], v[1], th, nd, REDC, tw); if (nd) note(bx[2] + 3.7, 5.7, 'them', H * .055, REDC, 1, .05); } }
    for (const r of s.ring || []) for (const i of (r.who && defIdx(r.who).length ? defIdx(r.who) : [])) marks['d' + i] = { ring: MK, tag: r.tag || '' };
    for (const r of s.ring || []) if (r.man) { const i = r.man === 'qb' ? d.qbi : d.keys.indexOf(r.man); if (i >= 0) marks['o' + i] = { ring: MK, tag: r.tag || '' }; }
    const list = []; d.p.men.forEach((m, i) => list.push({ x: p.o[i][0], y: p.o[i][1], off: 1, qb: m.role === 'qb', pos: m.pos || '', mk: marks['o' + i] })); d.sim.shell.forEach((x, i) => list.push({ x: p.d[i][0], y: p.d[i][1], pos: defPos(d.dk.cov, x, d.base[i]), mk: marks['d' + i] }));
    inkMen(list, sq);
    /* the ball, and its shadow on the sheet when it is in the air */
    const bs = P([p.ball[0], p.ball[1], 0]), bb = P(p.ball); if (bs && p.ball[2] > 1.8) { g.fillStyle = 'rgba(23,19,14,.22)'; g.beginPath(); g.ellipse(bs[0], bs[1], Math.max(3, bs[2] * .3), Math.max(2, bs[2] * .18), 0, 0, 7); g.fill(); }
    if (bb) { g.fillStyle = '#8a4a1c'; g.strokeStyle = INKC; g.lineWidth = 1.2; g.beginPath(); g.ellipse(bb[0], bb[1], Math.max(3.5, bb[2] * .34), Math.max(2.2, bb[2] * .21), .5, 0, 7); g.fill(); g.stroke(); } }
  /* ---- the tabs, the strip, the dots ---- */
  function sync(slap) { board.classList.toggle('front', st.pi < 0); if (st.pi < 0) { drawFront(); return; } const d = D(), s = STEP(), lastStep = st.step === d.steps.length - 1, lastDeck = st.pi === PR.length - 1;
    q('.pbtabs').innerHTML = (FORMS ? `<button type="button" class="pbtab all" data-front="1"><b>&lsaquo;</b><span>All ${PR.length} ${NOUN}s</span></button>` : '') + PR.map((pr, i) => `<button type="button" class="pbtab${i === st.pi ? ' on' : ''}" data-fip="${i}"><b>${pr.n != null ? esc(pr.n) : '0' + (i + 1)}</b><span>${esc(pr.title || pr.name)}</span></button>`).join('');
    q('.pbdots').innerHTML = d.steps.map((x, i) => `<i class="${i === st.step ? 'on' : i < st.step ? 'done' : ''}" data-fst="${i}"></i>`).join('');
    q('.pbstrip').classList.toggle('reads', !!s.reads);
    { const fl = q('.pbstrip .flag'), pops = q('.pbpops'), list = s.pops || []; fl.textContent = s.side === 'them' ? (cfg.themLabel || 'The real thing') : s.side === 'ours' ? 'Our install' : ''; fl.hidden = !s.side; q('.pbstrip').dataset.side = s.side || '';
      pops.innerHTML = list.map((c, j) => (c.num != null ? `<div class="pop player" style="--d:${j * 160}ms"><em>${esc(c.num)}</em><strong>${esc(c.name || '')}</strong><span>${esc(c.pos || '')}</span><ul>${(c.stats || []).map(([n, t]) => `<li><b>${esc(n)}</b>${esc(t)}</li>`).join('')}</ul></div>` : `<div class="pop${c.ours ? ' ours' : ''}" style="--d:${j * 160}ms"><b>${esc(c.n)}</b><span>${esc(c.t || '')}</span>${c.s ? `<i>${esc(c.s)}</i>` : ''}</div>`)).join(''); pops.hidden = !list.length; } const strip = q('.pbstrip'), say = s.say || '', pts = s.pts || [], chips = s.chips || []; q('.pbstrip .chips').innerHTML = chips.map((c) => `<i>${esc(c)}</i>`).join(''); q('.pbstrip .chips').hidden = !chips.length; q('.pbstrip .say').textContent = say; q('.pbstrip .say').hidden = !say; q('.pbstrip .pts').innerHTML = pts.map((x) => `<li>${esc(x)}</li>`).join(''); q('.pbstrip .pts').hidden = !pts.length; strip.hidden = !say && !pts.length;
    if (slap && !REDUCED) { strip.classList.remove('tick'); void strip.offsetWidth; strip.classList.add('tick'); }
    q('.back').disabled = !FORMS && st.pi === 0 && st.step === 0; q('.next').innerHTML = lastStep ? (lastDeck ? esc(cfg.endLabel || 'Start the install') + ' &rsaquo;' : (FORMS ? 'Next ' + NOUN : 'Next principle') + ' &rsaquo;') : 'Next &rsaquo;'; q('.pause').innerHTML = st.paused ? '&#9654;' : '&#10074;&#10074;'; board.dataset.step = st.step; }
  /* ---- the clock: a click sets new rest targets and everything eases to them from wherever it is ---- */
  function enter(pi, n, rest) { const same = pi === st.pi, prevStep = st.step, cold = st.pi < 0 || !st.cam; st.pi = pi; if (cold) { size(); st.cam = clone(viewOf(deckOf(pi).cams[clamp(n, 0, deckOf(pi).steps.length - 1)])); } const d = D(); n = clamp(n, 0, d.steps.length - 1);
    st.camFrom = st.cam ? clone(st.cam) : null; st.walkFrom = same ? st.walk : d.walks[n]; st.prev = same ? prevStep : -1; st.step = n; st.t = rest ? 99 : 0; st.paused = false; st.Tto = d.tt[n];
    if (!same || rest || n < prevStep || REDUCED) st.T = d.tt[n]; else if (n > prevStep + 1) st.T = Math.max(Math.min(st.T, d.tt[n]), d.tt[n - 1]); else st.T = Math.min(st.T, d.tt[n]);
    if (!same || rest) { st.walk = st.walkFrom = d.walks[n]; st.p = posNow(); st.camFrom = clone(viewOf(d.cams[n])); }
    sync(true); kick(); }
  function update(dt) { if (st.pi < 0) return; const d = D(); if (!st.paused) { st.t += dt; if (st.t > (STEP().wait == null ? .45 : STEP().wait) && st.T < st.Tto) st.T = Math.min(st.Tto, st.T + dt * (STEP().rate || 1)); }
    const t = REDUCED ? 99 : st.t; st.walk = lerp(st.walkFrom, d.walks[st.step], ease(clamp((t - .4) / 1.4, 0, 1))); st.p = posNow();
    const to = viewOf(d.cams[st.step]), from = st.camFrom || to, k = ease(clamp(t / 1.15, 0, 1)), follow = d.cams[st.step] && d.cams[st.step].follow, drift = REDUCED || follow ? 0 : .035 * (1 - Math.pow(1 - clamp((t - 1.15) / 8, 0, 1), 3));   /* a slow push on a resting step, so the page never sits dead */
    const pos = from.pos.map((v, i) => lerp(v, to.pos[i], k)), tgt = from.tgt.map((v, i) => lerp(v, to.tgt[i], k)); st.cam = { pos: pos.map((v, i) => lerp(v, tgt[i], drift)), tgt, fov: lerp(from.fov, to.fov, k) }; }
  /* the loop runs while anything is still moving, and stops when the page is at rest */
  function busy() { if (st.pi < 0) return false; const d = D(), s = STEP(); return !st.paused && (st.t < 10 || st.T < st.Tto || !!(d.counts[st.step] && d.counts[st.step].live && st.t < 4)); }
  function kick() { if (st.raf) return; let last = performance.now(); const f = (now) => { st.raf = 0; if (S !== st || !cv.isConnected) return; const dt = Math.min(.05, (now - last) / 1000); last = now; update(dt); draw(); if (busy()) st.raf = requestAnimationFrame(f); }; st.raf = requestAnimationFrame(f); }
  const front = () => { st.pi = -1; st.step = 0; st.prev = -1; sync(false); };
  const next = () => { if (st.pi < 0) { enter(0, 0); return true; } const d = D(); if (st.step < d.steps.length - 1) { enter(st.pi, st.step + 1); return true; } if (st.pi < PR.length - 1) { enter(st.pi + 1, 0); return true; } return false; };
  const back = () => { if (st.pi < 0) return false; if (st.step > 0) { enter(st.pi, st.step - 1); return true; } if (FORMS) { front(); return true; } if (st.pi > 0) { enter(st.pi - 1, deckOf(st.pi - 1).steps.length - 1); return true; } return false; };
  const pause = () => { st.paused = !st.paused; sync(false); kick(); };
  st.step_ = (dir) => (dir > 0 ? next() : back());
  host.addEventListener('click', (e) => { const fc = e.target.closest('[data-fm]'); if (fc) { enter(+fc.dataset.fm, 0); return; } if (e.target.closest('[data-front]')) { front(); return; } if (st.pi < 0) return;
    const tb = e.target.closest('[data-fip]'); if (tb) { if (+tb.dataset.fip !== st.pi) enter(+tb.dataset.fip, 0); return; }
    const dt = e.target.closest('[data-fst]'); if (dt) { enter(st.pi, +dt.dataset.fst); return; }
    if (e.target.closest('.back')) { back(); return; } if (e.target.closest('.pause')) { pause(); return; }
    if (e.target.closest('.next') || e.target.closest('.pb')) { if (!next()) (cfg.onEnd || (() => { location.hash = '#install/0'; }))(); } });
  st.onKey = (e) => { if (e.target && e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return; if (!cv.isConnected) return; if (e.key === ' ' || e.code === 'Space') { if (FORMS) { if (next()) { e.preventDefault(); e.stopImmediatePropagation(); } return; } e.preventDefault(); e.stopImmediatePropagation(); if (!next()) (cfg.onEnd || (() => { location.hash = '#install/0'; }))(); } };
  document.addEventListener('keydown', st.onKey, true);
  st.ro = new ResizeObserver(() => { size(); if (st.pi < 0) drawFront(); else if (st.cam) { st.p = posNow(); draw(); } }); st.ro.observe(cv.parentElement);
  /* open where the viewer was; ?ifs=principle.step opens on a step at rest (how the frames get checked without a browser) */
  const dbg = new URLSearchParams(location.search).get('ifs'), keep = cfg.start && cfg.start.kind === st.kind ? cfg.start : null, from = dbg ? String(dbg).split('.').map(Number) : keep ? [keep.pi, keep.si || 0] : [FORMS ? -1 : 0, 0], p0 = clamp(Number.isFinite(from[0]) ? from[0] : 0, FORMS ? -1 : 0, PR.length - 1);
  size(); if (p0 < 0) { st.pi = -1; sync(false); } else { st.pi = p0; st.cam = clone(viewOf(deckOf(p0).cams[0])); enter(p0, from[1] || 0, true); if (!dbg && !keep) { st.t = 0; kick(); } update(0); draw(); }
  return st;
}
function unmount() { if (!S) return; if (S.raf) cancelAnimationFrame(S.raf); if (S.ro) S.ro.disconnect(); if (S.onKey) document.removeEventListener('keydown', S.onKey, true); S = null; }
window.skIntroField = { mount, unmount, step: (d) => (S ? S.step_(d) : false), state: () => (S ? { kind: S.kind, pi: S.pi, si: S.step } : null), SHELL_NAMES, simulate, prepScene, shellOf, simDefense, plainOffense };
})();
