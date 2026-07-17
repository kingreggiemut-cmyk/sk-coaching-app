// CAMERA PRESET LIBRARY (Filming Rig · PART 2)
// Named camera moves a read can assign, showing the same play from angles the
// flat Madden footage can't. Reuses the bezier-park idea: each preset blends
// from the CURRENT camera to its framing over ~1.2s (smootherstep), then holds
// (static presets) or keeps TRACKING the ball/target (rearview, ballcam).
// All framings are composed 9:16-safe — the subject stays centered, nothing
// important pushed into the cropped sides.
import { camera } from '../core/scene.js';
import * as O from '../offense/offense.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoother = (t) => { t = clamp(t, 0, 1); return t * t * t * (t * (t * 6 - 15) + 10); };

const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _f = new THREE.Vector3();
function currentLook() { camera.getWorldDirection(_f); return camera.position.clone().add(_f.multiplyScalar(40)); }

// Each preset returns a live() function → { pos, look } for THIS frame (post-blend).
// ctx: { targetId }
const PRESETS = {
  // classic broadcast side view of the whole developing play
  sideline(ctx) {
    return () => {
      const c = O.getActionCentroid();
      return { pos: V(c.x - 52, 15, c.z - 4), look: V(c.x, 2.6, c.z + 8) };
    };
  },
  // top-down coach's view — great for showing coverage
  all22(ctx) {
    return () => {
      const c = O.getActionCentroid();
      return { pos: V(c.x, 104, c.z - 8), look: V(c.x, 0, c.z + 6) };
    };
  },
  // behind the QB, tracking the ball into the air ("you're the QB")
  rearview(ctx) {
    return () => {
      const qb = O.getQBPos(), ball = O.getBallPos();
      const tgt = ctx.targetId && O.getReceiverPos(ctx.targetId);
      const aim = O.isThrown() ? ball : (tgt || O.getActionCentroid());
      return { pos: V(qb.x, 7, qb.z - 13), look: V(aim.x, Math.max(2.4, aim.y), aim.z) };
    };
  },
  // rides with the ball into the catch
  ballcam(ctx) {
    return () => {
      const ball = O.getBallPos(), dir = O.getThrowDir();
      return {
        pos: V(ball.x - dir.x * 8, ball.y + 3.4, ball.z - dir.z * 8),
        look: V(ball.x + dir.x * 7, ball.y - 0.2, ball.z + dir.z * 7),
      };
    };
  },
  // FINAL end-card: park CLOSE on the Jumbotron so it nearly fills the frame (board
  // center ≈ y35.8, z97, 74.67 wide) — the CTA view, skyline/stands still around it.
  jumbotron(ctx) {
    return () => ({ pos: V(0, 35.8, 31), look: V(0, 35.8, 97) });   // board-dominant; CTA sign overlaps its bottom edge
  },
  // starts sideline, swoops around behind the QB as the ball's in the air
  sidelineSwoop(ctx) {
    const c0 = O.getActionCentroid();
    const start = V(c0.x - 52, 15, c0.z - 4);
    return () => {
      const qb = O.getQBPos(), c = O.getActionCentroid();
      const behind = V(qb.x, 9, qb.z - 17);
      const f = O.isThrown() ? 1 : 0.15;                 // committed swoop once the ball's out
      return { pos: start.clone().lerp(behind, f * 0.92), look: V(c.x, 3, c.z + 8) };
    };
  },
};

let active = null;   // { t, dur, from, look0, live }

export function startPreset(name, ctx = {}) {
  const make = PRESETS[name] || PRESETS.sideline;
  active = { t: 0, dur: 1.2, from: camera.position.clone(), look0: currentLook(), live: make(ctx) };
  return true;
}
export function update(dt) {
  if (!active) return false;
  active.t = Math.min(1, active.t + dt / active.dur);
  const e = smoother(active.t);
  const live = active.live();
  _p.copy(active.from).lerp(live.pos, e);
  _l.copy(active.look0).lerp(live.look, e);
  camera.position.copy(_p);
  camera.lookAt(_l);
  return true;
}
export function stop() { active = null; }
export function isActive() { return !!active; }
// true once the current preset's blend has fully arrived (camera has stopped moving),
// or when no preset is running — the CTA sign waits for this before slamming in.
export function isSettled() { return active ? active.t >= 1 : true; }
export const PRESET_NAMES = Object.keys(PRESETS);
