// DEFENSE — 7-man zone coverages (Cover 2 / 3 / 4) with ROLE-BASED, route-aware
// depth. Pre-snap the defenders sit at a two-high alignment and translucent
// dashed ZONE bubbles show what the coverage will do. On the snap the bubbles
// vanish and everyone settles into a spot that was COMPUTED from the offense's
// routes: a deep defender rides as deep as the deepest receiver in his band
// (floored so he never sits shallow), a flat defender floats 5–12 yds off the
// shallow routes near him. No route/drop lines are ever drawn (Reggie's call).
import { scene } from '../core/scene.js';
import { makeGroundShadow } from '../core/shadow.js';
import { LOS_Z, SNAP_X } from '../core/units.js';   // defender depths are LOS-relative → +LOS_Z at placement
import { buildChip, billboardChip, buildToken, tickToken } from '../field/chips.js';
import { onMode, isFull, FULL_ICON_SCALE } from '../core/mode.js';

const CRIMSON = 0xc4162e;
const CRIMSON_CSS = '#c4162e';
const WHITE_CSS = '#f4f1e6';

// two-high pre-snap alignment (yards, +z downfield)
const DEF = [
  { id: 'LCB', label: 'CB', a: { x: -22, z: 5 } },
  { id: 'RCB', label: 'CB', a: { x: 22, z: 5 } },
  { id: 'FS',  label: 'FS', a: { x: -9, z: 12 } },
  { id: 'SS',  label: 'SS', a: { x: 9, z: 12 } },
  { id: 'ML',  label: 'LB', a: { x: 0, z: 5 } },
  { id: 'WL',  label: 'LB', a: { x: -7, z: 5.5 } },
  { id: 'SL',  label: 'LB', a: { x: 7, z: 5.5 } },
];
// Live pre-snap alignment, keyed by id. DEFAULT_ALIGN is the untouched copy so
// "Reset to default defense" has something true to go back to — ALIGN itself gets
// mutated when you drag a defender.
const ALIGN = Object.fromEntries(DEF.map((d) => [d.id, { ...d.a }]));
const DEFAULT_ALIGN = Object.fromEntries(DEF.map((d) => [d.id, { ...d.a }]));

// Drag a defender to line him up wherever you want. `z` comes in WORLD units and
// is stored LOS-relative like every other depth here.
export function setDefenderAlign(id, x, zWorld) {
  const a = ALIGN[id]; if (!a) return false;
  a.x = clamp(x, -24, 24);
  a.z = clamp(zWorld - LOS_Z, -1, 30);   // never in the backfield, never past the deep third
  const m = meshes.get(id);
  if (m) m.position.set(a.x, 0, a.z + LOS_Z);
  return true;
}
export function getDefenderAlign(id) { const a = ALIGN[id]; return a ? { x: a.x, z: a.z } : null; }
export function isAlignMoved(id) {
  const a = ALIGN[id], d = DEFAULT_ALIGN[id];
  return !!(a && d) && (Math.abs(a.x - d.x) > 0.25 || Math.abs(a.z - d.z) > 0.25);
}
export function getAlignOverrides() {
  const out = {};
  for (const id of Object.keys(ALIGN)) if (isAlignMoved(id)) out[id] = { x: +ALIGN[id].x.toFixed(2), z: +ALIGN[id].z.toFixed(2) };
  return out;
}
export function applyAlignOverrides(map) {
  for (const id of Object.keys(DEFAULT_ALIGN)) ALIGN[id] = { ...DEFAULT_ALIGN[id] };
  for (const [id, a] of Object.entries(map || {})) if (ALIGN[id]) ALIGN[id] = { x: a.x, z: a.z };
  snapToAlign();
}
function snapToAlign() {
  for (const [id, a] of Object.entries(ALIGN)) { const m = meshes.get(id); if (m) m.position.set(a.x, 0, a.z + LOS_Z); }
}

/* Everything the user has hand-tweaked about the defence, in plain words — this is
   what the Defense panel lists and what "Reset to default defense" wipes. Man
   coverage gets confusing fast (assign a guy wrong and the whole shell looks
   broken); this is the way back. */
export function getModifications() {
  const out = [];
  for (const [defId, recId] of Object.entries(manCover)) out.push({ kind: 'man', defId, label: `${defName(defId)} covers ${recId}`, recId });
  for (const [defId, recId] of Object.entries(reactTo)) out.push({ kind: 'react', defId, label: `${defName(defId)} reacts to ${recId}`, recId });
  for (const defId of Object.keys(reactSpot)) out.push({ kind: 'spot', defId, label: `${defName(defId)} drops to a spot` });
  for (const id of Object.keys(ALIGN)) if (isAlignMoved(id)) out.push({ kind: 'align', defId: id, label: `${defName(id)} moved` });
  for (const recId of Object.keys(sepByRec)) out.push({ kind: 'sep', recId, label: `${recId} separation ${sepByRec[recId]} yd` });
  return out;
}

