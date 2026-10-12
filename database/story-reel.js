/* story-reel.js: THE STORY OF THE TEAM WE ARE RECREATING (2026-10-09).
   His brief: "who are the Seahawks, and how are we recreating it", its own piece ahead of the principles, and it has to
   feel like a broadcast open, not a slide deck: his photos, charts with context, the real team and our calls side by side.
   THE REAL TEAM IS NIGHT (the team's dark colour, cream discs with their numbers, the bright colour for ink) and OUR
   INSTALL IS PAPER (cream, dark ink), so the two never read as the same thing. Scenes cut with a wipe between five kinds:
     take    a full screen of type (over a photo, a flood of the team colour, or paper)
     film    the real defense moving on a night field, numbers and a banner landing over it
     chart   a number with its context (bars against other teams, one big figure with what it means, or a PATH: a line
             of stops, each a year, a place and what happened there)
     group   a position group as a trading card: the star's cutout, the men, why it worked, a clip of them on the field
     split   the real team beside the call in our install that recreates it; both sides play the snap together
   The story is authored on the scheme (about.story, see Madden27 Engine Reference/seahawks-story.js). The movement on the
   real side is a drawing of what happened, never game film. scheme.js gives this the resolved calls, the front and
   offense tiles and the pictures. Space, a click or the arrows go to the next scene; the end hands off to the principles. */
(function () {
'use strict';
const INK = '#17130E', CREAM = '#f3ecd9', BALL = '#a8632c';
const FD = "Anton, Impact, 'Arial Narrow', sans-serif", FC = "'Barlow Condensed', 'Arial Narrow', sans-serif", FM = "'Permanent Marker', cursive";
const lerp = (a, b, t) => a + (b - a) * t, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2), u01 = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const plen = (p) => p.reduce((a, q, i) => (i ? a + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
function along(pts, d) { let left = d; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (left <= L) { const t = L ? left / L : 0; return [lerp(a[0], b[0], t), lerp(a[1], b[1], t)]; } left -= L; } return pts[pts.length - 1].slice(); }
const shade = (hex, k) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return hex; const n = parseInt(m[1], 16); return 'rgb(' + [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v * k)).join(',') + ')'; };
const ZNAME = { 'deep-quarter': 'QUARTER', 'deep-half': 'DEEP HALF', 'deep-third': 'DEEP THIRD', 'quarter-flat': 'QTR FLAT', 'rec-hook': '3 REC HOOK', curl: 'CURL', 'middle-read': 'MID READ', 'cloud-flat': 'CLOUD FLAT', 'curl-flat': 'CURL FLAT', 'hook-curl': 'HOOK CURL', 'seam-flat': 'SEAM FLAT', 'vertical-hook': 'VERT HOOK', 'soft-squat': 'SOFT SQUAT' };

/* ---- the styles, put in the page once. {n} is a size that follows the stage: n percent of its width, or the same
   on a 16:9 stage measured by its height, whichever is smaller, so a wide short stage does not overflow ---- */
