/* live/niners.js: the 49ers Wide Zone offense on the film board (offense-film.js), 2026-11-22.
   Every read sets the defense up to DO what his words say (niners.js has the reads, from his two recordings in Wide Zone
   Offense/). Every word on the field is his. The defense is the placeholder nickel (intro-field.js shells) lined up on our
   formation; the overrides move it.
   The shells, named from the defense's side ('Deep right third (bail)' is the corner on OUR left):
     c3 'Hook to curl left' 'Hook to curl right' 'Curl to flat right' (our right) 'Curl to flat left (creep)' (our left)
        'Deep right third (bail)' 'Deep left third (bail)' 'Deep middle third'
     c2 'Curl left' 'Middle read (lurk)' 'Curl right' 'Cloud flat left' 'Cloud flat right' 'Deep right half' 'Deep left half'
     c4 'Quarter flat left' '3-receiver hook' 'Quarter flat right' 'Deep outside right quarter' 'Deep inside right quarter' ...
     c1 '3-receiver hook', 'Man lock on #1' (furthest right after the motion) to '#5', 'Deep middle third'; c0 the locks and two 'Blitz'
   Madden plays on NFL hashes (hash: 3.08). Our players by card key, left to right: e0.. route runners, k0.. blockers off the line.
   x and y are yards on the card (the film board moves them onto the hash); times are seconds, the snap at 1. No em dashes. */