/* Put the defence back exactly how it ships: default alignment, no hand
   assignments, no spot drops, baseline separation. Man coverage re-assigns itself
   from scratch so the shell is coherent again. */
export function resetToDefault() {
  for (const k of Object.keys(reactTo)) delete reactTo[k];
  for (const k of Object.keys(reactSpot)) delete reactSpot[k];
  for (const k of Object.keys(manCover)) delete manCover[k];
  for (const k of Object.keys(sepByRec)) delete sepByRec[k];
  reactTrigger.clear();
  manSep = 2;
  for (const id of Object.keys(DEFAULT_ALIGN)) ALIGN[id] = { ...DEFAULT_ALIGN[id] };
  snapToAlign();
  setArmedDefender(null);
  if (manMode) autoAssignMan();
  renderDefenseAt(0);
  if (manMode && on) renderManLines();
}

// Each coverage assigns every defender a ROLE, a lateral BAND (the x-range of
// the field he's responsible for), and an x ANCHOR. Post-snap depth is computed
// per-role from the routes in that band (see prepareDefense / ROLE).
const COVER = {
  'COVER 3': [
    { id: 'LCB', role: 'deep', x: -17, band: [-27, -8] },
    { id: 'RCB', role: 'deep', x: 17,  band: [8, 27] },
    // single-high free safety: ranges numbers-to-numbers over the top, sits deep
    // (floor 18) and rides any seam/vertical up the middle to its depth
    { id: 'FS',  role: 'deep', x: 0,   band: [-17, 17], floor: 18 },
    { id: 'SS',  role: 'flat', x: 15,  band: [7, 27] },
    { id: 'ML',  role: 'hook', x: -5,  band: [-12, 1] },
    { id: 'WL',  role: 'flat', x: -15, band: [-27, -7] },
    { id: 'SL',  role: 'hook', x: 5,   band: [-1, 12] },
  ],
  'COVER 2': [
    { id: 'LCB', role: 'flat', x: -19, band: [-27, -9] },
    { id: 'RCB', role: 'flat', x: 19,  band: [9, 27] },
    { id: 'FS',  role: 'deep', x: -12, band: [-27, 0] },
    { id: 'SS',  role: 'deep', x: 12,  band: [0, 27] },
    { id: 'ML',  role: 'hole', x: 0,   band: [-8, 8] },
    { id: 'WL',  role: 'hook', x: -8,  band: [-17, -2] },
    { id: 'SL',  role: 'hook', x: 8,   band: [2, 17] },
  ],
  'COVER 4': [
    { id: 'LCB', role: 'deep', x: -18, band: [-27, -11], xMin: 12 },  // quarter: stay outside the numbers
    { id: 'RCB', role: 'deep', x: 18,  band: [11, 27],  xMin: 12 },
    { id: 'FS',  role: 'deep', x: -7,  band: [-12, 0] },
    { id: 'SS',  role: 'deep', x: 7,   band: [0, 12] },
    { id: 'ML',  role: 'hook', x: 0,   band: [-7, 7] },
    { id: 'WL',  role: 'flat', x: -15, band: [-27, -8] },
    { id: 'SL',  role: 'flat', x: 15,  band: [8, 27] },
  ],
};

// role depth rules (yards): scan window to consider, and the [floor, cap] the
// defender's depth is clamped to. deep = ride the deepest vertical; flat/hook/
// hole = float off the shallow-to-intermediate routes.
const ROLE = {
  deep: { scan: [6, 50], floor: 15, cap: 40 },   // ride verticals over the top (go/seam reach ~32+)
  flat: { scan: [0, 14], floor: 5,  cap: 12 },
  hook: { scan: [3, 17], floor: 9,  cap: 14 },
  hole: { scan: [6, 22], floor: 13, cap: 18 },
};
// deep zone defenders sit this many yards OVER the deepest route in their zone so
// receivers can't run behind them (Reggie: "letting guys get way behind them")
const DEEP_CUSHION = 4;

// zone-bubble display per role (depth center + vertical radius; width follows band)
const ZONE = {
  deep: { dz: 20, rz: 7,   deep: true },
  flat: { dz: 8,  rz: 4,   deep: false },
  hook: { dz: 11, rz: 4.2, deep: false },
  hole: { dz: 15, rz: 6,   deep: false },
};

