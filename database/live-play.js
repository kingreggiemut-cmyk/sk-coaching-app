/* live-play.js: THE LIVE PLAY PAGE (2026-10-11, from the Show SS Sim 2 sketch he approved).
   The frame on a play page stops being a still card: the dark field acts out whichever key or adjustment is open.
   One step per line of the paper, in this order: the call at rest, each key, each adjustment (they stack), then the
   snap with everything on.

   THE WORDS ARE HIS AND STAY ON THE PAPER. This file only draws. What the field does for each line is STAGING, and it
   is authored per call in a staging file the scheme names (scheme.live, e.g. madden/live/seahawks-coverages.js):

     skLive.stage('scheme-key', 'play-id', (K) => ({
       off: 'shotgun__doubles',                 the offense it plays against (a formation tile key)
       align(F, n) { ... },                     what the first n adjustments change: spots (F.def.s5 = [x, y]) and jobs (K.job)
       call(F, t) { ... }, keys: [fn, ...], adj: [fn, ...], run(F, t) { ... },
     }));

   Every step function gets a FRAME to change and the seconds since the step opened. A frame is everything the field
   shows at one moment: where the eleven are, where the offense is, which zones and rush lanes are lit, rings, tags,
   counts, marker notes, lines, a ball, a hit mark and the camera. K is the kit: the men, easing, and the moves
   (snap, walk, route, ring, note ...). Men are keyed s0..s10 in the game's slot order, the same keys the boards use.

   The page owns the step (space bar, the lists, the Animate button) and tells the field with skLive.go(i). The field
   survives the page's repaints with skLive.adopt(host), the way the story reel does. */
