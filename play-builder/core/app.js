// Bootstrap — Reggie's real Oregon stadium in its FIELD VIEW state, exactly as
// the war room presents it (snapToField ~L4167 + the living-stadium FX block
// ~L5194-5233 of war_room_test.html). Drive Builder left behind.
import { renderer, scene, camera } from './scene.js';
import { orbit, attachOrbitControls, panFrame, FIELD_POSES, BROADCAST, DEFAULT_VIEW, ORBIT_TARGET } from './orbit.js';
import { buildStadiumWorld } from '../field/stadium.js';
import { buildPlayCards } from '../field/play-cards.js';
import { off, initOffense, cameraTick, inCinema, tickPlayers, tickRoutes, throwToRead, throwToLowestRead, isThrown, isCaught, isCarrying, getBallPos, getThrowToPos, getTargetPos, runPlay, resetRun, setPresenter, setStage, isTyping, syncCamPicker } from '../offense/offense.js';
import * as post from './post.js';
import * as readSeq from '../presenter/read-sequence.js';
import * as camPresets from '../presenter/camera-presets.js';
import * as filmCam from '../presenter/film-cam.js';
import { buildPopulate } from '../field/populate.js';
import { tickDefense } from '../defense/defense.js';
import { setMode, getMode } from '../core/mode.js';
import { setPlayType, getPlayType } from '../offense/offense.js';
import * as studio from '../core/studio.js';
import * as dock from '../core/dock.js';
import * as cover from '../core/cover.js';
import { initAuth } from '../core/cloud.js';

// Sign-in state (shared session with the coaching app) — resolved in the
// background so "Save play" knows who you are without ever blocking the field.
initAuth();

const readout = document.getElementById('readout');
const hud = document.getElementById('hud');

let stadium = null;
let playCards = null;
let populate = null;

scene.background = new THREE.Color(0x03060a);   // night: any uncovered pixel is black, never cyan

// MOBILE GATE — the 3D builder needs a mouse (orbit/zoom) and keyboard, so on a
// phone or tablet we DON'T boot the heavy world at all. We show a clean "open on a
// computer" card instead — cheaper for them (no 11 MB of assets) and honest.
function isMobileDevice() {
  if (new URLSearchParams(location.search).get('desktop') === '1') return false;   // manual override
  const ua = navigator.userAgent || '';
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;           // iPadOS reports as a Mac
  if (window.matchMedia('(pointer: coarse)').matches && Math.min(screen.width, screen.height) < 820) return true;
  return false;
}
function showDesktopOnly() {
  const q = new URLSearchParams(location.search); q.set('desktop', '1');
  const anyway = location.pathname + '?' + q.toString();
  const el = document.createElement('div');
  el.id = 'pd-desktop-only';
  el.innerHTML = `
    <div class="pd-do-card">
      <img class="pd-do-crest" src="assets/sk-logo.png" alt="">
      <div class="pd-do-title">Best on the big screen</div>
      <p class="pd-do-sub">King Reggie's Play Builder draws plays in 3D — it needs a mouse and keyboard. Open this page on a <b>desktop or laptop</b> to build.</p>
      <a class="pd-do-anyway" href="${anyway}">Open anyway →</a>
    </div>`;
  const s = el.style;
  s.position = 'fixed'; s.inset = '0'; s.zIndex = '999999';
  s.display = 'flex'; s.alignItems = 'center'; s.justifyContent = 'center';
  s.padding = '24px'; s.background = 'radial-gradient(120% 120% at 50% 0%, #1b2c52 0%, #0b1428 60%, #060c1c 100%)';
  s.font = "400 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif";
  const css = document.createElement('style');
  css.textContent = `
    #pd-desktop-only .pd-do-card { max-width: 340px; text-align: center; color: #dfe6f5; }
    #pd-desktop-only .pd-do-crest { width: 62px; height: 62px; margin-bottom: 14px; }
    #pd-desktop-only .pd-do-title { font: 900 22px/1.1 system-ui, sans-serif; letter-spacing: .5px; text-transform: uppercase; color: #fff; margin-bottom: 10px; }
    #pd-desktop-only .pd-do-title::after { content:""; display:block; width:46px; height:3px; margin:11px auto 0; border-radius:2px; background:#ffd15a; }
    #pd-desktop-only .pd-do-sub { margin: 0 0 18px; color: #aeb9d4; }
    #pd-desktop-only .pd-do-sub b { color: #fff; }
    #pd-desktop-only .pd-do-anyway { display:inline-block; font: 700 12px system-ui, sans-serif; letter-spacing:.4px; color:#8ea6d8; text-decoration:none; opacity:.7; }
    #pd-desktop-only .pd-do-anyway:hover { opacity:1; color:#ffd15a; }`;
  document.head.appendChild(css);
  document.body.appendChild(el);
  document.body.classList.add('mobile-blocked');
}
const IS_MOBILE = isMobileDevice();

