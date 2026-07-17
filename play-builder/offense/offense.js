// OFFENSE — place skill players + a fixed QB + football, assign/draw routes, run
// the play, then click a receiver to throw. QB is static (no rollout). Player
// picking is by raycasting the billboarded badges, so clicking the thing you see
// always works — including throwing after the play has run.
import { scene, camera, renderer, onResize } from '../core/scene.js';
import { FIELD, clampX, LOS_Z, SNAP_X } from '../core/units.js';
import { onMode, isFull, FULL_ICON_SCALE } from '../core/mode.js';
import { ROUTES, getRoute, routeSVG } from './route-lib.js';
import { makeGroundShadow } from '../core/shadow.js';
import { orbit } from '../core/orbit.js';
import { initDefense, renderDefenseAt, resetDefense, setCoverage, getCoverage, COVERAGE_OPTIONS, prepareDefense, showZones, hideZones, setDefenseVisible, isDefenseOn, getDefenderBadges, setReact, setReactSpot, clearReact, getReactList, setArmedDefender, getDLMeshes, getDefenderPos, getDefenderList, setMan, clearMan, getManList, isManMode, setReceivers, setManSep, getManSep, setRecSep, getRecSep, hasRecSep,
         defName, setDefenderAlign, getDefenderAlign, getAlignOverrides, applyAlignOverrides, getModifications, resetToDefault } from '../defense/defense.js';
import * as blocking from '../field/blocking.js';
import { buildRoute } from '../field/routes.js';
import { buildChip, billboardChip, buildToken, tickToken } from '../field/chips.js';
import * as cloud from '../core/cloud.js';
import * as undo from '../core/undo.js';
import * as dock from '../core/dock.js';
import * as xport from '../core/export.js';
// play-spec imports `off` back from this module. That cycle is safe: play-spec
// only touches it inside functions (called from click handlers), never at module
// evaluation time — so neither module reads the other before it's initialized.
import * as playSpec from '../core/play-spec.js';

const COLORS = { WR: 0x1f6ef2, TE: 0x63b5ff, RB: 0xf5a623, QB: 0x17284d };
// Madden-style route telestration: the #1 read (crown) is RED, every other route
// is YELLOW — reads as one cohesive coaching diagram.
const ROUTE_READ = 0xe23b2e, ROUTE_OTHER = 0xf5c518;
// SNAP_X (the left hash) now lives in core/units.js so the D-line lines up on it too.
const CSS = { WR: '#1f6ef2', TE: '#63b5ff', RB: '#f5a623', QB: '#17284d' };
const CREAM_CSS = '#f0ead0', GOLD = 0xf5a623;
const TYPES = ['WR', 'TE', 'RB'];
const X_LIMIT = FIELD.HALF_WIDTH - 0.8;
const Z_MIN = LOS_Z - 12.5, Z_MAX = 57;   // backfield limit is relative to the LOS; Z_MAX is the absolute far-end-zone edge
const QB_POS = { x: 0, z: -5 };            // fixed, 5 yards behind the ball

export const off = {
  players: [], selId: null, drawing: false, running: false, paused: false, canThrow: false, thrown: false,
  caught: false, playT: 0, playDur: 0, presenter: false, idc: 1,
  playType: 'pass',  // 'pass' | 'run' — RUN codes the whole play for run blocking (RPO-capable)
  carrierId: null,   // runtime ball carrier on a RUN (set at snap)
};

const group = new THREE.Group();
scene.add(group);

let qbMesh, ballMesh;
const chipMeshes = new Map();     // pid -> chip group (skill players only)
const olMeshes = [];              // O-line tokens (circles) — Full 11 only
// O-line splits relative to the ball (SNAP_X): LT LG C RG RT, ~1.5yd of grass between each
const OL_DX = [-6, -3, 0, 3, 6];
const routeMeshes = new Map();
let ui = {};
let refreshManPanel = () => {};   // set in buildUI; rebuilds the MAN per-player separation dials
let refreshDefPanel = () => {};   // set in buildUI; lists what you've changed about the defense

// presenter (cinematic) camera state — auto-tracks the play, but you can still
// look around (arrows) and dolly in/out (wheel) on top of the auto framing
const presPos = new THREE.Vector3();
const presLook = new THREE.Vector3();
const throwDir = new THREE.Vector3(0, 0, 1);
const UP_Y = new THREE.Vector3(0, 1, 0);
const presKeys = new Set();
let presInit = false, presYaw = 0, presPitch = 0, presZoom = 1;
const clampN = (v, a, b) => Math.max(a, Math.min(b, v));

// cinematic INTRO swoop — one button hides everything, starts high, and flies a
// smooth curve down over the field, settling framed on the giant jumbotron.
let cinema = false, cinemaT = 0;
const CINEMA_DUR = 4.0;                              // seconds of fly-in
const CINE_START = new THREE.Vector3(0, 140, -205);  // OUTSIDE the stadium, pulled way back, angled down at it
const CINE_CTRL  = new THREE.Vector3(0, -42, 8);     // pulls the arc down into a low swoop over the field
const CINE_END   = new THREE.Vector3(0, 37, 16);     // settles in front of the board, whole screen in frame (KEEP)
const CINE_LOOK0 = new THREE.Vector3(0, 5, 4);       // start looking down at the whole stadium
const CINE_LOOK1 = new THREE.Vector3(0, 41, 97);     // board center (KEEP)
const _cv = new THREE.Vector3(), _cl = new THREE.Vector3();

/* ============================== formations ============================== */
const BUILTIN_FORMS = {
  '2x2 Spread': [{ type: 'WR', x: -22, z: -0.6 }, { type: 'WR', x: -12, z: -1.8 }, { type: 'WR', x: 12, z: -1.8 }, { type: 'WR', x: 22, z: -0.6 }, { type: 'RB', x: -2.8, z: -4.8 }],
  '3x1 Spread': [{ type: 'WR', x: -22, z: -0.6 }, { type: 'WR', x: 21, z: -0.6 }, { type: 'WR', x: 15, z: -1.8 }, { type: 'WR', x: 9.5, z: -1.8 }, { type: 'RB', x: 2.8, z: -4.8 }],
  'Doubles': [{ type: 'WR', x: -21, z: -0.6 }, { type: 'WR', x: -12, z: -1.8 }, { type: 'TE', x: 8, z: -0.8 }, { type: 'WR', x: 21, z: -0.6 }, { type: 'RB', x: -2.8, z: -4.8 }],
  'Split Backs': [{ type: 'WR', x: -21, z: -0.6 }, { type: 'TE', x: 8, z: -0.8 }, { type: 'WR', x: 21, z: -0.6 }, { type: 'RB', x: -3.5, z: -6.5 }, { type: 'RB', x: 3.5, z: -6.5 }],
  'I-Form': [{ type: 'WR', x: -21, z: -0.6 }, { type: 'TE', x: 8, z: -0.8 }, { type: 'WR', x: 21, z: -0.6 }, { type: 'RB', x: 0, z: -7.5 }, { type: 'RB', x: 0, z: -10.5 }],
  'Empty': [{ type: 'WR', x: -22, z: -0.6 }, { type: 'WR', x: -13, z: -1.8 }, { type: 'TE', x: 9, z: -1.6 }, { type: 'WR', x: 15, z: -1.8 }, { type: 'WR', x: 22, z: -0.6 }],
};
let formNames = [], formIdx = 0;
// The member's cloud formations, mirrored here so the ‹ › clicker stays synchronous.
// { name: { id, spec } }. Built-ins live in code and have no id.
let cloudForms = {};
// Which formation the current play came from. PROVENANCE, not a live link — the
// play owns its positions (see core/play-spec.js).
let currentForm = { name: '', id: null };

export function getCurrentFormation() { return { name: currentForm.name, id: currentForm.id }; }
export function setCurrentFormation(f) {
  currentForm = { name: (f && f.name) || '', id: (f && f.id) || null };
  if (ui && ui.formName) ui.formName.textContent = (currentForm.name || 'CUSTOM').toUpperCase();
}

const localForms = () => { try { return JSON.parse(localStorage.getItem('pd_forms') || '{}'); } catch { return {}; } };
function allForms() {
  const out = Object.assign({}, BUILTIN_FORMS);
  for (const [n, v] of Object.entries(localForms())) out[n] = v;              // not yet migrated
  for (const [n, v] of Object.entries(cloudForms)) out[n] = v.spec;           // cloud wins
  return out;
}
const formIdFor = (name) => (cloudForms[name] ? cloudForms[name].id : null);

// Pull the member's formations down once we know who they are, then MIGRATE any
// left in localStorage from before formations were cloud-backed — otherwise the
// ones Reggie already made would silently vanish the day we switched over.
export async function syncFormations() {
  const res = await cloud.listFormations();
  if (!res.ok) return;
  cloudForms = {};
  for (const r of res.rows) cloudForms[r.name] = { id: r.id, spec: r.spec };

  const local = localForms(), names = Object.keys(local);
  if (names.length) {
    let moved = 0;
    for (const n of names) {
      if (cloudForms[n]) continue;                                            // already up there
      const r = await cloud.saveFormationCloud(n, local[n]);
      if (r.ok) { cloudForms[n] = { id: r.id, spec: local[n] }; moved++; }
    }
    if (moved) { try { localStorage.removeItem('pd_forms'); } catch {} cloud.toast(`Moved ${moved} formation${moved > 1 ? 's' : ''} to your account`); }
  }
  formNames = Object.keys(allForms());
  if (currentForm.name) currentForm.id = formIdFor(currentForm.name);
  refreshFormationUI();
}

function loadFormation(name) {
  const f = allForms()[name]; if (!f) return;
  resetRun();
  off.players = []; off.selId = null; off.drawing = false; off.idc = 1;
  for (const g of f) addPlayer(g.type, clampX(g.x + SNAP_X), g.z + LOS_Z);   // z is LOS-relative, x shifted onto the left hash
  formNames = Object.keys(allForms());
  formIdx = Math.max(0, formNames.indexOf(name));
  setCurrentFormation({ name, id: formIdFor(name) });
  loadedSnapshot = null;   // picking a formation starts a NEW play, not an edit of a saved one
  cloud.clearCurrent(); currentPlayName = ''; currentPlayFormation = '';
  if (ui && ui.savedAs) ui.savedAs.textContent = '';
  refresh(); save();
}
function stepFormation(dir) {
  formNames = Object.keys(allForms()); if (!formNames.length) return;
  formIdx = (formIdx + dir + formNames.length) % formNames.length;
  loadFormation(formNames[formIdx]);
}

// (The standalone "Save this formation" button + its prompt() are gone. Formations
// are now created inside the Save-play dialog — name a new formation there and it's
// created from the current alignment; see doSaveFromDialog / currentFormationSpec.)

function refreshFormationUI() {
  if (ui && ui.formName) ui.formName.textContent = (currentForm.name || 'CUSTOM').toUpperCase();
}

/* ============================== players ============================== */
function addPlayer(type = 'WR', x = 0, z = -0.6) {
  if (off.players.length >= 5) { flash('Five eligibles max.'); return null; }
  const p = { id: 'p' + (off.idc++), type, x, z, wp: [], rounded: true, routeId: null, stem: 0, read: 0, isTarget: false };
  off.players.push(p); return p;
}
function delPlayer(id) {
  off.players = off.players.filter((p) => p.id !== id);
  if (off.selId === id) { off.selId = null; off.drawing = false; }
  refresh(); save();
}
const sel = () => off.players.find((p) => p.id === off.selId) || null;

