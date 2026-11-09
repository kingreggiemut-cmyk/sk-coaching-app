/* live/custom27.js: the Madden custom offense on the film board (offense-film.js), 2026-11-09.
   Every read sets the defense up to DO what his words say (custom27.js has the reads, from his breakdown transcript and his
   games). The defense is the placeholder 4-2-5 nickel (intro-field.js shells) lined up on our formation; the overrides move it.
   The shells (from the defense's side, so 'Deep right third (bail)' is the corner on OUR left):
     c3 'Hook to curl left' 'Hook to curl right' 'Curl to flat right' (the nickel, our right) 'Curl to flat left (creep)' (our left)
        'Deep right third (bail)' (our left corner) 'Deep left third (bail)' (our right corner) 'Deep middle third'
     c2 'Curl left' 'Middle read (lurk)' 'Curl right' 'Cloud flat left' 'Cloud flat right' 'Deep right half' 'Deep left half'
     c4 'Quarter flat left' '3-receiver hook' 'Quarter flat right' 'Deep outside right quarter' 'Deep inside right quarter' ...
     c1 '3-receiver hook', 'Man lock on #1' (the widest on our right) to '#5', 'Deep middle third'; c0 the locks and two 'Blitz'.
   Our players by card key (left to right): e0.. the receivers and backs, k0.. the blockers off the line, qb, 'pull'.
   Times are seconds from the start of a step, the snap at 1. No em dashes in here. */
