// Field orbit camera — ported VERBATIM from war_room_test.html (~L4148-4155,
// 4264-4317, 5250-5258): the exact orbit Reggie pilots in field view.
// Drag orbits, scroll zooms, arrows fly the pivot, 1/2/3 fly to his framings.
import { camera } from './scene.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export const BROADCAST = new THREE.Vector3(0, 40, -94);
// The Escape "home" — a medium, un-zoomed view from behind the QB looking downfield.
// Not the full broadcast pull-back (that reads as "zoomed out"); closer + a touch
// lower so it feels like a normal coaching angle you'd start every look from.
export const DEFAULT_VIEW = new THREE.Vector3(-6.67, 26, -74);
export const FIELD_POSES = {
  broadcast: BROADCAST.clone(),
  all22:     new THREE.Vector3(0.5, 106, -6),
  goal:      new THREE.Vector3(0, 4.5, -70),
};
export const ORBIT_TARGET = new THREE.Vector3(0, 2, 0);
const CENTER = new THREE.Vector3(0, 2, 0);   // the "home" pivot everything snaps back to
const focus = new THREE.Vector3(0, 2, 0);    // where the pivot WANTS to be (smoothed into ORBIT_TARGET)

// You can drift the pivot off-center to zoom in on off-center action, but the
// budget shrinks as you zoom out — so zooming back out snaps you to center and
// the fixed camera never gets wonky.
function offsetBudget() {
  const t = clamp((orbit.tgt.r - 34) / (120 - 34), 0, 1);   // 0 = zoomed in, 1 = zoomed out
  return (1 - t) * 26;                                        // up to 26 yds off-center when zoomed all the way in
}
function clampFocus() {
  const b = offsetBudget();
  const dx = focus.x - CENTER.x, dz = focus.z - CENTER.z, d = Math.hypot(dx, dz);
  if (d > b) { const s = b / d; focus.x = CENTER.x + dx * s; focus.z = CENTER.z + dz * s; }
  focus.y = clamp(focus.y, 1, 80);
}

export const orbit = {
  enabled: false,
  autoOrbit: false,
  _dragging: false,
  sph: { r: 1, phi: 1, theta: 0 },
  tgt: { r: 1, phi: 1, theta: 0 },
  fly: null,
  recenter() { focus.copy(CENTER); },
  syncFromCamera() {
    const o = camera.position.clone().sub(ORBIT_TARGET);
    const r = o.length();
    this.sph = { r, phi: Math.acos(clamp(o.y / r, -1, 1)), theta: Math.atan2(o.x, o.z) };
    this.tgt = { ...this.sph };
  },
  clampT() {
    this.tgt.r = clamp(this.tgt.r, 30, 340);   // more pull-back room to frame the whole board/topper from behind
    const maxPhi = Math.min(1.53, Math.acos(clamp(2.5 / this.tgt.r, 0, 1)));
    this.tgt.phi = clamp(this.tgt.phi, 0.05, maxPhi);
  },
  flyToPos(p) {
    this.recenter();                 // jumping to a saved framing re-centers the pivot
    const o = p.clone().sub(ORBIT_TARGET);
    const r = o.length();
    this.fly = {
      t0: performance.now() / 1000, dur: 0.9,
      from: { ...this.tgt },
      to: { r, phi: Math.acos(clamp(o.y / r, -1, 1)), theta: Math.atan2(o.x, o.z) },
    };
    let d = this.fly.to.theta - this.fly.from.theta;
    if (d > Math.PI) this.fly.to.theta -= TAU;
    if (d < -Math.PI) this.fly.to.theta += TAU;
  },
  update(dt, now) {
    if (!this.enabled) return;
    if (this.autoOrbit && !this.fly && !this._dragging) this.tgt.theta += dt * 0.28;   // slow record spin
    // ease the pivot toward its focus, and let zoom-out snap it home
    clampFocus();
    const kt = Math.min(1, dt * 5);
    ORBIT_TARGET.x += (focus.x - ORBIT_TARGET.x) * kt;
    ORBIT_TARGET.y += (focus.y - ORBIT_TARGET.y) * kt;
    ORBIT_TARGET.z += (focus.z - ORBIT_TARGET.z) * kt;
    if (this.fly) {
      const k = clamp((now - this.fly.t0) / this.fly.dur, 0, 1);
      const e = easeInOutCubic(k);
      for (const key of ['r', 'phi', 'theta'])
        this.tgt[key] = this.fly.from[key] + (this.fly.to[key] - this.fly.from[key]) * e;
      if (k >= 1) this.fly = null;
      this.clampT();
      Object.assign(this.sph, this.tgt);
    } else {
      this.clampT();
      const k = Math.min(1, dt * 6);
      this.sph.r += (this.tgt.r - this.sph.r) * k;
      this.sph.phi += (this.tgt.phi - this.sph.phi) * k;
      this.sph.theta += (this.tgt.theta - this.sph.theta) * k;
    }
    const { r, phi, theta } = this.sph;
    camera.position.set(
      ORBIT_TARGET.x + r * Math.sin(phi) * Math.sin(theta),
      ORBIT_TARGET.y + r * Math.cos(phi),
      ORBIT_TARGET.z + r * Math.sin(phi) * Math.cos(theta)
    );
    camera.lookAt(ORBIT_TARGET);
  },
};