/* ============================== badge (billboarded) ============================== */
function badgeTexture(letter, ringCss) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.save(); g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.closePath();
  g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 10; g.shadowOffsetY = 3;
  g.fillStyle = CREAM_CSS; g.fill(); g.restore();
  g.lineWidth = 10; g.strokeStyle = ringCss; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.stroke();
  g.lineWidth = 3.5; g.strokeStyle = 'rgba(245,166,35,.95)'; g.beginPath(); g.arc(64, 64, 45, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#17284d';
  g.font = `900 ${letter.length > 1 ? 46 : 60}px "Barlow Condensed","Arial Narrow",sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 64, 70);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
function makeCrownSprite() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 96;
  const g = c.getContext('2d');
  g.fillStyle = '#F5A623'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 6; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(18, 78); g.lineTo(12, 30); g.lineTo(40, 52); g.lineTo(64, 16);
  g.lineTo(88, 52); g.lineTo(116, 30); g.lineTo(110, 78); g.closePath(); g.stroke(); g.fill();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, depthTest: false }));
  s.scale.set(1.7, 1.28, 1); return s;
}
/* ---- READ LABELS: an optional billboarded tag above a player's head — 1ST READ
   (+ a little crown), 2ND / 3RD / 4TH READ, CHECK DOWN. Toggle with readLabelsOn.
   Assign any rank to any player from the panel. p.read: 0 none, 1..4 reads, 5 check-down. */
let readLabelsOn = true;
// compact on-field tags (small, pinned to a card corner). 1st gets a little crown.
const READ_TEXT = { 1: '1ST', 2: '2ND', 3: '3RD', 4: '4TH', 5: 'CHK' };
const readTagCache = {};
function smallCrown(g, x, cy) {   // little gold crown, left-anchored at x
  g.save(); g.translate(x, cy - 4); g.scale(0.5, 0.5);
  g.fillStyle = '#F5A623'; g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 9; g.lineJoin = 'round';
  g.beginPath(); g.moveTo(6, 60); g.lineTo(0, 6); g.lineTo(30, 34); g.lineTo(58, -8);
  g.lineTo(86, 34); g.lineTo(116, 6); g.lineTo(110, 60); g.closePath(); g.stroke(); g.fill(); g.restore();
}
function readTag(rank) {
  if (readTagCache[rank]) return readTagCache[rank];
  const text = READ_TEXT[rank] || '', crown = rank === 1;
  const meas = document.createElement('canvas').getContext('2d');
  const FONT = '900 74px "Barlow Condensed","Arial Narrow",sans-serif';
  meas.font = FONT; const tw = meas.measureText(text).width;
  const padL = crown ? 78 : 26, padR = 26, inner = tw + padL + padR;
  const w = Math.ceil(inner + 20), h = 120, r = 14;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.fillStyle = 'rgba(0,0,0,.30)'; g.beginPath(); g.roundRect(14, 22, w - 22, h - 34, r); g.fill();   // shadow
  g.fillStyle = '#f6f3ea'; g.beginPath(); g.roundRect(8, 14, w - 22, h - 34, r); g.fill();             // cream tag
  g.lineWidth = 6; g.strokeStyle = '#17284d'; g.beginPath(); g.roundRect(8, 14, w - 22, h - 34, r); g.stroke();
  const cy = 14 + (h - 34) / 2;
  if (crown) smallCrown(g, 24, cy);
  g.fillStyle = '#17284d'; g.font = FONT; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.fillText(text, padL - 4, cy + 4);
  const rec = { tex: new THREE.CanvasTexture(c), aspect: w / h }; rec.tex.anisotropy = 8;
  readTagCache[rank] = rec; return rec;
}
// The tag is a small plane pinned to the card's TOP-RIGHT corner (child of the card
// so it tracks the billboard/pitch). depthTest off → always readable.
function makeReadLabel(cardW, cardH) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: null, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
  m.visible = false; m.renderOrder = 9; m.userData = { cardW, cardH };
  return m;
}
function updateReadLabel(mesh, rank) {
  const r = readLabelsOn ? (rank || 0) : 0;
  if (r <= 0) { mesh.visible = false; return; }
  mesh.visible = true;
  const rec = readTag(r), H = 0.82, W = H * rec.aspect;
  mesh.material.map = rec.tex; mesh.material.needsUpdate = true;
  mesh.scale.set(W, H, 1);
  const gp = mesh.parent && mesh.parent.geometry && mesh.parent.geometry.parameters;   // current card dims (post texture-load)
  const cw = (gp && gp.width) || mesh.userData.cardW, ch = (gp && gp.height) || mesh.userData.cardH;
  // sit ON the visible card's top-right corner (the art is inset from the plane's
  // torn-paper margin, so pull in from the geometric corner), tilted so the outer
  // edge dips down — like a tag stuck onto the corner
  mesh.rotation.z = -0.16;
  mesh.position.set(cw * 0.33, ch * 0.30, 0.08);
}

// Reggie's real torn-paper collage card (field/chips.js): one standing card,
// billboarded + leaned toward the camera, with a drop shadow. A gold glow behind
// it shows selection/target. An optional READ tag sits above the head.
function makeChip(p) {
  const g = buildChip(p.type, 3.9);
  const pl = g.userData.chipPlane;
  pl.userData.pid = p.id;
  const cw = (pl.geometry.parameters && pl.geometry.parameters.width) || 3, ch = (pl.geometry.parameters && pl.geometry.parameters.height) || 3.9;
  const label = makeReadLabel(cw, ch);
  pl.add(label);   // child of the card → tracks its billboard + pitch, pinned to the corner
  g.userData.badge = pl; g.userData.readLabel = label;
  g.scale.setScalar(isFull() ? FULL_ICON_SCALE : 1);   // shrink in Full 11 so the whole 22 fits
  return g;
}

/* ============================== football (laced, downfield) ==============================
   Built as a GROUP: pebbled-leather body + real white lace geometry on top + two end
   stripes + a Scheme Kings wordmark on the sides. Long axis on z, so the nose points
   at the end zones. (No third-party ball branding — SK marks only.) */
function makeFootball() {
  const g = new THREE.Group();
  const RY = 0.42, LEN = 1.95, RZ = RY * LEN;                 // cross radius / long half-length
  const topY = (z) => RY * Math.sqrt(Math.max(0, 1 - (z / RZ) * (z / RZ)));

  // pebbled leather
  const pc = document.createElement('canvas'); pc.width = 128; pc.height = 128; const pg = pc.getContext('2d');
  pg.fillStyle = '#7c4019'; pg.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 2400; i++) { pg.fillStyle = Math.random() < 0.5 ? 'rgba(48,22,8,.32)' : 'rgba(158,98,50,.24)'; const r = Math.random() * 1.5 + 0.4; pg.beginPath(); pg.arc(Math.random() * 128, Math.random() * 128, r, 0, 6.28); pg.fill(); }
  const ptex = new THREE.CanvasTexture(pc); ptex.wrapS = ptex.wrapT = THREE.RepeatWrapping; ptex.repeat.set(3, 2); ptex.anisotropy = 8;
  const body = new THREE.Mesh(new THREE.SphereGeometry(RY, 40, 28), new THREE.MeshLambertMaterial({ map: ptex, color: 0x8a4a1e }));
  body.scale.set(1, 1, LEN);
  g.add(body);

  const white = new THREE.MeshLambertMaterial({ color: 0xf4f1e6 });
  // laces: a raised spine + rungs, hugging the top surface along z
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.66), white);
  spine.position.set(0, topY(0) + 0.02, 0); g.add(spine);
  for (let z = -0.3; z <= 0.301; z += 0.1) {
    const rung = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.045), white);
    rung.position.set(0, topY(z) + 0.02, z); g.add(rung);
  }
  // two white end stripes (rings around the girth near each nose)
  for (const z of [-0.62, 0.62]) {
    const s = new THREE.Mesh(new THREE.TorusGeometry(topY(z) + 0.008, 0.03, 10, 30), white);
    s.position.z = z; g.add(s);   // TorusGeometry rings the z-axis by default
  }
  // Scheme Kings wordmark on both sides
  const dc = document.createElement('canvas'); dc.width = 256; dc.height = 64; const dg = dc.getContext('2d');
  dg.clearRect(0, 0, 256, 64);
  dg.fillStyle = '#f4f1e6'; dg.font = '900 26px "Barlow Condensed", "Arial Narrow", sans-serif';
  dg.textAlign = 'center'; dg.textBaseline = 'middle'; dg.fillText('SCHEME KINGS', 128, 34);
  const dtex = new THREE.CanvasTexture(dc);
  for (const sgn of [1, -1]) {
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.155), new THREE.MeshBasicMaterial({ map: dtex, transparent: true, depthWrite: false }));
    dec.position.set(sgn * (RY - 0.015), 0.02, 0); dec.rotation.y = sgn > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(dec);
  }
  g.position.set(SNAP_X, 0.42, -0.15 + LOS_Z);   // on the LOS, left hash, at the snap
  return g;
}

/* ============================== route geometry ============================== */
const clampFieldX = (x) => Math.max(-X_LIMIT, Math.min(X_LIMIT, x));
const clampFieldZ = (z) => Math.max(Z_MIN, Math.min(Z_MAX, z));
function densePoints(p) {
  const stem = p.stem || 0;
  const pts = [{ x: p.x, z: p.z }, ...p.wp.map((w) => ({ x: clampFieldX(p.x + w.dx), z: clampFieldZ(p.z + w.dz + (w.dz > 1 ? stem : 0)) }))];
  if (pts.length < 2) return [];
  if (!p.rounded || pts.length < 3) return resample(pts);
  const R = 2.2, out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    const v1 = { x: b.x - a.x, z: b.z - a.z }, v2 = { x: c.x - b.x, z: c.z - b.z };
    const l1 = Math.hypot(v1.x, v1.z) || 1, l2 = Math.hypot(v2.x, v2.z) || 1;
    const r = Math.min(R, l1 / 2, l2 / 2);
    const p1 = { x: b.x - v1.x / l1 * r, z: b.z - v1.z / l1 * r }, p2 = { x: b.x + v2.x / l2 * r, z: b.z + v2.z / l2 * r };
    out.push(p1);
    for (let s = 1; s <= 7; s++) { const t = s / 8, u = 1 - t; out.push({ x: u * u * p1.x + 2 * u * t * b.x + t * t * p2.x, z: u * u * p1.z + 2 * u * t * b.z + t * t * p2.z }); }
    out.push(p2);
  }
  out.push(pts[pts.length - 1]);
  return resample(out);
}
function resample(pts, step = 0.55) {
  const out = [pts[0]];
  for (let i = 1; i < pts.length; i++) { const a = out[out.length - 1], b = pts[i], d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.round(d / step)); for (let k = 1; k <= n; k++) out.push({ x: a.x + (b.x - a.x) * k / n, z: a.z + (b.z - a.z) * k / n }); }
  return out;
}
// A rounded cross-section so the route reads as a physical bead sitting ON the
// grass, not paint soaked into it. Lateral offset (o, −1..1 of half-width) +
// height fraction (h, 0..1 of crown). Lit by the scene so the crown catches a
// sheen as the camera orbits.
const RIBBON_PROFILE = [
  { o: -1.00, h: 0.00 },
  { o: -0.66, h: 0.62 },
  { o:  0.00, h: 1.00 },
  { o:  0.66, h: 0.62 },
  { o:  1.00, h: 0.00 },
];
const RIBBON_W = 0.52;   // half-width (yards) — bold telestration stroke for filming
const RIBBON_H = 0.30;   // crown height (yards)
const P_CT = RIBBON_PROFILE.length;
const RIBBON_STRIDE = (P_CT - 1) * 6;   // triangle indices per dense segment

// Build the neon telestration route (field/routes.js) + the arc-length table the
// chip animation walks. Returns { route, dense, cum }.
function buildRouteMesh(p, index) {
  const dense = densePoints(p);
  if (dense.length < 2) return null;
  const cum = [0];
  for (let i = 1; i < dense.length; i++) cum[i] = cum[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z);
  // red read keeps a cream/white outline; yellow routes get a BLACK outline (more contrast, pops better)
  const first = p.read === 1;   // the #1 read gets the red marker + cream outline
  const route = buildRoute(dense, first ? ROUTE_READ : ROUTE_OTHER, index, first ? 0xf2efe4 : 0x141414);
  return { route, dense, cum };
}

/* ============================== refresh ============================== */
export function refresh() {
  const want = new Set(off.players.map((p) => p.id));
  for (const [id, m] of chipMeshes) if (!want.has(id)) { group.remove(m); chipMeshes.delete(id); }
  for (const p of off.players) {
    let m = chipMeshes.get(p.id);
    if (!m || m.userData.type !== p.type) { if (m) group.remove(m); m = makeChip(p); chipMeshes.set(p.id, m); group.add(m); }
    m.userData.badge.userData.pid = p.id;
    m.position.set(p.x, 0, p.z);
    if (m.userData.sel) m.userData.sel.visible = (p.id === off.selId || p.isTarget);
    if (m.userData.readLabel) updateReadLabel(m.userData.readLabel, p.read || 0);
  }
  for (const [id, r] of routeMeshes) { group.remove(r.route.group); r.route.dispose(); routeMeshes.delete(id); }
  off.players.forEach((p, i) => { const r = buildRouteMesh(p, i); if (r) { routeMeshes.set(p.id, r); group.add(r.route.group); } });
  setReceivers(off.players.map((p) => ({ id: p.id, x: p.x, z: p.z })));   // for man-coverage dotted lines
  updatePanel();
  updateTransport();   // status line + throw targets follow the play, not the last event
  syncDefense();       // recompute the coverage's route-aware drops so the STILL reads right
}

// Pre-snap, the defenders sit at their NORMAL alignment depths (CBs pressed,
// safeties deep, LBs off the ball). The route-aware drops are computed at the
// snap (runPlay → prepareDefense) and animated in across the whole play by
// renderPlayAt, so the defense reacts as the play develops.
function syncDefense() {
  if (!isDefenseOn()) return;
  if (!off.running) renderDefenseAt(0);   // normal alignment depths in the still
}

/* ============================== input ============================== */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit3 = new THREE.Vector3();
function setRay(e) {
  // NDC relative to the CANVAS box (not the window) so picking works when the
  // canvas is reshaped — e.g. the centered TikTok / bottom-third preview columns
  const r = renderer.domElement.getBoundingClientRect();
  ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
  ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  ray.setFromCamera(ndc, camera);
}
function groundAt(e) { setRay(e); return ray.ray.intersectPlane(groundPlane, hit3) ? { x: hit3.x, z: hit3.z } : null; }
// pick the player whose BADGE the pointer is over (works at any angle / after they've moved)
function pickPlayer(e) {
  setRay(e);
  const sprites = off.players.map((p) => chipMeshes.get(p.id)?.userData.badge).filter(Boolean);
  const hits = ray.intersectObjects(sprites, false);
  if (hits.length) { const pid = hits[0].object.userData.pid; return off.players.find((p) => p.id === pid); }
  return null;
}
// pick a DEFENDER's badge → returns its id (for the aggression toggle)
function pickDefender(e) {
  setRay(e);
  const badges = getDefenderBadges();
  const hits = badges.length ? ray.intersectObjects(badges, false) : [];
  return hits.length ? hits[0].object.userData.did : null;
}
// did the pointer hit the QB card? (used to clear a man assignment)
function pickQB(e) {
  setRay(e);
  const b = qbMesh && qbMesh.userData.badge;
  return !!(b && ray.intersectObject(b, false).length);
}

let drag = null;
let defDrag = null;          // a defender being dragged to a new alignment
let assignDef = null;        // a defender armed for a react-to assignment (2-click)
let assignBlockFor = null;   // a skill player armed to be assigned a defender to block
export function attachOffenseInput(el) {
  el.addEventListener('pointerdown', (e) => {
    // during a run, clicking a receiver freezes the play right there and throws to him
    if (off.running) { if (!off.thrown) { const t = pickPlayer(e); if (t) { e.stopImmediatePropagation(); throwBall(t); } } return; }
    if (off.drawing) {
      const p = sel(); if (!p) return;
      const w = groundAt(e); if (!w) return;
      e.stopImmediatePropagation();
      p.wp.push({ dx: +(clampFieldX(w.x) - p.x).toFixed(2), dz: +(clampFieldZ(w.z) - p.z).toFixed(2) });
      p.routeId = null; refresh(); save(); return;
    }
    // BLOCK-ASSIGN mode: a skill player is armed, waiting for you to pick his man to block.
    if (assignBlockFor) {
      const dd = pickDefender(e);
      if (dd) { e.stopImmediatePropagation(); const p = off.players.find((q) => q.id === assignBlockFor); if (p) { p.block = dd; p.read = 0; } assignBlockFor = null; refresh(); flash('Block assigned — he\'ll ride ' + dd); return; }
      e.stopImmediatePropagation(); assignBlockFor = null; flash('Block assign cancelled'); return;
    }
    // REACT-ASSIGN mode: a defender is armed, waiting for you to pick his man.
    if (assignDef) {
      // MAN: click the QB to CLEAR this defender's assignment (dotted line leaves)
      if (isManMode() && pickQB(e)) { e.stopImmediatePropagation(); clearMan(assignDef); const dn = assignDef; assignDef = null; setArmedDefender(null); showZones(); refreshManPanel(); flash(dn + ' man assignment cleared'); return; }
      const rp = pickPlayer(e);
      if (rp) {
        e.stopImmediatePropagation(); const dn = assignDef; assignDef = null; setArmedDefender(null);
        if (isManMode()) { setMan(dn, rp.id); showZones(); refreshManPanel(); flash(dn + ' covers this receiver (man)'); }   // MAN → redraw the dotted line + dial
        else { setReact(dn, rp.id); updateReactPanel(); flash(dn + ' will react to this receiver'); }
        return;
      }
      const dd = pickDefender(e);
      if (dd) { e.stopImmediatePropagation(); if (dd === assignDef) { clearReact(dd); assignDef = null; setArmedDefender(null); updateReactPanel(); flash(dd + ' reaction cleared'); } else { assignDef = dd; setArmedDefender(dd); flash('Now click the receiver for ' + dd); } return; }
      // clicked empty grass → send this defender to that SPOT (glides there, settles). Esc cancels.
      const w = groundAt(e);
      if (w) { e.stopImmediatePropagation(); setReactSpot(assignDef, w.x, w.z); const dn = assignDef; assignDef = null; setArmedDefender(null); updateReactPanel(); flash(dn + ' will slide to this spot'); return; }
      e.stopImmediatePropagation(); assignDef = null; setArmedDefender(null); flash('Assignment cancelled'); return;
    }
    const p = pickPlayer(e);
    if (p) { e.stopImmediatePropagation(); const w = groundAt(e) || { x: p.x, z: p.z }; drag = { p, dx: p.x - w.x, dz: p.z - w.z, sx: e.clientX, sy: e.clientY, moved: false }; return; }
    // A DEFENDER: DRAG him to line him up somewhere else; CLICK him to arm an
    // assignment. Same 5px dead-zone the receivers use, so a click is still a click.
    const did = pickDefender(e);
    if (did) {
      e.stopImmediatePropagation();
      const a = getDefenderAlign(did), w = groundAt(e);
      defDrag = { id: did, dx: a ? a.x - (w ? w.x : a.x) : 0, dz: a ? (a.z + LOS_Z) - (w ? w.z : a.z + LOS_Z) : 0,
                  sx: e.clientX, sy: e.clientY, moved: false };
    }
  }, true);

  el.addEventListener('pointermove', (e) => {
    if (defDrag) {
      if (!defDrag.moved && Math.hypot(e.clientX - defDrag.sx, e.clientY - defDrag.sy) < 5) return;
      defDrag.moved = true; e.stopImmediatePropagation();
      const w = groundAt(e); if (!w) return;
      setDefenderAlign(defDrag.id, w.x + defDrag.dx, w.z + defDrag.dz);
      hideZones();                       // the shell art is stale while he's moving
      return;
    }
    if (!drag) return;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 5) return;
    drag.moved = true; e.stopImmediatePropagation();
    const w = groundAt(e); if (!w) return;
    drag.p.x = clampFieldX(clampX(w.x + drag.dx));
    drag.p.z = Math.min(LOS_Z - 0.3, Math.max(Z_MIN, w.z + drag.dz));   // stay at/behind the LOS
    refresh();
  }, true);

  el.addEventListener('pointerup', (e) => {
    if (defDrag) {
      e.stopImmediatePropagation();
      const d = defDrag; defDrag = null;
      if (d.moved) {
        syncDefense(); showZones(); refreshManPanel(); refreshDefPanel(); save();
        flash(defName(d.id) + ' lined up here — Reset in the Defense panel puts him back');
      } else {
        // a plain click still arms him for a react / man / spot assignment
        assignDef = d.id; setArmedDefender(d.id);
        flash('Click a receiver for ' + defName(d.id) + ' to cover, or empty grass to send him to a spot');
      }
      return;
    }
    if (!drag) return; e.stopImmediatePropagation();
    if (!drag.moved) { off.selId = drag.p.id; off.drawing = false; }
    drag = null; refresh(); save();
  }, true);

  window.addEventListener('keydown', (e) => {
    // Never steal keystrokes from a text field. Without this, typing a play name
    // like "Run Post" fires R (reset) and P (run play) mid-word.
    if (isTyping(e)) return;
    if (e.key === 'Enter' && off.drawing) { off.drawing = false; refresh(); }
    if (e.key === 'Escape') { if (assignBlockFor) { assignBlockFor = null; flash('Block assign cancelled'); return; } if (assignDef) { assignDef = null; setArmedDefender(null); flash('Assignment cancelled'); return; } if (cinema) { stopCinema(); return; } off.drawing = false; off.selId = null; refresh(); }
    if (e.key === 'h' || e.key === 'H') setUIHidden(!document.body.classList.contains('ui-hidden'));
    if (e.key === ' ') { e.preventDefault(); togglePlay(); }
    if (e.key === 'r' || e.key === 'R') { if (off.running) resetRun(); }
    // B = assign the SELECTED skill player to block a defender (then click him); B again clears
    if ((e.key === 'b' || e.key === 'B') && !off.running) {
      const p = off.players.find((q) => q.id === off.selId);
      if (!p) flash('Select a skill player first, then B to assign a block');
      else if (p.block) { p.block = null; refresh(); flash(p.type + ' block cleared'); }
      else { assignBlockFor = p.id; flash('Click the defender for ' + p.type + ' to block (Esc to cancel)'); }
    }
    if (off.presenter && e.key.startsWith('Arrow')) presKeys.add(e.key);
  });
  window.addEventListener('keyup', (e) => presKeys.delete(e.key));
  // in presenter mode the wheel dollies the cinematic cam instead of the orbit
  el.addEventListener('wheel', (e) => {
    if (!off.presenter) return;
    e.preventDefault(); e.stopImmediatePropagation();
    presZoom = clampN(presZoom * (1 + Math.sign(e.deltaY) * 0.06), 0.5, 2.4);
  }, { capture: true, passive: false });
  el.addEventListener('dblclick', () => { if (off.drawing) { off.drawing = false; refresh(); } });
}

/* ============================== run + throw ============================== */
// The DEEPEST route on the field finishes in exactly TARGET_DUR seconds (Reggie's
// pace). Everyone moves at runSpeed = maxLen/TARGET_DUR, so shorter routes finish
// proportionally sooner. (Was a fixed 7.6 yd/s → deep routes dragged to ~6s.)
const TARGET_DUR = 5.0;
let runSpeed = 7.6;

// Position everyone (receivers + routes-drawn + defenders) for a given play time
// in seconds. The single source of truth the animation loop AND the scrubber
// both drive — so pause/scrub/resume all just call this.
function renderPlayAt(tSec) {
  const recPos = {};   // LOS-relative receiver positions this frame → defense reactions
  for (const p of off.players) {
    const r = routeMeshes.get(p.id); if (!r) continue;
    if (p.block) { r.route.group.visible = false; continue; }   // a blocker isn't running a route — handled below
    const total = r.cum.at(-1), dist = Math.min(total, runSpeed * tSec);
    // INTERPOLATE the chip between dense points (not snap to nearest) → smooth glide
    // at 60fps instead of 0.55yd steps.
    let i = r.cum.findIndex((c) => c >= dist); if (i < 0) i = r.cum.length - 1;
    const m = chipMeshes.get(p.id);
    if (m) {
      if (i <= 0) { m.position.set(r.dense[0].x, 0, r.dense[0].z); }
      else {
        const c0 = r.cum[i - 1], c1 = r.cum[i], f = c1 > c0 ? (dist - c0) / (c1 - c0) : 0;
        const a = r.dense[i - 1], b = r.dense[i];
        m.position.set(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f);
      }
    }
    r.route.setReveal(total ? dist / total : 1);   // paint the marker stroke on as the play develops
    if (m) recPos[p.id] = { x: m.position.x, z: m.position.z - LOS_Z, x0: p.x, z0: p.z - LOS_Z };   // cur + start (LOS-rel), for reactions + man trail
  }
  const frac = off.playDur ? Math.min(1, tSec / off.playDur) : 0;
  // HANDOFF: the ball rides with the carrier (a quick give at the snap)
  let runCtx = null;
  if (off.carrierId) {
    const cm = chipMeshes.get(off.carrierId);
    if (cm) { ballMesh.position.set(cm.position.x + 0.35, 0.75, cm.position.z); runCtx = { x: cm.position.x, z: cm.position.z - LOS_Z }; }
  }
  renderDefenseAt(frac, recPos, runCtx);            // drops / react breaks / run flow
  if (isFull()) blocking.renderBlockingAt(frac);    // O-line ↔ D-line ride-out
  // SKILL BLOCKS (stalk): a WR/TE/RB assigned to block rides his man — runs to just in
  // front of the defender (offense side) and stays on him. Runs AFTER the defense so it
  // tracks the man's live spot this frame.
  const be = frac <= 0 ? 0 : frac >= 1 ? 1 : frac * frac * (3 - 2 * frac);
  for (const p of off.players) {
    const bId = p.block || p._autoBlock;   // explicit stalk block OR a run-play auto-block
    if (!bId) continue;
    const m = chipMeshes.get(p.id); if (!m) continue;
    const dp = getDefenderPos(bId);
    if (!dp) { m.position.set(p.x, 0, p.z); continue; }
    const tx = dp.x, tz = dp.z - 0.9;               // engage just in front of his man
    m.position.set(p.x + (tx - p.x) * be, 0, p.z + (tz - p.z) * be);
  }
}

// hand the defense each skill player's route (or static spot) so it can compute
// route-aware drops. QB excluded — he's not a route threat.
function buildThreats() {
  // hand the defense LOS-RELATIVE route points (its depth logic is anchored at LOS=0)
  return off.players.map((p) => {
    const r = routeMeshes.get(p.id);
    const pts = r ? r.dense : [{ x: p.x, z: p.z }];
    return { points: pts.map((pt) => ({ x: pt.x, z: pt.z - LOS_Z })) };
  });
}

// where the ball carrier crosses the LOS (world x) — the hole the O-line opens
function carrierHoleX() {
  const r = routeMeshes.get(off.carrierId);
  if (r && r.dense) { for (const pt of r.dense) if (pt.z >= LOS_Z) return pt.x; return r.dense.at(-1).x; }
  const c = off.players.find((p) => p.id === off.carrierId);
  return c ? c.x : SNAP_X;
}
// on a RUN, who carries: the RB with a run path, else any RB, else the deepest route-runner
function pickCarrier() {
  const rbs = off.players.filter((p) => p.type === 'RB');
  return (rbs.find((p) => routeMeshes.get(p.id)) || rbs[0] || off.players.find((p) => routeMeshes.get(p.id)) || {}).id || null;
}

export function runPlay() {
  const isRun = off.playType === 'run';
  const runners = off.players.filter((p) => routeMeshes.get(p.id));
  if (!runners.length && !isRun) { flash('Give someone a route first.'); return; }
  off.carrierId = isRun ? pickCarrier() : null;
  // RUN: every route-less skill player (not the carrier) auto-blocks his nearest defender
  const defs = getDefenderList();
  off.players.forEach((p) => {
    p._autoBlock = null;
    if (isRun && p.id !== off.carrierId && !routeMeshes.get(p.id) && !p.block && defs.length) {
      let best = null, bd = 1e9;
      for (const d of defs) { const dd = Math.hypot(d.x - p.x, d.z - p.z); if (dd < bd) { bd = dd; best = d.id; } }
      p._autoBlock = best;
    }
  });
  off.running = true; off.paused = false; off.canThrow = false; off.thrown = false; off.caught = false; off.playT = 0;
  off.players.forEach((p) => (p.isTarget = false));
  const maxLen = Math.max(...runners.map((p) => routeMeshes.get(p.id).cum.at(-1)), 6);
  off.playDur = TARGET_DUR; runSpeed = Math.max(1, maxLen) / TARGET_DUR;   // deepest route lands at 5s on the dot
  ballMesh.position.set(qbMesh.position.x + 0.5, 1.15, qbMesh.position.z);   // snap into the QB's hands
  prepareDefense(buildThreats());   // compute route-aware drops, then drop the zone art
  hideZones();
  if (isFull()) blocking.prepareBlocking({ type: isRun ? 'run' : 'pass', holeX: isRun && off.carrierId ? carrierHoleX() : null });
  renderPlayAt(0);
  showScrub(true); updateTransport(); setHint();
  let last = performance.now();
  function frame(now) {
    if (!off.running || off.thrown) return;   // throw takes over its own loop
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!off.paused && off.playT < off.playDur) {
      off.playT = Math.min(off.playDur, off.playT + dt);
      renderPlayAt(off.playT);
      updateScrub();
      if (off.playT >= off.playDur && !off.canThrow) {
        off.canThrow = true; updateTransport(); setHint();
        if (autoThrowOn && !off.thrown && !off.carrierId) throwToLowestRead();   // pass only → auto-throw to the money read (a run just freezes)
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// The play/pause button. Idle → run; running → pause/resume; finished → replay.
export function togglePlay() {
  if (!off.running) { runPlay(); return; }
  if (off.thrown) return;                             // after a throw, RESET is the move
  if (off.playT >= off.playDur) { off.playT = 0; off.canThrow = false; off.paused = false; renderPlayAt(0); }
  else off.paused = !off.paused;
  updateTransport(); setHint();
}

// Scrubber → jump to any moment (auto-pauses so you can study the frame).
export function scrubTo(frac) {
  if (!off.running || off.thrown) return;
  off.paused = true;
  off.playT = Math.max(0, Math.min(1, frac)) * off.playDur;
  off.canThrow = off.playT >= off.playDur;
  renderPlayAt(off.playT);
  ui.scrubTime.textContent = off.playT.toFixed(1) + 's';
  updateTransport(); setHint();
}

let lastThrowTo = null;
export function getThrowToPos() { return lastThrowTo ? lastThrowTo.clone() : null; }
function throwBall(target) {
  if (off.thrown) return;
  off.paused = true; off.canThrow = false; off.thrown = true; off.caught = false; showScrub(false); updateTransport();
  off.players.forEach((p) => (p.isTarget = false)); target.isTarget = true;
  // highlight the target's ring WITHOUT refresh() — refresh snaps chips back to
  // their pre-snap spots; the players must stay frozen at their route ends.
  for (const p of off.players) { const m = chipMeshes.get(p.id); if (m && m.userData.sel) m.userData.sel.visible = p.isTarget; }
  const tm = chipMeshes.get(target.id);
  const from = new THREE.Vector3(qbMesh.position.x + 0.5, 1.15, qbMesh.position.z);
  const to = new THREE.Vector3(tm.position.x, 0.6, tm.position.z);
  lastThrowTo = to.clone();   // catch spot → the free camera zooms in on it
  const dist = from.distanceTo(to), dur = Math.min(1150, 360 + dist * 24), apex = 2.6 + dist * 0.17;
  const yaw = Math.atan2(to.x - from.x, to.z - from.z);
  throwDir.set(to.x - from.x, 0, to.z - from.z).normalize();   // for the presenter chase-cam
  const t0 = performance.now();
  function frame(now) {
    const t = Math.min(1, (now - t0) / dur);
    const x = from.x + (to.x - from.x) * t, z = from.z + (to.z - from.z) * t;
    const y = from.y + (to.y - from.y) * t + apex * Math.sin(Math.PI * t);
    ballMesh.position.set(x, y, z);
    ballMesh.rotation.set(0, yaw, 0); ballMesh.rotateZ(now * 0.02); // spiral around its long axis
    if (t < 1) requestAnimationFrame(frame);
    else { ballMesh.position.set(to.x, 0.5, to.z); ballMesh.rotation.set(0, yaw, 0); off.caught = true; setHint(); }  // caught → cameras start the slow push-in on the carrier
  }
  requestAnimationFrame(frame); setHint();
}
export function throwTo(id) { if (off.running && !off.thrown) { const t = off.players.find((p) => p.id === id); if (t) throwBall(t); } }
// ---- manual throw control (Filming Rig v1) ----
// The ball is hot-wired to a read: keys 1/2/3/4 → throw to that read, Q → check-down.
// If you don't throw, it AUTO-throws to the lowest read on the field when the routes
// finish. `autoThrowOn` gates the auto-throw.
let autoThrowOn = true;
function readTarget(rank) { return off.players.find((p) => (p.read || 0) === rank && routeMeshes.get(p.id)) || null; }
function lowestReadTarget() { let best = null; for (const p of off.players) if ((p.read || 0) > 0 && routeMeshes.get(p.id)) if (!best || p.read < best.read) best = p; return best; }
export function throwToRead(rank) { if (!off.running || off.thrown) return false; const p = readTarget(rank); if (p) { throwBall(p); return true; } return false; }
export function throwToLowestRead() { if (!off.running || off.thrown) return false; const p = lowestReadTarget(); if (p) { throwBall(p); return true; } return false; }
export function setAutoThrow(v) { autoThrowOn = !!v; return autoThrowOn; }
export function resetRun() {
  off.running = false; off.paused = false; off.canThrow = false; off.thrown = false; off.caught = false; off.playT = 0; off.playDur = 0;
  off.carrierId = null;
  off.players.forEach((p) => { p.isTarget = false; p._autoBlock = null; });
  blocking.resetBlocking();          // linemen back to their alignment
  showZones();                       // bring the pre-snap zone art back (refresh() below re-settles the drops)
  showScrub(false); updateTransport();
  if (ballMesh) { ballMesh.position.set(SNAP_X, 0.4, -0.15 + LOS_Z); ballMesh.rotation.set(0, 0, 0); }
  refresh(); setHint();
}
// PASS ↔ RUN play type. RUN codes the O-line to run-block, hands the ball to the
// carrier, and makes route-less skill players block — but route-runners still run
// (bubble/slant) and stay throwable (RPO). Returns the new type.
export function setPlayType(t) { off.playType = (t === 'run') ? 'run' : 'pass'; return off.playType; }
export function getPlayType() { return off.playType; }
export function isCarrying() { return !!(off.running && off.carrierId && !off.thrown); }
export function getCarrierPos() { const m = off.carrierId && chipMeshes.get(off.carrierId); return m ? new THREE.Vector3(m.position.x, 1.4, m.position.z) : null; }

/* ============================== presenter camera ==============================
   A cinematic mode for shorts: start low behind the QB, watch the play develop,
   then ride the football through the air on the throw (staying zoomed out enough
   to keep the routes + the target area in frame). Driven from the app render loop
   — returns true while it owns the camera so the orbit stands down. */
function actionCentroid() {
  let sx = 0, sz = 0, n = 0;
  for (const p of off.players) { const m = chipMeshes.get(p.id); if (m) { sx += m.position.x; sz += m.position.z; n++; } }
  return n ? { x: sx / n, z: sz / n } : { x: 0, z: 10 };
}
export function cameraTick(dt) {
  if (cinema) return cinemaFrame(dt);
  if (!off.presenter || !qbMesh || !ballMesh) { presInit = false; return false; }
  if (!presInit) { presInit = true; presPos.copy(camera.position); presLook.set(0, 2, 12); }
  // your look-around / zoom, layered on the auto framing
  if (presKeys.has('ArrowLeft')) presYaw += 1.1 * dt;
  if (presKeys.has('ArrowRight')) presYaw -= 1.1 * dt;
  if (presKeys.has('ArrowUp')) presPitch += 13 * dt;
  if (presKeys.has('ArrowDown')) presPitch -= 13 * dt;
  presYaw = clampN(presYaw, -1.3, 1.3); presPitch = clampN(presPitch, -6, 18);

  const qb = qbMesh.position, ball = ballMesh.position;
  let subj, offv, k;
  if (off.thrown) {
    // ride behind the ball's flight, looking forward past it to the receiver
    subj = new THREE.Vector3(ball.x + throwDir.x * 8, 1.6, ball.z + throwDir.z * 8);
    offv = new THREE.Vector3(-throwDir.x * 24, 11.4, -throwDir.z * 24);
    k = Math.min(1, dt * 4.5);
  } else {
    // pre-snap / developing: low behind the QB, tracking the action downfield
    const c = actionCentroid(), lz = Math.max(qb.z + 15, c.z);
    subj = new THREE.Vector3(c.x * 0.5, 2.5, lz);
    offv = new THREE.Vector3(qb.x * 0.4 - c.x * 0.5, 5.5, (qb.z - 18) - lz);
    k = Math.min(1, dt * 2.5);
  }
  // subj = look point; offv = look→camera. Apply yaw (swivel head), zoom, pitch.
  offv.applyAxisAngle(UP_Y, presYaw).multiplyScalar(presZoom);
  offv.y += presPitch;
  presPos.lerp(subj.clone().add(offv), k);
  presLook.lerp(subj, k);
  camera.position.copy(presPos);
  camera.lookAt(presLook);
  return true;
}
export function setPresenter(on) {
  off.presenter = on;
  document.body.classList.toggle('presenter', on);   // gold reticle cursor is presenter-only
  if (on) { presInit = false; presYaw = 0; presPitch = 0; presZoom = 1; }
  else { orbit.syncFromCamera(); orbit.enabled = true; }   // hand the camera back to the orbit smoothly
}

/* ---- cinematic intro swoop ---- */
function cinemaFrame(dt) {
  cinemaT = Math.min(CINEMA_DUR, cinemaT + dt);
  const t = cinemaT / CINEMA_DUR;
  const e = t * t * t * (t * (t * 6 - 15) + 10);     // smootherstep — soft start & landing
  const u = 1 - e;                                   // quadratic bezier: high → dip → board
  _cv.set(0, 0, 0)
     .addScaledVector(CINE_START, u * u)
     .addScaledVector(CINE_CTRL, 2 * u * e)
     .addScaledVector(CINE_END, e * e);
  _cl.lerpVectors(CINE_LOOK0, CINE_LOOK1, e);
  camera.up.set(0, 1, 0);
  camera.position.copy(_cv);
  camera.lookAt(_cl);
  return true;                                       // owns the camera; holds on the board at the end
}
export function inCinema() { return cinema; }
export function startCinema() {
  cinema = true; cinemaT = 0;
  off.presenter = false; document.body.classList.remove('presenter');
  orbit.enabled = false; orbit.autoOrbit = false;
  setUIHidden(true, true);                           // no UI in the shot (and no reveal toast)
  setFieldHidden(true);                              // no players / dots / routes / defense
}
export function stopCinema() {
  if (!cinema) return;
  cinema = false;
  setFieldHidden(false);
  setUIHidden(false);
  orbit.syncFromCamera(); orbit.enabled = true;
}
// hide/show everything ON the field (offense chips, QB, ball, routes + the defense)
function setFieldHidden(hidden) {
  group.visible = !hidden;
  setDefenseVisible(!hidden);
  if (hidden) hideZones();
  else if (!off.running) { syncDefense(); showZones(); }
}

/* ============================== persistence ============================== */
// Every edit funnels through here, so it's the one place that can honestly say the
// saved copy is now stale — and the one place undo needs to snapshot.
function save() {
  try { localStorage.setItem('pd_play', JSON.stringify({ players: off.players.map((p) => ({ ...p })), formation: currentForm })); } catch {}
  markUnsaved();
  updateEditsPanel();   // committed edit → refresh "unsaved edits to this play"
  if (!undo.isApplying()) undo.push();
}
function load() {
  try {
    const d = JSON.parse(localStorage.getItem('pd_play') || 'null');
    if (d && d.players && d.players.length) {
      off.players = d.players.map((p) => ({ stem: 0, isTarget: false, ...p }));
      off.idc = d.players.length + 1;
      if (d.formation) currentForm = { name: d.formation.name || '', id: d.formation.id || null };
      return true;
    }
  } catch {}
  return false;
}

/* ============================== DOM UI ============================== */
// True when the keystroke belongs to a text field / the sign-in modal, so global
// shortcuts stay out of the way. Shared by every keydown handler here.
export function isTyping(e) {
  const t = e.target;
  if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return true;
  if (t && t.isContentEditable) return true;
  return !!document.getElementById('sk-login');   // the auth modal owns the keyboard while open
}

function buildUI() {
  dock.buildDock();

  /* ---- PLAY panel: everything about this play as an object ----
     (The old bar called saveFormation() "Save play" — it only stores the player
     POSITIONS as a reusable formation. Now it says what it does, and "Save play"
     means the real thing: the whole play, to your account.) */
  // No standalone "Save this formation" button and no always-on name field. One
  // Save play button opens a dialog that names the play AND files it under a
  // formation (Reggie's model — formation + play named together, at save time).
  const bar = document.createElement('div'); bar.className = 'pd-secwrap';
  bar.innerHTML = `
    <div class="pd-group">
      <span class="pd-group-cap">Start from a formation</span>
      <div class="pd-form-group">
        <button id="pd-form-prev" class="pd-btn nav" aria-label="Previous formation">‹</button>
        <span class="pd-btn pd-form-name" id="pd-form-name">—</span>
        <button id="pd-form-next" class="pd-btn nav" aria-label="Next formation">›</button>
      </div>
    </div>
    <div class="pd-group">
      <span class="pd-group-cap">This play</span>
      <button id="pd-save" class="pd-btn go pd-save full">
        <svg class="pd-save-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        <span class="pd-save-tx">Save play</span>
      </button>
      <span class="pd-savedas" id="pd-savedas"></span>
      <!-- Only shows after you open a saved play and change it: what you changed +
           one button to write those edits back over the same play. -->
      <div class="pd-edits" id="pd-edits" hidden>
        <span class="pd-edits-cap">Unsaved edits to “<b class="pd-edits-name"></b>”</span>
        <div class="pd-edits-list pd-mods"></div>
        <button id="pd-save-edits" class="pd-btn go full">Save these edits</button>
      </div>
    </div>
    <div class="pd-group">
      <span class="pd-group-cap">Library</span>
      <button id="pd-share" class="pd-btn full" title="Get a link anyone can open">Share link</button>
      <span class="pd-lib-hint">Saved plays live in the <b>Plays</b> tab →</span>
    </div>
    <div class="pd-group">
      <span class="pd-group-cap">Export</span>
      <div class="pd-group-row">
        <button id="pd-export-vid" class="pd-btn" title="Record the play as a video you can post">🎬 Video</button>
        <button id="pd-export-png" class="pd-btn" title="Save a play card image">🖼 Image</button>
      </div>
      <div class="pd-xnote" id="pd-x-vid" hidden>
        <p>Records the play from <b>whatever camera you've set up</b>, hides the controls, and saves a <b>.webm</b> to your <b>Downloads</b> folder.</p>
        <label class="pd-row-label" for="pd-x-target">Throw the ball to</label>
        <select id="pd-x-target" class="pd-select"></select>
        <button id="pd-x-vid-go" class="pd-btn go full">● Start recording</button>
      </div>
      <div class="pd-xnote" id="pd-x-png" hidden>
        <p>Saves a <b>.png</b> of <b>exactly what you see right now</b>, with your play name across the top — so orbit to the angle you want first.</p>
        <p>It lands in your <b>Downloads</b> folder.</p>
        <button id="pd-x-png-go" class="pd-btn go full">Save image</button>
      </div>
    </div>
    <div class="pd-group">
      <span class="pd-group-cap">Edit</span>
      <div class="pd-group-row pd-undo">
        <button id="pd-undo" class="pd-btn icon" title="Undo (Ctrl+Z)" aria-label="Undo" disabled>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7L3 8"/></svg></button>
        <button id="pd-redo" class="pd-btn icon" title="Redo (Ctrl+Shift+Z)" aria-label="Redo" disabled>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 7v6h-6"/><path d="M21 13a9 9 0 1 1-3-7.7L21 8"/></svg></button>
      </div>
    </div>`;
  dock.panelBody('play').appendChild(bar);

  /* ---- OFFENSE panel: the roster lives with the receivers it adds ---- */
  const offBox = document.createElement('div'); offBox.className = 'pd-secwrap';
  offBox.innerHTML = `
    <div class="pd-group">
      <span class="pd-group-cap">Roster</span>
      <div class="pd-group-row">
        <button id="pd-add" class="pd-btn wide">+ Add receiver</button>
        <button id="pd-clearroutes" class="pd-btn danger">Clear routes</button>
      </div>
    </div>`;
  dock.panelBody('offense').appendChild(offBox);

  // Saved plays render into their OWN dock tab ("Plays"), grouped by formation —
  // or the Join upsell for non-members. (Was a buried button + floating drawer.)
  const playsBody = document.createElement('div');
  playsBody.className = 'pd-plays-body'; playsBody.id = 'pd-plays-body';
  dock.panelBody('plays').appendChild(playsBody);

  // SAVE dialog — names the play AND files it under a formation in one step. The
  // formation box is a type-or-pick combobox (datalist): pick one you've already
  // made and it links; type a new name and it creates that formation. Same-name =
  // same formation, automatically.
  const savedlg = document.createElement('div');
  savedlg.className = 'pd-savedlg'; savedlg.id = 'pd-savedlg';
  savedlg.innerHTML = `
    <div class="pd-savedlg-back"></div>
    <div class="pd-savedlg-card pd-patch" role="dialog" aria-modal="true" aria-label="Save play">
      <button class="pd-savedlg-x" aria-label="Close">✕</button>
      <h3 class="pd-savedlg-title">Save play</h3>
      <label class="pd-row-label" for="pd-dlg-form">Formation</label>
      <input id="pd-dlg-form" class="pd-dlg-input" list="pd-form-list" placeholder="Pick or name a formation" autocomplete="off">
      <datalist id="pd-form-list"></datalist>
      <label class="pd-row-label" for="pd-dlg-name">Play name</label>
      <input id="pd-dlg-name" class="pd-dlg-input" maxlength="60" placeholder="Name this play">
      <div class="pd-savedlg-err" id="pd-dlg-err"></div>
      <button id="pd-dlg-save" class="pd-btn go full">Save play</button>
    </div>`;
  document.body.appendChild(savedlg);

  /* ---- DEFENSE panel ----
     The old grid was eight equal-weight buttons of jargon: OFF · COVER 2 · COVER 3 ·
     COVER 4 · MAN · MAN 1 · MAN 2 · PLAYERS. Reggie knows what "PLAYERS" means;
     nobody else does. Now they're grouped the way a coach says them (zone vs man),
     "PLAYERS" says what it actually does (defenders with the zone art hidden), and
     each button explains itself on hover. */
  const COV_LABEL = {
    'OFF': ['No defense', 'Hide the defense entirely'],
    'COVER 2': ['Cover 2', 'Two deep safeties, five underneath'],
    'COVER 3': ['Cover 3', 'Three deep, four under — the most common shell'],
    'COVER 4': ['Cover 4', 'Quarters — four deep defenders'],
    'MAN': ['Man', 'Everyone follows a receiver, no deep help'],
    'MAN 1': ['Man + 1 deep', 'Man coverage with a free safety over the top'],
    'MAN 2': ['Man + 2 deep', 'Man coverage under two deep safeties'],
    'PLAYERS': ['Hide zone art', 'The defenders play Cover 3, but the shaded areas are hidden'],
  };
  const ZONE = ['COVER 2', 'COVER 3', 'COVER 4'], MAN = ['MAN', 'MAN 1', 'MAN 2'];
  const covBtn = (c) => `<button class="pd-def-opt ${c === getCoverage() ? 'on' : ''}" data-cov="${c}" title="${COV_LABEL[c][1]}">${COV_LABEL[c][0]}</button>`;
  const defp = document.createElement('div'); defp.className = 'pd-secwrap';
  defp.innerHTML = `
    <div id="pd-def-body">
      <div class="pd-def-opts" id="pd-def-opts">
        <span class="pd-group-cap">Zone</span>
        <div class="pd-def-grid">${ZONE.map(covBtn).join('')}</div>
        <span class="pd-group-cap">Man</span>
        <div class="pd-def-grid">${MAN.map(covBtn).join('')}</div>
        <span class="pd-group-cap">Other</span>
        <div class="pd-def-grid">${['OFF', 'PLAYERS'].map(covBtn).join('')}</div>
      </div>
      <div class="pd-def-note">
        <b>Move a defender:</b> drag him anywhere on the field and let go — he lines up there.<br>
        <b>Give him a job:</b> click him, then click a receiver to cover, or click empty grass to send him to that spot when the play runs.
      </div>
      <div id="pd-mansep" class="pd-def-note" style="display:none">
        <b>Separation</b> — how much daylight the receiver gets.
        <div class="pd-sep-head"><span>Everyone</span><span id="pd-mansep-base-val">${getManSep()} yd</span></div>
        <input id="pd-mansep-base" type="range" min="0" max="10" step="0.2" value="${getManSep()}" aria-label="Baseline separation">
        <div id="pd-mansep-list"></div>
      </div>
      <div class="pd-group">
        <span class="pd-group-cap">Your changes</span>
        <div id="pd-aggr" class="pd-mods"></div>
        <button id="pd-def-reset" class="pd-btn danger full">↺ Reset to default defense</button>
        <span class="pd-def-resetnote">Puts every defender back where he starts, playing the coverage exactly as designed — use it any time the defense starts doing something you didn't ask for.</span>
      </div>
    </div>`;
  dock.panelBody('defense').appendChild(defp);

  // The list of everything you've hand-changed + the way back. Man coverage gets
  // confusing fast; this is the escape hatch.
  refreshDefPanel = () => {
    const box = defp.querySelector('#pd-aggr'); if (!box) return;
    const mods = getModifications();
    box.innerHTML = mods.length
      ? mods.map((m) => `<span class="pd-mod pd-mod-${m.kind}">${esc(m.label)}</span>`).join('')
      : '<span class="pd-mods-none">Nothing changed — the defense is running the coverage as designed.</span>';
    const btn = defp.querySelector('#pd-def-reset');
    if (btn) { btn.disabled = !mods.length; btn.classList.toggle('on', !!mods.length); }
  };
  defp.querySelector('#pd-def-reset').onclick = () => {
    resetToDefault();
    assignDef = null;
    syncDefense(); showZones(); refreshManPanel(); refreshDefPanel(); refresh(); save();
    flash('Defense reset to default');
    cloud.toast('Defense reset to default');
  };
  const manSepBox = defp.querySelector('#pd-mansep');
  const baseRange = defp.querySelector('#pd-mansep-base'), baseVal = defp.querySelector('#pd-mansep-base-val');
  const listEl = defp.querySelector('#pd-mansep-list');
  // one DIAL PER covered receiver: label "<DEF> on <TYPE>", its own slider, highlighted
  // + a reset when it has a locked override. Rebuilt when assignments/coverage change;
  // sliders update in place (so a drag isn't interrupted).
  const rebuildManList = () => {
    listEl.innerHTML = getManList().map((a) => {
      const p = off.players.find((x) => x.id === a.recId); const type = p ? p.type : '?';
      const sep = getRecSep(a.recId), ov = hasRecSep(a.recId);
      return `<div class="pd-sep-row${ov ? ' ov' : ''}" data-rec="${a.recId}">
        <div class="pd-sep-head">
          <span class="pd-sep-who">${a.defLabel} on ${type}</span>
          <span><span class="rowval">${sep} yd</span>${ov ? ' <button class="rowreset" title="Back to the baseline">↺</button>' : '<span class="pd-sep-base"> base</span>'}</span>
        </div>
        <input class="rowrange" type="range" min="0" max="10" step="0.2" value="${sep}" aria-label="${a.defLabel} on ${type} separation">
      </div>`;
    }).join('') || '<span class="pd-sep-base">No man assignments yet.</span>';
    listEl.querySelectorAll('[data-rec]').forEach((row) => {
      const rec = row.dataset.rec, range = row.querySelector('.rowrange');
      range.oninput = () => { const v = setRecSep(rec, range.value); row.querySelector('.rowval').textContent = v + ' yd'; row.classList.add('ov'); };
      range.onchange = () => rebuildManList();   // finalize → redraw so the ↺ reset appears
      const rst = row.querySelector('.rowreset'); if (rst) rst.onclick = () => { setRecSep(rec, null); rebuildManList(); };
    });
  };
  refreshManPanel = () => { if (!manSepBox) return; manSepBox.style.display = isManMode() ? 'block' : 'none'; if (document.activeElement !== baseRange) baseRange.value = getManSep(); baseVal.textContent = getManSep() + ' yd'; rebuildManList(); };
  baseRange.oninput = () => { setManSep(baseRange.value); baseVal.textContent = getManSep() + ' yd'; rebuildManList(); };
  const updateManUI = () => refreshManPanel();
  updateManUI();

  // The selected-player inspector and the route tray are both Offense: what you
  // picked, and what you're giving him. Selecting a player auto-opens this panel
  // (see refresh) so the most frequent action never costs an extra click.
  const panel = document.createElement('div'); panel.className = 'pd-panel'; panel.id = 'pd-panel';
  const tray = document.createElement('div'); tray.className = 'pd-tray'; tray.id = 'pd-tray';
  dock.panelBody('offense').append(panel, tray);

  /* ---- VIEW panel: how you watch it ----
     The camera <option>s are filled by app.js (which owns film-cam) — importing
     film-cam here would make offense↔film-cam circular. */
  const con = document.createElement('div'); con.className = 'pd-secwrap';
  con.innerHTML = `
    <div class="pd-group">
      <span class="pd-group-cap">Camera</span>
      <select id="pd-shot" class="pd-select" aria-label="Camera angle"></select>
      <div class="pd-track-wrap" id="pd-track-wrap" hidden>
        <span class="pd-track-cap">🎯 Riding</span>
        <select id="pd-track" class="pd-select pd-track" aria-label="Player to track"></select>
      </div>
    </div>
    <div class="pd-cammap">
      <b>Flying the camera</b>
      <ul>
        <li><b>Drag</b> the field to swing the camera around it.</li>
        <li><b>Scroll</b> to zoom — you move toward wherever your mouse is pointing, so aim at the spot you want, then scroll in.</li>
        <li><b>Arrow keys</b> slide the view across the field and raise or lower it.</li>
        <li><b>Esc</b> drops you into a clean default view behind the QB from <i>any</i> angle — even paused mid-play — then you're back in free control.</li>
      </ul>
    </div>
    <div class="pd-group">
      <span class="pd-group-cap">On the field</span>
      <div class="pd-group-row">
        <button id="pd-reads" class="pd-btn on">🏷 Reads</button>
        <button id="pd-orbit" class="pd-btn">🔄 Orbit</button>
      </div>
    </div>
    <div class="pd-group">
      <span class="pd-group-cap">Screen</span>
      <div class="pd-group-row">
        <button id="pd-fs" class="pd-btn icon">
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4"/></svg>
          <span class="pd-fs-lbl">Full screen</span></button>
        <button id="pd-hideui" class="pd-btn">👁 Hide · H</button>
      </div>
    </div>`;
  dock.panelBody('view').appendChild(con);

  // "Track" picker — the Receiver POV / Follow shots track a player, but there was
  // no way to say WHICH; it silently used the money read. Now picking one of those
  // shots reveals this dropdown so you choose exactly who the camera rides.
  const trackSel = con.querySelector('#pd-track');
  trackSel.onchange = () => setCamTarget(trackSel.value || null);
  con.querySelector('#pd-shot').addEventListener('change', (e) => syncCamPicker(e.target.value));

  /* ---- CONTROL PANEL (bottom-right) — status, scrubber, transport. Always
     reachable, never inside a tab. #pd-run cycles RUN → PAUSE → RESUME → REPLAY
     itself (see updateTransport), so one button covers all four states. ---- */
  const hint = document.createElement('div'); hint.className = 'pd-hint'; hint.id = 'pd-hint';
  dock.slot('mid').appendChild(hint);
  const trans = document.createElement('div');
  trans.innerHTML = `
    <div class="pd-scrub" id="pd-scrub"><span class="pd-scrub-cap">Play</span><input id="pd-scrub-range" class="pd-scrub-range" type="range" min="0" max="1000" value="0" step="1" aria-label="Scrub the play"><span class="pd-scrub-time" id="pd-scrub-time">0.0s</span></div>
    <div class="pd-throw" id="pd-throw" hidden>
      <span class="pd-row-label">Throw to</span>
      <div class="pd-throw-btns" id="pd-throw-btns"></div>
    </div>
    <div class="pd-controls-btns">
      <button id="pd-run" class="pd-btn go">▶ Run</button>
      <button id="pd-reset" class="pd-btn" style="display:none">↺ Reset</button>
    </div>`;
  while (trans.firstChild) dock.slot('mid').appendChild(trans.firstChild);
  document.getElementById('pd-throw-btns').onclick = (e) => {
    const b = e.target.closest('[data-throw]'); if (!b) return;
    throwTo(b.dataset.throw);
  };

  // stays visible even when the rest of the UI is hidden, so you can get it back
  const reveal = document.createElement('div'); reveal.className = 'pd-reveal'; reveal.textContent = 'Press H to bring the controls back';
  document.body.appendChild(reveal);

  const fsBtn = con.querySelector('#pd-fs');
  fsBtn.onclick = toggleFullscreen;

  // 9:16 frame guide (the picker that drives it now lives in the Studio drawer,
  // built by app.js — it's a filming tool, not a consumer control)
  const phoneFrame = document.createElement('div'); phoneFrame.className = 'pd-phoneframe';
  document.body.appendChild(phoneFrame);
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    fsBtn.querySelector('.pd-fs-lbl').textContent = on ? 'Exit full screen' : 'Full screen';
    onResize();   // make the renderer + camera match the new viewport
  });

  ui = {
    formName: bar.querySelector('#pd-form-name'), defOpts: defp.querySelector('#pd-def-opts'),
    runBtn: document.getElementById('pd-run'), resetBtn: document.getElementById('pd-reset'),
    scrub: document.getElementById('pd-scrub'), scrubRange: document.getElementById('pd-scrub-range'), scrubTime: document.getElementById('pd-scrub-time'),
    orbitBtn: con.querySelector('#pd-orbit'), hideBtn: con.querySelector('#pd-hideui'), readsBtn: con.querySelector('#pd-reads'), reveal,
    saveBtn: bar.querySelector('#pd-save'), savedAs: bar.querySelector('#pd-savedas'),
    editsBox: bar.querySelector('#pd-edits'), saveEditsBtn: bar.querySelector('#pd-save-edits'),
    shareBtn: bar.querySelector('#pd-share'),
    vidBtn: bar.querySelector('#pd-export-vid'), pngBtn: bar.querySelector('#pd-export-png'),
    playsBody, savedlg,
    undoBtn: bar.querySelector('#pd-undo'), redoBtn: bar.querySelector('#pd-redo'),
    panel, tray, hint,
  };
  bar.querySelector('#pd-form-prev').onclick = () => stepFormation(-1);
  bar.querySelector('#pd-form-next').onclick = () => stepFormation(1);
  offBox.querySelector('#pd-add').onclick = () => { const p = addPlayer('WR', 16, -0.6 + LOS_Z); if (p) { off.selId = p.id; refresh(); save(); } };
  offBox.querySelector('#pd-clearroutes').onclick = () => {
    if (!off.players.some((p) => p.routeId || (p.wp && p.wp.length))) { flash('No routes to clear'); return; }
    off.players.forEach((p) => { p.wp = []; p.routeId = null; p.stem = 0; }); refresh(); save();
    flash('Routes cleared — Ctrl+Z to undo');   // destructive, but now reversible
  };
  wireExport();
  wireSaveButton();
  wireSaveEdits();
  wireMyPlays();
  wireShare();
  wireUndo();
  wireFirstRun();
  ui.defOpts.onclick = (e) => {
    const b = e.target.closest('[data-cov]'); if (!b) return;
    const now = setCoverage(b.dataset.cov);
    ui.defOpts.querySelectorAll('.pd-def-opt').forEach((o) => o.classList.toggle('on', o.dataset.cov === now));
    if (off.running) hideZones(); else { syncDefense(); showZones(); }
    updateManUI();
  };
  ui.runBtn.onclick = () => togglePlay();
  ui.resetBtn.onclick = () => resetRun();
  ui.scrubRange.addEventListener('input', () => scrubTo(ui.scrubRange.value / 1000));
  ui.orbitBtn.onclick = () => { orbit.autoOrbit = !orbit.autoOrbit; ui.orbitBtn.classList.toggle('on', orbit.autoOrbit); };
  ui.hideBtn.onclick = () => setUIHidden(true);
  ui.readsBtn.onclick = () => { readLabelsOn = !readLabelsOn; ui.readsBtn.classList.toggle('on', readLabelsOn); refresh(); };
  renderTray(); setHint();
}

/* ---------------------- SAVE PLAY ----------------------
   The tool's primary action. Free to draw; we only ask who you are at the moment
   you save. The Save button opens a dialog that names the play AND files it under a
   formation in one step; editing after a save returns the button to "Save play" so
   it never claims your latest change is stored when it isn't. */
let currentPlayName = '';
let currentPlayFormation = '';   // the formation label this play was last saved under
try { currentPlayName = localStorage.getItem('pd_playname') || ''; } catch {}

function wireSaveButton() {
  const btn = ui.saveBtn, dlg = ui.savedlg;
  if (!btn) return;

  btn.onclick = triggerSaveDialog;

  // dialog controls
  const nameEl = dlg.querySelector('#pd-dlg-name'), formEl = dlg.querySelector('#pd-dlg-form');
  const errEl = dlg.querySelector('#pd-dlg-err');
  const close = () => dlg.classList.remove('show');
  dlg.querySelector('.pd-savedlg-x').onclick = close;
  dlg.querySelector('.pd-savedlg-back').onclick = close;
  dlg.querySelector('#pd-dlg-save').onclick = () => doSaveFromDialog(nameEl, formEl, errEl, close);
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); doSaveFromDialog(nameEl, formEl, errEl, close); }
    else if (e.key === 'Escape') { e.stopPropagation(); close(); }
  });

  cloud.onAuth(() => { refreshSaveAvailability(); syncFormations(); });
  refreshSaveAvailability();
}

// The Save-play action — shared by the Setup button AND the Your Plays button.
// The membership gate for every save path. A free (non-member) user can draw, run
// and throw all they want — but the moment they try to SAVE, we don't dead-end them
// in a dialog that'll fail. We send them to the Your Plays tab, where the pitch spells
// out exactly what a membership unlocks. Returns false when it blocked the action.
function memberGate() {
  if (cloud.canSave()) return true;
  dock.open('plays');        // the pitch lives in Your Plays
  renderMyPlays();           // make sure it's showing the upsell, not a stale list
  flash('Saving plays is a members-only feature — here’s what it unlocks →');
  return false;
}

function triggerSaveDialog() {
  if (!memberGate()) return;
  if (!cloud.saveIsAvailable()) { cloud.toast('Saving is unavailable right now'); return; }
  if (!playSpec.hasRoutes()) { cloud.toast('Draw a route first, then save'); flash('Give someone a route before saving'); return; }
  openSaveDialog();
}

// Fill the formation datalist with everything the member has: saved formations
// PLUS any formation name already used on a saved play (so the picker is complete).
async function fillFormationList() {
  const dl = ui.savedlg.querySelector('#pd-form-list'); if (!dl) return;
  const names = new Set();
  const f = await cloud.listFormations(); if (f.ok) f.rows.forEach((r) => names.add(r.name));
  const p = await cloud.listPlays(); if (p.ok) p.rows.forEach((r) => { if (r.formation_name) names.add(r.formation_name); });
  Object.keys(BUILTIN_FORMS).forEach((n) => names.add(n));
  dl.innerHTML = [...names].sort().map((n) => `<option value="${esc(n)}">`).join('');
}

function openSaveDialog() {
  const dlg = ui.savedlg;
  fillFormationList();
  const nameEl = dlg.querySelector('#pd-dlg-name'), formEl = dlg.querySelector('#pd-dlg-form');
  const errEl = dlg.querySelector('#pd-dlg-err');
  errEl.textContent = '';
  // Prefill the name ONLY when the play on the field is unchanged since it was last
  // saved/loaded (the Save button is in its "saved" state) — i.e. you're clearly
  // re-saving THIS play. If you've edited or started something new, blank it so a
  // new play never inherits the last one's name and quietly overwrites it.
  const unchanged = ui.saveBtn && ui.saveBtn.classList.contains('saved');
  nameEl.value = unchanged ? (currentPlayName || '') : '';
  formEl.value = getCurrentFormation().name || currentPlayFormation || '';
  dlg.classList.add('show');
  setTimeout(() => { (nameEl.value ? formEl : nameEl).focus(); }, 60);
}

async function doSaveFromDialog(nameEl, formEl, errEl, close) {
  const playName = (nameEl.value || '').trim() || 'Untitled play';
  const formName = (formEl.value || '').trim();
  const saveBtn = ui.savedlg.querySelector('#pd-dlg-save');
  saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; errEl.textContent = '';

  // Resolve the formation: exact name match (case-insensitive) LINKS to the
  // existing one; a new name CREATES a formation from the current alignment so it's
  // reusable and shows in the picker. Blank = no formation, just a loose play.
  let formation = { name: '', id: null };
  if (formName) {
    const list = await cloud.listFormations();
    const hit = list.ok && list.rows.find((r) => r.name.toLowerCase() === formName.toLowerCase());
    if (hit) formation = { name: hit.name, id: hit.id };
    else {
      const spec = currentFormationSpec();
      const res = await cloud.saveFormationCloud(formName, spec);
      formation = res.ok ? { name: res.name, id: res.id } : { name: formName, id: null };
      cloudForms[formName] = { id: formation.id, spec };   // keep the ‹ › clicker in sync
    }
  }

  setCurrentFormation(formation);

  // NEW-vs-UPDATE decided by identity (name + formation), NOT by lingering
  // currentId — otherwise a leftover currentId from your last save silently
  // overwrites that play when you save the next one. A play with the SAME name
  // under the SAME formation updates in place; anything else is a new play.
  const existing = await cloud.listPlays();
  const same = existing.ok && existing.rows.find((r) =>
    (r.name || '').toLowerCase() === playName.toLowerCase() &&
    (r.formation_name || '') === (formation.name || ''));
  cloud.setCurrentId(same ? same.id : null);

  const res = await cloud.savePlay(playName, playSpec.capture(playName), formation);
  saveBtn.disabled = false; saveBtn.textContent = 'Save play';
  if (!res.ok) {
    errEl.textContent = res.reason === 'noschema'
      ? 'Run supabase-setup.sql first — the plays table is missing.'
      : (res.reason === 'auth' ? '' : 'Couldn’t reach your library — try again.');
    if (res.reason === 'auth') close();
    return;
  }
  currentPlayName = playName; currentPlayFormation = formation.name;
  try { localStorage.setItem('pd_playname', playName); } catch {}
  setSaveState('saved');
  snapshotLoaded(res.id, playName, formation);   // this saved play is now the baseline
  updateEditsPanel();
  if (ui.savedAs) ui.savedAs.textContent = formation.name ? `“${playName}” · ${formation.name}` : `“${playName}”`;
  cloud.toast('Play saved');
  close();
}

// The current alignment as a formation spec (LOS- & hash-relative; SNAP_X re-added
// on load). Was inline in the old saveFormation(); shared now.
function currentFormationSpec() {
  return off.players.map((p) => ({ type: p.type, x: +(p.x - SNAP_X).toFixed(1), z: +(p.z - LOS_Z).toFixed(1) }));
}

/* ---------------------- EDIT A SAVED PLAY ----------------------
   Once a saved play is on the field (loaded from My Plays, or just saved), any
   change to it surfaces an "Unsaved edits" panel — what changed, plus one button
   to write it back over THAT play. So fixing a mistake updates the play instead of
   forcing a second copy. Mirrors the defense "your changes" list. */
let loadedSnapshot = null;   // { id, name, formation:{name,id}, spec:JSON } — the saved play on the field

function snapshotLoaded(id, name, formation) {
  try { loadedSnapshot = { id, name: name || '', formation: formation || { name: '', id: null }, spec: JSON.stringify(playSpec.capture(name)) }; }
  catch { loadedSnapshot = null; }
}
function clearLoadedSnapshot() { loadedSnapshot = null; updateEditsPanel(); }

// Plain-English list of what differs between two play specs. Deliberately coarse —
// "Moved WR", "Changed the coverage" — not a field-by-field audit.
function describeEdits(a, b) {
  const out = [];
  const A = new Map((a.players || []).map((p) => [p.id, p]));
  const B = new Map((b.players || []).map((p) => [p.id, p]));
  for (const [id, p] of A) if (!B.has(id)) out.push('Removed ' + p.type);
  for (const [id, p] of B) if (!A.has(id)) out.push('Added ' + p.type);
  for (const [id, pb] of B) {
    const pa = A.get(id); if (!pa) continue;
    if (pa.type !== pb.type) out.push('Changed a player to ' + pb.type);
    if (Math.abs((pa.x || 0) - (pb.x || 0)) > 0.4 || Math.abs((pa.z || 0) - (pb.z || 0)) > 0.4) out.push('Moved ' + pb.type);
    if ((pa.routeId || '') !== (pb.routeId || '') || JSON.stringify(pa.wp || []) !== JSON.stringify(pb.wp || [])) out.push('Changed ' + pb.type + '’s route');
    if ((pa.read || 0) !== (pb.read || 0)) out.push('Changed the read order');
  }
  if ((a.playType || 'pass') !== (b.playType || 'pass')) out.push('Switched to ' + (b.playType === 'run' ? 'a run' : 'a pass'));
  const ad = a.defense || {}, bd = b.defense || {};
  if ((ad.coverage || '') !== (bd.coverage || '')) out.push('Changed the coverage');
  if (JSON.stringify(ad.man || []) !== JSON.stringify(bd.man || []) ||
      JSON.stringify(ad.aligns || {}) !== JSON.stringify(bd.aligns || {}) ||
      JSON.stringify(ad.react || []) !== JSON.stringify(bd.react || []) ||
      JSON.stringify(ad.sepByRec || {}) !== JSON.stringify(bd.sepByRec || {})) out.push('Changed the defense');
  return [...new Set(out)];
}

// Paint the edits state into whichever "This play" blocks exist right now — the
// Setup one AND the Your-Plays mirror (which is rebuilt when that tab opens).
function updateEditsPanel() {
  let cur = null;
  const edits = loadedSnapshot ? (() => { try { cur = playSpec.capture(); return describeEdits(JSON.parse(loadedSnapshot.spec), cur); } catch { return []; } })() : [];
  const listHTML = edits.slice(0, 5).map((e) => `<span class="pd-mod">${esc(e)}</span>`).join('') +
    (edits.length > 5 ? `<span class="pd-mods-none">+${edits.length - 5} more</span>` : '');
  for (const box of [ui && ui.editsBox, document.getElementById('pd-plays-edits')]) {
    if (!box) continue;
    if (!loadedSnapshot || !edits.length) { box.hidden = true; continue; }
    box.hidden = false;
    box.querySelector('.pd-edits-name').textContent = loadedSnapshot.name || 'this play';
    box.querySelector('.pd-edits-list').innerHTML = listHTML;
  }
  // mirror the "saved as" line into the Your-Plays header too
  const psa = document.getElementById('pd-plays-savedas');
  if (psa && ui && ui.savedAs) psa.textContent = ui.savedAs.textContent;
}

// Save the current edits back over the loaded play — shared by the Setup button
// and the Your-Plays button.
async function saveLoadedEdits() {
  if (!loadedSnapshot) return;
  if (!memberGate()) return;
  const btns = [ui.saveEditsBtn, document.getElementById('pd-plays-saveedits')].filter(Boolean);
  btns.forEach((b) => { b.disabled = true; b.textContent = 'Saving…'; });
  cloud.setCurrentId(loadedSnapshot.id);   // overwrite THIS play, not a new one
  const res = await cloud.savePlay(loadedSnapshot.name, playSpec.capture(loadedSnapshot.name), loadedSnapshot.formation);
  btns.forEach((b) => { b.disabled = false; b.textContent = 'Save these edits'; });
  if (!res.ok) { cloud.toast('Couldn’t save those edits — try again'); return; }
  snapshotLoaded(res.id, loadedSnapshot.name, loadedSnapshot.formation);   // clean baseline again
  currentPlayName = loadedSnapshot.name; currentPlayFormation = loadedSnapshot.formation.name;
  setSaveState('saved'); updateEditsPanel();
  cloud.toast('Edits saved to “' + loadedSnapshot.name + '”');
  flash('Saved edits to “' + loadedSnapshot.name + '”');
}

function wireSaveEdits() {
  if (ui.saveEditsBtn) ui.saveEditsBtn.onclick = saveLoadedEdits;
}

/* ---------------------- EXPORT ----------------------
   Video: hide the chrome, reset, record while the play runs, restore. The UI has
   to go or it'd be baked into the clip — that's what H already does, so we reuse it.
   Image: the current frame, composited into a play card. */
function wireExport() {
  const canvas = renderer.domElement;
  const vidNote = document.getElementById('pd-x-vid'), pngNote = document.getElementById('pd-x-png');
  const target = document.getElementById('pd-x-target');

  // Two-step on purpose. Export used to fire the instant you clicked, with no word
  // about where the file went — and a recording had no way to say WHO catches the
  // ball, so every clip was whatever the auto-throw picked.
  const openNote = (which) => {
    vidNote.hidden = which !== 'vid'; pngNote.hidden = which !== 'png';
    ui.vidBtn.classList.toggle('on', which === 'vid');
    ui.pngBtn.classList.toggle('on', which === 'png');
    if (which === 'vid') fillTargets();
  };
  ui.vidBtn.onclick = () => openNote(vidNote.hidden ? 'vid' : null);
  ui.pngBtn.onclick = () => openNote(pngNote.hidden ? 'png' : null);

  // Who the QB throws to. "Auto" = the play's own logic (money read when the routes
  // finish), which is what it did before; picking a name forces that target.
  function fillTargets() {
    const prev = target.value;
    const opts = ['<option value="auto">The money read (whoever’s open)</option>'];
    off.players
      .filter((p) => p.routeId || (p.wp && p.wp.length))
      .forEach((p) => {
        const rank = p.read ? ['', '1st', '2nd', '3rd', '4th', 'check-down'][p.read] : '';
        opts.push(`<option value="${p.id}">${p.type}${rank ? ' — ' + rank + ' read' : ''}</option>`);
      });
    target.innerHTML = opts.join('');
    if (prev && [...target.options].some((o) => o.value === prev)) target.value = prev;
  }

  document.getElementById('pd-x-vid-go').onclick = async () => {
    if (!xport.videoSupported()) { cloud.toast('This browser can’t record video — try Chrome'); return; }
    if (!playSpec.hasRoutes()) { cloud.toast('Draw a route first, then export'); return; }
    const go = document.getElementById('pd-x-vid-go');
    const pick = target.value;
    const wasHidden = document.body.classList.contains('ui-hidden');
    const openPanel = dock.getOpen();
    go.classList.add('busy'); go.textContent = '● Recording…';
    dock.close(); setUIHidden(true);
    resetRun();
    await new Promise((r) => setTimeout(r, 400));   // let the chrome finish fading out
    runPlay();
    // force the chosen target ~72% through, while the routes are still developing
    let throwT = null;
    if (pick && pick !== 'auto') throwT = setTimeout(() => throwTo(pick), off.playDur * 720);
    const dur = (off.playDur + 2.6) * 1000;         // the play, plus a beat on the catch
    const res = await xport.recordPlay({ canvas, durationMs: dur, onTick: (p) => { go.textContent = '● ' + Math.round(p * 100) + '%'; } });
    if (throwT) clearTimeout(throwT);
    if (!wasHidden) setUIHidden(false);
    if (openPanel) dock.open(openPanel);
    go.classList.remove('busy'); go.textContent = '● Start recording';
    if (!res.ok) { cloud.toast('Couldn’t record that — try again'); return; }
    xport.download(res.blob, xport.safeName(currentPlayName) + '.' + res.ext);
    cloud.toast('Video saved to your Downloads');
  };

  document.getElementById('pd-x-png-go').onclick = async () => {
    const go = document.getElementById('pd-x-png-go');
    const wasHidden = document.body.classList.contains('ui-hidden');
    const openPanel = dock.getOpen();
    go.classList.add('busy');
    dock.close(); setUIHidden(true);
    await new Promise((r) => setTimeout(r, 260));   // let the chrome clear the frame
    const res = await xport.playCard({
      canvas, name: currentPlayName || 'Untitled play',
      formation: getCurrentFormation().name, crestUrl: 'assets/sk-logo.png',
    });
    if (!wasHidden) setUIHidden(false);
    if (openPanel) dock.open(openPanel);
    go.classList.remove('busy');
    if (!res.ok) { cloud.toast('Couldn’t make that image — try again'); return; }
    xport.download(res.blob, xport.safeName(currentPlayName) + '.' + res.ext);
    cloud.toast('Image saved to your Downloads');
  };
}

/* ---------------------- PLAYS TAB ----------------------
   Your saved plays live in their own dock tab now (not a buried button). Members
   see them grouped by formation; everyone else gets the Join pitch RIGHT HERE,
   which is the natural upgrade moment. Renders on tab-open and on sign-in. */
// The CFB home page — members land in; non-members get Squarespace's join gate.
// Opens in a NEW TAB so they never lose the play they were drawing.
const MEMBERSHIP_URL = 'https://www.schemekings.com/the-coaching-coordinator';

function wireMyPlays() {
  const body = ui.playsBody;
  dock.onOpen((tab) => { if (tab === 'plays') renderMyPlays(); });
  cloud.onAuth(() => { if (dock.getOpen() === 'plays') renderMyPlays(); });

  body.onclick = async (e) => {
    if (e.target.closest('#pd-join-signin')) { await cloud.requireLogin('see your plays'); renderMyPlays(); return; }
    const head = e.target.closest('[data-toggle]');
    if (head) { head.closest('.pd-fgroup').classList.toggle('collapsed'); return; }
    const open = e.target.closest('[data-open]'), del = e.target.closest('[data-del]');
    if (open) {
      const row = await cloud.loadPlay(open.dataset.open);
      if (!row) { cloud.toast('Couldn’t open that play'); return; }
      if (!playSpec.apply(row.spec)) { cloud.toast('That play couldn’t be read'); return; }
      cloud.setCurrentId(row.id);
      currentPlayName = row.name || '';
      currentPlayFormation = row.formation_name || '';
      try { localStorage.setItem('pd_playname', currentPlayName); } catch {}
      snapshotLoaded(row.id, row.name, { name: row.formation_name || '', id: row.formation_id || null });
      resetRun(); refresh(); save();
      undo.reset();
      setSaveState('saved');
      updateEditsPanel();
      if (ui.savedAs) ui.savedAs.textContent = currentPlayFormation ? `“${currentPlayName}” · ${currentPlayFormation}` : `“${currentPlayName}”`;
      dock.close();                     // show the loaded play on the field
      flash('Opened “' + (row.name || 'Untitled play') + '”');
      return;
    }
    if (del) {
      const row = del.closest('.pd-play-row');
      const nm = row.querySelector('.pd-play-name').textContent;
      if (!confirm(`Delete “${nm}”? This can’t be undone.`)) return;
      if (await cloud.deletePlay(del.dataset.del)) {
        const grp = row.closest('.pd-fgroup'); row.remove();
        if (grp && !grp.querySelector('.pd-play-row')) grp.remove();
        cloud.toast('Play deleted');
        if (!body.querySelector('.pd-play-row')) renderMyPlays();
      } else cloud.toast('Couldn’t delete that play');
    }
  };
}

// upsell for a non-member — the whole reason the free tool exists
function joinUpsellHTML() {
  return `<div class="pd-join">
    <img class="pd-join-crest" src="assets/sk-logo.png" alt="">
    <div class="pd-join-title">This is where your plays live</div>
    <p class="pd-join-sub">Drawing, running and throwing is <b>free — always.</b> Saving is what a Scheme Kings membership adds: every play you build gets its own home right here.</p>
    <ul class="pd-join-list">
      <li><b>Build your own library</b> — save a play and it's filed under its formation, ready to pull back up in one click.</li>
      <li><b>It follows you</b> — your plays wait for you on any computer you sign in from.</li>
      <li><b>Keep tinkering</b> — reopen a saved play, tweak it, and save the edits over it.</li>
      <li><b>Share a link</b> — send anyone a play that runs on the real stadium, no account needed.</li>
    </ul>
    <a class="pd-btn go full" href="${MEMBERSHIP_URL}" target="_blank" rel="noopener">Join Scheme Kings to save</a>
    <button class="pd-btn full" id="pd-join-signin">Already a member? Sign in</button>
  </div>`;
}

async function renderMyPlays() {
  const body = ui.playsBody; if (!body) return;
  if (!cloud.canSave()) { body.innerHTML = joinUpsellHTML(); return; }   // not a member → pitch
  body.innerHTML = `<div class="pd-plays-msg">Loading your plays…</div>`;
  const res = await cloud.listPlays();
  if (!res.ok) {
    if (res.reason === 'auth') { body.innerHTML = joinUpsellHTML(); return; }
    body.innerHTML = `<div class="pd-plays-msg">${res.reason === 'noschema'
      ? 'The plays table doesn’t exist yet — run <b>supabase-setup.sql</b> in Supabase.'
      : 'Couldn’t reach your account. Check your connection and try again.'}</div>`;
    return;
  }
  // GROUP BY FORMATION: a collapsible section per formation; click a play to load.
  const groups = {};
  for (const r of res.rows) { const k = r.formation_name || '—'; (groups[k] = groups[k] || []).push(r); }
  const names = Object.keys(groups).sort((a, b) => (a === '—' ? 1 : b === '—' ? -1 : a.localeCompare(b)));
  const listHTML = res.rows.length ? names.map((fn) => `
    <div class="pd-fgroup" data-form="${esc(fn)}">
      <button class="pd-fhead" data-toggle="${esc(fn)}"><span class="pd-farrow">▾</span>
        <span class="pd-fname">${fn === '—' ? 'No formation' : esc(fn)}</span>
        <span class="pd-fcount">${groups[fn].length}</span></button>
      <div class="pd-fplays">${groups[fn].map((r) => `
        <div class="pd-play-row" data-id="${r.id}">
          <button class="pd-play-open" data-open="${r.id}">
            <span class="pd-play-name">${esc(r.name)}</span>
            <span class="pd-play-meta">${when(r.updated_at)}${r.is_public ? ' · shared' : ''}</span>
          </button>
          <button class="pd-btn danger pd-play-del" data-del="${r.id}" title="Delete this play" aria-label="Delete ${esc(r.name)}">✕</button>
        </div>`).join('')}</div>
    </div>`).join('')
    : `<div class="pd-plays-msg"><b>No saved plays yet.</b><br>Save the play you're drawing and it'll show up here — sorted by formation.</div>`;

  // The save controls live HERE too (Reggie), so a member can save / update
  // without leaving the Your Plays tab. Same handlers as Setup.
  body.innerHTML = `
    <div class="pd-plays-save">
      <span class="pd-group-cap">This play</span>
      <button id="pd-plays-saveplay" class="pd-btn go full">
        <svg class="pd-save-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>
        Save play
      </button>
      <span class="pd-savedas" id="pd-plays-savedas"></span>
      <div class="pd-edits" id="pd-plays-edits" hidden>
        <span class="pd-edits-cap">Unsaved edits to “<b class="pd-edits-name"></b>”</span>
        <div class="pd-edits-list pd-mods"></div>
        <button id="pd-plays-saveedits" class="pd-btn go full">Save these edits</button>
      </div>
    </div>
    <span class="pd-group-cap pd-plays-listcap">Saved plays</span>
    <div class="pd-plays-listwrap">${listHTML}</div>`;
  body.querySelector('#pd-plays-saveplay').onclick = triggerSaveDialog;
  body.querySelector('#pd-plays-saveedits').onclick = saveLoadedEdits;
  updateEditsPanel();   // fill the mirror with any current unsaved-edits state
}

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function when(iso) {
  const t = new Date(iso).getTime(); if (!t) return '';
  const m = Math.floor((Date.now() - t) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  if (m < 1440) return Math.floor(m / 60) + 'h ago';
  if (m < 10080) return Math.floor(m / 1440) + 'd ago';
  return new Date(t).toLocaleDateString();
}

/* ---------------------- SHARE ----------------------
   Flip the play public and copy a link. You must save first — there's nothing to
   point at otherwise. */
function wireShare() {
  ui.shareBtn.onclick = async () => {
    if (!cloud.getCurrentId()) { cloud.toast('Save the play first, then share it'); flash('Save the play before sharing'); return; }
    ui.shareBtn.classList.add('busy');
    const res = await cloud.sharePlay(cloud.getCurrentId());
    ui.shareBtn.classList.remove('busy');
    if (!res.ok) { cloud.toast('Couldn’t create a link — try again'); return; }
    let copied = false;
    try { await navigator.clipboard.writeText(res.url); copied = true; } catch {}
    showShareBox(res.url, copied);
  };
}

function showShareBox(url, copied) {
  const old = document.getElementById('pd-sharebox'); if (old) old.remove();
  const box = document.createElement('div');
  box.id = 'pd-sharebox'; box.className = 'pd-sharebox pd-patch';
  box.innerHTML = `
    <div class="pd-sharebox-head">${copied ? 'Link copied — anyone with it can watch this play' : 'Anyone with this link can watch this play'}</div>
    <input class="pd-sharebox-url" readonly value="${esc(url)}" aria-label="Share link">
    <div class="pd-sharebox-btns">
      <button class="pd-btn go" data-copy>Copy link</button>
      <button class="pd-btn" data-close>Done</button>
    </div>`;
  document.body.appendChild(box);
  const input = box.querySelector('.pd-sharebox-url');
  input.focus(); input.select();
  box.querySelector('[data-copy]').onclick = async () => {
    input.select();
    try { await navigator.clipboard.writeText(url); cloud.toast('Link copied'); } catch { document.execCommand('copy'); }
  };
  box.querySelector('[data-close]').onclick = () => box.remove();
}

/* ---------------------- UNDO ---------------------- */
function wireUndo() {
  ui.undoBtn.onclick = () => { if (!undo.undo()) return; afterUndo(); };
  ui.redoBtn.onclick = () => { if (!undo.redo()) return; afterUndo(); };
  undo.onUndo((can, canR) => { ui.undoBtn.disabled = !can; ui.redoBtn.disabled = !canR; });
  window.addEventListener('keydown', (e) => {
    if (isTyping(e)) return;
    const meta = e.ctrlKey || e.metaKey; if (!meta) return;
    const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); if (undo.undo()) afterUndo(); }
    else if ((k === 'z' && e.shiftKey) || k === 'y') { e.preventDefault(); if (undo.redo()) afterUndo(); }
  });
}
function afterUndo() {
  resetRun(); refresh(); syncDefense(); showZones();
  refreshFormationUI(); markUnsaved();
  try { localStorage.setItem('pd_play', JSON.stringify({ players: off.players.map((p) => ({ ...p })), formation: currentForm })); } catch {}
}

/* ---------------------- FIRST RUN ----------------------
   A new user lands on a stadium with five chips and no idea the route tray comes
   from clicking one. One coach-mark, dismissed forever the moment they do it. */
function wireFirstRun() {
  let seen = true;
  try { seen = localStorage.getItem('pd_seen') === '1'; } catch {}
  if (seen) return;
  const tip = document.createElement('div');
  tip.className = 'pd-coach'; tip.id = 'pd-coach';
  tip.innerHTML = `
    <div class="pd-coach-step"><b>1</b> Click a receiver on the field</div>
    <div class="pd-coach-step"><b>2</b> Pick his route from the tray below</div>
    <div class="pd-coach-step"><b>3</b> Hit <span class="pd-coach-run">▶ RUN</span> and watch it live</div>
    <button class="pd-coach-x" aria-label="Dismiss">Got it</button>`;
  document.body.appendChild(tip);
  const kill = () => { tip.classList.add('gone'); setTimeout(() => tip.remove(), 260); try { localStorage.setItem('pd_seen', '1'); } catch {} };
  tip.querySelector('.pd-coach-x').onclick = kill;
  dismissCoach = kill;
}
let dismissCoach = null;

// The single gate. When membership gating lands, canSave() in core/cloud.js is the
// only thing that changes — this already reflects it.
function refreshSaveAvailability() {
  // `no-save` marks the free / signed-out state: the save buttons stay CLICKABLE
  // (clicking them opens the membership pitch) but read as locked, not broken.
  const gated = !cloud.canSave();
  document.body.classList.toggle('no-save', gated);
  const btn = ui && ui.saveBtn; if (!btn) return;
  const usable = cloud.saveIsAvailable();
  // never truly disable when gated — a disabled button can't route to the pitch
  btn.disabled = !usable && !gated;
  btn.title = gated ? 'Saving is a members-only feature — tap to see what it unlocks'
            : usable ? 'Save this play to your Scheme Kings account'
            : 'Saving is unavailable right now';
}

function setSaveState(s) {
  const btn = ui && ui.saveBtn; if (!btn) return;
  const tx = btn.querySelector('.pd-save-tx');
  btn.classList.toggle('busy', s === 'busy');
  btn.classList.toggle('saved', s === 'saved');
  if (tx) tx.textContent = s === 'busy' ? 'Saving…' : s === 'saved' ? 'Saved' : 'Save play';
}

// any edit invalidates a "Saved" badge — the button must never lie
export function markUnsaved() {
  const btn = ui && ui.saveBtn;
  if (btn && btn.classList.contains('saved')) setSaveState('idle');
}

// hide/show the whole control layer (for clean screen-recording); when hidden a
// small fading toast reminds you that H brings it back
// mobile/TikTok preview: reshape the SAME canvas to a 9:16 column (or its bottom
// third for compositing under real footage). Just a reframing — one scene, one camera.
export function setStage(mode) {
  document.body.classList.remove('stage-phone', 'stage-phone-bottom');
  if (mode === 'phone') document.body.classList.add('stage-phone');
  else if (mode === 'phonebottom') document.body.classList.add('stage-phone-bottom');
  // relayout the renderer, camera aspect, and the post-processing targets to the new box
  window.dispatchEvent(new Event('resize'));
}

// full-screen toggle for the whole page (so the canvas fills the screen for recording)
function toggleFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement) { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el); }
  else { (document.exitFullscreen || document.webkitExitFullscreen)?.call(document); }
}

function setUIHidden(hidden, quiet) {
  document.body.classList.toggle('ui-hidden', hidden);
  clearTimeout(ui._revealT);
  if (hidden && !quiet) { ui.reveal.classList.add('show'); ui._revealT = setTimeout(() => ui.reveal.classList.remove('show'), 2600); }
  else { ui.reveal.classList.remove('show'); }
}

// transport button labels + reset/scrub visibility reflect the play state
function updateTransport() {
  if (!ui.runBtn) return;
  updateThrowPanel();   // the throw targets only exist while the ball is live
  setHint();            // and the status line follows the play, not the last thing that happened
  let label = '▶ RUN';
  if (off.running) {
    if (off.thrown) label = '✓ THROWN';
    else if (off.playT >= off.playDur) label = '↻ REPLAY';
    else if (off.paused) label = '▶ RESUME';
    else label = '❚❚ PAUSE';
  }
  ui.runBtn.textContent = label;
  ui.runBtn.classList.toggle('on', off.running && !off.paused && !off.thrown && off.playT < off.playDur);
  ui.resetBtn.style.display = off.running ? '' : 'none';
}
function showScrub(on) { if (ui.scrub) ui.scrub.classList.toggle('show', on); if (on) updateScrub(); }
function updateScrub() {
  if (!ui.scrub || !ui.scrub.classList.contains('show')) return;
  const frac = off.playDur ? off.playT / off.playDur : 0;
  ui.scrubRange.value = Math.round(frac * 1000);
  ui.scrubTime.textContent = off.playT.toFixed(1) + 's';
}
// The routes used to be a 22-card horizontal carousel with ‹ › pagers and three
// duplicated copies faking an infinite loop — you had to page to find a route you
// could already name. In the side panel they're just a GRID: every route visible
// at once, one copy, no pager, no wrap maths.
function renderTray() {
  const activeId = off.selId ? sel()?.routeId : null;
  const cardsHTML = ROUTES.map((r) => `<button class="pd-card ${activeId === r.id ? 'on' : ''}" data-route="${r.id}" title="${r.label}">${routeSVG(r, '#1f6ef2')}<span>${r.label}</span></button>`).join('');
  // DRAW CUSTOM leads, full width, above the library. Picking from 22 presets is
  // the common case, but drawing your own is the thing people actually want to try
  // — it shouldn't be a small button buried under the grid.
  ui.tray.innerHTML = `
    <div class="pd-group">
      <span class="pd-group-cap">Route</span>
      <button class="pd-btn pd-drawcustom" id="pd-draw-custom" title="Click your own path on the field">
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        <span class="pd-drawcustom-tx">Draw custom route</span>
      </button>
      <div class="pd-cards" id="pd-cards">${cardsHTML}</div>
    </div>
    <div class="pd-group">
      <div class="pd-tray-stem" id="pd-tray-stem" title="Make the route deeper or shorter">
        <span class="pd-tray-side-cap">Stem</span>
        <input type="range" id="pd-stem-range" min="-4" max="12" step="1" value="0" aria-label="Stem route depth">
        <span class="pd-stem-num" id="pd-stem-num">0</span>
      </div>
    </div>`;
  const cards = ui.tray.querySelector('#pd-cards');
  const drawBtn = ui.tray.querySelector('#pd-draw-custom');
  drawBtn.classList.toggle('on', !!off.drawing);
  drawBtn.querySelector('.pd-drawcustom-tx').textContent = off.drawing ? 'Click the field… (Enter to finish)' : 'Draw custom route';
  drawBtn.onclick = () => {
    const p = sel(); if (!p) { flash('Select a receiver first.'); return; }
    off.drawing = !off.drawing; if (off.drawing) { p.wp = []; p.routeId = null; p.stem = 0; }
    refresh(); save();
  };
  // stem slider — live-updates the selected receiver's route depth
  const slider = ui.tray.querySelector('#pd-stem-range'), stemNum = ui.tray.querySelector('#pd-stem-num');
  slider.oninput = () => { const p = sel(); if (!p) return; p.stem = +slider.value; stemNum.textContent = (p.stem > 0 ? '+' : '') + p.stem; refresh(); };
  slider.onchange = () => save();
  cards.querySelectorAll('.pd-card').forEach((card) => {
    card.onclick = () => {
      const p = sel(); if (!p) { flash('Select a receiver first, then pick his route.'); return; }
      const r = getRoute(card.dataset.route), g = r.gen(p);
      p.wp = g.wp; p.rounded = g.rounded; p.routeId = r.id; p.stem = 0; off.drawing = false;
      if (dismissCoach) { dismissCoach(); dismissCoach = null; }   // they've got it — retire the coach-mark
      refresh(); save();
    };
  });
}
let lastSelId = null;
function updatePanel() {
  refreshManPanel();   // rebuild the MAN per-player separation dials
  refreshDefPanel();   // and the list of what you've changed about the defense
  const p = sel(); if (!ui.panel) return;
  // Picking a receiver jumps to Offense so his routes are right there — the most
  // frequent action in the tool shouldn't cost an extra click. Only on a CHANGE of
  // selection, though: forcing it every refresh would yank you out of Defense
  // every time anything re-rendered.
  if (p && p.id !== lastSelId && dock.getOpen() !== 'offense') dock.open('offense');
  lastSelId = p ? p.id : null;
  if (!p) { ui.panel.classList.remove('show'); renderTrayActive(); return; }
  ui.panel.classList.add('show');
  // Docked ABOVE the route tray and laid out as a row: who's selected → what he is
  // → when he's read → remove. Same controls as the old floating panel; it just sits
  // where you're already looking when you pick a route, instead of over the field.
  ui.panel.innerHTML = `
    <div class="pd-ph"><span class="pd-ph-title">${p.type}${p.read === 1 ? ' ♛' : ''}</span><span class="pd-ph-route">${p.routeId ? p.routeId.toUpperCase() : (p.wp.length ? 'CUSTOM' : 'NO ROUTE')}</span></div>
    <div class="pd-dockgrp">
      <span class="pd-row-label">POSITION</span>
      <div class="pd-seg" id="pd-type">${TYPES.map((t) => `<button data-type="${t}" class="${p.type === t ? 'on' : ''}">${t}</button>`).join('')}</div>
    </div>
    <div class="pd-dockgrp">
      <span class="pd-row-label">READ ORDER</span>
      <div class="pd-seg" id="pd-read">${[[1, '1ST'], [2, '2ND'], [3, '3RD'], [4, '4TH'], [5, 'CK']].map(([r, l]) => `<button data-read="${r}" class="${(p.read || 0) === r ? 'on' : ''}">${l}</button>`).join('')}</div>
    </div>
    <div class="pd-actions">
      <button class="pd-btn" data-a="clearroute">Clear route</button>
      <button class="pd-btn danger" data-a="del">✕ Remove</button>
    </div>`;
  ui.panel.querySelector('#pd-type').onclick = (e) => { const b = e.target.closest('[data-type]'); if (!b) return; p.type = b.dataset.type; refresh(); save(); };
  ui.panel.querySelector('#pd-read').onclick = (e) => {
    const b = e.target.closest('[data-read]'); if (!b) return; const r = +b.dataset.read;
    if ((p.read || 0) === r) p.read = 0;                                   // click the active rank → clear
    else { off.players.forEach((q) => { if (q !== p && q.read === r) q.read = 0; }); p.read = r; }   // ranks are unique
    refresh(); save();
  };
  ui.panel.onclick = (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a;
    if (a === 'draw') { off.drawing = !off.drawing; if (off.drawing) { p.wp = []; p.routeId = null; p.stem = 0; } }
    else if (a === 'stem+') p.stem = Math.min(10, (p.stem || 0) + 1);
    else if (a === 'stem-') p.stem = Math.max(-4, (p.stem || 0) - 1);
    else if (a === 'clearroute') { p.wp = []; p.routeId = null; p.stem = 0; off.drawing = false; }
    else if (a === 'del') delPlayer(p.id);
    refresh(); save();
  };
  renderTrayActive();
}
function renderTrayActive() {
  if (!ui.tray) return;
  const p = sel(), activeId = p ? p.routeId : null;
  ui.tray.querySelectorAll('.pd-card').forEach((c) => c.classList.toggle('on', c.dataset.route === activeId));
  const draw = ui.tray.querySelector('#pd-draw-custom');
  const slider = ui.tray.querySelector('#pd-stem-range'), stemNum = ui.tray.querySelector('#pd-stem-num');
  // Write the LABEL only — setting textContent on the button would wipe out its
  // icon along with the text.
  if (draw) {
    draw.classList.toggle('on', off.drawing && !!p);
    const tx = draw.querySelector('.pd-drawcustom-tx');
    if (tx) tx.textContent = (off.drawing && p) ? 'Click the field… (Enter to finish)' : 'Draw custom route';
    draw.disabled = !p;
    draw.title = p ? 'Click your own path on the field' : 'Select a receiver first';
  }
  if (slider) {
    slider.disabled = !p;
    const v = p ? (p.stem || 0) : 0;
    if (document.activeElement !== slider) slider.value = v;   // don't fight an active drag
    if (stemNum) stemNum.textContent = (v > 0 ? '+' : '') + v;
  }
}
let flashT, flashing = false;
/* THROW TO — the ball had no visible control at all. It was a keyboard shortcut
   nobody could guess and a click on the field nobody knew about, explained by one
   line of shorthand ("1/2/3/4·Q·T"). Now the receivers you can throw to are actual
   buttons, in read order, each showing its key. The keys and the click still work;
   they're just no longer the ONLY way to find out. */
function rebuildThrowBtns() {
  const box = document.getElementById('pd-throw-btns'); if (!box) return;
  const list = off.players
    .filter((p) => p.routeId || (p.wp && p.wp.length))
    .sort((a, b) => (a.read || 9) - (b.read || 9));
  box.innerHTML = list.length
    ? list.map((p) => {
        const key = p.read >= 1 && p.read <= 4 ? String(p.read) : (p.read === 5 ? 'Q' : '');
        return `<button class="pd-btn pd-throw-btn${p.read === 1 ? ' money' : ''}" data-throw="${p.id}" title="Throw to this ${p.type}">
          ${key ? `<b class="pd-throw-key">${key}</b>` : ''}<span>${p.type}${p.read ? ' · ' + (READ_TEXT[p.read] || '') : ''}</span></button>`;
      }).join('')
    : '<span class="pd-throw-none">Nobody has a route yet.</span>';
}
function updateThrowPanel() {
  const box = document.getElementById('pd-throw'); if (!box) return;
  const live = !!off.running && !off.thrown;
  if (live && box.hidden) rebuildThrowBtns();   // the roster can't change mid-play
  box.hidden = !live;
}

// Plain English, and it changes with what's actually happening. The old line was
// one static string of shorthand that read the same before the snap as mid-play.
function setHint() {
  const h = ui.hint; if (!h) return;
  if (flashing) return;   // a flash() message owns the line until it expires
  h.classList.toggle('throw', off.running && !off.thrown);
  const hasRoutes = off.players.some((p) => p.routeId || (p.wp && p.wp.length));
  if (off.caught) h.textContent = 'Caught! Hit Reset to run it again.';
  else if (off.thrown) h.textContent = 'Ball’s in the air…';
  else if (off.running && off.paused) h.textContent = 'Paused. Throw it below, or drag the Play slider.';
  else if (off.running && off.playT >= off.playDur) h.textContent = 'Routes are done — throw it below, or hit Replay.';
  else if (off.running) h.textContent = 'Throw it! Click any receiver on the field, or pick one below.';
  else if (off.drawing) h.textContent = 'Click the field to draw his path. Press Enter when you’re done.';
  else if (!hasRoutes) h.textContent = 'Click a receiver on the field, then give him a route.';
  else h.textContent = 'Hit Run to watch it live. H hides the controls.';
}
function flash(msg) {
  const h = ui.hint; if (!h) return;
  flashing = true; h.textContent = msg;
  clearTimeout(flashT);
  flashT = setTimeout(() => { flashing = false; setHint(); }, 1900);
}
// list the defender→receiver reactions in the Defense panel (no on-field indicator)
function recLabel(id) { const p = off.players.find((q) => q.id === id); if (!p) return '?'; return p.type + (p.read ? ' ' + (READ_TEXT[p.read] || '') : ''); }
// Assignment feedback belongs UNDER the Defense panel, next to the reset that
// undoes it — not flashed into a corner of the screen where it's already gone by
// the time you look for it.
function updateReactPanel() { refreshDefPanel(); }

/* ============================== filming-rig hooks ==============================
   Accessors so the camera-preset library + read-sequence player can frame the
   QB / ball / a target receiver and resolve a read's `throwTo` reference. */
export function getQBPos() { return qbMesh ? qbMesh.position.clone() : new THREE.Vector3(0, 1.5, LOS_Z - 5); }
export function getBallPos() { return ballMesh ? ballMesh.position.clone() : new THREE.Vector3(0, 1, LOS_Z); }
export function getReceiverPos(id) {
  const m = chipMeshes.get(id);
  return m ? new THREE.Vector3(m.position.x, 1.4, m.position.z) : null;
}
// where this receiver's route ENDS (the catch point) — world coords. Used by
// defender adjustments so a trailing defender keys the route, not the pre-snap spot.
export function getRouteEnd(id) {
  const r = routeMeshes.get(id);
  if (r && r.dense && r.dense.length) { const e = r.dense[r.dense.length - 1]; return new THREE.Vector3(e.x, 1.4, e.z); }
  return getReceiverPos(id);
}
export function getActionCentroid() { const c = actionCentroid(); return new THREE.Vector3(c.x, 2, c.z); }
export function getThrowDir() { return throwDir.clone(); }
export function isThrown() { return off.thrown; }
export function isCaught() { return !!off.caught; }   // ball has LANDED on the receiver → cameras slow-push in on him
export function getPlayDur() { return off.playDur; }
// the ball carrier (the receiver the throw went to) — world pos at chest height. null pre-throw.
export function getTargetPos() {
  const p = off.players.find((x) => x.isTarget);
  if (!p) return null;
  const m = chipMeshes.get(p.id);
  return m ? new THREE.Vector3(m.position.x, 1.4, m.position.z) : null;
}
// EXPLICIT camera target — set by the "Track" dropdown in the View panel. When a
// player is picked there, BOTH the Receiver POV and Follow shots lock onto him,
// overriding the read-order guess below. null = fall back to the auto pick.
let camTargetId = null;
export function setCamTarget(id) { camTargetId = (id && chipMeshes.get(id)) ? id : null; }
export function getCamTarget() { return (camTargetId && chipMeshes.get(camTargetId)) ? camTargetId : null; }
// id of the receiver the reverse-POV camera should track: the explicit pick, else
// the #1 read (money read), else the lowest assigned read, else null.
export function getReverseTargetId() {
  if (camTargetId && chipMeshes.get(camTargetId)) return camTargetId;
  const p1 = off.players.find((p) => (p.read || 0) === 1 && chipMeshes.get(p.id));
  if (p1) return p1.id;
  let best = null;
  for (const p of off.players) if ((p.read || 0) > 0 && chipMeshes.get(p.id)) if (!best || p.read < best.read) best = p;
  return best ? best.id : null;
}
// which player a "follow" camera tracks: the explicit pick, else the SELECTED
// player if one is picked, else the #1 read.
export function getTrackTargetId() {
  if (camTargetId && chipMeshes.get(camTargetId)) return camTargetId;
  if (off.selId && chipMeshes.get(off.selId)) return off.selId;
  return getReverseTargetId();
}
// the shots that ride ONE player — only these reveal the "Track" dropdown.
const TRACK_SHOTS = new Set(['receiverCam', 'playerFollow']);
// Show/refresh the Track picker for the given camera shot. Called on every shot
// change (and by Escape, which resets to 'free' → hides it). Lists every skill
// player so you can ride any of them; defaults to the money read.
export function syncCamPicker(shotName) {
  const sel = document.getElementById('pd-track');
  const wrap = document.getElementById('pd-track-wrap'); if (!sel || !wrap) return;
  const show = TRACK_SHOTS.has(shotName);
  wrap.hidden = !show;
  if (!show) { setCamTarget(null); return; }   // a non-tracking shot → drop the lock so reads drive again
  const list = off.players.filter((p) => p.type !== 'QB' && chipMeshes.get(p.id))
    .sort((a, b) => (a.read || 9) - (b.read || 9));
  // Disambiguate same-type players (e.g. four "WR"s) by their spot on the field,
  // left→right, so the list never shows four identical entries. Read text still
  // wins when it's set — a labelled money read is clearer than a side.
  const cx = (p) => { const m = chipMeshes.get(p.id); return m ? m.position.x : 0; };
  const sameType = {};
  for (const p of list) (sameType[p.type] = sameType[p.type] || []).push(p);
  for (const t in sameType) sameType[t].sort((a, b) => cx(a) - cx(b));   // -x = left hash
  const trackLabel = (p) => {
    let s = recLabel(p.id);
    const grp = sameType[p.type];
    if (grp.length > 1) s += ` (${grp.indexOf(p) + 1} of ${grp.length}, L→R)`;
    return s;
  };
  const cur = getCamTarget();
  sel.innerHTML = list.map((p) => `<option value="${p.id}">${esc(trackLabel(p))}</option>`).join('');
  if (cur && list.some((p) => p.id === cur)) sel.value = cur;            // keep a still-valid pick
  else if (list.length) { sel.value = list[0].id; setCamTarget(list[0].id); }   // else default to the money read
}
// resolve a read's target reference → a player id. Accepts a player id ('p2'),
// a position type ('WR'|'TE'|'RB'), or a numeric index into off.players.
export function resolveReceiver(ref) {
  if (ref == null) return null;
  if (typeof ref === 'number') return off.players[ref]?.id || null;
  const byId = off.players.find((p) => p.id === ref);
  if (byId) return byId.id;
  const t = String(ref).toUpperCase();
  const byType = off.players.filter((p) => p.type === t);
  if (byType.length) return byType[0].id;
  return null;
}
export function listReceivers() {
  return off.players.map((p, i) => ({ id: p.id, type: p.type, index: i, hasRoute: routeMeshes.has(p.id) }));
}
// billboard each collage card toward the camera + a gentle idle bob. Called each frame.
export function tickPlayers(now, cam) {
  const one = (m) => { const u = m && m.userData; if (!u) return; billboardChip(m, cam); if (u.chipPlane) u.chipPlane.position.y = u.by + Math.sin(now * 2 + u.ph) * 0.12; };
  for (const m of chipMeshes.values()) one(m);
  one(qbMesh);
  for (const m of olMeshes) if (m.visible) tickToken(m, cam);   // flat ground tokens, route-style parallax lean
}
// O-LINE (Full 11) — 5 flat circle tokens on the LOS, centered on the ball. Static for
// now (blocking comes later); hidden in 7-on-7.
function buildOLine() {
  for (const dx of OL_DX) {
    const m = buildToken('O', 1.9);
    m.position.set(SNAP_X + dx, 0, LOS_Z - 0.5);   // just behind the LOS, offense side
    m.visible = false;
    olMeshes.push(m); group.add(m);
  }
}
function applyOffenseMode(mode) {
  const full = mode === 'full11';
  const s = full ? FULL_ICON_SCALE : 1;
  for (const m of chipMeshes.values()) m.scale.setScalar(s);
  if (qbMesh) qbMesh.scale.setScalar(s);
  for (const m of olMeshes) m.visible = full;
}
// Route flow animation + a camera-height PARALLAX tilt. The route stays FLAT ON
// THE GROUND (centerline pinned); each cross-section leans toward the camera so at
// QB/ground level you see the stroke's FACE instead of its thin edge. High/overhead
// camera → flat. (This is NOT the far-end "ramp" — the whole line stays on the grass.)
export function tickRoutes(now, cam) {
  let tilt = 0;
  if (cam) {
    const rx = SNAP_X, rz = LOS_Z;   // reference near the ball
    const horiz = Math.hypot(cam.position.x - rx, cam.position.z - rz) || 0.001;
    const elev = Math.atan2(cam.position.y - 1.2, horiz);        // camera's angle above the field
    const lowness = Math.max(0, Math.min(1, 1 - elev / 0.55));   // 1 at ground level → 0 by ~31°
    tilt = 0.45 * lowness;                                        // up to ~26° of cross-section lean
  }
  for (const r of routeMeshes.values()) if (r.route) {
    r.route.tick(now);
    if (cam) { const s = r.dense[0]; r.route.setTilt(tilt, cam.position.x - s.x, cam.position.z - s.z); }
  }
}

/* ============================== boot ============================== */
export function initOffense() {
  qbMesh = makeChip({ id: 'qb', type: 'QB' }); qbMesh.position.set(QB_POS.x + SNAP_X, 0, QB_POS.z + LOS_Z); group.add(qbMesh);
  ballMesh = makeFootball(); group.add(ballMesh);
  buildOLine();
  onMode(applyOffenseMode);       // shrink skill icons + show the O-line in Full 11
  initDefense();                  // build the D-line first so blocking can grab both
  blocking.setLines(olMeshes, getDLMeshes());
  buildUI();
  // one-time: the LOS moved back to the 25, so drop any autosave from the old midfield spot
  if (localStorage.getItem('pd_los') !== '25-hash') { try { localStorage.removeItem('pd_play'); } catch {} localStorage.setItem('pd_los', '25-hash'); }
  if (!load()) loadFormation('2x2 Spread');
  else { formNames = Object.keys(allForms()); refreshFormationUI(); refresh(); }
  syncDefense();                     // settle the defenders into their route-aware drops
  showZones();                       // show the pre-snap coverage shell on load
  attachOffenseInput(renderer.domElement);
  updateUIScale();
  window.addEventListener('resize', updateUIScale);
  undo.reset();                      // seed the stack with the boot state
  openSharedIfAny();                 // ?p=<slug> → open that play read-only
}

/* A share link (?p=slug) opens the play for ANYONE, signed in or not, read-only.
   This is the growth loop, so it must not depend on having an account. */
async function openSharedIfAny() {
  const share = new URLSearchParams(location.search).get('p');
  if (!share) return;
  document.body.classList.add('view-only');
  setHint('Loading play…');
  // the Supabase client is created asynchronously at boot; wait briefly for it
  for (let i = 0; i < 40 && !cloud.saveIsAvailable(); i++) await new Promise((r) => setTimeout(r, 50));
  const row = await cloud.loadShared(share);
  if (!row || !playSpec.apply(row.spec)) {
    document.body.classList.remove('view-only');
    cloud.toast('That play link isn’t available');
    return;
  }
  refresh(); syncDefense(); showZones(); undo.reset();
  const t = document.createElement('div');
  t.className = 'pd-viewer';
  t.innerHTML = `
    <div class="pd-viewer-card pd-patch">
      <img class="pd-viewer-crest" src="assets/sk-logo.png" alt="">
      <div class="pd-viewer-meta">
        <span class="pd-viewer-name">${esc(row.name || 'Untitled play')}</span>
        <span class="pd-viewer-sub">${row.formation_name ? esc(row.formation_name) + ' · ' : ''}King Reggie's Play Builder</span>
      </div>
      <button class="pd-btn go" id="pd-viewer-run">▶ Run play</button>
      <a class="pd-btn" id="pd-viewer-make" href="${location.pathname}">Draw your own</a>
    </div>`;
  document.body.appendChild(t);
  t.querySelector('#pd-viewer-run').onclick = () => { resetRun(); runPlay(); };
  setHint('Drag to orbit · scroll to zoom');
  setTimeout(() => { resetRun(); runPlay(); }, 700);   // show them the play immediately
}

// scale every control cluster with the viewport so they keep their relative
// layout (and never overlap) on smaller screens, just like on a big monitor
function updateUIScale() {
  const s = Math.max(0.58, Math.min(1, innerWidth / 1560, innerHeight / 870));
  document.documentElement.style.setProperty('--ui-scale', s.toFixed(3));
}
