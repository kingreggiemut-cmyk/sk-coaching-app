// FILM CAMERA MOVEMENTS (Filming Rig) — pick a baked tracking shot from the RUN &
// THROW dropdown. During a RUN the camera flies the shot's path (start → end) as
// the play develops; on the THROW it tracks the ball, and after the CATCH every shot
// slowly pushes in on the ball carrier. You STILL throw manually (1/2/3/4/Q/T).
// 'free' = no shot, you keep full orbit control.
import { camera } from '../core/scene.js';
import { off, getBallPos, getQBPos, getReceiverPos, getActionCentroid,
         getReverseTargetId, getTrackTargetId, isCaught, getTargetPos } from '../offense/offense.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
// framings in WORLD coords. SNAP_X = -6.67, LOS_Z = -25; offense drives +z.
const BEHIND_QB = { pos: V(-6.67, 9, -50), look: V(-6.67, 3, -6) };   // over the QB's shoulder, downfield
const SIDELINE  = { pos: V(34, 7, -27),    look: V(-6.67, 3, -16) };  // from the wide-side sideline
const OVERHEAD  = { pos: V(-6.67, 54, -22), look: V(-6.67, 0, -13) }; // straight down over the ball
const REAR      = { pos: V(-6.67, 13, 17),  look: V(-6.67, 4, -22) }; // downfield behind the safeties, looking back
// ALL-22: a HIGH angled coaches cam craned up BEHIND the QB — zoomed in vs the old
// y68, and FLIPPED so the QB sits at the BOTTOM with the offense driving UP the frame.
// Pulled back to z-53 + aimed closer (look z-16) so the QB has margin and is NOT cut
// off at the bottom edge. Angled (not dead-vertical) so the up-vector never flips.
const ALL22     = { pos: V(0, 50, -53),    look: V(0, 2, -16) };

// track: on the throw, follow the ball with the camera's LOOK. For overhead shots
// that flips/spins (up-vector snaps) — so track:false keeps the fixed orientation
// and just lets the ball fly through the frame. live: a per-frame follow rig
// (receiver POV) instead of a baked start→end path.
export const SHOTS = {
  free:         null,
  receiverCam:  { label: 'Receiver POV (reverse)', live: 'receiver' },
  playerFollow: { label: 'Follow player (high tilt)', live: 'follow' },
  sidelineIn:   { label: 'Sideline → behind QB', start: SIDELINE,  end: BEHIND_QB, track: true },
  overheadIn:   { label: 'Overhead → behind QB', start: OVERHEAD,  end: BEHIND_QB, track: true },
  qbToRear:     { label: 'QB → behind safeties', start: BEHIND_QB, end: REAR,      track: true },
  qbToOverhead: { label: 'QB → all-22 (QB bottom)', start: BEHIND_QB, end: ALL22,  track: false },
};
export const SHOT_ORDER = ['free', 'receiverCam', 'playerFollow', 'sidelineIn', 'overheadIn', 'qbToRear', 'qbToOverhead'];

let active = 'free';
export function setShot(n) { if (n in SHOTS) { active = n; liveInit = false; } }   // reset live so it re-frames on the new shot
export function getShot() { return active; }
// drives the camera only while a shot is picked AND a play is live (else orbit is yours)
export function isDriving() { return active !== 'free' && (off.running || off.thrown); }
// PRE-SNAP PREVIEW: the receiver-POV rig is hard to eyeball by hand, so as soon as it's
// selected (before the snap) the camera parks in that view — so RUN continues smoothly
// instead of flipping around from the orbit framing. (All-22 etc. Reggie sets by hand.)
export function isPreviewing() { const s = SHOTS[active]; return !!(s && s.live) && !off.running && !off.thrown; }

const DEVELOP = 1.1;   // seconds to move into position — moderate pace (0.62 read too fast)
const ease = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const _p = new THREE.Vector3(), _l = new THREE.Vector3(), _track = new THREE.Vector3();
const _desP = new THREE.Vector3(), _desL = new THREE.Vector3(), _dir = new THREE.Vector3();
const _smoothDir = new THREE.Vector3(0, 0, 1);   // smoothed ball→receiver axis (angle eases, distance stays fixed)
let trackInit = false, liveInit = false, caughtInit = false;

