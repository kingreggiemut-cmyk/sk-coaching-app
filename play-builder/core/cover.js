// COVER — the landing / loading gate, ported from the playbook covers
// (war_room_test.html / wvu.html #warCover) and reskinned to the builder.
//
// Two jobs at once:
//   1. The 3D world takes a beat to build. Without this, a first-time visitor
//      stares at a black rectangle and assumes it's broken.
//   2. It TELLS them what this is before they're dropped on a stadium with no
//      idea what to do — which is the actual reason the playbook covers work.
//
// The windows are coded mock-ups of the REAL panels (same tokens, same shapes as
// styles/ui.css), not screenshots — so they can never drift out of date visually
// the way a captured image would, and they cost nothing to download.
//
// "Open" waits for the world: press it early and it just goes warm until ready.

const TOUR = [
  { mock: 'routes',  title: 'Draw any play you want',
    desc: 'Click a receiver, hand him a route from the library — or draw your own path straight on the grass.' },
  { mock: 'field',   title: 'Watch it run for real',
    desc: 'Your play comes to life on a real 3D stadium. Throw it to whoever you want and see if he gets open.' },
  { mock: 'defense', title: 'Pick what it has to beat',
    desc: 'Set the coverage — zone or man — drag defenders where you want them, and find out if your play works.' },
  { mock: 'camera',  title: 'See it from anywhere',
    desc: 'Ride the receiver\'s shoulder, go all-22, or spin the whole stadium. It films itself while the play runs.' },
  { mock: 'save',    title: 'Save it and send it',
    desc: 'Keep your plays on your account, then share a link — anyone can watch your play run, no account needed.' },
];

/* ---- the mock-ups: real panel shapes, in miniature ---- */
const ROUTE_MK = ['Hitch', 'Slant', 'Drag', 'Out', 'Go', 'Post', 'Corner', 'Wheel', 'Flat'];
const ROUTE_PATH = [
  'M20,44 L20,20 L14,26', 'M12,44 L12,30 L34,14', 'M8,30 L38,30', 'M12,44 L12,22 L36,22',
  'M23,44 L23,8', 'M14,44 L14,24 L34,8', 'M12,44 L12,26 L34,10', 'M10,44 L10,30 L30,8', 'M10,36 L36,30',
];

function mock(kind) {
  if (kind === 'routes') {
    return `<div class="cv-mk cv-mk-panel">
      <div class="cvp-head">Offense</div>
      <div class="cvp-body">
        <div class="cvp-draw">✎ Draw custom route</div>
        <div class="cvp-grid">${ROUTE_MK.map((r, i) => `<div class="cvp-card${i === 4 ? ' on' : ''}" style="--d:${0.25 + i * 0.07}s">
          <svg viewBox="0 0 46 50"><path d="${ROUTE_PATH[i]}"/></svg><span>${r}</span></div>`).join('')}</div>
      </div></div>`;
  }
  if (kind === 'field') {
    return `<div class="cv-mk cv-mk-field">
      <svg class="cvf-svg" viewBox="0 0 240 150" preserveAspectRatio="none">
        <g class="cvf-yards">${[30, 60, 90, 120].map((y) => `<line x1="0" y1="${y}" x2="240" y2="${y}"/>`).join('')}</g>
        <path class="cvf-route money" d="M62,122 C62,96 58,84 74,44"/>
        <path class="cvf-route" style="--d:.35s" d="M96,124 C96,110 100,104 150,100"/>
        <path class="cvf-route" style="--d:.6s" d="M182,124 C182,104 180,96 214,72"/>
        <path class="cvf-ball" style="--d:1.1s" d="M120,128 C104,104 92,80 76,48"/>
      </svg>
      <span class="cvf-chip money" style="left:24%;top:83%">WR</span>
      <span class="cvf-chip" style="left:39%;top:84%">TE</span>
      <span class="cvf-chip" style="left:75%;top:84%">WR</span>
      <span class="cvf-chip qb" style="left:50%;top:88%">QB</span>
    </div>`;
  }
  if (kind === 'defense') {
    return `<div class="cv-mk cv-mk-panel def">
      <div class="cvp-head">Defense</div>
      <div class="cvp-body">
        <div class="cvp-cap">Zone</div>
        <div class="cvp-row"><i>Cover 2</i><i class="on">Cover 3</i></div>
        <div class="cvp-cap">Man</div>
        <div class="cvp-row"><i>Man</i><i>Man + 1 deep</i></div>
        <div class="cvp-mods"><b>LB-M moved</b><b>CB-L covers WR</b></div>
        <div class="cvp-reset">↺ Reset to default defense</div>
      </div></div>`;
  }
  if (kind === 'camera') {
    return `<div class="cv-mk cv-mk-panel">
      <div class="cvp-head">View</div>
      <div class="cvp-body">
        <div class="cvp-cap">Camera</div>
        <div class="cvp-sel">Receiver POV (reverse) <span>▾</span></div>
        <div class="cvp-shots">
          ${['Free — you control', 'Follow player', 'Sideline → behind QB', 'QB → all-22'].map((s, i) =>
            `<em style="--d:${0.4 + i * 0.12}s">${s}</em>`).join('')}
        </div>
        <div class="cvp-row"><i class="on">🏷 Reads</i><i>🔄 Orbit</i></div>
      </div></div>`;
  }
  return `<div class="cv-mk cv-mk-panel">
    <div class="cvp-head">Play</div>
    <div class="cvp-body">
      <div class="cvp-cap">Play name</div>
      <div class="cvp-input">PA Verts<span class="cvp-caret"></span></div>
      <div class="cvp-save">Save play</div>
      <div class="cvp-row"><i>My plays</i><i>Share link</i></div>
      <div class="cvp-link">schemekings.com/p/<b>k4n2xq7</b></div>
    </div></div>`;
}

