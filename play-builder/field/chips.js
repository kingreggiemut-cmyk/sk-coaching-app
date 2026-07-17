// CHIPS (Filming Rig) — Reggie's real torn-paper collage player cards.
// One object per player: a single standing card (billboarded to face the camera,
// leaned slightly toward it so it reads as a standee, not lying flat) + a soft
// drop shadow on the grass. NO disc / contact-ring (kills the double-badge
// stacking). The card art already carries tape corners + torn edges. Blue/gold =
// offense, red = defense.
import { makeGroundShadow } from '../core/shadow.js';

const COLLAGE = 'field/assets/';   // bundled locally so the app is self-contained
const SRC = {
  QB: 'QB Chip.webp', WR: 'Wr Chip.webp', TE: 'TE Chip.webp', RB: 'rb chip.webp',
  CB: 'CB Chip.webp', SS: 'SS chip.webp', FS: 'FS Chip.webp', LB: 'LB Chip.webp',
};
const REC = {};
for (const k in SRC) {
  const rec = { tex: null, aspect: 1.0, planes: [] };
  REC[k] = rec;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    c.getContext('2d').drawImage(img, 0, 0);
    rec.tex = new THREE.CanvasTexture(c); rec.tex.anisotropy = 16;
    rec.aspect = img.width / img.height;
    for (const pl of rec.planes) { pl.material.map = rec.tex; pl.material.needsUpdate = true; const h = pl.userData.h; pl.geometry.dispose(); pl.geometry = new THREE.PlaneGeometry(h * rec.aspect, h); }
  };
  img.src = encodeURI(COLLAGE + SRC[k]);
}

const GLOW = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

// dark contact shadow directly under the card — a tight, DARK grounding patch (on
// top of the softer makeGroundShadow) so the card reads as casting a real shadow
const DOT = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.5)'); gr.addColorStop(0.82, 'rgba(0,0,0,0.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
})();

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function buildChip(type, h = 5.0) {
  const rec = REC[type] || REC.WR;
  const g = new THREE.Group();
  g.add(makeGroundShadow(h * 0.34, 0.82));   // soft drop shadow → sits on the grass
  const dot = new THREE.Mesh(
    new THREE.PlaneGeometry(h * 0.38, h * 0.26),
    new THREE.MeshBasicMaterial({ map: DOT, transparent: true, depthWrite: false, side: THREE.DoubleSide })
  );
  dot.rotation.x = -Math.PI / 2; dot.position.y = 0.05; dot.renderOrder = 1;   // dark contact shadow (slightly oval)
  g.add(dot);
  const pl = new THREE.Mesh(
    new THREE.PlaneGeometry(h * rec.aspect, h),
    new THREE.MeshBasicMaterial({ map: rec.tex || null, transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide })
  );
  pl.position.y = h * 0.46; pl.rotation.x = -0.12;   // slight lean: top toward the camera (standing, not flat)
  pl.userData.h = h; pl.renderOrder = 6;
  rec.planes.push(pl); g.add(pl);
  // gold selection glow behind the card (hidden until selected/targeted)
  const sel = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffd15a, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  sel.scale.set(h * 1.15, h * 1.15, 1); sel.position.y = h * 0.46; sel.visible = false;
  g.add(sel);
  g.userData = { chipPlane: pl, sel, type, hh: h, ph: Math.random() * Math.PI * 2, by: pl.position.y };
  return g;
}

// Billboard the card toward the camera. Yaw (whole group) always faces the
// camera and never mirrors the art. PITCH (card plane only, so the ground
// shadow/dot stay flat) lays the card back as the camera climbs overhead — so a
// top-down shot sees the face instead of a thin edge-on sliver.
export function billboardChip(g, cam) {
  if (!cam) return;
  const dx = cam.position.x - g.position.x, dz = cam.position.z - g.position.z;
  const pl = g.userData.chipPlane; if (!pl) { g.rotation.y = Math.atan2(dx, dz); return; }
  const horiz = Math.hypot(dx, dz) || 0.001;
  const dy = cam.position.y - (g.position.y + (g.userData.by || 0));
  const elev = Math.atan2(dy, horiz);                 // 0 = level, ~π/2 = straight overhead
  const t = clamp((elev - 0.6) / (1.45 - 0.6), 0, 1); // only kicks in past ~34°, full by ~83°
  const smooth = t * t * (3 - 2 * t);
  // YAW: at a normal (low) angle the card faces the camera; as it lays flat overhead
  // it would otherwise flip upside-down, so blend the yaw toward π — which points the
  // card's texture-up at downfield (+z), i.e. the TOP of a QB-at-bottom all-22 frame,
  // so the label reads upright from a behind-the-QB overhead.
  const yawFace = Math.atan2(dx, dz);
  const diff = Math.atan2(Math.sin(Math.PI - yawFace), Math.cos(Math.PI - yawFace));   // shortest way to π
  g.rotation.y = yawFace + diff * smooth;
  pl.rotation.x = -0.12 - smooth * (Math.PI / 2 - 0.12);  // -0.12 lean → face-up when overhead
}

