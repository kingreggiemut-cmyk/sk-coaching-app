// Three.js core — ported EXACTLY from war_room_test.html (renderer/camera/lights,
// ~L1485-1523) in its full-scale FIELD MODE state (snapToField, ~L4167-4188).
// No invented values: fog, lights, camera params are Reggie's own.
const canvas = document.getElementById('gl');

export const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, alpha: true, preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
// updateStyle=false → CSS controls the canvas display box (so the mobile/TikTok
// preview modes can reshape it); the drawing buffer follows the CSS box.
renderer.setSize(window.innerWidth, window.innerHeight, false);
// (original sets no outputEncoding — colors are authored for linear output)

export const scene = new THREE.Scene();

/* fog starts as the field-mode values directly (we boot straight into the field;
   the war room's inert-then-tighten dance isn't needed here) */
export const fog = new THREE.Fog(0xc79b74, 340, 900);
scene.fog = fog;

/* field-mode camera: fov 45, near 0.5, far 2500 (snapToField) */
export const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.5, 2500);

/* lights — the war room's rig at applyLights(0): "game-ready daylight"
   (exported so the cinematic render mode can rebalance them) */
export const ambientL = new THREE.AmbientLight(0x9db8a5, 0.8);
scene.add(ambientL);
export const key = new THREE.DirectionalLight(0xffe9b0, 0.9);
key.position.set(0, 8, 3);
scene.add(key);
export const sun = new THREE.DirectionalLight(0xffb070, 0.9);   // the stadium's dusk sun
sun.position.set(30, 40, 160);
scene.add(sun);

export function onResize() {
  const el = renderer.domElement;
  const w = el.clientWidth || window.innerWidth;
  const h = el.clientHeight || window.innerHeight;
  renderer.setSize(w, h, false);   // CSS drives the display box; buffer follows
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', onResize);