// PLAYERS = defenders on the field with NO coverage responsibility shown (no
// pre-snap zone bubbles), but they still RUN Cover 3 under the hood.
export const COVERAGE_OPTIONS = ['OFF', 'COVER 2', 'COVER 3', 'COVER 4', 'MAN', 'MAN 1', 'MAN 2', 'PLAYERS'];
let coverage = 'COVER 3';   // the scheme actually run
let mode = 'COVER 3';       // the selected UI mode (PLAYERS/MAN* map to a base scheme but change the art/behavior)
let zonesAllowed = true;    // false in PLAYERS/MAN mode → no pre-snap coverage bubbles
let manMode = false;        // MAN coverage: defenders trail an assigned man instead of zones
let manShell = 0;           // 0 = cover-0 man (no deep help); 1 = FS post + SS hook (buzz); 2 = two deep safeties
const manCover = {};        // defenderId -> receiverId (who he's covering man-to-man)
let manSep = 2;             // BASELINE yards of separation the receiver gets (slider). Per-player overrides win.
const sepByRec = {};        // receiverId -> separation override (yards) for a single route
let receivers = [];         // last-known receiver world spots (for the pre-snap man lines) — offense pushes these
const targets = new Map();   // id -> {x,z} computed post-snap spot

const group = new THREE.Group();
const zoneGroup = new THREE.Group();
const manLineGroup = new THREE.Group();   // pre-snap dotted lines: defender → his man
const meshes = new Map();
const dlMeshes = [];              // D-line tokens (X's) — Full 11 only
// 4-3 front: LE, LDT, RDT, RE relative to the ball (SNAP_X), in the OL gaps (guards at ±3)
const DL_DX = [-7.5, -1.5, 1.5, 7.5];
let on = true;

const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// the deepest route point in a defender's band (depth + the x it happened at, so
// the defender can lean toward the man he's keying)
function keyThreat(threats, band, scan) {
  let bz = 0, bx = 0, found = false;
  for (const t of threats) for (const pt of t.points) {
    if (pt.x >= band[0] && pt.x <= band[1] && pt.z >= scan[0] && pt.z <= scan[1] && pt.z > bz) { bz = pt.z; bx = pt.x; found = true; }
  }
  return found ? { z: bz, x: bx } : null;
}
// the SHALLOWEST route point in a band (what an AGGRESSIVE defender jumps — he
// drives down on the underneath route and leaves the deeper stuff)
function shallowThreat(threats, band, scan) {
  let bz = 1e9, bx = 0, found = false;
  for (const t of threats) for (const pt of t.points) {
    if (pt.x >= band[0] && pt.x <= band[1] && pt.z >= scan[0] && pt.z <= scan[1] && pt.z < bz) { bz = pt.z; bx = pt.x; found = true; }
  }
  return found ? { z: bz, x: bx } : null;
}

// REACT-TO: assign a defender to break on a specific OFFENSIVE PLAYER — but only
// ONCE that player enters the defender's zone during the play (not pre-snap). He
// plays his normal zone drop until his man arrives in his area, then jumps down
// and rides beside him. Persistent per assignment. No on-field indicator (listed
// in the Defense panel). reactTrigger latches once he's committed.
const reactTo = {};                 // defenderId -> offensive playerId
const reactSpot = {};               // defenderId -> {x, z}  (z LOS-relative) — glide-to-a-spot assignment
const reactTrigger = new Set();     // defenders committed to their man THIS play
const DEF_NAME = { LCB: 'CB-L', RCB: 'CB-R', FS: 'FS', SS: 'SS', ML: 'LB-M', WL: 'LB-W', SL: 'LB-S' };
export function defName(id) { return DEF_NAME[id] || id; }
export function setReact(defId, recId) { reactTo[defId] = recId; delete reactSpot[defId]; }   // react-to-man clears any spot
// send a defender to a FIXED spot: he glides there over the play at the same pace as
// everyone else and settles (no jump). x,z are WORLD yards; z is stored LOS-relative.
export function setReactSpot(defId, x, zWorld) { reactSpot[defId] = { x, z: zWorld - LOS_Z }; delete reactTo[defId]; reactTrigger.delete(defId); }
export function clearReact(defId) { delete reactTo[defId]; delete reactSpot[defId]; reactTrigger.delete(defId); }
export function getReactList() {
  const out = Object.keys(reactTo).map((id) => ({ defId: id, defLabel: DEF_NAME[id] || id, recId: reactTo[id] }));
  for (const id of Object.keys(reactSpot)) out.push({ defId: id, defLabel: DEF_NAME[id] || id, spot: reactSpot[id] });
  return out;
}
// highlight the defender currently armed for an assignment (gold glow), or none
export function setArmedDefender(id) { for (const [k, m] of meshes) if (m.userData && m.userData.sel) m.userData.sel.visible = (k === id); }
// the defender badges (billboarded card planes) for pointer-picking
export function getDefenderBadges() { return [...meshes.values()].map((m) => m.userData.chipPlane).filter(Boolean); }

