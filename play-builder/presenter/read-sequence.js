// READ-SEQUENCE PLAYER (Filming Rig · PART 1)
// Author the play once (place receivers + routes), then script a LIST OF READS
// that plays back in sequence — data, not code. Each read:
//   { throwTo, defenderAdjust, camera, throwAt? }
// Playing a read: reset to pre-snap → fly the camera to the read's preset →
// run the play (defenders compute route-aware drops) → apply the read's defender
// adjustment → fire the ball to the target when the routes finish. Then HOLD.
// You advance to the next read on your own keypress (presenter-style), so each
// beat lands on your voiceover cue.
import * as O from '../offense/offense.js';
import * as CP from './camera-presets.js';
import { applyAdjust } from '../defense/defense.js';
import { LOS_Z } from '../core/units.js';

// Empty by default. Filming Rig v1 uses MANUAL throw control (RUN, then keys
// 1/2/3/4/Q/T to throw to a read) with the locked camera — NOT this scripted
// auto-playback. Populate this list later if you want scripted camera/throw beats:
//   { throwTo, defenderAdjust, camera, throwAt? }  (throwTo resolves by type/id/index)
export let sequence = [];

let idx = -1;
let pendingThrowId = null, throwAt = 0, elapsed = 0;
let onChange = null, onEnd = null;

export function setSequence(list) { sequence = Array.isArray(list) ? list : sequence; idx = -1; }
export function getIndex() { return idx; }
export function onReadChange(fn) { onChange = fn; }
export function onSequenceEnd(fn) { onEnd = fn; }   // fired when you advance past the last read → Jumbotron outro

// the target's ROUTE END in LOS-relative coords, so a trailing defender keys where
// the ball's going, not where the receiver lined up
function receiverEndLOS(id) { const p = O.getRouteEnd(id); return p ? { x: p.x, z: p.z - LOS_Z } : null; }

export function playRead(i) {
  if (!sequence.length) return;
  idx = Math.max(0, Math.min(sequence.length - 1, i));
  const read = sequence[idx];
  O.resetRun();
  const targetId = O.resolveReceiver(read.throwTo);
  CP.startPreset(read.camera || 'sideline', { targetId });
  O.runPlay();                                  // computes route-aware drops, starts the develop
  if (read.defenderAdjust) applyAdjust(read.defenderAdjust, { targetEnd: targetId ? receiverEndLOS(targetId) : null });
  pendingThrowId = targetId;
  throwAt = read.throwAt != null ? read.throwAt : O.getPlayDur();   // throw when routes finish by default
  elapsed = 0;
  if (onChange) onChange(idx, read);
}
export function start() { playRead(0); }
export function next() {
  if (idx < sequence.length - 1) playRead(idx + 1);
  else if (onEnd) { pendingThrowId = null; onEnd(); }   // past the last read → outro end-card
}
export function prev() { if (idx > 0) playRead(idx - 1); }
export function stop() { idx = -1; pendingThrowId = null; CP.stop(); }
export function isRunning() { return idx >= 0 && CP.isActive(); }

// drive the deferred throw; call from the app loop
export function update(dt) {
  if (idx < 0) return;
  if (pendingThrowId) {
    elapsed += dt;
    if (elapsed >= throwAt) { O.throwTo(pendingThrowId); pendingThrowId = null; }
  }
}