// The cover paints instantly from index.html and holds the door shut while the
// world builds; without it a first-time visitor watches a black rectangle and
// assumes it's broken. A shared link (?p=) skips it — they came for a play.
// A shared link skips the cover entirely — they came for a play, not a pitch — and
// skipping BEFORE build means its backdrop video is never even requested.
if (IS_MOBILE) showDesktopOnly();
else if (new URLSearchParams(location.search).get('p')) cover.skipCover();
else cover.buildCover(() => { if (window.__coverOpened) window.__coverOpened(); });

(async () => {
  if (IS_MOBILE) return;   // don't boot the 3D world on a phone/tablet
  try {
    stadium = await buildStadiumWorld(renderer, 'field/assets/');
    scene.add(stadium.group);

    /* --- snapToField state (ported) --- */
    stadium.group.scale.setScalar(1);
    stadium.group.position.y = 0;
    for (const o of Object.values(stadium.env)) o.visible = true;
    stadium.anchorsGrp.visible = false;   // field view stays clean (Drive Builder nav is gone)
    stadium.FX.flash.points.visible = true;
    for (const c of stadium.boardCovers) c.visible = false;   // scoreboard always lit here

    // NOTE: the presenter "PA Y Flood / Wing Trio" play-cards from the other TikTok
    // flow are intentionally NOT built here — this filming rig films the live play on
    // the field, so those standing endzone cards would just clutter the shot.
    // (Re-enable with buildPlayCards(scene, renderer) if you ever want them.)

    // Filming Rig — populate the stadium with Reggie's real collage crowd + signs
    populate = await buildPopulate();
    window.__populate = populate;

    window.__stadium = stadium;
    // Re-frame the horizon footage live, no reload: __backdrop(from, to) where
    // 0 = the clip's bottom edge and 1 = its top. __backdrop() reports the current.
    window.__backdrop = (from, to) => (stadium.setBackdropFrame ? stadium.setBackdropFrame(from, to) : null);
    readout.textContent = '';
    // (#hud is display:none in ui.css — the console's live hint replaced it. The old
    //  text also advertised ] and [ shortcuts that were never bound to anything.)
    cover.coverReady();          // the world is up — "Open the builder" can actually open it
  } catch (e) {
    readout.textContent = 'STADIUM ERR: ' + (e && e.message);
    console.error(e);
    // Say it ON the cover. The cover sits above everything, so an error painted
    // anywhere else during boot is underneath it and never seen.
    cover.coverFatal('<b>The stadium didn’t load</b><span>Refresh the page. If it keeps happening, your browser may be blocking WebGL.</span>');
  }
})();

/* boot the camera at the broadcast framing */
camera.position.copy(BROADCAST);
camera.lookAt(ORBIT_TARGET);
orbit.syncFromCamera();
orbit.enabled = true;

/* offense registers its pointer handlers FIRST (capture) so clicking/dragging a
   player never fights the orbit; unclaimed drags fall through to the camera */
initOffense();
attachOrbitControls(renderer.domElement);

