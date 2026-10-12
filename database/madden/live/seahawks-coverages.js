/* live/seahawks-coverages.js: the live play staging for the Seahawks Advanced Coverages install (live-play.js draws it).
   STAGING ONLY: what the field does for each key and each adjustment of each call. Every word on the page stays his.
   Each call's staging follows his own breakdown of it (Seahawks Assets/Advanced Transcripts.txt): who comes free, who
   drops, what the user does, what it looks like against the run. The jobs and the spots are the game's play art.
   Men are s0..s10 in the game's slot order for that front. Coffee House 3 Seam has no breakdown yet, so it keeps the
   still card. */
(function () {
  if (!window.skLive) return;
  const SCHEME = 'seahawks-coverages', stage = (id, fn) => skLive.stage(SCHEME, id, fn);
  skLive.alias(SCHEME, 'seahawks');   /* this install carries the Nickel calls: their staging is the Nickel's */
  const OL = /^(LT|LG|C|RG|RT)$/;
  /* the moves every call shares */
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

  /* ================= EDGE BLITZ 3 and EDGE BLITZ 2 (3 High Penny): the same blitz with two shells ================= */
  const edgeBlitz = (two) => (K) => { const { E, L2, RED, WHITE } = K, T = tools(K), BOX = [-14, -10, 14, 12];
    const loop = { s6: [[1.5, 1.5], [1.2, -1.4]], s3: [[7.4, -1.3]] };
    const looper = (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.ring(F, 's6', E(t, .3, .7) * (1 - E(t, 1.1, 1.3))); K.note(F, 'everybody crashes inside', -8.6, 4.2, E(t, .5, .8) * (1 - E(t, 2.6, 2.9)));
      const u = E(t, 1.3, 3); K.snap(F, u, { free: ['s6'], paths: loop }); T.tackles(F, u); T.sack(F, t, 3); K.note(F, 'up Main Street', 6.2, -5.4, E(t, 3.1, 3.4)); };
    const runFit = (F, t) => { T.bare(F); K.view(F, BOX, E(t, .2, 1)); const u = E(t, 1, 2.6); T.run(F, u, [[1.4, -3.6], [.8, -1.6]], 0, E(t, .5, 1.3));
      F.def.s6 = K.along([F.def.s6, [1.5, 1.4], [1, -1]], u); F.def.s8 = L2(F.def.s8, [-3.2, 2.2], u); F.def.s9 = L2(F.def.s9, [3.8, 2.2], u); if (!two) F.def.s4 = L2(F.def.s4, [.2, 4.4], u * .8);
      K.note(F, two ? 'the safeties come down' : 'three safeties in the box', 0, 10.6, E(t, .4, .7)); K.hit(F, [.9, -1.5], E(t, 2.6, 2.9), 'no gain'); K.note(F, 'the looper fills', 7.6, -3.6, E(t, 2.8, 3.1)); };
    return {
      off: 'shotgun__doubles', keysOn: 2,
      /* 1 show blitz: the safeties and the middle linebacker walk down. 2 the line pinches */
      align(F, n) { if (n >= 1) { F.def.s6 = [.5, 2.8]; F.def.s8 = [-7, 7.6]; F.def.s9 = [7, 7.6]; F.def.s4 = [0, 8.6]; } if (n >= 2) { F.def.s0[0] = -2.2; F.def.s2[0] = 2.3; F.def.s3[0] = 5.4; F.def.s5[0] = -5.4; } },
      keys: two ? [
        looper,
        /* they pinch the protection inside to stop the looper, and the edge walks in */
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); const u = E(t, 1.2, 2.9); K.snap(F, u, { free: ['s3'], paths: { s3: [[6.6, -1.4]], s6: [[1.3, 1.4], [1.1, -.9]] } }); K.note(F, 'they pinch inside for the looper', -1, 5.2, E(t, .5, .8) * (1 - E(t, 2.6, 2.9))); T.sack(F, t, 2.9); K.note(F, 'the edge is free', 9.6, -3.4, E(t, 3, 3.3)); },
        /* soft squats: number one goes deep, he matches him, and the half safety is over the top */
        (F, t) => { K.showAll(F, 1, ['s7', 's10', 's8', 's9']); K.view(F, [-6, -9.5, 27, 24], E(t, .2, 1)); K.ring(F, 's10', E(t, .4, .8)); const u = E(t, 1.2, 3.1), wr = K.o(F, 'WR', 2); K.snap(F, u * .5, { hold: ['s10', 's9'] });
          K.route(F, wr, [[17.3, 18.4]], u, { prog: E(t, .9, 1.8) }); T.with(F, 's10', wr, u, -.9, 1.2); F.def.s9 = L2(F.def.s9, [14.8, 20], u); K.ball(F, [17.2, 17.6], K.u01(t, 2.4, 3.2)); K.hit(F, [17, 18], E(t, 3.2, 3.5));
          K.note(F, 'matches number one deep', 8.6, 10.6, E(t, 1.6, 1.9)); K.note(F, 'a double at the catch point', 8.4, 22, E(t, 3.3, 3.6)); },
        /* the user is the middle safety in the vert hook */
        (F, t) => { K.showAll(F, 1, ['s4', 's5']); T.user(F, 's4', t, .3); const u = E(t, 1.2, 3), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s4'] }); K.route(F, te, [[5.6, 14.6]], u, { prog: E(t, .9, 1.8) }); T.with(F, 's4', te, u, -1, 1.4); K.note(F, 'match it across the field', -6.5, 16.4, E(t, 2.4, 2.7)); },
        runFit,
      ] : [
        /* 1 three high before the snap */
        (F, t) => { K.reset(F, 0); K.view(F, [-21, -8, 21, 29], E(t, .2, 1)); T.rings(F, ['s8', 's4', 's9'], t, .5); K.note(F, 'three high', 0, 25, E(t, 1.2, 1.5)); K.note(F, 'a picture they do not see', 0, 27.6, E(t, 1.8, 2.1)); },
        looper,
        /* 3 the looper drags the line out of place and a tackle loops in behind him */
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); const u = E(t, 1.2, 3); K.snap(F, u, { free: ['s6', 's1'], paths: { s6: [[-1.5, 1.4], [-1.3, -1.6]], s1: [[1.5, .4], [1.2, -1.8]], s3: [[7.4, -1.3]] } }); T.tackles(F, u);
          K.note(F, 'two loopers in the A gap', 0, 5.4, E(t, .5, .8) * (1 - E(t, 2.6, 2.9))); T.sack(F, t, 3); K.note(F, 'or the edge comes free', 7.6, 3.8, E(t, 3.3, 3.6)); },
        /* 4 the flats match the vertical, the hook steps in front, the user plays the deep middle */
        (F, t) => { K.showAll(F, 1, ['s5', 's9', 's4', 's8']); T.user(F, 's8', t, .3); const u = E(t, 1.2, 3.2), sl = K.o(F, 'WR', 1), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s5', 's4', 's8'] });
          K.route(F, sl, [[-10, 15.4]], u, { prog: E(t, .9, 1.8) }); T.with(F, 's5', sl, u, 1.3, 1); F.def.s8 = L2(F.def.s8, [0, 17.4], u); K.route(F, te, [[5, 5.2], [1.4, 6.2]], u, { prog: E(t, .9, 1.8) });
          F.def.s4 = L2(F.def.s4, [1.5, 6.9], E(t, 2.3, 3.1)); K.ball(F, [1.5, 6.5], K.u01(t, 2.6, 3.2)); K.hit(F, [1.5, 6.6], E(t, 3.2, 3.5)); K.note(F, 'matches the vertical', -16.8, 12.6, E(t, 1.9, 2.2)); K.note(F, 'steps in front', 8.6, 8.4, E(t, 3.3, 3.6)); },
        runFit,
      ],
      adj: [
        (F, t) => { const a = K.frame(0).def, u = E(t, .5, 1.5); K.toAdj(F, 1, u); ['s8', 's4', 's9', 's6'].forEach((k) => K.line(F, [a[k], F.def[k]], { col: WHITE, dash: [4, 6], w: 2, a: .6 })); K.note(F, 'show blitz', 0, 12.6, E(t, .4, .7)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 2, E(t, .5, 1.4)); K.line(F, [[-7.4, 3.4], [-3.6, 3.4]], { w: 4, prog: E(t, .4, 1.2), tip: 1 }); K.line(F, [[7.6, 3.4], [3.8, 3.4]], { w: 4, prog: E(t, .4, 1.2), tip: 1 }); K.note(F, 'pinch', 0, 5.2, E(t, .5, .8)); },
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4, 6.6); },
        two ? (F, t) => { K.showAll(F, 1, ['s4']); T.user(F, 's4', t, .3); K.note(F, 'the vert hook', 6.5, 11, E(t, .8, 1.1)); }
          : (F, t) => { K.showAll(F, 1, ['s8', 's4']); T.user(F, 's8', t, .3); K.ring(F, 's4', E(t, 1.1, 1.5)); K.note(F, 'the deep middle', -9.5, 16.8, E(t, .8, 1.1)); K.note(F, 'or the three receiver hook', 9.4, 11.4, E(t, 1.4, 1.7)); },
        two ? (F, t) => { K.showAll(F, 1, ['s7', 's10']); T.rings(F, ['s7', 's10'], t, .4); K.note(F, 'soft squats: leave them, or shade', 0, 12.4, E(t, .9, 1.2)); }
          : (F, t) => { K.showAll(F, 1, ['s5', 's9']); T.rings(F, ['s5', 's9'], t, .4); K.note(F, 'leave the flats on, or shade', 0, 12.4, E(t, .9, 1.2)); },
      ],
      run(F, t) { T.user(F, two ? 's4' : 's8'); const u = E(t, 1, 2.8); K.snap(F, u, { free: ['s6'], paths: loop }); T.tackles(F, u); T.sack(F, t, 2.8); },
    }; };
  stage('edge-blitz-3', edgeBlitz(false));
  stage('edge-blitz-2', edgeBlitz(true));

  /* ================= FS WILL BLITZ 0 (Nickel 2-4): the zero with the picket fence ================= */
  stage('fs-will-blitz-0', (K) => { const { E, L2, RED } = K, T = tools(K), BOX = [-14, -10, 14, 11];
    const edge = (F) => { F.def.s6 = [7, 2.1]; K.job(F, 's6', { rush: 1 }); F.lanes.s6 = 1; };      /* the second walk down guy, on the edge */
    const free = { free: ['s8', 's6'], paths: { s8: [[-7.6, -1.4], [-4.2, -5]], s6: [[7, -1.4], [3.8, -5]] }, hold: ['s5'] };
    const hover = (F, t, t0, to) => { const a = F.def.s5; F.def.s5 = K.along([a, [a[0], a[1] - .7], to || [2.4, 5.2]], E(t, t0, t0 + 1.6)); F.lanes.s5 = 0; };
    return {
      off: 'shotgun__doubles', keysOn: 5,
      /* 1 the line pinches, the tackles into the A gaps. 2 the user linebacker down over the center. 4 he is blitzed too */
      align(F, n) { if (n >= 1) { F.def.s0[0] = -4.7; F.def.s1[0] = -1; F.def.s2[0] = 1.1; F.def.s3[0] = 4.9; } if (n >= 2) F.def.s5 = [0, 2.7]; if (n >= 4) K.job(F, 's5', { rush: 1 }); },
      keys: [
        (F, t) => { K.view(F, [-11, -9, 11, 9], E(t, .2, 1)); T.rings(F, ['s1', 's2'], t, .4); T.user(F, 's5', t, .9); K.note(F, 'both A gaps', 0, -3.4, E(t, 1.2, 1.5)); },
        /* the safety and the second walk down guy come down: six across */
        (F, t) => { K.view(F, [-15, -9, 15, 12], E(t, .2, 1)); K.pre(F, E(t, .3, 1.3), ['s8']); const w = E(t, .5, 1.4), a = F.def.s6.slice(); edge(F); F.def.s6 = L2(a, [7, 2.1], w);
          T.count(F, ['s8', 's0', 's1', 's2', 's3', 's6'], t, 1.6, .26); K.line(F, [[-9.6, 3.6], [8.2, 3.6]], { w: 4, dash: [9, 7], prog: E(t, 3.2, 4) }); K.note(F, 'a picket fence', 0, 6.6, E(t, 3.6, 3.9)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); edge(F); T.user(F, 's5'); const u = E(t, 1.1, 2.9); K.snap(F, u, free); hover(F, t, 1.1); T.sack(F, t, 2.9); K.note(F, 'two free off the edge', 0, 8.4, E(t, 3, 3.3)); },
        /* zero man: the user has the back, and when the back blocks he is free */
        (F, t) => { edge(F); T.lock(F); K.showAll(F, 1); T.user(F, 's5', t, .3); const u = E(t, 1.2, 3), rb = K.o(F, 'RB'); K.snap(F, u * .6, { hold: ['s5'] }); F.lanes.s5 = 0; K.route(F, rb, [[7.5, -6.6], [12.4, -3.6]], u, { prog: E(t, .9, 1.8) });
          F.def.s5 = L2(F.def.s5, [rb.x - 1.2, rb.y + 1.8], E(t, 1.5, 3)); K.note(F, 'you have the back', 12.6, 3.2, E(t, 2.2, 2.5)); K.note(F, 'he blocks: help over the middle', 0, 11.6, E(t, 3.2, 3.5)); },
        /* the edges are set: a perimeter run has nowhere to go */
        (F, t) => { edge(F); T.bare(F); K.view(F, [-8, -11, 22, 10], E(t, .2, 1)); const u = E(t, 1, 2.8); T.run(F, u, [[6.4, -6.6], [11, -5.4], [12.8, -3.6]], 1.2, E(t, .5, 1.4));
          F.def.s6 = L2([7, 2.1], [10.2, -.8], u); F.def.s3 = L2(F.def.s3, [7.4, -.4], u); F.def.s9 = L2(F.def.s9, [12.6, 2.6], u); F.def.s2 = L2(F.def.s2, [3.4, .2], u);
          K.note(F, 'sets too hard an edge', 16.6, 5.4, E(t, 1.4, 1.7)); K.hit(F, [12.6, -3.6], E(t, 2.8, 3.1), 'no edge'); K.note(F, 'I form lead downhill: not this call', 6, -9.6, E(t, 3.4, 3.7), RED); },
      ],
      adj: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 1, E(t, .5, 1.4)); K.line(F, [[-8.4, 3.4], [-4.2, 3.4]], { w: 4, prog: E(t, .4, 1.2), tip: 1 }); K.line(F, [[8.4, 3.4], [4.4, 3.4]], { w: 4, prog: E(t, .4, 1.2), tip: 1 }); K.note(F, 'pinch', 0, 7, E(t, .5, .8)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 2, E(t, .6, 1.5)); T.user(F, 's5', t, .2); K.note(F, 'down over the center', 0, -3.6, E(t, 1.5, 1.8)); },
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4, 7); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 4, E(t, .3, 1.2)); T.user(F, 's5'); K.note(F, 'it holds the center', 0, -8.4, E(t, 1.2, 1.5)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.lock(F); K.showAll(F, 1, ['s5']); T.user(F, 's5'); hover(F, t, .8, [-.2, 7]); K.note(F, 'hover', -3.6, 1.2, E(t, .8, 1.1) * (1 - E(t, 1.6, 1.9))); K.note(F, 'then get out', -7.6, 8, E(t, 2.2, 2.5)); },
      ],
      run(F, t) { edge(F); T.user(F, 's5'); const u = E(t, 1, 2.8); K.snap(F, u, free); hover(F, t, 1); T.sack(F, t, 2.8); },
    }; });

  /* ================= BRACKET 9 SWITCH (Nickel 2-4): half man, half match ================= */
  stage('bracket-9-switch', (K) => { const { E, L2, RED, MAN } = K, T = tools(K);
    /* who the man side is on: the corner on number one, the nickel and the safety both on the slot */
    const cover = (F) => { const w = F.off.filter((o) => o.p === 'WR' && o.x < -3).sort((a, b) => a.x - b.x); F.cov = {}; if (w[0]) F.cov.s7 = w[0]; if (w[1]) { F.cov.s4 = w[1]; F.cov.s8 = w[1]; } K.showAll(F, 1); };
    const verts = (F, t, t0) => { const u = E(t, t0, t0 + 1.9), p = E(t, t0 - .3, t0 + .6), x = K.o(F, 'WR', 0), sl = K.o(F, 'WR', 1), z = K.o(F, 'WR', 2), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s9', 's10'] });
      K.route(F, x, [[-16.6, 15]], u, { prog: p }); K.route(F, sl, [[-10, 14]], u, { prog: p }); K.route(F, te, [[5.4, 14]], u, { prog: p }); K.route(F, z, [[16.8, 15]], u, { prog: p });
      T.with(F, 's7', x, u, .9, 1.2); T.with(F, 's4', sl, u, .8, -1.3); T.with(F, 's8', sl, u, -.7, 2.2); T.with(F, 's9', te, u, .8, 2); T.with(F, 's10', z, u, -.9, 1.6); return u; };
    /* three to one side: it comes out with the man side on them, so it gets flipped */
    const flip = (name, word) => (F, t) => { K.toOff(F, name, E(t, .3, 1.1)); cover(F); const u = E(t, 2.2, 3); K.flip(F, u); K.note(F, 'the man side is on them', 12, 12.6, E(t, 1.2, 1.5) * (1 - E(t, 2, 2.3)), RED); K.note(F, 'flip it', 0, -8.6, E(t, 1.6, 1.9) * (1 - E(t, 2.8, 3.1)), RED);
      K.note(F, word, 12.6, 12.6, E(t, 3, 3.3)); K.note(F, 'man on the back side', -14.2, 12.6, E(t, 3.3, 3.6), MAN); };
    return {
      off: 'shotgun__doubles',
      call(F) { cover(F); },
      keys: [
        (F, t) => { cover(F); K.line(F, [[-4.4, -3], [-4.4, 23]], { w: 3, dash: [10, 9], prog: E(t, .3, 1.2) }); K.note(F, 'MAN', -13.6, 18.4, E(t, 1, 1.3), MAN); K.note(F, 'MATCH', 14.6, 15, E(t, 1.3, 1.6)); K.ring(F, 's5', E(t, 1.9, 2.3)); K.note(F, 'looks for the drag', -.4, 13.2, E(t, 2.2, 2.5)); },
        (F, t) => { cover(F); K.note(F, 'two by two: leave it', 0, -8.6, E(t, .4, .7)); verts(F, t, 1.3); K.note(F, 'man', -13.4, 9.6, E(t, 1.4, 1.7), MAN); K.note(F, 'Quarters', 11.4, 9.6, E(t, 1.6, 1.9)); },
        flip('shotgun__trips', 'match to the trips: Palms'),
        /* the user is the safety doubled on the slot: the nickel has the slot, so he is free */
        (F, t) => { cover(F); T.user(F, 's8', t, .3); const u = E(t, 1.3, 3.2), sl = K.o(F, 'WR', 1), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s9', 's10', 's5'] }); K.route(F, sl, [[-10, 13]], u, { prog: E(t, 1, 1.9) }); T.with(F, 's4', sl, u, .8, -1.3);
          K.route(F, te, [[4.6, 3.4], [-6.4, 4.8]], u, { prog: E(t, 1, 1.9), stop: .86 }); F.def.s8 = L2(F.def.s8, [-4.6, 5.8], E(t, 2.2, 3.1)); K.ball(F, [-4.4, 4.9], K.u01(t, 2.6, 3.2)); K.hit(F, [-4.5, 5.1], E(t, 3.2, 3.5));
          K.note(F, 'the nickel has him down low', -18.4, 11.4, E(t, 1.5, 1.8)); K.note(F, 'see the drag, drive on it', 1, 13.4, E(t, 3.3, 3.6)); },
        /* everybody in man is in the run fit: the corner fires down */
        (F, t) => { cover(F); T.bare(F); K.view(F, [-24, -10, 12, 16], E(t, .2, 1)); const u = E(t, 1, 2.8); T.run(F, u, [[-1.2, -5.2], [-5.6, -3.2], [-7.6, -1]], -1.2, E(t, .5, 1.4));
          F.def.s7 = L2(F.def.s7, [-9.8, -.2], u); F.def.s8 = L2(F.def.s8, [-6.4, 2], u); F.def.s4 = L2(F.def.s4, [-8.8, 1.2], u); F.def.s5 = L2(F.def.s5, [-4.2, 1.4], u); F.def.s0 = L2(F.def.s0, [-6.6, -.2], u);
          K.note(F, 'the corner fires down', -17.6, 10.6, E(t, 1.2, 1.5)); K.hit(F, [-7.8, -1], E(t, 2.8, 3.1), 'blown up'); },
      ],
      adj: [
        (F, t) => { cover(F); K.note(F, 'nothing to set', 0, -8.6, E(t, .4, .7)); },
        (F, t) => { K.toOff(F, 'iform__pro', E(t, .4, 1.3)); cover(F); K.note(F, 'I form: leave it', 0, 13, E(t, 1.3, 1.6)); },
        flip('shotgun__trips', 'match to the trips'),
        flip('shotgun__bunch', 'match to the bunch'),
        (F, t) => { cover(F); K.showAll(F, 1, ['s8', 's4']); T.user(F, 's8', t, .3); K.note(F, 'doubled up over the slot', -9, 17, E(t, .8, 1.1)); },
      ],
      run(F, t) { cover(F); T.user(F, 's8'); const u = verts(F, t, 1.1); F.def.s8 = L2(F.def.s8, [-3.4, 10.6], E(t, 2, 3)); K.note(F, 'boxed', -14, 18.6, E(t, 2.8, 3.1)); K.note(F, 'boxed', 11.2, 18.6, E(t, 3, 3.3)); },
    }; });

  /* ================= RUN D MACRO (Cover 4 Quarters with his custom macro) ================= */
  stage('run-d-macro', (K) => { const { E, L2, RED, WHITE } = K, T = tools(K);
    const iso = (F, t, t0) => { const u = E(t, t0, t0 + 1.7); T.run(F, u, [[1.6, -4.4], [4.4, -1.4], [6.2, .6]], .8, E(t, t0 - .4, t0 + .4)); const fb = K.o(F, 'FB'); if (fb) { fb.x = K.lerp(0, 3.8, u); fb.y = K.lerp(-4.7, .2, u); } return u; };
    return {
      off: 'iform__pro', keysOn: 4,
      /* 2 the macro is on: the corners are soft squats, down in the run fit */
      align(F, n) { if (n >= 2) { F.def.s7 = [-17.6, 5.4]; F.def.s10 = [17.6, 5.4]; K.job(F, 's7', { zone: [-18.2, 5.6, 5, 2.6], zj: 'soft-squat' }); K.job(F, 's10', { zone: [18.2, 5.6, 5, 2.6], zj: 'soft-squat' }); } },
      keys: [
        /* without it the corner backpedals; with it he drives on the football */
        (F, t) => { T.bare(F, .2); F.zones.s10 = 1; K.view(F, [-8, -10, 25, 15], E(t, .2, 1)); K.ring(F, 's10', E(t, .3, .7)); K.line(F, [[18.6, 6.4], [18.6, 11.6]], { col: RED, w: 3, dash: [6, 6], prog: E(t, .6, 1.3), tip: 1, a: .9 }); K.note(F, 'without it: he backpedals', 15.4, 13.2, E(t, .9, 1.2), RED);
          const u = iso(F, t, 1.9); F.def.s10 = K.along([[17.6, 5.4], [13, 3.4], [8.6, 1.4]], u); F.def.s6 = L2(F.def.s6, [5.2, 1.8], u); F.def.s9 = L2(F.def.s9, [8, 4.4], u); K.note(F, 'with it: he drives down', 17.4, -2, E(t, 2.6, 2.9)); K.hit(F, [6.2, .6], E(t, 3.6, 3.9)); },
        (F, t) => { T.bare(F, .12); K.view(F, [-21, -10, 21, 17], E(t, .2, 1)); const u = E(t, 1, 2.7); T.run(F, u, [[.4, -3.4], [.9, -1]], 0, E(t, .5, 1.3)); T.flow(F, ['s5', 's6', 's4', 's8', 's9', 's7', 's10'], [.9, .2], u * .86); K.note(F, 'everybody downhill', 0, 13.4, E(t, .5, .8)); K.hit(F, [.9, -1.1], E(t, 2.7, 3), 'no gain'); },
        /* the down and distance he is playing for */
        (F, t) => { T.bare(F, .12); const u = E(t, .9, 1.9); T.run(F, u, [[.6, -4], [1.2, -2.4]], 0, E(t, .5, 1.2)); T.flow(F, ['s5', 's6', 's1', 's2'], [1.2, -2.2], u * .8);
          K.note(F, '1st and 10', -15, 16, E(t, .3, .6)); K.hit(F, [1.2, -2.5], E(t, 1.9, 2.2), 'minus two'); K.note(F, '2nd and 12', -15, 13.6, E(t, 2.4, 2.7)); K.note(F, '3rd and 10: now he has to throw', -9.2, 11.2, E(t, 3.1, 3.4)); },
        /* the soft squat on a pass: number one vertical, he runs with him; number one in, he has the flat */
        (F, t) => { K.showAll(F, 1, ['s7', 's10']); T.rings(F, ['s10', 's7'], t, .3); const u = E(t, 1.2, 3.1), z = K.o(F, 'WR', 1), x = K.o(F, 'WR', 0); K.snap(F, u * .5, { hold: ['s7', 's10'] }); K.route(F, z, [[16.8, 17]], u, { prog: E(t, .9, 1.8) }); T.with(F, 's10', z, u, -.9, 1.4);
          K.route(F, x, [[-16, 6.2], [-8.6, 6.8]], u, { prog: E(t, .9, 1.8) }); K.note(F, 'one goes vertical: he matches him', 10.4, 12.2, E(t, 2, 2.3)); K.note(F, 'one goes in: he has the flat', -13.4, 10, E(t, 2.6, 2.9)); },
        /* slot to the flat, number one deep: the squat jumps the out and the streak is loose unless the user sees it */
        (F, t) => { K.toOff(F, 'shotgun__doubles', 1); K.showAll(F, 1, ['s7', 's8']); K.view(F, [-27, -9.5, 8, 24], E(t, .2, 1)); const u = E(t, 1, 2.8), x = K.o(F, 'WR', 0), sl = K.o(F, 'WR', 1); K.snap(F, u * .5, { hold: ['s7', 's8', 's4'] });
          K.route(F, sl, [[-10.4, 2.6], [-16.4, 3.4]], u, { prog: E(t, .7, 1.6) }); K.route(F, x, [[-16.8, 18.4]], u, { prog: E(t, .7, 1.6) }); F.def.s7 = L2([-17.6, 5.4], [-15.6, 4.4], u);
          K.note(F, 'he jumps the out', -21, 7.4, E(t, 1.8, 2.1)); K.note(F, 'nobody has the streak', -13.6, 21.6, E(t, 2.6, 2.9) * (1 - E(t, 3.8, 4.1)), RED); T.user(F, 's8', t, 3.2); F.def.s8 = L2(F.def.s8, [-15.4, 17.8], E(t, 3.4, 4.3)); K.note(F, 'the user sees it and jumps it', -8, 13.2, E(t, 4.2, 4.5)); },
      ],
      adj: [
        (F, t) => { K.note(F, 'Cover 4 Quarters, or Palms', -14, 13.6, E(t, .4, .7)); },
        (F, t) => { K.toAdj(F, 2, E(t, .6, 1.5)); T.rings(F, ['s7', 's10'], t, .3); K.note(F, 'L1: the macro', 0, 13.6, E(t, .4, .7)); },
        (F, t) => { K.showAll(F, 1, ['s7', 's10']); T.rings(F, ['s7', 's10'], t, .3); K.note(F, 'soft squat', -18, 9.4, E(t, .7, 1)); K.note(F, 'soft squat', 18, 9.4, E(t, .9, 1.2)); K.note(F, 'both in the run fit', 0, 12.6, E(t, 1.4, 1.7)); },
        (F, t) => { T.user(F, 's9', t, .3); F.def.s9 = L2(F.def.s9, [7.6, 10], E(t, .8, 1.7)); K.note(F, 'be super aggressive', 8.4, 16.6, E(t, 1.2, 1.5)); },
      ],
      run(F, t) { T.bare(F, .15); T.user(F, 's9'); const u = iso(F, t, 1); F.def.s10 = K.along([[17.6, 5.4], [13, 3.4], [8.6, 1.4]], u); T.flow(F, ['s6', 's9', 's5', 's8', 's4'], [6, 1.2], u * .84); F.def.s7 = L2([-17.6, 5.4], [-9, 3], u * .7); K.hit(F, [6.2, .5], E(t, 2.7, 3), 'no gain'); },
    }; });

  /* ================= BLITZ DT POP (3 High Over): the tackles drop, the looper comes around ================= */
  stage('blitz-dt-pop', (K) => { const { E, L2, RED } = K, T = tools(K), BOX = [-14, -10, 15, 12];
    const P = { s6: [[7.6, 1.3], [6.8, -2.6], [3.2, -5.6]], s3: [[4.3, -1.2]], s0: [[-4.3, -1.2]], s5: [[-7.2, .6], [-6.6, -1.9]] };
    const drop = (F, t, t0) => { const p = E(t, t0, t0 + 1.2); F.def.s1 = L2(F.def.s1, [-3.6, 5.2], p); F.def.s2 = L2(F.def.s2, [4, 5.2], p); F.lead = Math.min(F.lead, 1 - p); };
    const rush = (F, t, t0, freeOn) => { const u = E(t, t0, t0 + 1.8); K.snap(F, u, { free: freeOn ? ['s6'] : [], paths: P, hold: ['s1', 's2'] }); drop(F, t, t0 + .6); return u; };
    return {
      off: 'shotgun__doubles', keysOn: 4,
      /* 2 show blitz: the linebackers walk up and the safeties creep down */
      align(F, n) { if (n >= 2) { F.def.s5 = [-3.4, 2.7]; F.def.s6 = [4, 2.7]; F.def.s8 = [-9.6, 8.6]; F.def.s9 = [9.6, 8.6]; F.def.s4 = [.2, 8.2]; } },
      keys: [
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s0', 's5', 's6', 's3'], t, .5); T.rings(F, ['s1', 's2'], t, 2); K.note(F, 'both tackles drop', 0, -8.4, E(t, 2.4, 2.7)); },
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); K.note(F, 'the tackles hold the inside', -7.6, 5.4, E(t, .4, .7) * (1 - E(t, 2.4, 2.7))); rush(F, t, 1.2, true); K.note(F, 'the edge crashes in', 11, 2.2, E(t, 1.6, 1.9) * (1 - E(t, 2.7, 3))); T.sack(F, t, 3); K.note(F, 'the looper comes around', 10.4, 1.7, E(t, 3.1, 3.4)); },
        /* the tackles are standing in the quick throws over the middle */
        (F, t) => { T.lock(F); K.view(F, [-16, -10, 14, 13], E(t, .2, 1)); const u = rush(F, t, 1, false), sl = K.o(F, 'WR', 1); K.route(F, sl, [[-9, 2.2], [-4.4, 5]], u, { prog: E(t, .7, 1.5), stop: .9 }); T.with(F, 's8', sl, u, -1.4, 1.6);
          T.rings(F, ['s1', 's2'], t, 2); K.ball(F, [-4.2, 4.6], K.u01(t, 2.5, 3)); K.hit(F, [-3.9, 4.9], E(t, 3, 3.3), 'incomplete'); K.note(F, 'in the passing lane', -9.6, 8.6, E(t, 2.3, 2.6)); },
        /* the user has the back: he blocks, so the user is free to drive on the throw */
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s4']); T.user(F, 's4', t, .3); const u = rush(F, t, 1.2, false), rb = K.o(F, 'RB'), te = K.o(F, 'TE'); rb.x = K.lerp(2.9, 2.4, u); rb.y = K.lerp(-6, -4.6, u);
          K.route(F, te, [[5.2, 6], [1.2, 7]], u, { prog: E(t, .9, 1.7) }); T.with(F, 's9', te, u, 1.6, 1.6); F.def.s4 = L2(F.def.s4, [1, 7.4], E(t, 2.3, 3)); K.ball(F, [1, 6.9], K.u01(t, 2.6, 3.1)); K.hit(F, [1, 7], E(t, 3.1, 3.4), 'pick');
          K.note(F, 'the back blocks: you are free', 9.6, -8.4, E(t, 1.8, 2.1)); },
        (F, t) => { T.lock(F); K.showAll(F, 1); const u = rush(F, t, 1, false), rb = K.o(F, 'RB'); rb.x = K.lerp(2.9, 5.2, u); rb.y = K.lerp(-6, -3.4, u); K.note(F, 'six block four', -9, -5, E(t, 2, 2.3)); K.note(F, 'four rush, seven cover', 0, 13.6, E(t, 2.6, 2.9)); },
      ],
      adj: [
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); K.ring(F, 's3', E(t, .4, .8)); K.note(F, 'a defensive end here', 11.4, 3.2, E(t, .8, 1.1)); },
        (F, t) => { T.lock(F); K.toAdj(F, 2, E(t, .5, 1.5)); T.lock(F); K.note(F, 'show blitz', 0, 12.6, E(t, .4, .7)); },
        (F, t) => { T.lock(F); K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4, 7); },
        (F, t) => { T.lock(F); K.showAll(F, 1, ['s4']); T.user(F, 's4', t, .3); K.note(F, 'the safety on the back', 6.4, 11, E(t, .8, 1.1)); },
        /* on a passing down: user a tackle instead, blitz him, hover and get out */
        (F, t) => { T.lock(F); K.view(F, BOX, E(t, .2, 1)); K.job(F, 's2', { rush: 1 }); F.lanes.s2 = 1 - E(t, 1.4, 1.9); T.user(F, 's2', t, .3); const a = F.def.s2; F.def.s2 = K.along([a, [a[0], a[1] - .8], [3.8, 5.4]], E(t, 1.2, 2.9)); K.note(F, 'blitz him, hover, get out', 0, -8.4, E(t, 1, 1.3)); },
      ],
      run(F, t) { T.lock(F); T.user(F, 's4'); rush(F, t, 1, true); F.def.s4 = L2(F.def.s4, [1.4, 7.6], E(t, 1.6, 2.8)); T.sack(F, t, 2.8); },
    }; });

  /* ================= OKIE EAGLE 3 (Dime 1-4): the three man sim pressure ================= */
  stage('okie-eagle-3', (K) => { const { E, L2, RED, WHITE } = K, T = tools(K), BOX = [-13, -10, 17, 12];
    const P = { s9: [[3.4, 2], [2.6, -2.2]], s2: [[6.3, -1.3]], s6: [[7.8, -.8]] };
    const three = (F, t, t0) => { const u = E(t, t0, t0 + 1.8); K.snap(F, u, { free: ['s9'], paths: P, hold: ['s0'] }); T.out(F, 's0', t, t0, [0, 7.6]); return u; };
    const curl = (F, t) => { K.reset(F, 3); K.view(F, [-2, -9.5, 27, 20], E(t, .2, 1)); K.ring(F, 's10', E(t, .3, .7)); K.note(F, 'hard flat', 21.4, 2.6, E(t, .4, .7) * (1 - E(t, 1.2, 1.5))); K.toAdj(F, 4, E(t, 1, 1.9)); K.ring(F, 's10', 1); K.note(F, 'quick adjust: curl flat', 15, 13.2, E(t, 1.8, 2.1)); };
    return {
      off: 'shotgun__doubles', keysOn: 4,
      /* 4 the corner on the blitz side goes from the hard flat to a curl flat */
      align(F, n) { if (n >= 4) K.job(F, 's10', { zone: [14.8, 9.2, 4.8, 2.7], zj: 'curl-flat' }); },
      /* the game rotates the whole defense over by itself */
      call(F, t) { K.pre(F, E(t, .5, 1.9)); },
      keys: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s2', 's6', 's9'], t, .5); K.note(F, 'nobody rushing over here', -8.4, 4.4, E(t, 1.6, 1.9) * (1 - E(t, 3, 3.3))); three(F, t, 2.3); if (t > 2.3) F.marks = {}; T.sack(F, t, 4.1); K.note(F, 'three on five, and one is free', -10.5, -6.4, E(t, 4.3, 4.6)); },
        (F, t) => { T.rings(F, ['s1'], t, .4); K.note(F, 'the tackle drops', -8.6, 4.6, E(t, .7, 1) * (1 - E(t, 2.2, 2.5))); T.user(F, 's0', t, 1); three(F, t, 1.6); K.note(F, 'three rushing, eight dropping', 0, 15.6, E(t, 3.2, 3.5)); },
        /* the rotation, then the seam thrown into it */
        (F, t) => { const w = E(t, .4, 1.8); K.pre(F, w); K.showAll(F, 1, ['s7', 's5', 's8', 's10']); ['s5', 's8', 's9'].forEach((k) => { const m = K.M(k); if (m.from) K.line(F, [m.from, F.def[k]], { col: WHITE, dash: [4, 6], w: 2, a: .6 }); }); K.note(F, 'it rotates over', -2, 16.6, E(t, .8, 1.1));
          const u = E(t, 2.4, 4), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s0'] }); K.route(F, te, [[5.6, 14.6]], u, { prog: E(t, 2.1, 2.9) }); K.ball(F, [5.8, 14], K.u01(t, 3.4, 4)); K.hit(F, [6, 14.2], E(t, 4, 4.3)); K.note(F, 'right into the invert', 14.4, 12.2, E(t, 4.1, 4.4)); },
        (F, t) => { curl(F, t); const u = E(t, 2.3, 3.7), z = K.o(F, 'WR', 2); K.route(F, z, [[16.4, 8.4], [22.4, 9]], u, { prog: E(t, 2.1, 2.9) }); F.def.s10 = L2(F.def.s10, [19.6, 10.4], u); K.note(F, 'short yardage: leave the hard flat', 12.4, -8.4, E(t, 3.8, 4.1)); },
        (F, t) => { K.view(F, [-14, -10, 14, 12], E(t, .2, 1)); T.user(F, 's0', t, .3); T.out(F, 's0', t, 1, [0, 7.6]); K.note(F, 'step up', -9.4, -.6, E(t, 1, 1.3) * (1 - E(t, 1.9, 2.2))); K.note(F, 'then get out', -9.6, 8.8, E(t, 2.3, 2.6)); },
      ],
      adj: [
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4, 7.4); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's0', t, .3); T.count(F, ['s2', 's6', 's9'], t, .9); K.note(F, 'away from the blitz', -10.6, 4.4, E(t, .8, 1.1)); },
        (F, t) => { K.view(F, [-14, -10, 14, 12], E(t, .2, 1)); T.user(F, 's0'); T.out(F, 's0', t, .8, [0, 7.6]); K.note(F, 'step up', -9.4, -.6, E(t, .8, 1.1) * (1 - E(t, 1.7, 2))); K.note(F, 'then get out', -9.6, 8.8, E(t, 2.1, 2.4)); },
        curl,
      ],
      run(F, t) { T.user(F, 's0'); three(F, t, 1); T.sack(F, t, 2.8); },
    }; });

  /* ================= FS ZONE BLITZ (Dime 1-4): four on three ================= */
  stage('fs-zone-blitz', (K) => { const { E, L2, RED, WHITE } = K, T = tools(K), BOX = [-15, -10, 11, 11];
    const P = { s8: [[-3.5, 2], [-2.6, -2.2]], s3: [[-2.1, .2], [-1.9, -1.4]], s0: [[-5.4, -1.3]], s1: [[.1, -1.2]], s2: [[5.6, -1.3]] };
    return {
      off: 'shotgun__doubles', keysOn: 5,
      /* 4 the blitzing safety is walked down beside the linebacker */
      align(F, n) { if (n >= 4) F.def.s8 = [-5, 5.1]; },
      call(F, t) { K.pre(F, E(t, .5, 1.6)); },
      keys: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s0', 's1', 's3', 's8'], t, .5); ['C', 'LG', 'LT'].forEach((p, j) => K.omark(F, K.o(F, p), { ring: E(t, 1.9 + j * .2, 2.3 + j * .2) })); K.note(F, 'four on three', -12.6, 1.2, E(t, 2.5, 2.8));
          const u = E(t, 3, 4.7); K.snap(F, u, { free: ['s8'], paths: P }); if (u > 0) { F.marks = {}; F.omarks = {}; } K.note(F, 'the guard has to pick one', -10.6, -8.6, E(t, 3.6, 3.9)); T.sack(F, t, 4.7); },
        (F, t) => { K.reset(F, 3); K.view(F, BOX, E(t, .2, 1)); const a = F.def.s8.slice(); K.toAdj(F, 4, E(t, .6, 1.6)); K.line(F, [a, F.def.s8], { col: WHITE, dash: [4, 6], w: 2, a: .7 }); K.ring(F, 's8', E(t, 1.5, 1.9)); K.note(F, 'down beside the linebacker', -8, -8.6, E(t, 1.7, 2)); },
        (F, t) => { K.showAll(F, 1, ['s5', 's6', 's9', 's4']); T.user(F, 's9', t, .3); const u = E(t, 1.2, 3.1), sl = K.o(F, 'WR', 1), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s5', 's6', 's9'] }); K.route(F, sl, [[-10, 15]], u, { prog: E(t, .9, 1.8) }); K.route(F, te, [[5.6, 15]], u, { prog: E(t, .9, 1.8) });
          T.with(F, 's5', sl, u, -1.1, 1.2); T.with(F, 's6', te, u, 1.2, 1.2); F.def.s9 = L2(F.def.s9, [0, 17.4], u); K.note(F, 'matched', -15.4, 13.4, E(t, 2.4, 2.7)); K.note(F, 'matched', 11, 13.4, E(t, 2.6, 2.9)); },
        /* a shotgun run goes across the quarterback: into the overload */
        (F, t) => { T.bare(F); K.view(F, BOX, E(t, .2, 1)); const u = E(t, 1.1, 2.8); T.run(F, u, [[.4, -5], [-2.6, -2.6], [-3.6, -.8]], -.6, E(t, .5, 1.4)); F.def.s3 = L2(F.def.s3, [-3, -.2], u); F.def.s8 = L2(F.def.s8, [-4.4, .2], u); F.def.s0 = L2(F.def.s0, [-5.6, -.2], u);
          K.note(F, 'the back is right, the run goes left', 5, 6.8, E(t, .5, .8)); K.hit(F, [-3.6, -.9], E(t, 2.8, 3.1), 'blown up'); },
      ],
      adj: [
        (F, t) => { const u = E(t, 1.6, 2.4); K.flip(F, u); K.note(F, 'the safety is on the back side', 9.6, 11, E(t, .4, .7) * (1 - E(t, 1.3, 1.6)), RED); K.ring(F, 's8', E(t, 2.4, 2.8)); K.note(F, 'now away from the back', -11, 11, E(t, 2.5, 2.8)); },
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4, 7.6); },
        (F, t) => { K.showAll(F, 1, ['s9', 's4']); T.user(F, 's9', t, .3); K.ring(F, 's4', E(t, 1.1, 1.5)); K.note(F, 'or the three receiver hook', 11.6, 6.4, E(t, 1.4, 1.7)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); const a = F.def.s8.slice(); K.toAdj(F, 4, E(t, .6, 1.6)); K.line(F, [a, F.def.s8], { col: WHITE, dash: [4, 6], w: 2, a: .7 }); K.note(F, 'walk him down', -11.8, -3.6, E(t, 1.2, 1.5)); },
        (F, t) => { K.showAll(F, 1, ['s5', 's6']); T.rings(F, ['s5', 's6'], t, .4); K.note(F, 'leave the flats on, or shade', 0, 12.4, E(t, .9, 1.2)); },
      ],
      run(F, t) { T.user(F, 's9'); const u = E(t, 1, 2.8); K.snap(F, u, { free: ['s8'], paths: P }); T.sack(F, t, 2.8); },
    }; });

  /* ================= COVER 6 PRESS (Dime 1-4): three rush, a free user, and the blitz out of it ================= */
  stage('cover-6-press', (K) => { const { E, L2, RED } = K, T = tools(K), BOX = [-14, -10, 16, 13];
    const slant = (m) => [[m[0], m[1]], [m[0] - 1.5, m[1] - 3]];
    const P = { s6: [[7.4, -.4], [4.6, -4.4]], s4: [[2.6, .2], [2.4, -1.3]], s0: [[-7.2, -1.3]], s1: [[-1.4, -1.2]], s2: [[4.5, -1.3]] };
    return {
      off: 'shotgun__doubles', keysOn: 0,
      /* 2 both linebackers blitzed. 3 the line slanted away from the vert hook. 4 the vert hook blitzed. 5 the user backer walked down to mug the gap */
      align(F, n) { if (n >= 5) F.def.s3 = [-1.7, 2.7]; if (n >= 2) { K.job(F, 's3', { rush: 1 }); K.job(F, 's4', { rush: 1 }); } if (n >= 3) ['s0', 's1', 's2'].forEach((k) => K.job(F, k, { rush: slant(F.def[k]) })); if (n >= 4) K.job(F, 's6', { rush: 1 }); },
      keys: [
        (F, t) => { T.count(F, ['s0', 's1', 's2'], t, .5); T.user(F, 's3', t, 1.6); K.note(F, 'just free', -3.4, 3, E(t, 1.9, 2.2)); },
        (F, t) => { K.showAll(F, 1, ['s5']); K.view(F, [-27, -9.5, 6, 22], E(t, .2, 1)); K.ring(F, 's5', E(t, .4, .8)); K.note(F, 'a curl flat, not a quarter flat', -13.4, 12.6, E(t, .8, 1.1)); },
        (F, t) => { const u = E(t, 1.1, 3), p = E(t, .8, 1.7), x = K.o(F, 'WR', 0), sl = K.o(F, 'WR', 1), z = K.o(F, 'WR', 2), te = K.o(F, 'TE'); K.snap(F, u * .5, { hold: ['s7', 's8', 's6', 's10', 's9'] });
          K.route(F, x, [[-16.8, 15]], u, { prog: p }); K.route(F, sl, [[-10, 14]], u, { prog: p }); K.route(F, te, [[5.6, 14]], u, { prog: p }); K.route(F, z, [[16.8, 15]], u, { prog: p });
          T.with(F, 's7', x, u, .9, 1.6); T.with(F, 's8', sl, u, 1, 2); T.with(F, 's6', te, u, 1.1, 1.2); T.with(F, 's10', z, u, -.9, 1.2); F.def.s9 = L2(F.def.s9, [13, 19.6], u); K.note(F, 'boxed', -13.6, 18.8, E(t, 2.8, 3.1)); K.note(F, 'boxed', 10.8, 18.8, E(t, 3, 3.3)); },
        /* the blitz: five come, and the vert hook is the one nobody has */
        (F, t) => { K.reset(F, 5); K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s0', 's1', 's2', 's4', 's6'], t, .4, .24); const u = E(t, 2.2, 4); K.snap(F, u, { free: ['s6'], paths: P, hold: ['s3'] }); if (u > 0) F.marks = {}; F.def.s3 = L2(F.def.s3, [-2.4, 5.4], u); F.lanes.s3 = 0; T.sack(F, t, 4); K.note(F, 'match coverage behind it', 0, 15.4, E(t, 4.2, 4.5)); },
        (F, t) => { K.reset(F, 5); K.view(F, [-16, -10, 14, 13], E(t, .2, 1)); T.user(F, 's3', t, .3); K.note(F, 'mug the gap', -7.6, 3.4, E(t, .7, 1) * (1 - E(t, 1.8, 2.1))); const u = E(t, 1.5, 3.2), sl = K.o(F, 'WR', 1); K.snap(F, u * .8, { paths: P, hold: ['s3'] }); F.lanes.s3 = 0;
          K.route(F, sl, [[-9, 2.4], [-3.4, 5.6]], u, { prog: E(t, 1.2, 2), stop: .9 }); F.def.s3 = L2(F.def.s3, [-3.6, 5.4], E(t, 2, 3)); K.ball(F, [-3.7, 5], K.u01(t, 2.7, 3.2)); K.hit(F, [-3.6, 5.2], E(t, 3.2, 3.5), 'pick'); K.note(F, 'step underneath it', -10.4, 8.6, E(t, 3.3, 3.6)); },
      ],
      adj: [
        (F, t) => { K.showAll(F, 1, ['s3']); T.user(F, 's3', t, .3); K.note(F, 'the free hook curl', -6, 13.2, E(t, .8, 1.1)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 2, E(t, .2, 1)); T.rings(F, ['s3', 's4'], t, .6); K.note(F, 'blitz the linebackers', 0, 8, E(t, .9, 1.2)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 3, E(t, .2, 1)); K.ring(F, 's6', E(t, .4, .8)); K.note(F, 'the vert hook', 12.6, 4.6, E(t, .7, 1)); K.line(F, [[5.4, 3.6], [-5.6, 3.6]], { w: 4, prog: E(t, 1.2, 2), tip: 1 }); K.note(F, 'slant away from him', -8.6, 7.6, E(t, 1.9, 2.2)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 4, E(t, .2, 1)); K.ring(F, 's6', E(t, .5, .9)); K.note(F, 'blitz him', 12.2, 4.6, E(t, .9, 1.2)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); K.toAdj(F, 5, E(t, .5, 1.5)); T.user(F, 's3', t, .2); F.lanes.s3 = 0; K.note(F, 'walk him down, mug the gap', -9.6, 5, E(t, 1.5, 1.8)); },
      ],
      run(F, t) { T.user(F, 's3'); const u = E(t, 1, 2.8); K.snap(F, u, { free: ['s6'], paths: P, hold: ['s3'] }); F.def.s3 = L2(F.def.s3, [-2.4, 5.4], u); F.lanes.s3 = 0; T.sack(F, t, 2.8); },
    }; });

  /* ================= MIKE SS 3 SEAM (Dime 1-4): four rush, four on three ================= */
  stage('mike-ss-3-seam', (K) => { const { E, L2 } = K, T = tools(K), BOX = [-13, -10, 16, 12];
    const P = { s4: [[4.4, 2], [3.1, -2.3]], s2: [[6.6, -1.3]], s6: [[8.2, -.8]], s1: [[.1, -1.2]] };
    const four = (F, t, t0, freeOn) => { const u = E(t, t0, t0 + 1.8); K.snap(F, u, { free: freeOn ? ['s4'] : [], paths: P, hold: ['s0'] }); T.out(F, 's0', t, t0, [1.4, 6.8]); return u; };
    const hover = (F, t) => { K.view(F, [-14, -10, 14, 12], E(t, .2, 1)); T.user(F, 's0', t, .3); T.out(F, 's0', t, 1, [1.4, 6.8]); K.note(F, 'hover', -10, -.4, E(t, 1, 1.3) * (1 - E(t, 1.9, 2.2))); K.note(F, 'then get out', -10.5, 9.2, E(t, 2.3, 2.6)); };
    return {
      off: 'shotgun__doubles',
      keys: [
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s1', 's2', 's4', 's6'], t, .5); K.ring(F, 's0', E(t, 2, 2.4)); K.note(F, 'he drops out', -13.6, 1.4, E(t, 2.2, 2.5)); K.note(F, 'four on three', 9.6, 7.4, E(t, 2.8, 3.1)); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.count(F, ['s2', 's4', 's6'], t, .4); const u = four(F, t, 1.6, true); if (u > 0) F.marks = {}; T.sack(F, t, 3.4); K.note(F, 'one of the three comes home', 9.6, -5, E(t, 3.5, 3.8)); },
        hover,
        /* the seam flat steps in front of the checkdown in the flat */
        (F, t) => { K.showAll(F, 1, ['s5', 's9']); K.view(F, [-27, -9.5, 8, 18], E(t, .2, 1)); K.ring(F, 's5', E(t, .3, .7)); const u = four(F, t, 1.2, false), sl = K.o(F, 'WR', 1); K.route(F, sl, [[-10.2, 1.6], [-15.6, 2.6]], u, { prog: E(t, .9, 1.7), stop: .9 });
          F.def.s5 = L2(F.def.s5, [-14.6, 3.2], E(t, 2, 2.9)); K.ball(F, [-14.8, 2.7], K.u01(t, 2.5, 3)); K.hit(F, [-14.7, 2.9], E(t, 3, 3.3), 'pick six'); K.note(F, 'steps in front of the checkdown', -13.4, 11.6, E(t, 3.2, 3.5)); },
        (F, t) => { const u = four(F, t, 1, false), rb = K.o(F, 'RB'); rb.x = K.lerp(2.9, 5.4, u); rb.y = K.lerp(-6, -3.4, u); K.note(F, 'six block four', -9, -5, E(t, 2, 2.3)); K.note(F, 'still only rushing four', 0, 14.6, E(t, 2.6, 2.9)); },
      ],
      adj: [
        (F, t) => { K.view(F, [-15, -11, 15, 11], E(t, .2, 1)); T.contain(F, t, .4, 7.6); },
        (F, t) => { K.view(F, BOX, E(t, .2, 1)); T.user(F, 's0', t, .3); T.count(F, ['s2', 's4', 's6'], t, .9); K.note(F, 'away from the sim pressure', -4.5, -8.6, E(t, .8, 1.1)); },
        hover,
        (F, t) => { K.showAll(F, 1, ['s5', 's9']); T.rings(F, ['s5', 's9'], t, .4); K.note(F, 'leave the flats on, or shade', 0, 12.6, E(t, .9, 1.2)); },
      ],
      run(F, t) { T.user(F, 's0'); four(F, t, 1, true); T.sack(F, t, 2.8); },
    }; });
  /* ================= THE RULES BREAKDOWNS (on the call's own page, behind its rules button) =================
     One rule per click. The man the rule belongs to is ringed and lit, the receivers carry their numbers (outside in), and
     where a rule has two halves the field plays the first, then the second. The WORDS of each rule are in the data module
     (rulesLive); where they come from is written there. */
  const rk = (K) => { const { E, L2 } = K, T = tools(K), REC = /^(WR|TE)$/;
    const cov = K.men.filter((m) => !m.base.rush).map((m) => m.k);
    const side = (F, sg) => F.off.filter((o) => REC.test(o.p) && Math.sign(o.x) === sg).sort((a, b) => Math.abs(b.x) - Math.abs(a.x));
    const R = { T, side,
      nums(F) { [-1, 1].forEach((sg) => side(F, sg).forEach((o, i) => K.omark(F, o, { num: i + 1 }))); },
      rec: (F, sg, n) => side(F, sg)[n - 1],
      focus(F, ks, t) { K.showAll(F, 1, ks); F.lanes = {}; ks.forEach((k) => K.ring(F, k, t == null ? 1 : E(t, .2, .6))); R.nums(F); },
      snap(F, u) { K.snap(F, u * .35, { hold: cov }); F.lead = 1; },
      two(F, t, A, B, cut) { const c = cut || 4.4; if (t < c) A(F, t); else B(F, t - c); },
      run(F, o, pts, t, t0, stop) { return K.route(F, o, pts, E(t, t0, t0 + 1.8), { prog: E(t, t0 - .5, t0 + .3), stop }); },
      u: (t, t0) => E(t, t0, t0 + 1.8),
    }; return R; };

  /* ---- COVER 6, the general rules (Nickel 2-4 Cover 6: Quarters to the nickel side, Cover 2 to the other) ---- */
  stage('cover-6-press:rules', (K) => { const { E, L2 } = K, R = rk(K), T = R.T, L = (F, n) => R.rec(F, -1, n), Rt = (F, n) => R.rec(F, 1, n);
    const trips = (F, u) => K.toOff(F, 'shotgun__trips', u == null ? 1 : u, true);     /* three to the Quarters side */
    const swap = (F, t, who) => { R.focus(F, [who]); const z = Rt(F, 1), te = Rt(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, z, [[16.3, 1.2], [11.4, 5]], t, .6); R.run(F, te, [[6, .2], [13.4, 1.4]], t, .6);
      T.with(F, 's10', te, who === 's10' ? u : u * .9, .5, 1.6); T.with(F, 's6', z, who === 's6' ? u : u * .9, -1.1, 1.2); };
    return {
      off: 'shotgun__doubles',
      call(F) { R.nums(F); },
      keys: [
        (F, t) => { R.nums(F); F.lanes = {}; K.line(F, [[1, -3], [1, 23.4]], { w: 3, dash: [10, 9], prog: E(t, .3, 1.2) }); K.note(F, 'QUARTERS', -14, 11.8, E(t, 1, 1.3)); K.note(F, 'COVER 2', 14.6, 9.6, E(t, 1.3, 1.6)); T.rings(F, ['s7', 's8', 's9'], t, 1.9); },
        (F, t) => R.two(F, t,
          (F, t) => { R.focus(F, ['s7'], t); const x = L(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[-16.6, 15.6]], t, 1); T.with(F, 's7', x, u, .9, 1.4); K.note(F, 'one vertical: lock him up', -12.6, 19.4, E(t, 2.4, 2.7)); },
          (F, t) => { R.focus(F, ['s7']); const x = L(F, 1), sl = L(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, x, [[-16.2, 4.6], [-11.6, 5.4]], t, .6); R.run(F, sl, [[-10, 8], [-15.2, 14.4]], t, .6); F.def.s7 = L2(F.def.s7, [-16.8, 15.6], E(t, 1.4, 2.6)); K.note(F, 'one in: zone off, help on two', -11.6, 19.4, E(t, 2.2, 2.5)); }),
        (F, t) => R.two(F, t,
          (F, t) => { R.focus(F, ['s8'], t); const sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-10, 15.4]], t, 1); T.with(F, 's8', sl, u, .9, 1.8); K.note(F, 'two vertical: man', -2.4, 18.6, E(t, 2.4, 2.7)); },
          (F, t) => { R.focus(F, ['s8']); const x = L(F, 1), sl = L(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, sl, [[-10, 3.6], [-4.6, 4.6]], t, .6); R.run(F, x, [[-16.6, 16]], t, .6); T.with(F, 's7', x, u, -.9, 1.2); F.def.s8 = L2(F.def.s8, [-14.4, 17.6], E(t, 1.2, 2.5)); K.note(F, 'two shallow: bracket one', -5, 19.6, E(t, 2.2, 2.5)); }),
        (F, t) => R.two(F, t,
          (F, t) => { R.focus(F, ['s4'], t); const sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-10, 13]], t, 1); F.def.s4 = K.along([F.def.s4, [-10.3, 5.8], [-12.8, 7.8]], u); K.note(F, 'cap two, then eyes to the flat', -17.6, 11.6, E(t, 2.4, 2.7)); },
          (F, t) => { R.focus(F, ['s4']); const sl = L(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, sl, [[-10.4, 1.4], [-16.2, 2]], t, .6); T.with(F, 's4', sl, u, .7, 1.7); K.note(F, 'two to the flat: he has him', -15.6, 7.4, E(t, 2.2, 2.5)); }),
        (F, t) => { R.focus(F, ['s5'], t); const te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[4.4, 3.4], [-6.6, 4.8]], t, 1, .9); F.def.s5 = L2(F.def.s5, [-3.6, 5.8], E(t, 1.8, 2.8)); K.note(F, 'free: he picks up the crosser', -1.4, 13.4, E(t, 2.6, 2.9)); },
        (F, t) => R.two(F, t,
          (F, t) => { R.focus(F, ['s10'], t); const z = Rt(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, z, [[17.6, 3], [17.8, 16]], t, 1); T.with(F, 's10', z, u, -.9, 1.2); K.note(F, 'one vertical: he matches him', 12, 19.6, E(t, 2.4, 2.7)); },
          (F, t) => { swap(F, t, 's10'); K.note(F, 'one in, two to the flat: he traps it', 12.4, 8.6, E(t, 2.2, 2.5)); }),
        (F, t) => R.two(F, t,
          (F, t) => { R.focus(F, ['s6'], t); const te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[5.6, 14.4]], t, 1); T.with(F, 's6', te, u, -1, 1.2); K.note(F, 'two vertical: he carries him', 13.4, 12.4, E(t, 2.4, 2.7)); },
          (F, t) => { swap(F, t, 's6'); K.note(F, 'two to the flat, one in: he takes one', 12.4, 8.6, E(t, 2.2, 2.5)); }),
        (F, t) => { R.focus(F, ['s9'], t); const z = Rt(F, 1), te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, z, [[17.6, 3], [17.8, 16]], t, 1); R.run(F, te, [[5.6, 14]], t, 1); T.with(F, 's10', z, u, -.9, 1.2); T.with(F, 's6', te, u, -1, 1.2); F.def.s9 = L2(F.def.s9, [14, 19.4], u); K.note(F, 'he caps the vertical', 6.4, 21.6, E(t, 2.6, 2.9)); },
      ],
      adj: [
        (F, t) => { trips(F, E(t, .3, 1.2)); R.nums(F); F.lanes = {}; K.note(F, 'PALMS RULES', -14, 11.8, E(t, 1.3, 1.6)); K.note(F, 'COVER 2', 14.6, 9.6, E(t, 1.6, 1.9)); },
        (F, t) => { trips(F); R.focus(F, ['s7'], t); const x = L(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[-17.5, 8], [-10, 9.4]], t, 1); T.with(F, 's7', x, u, -.4, 1.6); K.note(F, 'MEG: everywhere he goes', -15, 13.6, E(t, 2.6, 2.9)); },
        (F, t) => R.two(F, t,
          (F, t) => { trips(F); R.focus(F, ['s4', 's8'], t); const two = L(F, 2), three = L(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, three, [[-9, 1], [-15.6, 1.8]], t, 1); R.run(F, two, [[-12.8, 14.6]], t, 1); T.with(F, 's4', three, u, .6, 1.7); T.with(F, 's8', two, u, 1, 1.8);
            K.note(F, 'three to the flat: the apex', -17.4, 5.6, E(t, 2.4, 2.7)); K.note(F, 'two vertical: the safety', -5.4, 18.6, E(t, 2.7, 3)); },
          (F, t) => { trips(F); R.focus(F, ['s4', 's8']); const two = L(F, 2), three = L(F, 3), u = R.u(t, .6); R.snap(F, u); R.run(F, three, [[-8, 15]], t, .6); R.run(F, two, [[-12.8, 6], [-10.8, 5.4]], t, .6); T.with(F, 's8', three, u, .9, 1.8); T.with(F, 's4', two, u, .9, 1.5);
            K.note(F, 'three vertical: the safety', -1.4, 18.6, E(t, 2.2, 2.5)); K.note(F, 'the apex takes two', -18.6, 9.4, E(t, 2.5, 2.8)); }),
        (F, t) => { trips(F); R.focus(F, ['s5'], t); const three = L(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, three, [[-8, 4.4], [3, 6.4]], t, 1, .8); F.def.s5 = K.along([F.def.s5, [-4.4, 5.2], [-1.2, 5.4]], u); K.note(F, 'wall number three', 1, 12.6, E(t, 2.4, 2.7)); },
        (F, t) => { trips(F); R.focus(F, ['s10', 's9'], t); const z = Rt(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, z, [[17.4, 3], [17.6, 16]], t, 1); T.with(F, 's10', z, u, -.9, 1.2); F.def.s9 = L2(F.def.s9, [14, 19.4], u); K.ring(F, 's9', 1, 'USER'); K.note(F, 'only the deep half', 6, 16.4, E(t, 2.6, 2.9)); },
      ],
    }; });

  /* ---- BRACKET 9 SWITCH: man to the nickel side, Quarters to the other; flipped against trips it is Palms to the three ---- */
  stage('bracket-9-switch:rules', (K) => { const { E, L2, RED, MAN } = K, R = rk(K), T = R.T, L = (F, n) => R.rec(F, -1, n), Rt = (F, n) => R.rec(F, 1, n);
    const cover = (F) => { F.cov = {}; const a = L(F, 1), b = L(F, 2); if (a) F.cov.s7 = a; if (b) { F.cov.s4 = b; F.cov.s8 = b; } };
    const trips = (F, u) => { K.toOff(F, 'shotgun__trips', u == null ? 1 : u); F.def.s6 = L2(F.def.s6, [9.6, 4.6], u == null ? 1 : u); cover(F); };   /* three to the match side, the apex out over them */
    const focus = (F, ks, t) => { cover(F); R.focus(F, ks, t); };
    return {
      off: 'shotgun__doubles',
      call(F) { cover(F); K.showAll(F, 1); R.nums(F); },
      keys: [
        (F, t) => { cover(F); K.showAll(F, 1); R.nums(F); F.lanes = {}; K.line(F, [[-4.4, -3], [-4.4, 23.4]], { w: 3, dash: [10, 9], prog: E(t, .3, 1.2) }); K.note(F, 'MAN', -13.6, 18.4, E(t, 1, 1.3), MAN); K.note(F, 'QUARTERS', 14.6, 15, E(t, 1.3, 1.6)); },
        (F, t) => { focus(F, ['s7'], t); const x = L(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[-16.4, 8.6], [-12, 9.8]], t, 1); T.with(F, 's7', x, u, -.4, 1.6); K.note(F, 'man on one, everywhere he goes', -15.4, 13.6, E(t, 2.6, 2.9)); },
        (F, t) => { focus(F, ['s4', 's8'], t); const sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-10, 13.4]], t, 1); T.with(F, 's4', sl, u, .8, -1.3); T.with(F, 's8', sl, u, -.7, 2.2); K.note(F, 'the nickel low, the safety over the top', -12.4, 19.4, E(t, 2.4, 2.7)); if (t > 3.4) K.ring(F, 's8', 1, 'USER'); K.note(F, 'that safety is you', -1.6, 16.2, E(t, 3.6, 3.9)); },
        (F, t) => R.two(F, t,
          (F, t) => { focus(F, ['s10'], t); const z = Rt(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, z, [[16.8, 15.6]], t, 1); T.with(F, 's10', z, u, -.9, 1.4); K.note(F, 'one vertical: lock him up', 11.6, 19.4, E(t, 2.4, 2.7)); },
          (F, t) => { focus(F, ['s10']); const z = Rt(F, 1), te = Rt(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, z, [[16.3, 4.6], [11.8, 5.4]], t, .6); R.run(F, te, [[5, 8], [11.4, 14.4]], t, .6); F.def.s10 = L2(F.def.s10, [15.4, 15.6], E(t, 1.4, 2.6)); K.note(F, 'one in: zone off, help on two', 11.6, 19.4, E(t, 2.2, 2.5)); }),
        (F, t) => R.two(F, t,
          (F, t) => { focus(F, ['s9'], t); const te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[5.4, 15.4]], t, 1); T.with(F, 's9', te, u, .9, 1.8); K.note(F, 'two vertical: man', 12.6, 18.4, E(t, 2.4, 2.7)); },
          (F, t) => { focus(F, ['s9']); const z = Rt(F, 1), te = Rt(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, te, [[5, 3.4], [0, 4.4]], t, .6); R.run(F, z, [[16.8, 16]], t, .6); T.with(F, 's10', z, u, .9, 1.2); F.def.s9 = L2(F.def.s9, [14.2, 17.6], E(t, 1.2, 2.5)); K.note(F, 'two shallow: bracket one', 6.4, 19.6, E(t, 2.2, 2.5)); }),
        (F, t) => R.two(F, t,
          (F, t) => { focus(F, ['s6'], t); const te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[5.4, 13]], t, 1); F.def.s6 = K.along([F.def.s6, [4.8, 5.8], [10.6, 7.4]], u); K.note(F, 'cap two, then eyes to the flat', 15.6, 11.4, E(t, 2.4, 2.7)); },
          (F, t) => { focus(F, ['s6']); const te = Rt(F, 2), u = R.u(t, .6); R.snap(F, u); R.run(F, te, [[6, .2], [13.2, 1.4]], t, .6); T.with(F, 's6', te, u, -.6, 1.7); K.note(F, 'two to the flat: he has him', 13.6, 5.6, E(t, 2.2, 2.5)); }),
        (F, t) => { focus(F, ['s5'], t); const te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[4.4, 3.4], [-6.6, 4.8]], t, 1, .9); F.def.s5 = L2(F.def.s5, [-3.6, 5.8], E(t, 1.8, 2.8)); K.note(F, 'the drag to the man side', 1.6, 13.2, E(t, 2.6, 2.9)); },
      ],
      adj: [
        (F, t) => { K.toOff(F, 'shotgun__trips', E(t, .3, 1.1)); cover(F); K.showAll(F, 1); R.nums(F); F.lanes = {}; const u = E(t, 2.2, 3); K.flip(F, u); K.note(F, 'the man side is on the three', 12, 12.6, E(t, 1.2, 1.5) * (1 - E(t, 2, 2.3)), RED); K.note(F, 'flip it', 0, -8.6, E(t, 1.6, 1.9) * (1 - E(t, 2.8, 3.1)), RED);
          F.def.s6 = L2(F.def.s6, [9.6, 4.6], u); K.note(F, 'PALMS', 13.4, 15, E(t, 3, 3.3)); K.note(F, 'MAN', -13.6, 18.4, E(t, 3.3, 3.6), MAN); },
        (F, t) => { trips(F); focus(F, ['s10'], t); const one = Rt(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, one, [[17.5, 8], [10.6, 9.2]], t, 1); T.with(F, 's10', one, u, .4, 1.6); K.note(F, 'MEG: everywhere he goes', 15.4, 13.4, E(t, 2.6, 2.9)); },
        (F, t) => R.two(F, t,
          (F, t) => { trips(F); focus(F, ['s6'], t); const three = Rt(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, three, [[9, 1], [15.6, 1.8]], t, 1); T.with(F, 's6', three, u, -.6, 1.7); K.note(F, 'three to the flat: he takes him', 14.4, 5.6, E(t, 2.4, 2.7)); },
          (F, t) => { trips(F); focus(F, ['s6']); const two = Rt(F, 2), three = Rt(F, 3), u = R.u(t, .6); R.snap(F, u); R.run(F, three, [[8, 15]], t, .6); R.run(F, two, [[12.8, 6], [10.8, 5.4]], t, .6); T.with(F, 's6', two, u, -.9, 1.5); K.note(F, 'three vertical: eyes to two, man', 15.4, 9.4, E(t, 2.2, 2.5)); }),
        (F, t) => R.two(F, t,
          (F, t) => { trips(F); focus(F, ['s9'], t); const three = Rt(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, three, [[8, 15]], t, 1); T.with(F, 's9', three, u, -.9, 1.8); K.note(F, 'three vertical: he takes him', 3.4, 19.4, E(t, 2.4, 2.7)); },
          (F, t) => { trips(F); focus(F, ['s9']); const two = Rt(F, 2), three = Rt(F, 3), u = R.u(t, .6); R.snap(F, u); R.run(F, three, [[8, 3.4], [2, 4.4]], t, .6); R.run(F, two, [[12.8, 15]], t, .6); T.with(F, 's9', two, u, -1, 1.8); K.note(F, 'three shallow, two vertical: he has two', 8.6, 19.6, E(t, 2.2, 2.5)); }),
        (F, t) => { trips(F); focus(F, ['s5'], t); const three = Rt(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, three, [[8, 4.4], [-3, 6.4]], t, 1, .8); F.def.s5 = K.along([F.def.s5, [1.8, 5.2], [-.4, 5.6]], u); K.note(F, 'wall number three', -2.4, 12.8, E(t, 2.4, 2.7)); },
        (F, t) => { trips(F); focus(F, ['s7', 's8'], t); const x = L(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[-16.6, 15]], t, 1); T.with(F, 's7', x, u, .9, 1.4); K.ring(F, 's8', 1, 'USER'); F.def.s8 = L2(F.def.s8, [-2.4, 11.6], E(t, 1.6, 3)); K.note(F, 'nobody to double: you are free', -10.4, 20.6, E(t, 2.6, 2.9)); },
      ],
    }; });

  /* ---- SEAM FLATS behind a zone blitz (2026-10-12). The art is FS Zone Blitz, the cleanest picture of it: three deep thirds
     (s7, s9, s10), two seam flats (s5, s6) and one three receiver hook (s4), with five coming. The rules are in the data
     module with their sources; the one about number one staying short is the least certain in the game and wants his test ---- */
  stage('seam-flats:rules', (K) => { const { E, L2, RED } = K, R = rk(K), T = R.T, L = (F, n) => R.rec(F, -1, n), Rt = (F, n) => R.rec(F, 1, n), back = (F) => F.off.find((o) => o.p === 'RB'), trips = (F, u) => K.toOff(F, 'shotgun__trips', u == null ? 1 : u, true);   /* three to the nickel side */
    return {
      off: 'shotgun__doubles',
      call(F) { R.nums(F); },
      keys: [
        (F, t) => { R.nums(F); F.lanes = {}; T.rings(F, ['s7', 's9', 's10'], t, .4); K.note(F, 'THREE DEEP', 0, 23.6, E(t, .9, 1.2)); T.rings(F, ['s5', 's4', 's6'], t, 1.8); K.note(F, 'THREE UNDER', -13.5, 11.4, E(t, 2.4, 2.7)); },
        (F, t) => { R.focus(F, ['s5', 's6'], t); const sl = L(F, 2), te = Rt(F, 2); K.line(F, [F.def.s5.slice(), [sl.x, sl.y]], { w: 2.6, dash: [7, 7], prog: E(t, .6, 1.3) }); K.line(F, [F.def.s6.slice(), [te.x, te.y]], { w: 2.6, dash: [7, 7], prog: E(t, .9, 1.6) }); K.note(F, 'eyes on number two', 0, 17.4, E(t, 1.5, 1.8)); },
        (F, t) => { R.focus(F, ['s5'], t); const x = L(F, 1), sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-8.6, 6], [-8, 17]], t, 1); R.run(F, x, [[-17, 17]], t, 1); T.with(F, 's5', sl, u, -1, .4); F.def.s7 = L2(F.def.s7, [-17.4, 19.6], u); K.note(F, 'two vertical: man on him', -1.6, 15, E(t, 2.4, 2.7)); },
        (F, t) => { R.focus(F, ['s5'], t); const x = L(F, 1), sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-10, 3.4], [-17.6, 4.4]], t, 1); R.run(F, x, [[-17, 16]], t, 1); T.with(F, 's5', sl, u, .8, 1.5); F.def.s7 = L2(F.def.s7, [-17.4, 18.6], u); K.note(F, 'two out: he matches it', -12.6, 9.4, E(t, 2.4, 2.7)); },
        (F, t) => { R.focus(F, ['s5', 's4'], t); const sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-9, 2.6], [-1.6, 4.2]], t, 1, .92); F.def.s5 = L2(F.def.s5, [-15.4, 5.2], E(t, 1.4, 2.6)); F.def.s4 = L2(F.def.s4, [-2.8, 5.8], E(t, 1.8, 2.8)); K.note(F, 'two inside: zone off to the flat', -14.6, 10.6, E(t, 2.4, 2.7)); K.note(F, 'the hook has him', 6.4, 6.8, E(t, 2.9, 3.2)); },
        (F, t) => { R.focus(F, ['s5', 's7'], t); const x = L(F, 1), sl = L(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[-16.2, 5.4], [-15.2, 4.4]], t, 1); R.run(F, sl, [[-10, 8], [-17.2, 15.2]], t, 1); F.def.s5 = L2(F.def.s5, [-14.4, 6.4], E(t, 1.4, 2.6)); T.with(F, 's7', sl, u, .2, 1.7); K.note(F, 'one stays short: the corner has two', -6.4, 19.6, E(t, 2.5, 2.8)); },
      ],
      adj: [
        (F, t) => { R.focus(F, ['s7', 's10'], t); const x = L(F, 1), z = Rt(F, 1), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[-17, 17]], t, 1); R.run(F, z, [[17.4, 17]], t, 1); T.with(F, 's7', x, u, .6, 1.8); T.with(F, 's10', z, u, -.6, 1.8); K.note(F, 'on top of number one', 0, 21.6, E(t, 2.4, 2.7)); },
        (F, t) => { R.focus(F, ['s9'], t); const sl = L(F, 2), te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, sl, [[-8.6, 6], [-7.4, 17]], t, 1); R.run(F, te, [[6, 6], [6.6, 17]], t, 1); T.with(F, 's5', sl, u, -1, .4); T.with(F, 's6', te, u, 1, .4); F.def.s9 = L2(F.def.s9, [0, 21.4], u); T.user(F, 's9', t, .5); K.note(F, 'the roof: the deep middle first', 0, 25.4, E(t, 2.5, 2.8)); },
        (F, t) => { R.focus(F, ['s4'], t); const te = Rt(F, 2), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[4.4, 3.4], [-6.6, 4.8]], t, 1, .9); F.def.s4 = L2(F.def.s4, [-3.4, 5.8], E(t, 1.8, 2.8)); K.note(F, 'eyes on the quarterback: he steps in front', 0, 12.8, E(t, 2.6, 2.9)); },
        (F, t) => { R.focus(F, ['s6'], t); const z = Rt(F, 1), te = Rt(F, 2), rb = back(F), u = R.u(t, 1); R.snap(F, u); R.run(F, te, [[6, 6], [6.6, 17]], t, 1); R.run(F, z, [[16.3, 11], [15, 9.4]], t, 1); R.run(F, rb, [[7, -4.4], [14.6, 1.6]], t, 1); T.with(F, 's6', te, u, 1, .4); T.with(F, 's10', z, u, .4, 2.6);
          K.note(F, 'two runs him off: the flat is open', 14, 6.2, E(t, 2.5, 2.8), RED); F.def.s4 = L2(F.def.s4, [10.6, 2.8], E(t, 3, 4)); K.ring(F, 's4', E(t, 2.9, 3.3), 'USER'); K.note(F, 'user: go help in the flat', -7, 10.4, E(t, 3.4, 3.7)); },
        (F, t) => { R.focus(F, ['s5', 's6'], t); const sl = L(F, 2), u = E(t, 1.9, 3.4); F.def.s5 = L2(F.def.s5, [-14, 3.2], E(t, .5, 1.5)); F.def.s6 = L2(F.def.s6, [13.6, 3.2], E(t, .5, 1.5)); K.note(F, 'shade down: hard flats', 8, 10.6, E(t, 1.2, 1.5)); R.snap(F, u); R.run(F, sl, [[-10.4, 1.6], [-16.6, 2.4]], t, 1.9); T.with(F, 's5', sl, u, .5, 1); K.note(F, 'the quick throw to the flat is gone', -12.6, 8.6, E(t, 3.2, 3.5)); },
        /* three by one: the count, three verticals, the flood, the back side */
        (F, t) => { trips(F, E(t, .3, 1.2)); R.nums(F); F.lanes = {}; T.rings(F, ['s5', 's4', 's6'], t, 1.4); K.note(F, 'the hook finds number three', -1.6, 12.6, E(t, 2.1, 2.4)); K.note(F, 'no number two: the back is his', 14, 8.6, E(t, 2.6, 2.9)); },
        (F, t) => { trips(F); R.focus(F, ['s5', 's4', 's9'], t); const a = L(F, 1), b = L(F, 2), d = L(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, a, [[-18, 17]], t, 1); R.run(F, b, [[-12.8, 17]], t, 1); R.run(F, d, [[-7, 6], [-5.6, 17]], t, 1);
          T.with(F, 's7', a, u, .6, 1.8); T.with(F, 's5', b, u, -1, .4); F.def.s4 = L2(F.def.s4, [-4.4, 9.8], E(t, 1.4, 2.6)); F.def.s9 = L2(F.def.s9, [-4.6, 19.8], u); K.note(F, 'the hook walls three', 4.4, 8.2, E(t, 2.4, 2.7)); K.note(F, 'the middle third takes him', 2.6, 23, E(t, 2.8, 3.1)); },
        (F, t) => { trips(F); R.focus(F, ['s5', 's4'], t); const a = L(F, 1), b = L(F, 2), d = L(F, 3), u = R.u(t, 1); R.snap(F, u); R.run(F, a, [[-18, 17]], t, 1); R.run(F, b, [[-12.8, 9], [-20, 15.4]], t, 1); R.run(F, d, [[-10, 1.6], [-19.6, 3.4]], t, 1);
          T.with(F, 's7', a, u, .6, 1.8); T.with(F, 's5', b, u, 1, -1.2); K.note(F, 'three to the flat: this is the throw', -15.6, 7.2, E(t, 2.5, 2.8), RED); F.def.s4 = L2(F.def.s4, [-15.6, 3.8], E(t, 3, 4)); K.ring(F, 's4', E(t, 2.9, 3.3), 'USER'); K.note(F, 'user the hook: go with three', 6, 13.4, E(t, 3.4, 3.7)); },
        (F, t) => { trips(F); R.focus(F, ['s6', 's10'], t); const x = Rt(F, 1), rb = back(F), u = R.u(t, 1); R.snap(F, u); R.run(F, x, [[16.6, 17]], t, 1); R.run(F, rb, [[2, -4.8], [12.6, 1.6]], t, 1); T.with(F, 's10', x, u, -.6, 1.8); T.with(F, 's6', rb, u, .6, 1.5); K.note(F, 'the back is his number two', 11, 6.4, E(t, 2.5, 2.8)); },
      ],
    }; });

})();
