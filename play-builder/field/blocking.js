// BLOCKING ENGINE (Filming Rig · Full 11) — the O-line/D-line interaction.
// Deterministic + scrub-safe: every token position is a pure function of the play's
// frac (0..1), so a scrub or a re-record lands identically (NO live physics/AI).
//   PASS  → the OL step up, meet the DL in the neutral zone and hold a POCKET.
//   RUN   → the OL DRIVE their man away from the ball-carrier's hole, opening a lane.
// Pairing = simple man rules: each DL is picked up by the nearest OL (a real block
// scheme layer — pullers/doubles — comes later; this is the auto layer).
import { LOS_Z } from '../core/units.js';

let OL = [], DL = [];
let homeOL = [], homeDL = [];     // alignment (home) spots, captured once — bases never drift
let pairs = [];                   // [{ ol, dl, oh:{x,z}, dh:{x,z} }]
let plan = null;                  // { type:'pass'|'run', holeX }

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

// called once after the lines are built (tokens sit at their alignment)
export function setLines(ol, dl) {
  OL = ol; DL = dl;
  homeOL = ol.map((m) => ({ x: m.position.x, z: m.position.z }));
  homeDL = dl.map((m) => ({ x: m.position.x, z: m.position.z }));
}

// at the snap: pair each DL to the nearest (unused) OL by home-x. holeX = where the
// ball-carrier crosses the LOS on a run (drive the DL away from it).
export function prepareBlocking(opts = {}) {
  plan = { type: opts.type || 'pass', holeX: opts.holeX == null ? null : opts.holeX };
  pairs = [];
  const used = new Set();
  for (let di = 0; di < DL.length; di++) {
    let best = -1, bd = 1e9;
    for (let oi = 0; oi < OL.length; oi++) {
      if (used.has(oi)) continue;
      const d = Math.abs(homeOL[oi].x - homeDL[di].x);
      if (d < bd) { bd = d; best = oi; }
    }
    if (best >= 0) { used.add(best); pairs.push({ ol: OL[best], dl: DL[di], oh: homeOL[best], dh: homeDL[di] }); }
  }
  renderBlockingAt(0);
}

const set = (m, x, z) => { if (m) { m.position.x = x; m.position.z = z; } };

export function renderBlockingAt(frac) {
  if (!plan) return;
  const e = smooth(clamp(frac / 0.45, 0, 1));   // fully engaged by ~45% of the play, then hold the block
  for (const p of pairs) {
    const engX = p.dh.x * 0.6 + p.oh.x * 0.4;   // meet in the DL's lane
    if (plan.type === 'run') {
      // DRIVE the DL off the ball-carrier's hole → open a lane
      const away = plan.holeX == null ? (p.dh.x >= 0 ? 1 : -1) : (p.dh.x >= plan.holeX ? 1 : -1);
      set(p.ol, p.oh.x + (engX - p.oh.x) * e, p.oh.z + (LOS_Z + 0.1 - p.oh.z) * e);
      set(p.dl, p.dh.x + away * 2.2 * e, p.dh.z + 1.1 * e);   // washed to the side + a hair downfield
    } else {
      // PASS PRO: OL set back a hair (pocket), DL driven to the LOS and held
      set(p.ol, p.oh.x + (engX - p.oh.x) * e, p.oh.z - 0.4 * e);
      set(p.dl, p.dh.x + (engX - p.dh.x) * e * 0.5, p.dh.z + (LOS_Z + 0.2 - p.dh.z) * e);
    }
  }
}

// restore every lineman to his alignment (between plays)
export function resetBlocking() {
  for (let i = 0; i < OL.length; i++) set(OL[i], homeOL[i].x, homeOL[i].z);
  for (let i = 0; i < DL.length; i++) set(DL[i], homeDL[i].x, homeDL[i].z);
  plan = null; pairs = [];
}