// LINE TOKENS — the chalkboard O's and X's for the O-line / D-line (Full 11 mode).
// Simple abstract markers (not collage cards): a standing billboarded disc/X that
// pitches flat when the camera goes overhead (via billboardChip's chipPlane path),
// so it reads as a standing token low and a true O/X from an all-22. Radially clean,
// no text → no overhead flip to worry about, and easy to slide for blocking later.
function tokenTexture(shape) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  if (shape === 'O') {
    g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.closePath();
    g.fillStyle = '#2f6fd0'; g.fill();                                   // offense blue disc
    g.lineWidth = 13; g.strokeStyle = '#f4f1e6'; g.stroke();             // cream ring
    g.lineWidth = 4; g.strokeStyle = 'rgba(8,22,55,.6)'; g.beginPath(); g.arc(64, 64, 53, 0, Math.PI * 2); g.stroke();
  } else {                                                                // 'X'
    g.lineCap = 'round';
    const stroke = (w, col) => { g.lineWidth = w; g.strokeStyle = col; g.beginPath(); g.moveTo(30, 30); g.lineTo(98, 98); g.moveTo(98, 30); g.lineTo(30, 98); g.stroke(); };
    stroke(30, '#f4f1e6');                                               // cream halo for contrast on grass
    stroke(17, '#c4162e');                                               // crimson X
  }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 16; return t;
}

// Line tokens lie FLAT on the grass (like a route decal) so they can meet and
// interact when blocking without standing cutouts overlapping. tickToken() adds a
// route-style parallax lean toward the camera so you still read the O/X at field
// level. (NOT billboardChip — that's for the standing hero cards.)
const TOKEN_HOVER = 0.55;   // the decal floats this far off the grass (grounded by its shadow)
export function buildToken(shape, h = 1.9) {
  const g = new THREE.Group();
  g.add(makeGroundShadow(h * 0.5, 0.5));            // shadow stays on the grass → grounds the hover
  const pl = new THREE.Mesh(new THREE.PlaneGeometry(h, h),
    new THREE.MeshBasicMaterial({ map: tokenTexture(shape), transparent: true, depthWrite: false, alphaTest: 0.02, side: THREE.DoubleSide }));
  pl.position.y = TOKEN_HOVER; pl.rotation.x = -Math.PI / 2; pl.renderOrder = 5;   // flat, hovering just off the field
  g.add(pl);
  const sel = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffd15a, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
  sel.scale.set(h * 1.35, h * 1.35, 1); sel.position.y = TOKEN_HOVER; sel.visible = false; g.add(sel);
  g.userData = { chipPlane: pl, sel, type: shape, hh: h, flat: true };
  return g;
}

// Orient a flat line token each frame: lie flat when the camera's high (chalkboard
// O/X from an all-22), lean up toward the camera when it's low so the face reads at
// field level — the same parallax feel the routes have. The token HOVERS at TOKEN_HOVER
// so the near edge never dips through the grass when it leans.
const TOKEN_TILT = 0.42;   // max lean toward the camera (~24°); hover clears the near edge
export function tickToken(m, cam) {
  const pl = m.userData && m.userData.chipPlane; if (!pl || !cam) return;
  const dx = cam.position.x - m.position.x, dz = cam.position.z - m.position.z;
  const horiz = Math.hypot(dx, dz) || 0.001;
  const elev = Math.atan2(cam.position.y - TOKEN_HOVER, horiz);
  const low = clamp(1 - elev / 0.6, 0, 1);            // 1 at field level → 0 by ~34°
  m.rotation.y = Math.atan2(dx, dz);                  // yaw so the lean tips toward the camera
  pl.rotation.x = -Math.PI / 2 + low * TOKEN_TILT;    // flat overhead → leaned up toward the camera when low
}
