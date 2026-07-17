// Cinematic post pipeline — dependency-free, depth-aware:
//   scene(+depth) → bright-pass → gaussian bloom
//                 → half-res scene blur (for depth-of-field)
//   composite: SSAO contact darkening + bloom + depth-of-field (auto-focus on
//   screen center) + ACES tone-map + subtle split-tone grade + film grain + vignette.
// TOGGLE: disabled = plain renderer.render (byte-identical to the raw look).
import { renderer, camera } from './scene.js';

// Reggie's real collage/paper sheet, used as a light overlay to tie the whole
// render into one collage world (blended in the composite pass, low intensity).
let collageReady = false;
const collageSheet = new THREE.TextureLoader().load(encodeURI('field/assets/Scheme Kings Collage sheet.webp'), () => { collageReady = true; });
collageSheet.wrapS = collageSheet.wrapT = THREE.RepeatWrapping;

const size = new THREE.Vector2();
renderer.getDrawingBufferSize(size);

// FILMING RIG — SUBTLE, always-on polish for the NORMAL (orbit) view. Reggie films
// on the normal view and wants it to look leveled-up but NOT overcooked: gentle
// grade, a bit of contact shadow, and depth-of-field that softens the crowd/sky
// behind the play (play at screen-centre stays crisp). The old all-or-nothing
// "Cinematic" toggle (fully cranked ↔ flat, no DoF) is gone — this is just on.
// Live-tunable via window.__post.params.
export const params = {
  bloomThreshold: 0.70, bloomKnee: 0.4, bloomStrength: 0.42, iterations: 4,
  exposure: 1.02, contrast: 1.07, saturation: 1.10, vignette: 1.12,
  shadowTint: new THREE.Color(0.93, 0.98, 1.07),      // faint cool shadows
  highlightTint: new THREE.Color(1.07, 1.03, 0.93),   // faint warm highlights
  aoStrength: 0.34, aoRadius: 4.2,                     // a bit of contact shadow
  dofStrength: 0.82, dofRange: 210.0,                  // background softens; play at screen-centre stays sharp
  dofSharp: 55.0,                                      // depth band (world units) kept crisp around the focus
  grain: 0.018,
  collage: 0.05,                                       // faint procedural halftone bite
  collageTex: 0.06,                                    // faint real collage-sheet paper overlay
};

// Reggie films on the PLAIN normal view — he doesn't want the graded/DoF/cinematic
// look at all. So post is OFF by default: render() just does a plain renderer.render
// (byte-identical to the raw look). Re-enable via window.__post.setEnabled(true).
let enabled = false;

/* fullscreen-quad rig */
const fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const fsScene = new THREE.Scene();
const fsMesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
fsScene.add(fsMesh);
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const brightMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, threshold: { value: 0 }, knee: { value: 0 } },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float threshold, knee; varying vec2 vUv;
    void main(){
      vec3 c = texture2D(tDiffuse, vUv).rgb;
      float l = dot(c, vec3(0.2126,0.7152,0.0722));
      float soft = clamp(l - threshold + knee, 0.0, 2.0*knee);
      soft = soft*soft/(4.0*knee+1e-4);
      float w = max(soft, l - threshold)/max(l,1e-4);
      gl_FragColor = vec4(c*w, 1.0);
    }`,
});

const blurMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() }, texel: { value: new THREE.Vector2() } },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 dir, texel; varying vec2 vUv;
    void main(){
      vec2 o = dir * texel;
      vec3 r = texture2D(tDiffuse, vUv).rgb * 0.227027;
      r += (texture2D(tDiffuse, vUv+o).rgb + texture2D(tDiffuse, vUv-o).rgb) * 0.194595;
      r += (texture2D(tDiffuse, vUv+o*2.0).rgb + texture2D(tDiffuse, vUv-o*2.0).rgb) * 0.121622;
      r += (texture2D(tDiffuse, vUv+o*3.0).rgb + texture2D(tDiffuse, vUv-o*3.0).rgb) * 0.054054;
      r += (texture2D(tDiffuse, vUv+o*4.0).rgb + texture2D(tDiffuse, vUv-o*4.0).rgb) * 0.016216;
      gl_FragColor = vec4(r, 1.0);
    }`,
});