/* ============================== MAN coverage ==============================
   Each defender is assigned a receiver to cover; on the snap he trails his man at
   `manSep` yards of separation (the slider — bigger = the receiver gets more open,
   for showcasing routes that beat man). Pre-snap: dotted lines defender→man. */
// assign defId to cover recId. If another defender already had recId, SWAP — he takes
// over defId's old man (or goes free) — so it stays 1-to-1 with no doubling.
export function setMan(defId, recId) {
  const prevRec = manCover[defId];
  const otherDef = Object.keys(manCover).find((id) => id !== defId && manCover[id] === recId);
  manCover[defId] = recId;
  if (otherDef) { if (prevRec) manCover[otherDef] = prevRec; else delete manCover[otherDef]; }
}
export function clearMan(defId) { delete manCover[defId]; }
export function getManList() { return Object.keys(manCover).map((id) => ({ defId: id, defLabel: DEF_NAME[id] || id, recId: manCover[id] })); }
export function setManSep(v) { manSep = Math.max(0, Math.min(12, +v || 0)); return manSep; }
export function getManSep() { return manSep; }
// per-RECEIVER separation override (one specific route gets more/less cushion)
export function setRecSep(recId, v) { if (v == null) delete sepByRec[recId]; else sepByRec[recId] = Math.max(0, Math.min(12, +v || 0)); return getRecSep(recId); }
export function getRecSep(recId) { return sepByRec[recId] != null ? sepByRec[recId] : manSep; }
export function hasRecSep(recId) { return sepByRec[recId] != null; }
export function isManMode() { return manMode; }
// which defenders are true man (not the zone safeties in a cover-1/2 shell)
function isManDefender(id) { return !(manShell > 0 && (id === 'FS' || id === 'SS')); }
// zone spot for a safety in a cover-1/2 man shell (LOS-relative)
function safetyShellSpot(id) {
  if (manShell === 2) return { x: id === 'FS' ? -12 : 12, z: 18 };   // two deep halves
  return id === 'FS' ? { x: 0, z: 18 } : { x: 2, z: 11 };            // cover 1: FS post (deep mid), SS hook/buzz
}
// offense pushes the current receiver world spots so we can draw the man lines
export function setReceivers(list) { receivers = list || []; if (manMode && on) renderManLines(); }
// auto-assign man: EXACTLY one defender per eligible receiver (no doubling), extra
// defenders left un-assigned (they blitz). Keeps any valid manual assignment.
function autoAssignMan() {
  if (!receivers.length) return;
  const recIds = new Set(receivers.map((r) => r.id));
  const used = new Set();
  // pass 1: keep valid, non-doubled existing assignments; drop stale/doubled/zone ones
  for (const d of (COVER[coverage] || [])) {
    if (!isManDefender(d.id)) { delete manCover[d.id]; continue; }        // zone safeties get no man
    const cur = manCover[d.id];
    if (cur && recIds.has(cur) && !used.has(cur)) used.add(cur);          // keep it
    else delete manCover[d.id];                                          // clear stale / double
  }
  // pass 2: cover every remaining receiver with its nearest still-free man defender
  const free = () => (COVER[coverage] || []).filter((d) => isManDefender(d.id) && !manCover[d.id] && meshes.get(d.id));
  for (const r of receivers) {
    if (used.has(r.id)) continue;
    const cands = free(); let best = null, bd = 1e9;
    for (const d of cands) { const m = meshes.get(d.id); const dd = Math.hypot(r.x - m.position.x, r.z - m.position.z); if (dd < bd) { bd = dd; best = d.id; } }
    if (best) { manCover[best] = r.id; used.add(r.id); }
  }
}
// pre-snap: dotted lines from each MAN defender to his man, PLUS zone bubbles for the
// deep-help safeties in a cover-1/2 man shell (so you can see where they'll be).
export function renderManLines() {
  manLineGroup.clear(); zoneGroup.clear();
  if (!manMode || !on) { manLineGroup.visible = false; zoneGroup.visible = false; return; }
  for (const d of (COVER[coverage] || [])) {
    if (!isManDefender(d.id)) continue;                      // zone safeties draw a bubble, not a line
    const m = meshes.get(d.id); const rid = manCover[d.id];
    const r = rid && receivers.find((x) => x.id === rid);
    if (!m || !r) continue;
    // draw from the defender's ALIGNMENT spot (stable pre-snap), NOT his live mesh pos —
    // otherwise after a play the lines start from where the DBs finished (downfield) and
    // look wacky. The man assignment itself (manCover) persists across runs.
    const al = ALIGN[d.id] || { x: m.position.x, z: m.position.z - LOS_Z };
    const a = new THREE.Vector3(al.x, 0.12, al.z + LOS_Z), b = new THREE.Vector3(r.x, 0.12, r.z);
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineDashedMaterial({ color: 0xff5a5a, transparent: true, opacity: 0.9, dashSize: 0.8, gapSize: 0.5, depthWrite: false }));
    line.computeLineDistances(); line.renderOrder = 3;
    manLineGroup.add(line);
  }
  manLineGroup.visible = true;
  // safety zones for the cover-1/2 shell
  if (manShell > 0) {
    for (const id of ['FS', 'SS']) {
      if (isManDefender(id)) continue;                        // only the zone safeties
      const s = safetyShellSpot(id), deep = s.z >= 16;
      zoneGroup.add(makeZoneMesh(s.x, s.z + LOS_Z, deep ? 9 : 6, deep ? 7 : 4.2, deep));
    }
    zoneGroup.visible = true;
  } else { zoneGroup.visible = false; }
}

