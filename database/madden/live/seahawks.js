/* live/seahawks.js: the live play staging for the Seahawks Nickel install (live-play.js draws it).
   STAGING ONLY: what the field does for each key and each adjustment. Every word on the page stays his.
   Show SS Sim 2 is the call he approved the sketch on (2026-10-11); the rest of the nickel calls keep the still card
   until they are staged. */
(function () {
  if (!window.skLive) return;
  skLive.stage('seahawks', 'show-ss-sim-2', (K) => {
    const { E, L2, M, WHITE, RED, GOLD } = K, R = [-7, -9.5, 27, 18], at = (k) => [M(k).x, M(k).y];
    return {
      off: 'shotgun__doubles',
      /* 3 = the line shifted to the safety, 5 = the user down in the gap between the end and the tackle */
      align(F, n) { if (n >= 3) ['s0', 's1', 's2', 's3'].forEach((k) => { F.def[k][0] += 1.4; }); if (n >= 5) F.def.s5 = [(F.def.s2[0] + F.def.s3[0]) / 2 + .2, 2.9]; },
      keys: [
        /* 1 the safety walks down: a loaded box on the run, a fourth rusher on the pass */
        (F, t) => { const w = E(t, .5, 1.8), s9 = M('s9'); K.view(F, R, E(t, .3, 1.3)); K.pre(F, w); F.lanes.s9 = E(t, 2.6, 3.2); if (s9.from) K.line(F, [s9.from, F.def.s9], { col: WHITE, dash: [4, 6], w: 2, a: .7 });
          if (t > 1.9) { K.ring(F, 's9', E(t, 1.9, 2.3)); K.note(F, 'loads the box', 16.6, 3.4, E(t, 2, 2.3)); } K.note(F, 'then he comes', 14.4, -3.6, E(t, 3.2, 3.5), RED); },
        /* 2 count the four, then snap it: the safety is the one nobody blocks */
        (F, t) => { ['s1', 's2', 's3', 's9'].forEach((k, j) => { if (t > .4 + j * .35) K.num(F, k, j + 1); }); const u = E(t, 2.2, 3.9); K.snap(F, u, { free: ['s9'] }); if (u > 0) F.marks = {};
          K.hit(F, F.qb, E(t, 3.9, 4.2), 'sack'); K.note(F, 'seven in coverage', -1, 15.4, E(t, 4.2, 4.5)); },
        /* 3 the corners sink under the deep ball and the safety comes over the top */
        (F, t) => { K.showAll(F, 1, ['s4', 's10']); K.view(F, [-4, -9.5, 27, 24], E(t, .3, 1.2)); K.ring(F, 's10', E(t, .5, .9)); K.ring(F, 's4', E(t, .7, 1.1));
          const u = E(t, 1.6, 3.4), wr = K.o(F, 'WR', 2), end = [18.4, 17.6]; K.snap(F, u * .5, {}); K.route(F, wr, [[18.2, 18.6]], u, { a: .5, w: 2 });
          F.def.s10 = L2(at('s10'), [17.6, 16.4], u); F.def.s8 = L2(at('s8'), [17.2, 19.6], u); K.ball(F, end, K.u01(t, 2.5, 3.4));
          K.hit(F, end, E(t, 3.4, 3.7)); K.note(F, 'they meet at the football', 8.6, 21.6, E(t, 3.5, 3.8)); },
        /* 4 the user sits in the middle and steps in front of the crosser */
        (F, t) => { K.showAll(F, 1, ['s5']); K.view(F, [-15, -9.5, 15, 15], E(t, .3, 1.2)); K.ring(F, 's5', E(t, .5, .9), 'USER');
          const u = E(t, 1.5, 3.1), te = K.o(F, 'TE'); K.snap(F, u * .45, {}); K.route(F, te, [[4.6, 4.2], [-5.5, 7.2]], u, { prog: E(t, 1.2, 2.2), stop: .78 });
          F.def.s5 = L2(at('s5'), [.6, 6.5], E(t, 2.2, 3)); K.ball(F, [.8, 6.3], K.u01(t, 2.5, 3.1)); K.hit(F, [.7, 6.4], E(t, 3.1, 3.4), 'pick'); K.note(F, 'step in front of it', -7.4, 10.4, E(t, 3.2, 3.5)); },
        /* 5 toss to the strength: the safety holds the edge, the end scrapes over the top, the corner flows down */
        (F, t) => { K.showAll(F, .25); K.view(F, [-6, -11, 27, 12], E(t, .3, 1.2)); F.lanes = {}; F.lead = 0;
          const u = E(t, 1, 3), rb = K.o(F, 'RB'), te = K.o(F, 'TE'), path = [[2.9, -6], [8, -6.6], [13, -5], [14.4, -3.4]], r = K.along(path, u); K.line(F, path, { col: WHITE, w: 2.2, a: .6, dash: [6, 6], prog: E(t, .6, 1.6) }); rb.x = r[0]; rb.y = r[1];
          te.x = K.lerp(5, 8.6, u); te.y = K.lerp(-1.2, .2, u); F.off.forEach((o) => { if (/^(LT|LG|C|RG|RT)$/.test(o.p)) { o.x += 1.6 * u; o.y += .6 * u; } });
          F.def.s9 = L2([9.6, 1.4], [11.4, -.6], u); F.def.s3 = K.along([[6, 1.2], [8.6, 1.8], [12.6, -1.8]], u); F.def.s10 = L2([17.5, 8], [16.2, -.6], u); F.def.s6 = L2([3, 5], [9, .8], u); F.def.s2 = L2([2.5, 1.2], [5, 0], u); F.def.s1 = L2([-1.7, 1.2], [.6, .2], u);
          K.note(F, 'holds the edge', 19.5, 1.2, E(t, 1.2, 1.5)); K.note(F, 'scrapes over the top', 3.4, 6.4, E(t, 2, 2.3)); K.hit(F, [14.2, -3.2], E(t, 3, 3.3), 'no edge'); },
      ],
      adj: [
        /* 1 he walked down away from the tight end: flip it so he is on the strength */
        (F, t) => { const u = E(t, 1.5, 2.3); K.flip(F, u); K.note(F, 'wrong side', -14.6, 3.6, E(t, .4, .7) * (1 - E(t, 1.3, 1.6)), RED); if (t > 2.3) { K.ring(F, 's9', E(t, 2.3, 2.7)); K.note(F, 'now on the strength', 13.4, 4.4, E(t, 2.4, 2.7)); } },
        /* 2 two by two with no strong side: leave it alone */
        (F, t) => { K.toOff(F, 'shotgun__spread', E(t, .4, 1.3)); K.note(F, 'no strong side: leave it', 0, -8.2, E(t, 1.3, 1.6)); },
        /* 3 the line slides to the safety */
        (F, t) => { K.view(F, [-13, -9.5, 17, 12], E(t, .2, 1)); K.toAdj(F, 3, E(t, .5, 1.4)); K.line(F, [[-4, 3.3], [4.6, 3.3]], { w: 4, prog: E(t, .4, 1.3), tip: 1 }); K.note(F, 'shift the line', .4, 4.6, E(t, .5, .8)); },
        /* 4 QB contain: part of the setup, it helps the blitz come in */
        (F, t) => { K.view(F, [-15, -11, 17, 11], E(t, .2, 1)); { const ks = K.contain(F, E(t, .7, 1.7)); (ks.length ? ks : K.rushers(F)).forEach((k, j) => { const a = E(t, .4 + j * .14, .8 + j * .14); if (a > 0) K.ring(F, k, a); }); } K.note(F, 'QB contain: it helps the blitz come in', 1, -8.4, E(t, 1.1, 1.4)); },
        /* 5 the user: the linebacker in the mid read, down in the gap between the end and the tackle */
        (F, t) => { K.showAll(F, 1, ['s5']); K.view(F, [-13, -9.5, 17, 12], E(t, .2, 1)); K.toAdj(F, 5, E(t, .6, 1.5)); K.showAll(F, 1, ['s5']); K.ring(F, 's5', E(t, .2, .6), 'USER'); K.note(F, 'sit in the gap, then play the middle', -1.8, 9.6, E(t, 1.5, 1.8)); },
      ],
      /* everything on, and the snap */
      run(F, t) { K.ring(F, 's5', 1, 'USER'); const a = F.def.s5.slice(), u = E(t, 1, 2.8); K.snap(F, u, { free: ['s9'], hold: ['s5'] }); F.def.s5 = L2(a, [1.6, 7.4], E(t, 1.5, 2.6)); K.hit(F, F.qb, E(t, 2.8, 3.1), 'sack'); },
    };
  });
  /* ================= THE REST OF THE NICKEL (2026-10-11) =================
     Staged from his keys and setups in seahawks.js (which come from the Nickel transcripts). Men are s0..s10 in the game's
     slot order: s0-s3 the line left to right, s4 the nickel, s5 and s6 the linebackers, s7 the left corner, s8 and s9 the
     safeties, s10 the right corner. The nickel is on the left in every one of these. */
  const st = (id, fn) => skLive.stage('seahawks', id, (K) => fn(K, skLive.tools(K), K.E, K.L2));
  const BOX = [-14, -10, 14, 12];
  const N = (K, F, txt, x, y, t, t0, col) => K.note(F, txt, x, y, K.E(t, t0, t0 + .3), col);
  const shift = (K, F, t, dx, txt) => { const d = dx > 0 ? 1 : -1; K.line(F, [[-4.4 * d, 3.4], [4.4 * d, 3.4]], { w: 4, prog: K.E(t, .4, 1.3), tip: 1 }); N(K, F, txt, 0, 5.4, t, .5); };
  const verts = (K, T, F, t, t0, who) => { const u = K.E(t, t0, t0 + 1.9), p = K.E(t, t0 - .3, t0 + .6), x = K.o(F, 'WR', 0), sl = K.o(F, 'WR', 1), z = K.o(F, 'WR', 2), te = K.o(F, 'TE');
    K.route(F, x, [[-16.6, 15]], u, { prog: p }); K.route(F, sl, [[-10, 14]], u, { prog: p }); K.route(F, te, [[5.4, 14]], u, { prog: p }); K.route(F, z, [[16.8, 15]], u, { prog: p });
    const w = who || {}; if (w.x) T.with(F, w.x, x, u, .9, 1.5); if (w.sl) T.with(F, w.sl, sl, u, .9, 1.9); if (w.te) T.with(F, w.te, te, u, -.9, 1.9); if (w.z) T.with(F, w.z, z, u, -.9, 1.5); return u; };
  const fit = (K, T, F, t, ks, to, word) => { T.bare(F); K.view(F, [-16, -10, 16, 15], K.E(t, .2, 1)); const u = K.E(t, 1, 2.7); T.run(F, u, [[.6, -3.4], to], 0, K.E(t, .5, 1.3)); T.flow(F, ks, [to[0], to[1] + .4], u * .86); K.hit(F, to, K.E(t, 2.7, 3), word || ''); return u; };

  /* ---- COVER 4 QUARTERS ---- */
  st('cover-4-quarters', (K, T, E, L2) => ({ off: 'shotgun__doubles',
    keys: [
      (F, t) => { K.showAll(F, 1, ['s7', 's8', 's9', 's10', 's4', 's6', 's5']); T.rings(F, ['s7', 's10'], t, .4); T.rings(F, ['s8', 's9'], t, 1); N(K, F, 'corners: the outside quarter', 0, 26.4, t, .7); N(K, F, 'safeties: the inside quarter, read number two', 0, 16.8, t, 1.3);
        const u = verts(K, T, F, t, 2, { x: 's7', sl: 's8', te: 's9', z: 's10' }); K.snap(F, u * .4, { hold: ['s7', 's8', 's9', 's10'] }); },
      (F, t) => { K.showAll(F, 1, ['s9', 's8']); T.user(F, 's9', t, .3); const u = E(t, 1.3, 3.2), sl = K.o(F, 'WR', 1); K.snap(F, u * .4, { hold: ['s9', 's8'] }); K.route(F, sl, [[-10, 8], [7, 14]], u, { prog: E(t, 1, 1.9), stop: .92 }); F.def.s9 = L2(F.def.s9, [4.6, 14.6], E(t, 2, 3.1)); F.def.s8 = L2(F.def.s8, [-6, 10.4], E(t, 2, 3.1));
        N(K, F, 'the crosser: you take it', 12.6, 17.4, t, 2.9); N(K, F, 'the other safety steps down', -13.4, 13, t, 3.2); },
      (F, t) => { fit(K, T, F, t, ['s5', 's6', 's4', 's8', 's9'], [.9, -1.1], 'no gain'); T.count(F, ['s0', 's1', 's2', 's3', 's4', 's5', 's6', 's8', 's9'], t, .3, .08); if (t > 1.2) F.marks = {}; N(K, F, 'nine in the fit', 0, 13, t, .4); },
      (F, t) => { T.count(F, ['s0', 's1', 's2', 's3'], t, .4); const u = verts(K, T, F, t, 2, { x: 's7', sl: 's8', te: 's9', z: 's10' }); K.snap(F, u, { hold: ['s7', 's8', 's9', 's10'] }); if (u > 0) F.marks = {}; N(K, F, 'boxed', -13.4, 19, t, 3.6); N(K, F, 'boxed', 11.4, 19, t, 3.8); N(K, F, 'and still four rushing', 0, -9, t, 4.1); },
      (F, t) => { K.toOff(F, 'shotgun__bunch', E(t, .3, 1.2)); K.showAll(F, 1, ['s10', 's9', 's6', 's5']); T.rings(F, ['s10', 's9', 's6', 's5'], t, 1.2); N(K, F, 'bunch: the Box check', 8, 16.6, t, 1.9); },
    ],
    adj: [
      (F, t) => { N(K, F, 'nothing to set', 0, -8.6, t, .4); },
      (F, t) => { K.showAll(F, 1, ['s8', 's9']); T.user(F, 's9', t, .3); K.ring(F, 's8', E(t, 1, 1.4)); N(K, F, 'either safety', 0, 17.4, t, 1.3); },
      (F, t) => { K.toOff(F, 'shotgun__trips', E(t, .4, 1.3)); N(K, F, 'three by one: go to Palms', 9, -8.6, t, 1.4); },
      (F, t) => { K.toOff(F, 'shotgun__bunch', E(t, .4, 1.3)); N(K, F, 'bunch: the Box check', 8, -8.6, t, 1.4); },
    ],
    run(F, t) { T.user(F, 's9'); const u = verts(K, T, F, t, 1.1, { x: 's7', sl: 's8', te: 's9', z: 's10' }); K.snap(F, u, { hold: ['s7', 's8', 's9', 's10'] }); } }));

  /* ---- COVER 4 PALMS ---- */
  st('cover-4-palms', (K, T, E, L2) => ({ off: 'shotgun__doubles',
    keys: [
      (F, t) => { K.toOff(F, 'shotgun__trips', E(t, .3, 1.1)); K.showAll(F, 1, ['s10', 's9']); T.rings(F, ['s10', 's9'], t, 1.2); N(K, F, 'three by one: Palms', 10, -8.6, t, 1.2); N(K, F, 'they read number two together', 13, 24.6, t, 1.8); },
      (F, t) => { K.toOff(F, 'shotgun__trips', 1); K.showAll(F, 1, ['s8']); T.user(F, 's8', t, .3); F.def.s8 = L2(F.def.s8, [-1.5, 13], E(t, 1.2, 2.6)); N(K, F, 'the weak side safety: free', -12, 17.6, t, .8); N(K, F, 'rove', 3.4, 16, t, 2.4); },
      (F, t) => { K.toOff(F, 'shotgun__emptybase', 1); K.showAll(F, 1, ['s10', 's9']); K.view(F, [-2, -9.5, 27, 24], E(t, .2, 1)); const u = E(t, 1.2, 3.2), z = K.o(F, 'WR', 2); K.snap(F, u * .4, { hold: ['s10', 's9'] }); K.route(F, z, [[21, 3.4], [21.6, 17]], u, { prog: E(t, .9, 1.9) }); T.with(F, 's10', z, u, -1, 1); F.def.s9 = L2(F.def.s9, [17.4, 20], u);
        N(K, F, 'the out and up: matched', 11.6, 12, t, 2.2); K.ball(F, [21.2, 16.4], K.u01(t, 2.6, 3.3)); K.hit(F, [21, 16.6], E(t, 3.3, 3.6), 'pick'); },
      (F, t) => { fit(K, T, F, t, ['s5', 's6', 's4', 's8', 's9'], [5.6, -.6], ''); N(K, F, 'safeties fire, linebackers fire, ends fire', 0, 13, t, .4); N(K, F, 'gang tackle it', 11.4, -3.6, t, 2.9); },
      (F, t) => { N(K, F, 'bunch: Bingo', 0, 19, t, .4); N(K, F, 'trips: Stump', 0, 16.4, t, .9); N(K, F, 'one receiver, tight: Solo Cut', 0, 13.8, t, 1.4); },
    ],
    adj: [
      (F, t) => { N(K, F, 'nothing to set', 0, -8.6, t, .4); },
      (F, t) => { K.toOff(F, 'shotgun__trips', E(t, .3, 1.1)); K.showAll(F, 1, ['s8']); T.user(F, 's8', t, 1.1); N(K, F, 'the weak side safety', -12, 17.6, t, 1.4); },
      (F, t) => { K.toOff(F, 'shotgun__bunch', E(t, .3, 1.1)); K.showAll(F, 1, ['s8']); T.user(F, 's8', t, 1.1); N(K, F, 'the solo side safety', -12, 17.6, t, 1.4); },
      (F, t) => { K.toOff(F, 'shotgun__emptybase', E(t, .3, 1.1)); N(K, F, 'and against empty', 0, -8.6, t, 1.2); },
      (F, t) => { N(K, F, 'bunch: Bingo', 0, 19, t, .4); N(K, F, 'trips: Stump', 0, 16.4, t, .9); N(K, F, 'one receiver, tight: Solo Cut', 0, 13.8, t, 1.4); },
    ],
    run(F, t) { K.toOff(F, 'shotgun__trips', 1); T.user(F, 's8'); const u = E(t, 1, 2.8); K.snap(F, u, { hold: ['s8'] }); F.def.s8 = L2(F.def.s8, [-1.5, 13], u); } }));

  /* ---- SILVER SHOOT PINCH: the zero. The nickel and the looper come, the user has the back ---- */
  st('silver-shoot-pinch', (K, T, E, L2) => { const P = { s6: [[1.2, 1.6], [.8, -2]], s4: [[-8.4, -1.2], [-4.4, -5]] }, hov = (F, t, t0) => { const a = F.def.s5; F.def.s5 = K.along([a, [a[0], a[1] - .6], [-1.6, 5.6]], E(t, t0, t0 + 1.6)); };
    return { off: 'shotgun__doubles', keysOn: 5,
      align(F, n) { if (n >= 1) ['s0', 's1', 's2', 's3'].forEach((k) => { const p = F.def[k]; K.job(F, k, { rush: [[p[0], p[1]], [p[0] - 1.6, p[1] - 3]] }); }); if (n >= 4) F.def.s5 = [.4, 2.7]; },
      keys: [
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); K.snap(F, E(t, 1.2, 3), { free: ['s6', 's4'], paths: P, hold: ['s5'] }); hov(F, t, 1.2); T.sack(F, t, 3); N(K, F, 'the nickel', -11, 3.4, t, .5); N(K, F, 'the looper', 7, 6, t, .8); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); K.snap(F, u, { free: ['s4'], paths: { s4: P.s4, s6: [[1.3, 1.5], [1.6, -2.4]] }, hold: ['s5'] }); rb.x = K.lerp(2.9, 1.8, u); rb.y = K.lerp(-6, -3.6, u); hov(F, t, 1.2);
          N(K, F, 'the back blocks the looper', 6, 8, t, 1.9); N(K, F, 'the nickel is free', -8, 4.8, t, 2.6); T.sack(F, t, 3); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s5']); T.user(F, 's5', t, .3); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); K.snap(F, u * .6, { hold: ['s5'] }); K.route(F, rb, [[7.5, -6.6], [12.4, -3.6]], u, { prog: E(t, .9, 1.8) }); F.def.s5 = L2(F.def.s5, [rb.x - 1.2, rb.y + 1.8], E(t, 1.5, 3)); N(K, F, 'the swing: run out with him', 12, 3, t, 2.2); N(K, F, 'he stays in: help over the middle', 0, 11.6, t, 3.2); },
        (F, t) => { fit(K, T, F, t, ['s0', 's1', 's2', 's3', 's4', 's6', 's5'], [.9, -1.6], ''); N(K, F, 'everybody flies to the football', 0, 11, t, .4); },
      ],
      adj: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 1, E(t, .2, .9)); K.line(F, [[4.4, 3.4], [-4.4, 3.4]], { w: 4, prog: E(t, .4, 1.3), tip: 1 }); K.ring(F, 's4', E(t, .9, 1.3)); N(K, F, 'slant to the nickel', -1, 7.4, t, 1.1); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.rings(F, ['s5', 's6'], t, .4); N(K, F, 'blitz all linebackers', 0, 8, t, .9); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's5', t, .3); N(K, F, 'the nickel side linebacker', -8.4, 7.6, t, .8); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 4, E(t, .6, 1.5)); T.user(F, 's5'); N(K, F, 'walk him down between the tackles', 7.6, 5.6, t, 1.5); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s5']); T.user(F, 's5'); N(K, F, 'the back, or whoever is uncovered', 9.6, -8.6, t, .6); },
      ],
      run(F, t) { T.lock(F); T.user(F, 's5'); K.snap(F, E(t, 1, 2.8), { free: ['s6', 's4'], paths: P, hold: ['s5'] }); hov(F, t, 1); T.sack(F, t, 2.8); } }; });

  /* ---- LB BLITZ 6: five come with Cover 6 behind it. The user is the outside one of the two walked down backers ---- */
  st('lb-blitz-6', (K, T, E, L2) => { const P = { s0: [[-7.6, -1.2], [-4, -5]] }, hov = (F, t, t0) => { const a = F.def.s6; F.def.s6 = K.along([a, [a[0], a[1] - .5], [2.4, 6.6]], E(t, t0, t0 + 1.7)); };
    return { off: 'shotgun__doubles', keysOn: 4,
      align(F, n) { if (n >= 1) ['s0', 's1', 's2', 's3'].forEach((k) => { F.def[k][0] -= 1.2; }); },
      keys: [
        (F, t) => { T.count(F, ['s0', 's1', 's2', 's5', 's3'], t, .4, .26); N(K, F, 'QUARTERS', -14, 13.4, t, 2); N(K, F, 'COVER 2', 14.4, 11, t, 2.3); },
        (F, t) => { K.showAll(F, 1, ['s6', 's10', 's9']); T.user(F, 's6', t, .3); T.rings(F, ['s10', 's9'], t, .9); N(K, F, 'the Cover 2 side first', 14, 13, t, 1.2); N(K, F, 'then back to the quarters side', -13, 13.6, t, 2.2); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6'); K.snap(F, E(t, 1.2, 3), { free: ['s0'], paths: P, hold: ['s6'] }); hov(F, t, 1.2); T.sack(F, t, 3); N(K, F, 'unblocked, away from you', -10.4, -6.4, t, 3.1); },
        (F, t) => { T.user(F, 's6'); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'), sl = K.o(F, 'WR', 1); K.snap(F, u, { hold: ['s6', 's4'] }); rb.x = K.lerp(2.9, -3.6, u); rb.y = K.lerp(-6, -3.6, u); hov(F, t, 1.2);
          K.route(F, sl, [[-9, 2.4], [-4.6, 5.2]], u, { prog: E(t, .9, 1.7), stop: .9 }); F.def.s4 = L2(F.def.s4, [-5.6, 5.6], E(t, 2.2, 3)); K.ball(F, [-5, 4.9], K.u01(t, 2.6, 3.1)); K.hit(F, [-5.2, 5.2], E(t, 3.1, 3.4)); N(K, F, 'picked up', -9, -5, t, 2); N(K, F, 'a match defender steps in front', -12.4, 9, t, 3.2); },
      ],
      adj: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 1, E(t, .5, 1.4)); shift(K, F, t, -1, 'shift away from the two backers'); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.line(F, [[-3, 3.4], [-8, 3.4]], { w: 4, prog: E(t, .4, 1.2), tip: 1 }); K.line(F, [[3, 3.4], [8, 3.4]], { w: 4, prog: E(t, .4, 1.2), tip: 1 }); N(K, F, 'slant out', 0, 5.4, t, .5); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.rings(F, ['s5', 's6'], t, .4); N(K, F, 'blitz all linebackers', 2, 6.4, t, .9); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6', t, .3); N(K, F, 'the outside one', 8.4, 5, t, .8); },
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4); },
      ],
      run(F, t) { T.user(F, 's6'); K.snap(F, E(t, 1, 2.8), { free: ['s0'], paths: P, hold: ['s6'] }); hov(F, t, 1); T.sack(F, t, 2.8); } }; });

  /* ---- the two sims out of the 3-3 swap double mug share a shape: the safety comes off the edge, the user backer hovers and gets out ---- */
  const HOV6 = (K, F, t, t0, to) => { const a = F.def.s6; F.def.s6 = K.along([a, [a[0], a[1] - .5], to || [3.4, 6.6]], K.E(t, t0, t0 + 1.7)); F.lanes.s6 = 0; };
  /* ---- SS DOG 3 ---- */
  st('ss-dog-3', (K, T, E, L2) => { const P = { s9: [[8.4, -1.2], [4.4, -5]] }, hard = (F) => { K.job(F, 's4', { zone: [-15.4, 3, 5, 2.6], zj: 'hard-flat', zk: 'flat' }); K.job(F, 's3', { zone: [15.4, 3, 5, 2.6], zj: 'hard-flat', zk: 'flat' }); };
    return { off: 'shotgun__doubles', keysOn: 3,
      align(F) { K.job(F, 's6', {}); },   /* his setup: the user backer is not blitzed, he hovers and gets out */
      keys: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6'); T.count(F, ['s0', 's5', 's2', 's9'], t, .4); const u = E(t, 2, 3.8); K.snap(F, u, { free: ['s9'], paths: P, hold: ['s6'] }); if (u > 0) { F.marks = {}; T.user(F, 's6'); } HOV6(K, F, t, 2); T.sack(F, t, 3.8); N(K, F, 'seven dropping', 0, 14, t, 4); },
        (F, t) => { K.showAll(F, 1, ['s1']); K.view(F, [-16, -10, 14, 13], E(t, .2, 1)); K.ring(F, 's1', E(t, .3, .7)); const u = E(t, 1.2, 3), sl = K.o(F, 'WR', 1); K.snap(F, u * .7, { hold: ['s1', 's6'] }); K.route(F, sl, [[-9, 2.2], [1, 4.6]], u, { prog: E(t, .9, 1.7), stop: .86 }); F.def.s1 = L2(F.def.s1, [-1.4, 4.9], E(t, 1.6, 2.8));
          K.ball(F, [-1.2, 4.3], K.u01(t, 2.5, 3)); K.hit(F, [-1.3, 4.6], E(t, 3, 3.3), 'pick'); N(K, F, 'a tackle in the three receiver hook', -4, 13, t, .8); },
        (F, t) => { K.showAll(F, 1, ['s4', 's3']); T.rings(F, ['s4', 's3'], t, .3); const u = E(t, 1.2, 3), sl = K.o(F, 'WR', 1); K.snap(F, u * .5, { hold: ['s4', 's6'] }); K.route(F, sl, [[-10, 14.6]], u, { prog: E(t, .9, 1.7) }); T.with(F, 's4', sl, u, -1.1, 1.2); N(K, F, 'matches number two vertical', -15, 17.6, t, 2.2); },
        (F, t) => { const u = E(t, 1, 2.6), rb = K.o(F, 'RB'); K.snap(F, u, { paths: { s9: [[8.4, -1.2], [6.6, -3]] }, hold: ['s6'] }); rb.x = K.lerp(2.9, 6, u); rb.y = K.lerp(-6, -3.4, u); HOV6(K, F, t, 1); N(K, F, 'seven on four behind it', 0, 13.6, t, 2.4);
          if (t > 3.2) { hard(F); K.showAll(F, 1, ['s4', 's3']); F.lanes = {}; } N(K, F, 'shade down: hard flats', 0, -8.6, t, 3.3); },
      ],
      adj: [
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6', t, .3); K.ring(F, 's9', E(t, .9, 1.3)); N(K, F, 'the same side as the blitzer', 9, 6, t, 1.1); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6'); HOV6(K, F, t, .9); N(K, F, 'hover: the tackle bites inside', 0, -8.6, t, .7); N(K, F, 'then get out', 9, 7.6, t, 2.4); },
        (F, t) => { K.showAll(F, 1, ['s4', 's3']); T.rings(F, ['s4', 's3'], t, .3); if (t > 1.8) hard(F); N(K, F, 'seam flats stay on', 0, 13.6, t, .7); N(K, F, 'or shade down to hard flats', 0, -8.6, t, 1.9); },
      ],
      run(F, t) { T.user(F, 's6'); K.snap(F, E(t, 1, 2.8), { free: ['s9'], paths: P, hold: ['s6'] }); HOV6(K, F, t, 1); T.sack(F, t, 2.8); } }; });

  /* ---- SS SIM 2 ---- */
  st('ss-sim-2', (K, T, E, L2) => { const P = { s9: [[8.6, -1.2], [4.6, -5]] };
    return { off: 'shotgun__doubles', keysOn: 3,
      /* 1 the line to the side the safety walked down on. 2 the user backer over the tackle, blitzed: he hovers, then gets out */
      align(F, n) { K.job(F, 's6', {}); if (n >= 1) ['s0', 's1', 's2', 's3'].forEach((k) => { F.def[k][0] += 1.2; }); if (n >= 2) F.def.s6 = [5.6, 2]; },
      call(F, t) { K.pre(F, E(t, .5, 1.7)); },
      keys: [
        (F, t) => { K.view(F, [-13, -10, 16, 12], E(t, .2, 1)); T.count(F, ['s0', 's2', 's3', 's9'], t, .4); const u = E(t, 2, 3.8); K.snap(F, u, { free: ['s9'], paths: P, hold: ['s6'] }); if (u > 0) F.marks = {}; HOV6(K, F, t, 2, [4.6, 6.6]); T.sack(F, t, 3.8); },
        (F, t) => { K.showAll(F, 1, ['s4', 's5', 's10']); T.rings(F, ['s4', 's5', 's10'], t, .3); N(K, F, 'seam flat', -18, 11.6, t, .6); N(K, F, 'mid read', 2, 11.4, t, .9); N(K, F, 'cloud flat', 18.6, 9.6, t, 1.2); N(K, F, 'a Cover 2 invert behind it', 0, 24.6, t, 1.8); },
        (F, t) => { T.user(F, 's6', t, .3); K.view(F, [-8, -10, 22, 13], E(t, .2, 1)); const u = E(t, 1.2, 2.9), te = K.o(F, 'TE'); K.snap(F, u * .7, { paths: P, hold: ['s6'] }); K.route(F, te, [[6, 2.4], [12.6, 3]], u, { prog: E(t, .9, 1.7), stop: .9 }); F.def.s6 = L2(F.def.s6, [11, 3.6], E(t, 1.6, 2.8)); F.lanes.s6 = 0;
          K.ball(F, [11.6, 2.9], K.u01(t, 2.4, 2.9)); K.hit(F, [11.4, 3.2], E(t, 2.9, 3.2), 'broken up'); N(K, F, 'see the hot, jump it', 13, 8, t, 3); },
        (F, t) => { K.showAll(F, 1, ['s1', 's5']); K.view(F, [-15, -10, 14, 14], E(t, .2, 1)); T.rings(F, ['s1', 's5'], t, .3); const u = E(t, 1.4, 3), te = K.o(F, 'TE'); K.snap(F, u * .7, { paths: P, hold: ['s5', 's6'] }); K.route(F, te, [[4.4, 3], [.4, 4.6]], u, { prog: E(t, 1.1, 1.9), stop: .92 }); F.def.s5 = L2(F.def.s5, [.8, 5], E(t, 1.6, 2.8)); HOV6(K, F, t, 1.4, [7.4, 6]);
          K.ball(F, [.8, 4.4], K.u01(t, 2.5, 3)); K.hit(F, [.7, 4.7], E(t, 3, 3.3), 'pick'); N(K, F, 'the tackle drops too', -9, 9.6, t, .8); },
      ],
      adj: [
        (F, t) => { K.reset(F, 0); K.pre(F, E(t, .3, 1.3)); K.view(F, [-13, -10, 16, 14], E(t, .2, 1)); if (t > 1.4) { K.toAdj(F, 1, E(t, 1.4, 2.2)); shift(K, F, t - 1, 1, 'shift the line to the safety'); } },
        (F, t) => { K.view(F, [-13, -10, 16, 12], E(t, .2, 1)); K.toAdj(F, 2, E(t, .6, 1.5)); T.user(F, 's6', t, .2); N(K, F, 'over the tackle, and blitz him', 9.4, 5.6, t, 1.5); },
        (F, t) => { K.view(F, [-13, -10, 16, 12], E(t, .2, 1)); T.user(F, 's6'); HOV6(K, F, t, .9, [4.6, 6.6]); N(K, F, 'hover: the tackle comes down inside', 2, -3.6, t, .7); N(K, F, 'then get out', 10.4, 7.6, t, 2.4); },
        (F, t) => { K.showAll(F, 1, ['s4', 's10']); T.rings(F, ['s4', 's10'], t, .3); N(K, F, 'shade down, or leave the cloud and the seam', 0, 13.6, t, .8); },
      ],
      run(F, t) { T.user(F, 's6'); K.snap(F, E(t, 1, 2.8), { free: ['s9'], paths: P, hold: ['s6'] }); HOV6(K, F, t, 1, [4.6, 6.6]); T.sack(F, t, 2.8); } }; });

  /* ---- REDZONE DT DROP: four rush, both tackles drop, man behind it ---- */
  st('redzone-dt-drop', (K, T, E, L2) => { const P = { s4: [[-8.6, -1.2], [-4.4, -5]] }, drop = (F, t, t0) => { const p = E(t, t0, t0 + 1.2); F.def.s1 = L2(F.def.s1, [-5, 5.4], p); F.def.s2 = L2(F.def.s2, [5.4, 5.4], p); F.lead = Math.min(F.lead, 1 - p); },
      go = (F, t, t0, free) => { K.snap(F, E(t, t0, t0 + 1.8), { free: free ? ['s4'] : [], paths: P, hold: ['s1', 's2', 's6'] }); drop(F, t, t0 + .5); HOV6(K, F, t, t0, [4.6, 6]); };
    return { off: 'shotgun__doubles', keysOn: 3,
      align(F) { K.job(F, 's6', {}); },   /* his setup: the user is the outside backer: hover and get out */
      keys: [
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s4', 's0', 's5', 's3'], t, .4); go(F, t, 2, true); if (t > 2) F.marks = {}; T.sack(F, t, 3.8); N(K, F, 'the nickel, unblocked', -11.4, -7.6, t, 3.9); },
        (F, t) => { T.lock(F); K.view(F, [-15, -10, 15, 14], E(t, .2, 1)); T.rings(F, ['s1', 's2'], t, .3); go(F, t, 1.2, false); const u = E(t, 1.2, 3), sl = K.o(F, 'WR', 1); K.route(F, sl, [[-10, 6], [-4.4, 10.6]], u, { prog: E(t, .9, 1.7), stop: .8 }); T.with(F, 's8', sl, u, -1.2, 1.8);
          F.def.s1 = L2(F.def.s1, [-6.2, 8.4], E(t, 2.2, 3)); K.ball(F, [-5.8, 8.8], K.u01(t, 2.6, 3.1)); K.hit(F, [-6, 8.6], E(t, 3.1, 3.4), 'knocked down'); N(K, F, 'both tackles drop', -2.6, 3.3, t, .7); },
        (F, t) => { T.lock(F); K.showAll(F, 1); T.rings(F, ['s7', 's10', 's8', 's9'], t, .4); N(K, F, 'man across the board', 0, 18.6, t, 1.2); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s6']); T.user(F, 's6', t, .3); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); K.snap(F, u * .6, { hold: ['s6', 's1', 's2'] }); K.route(F, rb, [[7.5, -6.6], [12.4, -3.6]], u, { prog: E(t, .9, 1.8) }); F.def.s6 = L2(F.def.s6, [rb.x - 1.2, rb.y + 1.8], E(t, 1.5, 3)); F.lanes.s6 = 0; N(K, F, 'whoever is uncovered: know him before the snap', 6, 9, t, .9); },
      ],
      adj: [
        (F, t) => { T.lock(F); K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6', t, .3); N(K, F, 'the outside one, beside the end', 9, 5.6, t, .8); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.user(F, 's6'); HOV6(K, F, t, .9, [4.6, 6]); N(K, F, 'hover, then get out', 10, 7.4, t, 1.2); },
      ],
      run(F, t) { T.lock(F); T.user(F, 's6'); go(F, t, 1, true); T.sack(F, t, 2.8); } }; });

  /* ---- NICKEL SIM 2: the nickel off the edge, the backside end drops out (he is the user) ---- */
  st('nickel-sim-2', (K, T, E, L2) => { const P = { s4: [[-9, -1.2], [-4.6, -5]] }, go = (F, t, t0, o) => { K.snap(F, E(t, t0, t0 + 1.8), Object.assign({ free: ['s4'], paths: P, hold: ['s3'] }, o || {})); T.out(F, 's3', t, t0, [4.6, 7]); };
    return { off: 'shotgun__doubles', keysOn: 3,
      align(F, n) { if (n >= 1) ['s0', 's1', 's2'].forEach((k) => { F.def[k][0] -= 1.3; }); },
      call(F, t) { K.pre(F, E(t, .5, 1.7)); },
      keys: [
        (F, t) => { K.view(F, [-16, -10, 13, 12], E(t, .2, 1)); T.user(F, 's3'); go(F, t, 1.2); T.sack(F, t, 3); N(K, F, 'home with four', -9.6, -6.6, t, 3.1); N(K, F, 'the backside end drops out', 10, 9.6, t, 2.2); },
        (F, t) => { T.count(F, ['s4', 's0', 's1', 's2'], t, .4); T.user(F, 's3', t, 1.8); go(F, t, 2.4); if (t > 2.4) { F.marks = {}; T.user(F, 's3'); } N(K, F, 'three in the middle, plus the deep shell', 0, 14.6, t, 4); },
        (F, t) => { K.view(F, [-16, -10, 13, 12], E(t, .2, 1)); T.user(F, 's3'); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); rb.x = K.lerp(2.9, -3.4, u); rb.y = K.lerp(-6, -3.6, u); go(F, t, 1.2, { paths: { s4: [[-8.2, 1.4], [-4.6, -1.2], [-2.6, -4]], s0: [[-9.4, -1.8]] } });
          N(K, F, 'six block four', 8, 4.6, t, 1.6); N(K, F, 'the end shoots out, the nickel loops inside', -3, -8.6, t, 2.4); K.hit(F, F.qb, E(t, 3, 3.3)); },
        (F, t) => { K.showAll(F, 1, ['s7', 's8']); K.view(F, [-27, -9.5, 4, 22], E(t, .2, 1)); const u = E(t, 1.2, 3), x = K.o(F, 'WR', 0); K.snap(F, u * .7, { paths: P, hold: ['s3'] }); K.route(F, x, [[-16.4, 9.4], [-18.4, 8]], u, { prog: E(t, .9, 1.7) });
          K.ball(F, [-18, 7.6], K.u01(t, 2.6, 3.2)); K.hit(F, [-18, 7.4], E(t, 3.2, 3.5), 'pick'); N(K, F, 'seven dropping, playing off', -12, 16, t, .7); N(K, F, 'the flat defender steps in front', -10.6, 11, t, 3.3); },
      ],
      adj: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 1, E(t, .5, 1.4)); shift(K, F, t, -1, 'slide to the nickel'); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.rings(F, ['s0', 's1', 's2'], t, .3); K.line(F, [[-8.4, 3.2], [-6.4, .4]], { w: 4, prog: E(t, .6, 1.3), tip: 1 }); N(K, F, 'crash it down', -2, 5.6, t, .8); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's3', t, .3); N(K, F, 'the backside end, away from the blitz', 7, 5.4, t, .8); },
        (F, t) => { K.showAll(F, 1, ['s7', 's9']); T.rings(F, ['s7'], t, .3); N(K, F, 'cloud flats stay on, or shade down', 0, 13.6, t, .8); },
      ],
      run(F, t) { T.user(F, 's3'); go(F, t, 1); T.sack(F, t, 2.8); } }; });

  /* ---- 2 INVERT LURK: two high before the snap, a robber after it ---- */
  st('2-invert-lurk', (K, T, E, L2) => { const sticks = (F) => { K.job(F, 's4', { zone: [-18, 16, 5, 2.6], zj: 'cloud-flat', zk: 'flat' }); K.job(F, 's10', { zone: [18, 16, 5, 2.6], zj: 'cloud-flat', zk: 'flat' }); };
    return { off: 'shotgun__doubles',
      keys: [
        (F, t) => { K.showAll(F, t < 2 ? .14 : 1); if (t < 2) F.lead = 0; T.rings(F, ['s8', 's9'], t, .4); N(K, F, 'looks like Cover 2', 0, 17.6, E(t, 2, 2.3) > 0 ? 0 : t, .9); const u = E(t, 2.2, 4); K.snap(F, u, { hold: ['s8'] }); F.def.s8 = L2(F.def.s8, [-8, 10], u); N(K, F, 'then it inverts', -1, 13.6, t, 3.6); },
        (F, t) => { K.showAll(F, 1, ['s8']); T.user(F, 's8', t, .3); const u = E(t, 1.4, 3.2), sl = K.o(F, 'WR', 1); K.snap(F, u * .5, { hold: ['s8'] }); K.route(F, sl, [[-10, 14.6]], u, { prog: E(t, 1.1, 1.9) }); F.def.s8 = L2(F.def.s8, [-9.4, 12.6], E(t, 1.8, 3)); N(K, F, 'nothing deep? get aggressive', 1.4, 17.4, t, .9); N(K, F, 'sit on the seam', -16, 15.6, t, 3); },
        (F, t) => { sticks(F); K.showAll(F, 1, ['s4', 's10']); K.view(F, [-4, -9.5, 27, 24], E(t, .2, 1)); T.rings(F, ['s10'], t, .4); const u = E(t, 1.4, 3.2), z = K.o(F, 'WR', 2); K.snap(F, u * .9, { hold: ['s8'] }); K.route(F, z, [[16.3, 10], [20.6, 16]], u, { prog: E(t, 1.1, 1.9) });
          K.ball(F, [19.8, 15.6], K.u01(t, 2.6, 3.3)); K.hit(F, [19.6, 15.8], E(t, 3.3, 3.6), 'pick'); N(K, F, 'play the sticks: the flats at sixteen', 9, 20.6, t, .9); },
        (F, t) => { T.bare(F); T.user(F, 's8'); K.view(F, [-24, -11, 8, 15], E(t, .2, 1)); const u = E(t, 1, 2.8); T.run(F, u, [[-3, -6.6], [-9, -5.6], [-12, -3.4]], -1.2, E(t, .5, 1.4)); F.def.s8 = L2(F.def.s8, [-11.4, -2.4], u); F.def.s4 = L2(F.def.s4, [-13.4, -.4], u); F.def.s0 = L2(F.def.s0, [-8, -.4], u);
          N(K, F, 'a run to your side: fly downhill', -12, 9, t, 1.2); K.hit(F, [-12, -3.4], E(t, 2.8, 3.1), 'minus three'); },
      ],
      adj: [
        (F, t) => { K.showAll(F, .14); F.lead = 0; T.rings(F, ['s8', 's9'], t, .4); N(K, F, 'it looks like normal Cover 2', 0, 17.6, t, .9); },
        (F, t) => { K.showAll(F, 1, ['s8']); T.user(F, 's8', t, .3); N(K, F, 'keep him back: it shows two high', -6, 17.6, t, .8); },
        (F, t) => { K.showAll(F, 1, ['s4', 's10']); T.rings(F, ['s4', 's10'], t, .3); N(K, F, 'shade up or down as you like', 0, 12.6, t, .8); },
        (F, t) => { if (t > .9) sticks(F); K.showAll(F, 1, ['s4', 's10']); T.rings(F, ['s4', 's10'], t, .3); N(K, F, 'coverage, then play the sticks', 0, 21, t, 1); },
      ],
      run(F, t) { T.user(F, 's8'); const u = E(t, 1, 2.8); K.snap(F, u, { hold: ['s8'] }); F.def.s8 = L2(F.def.s8, [-8, 10], u); } }; });

  /* ---- POUNDER: man under, the two safeties in quarters ---- */
  st('pounder', (K, T, E, L2) => { const cross = (F, t, t0) => { const u = E(t, t0, t0 + 1.9), sl = K.o(F, 'WR', 1); K.snap(F, u * .5, { hold: ['s8', 's9'] }); K.route(F, sl, [[-10, 7], [6, 12.4]], u, { prog: E(t, t0 - .3, t0 + .5), stop: .9 }); T.with(F, 's4', sl, u, -1.2, -.8); F.def.s9 = L2(F.def.s9, [3.4, 10.6], E(t, t0 + .6, t0 + 1.8)); F.def.s8 = L2(F.def.s8, [-7, 18], u); return u; };
    return { off: 'shotgun__doubles',
      keys: [
        (F, t) => { T.lock(F); K.showAll(F, 1); T.rings(F, ['s8', 's9'], t, .4); N(K, F, 'quarters over the top', 0, 24.6, t, .9); N(K, F, 'man under', 0, 9.6, t, 1.4); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s8', 's9']); K.line(F, [[-9, 21.6], [9, 21.6]], { w: 4, prog: E(t, .5, 1.4) }); N(K, F, 'the middle of the field', 0, 24.4, t, .9); N(K, F, 'the tight end and the slots', 0, 16.6, t, 1.6); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s9', 's8']); T.user(F, 's9', t, .3); cross(F, t, 1.4); N(K, F, 'get under the crosser', 11.6, 13.6, t, 2.8); N(K, F, 'the other safety caps the verticals', -12, 21.6, t, 3.2); },
        (F, t) => { T.lock(F); T.count(F, ['s0', 's1', 's2', 's3'], t, .4); const u = E(t, 2, 3.8); K.snap(F, u, { hold: ['s8', 's9'] }); if (u > 0) F.marks = {}; N(K, F, 'the front four still get home', 0, -9, t, 3.4); },
        (F, t) => { T.lock(F); fit(K, T, F, t, ['s8', 's9', 's5', 's6'], [.9, -.4], 'held to two'); N(K, F, 'both safeties in the run fit', 0, 15.6, t, .4); },
      ],
      adj: [
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s9', 's8']); T.user(F, 's9', t, .3); N(K, F, 'play him with quarters rules', 9, 18.4, t, .8); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s9']); T.user(F, 's9'); const a = F.def.s9.slice(); if (t < 2) F.def.s9 = L2(a, [7.4, 9.6], E(t, .6, 1.5)); else { F.def.s9 = [7.4, 9.6]; cross(F, t, 2.4); } N(K, F, 'play action: come down with him', 13, 7, t, .8); N(K, F, 'then get under the crosser', 11.6, 14.6, t, 3.6); },
      ],
      run(F, t) { T.lock(F); T.user(F, 's9'); cross(F, t, 1.1); } }; });

  /* ---- LB POP 0: the zero out of the mug ---- */
  st('lb-pop-0', (K, T, E, L2) => { const P = { s4: [[-8.6, -1.2], [-4.4, -5]], s6: [[2.6, -1.2], [1.4, -4.4]] }, hov = (F, t, t0) => { const a = F.def.s5; F.def.s5 = K.along([a, [a[0], a[1] - .5], [-1.4, 5.4]], E(t, t0, t0 + 1.6)); F.lanes.s5 = 0; };
    return { off: 'shotgun__doubles', keysOn: 4,
      align(F, n) { if (n >= 1) ['s0', 's1', 's2', 's3'].forEach((k) => { F.def[k][0] += 1.2; }); if (n >= 2) { K.job(F, 's5', { rush: 1 }); K.job(F, 's6', { rush: 1 }); } },
      keys: [
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.user(F, 's5'); K.snap(F, E(t, 1.2, 3), { free: ['s4', 's6'], paths: P, hold: ['s5'] }); hov(F, t, 1.2); T.sack(F, t, 3); N(K, F, 'two free runners', 0, 8, t, 3.1); },
        (F, t) => { T.lock(F); K.view(F, [-15, -10, 11, 11], E(t, .2, 1)); T.count(F, ['s4', 's0', 's1'], t, .4); ['LT', 'LG'].forEach((p, j) => K.omark(F, K.o(F, p), { ring: E(t, 1.5 + j * .2, 1.9 + j * .2) })); N(K, F, 'three on two', -10, 5.6, t, 2);
          const u = E(t, 2.6, 4.2); K.snap(F, u, { free: ['s4'], paths: P, hold: ['s5'] }); if (u > 0) { F.marks = {}; F.omarks = {}; } hov(F, t, 2.6); T.sack(F, t, 4.2); N(K, F, 'half a second', 9.5, -5.4, t, 4.3); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s5']); T.user(F, 's5', t, .3); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); K.snap(F, u * .6, { hold: ['s5'] }); F.lanes.s5 = 0; K.route(F, rb, [[-2, -6.6], [-8, -3.6]], u, { prog: E(t, .9, 1.8) }); F.def.s5 = L2(F.def.s5, [rb.x + 1.2, rb.y + 1.8], E(t, 1.5, 3)); N(K, F, 'the back goes out: go with him', -10.4, 3, t, 2.2); },
        (F, t) => { T.lock(F); K.showAll(F, 1); K.view(F, [-8, -10, 24, 14], E(t, .2, 1)); const u = E(t, 1.2, 3), z = K.o(F, 'WR', 2); K.snap(F, u * .7, { paths: P, hold: ['s5', 's10'] }); K.route(F, z, [[16.3, 3.4], [5, 6]], u, { prog: E(t, .9, 1.7), stop: .8 }); F.def.s10 = L2(F.def.s10, [7.6, 6.4], E(t, 1.6, 2.9));
          K.ball(F, [7.2, 5.6], K.u01(t, 2.5, 3)); K.hit(F, [7.4, 5.9], E(t, 3, 3.3), 'pick six'); N(K, F, 'man across the board: the corners have to win', 8, 11.6, t, .7); },
      ],
      adj: [
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 1, E(t, .5, 1.4)); shift(K, F, t, 1, 'shift away from the nickel'); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 2, E(t, .2, 1)); T.rings(F, ['s5', 's6'], t, .5); N(K, F, 'blitz all linebackers', 2, 6, t, .9); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.user(F, 's5', t, .3); N(K, F, 'the nickel side linebacker', -8.4, 6, t, .8); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.user(F, 's5'); hov(F, t, .9); N(K, F, 'hover, then get out: you have the back', 4, 8, t, 1.2); },
        (F, t) => { T.lock(F); K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4); },
      ],
      run(F, t) { T.lock(F); T.user(F, 's5'); K.snap(F, E(t, 1, 2.8), { free: ['s4', 's6'], paths: P, hold: ['s5'] }); hov(F, t, 1); T.sack(F, t, 2.8); } }; });

  /* ---- BLITZ LOOP 3: five over three. With all linebackers blitzed the user is the outside backer, who hovers and gets
     out into the three receiver hook, and the inside backer is the looper up the middle (his setup; the game's art alone
     has it the other way round) ---- */
  st('blitz-loop-3', (K, T, E, L2) => { const P = { s4: [[-9.6, -1.2], [-4.6, -5]], s5: [[.4, .6], [.2, -2.4]] }, hov = (F, t, t0) => { const a = F.def.s6; F.def.s6 = K.along([a, [a[0], a[1] - .5], [1.4, 7.4]], E(t, t0, t0 + 1.7)); F.lead = 0; };
    return { off: 'shotgun__doubles', keysOn: 4,
      align(F, n) { if (n >= 1) ['s0', 's1', 's2'].forEach((k) => { F.def[k][0] -= 1.2; }); if (n >= 2) K.job(F, 's5', { rush: 1 }); if (n >= 3) K.job(F, 's6', { zone: [0, 9.6, 5, 2.7], zj: 'rec-hook', zk: 'hook' }); },
      keys: [
        (F, t) => { K.view(F, [-15, -10, 11, 11], E(t, .2, 1)); T.count(F, ['s4', 's0', 's1', 's2', 's5'], t, .4, .24); ['LT', 'LG', 'C'].forEach((p, j) => K.omark(F, K.o(F, p), { ring: E(t, 1.8 + j * .2, 2.2 + j * .2) })); N(K, F, 'five on three', -10, 6, t, 2.5);
          const u = E(t, 3, 4.7); K.snap(F, u, { free: ['s4', 's5'], paths: P, hold: ['s6'] }); if (u > 0) { F.marks = {}; F.omarks = {}; } hov(F, t, 3); T.sack(F, t, 4.7); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); K.route(F, rb, [[7.5, -6.6], [12, -4]], u, { prog: E(t, .9, 1.7) }); K.snap(F, u, { free: ['s4', 's5'], paths: P, hold: ['s6'] }); hov(F, t, 1.2); T.sack(F, t, 3); N(K, F, 'the back goes out: it is in every time', 2, 9, t, 3.1); },
        (F, t) => { K.showAll(F, 1, ['s8', 's3']); T.rings(F, ['s8', 's3'], t, .3); const u = E(t, 1.2, 3), sl = K.o(F, 'WR', 1); K.snap(F, u * .5, { hold: ['s8', 's6'] }); K.route(F, sl, [[-10, 14.6]], u, { prog: E(t, .9, 1.7) }); T.with(F, 's8', sl, u, -1.1, 1.2); N(K, F, 'the seam flats match the vertical', -13, 18, t, 2.2); N(K, F, 'short yardage: shade down to hard flats', 0, -8.6, t, 3); },
        (F, t) => { K.showAll(F, 1, ['s6']); T.user(F, 's6', t, .3); const u = E(t, 1.2, 3), te = K.o(F, 'TE'); K.snap(F, u * .7, { paths: P, hold: ['s6'] }); K.route(F, te, [[5.4, 11]], u, { prog: E(t, .9, 1.7) }); F.def.s6 = K.along([F.def.s6, [3, 1.2], [1.4, 7.4], [4.6, 9]], E(t, 1.2, 3)); F.lead = 0;
          K.ball(F, [4.9, 8.6], K.u01(t, 2.6, 3.1)); K.hit(F, [4.8, 8.8], E(t, 3.1, 3.4)); N(K, F, 'the only help in the middle', -9, 16, t, .8); N(K, F, 'quick up the seam: step in front', 13, 13, t, 3.2); },
      ],
      adj: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 1, E(t, .5, 1.4)); shift(K, F, t, -1, 'shift to the blitz side'); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 2, E(t, .2, 1)); T.rings(F, ['s5', 's6'], t, .5); N(K, F, 'blitz all linebackers', 2, 6, t, .9); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 3, E(t, .4, 1.2)); T.user(F, 's6', t, .3); N(K, F, 'the outside one. Leave the inside one', 9, 6, t, .9); },
        (F, t) => { K.showAll(F, 1, ['s8', 's3']); T.rings(F, ['s8', 's3'], t, .3); N(K, F, 'seam flats on. Short yardage: hard flats', 0, 14, t, .8); },
      ],
      run(F, t) { T.user(F, 's6'); K.snap(F, E(t, 1, 2.8), { free: ['s4', 's5'], paths: P, hold: ['s6'] }); hov(F, t, 1); T.sack(F, t, 2.8); } }; });

})();
