// EXPORT — turn a drawn play into something you can post.
//
// This is the growth loop. Drawing a play is fun; posting the clip is what brings
// the next person in. Both exports lean on work that already exists: the stadium,
// the cinematic cameras, and a play that runs deterministically.
//
//   Video — MediaRecorder on the live canvas stream while the play runs.
//   Image — the current frame composited with a play-card header.
//
// On watermarking: the stadium already carries the brand harder than any corner
// logo could (midfield crown, endzone wordmark, ribbon, Jumbotron), so the video
// isn't overlaid with anything — it would only cover the shot. The still card gets
// a proper footer instead, because a still has room for one.

const BRAND = { navy: '#17284d', cream: '#F0EAD0', gold: '#F5A623', blue: '#1f6ef2' };

/* ---------------------------------------------------------------------------
   VIDEO
   MediaRecorder over canvas.captureStream(). WebM is what every browser can
   actually produce here; mp4 would need transcoding we're not going to ship.
   --------------------------------------------------------------------------- */
export function videoSupported() {
  return typeof MediaRecorder !== 'undefined' &&
         !!HTMLCanvasElement.prototype.captureStream &&
         !!pickMime();
}

function pickMime() {
  const want = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  for (const m of want) { try { if (MediaRecorder.isTypeSupported(m)) return m; } catch {} }
  return null;
}

// opts: { canvas, durationMs, onTick(0..1), fps }
// Returns { ok, blob } — the caller decides what to do with it.
export function recordPlay({ canvas, durationMs = 6200, fps = 60, onTick } = {}) {
  return new Promise((resolve) => {
    const mime = pickMime();
    if (!mime || !canvas.captureStream) { resolve({ ok: false, reason: 'unsupported' }); return; }
    let rec, chunks = [];
    try {
      const stream = canvas.captureStream(fps);
      rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    } catch (e) { resolve({ ok: false, reason: 'unsupported' }); return; }

    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onerror = () => { try { rec.stop(); } catch {} resolve({ ok: false, reason: 'error' }); };
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime });
      resolve(blob.size ? { ok: true, blob, ext: 'webm' } : { ok: false, reason: 'empty' });
    };

    // The STOP is a real timer, not a rAF chain. rAF is paused in a background tab,
    // so an rAF-driven stop means switching tabs mid-record leaves the recorder
    // running forever and the button stuck on "Recording…". rAF only paints
    // progress here — if it stalls, the timer still lands.
    const t0 = performance.now();
    const stopAt = setTimeout(() => { try { rec.stop(); } catch {} }, durationMs + 120);
    const tick = () => {
      if (rec.state !== 'recording') return;
      const p = Math.min(1, (performance.now() - t0) / durationMs);
      if (onTick) { try { onTick(p); } catch {} }
      if (p < 1) requestAnimationFrame(tick);
    };
    const done = rec.onstop;
    rec.onstop = (...a) => { clearTimeout(stopAt); done(...a); };
    rec.start(100);      // timeslice → data flows even if something goes wrong mid-record
    requestAnimationFrame(tick);
  });
}

/* ---------------------------------------------------------------------------
   IMAGE — a play card: the frame, plus a header naming the play.
   Composited on a 2D canvas so the export is one clean image rather than a
   screenshot of the app with UI in it.
   --------------------------------------------------------------------------- */
export async function playCard({ canvas, name, formation, crestUrl }) {
  const W = canvas.width, H = canvas.height;
  if (!W || !H) return { ok: false, reason: 'empty' };
  const PAD = Math.round(H * 0.085);                 // header band height

  const out = document.createElement('canvas');
  out.width = W; out.height = H + PAD;
  const c = out.getContext('2d');

  // the shot
  c.drawImage(canvas, 0, PAD, W, H);

  // header band — varsity patch, same identity as the app's chrome
  c.fillStyle = BRAND.cream; c.fillRect(0, 0, W, PAD);
  c.fillStyle = BRAND.blue; c.fillRect(0, PAD - 4, W, 4);
  c.fillStyle = BRAND.gold; c.fillRect(0, PAD - 7, W, 3);

  const crest = crestUrl ? await loadImg(crestUrl) : null;
  let x = Math.round(PAD * 0.28);
  if (crest) {
    const s = Math.round(PAD * 0.58);
    c.drawImage(crest, x, Math.round((PAD - s) / 2), s, s);
    x += s + Math.round(PAD * 0.22);
  }

  const title = (name || 'Untitled play').toUpperCase();
  const titleSize = Math.round(PAD * 0.42);
  c.fillStyle = BRAND.navy;
  c.font = `900 ${titleSize}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  c.textBaseline = 'middle';
  const sub = formation ? String(formation).toUpperCase() : '';
  c.fillText(title, x, Math.round(PAD * (sub ? 0.4 : 0.5)));
  if (sub) {
    c.fillStyle = '#52618a';
    c.font = `700 ${Math.round(PAD * 0.2)}px "Barlow", system-ui, sans-serif`;
    c.fillText(sub, x, Math.round(PAD * 0.71));
  }

  // right side: where this came from
  c.textAlign = 'right';
  c.fillStyle = BRAND.navy;
  c.font = `900 ${Math.round(PAD * 0.26)}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  c.fillText('SCHEME KINGS', W - Math.round(PAD * 0.28), Math.round(PAD * 0.38));
  c.fillStyle = '#5d6885';
  c.font = `700 ${Math.round(PAD * 0.2)}px "Barlow", system-ui, sans-serif`;
  c.fillText('PLAY BUILDER', W - Math.round(PAD * 0.28), Math.round(PAD * 0.68));
  c.textAlign = 'left';

  const blob = await new Promise((r) => out.toBlob(r, 'image/png'));
  return blob ? { ok: true, blob, ext: 'png' } : { ok: false, reason: 'empty' };
}

function loadImg(src) {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i); i.onerror = () => res(null);
    i.src = src;
  });
}

/* --------------------------------------------------------------------------- */
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function safeName(s, fallback = 'play') {
  const n = String(s || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return n || fallback;
}
