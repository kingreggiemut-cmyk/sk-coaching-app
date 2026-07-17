// The 3D field — ported in structure from war_room_test.html buildStadiumWorld /
// makeFieldTexture, but drawn PROCEDURALLY (no external image assets, which the
// spec flagged as broken). Turf + mow stripes + yard lines + numbers + Oregon
// end zones + midfield "O", goalposts, and a simple stadium ring. Real yardage:
// 1 yard = 1 world unit, midfield at z = 0.
import { FIELD } from '../core/units.js';

const W_UNITS = FIELD.MARGIN_X * 2;   // 56 (x: -28..28)
const L_UNITS = FIELD.EDGE_Z * 2;     // 126 (z: -63..63)
const PXU = 12;                        // canvas px per world unit
const CW = Math.round(W_UNITS * PXU);  // canvas width
const CH = Math.round(L_UNITS * PXU);  // canvas height

const GREEN = '#1f6f3d', GREEN2 = '#256f42', EZ = '#0b5030', YELLOW = '#ffd23f', WHITE = '#f3f1e6';
const xToPx = (x) => (x + FIELD.MARGIN_X) / W_UNITS * CW;
const zToPy = (z) => (z + FIELD.EDGE_Z) / L_UNITS * CH;

function makeFieldTexture() {
  const c = document.createElement('canvas');
  c.width = CW; c.height = CH;
  const g = c.getContext('2d');

  // base + mow stripes (5-yard bands across the width)
  g.fillStyle = GREEN; g.fillRect(0, 0, CW, CH);
  for (let z = -60; z < 60; z += 5) {
    g.fillStyle = ((z / 5) & 1) ? GREEN2 : GREEN;
    g.fillRect(0, zToPy(z), CW, 5 * PXU);
  }

  // end zones (z: 50..60 and -60..-50), Oregon green + wordmark
  g.fillStyle = EZ;
  g.fillRect(0, zToPy(50), CW, (10) * PXU);
  g.fillRect(0, zToPy(-60), CW, (10) * PXU);
  drawWord(g, 'OREGON', zToPy(55), false);
  drawWord(g, 'OREGON', zToPy(-55), true);

  // sideline borders
  g.strokeStyle = WHITE; g.lineWidth = 0.5 * PXU;
  g.strokeRect(xToPx(-FIELD.HALF_WIDTH), zToPy(-50), (FIELD.HALF_WIDTH * 2) / W_UNITS * CW, (100) * PXU);

  // yard lines every 5 yards (goal lines thicker)
  for (let L = 0; L <= 100; L += 5) {
    const z = L - 50;
    g.strokeStyle = WHITE;
    g.lineWidth = (L === 0 || L === 100) ? 0.55 * PXU : 0.3 * PXU;
    line(g, xToPx(-FIELD.HALF_WIDTH), zToPy(z), xToPx(FIELD.HALF_WIDTH), zToPy(z));
  }

  // hash marks (two rows, ~1 yard ticks), NFL-ish inside width
  g.strokeStyle = WHITE; g.lineWidth = 0.14 * PXU;
  for (let L = 1; L < 100; L++) {
    if (L % 5 === 0) continue;
    const z = L - 50;
    for (const hx of [-3.1, 3.1, -FIELD.HALF_WIDTH + 2, FIELD.HALF_WIDTH - 2]) {
      line(g, xToPx(hx) - 3, zToPy(z), xToPx(hx) + 3, zToPy(z));
    }
  }

  // yard numbers at every 10 (10..50..10), both sidelines
  for (let L = 10; L <= 90; L += 10) {
    const z = L - 50;
    const num = String(Math.min(L, 100 - L));
    drawNumber(g, num, xToPx(-20), zToPy(z), 1);
    drawNumber(g, num, xToPx(20), zToPy(z), -1);
  }

  // midfield "O" logo
  g.strokeStyle = YELLOW; g.lineWidth = 1.6 * PXU;
  g.beginPath();
  g.ellipse(xToPx(0), zToPy(0), 5 * PXU, 6.5 * PXU, 0, 0, Math.PI * 2);
  g.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function line(g, x0, y0, x1, y1) { g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }

function drawWord(g, text, py, flip) {
  g.save();
  g.translate(CW / 2, py);
  if (flip) g.rotate(Math.PI);
  g.fillStyle = YELLOW;
  g.font = `900 ${5.4 * PXU}px Arial Black, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.letterSpacing = `${1.2 * PXU}px`;
  g.fillText(text, 0, 0);
  g.restore();
}

function drawNumber(g, num, px, py, side) {
  g.save();
  g.translate(px, py);
  g.rotate(side > 0 ? Math.PI / 2 : -Math.PI / 2);
  g.fillStyle = WHITE;
  g.font = `900 ${5 * PXU}px Arial Black, system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(num, 0, 0);
  g.restore();
}

export function buildField() {
  const group = new THREE.Group();

  // turf plane
  const tex = makeFieldTexture();
  const mat = new THREE.MeshLambertMaterial({ map: tex });
  const geo = new THREE.PlaneGeometry(W_UNITS, L_UNITS);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  group.add(mesh);

  // goalposts at each end line (z = ±60)
  group.add(makeGoalpost(FIELD.BACK_Z));
  group.add(makeGoalpost(-FIELD.BACK_Z));

  // simple stadium bowl + crowd ring so the field isn't floating
  group.add(makeStands());

  return group;
}

function makeGoalpost(z) {
  const grp = new THREE.Group();
  const matY = new THREE.MeshLambertMaterial({ color: YELLOW, emissive: 0x3a2f00 });
  const post = (x) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 9, 12), matY);
    m.position.set(x, 4.5, z); return m;
  };
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3, 12), matY);
  base.position.set(0, 1.5, z);
  const cross = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 6.15, 12), matY);
  cross.rotation.z = Math.PI / 2; cross.position.set(0, 3, z);
  grp.add(base, cross, post(-3.05), post(3.05));
  return grp;
}

function makeStands() {
  const grp = new THREE.Group();
  // crowd texture: speckle of Oregon green + yellow
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#08321d'; g.fillRect(0, 0, 512, 128);
  for (let i = 0; i < 5000; i++) {
    g.fillStyle = Math.random() < 0.5 ? '#124a2b' : (Math.random() < 0.5 ? '#e7c53a' : '#2f7f49');
    g.fillRect(Math.random() * 512, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping; tex.repeat.set(24, 1);
  const wall = new THREE.Mesh(
    new THREE.CylinderGeometry(78, 92, 34, 64, 1, true),
    new THREE.MeshLambertMaterial({ map: tex, side: THREE.BackSide }));
  wall.position.set(0, 16, 0);
  grp.add(wall);
  // dark ground beyond the field
  const ground = new THREE.Mesh(new THREE.CircleGeometry(80, 48), new THREE.MeshLambertMaterial({ color: 0x0a2716 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05;
  grp.add(ground);
  return grp;
}