// straight copy (downsample scene → half-res for DOF)
const copyMat = new THREE.ShaderMaterial({
  uniforms: { tDiffuse: { value: null } }, vertexShader: VERT,
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ gl_FragColor = texture2D(tDiffuse, vUv); }`,
});

const compositeMat = new THREE.ShaderMaterial({
  uniforms: {
    tScene: { value: null }, tBloom: { value: null }, tDof: { value: null }, tDepth: { value: null },
    texel: { value: new THREE.Vector2() }, nearFar: { value: new THREE.Vector2() }, time: { value: 0 },
    bloomStrength: { value: 0 }, exposure: { value: 1 }, contrast: { value: 1 }, saturation: { value: 1 }, vignette: { value: 1 },
    shadowTint: { value: new THREE.Color() }, highlightTint: { value: new THREE.Color() },
    aoStrength: { value: 0 }, aoRadius: { value: 5 }, dofStrength: { value: 0 }, dofRange: { value: 100 }, dofSharp: { value: 42 }, grain: { value: 0 }, collage: { value: 0 },
    tCollage: { value: collageSheet }, collageTex: { value: 0 },
  },
  vertexShader: VERT,
  fragmentShader: `
    uniform sampler2D tScene, tBloom, tDof, tDepth;
    uniform vec2 texel, nearFar; uniform float time;
    uniform float bloomStrength, exposure, contrast, saturation, vignette, aoStrength, aoRadius, dofStrength, dofRange, dofSharp, grain, collage;
    uniform vec3 shadowTint, highlightTint;
    uniform sampler2D tCollage; uniform float collageTex;
    varying vec2 vUv;
    float linz(float d){ float z = d*2.0-1.0; return (2.0*nearFar.x*nearFar.y)/(nearFar.y+nearFar.x - z*(nearFar.y-nearFar.x)); }
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
    float rand(vec2 c){ return fract(sin(dot(c, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      float dC = linz(texture2D(tDepth, vUv).r);
      // --- cheap screen-space contact occlusion: neighbours closer to camera darken ---
      float occ = 0.0; const int N = 10;
      vec2 dir[10];
      dir[0]=vec2(1.,0.); dir[1]=vec2(-1.,0.); dir[2]=vec2(0.,1.); dir[3]=vec2(0.,-1.);
      dir[4]=vec2(.7,.7); dir[5]=vec2(-.7,.7); dir[6]=vec2(.7,-.7); dir[7]=vec2(-.7,-.7);
      dir[8]=vec2(.4,.9); dir[9]=vec2(-.9,.4);
      for(int i=0;i<N;i++){
        vec2 s = vUv + dir[i]*texel*aoRadius;
        float sd = linz(texture2D(tDepth, s).r);
        float diff = dC - sd;                       // >0 => neighbour is nearer (occluder)
        occ += (diff > 0.15 && diff < aoRadius*2.5) ? 1.0 : 0.0;
      }
      float ao = 1.0 - (occ / float(N)) * aoStrength;

      vec3 sharp = texture2D(tScene, vUv).rgb;
      // --- depth of field: auto-focus on whatever is at screen centre ---
      float focus = linz(texture2D(tDepth, vec2(0.5)).r);
      // sharp band (dofSharp world-units past focus) keeps the play crisp; beyond it softens
      float coc = clamp((dC - focus - dofSharp) / dofRange, 0.0, 1.0) * dofStrength;
      vec3 blur = texture2D(tDof, vUv).rgb;
      vec3 col = mix(sharp, blur, coc) * ao;

      col += texture2D(tBloom, vUv).rgb * bloomStrength;
      col *= exposure;
      col = aces(col);
      float l = dot(col, vec3(0.2126,0.7152,0.0722));
      col *= mix(shadowTint, vec3(1.0), smoothstep(0.0,0.55,l)) * mix(vec3(1.0), highlightTint, smoothstep(0.45,1.0,l));
      col = (col-0.5)*contrast + 0.5;
      float g = dot(col, vec3(0.299,0.587,0.114));
      col = mix(vec3(g), col, saturation);
      col += (rand(vUv + fract(time)) - 0.5) * grain;     // film grain
      // --- light collage/halftone treatment (STATIC, uv-based → no per-frame shimmer) ---
      if(collage > 0.001){
        vec2 sc = vUv / texel;                              // pixel coords
        float lum = dot(col, vec3(0.299,0.587,0.114));
        vec2 gp = fract(sc / 4.5) - 0.5;                    // fine halftone dot grid
        float dm = smoothstep(0.5, 0.16, length(gp));       // dot mask
        col *= mix(1.0, 1.0 - dm*0.4, (1.0-lum) * collage);  // print-like: bites more in the shadows
        col += (rand(floor(sc/1.5)) - 0.5) * 0.05 * collage; // static paper fibre
      }
      // real collage/paper sheet overlay (light) — ties it into one collage world
      if(collageTex > 0.001){
        vec3 paper = texture2D(tCollage, vUv * 1.4).rgb;
        float pl = dot(paper, vec3(0.333));
        col = mix(col, col * (0.72 + 0.56*pl), collageTex);
      }
      float d = length(vUv-0.5) * vignette;
      col *= mix(1.0, smoothstep(0.95,0.28,d), 0.5);
      gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
    }`,
});

/* render targets */
const rtOpts = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat };
let rtScene, rtBright, rtA, rtB, rtDofA, rtDofB;
function buildTargets() {
  renderer.getDrawingBufferSize(size);
  const w = Math.max(2, size.x), h = Math.max(2, size.y);
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
  rtScene = new THREE.WebGLRenderTarget(w, h, rtOpts);
  rtScene.depthTexture = new THREE.DepthTexture(w, h);
  rtScene.depthTexture.type = THREE.UnsignedIntType;   // 24-bit depth — matches the screen, kills z-fighting
  rtBright = new THREE.WebGLRenderTarget(hw, hh, rtOpts);
  rtA = new THREE.WebGLRenderTarget(hw, hh, rtOpts);
  rtB = new THREE.WebGLRenderTarget(hw, hh, rtOpts);
  rtDofA = new THREE.WebGLRenderTarget(hw, hh, rtOpts);
  rtDofB = new THREE.WebGLRenderTarget(hw, hh, rtOpts);
  blurMat.uniforms.texel.value.set(1 / hw, 1 / hh);
  compositeMat.uniforms.texel.value.set(1 / w, 1 / h);
}
buildTargets();
function resize() {
  if (rtScene) { rtScene.dispose(); rtBright.dispose(); rtA.dispose(); rtB.dispose(); rtDofA.dispose(); rtDofB.dispose(); }
  buildTargets();
}
window.addEventListener('resize', resize);

function drawPass(material, target) {
  fsMesh.material = material;
  renderer.setRenderTarget(target || null);
  renderer.render(fsScene, fsCam);
}

export function render(scene, camera_) {
  if (!enabled) { renderer.setRenderTarget(null); renderer.render(scene, camera_); return; }

  renderer.setRenderTarget(rtScene);                    // 1. scene (+depth)
  renderer.render(scene, camera_);

  brightMat.uniforms.tDiffuse.value = rtScene.texture;  // 2. bloom
  brightMat.uniforms.threshold.value = params.bloomThreshold;
  brightMat.uniforms.knee.value = params.bloomKnee;
  drawPass(brightMat, rtBright);
  let src = rtBright;
  for (let i = 0; i < params.iterations; i++) {
    blurMat.uniforms.tDiffuse.value = src.texture;
    blurMat.uniforms.dir.value.set(1, 0); drawPass(blurMat, rtA);
    blurMat.uniforms.tDiffuse.value = rtA.texture;
    blurMat.uniforms.dir.value.set(0, 1); drawPass(blurMat, rtB);
    src = rtB;
  }

  copyMat.uniforms.tDiffuse.value = rtScene.texture;    // 3. half-res scene blur → DOF
  drawPass(copyMat, rtDofA);
  for (let i = 0; i < 2; i++) {
    blurMat.uniforms.tDiffuse.value = rtDofA.texture;
    blurMat.uniforms.dir.value.set(1, 0); drawPass(blurMat, rtDofB);
    blurMat.uniforms.tDiffuse.value = rtDofB.texture;
    blurMat.uniforms.dir.value.set(0, 1); drawPass(blurMat, rtDofA);
  }

  const u = compositeMat.uniforms;                      // 4. composite → screen
  u.tScene.value = rtScene.texture; u.tBloom.value = rtB.texture; u.tDof.value = rtDofA.texture; u.tDepth.value = rtScene.depthTexture;
  u.nearFar.value.set(camera.near, camera.far); u.time.value = performance.now() * 0.001;
  u.bloomStrength.value = params.bloomStrength; u.exposure.value = params.exposure;
  u.contrast.value = params.contrast; u.saturation.value = params.saturation; u.vignette.value = params.vignette;
  u.shadowTint.value.copy(params.shadowTint); u.highlightTint.value.copy(params.highlightTint);
  u.aoStrength.value = params.aoStrength; u.aoRadius.value = params.aoRadius;
  u.dofStrength.value = params.dofStrength; u.dofRange.value = params.dofRange; u.dofSharp.value = params.dofSharp; u.grain.value = params.grain; u.collage.value = params.collage;
  u.collageTex.value = collageReady ? params.collageTex : 0;
  drawPass(compositeMat, null);
  renderer.setRenderTarget(null);
}

export function setEnabled(b) { enabled = !!b; return enabled; }
export function toggle() { enabled = !enabled; return enabled; }
export function isEnabled() { return enabled; }