const CSS = `
.sr{position:relative;width:100%;height:100%;overflow:hidden;outline:0;cursor:pointer;container-type:size;background:var(--sr-night);color:#fff;font-family:var(--fb,'Barlow',system-ui,sans-serif);box-shadow:0 30px 70px rgba(0,0,0,.7)}
.sr:focus-visible{box-shadow:0 0 0 3px var(--gold,#f5a623)}
.sr *{box-sizing:border-box}
.sr-layer{position:absolute;inset:0}
.sr [hidden]{display:none!important}
.sr canvas{display:block;width:100%;height:100%}
.sr-k{font:800 clamp(11px,{1.5},16px)/1 var(--sr-fc);letter-spacing:.26em;text-transform:uppercase;color:var(--sr-b)}
.sr-split{display:grid;grid-template-columns:1fr 1fr;background:#07080b}
.sr-half{position:relative;display:flex;flex-direction:column;min-width:0;min-height:0}
.sr-them{background:var(--sr-night);color:#fff}
.sr-ours{background:#f8f1de;color:${INK};border-left:5px solid var(--sr-b)}
.sr-half header{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:{1.5} {1.8} {1.2}}
.sr-them header{border-bottom:2px solid rgba(255,255,255,.3)}
.sr-them.sr-pp{background:#f8f1de;color:${INK}}
.sr-them.sr-pp header{border-bottom:2px solid rgba(23,19,14,.8);background:#FBF6E8}
.sr-ours header{border-bottom:2px solid rgba(23,19,14,.8);background:#FBF6E8}
.sr-half h3{margin:0;font:400 clamp(18px,{3},36px)/1 var(--sr-fd);text-transform:uppercase}
.sr-cv{position:relative;flex:1 1 0;min-height:0}
.sr-cv canvas{position:absolute;inset:0}
.sr-flag{flex:0 0 auto;display:inline-block;font:800 clamp(10.5px,{1.05},12.5px)/1 var(--sr-fc);letter-spacing:.22em;text-transform:uppercase;padding:7px 10px 6px;background:${INK};color:${CREAM};white-space:nowrap}
.sr-flag.sr-fthem{background:var(--sr-b);color:var(--sr-d)}
.sr-take{display:grid;align-content:center;justify-items:start;gap:{.4};padding:5% 6% 12%;background:var(--sr-d);color:#fff;background-size:cover;background-position:center;z-index:2;transition:transform .7s cubic-bezier(.6,0,.3,1)}
.sr-take.sr-center{justify-items:center;text-align:center}
.sr-take.sr-lift{transform:translateY(-103%)}
.sr-take.sr-flood{background:var(--sr-b);color:var(--sr-d);background-image:radial-gradient(rgba(0,0,0,.1) 1.3px,transparent 1.6px),linear-gradient(115deg,transparent 0 70%,var(--sr-d) 70% 74%,transparent 74% 76%,var(--sr-d) 76% 77.2%,transparent 77.2%);background-size:9px 9px,auto}
.sr-take.sr-paper{background:#F1E7D0;color:${INK};background-image:radial-gradient(rgba(23,19,14,.08) 1px,transparent 1.3px),linear-gradient(115deg,transparent 0 60%,var(--sr-d) 60% 63%,transparent 63% 65%,var(--sr-b) 65% 66.4%,transparent 66.4%);background-size:7px 7px,auto}
.sr-ln{display:block;position:relative;z-index:2;font:400 clamp(34px,{12.4},170px)/.9 var(--sr-fd);text-transform:uppercase;animation:sr-slam .5s var(--sr-ease) var(--d,0ms) both}
.sr-ln.sr-g{color:var(--sr-b)}
.sr-paper .sr-ln.sr-g{color:var(--sr-d)}
.sr-flood .sr-ln.sr-g{color:#fff}
.sr-sub{position:relative;z-index:2;margin-top:{1.6};font:400 clamp(16px,{2.9},38px)/1.1 var(--sr-fm);animation:sr-rise .5s var(--sr-ease) var(--d,0ms) both}
.sr-man{position:absolute;right:1%;bottom:0;height:96%;z-index:1;filter:grayscale(1) contrast(1.15) drop-shadow(0 20px 40px rgba(0,0,0,.6));animation:sr-slide .7s var(--sr-ease) .15s both}
.sr-slips{display:flex;flex-wrap:wrap;gap:10px;margin-top:{2.2};position:relative;z-index:2}
.sr-center .sr-slips{justify-content:center}
.sr-slips span{background:#FBF6E8;color:${INK};padding:.7em .9em .62em;font:800 clamp(12px,{1.6},19px)/1 var(--sr-fc);letter-spacing:.12em;text-transform:uppercase;box-shadow:0 8px 18px rgba(0,0,0,.4);animation:sr-rise .45s var(--sr-ease) var(--d,0ms) both}
.sr-slips b{font:400 1.25em/1 var(--sr-fd);color:var(--sr-d);margin-right:8px}
@keyframes sr-slam{from{opacity:0;transform:scale(1.6) rotate(-3deg)}}
@keyframes sr-rise{from{opacity:0;transform:translateY(26px)}}
@keyframes sr-slide{from{opacity:0;transform:translateX(12%)}}
@keyframes sr-grow{from{transform:scaleX(0)}}
.sr-graphic{background:var(--sr-d);color:#fff;background-image:radial-gradient(rgba(255,255,255,.055) 1.2px,transparent 1.5px),linear-gradient(115deg,transparent 0 78%,var(--sr-b) 78% 79.6%,transparent 79.6% 81.4%,var(--sr-b) 81.4% 82.2%,transparent 82.2%);background-size:9px 9px,auto}
.sr-gs{position:absolute;inset:0;display:grid;align-content:center;gap:{1.5};padding:4% 7% 12%}
.sr-gs h3{margin:0;font:400 clamp(24px,{6.4},84px)/.95 var(--sr-fd);text-transform:uppercase;text-wrap:balance;animation:sr-rise .45s var(--sr-ease) both}
.sr-gs h3.sr-sm{font-size:clamp(18px,{3.4},46px)}
.sr-gn{margin:0;max-width:62ch;font:500 clamp(12.5px,{1.6},20px)/1.4 var(--fb,'Barlow',sans-serif);color:rgba(255,255,255,.8);animation:sr-rise .45s var(--sr-ease) .9s both}
.sr-bars{display:grid;gap:{1.1};max-width:86%}
.sr-bar{display:grid;grid-template-columns:minmax(0,9.5em) minmax(0,1fr) 4.2em;align-items:center;gap:{1.2};font:800 clamp(12.5px,{2},24px)/1 var(--sr-fc);letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.74)}
.sr-bar u{display:block;height:clamp(15px,{3},36px);background:rgba(255,255,255,.1);text-decoration:none}
.sr-bar i{display:block;height:100%;width:var(--w);background:rgba(255,255,255,.55);transform-origin:left;animation:sr-grow .8s var(--sr-ease) var(--d,0ms) both}
.sr-bar b{font:400 clamp(17px,{3},38px)/1 var(--sr-fd);letter-spacing:.02em;color:#fff;white-space:nowrap}
.sr-bar.sr-me{color:#fff}.sr-bar.sr-me i{background:var(--sr-b)}.sr-bar.sr-me b{color:var(--sr-b);font-size:clamp(22px,{4.4},56px)}
.sr-huge{font:400 clamp(56px,{19},260px)/.84 var(--sr-fd);color:var(--sr-b);animation:sr-slam .5s var(--sr-ease) .1s both}
.sr-chips{display:flex;flex-wrap:wrap;gap:10px}
.sr-chips span{background:#FBF6E8;color:${INK};padding:.7em .9em .62em;font:800 clamp(11.5px,{1.7},20px)/1.1 var(--sr-fc);letter-spacing:.1em;text-transform:uppercase;box-shadow:0 8px 18px rgba(0,0,0,.45);transform:rotate(-1deg);animation:sr-rise .45s var(--sr-ease) var(--d,0ms) both}
.sr-chips span:nth-child(2n){transform:rotate(.8deg)}
/* a path: a line of stops, each a year, a place and what happened there */
.sr-path{list-style:none;margin:{.8} 0 {.4};padding:0;max-width:80%;display:grid;grid-template-columns:repeat(var(--n,6),minmax(0,1fr));gap:{1.4};position:relative}
.sr-path::before{content:"";position:absolute;left:0;right:0;top:clamp(8px,{1},14px);height:3px;background:rgba(255,255,255,.3);transform-origin:left;animation:sr-grow 1.7s var(--sr-ease) .2s both}
.sr-path li{position:relative;display:grid;gap:{.55};align-content:start;padding-top:clamp(28px,{3.4},48px);animation:sr-rise .45s var(--sr-ease) var(--d,0ms) both}
.sr-path li::before{content:"";position:absolute;left:0;top:0;width:clamp(18px,{2.1},30px);height:clamp(18px,{2.1},30px);border-radius:50%;background:var(--sr-b);box-shadow:0 0 0 4px var(--sr-d)}
.sr-path em{font:400 clamp(24px,{4.4},60px)/.9 var(--sr-fd);font-style:normal;color:var(--sr-b)}
.sr-path strong{font:800 clamp(12px,{1.75},22px)/1.05 var(--sr-fc);letter-spacing:.12em;text-transform:uppercase;color:#fff}
.sr-path small{font:500 clamp(12px,{1.45},18.5px)/1.32 var(--fb,'Barlow',sans-serif);color:rgba(255,255,255,.84)}
.sr-path li:last-child::before{background:#fff}.sr-path li:last-child em{color:#fff}
@container (max-width:680px){.sr-path{grid-template-columns:1fr 1fr;max-width:none}.sr-path::before{display:none}}
.sr-gs.sr-tight .sr-huge{font-size:clamp(48px,{13},180px)}
.sr-gg{position:absolute;inset:0;display:grid;grid-template-columns:29% minmax(0,1fr) 37%;align-items:center}
.sr-gph{grid-column:1;position:relative;align-self:stretch;background:var(--sr-b);overflow:hidden;clip-path:polygon(0 0,100% 0,84% 100%,0 100%)}
.sr-bn{position:absolute;left:-4%;top:-6%;font:400 46cqh/.8 var(--sr-fd);color:rgba(0,0,0,.2);letter-spacing:-.03em}
.sr-gph img{position:absolute;left:50%;bottom:0;height:96%;transform:translateX(-54%);filter:grayscale(1) contrast(1.2);animation:sr-slide .6s var(--sr-ease) both}
.sr-gt{grid-column:2;display:grid;gap:{1.1};padding:{1.6} {2} 11cqh {1.2};min-width:0}
.sr-gt h3{margin:0;font:400 clamp(18px,{3.6},50px)/.98 var(--sr-fd);text-transform:uppercase;text-wrap:balance;animation:sr-rise .45s var(--sr-ease) .1s both}
.sr-rows{list-style:none;margin:0;padding:0;display:grid;gap:{.75}}
.sr-rows li{display:grid;grid-template-columns:auto minmax(0,1fr);gap:0 {1.1};align-items:center;animation:sr-rise .4s var(--sr-ease) var(--d,0ms) both}
.sr-rows em{grid-row:1/3;width:clamp(28px,{3.7},48px);aspect-ratio:1;border-radius:50%;background:${CREAM};border:3px solid var(--sr-b);color:var(--sr-d);display:grid;place-items:center;font:400 clamp(14px,{1.85},24px)/1 var(--sr-fd);font-style:normal}
.sr-rows strong{align-self:end;font:400 clamp(14px,{1.85},24px)/1 var(--sr-fd);text-transform:uppercase}
.sr-rows small{align-self:start;font:700 clamp(10px,{1.15},14.5px)/1.2 var(--sr-fc);letter-spacing:.07em;text-transform:uppercase;color:rgba(255,255,255,.78)}
.sr-why{margin:0;padding:{.9} {1.2};background:#FBF6E8;color:${INK};font:600 clamp(11.5px,{1.4},17.5px)/1.36 var(--fb,'Barlow',sans-serif);box-shadow:0 8px 18px rgba(0,0,0,.4);animation:sr-rise .45s var(--sr-ease) 1.1s both}
.sr-why b{font:800 .86em/1 var(--sr-fc);letter-spacing:.16em;text-transform:uppercase;color:var(--sr-d);margin-right:.5em}
.sr-inset{position:absolute;right:2.2%;top:45%;width:34%;height:58%;transform:translateY(-50%) rotate(.8deg);z-index:3;border:4px solid ${CREAM};box-shadow:0 18px 40px rgba(0,0,0,.6);background:var(--sr-night)}
.sr-inset canvas{position:absolute;inset:0}
.sr-inset::before{content:"On the field";position:absolute;left:-4px;top:-26px;font:800 11.5px/1 var(--sr-fc);letter-spacing:.22em;text-transform:uppercase;background:${CREAM};color:${INK};padding:6px 9px 5px}
.sr-pops{position:absolute;left:3%;right:3%;bottom:15%;display:flex;justify-content:center;align-items:flex-end;gap:2.2%;pointer-events:none;z-index:4}
.sr-pop{position:relative;flex:0 1 27%;min-width:0;background:#FBF6E8;color:${INK};padding:1.3% 1.6% 1.2%;text-align:center;box-shadow:0 16px 34px rgba(0,0,0,.6);transform:rotate(-1.6deg) scale(1.9);opacity:0;transition:transform .34s var(--sr-ease),opacity .12s linear}
.sr-pop:nth-child(2n){transform:rotate(1.2deg) scale(1.9)}
.sr-pop.sr-in{opacity:1;transform:rotate(-1.6deg) scale(1)}
.sr-pop.sr-in:nth-child(2n){transform:rotate(1.2deg) scale(1)}
.sr-pop::before{content:"";position:absolute;top:-9px;left:34%;width:32%;height:17px;background:var(--sr-b);opacity:.8;transform:rotate(-2deg)}
.sr-pop b{display:block;font:400 clamp(28px,{7},94px)/.95 var(--sr-fd);color:var(--sr-d)}
.sr-pop span{display:block;margin-top:.35em;font:800 clamp(10px,{1.5},18px)/1.1 var(--sr-fc);letter-spacing:.13em;text-transform:uppercase}
.sr-pop i{display:block;margin-top:.3em;font:400 clamp(10.5px,{1.5},19px)/1.1 var(--sr-fm);font-style:normal;color:rgba(23,19,14,.74)}
.sr-banner{position:absolute;left:0;right:0;bottom:17%;z-index:4;background:var(--sr-b);color:var(--sr-d);padding:{1.2} 4%;font:400 clamp(24px,{7},92px)/1 var(--sr-fd);text-transform:uppercase;text-align:center;transform:translateX(-105%) skewX(-8deg);transition:transform .45s var(--sr-ease);pointer-events:none}
.sr-banner.sr-in{transform:translateX(0) skewX(-8deg)}
.sr-slate{position:absolute;left:14px;top:16px;z-index:5;font:800 12px/1 var(--sr-fc);letter-spacing:.24em;text-transform:uppercase;padding:7px 10px 6px;background:rgba(7,8,11,.82);color:${CREAM};pointer-events:none}
.sr-slate b{color:var(--sr-b);font-weight:800;margin-right:8px}
.sr[data-kind=split] .sr-slate,.sr[data-kind=group] .sr-slate{display:none}
.sr-lower{position:absolute;left:0;right:0;bottom:0;z-index:6;display:flex;align-items:center;gap:{1.4};padding:{1} {1.6} {1.1};background:rgba(3,10,22,.94);border-top:3px solid var(--sr-b);cursor:default}
.sr-lower p{flex:1 1 auto;margin:0;min-width:0;font:600 clamp(13px,{1.7},21px)/1.32 var(--fb,'Barlow',sans-serif);color:#fff}
.sr-lower.sr-q{background:#FBF6E8;border-top-color:${INK}}
.sr-lower.sr-q p{color:${INK};font-style:italic;font-weight:500}
.sr-nav{flex:0 0 auto;display:flex;gap:6px}
.sr-b2{width:40px;height:36px;border:1.5px solid rgba(255,255,255,.5);background:transparent;color:#fff;font:400 22px/1 var(--sr-fd);cursor:pointer}
.sr-b2.sr-next{background:var(--gold,#f5a623);border-color:var(--gold,#f5a623);color:${INK}}
.sr-lower.sr-q .sr-b2{border-color:rgba(23,19,14,.6);color:${INK}}
.sr-b2:disabled{opacity:.3;cursor:default}
.sr-b2:focus-visible,.sr-seg:focus-visible{outline:3px solid var(--gold,#f5a623);outline-offset:2px}
.sr-strip{position:absolute;left:0;right:0;top:0;z-index:7;display:flex;gap:3px;padding:0}
.sr-seg{flex:1 1 0;min-width:0;height:6px;border:0;padding:0;cursor:pointer;background:rgba(255,255,255,.22)}
.sr-seg.sr-done{background:rgba(255,255,255,.6)}.sr-seg.sr-on{background:var(--sr-b)}
.sr-strip:hover .sr-seg{height:12px}
.sr-wipe{position:absolute;top:-10%;bottom:-10%;left:-30%;width:160%;z-index:9;pointer-events:none;transform:translateX(-112%) skewX(-16deg);background:linear-gradient(90deg,var(--sr-b) 0 7%,var(--sr-d) 7% 93%,var(--sr-b) 93%)}
.sr-wipe.sr-go{animation:sr-wipe .62s cubic-bezier(.55,.1,.4,.95) both}
@keyframes sr-wipe{0%{transform:translateX(-112%) skewX(-16deg)}46%,54%{transform:translateX(0) skewX(-16deg)}100%{transform:translateX(112%) skewX(-16deg)}}
.sr.sr-still *{animation:none!important;transition:none!important}
@container (max-width:700px){
  .sr-split{grid-template-columns:1fr;grid-template-rows:1fr 1fr}
  .sr-ours{border-left:0;border-top:5px solid var(--sr-b)}
  .sr-take{padding-bottom:22%}
  .sr-man{height:50%;opacity:.5}
  .sr-gg{grid-template-columns:minmax(0,1fr);align-items:start}
  .sr-gph{display:none}
  .sr-gt{grid-column:1;padding:7cqw 4cqw 0;gap:2.2cqw}
  .sr-gt h3{font-size:6cqw}
  .sr-rows{grid-template-columns:1fr 1fr;gap:2cqw 3cqw}
  .sr-rows em{width:8cqw;font-size:4cqw}.sr-rows strong{font-size:3.8cqw}.sr-rows small{font-size:2.5cqw}
  .sr-why{display:none}
  .sr-inset{left:4%;right:4%;top:auto;bottom:19%;width:auto;height:32%;transform:none}
  .sr-gs{padding:6% 6% 22%}.sr-bars{max-width:100%}
  .sr-pops{gap:2%;bottom:19%}.sr-pop{flex-basis:31%}
  .sr-banner{bottom:22%}
  .sr-lower p{font-size:3.4cqw}
}
@media (prefers-reduced-motion:reduce){ .sr *{animation:none!important;transition:none!important} }
`.replace(/\{([\d.]+)\}/g, (m, n) => 'min(' + n + 'cqw,' + (n * 1.778).toFixed(2) + 'cqh)');
function styles() { if (document.getElementById('sr-style')) return; const s = document.createElement('style'); s.id = 'sr-style'; s.textContent = CSS; document.head.appendChild(s); }