(function () {
  if (!window.skOffFilm) return;
  const S = (id, spec) => skOffFilm.stage('niners', id, Object.assign({ hash: 3.08 }, spec));
  const DEEP = [-26, -8, 26, 30], WIDE = [-24, -9, 24, 22];
  const pre = (o) => Object.assign({ pre: 1 }, o);
  const W = (t, x, y, at) => ({ t, x, y, at: at == null ? .4 : at });
  const bites = (who, on, until) => ({ who, chase: on, until: until == null ? 2.6 : until });
  const blitz = (who) => ({ who, rush: true });
  const at = (who, x, y, more) => Object.assign({ who, x, y }, more || {});
  const sits = (who, x, y, rx, ry) => ({ who, zone: [x, y, rx || 3, ry || 1.6] });
  const trails = (who, lag) => ({ who, lag: lag || 3 });
  const out = (at, paths) => ({ moveAt: at, move: paths });   /* screen linemen: a short pass set, then out in front (ol0 is the left tackle) */
  const tripsWide = (keys) => pre({ lit: keys, words: [W('Trips to the wide side of the field', -11, -6)] });
  const teShort = () => pre({ lit: ['k2', 'e1', 'e3', 'e4'], words: [W('Tight ends to the short side', 9, -6)] });

  /* ================= BASE OFFENSE ================= */
  /* trips RIGHT to the short side, the outside receiver (k3) motions across, the zone goes left to the wide side */
  const zone = (p) => ({ run: { who: 'e0', path: p || [[-1.5, -5.5], [-3.4, -2.5], [-4.4, 1], [-5.6, 6], [-7.2, 13], [-8.5, 22]] }, hand: { to: 'e0', at: 1.5 } });
  const STAY = [sits('Hook to curl right', 5, 6, 3, 2), sits('Curl to flat right', 11, 6, 3, 2)];   /* nobody comes over with the motion */
  S('mtn-hb-zone-wk', { cov: 'c3', cam: WIDE, wide: 'L',
    keys: [
      pre({ lit: ['k3'], words: [W('Auto motion that comes across', 0, -5.5)] }),
      Object.assign({ cov: 'c4', lit: ['e0', 'k3'], ring: ['3-receiver hook', 'Quarter flat right'], def: [sits('3-receiver hook', 5, 6, 3, 2), sits('Quarter flat right', 11, 6, 3, 2)], words: [W('Not going to bring an extra guy over', 5, 7, .7), W('Just bought an extra blocker', -9, 0, 1.6)] }, zone()),
      Object.assign({ cov: 'c3', lit: ['e0'], def: STAY, words: [W('Outside heel of the offensive lineman', -6, -2, 1.4), W('Bend it back', 0, 5, 2.1)] }, zone()),
      Object.assign({ cov: 'c3', lit: ['e0'], end: 7, def: STAY.concat([sits('Curl to flat left (creep)', -13, 4, 3, 1.5), bites('Deep left third (bail)', 'k2', 9), bites('Deep middle third', 'k3', 9), bites('Deep right third (bail)', 'k0', 9)]), words: [W('Cut it back', -1, 4, 1.7), W('We are gone', 0, 12, 2.5)] },
        zone([[-1.5, -5.5], [-2.9, -2.5], [-1.2, 1], [.6, 8], [1.5, 22]])),
      Object.assign({ cov: 'c1', lit: ['e0', 'k2'], ring: ['Man lock on #5'], def: [at('3-receiver hook', 4, 5, { chase: 'k2', until: 2.8 }), at('Man lock on #4', -13, 8, { chase: 'k0', until: 3.6 })], words: [W('We don\'t gain anything', -9, 5, 1.0), W('We don\'t lose anything', -5, 11, 2.2)] }, zone()),
    ],
    adj: [pre({ lit: ['k1', 'k2', 'k3'], words: [W('Trips to the short side of the field', 10, -6)] })],
    run: Object.assign({ cov: 'c3', lit: ['e0', 'k3'], def: STAY }, zone()) });

  /* trips RIGHT to the wide side: e3 the jet motion, e1 the fake and the flat, e2 the tight end corner, e4 the streak, e0 the crosser */
  const boot = (o) => Object.assign({ fake: { who: 'e1', until: .9 }, roll: [[1, -4.5], [5.5, -6], [9.5, -4.6]] }, o);
  S('jet-pa-sprint-rt', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      boot({ cov: 'c3', lit: ['e3', 'e1'], ring: ['Hook to curl right'], def: [bites('Hook to curl right', 'e3', 2.6)], moment: 2, words: [W('He just stops his feet', 2, 7, 1.3), W('Boot out the opposite way', 8, -7.5, 1.6)] }),
      boot({ cov: 'c3', lit: ['e2', 'e4'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [sits('Curl to flat right', 14, 6), bites('Deep left third (bail)', 'e4', 5), bites('Hook to curl right', 'e1', 2)], end: 6.6, throws: [{ man: 'e2', at: 3.55 }], words: [W('Flat defender staying shallow', 14, 5, 1.6), W('Up over his head', 15, 17, 2.6)] }),
      boot({ cov: 'c3', lit: ['e1'], ring: ['Curl to flat right'], def: [sits('Curl to flat right', 14, 16, 3, 2), sits('Hook to curl right', 5, 12, 3, 2)], throws: [{ man: 'e1', at: 2.7 }], words: [W('15 to 20 yards', 14, 17, 1.4), W('Drop it down to the running back', 13, 1, 2.2)] }),
      boot({ cov: 'c3', lit: ['e0'], ring: ['Curl to flat right', 'Hook to curl right'], def: [bites('Curl to flat right', 'e1', 4), bites('Hook to curl right', 'e1', 4), sits('Hook to curl left', -6, 6), bites('Deep left third (bail)', 'e2', 5), at('Deep middle third', 0, 14, { zone: [0, 24, 6, 3] })], throws: [{ man: 'e0', at: 3.2 }], words: [W('Deep crosser coming across', 2, 14, 2.1), W('Nice hole', 7, 11, 2.6)] }),
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side of the field', 11, -6)] }), pre({ lit: ['e4'], words: [W('Streak', 13, 18)] }), pre({ lit: ['e2'], words: [W('Corner route', 14, 16)] })],
    run: boot({ cov: 'c3', lit: ['e2', 'e4'], def: [sits('Curl to flat right', 14, 6), bites('Deep left third (bail)', 'e4', 5), bites('Hook to curl right', 'e1', 2)], end: 6.6, throws: [{ man: 'e2', at: 3.55 }] }) });

  /* the two tight ends RIGHT: the left guard pulls across and traps, the back right up the middle */
  const TRAPDEF = { c2: [bites('Cloud flat right', 'k3', 4.6), bites('Curl right', 'k2', 2.6)], c3: [bites('Deep left third (bail)', 'k3', 4.6), bites('Curl to flat right', 'k2', 2.6)] };
  const trap = (cov) => ({ cov: cov || 'c2', def: TRAPDEF[cov || 'c2'], run: { who: 'e0', path: [[.9, -4], [.3, -1], [-.4, 3], [-1.2, 9], [-1.2, 22]] }, hand: { to: 'e0', at: 1.4 } });
  S('0-1-trap', { cov: 'c2', cam: WIDE, wide: 'L',
    keys: [
      pre({ lit: ['k2', 'k3'], words: [W('More beef on the field', 7, -5)] }),
      Object.assign(trap(), { lit: ['e0'], words: [W('Let this D tackle through', 2, -2.5, 1.1), W('Start picking off linebackers', -2, 6, 1.9)] }),
      Object.assign(trap(), { lit: ['e0', 'pull'], words: [W('Our guard comes out traps him', 2, -2.5, 1.3), W('Massive lane', -1, 6, 1.9)] }),
      Object.assign(trap('c3'), { lit: ['e0'], words: [W('Right up the middle', 0, 4, 1.6), W('Make a safety miss', 0, 14, 2.6)] }),
    ],
    adj: [],
    run: Object.assign(trap(), { lit: ['e0', 'pull'] }) });

  /* two receivers LEFT to the wide side: e3 the tight end corner, e2 the seam, e1 the shallow cut, e0 the post, k0 the fake */
  const pa = (o) => Object.assign({ fake: { who: 'k0', until: .8 } }, o);
  S('pa-read', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      pa({ cov: 'c3', lit: ['e3'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [sits('Curl to flat right', 13, 8), bites('Deep left third (bail)', 'e2', 5)], throws: [{ man: 'e3', at: 3.05 }], words: [W('Hold those linebackers down', 0, 4, 1.3), W('Up along the sideline', 16, 18, 2.6)] }),
      pa({ cov: 'c3', lit: ['e2'], ring: ['Deep left third (bail)', 'Hook to curl right'], def: [at('Deep left third (bail)', 7, 12, { zone: [9, 20, 2.5, 2] }), sits('Hook to curl right', 2.5, 3), sits('Hook to curl left', -3, 3), sits('Curl to flat right', 14, 8), at('Deep middle third', -4, 14, { zone: [-6, 24, 4, 3] })], throws: [{ man: 'e2', at: 2.6 }], words: [W('Single high safety', -5, 24, .3), W('Right down the seam', 6, 15, 2.2)] }),
      pa({ cov: 'c3', lit: ['e1'], ring: ['Hook to curl left', 'Hook to curl right'], def: [sits('Hook to curl left', -2, 2.5), sits('Hook to curl right', 2, 2.5), sits('Curl to flat left (creep)', -14, 5), at('Deep middle third', 0, 15, { zone: [0, 25, 5, 3] })], throws: [{ man: 'e1', at: 2.7 }], words: [W('He sees play action', 0, 2, 1.4), W('It\'s too late', 0, 14, 2.4)] }),
      pa({ cov: 'c1', lit: ['e1', 'e0'], ring: ['Man lock on #4'], def: [trails('Man lock on #4'), sits('3-receiver hook', 0, 4)], throws: [{ man: 'e1', at: 2.75 }], words: [W('Two best options verse man', 0, 18, 1.2), W('How much time do we have', 0, -4, 1.9)] }),
      pa({ cov: 'c3', lit: ['e0'], ring: ['Curl to flat right', 'Hook to curl right'], def: [bites('Hook to curl left', 'e1', 4), bites('Hook to curl right', 'e1', 4), bites('Deep left third (bail)', 'e3', 5), sits('Curl to flat left (creep)', -15, 5), at('Deep middle third', 3, 15, { zone: [4, 28, 5, 3] }), sits('Deep right third (bail)', -18, 27, 5, 3)], end: 6.4, throws: [{ man: 'e0', at: 3.2 }], words: [W('Shallow cross is taken away', 4, 12, 1.6), W('Deeper post', -5, 20, 2.4)] }),
    ],
    adj: [pre({ lit: ['e0', 'e1'], words: [W('Two receiver side to the wide side', -12, -6)] }), pre({ lit: ['e2'], words: [W('Streak', 5, 16)] })],
    run: pa({ cov: 'c3', lit: ['e3'], def: [sits('Curl to flat right', 13, 8), bites('Deep left third (bail)', 'e2', 5)], throws: [{ man: 'e3', at: 3.05 }] }) });

  /* ================= McCAFFREY PASS GAME ================= */
  /* trips LEFT to the wide side: e3 the shuffle and wheel on the right, e4 the streak, e2 the drag, e1 the dig, e0 the post */
  const UNDER = [sits('Cloud flat right', 17, 4), bites('Deep left half', 'e4', 5), sits('Curl right', 5, 8)];
  S('mtn-mills', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c2', lit: ['e3', 'e4'], ring: ['Cloud flat right', 'Deep left half'], def: UNDER, end: 6.6, throws: [{ man: 'e3', at: 3.6 }], words: [W('Streak is going to pull back', 8, 22, 1.6), W('Clear in behind the flat', 17, 13, 2.5)] },
      { cov: 'c1', lit: ['e3'], ring: ['Man lock on #2'], def: [at('Man lock on #2', 1, 5, { lag: 3 })], throws: [{ man: 'e3', at: 2.4 }], words: [W('Linebacker gets caught inside', 3, 6, 1.2), W('Quick throw', 14, 4, 2.0)] },
      { cov: 'c3', lit: ['e2'], ring: ['Curl to flat right', 'Hook to curl right'], def: [bites('Curl to flat right', 'e3', 4.5), sits('Hook to curl right', 5, 14, 3, 2), sits('Hook to curl left', -5, 14, 3, 2)], throws: [{ man: 'e2', at: 3.6 }], words: [W('Way underneath your wheel', 16, 14, 1.4), W('Just in behind the wheel', 4, 3, 2.1)] },
      { cov: 'c3', lit: ['e1', 'e2'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl left', 'e2', 4), bites('Hook to curl right', 'e2', 4), bites('Curl to flat right', 'e3', 4), sits('Curl to flat left (creep)', -16, 5), at('Deep middle third', 2, 15, { zone: [4, 25, 4, 3] })], throws: [{ man: 'e1', at: 2.75 }], words: [W('Drag kind of pulling guys down', 2, 3, 1.5), W('Dig breaking in', -5, 14, 2.3)] },
      { cov: 'c4', lit: ['e0'], ring: ['3-receiver hook', 'Deep inside right quarter'], def: [bites('3-receiver hook', 'e2', 4), at('Deep inside right quarter', -8, 12, { zone: [-8, 29, 6.3, 3] }), bites('Deep inside left quarter', 'e4', 5), sits('Deep outside right quarter', -21, 26, 6.3, 3)], end: 7, throws: [{ man: 'e0', at: 3.8 }], words: [W('Three layers in the middle', -2, 7, 1.5), W('Let it fly', -8, 22, 2.8)] },
    ],
    adj: [tripsWide(['e0', 'e1', 'e2']), pre({ lit: ['e4'], words: [W('Streak', 9, 18)] }), pre({ lit: ['e0'], words: [W('Post', -14, 18)] })],
    run: { cov: 'c2', lit: ['e3', 'e4'], def: UNDER, end: 6.6, throws: [{ man: 'e3', at: 3.6 }] } });

  /* trips LEFT: e2 the orbit to the right, e3 the screen back left, e1 the deep crosser, e4 the dig, e0 the clear out */
  const FOLLOW = [bites('Hook to curl left', 'e2', 3), bites('Hook to curl right', 'e2', 3.4), bites('Deep right third (bail)', 'e0', 5), sits('Curl to flat left (creep)', -9, 8, 3, 2)];
  const SCREEN_L = out(.45, { ol0: [[-5, -2.5], [-8, -2], [-9, .5]], ol1: [[-3.5, -3], [-6.5, -3], [-7, -.5]], ol2: [[-1.5, -3], [-4.5, -3.5], [-5, -1.5]] });
  S('orbit-cross-screen', { cov: 'c3', cam: WIDE, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left', 'Hook to curl right'], def: FOLLOW, moment: 1.9, words: [W('Eye candy', 4, -7.5, .8), W('Follow the orbit', 8, 3, 1.5)] },
      Object.assign({ cov: 'c3', lit: ['e3'], ring: ['Hook to curl left', 'Hook to curl right'], def: FOLLOW, throws: [{ man: 'e3', at: 2.3 }] }, SCREEN_L, { words: [W('Sneak McCaffrey out', -12, -6.5, 1.5), W('Three blockers get out in front', -12, 1, 2.1)] }),
      { cov: 'c3', lit: ['e1'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl left', 'e3', 4), bites('Hook to curl right', 'e2', 4), bites('Curl to flat left (creep)', 'e3', 4), at('Deep middle third', -3, 15, { zone: [-3, 26, 8.5, 3] })], throws: [{ man: 'e1', at: 2.75 }], words: [W('Leave the middle of the field', 0, 5, 1.4), W('Replaces in the middle of the field', -3, 18, 2.3)] },
      { cov: 'c1', lit: ['e1', 'e4'], ring: ['Man lock on #4'], def: [at('Man lock on #4', -14, 9, { lag: 4, shade: 'out' }), bites('3-receiver hook', 'e3', 3), at('Deep middle third', 5, 16, { zone: [6, 27, 4, 3] })], throws: [{ man: 'e1', at: 2.8 }], words: [W('Screens aren\'t great against man', -6, -5, 1.0), W('Crosser coming across the field', -4, 16, 2.3)] },
    ],
    adj: [tripsWide(['e0', 'e1', 'e2'])],
    run: Object.assign({ cov: 'c3', lit: ['e3'], def: FOLLOW, throws: [{ man: 'e3', at: 2.3 }] }, SCREEN_L) });

  /* trips LEFT: e3 the wheel, e1 and e4 the streaks, e0 the deep cross, e2 the orbit */
  const opa = (o) => Object.assign({ fake: { who: 'e3', until: .6 } }, o);
  const WHEEL = [sits('Curl to flat left (creep)', -17, 4), bites('Deep right third (bail)', 'e1', 5), bites('Hook to curl right', 'e2', 3), sits('Hook to curl left', -5, 8)];
  S('orbit-pa-hb-wheel', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      opa({ cov: 'c3', lit: ['e3', 'e1'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: WHEEL, end: 7.4, throws: [{ man: 'e3', at: 4.8 }], words: [W('Pull back the deep blue defenders', -9, 24, 1.8), W('Clears that flat defender', -20, 13, 2.8)] }),
      opa({ cov: 'c1', lit: ['e3', 'e2'], ring: ['Man lock on #2'], def: [bites('Man lock on #2', 'e2', 4.5), bites('3-receiver hook', 'e2', 3)], throws: [{ man: 'e3', at: 2.6 }], words: [W('User to stay disciplined', 6, 8, 1.3), W('Running back just squirts out', -12, -1, 2.2)] }),
      opa({ cov: 'c3', lit: ['e0'], ring: ['Hook to curl left', 'Hook to curl right'], def: [sits('Hook to curl left', -4, 3.5), sits('Hook to curl right', 4, 3.5), bites('Curl to flat left (creep)', 'e3', 4), bites('Curl to flat right', 'e2', 4), bites('Deep right third (bail)', 'e1', 5), at('Deep middle third', 2, 16, { zone: [2, 28, 5, 3] }), bites('Deep left third (bail)', 'e4', 5)], throws: [{ man: 'e0', at: 2.85 }], words: [W('Linebackers stay shallow', 0, 4, 1.5), W('Deep crosser up over the top', -5, 16, 2.4)] }),
      opa({ cov: 'c3', lit: ['e2'], ring: ['Curl to flat right', 'Hook to curl right'], def: [at('Curl to flat right', 8, 7, { zone: [11, 16, 3, 2] }), at('Hook to curl right', 3, 7, { zone: [4, 15, 3, 2] }), sits('Curl to flat left (creep)', -15, 15, 3, 2)], throws: [{ man: 'e2', at: 2.4 }], words: [W('Everyone\'s playing back', 4, 14, 1.4), W('Opposite flat', 10, -6, 2.1)] }),
    ],
    adj: [tripsWide(['e0', 'e1', 'e2']), pre({ lit: ['e1'], words: [W('Streak', -12, 18)] }), pre({ lit: ['e0'], words: [W('Deep cross', -10, 14)] }), pre({ lit: ['e4'], words: [W('Streak', 5, 18)] })],
    run: opa({ cov: 'c3', lit: ['e3', 'e1'], def: WHEEL, end: 7.4, throws: [{ man: 'e3', at: 4.8 }] }) });

  /* ================= EXPLOSIVE PASS GAME ================= */
  /* trips LEFT: e0 motions down into the stack and runs the corner, e1 the quick out, e2 the post, e4 the drag, e3 blocks */
  S('mtn-corner-y-drag', { cov: 'c1', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c1', lit: ['e0'], ring: ['Man lock on #5'], def: [at('Man lock on #5', -11, 7, { lag: 3.2 }), at('Man lock on #4', -10, 3.5, { lag: 2.6 })], throws: [{ man: 'e0', at: 2.9 }], words: [W('Guys can\'t press him', -14, -5, .5), W('Break to the outside', -19, 14, 2.4)] },
      { cov: 'c1', lit: ['e1'], ring: ['Man lock on #4'], def: [at('Man lock on #4', -12, 6, { lag: 2.2 })], throws: [{ man: 'e1', at: 2.2 }], words: [W('Gets caught inside', -11, 8, 1.2), W('Delay quick out', -18, 4, 1.9)] },
      { cov: 'c1', lit: ['e2'], ring: ['Deep middle third', 'Man lock on #3'], def: [bites('Deep middle third', 'e4', 6), { who: 'Man lock on #3', lag: 2.6 }], throws: [{ man: 'e2', at: 2.8 }], words: [W('The safeties running down on the tight end', 4, 9, 1.1), W('One on one in the middle of the field', -4, 18, 2.2)] },
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #1'], def: [trails('Man lock on #1', 3.4), at('Man lock on #2', 1, 7), sits('3-receiver hook', -2, 12)], throws: [{ man: 'e4', at: 2.2 }], words: [W('Drag is our other checkdown', 3, 4, 1.7), W('Four ways to beat man', 0, 16, 1.1)] },
      { cov: 'c3', lit: ['e0', 'e1', 'e4'], ring: ['Deep right third (bail)', 'Curl to flat left (creep)'], reroute: { e1: [[-12.7, -.8], [-11.5, 4], [-11, 32]], e4: [[8, -.8], [6.5, 3], [2, 4], [2, 3.6]] }, def: [bites('Deep right third (bail)', 'e1', 5), sits('Curl to flat left (creep)', -16, 4), sits('Hook to curl left', -4, 8)], throws: [{ man: 'e0', at: 3.0 }], words: [W('Run off deep defenders', -10, 22, 1.7), W('Sitting down versus zone', 4, 3, 2.0)] },
    ],
    adj: [tripsWide(['e0', 'e1', 'e2']), pre({ lit: ['e2'], words: [W('Post', -6, 16)] }), pre({ lit: ['e3'], words: [W('Block your running back', 5, -8)] }), pre({ lit: ['e1'], reroute: { e1: [[-12.7, -.8], [-11.5, 4], [-11, 32]] }, words: [W('Streak', -11, 18)] })],
    run: { cov: 'c1', lit: ['e0'], def: [at('Man lock on #5', -11, 7, { lag: 3.2 }), at('Man lock on #4', -10, 3.5, { lag: 2.6 })], throws: [{ man: 'e0', at: 2.9 }] } });

  /* trips LEFT: k0 the back motioned over on the streak, e2 the post over to the short side, e3 the tight end corner, e1 the curl, e0 the dig */
  const C3BOMB = [at('Deep middle third', -3, 13, { zone: [-4, 21, 4, 3], chase: 'k0', until: 3.6 }), bites('Deep left third (bail)', 'e3', 5), sits('Curl to flat right', 14, 6), sits('Hook to curl right', 4, 7)];
  S('deep-in', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e2', 'k0', 'e3'], ring: ['Deep middle third', 'Deep left third (bail)'], def: C3BOMB, end: 7.4, throws: [{ man: 'e2', at: 4.1 }], words: [W('Hold that safety in the middle', -5, 19, 1.8), W('Up and over to the short side', 8, 26, 2.9)] },
      { cov: 'c2', lit: ['e2', 'k0', 'e3'], ring: ['Deep right half', 'Deep left half'], def: [blitz('Middle read (lurk)'), bites('Deep left half', 'e3', 5), bites('Deep right half', 'k0', 5)], end: 7.2, throws: [{ man: 'e2', at: 3.9 }], words: [W('Don\'t have a middle defender', 0, 7, .9), W('Split these two safeties', 3, 24, 2.8)] },
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)', 'Hook to curl left'], def: [at('Curl to flat left (creep)', -10, 9, { zone: [-13, 15, 3, 2] }), at('Hook to curl left', -4, 9, { zone: [-4, 16, 3, 2] })], throws: [{ man: 'e1', at: 2.5 }], words: [W('Playing way off', -8, 15, 1.2), W('Just throw that curl route', -13, 3, 1.9)] },
      { cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: [bites('Curl to flat left (creep)', 'e1', 4), at('Deep right third (bail)', -17, 10, { zone: [-17, 27, 5, 3] }), sits('Hook to curl left', -2, 5)], throws: [{ man: 'e0', at: 2.7 }], words: [W('Playing over the top', -14, 25, 1.4), W('Dig over the top', -12, 14, 2.3)] },
    ],
    adj: [tripsWide(['e0', 'e1', 'e2']), pre({ lit: ['k0'], words: [W('Running back over', -2, -8), W('Streak', -4, 18)] }), pre({ lit: ['e1'], words: [W('Curl route', -13, 6)] })],
    run: { cov: 'c3', lit: ['e2', 'k0', 'e3'], def: C3BOMB, end: 7.4, throws: [{ man: 'e2', at: 4.1 }] } });

  /* ================= SCHEME KINGS ================= */
  /* trips LEFT: e0 the screen, e1 the orbit, e2 the back */
  const HELD = [bites('Cloud flat right', 'e1', 4.6), bites('Curl right', 'e1', 4.2), bites('Curl left', 'e0', 3.4)];
  const up = (o) => Object.assign({ run: { who: 'e2', path: [[1.2, -4.5], [.1, -1.5], [-.7, 3], [-1.2, 9], [-1.2, 22]] }, hand: { to: 'e2', at: 1.45 } }, o);
  S('orbit-rpo-zone-alert', { cov: 'c3', cam: WIDE, wide: 'L',
    keys: [
      { cov: 'c1', fake: { who: 'e2', until: .6 }, lit: ['e1'], ring: ['Man lock on #3'], def: [at('Man lock on #3', -5, 6, { lag: 4 }), at('Man lock on #1', 4, 6)], throws: [{ man: 'e1', at: 2.2 }], words: [W('Whole mess in the middle', 0, 4, 1.3), W('Get to the perimeter', 13, -5, 2.0)] },
      up({ cov: 'c2', lit: ['e2'], ring: ['Curl right', 'Cloud flat left'], def: HELD, words: [W('Hold these guys to the outside', 10, 1, 1.1), W('Ton more running room up the middle', 0, 7, 1.9)] }),
      { cov: 'c3', fake: { who: 'e2', until: .7 }, lit: ['e0'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -5, 4.5, { chase: 'e1', until: 2.6 }), at('Deep right third (bail)', -14, 8)], throws: [{ man: 'e0', at: 1.6 }], words: [W('Stays inside on the orbit', -4, 8, .9), W('Two on one on the outside', -17, 3, 1.6)] },
    ],
    adj: [tripsWide(['e0', 'e1', 'k0'])],
    run: up({ cov: 'c2', lit: ['e2'], def: HELD }) });

  /* trips LEFT: e0 the bubble behind k0 and k1, e1 the back */
  const INSIDE = [at('Curl left', -4, 5, { zone: [-3, 4, 2, 2] }), at('Deep right half', -7, 12)];
  const bub = (o) => Object.assign({ fake: { who: 'e1', until: .7 }, throws: [{ man: 'e0', at: 1.7 }] }, o);
  S('rpo-zone-alert-omaha', { cov: 'c2', cam: WIDE, wide: 'L',
    keys: [
      bub({ cov: 'c2', lit: ['e0'], ring: ['Curl left'], def: INSIDE, words: [W('One guy shoots inside', -4, 6, 1.0), W('Three on two', -15, 4, 1.4)] }),
      bub({ cov: 'c2', lit: ['e0', 'k0', 'k1'], ring: ['Rush#1'], def: INSIDE.concat([bites('Rush#1', 'e0', 3.4)]), words: [W('Trying to get out there', -6, -2.5, 1.2), W('Beat that defensive end to the edge', -15, 6, 1.9)] }),
      { cov: 'c2', lit: ['e1'], ring: ['Curl left', 'Cloud flat left'], def: [at('Curl left', -9, 5, { zone: [-12, 3, 3, 2] })], run: { who: 'e1', path: [[1.2, -4.5], [.1, -1.5], [-.7, 3], [-1.2, 9], [-1.2, 22]] }, hand: { to: 'e1', at: 1.45 }, words: [W('They\'re playing the bubble', -12, 4, 1.0), W('Numbers advantage up the middle', 0, 7, 1.8)] },
    ],
    adj: [tripsWide(['e0', 'k0', 'k1'])],
    run: bub({ cov: 'c2', lit: ['e0'], def: INSIDE }) });

  /* trips LEFT: e3 the shuffle to the flat, e4 the corner over it, e2 the stick, e1 the out, e0 the comeback */
  S('mtn-stick', { cov: 'c2', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right'], def: [at('Curl to flat right', 9, 7, { zone: [13, 15, 3, 2] }), sits('Hook to curl right', 4, 13, 3, 2)], throws: [{ man: 'e3', at: 2.1 }], words: [W('Getting depth', 13, 15, 1.2), W('Throw that running back in the flat', 14, 2, 1.8)] },
      { cov: 'c2', lit: ['e4', 'e3'], ring: ['Cloud flat right'], def: [bites('Cloud flat right', 'e3', 4.5), sits('Deep left half', 11, 21, 12.8, 3), sits('Curl right', 5, 8)], throws: [{ man: 'e4', at: 2.9 }], words: [W('Jumping down on the running back', 16, 3, 1.4), W('High low', 15, 8, 1.8), W('Up over top of that corner', 17, 18, 2.5)] },
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #1'], def: [at('Man lock on #1', 6.5, 6, { lag: 3 })], throws: [{ man: 'e4', at: 2.8 }], words: [W('Breaks on the corner', 12, 11, 1.8), W('Throw the tight end corner', 16, 17, 2.4)] },
      { cov: 'c3', lit: ['e2'], ring: ['Curl to flat left (creep)', 'Hook to curl left'], def: [at('Curl to flat left (creep)', -12.5, 5, { chase: 'e1', until: 4 }), sits('Hook to curl left', -4, 8, 3, 1.6)], throws: [{ man: 'e2', at: 2.2 }], words: [W('Zone', -8, 13, 1.1), W('Sit down', -8, 5, 1.8)] },
      { cov: 'c3', lit: ['e1', 'e0'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -10, 7, { zone: [-16, 12, 3, 2] })], throws: [{ man: 'e1', at: 2.15 }], words: [W('Sink underneath', -18, 12, 1.4), W('Out route is just going to get wide open', -19, 4, 1.9)] },
    ],
    adj: [tripsWide(['e0', 'e1', 'e2']), pre({ lit: ['e0'], words: [W('Comeback', -18, 14)] }), pre({ lit: ['e4'], words: [W('Corner route', 14, 14)] })],
    run: { cov: 'c3', lit: ['e3'], def: [at('Curl to flat right', 9, 7, { zone: [13, 15, 3, 2] }), sits('Hook to curl right', 4, 13, 3, 2)], throws: [{ man: 'e3', at: 2.1 }] } });

  /* trips RIGHT to the wide side: e2 the jet man hooks up on the left, e0 the deep over, e1 the flat, e3 the clear out */
  const jet = (o) => Object.assign({ fake: { who: 'e1', until: .8 }, roll: [[.5, -4.5], [2.5, -6]] }, o);
  const PULLED = [bites('Hook to curl left', 'e1', 2.4), sits('Curl to flat left (creep)', -8, 12, 3, 2), bites('Deep right third (bail)', 'e0', 4)];
  const JETOUT = out(.5, { ol0: [[-5, -2], [-8.5, -1.5], [-9.5, 1]], ol1: [[-3.5, -2.5], [-6.5, -2], [-7.5, .5]] });
  S('jet-pa-slot-screen', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      jet(Object.assign({ cov: 'c3', lit: ['e2'], ring: ['Hook to curl left'], def: PULLED, throws: [{ man: 'e2', at: 2.3 }] }, JETOUT, { words: [W('Going to boot out', 5, -7.5, 1.2), W('Hitch up right here', -7, -6, 1.6), W('Two offensive linemen pull out in front', -10, 2, 2.1)] })),
      jet({ cov: 'c1', lit: ['e0'], ring: ['Man lock on #5'], def: [trails('Man lock on #5', 3.4), bites('3-receiver hook', 'e2', 4), at('Deep middle third', 0, 15, { zone: [0, 27, 5, 3] })], throws: [{ man: 'e0', at: 2.8 }], words: [W('Overloading this side', -8, 0, 1.3), W('Has about a step', 3, 13, 2.3)] }),
      jet({ cov: 'c3', lit: ['e1'], ring: ['Curl to flat right'], def: [at('Curl to flat right', 9, 8, { zone: [13, 15, 3, 2] }), sits('Hook to curl right', 5, 13, 3, 2), bites('Hook to curl left', 'e2', 3)], throws: [{ man: 'e1', at: 2.5 }], words: [W('Everybody\'s getting back', 11, 14, 1.4), W('Running back going into the flat', 12, 1, 2.1)] }),
    ],
    adj: [pre({ lit: ['e2', 'e3', 'k0'], words: [W('Three receiver side to the wide side', 11, -6)] })],
    run: jet(Object.assign({ cov: 'c3', lit: ['e2'], def: PULLED, throws: [{ man: 'e2', at: 2.3 }] }, JETOUT)) });

  /* trips RIGHT: e2 the corner, e3 motions across and runs the post, e0 the shallow cross, e1 the drag, k0 blocks */
  const mb = (o) => Object.assign({ fake: { who: 'k0', until: .5 }, ppa: 1, roll: [[.5, -4.5], [3, -6], [4.5, -5.5]] }, o);   /* ppa: the line pass sets, nobody comes in unblocked */
  const done = (o) => Object.assign({ set: 1 }, o);   /* the auto motion already done (his note: no waiting on it every read) */
  S('mtn-pa-boot-rt', { cov: 'c1', cam: DEEP, wide: 'R',
    keys: [
      mb({ cov: 'c1', lit: ['e2'], ring: ['Man lock on #1'], def: [at('Man lock on #1', 9, 7, { lag: 3 })], throws: [{ man: 'e2', at: 3.0 }], words: [W('Nothing over here', 15, 3, .8), W('One on one with this corner', 15, 14, 2.3)] }),
      mb(done({ cov: 'c1', lit: ['e0'], ring: ['Man lock on #4'], def: [trails('Man lock on #4', 3.4), bites('3-receiver hook', 'e1', 3), at('Deep middle third', 0, 15, { zone: [0, 27, 5, 3] })], throws: [{ man: 'e0', at: 2.8 }], words: [W('Scan the middle', -2, 14, 1.8), W('Shallow cross', 3, 11, 2.3)] })),
      mb(done({ cov: 'c1', lit: ['e3'], ring: ['Man lock on #5', 'Deep middle third'], def: [trails('Man lock on #5', 3.6), bites('3-receiver hook', 'e0', 4), at('Deep middle third', 3, 16, { zone: [4, 28, 5, 3] })], throws: [{ man: 'e3', at: 2.8 }], words: [W('Deeper post', -8, 15, 2.1), W('In front of the safety', 2, 24, 2.6)] })),
      mb(done({ cov: 'c0', lit: ['e1'], ring: ['Blitz'], def: [{ who: 'Man lock on #2', x: 5, y: 7, lag: 3.5 }, at('Man lock on #3', 1, 7, { chase: 'k0', until: 6 })], throws: [{ man: 'e1', at: 2.05 }], words: [W('Bringing a blitz', 4, 8, .9), W('The drag is your hot', -6, 1, 1.7)] })),
    ],
    adj: [pre({ lit: ['e1', 'e2', 'e3'], words: [W('Trips to the wide side of the field', 11, -6)] }), pre({ lit: ['e2'], words: [W('Corner route', 14, 14)] }), pre({ lit: ['k0'], words: [W('Block your running back', 0, -9)] }), pre({ lit: ['e1'], words: [W('Drag', -6, 4)] })],
    run: mb({ cov: 'c1', lit: ['e2'], def: [at('Man lock on #1', 9, 7, { lag: 3 })], throws: [{ man: 'e2', at: 3.0 }] }) });

  /* trips RIGHT to the short side: e1 the wheel to the wide side, e0 the streak, e4 the drag, e2 the sit, e3 the Z post */
  const SHALLOW = [sits('Curl to flat left (creep)', -15, 2.5), bites('Deep right third (bail)', 'e0', 5), sits('Hook to curl left', -4, 8)];
  S('mesh', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e1', 'e0'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: SHALLOW, end: 7.4, throws: [{ man: 'e1', at: 4.7 }], words: [W('Flat stays shallow', -14, 3, 1.5), W('Clears up over his head', -18, 11, 2.7)] },
      done({ cov: 'c3', lit: ['e4', 'e1'], ring: ['Curl to flat left (creep)', 'Hook to curl left'], def: [at('Curl to flat left (creep)', -9, 7, { zone: [-16, 15, 3, 2] }), sits('Hook to curl left', -5, 13, 3, 2), sits('Hook to curl right', 5, 13, 3, 2)], throws: [{ man: 'e4', at: 4.0 }], words: [W('Everyone\'s playing back', -8, 14, 1.4), W('Throw this drag', -10, 3, 3.0)] }),
      done({ cov: 'c3', lit: ['e2'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl left', 'e4', 4), bites('Hook to curl right', 'e4', 4), bites('Curl to flat left (creep)', 'e1', 4), sits('Curl to flat right', 15, 5), at('Deep middle third', 0, 15, { zone: [0, 26, 5, 3] })], throws: [{ man: 'e2', at: 3.4 }], words: [W('Drive on the drag', 0, 3, 1.5), W('Sit route', -1, 12, 2.9)] }),
      done({ cov: 'c3', lit: ['e3'], ring: ['Deep middle third'], def: [bites('Deep middle third', 'e0', 5), bites('Hook to curl left', 'e2', 4), bites('Hook to curl right', 'e4', 4), sits('Deep left third (bail)', 19, 22, 4, 3)], end: 7, throws: [{ man: 'e3', at: 4.0 }], words: [W('Turning their back', -10, 21, 1.8), W('Right in behind', 0, 22, 2.6)] }),
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the short side of the field', 10, -6)] }), pre({ lit: ['e1'], words: [W('Wheel route', -15, 7)] }), pre({ lit: ['e0'], words: [W('Streak', -11, 18)] })],
    run: { cov: 'c3', lit: ['e1', 'e0'], def: SHALLOW, end: 7.4, throws: [{ man: 'e1', at: 4.7 }] } });

  /* tight ends RIGHT, the Z closed in on the left: the center and the guard pull, the toss goes right */
  const toss = (o) => Object.assign({ cov: 'c3', run: { who: 'e0', path: [[4.5, -5.6], [7.5, -3.6], [9.6, 0], [10.8, 6], [12, 14], [12.5, 23]], speed: 8 }, hand: { to: 'e0', at: 1.35 }, def: [at('Curl to flat right', 6, 4), at('Hook to curl right', 2.5, 4.5)] }, o);
  S('z-close-toss', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      toss({ lit: ['e0', 'pull'], words: [W('They run power run plays as well', 0, 6, .6), W('Pullers', 6, -3, 1.5)] }),
      toss({ lit: ['e0'], words: [W('Not thinking toss', 0, 5, .6), W('Same side run', 7, -6.5, 1.4)] }),
      toss({ lit: ['e0', 'k1', 'k2'], ring: ['Curl to flat right', 'Hook to curl right'], words: [W('Pin everyone inside', 3, 4.5, 1.4), W('Turn the corner', 11, 3, 2.1)] }),
      toss({ lit: ['e0', 'pull'], ring: ['Deep middle third'], words: [W('Two pullers', 7, -1, 1.5), W('One on one with the safety', 10, 12, 2.4)] }),
    ],
    adj: [],
    run: toss({ lit: ['e0', 'pull'] }) });

  /* tight ends RIGHT to the short side: e0 the cheat motion and the screen left, e1 the backside out */
  const JAIL = [bites('Hook to curl right', 'e0', 3), sits('Curl to flat left (creep)', -10, 9, 3, 2)];
  const JAILOUT = out(.3, { ol0: [[-5, -3], [-8, -3.5], [-10, -1.5]], ol1: [[-3.5, -3.5], [-6.5, -4], [-8, -2]], ol2: [[-2, -3], [-5, -3], [-6.5, -1]] });
  S('cheat-hb-jailbreak-screen', { cov: 'c3', cam: WIDE, wide: 'L',
    keys: [
      Object.assign({ cov: 'c3', lit: ['e0'], def: JAIL, moment: 2.4, throws: [{ man: 'e0', at: 2.0 }], words: [W('Five blockers', -10, 2, 1.6)] }, JAILOUT),
      Object.assign({ cov: 'c3', lit: ['e0'], def: JAIL, throws: [{ man: 'e0', at: 1.75 }] }, JAILOUT, { words: [W('Get the ball out of your hands', -2, -8, 1.2), W('Still got speed leaving the box', -10, -6, 1.6)] }),
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat right', 'Hook to curl right'], def: [bites('Curl to flat right', 'e0', 4), bites('Hook to curl right', 'e0', 4), bites('Hook to curl left', 'e0', 4)], throws: [{ man: 'e1', at: 2.3 }], words: [W('Everybody commit out here', -8, 0, 1.3), W('Leave the tight end unguarded', 11, 5, 1.9)] },
    ],
    adj: [teShort()],
    run: Object.assign({ cov: 'c3', lit: ['e0'], def: JAIL, throws: [{ man: 'e0', at: 1.75 }] }, JAILOUT) });

  /* the same cheat motion: e0 the streak, e1 the corner, e2 the swing, e3 the inside tight end, e4 the deeper post */
  const OVER = [bites('Deep outside right quarter', 'e0', 5), bites('Quarter flat left', 'e2', 4), bites('Deep inside right quarter', 'e3', 4.5)];
  S('cheat-ohio-te-attack', { cov: 'c4', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c4', lit: ['e1', 'e0'], ring: ['Deep outside right quarter', 'Quarter flat left'], def: OVER, throws: [{ man: 'e1', at: 3.0 }], words: [W('Streaks running the guy off', -17, 24, 1.7), W('Get up over the top', -18, 16, 2.6)] },
      { cov: 'c3', lit: ['e3'], ring: ['Hook to curl left', 'Curl to flat left (creep)'], def: [bites('Hook to curl left', 'e2', 4), bites('Curl to flat left (creep)', 'e2', 4), bites('Hook to curl right', 'e2', 3), sits('Curl to flat right', 13, 6), at('Deep middle third', 0, 15, { zone: [0, 25, 5, 3] })], throws: [{ man: 'e3', at: 2.5 }], words: [W('Linebackers leave to take the swing', -6, 2, 1.4), W('Inside tight end', 2, 11, 2.1)] },
      { cov: 'c3', lit: ['e4', 'e3'], ring: ['Deep middle third', 'Hook to curl right'], def: [at('Deep middle third', -3, 14, { zone: [-3, 28, 8.5, 3] }), sits('Hook to curl right', 2, 7), bites('Hook to curl left', 'e3', 4), sits('Deep left third (bail)', 19, 22, 4, 3)], end: 6.8, throws: [{ man: 'e4', at: 3.5 }], words: [W('Flip his hips', -4, 22, 1.8), W('Over the tight ends head', 5, 18, 2.5)] },
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left'], def: [sits('Hook to curl left', -3, 12, 3, 2), sits('Curl to flat left (creep)', -12, 15, 3, 2)], throws: [{ man: 'e2', at: 2.3 }], words: [W('Everything\'s covered deep', -6, 14, 1.4), W('Check it down', -12, -2, 2.0)] },
    ],
    adj: [teShort(), pre({ lit: ['e1'], words: [W('Corner route', -16, 15)] }), pre({ lit: ['e0'], words: [W('Streak', -17, 20)] })],
    run: { cov: 'c4', lit: ['e1', 'e0'], def: OVER, throws: [{ man: 'e1', at: 3.0 }] } });
})();
