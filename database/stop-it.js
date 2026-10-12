/* stop-it.js: STOP IT (2026-10-12, his idea for the Seahawks advanced defense video).
   The defensive mirror of "attack the coverage": pick what the offense is giving you trouble with (a formation, a pass
   concept, a money route, a kind of run) and the field shows it, with two or three of OUR calls against it and his reason
   for each.

   Two screens, both drawn here (the scheme page only gives each one a box and the data):
     skStop.wall(host, cfg)    the questions as big cards, one group in the middle and the others blurred beside it.
     skStop.mount(host, cfg)   THE RAIL: the questions down the left, the field in the middle, the answers down the right.
                               Each answer plays in two beats: THE LOOK (overhead: the call lined up against it, with the
                               setup: the flip, the walk down, who to user) and THE SNAP (they run it, we play it).
   cfg = { scheme, stop (the scheme's stop block: name, threats), th (the open question), men {callId: [the call's men, as
           scheme.js fieldPlays() gives them]}, nav(id) (open another question), still (a step to freeze on, for stills) }

   WHAT IS REAL AND WHAT IS A SKETCH: our eleven men, their zones and their rush lanes are the call's own art from the
   game. The offensive sets are the game's tiles. The routes, and how each of ours reacts to them after the snap, are placed
   by hand from his rules: it shows who has whom, not who wins the rep.

   STAGING: a scheme stages its own answers in its own file with skStop.stage(schemeKey, { threatId: { callId: pair } }).
   A pair may give: look (the caption for the look), flip (mirror the call, shown as his adjustment), mirror (the same, quietly), walk {man: [x, y]}, zone {man: [x, y, rx, ry,
   zj, zk]} (give a man a different job), blitz [men who rush instead of dropping], user (who he users), cover {man: receiverId | [x, y]}, offs {man: [dx, dy]},
   cap {man: deepest y}, fit {man: [x, y] | path} (a run fit), free [men who come home], home, paths, routes (the offense's,
   over the scene's), cam, tags {man: [text, colour]}, labs [[text, x, y, colour, t0]], end [text, [x, y]].
   Anything a pair leaves out is played by rule: rushers rush, a man defender takes the nearest receiver, a zone defender
   drops and matches the route that ends in his zone, and on a run everybody but the deep zones fits the ball. */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), u01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1), E = (t, a, b) => ease(u01(t, a, b));
  const L2 = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  const plen = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  function cut(pts, f) { let left = plen(pts) * clamp(f, 0, 1); const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (left <= L) { out.push(L2(a, b, L ? left / L : 0)); return out; } out.push(b); left -= L; } return out; }
  const along = (pts, f) => { const c = cut(pts, f); return c[c.length - 1]; };
  const REDUCED = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FC = "'Barlow Condensed','Arial Narrow',sans-serif", FM = "'Permanent Marker',cursive";
  const RUSH = '#FF6B5E', GOLD = '#f5c542', SEAM = '#D3B0EC', HOOK = '#E8E874', DEEP = '#7E93FF', WHITE = '#EDEAE2', CYAN = '#8FD0F0', TEAL = '#74DCDC', GREEN = '#69BE28';
  const COL = { rush: RUSH, gold: GOLD, seam: SEAM, hook: HOOK, deep: DEEP, white: WHITE, cyan: CYAN, teal: TEAL, green: GREEN };
  const KC = { Coverage: DEEP, Blitz: RUSH, 'Zero blitz': RUSH, 'Sim pressure': GOLD, 'Change up': SEAM, 'Run fit': GREEN };
  /* the game's zone colours, the ones the site's cards draw */
  const ZC = { deep: ['rgba(43,58,190,.62)', DEEP], hook: ['rgba(150,150,58,.62)', HOOK], 'curl-flat': ['rgba(88,64,146,.66)', '#9B7FD4'], 'seam-flat': ['rgba(146,112,176,.62)', SEAM], 'quarter-flat': ['rgba(146,112,176,.62)', SEAM], seam: ['rgba(146,112,176,.62)', SEAM], curlflat: ['rgba(146,112,176,.62)', SEAM],
    'soft-squat': ['rgba(74,138,186,.62)', CYAN], 'cloud-flat': ['rgba(52,140,140,.62)', TEAL], 'hard-flat': ['rgba(52,140,140,.62)', TEAL], flat: ['rgba(52,140,140,.62)', TEAL], other: ['rgba(150,150,150,.5)', '#DEDEDE'] };
  const zcol = (m) => { const G = (typeof ZONE_COL !== 'undefined') ? ZONE_COL : null, z = G && (G[m.zj] || G[m.zk]); if (z) return [z.fill, z.line]; const j = /deep/.test(m.zj || '') ? 'deep' : /hook|middle-read/.test(m.zj || '') ? 'hook' : m.zj; return ZC[j] || ZC[m.zk] || ZC.other; };
  const TH = { ground: '#0f151c', line: 'rgba(237,234,226,.1)', los: 'rgba(237,234,226,.62)', stick: 'rgba(201,193,78,.75)', man: '#EDEAE2', off: 'rgba(237,234,226,.6)', offT: 'rgba(237,234,226,.5)', halo: '#0f151c' };
  const OLN = ['LT', 'LG', 'C', 'RG', 'RT'], isOL = (o) => OLN.includes(o.p);

  /* ---- the offense: the game's own sets, each man with a name the scenes can point at. The strength is put to our
     nickel's side, the way the call comes out against it ---- */
  const tile = (list, under) => [{ id: 'qb', p: 'QB', x: 0, y: under ? -1.4 : -6 }].concat(list.map(([id, p, x, y]) => ({ id, p, x, y })), [-3.3, -1.7, 0, 1.7, 3.3].map((x, j) => ({ id: 'ol' + j, p: OLN[j], x, y: [-1.2, -.9, -.6, -.9, -1.2][j] })));
  const TILES = {
    trips: tile([['rb', 'RB', -2.9, -6], ['w3', 'WR', -8, -2.2], ['x', 'WR', 16.2, -.8], ['w1', 'WR', -17.5, -.8], ['w2', 'WR', -12.8, -2.2]]),
    doubles: tile([['rb', 'RB', 2.9, -6], ['sl', 'WR', -10, -2.2], ['x', 'WR', -16.2, -.8], ['z', 'WR', 16.3, -2.2], ['te', 'TE', 5, -1.2]]),
    bunch: tile([['rb', 'RB', 2.9, -6], ['b1', 'WR', -7, -1], ['x', 'WR', 15, -.8], ['b2', 'WR', -9, -2.2], ['te', 'TE', -5, -2.2]]),
    empty: tile([['h', 'RB', -11.3, -2.2], ['sl', 'WR', 10.4, -2.2], ['x', 'WR', 17.5, -.8], ['w1', 'WR', -17.5, -2.2], ['te', 'TE', -5, -1.2]]),
    ipro: tile([['rb', 'RB', 0, -7.4], ['fb', 'FB', 0, -4.7], ['x', 'WR', -16, -.8], ['z', 'WR', 16, -2.2], ['te', 'TE', 5, -1.2]], 1) };

  /* ---- the camera. A camera says where it looks, from how steep, and how many yards across it has to show; the distance
     is worked out from the canvas it is drawn on, and pushed back if the quarterback would fall off the bottom ---- */
  const RAD = Math.PI / 180, TAN19 = Math.tan(19 * RAD);
  function proj(c, H, px, py) { const th = c.pitch * RAD, ps = (c.yaw || 0) * RAD, ct = Math.cos(th), sn = Math.sin(th), sp = Math.sin(ps), cp = Math.cos(ps);
    const f = [sp * ct, cp * ct, -sn], r = [cp, -sp, 0], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], C = [c.tx - f[0] * c.d, c.ty - f[1] * c.d, -f[2] * c.d], F = (H / 2) / TAN19;
    return (x, y) => { const p = [x - C[0], y - C[1], -C[2]], z = p[0] * f[0] + p[1] * f[1] + p[2] * f[2]; if (z < .8) return null; const k = F / z; return [px + k * (p[0] * r[0] + p[1] * r[1] + p[2] * r[2]), py - k * (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]), k]; }; }
  function fitCam(c, W, H) { const F = (H / 2) / TAN19; let d = F * c.span / W;
    if (c.pitch >= 89) d = Math.max(d, F * (c.vspan || 37) / H); else { const p = c.pitch * RAD, k = Math.cos(p) - Math.sin(p) / Math.tan(p + 19 * RAD); d = Math.max(d, (c.ty - (c.ymin == null ? -9.6 : c.ymin)) / k); }
    return { tx: c.tx, ty: c.ty, pitch: c.pitch, yaw: c.yaw || 0, d }; }
  const LOOK = { tx: 0, ty: 8.5, pitch: 90, yaw: 0, span: 57, vspan: 37 }, PASS = { tx: -1, ty: 8.5, pitch: 40, yaw: 0, span: 52 }, RUN = { tx: 1.5, ty: 1.8, pitch: 32, yaw: 0, span: 31, ymin: -9 };

  /* ---- one frame of the field, and the drawing of it ---- */
  function frame(men, off) { const q = off.find((o) => o.id === 'qb') || { x: 0, y: -6 }, F = { pos: {}, off: off.map((o) => Object.assign({}, o)), zones: {}, lanes: {}, aim: {}, cont: {}, lead: 1, rings: {}, tags: {}, labels: [], lines: [], hit: null, qb: [q.x, q.y], qb0: [q.x, q.y] };
    men.forEach((m) => { F.pos[m.k] = [m.x, m.y]; if (m.zone) F.zones[m.k] = 1; if (m.rush) F.lanes[m.k] = 1; }); return F; }
  function render(g, W, H, K, P, F, men, o) { o = o || {}; g.setTransform(K, 0, 0, K, 0, 0); g.clearRect(0, 0, W, H); const lmin = o.lmin || 17, th = TH;
    const pth = (pts, close) => { let on = false; g.beginPath(); for (const q of pts) { const s = P(q[0], q[1]); if (!s) continue; if (!on) { g.moveTo(s[0], s[1]); on = true; } else g.lineTo(s[0], s[1]); } if (close) g.closePath(); return on; };
    const stroke = (pts, col, w, dash, a, tip) => { if (a <= .01 || pts.length < 2) return; g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []); if (pth(pts)) g.stroke(); g.setLineDash([]);
      if (tip) { const A = P(...pts[pts.length - 2]), B = P(...pts[pts.length - 1]); if (A && B) { const an = Math.atan2(B[1] - A[1], B[0] - A[0]), s = Math.max(o.bare ? 5 : 8, w * 2.7); g.fillStyle = col; g.translate(B[0], B[1]); g.rotate(an); g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * .5, s * .62); g.lineTo(-s * .5, -s * .62); g.closePath(); g.fill(); } } g.restore(); };
    const text = (s, x, y, font, col, a, al) => { if (a <= .01) return; g.save(); g.globalAlpha = a; g.font = font; g.textAlign = al || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = th.halo; g.lineWidth = 5; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); g.restore(); };
    if (pth([[-26.67, -13], [26.67, -13], [26.67, 38], [-26.67, 38]], 1)) { g.fillStyle = th.ground; g.fill(); }
    for (let y = -10; y <= 35; y += 5) stroke([[-26.67, y], [26.67, y]], y === 0 ? th.los : y === 10 && !o.bare ? th.stick : th.line, y === 0 || (y === 10 && !o.bare) ? 2.2 : 1.2, null, 1);
    if (!o.bare) for (let y = -12; y <= 35; y++) for (const hx of [-3.1, 3.1]) stroke([[hx - .35, y], [hx + .35, y]], th.line, 1.2, null, 1);
    stroke([[-26.67, -13], [-26.67, 38]], th.line, 2, null, 1); stroke([[26.67, -13], [26.67, 38]], th.line, 2, null, 1);
    men.forEach((m) => { if (!m.zone) return; const za = F.zones[m.k] || 0; if (za <= .01) return; const c = zcol(m), z = m.zone, pts = []; for (let i = 0; i < 40; i++) { const an = i / 40 * Math.PI * 2; pts.push([z[0] + Math.cos(an) * z[2], z[1] + Math.sin(an) * z[3]]); }
      g.save(); g.globalAlpha = za; if (pth(pts, 1)) { g.fillStyle = c[0]; g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke(); } g.restore(); if (F.lead > .02) stroke([F.pos[m.k], [z[0], z[1]]], c[1], 2.2, null, za * F.lead); });
    men.forEach((m) => { if (!m.rush) return; const la = F.lanes[m.k] || 0; if (la <= .01) return; const p = F.pos[m.k], c = F.cont[m.k] || 0;
      if (c < 1) stroke(lanePts(p, m.rush, F.aim[m.k]), RUSH, 3.6, null, la * (1 - c), 1);
      if (c > .05) stroke(cut(containPath(p, F.qb0), c), RUSH, 3.6, null, la, 1); });
    F.lines.forEach((l) => stroke(l.prog == null ? l.pts : cut(l.pts, l.prog), l.col, l.w || 2.4, l.dash, l.a == null ? 1 : l.a, l.tip));
    F.off.forEach((q) => { const s = P(q.x, q.y); if (!s) return; const r = clamp(s[2] * .45, 3, 15); g.beginPath(); g.arc(s[0], s[1], r, 0, 7); if (q.ball) { g.fillStyle = GOLD; g.fill(); } g.strokeStyle = th.off; g.lineWidth = Math.max(1.2, r * .16); g.stroke(); if (!o.bare) text(q.p, s[0], s[1] + r + clamp(s[2] * .55, 9, 16) * .7, '700 ' + clamp(s[2] * .55, 9, 16) + 'px ' + FC, th.offT, 1); });
    men.slice().sort((a, b) => F.pos[b.k][1] - F.pos[a.k][1]).forEach((m) => { const p = F.pos[m.k], s = P(p[0], p[1]); if (!s) return; const e = clamp(s[2] * .5, 5, 19), ra = F.rings[m.k] || 0, tg = F.tags[m.k];
      if (ra > 0) { g.strokeStyle = GOLD; g.lineWidth = 3.4; g.beginPath(); g.arc(s[0], s[1], e + 10, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ra); g.stroke(); }
      if (m.rush) { g.fillStyle = th.man; g.fillRect(s[0] - e * .8, s[1] - e * .8, e * 1.6, e * 1.6); } else { g.strokeStyle = th.man; g.lineWidth = Math.max(1.8, e * .36); g.lineCap = 'round'; g.beginPath(); g.moveTo(s[0] - e, s[1] - e); g.lineTo(s[0] + e, s[1] + e); g.moveTo(s[0] + e, s[1] - e); g.lineTo(s[0] - e, s[1] + e); g.stroke(); }
      const fs = clamp(s[2] * .6, 10, 19); text(m.pos, s[0], s[1] + e + fs * .68, '700 ' + fs + 'px ' + FC, th.man, .85);
      if (tg && tg.t) text(tg.t, s[0], s[1] - e - fs * 1.15, '400 ' + clamp(s[2] * 1.05, lmin - 1, 30) + 'px ' + FM, tg.col, tg.a == null ? 1 : tg.a); });
    if (F.hit && F.hit.a > .01) { const s = P(F.hit.at[0], F.hit.at[1]); if (s) { const r = clamp(s[2] * 1.5, 16, 46); g.save(); g.globalAlpha = F.hit.a; g.strokeStyle = RUSH; g.lineWidth = 3.6; g.beginPath(); g.arc(s[0], s[1], r, -2.2, -2.2 + Math.PI * 2.1 * F.hit.a); g.stroke(); g.restore(); if (F.hit.t) text(F.hit.t, s[0] + r + 10, s[1], '400 ' + clamp(s[2] * 1.5, lmin + 4, 44) + 'px ' + FM, RUSH, F.hit.a, 'left'); } }
    F.labels.forEach((l) => { const s = P(l.x, l.y); if (s) text(l.t, s[0], s[1], '400 ' + clamp(s[2] * 1.25, lmin, 38) + 'px ' + FM, l.col, l.a); }); }

  /* ---- a field on a canvas: what it shows can be swapped while it runs. One loop draws every field on the page ---- */
  let FIELDS = [], raf = 0;
  function field(cv, o) { const g = cv.getContext('2d'), st = { i: 0, t0: performance.now(), tc: -1e9, from: null, K: 0, W: 0, H: 0, drawn: 0 }; let cur = o.cur;
    function size() { const W = cv.clientWidth, H = cv.clientHeight; if (!W || !H) return false; const r = cv.getBoundingClientRect(), k = clamp((r.width / W) * (devicePixelRatio || 1), 1, 2.5);
      if (W !== st.W || H !== st.H || Math.abs(k - st.K) > .04) { st.W = W; st.H = H; st.K = k; cv.width = Math.round(W * k); cv.height = Math.round(H * k); st.from = null; } return true; }
    const camOf = (i) => fitCam(cur.steps[i].cam, st.W, st.H);
    function cam(now) { const to = camOf(st.i); if (!st.from) return to; const u = ease(clamp((now - st.tc) / 1250, 0, 1)), c = {}; for (const k in to) c[k] = lerp(st.from[k], to[k], u); return c; }
    function draw() { const now = performance.now(); if (!size()) return; let t = (now - st.t0) / 1000; if (o.still != null || REDUCED()) t = 99;
      const s = cur.steps[st.i], F = frame(cur.men, cur.off); if (s.f) s.f(F, t); render(g, st.W, st.H, st.K, proj(t === 99 ? camOf(st.i) : cam(now), st.H, st.W * (o.px == null ? .5 : o.px), st.H * (o.py == null ? .5 : o.py)), F, cur.men, o); st.drawn = 1; }
    const api = { cv, st, o, draw, at: () => st.i, go(i) { const now = performance.now(); st.from = st.W ? cam(now) : null; st.i = clamp(i, 0, cur.steps.length - 1); st.t0 = st.tc = now; st.drawn = 0; kick(); },
      set(c, i) { const now = performance.now(), from = st.W ? cam(now) : null; cur = c; st.from = from; st.i = i || 0; st.t0 = st.tc = now; st.drawn = 0; kick(); }, kill() { FIELDS = FIELDS.filter((f) => f !== api); } };
    if (window.ResizeObserver) new ResizeObserver(() => { st.drawn = 0; kick(); }).observe(cv);   /* a field at rest is redrawn when its box changes */
    FIELDS.push(api); kick(); return api; }
  /* THE LOOP ONLY RUNS WHILE SOMETHING MOVES (the speed check, 2026-10-12): a field is busy for the seconds its step animates
     and its camera travels; after that it is drawn and left alone, and the loop stops until a step, an answer or a resize
     kicks it. An idle page costs nothing, which matters on a phone or a tablet left open beside the game. */
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  function loop() { raf = 0; FIELDS = FIELDS.filter((f) => f.cv.isConnected); if (!FIELDS.length) return; const now = performance.now(); let busy = false;
    FIELDS.forEach((f) => { const still = f.o.once || f.o.still != null || REDUCED(), moving = !still && (now - f.st.t0 < 7000 || now - f.st.tc < 1500), fresh = f.st.drawn && f.st.W === f.cv.clientWidth && f.st.H === f.cv.clientHeight;
      if (moving || !fresh) f.draw(); if (moving || !f.st.drawn) busy = true; }); if (busy) raf = requestAnimationFrame(loop); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { FIELDS.forEach((f) => { f.st.drawn = 0; }); kick(); });

  /* ---- THE SCENES: what they run for each question. Generic football, the same for any defense ---- */
  const LEAD = { rb: [[0, -7.4], [.6, -4.4], [3, -1.2], [3.6, 1.1]], fb: [[0, -4.7], [2.6, -1.6], [3.4, 1.7]], qb: [[0, -1.4], [.5, -3.8], [-.6, -5.4]] };
  const TOSS = { rb: [[0, -7.4], [4, -7.2], [9.5, -4.6], [11.6, -2.8]], fb: [[0, -4.7], [4.5, -3.8], [8.6, -1.6]], qb: [[0, -1.4], [.8, -3.4], [0, -4.6]] };
  const FLOOD = { w1: [[-17.5, -.8], [-18, 21]], w2: [[-12.8, -2.2], [-12.8, 9], [-20.5, 16.5]], w3: [[-8, -2.2], [-10, 1.6], [-21, 3.6]], x: [[16.2, -.8], [16.2, 11], [5, 12.2]], rb: [[-2.9, -6], [2, -5], [10, .8]] };
  const SCN = {
    trips: { tile: 'trips', cam: Object.assign({}, PASS, { tx: -2.5, yaw: -6 }), routes: FLOOD },
    bunch: { tile: 'bunch', cam: Object.assign({}, PASS, { tx: -2 }), routes: { b1: [[-7, -1], [-7.5, 8], [-15.5, 16]], te: [[-5, -2.2], [-4, 8], [-1.5, 18]], b2: [[-9, -2.2], [-11, 2], [-19.5, 3.6]], x: [[15, -.8], [15, 11], [5, 12.2]], rb: [[2.9, -6], [6, -4.4], [11.5, .4]] } },
    two: { tile: 'doubles', cam: PASS, routes: { sl: [[-10, -2.2], [-8, 6], [-7.5, 20]], x: [[-16.2, -.8], [-16.2, 11], [-7.5, 12.2]], te: [[5, -1.2], [6, 3], [14.5, 4.6]], z: [[16.3, -2.2], [17.2, 21]], rb: [[2.9, -6], [2.5, 0], [0, 4.4]] } },
    empty: { tile: 'empty', cam: Object.assign({}, PASS, { tx: -1.5 }), routes: { w1: [[-17.5, -2.2], [-18, 21]], h: [[-11.3, -2.2], [-11.3, 9], [-19.5, 16]], te: [[-5, -1.2], [-7, 2], [-14.5, 3.6]], sl: [[10.4, -2.2], [10.4, 6.5], [2, 9.5]], x: [[17.5, -.8], [17.5, 12.5], [16, 10.8]] } },
    iform: { tile: 'ipro', run: 1, cam: RUN, routes: LEAD },
    flood: { tile: 'trips', cam: Object.assign({}, PASS, { tx: -2.5, yaw: -6 }), routes: FLOOD, pic: ['w1', 'w2', 'w3'] },
    verts: { tile: 'doubles', cam: Object.assign({}, PASS, { tx: 0, ty: 9.5, pitch: 42 }), routes: { x: [[-16.2, -.8], [-17.5, 22]], sl: [[-10, -2.2], [-7, 6], [-6.5, 22]], te: [[5, -1.2], [6, 6], [6.5, 22]], z: [[16.3, -2.2], [17.5, 22]], rb: [[2.9, -6], [2.5, 0], [0, 4.4]] }, pic: ['x', 'sl', 'te', 'z'] },
    mesh: { tile: 'doubles', cam: Object.assign({}, PASS, { tx: 0, ty: 7 }), routes: { sl: [[-10, -2.2], [-6, 2.6], [11, 3.8]], te: [[5, -1.2], [2, 3.2], [-11, 4.6]], x: [[-16.2, -.8], [-16.2, 9], [-21, 15]], z: [[16.3, -2.2], [16.3, 10.5], [9, 11.5]], rb: [[2.9, -6], [8, -4], [14, 1], [15, 8]] }, pic: ['sl', 'te', 'x'] },
    cross: { tile: 'doubles', cam: Object.assign({}, PASS, { tx: 0 }), routes: { x: [[-16.2, -.8], [-16.2, 7], [13, 17]], z: [[16.3, -2.2], [17.5, 21]], sl: [[-10, -2.2], [-10, 4], [-16.5, 5]], te: [[5, -1.2], [5, 5.2], [3.6, 4.6]], rb: [[2.9, -6], [7, -4], [12, .4]] }, pic: ['x'] },
    corner: { tile: 'doubles', cam: Object.assign({}, PASS, { tx: -2 }), routes: { sl: [[-10, -2.2], [-10, 9], [-19.5, 17]], x: [[-16.2, -.8], [-16.2, 5.4], [-15.4, 4.4]], te: [[5, -1.2], [6, 6], [6, 18]], z: [[16.3, -2.2], [16.3, 10.5], [14.6, 9.2]], rb: [[2.9, -6], [2.5, 0], [0, 4.4]] }, pic: ['sl'] },
    inside: { tile: 'ipro', run: 1, cam: RUN, routes: LEAD, pic: ['rb'] },
    outside: { tile: 'ipro', run: 1, cam: Object.assign({}, RUN, { tx: 5.5, ty: 1.2 }), routes: TOSS, pic: ['rb'] },
    gun: { tile: 'doubles', run: 1, cam: Object.assign({}, RUN, { tx: -2, ty: 1.4, span: 34, ymin: -8.4 }), routes: { rb: [[2.9, -6], [0, -5.2], [-3.6, -2.2], [-4.6, .9]], qb: [[0, -6], [.9, -6.6]] }, pic: ['rb'] },
    /* the game situations (2026-10-12): what the offense is likely to do on that down */
    first: { tile: 'doubles', cam: PASS, routes: { sl: [[-10, -2.2], [-8, 6], [-7.5, 20]], x: [[-16.2, -.8], [-16.2, 11], [-7.5, 12.2]], te: [[5, -1.2], [6, 3], [14.5, 4.6]], z: [[16.3, -2.2], [17.2, 21]], rb: [[2.9, -6], [2.5, 0], [0, 4.4]] }, pic: ['sl', 'x', 'te', 'z'] },
    short: { tile: 'doubles', run: 1, cam: Object.assign({}, RUN, { tx: -2, ty: 1.4, span: 34, ymin: -8.4 }), routes: { rb: [[2.9, -6], [0, -5.2], [-3.6, -2.2], [-4.6, .9]], qb: [[0, -6], [.9, -6.6]] }, pic: ['rb'] },
    long: { tile: 'doubles', cam: Object.assign({}, PASS, { tx: -2 }), routes: { sl: [[-10, -2.2], [-10, 9], [-19.5, 17]], x: [[-16.2, -.8], [-16.2, 5.4], [-15.4, 4.4]], te: [[5, -1.2], [6, 6], [6, 18]], z: [[16.3, -2.2], [16.3, 10.5], [14.6, 9.2]], rb: [[2.9, -6], [2.5, 0], [0, 4.4]] }, pic: ['sl', 'te', 'z'] },
    redzone: { tile: 'doubles', goal: 10, maxy: 16, cam: Object.assign({}, PASS, { tx: 0, ty: 6, pitch: 42, span: 48 }), routes: { x: [[-16.2, -.8], [-18.5, 13]], sl: [[-10, -2.2], [-9, 2], [-4, 6.4]], te: [[5, -1.2], [4, 3], [-3, 4.6]], z: [[16.3, -2.2], [16.5, 6], [19.5, 13]], rb: [[2.9, -6], [7, -4.5], [12, .2]] }, pic: ['x', 'sl', 'te', 'z'] } };

  const STAGED = {};   /* scheme -> threat -> call -> pair */
  const LAST = {};     /* scheme|threat -> the answer he had open */
  const mir = (men) => men.map((m) => { const o = Object.assign({}, m, { x: -m.x }); if (m.from) o.from = [-m.from[0], m.from[1]]; if (m.rush) o.rush = m.rush.map((q) => [-q[0], q[1]]); if (m.zone) o.zone = [-m.zone[0], m.zone[1], m.zone[2], m.zone[3]]; return o; });
  const colOf = (c) => COL[c] || c || WHITE;
  /* QB CONTAIN, the way the game draws it (the same shape the play pages draw): straight upfield, a square corner, the arrow in at the quarterback */
  const containPath = (p, qb) => { const sg = p[0] >= qb[0] ? 1 : -1, y = Math.min(qb[1] + .8, -4.4, p[1] - .8), len = clamp(Math.abs(p[0] - qb[0]) - 1.4, .8, 2.4); return [[p[0], p[1]], [p[0], y], [p[0] - sg * len, y]]; };
  /* A RUSH ARROW MOVES WITH ITS MAN: from where he is now on to where he is going (aim), never shorter than a couple of yards,
     so there is always arrow in front of him. With no aim (before the snap) it is the game's own arrow from where he stands. */
  const lanePts = (p, rush, aim) => { const r0 = rush[0], e = rush[rush.length - 1]; if (!aim) return rush.map((q) => [q[0] - r0[0] + p[0], q[1] - r0[1] + p[1]]);
    let dx = aim[0] - p[0], dy = aim[1] - p[1], L = Math.hypot(dx, dy); if (L < 1.7) { if (L < .08) { dx = e[0] - r0[0]; dy = e[1] - r0[1]; L = Math.hypot(dx, dy) || 1; } dx *= 1.7 / L; dy *= 1.7 / L; } return [[p[0], p[1]], [p[0] + dx, p[1] + dy]]; };
  const laneTip = (a, rush) => { const r0 = rush[0], e = rush[rush.length - 1]; return [e[0] - r0[0] + a[0], e[1] - r0[1] + a[1]]; };
  /* where a blocked rusher's arrow ends: the same way the game drew it, from where he is now (p), shorter by how far he has come from where he lined up (a) */
  const laneOn = (a, p, rush) => { const r0 = rush[0], e = rush[rush.length - 1], dx = e[0] - r0[0], dy = e[1] - r0[1], L = Math.hypot(dx, dy) || 1, len = Math.max(2.3, L - .5 * Math.hypot(p[0] - a[0], p[1] - a[1])); return [p[0] + dx / L * len, p[1] + dy / L * len]; };
  /* the contain men: the outside man of the line on each side, when he is rushing */
  const edgesOf = (men, start) => { const front = men.filter((m) => /^(DE|DT|NT|LE|RE|DL)$/.test(m.pos || '')), out = []; [-1, 1].forEach((sg) => { let best = null; front.forEach((m) => { const x = start[m.k][0] * sg; if (x > .6 && (!best || x > start[best.k][0] * sg)) best = m; }); if (best && best.rush) out.push(best.k); }); return out; };

  /* the snap: the offense runs it, and every one of ours does his job against it */
  function play(F, men, S, P, R, u, start, auto) { const uo = P.free && !S.run ? Math.min(u, (P.home || .8) + .04) : u;
    F.off.forEach((o) => { const r = R[o.id]; if (r) { const a = along(r, uo); o.x = a[0]; o.y = a[1]; } else if (isOL(o)) o.y += (S.run ? .7 : -.9) * Math.min(1, u * 2); });
    const q = F.off.find((o) => o.id === 'qb'); if (!S.run) q.y = -6 - 2.2 * Math.min(1, u * 1.6); F.qb = [q.x, q.y];
    if (S.run) { const rb = F.off.find((o) => o.id === 'rb'); if (rb && u > .22) rb.ball = 1; else q.ball = 1; }
    men.forEach((m) => { const k = m.k, a = start[k], ft = (P.fit || {})[k] || auto.fit[k]; let c = (P.cover || {})[k]; if (c == null) c = auto.cover[k];
      if (ft) { F.pos[k] = Array.isArray(ft[0]) ? along([a].concat(ft), u) : L2(a, ft, ease(Math.min(1, u * 1.12))); if (m.rush) F.lanes[k] = 1 - u; return; }
      if (m.rush) { const sg = a[0] >= 0 ? 1 : -1, tip = laneTip(a, m.rush); F.aim[k] = tip;   /* his arrow goes with him and keeps pointing where he was sent */
        if ((P.free || []).includes(k)) { const full = [a].concat((P.paths || {})[k] || [[a[0] - .9 * sg, -1.6], [a[0] * .5, -4.4]]).concat([[F.qb[0] + .7 * sg, F.qb[1] + .5]]), uh = Math.min(1, u / (P.home || .8));
          F.aim[k] = L2(tip, along(full, Math.min(1, uh + .16)), clamp(uh * 6, 0, 1)); F.lanes[k] = 1 - clamp((uh - .72) / .28, 0, 1); }   /* the man coming free points down his own path, and loses the arrow as he gets home */
        if ((P.free || []).includes(k)) F.pos[k] = along([a].concat((P.paths || {})[k] || [[a[0] - .9 * sg, -1.6], [a[0] * .5, -4.4]]).concat([[F.qb[0] + .7 * sg, F.qb[1] + .5]]), Math.min(1, u / (P.home || .8)));
        else F.pos[k] = (P.paths || {})[k] ? along([a].concat(P.paths[k]), Math.min(1, u * 1.5)) : F.cont[k] > .5 ? L2(a, [a[0], -2], Math.min(1, u * 1.6)) : L2(a, [a[0] * .84, -1.25], Math.min(1, u * 1.6)); if (!(P.free || []).includes(k)) F.aim[k] = laneOn(a, F.pos[k], m.rush); return; }
      if (typeof c === 'string') { const o = F.off.find((x) => x.id === c); if (o) { const top = (m.zone && m.zone[1] >= 17) || a[1] >= 12, of = (P.offs || {})[k] || (top ? [0, 1.7] : [o.x < 0 ? .9 : -.9, -1]), cy = (P.cap || {})[k];
          const drop = m.zone ? L2(a, [m.zone[0], Math.min(m.zone[1], 20)], Math.min(1, u * 2) * .45) : a; F.pos[k] = L2(drop, [o.x + of[0], cy == null ? o.y + of[1] : Math.min(o.y + of[1], cy)], ease(clamp((u - .1) / .5, 0, 1))); return; } }
      if (Array.isArray(c)) { F.pos[k] = L2(a, c, ease(Math.min(1, u * 1.25))); return; }
      if (m.zone) F.pos[k] = L2(a, [m.zone[0], Math.min(m.zone[1], 20.4)], u * .9); });
    F.lead = 1 - Math.min(1, u * 2.5); }

  /* what a pair leaves out: a man defender takes the nearest free receiver, a zone defender the route that ends in his
     zone, and against a run everybody but the deep zones fits the ball */
  function autoOf(men, S, P, R, off, start) { const cover = {}, fit = {}, rec = off.filter((o) => !isOL(o) && o.id !== 'qb'), taken = new Set(Object.values(P.cover || {}).filter((v) => typeof v === 'string'));
    if (S.run) { const rb = R.rb || [[0, 0]], end = rb[rb.length - 1];
      men.forEach((m) => { const k = m.k, a = start[k]; if ((P.fit || {})[k] || (P.cover || {})[k]) return; const dx = a[0] - end[0];
        if (m.zone && m.zone[1] >= 17 && a[1] >= 10) fit[k] = [lerp(a[0], end[0], .4), Math.max(end[1] + 5.5, a[1] * .55)];
        else if (a[1] < 2.3) fit[k] = [a[0] - dx * .14, a[1] < 1.9 ? -.25 : .4];
        else fit[k] = [end[0] + dx * .32, end[1] + .9 + Math.min(3.2, Math.abs(dx) * .13)]; }); return { cover, fit }; }
    men.filter((m) => m.man != null && !(P.cover || {})[m.k] && !m.zone && !m.rush).sort((a, b) => start[a.k][1] - start[b.k][1]).forEach((m) => { let best = null, bd = 1e9; rec.forEach((o) => { if (taken.has(o.id)) return; const d = Math.hypot(o.x - start[m.k][0], (o.y - start[m.k][1]) * .35); if (d < bd) { bd = d; best = o; } }); if (best) { cover[m.k] = best.id; taken.add(best.id); } });
    men.forEach((m) => { if (!m.zone || (P.cover || {})[m.k] != null) return; const z = m.zone, deep = z[1] >= 17; let best = null, bd = 1e9;
      rec.forEach((o) => { const r = R[o.id]; if (!r) return; const e = along(r, .82), dx = (e[0] - z[0]) / (z[2] * 1.35), dy = (e[1] - z[1]) / (deep ? 7 : z[3] * 2.2), dd = dx * dx + dy * dy; if (dd < 1 && dd < bd) { bd = dd; best = o; } }); if (best) cover[m.k] = best.id; });
    return { cover, fit }; }

  function build(cfg, th, ai) { const S0 = SCN[th], T = cfg.stop.threats.find((t) => t.id === th), A = T.answers[ai], P = (((STAGED[cfg.scheme] || {})[th]) || {})[A.call] || {}, S = P.run != null ? Object.assign({}, S0, { run: P.run }) : S0, off = TILES[S.tile], R = Object.assign({}, S.routes, P.routes || {});   /* a pair may be a pass against a run scene, or the other way round */
    let men = (cfg.men[A.call] || []).map((m) => Object.assign({}, m)); for (const k in (P.zone || {})) { const m = men.find((x) => x.k === k), z = P.zone[k]; if (m) { delete m.rush; delete m.man; m.zone = z.slice(0, 4); m.zj = z[4] || ''; m.zk = z[5] || ''; } }
    if (S.maxy) men.forEach((m) => { if (m.zone && m.zone[1] > S.maxy) m.zone = [m.zone[0], S.maxy, m.zone[2], m.zone[3]]; });   /* the red zone: nobody drops past the back of the end zone */
    (P.blitz || []).forEach((k) => { const m = men.find((x) => x.k === k); if (m) { delete m.zone; delete m.man; m.rush = [[m.x, m.y], [m.x + (m.x > 0 ? -1.1 : 1.1), m.y - 3]]; } });
    const was = men; if (P.flip || P.mirror) men = mir(men);
    const start = {}; men.forEach((m) => { start[m.k] = (P.walk || {})[m.k] || [m.x, m.y]; }); const auto = autoOf(men, S, P, R, off, start), still = cfg.still != null;
    const user = P.user, tags = P.tags || {}, cont = /\bQB contain\b/i.test(A.do || '') ? edgesOf(men, start) : [];
    const goal = (F) => { if (S.goal != null) { F.lines.push({ pts: [[-26.67, S.goal], [26.67, S.goal]], col: GOLD, w: 4, a: .9 }); F.labels.push({ t: 'GOAL LINE', x: -20.5, y: S.goal + 1.5, col: GOLD, a: 1 }); } };
    const look = { cam: LOOK, f: (F, t) => { goal(F); const za = P.flip ? E(t, 2.1, 2.7) : E(t, .1, .8), u = E(t, .9, 2.1); for (const k in F.zones) F.zones[k] = za; F.lead = za;
        if (P.flip) { was.forEach((m) => { F.pos[m.k] = L2([m.x, m.y], [-m.x, m.y], u); }); for (const k in F.lanes) F.lanes[k] = za; }
        else men.forEach((m) => { if (m.from && !(P.walk || {})[m.k]) { F.pos[m.k] = L2(m.from, [m.x, m.y], u); if (Math.hypot(m.from[0] - m.x, m.from[1] - m.y) > 2) F.lines.push({ pts: [m.from, F.pos[m.k]], col: WHITE, dash: [5, 6], w: 2, a: .7 }); } });
        for (const k in (P.walk || {})) { const m = men.find((x) => x.k === k); if (!m) continue; const a = [m.x, m.y]; F.pos[k] = L2(a, P.walk[k], u); F.lines.push({ pts: [a, F.pos[k]], col: WHITE, dash: [5, 6], w: 2, a: .7 }); }
        cont.forEach((k) => { F.cont[k] = P.flip ? E(t, 2.5, 3.3) : E(t, 1.3, 2.2); });
        if (user) { F.rings[user] = E(t, 2.3, 2.8); F.tags[user] = { t: 'USER', col: GOLD, a: E(t, 2.3, 2.8) }; } } };
    const snap = { cam: P.cam || S.cam, f: (F, t) => { goal(F); for (const k in start) F.pos[k] = start[k].slice(); cont.forEach((k) => { F.cont[k] = 1; }); const u = E(t, 1.3, 4.7), pr = E(t, .2, 1.1);
        for (const k in F.zones) F.zones[k] = .5; for (const id in R) if (id !== 'qb') F.lines.push({ pts: R[id], col: WHITE, w: 2.4, a: .7, prog: pr, tip: 1 });
        if (user) F.tags[user] = { t: 'USER', col: GOLD };
        play(F, men, S, P, R, u, start, auto); let n = 0; for (const k in tags) { const t0 = 2 + n * .55; F.tags[k] = { t: (k === user ? 'USER: ' : '') + tags[k][0], col: colOf(tags[k][1]), a: E(t, t0, t0 + .3) }; if (k === user && t < t0) F.tags[k] = { t: 'USER', col: GOLD }; if ((P.free || []).includes(k) && !S.run) { const th = 1.3 + 3.4 * (P.home || .8); F.tags[k].a *= 1 - E(t, th - .5, th - .1); } n++; }
        (P.labs || []).forEach(([s, x, y, col, t0]) => { const a = E(t, t0, t0 + .3); if (a > .01) F.labels.push({ t: s, x, y, col: colOf(col), a }); });
        if (P.end) { const t0 = 1.3 + 3.4 * (P.free && !S.run ? (P.home || .8) : .98); if (t > t0) F.hit = { at: P.end[1] || F.qb, a: E(t, t0, t0 + .3), t: P.end[0] }; } } };
    return { men, off, steps: [look, snap], P, A, T, still }; }

  /* ---- THE RAIL ---- */
  const GROUPS = (stop) => { const g = []; stop.threats.forEach((t) => { if (!g.includes(t.group)) g.push(t.group); }); return g; };
  let cur = null, timer = 0;
  function unmount() { if (cur) { cur.fld.kill(); cur = null; } clearInterval(timer); timer = 0; }
  function mount(host, cfg) { unmount(); const T = cfg.stop.threats.find((t) => t.id === cfg.th); if (!T || !SCN[T.id]) return false;
    const key = cfg.scheme + '|' + T.id, me = { host, cfg, T, a: clamp(LAST[key] || 0, 0, T.answers.length - 1), i: 0, last: performance.now(), fld: null, key };
    if (cfg.ans != null) me.a = clamp(cfg.ans, 0, T.answers.length - 1);
    WALLAT = Math.max(0, GROUPS(cfg.stop).indexOf(T.group)); host.dataset.on = T.id; host.innerHTML = `<div class="sbrail"><a class="sball" href="#stop">&lsaquo; All questions</a>${GROUPS(cfg.stop).map((g) => `<span class="sbgh">${esc(g)}</span>${cfg.stop.threats.filter((t) => t.group === g).map((t) => `<a class="sbq${t.id === T.id ? ' on' : ''}" href="#stop/${esc(t.id)}" data-sbth="${esc(t.id)}">${esc(t.name)}</a>`).join('')}`).join('')}</div>
      <div class="sbfield"><canvas></canvas><div class="sbcap"></div>${T.avoid ? `<div class="sbavoid">${esc(T.avoid)}</div>` : ''}<div class="sbctl"><button type="button" data-sbstep="0">The look</button><button type="button" data-sbstep="1">The snap</button><button type="button" class="rp" data-sbstep="replay">&#8635; Replay</button></div></div><div class="sbans"></div>`;
    me.fld = field(host.querySelector('canvas'), { cur: build(cfg, T.id, me.a), still: cfg.still });
    const ui = () => { const a = T.answers[me.a], P = (((STAGED[cfg.scheme] || {})[T.id]) || {})[a.call] || {};
      host.querySelector('.sbans').innerHTML = `<div class="k team">Our answers</div>${T.answers.map((x, j) => (j === me.a ? `<div class="sbcard on" style="--kc:${KC[x.kind] || WHITE}"><span class="sbkd">${j + 1} &middot; ${esc(x.kind)} &middot; ${esc(x.front)}</span><b>${esc(x.name)}</b><p>${esc(x.why)}</p><span class="sbdo"><b>Set it up</b>${esc(x.do)}</span><a class="btn sm" href="#play/${esc(x.call)}">Open the call &rsaquo;</a></div>`
        : `<button type="button" class="sbcard" data-sbans="${j}" style="--kc:${KC[x.kind] || WHITE}"><span class="sbkd">${j + 1} &middot; ${esc(x.kind)} &middot; ${esc(x.front)}</span><b>${esc(x.name)}</b></button>`)).join('')}`;
      const cap = host.querySelector('.sbcap'); cap.innerHTML = `<b>The look</b>${esc(P.look || a.do)}`; cap.style.display = me.i ? 'none' : '';
      host.querySelectorAll('[data-sbstep]').forEach((b) => b.classList.toggle('on', b.dataset.sbstep === String(me.i))); fitCols(host); };
    me.ui = ui; me.step = (i) => { me.i = i; me.last = performance.now(); me.fld.go(i); ui(); };
    me.ans = (j) => { me.a = ((j % T.answers.length) + T.answers.length) % T.answers.length; LAST[key] = me.a; me.i = 0; me.last = performance.now(); me.fld.set(build(cfg, T.id, me.a), 0); ui(); };
    host.onclick = (e) => { const an = e.target.closest('[data-sbans]'), sp = e.target.closest('[data-sbstep]'), q = e.target.closest('[data-sbth]');
      if (q && cfg.nav) { e.preventDefault(); cfg.nav(q.dataset.sbth); return; } if (an) { me.ans(+an.dataset.sbans); return; }
      if (sp) { me.step(sp.dataset.sbstep === 'replay' ? 0 : +sp.dataset.sbstep); return; } if (e.target.closest('canvas')) api.key(1); };
    cur = me; ui(); if (cfg.still != null) { me.i = clamp(cfg.still, 0, 1); me.fld.go(me.i); ui(); }
    else timer = setInterval(() => { if (!cur || !cur.host.isConnected) { unmount(); return; } if (cur.i === 0 && performance.now() - cur.last > 3600 && !document.querySelector('.modal')) cur.step(1); }, 300);
    return true; }
  /* the rail and the answers never run past the board: each is scaled down until it fits (a short, wide window) */
  function fitCols(host) { host.querySelectorAll('.sbrail,.sbans').forEach((c) => { c.style.zoom = ''; const av = host.clientHeight - 8, h = c.scrollHeight; if (h > av && av > 80) c.style.zoom = Math.max(.56, av / h).toFixed(3); }); }

  /* ---- THE WALL (his pick 2026-10-12): one group of questions big in the middle, the groups either side blurred behind it,
     arrows (and the left and right keys) to bring the next one round. A card opens its question. It remembers the group, and
     coming back from a question it opens on that question's group ---- */
  let WALLAT = 0, wallHost = null;
  function wall(host, cfg) { unmount(); host.dataset.on = 'wall'; wallHost = host; const stop = cfg.stop, G = GROUPS(stop), n = G.length; if (cfg.group != null) WALLAT = cfg.group; WALLAT = clamp(WALLAT, 0, n - 1);
    host.innerHTML = G.map((g, i) => { const l = stop.threats.filter((t) => t.group === g); return `<div class="sbspot" data-i="${i}"><h3>${esc(g)}<small>${l.length} questions</small></h3><div class="sbcards${l.length === 2 || l.length === 4 ? ' two' : ''}" style="--rows:${l.length > 3 ? 2 : 1}">${l.map((t) => `<a class="sbtile" href="#stop/${esc(t.id)}"><span class="sbpic"><canvas data-sbpic="${esc(t.id)}"></canvas></span><b>${esc(t.name)}</b><small>${t.answers.length} answers &rsaquo;</small></a>`).join('')}</div></div>`; }).join('') +
      '<button type="button" class="sbarr l" data-sbd="-1" aria-label="The group before">&lsaquo;</button><button type="button" class="sbarr r" data-sbd="1" aria-label="The next group">&rsaquo;</button><div class="sbpg"></div>';
    const put = () => { host.querySelectorAll('.sbspot').forEach((p) => { const k = ((+p.dataset.i - WALLAT) % n + n) % n; p.className = 'sbspot' + (k === 0 ? '' : k === 1 ? ' off r' : k === n - 1 ? ' off l' : ' off rr'); });
      host.querySelector('.sbpg').innerHTML = G.map((g, i) => `<button type="button" class="${i === WALLAT ? 'on' : ''}" data-sbg="${i}">${esc(g)}</button>`).join(''); };
    host._turn = (k) => { WALLAT = ((WALLAT + k) % n + n) % n; put(); };
    host.onclick = (ev) => { const a = ev.target.closest('[data-sbd]'), g = ev.target.closest('[data-sbg]'); if (a) host._turn(+a.dataset.sbd); else if (g) { WALLAT = +g.dataset.sbg; put(); } };
    put();
    host.querySelectorAll('canvas[data-sbpic]').forEach((cv) => { const S = SCN[cv.dataset.sbpic]; if (!S) return; const T = stop.threats.find((t) => t.id === cv.dataset.sbpic), ids = /formation/i.test(T.group) ? [] : (S.pic || Object.keys(S.routes).filter((k) => k !== 'qb'));
      field(cv, { once: 1, bare: 1, cur: { men: [], off: TILES[S.tile], steps: [{ cam: { tx: 0, ty: 6, pitch: 90, yaw: 0, span: 47, vspan: 29 }, f: (F) => { ids.forEach((id) => { if (S.routes[id]) F.lines.push({ pts: S.routes[id], col: GREEN, w: 3, tip: 1 }); }); } }] } }); }); return true; }

  const api = { stage(scheme, map) { const s = STAGED[scheme] || (STAGED[scheme] = {}); for (const th in map) s[th] = Object.assign(s[th] || {}, map[th]); }, has: (th) => !!SCN[th], mount, wall, unmount,
    adopt: (host) => !!(host && host.dataset.on && host.firstChild && (host.dataset.on === 'wall' || (cur && cur.host === host))),
    /* the keys: 1 = the next beat (the look, the snap, then the next answer), -1 = back, 'up' / 'down' = the question before or after */
    key(d) { if (!cur) { if (wallHost && wallHost.isConnected && wallHost._turn && (d === 1 || d === -1)) { wallHost._turn(d); return true; } return false; } const T = cur.T, list = cur.cfg.stop.threats, n = list.findIndex((t) => t.id === T.id);
      if (d === 'up' || d === 'down') { const nx = list[(n + (d === 'down' ? 1 : -1) + list.length) % list.length]; if (cur.cfg.nav) cur.cfg.nav(nx.id); return true; }
      if (d > 0) { if (cur.i === 0) cur.step(1); else cur.ans(cur.a + 1); } else { if (cur.i === 1) cur.step(0); else cur.ans(cur.a - 1); } return true; },
    /* every pair's snap on one sheet, for checking (scheme.html?...&stopgrid=1) */
    grid(host, cfg, from, to) { unmount(); const list = []; cfg.stop.threats.forEach((t) => t.answers.forEach((a, j) => list.push([t, j, a]))); host.innerHTML = list.slice(from || 0, to || 99).map(([t, j, a], n) => `<div class="sbg"><canvas data-g="${n}"></canvas><span>${esc(t.name)} &middot; ${j + 1} ${esc(a.name)}</span></div>`).join('');
      host.querySelectorAll('canvas').forEach((cv) => { const [t, j] = list.slice(from || 0, to || 99)[+cv.dataset.g]; const f = field(cv, { cur: build(Object.assign({}, cfg, { still: 1 }), t.id, j), still: 1, lmin: 13 }); f.go(1); }); } };
  window.skStop = api;
})();