const CROWN = `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 8l4.5 4L12 5l4.5 7L21 8l-1.6 10H4.6L3 8z"/></svg>`;

let ready = false, pendingOpen = false, onOpen = null;

// The cover's video backdrop. Deliberately NOT in the HTML's src: the gradient
// paints on frame one, and the video pops in over it the moment it can actually
// play. A cover that waits on a video is just a slower black screen.
const BG_VIDEO = 'field/assets/New Backgorund.mp4';   // (yes, the filename is spelled that way) — bundled locally so it ships with the app
function startBackdrop() {
  const v = document.getElementById('cv-vid');
  if (!v) return;
  v.addEventListener('canplay', () => v.classList.add('in'), { once: true });
  v.addEventListener('error', () => v.remove(), { once: true });   // no video → the gradient is already there
  v.src = encodeURI(BG_VIDEO);
  const go = () => v.play().catch(() => {});
  go();
  // some browsers block autoplay until a gesture — take the first one we get
  document.addEventListener('pointerdown', go, { once: true });
}

export function buildCover(openCb) {
  onOpen = openCb;
  const cover = document.getElementById('pd-cover');
  if (!cover) return;
  document.body.classList.add('covering');
  startBackdrop();

  const track = cover.querySelector('#cv-track'), dotsW = cover.querySelector('#cv-dots');
  cover.querySelector('#cv-stamp').innerHTML = CROWN + '<span>Scheme Kings · Free to use</span>';

  track.innerHTML = TOUR.map((s, i) => `
    <div class="cv-slide${i === 0 ? ' on' : ''}" data-i="${i}">
      <div class="cv-shot">${mock(s.mock)}</div>
      <div class="cv-cap">
        <div class="cv-num">${i + 1} / ${TOUR.length}</div>
        <div class="cv-title2">${s.title}</div>
        <p class="cv-desc">${s.desc}</p>
      </div>
    </div>`).join('');
  dotsW.innerHTML = TOUR.map((_, i) => `<button class="cv-dot${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="Feature ${i + 1}"></button>`).join('');

  const slides = [...track.querySelectorAll('.cv-slide')], dots = [...dotsW.querySelectorAll('.cv-dot')];
  let idx = 0, timer = null, stopped = false;
  const show = (n) => {
    n = (n + slides.length) % slides.length;
    slides.forEach((s, i) => s.classList.toggle('on', i === n));
    dots.forEach((d, i) => d.classList.toggle('on', i === n));
    idx = n;
  };
  const take = (n) => { stopped = true; clearInterval(timer); show(n); };
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => { if (!stopped) show(idx + 1); }, 6500);
  cover.querySelector('#cv-next').onclick = () => take(idx + 1);
  cover.querySelector('#cv-prev').onclick = () => take(idx - 1);
  dots.forEach((d, i) => { d.onclick = () => take(i); });
  cover.querySelector('#cv-open').onclick = open;
  // arrow keys flip the tour too
  cover.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') take(idx + 1);
    else if (e.key === 'ArrowLeft') take(idx - 1);
  });
}

function open() {
  const btn = document.getElementById('cv-open');
  if (!ready) { pendingOpen = true; if (btn) btn.classList.add('warming'); return; }   // still building — go warm, don't lie
  const cover = document.getElementById('pd-cover');
  document.body.classList.remove('covering');
  cover.classList.add('lift');
  setTimeout(() => cover.classList.add('hidden'), 520);
  stopBackdrop();   // stop decoding video behind a stadium nobody can see it through
  if (onOpen) { try { onOpen(); } catch (e) { console.error(e); } }
}

// The backdrop is pure decoration for a screen that's now gone — leaving it
// decoding costs frames on the 3D scene for nothing.
function stopBackdrop() {
  const v = document.getElementById('cv-vid');
  if (!v) return;
  try { v.pause(); } catch {}
  setTimeout(() => { v.removeAttribute('src'); try { v.load(); } catch {} }, 600);
}

// the 3D world finished building — the gate can lift for real now
export function coverReady() {
  ready = true;
  const btn = document.getElementById('cv-open');
  if (btn) btn.classList.remove('warming');
  if (pendingOpen) open();
}

// Boot died. Say so ON the cover — the cover sits above everything, so an error
// written anywhere else is painted underneath it and never seen.
export function coverFatal(html) {
  const cover = document.getElementById('pd-cover');
  if (!cover) return;
  cover.classList.remove('hidden', 'lift');
  const btn = document.getElementById('cv-open'); if (btn) btn.remove();
  const box = document.createElement('div'); box.className = 'cv-fatal'; box.innerHTML = html;
  (cover.querySelector('.cv-in') || cover).appendChild(box);
}

// a shared link skips the sales pitch — they came to see a play, not to be pitched
export function skipCover() {
  const cover = document.getElementById('pd-cover');
  if (!cover) return;
  document.body.classList.remove('covering');
  cover.classList.add('hidden');
  const v = document.getElementById('cv-vid'); if (v) v.remove();   // never even fetch it
}