/* ---- input: drag orbit + wheel zoom (war-room field-mode behavior) ---- */
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);   // the field (y = 0)
const groundHit = new THREE.Vector3();
function groundUnderCursor(e) {
  ndc.x = (e.clientX / innerWidth) * 2 - 1; ndc.y = -(e.clientY / innerHeight) * 2 + 1;
  ray.setFromCamera(ndc, camera);
  return ray.ray.intersectPlane(groundPlane, groundHit) ? groundHit.clone() : null;
}

export function attachOrbitControls(el) {
  let lastX = 0, lastY = 0;
  el.addEventListener('pointerdown', (e) => { orbit._dragging = true; lastX = e.clientX; lastY = e.clientY; el.setPointerCapture(e.pointerId); });
  el.addEventListener('pointerup', (e) => { orbit._dragging = false; try { el.releasePointerCapture(e.pointerId); } catch {} });
  el.addEventListener('pointermove', (e) => {
    if (!orbit._dragging) return;
    orbit.tgt.theta -= (e.clientX - lastX) * 0.005;
    orbit.tgt.phi -= (e.clientY - lastY) * 0.004;
    lastX = e.clientX; lastY = e.clientY;
    orbit.fly = null;
  });
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomIn = e.deltaY < 0;
    orbit.tgt.r *= (1 + Math.sign(e.deltaY) * 0.08);
    orbit.clampT();
    // zooming IN drifts the pivot toward whatever you're pointing at; zooming OUT
    // actively pulls it back to center AND the shrinking budget locks it home, so
    // starting to zoom out snaps you back to the midfield view
    if (zoomIn) { const p = groundUnderCursor(e); if (p) { focus.x += (p.x - focus.x) * 0.4; focus.z += (p.z - focus.z) * 0.4; } }
    else { focus.x += (CENTER.x - focus.x) * 0.45; focus.z += (CENTER.z - focus.z) * 0.45; }
    clampFocus();
    orbit.fly = null;
  }, { passive: false });
}

/* ---- arrows fly the orbit pivot around (ported from ~L5250-5258) ---- */
const panKeys = new Set();
window.addEventListener('keydown', (e) => {
  // don't fly the camera while someone is arrowing through text in a field
  const t = e.target;
  if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) { panKeys.add(e.key); e.preventDefault(); }
});
window.addEventListener('keyup', (e) => panKeys.delete(e.key));

export function panFrame(dt) {
  if (!panKeys.size) return;
  const sp = 42 * dt;
  if (panKeys.has('ArrowUp')) focus.y = clamp(focus.y + sp, 1, 90);
  if (panKeys.has('ArrowDown')) focus.y = clamp(focus.y - sp, 1, 90);
  const pdx = camera.position.x - focus.x, pdz = camera.position.z - focus.z;
  const pl = Math.hypot(pdx, pdz) || 1, prx = -pdz / pl, prz = pdx / pl;
  if (panKeys.has('ArrowLeft')) { focus.x -= prx * sp; focus.z -= prz * sp; }
  if (panKeys.has('ArrowRight')) { focus.x += prx * sp; focus.z += prz * sp; }
  clampFocus();
}
