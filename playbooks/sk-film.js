/* ═══════════════════════════════════════════════════════════════
   SK FILM MODE — turn a playbook screen into recordable footage.

   Add to any playbook:
       <script src="sk-film.js"></script>

   It does nothing at all unless ?film=1 is in the URL, so a normal visit
   is untouched.

     ?film=1                    hide the chrome, drive it yourself
     ?film=1&shots=...          run a scripted camera move, then record

   SHOTS is a comma separated list. Whitespace is ignored.
       wide:2                   full frame, hold 2s
       to:screen:3              travel to the play screen over 3s
       push:adj:2.5             same thing, reads better in a shot list
       hold:1.5                 stay put
       pop:read2                land a highlight on read chip 2
       solo:adj:3               spotlight it, everything else dims
       clear                    drop any highlight/dim

   Example, the shot list for a play breakdown:
       ?film=1&play=...&shots=wide:1.5, to:screen:3, pop:read1, hold:2,
                              pop:read2, hold:2, push:adj:2.5, wide:2

   TARGETS are named so the shot list stays readable. Add more in NAMED.
   Everything is measured off the live DOM, so nothing here is a guess.
   ═══════════════════════════════════════════════════════════════ */
(function(){
  const q = new URLSearchParams(location.search);
  if(!q.has('film')) return;

  const CAM_ROOT = q.get('camroot') || 'body';
  const EASE = 'cubic-bezier(.45,0,.35,1)';

  /* ── the chrome that must not be in the shot ─────────────────── */
  const CHROME = [
    '.fb-ctrl',            /* the < > arrows AND save play           */
    '.fb-hintbar',         /* "next play · esc back · p presenter"   */
    '.fs-btn',             /* full screen                            */
    '.cf-back', '.mbd-back', '.mbd-edit', '.mbd-note',
    '.fr-hintbar', '.dio-e-hint'
  ].concat((q.get('hide')||'').split(',').map(s=>s.trim()).filter(Boolean));

  const css = document.createElement('style');
  css.textContent = `
    ${CHROME.join(',')} { opacity:0 !important; pointer-events:none !important; }
    html.skFilm, html.skFilm body { overflow:hidden !important; background:#000; }
    html.skFilm body { transform-origin:0 0; will-change:transform; }
    html.skFilm.skHideCursor, html.skFilm.skHideCursor * { cursor:none !important; }
    /* NOTE: the highlight and dim are applied as INLINE styles in pop()/dim()
       below, not from this sheet. A stylesheet rule lost the cascade against
       the playbook's own styles (outline-style landed but outline-color came
       back black), and a reusable tool cannot depend on out-styling a page it
       does not control. Inline wins everywhere. */
  `;
  document.head.appendChild(css);
  document.documentElement.classList.add('skFilm');
  if(!q.has('cursor')) document.documentElement.classList.add('skHideCursor');

  /* ── targets. Named so a shot list reads like a shot list. ───── */
  const NAMED = {
    screen:'.tv-screen', tv:'.film-tv', shot:'.fb-shot',
    title:'.fb-head',    adj:'.fb-adj',  right:'.fb-right',
    call:'.fb-ref',      form:'.fb-dock-setgrp', tags:'.fb-dock-tagsgrp',
    reads:'.fb-dock-reads', dock:'.fb-dock', roll:'.fb-roll',
    board:'.mbd-shotwrap', panel:'.mbd-panel', legend:'.mbd-legend'
  };
  function find(name){
    if(!name) return null;
    const m = /^read(\d+)$/.exec(name);          /* read1, read2, ...  */
    if(m) return document.querySelectorAll('.fb-dock-tabs > *')[+m[1]-1] || null;
    const sel = NAMED[name] || name;             /* or a raw selector  */
    try{ return document.querySelector(sel); }catch(e){ return null; }
  }

  /* ── the camera ──────────────────────────────────────────────
     transform-origin is 0 0 and the order is translate then scale, so a
     point p lands at (t + p*z). To put a target's centre in the middle of
     the viewport:  t = viewport/2 - centre*z  */
  const root = document.querySelector(CAM_ROOT) || document.body;
  function measure(el){
    const prev = root.style.transition; root.style.transition = 'none';
    const keep = root.style.transform;  root.style.transform  = 'none';
    const r = el.getBoundingClientRect();
    const box = { x:r.left + scrollX, y:r.top + scrollY, w:r.width, h:r.height };
    root.style.transform = keep; void root.offsetWidth; root.style.transition = prev;
    return box;
  }
  function frameFor(el, pad){
    const b = measure(el);
    if(!b.w || !b.h) return null;
    const W = innerWidth, H = innerHeight;
    const p = pad == null ? 1.18 : pad;                 /* breathing room */
    const z = Math.min(W/(b.w*p), H/(b.h*p), 3.2);      /* never past 3.2x */
    const cx = b.x + b.w/2, cy = b.y + b.h/2;
    return `translate(${(W/2 - cx*z).toFixed(1)}px,${(H/2 - cy*z).toFixed(1)}px) scale(${z.toFixed(4)})`;
  }
  const WIDE = 'translate(0px,0px) scale(1)';
  function moveTo(tf, secs){
    root.style.transition = `transform ${secs}s ${EASE}`;
    root.style.transform  = tf;
  }

  /* ── highlight / spotlight ───────────────────────────────────── */
  const DIMMABLE = '.fb-head,.fb-right,.fb-dock-grp,.film-tv,.fb-console';
  const GOLD = q.get('glow') ? '#'+q.get('glow').replace(/^#/,'') : '#F5C433';
  const touched = new Set();

  function setImp(el, props){
    touched.add(el);
    for(const k in props) el.style.setProperty(k, props[k], 'important');
  }
  function clearFx(){
    touched.forEach(el=>{
      ['outline','outline-offset','filter','z-index','position','transition'].forEach(p=>el.style.removeProperty(p));
      el.classList.remove('skPop','skDim');
    });
    touched.clear();
  }
  function pop(el){
    if(!el) return;
    setImp(el, {
      /* no transition: it must be frame-accurate for scrubbing, and a stalled
         transition leaves the highlight sitting on its invisible from-value */
      'transition':'none',
      'position':getComputedStyle(el).position === 'static' ? 'relative' : getComputedStyle(el).position,
      'z-index':'9999',
      'outline':'3px solid '+GOLD,
      'outline-offset':'3px',
      'filter':'drop-shadow(0 0 16px rgba(245,196,51,.6))'
    });
    el.classList.add('skPop');
  }
  function solo(el){
    if(!el) return;
    document.querySelectorAll(DIMMABLE).forEach(e=>{
      if(e.contains(el) || e === el) return;
      setImp(e, {'transition':'none','filter':'brightness(.34) saturate(.6)'});
      e.classList.add('skDim');
    });
    pop(el);
  }

  /* ── the shot list ───────────────────────────────────────────── */
  function parse(str){
    return (str||'').split(',').map(s=>s.trim()).filter(Boolean).map(s=>{
      const p = s.split(':').map(x=>x.trim());
      return { op:p[0].toLowerCase(), arg:p[1], secs:parseFloat(p[2] != null ? p[2] : p[1]) };
    });
  }
  const hud = document.createElement('div');
  hud.className = 'hint';   /* export.js already hides ".hint" while recording */
  hud.style.cssText = 'position:fixed;left:12px;bottom:10px;z-index:2147483000;font:600 12px system-ui,'+
    'sans-serif;color:#ffe08a;background:rgba(0,0,0,.6);padding:5px 10px;border-radius:6px;pointer-events:none';
  document.body.appendChild(hud);

  let timer = null;
  async function run(list){
    for(let i=0;i<list.length;i++){
      const s = list[i];
      const secs = isFinite(s.secs) ? s.secs : 1;
      hud.textContent = `${i+1}/${list.length}  ${s.op}${s.arg?':'+s.arg:''}`;
      switch(s.op){
        case 'wide':  moveTo(WIDE, secs); break;
        case 'to':
        case 'push':  { const f = frameFor(find(s.arg)); if(f) moveTo(f, secs); break; }
        case 'pop':   pop(find(s.arg)); break;
        case 'solo':  solo(find(s.arg)); break;
        case 'clear': clearFx(); break;
        case 'hold':  break;
        default: break;
      }
      await new Promise(r=>{ timer = setTimeout(r, Math.max(0, secs*1000)); });
    }
    hud.textContent = 'shot list done';
  }

  const SHOTS = q.get('shots');
  window.SK_FILM = {
    to:(n,s)=>{ const f=frameFor(find(n)); if(f) moveTo(f, s||2); },
    wide:(s)=>moveTo(WIDE, s||2),
    pop, solo, clear:clearFx, find, run:(str)=>run(parse(str))
  };

  /* export.js records for this long. Default is the shot list's total. */
  const total = parse(SHOTS).reduce((a,s)=>a + (isFinite(s.secs)?s.secs:1), 0);
  window.SK_EXPORT_SECONDS = +(q.get('secs') || (total ? total + 0.5 : 12));
  window.SK_EXPORT_AR = (innerWidth >= innerHeight) ? '16x9' : '9x16';

  /* window.play() is what export.js calls to start a clean take */
  window.play = function(){
    if(timer) clearTimeout(timer);
    clearFx();
    root.style.transition = 'none'; root.style.transform = WIDE; void root.offsetWidth;
    if(SHOTS) run(parse(SHOTS));
  };

  function boot(){
    if(SHOTS){ setTimeout(()=>window.play(), 700); }
    else hud.textContent = 'film mode · chrome hidden · drive it yourself';
  }
  if(document.readyState === 'complete') setTimeout(boot, 400);
  else addEventListener('load', ()=>setTimeout(boot, 400));

  /* the same recorder every render uses */
  const s = document.createElement('script');
  s.src = 'TikTok Renders/export.js';
  document.head.appendChild(s);
})();