export function update(dt) {
  const s = SHOTS[active]; if (!s) return;
  camera.up.set(0, 1, 0);                     // all shots are stable — no rolled framings
  if (s.live === 'receiver') { updateReceiver(dt); return; }
  if (s.live === 'follow') { updateFollow(dt); return; }
  liveInit = false;
  if (!off.thrown) {
    trackInit = false; caughtInit = false;
    const prog = Math.min(1, (off.playT || 0) / DEVELOP);   // reach the framing in DEVELOP seconds, then hold
    const e = ease(prog);
    _p.copy(s.start.pos).lerp(s.end.pos, e);
    _l.copy(s.start.look).lerp(s.end.look, e);
    camera.position.copy(_p);
    camera.lookAt(_l);
  } else if (isCaught()) {
    postCatchPush(dt);                         // EVERY shot: after the catch, zoom down onto the carrier
  } else {
    caughtInit = false;
    camera.position.lerp(s.end.pos, Math.min(1, dt * 5));   // snap to the framing fast
    if (s.track === false) {
      camera.lookAt(s.end.look);                            // overhead: hold orientation, ball flies through frame
    } else {
      if (!trackInit) { _track.copy(s.end.look); trackInit = true; }
      _track.lerp(getBallPos(), Math.min(1, dt * 4));       // follow the ball onto the receiver
      camera.lookAt(_track);
    }
  }
}

// POST-CATCH: slowly zoom in on the ball carrier until we're right up on him — extra
// movement + wiggle room on both ends of the throw (Reggie). Shared by every shot.
const PUSH_MIN = 8.5;
function postCatchPush(dt) {
  const tp = getTargetPos() || getActionCentroid();
  if (!caughtInit) { camera.getWorldDirection(_dir); _track.copy(camera.position).addScaledVector(_dir, 40); caughtInit = true; }
  _dir.copy(camera.position).sub(tp); _dir.y = 0;
  if (_dir.lengthSq() < 1e-3) _dir.set(0, 0, 1);
  _dir.normalize();
  _desP.copy(tp).addScaledVector(_dir, PUSH_MIN); _desP.y = Math.max(4.5, tp.y + 3.2);
  camera.position.lerp(_desP, Math.min(1, dt * 0.7));       // SLOW crawl in
  _desL.set(tp.x, 2.2, tp.z);
  _track.lerp(_desL, Math.min(1, dt * 3));
  camera.lookAt(_track);
}

// RECEIVER POV (reverse) — the camera ALWAYS points at the football/QB (our key), with
// the tracked receiver sitting in the MIDDLE of that shot: it parks on the far side of
// the receiver along the (ball → receiver) line, so the ball/QB is dead-centre and the
// receiver is framed in front of it. Rides the whole route; the throw flies up toward
// the receiver (camera stays locked on the ball), then the catch pushes in on him.
const RECV_DIST = 13, RECV_H = 6;
function updateReceiver(dt) {
  if (isCaught()) { postCatchPush(dt); return; }            // catch → zoom in on the carrier like the free cam
  caughtInit = false;
  const rid = getReverseTargetId();
  const c = (rid && getReceiverPos(rid)) || getActionCentroid();
  const ball = getBallPos();                                // the football = where the camera points, always

  _dir.copy(c).sub(ball); _dir.y = 0;                       // ball → receiver (points downfield)
  if (_dir.lengthSq() < 4) _dir.set(0, 0, 1);              // receiver ~on top of the ball → default downfield
  _dir.normalize();
  _desL.set(ball.x, 2.6, ball.z);                          // aim at the football / QB (lifted so the receiver has headroom)
  if (!liveInit) { _smoothDir.copy(_dir); _track.copy(_desL); liveInit = true; }
  else { _smoothDir.lerp(_dir, Math.min(1, dt * 3.2)); if (_smoothDir.lengthSq() < 1e-4) _smoothDir.copy(_dir); _smoothDir.normalize(); }
  // Camera sits at a FIXED distance behind the receiver — only the ANGLE eases. So when
  // he speeds up the camera pulls back to match (no crowding the lens); when he stops it
  // holds the same gap. (Reggie: "always relatively the same distance.")
  _desP.copy(c).addScaledVector(_smoothDir, RECV_DIST); _desP.y = RECV_H;
  camera.position.copy(_desP);
  _track.lerp(_desL, Math.min(1, dt * 5));                  // keep the ball/QB locked to centre
  camera.lookAt(_track);
}

// FOLLOW PLAYER (high tilt) — a chase cam parked high and a bit behind the tracked
// player, tilted DOWN at him (not straight overhead), riding him wherever he goes
// across the field. Pick who by selecting a player (else the #1 read). After the
// catch it slow-pushes in on the ball carrier like the others.
const FOLLOW_H = 21, FOLLOW_BEHIND = 15;
function updateFollow(dt) {
  if (isCaught()) { postCatchPush(dt); return; }
  caughtInit = false;
  const rid = getTrackTargetId();
  const c = (rid && getReceiverPos(rid)) || getActionCentroid();
  _desP.set(c.x, FOLLOW_H, c.z - FOLLOW_BEHIND);           // above + a bit behind (backfield side) → tilted-down look
  _desL.set(c.x, 1.5, c.z);
  if (!liveInit) { camera.position.copy(_desP); _track.copy(_desL); liveInit = true; }   // snap on the first frame
  else { camera.position.lerp(_desP, Math.min(1, dt * 4)); }
  _track.lerp(_desL, Math.min(1, dt * 5));
  camera.lookAt(_track);
}
