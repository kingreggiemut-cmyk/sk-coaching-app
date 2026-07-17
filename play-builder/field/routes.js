// ROUTES (Filming Rig) — a HAND-DRAWN MARKER STROKE, not a 3D tube. The whole
// point: treat the route like a Sharpie/paint-pen line laid on a collage playbook,
// NOT a smooth rendered object. So —
//   · thin + matte (unlit MeshBasic, no gloss)
//   · a chalky marker texture with lengthwise striations (on-brand w/ the halftone)
//   · slight WIDTH VARIATION along the length (pressure — fuller in the middle)
//   · slight EDGE WOBBLE (low-freq, non-periodic → hand-drawn, never "jotty")
//   · a thin cream outline (telestration) + a soft offset shadow (barely raised)
//   · a hand-drawn, slightly irregular arrowhead
//   · SMOOTH draw-on: the leading tip advances continuously (interpolated), not in
//     whole-segment jumps.
// Layers bottom→top: shadow · cream outline · colored core.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Marker/chalk FILL texture: fully OPAQUE (edges come from the geometry, so they
// stay clean) with lengthwise striations + fine grain → reads as ink laid by a
// pen, not a flat plastic fill. u runs ALONG the stroke, v ACROSS it, so a streak
// = a horizontal band here.
let STROKE = null;
function strokeTex() {
  if (STROKE) return STROKE;
  const w = 128, h = 40, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  // base fill
  g.fillStyle = '#ececec'; g.fillRect(0, 0, w, h);
  // lengthwise striations (constant-v bands running along u) — faint marker streaks
  for (let s = 0; s < 10; s++) {
    const vy = Math.random() * h, th = 0.6 + Math.random() * 1.6;
    const dark = Math.random() < 0.6;
    g.globalAlpha = 0.05 + Math.random() * 0.10;
    g.fillStyle = dark ? '#5c5c5c' : '#ffffff';
    g.fillRect(0, vy, w, th);
  }
  g.globalAlpha = 1;
  // fine grain over the top (chalk bite)
  const id = g.getImageData(0, 0, w, h), d = id.data;
  for (let i = 0; i < w * h; i++) {
    const n = (Math.random() - 0.5) * 26;
    d[i * 4] = clamp(d[i * 4] + n, 0, 255);
    d[i * 4 + 1] = clamp(d[i * 4 + 1] + n, 0, 255);
    d[i * 4 + 2] = clamp(d[i * 4 + 2] + n, 0, 255);
    d[i * 4 + 3] = 255;
  }
  g.putImageData(id, 0, 0);
  STROKE = new THREE.CanvasTexture(c);
  STROKE.wrapS = STROKE.wrapT = THREE.RepeatWrapping; STROKE.anisotropy = 8;
  return STROKE;
}

