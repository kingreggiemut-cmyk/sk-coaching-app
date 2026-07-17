// Cinematic mode controller.
//
// NOTE (2026-07-13): an earlier version of this also modified the SCENE — real
// cast shadows + a PBR/lit field + a key/fill/rim light rig. Two problems killed
// that approach: (1) the players are 2D sprites, so they cast NO shadows — real
// shadow maps bought almost nothing here; (2) lighting the field (authored for an
// unlit MeshBasic pipeline) washed it out badly. So cinematic is now POST-ONLY:
// the entire "polished 3D render" look comes from post.js — bloom, depth-of-field,
// screen-space contact occlusion (AO), split-tone grade, film grain, vignette —
// applied over the unmodified scene. Richer + grounded, with no washout.
import * as post from './post.js';

let on = false;
export function setCinematic(state) { on = !!state; post.setEnabled(on); return on; }
export function toggleCinematic() { return setCinematic(!on); }
export function isCinematic() { return on; }
