/* live/cfbcustom.js: the College Football 27 custom offense on the film board (offense-film.js), 2026-11-15.
   Every read sets the defense up to DO what his words say (CFB27 Engine Reference/cfbcustom.js has the reads, from his breakdown
   transcript and his games). The defense is the placeholder 4-2-5 nickel (intro-field.js shells) lined up on our formation from
   the Florida International cards; the overrides move it.
   The shells (from the defense's side, so 'Deep right third (bail)' is the corner on OUR left):
     c3 'Hook to curl left' 'Hook to curl right' 'Curl to flat right' (the nickel, our right) 'Curl to flat left (creep)' (our left)
        'Deep right third (bail)' (our left corner) 'Deep left third (bail)' (our right corner) 'Deep middle third'
     c2 'Curl left' 'Middle read (lurk)' 'Curl right' 'Cloud flat left' 'Cloud flat right' 'Deep right half' 'Deep left half'
     c4 'Quarter flat left' '3-receiver hook' 'Quarter flat right' 'Deep outside right quarter' 'Deep inside right quarter' ...
     c1 '3-receiver hook', 'Man lock on #1' (the widest on our right) to '#5', 'Deep middle third'; c0 the locks and two 'Blitz'.
   Our players by card key (left to right): e0.. the receivers and backs, k0.. the blockers off the line, qb, 'pull'.
   Times are seconds from the start of a step, the snap at 1. Every word on the field is his, word for word. No em dashes. */
