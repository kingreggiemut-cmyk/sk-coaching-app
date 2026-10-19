/* live/olemiss.js: the Ole Miss Veer N Shoot on the film board (offense-film.js), second pass 2026-10-18.
   His note: "do a deep dive on every play and make sure we're actually showing what we're talking about". So every read below
   sets the defense up to DO what his words say: who bites, who stays home, who stays shallow, who is in outside shade, whether
   there is a safety in the middle. The defense is the placeholder College Football 4-2-5 nickel (intro-field.js shells), lined
   up on our formation by offense-film.js; the overrides here move it to the look each read is about.
   The shells and their players:
     c3 Cover 3: 'Hook to curl left' 'Hook to curl right' (the backers) 'Curl to flat right' (the nickel) 'Curl to flat left (creep)'
        (the left overhang) 'Deep right third (bail)' (the left corner) 'Deep left third (bail)' (the right corner) 'Deep middle third'
     c2 Cover 2: 'Curl left' 'Middle read (lurk)' 'Curl right' 'Cloud flat left' 'Cloud flat right' 'Deep right half' 'Deep left half'
     c4 Quarters: 'Quarter flat left' '3-receiver hook' 'Quarter flat right' 'Deep outside right quarter' 'Deep inside right quarter'
        'Deep inside left quarter' 'Deep outside left quarter'
     c1 Cover 1: '3-receiver hook' 'Man lock on #1' (the widest on the right) to '#5', 'Deep middle third' (the post safety)
     c0 Cover 0: the man locks and two 'Blitz'. Every shell has four 'Rush'; 'Rush#1' is the left end, 'Rush#4' the right end.
   A def entry: { who, x, y, zone: [cx, cy, rx, ry], chase: key, until, rush: true, shade: 'out', man: n }.
   Our players by card key: e0, e1... the receivers and backs left to right, k0, k1... the blockers off the line, qb, and
   'pull' lights the pulling lineman. A scene can give one man his own route for that read (reroute { key: path }).
   Times are seconds from the start of a step, the snap at 1. */