(function () {
  if (!window.skOffFilm) return;
  const S = (id, spec) => skOffFilm.stage('custom27', id, spec);
  const DEEP = [-26, -8, 26, 30], WIDE = [-26, -9, 26, 22];
  const pre = (o) => Object.assign({ pre: 1 }, o);
  const W = (t, x, y, at) => ({ t, x, y, at: at == null ? .4 : at });
  const bites = (who, on, until) => ({ who, chase: on, until: until == null ? 2.6 : until });
  const blitz = (who) => ({ who, rush: true });
  const at = (who, x, y, more) => Object.assign({ who, x, y }, more || {});
  const SHALLOW3 = [{ who: 'Hook to curl left', zone: [-4.7, 6, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [4.8, 6, 4.4, 2.4] }];
  const DEEPHOOKS = [{ who: 'Hook to curl left', zone: [-5, 11.5, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [5, 11.5, 4.4, 2.4] }];
  const ZERO_UP = (x) => [at('Man lock on #2', x == null ? 8.5 : x, 6)];

  /* ================= BASE OFFENSE ================= */
  /* Tight Y Off with the wide side on the RIGHT: the tight end (k2) cheat motions to the left and leads, the run goes left */
  const oz = (path) => ({ run: { who: 'e0', path: path || [[1.2, -5.8], [-1.5, -3.6], [-5.5, -.6], [-9.5, 3], [-12, 10], [-13, 20]] }, hand: { to: 'e0', at: 1.45 } });
  S('cheat-outside-zone', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      /* 1 the cheat motion: the tight end comes across */
      pre({ lit: ['k2'], words: [W('Auto motion across the formation', 2, -5.5)] }),
      /* 2 zone: nobody follows him, an extra blocker for free */
      Object.assign({ cov: 'c3', lit: ['k2', 'e0'], ring: ['Curl to flat left (creep)'], words: [W('Nobody followed him over', -2, 6, .9), W('Extra blocker', -6, -1, 1.6)] }, oz()),
      /* 3 hat on a hat, the receivers to the second level, bust it outside */
      Object.assign({ cov: 'c3', lit: ['e0', 'k0', 'k1'], words: [W('Hat on a hat', -4, 3, 1.5), W('Bust this to the outside', -13, 10, 2.4)] }, oz()),
      /* 4 man: you can still run it */
      Object.assign({ cov: 'c1', lit: ['e0'], words: [W('You can run it versus man', -6, 9, 1.6)] }, oz()),
      /* 5 they overplay the outside, the user and the backers come down hard: cut it back up the middle */
      Object.assign({ cov: 'c3', lit: ['e0'], ring: ['Hook to curl left', 'Curl to flat left (creep)'], def: [at('Hook to curl left', -8, 4, { chase: 'e0', until: 2.4 }), at('Curl to flat left (creep)', -13, 4, { zone: [-14, 4, 3, 1.5] })], words: [W('Overplay to the outside', -12, 6, 1.4), W('Cut it back', 0, 9, 2.2)] },
        oz([[1.2, -5.8], [-1.5, -3.6], [-4.5, -.5], [-3, 3], [-.5, 10], [.5, 20]])),
    ],
    adj: [],
    run: Object.assign({ cov: 'c3', lit: ['k2', 'e0'] }, oz()) });

  /* the wide side is RIGHT: the tight end (e3) motions to the left and runs the seam, e1 the slot fade, e0 the wheel, e4 the comeback, e2 the back to the flat */
  S('cheat-slash-wheel-cross', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      /* 1 single high: the safety stays in the middle, the slot fade holds the corner, the seam is wide open */
      { cov: 'c3', lit: ['e3'], ring: ['Deep middle third', 'Deep right third (bail)'], def: [bites('Deep right third (bail)', 'e1', 3.6), { who: 'Hook to curl left', zone: [0, 6, 3, 1.6] }], throws: [{ man: 'e3', at: 2.85 }], words: [W('Single high', 0, 26, .3), W('Seam just gets wide open', -6, 17, 2.3)] },
      /* 2 nobody in the flat, everybody inside: quick throw the wheel */
      { cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -6, 6, { zone: [-6, 7, 3, 2] })], throws: [{ man: 'e0', at: 2.25 }], words: [W('No flat defender', -14, 6, 1.2), W('Quick throw this wheel', -18, 12, 2.1)] },
      /* 3 Cover 4 takes the seam away: wait until the wheel is in behind the flat defender */
      { cov: 'c4', lit: ['e0'], ring: ['Quarter flat left', 'Deep outside left quarter'], def: [{ who: 'Quarter flat left', zone: [-13, 6, 3, 1.6] }, bites('Deep outside left quarter', 'e1', 4)], throws: [{ man: 'e0', at: 3.35 }], words: [W('Seam is taken away', -4, 20, 1.4), W('In behind the flat defender', -17, 12, 2.8)] },
      /* 4 man: the comeback as he breaks back toward the ball */
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #1'], throws: [{ man: 'e4', at: 2.85 }], words: [W('Breaks back towards the ball', 14, 10, 2.5)] },
      /* 5 zone: high low the flat defender; he bites on the back, throw the comeback */
      { cov: 'c3', lit: ['e4', 'e2'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'e2', 3.4)], throws: [{ man: 'e4', at: 2.9 }], words: [W('High low', 15, 5, 1.4), W('Bite down on the running back', 17, 2.5, 2.1)] },
    ],
    adj: [pre({ lit: ['e3'], words: [W('Wide side of the field', 8, -6)] }), pre({ lit: ['e1'], words: [W('Slot fade', -12, 16)] }), pre({ lit: ['e4'], words: [W('Comeback', 13, 13)] })],
    run: { cov: 'c3', lit: ['e3'], def: [bites('Deep right third (bail)', 'e1', 3.6), { who: 'Hook to curl left', zone: [0, 6, 3, 1.6] }], throws: [{ man: 'e3', at: 2.85 }] } });

  /* Y Trips Wk, trips RIGHT: the outside trips receiver (k3) motions down in front of the back and leads, the zone goes right */
  const SSZDEF = [at('Hook to curl left', 2, 5.5, { zone: [5, 7, 3, 2] }), at('Hook to curl right', 7, 5.5, { zone: [9, 7, 3, 2] }), { who: 'Curl to flat left (creep)', zone: [-16, 6, 3, 2] }];   /* nobody comes over with the motion: the backers stay toward the trips, the run goes away from them */
  const ssz = () => ({ def: SSZDEF, run: { who: 'e0', path: [[-2.7, -5], [-2.6, -2.2], [-3.2, 1], [-4.6, 6], [-6.4, 13], [-7.5, 21]] }, hand: { to: 'e0', at: 1.4 } });
  S('mtn-same-side-zone', { cov: 'c3', cam: WIDE,
    keys: [
      pre({ lit: ['k3'], words: [W('Will not bring anybody over', 7, 6, .9)] }),
      Object.assign({ cov: 'c3', lit: ['e0', 'k3'], words: [W('Extra blocker right up on this side', -5, 2, 1.4), W('Get up field for about 10 yards', -7, 11, 2.3)] }, ssz()),
      Object.assign({ cov: 'c1', lit: ['e0'], words: [W('Bring a guy over', 3, 6, 1.0), W('Run is still very viable', -5, 13, 2.3)] }, ssz()),
      Object.assign({ cov: 'c3', lit: ['e0', 'k3'], words: [W('Lead us right through the hole', -3, 6, 1.6), W('Pick up that safety', -6, 15, 2.4)] }, ssz()),
    ],
    adj: [pre({ lit: ['k1', 'k2', 'k3'], words: [W('Trips to the wide side', 11, -6)] })],
    run: Object.assign({ cov: 'c3', lit: ['e0', 'k3'] }, ssz()) });

  /* Mtn Mesh, trips RIGHT: e4 the motion drag, e2 the tight end post, e1 the back's wheel, e3 the corner, e0 the solo streak */
  S('mtn-mesh', { cov: 'c3', cam: DEEP,
    keys: [
      /* 1 the backers stay back under the post, the flat defender under the wheel: throw the drag right away */
      { cov: 'c3', lit: ['e4'], ring: ['Hook to curl left', 'Hook to curl right'], def: DEEPHOOKS.concat([{ who: 'Curl to flat left (creep)', zone: [-14, 9, 4, 2] }]), throws: [{ man: 'e4', at: 2.15 }], words: [W('Staying back', 3, 13, 1.3), W('Throw that drag right away', -1, 4, 2.0)] },
      /* 2 man: the corner has to trail him all the way across */
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #1'], throws: [{ man: 'e4', at: 2.45 }], words: [W('Super hard to keep up with him', 0, 7, 2.1)] },
      /* 3 the backer leaves the middle for the drag: the tight end post */
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl left', 'e4', 3), bites('Hook to curl right', 'e4', 3)], throws: [{ man: 'e2', at: 2.75 }], words: [W('Leaves the middle of the field', -2, 5, 1.5), W('Wide open in the middle', 1, 16, 2.4)] },
      /* 4 the flat defender stops his feet: the wheel crosses in behind */
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)', 'Deep right third (bail)'], def: [{ who: 'Curl to flat left (creep)', zone: [-12, 5, 3, 1.5] }, bites('Deep right third (bail)', 'e0', 3.6)], throws: [{ man: 'e1', at: 3.25 }], words: [W('Stops his feet', -12, 6, 1.5), W('Crosses in behind', -16, 16, 2.8)] },
      /* 5 man: the corner follows the motion, the quick corner runs away from the mess */
      { cov: 'c1', lit: ['e3'], ring: ['Man lock on #2'], throws: [{ man: 'e3', at: 2.55 }], words: [W('Follow your drag', 5, 3, 1.4), W('Breaks to the outside', 19, 12, 2.4)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 11, -6)] }), pre({ lit: ['e0'], words: [W('Streak', -8, 18)] }), pre({ lit: ['e2'], words: [W('Post', 0, 14)] })],
    run: { cov: 'c3', lit: ['e4'], def: DEEPHOOKS.concat([{ who: 'Curl to flat left (creep)', zone: [-14, 9, 4, 2] }]), throws: [{ man: 'e4', at: 2.15 }] } });

  /* ================= EMPTY OFFENSE ================= */
  /* Fade Out, trips RIGHT and the stack LEFT: e0 the back of the stack on the streak, e1 the front on the wheel, e2 the deep cross,
     e3 the skinny post, e4 the fade */
  const FARHASH = [at('Deep middle third', 6, 13, { zone: [7, 20, 5, 3] }), bites('Deep right third (bail)', 'e1', 5), { who: 'Hook to curl left', zone: [-1.5, 6, 3, 1.6] }];   /* the hook stays underneath, nobody in the seam; Cover 3: the corner stays on the outside receiver (the wheel), and that is what opens the seam (his note 2026-11-09) */
  S('fade-out', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      /* 1 single high, the safety drifts to the far hash: the streak gets a free release up the seam */
      { cov: 'c3', lit: ['e0'], ring: ['Deep middle third'], def: FARHASH, throws: [{ man: 'e0', at: 3.3 }], words: [W('Single high', 2, 27, .3), W('Free release up the field', -11, 5, 1.4)] },
      /* 2 pass lead it up the seam, between the corner and the safety */
      { cov: 'c3', lit: ['e0'], ring: ['Deep middle third', 'Deep right third (bail)'], def: FARHASH, throws: [{ man: 'e0', at: 3.45 }], words: [W('Far hash', 7, 22, 1.4), W('Pass lead this up the seam', -9, 19, 2.7)] },
      /* 3 Cover 2: the deep cross pulls the mid read in, the skinny post gets over the top */
      { cov: 'c2', lit: ['e3'], ring: ['Middle read (lurk)'], def: [bites('Middle read (lurk)', 'e2', 3.2)], throws: [{ man: 'e3', at: 3.05 }], words: [W('Pulling the mid read into the middle', 0, 9, 1.8), W('Skinny post', 9, 20, 2.6)] },
      /* 4 Cover 2: the wheel in behind the flat defender, a hole shot */
      { cov: 'c2', lit: ['e1'], ring: ['Cloud flat left', 'Deep right half'], def: [{ who: 'Cloud flat left', zone: [-14, 4, 3, 1.5] }, bites('Deep right half', 'e0', 3.4)], throws: [{ man: 'e1', at: 2.95 }], words: [W('In behind the flat defender', -18, 12, 2.6), W('Hole shot', -15, 20, 2.9)] },
      /* 5 no mid read: the deep over and the skinny seam are wide open */
      { cov: 'c2', lit: ['e2', 'e3'], def: [blitz('Middle read (lurk)')], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e3', at: 2.75 }], words: [W('No mid read', 0, 9, .3), W('Wide open touchdown', 6, 21, 2.5)] },
      /* 6 match: the back of the stack on the post, both deep players shoot in on him, the wheel is wide open */
      { cov: 'c4', lit: ['e0', 'e1'], ring: ['Deep outside right quarter', 'Deep inside right quarter'], def: [bites('Deep outside right quarter', 'e0', 4), bites('Deep inside right quarter', 'e0', 4)], reroute: { e0: [[-10, -2.5], [-9.3, -.6], [-9.3, 9], [-3, 16], [1, 22]] }, throws: [{ man: 'e1', at: 3.3 }], words: [W('Both shoot in on the post', -7, 12, 1.8), W('Wheel against cover four quarters', -18, 18, 2.8)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 13, -6)] }), pre({ lit: ['e0'], words: [W('Streak', -9, 18)] }), pre({ lit: ['e0'], reroute: { e0: [[-10, -2.5], [-9.3, -.6], [-9.3, 9], [-3, 16], [1, 22]] }, words: [W('Post', -4, 14)] })],
    run: { cov: 'c3', lit: ['e0'], def: FARHASH, throws: [{ man: 'e0', at: 3.3 }] } });

  /* Curl Switch, the stack LEFT and to the wide side: e1 the front of the stack on the corner out, e0 the Z post */
  S('curl-switch', { cov: 'c1', cam: DEEP, wide: 'L',
    keys: [
      /* 1 man, the defender in an inside shade: the corner out breaks away from him */
      { cov: 'c1', lit: ['e1'], ring: ['Man lock on #4'], def: [at('Man lock on #4', -7.5, 5)], throws: [{ man: 'e1', at: 2.95 }], words: [W('Inside shade', -6, 6, .4), W('Break to the outside', -16, 10, 2.3)] },
      /* 2 press: the defenders run into the front of the stack, the Z post comes up clean */
      { cov: 'c1', lit: ['e0'], ring: ['Man lock on #5', 'Man lock on #4'], def: [at('Man lock on #5', -10.5, 1), at('Man lock on #4', -9, 1)], throws: [{ man: 'e0', at: 2.35 }], words: [W('Press look', -12, 3, .4), W('Come up clean', -5, 9, 2.1)] },
      /* 3 no safety in the middle: wait for the Z post to clear, bomb it */
      { cov: 'c0', lit: ['e0'], def: ZERO_UP().concat([{ who: 'Man lock on #3', lag: 3 }]), throws: [{ man: 'e0', at: 3.05 }], words: [W('No safety in the middle', 0, 24, .3), W('Bomb them deep', 4, 18, 2.8)] },
      /* 4 the shallow cross attacking the middle of the field */
      { cov: 'c1', lit: ['e2'], def: [{ who: 'Man lock on #3', lag: 3 }, at('3-receiver hook', 6, 9, { zone: [7, 10, 3, 2] })], throws: [{ man: 'e2', at: 1.95 }], words: [W('Get that out of my hands', 2, 2, 1.6), W('Shallow cross', -2, 8, 2.2)] },
      /* 5 the stack and the shallow taken away: the dig over the top */
      { cov: 'c3', lit: ['e4', 'e3'], ring: ['Hook to curl right', 'Hook to curl left'], def: [bites('Hook to curl right', 'e2', 3.4), bites('Hook to curl left', 'e2', 3.4), { who: 'Curl to flat right', zone: [16, 4, 3, 1.5] }], throws: [{ man: 'e4', at: 3.15 }], words: [W('Dig breaking in over the middle', 9, 14, 2.4)] },
    ],
    adj: [pre({ lit: ['e0', 'e1'], words: [W('Stack to the wide side', -10, -6)] }), pre({ lit: ['e1'], words: [W('Corner out', -15, 12)] })],
    run: { cov: 'c1', lit: ['e1'], def: [at('Man lock on #4', -7.5, 5)], throws: [{ man: 'e1', at: 2.95 }] } });

  /* ================= SHOT PLAYS ================= */
  /* Mtn Seam Swirl, trips RIGHT: e4 motions down and goes vertical on the post, e2 the tight end streak, e0 the corner, e3 the return, e1 the back's option */
  S('mtn-seam-swirl', { cov: 'c3', cam: DEEP,
    keys: [
      { cov: 'c3', lit: ['e4'], ring: ['Deep middle third', 'Deep right third (bail)'], def: [bites('Deep middle third', 'e2', 3.4), bites('Deep right third (bail)', 'e0', 3.4)], throws: [{ man: 'e4', at: 3.2 }], words: [W('Hold that safety', 5, 22, 1.6), W('Up over the top', 0, 27, 2.9)] },
      { cov: 'c2', lit: ['e4'], ring: ['Deep right half', 'Deep left half'], def: [blitz('Middle read (lurk)'), bites('Deep right half', 'e0', 3.4), at('Deep left half', 15, 13, { zone: [17, 20, 6, 3] })], throws: [{ man: 'e4', at: 2.95 }], words: [W('Split these two safeties', 3, 20, 2.5)] },
      { cov: 'c3', lit: ['e1', 'e3'], def: [{ who: 'Hook to curl left', zone: [-5, 13, 4.4, 2.4] }, { who: 'Hook to curl right', zone: [5, 13, 4.4, 2.4] }], throws: [{ man: 'e1', at: 2.45 }], words: [W('Return route', 5, 5, 1.4), W('Option route', -5, 3, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 11, -6)] }), pre({ lit: ['e0'], words: [W('Corner route', -13, 16)] }), pre({ lit: ['e2'], words: [W('Streak', 5, 20)] })],
    run: { cov: 'c3', lit: ['e4'], def: [bites('Deep middle third', 'e2', 3.4), bites('Deep right third (bail)', 'e0', 3.4)], throws: [{ man: 'e4', at: 3.2 }] } });

  /* Spot Shake, Tight Flex Offset with the back to the short side (wide LEFT): e0 the wide side seam, e3 the tight end seam,
     e1 the receiver wheel, e2 the back's wheel, e4 the slant */
  S('spot-shake', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e0', 'e3'], ring: ['Hook to curl left'], def: [bites('Hook to curl left', 'e4', 3)], throws: [{ man: 'e3', at: 2.85 }], words: [W('Linebacker gets pulled down', 0, 4, 1.6), W('Seam balls', -5, 19, 2.5)] },
      { cov: 'c3', lit: ['e3'], ring: ['Deep middle third'], def: [bites('Deep middle third', 'e0', 3.5), { who: 'Hook to curl right', zone: [3, 4, 3, 1.5] }, { who: 'Hook to curl left', zone: [-3, 4, 3, 1.5] }], throws: [{ man: 'e3', at: 3.05 }], words: [W('Safety bites to the wide side', -9, 22, 1.8), W('Tight end seam', 6, 16, 2.6)] },
      { cov: 'c3', lit: ['e0'], ring: ['Hook to curl left', 'Curl to flat left (creep)'], def: [bites('Hook to curl left', 'e4', 2.8), at('Curl to flat left (creep)', -16, 4, { zone: [-17, 5, 3, 1.5] })], throws: [{ man: 'e0', at: 2.35 }], words: [W('Throw it a lot quicker', -4, 6, 1.6), W('Seam is open', -9, 14, 2.1)] },
      { cov: 'c2', lit: ['e1'], ring: ['Cloud flat left'], def: [{ who: 'Cloud flat left', zone: [-14, 3, 3, 1.5] }], throws: [{ man: 'e1', at: 3.0 }], words: [W('Hard flat', -14, 4, 1.3), W('As he cuts up the field', -19, 13, 2.6)] },
      { cov: 'c3', lit: ['e4'], def: DEEPHOOKS, throws: [{ man: 'e4', at: 2.05 }], words: [W('Playing way back', -2, 15, 1.2), W('Middle of the field wide open', 3, 6, 2.0)] },
      { cov: 'c1', lit: ['e2'], ring: ['3-receiver hook'], def: [{ who: '3-receiver hook', lag: 3 }], throws: [{ man: 'e2', at: 2.6 }], words: [W('Linebackers get caught inside', 3, 4, 1.4), W('Running back wheel', 15, 12, 2.6)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Running back to the short side', 6, -9)] }), pre({ lit: ['e4'], words: [W('Slant', 3, 6)] })],
    run: { cov: 'c3', lit: ['e0', 'e3'], def: [bites('Hook to curl left', 'e4', 3)], throws: [{ man: 'e3', at: 2.85 }] } });

  /* ================= SCHEME KINGS ================= */
  /* Bench Corner, trips RIGHT, the stack LEFT: e1 the quick out, e0 the back of the stack up the shallow seam, e2 the tight end corner, e3 the shallow cross, e4 the streak */
  S('bench-corner', { cov: 'c3', cam: WIDE, wide: 'R',
    keys: [
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -8.5, 7, { zone: [-8, 8, 3, 2] })], throws: [{ man: 'e1', at: 1.95 }], words: [W('Back off', -9, 9, 1.2), W('Throw that little quick out route', -15, 4, 1.9)] },
      { cov: 'c1', lit: ['e1'], ring: ['Man lock on #4'], def: [at('Man lock on #4', -7.5, 4)], throws: [{ man: 'e1', at: 1.95 }], words: [W('Caught inside', -7, 6, 1.2), W('Turn up the sideline', -19, 9, 2.4)] },
      { cov: 'c3', lit: ['e0'], ring: ['Curl to flat left (creep)'], def: [at('Curl to flat left (creep)', -15, 4, { zone: [-16, 5, 3, 1.5] }), at('Hook to curl left', 2, 6, { zone: [3, 7, 3, 2] })], throws: [{ man: 'e0', at: 2.35 }], words: [W('Go outside underneath', -15, 6, 1.2), W('Shallow seam', -8, 12, 2.2)] },
      { cov: 'c3', lit: ['e2'], ring: ['Hook to curl left'], def: [bites('Hook to curl left', 'e1', 2.6)], throws: [{ man: 'e2', at: 3.0 }], words: [W('Streak clearing everyone out', 18, 21, 1.6), W('Deep corner route from our tight end', 13, 17, 2.6)] },
      { cov: 'c3', lit: ['e3'], def: DEEPHOOKS, throws: [{ man: 'e3', at: 2.35 }], words: [W('Playing back', 3, 13, 1.2), W('Checkdown', 2, 7, 2.0)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 13, -6)] }), pre({ lit: ['e4'], words: [W('Streak', 18, 18)] })],
    run: { cov: 'c3', lit: ['e1'], def: [at('Curl to flat left (creep)', -8.5, 7, { zone: [-8, 8, 3, 2] })], throws: [{ man: 'e1', at: 1.95 }] } });

  /* Smash Seam, trips RIGHT, the stack LEFT: e1 the outside release corner, e0 the streak, e2 the deep over, e3 the seam, e4 the shallow in cut */
  const FLAT15 = (who) => ({ who, zone: [-13, 14, 3, 2] });
  S('smash-seam', { cov: 'c2', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c2', lit: ['e1'], ring: ['Cloud flat left', 'Deep right half'], def: [FLAT15('Cloud flat left'), bites('Deep right half', 'e0', 3.4)], throws: [{ man: 'e1', at: 3.3 }], words: [W('Sitting at about 15 yards', -12, 12, 1.4), W('Up along the sideline', -20, 21, 2.8)] },
      { cov: 'c3', lit: ['e1'], ring: ['Curl to flat left (creep)'], def: [FLAT15('Curl to flat left (creep)'), bites('Deep right third (bail)', 'e0', 3.4)], throws: [{ man: 'e1', at: 3.3 }], words: [W('Fourth and long', 0, 27, .3), W('Over flat defenders heads', -17, 18, 2.8)] },
      { cov: 'c3', lit: ['e2'], def: [bites('Deep middle third', 'e3', 3.4)], throws: [{ man: 'e2', at: 3.15 }], words: [W('Deep over route', -3, 16, 2.4)] },
      { cov: 'c3', lit: ['e4'], def: [blitz('Hook to curl right'), blitz('Hook to curl left')], ring: ['Hook to curl right'], throws: [{ man: 'e4', at: 2.05 }], words: [W('Bringing a blitz', 3, 2, 1.2), W('Shallow in cut', 11, 6, 1.9)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the wide side', 13, -6)] }), pre({ lit: ['e0'], words: [W('Streak', -9, 18)] })],
    run: { cov: 'c2', lit: ['e1'], def: [FLAT15('Cloud flat left'), bites('Deep right half', 'e0', 3.4)], throws: [{ man: 'e1', at: 3.3 }] } });

  /* Post Wheel, trips to the SHORT side (wide LEFT): e2 the tight end streak, e3 the wheel, e4 the Z post, e1 the drag, e0 the curl */
  S('post-wheel', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right'], def: [at('Curl to flat right', 8, 6, { zone: [7, 7, 3, 2] })], throws: [{ man: 'e3', at: 2.25 }], words: [W('No flat defender out here', 16, 5, 1.2), W('As he cuts up field', 20, 12, 2.0)] },
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat right', 'Deep left third (bail)'], def: [{ who: 'Curl to flat right', zone: [17, 5, 3, 1.5] }, bites('Deep left third (bail)', 'e2', 3.6)], throws: [{ man: 'e3', at: 3.3 }], words: [W('Pulled back here by the streak', 11, 22, 1.8), W('Clears this flat defender', 18, 9, 2.6)] },
      { cov: 'c3', lit: ['e4'], def: SHALLOW3.concat([bites('Deep middle third', 'e2', 3.4)]), throws: [{ man: 'e4', at: 3.2 }], words: [W('Linebackers are getting held down', -2, 4, 1.5), W('Deep over the middle of the field', 3, 21, 2.6)] },
      { cov: 'c3', lit: ['e1', 'e0'], def: [bites('Hook to curl left', 'e1', 2.8), bites('Hook to curl right', 'e1', 2.8)], throws: [{ man: 'e0', at: 2.6 }], words: [W('Pulled inside to take the drag', 0, 5, 1.6), W('Curl that sits down', -10, 12, 2.3)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the short side', 13, -6)] }), pre({ lit: ['e2'], words: [W('Streak', 8, 18)] })],
    run: { cov: 'c3', lit: ['e4'], def: SHALLOW3.concat([bites('Deep middle third', 'e2', 3.4)]), throws: [{ man: 'e4', at: 3.2 }] } });

  /* 0 1 Trap: one defender left unblocked, the left guard traps him, the back hits it right up the A gap */
  const TRAPDEF = [at('Curl to flat left (creep)', -15, 5, { zone: [-15, 6, 3, 2] }), at('Hook to curl left', -6.5, 5, { zone: [-7, 6, 3, 2] }), at('Hook to curl right', 6.5, 5, { zone: [7, 6, 3, 2] })];
  const trap = () => ({ def: TRAPDEF, run: { who: 'e0', path: [[1.4, -5.2], [.9, -2.5], [.7, 1], [.8, 6], [.5, 14], [0, 22]] }, hand: { to: 'e0', at: 1.35 } });
  S('0-1-trap', { cov: 'c3', cam: WIDE,
    keys: [
      Object.assign({ cov: 'c3', lit: ['e0', 'pull'], words: [W('Let him come up field', 3, 3, 1.1), W('Trap him', 2, -1, 1.6), W('Get downhill', 0, 9, 2.2)] }, trap()),
      Object.assign({ cov: 'c3', lit: ['e0'], words: [W('No hesitation', 0, 7, 1.6)] }, trap()),
      Object.assign({ cov: 'c3', lit: ['e0'], words: [W('Center to get to the second level', 0, 6, 1.5), W('Quick hit it right downhill', 1, 12, 2.2)] }, trap()),
      Object.assign({ cov: 'c3', lit: ['e0'], ring: ['Hook to curl left', 'Hook to curl right'], words: [W('Overplays to the outside', 8, 7, 1.4), W('Right up the middle of the field', 0, 14, 2.4)] }, trap()),
    ],
    adj: [],
    run: Object.assign({ cov: 'c3', lit: ['e0', 'pull'] }, trap()) });

  /* Mtn Fork Y-Corner, the back to the short side (wide LEFT) and blocked: e4 motions across and runs the corner, e0 the post,
     e3 the tight end's backside corner, e1 the shallow cross */
  S('mtn-fork-y-corner', { cov: 'c1', cam: DEEP, wide: 'L',
    keys: [
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #3'], throws: [{ man: 'e4', at: 3.05 }], words: [W('Get off the press', -8, 2, 1.0), W('Free release', -6, 6, 1.7)] },
      { cov: 'c1', lit: ['e4'], ring: ['Man lock on #3'], throws: [{ man: 'e4', at: 3.05 }], words: [W('Actually man', -2, 4, .5), W('Break to the outside', -16, 11, 2.5)] },
      { cov: 'c3', lit: ['e0'], ring: ['Deep middle third'], throws: [{ man: 'e0', at: 3.35 }], words: [W('Single high safety', 0, 26, .3), W('Clears past that safety', -1, 20, 2.9)] },
      { cov: 'c1', lit: ['e3'], ring: ['Man lock on #1'], def: [{ who: 'Man lock on #1', lag: 3.2 }], throws: [{ man: 'e3', at: 3.05 }], words: [W('One-on-one right here', 12, 9, 1.6), W('Breaks to the outside', 15, 15, 2.6)] },
      { cov: 'c1', lit: ['e1'], throws: [{ man: 'e1', at: 2.45 }], words: [W('Natural rubs', -3, 5, 1.6), W('Come wide open right there', 6, 7, 2.3)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Make sure the running back is blocked', 6, -9)] }), pre({ lit: ['e1'], words: [W('Shallow cross', 0, 7)] }), pre({ lit: ['e3'], words: [W('Corner route', 12, 14)] })],
    run: { cov: 'c1', lit: ['e4'], ring: ['Man lock on #3'], throws: [{ man: 'e4', at: 3.05 }] } });

  /* PA Switch Verts, the back to the short side (wide LEFT): e0 motions out on the streak, e1 the deep corner, e3 the switch
     release up the seam, e2 the wheel, k0 the back (the fake) */
  const PA = { fake: { who: 'k0', until: 1.75 } };
  S('pa-switch-verts', { cov: 'c3', cam: DEEP, wide: 'L',
    keys: [
      Object.assign({ cov: 'c3', lit: ['e1'], ring: ['Deep right third (bail)', 'Curl to flat left (creep)'], def: [bites('Deep right third (bail)', 'e0', 3.6), { who: 'Curl to flat left (creep)', zone: [-14, 14, 3, 2] }], throws: [{ man: 'e1', at: 3.45 }], words: [W('The streak pulls this guy back', -19, 25, 1.8), W('Corner route gets so deep down the field', -13, 21, 2.8)] }, PA),
      pre({ lit: ['e0'], words: [W('Motion him out', -18, 3)] }),
      Object.assign({ cov: 'c2', lit: ['e3'], def: [blitz('Middle read (lurk)')], ring: ['Deep right half', 'Deep left half'], throws: [{ man: 'e3', at: 3.1 }], words: [W('No mid read', 0, 10, .3), W('Drop that up over the top', 1, 23, 2.8)] }, PA),
      Object.assign({ cov: 'c3', lit: ['e3'], ring: ['Deep left third (bail)'], def: [bites('Deep left third (bail)', 'e2', 3.4)], throws: [{ man: 'e3', at: 3.1 }], words: [W('Right up the seam', 3, 19, 2.6)] }, PA),
      { cov: 'c3', lit: ['k0'], def: DEEPHOOKS, reroute: { k0: [[2, -6.2], [1, -3.5], [.5, 1.5], [1, 3.5]] }, throws: [{ man: 'k0', at: 2.65 }], words: [W('Another option', 3, 6, 2.2)] },
    ],
    adj: [pre({ lit: ['k0'], words: [W('Running back to the short side', 6, -9)] }), pre({ lit: ['e0'], words: [W('Motion him out', -18, 3)] }), pre({ lit: ['k0'], words: [W('Option route', 3, 5)] })],
    run: Object.assign({ cov: 'c3', lit: ['e1'], def: [bites('Deep right third (bail)', 'e0', 3.6), { who: 'Curl to flat left (creep)', zone: [-14, 14, 3, 2] }], throws: [{ man: 'e1', at: 3.45 }] }, PA) });

  /* Mtn Choice, the back to the wide side (wide RIGHT): e0 the slot fade on the short side, e1 the streak, e3 the tight end's deep
     cross, e4 the motioned over option route, e2 the back's check and release */
  S('mtn-choice', { cov: 'c3', cam: DEEP, wide: 'R',
    keys: [
      { cov: 'c3', lit: ['e0'], ring: ['Deep right third (bail)'], def: [bites('Deep right third (bail)', 'e1', 5)], throws: [{ man: 'e0', at: 3.3 }], words: [W('Respect this seam', -9, 18, 1.6), W('Up over the top', -18, 27, 2.9)] },
      { cov: 'c3', lit: ['e0'], ring: ['Deep right third (bail)'], def: [bites('Deep right third (bail)', 'e1', 5)], throws: [{ man: 'e0', at: 3.3 }], words: [W('Anticipation', -13, 9, 1.4), W('Pass lead this up and away', -18, 21, 2.7)] },
      { cov: 'c2', lit: ['e0'], ring: ['Cloud flat left', 'Deep right half'], def: [{ who: 'Cloud flat left', zone: [-15, 4, 3, 1.5] }, bites('Deep right half', 'e1', 3.4)], throws: [{ man: 'e0', at: 3.2 }], words: [W('In behind the cover two flat defender', -17, 10, 2.4), W('Drop it in along the sideline', -20, 18, 2.9)] },
      { cov: 'c3', lit: ['e1'], ring: ['Deep right third (bail)'], def: [at('Deep right third (bail)', -17, 9, { zone: [-18, 22, 3, 3], chase: 'e0', until: 5 })], throws: [{ man: 'e1', at: 3.0 }], words: [W('Step for step on the outside', -18, 14, 1.6), W('Throw that up the seam', -7, 20, 2.6)] },
      { cov: 'c3', lit: ['e3'], ring: ['Curl to flat left (creep)'], def: [bites('Curl to flat left (creep)', 'e4', 2.8), { who: 'Hook to curl left', zone: [-9, 3.5, 2, 1] }, bites('Hook to curl right', 'e4', 2.8)], throws: [{ man: 'e3', at: 3.1 }], words: [W('Pulls the flat defender down', -9, 3, 1.6), W('Deep crosser from the tight end', -12, 11, 2.6)] },
      { cov: 'c3', lit: ['e4'], def: DEEPHOOKS, throws: [{ man: 'e4', at: 2.45 }], words: [W('Sit down', -6, 5, 1.8)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Running back to the wide', 6, -9)] }), pre({ lit: ['e1'], words: [W('Streak', -7, 18)] }), pre({ lit: ['e2'], words: [W('Block him', 6, -9)] })],
    run: { cov: 'c3', lit: ['e0'], def: [bites('Deep right third (bail)', 'e1', 5)], throws: [{ man: 'e0', at: 3.3 }] } });

  /* RPO Zone Peek, trips RIGHT: the solo (e0) motions in and runs the slant, the back (e1) runs the zone; read the backside backer */
  const peek = () => ({ run: { who: 'e1', path: [[-1.5, -5.5], [.5, -3], [1.5, 0], [2.5, 5], [3.5, 12], [4, 20]] }, hand: { to: 'e1', at: 1.45 } });
  S('rpo-zone-peek', { cov: 'c3', cam: WIDE,
    keys: [
      pre({ lit: ['e0'], ring: ['Hook to curl left', 'Hook to curl right'], dtags: { 'Hook to curl left': 'BACKSIDE LINEBACKER' }, words: [W('Reading the linebackers', 0, 9)] }),
      Object.assign({ cov: 'c3', lit: ['e1'], ring: ['Hook to curl left'], def: [at('Hook to curl left', -5, 8, { zone: [-5, 9, 3, 2] })], words: [W('He jumps back', -5, 10, 1.3), W('Get way to the outside', 11, 10, 2.4)] }, peek()),
      Object.assign({ cov: 'c3', lit: ['e1'], ring: ['Hook to curl left'], def: [{ who: 'Hook to curl left', zone: [-4.7, 5.5, 3, 2] }], words: [W('Slow playing it', -5, 7, 1.4), W('Put our foot in the ground', 5, 7, 2.2)] }, peek()),
      { cov: 'c3', lit: ['e0'], ring: ['Hook to curl left'], def: [bites('Hook to curl left', 'e1', 2.6)], fake: { who: 'e1', until: 1.9 }, throws: [{ man: 'e0', at: 2.2 }], words: [W('Caught inside', -2, 4, 1.5), W('Slant', -6, 9, 2.1)] },
      { cov: 'c3', lit: ['e0'], ring: ['Hook to curl left'], def: [{ who: 'Hook to curl left', zone: [-2.5, 3, 1.6, 1] }], fake: { who: 'e1', until: 1.9 }, throws: [{ man: 'e0', at: 2.2 }], words: [W('Opening is open on the backside', -8, 8, 2.0)] },
    ],
    adj: [pre({ lit: ['k0', 'k1', 'k2'], words: [W('Trips to the wide side', 11, -6)] }), pre({ lit: ['e0'], words: [W('Motion him in', -12, 3)] })],
    run: Object.assign({ cov: 'c3', lit: ['e1'], ring: ['Hook to curl left'], def: [at('Hook to curl left', -5, 8, { zone: [-5, 9, 3, 2] })] }, peek()) });

  /* Quick Fork Zig, trips RIGHT: e2 the outside slant from the inside of the trips */
  S('quick-fork-zig', { cov: 'c3', cam: [-26, -9, 26, 16], wide: 'L', goal: 6,   /* run it into the end zone from about the six (his note 2026-11-09) */
    keys: [
      { cov: 'c3', lit: ['e2'], ring: ['Curl to flat right'], def: [bites('Curl to flat right', 'e3', 2.6)], throws: [{ man: 'e2', at: 2.1 }], words: [W('Great red zone play', 0, 13, .3)] },
      { cov: 'c1', lit: ['e2'], throws: [{ man: 'e2', at: 2.15 }], words: [W('Beat man', 11, 9, 2.0)] },
      { cov: 'c1', lit: ['e2'], ring: ['Man lock on #3'], throws: [{ man: 'e2', at: 2.15 }], words: [W('Outside slant absolutely nasty', 12, 12, 2.1)] },
    ],
    adj: [pre({ lit: ['e2', 'e3', 'e4'], words: [W('Trips to the short side', 11, -6)] }), pre({ lit: ['e1'], words: [W('Running back wheel', -9, 4)] })],
    run: { cov: 'c1', lit: ['e2'], throws: [{ man: 'e2', at: 2.15 }] } });

  /* Cheat Spot Y Quick, the back to the short side (wide LEFT): the tight end (e3) cheat motions left and goes to the flat,
     e1 the corner, e0 the slot fade, e4 the backside post, e2 the back's swing */
  S('cheat-spot-y-quick', { cov: 'c3', cam: WIDE, wide: 'L',
    keys: [
      { cov: 'c3', lit: ['e3'], def: [{ who: 'Curl to flat left (creep)', zone: [-13, 9, 3, 2] }], throws: [{ man: 'e3', at: 1.95 }], words: [W('To the flat really, really quickly', -10, 5, 1.6), W('Quick throw', -15, 3, 1.95)] },
      { cov: 'c1', lit: ['e1'], ring: ['Man lock on #4'], throws: [{ man: 'e1', at: 3.1 }], words: [W('Corner route', -12, 16, 2.4), W('Along the sideline', -19, 22, 2.8)] },
      { cov: 'c3', lit: ['e4'], ring: ['Hook to curl left', 'Hook to curl right'], def: [bites('Hook to curl right', 'e3', 2.6), bites('Hook to curl left', 'e3', 2.6)], throws: [{ man: 'e4', at: 2.85 }], words: [W('Get up over the linebackers', 2, 10, 2.4), W('Backside post', 6, 16, 2.7)] },
      { cov: 'c3', lit: ['e2'], def: DEEPHOOKS, throws: [{ man: 'e2', at: 2.25 }], words: [W('Running back on a swing', 14, 2, 2.0)] },
    ],
    adj: [pre({ lit: ['e2'], words: [W('Running back to the short side', 6, -9)] }), pre({ lit: ['e0'], words: [W('Slot fade', -12, 16)] }), pre({ lit: ['e4'], words: [W('Post', 8, 14)] })],
    run: { cov: 'c3', lit: ['e3'], def: [{ who: 'Curl to flat left (creep)', zone: [-13, 9, 3, 2] }], throws: [{ man: 'e3', at: 1.95 }] } });
})();