(function () {
  if (!window.skOffFilm) return;
  const S = (id, spec) => skOffFilm.stage('cfbcustom', id, spec);
  const DEEP = [-26, -8, 26, 30], WIDE = [-26, -9, 26, 22];
  const pre = (o) => Object.assign({ pre: 1 }, o);
  const W = (t, x, y, at) => ({ t, x, y, at: at == null ? .4 : at });
  const bites = (who, on, until) => ({ who, chase: on, until: until == null ? 2.6 : until });
  const blitz = (who) => ({ who, rush: true });
  const at = (who, x, y, more) => Object.assign({ who, x, y }, more || {});
  const SHALLOW3 = [{ who: 'Hook to curl left', zone: [-4.7, 6, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [4.8, 6, 4.4, 2.4] }];
  const DEEPHOOKS = [{ who: 'Hook to curl left', zone: [-5, 11.5, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [5, 11.5, 4.4, 2.4] }];
  const ZERO_UP = (x) => [at('Man lock on #2', x == null ? 8.5 : x, 6)];
  const catchRun = (who, t, path) => ({ throws: [{ man: who, at: t }], run: { who, path, afterCatch: t + .55 } });

  /* ================= BASE OFFENSE ================= */
  /* RPO Alert WR Screens, Normal Flex Snug, the back (e1) to the short side (wide LEFT): e0 and e2 the screens, k0 k1 lead */
  const TWO_HIGH = [at('Middle read (lurk)', -13, 4.5, { zone: [-13.5, 6, 3, 2] })];   /* (his note) one linebacker out beside the corner on the left: five in the box */
  const izone = () => ({ run: { who: 'e1', path: [[2.2, -4.6], [1, -1.6], [0, 2], [-1, 8], [-1.5, 16], [-2, 24]] }, hand: { to: 'e1', at: 1.4 } });
  S('rpo-alert-wr-screens', { cov: 'c2', cam: WIDE, wide: 'L',
    keys: [
      pre({ cov: 'c2', def: TWO_HIGH, lit: ['e0', 'e2'], ring: ['Deep right half', 'Deep left half'], words: [W('Keeping their safeties back', 0, 24)] }),
      pre({ cov: 'c2', def: TWO_HIGH, lit: ['e1'], ring: ['Cloud flat left', 'Cloud flat right'], words: [W('Five players in the box', 0, 9, .9), W('Six on five', -5, 2.5, 1.4)] }),
      Object.assign({ cov: 'c2', def: TWO_HIGH, lit: ['e1'], words: [W('Double team', 1, 1, 1.4), W('Get to the second level', -3, 10, 2.2)] }, izone()),
      Object.assign({ cov: 'c2', lit: ['e2', 'k1'], ring: ['Cloud flat right', 'Curl right'], def: [bites('Cloud flat right', 'e1', 2.4), bites('Curl right', 'e1', 2.4)], fake: { who: 'e1', until: 1.6 }, words: [W('Squeeze inside on the run', 9, 5, 1.3), W('Two on one on the outside', 18, 9, 2.2)] },
        catchRun('e2', 1.55, [[16, -2], [17.5, 2], [18.5, 9], [18.5, 19]])),
    ],
    adj: [pre({ lit: ['e1'], words: [W('Running back to the short side', 6, -9)] })],
    run: Object.assign({ cov: 'c2', def: TWO_HIGH, lit: ['e1'] }, izone()) });

  /* Switch Seams, Normal Flex Snug, the back to the wide side (wide RIGHT): e1 and e3 the seams, e0 and e4 outside, e2 the option */
  S('switch-seams', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c3', lit: ['e1', 'e3'], ring: ['Deep middle third'], def: SHALLOW3, throws: [{ man: 'e3', at: 2.9 }], words: [W('Single high', 0, 27, .3), W('Up the seams', 4, 17, 2.3)] },
      { cov: 'c2', lit: ['e3'], ring: ['Curl right'], def: [{ who: 'Curl right', zone: [7, 9, 3, 2] }], throws: [{ man: 'e3', at: 3.1 }], words: [W('Wait till he clears', 6, 19, 2.3), W('Vert hook', 10, 8, 1.6)] },
      { cov: 'c2', lit: ['e4'], ring: ['Middle read (lurk)', 'Deep left half'], def: [at('Middle read (lurk)', 4, 9, { zone: [6, 13, 3, 2] }), at('Deep left half', 9, 13, { zone: [9, 20, 3, 3] })], throws: [{ man: 'e0', at: 3.2 }], words: [W('Splitting the difference', -6, 22, 1.6), W('Up behind the corner', -20, 18, 2.8)] },
      { cov: 'c2', lit: ['e4'], ring: ['Cloud flat right'], def: [{ who: 'Cloud flat right', zone: [18, 3, 3, 1.4] }], throws: [{ man: 'e4', at: 3.1 }], words: [W('Hard flat', 18, 4, 1.2), W('Big hole shot', 21, 16, 2.7)] },
      { cov: 'c1', lit: ['e2'], branch: { e2: 1 }, throws: [{ man: 'e2', at: 2.4 }], words: [W('Break to the outside', 8, 5, 2.0)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Running back to the wide side', 6, -9)] })],
    run: { cov: 'c3', lit: ['e1', 'e3'], def: SHALLOW3, throws: [{ man: 'e3', at: 2.9 }] } });

  /* Motion Toss (the game file's Corndog Toss), Bunch Str Nasty, the bunch to the wide side (RIGHT): k3 auto motions down and
     cracks, two pullers lead, the back (e0) gets the toss to the right */
  const toss = () => ({ run: { who: 'e0', path: [[4.5, -6], [8, -5.2], [11.5, -3.2], [14, 0], [15.5, 5], [16.5, 13], [17, 23]] }, hand: { to: 'e0', at: 1.3 } });
  S('motion-toss', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      pre({ lit: ['k3'], words: [W('Auto motion down', 12, -5.5), W('Crack inside', 11, 4, .9)] }),
      pre({ lit: ['k3', 'e0'], words: [W('Same motion', 10, -5.5)] }),
      Object.assign({ cov: 'c3', lit: ['pull', 'k1'], words: [W('Two pullers', 8, -3, 1.2), W('Seal everyone inside', 8, 5, 1.8), W('Get the perimeter', 17, 9, 2.4)] }, toss()),
      Object.assign({ cov: 'c3', lit: ['e0'], words: [W('Hat on a hat', 12, 4, 1.8), W('Make a guy miss', 15, 15, 2.6)] }, toss()),
    ],
    adj: [pre({ lit: ['k1', 'k2', 'k3'], words: [W('Bunch to the wide side', 10, -6)] })],
    run: Object.assign({ cov: 'c3', lit: ['pull', 'k1'] }, toss()) });

  /* Motion Spacing Z Flat (the game file's Corndog), the bunch RIGHT, in the red zone (his best red zone play): e4 motions in and
     breaks back out, e2 the slant, e3 the streak, e0 the backside streak, e1 the back's wheel */
  S('motion-spacing-z-flat', { cov: 'c3', cam: [-26, -9, 26, 18], wide: 'R', goal: 9,
    keys: [
      { cov: 'c3', lit: ['e4'], ring: ['Curl to flat right'], def: [at('Curl to flat right', 10, 5, { zone: [10, 5, 3, 1.6] })], throws: [{ man: 'e4', at: 2.05 }], words: [W('Motion in break back out route', 14, -5, .5)] },
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #1'], def: [at('Man lock on #1', 8.5, 1.8, { lag: 3.8 })], throws: [{ man: 'e4', at: 2.1 }], words: [W('Follow you all the way inside', 10, 3, .6), W('Caught up in the mess', 8, 1, 1.6)] },
      { cov: 'c3', lit: ['e4'], ring: ['Deep left third (bail)', 'Curl to flat right'], def: [at('Deep left third (bail)', 18, 6, { zone: [19, 7, 3, 2] }), at('Curl to flat right', 9, 4, { zone: [8, 5, 3, 1.6] })], throws: [{ man: 'e4', at: 2.0 }], words: [W('Stay outside in his zone', 19, 8, .6), W('Green grass on the outside', 21, 2, 1.8)] },
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'e4', 3.6), bites('Hook to curl right', 'e2', 3), bites('Deep left third (bail)', 'e3', 3.6)], throws: [{ man: 'e1', at: 2.9 }], words: [W('Wicked pocket', 11, 7, 1.9), W('Right into the end zone', 14, 12, 2.7)] },
      { cov: 'c3', lit: ['e2'], ring: ['Curl to flat right'], def: [at('Curl to flat right', 12, 3, { zone: [12, 3, 3, 1.4] }), bites('Deep left third (bail)', 'e3', 3.4), { who: 'Hook to curl right', zone: [7, 3, 2, 1] }], throws: [{ man: 'e2', at: 2.6 }], words: [W('Slant that turns into a crosser', 0, 8, 2.2)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Bunch to the wide side', 10, -6)] }), pre({ lit: ['e3'], words: [W('Streak', 8, 6)] }), pre({ lit: ['e0'], words: [W('Streak', -9, 6)] }), pre({ lit: ['e1'], words: [W('Wheel', 11, 3)] })],
    run: { cov: 'c3', lit: ['e4'], def: [at('Curl to flat right', 10, 5, { zone: [10, 5, 3, 1.6] })], throws: [{ man: 'e4', at: 2.05 }] } });

  /* ================= MAN BEATERS ================= */
  /* PA Wave (the game file's PA U Over), Pistol Wing Flex Close, two receivers LEFT (the wide side): e0 the deep post, e1 the
     receiver crosser, e3 the tight end crosser, k0 the inside tight end on the drag, e2 the back (the fake, then he blocks) */
  const PA = { fake: { who: 'e2', until: 1.7 } };
  const CORNER_K0 = [[5, -1.2], [5, 8], [13, 16]];   /* a 45 degree angle toward the sideline */
  S('pa-wave', { cov: 'c1', cam: DEEP, wide: 'L',
    keys: [
      Object.assign({ cov: 'c1', lit: ['e3', 'e1'], def: [{ who: 'Man lock on #1', lag: 3.4 }, { who: 'Man lock on #4', lag: 3.6 }], throws: [{ man: 'e3', at: 2.6 }], words: [W('Easy, quick separation', 0, 9, 1.8)] }, PA),
      Object.assign({ cov: 'c1', lit: ['e3'], def: [{ who: 'Man lock on #1', lag: 3.4 }, { who: 'Man lock on #4', lag: 3.6 }], throws: [{ man: 'e3', at: 2.6 }], words: [W('Tight end crosser', -4, 13, 2.0), W('Make a guy miss', -12, 18, 2.8)] }, PA),
      Object.assign({ cov: 'c1', lit: ['e1'], def: [{ who: 'Man lock on #4', lag: 3.2 }], throws: [{ man: 'e1', at: 3.0 }], words: [W('Receiver crosser coming in behind him', 4, 15, 2.4)] }, PA),
      Object.assign({ cov: 'c0', lit: ['e0'], def: ZERO_UP(4), throws: [{ man: 'e0', at: 3.25 }], words: [W('Outside release', -14, 6, 1.4), W('Bomb them up over the top', -5, 24, 2.9)] }, PA),
      Object.assign({ cov: 'c1', lit: ['k0'], def: [{ who: 'Man lock on #3', lag: 3.4 }, { who: 'Man lock on #2', lag: 3.2 }, blitz('3-receiver hook')], throws: [{ man: 'k0', at: 2.05 }], words: [W('Right off the snap', 2, 6, 1.2), W('The drag', -5, 1.5, 1.8)] }, PA),
      Object.assign({ cov: 'c4', lit: ['e0', 'k0'], ring: ['Deep outside right quarter'], def: [at('Deep outside right quarter', -12.5, 7, { shade: 'out' }), bites('Deep inside right quarter', 'k0', 4), bites('Deep inside left quarter', 'e3', 4), bites('3-receiver hook', 'e1', 3.6)], reroute: { k0: CORNER_K0 }, throws: [{ man: 'e0', at: 3.3 }], words: [W('Outside shade', -15, 9, .6), W('One on one shot', -6, 22, 2.8)] }, PA),
    ],
    adj: [pre({ lit: ['e0', 'e1'], words: [W('Two receivers to the wide side', -9, -6)] }), pre({ lit: ['e2'], words: [W('Block our running back', 0, -10)] }), pre({ lit: ['k0'], words: [W('Drag route', -4, 4)] }), pre({ lit: ['k0'], reroute: { k0: CORNER_K0 }, words: [W('Corner route', 11, 15)] })],
    run: Object.assign({ cov: 'c1', lit: ['e3'], def: [{ who: 'Man lock on #1', lag: 3.4 }, { who: 'Man lock on #4', lag: 3.6 }], throws: [{ man: 'e3', at: 2.6 }] }, PA) });

  /* Curl Switch, the stack LEFT and to the wide side: e1 the front of the stack on the corner, e0 the back of the stack post,
     e2 the tight end shallow, e3 the whip, e4 the dig */
  S('curl-switch', { cov: 'c1', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c1', lit: ['e1'], ring: ['Man lock on #4', 'Man lock on #5'], def: [at('Man lock on #4', -8.5, 4.5)], throws: [{ man: 'e1', at: 2.95 }], words: [W('Natural rubs', -8, 3, 1.2), W('One on one to the outside', -16, 10, 2.3)] },
      { cov: 'c0', lit: ['e0'], ring: ['Man lock on #5'], def: ZERO_UP().concat([at('Man lock on #5', -11.5, 4, { shade: 'out', lag: 3 })]), throws: [{ man: 'e0', at: 2.8 }], words: [W('Outside shade', -13, 6, .6), W('Up over the top', -3, 18, 2.6)] },
      { cov: 'c1', lit: ['e2'], def: [{ who: 'Man lock on #3', lag: 3 }, { who: '3-receiver hook', zone: [-7, 11, 3, 2] }], throws: [{ man: 'e2', at: 2.1 }], words: [W('Really good separation', 2, 6, 1.9)] },
      { cov: 'c1', lit: ['e3', 'e4'], def: [{ who: 'Man lock on #1', lag: 3 }], throws: [{ man: 'e4', at: 3.1 }], words: [W('Whip breaking out', 17, 3, 1.6), W('Dig behind them', 9, 15, 2.5)] },
    ],
    adj: [pre({ lit: ['e0', 'e1'], words: [W('Stack look to the wide side', -10, -6)] }), pre({ lit: ['e1'], words: [W('Corner route', -15, 12)] })],
    run: { cov: 'c1', lit: ['e1'], def: [at('Man lock on #4', -8.5, 4.5)], throws: [{ man: 'e1', at: 2.95 }] } });

  /* ================= VERTICAL PASS GAME ================= */
  /* Fade Out, trips RIGHT and the stack LEFT: e0 the back of the stack streak, e1 the front on the wheel, e2 the deep over,
     e3 the seam, e4 the outside streak */
  const POST_E0 = [[-10, -2.5], [-9.3, -.6], [-9.3, 9], [-3, 16], [1, 22]];
  S('fade-out', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -7, 5, { zone: [-7, 6, 3, 1.6] }), bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 2.5 }], words: [W('Single high', 0, 27, .3), W('Stays too shallow', -7, 4, 1.4), W('As he turns upfield', -19, 11, 2.3)] },
      { cov: 'c2', lit: ['e1'], ring: ['Cloud flat left', 'Deep right half'], def: [{ who: 'Cloud flat left', zone: [-14, 4, 3, 1.5] }, bites('Deep right half', 'e0', 3.4)], throws: [{ man: 'e1', at: 3.0 }], words: [W('Behind the flat defender', -18, 12, 2.5), W('Hole shot', -16, 20, 2.9)] },
      { cov: 'c3', lit: ['e3'], ring: ['Hook to curl right'], def: [bites('Hook to curl right', 'e2', 3.2), bites('Deep left third (bail)', 'e4', 3.6), at('Deep middle third', -3, 13, { zone: [-4, 20, 4, 3] })], throws: [{ man: 'e3', at: 3.0 }], words: [W('Hook defender is going to get pulled inside', 3, 8, 1.8), W('Wide open up the seam', 10, 20, 2.6)] },
      { cov: 'c2', lit: ['e3'], def: [blitz('Middle read (lurk)'), bites('Deep left half', 'e4', 3.4), bites('Deep right half', 'e0', 3.4)], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e3', at: 2.95 }], words: [W('Pulled outside by the streaks', 14, 24, 1.8), W('Wide open down the middle of the field', 4, 17, 2.6)] },
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left'], def: SHALLOW3.concat([at('Hook to curl left', 5, 5, { zone: [6, 6, 3, 1.6] })]), throws: [{ man: 'e2', at: 3.1 }], words: [W('Linebackers playing too shallow', 0, 4, 1.5), W('Deep over', -5, 18, 2.6)] },
      { cov: 'c4', lit: ['e0', 'e1'], ring: ['Deep outside right quarter', 'Deep inside right quarter'], def: [at('Deep inside right quarter', -7, 12, { chase: 'e1', until: 4 }), bites('Deep outside right quarter', 'e0', 3.0)], reroute: { e0: POST_E0 }, throws: [{ man: 'e0', at: 3.3 }], words: [W('Hard read', -9, 14, 1.2), W('Post is going to break inside', 0, 18, 2.6)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 13, -6)] }), pre({ lit: ['e0'], words: [W('Streak', -9, 18)] }), pre({ lit: ['e0'], reroute: { e0: POST_E0 }, words: [W('Post', -4, 14)] })],
    run: { cov: 'c3', lit: ['e1'], def: [at('Curl to flat left (creep)', -7, 5, { zone: [-7, 6, 3, 1.6] }), bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 2.5 }] } });

  /* Mtn China Wheel, the bunch RIGHT (the wide side): e2 motions over to the left and runs the slot fade, e0 the solo streak,
     e3 the point man's return, e4 the dig, e1 the back in the flat */
  const CHINA = [bites('Deep right third (bail)', 'e0', 4.5), { who: 'Curl to flat left (creep)', zone: [-13, 10, 3, 2] }];
  S('mtn-china-wheel', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c3', lit: ['e2'], ring: ['Deep right third (bail)', 'Curl to flat left (creep)'], def: CHINA, throws: [{ man: 'e2', at: 3.3 }], words: [W('Stop at ten yards', -13, 11, 1.6), W('Up over their head', -16, 22, 2.9)] },
      { cov: 'c3', lit: ['e2'], ring: ['Deep right third (bail)'], def: CHINA, throws: [{ man: 'e2', at: 3.45 }], words: [W('Pull everyone back', -10, 25, 1.8), W('Back shoulder', -19, 18, 2.9)] },
      { cov: 'c3', lit: ['e4'], ring: ['Hook to curl left', 'Hook to curl right'], def: SHALLOW3, throws: [{ man: 'e4', at: 2.95 }], words: [W('Linebackers are shallow', 1, 4, 1.4), W('Hit the dig', 3, 13, 2.5)] },
      { cov: 'c4', lit: ['e3'], ring: ['3-receiver hook'], def: [{ who: '3-receiver hook', zone: [5, 11, 3, 2] }], throws: [{ man: 'e3', at: 2.4 }], words: [W('Stays deep on the dig', 5, 13, 1.5), W('Return route underneath', 9, 6, 2.1)] },
      { cov: 'c3', lit: ['e1'], def: DEEPHOOKS, throws: [{ man: 'e1', at: 2.4 }], words: [W('Running back in the flat', -14, 3, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Bunch to the wide side', 10, -6)] }), pre({ lit: ['e0'], words: [W('Streak', -8, 18)] }), pre({ lit: ['e3'], words: [W('Return route', 6, 6)] })],
    run: { cov: 'c3', lit: ['e2'], def: CHINA, throws: [{ man: 'e2', at: 3.3 }] } });

  /* ================= SCHEME KINGS ================= */
  /* Post Wheel, trips to the SHORT side (wide LEFT): e2 the streak, e3 the wheel, e4 the Z post, e1 the drag, e0 the curl */
  S('post-wheel', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e4'], def: SHALLOW3.concat([bites('Deep middle third', 'e2', 3.4), bites('Deep left third (bail)', 'e3', 3.6)]), throws: [{ man: 'e4', at: 3.3 }], words: [W('Wait for this Z post to clear', 6, 25, 1.6), W('Behind the linebackers', 2, 13, 2.6)] },
      { cov: 'c2', lit: ['e4'], ring: ['Curl right'], def: [{ who: 'Curl right', zone: [6, 10, 3, 2] }, { who: 'Curl left', zone: [-4, 10, 3, 2] }, bites('Deep left half', 'e3', 4), bites('Deep right half', 'e0', 3.4)], throws: [{ man: 'e4', at: 3.05 }], words: [W('Stopping at about ten yards', 7, 8, 1.6), W('Over the linebackers heads', 1, 20, 2.7)] },
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [{ who: 'Curl to flat right', zone: [17, 10, 3, 2] }, bites('Deep left third (bail)', 'e2', 3.6)], throws: [{ man: 'e3', at: 3.35 }], words: [W('Flat settles', 17, 9, 1.8), W('Back shoulder', 21, 21, 2.9)] },
      { cov: 'c3', lit: ['e0'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl left', 'e1', 2.8), bites('Hook to curl right', 'e1', 2.8), { who: 'Curl to flat left (creep)', zone: [-18, 5, 3, 1.5] }], throws: [{ man: 'e0', at: 2.85 }], words: [W('Staying inside on the drag', 2, 4, 1.6), W('Curl as he sits down', -10, 12, 2.3)] },
      { cov: 'c1', lit: ['e1'], throws: [{ man: 'e1', at: 2.3 }], words: [W('Check it down to the drag', 4, 6, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the short side', 13, -6)] }), pre({ lit: ['e2'], words: [W('Streak', 8, 18)] })],
    run: { cov: 'c3', lit: ['e4'], def: SHALLOW3.concat([bites('Deep middle third', 'e2', 3.4), bites('Deep left third (bail)', 'e3', 3.6)]), throws: [{ man: 'e4', at: 3.3 }] } });

  /* Smash Seam, trips RIGHT, the stack LEFT: e1 the outside breaking corner, e0 the streak, e2 the deep over, e3 the seam, e4 the shallow */
  const FLAT15 = (who) => ({ who, zone: [-13, 15, 3, 2] });
  S('smash-seam', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: [FLAT15('Curl to flat left (creep)'), bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 3.35 }], words: [W('Flat defenders getting to about 15 to 20 yards', -9, 12, 1.6), W('Up along the sideline', -20, 22, 2.8)] },
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)'], def: [FLAT15('Curl to flat left (creep)'), bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 3.5 }], words: [W('Keeps backpedaling', -12, 17, 1.8), W('Back pylon', -21, 25, 2.9)] },
      { cov: 'c4', lit: ['e2'], ring: ['Deep outside right quarter'], def: [bites('Deep outside right quarter', 'e1', 4), bites('Deep inside right quarter', 'e0', 4), { who: '3-receiver hook', zone: [3, 5, 3, 1.5] }], throws: [{ man: 'e2', at: 3.15 }], words: [W('Corner routes taken away', -16, 16, 1.6), W('Deep over route', -3, 17, 2.6)] },
      { cov: 'c3', lit: ['e3'], ring: ['Deep middle third'], def: [bites('Deep middle third', 'e2', 3.2)], throws: [{ man: 'e3', at: 3.0 }], words: [W('Single high', 0, 27, .3), W('Seam ball', 15, 18, 2.6)] },
      { cov: 'c3', lit: ['e4'], def: DEEPHOOKS.concat([{ who: 'Deep middle third', zone: [0, 24, 5, 3] }]), throws: [{ man: 'e4', at: 2.3 }], words: [W('Really shallow cross', 8, 6, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 13, -6)] }), pre({ lit: ['e3'], words: [W('Streak', 15, 18)] }), pre({ lit: ['e0'], words: [W('Streak', -9, 18)] })],
    run: { cov: 'c3', lit: ['e1'], def: [FLAT15('Curl to flat left (creep)'), bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 3.35 }] } });

  /* Bench Corner, trips RIGHT, the stack LEFT: e0 the C route (the shallow seam, then out), e1 the quick out, e2 the corner from
     the inside slot, e3 the shallow in cut, e4 the clear out streak */
  S('bench-corner', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      pre({ lit: ['e0', 'e1'], words: [W('Stack alignment', -10, -6)] }),
      { cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)', 'Hook to curl left'], def: [at('Curl to flat left (creep)', -15, 4, { zone: [-16, 5, 3, 1.5] }), at('Hook to curl left', -3, 5, { zone: [-3, 6, 2.4, 1.6] })], throws: [{ man: 'e0', at: 2.1 }], words: [W('Jump outside', -16, 6, 1.2), W('Shallow seam', -7, 12, 2.1)] },
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -8.5, 7, { zone: [-8, 8, 3, 2] }), at('Deep right third (bail)', -18, 9, { zone: [-18, 14, 3, 3] })], throws: [{ man: 'e1', at: 1.95 }], words: [W('Off coverage', -18, 11, .6), W('Throw that out route', -15, 4, 1.9)] },
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left', 'Curl to flat right'], def: [bites('Hook to curl left', 'e0', 2.6), { who: 'Curl to flat right', zone: [13, 4, 3, 1.5] }], throws: [{ man: 'e2', at: 3.0 }], words: [W('Flat defender stays shallow', 13, 5, 1.6), W('Corner route', 17, 17, 2.6)] },
      { cov: 'c2', lit: ['e0'], ring: ['Cloud flat left'], def: [bites('Cloud flat left', 'e1', 3)], throws: [{ man: 'e0', at: 3.15 }], words: [W('Flat defender bites down', -14, 4, 1.6), W('Hole shot', -15, 18, 2.8)] },
      { cov: 'c3', lit: ['e3'], def: DEEPHOOKS, throws: [{ man: 'e3', at: 2.4 }], words: [W('Checkdown', 4, 7, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 13, -6)] }), pre({ lit: ['e4'], words: [W('Streak', 18, 18)] })],
    run: { cov: 'c3', lit: ['e0'], def: [at('Curl to flat left (creep)', -15, 4, { zone: [-16, 5, 3, 1.5] }), at('Hook to curl left', -3, 5, { zone: [-3, 6, 2.4, 1.6] })], throws: [{ man: 'e0', at: 2.1 }] } });

  /* PA Switch Sail, Normal Flex Snug, the back to the short side (wide LEFT): e0 the corner, e1 the switch release wheel, e3 the
     deep crosser, e4 the post sit, e2 the back's swing */
  const SAIL = { fake: { who: 'e2', until: 1.6 } };
  S('pa-switch-sail', { cov: 'c2', cam: DEEP, wide: 'L',
    keys: [
      Object.assign({ cov: 'c2', lit: ['e0'], ring: ['Cloud flat left', 'Deep right half'], def: [{ who: 'Cloud flat left', zone: [-15, 4, 3, 1.5] }, bites('Deep right half', 'e1', 3.6)], throws: [{ man: 'e0', at: 3.05 }], words: [W('Flat defender stay shallow', -15, 5, 1.3), W('Break to the outside', -21, 17, 2.6)] }, SAIL),
      Object.assign({ cov: 'c4', lit: ['e1'], ring: ['Deep outside right quarter', 'Deep inside right quarter'], def: [at('Deep outside right quarter', -15, 8, { chase: 'e0', until: 4 }), at('Deep inside right quarter', -9, 10, { chase: 'e0', until: 3.2 })], throws: [{ man: 'e1', at: 3.0 }], words: [W('Run into each other', -14, 11, 1.8), W('Switch release', -19, 21, 2.6)] }, SAIL),
      Object.assign({ cov: 'c3', lit: ['e3'], ring: ['Hook to curl right'], def: [{ who: 'Hook to curl right', zone: [4, 8, 3, 2] }], throws: [{ man: 'e3', at: 3.05 }], words: [W('Deep crosser', 8, 15, 1.8), W('Behind his ear', 0, 19, 2.8)] }, SAIL),
      Object.assign({ cov: 'c3', lit: ['e4'], ring: ['Hook to curl right', 'Curl to flat right'], def: [bites('Hook to curl right', 'e3', 2.8), bites('Hook to curl left', 'e3', 2.8), bites('Curl to flat right', 'e2', 2.8)], throws: [{ man: 'e4', at: 3.15 }], words: [W('Crosser is taken away', 6, 12, 1.6), W('Sit down in this hole', 11, 18, 2.6)] }, SAIL),
      Object.assign({ cov: 'c3', lit: ['e2'], ring: ['Hook to curl right'], def: [blitz('Hook to curl right'), { who: 'Hook to curl left', zone: [-5, 12, 4, 2.4] }], throws: [{ man: 'e2', at: 2.35 }], words: [W('Pressure in our face', 2, 2, 1.3), W('Throw the swing', -12, 4, 2.1)] }, { fake: { who: 'e2', until: 1.3 } }),
    ],
    adj: [pre({ lit: ['e2'], words: [W('Running back to the short side', 6, -9)] }), pre({ lit: ['e4'], words: [W('Post sit', 13, 18)] }), pre({ lit: ['e2'], words: [W('Swing to the short side', 8, -4)] })],
    run: Object.assign({ cov: 'c2', lit: ['e0'], def: [{ who: 'Cloud flat left', zone: [-15, 4, 3, 1.5] }, bites('Deep right half', 'e1', 3.6)], throws: [{ man: 'e0', at: 3.05 }] }, SAIL) });

  /* RPO Read Bubble, the bunch RIGHT: e1 the bubble with k1 k2 in front, e0 the back (the give goes left, away from the flow);
     the read defender is the nickel, the one who should be out on the bubble */
  const keepR = { who: 'qb', path: [[1, -4], [3, -2.2], [5.5, .8], [8, 5], [10, 12], [11, 21]] };
  const bubble = () => catchRun('e1', 1.55, [[13, -3.5], [17, -1], [19, 5], [19.5, 14], [19.5, 23]]);
  S('rpo-read-bubble', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      pre({ lit: ['e1'], ring: ['Curl to flat right'], dtags: { 'Curl to flat right': 'READ DEFENDER' }, def: [at('Curl to flat right', 6, 4)], words: [W('Caught inside', 6, 6.5, .6)] }),
      Object.assign({ cov: 'c3', lit: ['e1', 'k1', 'k2'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [at('Curl to flat right', 5, 4), at('Deep left third (bail)', 17, 7, { zone: [17, 8, 3, 2] })], words: [W('Numbers advantage', 15, 6, .4), W('Drop it out right there', 18, 1, 1.6)] }, bubble()),
      { cov: 'c3', lit: ['qb'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'e0', 2.3), at('Hook to curl right', 12, 4, { zone: [13, 5, 3, 1.6] })], fake: { who: 'e0', until: 1.6 }, run: keepR, words: [W('Read defender crashes', 3, 2, 1.3), W('Absolutely massive hole', 7, 9, 2.2)] },
      { cov: 'c3', lit: ['qb', 'k1', 'k2'], def: [bites('Curl to flat right', 'e0', 2.3)], fake: { who: 'e0', until: 1.6 }, run: { who: 'qb', path: [[1, -4], [3.5, -2.4], [7, -.5], [11, 2], [14, 7], [16, 15], [17, 23]] }, words: [W('Block for you', 13, 4, 1.6), W('Get to the outside', 15, 12, 2.4)] },
      Object.assign({ cov: 'c3', lit: ['e0'], def: [bites('Hook to curl left', 'e1', 2.4), bites('Hook to curl right', 'e1', 2.4), bites('Curl to flat right', 'e1', 2.4)], words: [W('Away from the flow', -7, 9, 2.0)] }, { run: { who: 'e0', path: [[1.5, -5], [-.5, -2.6], [-2.5, .8], [-4.5, 6], [-6, 13], [-6.5, 22]] }, hand: { to: 'e0', at: 1.45 } }),
    ],
    adj: [pre({ lit: ['e1', 'k1', 'k2'], words: [W('Bunch to the wide side', 10, -6)] })],
    run: Object.assign({ cov: 'c3', lit: ['e1', 'k1', 'k2'], def: [at('Curl to flat right', 5, 4)] }, bubble()) });

  /* Y Trail, the bunch RIGHT: e2 the tight end's trail, e3 the corner from the middle of the bunch, e0 the backside post, e4 the
     drag across the bunch (motioned out on a streak against zone), e1 the back's swing */
  const OUT_E4 = [[8, -2.2], [11.5, -1.2], [12.8, 3], [13.2, 30]];
  S('y-trail', { cov: 'c1', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c1', lit: ['e3'], def: [{ who: 'Man lock on #2', lag: 3.3 }], throws: [{ man: 'e3', at: 3.1 }], words: [W('Four yards of separation', 17, 14, 2.4)] },
      { cov: 'c3', lit: ['e3', 'e4'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [bites('Curl to flat right', 'e1', 2.8), bites('Deep left third (bail)', 'e4', 3.8)], reroute: { e4: OUT_E4 }, throws: [{ man: 'e3', at: 3.2 }], words: [W('Motion him out', 13, -5, .5), W('Flat defender bites down', 15, 3, 1.8)] },
      { cov: 'c4', lit: ['e2'], ring: ['3-receiver hook'], def: [bites('3-receiver hook', 'e4', 3), { who: 'Deep inside left quarter', zone: [6, 18, 3, 3] }], throws: [{ man: 'e2', at: 2.7 }], words: [W('Trail route', 1, 10, 1.8), W('Going against the flow', -4, 6, 2.3)] },
      { cov: 'c0', lit: ['e0'], def: ZERO_UP().concat([{ who: 'Man lock on #5', lag: 3.3 }]), throws: [{ man: 'e0', at: 3.0 }], words: [W('Deep safety help', 0, 24, .3), W('Really nice separation', 1, 18, 2.7)] },
      { cov: 'c1', lit: ['e4'], def: [{ who: 'Man lock on #1', lag: 3.2 }], throws: [{ man: 'e4', at: 2.3 }], words: [W('Super tough to cover', -2, 5, 2.0)] },
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat right'], def: [at('Curl to flat right', 13, 8, { zone: [14, 9, 3, 2] })], throws: [{ man: 'e1', at: 2.3 }], words: [W('Running back swing', 17, 3, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Bunch to the wide side', 10, -6)] }), pre({ lit: ['e4'], words: [W('Drag going across the field', -2, 5)] }), pre({ lit: ['e4'], reroute: { e4: OUT_E4 }, words: [W('Motion him out', 13, -5)] })],
    run: { cov: 'c1', lit: ['e3'], def: [{ who: 'Man lock on #2', lag: 3.3 }], throws: [{ man: 'e3', at: 3.1 }] } });

  /* Jet RPO Read Slide, Pistol Wing Flex Close, two receivers LEFT (the wide side): k0 the jet motion to the right, the read on the
     left end, the quarterback keeps to the left, e2 the tight end slides across to the left flat, e0 the streak (or the slant) */
  const keepL = { who: 'qb', path: [[-1, -4.2], [-3, -2.4], [-4.6, .5], [-5.6, 5], [-6.2, 12], [-6.6, 21]] };
  const JFAKE = { fake: { who: 'e1', until: 1.6 } };
  S('jet-rpo-read-slide', { cov: 'c3', cam: WIDE, wide: 'L',
    keys: [
      pre({ lit: ['k0'], ring: ['Rush#1'], dtags: { 'Rush#1': 'READ DEFENDER' }, words: [W('Jet motion', 2, -5.5), W('Away from the flow', -6, 7, .9)] }),
      Object.assign({ cov: 'c3', lit: ['qb'], ring: ['Rush#1'], def: [bites('Rush#1', 'e1', 2.4), { who: 'Curl to flat left (creep)', zone: [-19, 2, 2, 1] }, bites('Hook to curl left', 'k0', 3), bites('Hook to curl right', 'k0', 3)], run: keepL, words: [W('Read defender crashes', -4, 1, 1.3), W('Pull this football', -9, 6, 2.0)] }, JFAKE),
      Object.assign({ cov: 'c3', lit: ['e2'], ring: ['Curl to flat left (creep)'], def: [bites('Rush#1', 'e1', 2.4), blitz('Curl to flat left (creep)'), bites('Hook to curl left', 'k0', 3), bites('Hook to curl right', 'k0', 3)], throws: [{ man: 'e2', at: 2.4 }], words: [W('Nobody in the flat', -17, 4, 1.6), W('Triple option', -12, 9, 2.3)] }, JFAKE),
      Object.assign({ cov: 'c3', lit: ['qb'], def: [bites('Rush#1', 'e1', 2.4), { who: 'Curl to flat left (creep)', zone: [-19, 2, 2, 1] }, bites('Hook to curl left', 'k0', 3), bites('Hook to curl right', 'k0', 3)], run: keepL, words: [W('Keep it with our QB', -9, 10, 2.0)] }, JFAKE),
      Object.assign({ cov: 'c1', lit: ['e0'], ring: ['Hook to curl left'], def: [blitz('3-receiver hook'), blitz('Man lock on #3'), { who: 'Man lock on #5', lag: 3.2 }], reroute: { e0: [[-8, -.8], [-8, 2.5], [-1.5, 7]] }, throws: [{ man: 'e0', at: 2.05 }], words: [W('Bites inside on the run', -2, 3, 1.5), W('Backside slant', -4, 9, 2.1)] }, JFAKE),
    ],
    adj: [pre({ lit: ['k0', 'e0'], words: [W('Two receiver side to the wide side', -9, -6)] }), pre({ lit: ['e0'], words: [W('Streak', -8, 18)] })],
    run: Object.assign({ cov: 'c3', lit: ['qb'], def: [bites('Rush#1', 'e1', 2.4), bites('Hook to curl left', 'k0', 3), bites('Hook to curl right', 'k0', 3)], run: keepL }, JFAKE) });

  /* Jet HB Power: k0 jet motions across to the right, the left guard pulls through the hole, the back (e0) hits it up the gut */
  const power = () => ({ run: { who: 'e0', path: [[0, -6.2], [.9, -3.6], [2, -1], [2.6, 3], [2.8, 11], [3, 21]] }, hand: { to: 'e0', at: 1.35 } });
  S('jet-hb-power', { cov: 'c3', cam: WIDE,
    keys: [
      Object.assign({ cov: 'c3', lit: ['k0'], ring: ['Hook to curl right'], def: [bites('Hook to curl right', 'k0', 2.4), bites('Curl to flat right', 'k0', 2.4)], words: [W('Pulling guys out of the box', 9, 6, 1.2)] }, power()),
      Object.assign({ cov: 'c3', lit: ['pull', 'e0'], ring: ['Hook to curl left'], def: [bites('Hook to curl left', 'k0', 1.9)], words: [W('Hit by our puller', 4, 5, 1.6), W('Second level', 6, 12, 2.3)] }, power()),
      Object.assign({ cov: 'c3', lit: ['e0'], def: [bites('Hook to curl left', 'k0', 2.2), bites('Hook to curl right', 'k0', 2.2)], words: [W('Quick hitter right up the gut', 4, 9, 1.7), W('Get downhill right away', 5, 17, 2.4)] }, power()),
    ],
    adj: [],
    run: Object.assign({ cov: 'c3', lit: ['pull', 'e0'] }, power()) });

  /* PA Flood, two receivers LEFT (the wide side): e0 the wheel clear out, e1 the deep out behind it, e3 the outside tight end's
     deep dig (or the post), e2 the back (the fake, then the flat) */
  const FL = { fake: { who: 'e2', until: 1.7 } };
  S('pa-flood', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      Object.assign({ cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: [{ who: 'Curl to flat left (creep)', zone: [-14, 5, 3, 1.5] }, bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 3.1 }], words: [W('Flat defender stays shallow', -14, 6, 1.4), W('Deep out route', -18, 20, 2.6)] }, FL),
      Object.assign({ cov: 'c4', lit: ['e1'], ring: ['Deep inside right quarter'], def: [at('Deep inside right quarter', -7, 11, { chase: 'e1', until: 2.6 }), bites('Deep outside right quarter', 'e0', 4)], throws: [{ man: 'e1', at: 3.15 }], words: [W('One on one', -11, 15, 1.6), W('No help', -15, 22, 2.4)] }, FL),
      Object.assign({ cov: 'c3', lit: ['e3'], ring: ['Hook to curl left', 'Hook to curl right'], def: SHALLOW3, throws: [{ man: 'e3', at: 3.05 }], words: [W('Linebackers are staying shallow', 2, 4, 1.6), W('Dig', -2, 16, 2.5)] }, FL),
      Object.assign({ cov: 'c3', lit: ['e2'], def: DEEPHOOKS.concat([{ who: 'Curl to flat left (creep)', zone: [-14, 11, 3, 2] }]), throws: [{ man: 'e2', at: 2.45 }], words: [W('Check down to the running back', -9, 5, 2.1)] }, FL),
    ],
    adj: [pre({ lit: ['e0', 'e1'], words: [W('Two receiver side to the wide', -9, -6)] }), pre({ lit: ['e3'], words: [W('Post', 2, 15)] })],
    run: Object.assign({ cov: 'c3', lit: ['e1'], def: [{ who: 'Curl to flat left (creep)', zone: [-14, 5, 3, 1.5] }, bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 3.1 }] }, FL) });
})();
