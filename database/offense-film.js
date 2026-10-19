/* offense-film.js: THE FILM BOARD FOR AN OFFENSE (2026-10-18, the Ole Miss Veer N Shoot first).
   The Seahawks board acts out a defense's call (live-play.js). This is the same board for an offense: our eleven in the team's
   colours run the call out of the game's own card, against a placeholder defense in white. The defense is the College Football
   4-2-5 nickel with a four man front, in the coverage the read is about (the shells and the movement come from intro-field.js:
   skIntroField.prepScene / simulate, the same simulation the Tennessee principles run on), lined up on our formation.

   THE DRAWING IS THE DATABASE CARD'S (his note 2026-10-18: "look at how we're actually drawing our routes in our playbook
   database"): routes in the game's yellow, the first read in red, motion in cyan, option branches dashed, white block marks
   (a stem and a bar, long on a run block, short on a pass set, a puller's path to it), the quarterback's carry in red, and the
   controller icons on the receivers before the snap.

   THE CAMERA MOVES (his note 2026-10-18: "we can do zooms, we can move the camera around... pause partway through and say this
   is where they bite down and zoom in on that... turn the camera"). Every step is shot, not parked:
     before the snap   the formation, framed to what the step is about (the read, the ringed defender, the words)
     after the snap    it follows the ball
     THE MOMENT        the play FREEZES (a hold, 1.5 s) and the camera swings in low and turned on the read: the ringed
                       defender, our lit player and the ball, with his words on the grass. Then it plays on and follows the catch.
   The moment is found from the scene (the throw, the handoff, the keep); a scene can name it (moment, in seconds) or switch it
   off (hold: 0), and can frame the hold itself (focus: [x0, y0, x1, y1]) or the pre-snap shot (cam: [x0, y0, x1, y1]).

   STAGING lives in the scheme's own file (SC.live, e.g. live/olemiss.js):
     skOffFilm.stage('olemiss', 'play-id', { cov: 'c3', keys: [scene, ...], adj: [scene, ...], run: scene })
   A SCENE is an intro-field scene (cov, snap, end, throws [{man, at}], hand, run, fake, branch, def, move, drop; times in seconds
   from the start of the step, the snap at 1) plus: lit (our players to light), ring (their players by shell name), zones ('all' |
   shell names), words [{t, x, y, at}], tags / dtags, pre (hold before the snap, nothing moves), and the camera keys above.

   It answers to the same calls as the defensive board: the page talks to window.skLive, and this file wraps skLive so a call
   staged here is mounted here and every other call still goes to live-play.js. */
