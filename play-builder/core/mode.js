// PERSONNEL MODE — 7-on-7 vs Full 11.
//   '7on7'  (default) = EXACTLY what's built now: 5 skill + QB vs 7 DBs/LBs, big icons.
//   'full11'          = adds the O-line (circles) + D-line (X's) and shrinks the skill
//                       and defender icons so the whole 22 fits on screen.
// offense.js and defense.js each subscribe via onMode() and handle their own side.
let mode = '7on7';
const subs = [];
export function getMode() { return mode; }
export function isFull() { return mode === 'full11'; }
export function setMode(m) {
  if (m !== '7on7' && m !== 'full11' || m === mode) return mode;
  mode = m;
  for (const f of subs) { try { f(mode); } catch (e) { console.error(e); } }
  return mode;
}
export function onMode(f) { subs.push(f); }
// how much the skill/defender cards shrink in Full 11 (7-on-7 stays at 1.0)
export const FULL_ICON_SCALE = 0.75;