/* debug handles (harmless in production) */
import('../offense/offense.js').then((m) => { window.__off = m.off; window.__refresh = m.refresh; window.__runPlay = m.runPlay; window.__toggle = m.togglePlay; window.__throwTo = m.throwTo; window.__reset = m.resetRun; window.__cameraTick = m.cameraTick; window.__cinema = m.startCinema; window.__cinemaStop = m.stopCinema; });
window.__orbit = orbit;
window.__camera = camera;
window.__target = ORBIT_TARGET;
window.__render = () => post.render(scene, camera);   // force a frame (pane pauses rAF when hidden)
window.__post = post;
import('../core/render-fx.js').then((m) => { window.__cine = m.setCinematic; window.__cineFx = m; });
window.__scene = scene;
import('../core/play-spec.js').then((m) => { window.__spec = m; });   // capture/apply a play as portable JSON
import('../core/cloud.js').then((m) => { window.__cloud = m; });      // auth + Save play

/* THROW CONTROL: throw the ball to a prescribed read on your cue.
   1/2/3/4 → throw to that read · Q → check-down · T → throw to the lowest read.
   (No throw pressed → the play auto-throws to the money read when routes finish.) */
window.addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  const rank = { '1': 1, '2': 2, '3': 3, '4': 4, 'q': 5, 'Q': 5 }[e.key];
  if (rank) { throwToRead(rank); return; }
  if (e.key === 't' || e.key === 'T') throwToLowestRead();
});

/* Camera capture — grab the CURRENT framing (camera position + look target) so
   Reggie can orbit to a shot and hand me the numbers to bake into a cinematic
   path. A big CLICK BUTTON (no keyboard-focus issues) + the C key both trigger
   it; the result shows in a large on-screen box (selectable so it works even if
   the clipboard is blocked) and is copied to the clipboard. */
// The capture BUTTON now lives in the Studio drawer (wired further down); the C
// key and window.__capture() still work exactly as before.
const capBox = document.createElement('div');
capBox.id = 'pd-capture-out';
capBox.style.cssText = 'position:fixed;top:58px;left:50%;transform:translateX(-50%);z-index:60;display:none;' +
  'max-width:92vw;font:600 15px ui-monospace,Menlo,Consolas,monospace;color:#eaf1ff;text-align:center;' +
  'background:rgba(8,18,40,.95);border:1px solid rgba(245,183,61,.65);border-radius:10px;padding:12px 16px;' +
  'box-shadow:0 8px 24px rgba(0,0,0,.5);user-select:all;-webkit-user-select:all;';
const capStyle = document.createElement('style');
capStyle.textContent = 'body.ui-hidden #pd-capture-out{opacity:0;pointer-events:none}';
document.head.appendChild(capStyle);
document.body.appendChild(capBox);
let capTimer = 0;
function captureCamera() {
  const p = camera.position, t = ORBIT_TARGET;
  const f = (v) => `${v.x.toFixed(1)}, ${v.y.toFixed(1)}, ${v.z.toFixed(1)}`;
  const line = `pos(${f(p)})  look(${f(t)})`;
  readout.textContent = '📸 ' + line;
  console.log('[camera capture] ' + line);
  let copied = false;
  try { navigator.clipboard.writeText(line).catch(() => {}); copied = true; } catch {}
  capBox.innerHTML = '<div style="color:#f5b83d;font-size:11px;letter-spacing:.1em;margin-bottom:7px">' +
    (copied ? 'CAMERA CAPTURED · COPIED TO CLIPBOARD ✓' : 'CAMERA CAPTURED · SELECT + COPY THIS') + '</div>' + line;
  capBox.style.display = 'block';
  clearTimeout(capTimer);
  capTimer = setTimeout(() => { capBox.style.display = 'none'; }, 8000);
}
window.addEventListener('keydown', (e) => {
  if (e.key !== 'c' && e.key !== 'C') return;
  if (isTyping(e)) return;
  captureCamera();
});
window.__capture = captureCamera;