export function buildRoute(dense, colorHex, index, outlineHex = 0xf2efe4) {
  if (!dense || dense.length < 2) return null;
  const team = new THREE.Color(colorHex);
  const outlineCol = new THREE.Color(outlineHex);   // cream for the red read, black for the yellow routes
  const group = new THREE.Group();

  const cums = [0];
  for (let i = 1; i < dense.length; i++) cums[i] = cums[i - 1] + Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z);
  const total = cums[cums.length - 1] || 1;
  const segs = dense.length - 1;

  // Bake all geometry RELATIVE to the route's start (dense[0]) and put the group
  // AT that start. That makes group.rotation.x pivot at the player's feet, so the
  // camera-height parallax tilt (set from offense.tickRoutes) lifts the downfield
  // end toward a low camera without the start floating off the player.
  const pivot = { x: dense[0].x, z: dense[0].z };
  const L = dense.map((p) => ({ x: p.x - pivot.x, z: p.z - pivot.z }));

  const HALF = 0.17;            // base half-width — very thin marker line (skinnier still)
  // per-route seeds so every stroke wobbles a little differently
  const sa = (index * 12.9898) % 6.283, sb = (index * 7.233 + 1.7) % 6.283;
  const sc = (index * 4.11 + 0.9) % 6.283, sd = (index * 9.87 + 2.3) % 6.283;
  // pressure taper: thin at the very start, fuller through the middle, tapering into the end
  const taper = (t) => (t < 0.06 ? 0.55 + t * 7.5 : (t > 0.82 ? Math.max(0.34, 1 - (t - 0.82) / 0.18 * 0.66) : 1));
  // low-freq, non-periodic width "pressure" (never a single mechanical wave)
  const widthN = (cm) => 1 + 0.13 * Math.sin(cm * 0.55 + sa) + 0.06 * Math.sin(cm * 1.73 + sb);
  // small independent edge wobble per side (yards) → hand-drawn, not ruler-straight
  const edgeL = (cm) => 0.055 * Math.sin(cm * 0.9 + sc);
  const edgeR = (cm) => 0.055 * Math.sin(cm * 0.82 + sd);

  // tangent/normal at a dense index (central difference)
  function frameAt(i) {
    const nb = L[Math.min(i + 1, segs)], pv = L[Math.max(i - 1, 0)];
    let tx = nb.x - pv.x, tz = nb.z - pv.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    return { nx: -tz, nz: tx };
  }
  // the two edge vertices at dense index i, for a given width multiplier
  function crossAt(i, widthMul) {
    const cur = L[i], f = frameAt(i), cm = cums[i], t = cm / total;
    const w = HALF * taper(t) * widthN(cm) * widthMul;
    const wl = w + edgeL(cm), wr = w + edgeR(cm);
    return [cur.x + f.nx * wl, cur.z + f.nz * wl, cur.x - f.nx * wr, cur.z - f.nz * wr];
  }
  // the two edge vertices at an arbitrary distance D along the route (for the smooth tip)
  function crossAtDist(D, widthMul) {
    let j = 0; while (j < segs && cums[j + 1] < D) j++;
    const c0 = cums[j], c1 = cums[j + 1] ?? c0, fr = c1 > c0 ? (D - c0) / (c1 - c0) : 0;
    const a = L[j], b = L[Math.min(j + 1, segs)];
    const px = a.x + (b.x - a.x) * fr, pz = a.z + (b.z - a.z) * fr;
    let tx = b.x - a.x, tz = b.z - a.z; const tl = Math.hypot(tx, tz) || 1; tx /= tl; tz /= tl;
    const nx = -tz, nz = tx, t = D / total;
    const w = HALF * taper(t) * widthN(D) * widthMul;
    const wl = w + edgeL(D), wr = w + edgeR(D);
    return { j, px: px + nx * wl, pz: pz + nz * wl, qx: px - nx * wr, qz: pz - nz * wr };
  }

  // build a ribbon geometry at height y with width multiplier. Also stores, per
  // vertex, the cross-section NORMAL (horizontal) and the SIGNED half-offset — the
  // vertex shader uses these to tilt each slice about the route centerline toward
  // the camera (see TILT_VERT).
  function ribbon(widthMul, y) {
    const pos = [], uv = [], idx = [], nrm = [], half = [];
    for (let i = 0; i < dense.length; i++) {
      const cur = L[i], f = frameAt(i), cm = cums[i], t = cm / total;
      const w = HALF * taper(t) * widthN(cm) * widthMul;
      const wl = w + edgeL(cm), wr = w + edgeR(cm);
      pos.push(cur.x + f.nx * wl, y, cur.z + f.nz * wl, cur.x - f.nx * wr, y, cur.z - f.nz * wr);
      nrm.push(f.nx, f.nz, f.nx, f.nz);
      half.push(wl, -wr);
      const u = cums[i] / 2.4; uv.push(u, 0, u, 1);
      if (i < segs) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('aNormal', new THREE.Float32BufferAttribute(nrm, 2));
    geo.setAttribute('aHalf', new THREE.Float32BufferAttribute(half, 1));
    geo.setIndex(idx);
    geo.userData = { y, widthMul, orig: Float32Array.from(pos), moved: -1 };
    return geo;
  }
  const shGeo = ribbon(1.85, 0.045);   // shadow
  const wGeo = ribbon(1.55, 0.075);    // cream/black outline
  const cGeo = ribbon(1.0, 0.09);      // colored core
  const geos = [shGeo, wGeo, cGeo];

  // Cross-section PARALLAX TILT: the stroke stays flat ON THE GROUND (centerline
  // pinned, camera-near edge on the grass) but each slice rotates about the route
  // tangent toward the camera by uTilt, so at QB/ground level you see the stroke's
  // FACE instead of its thin edge. uCamDir = horizontal dir to the camera.
  const TILT_VERT = `
    attribute vec2 aNormal; attribute float aHalf;
    uniform float uTilt; uniform vec2 uCamDir;
    varying vec2 vUv;
    void main(){
      vUv = uv;
      vec2 cxz = position.xz - aNormal * aHalf;            // centerline (on the ground)
      float cN = dot(uCamDir, aNormal);
      float w = abs(aHalf);
      float offN = aHalf * cos(uTilt);                     // horizontal offset shrinks as it stands up
      float yE = sin(uTilt) * (w - sign(cN) * aHalf);      // cam-near edge ~grass, far edge lifts a hair
      vec3 fp = vec3(cxz.x + aNormal.x * offN, position.y + yE, cxz.y + aNormal.y * offN);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(fp, 1.0);
    }`;

  const tex = strokeTex();
  // shadow stays FLAT on the grass (no tilt) → it anchors the tilted stroke to the ground
  const shadow = new THREE.Mesh(shGeo, new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, opacity: 0.30, depthWrite: false, side: THREE.DoubleSide }));
  shadow.position.set(0.28, 0, 0.20); shadow.renderOrder = 0;
  const outlineMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uColor: { value: outlineCol }, uTilt: { value: 0 }, uCamDir: { value: new THREE.Vector2(0, -1) } },
    vertexShader: TILT_VERT,
    fragmentShader: `uniform sampler2D map; uniform vec3 uColor; varying vec2 vUv;
      void main(){ vec3 t = texture2D(map, vUv).rgb; gl_FragColor = vec4(uColor * t, 1.0); }`,
  });
  const outline = new THREE.Mesh(wGeo, outlineMat);
  outline.renderOrder = 1;
  // CORE: marker fill + tilt + a traveling highlight band that flows toward the arrow.
  const coreMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { map: { value: tex }, uColor: { value: team }, uFlow: { value: 0 }, uTilt: { value: 0 }, uCamDir: { value: new THREE.Vector2(0, -1) } },
    vertexShader: TILT_VERT,
    fragmentShader: `
      uniform sampler2D map; uniform vec3 uColor; uniform float uFlow; varying vec2 vUv;
      void main(){
        vec3 t = texture2D(map, vUv).rgb;
        vec3 col = uColor * t;
        float phase = fract(vUv.x * 0.5 - uFlow);             // band travels +u = toward the arrow
        float band = smoothstep(0.0, 0.06, phase) * (1.0 - smoothstep(0.06, 0.22, phase));
        col = mix(col, min(col + 0.9, vec3(1.0)), band * 0.85);  // a bright pulse of light running toward the arrow
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const core = new THREE.Mesh(cGeo, coreMat);
  core.renderOrder = 2;
  group.add(shadow, outline, core);

  // ---- hand-drawn arrowhead (slightly irregular, marker-like) ---- (pivot-local coords)
  const a = L[L.length - 1], b = L[Math.max(0, L.length - 4)];
  let hx = a.x - b.x, hz = a.z - b.z; const hl = Math.hypot(hx, hz) || 1; hx /= hl; hz /= hl;
  const px = -hz, pz = hx, HW = 0.86, HL = 1.55;
  const jit = (index * 3.3) % 1;   // deterministic per-route
  const wob = (k) => (Math.sin((k + jit) * 12.9) * 0.5) * 0.16;   // small, deterministic irregularity
  function tri(scale, y) {
    // tip + two barbs, each nudged a touch so it looks drawn, not stamped. aNormal/
    // aHalf let the same TILT_VERT tip the arrowhead toward the camera with the ribbon.
    const tipx = a.x + hx * HL * scale, tipz = a.z + hz * HL * scale;
    const bLx = a.x + px * HW * scale - hx * 0.28 + wob(1) * px, bLz = a.z + pz * HW * scale - hz * 0.28 + wob(1) * pz;
    const bRx = a.x - px * HW * scale - hx * 0.28 + wob(2) * px, bRz = a.z - pz * HW * scale - hz * 0.28 + wob(2) * pz;
    const g2 = new THREE.BufferGeometry();
    g2.setAttribute('position', new THREE.Float32BufferAttribute([tipx, y, tipz, bLx, y, bLz, bRx, y, bRz], 3));
    g2.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 2));
    g2.setAttribute('aNormal', new THREE.Float32BufferAttribute([px, pz, px, pz, px, pz], 2));
    g2.setAttribute('aHalf', new THREE.Float32BufferAttribute([0, HW * scale, -HW * scale], 1));
    g2.setIndex([0, 1, 2]); return g2;
  }
  const arSolid = (col) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(col) }, uTilt: { value: 0 }, uCamDir: { value: new THREE.Vector2(0, -1) } },
    vertexShader: TILT_VERT,
    fragmentShader: `uniform vec3 uColor; void main(){ gl_FragColor = vec4(uColor, 1.0); }`,
  });
  const arShadow = new THREE.Mesh(tri(1.5, 0.045), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.30, depthWrite: false, side: THREE.DoubleSide }));
  arShadow.position.set(0.28, 0, 0.20); arShadow.renderOrder = 0;
  const arWhiteMat = arSolid(outlineCol.getHex()), arColorMat = arSolid(colorHex);
  const arWhite = new THREE.Mesh(tri(1.32, 0.075), arWhiteMat); arWhite.renderOrder = 1;
  const arColor = new THREE.Mesh(tri(1.0, 0.09), arColorMat); arColor.renderOrder = 2;
  const arrow = new THREE.Group(); arrow.add(arShadow, arWhite, arColor);
  group.add(arrow);

  // every tilt-aware material (ribbon + arrowhead) whose uTilt/uCamDir we drive per frame
  const tiltMats = [outlineMat, coreMat, arWhiteMat, arColorMat];

  // ---- SMOOTH draw-on: advance the leading tip continuously (interpolated),
  // not one whole segment at a time ----
  let reveal = 1;
  function apply() {
    const D = clamp(reveal, 0, 1) * total;
    for (const geo of geos) {
      const posAttr = geo.attributes.position, o = geo.userData;
      // restore any previously-borrowed boundary vertex
      if (o.moved >= 0) {
        const base = o.moved * 6;
        posAttr.array[base] = o.orig[base]; posAttr.array[base + 2] = o.orig[base + 2];
        posAttr.array[base + 3] = o.orig[base + 3]; posAttr.array[base + 5] = o.orig[base + 5];
        o.moved = -1;
      }
      if (reveal >= 0.999) { geo.setDrawRange(0, segs * 6); posAttr.needsUpdate = true; continue; }
      const cr = crossAtDist(D, o.widthMul), j = cr.j;   // partial segment j ends exactly at D
      const bi = (j + 1) * 6;                            // vertex (j+1) → interpolated tip cross-section
      posAttr.array[bi] = cr.px; posAttr.array[bi + 2] = cr.pz;
      posAttr.array[bi + 3] = cr.qx; posAttr.array[bi + 5] = cr.qz;
      o.moved = j + 1;
      geo.setDrawRange(0, (j + 1) * 6);
      posAttr.needsUpdate = true;
    }
    arrow.visible = reveal > 0.985;
  }
  apply();

  group.position.set(pivot.x, 0, pivot.z);   // group at the route start; shader tilts each slice in place

  const _cd = new THREE.Vector2();
  return {
    group,
    setReveal(f) { reveal = clamp(f, 0, 1); apply(); },
    setColor(hex) { const c = new THREE.Color(hex); coreMat.uniforms.uColor.value.copy(c); arColorMat.uniforms.uColor.value.copy(c); },
    tick(now) { coreMat.uniforms.uFlow.value = (now || 0) * 0.45; },   // flow the highlight toward the arrow
    // tilt = radians of cross-section lean toward the camera; (cdx,cdz) = world dir to camera
    setTilt(tilt, cdx, cdz) {
      _cd.set(cdx, cdz); if (_cd.lengthSq() > 1e-6) _cd.normalize(); else _cd.set(0, -1);
      for (const m of tiltMats) { m.uniforms.uTilt.value = tilt; m.uniforms.uCamDir.value.copy(_cd); }
    },
    dispose() { shGeo.dispose(); wGeo.dispose(); cGeo.dispose(); coreMat.dispose(); },
  };
}