(function () {
  'use strict';
  const REG = {}, ALIAS = {};
  /* the staging for a call: this scheme's own, or one it borrows from (the advanced install carries the Nickel calls) */
  const find = (scheme, id) => REG[scheme + '/' + id] || (ALIAS[scheme] || []).map((a) => REG[a + '/' + id]).find(Boolean) || null;
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), u01 = (t, a, b) => clamp((t - a) / ((b - a) || 1), 0, 1), E = (t, a, b) => ease(u01(t, a, b));
  const L2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)], L4 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
  const plen = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  function along(pts, f) { let left = plen(pts) * clamp(f, 0, 1); for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (left <= L) return L2(a, b, L ? left / L : 0); left -= L; } return pts[pts.length - 1].slice(); }
  /* QB CONTAIN, the way the game draws it: from where the end lines up straight upfield to about the quarterback's depth, a
     square corner, and the arrow pointing in at him */
  const containPath = (p, qb) => { const sg = p[0] >= qb[0] ? 1 : -1, y = Math.min(qb[1] + .8, -4.4, p[1] - .8), len = clamp(Math.abs(p[0] - qb[0]) - 1.4, .8, 2.4); return [[p[0], p[1]], [p[0], y], [p[0] - sg * len, y]]; };
  /* A RUSH ARROW MOVES WITH ITS MAN: from where he is now on to where he is going (aim), never shorter than a couple of yards,
     so there is always arrow in front of him. With no aim (before the snap) it is the game's own arrow from where he stands. */
  const lanePts = (p, rush, aim) => { const r0 = rush[0], e = rush[rush.length - 1]; if (!aim) return rush.map((q) => [q[0] - r0[0] + p[0], q[1] - r0[1] + p[1]]);
    let dx = aim[0] - p[0], dy = aim[1] - p[1], L = Math.hypot(dx, dy); if (L < 1.7) { if (L < .08) { dx = e[0] - r0[0]; dy = e[1] - r0[1]; L = Math.hypot(dx, dy) || 1; } dx *= 1.7 / L; dy *= 1.7 / L; } return [[p[0], p[1]], [p[0] + dx, p[1] + dy]]; };
  const laneTip = (a, rush) => { const r0 = rush[0], e = rush[rush.length - 1]; return [e[0] - r0[0] + a[0], e[1] - r0[1] + a[1]]; };
  /* where a blocked rusher's arrow ends: the same way the game drew it, from where he is now (p), shorter by how far he has come from where he lined up (a) */
  const laneOn = (a, p, rush) => { const r0 = rush[0], e = rush[rush.length - 1], dx = e[0] - r0[0], dy = e[1] - r0[1], L = Math.hypot(dx, dy) || 1, len = Math.max(2.3, L - .5 * Math.hypot(p[0] - a[0], p[1] - a[1])); return [p[0] + dx / L * len, p[1] + dy / L * len]; };
  const WHITE = '#EDEAE2', RED = '#FF6B5E', GOLD = '#f5c542', MAN = '#F2A14E', FIELD = '#0f151c';
  const WIDE = [-27, -9.5, 27, 24];
  /* the game's own zone colours, the ones the site's cards draw (sk-cards.js ZONE_COL when it is on the page) */
  const ZC0 = { deep: ['rgba(43,58,190,.62)', '#7E93FF'], hook: ['rgba(150,150,58,.62)', '#E8E874'], 'curl-flat': ['rgba(88,64,146,.66)', '#9B7FD4'], 'seam-flat': ['rgba(146,112,176,.62)', '#D3B0EC'], 'quarter-flat': ['rgba(146,112,176,.62)', '#D3B0EC'],
    'soft-squat': ['rgba(74,138,186,.62)', '#8FD0F0'], 'cloud-flat': ['rgba(52,140,140,.62)', '#74DCDC'], 'hard-flat': ['rgba(52,140,140,.62)', '#74DCDC'], flat: ['rgba(52,140,140,.62)', '#74DCDC'], curlflat: ['rgba(146,112,176,.62)', '#D3B0EC'], seam: ['rgba(146,112,176,.62)', '#D3B0EC'], other: ['rgba(150,150,150,.52)', '#DEDEDE'] };
  const zc = (j) => { const G = (typeof ZONE_COL !== 'undefined') ? ZONE_COL : null, z = G && (G[j.zj] || G[j.zk]); if (z) return [z.fill, z.line]; return ZC0[j.zj] || ZC0[j.zk] || ZC0.other; };
  const OLN = ['LT', 'LG', 'C', 'RG', 'RT'], isOL = (p) => /^(LT|LG|C|RG|RT)$/.test(p.p);

  let cur = null, styled = false;
  function style() { if (styled) return; styled = true; const s = document.createElement('style'); s.id = 'lp-style';
    s.textContent = '.lphost{position:absolute;inset:0;background:' + FIELD + ';cursor:pointer}.lp-root{position:absolute;inset:0}.lp-root canvas{display:block;width:100%;height:100%}' +
      '.lpboard .lp-now,.lpboard .lp-hint{display:none}.lp-now{position:absolute;left:14px;top:14px;max-width:62%;font:800 15px/1.15 var(--fc,sans-serif);letter-spacing:.18em;text-transform:uppercase;background:rgba(5,7,10,.86);color:#f3ecd9;padding:9px 12px 8px;pointer-events:none}' +
      '.lp-now b{color:var(--team,#69BE28);margin-right:9px;font-weight:800}.lp-hint{position:absolute;right:14px;bottom:12px;font:700 13px/1 var(--fc,sans-serif);letter-spacing:.2em;text-transform:uppercase;color:rgba(243,236,217,.42);pointer-events:none}' +
      '.lp-grid{position:fixed;inset:0;z-index:99999;background:#0c0b10;display:grid;gap:6px;padding:6px;overflow:auto}.lp-grid .c{position:relative;background:' + FIELD + ';min-height:0}.lp-grid .c canvas{display:block;width:100%;height:100%}.lp-grid .c span{position:absolute;left:6px;top:6px;font:800 13px/1 var(--fc,sans-serif);letter-spacing:.14em;text-transform:uppercase;background:rgba(5,7,10,.86);color:#f3ecd9;padding:5px 7px}';
    document.head.appendChild(s); }

  /* ---- A CALL NOBODY HAS STAGED: the field stages it from the game's art and the men each key is about ---- */
  function autoStage(cfg) { return (K) => { const E = K.E;
    const pick = (tok) => K.men.filter((m) => { const j = m.base; return tok === 'rush' ? !!j.rush : tok === 'man' ? j.man != null : !j.zone ? false : tok === 'deep' ? j.zk === 'deep' : tok === 'hook' ? j.zk === 'hook' : tok === 'flat' ? /flat|seam/.test(j.zk + ' ' + j.zj) : true; }).map((m) => m.k);
    const box = (ks) => { let x0 = 1e9, y0 = -8, x1 = -1e9, y1 = 4; const put = (x, y) => { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); };
      ks.forEach((k) => { const m = K.M(k), j = m.base; put(m.x, m.y); if (j.zone) { put(j.zone[0] - j.zone[2], j.zone[1] - j.zone[3]); put(j.zone[0] + j.zone[2], Math.min(24, j.zone[1] + j.zone[3])); } });
      const cx = (x0 + x1) / 2, half = Math.max(13, (x1 - x0) / 2 + 5); return [Math.max(-27, cx - half), y0 - 2, Math.min(27, cx + half), y1 + 3]; };
    return { off: 'shotgun__doubles', call(F, t) { K.pre(F, E(t, .5, 1.7)); },
      keys: (cfg.reads || []).map((r) => (F, t) => { const toks = (r.at || []).filter((x) => typeof x === 'string'), ks = [...new Set(toks.flatMap(pick))]; if (!ks.length) return;
        K.showAll(F, 1, ks); ks.forEach((k, j) => { const a = E(t, .3 + j * .1, .7 + j * .1); if (a > 0) K.ring(F, k, a); }); K.view(F, box(ks), E(t, .2, 1.1));
        if (toks.includes('rush')) K.snap(F, E(t, 1.7, 3.4), {}); }),
      run(F, t) { K.snap(F, E(t, 1, 2.8), {}); } }; }; }

  /* ---- one call, built: the men, the offense, the kit, the steps ---- */
  function build(cfg) {
    const builder = find(cfg.scheme, cfg.id) || (cfg.auto ? autoStage(cfg) : null); if (!builder) return null;
    const MEN = cfg.men.map((m) => ({ k: m.k, i: m.i, x: m.x, y: m.y, pos: m.pos || '', from: m.from || null,
      base: m.rush ? { rush: m.rush.map((q) => q.slice()) } : m.zone ? { zone: m.zone.slice(), zj: m.zj || '', zk: m.zk || '' } : m.man != null ? { man: m.man } : {} }));
    const M = (k) => MEN.find((m) => m.k === k);
    const offOf = (name, mir) => { const tile = ((cfg.forms && cfg.forms[name]) || []).map((q) => (mir ? { p: q.p, x: -q.x, y: q.y } : q)); const olx = tile.filter((t) => t.p === 'OL').map((t) => t.x).sort((a, b) => a - b);
      return tile.map((t) => ({ p: t.p === 'OL' ? OLN[olx.indexOf(t.x)] : t.p, x: t.x, y: t.y })); };
    let spec = null;
    const J = (F, k) => F.job[k] || M(k).base;
    const CI = (cfg.adjLabels || cfg.adj || []).findIndex((a) => /\bcontain\b/i.test(String(a || '')));   /* the QB contain adjustment, when the call has one */
    const K = { E, ease, u01, lerp, clamp, L2, L4, along, WIDE, WHITE, RED, GOLD, MAN, M, men: MEN, J, offOf,
      /* a fresh frame with the first n adjustments already on */
      frame(n) { const d = {}; MEN.forEach((m) => { d[m.k] = [m.x, m.y]; });
        const F = { n: n || 0, def: d, off: offOf(spec.off || 'shotgun__doubles'), job: {}, zones: {}, lanes: {}, mans: {}, cov: {}, lead: 1, cont: {}, aim: {}, marks: {}, omarks: {}, notes: [], lines: [], ball: null, hit: null, dim: 1, ghost: 0, view: WIDE.slice(), qb: [0, -6] };
        const q = F.off.find((o) => o.p === 'QB'); if (q) F.qb = [q.x, q.y]; F.qb0 = F.qb.slice(); if (spec.align) spec.align(F, F.n, K); if (CI >= 0 && F.n > CI) K.contain(F, 1); return F; },
      /* a man's job for this frame only: K.job(F, 's4', { zone: [x, y, rx, ry], zj: 'curl-flat' }) or { rush: 1 } or { man: 3 } or {} */
      job(F, k, j) { const m = M(k); F.job[k] = j.rush ? { rush: Array.isArray(j.rush) ? j.rush : [[F.def[k][0], F.def[k][1]], [F.def[k][0] + (F.def[k][0] > 0 ? -1.1 : 1.1), F.def[k][1] - 3]] } : j; return m; },
      /* light everything: zones at a (or only the listed men bright), every rush lane, every man link */
      showAll(F, a, lit) { MEN.forEach((m) => { const j = J(F, m.k), v = lit ? (lit.includes(m.k) ? 1 : .2) : (a == null ? 1 : a); if (j.zone) F.zones[m.k] = v; else if (j.rush) F.lanes[m.k] = lit ? (lit.includes(m.k) ? 1 : .35) : 1; else if (j.man != null) F.mans[m.k] = v * .8; }); },
      rushers(F) { return MEN.filter((m) => J(F, m.k).rush).map((m) => m.k); },
      /* THE CONTAIN MEN: the outside man of the line on each side, when he is rushing. An end who drops keeps his zone. */
      edges(F) { const front = MEN.filter((m) => /^(DE|DT|NT|LE|RE|DL)$/.test(m.pos)), out = []; [-1, 1].forEach((sg) => { let best = null; front.forEach((m) => { const x = F.def[m.k][0] * sg; if (x > .6 && (!best || x > F.def[best.k][0] * sg)) best = m; }); if (best && J(F, best.k).rush) out.push(best.k); }); return out; },
      /* QB contain on: their rush arrows become the game's squared off contain arrows, drawn on by u (1 = all the way) */
      contain(F, u) { const ks = K.edges(F); ks.forEach((k) => { F.cont[k] = u == null ? 1 : u; }); return ks; },
      /* the offense: one man by position name; i picks among several, counted left to right */
      o(F, p, i) { const l = F.off.filter((x) => x.p === p).sort((a, b) => a.x - b.x); return l[i || 0] || null; },
      /* change the offense to another formation, morphing by u */
      toOff(F, name, u, mir) { const to = offOf(name, mir); F.off = F.off.map((o, j) => (to[j] ? { p: u > .5 ? to[j].p : o.p, x: lerp(o.x, to[j].x, u), y: lerp(o.y, to[j].y, u) } : o)); const q = F.off.find((o) => o.p === 'QB'); if (q) { F.qb = [q.x, q.y]; F.qb0 = F.qb.slice(); } },
      /* THE SNAP. The line sets, the quarterback drops. Rushers named free get home (down the path given, or the usual
         bend), the other rushers stick on a blocker, and everybody with a zone drops to it. */
      snap(F, u, o) { o = o || {}; const q = F.qb = [F.qb0[0], F.qb0[1] - (F.qb0[1] > -3 ? 5 : 2.2) * u];
        F.off.forEach((p) => { if (isOL(p)) p.y -= .9 * u; else if (p.p === 'QB') { p.x = q[0]; p.y = q[1]; } });
        const free = o.free || [], paths = o.paths || {}, hold = o.hold || [];
        MEN.forEach((m) => { const k = m.k, j = J(F, k), a = F.def[k]; if (hold.includes(k)) return;
          if (j.rush) { const sg = a[0] >= q[0] ? 1 : -1, tip = laneTip(a, j.rush); F.aim[k] = tip;   /* his arrow goes with him and keeps pointing where he was sent */
            if (free.includes(k)) { const full = [a].concat(paths[k] || [[a[0] - .9 * sg, Math.min(a[1], 1) - 2.6], [lerp(a[0], q[0], .6), -4.4]]).concat([[q[0] + .75 * sg, q[1] + .5]]);
              F.aim[k] = L2(tip, along(full, Math.min(1, u + .16)), clamp(u * 6, 0, 1)); F.lanes[k] = (F.lanes[k] || 0) * (1 - clamp((u - .72) / .28, 0, 1)); }   /* the man coming free points down his own path, and loses the arrow as he gets home */
            if (free.includes(k)) F.def[k] = along([a].concat(paths[k] || [[a[0] - .9 * sg, Math.min(a[1], 1) - 2.6], [lerp(a[0], q[0], .6), -4.4]]).concat([[q[0] + .75 * sg, q[1] + .5]]), u);
            else F.def[k] = paths[k] ? along([a].concat(paths[k]), Math.min(1, u * 1.5)) : F.cont[k] > .5 ? L2(a, [a[0], -2], Math.min(1, u * 1.6)) : L2(a, [a[0] * .84 + (a[1] > 3 ? -sg * .4 : 0), -1.25], Math.min(1, u * 1.6)); if (!free.includes(k)) F.aim[k] = laneOn(a, F.def[k], j.rush); }
          else if (j.zone && o.drop !== false) F.def[k] = L2(a, [j.zone[0], Math.min(j.zone[1], 20.4)], u * .9); });
        F.lead = 1 - u; return q; },
      /* a defender moved along a path (a walk down, a loop, a break on the ball) */
      walk(F, k, pts, u) { F.def[k] = along(pts, u); return F.def[k]; },
      /* a defender in man: he stays on his man with a cushion */
      trail(F, k, o, dx, dy) { if (o) F.def[k] = [o.x + (dx || 0), o.y + (dy == null ? 1.4 : dy)]; },
      /* an offensive man runs a route: the line draws first (prog), then he runs it (u) */
      route(F, o, pts, u, opt) { if (!o) return [0, 0]; opt = opt || {}; const full = [[o.x, o.y]].concat(pts); F.lines.push({ pts: full, col: opt.col || WHITE, w: opt.w || 2.4, a: opt.a == null ? .78 : opt.a, prog: opt.prog == null ? 1 : opt.prog, tip: 1, dash: opt.dash || null }); const at = along(full, u * (opt.stop == null ? 1 : opt.stop)); o.x = at[0]; o.y = at[1]; return at; },
      ring(F, k, a, tag) { F.marks[k] = Object.assign(F.marks[k] || {}, { ring: a == null ? 1 : a }); if (tag) F.marks[k].tag = tag; },
      tag(F, k, tag, a) { F.marks[k] = Object.assign(F.marks[k] || {}, { tag, ta: a == null ? 1 : a }); },
      num(F, k, n) { F.marks[k] = Object.assign(F.marks[k] || {}, { num: n }); },
      /* a mark on an offensive man (his receiver number, a ring) */
      omark(F, o, m) { const i = F.off.indexOf(o); if (i >= 0) F.omarks[i] = Object.assign(F.omarks[i] || {}, m); },
      note(F, t, x, y, a, col) { if (a > .01) F.notes.push({ t, x, y, a, col }); },
      line(F, pts, o) { F.lines.push(Object.assign({ pts, col: GOLD, w: 3.6, a: 1 }, o || {})); },
      ball(F, to, f, from) { if (f > 0) F.ball = { from: from || F.qb, to, f: clamp(f, 0, 1) }; },
      hit(F, at, a, t) { if (a > .01) F.hit = { at, a, t: t || '' }; },
      view(F, rect, e) { F.view = L4(WIDE, rect, e == null ? 1 : e); },
      /* start this frame over with the first n adjustments on (a key that wants the picture before the setup, or after it) */
      reset(F, n, a) { const G = K.frame(n); Object.keys(F).forEach((k) => { delete F[k]; }); Object.assign(F, G); K.showAll(F, a == null ? 1 : a); return F; },
      /* slide from this frame toward the one with n adjustments on: spots move, and past halfway the jobs change */
      toAdj(F, n, u) { const G = K.frame(n); MEN.forEach((m) => { F.def[m.k] = L2(F.def[m.k], G.def[m.k], u); }); if (u > .5) { F.job = G.job; F.cont = G.cont; F.zones = {}; F.lanes = {}; F.mans = {}; K.showAll(F, 1); } return G; },
      /* the walk downs the game does by itself: everybody who moves before the snap, from where he broke the huddle (u 0) to where he ends up (u 1) */
      pre(F, u, only) { MEN.forEach((m) => { if (m.from && (!only || only.includes(m.k))) F.def[m.k] = L2(m.from, [m.x, m.y], u); }); },
      /* the same call shown the other way round, fading out as the real one fades in (flip the play) */
      flip(F, u) { F.ghost = 1 - u; F.dim = u; },
    };
    spec = builder(K) || {};
    const keys = cfg.reads || [], adj = cfg.adj || [], nA = adj.length, steps = [], LB = cfg.labels || {};
    const base = (n, lit) => { const F = K.frame(n); K.showAll(F, lit == null ? 1 : lit); return F; };
    steps.push({ kind: 'call', chip: LB.call || ['The call', cfg.name || ''], f: (t) => { const F = K.frame(0); K.showAll(F, E(t, .15, .9)); if (spec.call) spec.call(F, t); return F; } });
    keys.forEach((r, i) => steps.push({ kind: 'key', i, chip: [LB.key || 'Key ' + (i + 1), r.label || ''], f: (t) => { const F = base(spec.keysOn == null ? 0 : spec.keysOn); const fn = spec.keys && spec.keys[i]; if (fn) fn(F, t); return F; } }));
    adj.forEach((a, i) => steps.push({ kind: 'adj', i, chip: [LB.adj || 'Adjustment ' + (i + 1), (cfg.adjLabels || [])[i] || ''], f: (t) => { const F = base(i); const fn = spec.adj && spec.adj[i]; if (i === CI && !fn) K.contain(F, E(t, .5, 1.5)); if (fn) { fn(F, t); if (i === CI && !Object.keys(F.cont).length) K.contain(F, E(t, .5, 1.5)); } else { const G = K.frame(i + 1), u = E(t, .4, 1.3); MEN.forEach((m) => { F.def[m.k] = L2(F.def[m.k], G.def[m.k], u); }); if (u > .5) F.job = G.job; K.showAll(F, 1); } return F; } }));
    if (!cfg.noRun) steps.push({ kind: 'run', chip: ['Run it', 'everything on'], f: (t) => { const F = base(nA); if (spec.run) spec.run(F, t); else K.snap(F, E(t, 1, 2.8), {}); return F; } });
    return { K, MEN, J, steps, spec };
  }

  /* ---- the field: one canvas, one camera ----
     The camera is a pitch (90 is straight down), a little yaw, and the patch of field it has to show; the distance is
     whatever fits that patch into the part of the canvas the page leaves clear (opt.left is the share its slips cover). */
  const DARKT = { ground: FIELD, halo: FIELD, line: 'rgba(237,234,226,.1)', los: 'rgba(237,234,226,.62)', stick: 'rgba(201,193,78,.75)', num: 'rgba(237,234,226,.3)', man: WHITE, manT: 'rgba(237,234,226,.82)', off: 'rgba(237,234,226,.55)', offT: 'rgba(237,234,226,.5)', rush: RED, link: MAN, ring: GOLD, note: GOLD, zone: zc, ball: 'rgba(237,234,226,.5)' };
  const PAPERT = { ground: '#fbf6e8', halo: '#fbf6e8', line: 'rgba(23,19,14,.2)', los: 'rgba(23,19,14,.85)', stick: null, num: null, man: '#17130E', manT: 'rgba(23,19,14,.8)', off: 'rgba(23,19,14,.5)', offT: 'rgba(23,19,14,.5)', rush: '#4a9418', link: 'rgba(23,19,14,.55)', ring: '#4a9418', note: '#3f7a14', zone: () => ['rgba(23,19,14,.06)', 'rgba(23,19,14,.5)'], ball: 'rgba(23,19,14,.5)' };
  const pitchOf = (v) => clamp(24 + (v[2] - v[0]) * .27, 28, 40), yawOf = (v) => clamp((v[0] + v[2]) / 2 * .5, -8, 8);
  function cutPath(pts, f) { let left = plen(pts) * clamp(f, 0, 1); const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (left <= L) { out.push(L2(p, q, L ? left / L : 0)); return out; } out.push(q); left -= L; } return out; }
  function viewOf(cv, B, opt) { opt = opt || {};
    const g = cv.getContext('2d'), cs = getComputedStyle(cv), fnt = (v, d) => (cs.getPropertyValue(v) || d).trim() || d, TH = opt.theme === 'paper' ? PAPERT : DARKT;
    const FD = fnt('--fd', 'Anton, Impact, sans-serif'), FC = fnt('--fc', "'Barlow Condensed', sans-serif"), FM = fnt('--fm', "'Permanent Marker', cursive");
    let W = 0, H = 0, R = 1, P = () => null; const TS = opt.ts || 1, MS = opt.ms || 1;   /* text and mark scale: 1 on the site, bigger in a video */
    function size() { const r = cv.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; W = cv.clientWidth || r.width; H = cv.clientHeight || r.height; R = Math.min(devicePixelRatio || 1, 2) * (r.width / W || 1); R = clamp(R, 1, 3); cv.width = Math.round(W * R); cv.height = Math.round(H * R); return true; }
    function aim(c) { const th = c.pitch * Math.PI / 180, ps = c.yaw * Math.PI / 180, ct = Math.cos(th), sn = Math.sin(th), sp = Math.sin(ps), cp = Math.cos(ps);
      const f = [sp * ct, cp * ct, -sn], r = [cp, -sp, 0], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], v = c.view, tx = (v[0] + v[2]) / 2, ty = (v[1] + v[3]) / 2, FL = (H / 2) / Math.tan(17 * Math.PI / 180);
      const x0 = W * (opt.left || 0), y1 = H * (1 - (opt.foot || 0)), pad = Math.min(14, W * .02), px = (x0 + W) / 2, cor = [[v[0], v[1]], [v[2], v[1]], [v[0], v[3]], [v[2], v[3]]];
      const mk = (d, py) => { const C = [tx - f[0] * d, ty - f[1] * d, -f[2] * d]; return (x, y) => { const p = [x - C[0], y - C[1], -C[2]], z = p[0] * f[0] + p[1] * f[1] + p[2] * f[2]; if (z < .7) return null; const k = FL / z; return [px + k * (p[0] * r[0] + p[1] * r[1] + p[2] * r[2]), py - k * (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]), k]; }; };
      let py = y1 / 2, best = 60;
      for (let pass = 0; pass < 2; pass++) { let lo = 4, hi = 500; for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2, Q = mk(mid, py), ok = cor.every((q) => { const s = Q(q[0], q[1]); return s && s[0] >= x0 + pad && s[0] <= W - pad && s[1] >= pad && s[1] <= y1 - pad; }); if (ok) hi = mid; else lo = mid; }
        best = hi; if (!pass) { const Q = mk(hi, py), ys = cor.map((q) => (Q(q[0], q[1]) || [0, py])[1]); py += (y1 - (Math.max(...ys) + Math.min(...ys))) / 2; } }
      P = mk(best, py); }
    const gp = (pts, close) => { let on = false; g.beginPath(); for (const q of pts) { const s = P(q[0], q[1]); if (!s) continue; if (!on) { g.moveTo(s[0], s[1]); on = true; } else g.lineTo(s[0], s[1]); } if (close) g.closePath(); return on; };
    function path(pts, col, w, dash, a, prog, tipOn) { if (a <= .01 || !pts || pts.length < 2) return; const cut = prog == null ? pts : cutPath(pts, prog); if (plen(cut) <= .02) return; g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []); if (gp(cut)) g.stroke(); g.setLineDash([]);
      if (tipOn) { const A2 = P(cut[cut.length - 2][0], cut[cut.length - 2][1]), B2 = P(cut[cut.length - 1][0], cut[cut.length - 1][1]); if (A2 && B2) { const an = Math.atan2(B2[1] - A2[1], B2[0] - A2[0]), s = Math.max(7, w * 2.6); g.fillStyle = col; g.translate(B2[0], B2[1]); g.rotate(an); g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * .5, s * .62); g.lineTo(-s * .5, -s * .62); g.closePath(); g.fill(); } } g.restore(); }
    function text(str, x, y, font, col, a, al, stroke) { if (a <= .01) return; g.save(); g.globalAlpha = a; g.font = font; g.textAlign = al || 'center'; g.textBaseline = 'middle'; if (stroke !== 0) { g.lineJoin = 'round'; g.strokeStyle = TH.halo; g.lineWidth = 5; g.strokeText(str, x, y); } g.fillStyle = col; g.fillText(str, x, y); g.restore(); }
    function manTarget(F, m, j) { if (F.cov[m.k]) return F.cov[m.k]; if (typeof j.man !== 'number' || j.man < 1) return null; const el = F.off.filter((o) => !isOL(o) && o.p !== 'QB').sort((a, b) => b.x - a.x); return el[j.man - 1] || null; }
    function drawDef(F, a, mirror) { const sx = mirror ? -1 : 1, set = F.def, small = !!opt.small;
      B.MEN.forEach((m) => { const j = B.J(F, m.k); if (!j.zone) return; const za = (F.zones[m.k] || 0) * a; if (za <= .01) return; const c = TH.zone(j), z = j.zone, pts = []; for (let i = 0; i < 40; i++) { const an = i / 40 * Math.PI * 2; pts.push([(z[0] + Math.cos(an) * z[2]) * sx, z[1] + Math.sin(an) * z[3]]); }
        g.save(); g.globalAlpha = za; if (gp(pts, 1)) { g.fillStyle = c[0]; g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke(); } g.restore(); const p = set[m.k]; if (F.lead > .02) path([[p[0] * sx, p[1]], [z[0] * sx, z[1]]], c[1], 2.4, null, za * F.lead); });
      B.MEN.forEach((m) => { const j = B.J(F, m.k); if (!j.rush) return; const la = (F.lanes[m.k] || 0) * a; if (la <= .01) return; const p = set[m.k], c = (F.cont && F.cont[m.k]) || 0, w = small ? 2.4 : 3.6;
        if (c < 1) path(lanePts(p, j.rush, F.aim && F.aim[m.k]).map((q) => [q[0] * sx, q[1]]), TH.rush, w, null, la * (1 - c), 1, 1);
        if (c > 0) path(containPath(p, F.qb0 || F.qb || [0, -6]).map((q) => [q[0] * sx, q[1]]), TH.rush, w, null, la, c, 1); });
      B.MEN.forEach((m) => { const j = B.J(F, m.k), ma = (F.mans[m.k] || 0) * a; if (ma <= .01 || mirror) return; const o = manTarget(F, m, j); if (!o) return; const p = set[m.k]; path([[p[0], p[1]], [o.x, o.y + .9]], TH.link, 2.2, [5, 5], ma * .9); });
      B.MEN.slice().sort((p, q) => set[q.k][1] - set[p.k][1]).forEach((m) => { const j = B.J(F, m.k), p = set[m.k], s = P(p[0] * sx, p[1]); if (!s) return; const x = s[0], y = s[1], e = clamp(s[2] * .46, small ? 3.4 : 5.5, 16) * MS, mk = clamp(s[2] * .6, small ? 7 : 10, 18) * TS, Mk = mirror ? null : F.marks[m.k]; g.save(); g.globalAlpha = a;
        if (Mk && Mk.ring) { g.strokeStyle = TH.ring; g.lineWidth = 3; g.beginPath(); g.arc(x, y, e + 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Mk.ring); g.stroke(); }
        if (j.rush) { g.fillStyle = TH.man; g.fillRect(x - e * .8, y - e * .8, e * 1.6, e * 1.6); } else { g.strokeStyle = TH.man; g.lineWidth = Math.max(1.8, e * .36); g.lineCap = 'round'; g.beginPath(); g.moveTo(x - e, y - e); g.lineTo(x + e, y + e); g.moveTo(x + e, y - e); g.lineTo(x - e, y + e); g.stroke(); }
        g.restore(); if (!opt.bare) text(m.pos, x, y + e + mk * .64, '700 ' + mk + 'px ' + FC, TH.manT, a);
        if (Mk && Mk.tag) text(Mk.tag, x, y - e - mk * 1.05, '400 ' + mk * 1.5 + 'px ' + FM, TH.ring, a * (Mk.ta != null ? Mk.ta : Mk.ring == null ? 1 : Mk.ring));
        if (Mk && Mk.num) text(String(Mk.num), x, y - e - mk * 1.2, '400 ' + mk * 2.1 + 'px ' + FM, TH.ring, a); }); }
    function draw(F, cam) { if (!W) return; aim(cam || { view: F.view, pitch: opt.pitch == null ? 90 : opt.pitch, yaw: 0 }); g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, W, H);
      /* the field: the grass, yard lines, the line of scrimmage, the sticks at ten, the numbers down the side, the hashes */
      if (gp([[-26.67, -13], [26.67, -13], [26.67, 36], [-26.67, 36]], 1)) { g.fillStyle = TH.ground; g.fill(); }
      for (let y = -10; y <= 35; y += 5) { path([[-26.67, y], [26.67, y]], y === 0 ? TH.los : y === 10 && TH.stick ? TH.stick : TH.line, y === 0 || (y === 10 && TH.stick) ? 2.2 : 1.2, null, 1);
        if (TH.num && y > 0 && y <= 20) for (const sx of [-25.4, 25.4]) { const s = P(sx, y); if (s) text(String(y), s[0], s[1], '700 ' + clamp(s[2] * .8, 9, 17) + 'px ' + FC, TH.num, 1, 'center', 0); } }
      if (!opt.small) for (let y = -12; y <= 35; y++) for (const hx of [-3.1, 3.1]) path([[hx - .35, y], [hx + .35, y]], TH.line, 1.2, null, 1);
      path([[-26.67, -13], [-26.67, 36]], TH.line, 2, null, 1); path([[26.67, -13], [26.67, 36]], TH.line, 2, null, 1);
      /* the other side: plain rings with the position under each */
      F.off.forEach((o, i) => { const s = P(o.x, o.y); if (!s) return; const r = clamp(s[2] * .44, opt.small ? 2.6 : 4.5, 14) * MS, om = clamp(s[2] * .55, 9, 16) * TS, Mk = F.omarks[i]; g.save(); g.beginPath(); g.arc(s[0], s[1], r, 0, 7); g.strokeStyle = TH.off; g.lineWidth = Math.max(1.2, r * .17); g.stroke(); if (Mk && Mk.ring) { g.strokeStyle = TH.ring; g.lineWidth = 2.6; g.globalAlpha = Mk.ring; g.beginPath(); g.arc(s[0], s[1], r + 6, 0, 7); g.stroke(); } g.restore();
        if (!opt.small) text(o.p, s[0], s[1] + r + om * .64, '700 ' + om + 'px ' + FC, TH.offT, 1, 'center', 0);
        if (Mk && Mk.num) text(String(Mk.num), s[0], s[1], '400 ' + clamp(r * 1.5, 11, 22) + 'px ' + FD, TH.ring, Mk.a == null ? 1 : Mk.a, 'center', 0);
        if (Mk && Mk.tag) text(Mk.tag, s[0], s[1] + r + om * 1.9, '400 ' + om * 1.3 + 'px ' + FM, Mk.col || TH.ring, Mk.a == null ? 1 : Mk.a); });
      F.lines.forEach((l) => path(l.pts, l.col === GOLD && TH !== DARKT ? TH.ring : l.col, l.w, l.dash, l.a, l.prog, l.tip));
      if (F.ghost > .01) drawDef(F, F.ghost, true);
      drawDef(F, F.dim, false);
      if (F.ball) { const b = L2(F.ball.from, F.ball.to, F.ball.f), s = P(b[0], b[1]); path([F.ball.from, b], TH.ball, 1.6, [3, 5], 1); if (s) { const lift = Math.sin(F.ball.f * Math.PI) * s[2] * 1.6; g.save(); g.fillStyle = '#a8632c'; g.strokeStyle = WHITE; g.lineWidth = 1.4; g.beginPath(); g.ellipse(s[0], s[1] - lift, clamp(s[2] * .34, 4, 10), clamp(s[2] * .22, 3, 6.5), .5, 0, 7); g.fill(); g.stroke(); g.restore(); } }
      if (F.hit) { const s = P(F.hit.at[0], F.hit.at[1]); if (s) { const r = clamp(s[2] * 1.5, 16, 40) * MS; g.save(); g.globalAlpha = F.hit.a; g.strokeStyle = RED; g.lineWidth = 3.4; g.beginPath(); g.arc(s[0], s[1], r, -2.2, -2.2 + Math.PI * 2.1 * F.hit.a); g.stroke(); g.restore(); if (F.hit.t) text(String(F.hit.t).toUpperCase(), s[0] + r + 8, s[1] + 2, '400 ' + clamp(s[2] * 1.6, 18, 40) * TS + 'px ' + FM, RED, F.hit.a, 'left'); } }
      F.notes.forEach((n) => { const s = P(n.x, n.y); if (s) text(String(n.t).toUpperCase(), s[0], s[1], '400 ' + clamp(s[2] * 1.02, 15, 30) * TS + 'px ' + FM, n.col === GOLD || !n.col ? TH.note : n.col, n.a); }); }
    return { size, draw, g, cv, dims: () => [W, H] };
  }

  /* ---- mounted on a play page ---- */
  const REDUCED = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  function loop() { if (!cur) return; cur.raf = 0; const s = cur.B.steps[cur.i], t = cur.still || REDUCED() ? 99 : (performance.now() - cur.t0) / 1000; let F; try { F = s.f(t); } catch (e) { if (!cur.err) { cur.err = 1; console.error('live play step failed', cur.id, cur.i, e); } return; }
    const now = performance.now(), want = { view: F.view, pitch: s.kind === 'call' ? 90 : F.pitch != null ? F.pitch : pitchOf(F.view), yaw: s.kind === 'call' ? 0 : F.yaw != null ? F.yaw : yawOf(F.view) }, bl = cur.still || REDUCED() || !cur.camFrom ? 1 : ease(clamp((now - cur.tc) / 1250, 0, 1));
    const cam = bl >= 1 ? want : { view: L4(cur.camFrom.view, want.view, bl), pitch: lerp(cur.camFrom.pitch, want.pitch, bl), yaw: lerp(cur.camFrom.yaw, want.yaw, bl) }; cur.cam = cam;
    cur.V.draw(F, cam);
    if (cur.fade) { const k = 1 - clamp((performance.now() - cur.fade.t) / 260, 0, 1); if (k > 0) { const g = cur.V.g; g.save(); g.globalAlpha = k; g.setTransform(1, 0, 0, 1, 0, 0); try { g.drawImage(cur.fade.img, 0, 0, cur.V.cv.width, cur.V.cv.height); } catch (e) {} g.restore(); } else cur.fade = null; }
    if (!cur.still && !REDUCED() && (t < 11 || cur.fade)) cur.raf = requestAnimationFrame(loop); }
  const kick = () => { if (cur && !cur.raf) cur.raf = requestAnimationFrame(loop); };
  function chip() { const s = cur.B.steps[cur.i]; cur.now.innerHTML = '<b>' + s.chip[0] + '</b>' + String(s.chip[1] || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); }
  function go(i, quiet) { if (!cur) return 0; const n = clamp(i, 0, cur.B.steps.length - 1), cv = cur.V.cv;
    if (!quiet && !cur.still && cv.width > 8) { try { const c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height; c.getContext('2d').drawImage(cv, 0, 0); cur.fade = { img: c, t: performance.now() }; } catch (e) { cur.fade = null; } }
    cur.camFrom = quiet ? null : cur.cam || null; cur.tc = performance.now();
    cur.i = n; cur.t0 = performance.now(); cur.err = 0; chip(); kick(); return n; }
  function unmount() { if (!cur) return; if (cur.raf) cancelAnimationFrame(cur.raf); if (cur.ro) cur.ro.disconnect(); if (cur.root.parentNode) cur.root.parentNode.removeChild(cur.root); cur = null; }
  function mount(host, cfg) { unmount(); style(); const B = build(cfg); if (!B) return false;
    const root = document.createElement('div'); root.className = 'lp-root'; root.innerHTML = '<canvas></canvas><span class="lp-now"></span><span class="lp-hint">space = next</span>'; host.appendChild(root);
    const V = viewOf(root.firstChild, B, { left: cfg.left || 0, foot: cfg.foot || 0 });
    cur = { id: cfg.id, scheme: cfg.scheme, B, V, root, now: root.querySelector('.lp-now'), i: 0, t0: performance.now(), raf: 0, fade: null, still: !!cfg.still };
    cur.ro = new ResizeObserver(() => { if (cur && cur.V.size()) kick(); }); cur.ro.observe(root.firstChild); V.size();
    go(cfg.start || 0, true); if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick); return true; }
  /* the page repainted its stage: move the running field into the new host */
  function adopt(host) { if (!cur || !host || host.dataset.live !== cur.id || host.dataset.scheme !== cur.scheme) return false; if (cur.root.parentNode !== host) { host.appendChild(cur.root); cur.V.size(); } kick(); return true; }
  /* every step of one call in its last moment, side by side: the check sheet (used with ?lpgrid on the page) */
  function grid(cfg, from, to, cols) { style(); const B = build(cfg); if (!B) return 0; const old = document.querySelector('.lp-grid'); if (old) old.remove();
    const el = document.createElement('div'); el.className = 'lp-grid'; const list = B.steps.slice(from || 0, to || 99), c = cols || 3; el.style.gridTemplateColumns = 'repeat(' + c + ',minmax(0,1fr))'; el.style.gridAutoRows = (100 / Math.ceil(list.length / c)) + '%';
    document.body.appendChild(el);
    list.forEach((s, n) => { const d = document.createElement('div'); d.className = 'c'; d.innerHTML = '<canvas></canvas><span></span>'; d.lastChild.textContent = ((from || 0) + n) + ' ' + s.chip[0] + ' ' + s.chip[1]; el.appendChild(d); const V = viewOf(d.firstChild, B); V.size(); try { const Fr = s.f(99); V.draw(Fr, { view: Fr.view, pitch: s.kind === 'call' ? 90 : pitchOf(Fr.view), yaw: s.kind === 'call' ? 0 : yawOf(Fr.view) }); } catch (e) { d.lastChild.textContent += ' !! ' + e.message; console.error(e); } });
    return B.steps.length; }
  /* A CALL ON A CARD: the game's art for one call, drawn still on paper from behind the offense (the section lead in) */
  function card(cv, cfg) { const MEN = cfg.men.map((m) => ({ k: m.k, x: m.x, y: m.y, pos: m.pos || '', base: m.rush ? { rush: m.rush } : m.zone ? { zone: m.zone, zj: m.zj || '', zk: m.zk || '' } : m.man != null ? { man: m.man } : {} }));
    const tile = cfg.off || [], olx = tile.filter((q) => q.p === 'OL').map((q) => q.x).sort((p, q) => p - q), off = tile.map((q) => ({ p: q.p === 'OL' ? OLN[olx.indexOf(q.x)] : q.p, x: q.x, y: q.y }));
    const Fr = { def: {}, off, zones: {}, lanes: {}, mans: {}, cov: {}, lead: 1, marks: {}, omarks: {}, notes: [], lines: [], ball: null, hit: null, dim: 1, ghost: 0, view: cfg.view || [-22, -8, 22, 21] }; MEN.forEach((m) => { Fr.def[m.k] = [m.x, m.y]; if (m.base.zone) Fr.zones[m.k] = 1; else if (m.base.rush) Fr.lanes[m.k] = 1; else if (m.base.man != null) Fr.mans[m.k] = .8; });
    const V = viewOf(cv, { MEN, J: (F2, k) => MEN.find((m) => m.k === k).base }, { theme: cfg.theme || 'paper', small: !!cfg.small, bare: !!cfg.bare, pitch: cfg.pitch == null ? 46 : cfg.pitch });
    const paint = () => { if (cv.isConnected && V.size()) V.draw(Fr); }; paint(); requestAnimationFrame(paint); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint); return paint; }
  /* THE SHARED MOVES every staging file uses (count, rings, user, contain, sack, run, bare, flow, lock, with, out) */
  const OL = /^(LT|LG|C|RG|RT)$/;
  const tools = (K) => { const { E, L2, M } = K; const T = {
    at: (k) => [M(k).x, M(k).y],
    count(F, ks, t, t0, gap) { ks.forEach((k, j) => { if (t > t0 + j * (gap || .32)) K.num(F, k, j + 1); }); },
    rings(F, ks, t, t0) { ks.forEach((k, j) => { const a = E(t, t0 + j * .22, t0 + j * .22 + .4); if (a > 0) K.ring(F, k, a); }); },
    user(F, k, t, t0) { const a = t == null ? 1 : E(t, t0 || 0, (t0 || 0) + .4); if (a > 0) K.ring(F, k, a, 'USER'); },
    /* QB contain is part of the blitz setup: it helps the blitz come in (his note 2026-10-11) */
    contain(F, t, t0) { const ks = K.contain(F, E(t, t0 + .3, t0 + 1.3)); (ks.length ? ks : K.rushers(F)).forEach((k, j) => { const a = E(t, t0 + j * .14, t0 + j * .14 + .4); if (a > 0) K.ring(F, k, a); }); K.note(F, 'QB contain: it helps the blitz come in', 0, -8.4, E(t, t0 + .7, t0 + 1)); },
    sack(F, t, t0, word) { K.hit(F, F.qb, E(t, t0, t0 + .3), word == null ? 'sack' : word); },
    /* a run: the back takes the path, the line and the tight end fire out */
    run(F, u, path, dx, prog) { const rb = K.o(F, 'RB'); if (!rb) return [0, 0]; const full = [[rb.x, rb.y]].concat(path), at = K.along(full, u); K.line(F, full, { col: K.WHITE, w: 2.2, a: .6, dash: [6, 6], prog: prog == null ? 1 : prog }); rb.x = at[0]; rb.y = at[1];
      F.off.forEach((o) => { if (OL.test(o.p) || o.p === 'TE' || o.p === 'FB') { o.x += (dx || 0) * u; o.y += .8 * u; } }); return at; },
    /* nothing but the men: no zones, no lanes (a run fit picture) */
    bare(F, a) { K.showAll(F, a == null ? .16 : a); F.lanes = {}; F.mans = {}; F.lead = 0; },
    /* everybody named flows to a spot */
    flow(F, ks, to, u) { ks.forEach((k, j) => { const a = F.def[k]; F.def[k] = L2(a, [to[0] + ((j % 3) - 1) * 1.5, to[1] + .9 + Math.floor(j / 3) * 1.1], u); }); },
    /* every man defender locked on the man the game gives him (one is the widest receiver on the right, counted across) */
    lock(F) { const el = F.off.filter((o) => !OL.test(o.p) && o.p !== 'QB').sort((a, b) => b.x - a.x); K.men.forEach((m) => { const j = K.J(F, m.k); if (typeof j.man === 'number' && j.man >= 1 && el[j.man - 1]) F.cov[m.k] = el[j.man - 1]; }); },
    /* a defender runs with a receiver */
    with(F, k, o, u, dx, dy) { if (o) F.def[k] = L2(F.def[k], [o.x + (dx || 0), o.y + (dy == null ? 1.3 : dy)], u); },
    /* the user end: a step up, then out into the middle */
    out(F, k, t, t0, to) { const a = T.at(k), p = E(t, t0, t0 + 1.7); F.def[k] = K.along([a, [a[0] + (a[0] < 0 ? .4 : -.4), a[1] - 1], to], p); F.lanes[k] = (F.lanes[k] || 0) * (1 - E(t, t0, t0 + .5)); },
    tackles(F, u) { F.off.forEach((o) => { if (o.p === 'LT') o.x -= .9 * u; if (o.p === 'RT') o.x += .9 * u; }); },
  }; return T; };
  /* A SCENE FOR SOMEBODY ELSE'S CLOCK (the video intros): build the call, hand back its steps and a painter. The caller
     picks the step and the second (B.steps[i].f(t)), asks for the camera that step wants and draws: V.draw(F, cam(F, kind)). */
  const scene = (cv, cfg, opt) => { const B = build(cfg); if (!B) return null; const V = viewOf(cv, B, opt || {});
    return { B, V, cam: (F, kind) => ({ view: F.view, pitch: kind === 'call' ? 90 : F.pitch != null ? F.pitch : pitchOf(F.view), yaw: kind === 'call' ? 0 : F.yaw != null ? F.yaw : yawOf(F.view) }), ease, lerp, L4 }; };
  window.skLive = { tools, card, scene, stage: (scheme, id, fn) => { REG[scheme + '/' + id] = fn; }, has: (scheme, id) => !!find(scheme, id), alias: (scheme, from) => { (ALIAS[scheme] = ALIAS[scheme] || []).push(from); }, mount, adopt, unmount, go, grid,
    at: () => (cur ? cur.i : 0), id: () => (cur ? cur.id : null), count: (cfg) => { const B = build(cfg); return B ? B.steps.length : 0; }, replay: () => { if (cur) go(cur.i); } };
})();