(function () {
  if (!window.skOffFilm) return;
  const S = (id, spec) => skOffFilm.stage('olemiss', id, spec);
  const DEEP = [-26, -8, 26, 30], WIDE = [-26, -9, 26, 22];
  const pre = (o) => Object.assign({ pre: 1 }, o);
  const W = (t, x, y, at) => ({ t, x, y, at: at == null ? .4 : at });
  const bites = (who, on, until) => ({ who, chase: on, until: until == null ? 2.6 : until });
  const blitz = (who) => ({ who, rush: true });
  const at = (who, x, y, more) => Object.assign({ who, x, y }, more || {});
  /* the backers sit shallow, at six yards (his note on Four Verticals: "the linebackers need to stay shallow") */
  const SHALLOW3 = [{ who: 'Hook to curl left', zone: [-4.7, 6, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [4.8, 6, 4.4, 2.4] }];
  /* two high with five in the box: the lurk walks out toward the trips */
  const TWO_HIGH = [at('Middle read (lurk)', 5.5, 6.5, { zone: [4, 9.5, 3.4, 2.2] })];
  /* Cover 0 with nobody deep: the #2 lock walks up to the line */
  const ZERO_UP = (x) => [at('Man lock on #2', x == null ? 8.5 : x, 6)];

  /* ================= BASE OFFENSE ================= */
  /* the inside zone: the back's path, handed off a beat after the snap */
  const zone = () => ({ run: { who: 'e1', path: [[1.2, -3], [.6, 0], [-.6, 5], [-1.6, 13], [-2, 22]] }, hand: { to: 'e1', at: 1.45 } });
  S('rpo-alert-slot-slant', { cov: 'c3', cam: WIDE,
    keys: [
      /* 1 the overhang over the slot is the key */
      pre({ lit: ['e2'], ring: ['Curl to flat right'], dtags: { 'Curl to flat right': 'KEY DEFENDER' }, zones: ['Curl to flat right'], cam: [-4, -8, 26, 20] }),
      /* 2 two safeties back, five in the box, our five and the back: six on five */
      pre({ cov: 'c2', def: TWO_HIGH, ring: ['Rush', 'Curl left', 'Deep right half', 'Deep left half'], zones: ['Deep right half', 'Deep left half'], words: [W('Both safeties back', 0, 23), W('Five blockers', -1, 8, .9), W('6 on 5', -1, -9, 1.4)] }),
      /* 3 he stays home over the slot: hand it off */
      Object.assign({ cov: 'c2', def: TWO_HIGH, lit: ['e1'], ring: ['Curl right'], words: [W('He stays back', 14, 7, 1.5), W('Hand it off', -4, 11, 2.3)] }, zone()),
      /* 4 he bites on the run: the skinny post behind him, between the two safeties */
      /* (2026-10-19, his note) he comes down to the line and STAYS shallow; the skinny post goes up to seven or eight and in behind him */
      { cov: 'c2', def: TWO_HIGH.concat([{ who: 'Curl right', zone: [10.5, 1.4, 2, 1.1] }, bites('Middle read (lurk)', 'e1', 3)]), lit: ['e2'], ring: ['Curl right'], fake: { who: 'e1', until: 2 }, throws: [{ man: 'e2', at: 2.75 }], words: [W('He bites', 12, 1.5, 1.6), W('Skinny post in behind him', 5, 16, 2.2)] },
      /* 5 the backside slant: they overload the trips, the weak side backers bite down */
      { cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)', 'Hook to curl left'], def: [bites('Curl to flat left (creep)', 'e1', 3), bites('Hook to curl left', 'e1', 3)], fake: { who: 'e1', until: 2 }, throws: [{ man: 'e0', at: 2.2 }], words: [W('They bite down', -8, 1.5, 1.6), W('Backside slant', -16, 9, 2.2)] },
      /* 6 nobody over #2: put him on a post, stem it up the field, quick throw */
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right'], def: [{ who: 'Curl to flat right', zone: [9.5, 6, 3, 2.2] }], reroute: { e3: [[17.5, -2.2], [17.5, 6.5], [12.5, 15]] }, throws: [{ man: 'e3', at: 2.05 }], words: [W('Nobody over that number two receiver', 17.5, 4, .4), W('He stays inside', 8, 3, 1.5), W('Quick throw', 14, 14, 2)], cam: [-2, -8, 26, 18] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 17, -6)] }), pre({ lit: ['e0'], words: [W('Slant', -19, 8)] })],
    run: { cov: 'c2', def: TWO_HIGH.concat([{ who: 'Curl right', zone: [10.5, 1.4, 2, 1.1] }, bites('Middle read (lurk)', 'e1', 3)]), lit: ['e2'], ring: ['Curl right'], fake: { who: 'e1', until: 2 }, throws: [{ man: 'e2', at: 2.75 }] } });

  S('four-verticals', { cov: 'c3', cam: DEEP,
    keys: [
      /* 1 single high: the flat defender lets the seam go, the safety cannot get over to it */
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right', 'Deep middle third'], def: [{ who: 'Curl to flat right', zone: [14.5, 4, 3.6, 2] }], branch: { e3: 0 }, throws: [{ man: 'e3', at: 2.45 }], words: [W('Single high', 0, 25, .3), W('Lets him go by', 13, 2, 1.6), W('Cannot get over', 3, 16, 2)] },
      /* 2 two high: the bender splits the safeties, nobody in the deep middle */
      { cov: 'c2', lit: ['e3'], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e3', at: 2.6 }], words: [W('Two high', 0, 26, .3), W('Split the two safeties', 8, 16, 2.1)] },
      /* 3 match or man: the overhang turns and runs with him, one on one down the field */
      { cov: 'c1', lit: ['e3'], ring: ['Man lock on #2'], branch: { e3: 0 }, throws: [{ man: 'e3', at: 2.85 }], words: [W('Turn and run with your slot', 16, 6, 1.5), W('One on one', 19, 22, 2.4)] },
      /* 4 the safety takes the seam away, the backers stay shallow: the deep cross gets up over them */
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left', 'Hook to curl right', 'Deep middle third'], def: SHALLOW3.concat([at('Deep middle third', 12, 12, { zone: [13, 20, 6, 3] })]), throws: [{ man: 'e2', at: 3.05 }], words: [W('Take that seam ball away', 15, 23, 1.4), W('Linebackers are going to settle', -2, 3.5, 1.8), W('Up over the top', -3, 15, 2.4)] },
      /* 5 every vertical taken away: the back's option route sits down, check it down */
      { cov: 'c3', lit: ['e1'], def: [at('Deep middle third', 6, 13, { zone: [6, 20, 9, 3] })], throws: [{ man: 'e1', at: 2.35 }], words: [W('Vertical routes are taken away', 0, 24, 1.3), W('Check it down', 5, 5, 2.2)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 17, -6)] }), pre({ lit: ['e2'], words: [W('Deep cross', -8, 16)] }), pre({ lit: ['e1'], words: [W('Option route', 5, 4)] })],
    run: { cov: 'c3', lit: ['e3'], branch: { e3: 0 }, throws: [{ man: 'e3', at: 2.45 }] } });

  /* THE POWER READ: the jet comes across to the right and the guard and the back pull the same way. The quarterback reads the
     right end: he chases the jet, keep it inside behind the puller; he sits inside, give it to the jet on the edge. */
  const keepIn = { who: 'qb', path: [[.6, -3.6], [2, -1.2], [2.7, 2], [3.2, 10], [3.6, 20]] };
  const jetGive = { end: 6.6, run: { who: 'e0', path: [[8, -1.6], [13, -.4], [16.5, 4], [18, 13], [18.5, 22]] }, hand: { to: 'e0', at: 1.3 } };
  S('jet-power-read', { cov: 'c3', cam: WIDE,
    keys: [
      pre({ lit: ['e0'], ring: ['Rush#4'], dtags: { 'Rush#4': 'THE EDGE' }, words: [W('Jet motion', -2, -5.5, .8)] }),
      { cov: 'c3', lit: ['pull'], ring: ['Rush#4'], def: [bites('Rush#4', 'e0', 3.4), bites('Curl to flat right', 'e0', 3.4)], run: keepIn, words: [W('Shoot upfield', 11, 3, 1.4), W('Pulling guard come across', 4, 12, 2.2)] },
      Object.assign({ cov: 'c3', lit: ['e0'], ring: ['Rush#4'], def: [bites('Rush#4', 'qb', 2.6)], words: [W('Jumps down inside', 3, 4, 1.4), W('Give it to our jet read', 16, 10, 2.2)] }, jetGive),
      { cov: 'c3', ring: ['Curl to flat right', 'Deep left third (bail)'], def: [bites('Rush#4', 'e0', 3.4), at('Curl to flat right', 9, 3, { chase: 'qb', until: 1.8 }), at('Curl to flat left (creep)', -16, 6, { zone: [-17, 8, 4, 2.4] })], run: { who: 'qb', path: [[.6, -3.6], [2, -1.2], [2.6, 2], [-1, 6.5], [-4, 15], [-5, 24]] }, words: [W('They take the edge away', 9, 7, 1.4), W('Cut it back', -3, 12, 2.3)] },
    ],
    adj: [],
    run: { cov: 'c3', lit: ['pull'], def: [bites('Rush#4', 'e0', 3.4), bites('Curl to flat right', 'e0', 3.4)], run: keepIn } });

  /* trips on the LEFT out of Empty Trips Y Off; the solo receiver motions in from the right onto the post */
  const CORNER_OUT = [at('Man lock on #1', 12.6, 7, { shade: 'out' })];
  S('ins-slot-corner', { cov: 'c1', cam: DEEP,
    keys: [
      /* 1 the corner in outside shade, no safety in the middle: the post leaves him all that ground, take the shot */
      { cov: 'c0', def: CORNER_OUT.concat(ZERO_UP(5.5)), lit: ['e3'], ring: ['Man lock on #1'], dtags: { 'Man lock on #1': 'OUTSIDE SHADE' }, throws: [{ man: 'e3', at: 2.45 }], words: [W('No safety help', 2, 22, .3), W('So much ground', 8, 12, 1.8), W('Taking this one on one shot', 3, 18, 2.4)] },
      /* 2 the corner route: a hard cut inside, then out, and the defender is left trailing: touch it in */
      { cov: 'c1', def: [at('Man lock on #4', -12.2, 6.5)], lit: ['e1'], ring: ['Man lock on #4'], throws: [{ man: 'e1', at: 3.05 }], words: [W('Hard cut inside', -8, 9, 1.6), W('Trail position', -15, 14, 2.4), W('Touch pass it', -19, 19, 2.8)] },
      /* 3 the shallow cross: one on one with the backer, throw it as it breaks inside */
      { cov: 'c1', def: [at('Man lock on #4', -12.2, 6.5)], lit: ['e2'], ring: ['Man lock on #3'], def: [at('Man lock on #4', -12.2, 6.5), { who: 'Man lock on #3', lag: 3 }], throws: [{ man: 'e2', at: 2.4 }], words: [W('One on one', -2, 7, 1.4), W('As it breaks inside', 1, 4, 2)] },
      /* 4 everything else covered: all the way back to the drag */
      { cov: 'c1', def: [at('Man lock on #4', -12.2, 6.5), at('Man lock on #5', -18.6, 7.5, { shade: 'out', lag: 3.2 })], lit: ['e0'], ring: ['Man lock on #5'], throws: [{ man: 'e0', at: 2.35 }], words: [W('If that’s still covered', 4, 20, 1.3), W('All the way back to the drag', -7, 7, 2.4)] },
    ],
    adj: [pre({ lit: ['e0', 'e1', 'e2'], words: [W('Trips to the wide side', -13, -6)] }), pre({ lit: ['e3'], words: [W('Motion in, post', 10, 9)] }), pre({ lit: ['e2'], words: [W('Shallow cross', 0, 6)] })],
    run: { cov: 'c0', def: CORNER_OUT.concat(ZERO_UP(5.5)), lit: ['e3'], ring: ['Man lock on #1'], throws: [{ man: 'e3', at: 2.45 }] } });

  /* ================= EXPLOSIVE CHAMBLISS QB ================= */
  /* trips on the LEFT: the bubble is e0; the guard pulls right and the quarterback power follows him */
  const qbPower = { who: 'qb', path: [[.8, -3.6], [2.4, -1], [3, 2.5], [3.8, 11], [4.4, 21]] };
  const bubbleCatch = (who, path) => ({ throws: [{ man: who, at: 1.6 }], run: { who, path, afterCatch: 2.15 } });
  const THREE_OVER = [at('Hook to curl left', -12.4, 4.6, { zone: [-12.4, 6, 4, 2.4] })];
  S('rpo-alert-bubble-qb-power', { cov: 'c3', cam: WIDE,
    keys: [
      /* 1 two over three on the bubble side, the backers inside: flip it out */
      pre({ lit: ['e0'], ring: ['Deep right third (bail)', 'Curl to flat left (creep)'], words: [W('3 on 2', -13, 7), W('Linebackers way inside', -1, 8, .9)] }),
      /* 2 even numbers: snap it, they bite inside, throw it */
      Object.assign({ cov: 'c3', lit: ['e0'], ring: ['Hook to curl left', 'Curl to flat left (creep)'], def: THREE_OVER.concat([bites('Curl to flat left (creep)', 'qb', 2.3), bites('Hook to curl left', 'qb', 2.3)]), words: [W('We are even', -12, 9, .3), W('Bite down inside', -19, 11, 2)] }, bubbleCatch('e0', [[-20, 3], [-21, 10], [-21, 21]])),
      /* 3 they stay out there on the bubble: keep it, follow the guard */
      { cov: 'c3', lit: ['pull'], ring: ['Hook to curl left'], def: THREE_OVER, run: qbPower, words: [W('The bubble is taken away', -14, 9, 1.4), W('Get to the second level', 6, 9, 2.2)] },
      /* 4 they crash: the block outside is one on one, throw it, twenty yards */
      Object.assign({ cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: [bites('Curl to flat left (creep)', 'qb', 2.6), bites('Deep right third (bail)', 'qb', 2.2)], words: [W('Crash in at the snap', -11, 4, 1.4), W('20 yard pickup', -20, 17, 2.8)] }, bubbleCatch('e0', [[-20, 3], [-21, 11], [-20.5, 22]])),
      /* 5 the bubble taken away and the user blitzing the hole: the short side hitch */
      { cov: 'c3', lit: ['e1'], ring: ['Hook to curl right'], def: THREE_OVER.concat([blitz('Hook to curl right')]), throws: [{ man: 'e1', at: 1.95 }], words: [W('Blitzing right at you', 4, 5, 1.3), W('The hitch', 16, 8, 2)] },
    ],
    adj: [pre({ lit: ['e0', 'k0', 'k1'], words: [W('Trips to the wide side', -13, -6)] })],
    run: { cov: 'c3', lit: ['pull'], def: THREE_OVER, run: qbPower } });

  S('levels-seam', { cov: 'c3', cam: DEEP,
    keys: [
      /* 1 single high: the skinny seam inside the safety, hold it until he is even, then lead it up the hash */
      { cov: 'c3', lit: ['e2'], ring: ['Deep middle third'], def: [at('Deep middle third', -10.35, 13.5, { zone: [-10.35, 19, 3, 2.6] })], throws: [{ man: 'e2', at: 3.5 }], words: [W('Single high', -10.35, 31, .3), W('Even with him', -8.5, 16.5, 2.4), W('Lead it right up inside of the hash', -4, 24, 2.8)] },
      /* 2 the streak holds the safety, the comeback holds the corner */
      { cov: 'c3', lit: ['e1', 'e4'], ring: ['Deep middle third', 'Deep left third (bail)'], def: [at('Deep middle third', -10.35, 13.5, { zone: [-10.35, 19, 3, 2.6] }), bites('Deep left third (bail)', 'e4', 3.4)], throws: [{ man: 'e2', at: 3.05 }], words: [W('That streak holds this player', -12, 22, 1.6), W('Holds this player down', 19, 14, 2)] },
      /* 3 Cover 2 with nobody in the middle: split the safeties */
      { cov: 'c2', lit: ['e2'], def: [blitz('Middle read (lurk)')], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e2', at: 2.9 }], words: [W('No middle defender', 2, 9, .3), W('Split the safeties', -3, 22, 2.4)] },
      /* 4 man, or the seam taken away: the three checkdowns, the tight end in the flat first */
      { cov: 'c1', lit: ['e3', 'e0', 'e4'], throws: [{ man: 'e3', at: 2.2 }], words: [W('Three routes we can go to', -4, 22, 1.2), W('Checkdown to the flat', 13, 4, 2)] },
    ],
    adj: [pre({ lit: ['e0', 'e1', 'e2'], words: [W('Trips to the wide side', -13, -6)] }), pre({ lit: ['e1'], words: [W('Streak', -13, 18)] })],
    run: { cov: 'c3', lit: ['e2'], def: [at('Deep middle third', -10.35, 13.5, { zone: [-10.35, 19, 3, 2.6] })], throws: [{ man: 'e2', at: 3.05 }] } });

  /* ================= VEER N SHOOT ================= */
  const swing = () => ({ throws: [{ man: 'e1', at: 1.75 }], run: { who: 'e1', path: [[20, 6], [20.5, 14], [20, 24]], afterCatch: 2.35 } });
  S('hb-swing', { cov: 'c3', cam: WIDE,
    keys: [
      pre({ lit: ['e1'], words: [W('No pre-snap tell', 6, -8)] }),
      /* 2 three blockers out there against three: with the back it is four on three */
      Object.assign({ cov: 'c3', lit: ['e1', 'k0', 'k1', 'k2'], ring: ['Curl to flat right', 'Deep left third (bail)', 'Deep middle third'], words: [W('4 on 3', 19, 9, .9)] }, swing()),
      /* 3 the goal line: they play tight inside, nobody flies out */
      Object.assign({ cov: 'c1', lit: ['e1'], def: [at('Man lock on #2', 7, 2.5), at('Man lock on #3', 4, 3), at('Man lock on #4', 1.5, 4.5)], ring: ['Man lock on #2', 'Man lock on #3', 'Man lock on #4'], words: [W('They want to play tight', 3, 7, .3), W('Get into the end zone', 19, 12, 2.6)] }, swing()),
      /* 4 everybody leaves the middle for the swing: the backside slant */
      { cov: 'c3', lit: ['e0'], branch: { e0: 0 }, def: [bites('Curl to flat left (creep)', 'e1', 3), bites('Hook to curl left', 'e1', 3), bites('Hook to curl right', 'e1', 3)], ring: ['Curl to flat left (creep)', 'Hook to curl left'], throws: [{ man: 'e0', at: 2.05 }], words: [W('Leaves the middle of the field', -5, 5, 1.5), W('Backside slant', -17, 9, 2.2)] },
      /* 5 four of them out there, the option sits on a hitch: take off, QB draw */
      { cov: 'c3', def: [at('Hook to curl right', 15, 5, { zone: [15, 6, 4, 2.4] }), bites('Hook to curl left', 'e1', 3), at('Curl to flat left (creep)', -16, 5, { zone: [-17, 7, 4, 2.4] })], ring: ['Hook to curl right', 'Curl to flat right', 'Deep left third (bail)'], run: { who: 'qb', path: [[0, -4], [.6, 0], [1, 8], [1.4, 17]], delay: .2 }, words: [W('Four defenders out here', 17, 9, 1.2), W('QB draw', 2, 11, 2.4)] },
    ],
    adj: [],
    run: Object.assign({ cov: 'c3', lit: ['e1'] }, swing()) });

  const PA = { fake: { who: 'k0', until: 1.75 } };
  S('pa-deep-choice', { cov: 'c4', cam: DEEP,
    keys: [
      /* 1 match: the slot fade wheel and the post vertical on the same plane, the safety takes the post, bomb the wheel */
      Object.assign({ cov: 'c4', lit: ['e1', 'e0'], ring: ['Deep inside right quarter', 'Deep outside right quarter'], def: [bites('Deep outside right quarter', 'e0', 3.8), at('Deep inside right quarter', -9, 11, { zone: [-9, 17, 4, 2.6] })], throws: [{ man: 'e1', at: 3.25 }], words: [W('Same plane', -20, 8.5, 1.6), W('Almost an impossible read', -7, 15, 2.3), W('Bomb this match coverage', -23, 26, 2.8)] }, PA),
      /* 2 two high match: the option route we motioned in turns into a post */
      Object.assign({ cov: 'c4', lit: ['e3'], branch: { e3: 0 }, ring: ['Deep inside right quarter', 'Deep inside left quarter'], def: [bites('Deep inside right quarter', 'e1', 4), at('Deep inside left quarter', 16, 15, { chase: 'e3', until: 9 })], throws: [{ man: 'e3', at: 3 }], words: [W('Two high match', 6, 25, .3), W('Turn into a post', 11, 18, 2.5)] }, PA),
      /* 3 Cover 3: the option pulls the middle safety back, the slot fade pulls the corner out, the short side post is wide open */
      Object.assign({ cov: 'c3', lit: ['e0'], branch: { e3: 1 }, ring: ['Deep middle third', 'Deep right third (bail)'], def: [bites('Deep middle third', 'e3', 3.4), bites('Deep right third (bail)', 'e1', 3.4)], throws: [{ man: 'e0', at: 2.95 }], words: [W('Pull the middle safety back', 9, 23, 1.6), W('Wide open', -10, 17, 2.6)] }, PA),
      /* 4 the comeback against match, thrown as he breaks */
      Object.assign({ cov: 'c4', lit: ['e2'], ring: ['Quarter flat right'], throws: [{ man: 'e2', at: 2.85 }], words: [W('Throw that as he breaks', 18, 14, 2.3)] }, PA),
      /* 5 Cover 2: the hole shot behind the flat defender, in front of the safety */
      Object.assign({ cov: 'c2', lit: ['e1'], ring: ['Cloud flat left', 'Deep right half'], throws: [{ man: 'e1', at: 2.75 }], words: [W('In behind this flat defender', -21, 11, 2.2), W('In front of the safety', -16, 20, 2.5)] }, PA),
      /* 6 man: the post and the slot fade come together and rub */
      Object.assign({ cov: 'c1', lit: ['e0', 'e1'], ring: ['Man lock on #5', 'Man lock on #4'], throws: [{ man: 'e1', at: 2.85 }], words: [W('Natural rub action', -17, 7, 1.6)] }, PA),
      /* 7 the back on his option route: the checkdown */
      pre({ lit: ['k0'], words: [W('The checkdown', 5, -8)] }),
    ],
    adj: [pre({ lit: ['k0'], words: [W('Back to the wide side', 4, -9)] }), pre({ lit: ['e3'], words: [W('Motion in', 20, -5)] }), pre({ lit: ['e2'], words: [W('Comeback', 17, 13)] }), pre({ lit: ['e0'], words: [W('Post', -15, 17)] }), pre({ lit: ['k0'], words: [W('You can block him', 4, -9)] })],
    run: Object.assign({ cov: 'c4', lit: ['e1'], def: [bites('Deep outside right quarter', 'e0', 3.8), at('Deep inside right quarter', -9, 11, { zone: [-9, 17, 4, 2.6] })], throws: [{ man: 'e1', at: 3.25 }] }, PA) });

  S('deep-choice', { cov: 'c3', cam: DEEP,
    keys: [
      /* 1 the backer stays at ten, the crosser gets to fifteen: throw it early between the hashes */
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left', 'Hook to curl right'], def: [{ who: 'Hook to curl left', zone: [-4.7, 9, 4.4, 1.1] }, { who: 'Hook to curl right', zone: [4.8, 9, 4.4, 1.1] }], reroute: { e2: [[12, -2.2], [12, 7], [9, 11.5], [-2, 16.5], [-20, 19]] }, throws: [{ man: 'e2', at: 2.75 }], words: [W('Stay at about ten yards', -6, 8, 1.4), W('Between the hashes', 2, 18, 2.3)] },
      /* 2 single high: the option route settles into a curl */
      { cov: 'c3', lit: ['e3'], branch: { e3: 1 }, ring: ['Curl to flat right', 'Hook to curl right'], def: [{ who: 'Curl to flat right', zone: [19, 5, 4, 2.2] }], throws: [{ man: 'e3', at: 2.7 }], words: [W('Single high', 2, 25, .3), W('Like a curl route', 13, 14, 2.2)] },
      /* 3 Cover 2: the option breaks inside, the crosser goes over the top, the backers are pulled in: the post over the top */
      { cov: 'c4', lit: ['e3'], branch: { e3: 0 }, ring: ['Deep inside left quarter'], def: [bites('Quarter flat right', 'e2', 3.6)], throws: [{ man: 'e3', at: 3.1 }], words: [W('The safety playing at depth', 9, 20, 1.4), W('Option into this dig', 6, 13.5, 2.6)] },
      { cov: 'c2', lit: ['e4'], branch: { e3: 0 }, def: [bites('Middle read (lurk)', 'e3', 3.4), bites('Curl right', 'e3', 3.4), bites('Deep left half', 'e2', 3.5)], ring: ['Middle read (lurk)', 'Curl right'], throws: [{ man: 'e4', at: 3.15 }], words: [W('Pull all the linebackers inside', 5, 9, 1.5), W('Over the top', 13, 22, 2.6)] },
      /* 4 pressure: everybody vertical, check it down to the back */
      { cov: 'c3', lit: ['e1'], def: [blitz('Hook to curl right')], ring: ['Hook to curl right'], throws: [{ man: 'e1', at: 2.3 }], words: [W('Pressure in my face', 3, 3, 1.2), W('Check it down', 7, 6, 2.1)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 17, -6)] }), pre({ lit: ['e4'], words: [W('Post', 16, 19)] }), pre({ lit: ['e0'], words: [W('Streak', -22, 20)] }), pre({ lit: ['e1'], words: [W('Option route', 5, 4)] })],
    run: { cov: 'c3', lit: ['e2'], def: [{ who: 'Hook to curl left', zone: [-4.7, 9, 4.4, 1.1] }, { who: 'Hook to curl right', zone: [4.8, 9, 4.4, 1.1] }], reroute: { e2: [[12, -2.2], [12, 7], [9, 11.5], [-2, 16.5], [-20, 19]] }, throws: [{ man: 'e2', at: 2.75 }] } });

  /* ================= SCHEME KINGS ================= */
  /* QB G Down: trips LEFT, the run goes RIGHT, the right guard pulls around for the edge */
  const gDown = (path) => ({ run: { who: 'qb', path } });
  S('qb-g-down', { cov: 'c3', cam: WIDE,
    keys: [
      pre({ lit: ['k0', 'k1', 'k2'], words: [W('Trips away from the run', -13, -6), W('The run side', 7, 5, .9)] }),
      /* 2 the blocking played out: the tackle down, the tight end to the backer, the guard around for the edge */
      Object.assign({ cov: 'c3', lit: ['pull', 'k3'], words: [W('The guard pulls around', 6, -3, .5), W('5 on 4', 9, 5, 1.6)] }, gDown([[1.8, -4], [4.6, -1.2], [6.2, 3], [7, 12], [7.4, 20]])),
      Object.assign({ cov: 'c3', lit: ['pull'], words: [W('Bounce it', 12, 8, 2.2)] }, gDown([[1.8, -4], [5.5, -1.2], [9.5, 2], [11.5, 10], [12.5, 19]])),
      Object.assign({ cov: 'c1', lit: ['pull'], words: [W('Pound it', 5, 7, 2.1)] }, gDown([[1.8, -4], [3.8, -1], [4.6, 3], [5, 9]])),
    ],
    adj: [],
    run: Object.assign({ cov: 'c3', lit: ['pull'] }, gDown([[1.8, -4], [4.6, -1.2], [6.2, 3], [7, 12], [7.4, 20]])) });

  /* Dagger: trips LEFT; the deep cross comes across to the short side, the seam runs them off */
  S('dagger', { cov: 'c3', cam: DEEP,
    keys: [
      /* 1 the flat defender on the short side stops at ten, the cross gets up over his head at twenty */
      /* (2026-10-19) the deep cross is the play fix now: up to about ten, across to about seventeen */
      { cov: 'c3', lit: ['e2'], ring: ['Curl to flat right'], def: SHALLOW3.concat([{ who: 'Curl to flat right', zone: [12, 8, 4.4, 2.4] }]), throws: [{ man: 'e2', at: 3.55 }], words: [W('Stopping at about ten yards', 12, 5.5, 1.6), W('Over his head', 15, 18, 2.9)] },
      /* 2 match: the verticals and the drag pull them out, the cross gets over the top */
      { cov: 'c4', lit: ['e2'], def: [bites('Quarter flat right', 'e3', 3.8), bites('3-receiver hook', 'e0', 3.8), bites('Deep inside left quarter', 'e1', 3.8), bites('Deep inside right quarter', 'e1', 3.8)], ring: ['Quarter flat right', 'Deep inside left quarter'], throws: [{ man: 'e2', at: 3.55 }], words: [W('Pull guys out', 2, 22, 1.6), W('Over the top', 13, 17, 2.7)] },
      /* 3 the cross taken away, the drag played shallow: the post sit in the pocket the seam left */
      { cov: 'c3', lit: ['e0'], def: [bites('Hook to curl right', 'e2', 3.2), bites('Hook to curl left', 'e3', 3.2), { who: 'Curl to flat left (creep)', zone: [-12, 3.5, 4, 2] }], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], throws: [{ man: 'e0', at: 2.75 }], words: [W('Playing shallow', -9, 2.5, 1.5), W('Really big pocket', -12, 16, 2.2)] },
      /* 4 the tight end on the drag under the cross: a high low on the backers; against man he runs away from his man */
      { cov: 'c1', lit: ['e3', 'e2'], reroute: { e3: [[4.5, -2.5], [3.6, 1.2], [-6, 3.6], [-20, 4.4]] }, ring: ['Man lock on #2'], throws: [{ man: 'e3', at: 2.3 }], words: [W('High low', -2, 11, 1.6), W('Runs away from this man', -9, 6, 2.1)] },
      /* 5 two high: the seam splits them */
      { cov: 'c2', lit: ['e1'], def: [blitz('Middle read (lurk)')], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e1', at: 2.65 }], words: [W('Two high', 0, 26, .3), W('A bit of a tight throw', -6, 20, 2.3)] },
    ],
    adj: [pre({ lit: ['e0', 'e1', 'e2'], words: [W('Trips to the wide side', -13, -6)] }), pre({ lit: ['e0'], words: [W('Post sit', -12, 15)] })],
    run: { cov: 'c3', lit: ['e2'], def: SHALLOW3.concat([{ who: 'Curl to flat right', zone: [12, 8, 4.4, 2.4] }]), throws: [{ man: 'e2', at: 3.55 }] } });

  /* RPO Alert QB Counter: the bubble on the LEFT (short side), the seam on the right; the right guard pulls LEFT on the counter */
  const counter = { who: 'qb', path: [[-.6, -4], [-2.4, -1.2], [-3.6, 3], [-4.6, 11], [-5.2, 20]] };
  S('rpo-alert-qb-counter', { cov: 'c3', cam: WIDE,
    keys: [
      pre({ lit: ['e0', 'e1'], ring: ['Curl to flat left (creep)', 'Curl to flat right'], words: [W('Bubble', -19, 5), W('The seam is open', 12, 12, .8)] }),
      /* 2 he widens with the bubble: keep it */
      { cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)'], def: [bites('Curl to flat left (creep)', 'e0', 3)], run: counter, words: [W('He widens out', -15, 5, 1.4), W('Keep it', -6, 10, 2.2)] },
      /* 3 the counter: the guard pulls across, get ahead of the edge and up the field */
      { cov: 'c3', lit: ['pull'], def: [bites('Curl to flat left (creep)', 'e0', 3)], run: counter, words: [W('Guards coming across', -3, -3, .5), W('Up the field', -6, 14, 2.4)] },
      /* 4 he jumps inside: the block outside is one on one, throw the bubble */
      Object.assign({ cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)'], def: [bites('Curl to flat left (creep)', 'qb', 2.4)], words: [W('Jumps down inside', -7, 6, 1.4), W('One on one block', -19, 10, 2.2)] }, bubbleCatch('e0', [[-21, 3], [-21.5, 11], [-21, 21]])),
      /* 5 the counter started and they are all coming: flip it out to the bubble */
      { cov: 'c3', lit: ['e0'], def: [bites('Hook to curl left', 'qb', 3), bites('Hook to curl right', 'qb', 3), bites('Curl to flat left (creep)', 'qb', 3)], drop: .6, throws: [{ man: 'e0', at: 2.05 }], words: [W('They’re all coming', -2, 5, 1.4), W('Get rid of the football', -18, 6, 2.1)] },
      /* 6 reading the wide side: the overhang bites, throw the seam */
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'qb', 2.6)], throws: [{ man: 'e1', at: 2.45 }], words: [W('He bites', 9, 3, 1.4), W('The seam', 11, 18, 2.3)] },
    ],
    adj: [pre({ lit: ['e0'], words: [W('Bubble short side of the field', -16, -6)] })],
    run: { cov: 'c3', lit: ['pull'], def: [bites('Curl to flat left (creep)', 'e0', 3)], run: counter } });

  const touch = { end: 6.6, run: { who: 'e0', path: [[8, -1.8], [14, -.6], [18, 4], [19.5, 13], [19.5, 23]] }, hand: { to: 'e0', at: 1.28 } };
  S('jet-touch-pass', { cov: 'c3', cam: WIDE,
    keys: [
      Object.assign({ cov: 'c3', lit: ['e0', 'k1', 'k2', 'k3'], words: [W('Three blockers', 15, 6, 1.3), W('Open field', 19, 15, 2.5)] }, touch),
      pre({ lit: ['e0'], words: [W('This same motion', -3, -6), W('Three different plays', 8, 5, .9)] }),
      Object.assign({ cov: 'c1', lit: ['e0'], def: [at('Man lock on #2', 6, 3), at('Man lock on #3', 3, 3.5), at('Man lock on #1', 18, 9, { lag: 4 })], words: [W('Crowding the box', 2, 7, .3), W('Get the edge', 18, 9, 2.1)] }, touch, { run: { who: 'e0', path: [[8, -1.8], [12, -.6], [14, 3], [15, 10]] } }),
    ],
    adj: [],
    run: Object.assign({ cov: 'c3', lit: ['e0'] }, touch) });

  const jetFake = { fake: { who: 'e1', until: 1.9 } };
  S('fake-jet-fb-wheel', { cov: 'c3', cam: DEEP,
    keys: [
      pre({ lit: ['e1'], words: [W('Pull the user linebackers down', 3, 6)] }),
      /* 2 the flat defender jumps the jet: the curl sits where the backers left */
      Object.assign({ cov: 'c3', lit: ['e4'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'e1', 2.8), bites('Hook to curl right', 'e1', 2.8)], throws: [{ man: 'e4', at: 2.85 }], words: [W('Flat defender jumps down', 11, 1.5, 1.5), W('Curl is just going to sit down', 15, 13, 2.5)] }, jetFake),
      /* 3 they leave the middle on the fake: the cross */
      Object.assign({ cov: 'c3', lit: ['e3'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl left', 'e1', 2.6), bites('Hook to curl right', 'e1', 2.6)], throws: [{ man: 'e3', at: 2.75 }], words: [W('Leaves the middle of the field', 2, 6, 1.5), W('The cross', -6, 19, 2.6)] }, jetFake),
      /* 4 everybody drops out: throw it early underneath as the back cuts up */
      Object.assign({ cov: 'c3', lit: ['e2'], def: [{ who: 'Hook to curl left', zone: [-4.7, 12, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [4.8, 12, 4.4, 2.4] }, { who: 'Curl to flat right', zone: [13, 11, 4.4, 2.4] }], throws: [{ man: 'e2', at: 2.05 }], words: [W('Everyone drop', 2, 14, 1.2), W('Throw this early', 11, 5, 1.9)] }, jetFake),
    ],
    adj: [pre({ lit: ['e3', 'e4'], words: [W('Two receivers side to the wide side', 13, -6)] })],
    run: Object.assign({ cov: 'c3', lit: ['e4'], def: [bites('Curl to flat right', 'e1', 2.8), bites('Hook to curl right', 'e1', 2.8)], throws: [{ man: 'e4', at: 2.85 }] }, jetFake) });

  /* PA Double Switch: the slot motions across to the left and runs the streak; the post behind it is e0 */
  const PA2 = { fake: { who: 'e2', until: 1.8 } };
  S('pa-double-switch', { cov: 'c3', cam: DEEP, wide: 'L',   /* the back to the short side of the field */
    keys: [
      pre({ lit: ['e0', 'e1', 'e3', 'e4'], words: [W('Vertical routes going down the field', 0, 25)] }),
      /* 2 the motioned streak pulls the safety back, the post comes in behind it */
      Object.assign({ cov: 'c2', lit: ['e0', 'e3'], ring: ['Deep right half'], def: [at('Deep right half', -11, 13, { zone: [-12, 27, 8, 3] })], throws: [{ man: 'e0', at: 3 }], words: [W('Pull the middle safety back', -11, 26, 1.6), W('Break in behind them', -10, 16, 2.6)] }, PA2),
      /* 3 the safeties widen, nobody in the deep middle: the streak up the seam */
      Object.assign({ cov: 'c2', lit: ['e3'], def: [blitz('Middle read (lurk)'), at('Deep right half', -15, 12, { zone: [-17, 20, 9, 3] }), at('Deep left half', 15, 12, { zone: [17, 20, 9, 3] })], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e3', at: 2.9 }], words: [W('Safeties widen too far out', 16, 24, 1.3), W('Up the seam', -11, 19, 2.5)] }, PA2),
      /* 4 the streak and the post pull them back: the wheel behind the flat defender */
      Object.assign({ cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)'], throws: [{ man: 'e1', at: 3.2 }], words: [W('Behind the flat defender', -19, 15, 2.7)] }, PA2),
      /* 5 pressure, everyone under the verticals: check it down to the back */
      Object.assign({ cov: 'c3', lit: ['e2'], def: [blitz('Hook to curl right'), { who: 'Hook to curl left', zone: [-6, 12.5, 4.4, 2.4] }, { who: 'Curl to flat left (creep)', zone: [-14, 11, 4.4, 2.4] }], ring: ['Hook to curl left'], reroute: { e2: [[2.9, -6], [-1.5, -4.6], [-5.6, .8], [-6.8, 2.6]] }, throws: [{ man: 'e2', at: 2.5 }], words: [W('Pressure in our face', 3, 2, 1.2), W('Everyone’s getting underneath', -8, 15, 1.6), W('Check it down', -7, 5.5, 2.2)] }, { fake: { who: 'e2', until: 1.3 } }),   /* a quick fake: the back is the checkdown, so they cannot key him the whole way */
    ],
    adj: [pre({ lit: ['e2'], words: [W('Back to the short side', 2, -9)] }), pre({ lit: ['e3'], words: [W('Motion him across', -6, 14)] })],
    run: Object.assign({ cov: 'c2', lit: ['e0'], def: [at('Deep right half', -11, 13, { zone: [-12, 27, 8, 3] })], throws: [{ man: 'e0', at: 3 }] }, PA2) });

  S('double-smash-seam', { cov: 'c3', cam: DEEP,
    keys: [
      /* 1 zone, like flood: the flat defender stays down, the streak runs the corner off, the corner route on the wide side */
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [bites('Deep left third (bail)', 'e4', 3.6), { who: 'Curl to flat right', zone: [14, 3.5, 4, 1.4] }], throws: [{ man: 'e3', at: 2.9 }], words: [W('Flat defender stays down', 12, 3, 1.4), W('The corner', 19, 16, 2.5)] },
      /* 2 man: the corner on the side with no streak, one on one */
      { cov: 'c1', lit: ['e1', 'e3'], ring: ['Man lock on #4'], throws: [{ man: 'e1', at: 2.85 }], words: [W('Clearer of a throw', -18, 22, 1.4), W('One on one', -20, 16, 2.4)] },
      /* 3 match: the verticals pull everybody outside the hash, the back on a backer up the middle */
      { cov: 'c4', lit: ['e2'], ring: ['3-receiver hook'], def: [bites('Deep inside right quarter', 'e1', 3.4), bites('Deep inside left quarter', 'e3', 3.4), { who: '3-receiver hook', zone: [2.5, 7, 3.5, 2] }], throws: [{ man: 'e2', at: 2.95 }], words: [W('Outside the hash', 12, 22, 1.6), W('One on one', 3, 17, 2.5)] },
      /* 4 Cover 2 with the mid read too shallow: the back splits the safeties */
      { cov: 'c2', lit: ['e2'], ring: ['Middle read (lurk)'], def: [{ who: 'Middle read (lurk)', zone: [0, 5, 4, 2.2] }], throws: [{ man: 'e2', at: 2.85 }], words: [W('Too shallow', 4, 5, 1.4), W('Split the safeties', 3, 21, 2.5)] },
      /* 5 everything covered and pressure: the drag */
      { cov: 'c3', lit: ['e0'], def: [blitz('Hook to curl right')], ring: ['Hook to curl right'], throws: [{ man: 'e0', at: 2.45 }], words: [W('Pressure on our face', 3, 3, 1.2), W('The drag', -4, 7, 2.2)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Back to the wide side', 5, -8)] }), pre({ lit: ['e4'], words: [W('Streak', 18, 20)] }), pre({ lit: ['e0'], words: [W('Drag', -8, 6)] })],
    run: { cov: 'c3', lit: ['e3'], def: [bites('Deep left third (bail)', 'e4', 3.6), { who: 'Curl to flat right', zone: [14, 3.5, 4, 1.4] }], throws: [{ man: 'e3', at: 2.9 }] } });

  S('switch-slot-cross', { cov: 'c1', cam: DEEP, wide: 'L',   /* the back to the short side of the field */
    keys: [
      /* 1 man: the corner route, good separation as he breaks */
      { cov: 'c1', lit: ['e1'], ring: ['Man lock on #4'], throws: [{ man: 'e1', at: 2.95 }], words: [W('Good separation', -17, 14, 2.2)] },
      /* 2 the Z post crossing inside makes a natural rub for the corner route */
      { cov: 'c1', lit: ['e0', 'e1'], ring: ['Man lock on #5', 'Man lock on #4'], throws: [{ man: 'e1', at: 2.95 }], words: [W('Natural rub', -13, 6, 1.6)] },
      /* 3 no safety in the middle: the Z post */
      { cov: 'c0', def: ZERO_UP().concat([{ who: 'Man lock on #5', shade: 'out', lag: 3.2 }]), lit: ['e0'], throws: [{ man: 'e0', at: 2.2 }], words: [W('No safety in the middle', 0, 22, .3), W('The Z post', -8, 17, 2.3)] },
      /* 4 three levels in the middle: the shallow, the dig behind it and the back */
      { cov: 'c1', lit: ['e3', 'e4', 'e2'], ring: ['3-receiver hook'], def: [{ who: '3-receiver hook', zone: [1, 11, 4, 2.4] }, at('Man lock on #2', 10.5, 6.5, { shade: 'out', lag: 3.2 })], throws: [{ man: 'e3', at: 1.8 }], words: [W('Three kind of level', 4, 14, 1.2)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Back to the short side', 2, -8)] }), pre({ lit: ['e1'], words: [W('Corner', -17, 17)] }), pre({ lit: ['e2'], words: [W('Block your running back', 2, -8)] })],
    run: { cov: 'c1', lit: ['e1'], throws: [{ man: 'e1', at: 2.95 }] } });

  const bubbleR = () => bubbleCatch('e2', [[23, 3], [23.5, 11], [23, 22]]);
  S('rpo-alert-bubble', { cov: 'c3', cam: WIDE,
    keys: [
      /* 1 two defenders over three receivers: throw it */
      pre({ lit: ['e2'], ring: ['Curl to flat right', 'Deep left third (bail)'], words: [W('Two defenders', 18, 8)] }),
      /* 2 two high and five in the box: run it right at them */
      Object.assign({ cov: 'c2', def: TWO_HIGH, lit: ['e1'], ring: ['Rush', 'Curl left'], words: [W('Two high', 0, 23, .3), W('Run the ball', -4, 11, 2.2)] }, zone()),
      /* 3 the overhang bites on the run: throw the bubble, three on three outside */
      Object.assign({ cov: 'c3', lit: ['e2', 'k0', 'k1'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'e1', 2.6)], fake: { who: 'e1', until: 1.9 }, words: [W('Bites down on the run', 10, 1.5, 1.5), W('Three on three', 21, 11, 2.3)] }, bubbleR()),
      /* 4 they load the box and do not respect the splits: throw it every time */
      Object.assign({ cov: 'c1', lit: ['e2'], def: [at('Man lock on #2', 5.5, 4.5), at('Man lock on #3', 3.5, 4)], ring: ['Man lock on #2', 'Man lock on #3'], words: [W('Loading the box', 3, 7, .3), W('Every single time', 19, 13, 2.3)] }, bubbleR()),
      /* 5 the short side option: a hitch against zone */
      { cov: 'c3', lit: ['e0'], throws: [{ man: 'e0', at: 1.95 }], words: [W('The hitch', -21, 7, 1.9)] },
      /* 6 the goal line: they load the box, nobody over the bubble */
      Object.assign({ cov: 'c0', lit: ['e2'], def: ZERO_UP(4).concat([at('Man lock on #3', 2.5, 3.5)]), words: [W('They don’t have anyone lined up here', 16, 7, .3)] }, bubbleR()),
    ],
    adj: [pre({ lit: ['e2', 'k0', 'k1'], words: [W('Trips to the wide side', 17, -6)] })],
    run: Object.assign({ cov: 'c3', lit: ['e2'], def: [bites('Curl to flat right', 'e1', 2.6)], fake: { who: 'e1', until: 1.9 } }, bubbleR()) });
})();