/* ground X marker (crimson), drawn OVER routes/field */
function makeX() {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: CRIMSON, transparent: true, opacity: 0.92, depthTest: false, depthWrite: false });
  for (const rot of [Math.PI / 4, -Math.PI / 4]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.05, 0.26), mat);
    bar.rotation.y = rot; bar.renderOrder = 4;
    g.add(bar);
  }
  g.position.y = 0.05;
  return g;
}

/* billboarded badge: white patch, crimson ring + crimson letter */
function badgeTexture(letter) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.save(); g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.closePath();
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = WHITE_CSS; g.fill(); g.restore();
  g.lineWidth = 10; g.strokeStyle = CRIMSON_CSS; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3; g.strokeStyle = 'rgba(120,10,20,.55)'; g.beginPath(); g.arc(64, 64, 45, 0, Math.PI * 2); g.stroke();
  g.fillStyle = CRIMSON_CSS;
  g.font = `900 ${letter.length > 1 ? 46 : 58}px "Barlow Condensed","Arial Narrow",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 64, 70);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
// red torn-paper collage card (CB / FS / SS / LB) — standing, billboarded, drop shadow
function makeChip(d) {
  return buildChip(d.label, 3.6);
}
// billboard the defenders' cards toward the camera (called each frame from app loop)
export function tickDefense(now, cam) {
  for (const m of meshes.values()) billboardChip(m, cam);
  for (const m of dlMeshes) if (m.visible) tickToken(m, cam);   // flat ground tokens, route-style parallax lean
}
// D-LINE (Full 11) — 4 flat X tokens on the LOS, centered on the ball. Static for now
// (rush/blitz comes later); hidden in 7-on-7 and whenever the defense is OFF.
function buildDLine() {
  for (const dx of DL_DX) {
    const m = buildToken('X', 1.9);
    m.position.set(SNAP_X + dx, 0, LOS_Z + 1.0);   // across the neutral zone, defense side (own row)
    m.visible = false;
    dlMeshes.push(m); group.add(m);
  }
}
function applyDefenseMode(m) {
  const full = m === 'full11';
  const s = full ? FULL_ICON_SCALE : 1;
  for (const mm of meshes.values()) mm.scale.setScalar(s);
  for (const mm of dlMeshes) mm.visible = full && on;
}
// keep the D-line in sync with on/off (coverage OFF hides the whole front too)
function refreshDLine() { for (const mm of dlMeshes) mm.visible = isFull() && on; }
// the D-line tokens, so the blocking engine can drive them when the OL engages
export function getDLMeshes() { return dlMeshes; }
// a defender's current WORLD position — so an offensive blocker can ride his man
export function getDefenderPos(id) { const m = meshes.get(id); return m ? { x: m.position.x, z: m.position.z } : null; }
// all coverage defenders (id + world pos) — for auto-picking a blocker's nearest man
export function getDefenderList() { const out = []; for (const [id, m] of meshes) out.push({ id, x: m.position.x, z: m.position.z }); return out; }

/* one translucent dashed zone bubble (blue deep / steel underneath) */
function makeZoneMesh(zx, zz, rx, rz, deep) {
  const g = new THREE.Group();
  const col = deep ? 0x3f8bff : 0x9fb0d0;
  const edge = deep ? 0x7fb4ff : 0xcdd8ec;
  const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 48),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: deep ? 0.34 : 0.26, depthWrite: false, side: THREE.DoubleSide }));
  fill.rotation.x = -Math.PI / 2; fill.scale.set(rx, rz, 1); fill.renderOrder = 1;
  // a solid bright ring for definition + a dashed ring on top (dotted look)
  const pts = [];
  for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rx, 0, Math.sin(a) * rz)); }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const ring = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: edge, transparent: true, opacity: 0.55, depthWrite: false }));
  ring.renderOrder = 2;
  const dash = new THREE.Line(geo.clone(), new THREE.LineDashedMaterial({ color: edge, transparent: true, opacity: 1, dashSize: 1.1, gapSize: 0.7, depthWrite: false }));
  dash.computeLineDistances(); dash.renderOrder = 3; dash.position.y = 0.01;
  g.add(fill, ring, dash);
  g.position.set(zx, 0.04, zz);
  return g;
}

export function initDefense() {
  scene.add(group);
  scene.add(zoneGroup);
  scene.add(manLineGroup);
  for (const d of DEF) {
    const m = makeChip(d); m.position.set(d.a.x, 0, d.a.z + LOS_Z);
    if (m.userData.chipPlane) m.userData.chipPlane.userData.did = d.id;   // for pointer-picking
    meshes.set(d.id, m); group.add(m);
  }
  buildDLine();
  onMode(applyDefenseMode);      // show the D-line + shrink defender icons in Full 11
  group.visible = on;
  prepareDefense([]);   // seed floor-depth spots so a render before the snap is sane
  window.__defDebug = () => { const o = {}; for (const d of (COVER[coverage] || [])) { const m = meshes.get(d.id); o[d.id] = { role: d.role, z: m ? +m.position.z.toFixed(1) : null, tgt: targets.get(d.id) }; } o.zonesVisible = zoneGroup.visible; o.zoneCount = zoneGroup.children.length; return o; };
}

// Compute each defender's post-snap spot from the current routes + his role.
// threats = [{ points:[{x,z}...] }]  (one per offensive skill player)
export function prepareDefense(threats) {
  reactTrigger.clear();   // fresh play → nobody has committed to his man yet
  for (const d of (COVER[coverage] || [])) {
    const r = ROLE[d.role];
    const floor = d.floor != null ? d.floor : r.floor;   // per-defender override
    const cap = d.cap != null ? d.cap : r.cap;
    const key = keyThreat(threats || [], d.band, r.scan);
    const z = key == null ? floor : clamp(key.z + (d.role === 'deep' ? DEEP_CUSHION : 0), floor, cap);
    // slight lateral lean toward the man he's keying — subtle, not a full jump
    let x = d.x;
    if (key != null) {
      const pull = d.role === 'deep' ? 0.35 : 0.5;
      const maxShift = d.role === 'deep' ? 6 : 5;
      x = d.x + clamp((key.x - d.x) * pull, -maxShift, maxShift);
    }
    if (d.xMin != null) x = Math.sign(x || 1) * Math.max(Math.abs(x), d.xMin);
    targets.set(d.id, { x, z });
  }
}

// frac 0..1: interpolate from the two-high alignment into the computed spots.
// DEEP defenders BAIL fast off the snap (ease-OUT) so a vertical receiver can't
// run past them at the start — they gain their cushion early and hold, instead of
// the slow-start smoothstep that let receivers get behind them. Underneath zone
// defenders keep the gentler smoothstep.
const bail = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : 1 - Math.pow(1 - t, 1.7));
// recPos: { offensivePlayerId: {x, z} } LOS-relative, at THIS frac (from offense) —
// lets a react-assigned defender break on his man once the man enters his area.
// runCtx: { x, z } LOS-relative ball-carrier pos on a RUN → underneath defenders
// (LBs/flat) flow downhill to the ball; deep defenders stay honest over the top.
export function renderDefenseAt(frac, recPos = null, runCtx = null) {
  if (!on) return;
  const eUnder = smooth(frac), eDeep = bail(frac);
  for (const d of (COVER[coverage] || [])) {
    const m = meshes.get(d.id); if (!m) continue;
    const a = ALIGN[d.id];
    // SPOT ASSIGNMENT: glide from the alignment to the picked spot over the play (same
    // easing as the zone drops) and settle there — no jump, moves at play pace.
    const spot = reactSpot[d.id];
    if (spot) {
      const e = smooth(frac);
      m.position.set(a.x + (spot.x - a.x) * e, 0, (a.z + (spot.z - a.z) * e) + LOS_Z);
      continue;
    }
    // REACTION: if assigned a man, once that man is IN this defender's area, break
    // down and ride beside him (latched for the rest of the play). Eased at a GENTLE
    // rate so he slides over rather than snapping (Reggie: "sometimes they jump there").
    const rid = reactTo[d.id];
    if (rid && recPos && recPos[rid]) {
      const R = recPos[rid];
      const z0 = ZONE[d.role] ? ZONE[d.role].dz - ZONE[d.role].rz : 8;   // depth his zone starts
      const inArea = R.x >= d.band[0] - 3 && R.x <= d.band[1] + 3 && R.z >= z0;
      if (reactTrigger.has(d.id) || inArea) {
        reactTrigger.add(d.id);
        const side = R.x >= 0 ? -1 : 1;                                  // sit BESIDE on the inside ("high") side, never on top
        const tx = R.x + side * 2.4, tz = Math.max(1.5, R.z + 0.4);      // beside + a hair over the top
        const k = 0.08;                                                  // GENTLE break — slides beside him, no teleport
        m.position.set(m.position.x + (tx - m.position.x) * k, 0, m.position.z + ((tz + LOS_Z) - m.position.z) * k);
        continue;
      }
    }
    // MAN COVERAGE: trail the assigned man; safeties play zone in a cover-1/2 shell
    if (manMode) {
      if (!isManDefender(d.id)) {                                                // FS/SS deep-help zone
        const spot = safetyShellSpot(d.id);
        const e = smooth(frac);
        m.position.set(a.x + (spot.x - a.x) * e, 0, (a.z + (spot.z - a.z) * e) + LOS_Z);
        continue;
      }
      const rid = manCover[d.id];
      const R = rid && recPos && recPos[rid];
      if (R) {
        const sep = getRecSep(rid);                                             // per-route override, else baseline
        // TRAIL `sep` yards behind the receiver ALONG his route direction — so EVERY
        // route separates (deep, crosser, out, drag), not just verticals. Depth is still
        // gated at the alignment cushion so on a vertical he holds and lets the man come
        // to him instead of jumping to his hip at the snap (Reggie).
        const vx = R.x - R.x0, vz = R.z - R.z0, len = Math.hypot(vx, vz) || 1;   // travel vector (start→now)
        const ux = vx / len, uz = vz / len;
        const back = Math.min(len, sep);
        const lev = R.x >= 0 ? -0.6 : 0.6;
        const tx = R.x - ux * back + lev;                                        // trail behind along the route (works for crossers/outs)
        let tz = R.z - uz * back;
        // HOLD the depth cushion only for a VERTICAL route (weight by uz): on a go he
        // stays over the top and lets the man come to him; on a crosser/drag he comes
        // DOWN to the receiver's depth so the trail is just `sep`, not sep + cushion.
        tz += Math.max(0, a.z - tz) * Math.max(0, uz);
        const ex = smooth(clamp(frac / 0.3, 0, 1));                              // ease off the alignment on the snap
        m.position.set(a.x + (tx - a.x) * ex, 0, (a.z + (tz - a.z) * ex) + LOS_Z);
        continue;
      }
      // no man (extra defender in cover-0) → blitz the QB instead of falling into a zone
      const eB = smooth(clamp(frac / 0.5, 0, 1));
      m.position.set(a.x + (SNAP_X - a.x) * eB, 0, (a.z + (-4 - a.z) * eB) + LOS_Z);
      continue;
    }
    const t = targets.get(d.id) || { x: d.x, z: ROLE[d.role].floor };
    let tx = t.x, tz = t.z;
    // RUN FLOW: LBs/underneath defenders trigger downhill toward the ball carrier
    if (runCtx && d.role !== 'deep') {
      tx = t.x + (runCtx.x - t.x) * 0.7;                 // slide to his lane
      tz = Math.max(1.5, Math.min(t.z, runCtx.z + 1));   // come up to the ball
    }
    const e = d.role === 'deep' ? eDeep : eUnder;
    m.position.set(a.x + (tx - a.x) * e, 0, (a.z + (tz - a.z) * e) + LOS_Z);
  }
}
export function resetDefense() { renderDefenseAt(0); }

/* pre-snap zone bubbles — visible when a coverage is picked and the play isn't
   running; hidden on the snap so nothing but the defenders is on the field */
export function showZones() {
  if (manMode) { renderManLines(); return; }   // MAN: dotted man lines (+ safety zones in a shell)
  zoneGroup.clear();
  if (!on || !zonesAllowed || !COVER[coverage]) { zoneGroup.visible = false; return; }
  for (const d of COVER[coverage]) {
    const s = ZONE[d.role];
    const cx = (d.band[0] + d.band[1]) / 2;
    const rx = clamp((d.band[1] - d.band[0]) / 2 * 0.9, 4.5, 13);
    zoneGroup.add(makeZoneMesh(cx, s.dz + LOS_Z, rx, s.rz, s.deep));
  }
  zoneGroup.visible = true;
}
export function hideZones() { zoneGroup.visible = false; manLineGroup.visible = false; }   // snap → hide bubbles + man lines

// hide/show the defenders without changing the coverage (used by the cinema intro).
// Respects the on/off state — a hidden coverage stays hidden when re-shown.
export function setDefenseVisible(v) { group.visible = v && on; if (!v) zoneGroup.visible = false; }

// pick a coverage directly ('OFF' hides the defense; 'PLAYERS' = defenders on, run
// Cover 3, no zones). Returns the new state.
export function setCoverage(name) {
  if (name === 'OFF') { on = false; mode = 'OFF'; manMode = false; group.visible = false; zoneGroup.visible = false; manLineGroup.visible = false; refreshDLine(); return getCoverage(); }
  on = true; group.visible = true; mode = name;
  manMode = (name === 'MAN' || name === 'MAN 1' || name === 'MAN 2');
  manShell = name === 'MAN 1' ? 1 : name === 'MAN 2' ? 2 : 0;
  if (name === 'PLAYERS') { coverage = 'COVER 3'; zonesAllowed = false; }
  else if (manMode) { coverage = 'COVER 3'; zonesAllowed = false; autoAssignMan(); }
  else { coverage = name; zonesAllowed = true; }
  prepareDefense([]); renderDefenseAt(0);
  showZones();      // refresh the pre-snap art: MAN → dotted lines, zones → bubbles, else hidden
  refreshDLine();   // D-line follows the on state in Full 11
  return getCoverage();
}
export function getCoverage() { return on ? mode : 'OFF'; }
export function isDefenseOn() { return on; }

/* ============================== filming-rig: named adjustments ==============================
   A read can name a coverage tweak. These run AFTER prepareDefense (so the
   route-aware drops exist) and MUTATE the `targets` map in place; renderDefenseAt
   then animates alignment → the adjusted spots across the play. All z are
   LOS-relative yards, matching `targets`. ctx.targetEnd = the thrown receiver's
   route end {x, z} (LOS-relative). */
const nearestDefTo = (x, z) => {
  let best = null, bd = 1e9;
  for (const d of (COVER[coverage] || [])) {
    const t = targets.get(d.id); if (!t) continue;
    const dd = Math.hypot(t.x - x, t.z - z);
    if (dd < bd) { bd = dd; best = d.id; }
  }
  return best;
};
const ADJUST = {
  // put the nearest defender in man trail just underneath the target receiver
  manTrail: (ctx) => {
    if (!ctx.targetEnd) return;
    const id = nearestDefTo(ctx.targetEnd.x, ctx.targetEnd.z);
    if (id) targets.set(id, { x: ctx.targetEnd.x, z: Math.max(2, ctx.targetEnd.z - 1.5) });
  },
  // drop the backside corner (opposite the target) down into the flat
  pullBacksideCorner: (ctx) => {
    const side = ctx.targetEnd ? Math.sign(ctx.targetEnd.x || 1) : 1;
    const backCB = side > 0 ? 'LCB' : 'RCB';
    const t = targets.get(backCB); if (t) targets.set(backCB, { x: t.x, z: 8 });
  },
  // both corners bail to deep
  bail: () => { for (const id of ['LCB', 'RCB']) { const t = targets.get(id); if (t) targets.set(id, { x: t.x, z: Math.max(t.z, 22) }); } },
  // hook/curl defenders buzz down into the flats
  buzzFlat: () => { for (const d of (COVER[coverage] || [])) if (d.role === 'hook') { const t = targets.get(d.id); if (t) targets.set(d.id, { x: t.x, z: 6 }); } },
  // hook defenders sit at hook depth (don't chase)
  sitHook: () => { for (const d of (COVER[coverage] || [])) if (d.role === 'hook') { const t = targets.get(d.id); if (t) targets.set(d.id, { x: t.x, z: 11 }); } },
};
export const ADJUST_NAMES = Object.keys(ADJUST);
export function applyAdjust(name, ctx) { const fn = ADJUST[name]; if (fn) { fn(ctx || {}); return true; } return false; }