/* ============================ PRESENTER SHOTS ============================
   Keypress-triggered cinematic camera moves that fly to a framing and HOLD there,
   locked, for compositing. Bezier path + eased look lerp; parks on the target
   until Esc / a drag releases it. Triggers:
     5 = cold open (fixed start behind the Jumbotron → breakdown hold)
     6 = high overhead look at the whole field
     7 = swoop down over the field → up to the vertical board (slams in)
   6 and 7 start from WHEREVER the camera currently is, so the flow can be
   5→7 (straight to the board) OR 5→6→7 (via the overhead). */
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const SHOTS = {
  open:  { start: { pos: V(-1.8, 72.9, 266.5), look: V(0, 2, 0) },
           to: V(-0.1, 43.9, -74.3), look1: V(-0.1, 29.4, 0.3), ctrl: V(38, 120, 90), dur: 4.4 },
  view6: { fromCurrent: true, to: V(0, 120.9, -41.1), look1: V(0, 2, 0), arc: 'over', dur: 2.6 },
  swoop: { fromCurrent: true, to: V(0, 50.1, -3.9), look1: V(0, 49, 97), arc: 'dip', swap: true, dur: 2.8 },
};
let shot = null;
const _sp = new THREE.Vector3(), _sl = new THREE.Vector3(), _fwd = new THREE.Vector3();
const smoother = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * t * (t * (t * 6 - 15) + 10); };
function bez3(out, p0, pc, p1, t) {   // quadratic bezier
  const u = 1 - t;
  out.copy(p0).multiplyScalar(u * u).addScaledVector(pc, 2 * u * t).addScaledVector(p1, t * t);
  return out;
}
// a point along the camera's current forward, so a from-current shot's look lerp starts smooth
function currentLook() { camera.getWorldDirection(_fwd); return camera.position.clone().add(_fwd.multiplyScalar(120)); }

/* board swap + slam-down: mid-swoop (while the camera is looking down at the
   field) we hide the 16:9 board and drop the vertical 9:16 board in with an
   overshoot, so it "slams" into place as the camera rises back up to it. */
const SLAM_DUR = 0.8, SLAM_RISE = 80;
let slamT = -1;   // -1 idle; 0..1 slamming
const backOut = (t) => { const c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3 * u * u * u + c1 * u * u; };
function boardVertical() {
  if (!stadium || !stadium.setBoardVertical) return;
  stadium.setBoardVertical(true);
  stadium.boardV.mesh.position.y = stadium.boardV.restY + SLAM_RISE;   // start high, off-frame
  slamT = 0;
}
function boardWide() { if (stadium && stadium.setBoardVertical) { stadium.setBoardVertical(false); slamT = -1; } }
function slamTick(dt) {
  if (slamT < 0 || !stadium || !stadium.boardV) return;
  slamT = Math.min(1, slamT + dt / SLAM_DUR);
  stadium.boardV.mesh.position.y = stadium.boardV.restY + SLAM_RISE * (1 - backOut(slamT));
  if (slamT >= 1) slamT = -1;
}

function startShot(key) {
  const cfg = SHOTS[key];
  if (!cfg) return;
  if (key === 'open') boardWide();                 // the opener resets to the wide board
  const from = cfg.fromCurrent ? camera.position.clone() : cfg.start.pos.clone();
  const look0 = cfg.fromCurrent ? currentLook() : cfg.start.look.clone();
  let ctrl;
  if (cfg.ctrl) ctrl = cfg.ctrl.clone();
  else {
    const mid = from.clone().add(cfg.to).multiplyScalar(0.5);
    if (cfg.arc === 'dip') ctrl = V(mid.x, 12, mid.z);                                  // dip low over the field
    else if (cfg.arc === 'over') ctrl = V(mid.x, Math.max(from.y, cfg.to.y) + 22, mid.z);  // gentle arc up
    else ctrl = mid;
  }
  shot = { key, t: 0, swapped: false, from, look0, ctrl, to: cfg.to, look1: cfg.look1, dur: cfg.dur, swap: !!cfg.swap };
}
function shotFrame(dt) {
  shot.t = Math.min(1, shot.t + dt / shot.dur);
  const e = smoother(shot.t);
  bez3(_sp, shot.from, shot.ctrl, shot.to, e);
  _sl.copy(shot.look0).lerp(shot.look1, e);
  camera.position.copy(_sp);
  camera.lookAt(_sl);         // at t=1 it parks on the target framing and holds
  // swap the board ~45% through the swoop (camera looking at the field) so the
  // vertical board slams in as the camera rises to it
  if (shot.swap && !shot.swapped && shot.t > 0.45) { shot.swapped = true; boardVertical(); }
}
function endShot() { if (shot) { shot = null; orbit.syncFromCamera(); } }
window.__boardVertical = boardVertical; window.__boardWide = boardWide;
window.addEventListener('keydown', (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.key === '5') startShot('open');
  else if (e.key === '6') startShot('view6');
  else if (e.key === '7') startShot('swoop');
  else if (e.key === 'Escape') endShot();
});
renderer.domElement.addEventListener('pointerdown', endShot);   // grabbing the camera releases the shot
window.__shot = startShot; window.__endShot = endShot;
window.__shotState = () => (shot ? { ...shot } : null);