(function () {
  'use strict';
  if (!window.skLive) return;
  const REG = {};
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), lerp = (a, b, t) => a + (b - a) * t, ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const plen = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  function cutPath(pts, f) { let left = plen(pts) * clamp(f, 0, 1); const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], L = Math.hypot(q[0] - p[0], q[1] - p[1]); if (left <= L) { out.push([lerp(p[0], q[0], L ? left / L : 0), lerp(p[1], q[1], L ? left / L : 0)]); return out; } out.push(q); left -= L; } return out; }
  /* the database card's colours, lifted a touch for the green grass */
  const YEL = '#E4DA55', RED = '#E5473B', CYAN = '#5FD0F5', GOLD = '#F3B222', WHITE = '#F4F2EC', GRASS = '#173D1B', STRIPE = '#1C4720';
  const ZC = { deep: ['rgba(43,58,190,.5)', '#8EA0FF'], hook: ['rgba(206,206,70,.45)', '#F2F27E'], curl: ['rgba(120,84,190,.5)', '#B79BF0'], flat: ['rgba(52,160,160,.5)', '#7FE6E6'], quarter: ['rgba(160,118,200,.5)', '#DDB8F5'] };
  const zkey = (lb) => /deep|half|third/i.test(lb) && !/flat/i.test(lb) ? 'deep' : /quarter/i.test(lb) ? 'quarter' : /flat/i.test(lb) ? 'flat' : /curl/i.test(lb) && !/hook/i.test(lb) ? 'curl' : 'hook';
  const ICONS = ['square', 'triangle', 'cross', 'r1', 'circle'];
  /* a name for each of their men, from the shell's job and where he stands */
  /* the nickel's names by its place in the shell (intro-field.js SHELLS order): the four down, the two backers, the nickel, the corners, the safeties */
  const POSN = ['DE', 'DT', 'DT', 'DE', 'LB', 'LB', 'NB', 'CB', 'S', 'S', 'CB'], POS0 = ['DE', 'DT', 'DT', 'DE', 'NB', 'LB', 'LB', 'CB', 'S', 'S', 'CB'];
  const defName = (d, k, cov) => (cov === 'c0' ? POS0 : POSN)[k] || defPos(d);
  function defPos(d) { const ax = Math.abs(d.x);
    if (d.rush) return d.y < 3.2 ? (ax >= 4 ? 'DE' : 'DT') : 'LB';
    if (d.zone && d.zone[1] >= 15) return ax >= 12 ? 'CB' : 'S';
    if (d.y >= 9) return 'S';
    if (ax >= 15) return 'CB'; if (ax >= 7.5) return 'NB'; return 'LB'; }

  const isLit = (lit, m) => lit.has(m.k) || (lit.has('pull') && !!m.pull);
  const nameOf = (shell) => { const seen = {}; return shell.map((d) => { seen[d.lb] = (seen[d.lb] || 0) + 1; return d.lb + '#' + seen[d.lb]; }); };
  let cur = null;
  const REDUCED = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  /* ---- one step, simulated once ---- */
  function stepScene(spec, i, nR, nA) {
    const cov = spec.cov || 'c3';
    if (i === 0) return Object.assign({ cov, pre: 1, label: 'call' }, spec.call || {});
    if (i <= nR) return Object.assign({ cov }, (spec.keys || [])[i - 1] || { pre: 1 }, { label: 'key' });
    if (i <= nR + nA) return Object.assign({ cov, pre: 1 }, (spec.adj || [])[i - nR - 1] || {}, { label: 'adj' });
    return Object.assign({ cov }, spec.run || (spec.keys || [])[0] || { pre: 1 }, { label: 'run' }); }
  /* the nickel lines up on OUR formation (his note: "use our actual playbook database so we know where everyone should
     actually be"): each corner over the widest receiver on his side, the nickel and the overhang over the slot */
  function alignDef(cov, p) { if (!skIntroField.shellOf) return [];
    const base = skIntroField.shellOf({ cov, def: [] }), out = [];
    const xs = p.men.filter((m) => m.role === 'skill' && m.y > -4 || (m.role === 'blk' && m.y > -2.6 && Math.abs(m.x) > 3.6)).map((m) => (m.mot ? m.mot[m.mot.length - 1][0] : m.x));
    const L = xs.filter((x) => x < 0).sort((a, b) => a - b), Rr = xs.filter((x) => x > 0).sort((a, b) => b - a);
    for (const d of base) { if (d.rush && d.y < 3) continue; const side = d.x < 0 ? -1 : 1, row = side < 0 ? L : Rr, ax = Math.abs(d.x);
      if (ax >= 15 && row[0] != null) out.push({ who: d.lb, x: Math.round((row[0] - side * .8) * 10) / 10 });
      else if (ax >= 7.5 && ax < 10 && d.y < 6 && row.length >= 2) out.push({ who: d.lb, x: Math.round((row[row.length - 1] + side * .6) * 10) / 10 }); }
    /* zones that belong to a corner travel with him */
    return out; }   /* the zones themselves come from the hash shell (the field's thirds, halves and quarters) */
  /* THE HASH. The card is drawn with the ball in the middle; on the field the ball sits on the hash away from the wide side.
     x stays put inside the tackles' reach (4 yards); beyond it each side is stretched or squeezed so the widest split keeps
     its distance from its own sideline. FX is where the middle of the field is, from the ball. */
  const HASH = 6.67, REACH = 4;
  function hashOf(spec, p) { let wide = spec.wide; if (!wide) { let r = 0, l = 0; p.men.forEach((m) => { if (m.role === 'ol' || m.role === 'qb' || m.y < -4) return; if (m.x > REACH) r++; else if (m.x < -REACH) l++; }); wide = l > r ? 'L' : 'R'; }
    const ws = wide === 'L' ? -1 : 1, kOf = (S) => (S - 3.67 - REACH) / (26.67 - 3.67 - REACH), kf = kOf(26.67 + HASH), kb = kOf(26.67 - HASH);
    const k = (x) => (Math.abs(x) <= REACH ? 1 : Math.sign(x) === ws ? kf : kb), f = (x) => (Math.abs(x) <= REACH ? x : Math.sign(x) * (REACH + (Math.abs(x) - REACH) * k(x)));
    return { wide, FX: ws * HASH, f, k }; }
  const mapPts = (H, pts) => (pts ? pts.map((q) => [H.f(q[0]), q[1]]) : pts);
  function hashPlay(H, p) { return Object.assign({}, p, { men: p.men.map((m) => { const o = Object.assign({}, m, { x: H.f(m.x) }); ['r', 'mot', 'rel'].forEach((k) => { if (m[k]) o[k] = mapPts(H, m[k]); }); if (m.alts) o.alts = m.alts.map((a) => mapPts(H, a)); if (m.tip) o.tip = [H.f(m.tip[0]), m.tip[1]]; return o; }) }); }
  const hashZone = (H, z) => (z ? [H.f(z[0]), z[1], z[2] * H.k(z[0]), z[3]] : z);
  function hashScene(H, sc) { const o = Object.assign({}, sc);
    if (sc.def) o.def = sc.def.map((d) => { const e = Object.assign({}, d); if (d.x != null) e.x = H.f(d.x); if (d.zone) e.zone = hashZone(H, d.zone); return e; });
    if (sc.run && sc.run.path) o.run = Object.assign({}, sc.run, { path: mapPts(H, sc.run.path) });
    if (sc.reroute) { o.reroute = {}; Object.keys(sc.reroute).forEach((k) => { o.reroute[k] = mapPts(H, sc.reroute[k]); }); }
    if (sc.move) { o.move = {}; Object.keys(sc.move).forEach((k) => { o.move[k] = mapPts(H, sc.move[k]); }); }
    if (sc.words) o.words = sc.words.map((w) => Object.assign({}, w, { x: H.f(w.x) }));
    ['cam', 'focus'].forEach((k) => { if (sc[k]) o[k] = [H.f(sc[k][0]), sc[k][1], H.f(sc[k][2]), sc[k][3]]; });
    return o; }
  /* the shell on the real field: the deep players split the field from its middle, everyone else moves with the formation */
  function hashShell(H, cov) { const base = skIntroField.shellOf({ cov, def: [] }), seen = {}, out = [];
    for (const d of base) { seen[d.lb] = (seen[d.lb] || 0) + 1; const who = d.lb + '#' + seen[d.lb];
      if (d.zone && d.zone[1] >= 15) { const corner = Math.abs(d.x) >= 15; out.push({ who, x: corner ? H.f(d.x) : H.FX + (Math.abs(d.zone[0]) < 2 ? 0 : d.x), zone: [H.FX + d.zone[0], d.zone[1], d.zone[2], d.zone[3]] }); }
      else out.push(Object.assign({ who, x: H.f(d.x) }, d.zone ? { zone: hashZone(H, d.zone) } : {})); }
    return out; }
  function simulateStep(sc, p, BLK, spec0) {
    const H = hashOf(spec0 || (cur && cur.spec) || {}, p); p = hashPlay(H, p); sc = Object.assign(hashScene(H, sc), { label: sc.label, pre: sc.pre });
    if (sc.reroute) p = Object.assign({}, p, { men: p.men.map((m) => (sc.reroute[m.k] ? Object.assign({}, m, { r: sc.reroute[m.k], alts: undefined, tip: undefined, opt: undefined }) : m)) });   /* one step's own route for a man */
    const clean = { cov: sc.cov, snap: sc.snap == null ? 1 : sc.snap, end: sc.end == null ? 5.4 : sc.end, def: hashShell(H, sc.cov).concat(alignDef(sc.cov, p), sc.def || []), throws: sc.throws || [], hand: sc.hand, run: sc.run, fake: sc.fake, branch: sc.branch, move: sc.move, drop: sc.drop, beats: [], cam: [] };
    if (sc.pre) { clean.snap = 1; clean.end = 1.05; }
    let R, sim; try { R = skIntroField.prepScene(clean, p); sim = skIntroField.simulate(R, p, BLK); } catch (e) { console.error('offense film: the simulation failed', e); return null; }
    const shift = R.shift || 0, s0 = clean.snap, sh = (t) => (t == null ? t : t >= s0 ? t + shift : t);
    /* THE MOMENT: when the play stops for the read */
    let moment = null;
    if (!sc.pre && sc.hold !== 0) {
      if (sc.moment != null) moment = sh(sc.moment);
      else if (R.throws && R.throws.length) moment = R.throws[0].at - .12;
      else if (R.hand) moment = R.hand.at + .5;
      else if (R.run) moment = R.snap + .85;
      else if ((sc.def || []).length) moment = R.snap + .9; }
    const hold = moment == null ? 0 : sc.hold != null ? sc.hold : sc.label === 'run' ? 1 : 1.6;
    return { p, H, scH: sc, R, sim, shell: sim.shell || skIntroField.shellOf(R), snap: R.snap, end: R.end, moment, hold, sh }; }

  /* ---- the view: a pitch and a yaw fitted to a patch of field ---- */
  function makeView(cv, opt) {
    const g = cv.getContext('2d'); let W = 0, H = 0, R = 1, P = () => null;
    const cs = getComputedStyle(cv), fnt = (v, d) => (cs.getPropertyValue(v) || d).trim() || d;
    const FC = fnt('--fc', "'Barlow Condensed', sans-serif"), FM = fnt('--fm', "'Permanent Marker', cursive");
    function size() { const r = cv.getBoundingClientRect(); if (r.width < 4 || r.height < 4) return false; W = cv.clientWidth || r.width; H = cv.clientHeight || r.height; R = clamp(Math.min(devicePixelRatio || 1, 2) * (r.width / W || 1), 1, 3); cv.width = Math.round(W * R); cv.height = Math.round(H * R); return true; }
    function aim(c) { const th = c.pitch * Math.PI / 180, ps = c.yaw * Math.PI / 180, ct = Math.cos(th), sn = Math.sin(th), sp = Math.sin(ps), cp = Math.cos(ps);
      const f = [sp * ct, cp * ct, -sn], r = [cp, -sp, 0], u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]], v = c.view, tx = (v[0] + v[2]) / 2, ty = (v[1] + v[3]) / 2, FL = (H / 2) / Math.tan(17 * Math.PI / 180);
      const x0 = W * (opt.left || 0), y1 = H - Math.max(14, H * .07), pad = Math.min(14, W * .02), px = (x0 + W) / 2, cor = [[v[0], v[1]], [v[2], v[1]], [v[0], v[3]], [v[2], v[3]]];
      const mk = (d, py) => { const C = [tx - f[0] * d, ty - f[1] * d, -f[2] * d]; return (x, y, z) => { const p = [x - C[0], y - C[1], (z || 0) - C[2]], zz = p[0] * f[0] + p[1] * f[1] + p[2] * f[2]; if (zz < .7) return null; const k = FL / zz; return [px + k * (p[0] * r[0] + p[1] * r[1] + p[2] * r[2]), py - k * (p[0] * u[0] + p[1] * u[1] + p[2] * u[2]), k]; }; };
      let py = y1 / 2, best = 60;
      for (let pass = 0; pass < 2; pass++) { let lo = 4, hi = 500; for (let i = 0; i < 22; i++) { const mid = (lo + hi) / 2, Q = mk(mid, py), ok = cor.every((q) => { const s = Q(q[0], q[1]); return s && s[0] >= x0 + pad && s[0] <= W - pad && s[1] >= pad && s[1] <= y1 - pad; }); if (ok) hi = mid; else lo = mid; }
        best = hi; if (!pass) { const Q = mk(hi, py), ys = cor.map((q) => (Q(q[0], q[1]) || [0, py])[1]); py += (y1 - (Math.max(...ys) + Math.min(...ys))) / 2; } }
      P = mk(best, py); }
    const gp = (pts, close) => { let on = false; g.beginPath(); for (const q of pts) { const s = P(q[0], q[1]); if (!s) continue; if (!on) { g.moveTo(s[0], s[1]); on = true; } else g.lineTo(s[0], s[1]); } if (close) g.closePath(); return on; };
    function line(pts, col, w, a, dash, tip, glow) { if (a <= .01 || !pts || pts.length < 2) return; g.save(); g.globalAlpha = a; g.lineCap = 'round'; g.lineJoin = 'round';
      if (glow) { g.strokeStyle = glow; g.globalAlpha = a * .28; g.lineWidth = w * 2.6; if (gp(pts)) g.stroke(); g.globalAlpha = a; }
      g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); if (gp(pts)) g.stroke(); g.setLineDash([]);
      if (tip) { const A = P(pts[pts.length - 2][0], pts[pts.length - 2][1]), B = P(pts[pts.length - 1][0], pts[pts.length - 1][1]); if (A && B) { const an = Math.atan2(B[1] - A[1], B[0] - A[0]), s = Math.max(7, w * 2.4); g.fillStyle = col; g.translate(B[0], B[1]); g.rotate(an); g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * .5, s * .62); g.lineTo(-s * .5, -s * .62); g.closePath(); g.fill(); } } g.restore(); }
    const LK = Object.assign({ word: GOLD, stroke: '#0C2410', ring: GOLD, los: 'rgba(255,255,255,.85)' }, opt.look || {});
    function text(str, x, y, font, col, a, al) { if (a <= .01) return; g.save(); g.globalAlpha = a; g.font = font; g.textAlign = al || 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = LK.stroke; g.lineWidth = 5; g.strokeText(str, x, y); g.fillStyle = col; g.fillText(str, x, y); g.restore(); }
    /* a standing jersey chip, its feet on the field point, the position on the jersey */
    function chip(x, y, e, body, trim, ink, label, a) { const w = e * 2.3, h = e * 2.5; g.save(); g.globalAlpha = a == null ? 1 : a;
      g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.ellipse(x, y, w * .55, w * .17, 0, 0, 7); g.fill();
      const J = [[-.30, 0], [-.30, .60], [-.50, .48], [-.60, .76], [-.30, 1], [-.13, 1], [0, .92], [.13, 1], [.30, 1], [.60, .76], [.50, .48], [.30, .60], [.30, 0]];
      g.beginPath(); J.forEach(([pp, q], i) => { const X = x + pp * w, Y = y - 2 - q * h; if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.closePath(); g.fillStyle = body; g.fill(); g.lineJoin = 'round'; g.lineWidth = Math.max(1.4, e * .16); g.strokeStyle = trim; g.stroke();
      if (label) { g.font = '800 ' + Math.max(7, e * .95).toFixed(1) + 'px ' + FC; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = ink; g.fillText(label, x, y - 2 - h * .38); } g.restore(); return h; }
    /* the controller icon on a receiver, the database card's */
    function icon(kind, x, y, r, a) { g.save(); g.globalAlpha = a; g.lineWidth = Math.max(1.6, r * .26); g.lineCap = 'round';
      if (kind === 'r1') { g.fillStyle = '#DDDAD2'; g.beginPath(); g.roundRect(x - r * 1.15, y - r * .8, r * 2.3, r * 1.6, r * .35); g.fill(); g.fillStyle = '#232323'; g.font = '800 ' + (r * 1.1).toFixed(1) + 'px ' + FC; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('R1', x, y + .5); g.restore(); return; }
      g.fillStyle = '#141518'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); const q = r * .5;
      if (kind === 'square') { g.strokeStyle = '#D97BC0'; g.strokeRect(x - q, y - q, q * 2, q * 2); }
      else if (kind === 'triangle') { g.strokeStyle = '#43C3B6'; g.beginPath(); g.moveTo(x, y - q * 1.15); g.lineTo(x + q * 1.1, y + q * .85); g.lineTo(x - q * 1.1, y + q * .85); g.closePath(); g.stroke(); }
      else if (kind === 'cross') { g.strokeStyle = '#7FA8E8'; g.beginPath(); g.moveTo(x - q, y - q); g.lineTo(x + q, y + q); g.moveTo(x - q, y + q); g.lineTo(x + q, y - q); g.stroke(); }
      else { g.strokeStyle = '#E06A6A'; g.beginPath(); g.arc(x, y, q, 0, 7); g.stroke(); } g.restore(); }
    function ring(x, y, r, a) { g.save(); g.globalAlpha = a; g.strokeStyle = LK.ring; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 7); g.stroke(); g.restore(); }
    function draw(D, cam) { if (!W) return; aim(cam); g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, W, H);
      /* A REAL FIELD (his reference, the shorts): the apron beyond the sidelines, the grass in five yard stripes, a white sideline
         bar, white yard lines and college hashes, the numbers painted on the grass, the line of scrimmage dashed */
      const C = D.fx || 0, L0 = C - 26.67, R0 = C + 26.67;   /* the middle of the field, from the ball */
      g.fillStyle = '#0B2210'; g.fillRect(0, 0, W, H);
      if (gp([[L0 - 8, -40], [R0 + 8, -40], [R0 + 8, 62], [L0 - 8, 62]], 1)) { g.fillStyle = '#123317'; g.fill(); }
      if (gp([[L0, -40], [R0, -40], [R0, 60], [L0, 60]], 1)) { g.fillStyle = GRASS; g.fill(); }
      for (let y = -45; y < 60; y += 10) if (gp([[L0, y], [R0, y], [R0, y + 5], [L0, y + 5]], 1)) { g.fillStyle = STRIPE; g.fill(); }
      for (const sx of [-1, 1]) if (gp([[C + sx * 26.67, -40], [C + sx * 28, -40], [C + sx * 28, 60], [C + sx * 26.67, 60]], 1)) { g.fillStyle = 'rgba(255,255,255,.92)'; g.fill(); }
      for (let y = -35; y <= 55; y += 5) if (y !== 0) line([[L0, y], [R0, y]], 'rgba(255,255,255,.62)', y % 10 === 0 ? 1.8 : 1.3, 1);
      for (let y = -38; y <= 58; y++) { if (y % 5 === 0) continue; for (const hx of [-6.67, 6.67]) line([[C + hx - .5, y], [C + hx + .5, y]], 'rgba(255,255,255,.8)', 1.5, 1); for (const sx of [-1, 1]) line([[C + sx * 26.67, y], [C + sx * 25.9, y]], 'rgba(255,255,255,.7)', 1.5, 1); }
      /* the numbers, painted flat on the grass and read from behind the offense */
      const flat = (str, x, y, size, col) => { const a = P(x, y), bx = P(x + 1, y), by = P(x, y + 1); if (!a || !bx || !by) return; const k = R * size / 100; g.save(); g.setTransform((bx[0] - a[0]) * k, (bx[1] - a[1]) * k, -(by[0] - a[0]) * k, -(by[1] - a[1]) * k, a[0] * R, a[1] * R); g.font = '800 100px Archivo, ' + FC; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = col; g.fillText(str, 0, 0); g.restore(); };
      for (let y = -30; y <= 50; y += 10) { const n = 50 - Math.abs(y); if (n <= 0) continue; for (const sx of [-18.4, 18.4]) flat(String(n), C + sx, y, 2.4, 'rgba(255,255,255,.5)'); }
      line([[L0, 10], [R0, 10]], '#F5D547', 2.4, .9);
      line([[L0, 0], [R0, 0]], LK.los, 2.4, .95, [10, 8]);
      /* their zones, the rush, our block marks and routes, then everybody far ones first, then the ball and the words */
      D.zones.forEach((z) => { const c = ZC[z.cov === 'c2' && /^Curl (left|right)$/.test(z.lb) ? 'hook' : zkey(z.lb)], pts = [];   /* Cover 2's curl players are vert hooks: yellow */ for (let i = 0; i < 40; i++) { const an = i / 40 * Math.PI * 2; pts.push([z.zone[0] + Math.cos(an) * z.zone[2], z.zone[1] + Math.sin(an) * z.zone[3]]); }
        g.save(); g.globalAlpha = z.a; if (gp(pts, 1)) { g.fillStyle = c[0]; g.fill(); g.strokeStyle = c[1]; g.lineWidth = 2; g.stroke(); } g.restore();
        /* his line to it: from where he lines up to the edge of his zone, so you can see whose zone it is */
        if (z.from && z.lead) { const dx = z.zone[0] - z.from[0], dy = z.zone[1] - z.from[1], L = Math.hypot(dx / z.zone[2], dy / z.zone[3]); if (L > 1) { const k = 1 - 1 / L; line([z.from, [z.from[0] + dx * k, z.from[1] + dy * k]], c[1], 2.2, Math.min(1, z.a * 1.5)); } } });
      D.rush.forEach((r) => line(r.pts, RED, 3, r.a, null, 1));
      D.blocks.forEach((b) => { if (b.path) line(b.path, b.col, b.w, b.a); const e = b.end, ln = b.len; line([e, [e[0], e[1] + ln]], WHITE, 2.6, b.a); line([[e[0] - .55, e[1] + ln], [e[0] + .55, e[1] + ln]], WHITE, 2.6, b.a); });
      D.routes.forEach((r) => line(r.pts, r.col, r.w, r.a, r.dash, r.tip !== false, r.glow));
      const men = D.men.slice().sort((a, b) => b.y - a.y);
      men.forEach((m) => { const s = P(m.x, m.y); if (!s) return; const e = clamp(s[2] * .58, W < 600 ? 6.5 : 11, 26); const h = chip(s[0], s[1], e, m.body, m.trim, m.ink, m.pos, m.a);
        if (m.icon && m.ia > .01) icon(m.icon, s[0] + e * 1.35, s[1] - e * .2, clamp(e * .55, 5, 11), m.ia);
        if (m.ring > .01) ring(s[0], s[1] - h * .45, e * 1.9, m.ring); if (m.tag) text(m.tag, s[0], s[1] - h - e * .7, '400 ' + clamp(e * 1.25, 14, 28) + 'px ' + FM, LK.word, m.ring || 1); });
      if (D.ball) { const s = P(D.ball[0], D.ball[1]); if (s) { const lift = (D.ball[2] || 0) * s[2] * .9; g.save(); g.fillStyle = '#a8632c'; g.strokeStyle = WHITE; g.lineWidth = 1.4; g.beginPath(); g.ellipse(s[0], s[1] - lift, clamp(s[2] * .34, 4, 11), clamp(s[2] * .22, 3, 7), .5, 0, 7); g.fill(); g.stroke(); g.restore(); } }
      D.words.forEach((w) => { const s = P(w.x, w.y); if (s) text(String(w.t).toUpperCase(), s[0], s[1], '400 ' + clamp(s[2] * 1.05, 16, 34) + 'px ' + FM, w.col || LK.word, w.a); });
      if (D.freeze > .01) { g.save(); g.globalAlpha = D.freeze * .9; g.fillStyle = 'rgba(7,9,12,.75)'; const tx = W * (opt.left || 0) + 18; g.font = '800 13px ' + FC; const lab = 'THE READ'; const tw = g.measureText(lab).width + 26; g.fillRect(W - tw - 18, H - 48, tw, 30); g.fillStyle = LK.word; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(lab, W - tw / 2 - 18, H - 32.5);   /* bottom right: the top right corner is his face cam's */ g.restore(); void tx; } }
    return { look: LK, size, draw, cv, tall: () => (W ? H / W > .9 : false), setLeft: (v) => { const o = opt.left; opt.left = v; return o; }, dims: () => [W, H] };
  }

  /* ---- the wall clock to the play clock: the play stops at the moment for the hold ---- */
  const simT = (st, t) => (st.moment == null || t < st.moment ? t : t < st.moment + st.hold ? st.moment : t - st.hold);
  const frameAt = (st, s) => { const fr = st.sim.frames; return fr[clamp(Math.floor(s * 30), 0, fr.length - 1)]; };
  const routeOf = (m, sc) => { let r = m.r; if (sc.branch && sc.branch[m.k] != null && m.alts && m.alts[sc.branch[m.k]] && m.tip) { const j = m.r.findIndex((q) => q[0] === m.tip[0] && q[1] === m.tip[1]); r = m.r.slice(0, j + 1).concat(m.alts[sc.branch[m.k]].slice(1)); } return r; };

  /* A ROUTE ENDS ON THE SCREEN (his note 2026-10-19: "the streaks should not be leaving the field, we should see the edge of the route"):
     the drawn line stops seventeen yards down the field with its arrow, the way the database card stops it; the man still runs on */
  const YCAP = 17;
  function capY(pts) { if (!pts || pts.length < 2 || pts[0][1] > YCAP) return pts && pts[0][1] > YCAP ? null : pts; const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (b[1] <= YCAP) { out.push(b); continue; } const u = (YCAP - a[1]) / ((b[1] - a[1]) || 1e-9); out.push([a[0] + (b[0] - a[0]) * u, YCAP]); break; }
    return out.length > 1 && plen(out) > .3 ? out : null; }
  /* what is left of a path from where a man is now: the part behind him is gone */
  function ahead(path, at) { if (!path || path.length < 2) return null; let best = 0, bd = 1e9, bq = path[0];
    for (let i = 1; i < path.length; i++) { const a = path[i - 1], b = path[i], dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy || 1, u = clamp(((at[0] - a[0]) * dx + (at[1] - a[1]) * dy) / L2, 0, 1), q = [a[0] + dx * u, a[1] + dy * u], d = Math.hypot(at[0] - q[0], at[1] - q[1]); if (d < bd) { bd = d; best = i; bq = q; } }
    const out = [[at[0], at[1]]].concat(path.slice(best)); return plen(out) < .6 ? null : out; }
  /* ---- a frame of one step at wall time t ---- */
  function frameOf(c, t) { const st = c.step, sc = st.sc, p = st.p, s = sc.pre ? Math.min(Math.max(0, simT(st, t) - 1.1), st.snap - .05) : simT(st, t), F = frameAt(st, s), appear = ease(clamp(t / .6, 0, 1));
    const lit = new Set(sc.lit || []), team = c.team, snapT = st.snap, after = s > snapT, prog = sc.pre ? appear : 1;
    const holding = st.moment != null && t >= st.moment && t < st.moment + st.hold, hk = holding ? ease(clamp((t - st.moment) / .35, 0, 1)) : 0;
    const pre = after ? clamp(1 - (s - snapT) / .45, 0, 1) : 1;   /* the pre-snap marks fade out as the play starts */
    const D = { fx: st.H ? st.H.FX : 0, men: [], zones: [], routes: [], rush: [], blocks: [], words: [], ball: null, freeze: holding ? hk : 0 };
    const elig = p.men.filter((m) => m.role === 'skill').slice().sort((a, b) => a.x - b.x);
    /* ours */
    p.men.forEach((m, k) => { const at = F.o[k], ei = elig.indexOf(m);
      D.men.push({ x: at[0], y: at[1], pos: m.pos, body: team.body, trim: team.trim, ink: team.ink || '#fff', a: 1, ring: isLit(lit, m) ? appear : 0, tag: (sc.tags || {})[m.k] || '', icon: ei >= 0 ? ICONS[Math.min(ei, ICONS.length - 1)] : null, ia: pre * appear * .95 });
      const dim = lit.size && !isLit(lit, m) ? .42 : 1;
      /* block marks: the stem and the bar, a puller's path to it */
      if ((m.role === 'ol' || m.role === 'blk') && m.bk && pre > .01) { const s0 = m.mot ? m.mot[m.mot.length - 1] : [m.x, m.y], path = m.rel && m.rel.length ? [s0].concat(m.rel) : null, end = path ? path[path.length - 1] : s0;
        D.blocks.push({ path, end, len: m.bk === 'r' ? 2.1 : 1.1, col: m.pull ? WHITE : 'rgba(244,242,236,.85)', w: m.pull ? 3 : 2.4, a: pre * .9 * prog * (lit.size ? .6 : 1) }); }
      if (m.role === 'qb' && m.c && !(m.r && m.r.length > 1) && !sc.run && pre > .01) D.routes.push({ pts: [[m.x, m.y], [m.x, m.y + 2.6]], col: RED, w: 4, a: pre * prog });
      if (m.r && m.r.length > 1 && m.role !== 'ol' && !(m.role === 'qb')) { if (sc.routes === 'lit' && !isLit(lit, m)) return;
        const col = m.c ? RED : YEL, hot = isLit(lit, m), a = dim * (after ? .62 : 1);
        const caught = F.caught && F.caught.includes(m.k), rt = capY(after ? (caught ? null : ahead(routeOf(m, sc), F.o[k])) : cutPath(routeOf(m, sc), prog));   /* after the snap only the part still to run; nothing once he has the ball */
        if (rt) D.routes.push({ pts: rt, col, w: hot ? 5.2 : 3.8, a, glow: hot ? '#ffffff' : col });
        if (!sc.branch && m.alts && !after) m.alts.forEach((al) => { const q = capY(cutPath(al, prog)); if (q) D.routes.push({ pts: q, col, w: 2.6, a: a * .85, dash: [7, 6] }); }); }
      if (m.mot && !after) D.routes.push({ pts: m.mot, col: CYAN, w: 3, a: sc.pre ? .9 : .9 * (1 - clamp((s - snapT + 1.2) / .8, 0, 1)), dash: [8, 6] }); });   /* on a step that holds before the snap the motion stays drawn */
    /* the run, in the game's red */
    if (sc.run && sc.run.path && sc.run.who) { const ci = sc.run.who === 'qb' ? p.men.findIndex((q) => q.role === 'qb') : p.men.findIndex((q) => q.k === sc.run.who), m = p.men[ci];
      if (m) { const s0 = m.mot ? m.mot[m.mot.length - 1] : [m.x, m.y], ac = !!sc.run.afterCatch, has = !ac || (F.caught && F.caught.includes(m.k));
        /* a run after the catch shows once he has it; a run shows the part still ahead of him */
        const pts = !after ? (ac ? null : [s0].concat(sc.run.path)) : has ? ahead(ac ? [F.o[ci]].concat(sc.run.path) : [s0].concat(sc.run.path), F.o[ci]) : null;
        if (pts) D.routes.push({ pts, col: RED, w: 4.4, a: (after ? .75 : 1) * prog, glow: RED }); } }
    /* theirs */
    const ringed = new Set([].concat(sc.ring || [])), zall = sc.zones === 'all', zsome = Array.isArray(sc.zones) ? new Set(sc.zones) : null;
    const nm = nameOf(st.shell); st.shell.forEach((d, k) => { const at = F.d[k], rg = ringed.has(d.lb) || ringed.has(nm[k]);
      D.men.push({ x: at[0], y: at[1], pos: defName(d, k, st.R.cov), body: '#EEF0F2', trim: '#8A949C', ink: '#17130E', a: 1, ring: rg ? (holding ? .55 + .45 * Math.abs(Math.sin(t * 5)) : appear) : 0, tag: (sc.dtags || {})[d.lb] || '' });
      if (d.zone) { const za = (zsome ? (zsome.has(d.lb) ? .95 : .2) : zall || !lit.size ? .7 : .35) * appear * (after ? .65 : 1); D.zones.push({ lb: d.lb, cov: st.R.cov, zone: d.zone, a: za, from: [at[0], at[1]], lead: (after ? 0 : 1) }); }
      if (d.rush && !after) D.rush.push({ pts: [[d.x, d.y], [d.x + (d.x > 0 ? -1 : 1), d.y - 2.6]], a: .8 * appear }); });
    if (F.ball && (after || sc.pre)) D.ball = F.ball;
    /* his words: at their time, and all of them while the play is stopped on the read */
    (sc.words || []).forEach((w) => { const t0 = st.sh(w.at == null ? .4 : w.at); const a = Math.max(ease(clamp((s - t0) / .3, 0, 1)), holding ? ease(clamp((t - st.moment - .3) / .35, 0, 1)) : 0); if (a > .01) D.words.push({ t: w.t, x: w.x, y: w.y, a, col: w.col }); });
    return D; }

  /* ---- THE CAMERA: what each part of a step looks at ---- */
  const box = (pts, pad, minW, minH, cap) => { if (!pts.length) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const [x, y0_] of pts) { const y = cap != null ? Math.min(y0_, cap) : y0_; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    x0 -= pad; x1 += pad; y0 -= pad; y1 += pad; if (x1 - x0 < minW) { const c = (x0 + x1) / 2; x0 = c - minW / 2; x1 = c + minW / 2; } if (y1 - y0 < minH) { const c = (y0 + y1) / 2; y0 = c - minH / 2; y1 = c + minH / 2; }
    return [clamp(x0, -38, 38), clamp(y0, -12, 60), clamp(x1, -38, 38), clamp(y1, -12, 60)]; };
  const yawFor = (v, k, lim) => clamp((v[0] + v[2]) / 2 * k, -lim, lim);
  /* the whole call: every player and the routes out to about twenty yards, from up high */
  function overview(c, F) { const pts = []; c.step.p.men.forEach((m, k) => { const at = F ? F.o[k] : [m.x, m.y]; pts.push(at); (m.r || []).forEach((q) => pts.push(q)); }); c.step.shell.forEach((d, k) => { if (d.y <= 12) pts.push(F ? F.d[k] : [d.x, d.y]); });
    const v = box(pts, 2, 30, 18, 20); return { view: v, pitch: 54, yaw: 0 }; }
  /* before the snap: what the step is about (the lit players, their routes, the ringed defenders, the words), or the whole call */
  function preShot(c, sc, F) { if (sc.cam) return { view: sc.cam, pitch: 46, yaw: yawFor(sc.cam, .3, 9) };
    if (sc.label === 'call') return overview(c, F);
    const lit = new Set(sc.lit || []), ringed = new Set([].concat(sc.ring || [])), pts = [];
    c.step.p.men.forEach((m, k) => { if (!isLit(lit, m)) return; pts.push(F.o[k]); (routeOf(m, sc) || []).forEach((q) => pts.push(q)); });
    { const nm = nameOf(c.step.shell); c.step.shell.forEach((d, k) => { if (ringed.has(d.lb) || ringed.has(nm[k])) pts.push(F.d[k]); }); }
    (sc.words || []).forEach((w) => pts.push([w.x, w.y]));
    if (!pts.length) return overview(c, F);
    pts.push([0, -5]);   /* keep the quarterback in the picture */
    const v = box(pts, 3, 26, 16, 26); return { view: v, pitch: 44, yaw: yawFor(v, .3, 9) }; }
  /* the read: low and turned, tight on the ringed defender, our lit player and the ball */
  function holdShot(c, sc, F) { if (sc.focus) return { view: sc.focus, pitch: 44, yaw: yawFor(sc.focus, .4, 12) };
    const lit = new Set(sc.lit || []), ringed = new Set([].concat(sc.ring || [])), pts = [];
    c.step.p.men.forEach((m, k) => { if (isLit(lit, m)) pts.push(F.o[k]); });
    { const nm = nameOf(c.step.shell); c.step.shell.forEach((d, k) => { if (ringed.has(d.lb) || ringed.has(nm[k])) pts.push(F.d[k]); }); }
    const th = c.step.R.throws && c.step.R.throws[0]; if (th) { const k = c.step.p.men.findIndex((m) => m.k === th.man); if (k >= 0) pts.push(F.o[k]); }
    if (F.ball) pts.push([F.ball[0], F.ball[1]]);
    (sc.words || []).forEach((w) => pts.push([w.x, w.y]));
    const v = box(pts, 4.5, 22, 14); return v ? { view: v, pitch: 44, yaw: yawFor(v, .4, 12) } : null; }   /* high enough to read the depth: who is over whom */
  /* after the snap: the ball, and where it is going */
  function followShot(c, sc, F, s) { const st = c.step, pts = [];
    if (F.ball) pts.push([F.ball[0], F.ball[1]]);
    const th = st.R.throws && st.R.throws.find((x) => s < x.at + 1.6); if (th) { const k = c.step.p.men.findIndex((m) => m.k === th.man); if (k >= 0) pts.push(F.o[k]); }
    const lit = new Set(sc.lit || []); if (s < (st.moment || st.snap + 1)) c.step.p.men.forEach((m, k) => { if (isLit(lit, m)) pts.push(F.o[k]); });
    const v = box(pts, 8, 36, 21); return v ? { view: v, pitch: 46, yaw: yawFor(v, .3, 9) } : null; }
  function wantCam(c, t) { const st = c.step, sc = st.sc, s = simT(st, t), F = frameAt(st, s);
    if (sc.pre) return preShot(c, sc, frameAt(st, 0));
    if (s < st.snap) return preShot(c, sc, frameAt(st, Math.min(s, st.snap - .05)));
    if (st.moment != null && t >= st.moment - .25 && t < st.moment + st.hold) return holdShot(c, sc, frameAt(st, st.moment)) || followShot(c, sc, F, s);
    return followShot(c, sc, F, s) || preShot(c, sc, F); }
  const camLerp = (a, b, k) => ({ view: a.view.map((v, i) => lerp(v, b.view[i], k)), pitch: lerp(a.pitch, b.pitch, k), yaw: lerp(a.yaw, b.yaw, k) });
  const camDist = (a, b) => Math.max(...a.view.map((v, i) => Math.abs(v - b.view[i])), Math.abs(a.pitch - b.pitch), Math.abs(a.yaw - b.yaw));
  /* a phone held up: look down on it, so the depth uses the height */
  const forTall = (c, cam) => (c.V.tall() ? Object.assign({}, cam, { pitch: Math.max(cam.pitch, 60), yaw: 0 }) : cam);

  function loop(now) { if (!cur) return; cur.raf = 0; now = now || performance.now(); const st = cur.step; if (!st) return;
    const still = cur.still || REDUCED(), total = st.end + st.hold + (st.sc.pre ? 1.2 : 0), t = still ? total : ((cur.paused ? cur.pauseAt : now) - cur.t0) / 1000, T = Math.min(t, total + .1);
    const want = forTall(cur, wantCam(cur, T)), dt = clamp((now - (cur.last || now)) / 1000, 0, .1); cur.last = now;
    /* the camera eases to where it wants to be: quicker into the read, slower everywhere else */
    const holdIn = st.moment != null && T >= st.moment - .25 && T < st.moment + st.hold, k = still || !cur.cam ? 1 : 1 - Math.exp(-dt * (holdIn ? 4.2 : 2.6));
    cur.cam = cur.cam ? camLerp(cur.cam, want, k) : want;
    cur.V.draw(frameOf(cur, T), cur.cam);
    if (!still && (cur.paused ? camDist(cur.cam, want) > .05 : (t < total + .3 || camDist(cur.cam, want) > .05))) cur.raf = requestAnimationFrame(loop); }
  /* PAUSE (his ask 2026-10-18: "I got to be able to pause on these"): the play clock stops where it is, the camera settles */
  function pause(on) { if (!cur) return false; const now = performance.now(); on = on == null ? !cur.paused : !!on; if (on === !!cur.paused) return cur.paused;
    if (on) { cur.paused = true; cur.pauseAt = now; } else { cur.t0 += now - cur.pauseAt; cur.paused = false; const st = cur.step; if (st && (now - cur.t0) / 1000 > st.end + st.hold + .2) cur.t0 = now; } kick(); return cur.paused; }
  const kick = () => { if (cur && !cur.raf) { cur.last = performance.now(); cur.raf = requestAnimationFrame(loop); } };
  function go(i, quiet) { if (!cur) return 0; const n = clamp(i, 0, cur.N - 1); cur.i = n; cur.paused = false; if (quiet) cur.cam = null;
    const sc0 = stepScene(cur.spec, n, cur.nR, cur.nA), sc = cur.look ? Object.assign({}, sc0, { pre: 1 }) : sc0,   /* the look (Attack it): the step held before the snap */ s = simulateStep(sc, cur.p, cur.blk); cur.step = s ? Object.assign(s, { sc: Object.assign({}, s.scH, { label: sc.label }) }) : null; cur.t0 = performance.now(); kick(); return n; }
  function unmount() { if (!cur) return; if (cur.raf) cancelAnimationFrame(cur.raf); if (cur.ro) cur.ro.disconnect(); if (cur.root.parentNode) cur.root.parentNode.removeChild(cur.root); cur = null; }
  function mount(host, cfg) { unmount(); const spec = REG[cfg.scheme + '/' + cfg.id]; if (!spec || !cfg.play || !window.skIntroField) return false;
    const root = document.createElement('div'); root.className = 'lp-root'; root.innerHTML = '<canvas style="display:block;width:100%;height:100%"></canvas>'; host.appendChild(root);
    const V = makeView(root.firstChild, { left: cfg.left || 0, look: cfg.team && cfg.team.look }), nR = (cfg.reads || []).length, nA = (cfg.adj || []).length;
    const labels = ['The call'].concat((cfg.reads || []).map((r) => 'Key: ' + (r.label || r)), (cfg.adj || []).map((a) => 'Adj: ' + String(a).slice(0, 60)), ['The snap']);
    cur = { labels, id: cfg.id, scheme: cfg.scheme, spec, p: cfg.play, blk: cfg.blocking || null, team: cfg.team || { body: '#12284B', trim: '#CE202F' }, V, root, nR, nA, N: 2 + nR + nA, i: 0, raf: 0, still: !!cfg.still, cam: null };
    cur.ro = new ResizeObserver(() => { if (cur && cur.V.size()) { cur.cam = null; kick(); } }); cur.ro.observe(root.firstChild); V.size();
    cur.look = !!cfg.look; go(cfg.start || 0, true); if (document.fonts && document.fonts.ready) document.fonts.ready.then(kick); return true; }
  function adopt(host) { if (!cur || !host || host.dataset.live !== cur.id || host.dataset.scheme !== cur.scheme) return false; if (cur.root.parentNode !== host) { host.appendChild(cur.root); cur.V.size(); } kick(); return true; }

  /* a staged scene, ready for the formations board's act mode (intro-field.js cfg.act): key n, or the run (n = 0) */
  function sceneFor(scheme, id, n, p) { const spec = REG[scheme + '/' + id]; if (!spec || !p) return null; const base = n ? (spec.keys || [])[n - 1] : spec.run || (spec.keys || [])[0]; if (!base) return null;
    const sc = Object.assign({ cov: spec.cov || 'c3' }, base); if (sc.pre) return null;
    return { cov: sc.cov, snap: 1, end: sc.end == null ? 5.4 : sc.end, def: alignDef(sc.cov, p).concat(sc.def || []), throws: sc.throws || [], hand: sc.hand, run: sc.run, fake: sc.fake, branch: sc.branch, move: sc.move, drop: sc.drop, beats: [], cam: [] }; }
  /* ONE READ, SIMULATED, WITHOUT A BOARD (the story reel's side by sides, Ole Miss 2026-10-18): the same snap the film board
     plays for key n of the call, on the hash, with the frames, the shell, its display names, the words and the lit men */
  function simFor(scheme, id, n, p, blk) { const spec = REG[scheme + '/' + id]; if (!spec || !p) return null; const nK = (spec.keys || []).length, sc = stepScene(spec, n || 1, nK, 0); if (sc.pre) return null;
    const st = simulateStep(sc, p, blk, spec); if (!st) return null;
    return { p: st.p, R: st.R, frames: st.sim.frames, shell: st.shell, pos: st.shell.map((d, k) => defName(d, k, st.R.cov)), names: nameOf(st.shell), snap: st.snap, end: st.end, moment: st.moment, words: st.scH.words || [], lit: [].concat(sc.lit || []), ring: [].concat(sc.ring || []), FX: st.H.FX }; }
  /* THE CONTACT SHEET (a checking tool, ?ofsheet=1 on the page): every step of the call frozen at its moment, two to a row */
  function contact(when) { if (!cur) return null; const old = document.getElementById('ofsheet'); if (old) old.remove(); const keep = cur.i, oldLeft = cur.V.setLeft(0), [W0, H0] = cur.V.dims();
    const cols = 2, cw = 800, ch = Math.round(cw * H0 / W0), out = document.createElement('canvas'); out.id = 'ofsheet'; out.width = cols * cw; out.height = Math.ceil(cur.N / cols) * (ch + 34);
    out.style.cssText = 'position:absolute;left:0;top:0;z-index:99999;background:#111;width:' + out.width + 'px;height:' + out.height + 'px'; const x = out.getContext('2d');
    for (let i = 0; i < cur.N; i++) { const sc0 = stepScene(cur.spec, i, cur.nR, cur.nA), st = simulateStep(sc0, cur.p, cur.blk); if (!st) continue; const sc = Object.assign({}, st.scH, { label: sc0.label }); cur.step = Object.assign(st, { sc });
      const T = sc.pre ? 1 : when === 'end' ? st.end + st.hold : st.moment != null ? st.moment + .5 : Math.min(st.end, st.snap + 1.6);
      const cam = forTall(cur, wantCam(cur, T)); cur.V.draw(frameOf(cur, T), cam);
      const cx = (i % cols) * cw, cy = Math.floor(i / cols) * (ch + 34); x.drawImage(cur.V.cv, cx, cy + 34, cw, ch);
      x.fillStyle = '#fff'; x.font = '700 18px sans-serif'; x.fillText(i + '  ' + (cur.labels[i] || sc.label) + (st.moment != null ? '   @' + st.moment.toFixed(2) : ''), cx + 8, cy + 23); }
    cur.V.setLeft(oldLeft); document.body.appendChild(out); go(keep, true); return out.height; }
  /* THE AUDIT (a checking tool): for every step, where the ball goes and how open it is, where the ringed men are at the moment */
  function audit() { if (!cur) return null; const keep = cur.i, out = [], r1 = (v) => Math.round(v * 10) / 10;
    for (let i = 0; i < cur.N; i++) { const sc = stepScene(cur.spec, i, cur.nR, cur.nA); if (sc.pre) { out.push(i + ' ' + (cur.labels[i] || '') + ': pre'); continue; } const st = simulateStep(sc, cur.p, cur.blk); if (!st) { out.push(i + ' FAILED'); continue; }
      const F = st.sim.frames, p = st.p, nm = nameOf(st.shell), key = (k) => (k === 'qb' ? p.men.findIndex((m) => m.role === 'qb') : p.men.findIndex((m) => m.k === k)), near = (fr, at) => { let b = 99, who = ''; fr.d.forEach((d, j) => { const dd = Math.hypot(d[0] - at[0], d[1] - at[1]); if (dd < b) { b = dd; who = nm[j]; } }); return [r1(b), who]; };
      let line = i + ' ' + (cur.labels[i] || '') + ' [' + sc.cov + ']';
      for (const th of st.R.throws || []) { const k = key(th.man), f0 = F[Math.min(F.length - 1, Math.round(th.at * 30))]; let fc = F.findIndex((f) => f.caught && f.caught.includes(th.man)); const fcF = fc >= 0 ? F[fc] : F[F.length - 1];
        const a = f0.o[k], c = fcF.o[k], n0 = near(f0, a), n1 = near(fcF, c); line += ' | THROW ' + th.man + ' at ' + r1(th.at) + ' from (' + r1(a[0]) + ',' + r1(a[1]) + ') near ' + n0[0] + ' ' + n0[1] + ' -> caught ' + (fc >= 0 ? 'yes' : 'NO') + ' at (' + r1(c[0]) + ',' + r1(c[1]) + ') near ' + n1[0] + ' ' + n1[1]; }
      if (st.R.run && !st.R.run.afterCatch) { const k = key(st.R.run.who), last = F[F.length - 1], tk = F.findIndex((f) => f.tackled != null); line += ' | RUN ' + st.R.run.who + ' to (' + r1(last.o[k][0]) + ',' + r1(last.o[k][1]) + ')' + (tk >= 0 ? ' tackled at ' + r1(tk / 30) + ' by ' + near(F[tk], F[tk].o[k])[1] : ''); }
      if (st.R.run && st.R.run.afterCatch) { const k = key(st.R.run.who), last = F[F.length - 1]; line += ' | AFTER CATCH to (' + r1(last.o[k][0]) + ',' + r1(last.o[k][1]) + ')'; }
      if (st.moment != null) { const fm = F[Math.min(F.length - 1, Math.round(st.moment * 30))], ring = new Set([].concat(sc.ring || [])); const rs = []; st.shell.forEach((d, j) => { if (ring.has(d.lb) || ring.has(nm[j])) rs.push(nm[j].replace(/#1$/, '') + '(' + r1(fm.d[j][0]) + ',' + r1(fm.d[j][1]) + ')'); }); if (rs.length) line += ' | AT MOMENT ' + rs.join(' '); }
      out.push(line); }
    go(keep, true); return out; }
  /* THE PAPER CARD (the section lead in and end screens, the Seahawks Advanced look): the call in ink on the sheet, seen from
     behind the offense; the first read in the team's marker, the other routes in ink, motion dashed, the blocks as T marks */
  function card(cv, cfg) { const p = cfg.play; if (!p || !p.men) return; const g = cv.getContext('2d'), INK = '#17130E', MK = cfg.mark || '#CE202F', SHEET = '#f8f1de';
    const paint = () => { const r = cv.getBoundingClientRect(); if (r.width < 4) return; const W = cv.clientWidth || r.width, H = cv.clientHeight || r.height, R = Math.min(devicePixelRatio || 1, 2); cv.width = Math.round(W * R); cv.height = Math.round(H * R);
      /* the frame: the formation and the routes out to twenty, a light perspective */
      const shell = cfg.cov && window.skIntroField ? skIntroField.shellOf({ cov: cfg.cov, def: [] }) : null;
      const pts = []; p.men.forEach((m) => { pts.push([m.x, m.y]); if (!shell) (m.r || []).forEach((q) => pts.push([q[0], Math.min(q[1], 22)])); }); if (shell) shell.forEach((d) => { pts.push([d.x, d.y]); if (d.zone) pts.push([d.zone[0], Math.min(d.zone[1] + d.zone[3], 23)]); });
      const x0 = Math.min(...pts.map((q) => q[0])) - 2.5, x1 = Math.max(...pts.map((q) => q[0])) + 2.5, y0 = -8.5, y1 = Math.min(23, Math.max(...pts.map((q) => q[1])) + 2);
      const tilt = .26, sx = (x, y) => { const k = 1 - tilt * (y - y0) / (y1 - y0); return W / 2 + (x - (x0 + x1) / 2) * k * sc; }, sc = Math.min(W * .94 / (x1 - x0), H * .92 / ((y1 - y0) * .78)), sy = (y) => H * .95 - (y - y0) * sc * .78;
      const P = (q) => [sx(q[0], q[1]), sy(Math.min(q[1], y1))];
      g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, W, H); g.fillStyle = SHEET; g.fillRect(0, 0, W, H);
      g.lineCap = 'round'; g.lineJoin = 'round';
      const ln = (a, b, col, w, dash) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); g.moveTo(...P(a)); g.lineTo(...P(b)); g.stroke(); g.setLineDash([]); };
      for (let y = -5; y <= y1; y += 5) ln([x0 - 4, y], [x1 + 4, y], y === 0 ? 'rgba(23,19,14,.8)' : 'rgba(23,19,14,.14)', y === 0 ? 1.6 : 1);
      const poly = (q, col, w, dash, tip) => { if (!q || q.length < 2) return; const z = q.map((v) => P(v)); g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath(); z.forEach((v, i) => (i ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]))); g.stroke(); g.setLineDash([]);
        if (tip) { const a = z[z.length - 2], b = z[z.length - 1], an = Math.atan2(b[1] - a[1], b[0] - a[0]), s = Math.max(4, w * 2.2); g.save(); g.fillStyle = col; g.translate(b[0], b[1]); g.rotate(an); g.beginPath(); g.moveTo(s, 0); g.lineTo(-s * .6, s * .7); g.lineTo(-s * .6, -s * .7); g.closePath(); g.fill(); g.restore(); } };
      const clip = (q) => { const out = []; for (const v of q) { out.push([v[0], Math.min(v[1], y1)]); if (v[1] >= y1) break; } return out; };
      const first = (p.reads && p.reads[0] && p.reads[0][0]) || (p.men.find((m) => m.c) || {}).k;
      const W0 = Math.max(1.4, W / 260);
      p.men.forEach((m) => { if (m.mot) poly(m.mot, 'rgba(23,19,14,.55)', W0, [4, 4], 1);
        if ((m.role === 'ol' || m.role === 'blk') && m.bk) { const s0 = m.mot ? m.mot[m.mot.length - 1] : [m.x, m.y], path = m.rel && m.rel.length ? [s0].concat(m.rel) : null, e = path ? path[path.length - 1] : s0, L = m.bk === 'r' ? 1.6 : .9;
          if (path) poly(path, m.pull ? MK : 'rgba(23,19,14,.6)', m.pull ? W0 * 1.4 : W0, m.pull ? null : [3, 4]); ln(e, [e[0], e[1] + L], 'rgba(23,19,14,.75)', W0); ln([e[0] - .55, e[1] + L], [e[0] + .55, e[1] + L], 'rgba(23,19,14,.75)', W0); }
        if (!shell && m.r && m.r.length > 1 && m.role !== 'ol') { const hot = m.k === first || (m.role === 'qb' && first === 'qb'); poly(clip(m.r), hot ? MK : 'rgba(23,19,14,.78)', hot ? W0 * 1.9 : W0, null, 1); (m.alts || []).forEach((a) => poly(clip(a), hot ? MK : 'rgba(23,19,14,.5)', W0 * .8, [3, 4], 1)); } });
      if (shell) shell.forEach((d) => { if (d.zone) { const z = d.zone, q = []; for (let i = 0; i <= 32; i++) { const a = i / 32 * Math.PI * 2; q.push([z[0] + Math.cos(a) * z[2], z[1] + Math.sin(a) * z[3]]); } poly(q, z[1] >= 15 ? 'rgba(43,58,190,.55)' : 'rgba(23,19,14,.35)', W0); } const [X, Y] = P([d.x, d.y]), e = Math.max(3, W / 85); g.strokeStyle = MK; g.lineWidth = Math.max(1.8, W / 200); g.beginPath(); g.moveTo(X - e, Y - e); g.lineTo(X + e, Y + e); g.moveTo(X + e, Y - e); g.lineTo(X - e, Y + e); g.stroke(); });
      p.men.forEach((m) => { const [X, Y] = P([m.x, m.y]), rr = Math.max(3.2, W / 70); g.beginPath(); g.arc(X, Y, rr, 0, 7); g.fillStyle = m.role === 'qb' ? MK : SHEET; g.fill(); g.lineWidth = Math.max(1.4, W / 240); g.strokeStyle = INK; g.stroke(); }); };
    paint(); requestAnimationFrame(paint); if (document.fonts && document.fonts.ready) document.fonts.ready.then(paint); return paint; }
  window.skOffFilm = { card, stage: (scheme, id, spec) => { REG[scheme + '/' + id] = spec; }, has: (scheme, id) => !!REG[scheme + '/' + id], mount, adopt, unmount, go, at: () => (cur ? cur.i : 0), id: () => (cur ? cur.id : null), replay: () => { if (cur) go(cur.i); }, active: () => !!cur, dbg: () => (cur && cur.step ? { FX: cur.step.H.FX, wide: cur.step.H.wide, shell: cur.step.shell.map((d, k) => d.lb + ' ' + cur.step.sim.frames[0].d[k].slice(0, 2).map((v) => Math.round(v * 10) / 10).join(',') + (d.zone ? ' z' + d.zone.slice(0, 2).map((v) => Math.round(v * 10) / 10).join(',') : '')) } : null), look: (on) => { if (!cur) return; cur.look = !!on; go(cur.i); }, play: () => (cur && cur.step ? cur.step.p : null), pause, paused: () => !!(cur && cur.paused), sceneFor, simFor, contact, audit };
  /* one board on the page at a time: a call staged here comes here, anything else goes to the defensive board */
  const L0 = Object.assign({}, window.skLive), O = window.skOffFilm;
  Object.assign(window.skLive, {
    has: (s, id) => O.has(s, id) || L0.has(s, id),
    mount: (h, cfg) => { if (cfg && cfg.offense && O.has(cfg.scheme, cfg.id)) { L0.unmount(); return O.mount(h, cfg); } O.unmount(); return L0.mount(h, cfg); },
    adopt: (h) => (O.active() ? O.adopt(h) : L0.adopt(h)), unmount: () => { O.unmount(); L0.unmount(); },
    go: (i, q) => (O.active() ? O.go(i, q) : L0.go(i, q)), at: () => (O.active() ? O.at() : L0.at()), id: () => (O.active() ? O.id() : L0.id()),
    replay: () => (O.active() ? O.replay() : L0.replay()),
  });
})();
