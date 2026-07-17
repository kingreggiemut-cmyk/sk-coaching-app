// POPULATE (Filming Rig) — Reggie's real collage crowd + held-up signs.
// Fans: tiled on the actual seating slope so they never clip the stadium;
// billboarded with a CLAMPED turn (they mostly face inward and only swivel a
// little toward the camera → tiered-crowd parallax, not a spinning wall).
// Signs: real held-up sign cutouts scattered through the crowd, bobbing for life.
// (Big collage-sheet banners + floating tape accents were removed — they read as
// oversized junk floating in the stands.)
import { scene } from '../core/scene.js';

const COLLAGE = 'field/assets/';   // bundled locally so the app is self-contained
const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// bowl + seating math — mirrors field/stadium.js so fans sit ON the stands
const IX = 42, IZ = 80, EXPO = 0.62, WALL_H = 2.4;
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const angDist = (a, b) => { let d = Math.abs(a - b) % TAU; return d > Math.PI ? TAU - d : d; };
const plateau = (th, c, inner, outer) => 1 - smoothstep(inner, outer, angDist(th, c));
function ringPoint(th) { const c = Math.cos(th), s = Math.sin(th); return { x: IX * Math.sign(c) * Math.pow(Math.abs(c), EXPO), z: IZ * Math.sign(s) * Math.pow(Math.abs(s), EXPO) }; }
function ringDir(th) { const p = ringPoint(th); const dx = p.x / (IX * IX), dz = p.z / (IZ * IZ); const l = Math.hypot(dx, dz) || 1; return { x: dx / l, z: dz / l }; }
function standH(th) { return 15 + 16 * plateau(th, 0, 0.68, 1.02) - 7 * plateau(th, Math.PI / 2, 0.35, 0.80) + 2 * plateau(th, Math.PI * 1.5, 0.4, 1.0); }
const standDepth = (th) => 8 + standH(th) * 1.55;

function loadImage(file) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = encodeURI(COLLAGE + file); }); }
async function load(file) { const i = await loadImage(file); if (!i) return null; const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d').drawImage(i, 0, 0); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return { tex: t, aspect: i.width / i.height }; }

export async function buildPopulate() {
  const group = new THREE.Group(); scene.add(group);
  // The FLOATING FAN CUTOUTS are gone (Reggie: "all those floating people in the
  // stands just get rid of those"). They were 230 separate swivelling planes over
  // 2.6MB of textures, sitting on top of stands that are already painted with a
  // crowd collage — so they cost a lot and added little. The stand texture keeps
  // the bowl full; the signs keep it alive.
  const signTex = (await Promise.all(['Full breakdown sign.webp', 'king reggie sign.webp', 'Crown us Sign.webp', 'Scheme Kings Crowd sign 1.webp'].map(load))).filter(Boolean);

  const fans = [], bobs = [];

  // ---- held-up signs scattered through the crowd (real cutouts, gentle sway) ----
  // Raised a touch off the seat slope so they don't clip into the stands, and
  // more of them → the bobbing gives the stands some life/movement.
  if (signTex.length) for (let i = 0; i < 24; i++) {
    const th = rand(0, TAU), p = ringPoint(th), d = ringDir(th), dep = standDepth(th), sh = standH(th), s = rand(0.4, 0.78);
    const x = p.x + d.x * dep * s, z = p.z + d.z * dep * s, y = WALL_H + sh * s + 2.8;
    const rec = pick(signTex), h = rand(4.5, 6.5);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: rec.tex, transparent: true, depthWrite: false }));
    sp.scale.set(h * rec.aspect, h, 1); sp.position.set(x, y, z);
    sp.userData = { by: y, ph: rand(0, TAU) };
    group.add(sp); bobs.push(sp);
  }

  return {
    group,
    update(now, cam) {
      if (cam) for (const f of fans) {
        const ty = Math.atan2(cam.position.x - f.position.x, cam.position.z - f.position.z);
        let dl = ty - f.userData.baseYaw; while (dl > Math.PI) dl -= TAU; while (dl < -Math.PI) dl += TAU;
        f.rotation.y = f.userData.baseYaw + clamp(dl, -0.5, 0.5);   // limited swivel
      }
      for (const s of bobs) s.position.y = s.userData.by + Math.sin(now * 0.9 + s.userData.ph) * 0.2;
    },
    setVisible(v) { group.visible = !!v; },
  };
}