/* ======================= STUDIO DRAWER (Filming Rig) =======================
   Everything that exists to make CONTENT rather than to draw a play: run plays,
   Full 11, the Jumbotron END CTA, camera capture, the 9:16 stages, Present.
   All of it still runs exactly as before — it's just behind one toggle now, so a
   normal user never sees it. Built on the same ui.css tokens as the rest of the
   app (the old #film-reads box was hand-styled dark navy and looked like a
   different product bolted on).

   Author a play, then run the scripted read list: each fires the ball to a target
   from a preset camera angle, holding on your cue. Edit live via
   window.__reads.sequence = [...]. */
const readsBox = document.createElement('div');
readsBox.className = 'pd-secwrap';
readsBox.id = 'pd-studio';
readsBox.innerHTML = `
  <div class="pd-group">
    <span class="pd-group-cap">Play type</span>
    <div class="pd-seg" id="film-ptype">
      <button data-pt="pass">Pass</button><button data-pt="run">Run</button>
    </div>
  </div>
  <div class="pd-group">
    <span class="pd-group-cap">Personnel</span>
    <div class="pd-seg" id="pd-mode">
      <button data-mode="7on7">7-on-7</button><button data-mode="full11">Full 11</button>
    </div>
  </div>
  <div class="pd-group">
    <span class="pd-group-cap">Filming</span>
    <div class="pd-group-row">
      <button id="pd-present" class="pd-btn">🎬 Present</button>
      <button id="pd-intro" class="pd-btn">🎬 End CTA</button>
    </div>
    <div class="pd-group-row">
      <button id="pd-capture" class="pd-btn">📸 Capture cam</button>
    </div>
  </div>
  <div class="pd-group">
    <span class="pd-group-cap">Preview frame</span>
    <div class="pd-group-row" id="pd-stagerow">
      <button class="pd-btn stage-opt on" data-stage="full">Desktop</button>
      <button class="pd-btn stage-opt" data-stage="phone">9:16</button>
      <button class="pd-btn stage-opt" data-stage="phonebottom">Bottom ⅓</button>
    </div>
  </div>
  <div class="pd-studio-note" id="film-read-now">
    Throw on your cue: <b>1 2 3 4</b> reads · <b>Q</b> check-down · <b>T</b> money read.
    No key auto-throws when routes finish.<br><b>P</b> run · <b>O</b> outro · <b>5 6 7</b> presenter shots · <b>Esc</b> reset.
  </div>
  <div class="pd-group">
    <span class="pd-group-cap">Studio mode</span>
    <button id="pd-studio-off" class="pd-btn full">Turn Studio off</button>
  </div>`;
dock.panelBody('studio').appendChild(readsBox);
readsBox.querySelector('#pd-studio-off').onclick = () => { studio.setStudio(false); dock.close(); };

// A segmented control that paints itself from a getter — one helper for both the
// play-type and personnel toggles (they were two near-identical inline blocks).
function wireSeg(el, get, set) {
  const paint = () => { const v = get(); el.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.pt === v || b.dataset.mode === v)); };
  el.querySelectorAll('button').forEach((b) => { b.onclick = () => { set(b.dataset.pt || b.dataset.mode); paint(); }; });
  paint();
  return paint;
}
const paintPtype = wireSeg(readsBox.querySelector('#film-ptype'), getPlayType, setPlayType);
const paintMode = wireSeg(readsBox.querySelector('#pd-mode'), getMode, setMode);

