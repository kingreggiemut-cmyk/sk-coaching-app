// UNDO — Ctrl+Z / ⌘Z, plus the toolbar button.
//
// The play is already fully describable as JSON (core/play-spec.js), so undo is
// just a stack of specs: every edit pushes the new state, undo re-applies the one
// before it. No command objects, no per-action inverse logic to keep in sync —
// if a thing is in the spec, it's undoable for free.
//
// Coalescing: a drag fires many edits. Pushes within COALESCE_MS of each other
// replace the top of the stack instead of stacking, so one drag = one undo.
import * as playSpec from './play-spec.js';

const LIMIT = 40;          // deep enough to feel bottomless, shallow enough to stay cheap
const COALESCE_MS = 450;

let stack = [];            // JSON strings, oldest → newest. stack[cursor] is current.
let cursor = -1;
let lastPush = 0;
let muted = false;         // true while WE apply a spec, so undo doesn't record its own undo
const subs = [];

export function onUndo(f) { subs.push(f); }
function emit() { for (const f of subs) { try { f(canUndo(), canRedo()); } catch (e) { console.error(e); } } }

export function canUndo() { return cursor > 0; }
export function canRedo() { return cursor >= 0 && cursor < stack.length - 1; }

// Call after any edit. Cheap: 5 players of JSON.
export function push() {
  if (muted) return;
  let json;
  try { json = JSON.stringify(playSpec.capture()); } catch { return; }
  if (cursor >= 0 && stack[cursor] === json) return;        // nothing actually changed

  const now = performance.now();
  const coalesce = cursor >= 0 && (now - lastPush) < COALESCE_MS;
  lastPush = now;

  if (coalesce && cursor === stack.length - 1) { stack[cursor] = json; emit(); return; }

  stack = stack.slice(0, cursor + 1);                        // a new edit drops the redo tail
  stack.push(json);
  if (stack.length > LIMIT) stack.shift();
  cursor = stack.length - 1;
  emit();
}

// Seed the stack with the current state (no undo target before the first edit).
// Clearing lastPush AFTER the seed matters: push() stamps it, and if we left it
// set, the user's first edit would land inside the coalesce window and overwrite
// the baseline instead of stacking on it — destroying the one state they'd most
// want back. The baseline never coalesces.
export function reset() { stack = []; cursor = -1; lastPush = 0; push(); lastPush = 0; }

function applyAt(i) {
  const json = stack[i]; if (!json) return false;
  muted = true;
  let ok = false;
  try { ok = playSpec.apply(JSON.parse(json)); } catch (e) { console.error('[undo] apply failed', e); }
  muted = false;
  if (ok) { cursor = i; lastPush = 0; emit(); }
  return ok;
}

export function undo() { return canUndo() ? applyAt(cursor - 1) : false; }
export function redo() { return canRedo() ? applyAt(cursor + 1) : false; }

// True while an undo/redo is being applied — callers use it to skip re-pushing.
export function isApplying() { return muted; }
export function depth() { return { cursor, len: stack.length }; }
