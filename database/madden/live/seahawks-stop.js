/* seahawks-stop.js: the staging for STOP IT on the Seahawks advanced defense (2026-10-12). One pair per answer: what the
   field does when that call is lined up against that question. See stop-it.js for what a pair can say.

   The men are the calls' own (s0..s10 in the order the game's art lists them, per front). What each of them does after the
   snap is placed by hand from HIS rules and write-ups: Palms against trips and bunch (the Palms breakdown and the Alabama
   match write-up), the flip on Bracket 9 Switch, the walked down safety on Show SS Sim 2, who he users on each call. The
   first nine (trips, four verticals, I form) were looked at on the design board; the rest are staged the same way and have
   only been checked on the grid sheet. Colours are named: deep, hook, seam, cyan, teal, rush, gold, white. */
(function () {
  if (!window.skStop) return;
  const PINCH = { s6: [.5, 2.8], s8: [-7, 7.6], s9: [7, 7.6], s4: [0, 8.6], s0: [-2.2, 1.2], s2: [2.3, 1.2], s3: [5.4, 1.2], s5: [-5.4, 1.2] };   /* the three high penny with the blitz shown and the line pinched */
  const SOFT = { s7: [-16.5, 5, 5, 2.6, 'soft-squat', 'flat'], s10: [16.5, 5, 5, 2.6, 'soft-squat', 'flat'] };                                    /* the Run D macro: corners in soft squats */
  const TOSSCAM = { tx: 5.5, ty: 1.2, pitch: 32, yaw: 0, span: 31, ymin: -9 };
  const TOSS = { rb: [[0, -7.4], [4, -7.2], [9.5, -4.6], [11.6, -2.8]], fb: [[0, -4.7], [4.5, -3.8], [8.6, -1.6]], qb: [[0, -1.4], [.8, -3.4], [0, -4.6]] };
  const TOSSL = { rb: [[0, -7.4], [-4, -7.2], [-9.5, -4.6], [-11.6, -2.8]], fb: [[0, -4.7], [-4.5, -3.8], [-8.6, -1.6]], qb: [[0, -1.4], [-.8, -3.4], [0, -4.6]] };

  /* the answers that come up under more than one question */
  const PALMS3 = { s7: 'w1', s4: 'w3', s8: 'w2', s10: 'x', s9: 'x', s6: 'rb', s5: [0, 8] }, PALMS3O = { s9: [-2.8, 2.4], s10: [1, -1.1], s4: [.8, 1.4], s6: [.5, 1.5] };
  const MACRO = { zone: SOFT, user: 's9', look: 'Quarters, then the macro: soft squats outside.', fit: { s6: [3, 2], s5: [4.4, 1.3], s9: [6.4, 3.1], s8: [-1.5, 5], s10: [10.6, 1.7], s7: [-9, 2.5], s4: [-5, 2], s3: [6.2, -.3], s2: [2.3, 0], s1: [-1.5, 0], s0: [-5.2, 0] },
    labs: [['CORNERS IN THE RUN FIT', 11, 9.6, 'cyan', 1.7]], end: ['NO GAIN', [3.6, 1.1]] };
  const SSTOSS = { cam: TOSSCAM, user: 's5', look: 'Walk the safety down on the strength.', routes: TOSS,
    fit: { s9: [10.9, -1], s3: [9.2, -2], s10: [14, -1.6], s6: [7.8, .2], s5: [6, .6], s8: [9, 6.5], s4: [-6, 3], s0: [-5, .2], s1: [-1, -.2], s2: [3.4, -.3], s7: [-15, 7] }, labs: [['HOLDS THE EDGE', 14, 3.4, 'rush', 2.3]], end: ['LOSS', [11.6, -2.8]] };
  const EB3RUN = { user: 's8', look: 'Show blitz and pinch the line.', walk: PINCH, routes: { rb: [[0, -7.4], [.5, -4.8], [1.5, -3.2]], fb: [[0, -4.7], [2.4, -1.8], [3.2, .6]], qb: [[0, -1.4], [.5, -3.8], [-.6, -5.4]] },
    fit: { s6: [[1.6, 1.4], [1.8, -1.2], [1.8, -2.7]], s9: [5, 1.6], s4: [1.2, 3.4], s8: [0, 10], s5: [-6, .4], s3: [5.2, -.4], s2: [2.2, -.3], s1: [0, -.3], s0: [-2.2, -.3], s7: [-17.5, 6], s10: [17.5, 6] },
    labs: [['THREE SAFETIES IN THE BOX', 1, 17.4, 'gold', 1.2], ['LOOPS IN FREE', 7.6, -6.2, 'rush', 2.7]], end: ['TFL', [1.6, -3.2]] };

  skStop.stage('seahawks-coverages', {
    /* ---- FORMATIONS ---- */
    trips: {
      'cover-4-palms': { user: 's9', look: 'The same two high shell. No setup.', cover: PALMS3, offs: PALMS3O,
        labs: [['MEG', -22.8, 13.5, 'deep', 2], ['NICKEL TAKES 3', -16.5, 7.4, 'seam', 2.6], ['SAFETY TAKES 2', -10.5, 20.5, 'deep', 3.2], ['ROBBER', 12, 17.6, 'gold', 3.7], ['HAS THE BACK', 13, 4.4, 'seam', 4]] },
      'bracket-9-switch': { flip: 1, user: 's8', look: 'The man side came out on the trips. Flip it.', cover: { s10: 'w1', s6: 'w3', s9: 'w2', s7: 'x', s4: 'rb', s8: 'x', s5: [0, 8] }, offs: { s8: [-2.8, 2.4], s7: [1, -1.1], s6: [.8, 1.4], s4: [.5, 1.5] },
        labs: [['PALMS TO THE TRIPS', -8, 26.6, 'deep', 2.2], ['MAN ON THE BACK SIDE', 10.5, 6.6, 'white', 2.9], ['NO RESPONSIBILITIES', 13, 21.4, 'gold', 3.6]] },
      'lb-blitz-6': { user: 's6', look: 'The quarters side is to the trips.', free: ['s0'], home: .8, cover: { s7: 'w1', s8: 'w2', s4: 'w3', s10: 'x', s9: [11, 18], s6: [6.6, 10.2] }, offs: { s10: [.8, -1.2], s4: [.8, 1.4] },
        labs: [['QUARTERS SIDE MATCHES ALL THREE', -8, 25.6, 'deep', 2.2], ['HOVER, THEN GET OUT', 11.5, 7.6, 'gold', 2.7], ['UNBLOCKED', -10.5, -3, 'rush', 3]], end: ['SACK'] } },
    bunch: {
      'cover-4-palms': { user: 's9', look: 'The check is Bingo. Match the quadrant, not the number.', cover: { s7: 'b1', s8: 'te', s4: 'b2', s10: 'x', s9: 'x', s6: 'rb', s5: [0, 8] }, offs: { s9: [-2.8, 2.4], s10: [1, -1.1], s4: [.8, 1.4], s6: [.5, 1.5] },
        tags: { s9: ['FREE OVER THE MIDDLE', 'gold'] }, labs: [['MATCHED ALL ACROSS THE FIELD', -8, 26.4, 'deep', 2.4]] },
      'cover-4-quarters': { user: 's9', look: 'The check is Box. Match the quadrant, not the number.', cover: { s7: 'b1', s8: 'te', s4: 'b2', s10: 'x', s9: 'x', s6: 'rb', s5: [-3, 7.5] }, offs: { s9: [-2.8, 2.4], s10: [1, -1.1], s4: [.8, 1.4], s6: [.5, 1.5] },
        tags: { s7: ['DEEP OUTSIDE', 'deep'], s8: ['DEEP INSIDE', 'deep'], s4: ['FIRST SHALLOW', 'seam'] } },
      'bracket-9-switch': { flip: 1, user: 's8', look: 'The man side came out on the bunch. Flip it.', cover: { s10: 'b1', s9: 'te', s6: 'b2', s7: 'x', s4: 'rb', s8: 'x', s5: [0, 8] }, offs: { s8: [-2.8, 2.4], s7: [1, -1.1], s6: [.8, 1.4], s4: [.5, 1.5] },
        labs: [['MATCH TO THE BUNCH', -8, 26.6, 'deep', 2.2], ['MAN ON THE BACK SIDE', 10.5, 6.6, 'white', 2.9]] },
      'show-ss-sim-2': { flip: 1, user: 's5', look: 'Flip it so the safety walks down on the bunch.', free: ['s9'], home: .78, cover: { s10: 'b2', s8: 'b1', s6: 'te', s7: 'x', s4: 'rb', s5: [0, 8.5], s0: [9, 10] }, cap: { s6: 12 }, offs: { s10: [.8, 1.3] },
        tags: { s9: ['UNBLOCKED', 'rush'] }, end: ['SACK'] } },
    two: {
      'cover-4-quarters': { user: 's9', look: 'Two high, no setup.', cover: { s8: 'sl', s7: 'sl', s4: 'x', s6: 'te', s10: 'z', s9: 'z', s5: 'rb' }, offs: { s7: [-2.4, .4], s4: [.6, -1.3], s9: [-2.8, 1], s6: [-.6, 1.2], s5: [.3, 1.7] },
        tags: { s8: ['TAKES 2 VERTICAL', 'deep'], s6: ['TAKES THE FLAT', 'seam'], s9: ['BRACKETS 1', 'gold'] } },
      'pounder': { user: 's9', look: 'Man underneath. User a safety and play him with quarters rules.', cover: { s4: 'sl', s7: 'x', s10: 'z', s6: 'te', s5: 'rb', s8: 'sl', s9: 'z' }, offs: { s9: [-2.8, 1], s5: [.3, 1.7], s6: [-.6, 1.2] },
        tags: { s8: ['OVER THE TOP', 'deep'], s9: ['HELPS INSIDE', 'gold'] }, labs: [['MAN UNDERNEATH', -13.5, 8.2, 'white', 2.2]] },
      'silver-shoot-pinch': { user: 's5', look: 'Slant the line to the nickel. Blitz all linebackers.', walk: { s5: [-1.5, 2.6] }, free: ['s4', 's6'], home: .72, paths: { s6: [[1.2, 1.6], [.8, -2]], s4: [[-8.4, -1.2], [-4.4, -5]] }, cover: { s7: 'x', s8: 'sl', s9: 'te', s10: 'z', s5: 'rb' }, offs: { s5: [.4, 1.5], s7: [.8, -1.2] },
        tags: { s4: ['OFF THE EDGE', 'rush'] }, labs: [['TWO FREE RUSHERS', -11, -4.8, 'rush', 2.3], ['MAN ACROSS THE BOARD', -3, 25.6, 'white', 2.6]], end: ['SACK'] } },
    empty: {
      'cover-4-palms': { user: 's9', look: 'Empty is three by two: two sets of rules on one call.', cover: { s7: 'w1', s4: 'te', s8: 'h', s10: 'x', s6: 'sl', s9: 'sl', s5: [0, 8] }, offs: { s4: [.8, 1.4], s6: [-.8, -1.1], s9: [1.6, 2.6] },
        tags: { s4: ['TAKES 3', 'seam'], s8: ['TAKES 2', 'deep'] } },
      'blitz-loop-3': { user: 's6', blitz: ['s5'], zone: { s6: [.1, 9.5, 5, 2.7, 'rec-hook', 'hook'] }, look: 'Blitz all linebackers. Hover, then get out.', free: ['s4', 's5'], home: .74, paths: { s4: [[-9.6, -1.2], [-4.6, -5]], s5: [[.4, .6], [.2, -2.4]] },
        cover: { s8: 'h', s7: 'w1', s10: 'x', s6: 'sl', s3: [12, 7.5], s9: [0, 19.5] }, offs: { s6: [-.8, -.6], s8: [1, -1] }, tags: { s4: ['NOBODY TO BLOCK HIM', 'rush'], s8: ['SEAM FLAT MATCHES', 'seam'] }, end: ['SACK'] },
      'lb-pop-0': { user: 's5', blitz: ['s6'], look: 'Zero. You have whoever is uncovered.', free: ['s4', 's6'], home: .7, paths: { s4: [[-8.6, -1.2], [-4.4, -5]], s6: [[2.6, -1.2], [1.4, -4.4]] }, cover: { s7: 'w1', s8: 'h', s9: 'sl', s10: 'x', s5: 'te' }, offs: { s5: [.8, 1.3] },
        tags: { s4: ['FREE', 'rush'] }, labs: [['HALF A SECOND TO THROW IT', -11, -4.6, 'rush', 2.4]], end: ['SACK'] } },
    iform: { 'run-d-macro': MACRO, 'show-ss-sim-2': SSTOSS, 'edge-blitz-3': EB3RUN },

    /* ---- PASS CONCEPTS ---- */
    flood: {
      'cover-4-palms': { user: 's9', look: 'Palms is built for this. No setup.', cover: PALMS3, offs: PALMS3O,
        labs: [['THE FLAT IS TAKEN', -16.5, 7.4, 'seam', 2.4], ['THE CORNER ROUTE IS MATCHED', -9, 21.4, 'deep', 3], ['ROBBER', 12, 17.6, 'gold', 3.6]] },
      /* SS Dog 3 comes out with its blitz to the other side: mirrored so the blitz, the user and his seam flat are on the flood */
      'ss-dog-3': { mirror: 1, user: 's6', zone: { s6: [3, 8, 5, 2.7, 'hook-curl', 'hook'] }, look: 'QB contain. Hover for half a second, then get out.', free: ['s9'], home: .84, cover: { s3: 'w2', s10: 'w1', s8: [-7, 19.5], s6: 'w3', s1: [0, 8.5], s4: 'x', s7: [16, 19.5] }, offs: { s3: [1.1, -1.3], s6: [1.3, 1.2], s4: [-.8, -1.1] }, cap: { s3: 14 },
        tags: { s3: ['MATCHES 2 VERTICAL', 'seam'], s6: ['HELPS THE FLAT', 'gold'], s9: ['UNBLOCKED', 'rush'] }, end: ['SACK'] },
      'edge-blitz-2': { user: 's4', look: 'Show blitz and pinch the line.', walk: PINCH, free: ['s6'], home: .84, paths: { s6: [[1.5, 1.5], [1.2, -1.4]] }, cover: { s7: 'w3', s5: 'w2', s8: [-17, 20.5], s4: 'x', s10: 'x', s9: [10, 19] }, offs: { s7: [.8, 1.2], s5: [1.2, -1.3], s4: [-1.2, 1], s10: [.8, -1.2] },
        tags: { s7: ['TRAPS THE FLAT', 'cyan'], s5: ['DOUBLE ON THE CORNER', 'hook'], s6: ['LOOPER', 'rush'] }, end: ['SACK'] },
      'lb-blitz-6': { user: 's6', look: 'The quarters side is to the flood.', free: ['s0'], home: .8, cover: { s7: 'w1', s8: 'w2', s4: 'w3', s10: 'x', s9: [11, 18], s6: [6.6, 10.2] }, offs: { s10: [.8, -1.2], s4: [.8, 1.4] },
        labs: [['QUARTERS SIDE MATCHES ALL THREE', -8, 25.6, 'deep', 2.2], ['HOVER, THEN GET OUT', 11.5, 7.6, 'gold', 2.7], ['UNBLOCKED', -10.5, -3, 'rush', 3]], end: ['SACK'] } },
    verts: {
      'cover-4-quarters': { user: 's9', look: 'Two high, no setup.', cover: { s7: 'x', s8: 'sl', s9: 'te', s10: 'z', s4: [-11.5, 6.5], s6: [10, 6.5], s5: 'rb' }, offs: { s5: [.3, 1.7] },
        labs: [['FOUR DEEP ON FOUR VERTICALS', -7.5, 26.6, 'deep', 2.4], ['LOCKED', -22.4, 16, 'deep', 3], ['LOCKED', 22.4, 16, 'deep', 3], ['ALL HE HAS', 6.8, 3.4, 'hook', 3.7]] },
      'mike-ss-3-seam': { user: 's0', zone: { s0: [-4.5, 8.4, 4.6, 2.7, 'hook-curl', 'hook'] }, look: 'Four rushing, four on three to one side.', free: ['s6'], home: .72, paths: { s6: [[8.3, .4], [5.4, -3.6]] }, cover: { s5: 'sl', s9: 'te', s7: 'x', s10: 'z', s8: [0, 19.5], s3: 'rb', s0: [-3.6, 8] }, offs: { s5: [-1, 1.2], s9: [1, 1.2], s3: [.3, 1.6] },
        labs: [['SEAM FLATS MATCH THE VERTICALS', 0, 14.6, 'seam', 2.3], ['4 ON 3', 12.5, -2.2, 'rush', 1.9], ['HOVER, THEN GET OUT', -11, 4.6, 'gold', 2.7]], end: ['SACK'] },
      'okie-eagle-3': { user: 's0', zone: { s0: [-5.5, 8.5, 4.6, 2.7, 'hook-curl', 'hook'], s10: [16.5, 9, 4.8, 2.7, 'curl-flat', 'curlflat'] }, look: 'Step up, then get out. Curl flat on the corner.', free: ['s6'], home: .82,
        cover: { s7: 'x', s8: 'z', s5: [0, 20], s3: 'sl', s4: 'te', s0: 'sl', s1: [-1.5, 9], s10: [16.5, 9] }, offs: { s3: [-1.2, -1.2], s4: [-.9, -1.2], s0: [1.2, -1.8] }, cap: { s3: 14, s4: 14, s0: 11.5 },
        tags: { s5: ['THE INVERTED THIRD', 'deep'], s6: ['COMES HOME', 'rush'] }, labs: [['THREE RUSH, EIGHT DROP', -10.5, -4.6, 'rush', 2.2], ['NOTHING UP THE SEAM', 0, 14.8, 'hook', 2.9]], end: ['SACK'] },
      '2-invert-lurk': { user: 's8', look: 'It looks like normal Cover 2.', cover: { s7: [-12.5, 20], s9: [12, 20], s8: 'sl', s6: 'te', s10: 'z', s4: 'x', s5: 'rb' }, offs: { s8: [.5, 1.3], s6: [-.9, -1], s10: [-1, -1.3], s4: [1, -1.3], s5: [.3, 1.7] }, cap: { s8: 14.5, s10: 12.5, s4: 12.5, s6: 15 },
        labs: [['SITS ON THE SEAM', -14.5, 17.6, 'hook', 2.6], ['DEEP HALVES OVER THE TOP', -3, 26.6, 'deep', 3.1], ['CLOUDS SINK UNDER', 14, 9.2, 'teal', 3.5]] } },
    mesh: {
      'bracket-9-switch': { user: 's8', look: 'Two by two: leave it as it comes out.', cover: { s4: 'sl', s7: 'x', s8: 'te', s5: 'te', s6: 'rb', s10: 'z', s9: 'z' }, offs: { s8: [2.6, 2.4], s5: [.8, -.9], s9: [-2.6, 1.4], s6: [.6, 1.2], s4: [-.9, -1] },
        tags: { s5: ['WALLS THE DRAG', 'hook'] }, labs: [['SEE IT LATE, DRIVE ON IT', -15, 13.4, 'gold', 3.2]] },
      'cover-6-press': { user: 's3', look: 'Three rush. User the free hook curl.', cover: { s3: 'te', s4: 'sl', s5: 'te', s6: 'z', s7: 'x', s8: [-8, 18], s9: 'z', s10: 'rb' }, offs: { s3: [1.4, 1], s4: [-1, .9], s5: [-1.8, .2], s6: [-1, -1.2], s9: [1, 2], s10: [.6, 1.2] },
        tags: { s5: ['TRIPLE TEAM ON THE DRAG', 'seam'], s4: ['STEPS IN FRONT', 'hook'] } },
      'blitz-dt-pop': { user: 's4', look: 'Four rush. The tackles drop into the middle.', free: ['s6'], home: .86, paths: { s6: [[6.8, 3], [7.6, -1], [4, -4.6]] }, cover: { s7: 'x', s8: 'sl', s9: 'te', s10: 'z', s4: 'rb', s1: [-4.5, 4.6], s2: [5, 4.2] }, offs: { s4: [-.6, 1.4] },
        tags: { s1: ['IN THE LANE', 'hook'], s2: ['IN THE LANE', 'hook'], s6: ['LOOPS FREE', 'rush'] }, end: ['SACK'] },
      'ss-sim-2': { user: 's6', look: 'Shift the line to the safety. Hover, then get out.', free: ['s9'], home: .86, cover: { s5: 'te', s1: [-8, 5.8], s6: 'sl', s4: [-16, 6], s7: 'x', s10: 'rb', s8: 'z' }, offs: { s5: [1.1, .7], s6: [-1.1, .9], s10: [.4, 1.4], s8: [1, 3] },
        tags: { s5: ['THE MID READ JUMPS IT', 'hook'], s9: ['UNBLOCKED', 'rush'] }, labs: [['THE TACKLE DROPS', -13.5, 9.4, 'hook', 2.8]], end: ['SACK'] } },

    /* ---- MONEY ROUTES (parked 2026-10-12: not on the page for now) ---- */
    cross: {
      'pounder': { user: 's9', look: 'Man underneath. User a high safety.', cover: { s7: 'x', s4: 'sl', s10: 'z', s6: 'te', s5: 'rb', s9: 'x', s8: [0, 19] }, offs: { s9: [1.6, -1.7], s7: [-1.4, .8], s6: [.6, 1.2], s5: [.4, 1.5] },
        tags: { s9: ['UNDER THE CROSSER', 'gold'], s8: ['CAPS THE VERTICALS', 'deep'] } },
      'cover-4-quarters': { user: 's9', look: 'Two high, no setup. User a safety and rove.', cover: { s7: 'x', s9: 'x', s8: [-4, 11.5], s10: 'z', s4: 'sl', s6: 'te', s5: 'rb' }, offs: { s7: [-1.2, -1.4], s9: [1.6, 1.6], s6: [.8, 1], s4: [.6, 1.2], s5: [.4, 1.5] },
        tags: { s9: ['TAKES THE CROSSER', 'gold'], s8: ['STEPS DOWN', 'deep'] } },
      'nickel-sim-2': { user: 's3', look: 'Slide the line to the nickel and crash it down.', free: ['s4'], home: .76, paths: { s4: [[-9, -1.2], [-4.6, -5]] }, cover: { s3: [5, 10], s6: [0, 9.5], s10: 'z', s7: 'sl', s9: 'rb' }, offs: { s7: [.6, 1.2], s9: [.6, 1.4] },
        tags: { s4: ['UNBLOCKED', 'rush'] }, labs: [['THREE IN THE MIDDLE', 1.5, 14, 'hook', 2.6]], end: ['SACK'] } },
    corner: {
      'cover-4-palms': { user: 's9', look: 'No setup. The slot side plays Palms.', cover: { s7: 'sl', s8: 'sl', s4: 'x', s9: 'te', s10: 'z', s6: [9, 7], s5: 'rb' }, offs: { s7: [-2, -.4], s8: [1.3, 1.6], s4: [.8, 1.2], s5: [.3, 1.7] },
        tags: { s8: ['DOUBLED AT THE CATCH POINT', 'deep'] } },
      'show-ss-sim-2': { user: 's5', look: 'The safety is on the strength. QB contain.', cover: { s7: 'sl', s4: 'sl', s0: 'x', s6: 'te', s8: 'te', s10: 'z', s5: [0, 8.5] }, offs: { s4: [-.4, -2.4], s0: [1, 1.5], s10: [0, 1.2], s6: [-.9, -1] }, cap: { s6: 13 },
        tags: { s7: ['MEET AT THE FOOTBALL', 'deep'] }, labs: [['DEEP CLOUD FLAT', -19, 9.6, 'teal', 2.6]] },
      '2-invert-lurk': { user: 's8', look: 'Coverage, then Play the Sticks.', cover: { s4: 'sl', s7: 'sl', s8: [-9, 12], s6: 'te', s9: 'te', s10: 'z', s5: 'rb' }, offs: { s4: [-.5, -.8], s6: [-.9, -1], s10: [0, 1.2], s5: [.3, 1.7] }, cap: { s6: 14 },
        tags: { s4: ['PLAYS THE STICKS', 'teal'] } } },

    /* ---- RUNS ---- */
    inside: {
      'edge-blitz-3': EB3RUN, 'run-d-macro': MACRO,
      'bracket-9-switch': { user: 's8', look: 'I form: leave it as it comes out.', fit: { s7: [-7, 1.6], s8: [-1.2, 2.6], s10: [17, 7], s4: [-4.6, 1.8] }, tags: { s7: ['FIRES DOWN', 'white'] }, labs: [['EVERYBODY IN MAN IS IN THE FIT', 4, 9.6, 'white', 1.8]], end: ['NO GAIN', [3.6, 1.1]] } },
    outside: {
      'show-ss-sim-2': SSTOSS,
      'fs-will-blitz-0': { cam: TOSSCAM, user: 's5', look: 'Pinch the line. Six across: a picket fence.', walk: { s5: [.3, 1.9], s6: [6.8, 1.6] }, routes: TOSS, fit: { s6: [9.6, -1.5], s3: [7.4, -.8], s10: [14, -.8], s9: [8.8, 1.6], s5: [6.4, .4] },
        labs: [['A PICKET FENCE', -1, 4.6, 'white', 1.6], ['NOT GETTING OUTSIDE', 14.5, 5.4, 'rush', 2.5]], end: ['LOSS', [11.6, -2.8]] },
      '2-invert-lurk': { cam: { tx: -5.5, ty: 1.2, pitch: 32, yaw: 0, span: 31, ymin: -9 }, user: 's8', look: 'It still shows two high. User the safety in the hook curl.', routes: TOSSL, fit: { s8: [-10.7, -1.3], s4: [-13.8, -1.2], s0: [-8.8, -1.8], s5: [-6, .6] },
        tags: { s8: ['FLIES DOWNHILL', 'gold'] }, end: ['LOSS', [-11.6, -2.8]] },
      'cover-4-quarters': { cam: { tx: 8, ty: 1.2, pitch: 32, yaw: 0, span: 31, ymin: -9 }, user: 's9', look: 'No setup. User a safety and fire on it.', routes: TOSS, fit: { s9: [9.8, .2], s10: [14, -.8], s6: [7.6, .2], s3: [8.6, -1.6], s5: [5.6, .8], s8: [3, 5] },
        tags: { s9: ['FIRES DOWNHILL', 'gold'] }, labs: [['ALL NINE IN THE FIT', 2, 9.6, 'white', 1.8]], end: ['NO GAIN', [11.6, -2.8]] } },
    gun: {
      'fs-zone-blitz': { user: 's9', look: 'Flip it so the safety walks down away from the back.', walk: { s8: [-4.6, 4.6] }, fit: { s8: [[-5.2, 2], [-5, .7]], s3: [[-3.6, 1.6], [-3.9, -.2]] }, labs: [['DOWNHILL INTO IT', -11.5, 4.8, 'rush', 2.2]], end: ['NO GAIN', [-4.6, .9]] },
      'fs-will-blitz-0': { user: 's5', look: 'Pinch the line and bring the linebacker down over the center.', walk: { s5: [.3, 1.9] }, fit: { s8: [-7.2, .2], s0: [-5.6, -.2], s5: [-3, .8] }, labs: [['A PICKET FENCE', 5, 5.6, 'white', 1.6], ['HOLDS THE EDGE', -12.5, 3.6, 'rush', 2.3]], end: ['NO GAIN', [-4.6, .9]] },
      'cover-4-quarters': { user: 's8', look: 'No setup. User a safety.', fit: { s8: [-6, 3], s4: [-7.6, 1.4] }, labs: [['ALL NINE IN THE FIT', 4, 9.8, 'white', 1.8]], end: ['NO GAIN', [-4.6, .9]] } },

    /* ---- GAME SITUATIONS (2026-10-12) ---- */
    first: {
      'edge-blitz-3': { user: 's8', look: 'Show blitz and pinch the line.', walk: PINCH, free: ['s6'], home: .8, paths: { s6: [[1.5, 1.5], [1.2, -1.4]] }, cover: { s5: 'sl', s9: 'te', s4: [0, 9], s7: [-17, 19], s8: [0, 19.5], s10: 'z' }, offs: { s5: [-1, .6], s9: [-.6, 1.2] }, cap: { s5: 15 },
        tags: { s5: ['SEAM FLAT MATCHES 2', 'seam'], s6: ['LOOPER', 'rush'] }, end: ['SACK'] },
      'show-ss-sim-2': { user: 's5', look: 'The safety is on the strength. QB contain.', free: ['s9'], home: .8, cover: { s7: 'sl', s4: 'x', s0: [-9, 10], s5: 'x', s6: 'te', s10: 'z', s8: 'z' }, offs: { s4: [1, -1.2], s5: [2.2, -1.6], s6: [-.6, 1.2], s10: [-.8, -1.2] }, cap: { s4: 12, s10: 12 },
        tags: { s9: ['UNBLOCKED', 'rush'] }, labs: [['EVERYBODY ELSE DROPS', -2, 24.8, 'white', 2.4]], end: ['SACK'] },
      'edge-blitz-2': { user: 's4', look: 'The same blitz. A Cover 2 shell behind it.', walk: PINCH, free: ['s6'], home: .8, paths: { s6: [[1.5, 1.5], [1.2, -1.4]] }, cover: { s7: 'x', s10: 'z', s5: 'sl', s4: [5, 13], s8: [-12, 20], s9: 'z' }, offs: { s7: [.8, -1.2], s10: [-.6, -1.2], s5: [1, -.8] },
        tags: { s5: ['VERT HOOK MATCHES 2', 'hook'], s6: ['LOOPER', 'rush'] }, end: ['SACK'] },
      'cover-4-quarters': { user: 's9', look: 'Two high, no setup.', cover: { s8: 'sl', s7: 'sl', s4: 'x', s6: 'te', s10: 'z', s9: 'z', s5: 'rb' }, offs: { s7: [-2.4, .4], s4: [.6, -1.3], s9: [-2.8, 1], s6: [-.6, 1.2], s5: [.3, 1.7] },
        tags: { s8: ['TAKES 2 VERTICAL', 'deep'], s6: ['TAKES THE FLAT', 'seam'], s9: ['BRACKETS 1', 'gold'] } } },
    short: {
      'fs-will-blitz-0': { user: 's5', look: 'Pinch the line and bring the linebacker down over the center.', walk: { s5: [.3, 1.9] }, fit: { s8: [-7.2, .2], s0: [-5.6, -.2], s5: [-1.6, 2] }, labs: [['SIX ACROSS THE LINE', 6, 6.4, 'white', 1.6]], end: ['STUFFED', [-4.6, .9]] },
      'run-d-macro': { zone: SOFT, user: 's8', look: 'Quarters, then the macro: soft squats outside.', fit: { s8: [-5.6, 2.4], s7: [-9, 1.3], s4: [-7, 1.5], s5: [-3, 1.7] }, labs: [['CORNERS IN THE RUN FIT', -14, 7.8, 'cyan', 1.7]], end: ['NO GAIN', [-4.6, .9]] },
      'blitz-loop-3': { run: 0, cam: { tx: 0, ty: 6, pitch: 40, yaw: 0, span: 50 }, user: 's6', blitz: ['s5'], zone: { s6: [.1, 9.5, 5, 2.7, 'rec-hook', 'hook'], s3: [15, 3.6, 5, 2.6, 'hard-flat', 'flat'], s8: [-15, 3.6, 5, 2.6, 'hard-flat', 'flat'] }, look: 'Shade down: hard flats. Blitz all linebackers.',
        routes: { sl: [[-10, -2.2], [-10, 2.6], [-16.5, 3.2]], te: [[5, -1.2], [5, 3.6], [9.5, 3.8]], x: [[-16.2, -.8], [-15, 2], [-9, 6]], z: [[16.3, -2.2], [16.3, 4.6], [15.6, 3.8]], rb: [[2.9, -6], [7, -4.6], [12, -.4]] }, free: ['s4', 's5'], home: .7, paths: { s4: [[-9.6, -1.2], [-4.6, -5]], s5: [[.4, .6], [.2, -2.4]] },
        cover: { s8: 'sl', s3: 'te', s6: 'x', s7: [-17, 15], s9: [0, 17], s10: 'z' }, offs: { s8: [.6, 1], s3: [-.5, 1], s6: [1.2, .8], s10: [0, 1.4] }, tags: { s8: ['HARD FLAT', 'teal'], s4: ['COMES FREE', 'rush'] }, end: ['SACK'] } },
    long: {
      'okie-eagle-3': { user: 's0', zone: { s0: [-5.5, 8.5, 4.6, 2.7, 'hook-curl', 'hook'], s10: [16.5, 9, 4.8, 2.7, 'curl-flat', 'curlflat'] }, look: 'Step up, then get out. Curl flat on the corner.', free: ['s6'], home: .84,
        cover: { s7: 'sl', s3: 'sl', s0: [-4, 8], s1: [-2, 9.5], s4: 'te', s5: 'te', s8: 'z', s10: 'z' }, offs: { s3: [1.2, -1.6], s4: [-.9, -1.2], s10: [.4, -1.2], s8: [0, 2] }, cap: { s3: 13, s4: 13 },
        tags: { s3: ['UNDER THE CORNER', 'seam'], s6: ['COMES HOME', 'rush'] }, labs: [['THREE RUSH, EIGHT DROP', -10.5, -4.6, 'rush', 2.2]], end: ['SACK'] },
      'nickel-sim-2': { user: 's3', look: 'Slide the line to the nickel and crash it down.', free: ['s4'], home: .8, paths: { s4: [[-9, -1.2], [-4.6, -5]] }, cover: { s7: 'x', s5: 'sl', s8: 'sl', s3: 'te', s10: 'te', s9: 'z', s6: 'rb' }, offs: { s7: [.6, 1.2], s5: [1, -1.5], s3: [-.9, -1.2], s9: [0, 1.2], s6: [.3, 1.6] }, cap: { s5: 13, s3: 12 },
        tags: { s4: ['UNBLOCKED', 'rush'] }, labs: [['SEVEN DROPPING, PLAYING OFF', 2, 24.4, 'deep', 2.6]], end: ['SACK'] },
      '2-invert-lurk': { user: 's8', look: 'Coverage, then Play the Sticks.', cover: { s4: 'sl', s7: 'sl', s8: [-9, 12], s6: 'te', s9: 'te', s10: 'z', s5: 'rb' }, offs: { s4: [-.5, -.8], s6: [-.9, -1], s10: [0, 1.2], s5: [.3, 1.7] }, cap: { s6: 14 },
        tags: { s4: ['PLAYS THE STICKS', 'teal'] }, labs: [['NOTHING OVER THEIR HEADS', 0, 25.6, 'deep', 2.8]] } },
    redzone: {
      'run-d-macro': { zone: SOFT, user: 's9', look: 'Quarters, then the macro: soft squats outside.', cover: { s7: 'x', s10: 'z', s8: 'sl', s9: 'te', s4: 'sl', s6: 'rb', s5: 'te' }, offs: { s7: [.6, 1.3], s10: [-.6, 1.3], s8: [1, 1.7], s9: [1.3, 1.3], s4: [-.8, -1], s6: [.5, 1.4], s5: [-.9, .8] },
        tags: { s7: ['MATCHES ONE VERTICAL', 'cyan'] }, labs: [['IT STILL PLAYS THE PASS', 5, 19, 'white', 2.6]] },
      'redzone-dt-drop': { user: 's6', zone: { s6: [3, 6, 4.6, 2.7, 'hook-curl', 'hook'] }, look: 'QB contain. Hover and get out: you have whoever is uncovered.', free: ['s4'], home: .8, paths: { s4: [[-8.6, -1.2], [-4.4, -5]] }, cover: { s7: 'x', s8: 'sl', s9: 'te', s10: 'z', s6: 'rb', s1: [-4.5, 5], s2: [3.5, 5] }, offs: { s7: [.8, .8], s10: [-.8, .8], s6: [.5, 1.4] },
        tags: { s4: ['UNBLOCKED', 'rush'], s1: ['UNDER THE QUICK HITTER', 'hook'] }, end: ['SACK'] },
      'ss-sim-2': { user: 's6', look: 'Shift the line to the safety. Hover, then get out.', free: ['s9'], home: .84, cover: { s5: 'te', s1: [-5, 5.5], s6: 'rb', s4: [-15, 5], s7: 'x', s10: 'z', s8: 'z' }, offs: { s5: [1.1, .7], s6: [.5, 1.4], s10: [0, 1.3], s8: [-1.5, 2], s7: [.6, 1.4] },
        tags: { s5: ['THE MID JUMPS IT', 'hook'], s9: ['UNBLOCKED', 'rush'] }, end: ['SACK'] },
      'cover-4-quarters': { user: 's9', look: 'No setup. User a safety.', cover: { s7: 'x', s10: 'z', s8: 'sl', s9: 'te', s4: 'sl', s6: 'rb', s5: 'te' }, offs: { s7: [.6, 1.3], s10: [-.6, 1.3], s8: [1, 1.7], s9: [1.3, 1.3], s4: [-.8, -1], s6: [.5, 1.4], s5: [-.9, .8] },
        tags: { s7: ['LOCKS ONE VERTICAL', 'deep'] }, labs: [['DOUBLE TEAM DEEP', 5, 19, 'deep', 2.6]] } } });
})();