// preview framing (9:16 / bottom-third) — a filming aid, so it lives here now
const stageRow = readsBox.querySelector('#pd-stagerow');
stageRow.onclick = (e) => {
  const b = e.target.closest('[data-stage]'); if (!b) return;
  setStage(b.dataset.stage);
  stageRow.querySelectorAll('.stage-opt').forEach((o) => o.classList.toggle('on', o === b));
};

// Present (cinematic auto-cam) + the Jumbotron end-card
const presBtn = readsBox.querySelector('#pd-present');
presBtn.onclick = () => { const on = !off.presenter; setPresenter(on); presBtn.classList.toggle('on', on); };
readsBox.querySelector('#pd-intro').onclick = () => endCTA();

/* STUDIO is a dock tab now (hidden by the studio-only class until unlocked).
   Ctrl+Shift+S toggles the layer — no visible switch for a consumer to trip over. */
window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
    e.preventDefault();
    const on = studio.toggleStudio();
    if (on) dock.open('studio'); else if (dock.getOpen() === 'studio') dock.close();
  }
});
studio.onStudio((on) => { if (!on && dock.getOpen() === 'studio') dock.close(); });

/* CAMERA picker — lives in the consumer console (offense.js builds the shell;
   film-cam's shot list is filled here to keep offense↔film-cam acyclic). */
const shotSel = document.getElementById('pd-shot');
if (shotSel) {
  shotSel.innerHTML = filmCam.SHOT_ORDER
    .map((k) => `<option value="${k}">${k === 'free' ? '🎥 Free — you control' : filmCam.SHOTS[k].label}</option>`).join('');
  shotSel.onchange = (e) => { filmCam.setShot(e.target.value); camFreed = false; };   // picking a shot re-arms the auto cameras
}

/* ESCAPE — from ANY camera view, at ANY point in a play, bail straight back to the
   free orbit camera you control. A picked shot (Receiver POV, etc.) used to trap
   you in it until you re-opened the View panel and switched back to Free by hand;
   now one key releases everything and drops the camera in your hands right where it
   is. camFreed also stands the auto ball-follow down for the rest of THIS play, so
   Escape works even mid-throw or on a frozen/paused frame — not just pre-snap. */
function escapeToFree() {
  filmCam.setShot('free');
  if (shotSel) shotSel.value = 'free';
  readSeq.stop(); camPresets.stop();
  endShot();                                                   // release a 5/6/7 presenter shot
  if (off.presenter) { setPresenter(false); if (presBtn) presBtn.classList.remove('on'); }
  if (stadium) {
    if (stadium.setBoardOutro) stadium.setBoardOutro(false);
    if (stadium.setCTAGraphic) stadium.setCTAGraphic(false);
  }
  syncCamPicker('free');                                       // hide the Track picker
  camFreed = true; followInit = false;
  orbit.enabled = true;
  orbit.syncFromCamera();                                      // seed the orbit from wherever the camera is now
  orbit.flyToPos(DEFAULT_VIEW);                                // then glide to the medium, un-zoomed behind-QB home
}
window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  if (e.key === 'Escape') escapeToFree();
});
window.__escapeToFree = escapeToFree;
const readNow = readsBox.querySelector('#film-read-now');
// Jumbotron outro end-card: swoop onto the board + flip it to the YouTube CTA.
function playOutro() {
  camPresets.startPreset('jumbotron');
  if (stadium && stadium.setBoardOutro) stadium.setBoardOutro(true);
  if (readNow) readNow.innerHTML = '<b style="color:#ffd15a">OUTRO</b> · Jumbotron end-card · Esc to reset';
}
function doRun() { if (stadium && stadium.setBoardOutro) stadium.setBoardOutro(false); if (stadium && stadium.setCTAGraphic) stadium.setCTAGraphic(false); runPlay(); }
// END CTA: from WHEREVER the camera is now, swoop-zoom onto the Jumbotron + drop in
// the "watch the full breakdown on YouTube" sign underneath, pointing up at it.
function endCTA() { if (stadium && stadium.setBoardOutro) stadium.setBoardOutro(false); if (stadium && stadium.setCTAGraphic) stadium.setCTAGraphic(true); camPresets.startPreset('jumbotron'); }
window.__endCTA = endCTA;
// (#film-run / #film-reset are gone — RUN and RESET already exist in the console.
//  They were a duplicate pair of the same two actions.)
readsBox.querySelector('#pd-capture').onclick = captureCamera;
window.addEventListener('keydown', (e) => {
  if (isTyping(e)) return;
  if (e.key === 'p' || e.key === 'P') doRun();
  else if (e.key === 'o' || e.key === 'O') playOutro();
  else if (e.key === 'Escape') { readSeq.stop(); camPresets.stop(); if (stadium && stadium.setBoardOutro) stadium.setBoardOutro(false); if (stadium && stadium.setCTAGraphic) stadium.setCTAGraphic(false); }
});
window.__reads = readSeq; window.__camPreset = camPresets; window.__outro = playOutro;