let S = null;
function unmount() { if (!S) return; S.dead = true; S.timers.forEach(clearTimeout); clearTimeout(S.pend); S.ros.forEach((r) => r.disconnect()); document.removeEventListener('keydown', S.onKey, true); S = null; }

function mount(host, cfg) {
  unmount(); styles();
  const ST = cfg.story, SCENES = ST.scenes, IMG = cfg.img || {}, CALLS = cfg.calls || {}, TILE = cfg.tile || [], OFF = cfg.off || [];
  const DARK = cfg.dark || '#002244', BRIGHT = cfg.bright || '#69BE28', NIGHTC = shade(DARK, .82), PAPERMK = shade(BRIGHT, .78);
  const STILL = !!cfg.still, REDUCED = STILL || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NIGHT = { night: 1, sheet: NIGHTC, line: 'rgba(255,255,255,.15)', strong: 'rgba(255,255,255,.85)', hash: 'rgba(255,255,255,.2)', side: 'rgba(255,255,255,.42)', ghost: 'rgba(255,255,255,.42)', text: '#fff', mk: BRIGHT, red: '#ff7a66', alt: '#fff' };
  const PAPER = { sheet: '#f8f1de', line: 'rgba(23,19,14,.2)', strong: 'rgba(23,19,14,.85)', hash: 'rgba(23,19,14,.26)', side: 'rgba(23,19,14,.5)', ghost: 'rgba(23,19,14,.34)', text: INK, mk: PAPERMK, red: '#7d1d10', alt: DARK };
  const st = S = { host, timers: [], pend: 0, ros: [], dead: false, cur: 0 };
  host.innerHTML = `<div class="sr${STILL ? ' sr-still' : ''}" tabindex="0" role="group" aria-label="${esc(ST.title || 'The story')}. Press space for the next scene." style="--sr-d:${DARK};--sr-b:${BRIGHT};--sr-night:${NIGHTC};--sr-fd:${FD};--sr-fc:${FC};--sr-fm:${FM};--sr-ease:cubic-bezier(.2,.9,.25,1)">
    <div class="sr-layer sr-film"><canvas></canvas></div>
    <div class="sr-layer sr-split" hidden><section class="sr-half sr-them"><header><span class="sr-flag sr-fthem">${esc(ST.label || 'The real thing')}</span><h3></h3></header><div class="sr-cv"><canvas></canvas></div></section><section class="sr-half sr-ours"><header><span class="sr-flag">Our install</span><h3></h3></header><div class="sr-cv"><canvas></canvas></div></section></div>
    <div class="sr-layer sr-graphic" hidden></div><div class="sr-layer sr-take" hidden></div>
    <div class="sr-inset" hidden><canvas></canvas></div><div class="sr-pops"></div><div class="sr-banner" hidden></div><div class="sr-slate"></div>
    <div class="sr-lower"><span class="sr-flag"></span><p></p><span class="sr-nav"><button type="button" class="sr-b2 sr-back" aria-label="Back">&lsaquo;</button><button type="button" class="sr-b2 sr-next" aria-label="Next">&rsaquo;</button></span></div>
    <div class="sr-strip"></div><div class="sr-wipe"></div></div>`;
  const root = host.firstElementChild, q = (s) => root.querySelector(s), CALL = (id) => CALLS[id] || null;
  const RECV = OFF.filter((t) => t.p !== 'OL' && t.p !== 'QB').sort((a, c) => c.x - a.x);
  const OLX = OFF.filter((t) => t.p === 'OL').map((t) => t.x).sort((a, c) => a - c), OLN = ['LT', 'LG', 'C', 'RG', 'RT'], offName = (t) => (t.p === 'OL' ? OLN[OLX.indexOf(t.x)] || 'OL' : t.p);
  const later = (sec, fn) => st.timers.push(setTimeout(() => { if (!st.dead) fn(); }, REDUCED ? 0 : sec * 1000));
  const narrow = () => root.clientWidth < 700;

  /* ---- a board: a field seen from behind the offense, night or paper, with a camera that eases to a part of it and
     then keeps pushing in slowly so a scene at rest is never dead ---- */
  function makeBoard(cv, paint, th) {
    const g = cv.getContext('2d'), W0 = [-24, -9, 24, 19];
    const b = { W: 0, H: 0, k: 1, t0: performance.now(), v0: -1e9, from: W0.slice(), to: W0.slice(), raf: 0, narrow: false };
    let pos = [0, 0, 1], f = [0, 0, -1], r = [1, 0, 0], u = [0, 1, 0], s = 1;
    const dot = (a, c) => a[0] * c[0] + a[1] * c[1] + a[2] * c[2], DIR = (() => { const l = Math.hypot(.56, .83); return [0, -.56 / l, .83 / l]; })();
    const P = (p) => { const d = [p[0] - pos[0], p[1] - pos[1], (p[2] || 0) - pos[2]], z = dot(d, f); if (z < .5) return null; return [b.W / 2 + dot(d, r) / z * s, b.H / 2 - dot(d, u) / z * s, s / z]; };
    function aim(reg, dist) { const cx = (reg[0] + reg[2]) / 2, cy = (reg[1] + reg[3]) / 2; pos = [cx, cy + DIR[1] * dist, DIR[2] * dist]; f = [0, -DIR[1], -DIR[2]]; r = [1, 0, 0]; u = [0, DIR[2], -DIR[1]]; s = (b.H / 2) / Math.tan(15 * Math.PI / 180); }
    function fit(reg) { let lo = 3, hi = 900; const pad = 8; for (let i = 0; i < 26; i++) { const mid = (lo + hi) / 2; aim(reg, mid); const ok = [[reg[0], reg[1]], [reg[2], reg[1]], [reg[0], reg[3]], [reg[2], reg[3]]].every((c) => { const z = P(c); return z && z[0] >= pad && z[0] <= b.W - pad && z[1] >= pad && z[1] <= b.H - pad; }); if (ok) hi = mid; else lo = mid; } aim(reg, hi); }
    const view = () => { const now = performance.now(), k = REDUCED ? 1 : ease(clamp((now - b.v0) / 900, 0, 1)), v = b.from.map((x, i) => lerp(x, b.to[i], k)), dr = REDUCED ? 0 : .06 * clamp((now - b.t0 - 900) / 13000, 0, 1), cx = (v[0] + v[2]) / 2, cy = (v[1] + v[3]) / 2; return [lerp(v[0], cx, dr), lerp(v[1], cy, dr), lerp(v[2], cx, dr), lerp(v[3], cy, dr)]; };
    /* the stage may be scaled by the page (--s), so the layout size is what gets drawn in, and the scale only sharpens */
    function size() { const w = cv.clientWidth, h = cv.clientHeight; if (w < 4 || h < 4) return false; b.W = w; b.H = h; let k = Math.min(devicePixelRatio || 1, 2); const stage = host.closest('.stage'); if (stage) { const sc = parseFloat(getComputedStyle(stage).getPropertyValue('--s')); if (sc > 0) k = Math.min(2.5, k * sc); } b.k = k; cv.width = Math.round(w * k); cv.height = Math.round(h * k); b.narrow = w < 520; return true; }
    const T = () => (REDUCED ? 99 : Math.max(0, (performance.now() - b.t0) / 1000));
    function line(pts, col, lw, dash, alpha, prog) { if (alpha <= .01 || pts.length < 2) return null; let left = plen(pts) * (prog == null ? 1 : prog); if (left <= .01) return null;
      const a = P(pts[0]); if (!a) return null; g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.strokeStyle = col; g.lineWidth = lw; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath(); g.moveTo(a[0], a[1]); let last = a, before = a;
      for (let i = 1; i < pts.length && left > 0; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), t = Math.min(1, left / (l || 1)), z = P([lerp(pts[i - 1][0], pts[i][0], t), lerp(pts[i - 1][1], pts[i][1], t)]); left -= l; if (!z) break; g.lineTo(z[0], z[1]); before = last; last = z; }
      g.stroke(); g.restore(); return [before, last]; }
    function tip(ends, col, sz, alpha) { if (!ends || alpha <= .01) return; const [A, B] = ends, an = Math.atan2(B[1] - A[1], B[0] - A[0]); g.save(); g.globalAlpha = alpha == null ? 1 : alpha; g.fillStyle = col; g.translate(B[0], B[1]); g.rotate(an); g.beginPath(); g.moveTo(sz, 0); g.lineTo(-sz * .6, sz * .7); g.lineTo(-sz * .6, -sz * .7); g.closePath(); g.fill(); g.restore(); }
    function zone(z, col, lw, fill, alpha) { if (alpha <= .01) return; g.save(); g.globalAlpha = alpha; g.beginPath(); let on = false; for (let i = 0; i <= 36; i++) { const an = i / 36 * Math.PI * 2, v = P([clamp(z[0] + Math.cos(an) * z[2], -26.4, 26.4), Math.min(27, z[1] + Math.sin(an) * z[3])]); if (!v) continue; on ? g.lineTo(v[0], v[1]) : g.moveTo(v[0], v[1]); on = true; } g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } g.strokeStyle = col; g.lineWidth = lw; g.stroke(); g.restore(); }
    function label(str, x, y, col, alpha, px, font) { const z = P([x, y]); if (!z || alpha <= .01) return; g.save(); g.globalAlpha = alpha; g.font = (font === FM ? '400 ' : '700 ') + (px || clamp(z[2] * 1.15, 9.5, 16)) + 'px ' + (font || FC); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.strokeStyle = th.sheet; g.lineWidth = 5; g.strokeText(str, z[0], z[1]); g.fillStyle = col; g.fillText(str, z[0], z[1]); g.restore(); }
    /* a data tag beside a tracked man, the way a broadcast labels a dot */
    function pill(str, x, y, alpha) { const z = P([x, y]); if (!z || alpha <= .01) return; const px = clamp(b.H * .034, 11, 17); g.save(); g.globalAlpha = alpha; g.font = '800 ' + px + 'px ' + FC; const w = g.measureText(str).width + px * 1.1, h = px * 1.7, X = z[0] + 16, Y = z[1] - h / 2; g.fillStyle = BRIGHT; g.fillRect(X, Y, w, h); g.fillStyle = DARK; g.textAlign = 'left'; g.textBaseline = 'middle'; g.fillText(str, X + px * .55, z[1] + 1); g.restore(); }
    function scribble(x, y, prog, col, seed, grow) { const z = P([x, y]); if (!z || prog <= 0) return; const rx = clamp(z[2] * 1.6, 13, 40) * (grow || 1), ry = rx * .82; g.save(); g.strokeStyle = col; g.lineWidth = Math.max(2.4, b.H * .008); g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); const n = Math.max(2, Math.floor(72 * prog)); for (let i = 0; i <= n; i++) { const a = -2.3 + (i / 72) * Math.PI * 2.14, w = 1 + .035 * Math.sin(a * 3 + seed) + .02 * Math.sin(a * 7.3 + seed * 2), X = z[0] + Math.cos(a) * rx * w, Y = z[1] + Math.sin(a) * ry * w; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); g.restore(); }
    /* our men: an X in dark ink with the position under it */
    function xman(x, y, pos2, tag) { const z = P([x, y]); if (!z) return; const rr = clamp(z[2] * .62, 4.6, 14), e = rr * .8; g.save(); g.strokeStyle = INK; g.lineWidth = Math.max(2, rr * .36); g.lineCap = 'round'; g.beginPath(); g.moveTo(z[0] - e, z[1] - e * .86); g.lineTo(z[0] + e, z[1] + e * .86); g.moveTo(z[0] + e, z[1] - e * .86); g.lineTo(z[0] - e, z[1] + e * .86); g.stroke();
      g.textAlign = 'center'; if (pos2) { g.fillStyle = 'rgba(23,19,14,.8)'; g.font = '700 ' + clamp(z[2] * .95, 9.5, 16) + 'px ' + FC; g.textBaseline = 'top'; g.fillText(pos2, z[0], z[1] + rr + 2); }
      if (tag) { g.font = '400 ' + clamp(z[2] * 1.4, 13, 26) + 'px ' + FM; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.strokeStyle = th.sheet; g.lineWidth = 5; g.strokeText(tag, z[0], z[1] - rr - 8); g.fillStyle = th.mk; g.fillText(tag, z[0], z[1] - rr - 8); } g.restore(); }
    /* their men: a cream disc ringed in the bright colour with his number, and his name when asked */
    function disc(x, y, num, o) { o = o || {}; const z = P([x, y]); if (!z) return; const rr = clamp(z[2] * .9, 8.5, 26); g.save(); g.globalAlpha = o.dim ? .22 : 1; g.beginPath(); g.arc(z[0], z[1], rr, 0, 7); g.fillStyle = CREAM; g.fill(); g.strokeStyle = BRIGHT; g.lineWidth = Math.max(2, rr * .2); g.stroke(); g.textAlign = 'center';
      if (num != null) { g.fillStyle = DARK; g.font = '400 ' + (rr * (String(num).length > 1 ? 1.05 : 1.2)) + 'px ' + FD; g.textBaseline = 'middle'; g.fillText(String(num), z[0], z[1] + rr * .06); }
      if (o.tag) { g.font = '400 ' + clamp(z[2] * 1.4, 13, 26) + 'px ' + FM; g.textBaseline = 'alphabetic'; g.lineJoin = 'round'; g.strokeStyle = th.sheet; g.lineWidth = 5; g.strokeText(o.tag, z[0], z[1] - rr - 8); g.fillStyle = th.mk; g.fillText(o.tag, z[0], z[1] - rr - 8); }
      if (o.name && !o.dim) { g.font = '800 ' + clamp(z[2] * .8, 10, 16) + 'px ' + FC; g.lineJoin = 'round'; g.strokeStyle = th.sheet; g.lineWidth = 4; g.fillStyle = th.text; const up = o.up && !o.tag, Y = up ? z[1] - rr - 6 : z[1] + rr + 3; g.textBaseline = up ? 'alphabetic' : 'top'; g.strokeText(o.name, z[0], Y); g.fillText(o.name, z[0], Y); }
      g.restore(); }
    /* the other side: a thin circle with his position under it */
    function ghost(x, y, nm) { const z = P([x, y]); if (!z) return; const rr = clamp(z[2] * .52, 3.6, 12); g.save(); g.beginPath(); g.arc(z[0], z[1], rr, 0, 7); g.strokeStyle = th.ghost; g.lineWidth = 1.5; g.stroke(); if (nm && z[2] > 5.5) { g.fillStyle = th.night ? 'rgba(255,255,255,.72)' : 'rgba(23,19,14,.66)'; g.font = '700 ' + clamp(z[2] * .74, 9, 13) + 'px ' + FC; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillText(nm, z[0], z[1] + rr + 2); } g.restore(); }
    function ball(x, y) { const z = P([x, y]); if (!z) return; g.save(); g.fillStyle = BALL; g.strokeStyle = th.night ? '#fff' : INK; g.lineWidth = 1.2; g.beginPath(); g.ellipse(z[0], z[1], clamp(z[2] * .42, 4, 12), clamp(z[2] * .27, 2.6, 8), .5, 0, 7); g.fill(); g.stroke(); g.restore(); }
    function field() { g.setTransform(b.k, 0, 0, b.k, 0, 0); g.fillStyle = th.sheet; g.fillRect(0, 0, b.W, b.H); fit(view());
      for (let y = -20; y <= 30; y += 5) line([[-26.67, y], [26.67, y]], y === 0 ? th.strong : th.line, y === 0 ? 2.4 : 1.1);
      for (let y = -20; y <= 30; y++) for (const hx of [-6.67, 6.67]) line([[hx - .35, y], [hx + .35, y]], th.hash, 1);
      for (const sx of [-26.67, 26.67]) line([[sx, -20], [sx, 30]], th.side, 1.8); }
    function frame() { b.raf = 0; if (st.dead || !cv.isConnected || !b.W) return; field(); paint(api); if (!REDUCED && performance.now() - b.t0 < 14500) b.raf = requestAnimationFrame(frame); }
    const api = { b, g, P, T, th, line, tip, zone, label, pill, scribble, xman, disc, ghost, ball,
      kick() { if (!b.raf && !st.dead) b.raf = requestAnimationFrame(frame); },
      cam(reg, cut) { b.from = cut ? reg.slice() : view(); b.to = reg.slice(); b.v0 = cut ? -1e9 : performance.now(); api.kick(); },
      restart(delay) { b.t0 = performance.now() + (REDUCED ? 0 : (delay || 0) * 1000); api.kick(); },
      redraw() { if (size()) api.kick(); } };
    const ro = new ResizeObserver(() => api.redraw()); ro.observe(cv); st.ros.push(ro); size(); return api;
  }

  /* ---- the real team: who stands at each of our slots, [number, name] (s0 to s3 the line left to right, s4 the nickel,
     s5 and s6 the linebackers, s7 the left corner, s8 and s9 the safeties, s10 the right corner) ---- */
  const TH = ST.lineup || {}, KEYS = Object.keys(TH), spot = (k) => { const t = TILE[+k.slice(1)] || { x: 0, y: 5 }; return [t.x, t.y]; };
  const FRONT = ['s0', 's1', 's2', 's3'], SIX = ['s0', 's1', 's2', 's3', 's5', 's6'], DBS = ['s4', 's7', 's8', 's9', 's10'], QB0 = [0, -6];
  const blitzPath = (to) => { const a = spot('s4'); return [a, [a[0] + 1.1, a[1] - 3.5], [-4.6, -2.8], to]; }, RET = [[3.6, -3.4], [5.6, -8.5], [6.6, -15.5]];
  const laneEnd = (k) => { const s = spot(k); return [s[0] * .5, s[1] - 4.2]; };
  function offense(B, o) { o = o || {}; OFF.forEach((t) => { let x = t.x, y = t.y; if (t.p === 'QB' && o.qb) { x = o.qb[0]; y = o.qb[1]; } else if (t.p === 'OL' && o.push) y -= .8 * o.push; B.ghost(x, y, offName(t)); }); }
  function them(B, o) { o = o || {}; const ps = {}; KEYS.forEach((k) => { ps[k] = (o.pos && o.pos[k]) || spot(k); });
    KEYS.slice().sort((a, c) => ps[c][1] - ps[a][1]).forEach((k) => { const d = (o.sub && o.sub[k]) || TH[k], p = ps[k], named = o.names === true || (Array.isArray(o.names) && o.names.includes(k));
      B.disc(p[0], p[1], d[0], { name: named ? d[1] : '', dim: !!o.bright && !o.bright.includes(k), tag: o.tags && o.tags[k], up: FRONT.includes(k) ? FRONT.indexOf(k) % 2 === 0 : spot(k)[1] < 6 }); }); }
  const lwOf = (B) => Math.max(3.2, B.b.H * .012), big = (B) => clamp(Math.min(B.b.H * .075, B.b.W * .048), 13, 34);
  function rush4(B, t, a, c) { const u = ease(u01(t, a, c)), pos = {}; FRONT.forEach((k) => { const s = spot(k), e = laneEnd(k); pos[k] = [lerp(s[0], e[0], u), lerp(s[1], e[1], u)]; B.tip(B.line([s, e], B.th.mk, lwOf(B), null, .9, u), B.th.mk, 9, u > .98 ? 1 : 0); }); return pos; }

  /* ---- our side: the call's jobs drawn the way the site draws them, then the snap played out: rushers run their
     lanes (a free one gets all the way home), droppers go to their zones, man defenders close on their receivers ---- */
  const SNAP0 = 1.2, SNAP1 = 2.5;
  const laneOf = (m) => { const a = m.rush[0], e = m.rush[m.rush.length - 1]; return [a, e, [lerp(e[0], 0, .45), lerp(e[1], -6, .45)]]; };
  function ours(B, s) { const outs = s.outs || {}, call = s.call ? CALL(s.call) : null, t = B.T(), pr = ease(u01(t, .25, .95)), mv = call ? ease(u01(t, SNAP0, SNAP1)) : 0, mk = B.th.mk, tags = s.tags || {}, qb = [0, -6 - 1.6 * mv];
    const men = call ? call.men : TILE.map((x, i) => ({ k: 's' + i, x: x.x, y: x.y, pos: x.p }));
    if (call) for (const m of call.men) { if (m.from && Math.hypot(m.from[0] - m.x, m.from[1] - m.y) > 1.5) B.line([m.from, [m.x, m.y]], m.rush ? mk : 'rgba(23,19,14,.5)', 2, [3, 6], .85, pr);
      if (outs[m.k]) B.line([[m.x, m.y], outs[m.k]], 'rgba(23,19,14,.55)', 1.8, [5, 5], pr, 1);
      else if (m.rush) B.tip(B.line(laneOf(m), mk, lwOf(B), null, 1 - mv * .55, pr), mk, 9, pr >= .98 ? 1 - mv * .55 : 0);
      else if (m.zone) { B.zone(m.zone, 'rgba(23,19,14,.6)', 1.7, 'rgba(23,19,14,.05)', pr); B.line([[m.x, m.y], [m.zone[0], Math.min(26.5, m.zone[1])]], 'rgba(23,19,14,.55)', 1.8, null, pr * (1 - mv * .6), 1); B.label(ZNAME[m.zj] || 'ZONE', m.zone[0], Math.min(26, m.zone[1]) - .2, INK, pr * .9); }
      else if (m.man != null && RECV[m.man - 1]) { const r = RECV[m.man - 1]; B.line([[m.x, m.y], [lerp(m.x, r.x, .86), lerp(m.y, r.y, .86)]], 'rgba(23,19,14,.6)', 1.9, [6, 6], pr, 1); } }
    offense(B, { qb, push: mv });
    (s.ring || []).forEach((k, j) => { const m = men.find((x) => x.k === k); if (m) B.scribble(m.x, m.y, ease(u01(t, .6 + j * .2, 1.1 + j * .2)) * (1 - mv), mk, j + .7); });
    men.forEach((m) => { let p = [m.x, m.y];
      if (mv > 0) { if (outs[m.k]) p = [lerp(m.x, outs[m.k][0], mv), lerp(m.y, outs[m.k][1], mv)]; else if (m.rush) { const path = laneOf(m).concat(tags[m.k] ? [[qb[0] + (m.x < 0 ? -.6 : .6), qb[1] + .5]] : []); p = along(path, plen(path) * mv); }
        else if (m.zone) p = [lerp(m.x, m.zone[0], mv * .85), lerp(m.y, Math.min(m.zone[1], 21), mv * .85)];
        else if (m.man != null && RECV[m.man - 1]) { const r = RECV[m.man - 1]; p = [lerp(m.x, r.x, mv * .45), lerp(m.y, r.y + 2.5, mv * .45)]; } }
      B.xman(p[0], p[1], m.pos, tags[m.k] && t > 1 ? tags[m.k] : null); });
    if (s.sack && t > SNAP1) { B.scribble(qb[0], qb[1], u01(t, SNAP1, SNAP1 + .3), B.th.red, 2, 1.1); B.label('sack', qb[0] + 5, qb[1] - .4, B.th.red, u01(t, SNAP1 + .15, SNAP1 + .4), big(B), FM); } }

  /* ---- the clips: what the real side does in a scene ---- */
  const CLIPS = {
    /* the eleven walk out, the nickel comes free, the quarterback goes down */
    walkoutBlitz(B) { const t = B.T(), w = ease(u01(t, .1, 1.1)), sn = u01(t, 1.5, 2.75), pos = {}, c = B.th, BL = blitzPath([-.6, -7.5]);
      KEYS.forEach((k, i) => { const s = spot(k); pos[k] = [lerp((i - 5) * .55, s[0], w), lerp(8.5, s[1], w)]; });
      if (t > 1.5) { pos.s4 = along(BL, plen(BL) * ease(sn)); FRONT.forEach((k) => { const s = spot(k), u = u01(t, 1.5, 2.4); pos[k] = [lerp(s[0], s[0] * .72, u), lerp(s[1], s[1] - 1.7, u)]; B.line([s, pos[k]], c.mk, 2, null, .5, 1); }); B.line(BL, c.mk, lwOf(B), null, .9, ease(sn)); }
      const qy = -6 - 2 * u01(t, 1.5, 2.6); offense(B, { qb: [0, qy], push: u01(t, 1.5, 2.4) });
      if (t > 2.75) { B.scribble(0, qy, u01(t, 2.75, 3.05), c.red, 2, 1.15); B.label('sack', 4.8, qy - .3, c.red, u01(t, 2.9, 3.1), big(B), FM); }
      them(B, { pos, names: t > 1.15 ? ['s4'] : false });
      if (t > 1.7 && t < 2.9) B.pill('UNBLOCKED', pos.s4[0], pos.s4[1], u01(t, 1.7, 1.9)); },
    /* the blitzer hits the quarterback as he throws; the ball pops up and an end takes it back */
    pickSix(B, s) { const t = B.T(), pos = {}, bl = u01(t, .8, 2), nw = u01(t, .8, 2.4), rt = u01(t, 2.7, 4.6), lw = lwOf(B), c = B.th, BL = blitzPath([-.7, -5.7]);
      pos.s4 = along(BL, plen(BL) * ease(bl)); B.line(BL, c.mk, lw, null, .9, ease(bl));
      const rush = [spot('s3'), RET[0]]; pos.s3 = rt > 0 ? along(RET, plen(RET) * ease(rt)) : along(rush, plen(rush) * ease(nw)); B.line(rush, c.alt, 2, [3, 6], .6, ease(nw));
      if (rt > 0) B.tip(B.line(RET, c.alt, lw, null, 1, ease(rt)), c.alt, 11, rt > .98 ? 1 : 0);
      offense(B, { push: u01(t, .8, 1.6) });
      if (t > 2) { B.scribble(QB0[0], QB0[1], u01(t, 2, 2.3), c.red, 2.1, 1); B.label('hit as he throws', -7.8, -8.2, c.red, u01(t, 2.15, 2.4), big(B) * .85, FM); }
      const fl = u01(t, 2.02, 2.5); if (t > 2.02 && rt <= 0) { const bp = [lerp(QB0[0], RET[0][0], fl), lerp(QB0[1], RET[0][1], fl) + Math.sin(fl * Math.PI) * 1.2]; B.line([QB0, bp], c.red, 2, [2, 6], .9, 1); B.ball(bp[0], bp[1]); }
      if (rt > 0) B.ball(pos.s3[0] + .5, pos.s3[1] - .3);
      if (rt >= 1 && s.note) B.label(s.note, -8.4, -15.6, c.alt, u01(t, 4.6, 4.9), big(B) * .85, FM);
      them(B, { pos, sub: s.sub, names: ['s4', 's3'], tags: t < 2 ? { s4: 'blitz' } : null }); },
    pickSixStill(B, s) { const lw = lwOf(B), c = B.th, BL = blitzPath([-.7, -5.7]); offense(B); B.tip(B.line(BL, c.mk, lw, null, .9, 1), c.mk, 10, 1); B.scribble(QB0[0], QB0[1], 1, c.red, 2.1, 1); B.line([QB0, [1.6, -3.2], RET[0]], c.red, 2, [2, 6], .9, 1); B.tip(B.line(RET, c.alt, lw, null, 1, 1), c.alt, 11, 1);
      them(B, { pos: { s3: [3.9, -4.4] }, sub: s.sub, names: ['s4', 's3'], tags: { s4: 'blitz' } }); },
    six(B) { const t = B.T(); offense(B, { push: u01(t, .9, 1.8) }); const pos = rush4(B, t, .9, 1.9); B.scribble(spot('s5')[0], spot('s5')[1], u01(t, 1.9, 2.3), B.th.mk, 1.1); them(B, { pos, bright: SIX, names: B.b.narrow ? false : SIX }); },
    secondary(B) { const t = B.T(); offense(B); ['s8', 's9'].forEach((k, j) => { const s = spot(k); B.scribble(s[0], s[1], u01(t, .8 + j * .2, 1.2 + j * .2), B.th.mk, j + .4); }); B.label('two high', 0, 17.6, B.th.mk, u01(t, 1.4, 1.7), big(B), FM);
      const s4 = spot('s4'); B.scribble(s4[0], s4[1], u01(t, 1.8, 2.2), B.th.mk, 2.2); them(B, { bright: DBS, names: B.b.narrow ? false : DBS }); },
    look(B) { const t = B.T(); offense(B); ['s8', 's9'].forEach((k, j) => { const s = spot(k); B.scribble(s[0], s[1], u01(t, .5 + j * .2, .9 + j * .2), B.th.mk, j + .4); }); B.label('two high', 0, 17.4, B.th.mk, u01(t, 1.1, 1.4), big(B), FM); them(B, { names: B.b.narrow ? false : true }); },
    /* the same snap as our side, at the same moment */
    blitz(B) { const t = B.T(), u = ease(u01(t, SNAP0, SNAP1)), BL = blitzPath([-.6, -7.2]), pos = { s4: along(BL, plen(BL) * u) }, qy = -6 - 1.6 * u; offense(B, { qb: [0, qy], push: u }); B.line(BL, B.th.mk, lwOf(B), null, .9, Math.max(u, ease(u01(t, .3, .9)) * .35));
      FRONT.forEach((k) => { const s = spot(k); pos[k] = [lerp(s[0], s[0] * .72, u), lerp(s[1], s[1] - 1.7, u)]; });
      if (t > SNAP1) { B.scribble(0, qy, u01(t, SNAP1, SNAP1 + .3), B.th.red, 2, 1.1); B.label('sack', 5, qy - .4, B.th.red, u01(t, SNAP1 + .15, SNAP1 + .4), big(B), FM); }
      them(B, { pos, names: ['s4'], tags: t < SNAP1 ? { s4: 'blitz' } : { s4: 'free' } }); },
    /* four rush, but not the four they expect: the nickel comes and the end on the other side drops out into a zone */
    sim(B) { const t = B.T(), u = ease(u01(t, SNAP0, SNAP1)), BL = blitzPath([-.6, -7.2]), pos = { s4: along(BL, plen(BL) * u) }, qy = -6 - 1.6 * u, s3 = spot('s3'), drop = [s3[0] + 3.4, 7.2], pr = ease(u01(t, .3, .9)); offense(B, { qb: [0, qy], push: u });
      B.line(BL, B.th.mk, lwOf(B), null, .9, Math.max(u, pr * .35)); B.zone([drop[0], drop[1], 4.6, 2.6], 'rgba(255,255,255,.55)', 1.7, 'rgba(255,255,255,.07)', pr); B.line([s3, drop], B.th.alt, 2, [4, 6], .8, Math.max(u, pr * .5));
      ['s0', 's1', 's2'].forEach((k) => { const s = spot(k); pos[k] = [lerp(s[0], s[0] * .72, u), lerp(s[1], s[1] - 1.7, u)]; }); pos.s3 = [lerp(s3[0], drop[0], u), lerp(s3[1], drop[1], u)];
      if (t > SNAP1) { B.scribble(0, qy, u01(t, SNAP1, SNAP1 + .3), B.th.red, 2, 1.1); B.label('sack', 5, qy - .4, B.th.red, u01(t, SNAP1 + .15, SNAP1 + .4), big(B), FM); B.label('still only four', -8.6, -11.2, B.th.mk, u01(t, SNAP1 + .4, SNAP1 + .7), big(B), FM); }
      them(B, { pos, names: ['s4', 's3'], tags: t < SNAP1 ? { s4: 'comes', s3: 'drops' } : { s4: 'free', s3: 'drops' } }); },
    four(B) { const t = B.T(), u = u01(t, SNAP0, SNAP1); offense(B, { qb: [0, -6 - 1.6 * ease(u)], push: ease(u) }); const pos = rush4(B, t, SNAP0, SNAP1); B.label('four rush', 0, -9.4, B.th.mk, u01(t, SNAP1, SNAP1 + .3), big(B), FM); them(B, { pos, names: FRONT }); },
  };

  /* ---- the boards ---- */
  const sc = () => SCENES[st.cur];
  const BA = makeBoard(q('.sr-film canvas'), (B) => { const s = sc(), c = CLIPS[s.clip]; if (s.kind === 'film' && c) c(B, s); }, NIGHT);
  const BI = makeBoard(q('.sr-inset canvas'), (B) => { const s = sc(), c = s.group && CLIPS[s.group.clip]; if (c) c(B, s); }, NIGHT);
  /* the left half is the real team at night, unless the scene puts one of our calls there too: then it is paper like the right */
  const LT = Object.assign({}, NIGHT), leftTheme = (paper) => { Object.keys(LT).forEach((k) => { delete LT[k]; }); Object.assign(LT, paper ? PAPER : NIGHT); };
  const BL = makeBoard(q('.sr-them canvas'), (B) => { const s = sc(), c = CLIPS[s.clip]; if (s.kind !== 'split') return; if (s.callL) ours(B, Object.assign({}, s, { tags: null, ring: null, sack: 0, outs: null }, s.L || {}, { call: s.callL })); else if (c) c(B, s); }, LT);
  const BR = makeBoard(q('.sr-ours canvas'), (B) => { const s = sc(); if (s.kind === 'split') ours(B, s); }, PAPER);
  const boards = [BA, BI, BL, BR]; st.root = root; st.boards = boards;

  /* ---- the graphics ---- */
  function count(el) { const str = el.dataset.n, m = /^(-?)(\d+)(\.\d+)?(%?)$/.exec(str); if (!m || REDUCED) { el.textContent = str; return; } const to = parseFloat(m[2] + (m[3] || '')), dec = m[3] ? m[3].length - 1 : 0, t0 = performance.now(); const f = () => { if (st.dead) return; const k = clamp((performance.now() - t0) / 650, 0, 1); el.textContent = m[1] + (to * (1 - Math.pow(1 - k, 3))).toFixed(dec) + m[4]; if (k < 1) requestAnimationFrame(f); else el.textContent = str; }; requestAnimationFrame(f); }
  function takeHTML(t) { return (t.man && IMG[t.man] ? `<img class="sr-man" src="${esc(IMG[t.man])}" alt="">` : '') + t.lines.map(([w, c], j) => `<span class="sr-ln${c ? ' sr-g' : ''}" style="--d:${j * 170}ms">${esc(w)}</span>`).join('') + (t.sub ? `<span class="sr-sub" style="--d:${t.lines.length * 170 + 120}ms">${esc(t.sub)}</span>` : '') + (t.slips ? `<div class="sr-slips">${t.slips.map((x, j) => `<span style="--d:${700 + j * 160}ms"><b>${j + 1}</b>${esc(x)}</span>`).join('')}</div>` : ''); }
  function setTake(t) { const lt = q('.sr-take'); lt.className = 'sr-layer sr-take' + (t.paper ? ' sr-paper' : '') + (t.flood ? ' sr-flood' : '') + (t.center ? ' sr-center' : ''); lt.style.backgroundImage = t.photo && IMG[t.photo] ? `linear-gradient(100deg,${shade(DARK, .8)} 0 30%,rgba(0,0,0,.35)),url("${IMG[t.photo]}")` : ''; lt.innerHTML = takeHTML(t); lt.hidden = false; }
  function chartHTML(c) { const u = c.unit || '';
    if (c.type === 'bars') return `<div class="sr-gs"><span class="sr-k">${esc(c.k)}</span><h3>${esc(c.h)}</h3><div class="sr-bars">${c.bars.map(([tm, v, me], j) => `<div class="sr-bar${me ? ' sr-me' : ''}"><span>${esc(tm)}</span><u><i style="--w:${(v / c.max * 100).toFixed(1)}%;--d:${250 + j * 170}ms"></i></u><b data-n="${v.toFixed(1)}${u}">${v.toFixed(1)}${u}</b></div>`).join('')}</div><p class="sr-gn">${esc(c.note || '')}</p></div>`;
    if (c.type === 'path') return `<div class="sr-gs"><span class="sr-k">${esc(c.k)}</span><h3 class="sr-sm">${esc(c.h)}</h3><ol class="sr-path" style="--n:${c.stops.length}">${c.stops.map(([y, t, x], j) => `<li style="--d:${350 + j * 280}ms"><em>${esc(y)}</em><strong>${esc(t)}</strong><small>${esc(x)}</small></li>`).join('')}</ol><p class="sr-gn" style="animation-delay:${(.6 + c.stops.length * .28).toFixed(2)}s">${esc(c.note || '')}</p></div>`;
    return `<div class="sr-gs${c.tight ? ' sr-tight' : ''}"><span class="sr-k">${esc(c.k)}</span><div class="sr-huge" data-n="${esc(c.n)}">${esc(c.n)}</div><h3 class="sr-sm">${esc(c.h)}</h3><div class="sr-chips">${(c.chips || []).map((x, j) => `<span style="--d:${700 + j * 170}ms">${esc(x)}</span>`).join('')}</div><p class="sr-gn">${esc(c.note || '')}</p></div>`; }
  function groupHTML(gp) { return `<div class="sr-gg"><div class="sr-gph"><span class="sr-bn">${esc(gp.num)}</span>${IMG[gp.cut] ? `<img src="${esc(IMG[gp.cut])}" alt="">` : ''}</div><div class="sr-gt"><span class="sr-k">${esc(gp.k)}</span><h3>${esc(gp.h)}</h3><ul class="sr-rows">${gp.rows.map(([n, nm, x], j) => `<li style="--d:${300 + j * 130}ms"><em>${esc(n)}</em><strong>${esc(nm)}</strong><small>${esc(x)}</small></li>`).join('')}</ul><p class="sr-why"><b>Why it worked</b>${esc(gp.why)}</p></div></div>`; }

  /* ---- one scene ---- */
  function paintScene() { const s = sc(), nr = narrow(), hold = s.intro && !REDUCED ? (s.intro.hold || 2.4) : 0;
    root.dataset.kind = s.kind; q('.sr-film').hidden = s.kind !== 'film'; q('.sr-split').hidden = s.kind !== 'split'; q('.sr-graphic').hidden = !(s.kind === 'chart' || s.kind === 'group'); q('.sr-inset').hidden = s.kind !== 'group';
    const lt = q('.sr-take'); lt.hidden = true; lt.classList.remove('sr-lift');
    q('.sr-slate').innerHTML = `<b>${String(st.cur + 1).padStart(2, '0')}</b>${esc(s.slate || '')}`;
    if (s.kind === 'take') setTake(s.take);
    /* a film scene can open under a title that lifts away, so the title and the first snap are one scene */
    if (s.kind === 'film' && s.intro && !REDUCED) { setTake(s.intro); later(hold, () => lt.classList.add('sr-lift')); later(hold + .8, () => { lt.hidden = true; }); }
    if (s.kind === 'chart') { q('.sr-graphic').innerHTML = chartHTML(s.chart); }
    if (s.kind === 'group') { q('.sr-graphic').innerHTML = groupHTML(s.group); }
    q('.sr-graphic').querySelectorAll('[data-n]').forEach((el, j) => later(.25 + j * .17, () => count(el)));
    const pops = q('.sr-pops'); pops.innerHTML = (s.pops || []).map(([, n, t, x]) => `<div class="sr-pop"><b data-n="${esc(n)}">${esc(n)}</b><span>${esc(t)}</span>${x ? `<i>${esc(x)}</i>` : ''}</div>`).join('');
    (s.pops || []).forEach(([at], j) => later(hold + at, () => { const el = pops.children[j]; if (!el) return; el.classList.add('sr-in'); count(el.querySelector('b')); }));
    const bn = q('.sr-banner'); bn.classList.remove('sr-in'); bn.hidden = !s.banner; if (s.banner) { bn.textContent = s.banner[1]; later(hold + s.banner[0], () => bn.classList.add('sr-in')); }
    requestAnimationFrame(() => { if (st.dead) return;
      if (s.kind === 'film') { BA.redraw(); BA.cam(nr && s.vm ? s.vm : s.v, true); BA.restart(hold); (s.cams || []).forEach(([at, v, vm]) => later(hold + at, () => BA.cam(nr && vm ? vm : v))); }
      if (s.kind === 'group') { BI.redraw(); BI.cam(s.group.view || [-23, -5, 23, 20], true); BI.restart(); }
      if (s.kind === 'split') { leftTheme(!!s.callL); q('.sr-them').classList.toggle('sr-pp', !!s.callL); const lf = q('.sr-them .sr-flag'); lf.textContent = s.callL ? 'Our install' : (ST.label || 'The real thing'); lf.classList.toggle('sr-fthem', !s.callL);
        q('.sr-them h3').textContent = s.hL || ''; q('.sr-ours h3').textContent = s.hR || ''; BL.redraw(); BR.redraw(); BL.cam(s.vL, true); BR.cam(s.vR, true); BL.restart(); BR.restart(); } });
    /* the lower third: our side quotes his own words */
    const mine = s.side === 'ours', quote = mine && !s.plain, lo = q('.sr-lower'); lo.className = 'sr-lower' + (quote ? ' sr-q' : '');
    const fl = lo.querySelector('.sr-flag'); fl.className = 'sr-flag' + (mine ? '' : ' sr-fthem'); fl.textContent = mine ? 'Our install' : (ST.label || 'The real thing'); lo.querySelector('p').textContent = quote ? String.fromCharCode(8220) + s.cap + String.fromCharCode(8221) : (s.cap || '');
    q('.sr-strip').innerHTML = SCENES.map((x, j) => `<button type="button" class="sr-seg${j === st.cur ? ' sr-on' : j < st.cur ? ' sr-done' : ''}" data-sr="${j}" aria-label="Scene ${j + 1}: ${esc(x.slate || '')}"></button>`).join('');
    q('.sr-back').disabled = st.cur === 0 && !cfg.onStart; }
  function show(i, first) { const n = clamp(i, 0, SCENES.length - 1); if (!first && n === st.cur) return; st.timers.forEach(clearTimeout); st.timers = []; clearTimeout(st.pend); st.cur = n;
    if (first || REDUCED) { paintScene(); return; }
    const w = q('.sr-wipe'); w.classList.remove('sr-go'); void w.offsetWidth; w.classList.add('sr-go'); st.pend = setTimeout(() => { if (!st.dead) paintScene(); }, 290); }
  const next = () => { if (st.cur < SCENES.length - 1) show(st.cur + 1); else if (cfg.onEnd) cfg.onEnd(); };
  const back = () => { if (st.cur > 0) show(st.cur - 1); else if (cfg.onStart) cfg.onStart(); };
  root.addEventListener('click', (e) => { const sg = e.target.closest('[data-sr]'); if (sg) { show(+sg.dataset.sr); return; } if (e.target.closest('.sr-back')) { back(); return; } if (e.target.closest('.sr-next')) { next(); return; } if (e.target.closest('.sr-lower')) return; next(); });
  st.onKey = (e) => { if (st.dead || !root.isConnected) return; if (e.target && e.target.matches && e.target.matches('input,textarea,select,[contenteditable]')) return;
    if (e.key === ' ' || e.code === 'Space' || e.key === 'ArrowRight') { e.preventDefault(); e.stopImmediatePropagation(); next(); } else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopImmediatePropagation(); back(); } };
  document.addEventListener('keydown', st.onKey, true);
  st.cur = clamp(cfg.start || 0, 0, SCENES.length - 1); show(st.cur, true);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (!st.dead) boards.forEach((b) => b.redraw()); });
  st.show = show;
  return { show, next, back, at: () => st.cur };
}
/* the page repaints its stage now and then (a resize, a sign in): the reel that is already playing moves into the new host
   as it is, so a repaint never restarts a scene */
function adopt(host) { if (!S || S.dead || !S.root) return false; if (S.host === host && S.root.parentNode === host) return true; host.textContent = ''; host.appendChild(S.root); S.host = host; S.boards.forEach((b) => b.redraw()); return true; }
window.skStoryReel = { mount, unmount, adopt, at: () => (S ? S.cur : 0), go: (i) => { if (S && !S.dead && S.show) S.show(i || 0); } };
})();
