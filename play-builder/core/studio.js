// STUDIO MODE — the split between the consumer tool and Reggie's filming rig.
//
// Everything a normal user needs is always on screen. Everything that only exists
// to make YouTube/TikTok content — the END CTA sign, camera capture, the 9:16
// stages, Present, run plays, Full 11 — is "studio only": still fully built and
// fully working, just hidden behind one toggle.
//
// Mechanism is deliberately dumb so it can't break the 3D logic: panels get the
// `studio-only` class, and CSS hides them when <body> lacks `.studio-on`. No
// module re-wires itself, nothing is destroyed — it's purely a visibility layer.
const KEY = 'pd_studio';
let on = false;
const subs = [];

try { on = localStorage.getItem(KEY) === '1'; } catch {}

export function isStudio() { return on; }
export function onStudio(f) { subs.push(f); }

export function setStudio(v) {
  on = !!v;
  try { localStorage.setItem(KEY, on ? '1' : '0'); } catch {}
  paint();
  for (const f of subs) { try { f(on); } catch (e) { console.error(e); } }
  return on;
}

export function toggleStudio() { return setStudio(!on); }

// apply the body class; safe to call before <body> exists
function paint() {
  if (document.body) document.body.classList.toggle('studio-on', on);
}
if (document.body) paint();
else document.addEventListener('DOMContentLoaded', paint);