/* PERSONNEL (7-on-7 ↔ Full 11) now lives in the Studio drawer above — it was a
   second, separately hand-styled floating box at top-centre. */
window.__setMode = (m) => { setMode(m); paintMode(); };
window.__studio = studio;
window.__filmCam = filmCam;   // dev: drive a shot's camera frame-by-frame for capture verification
import('../defense/defense.js').then((m) => { window.__def = m; });
window.__tickBillboards = (cam) => { if (populate) populate.update(0, cam); tickPlayers(0, cam); tickDefense(0, cam); tickRoutes(0, cam); };
import('../offense/offense.js').then((m) => { window.__scrub = m.scrubTo; });

/* ---- render loop with the living-stadium effects (ported verbatim) ---- */
const followLook = new THREE.Vector3(), followDest = new THREE.Vector3(); let followInit = false;   // ball-follow + push-in on a throw
let camFreed = false, wasRunning = false;   // Escape hands the camera to you for the rest of this play; a fresh run re-arms the auto cams
let last = performance.now();
function loop(nowMs) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (nowMs - last) / 1000); last = nowMs;
  const now = nowMs / 1000;

  if (stadium) {
    const F = stadium.FX;
    // ribbon no longer scrolls — it's a static "SCHEME KINGS · KING REGGIE'S" band (Reggie: kill the loop anim)
    F.crowd.offset.x = Math.sin(now * 1.9) * 0.00045;
    F.crowd.offset.y = Math.sin(now * 1.15) * 0.00035;
    if (F.board) {
      const cine = inCinema();
      if (cine !== F.board.cinema) {                // intro swoop flipped → switch the board instantly
        F.board.cinema = cine; F.board.last = now;
        stadium.drawBoardFace(F.board, now);
      } else if (now - F.board.last > 0.25) {
        F.board.last = now;
        stadium.drawBoardFace(F.board, now);
      }
    }
    if (F.flash) {
      const cAttr = F.flash.points.geometry.attributes.color;
      for (let i = 0; i < F.flash.meta.length; i++) {
        const m = F.flash.meta[i];
        const k = (now + m.off) % m.dur;
        const v = k < 0.14 ? 1 - k / 0.14 : 0;
        cAttr.setXYZ(i, v, v, v);
      }
      cAttr.needsUpdate = true;
    }
    F.sky.rotation.y = F.sky.userData.base + now * 0.0022;
    for (const c of F.cards)
      c.rotation.y = Math.atan2(camera.position.x - c.position.x, camera.position.z - c.position.z);
    for (const f of F.flags) {
      const pos = f.geometry.attributes.position, base = f.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const bx = base[i * 3], k = bx / 1.5;
        pos.setZ(i, Math.sin(bx * 4.5 + now * 5 + f.userData.phase) * 0.12 * k);
        pos.setY(i, base[i * 3 + 1] + Math.sin(bx * 3 + now * 4 + f.userData.phase) * 0.04 * k);
      }
      pos.needsUpdate = true;
    }
    if (F.envFx) {                                  // war room env life (ported verbatim)
      for (const m of F.envFx.mist)                 // the valley fog breathes sideways
        m.s.position.x = m.bx + Math.sin(now * m.sp * 10 + m.ph) * m.amp;
      for (const L of F.envFx.lights)               // camp fires flicker far below
        L.s.material.opacity = 0.34 + 0.18 * Math.sin(now * 1.6 + L.ph) + 0.07 * Math.sin(now * 5.3 + L.ph * 3);
      for (const m of F.envFx.cliffMats)            // the moonlit rock breathes faintly
        m.emissiveIntensity = 0.22 + 0.035 * Math.sin(now * 0.85) + 0.012 * Math.sin(now * 2.9);
    }
  }

  if (populate) populate.update(now, camera); // crowd billboards + drift
  tickPlayers(now, camera);                   // offense cards billboard + bob
  tickDefense(now, camera);                   // defense cards billboard
  tickRoutes(now, camera);                    // route flow + camera-height parallax tilt

  slamTick(dt);                                                   // drive the vertical-board slam if active
  if (stadium && stadium.tickCTA) stadium.tickCTA(dt, camPresets.isSettled());   // CTA sign: slam in once the camera settles, then animate
  readSeq.update(dt);                                             // drive the read-sequence's deferred throw
  if (off.running && !wasRunning) camFreed = false;               // a brand-new run re-arms the auto cameras (Escape's release was per-play)
  wasRunning = off.running;
  if (camPresets.isActive()) camPresets.update(dt);              // a read-sequence camera preset owns the frame
  else if (shot) shotFrame(dt);                                   // a presenter shot owns the camera when active
  else if (camFreed) { followInit = false; panFrame(dt); orbit.update(dt, now); }   // Escape → your orbit owns the camera, even mid-play
  else if (filmCam.isDriving() || filmCam.isPreviewing()) filmCam.update(dt);   // RUN shot flies; or pre-snap preview parks the receiver-POV framing
  else if (!cameraTick(dt)) {
    // On a throw, TAKE OVER from orbit: push in ~30% toward the catch area and follow
    // the ball onto the receiver (if orbit.update kept running it would snap the
    // camera back every frame, so the push-in never accumulated — the old bug).
    if (isThrown() || isCarrying()) {
      const carrying = isCarrying();
      if (!followInit) {
        followInit = true;
        camera.getWorldDirection(_fwd); followLook.copy(camera.position).addScaledVector(_fwd, 120);
        const dest = carrying ? getBallPos() : getThrowToPos();
        if (dest) followDest.copy(camera.position).lerp(dest, 0.30); else followDest.copy(camera.position);   // ~30% closer
      }
      if (isCaught() || carrying) {
        // AFTER THE CATCH / on a RUN: keep slowly zooming in on the ball carrier until
        // we're right up on him — extra movement + wiggle room (Reggie).
        const tp = carrying ? getBallPos() : getTargetPos();
        if (tp) {
          _fwd.copy(camera.position).sub(tp); _fwd.y = 0;
          if (_fwd.lengthSq() < 1e-3) _fwd.set(0, 0, 1);
          _fwd.normalize();
          followDest.copy(tp).addScaledVector(_fwd, 7.5); followDest.y = Math.max(4, tp.y + 3);   // creep to ~7.5yd out
          camera.position.lerp(followDest, Math.min(1, dt * (carrying ? 1.3 : 0.7)));   // run tracks a bit tighter
          followLook.lerp(new THREE.Vector3(tp.x, 2.2, tp.z), Math.min(1, dt * 3.5));
        }
      } else {
        camera.position.lerp(followDest, Math.min(1, dt * 2.2));   // dolly in with the ball
        followLook.lerp(getBallPos(), Math.min(1, dt * 3.5));      // follow the ball in the air
      }
      camera.lookAt(followLook);
    } else {
      followInit = false;
      panFrame(dt); orbit.update(dt, now);                       // locked orbit view (your framing)
    }
  }
  post.render(scene, camera);   // graded cinematic pipeline when enabled, else a plain render
}
requestAnimationFrame(loop);
