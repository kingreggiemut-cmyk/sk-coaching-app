/* gp-sheet.js — THE DEFENSIVE CALL SHEET, lifted from Alabama Playbook.html by
   CFB27 Engine Reference/extract-gp.js. DO NOT EDIT: edit the playbook and
   re-run the extractor. Lines 14889-15694 of the playbook, with the outside
   names it reaches for supplied through GPX. */
function mountGpSheet(GPX, host){

  /* the playbook's globals, supplied by the database */
  const PLAYS = GPX.plays, WB_PLAYS = PLAYS, WB_FORMATIONS = GPX.formations || [];
  const PERSONNEL4 = GPX.personnel || { players: [] };
  const SCHEME_CONFIG = { schemeKey: GPX.schemeKey, assetBaseUrl: '' };
  const ABOUT2 = { principles: GPX.principles || [] };
  const GP = GPX.gp, GP_SECTIONS = GPX.gpSections;
  const inner = host;
  const takeover = { classList: { contains: () => !!GPX.isOpen() } };
  const $ = (s) => document.querySelector(s);
  const assetUrl = (p) => GPX.asset(p);
  const tagLabel = (t) => GPX.tagLabel(t);
  const prefersReducedMotion = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const skToast = (m) => GPX.toast(m);
  const openPlay = (id) => GPX.openPlay(id);
  const roomBgHTML = () => '';
  /* the database hands its member in through GPX.auth; without one the module's own guards return
     {ok:false, reason:'unavailable'} and keep the local draft */
  const SK_AUTH = GPX.auth || null, skRequireLogin = GPX.requireLogin || (async () => false);

const GP_STORE = 'gp-sheet-' + SCHEME_CONFIG.schemeKey;   // per-scheme: a new scheme never inherits sheets

/* ---- state ---- */
let gpSheet = null;
function gpBlankSheet(){
  /* formations are FIXED per scheme - they start on the sheet, nobody picks them */
  const s = { key:null, xFactor:null,
    formations:(GP.recommended.formations || []).slice(),
    constraints:[], stickyTags:{} };
  GP_SECTIONS.forEach(x=>{ if(x.kind === 'plays') s[x.id] = []; });
  return s;
}
function gpLoad(){
  try{
    const raw = localStorage.getItem(GP_STORE);
    if(raw){
      const s = Object.assign(gpBlankSheet(), JSON.parse(raw));
      if(!s.formations || !s.formations.length)
        s.formations = (GP.recommended.formations || []).slice();
      if(!s.stickyTags) s.stickyTags = {};
      return s;
    }
  }catch(e){}
  return gpBlankSheet();
}
function gpSave(){ try{ localStorage.setItem(GP_STORE, JSON.stringify(gpSheet)); }catch(e){} }
/* Push the current call sheet to Supabase `saved_sheets` - ONE row per member+scheme,
   upserted, the SAME auth the coaching app reads. Its Call Sheets tab iframes this
   sheet back (/playbooks/<scheme>.html?sheet=1). Gated on sign-in (free to build,
   the modal pops only on save); never throws so the ticket can just read the result.
   returns Promise<{ ok, reason?, message? }>. */
async function saveSheetRemote(){
  try{
    if(!(typeof SK_AUTH !== 'undefined' && SK_AUTH && SK_AUTH.client))
      return { ok:false, reason:'unavailable' };
    const ok = await skRequireLogin('save your call sheet');
    if(!ok) return { ok:false, reason:'cancelled' };
    /* ship a RESOLVED copy of the constraint pairs alongside the raw sheet -
       index entries point into this playbook's GP.constraintOptions, which the
       coaching app can't see. constraintsResolved is what game mode reads to
       fire "they'll jump that now - here's your counter" contextually. */
    const sheetOut = Object.assign({}, gpSheet, {
      constraintsResolved: (gpSheet.constraints || []).map(ci =>
        (typeof ci === 'number') ? (GP.constraintOptions[ci] || null) : ci).filter(Boolean)
    });
    const { error } = await SK_AUTH.client.from('saved_sheets')
      .upsert({ member_id: SK_AUTH.memberId, scheme_key: SCHEME_CONFIG.schemeKey,
                data: sheetOut, updated_at: new Date().toISOString() },
              { onConflict: 'member_id,scheme_key' });
    if(error) throw error;
    return { ok:true };
  }catch(e){ return { ok:false, reason:'error', message: e && e.message }; }
}
/* Pull the member's saved call sheet back (used by the ?sheet= iframe view). Returns
   the raw gpSheet object or null when signed-out / no row / table missing. */
async function loadSheetRemote(){
  try{
    if(!(typeof SK_AUTH !== 'undefined' && SK_AUTH && SK_AUTH.client && SK_AUTH.signedIn))
      return null;
    const { data, error } = await SK_AUTH.client.from('saved_sheets')
      .select('data').eq('member_id', SK_AUTH.memberId)
      .eq('scheme_key', SCHEME_CONFIG.schemeKey).maybeSingle();
    if(error || !data) return null;
    return data.data || null;
  }catch(e){ return null; }
}
function gpPlay(id){ return PLAYS.find(p=>p.id === id); }
function gpOptionsFor(sec){
  if(typeof sec.tag === 'function') return WB_PLAYS.filter(sec.tag);
  return WB_PLAYS.filter(p=>(p.tags||[]).includes(sec.tag));
}
function gpBuilt(sec){
  if(sec.kind === 'plays') return (gpSheet[sec.id] || []).length > 0;
  if(sec.id === 'formations') return gpSheet.formations.length > 0;
  if(sec.id === 'xfactor') return !!gpSheet.xFactor;
  if(sec.id === 'constraints') return gpSheet.constraints.length > 0;
  return false;
}
function gpCrown(p){ return p && p.type === 'Star Play' ? '<i class="gp-crown">&#9819;</i>' : ''; }

/* ---- markup ---- */
/* the call sheet now draws from the same PLAYS the sections use (WB_PLAYS is
   an alias into PLAYS), so there is nothing to merge in - every call-sheet
   pill already resolves to a real breakdown. Kept as a no-op so callers are
   untouched. */
function gpEnsurePlays(){ /* no-op: WB_PLAYS === PLAYS */ }
function gp7HTML(){
  gpEnsurePlays();
  if(!gpSheet) gpSheet = gpLoad();     // gp7HTML renders before wireGp7 runs
  return `${roomBgHTML()}
    <div class="rm-vig"></div>
    <div class="gp-wrap" id="gpRoot">${gpViewHTML()}</div>`;
}
function gpViewHTML(){
  const rot = i=>(((i*37) % 5) - 2)*0.9;      // deterministic sticky lean
  const sticky = (p, i)=>{
    const tg = (gpSheet.stickyTags || {})[p.id] || [];
    const star = p.type === 'Star Play' ? ' gp-st-star' : '';
    return `<button class="gp-sticky${star}" data-play="${p.id}" style="--r:${rot(i)}deg">
      <b>${gpCrown(p)}${p.name}</b><span>${p.formation || ''}</span>
      ${tg.length ? `<span class="gp-tags">${tg.map(t=>`<i>${tagLabel(t)}</i>`).join('')}</span>` : ''}
    </button>`;
  };
  const addChip = (sec, picked)=>{
    const left = sec.n - picked;
    if(left <= 0) return '';
    return `<button class="gp-add" data-sec="${sec.id}">+ ${picked ? left + ' MORE' : 'PICK ' + sec.n}</button>`;
  };
  const secHTML = (sec)=>{
    const bits = [];
    if(sec.kind === 'plays'){
      const picks = (gpSheet[sec.id] || []).map(gpPlay).filter(Boolean);
      picks.forEach((p, i)=>bits.push(sticky(p, i + sec.label.length)));
      bits.push(addChip(sec, picks.length));
    }
    else if(sec.id === 'formations'){
      /* fixed per scheme: already on the sheet, click through to the looks */
      gpSheet.formations.forEach((f, i)=>bits.push(
        `<button class="gp-sticky gp-st-form" data-form="${f}" style="--r:${rot(i + 2)}deg"><b>${f}</b></button>`));
    }
    else if(sec.id === 'xfactor'){
      const x = gpSheet.xFactor;
      const p = x && gpPlay(x.play);
      /* the sticky's thumb is the player's own WVU CUTOUT - the trading-card art
         (pl.card) is still the deferred Oregon set, never show it on the sheet */
      const pc = x && (PERSONNEL4.players.find(pl=>pl.name === x.player) || {}).cut;
      if(x) bits.push(`<button class="gp-sticky gp-st-xf" ${p ? `data-play="${p.id}"` : ''} style="--r:-1.2deg">
          ${pc ? `<img class="gp-xf-card" src="${assetUrl(pc)}" alt="">` : ''}
          <span class="gp-xf-txt"><b>&#9733; ${x.player}</b>
            <span>${p ? p.name + (p.formation ? ' &middot; ' + p.formation : '') : ''}</span></span>
        </button>`);
      else bits.push(`<button class="gp-add" data-sec="xfactor">+ PICK THE GUY</button>`);
    }
    else if(sec.id === 'constraints'){
      /* the pair fills its whole strip: play + formation, BIG arrow, answer */
      gpSheet.constraints.forEach((ci, i)=>{
        const c = (typeof ci === 'number') ? GP.constraintOptions[ci] : ci;   // index = pre-made, object = build-your-own
        if(!c) return;
        const b = gpPlay(c.base), o = gpPlay(c.off);
        const side = (p)=>p ? `<span class="gp-con-side">
            <button class="gp-con-p" data-play="${p.id}">${gpCrown(p)}${p.name}</button>
            <i>${p.formation || ''}</i></span>` : '';
        bits.push(`<span class="gp-sticky gp-st-con" style="--r:${rot(i + 5)*.5}deg">
            ${side(b)}
            <svg class="gp-con-arrow" viewBox="0 0 90 30" aria-hidden="true">
              <path d="M4,16 C28,9 54,10 78,15" fill="none" stroke="#a0342e" stroke-width="3.4" stroke-linecap="round"/>
              <path d="M68,7 L82,15 L67,22" fill="none" stroke="#a0342e" stroke-width="3.4"
                stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            ${side(o)}
          </span>`);
      });
      bits.push(addChip(sec, gpSheet.constraints.length));
    }
    return `<div class="gp-sec" data-sec="${sec.id}" style="grid-area:${sec.id}">
        <button class="gp-sec-h" data-sec="${sec.id}" title="What is this?">${sec.label}
          <i class="gp-sec-q">?</i></button>
        <div class="gp-slots${sec.kind === 'plays' ? ' gp-two' : ''}">${bits.join('')}</div>
      </div>`;
  };
  const tickets =
    `<button class="gp-tik gp-tik-reco" id="gpReco" style="--r:-0.8deg">
       <span class="gp-tik-tape"></span><b>USE RECOMMENDED</b><span>the coach's sheet</span>
     </button>`
    + `<button class="gp-tik gp-tik-save" id="gpSaveTik" style="--r:0.7deg">
       <span class="gp-tik-tape"></span><b>&#9733; SAVE YOUR CALL SHEET</b><span>keep it in your app</span>
     </button>`
    + GP_SECTIONS.filter(sec=>!sec.fixed).map(sec=>
    `<button class="gp-tik${gpBuilt(sec) ? ' done' : ''}" data-sec="${sec.id}"
        style="--r:${((GP_SECTIONS.indexOf(sec)%3) - 1)*0.9}deg">
       <span class="gp-tik-tape"></span>
       <b>${sec.label}</b>
       <span>${gpBuilt(sec) ? '&#10003; BUILT' : (sec.kind === 'plays' ? 'PICK ' + sec.n : 'BUILD')}</span>
     </button>`).join('')
    + `<span class="gp-clear-wrap"><span class="gp-clear-note">Reset the sheet</span>
         <button class="gp-clear" id="gpClear" title="Clear the sheet">&#8635;</button></span>`;
  return `
    <div class="gp-motes" aria-hidden="true"></div>
    <div class="gp-stage" id="gpStage">
    <aside class="gp-howto">
      <span class="gp-howto-tape"></span>
      <b class="gp-howto-h">How the sheet works</b>
      <ol>
        <li>Hit <em>Use Recommended</em> for the coach's sheet, or build it yourself.</li>
        <li>Tap a section, pick your calls, then <em>Put It On The Sheet</em>.</li>
        <li>Tap any call to look at the play or pin its tags.</li>
        <li>Constraint pairs punish a defense that overplays your base call.</li>
        <li><em>Save</em> it and a slim copy rides with you in the Drive Builder.</li>
      </ol>
    </aside>
    <div class="gp-sheet">
      <div class="gp-ph">
        <img class="gp-ph-o" src="${assetUrl('Bama Assets/Bama Logo 1.webp')}" alt="">
        ${GP.headerArt
          ? `<img class="gp-head-art" src="${assetUrl(GP.headerArt)}" alt="${GP.title}">`
          : `<b class="gp-ph-t">${GP.title}</b>`}
        <div class="gp-keys">${(ABOUT2.principles || []).slice(0, 3).map(pr=>
          `<span class="gp-key-i"><i>&#10003;</i>${pr.title}</span>`).join('')}</div>
        <span class="gp-sweep" aria-hidden="true"></span>
      </div>
      <div class="gp-body">${GP_SECTIONS.map(secHTML).join('')}</div>
    </div>
    </div>
    <div class="gp-rail">${gpKnobs('plan')}<div class="gp-rail-tik">${tickets}</div></div>
    <div class="gp-pop" id="gpPop"></div>`;
}
/* the two mode knobs live on the left of the tray (flick between them) */
function gpKnobs(active){
  return `<div class="gp-knobs">
      <button class="gp-knob${active === 'plan' ? ' on' : ''}" data-tab="plan">
        <span class="gp-knob-dot"></span>GAME PLAN</button>
      <button class="gp-knob${active === 'forms' ? ' on' : ''}" data-tab="forms">
        <span class="gp-knob-dot"></span>FORMATIONS</button>
      <button class="gp-knob${active === 'macros' ? ' on' : ''}" data-tab="macros">
        <span class="gp-knob-dot"></span>CUSTOM MACROS</button>
    </div>`;
}

/* ---- the builder popup ---- */
function gpBuilderHTML(sec){
  const info = GP.headerInfo[sec.id] || '';
  const head = `<div class="gp-b-head"><b>${sec.label}</b><span>${info}</span>
      <button class="gp-b-x" title="Cancel">&times;</button></div>`;
  let body = '', max = sec.n || 1;
  if(sec.kind === 'plays'){
    const opts = gpOptionsFor(sec);
    const picked = gpSheet[sec.id] || [];
    body = opts.map(p=>
      `<button class="gp-opt${picked.includes(p.id) ? ' on' : ''}" data-id="${p.id}">
         ${gpCrown(p)}<b>${p.name}</b>
         <span>${(p.tags||[]).slice(0,3).map(tagLabel).join(' &middot; ')}</span>
       </button>`).join('');
  }
  else if(sec.id === 'xfactor'){
    const x = gpSheet.xFactor || {};
    body = `<div class="gp-b-sub">THE GUY</div>
      <div class="gp-b-row" id="gpXfPlayers">
        ${PERSONNEL4.players.map(pl=>
          `<button class="gp-opt${x.player === pl.name ? ' on' : ''}" data-player="${pl.name}">
             <b>&#9733; ${pl.name}</b><span>${(P_ROLES[pl.roleRef]||{}).role || ''}</span>
           </button>`).join('')}
      </div>
      <div class="gp-b-sub">THE CALL THAT FEEDS HIM</div>
      <div class="gp-b-row" id="gpXfPlays">
        ${WB_PLAYS.map(p=>
          `<button class="gp-opt${x.play === p.id ? ' on' : ''}" data-play2="${p.id}">
             ${gpCrown(p)}<b>${p.name}</b>
           </button>`).join('')}
      </div>`;
  }
  else if(sec.id === 'formations'){
    body = WB_FORMATIONS.map(f=>
      `<button class="gp-opt gp-opt-wide${gpSheet.formations.includes(f.name) ? ' on' : ''}" data-form="${f.name}">
         <b>${f.name}</b><span>${(f.bullets||[])[0] || ''}</span>
       </button>`).join('');
    max = 3;
  }
  else if(sec.id === 'constraints'){
    const opts = GP.constraintOptions.map((c, i)=>{
      const b = gpPlay(c.base), o = gpPlay(c.off);
      return `<button class="gp-opt gp-opt-wide${gpSheet.constraints.includes(i) ? ' on' : ''}" data-id="${i}">
          <b>${b ? b.name : ''} &#10132; ${o ? o.name : ''}</b><span>${c.note}</span>
        </button>`;
    }).join('');
    const playOpts = WB_PLAYS.map(p=>`<option value="${p.id}">${p.name}</option>`).join('');
    const build = `<div class="gp-con-build">
        <div class="gp-con-build-h">&#43; BUILD YOUR OWN</div>
        <div class="gp-con-build-row">
          <select class="gp-con-sel" data-role="base"><option value="">Base play&hellip;</option>${playOpts}</select>
          <span class="gp-con-buildarrow">&#10132;</span>
          <select class="gp-con-sel" data-role="off"><option value="">The answer&hellip;</option>${playOpts}</select>
          <button class="gp-con-add" type="button">ADD PAIR</button>
        </div>
        <div class="gp-con-mine" id="gpConMine"></div>
      </div>`;
    body = `<div class="gp-con-premade">${opts}</div>${build}`;
    max = 2;
  }
  return head + `<div class="gp-b-body">${body}</div>
    <div class="gp-b-foot">
      <span class="gp-b-count" id="gpBCount"></span>
      <button class="gp-b-ok" id="gpBOk">PUT IT ON THE SHEET</button>
    </div>`;
}

/* ---- wiring ---- */
function wireGp7(){
  const rm = prefersReducedMotion();
  gpSheet = gpLoad();
  gpEnsurePlays();
  const root = inner.querySelector('#gpRoot');

  /* subtle cursor parallax on the big folders - the call-sheet buckets and the
     formation exhibit get a little depth as you move over the sheet. Re-queries
     each move so it works across the GAME PLAN <-> FORMATIONS view swap. */
  if(!rm){
    const stage = root.closest('.gp-stage') || root;
    let raf = 0, nx = 0, ny = 0;
    const apply = ()=>{ raf = 0;
      stage.querySelectorAll('.gp-sec').forEach((f, i)=>{ const d = 3 + (i % 4) * 1.4;
        f.style.translate = (nx * -d).toFixed(1) + 'px ' + (ny * -d).toFixed(1) + 'px'; });
      stage.querySelectorAll('.gpf-shot').forEach(f=>{
        f.style.translate = (nx * 7).toFixed(1) + 'px ' + (ny * 7).toFixed(1) + 'px'; });
      stage.querySelectorAll('.gpf-diagram').forEach(f=>{
        f.style.translate = (nx * -4).toFixed(1) + 'px ' + (ny * -4).toFixed(1) + 'px'; });
    };
    stage.addEventListener('pointermove', e=>{
      const r = stage.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width - .5) * 2;
      ny = ((e.clientY - r.top) / r.height - .5) * 2;
      if(!raf) raf = requestAnimationFrame(apply);
    });
  }

  const render = ()=>{ root.innerHTML = gpViewHTML(); wirePlan(); };
  /* clean crossfade + drift when flicking between GAME PLAN and FORMATIONS */
  /* one place decides what each knob paints, so a new tab never has to be
     wired into three separate handlers again */
  function gpPaint(to){
    const host = root.closest('.card');
    if(host) host.classList.toggle('gpm-blur', to === 'macros');
    if(to === 'forms')  return showFormations();
    if(to === 'macros') return showMacros();
    return render();
  }
  function wireKnobs(){
    root.querySelectorAll('.gp-knob').forEach(b=>
      b.addEventListener('click', ()=>{ if(!b.classList.contains('on')) switchMode(b.dataset.tab); }));
  }
  function switchMode(to){
    if(rm){ gpPaint(to); return; }
    root.classList.add('gp-fade');
    setTimeout(()=>{
      gpPaint(to);
      root.classList.add('gp-fade');
      requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.remove('gp-fade')));
    }, 200);
  }

  const stamp = (secId)=>{
    const sec = root.querySelector(`.gp-sec[data-sec="${secId}"]`);
    if(!sec || rm) return;
    sec.classList.remove('gp-stamp'); void sec.offsetWidth; sec.classList.add('gp-stamp');
    const cards = Array.from(sec.querySelectorAll('.gp-sticky'));   // slap the new picks in
    cards.forEach((c, i)=>{ c.classList.add('gp-deal'); c.style.setProperty('--dl', i*55 + 'ms'); });
    requestAnimationFrame(()=>requestAnimationFrame(()=>cards.forEach(c=>c.classList.remove('gp-deal'))));
  };

  function openBuilder(secId){
    const sec = GP_SECTIONS.find(s=>s.id === secId);
    if(!sec) return;
    const pop = root.querySelector('#gpPop');
    pop.innerHTML = `<div class="gp-b-dim"></div><div class="gp-b-card">${gpBuilderHTML(sec)}</div>`;
    pop.classList.add('on');
    requestAnimationFrame(()=>requestAnimationFrame(()=>pop.classList.add('go')));
    const card = pop.querySelector('.gp-b-card');
    const count = pop.querySelector('#gpBCount');
    let picks;
    if(sec.kind === 'plays') picks = (gpSheet[sec.id] || []).slice();
    else if(sec.id === 'formations') picks = gpSheet.formations.slice();
    else if(sec.id === 'constraints') picks = gpSheet.constraints.slice();
    else picks = null; /* xfactor tracked separately */
    let xf = sec.id === 'xfactor' ? Object.assign({ player:null, play:null }, gpSheet.xFactor || {}) : null;
    const max = sec.id === 'constraints' ? 2 : sec.n;
    const syncCount = ()=>{
      if(sec.id === 'xfactor'){ count.textContent = (xf.player ? xf.player : 'pick the guy') + (xf.play ? ' + the call' : ''); return; }
      count.textContent = picks.length + ' / ' + max;
    };
    syncCount();
    card.querySelectorAll('.gp-opt').forEach(b=>b.addEventListener('click', ()=>{
      if(sec.id === 'xfactor'){
        if(b.dataset.player){ xf.player = b.dataset.player;
          card.querySelectorAll('[data-player]').forEach(x=>x.classList.toggle('on', x === b)); }
        else { xf.play = b.dataset.play2;
          card.querySelectorAll('[data-play2]').forEach(x=>x.classList.toggle('on', x === b)); }
        syncCount(); return;
      }
      const id = sec.id === 'formations' ? b.dataset.form
        : sec.id === 'constraints' ? +b.dataset.id : b.dataset.id;
      const at = picks.indexOf(id);
      if(at >= 0){ picks.splice(at, 1); b.classList.remove('on'); }
      else if(picks.length < max){ picks.push(id); b.classList.add('on'); }
      syncCount();
    }));
    /* BUILD YOUR OWN constraint pairs: custom pairs live in picks as objects
       (pre-made ones are numeric indexes); both count toward the max of 2. */
    if(sec.id === 'constraints'){
      const mine = card.querySelector('#gpConMine');
      const renderMine = ()=>{
        const customs = picks.filter(x=>typeof x !== 'number');
        mine.innerHTML = customs.map((c, k)=>{
          const b = gpPlay(c.base), o = gpPlay(c.off);
          return `<span class="gp-con-chip"><b>${b?b.name:c.base}</b> &#10132; <b>${o?o.name:c.off}</b>
            <button class="gp-con-rm" data-k="${k}" title="Remove">&times;</button></span>`;
        }).join('');
        mine.querySelectorAll('.gp-con-rm').forEach(rb=>rb.addEventListener('click', ()=>{
          const target = picks.filter(x=>typeof x !== 'number')[+rb.dataset.k];
          const at = picks.indexOf(target);
          if(at >= 0) picks.splice(at, 1);
          renderMine(); syncCount();
        }));
      };
      renderMine();
      const addBtn = card.querySelector('.gp-con-add');
      if(addBtn) addBtn.addEventListener('click', ()=>{
        const base = card.querySelector('[data-role="base"]').value;
        const off  = card.querySelector('[data-role="off"]').value;
        if(!base || !off || base === off || picks.length >= max) return;
        picks.push({ base, off, note:'your constraint pair', custom:true });
        card.querySelector('[data-role="base"]').value = '';
        card.querySelector('[data-role="off"]').value = '';
        renderMine(); syncCount();
      });
    }
    const close = ()=>{
      pop.classList.remove('go');
      setTimeout(()=>{ pop.classList.remove('on'); pop.innerHTML = ''; }, 240);
    };
    pop.querySelector('.gp-b-dim').addEventListener('click', close);
    pop.querySelector('.gp-b-x').addEventListener('click', close);
    pop.querySelector('#gpBOk').addEventListener('click', ()=>{
      if(sec.kind === 'plays') gpSheet[sec.id] = picks;
      else if(sec.id === 'formations') gpSheet.formations = picks;
      else if(sec.id === 'constraints') gpSheet.constraints = picks;
      else if(sec.id === 'xfactor') gpSheet.xFactor = (xf.player || xf.play) ? xf : null;
      gpSave(); close(); render(); stamp(sec.id);
    });
    pop._close = close;
  }

  /* sticky menu: look at the play, or pin up to 2 of its tags on the sticky */
  function openStickyMenu(btn){
    const id = btn.dataset.play, p = gpPlay(id);
    if(!p) return;
    const secEl = btn.closest('.gp-sec');
    const secId = secEl ? secEl.dataset.sec : null;
    const removable = secId && Array.isArray(gpSheet[secId]);
    root.querySelectorAll('.gp-smenu').forEach(x=>x.remove());
    const m = document.createElement('div');
    m.className = 'gp-smenu';
    let dirty = false;
    const away = (e)=>{ if(!m.contains(e.target)) closeMenu(); };
    const closeMenu = ()=>{
      document.removeEventListener('click', away, true);
      m.remove();
      if(dirty) render();
    };
    const tagsHTML = ()=>{
      const chosen = gpSheet.stickyTags[id] || [];
      return `<span class="gp-sm-cap">PIN UP TO 2 ON THE STICKY</span>
        <div class="gp-sm-list">${(p.tags || []).map(t=>
          `<button class="gp-sm-t${chosen.includes(t) ? ' on' : ''}" data-t="${t}">${tagLabel(t)}</button>`).join('')}
        </div>
        <button class="gp-sm-done">DONE</button>`;
    };
    const wire = ()=>{
      const look = m.querySelector('.gp-sm-look');
      if(look) look.addEventListener('click', ()=>{ closeMenu(); openPlay(id); });
      const rm2 = m.querySelector('.gp-sm-rm');
      if(rm2) rm2.addEventListener('click', ()=>{
        gpSheet[secId] = (gpSheet[secId] || []).filter(x=>x !== id);
        gpSave(); dirty = true; closeMenu();
      });
      const tg = m.querySelector('.gp-sm-tags');
      if(tg) tg.addEventListener('click', ()=>{ m.innerHTML = tagsHTML(); wire(); });
      m.querySelectorAll('.gp-sm-t').forEach(b2=>b2.addEventListener('click', ()=>{
        const t = b2.dataset.t;
        const cur = (gpSheet.stickyTags[id] || []).slice();
        const at = cur.indexOf(t);
        if(at >= 0) cur.splice(at, 1);
        else if(cur.length < 2) cur.push(t);
        else return;
        gpSheet.stickyTags[id] = cur;
        gpSave(); dirty = true;
        b2.classList.toggle('on', cur.includes(t));
      }));
      const done = m.querySelector('.gp-sm-done');
      if(done) done.addEventListener('click', closeMenu);
    };
    m.innerHTML = `<b class="gp-sm-nm">${p.name}</b>
      <button class="gp-sm-look">LOOK AT THE PLAY &#9656;</button>
      <button class="gp-sm-tags">TAGS &#9656;</button>
      ${removable ? `<button class="gp-sm-rm">TAKE IT OFF THE SHEET</button>` : ''}`;
    const wr = root.getBoundingClientRect(), r = btn.getBoundingClientRect();
    m.style.left = Math.max(8, Math.min(r.left - wr.left, wr.width - 260)) + 'px';
    m.style.top = Math.min(r.bottom - wr.top + 6, wr.height - 240) + 'px';
    root.appendChild(m);
    requestAnimationFrame(()=>requestAnimationFrame(()=>m.classList.add('in')));
    wire();
    setTimeout(()=>document.addEventListener('click', away, true), 0);
  }

  function explain(secId, anchor){
    const info = GP.headerInfo[secId];
    if(!info) return;
    root.querySelectorAll('.gp-explain').forEach(e=>e.remove());
    const tip = document.createElement('div');
    tip.className = 'gp-explain';
    tip.textContent = info;
    anchor.parentElement.appendChild(tip);
    requestAnimationFrame(()=>requestAnimationFrame(()=>tip.classList.add('in')));
    setTimeout(()=>{ if(tip.isConnected) tip.remove(); }, 5200);
  }

  function useRecommended(cascade){
    const R = GP.recommended;
    const steps = [
      { id:'xfactor', fn:()=>{ gpSheet.xFactor = Object.assign({}, R.xFactor); } },
      ...GP_SECTIONS.filter(s=>s.kind === 'plays').map(s=>
        ({ id:s.id, fn:()=>{ gpSheet[s.id] = (R[s.id] || []).slice(); } })),
      { id:'constraints', fn:()=>{ gpSheet.constraints = R.constraints.slice(); } },
    ];
    if(rm || !cascade){ steps.forEach(s=>s.fn()); gpSave(); render(); return; }
    let i = 0;
    const tick = ()=>{
      if(i >= steps.length){ gpSave(); return; }
      const s = steps[i++]; s.fn(); gpSave(); render(); stamp(s.id);
      setTimeout(tick, 260);
    };
    tick();
  }

  /* THE FORMATIONS TAB: same paper language as the call sheet. A formation
     ticker on the tray, the big screenshot (placeholder for now) + the
     diagram, marker points and the calls as stickies on the paper. */
  let gpfIdx = 0;
  const gpfPlays = f=>(f.tags || []).map(nm=>WB_PLAYS.find(p=>p.name === nm)).filter(Boolean);
  function gpfSheetHTML(){
    const f = WB_FORMATIONS[gpfIdx];
    const plays2 = gpfPlays(f);
    const shot = GP.formationShots[f.name] || GP.formationShot;
    const rot = i=>(((i*37) % 5) - 2)*0.9;
    return `<div class="gp-sheet gpf-sheet">
        <div class="gp-ph">
          <img class="gp-ph-o" src="${assetUrl('Bama Assets/Bama Logo 1.webp')}" alt="">
          <b class="gp-ph-t">${f.name}</b>
          <span class="gpf-count">${plays2.length} CALLS</span>
          <span class="gp-sweep" aria-hidden="true"></span>
        </div>
        <div class="gpf-body">
          <div class="gpf-shot"><img src="${assetUrl(shot)}" alt="${f.name}"></div>
          <div class="gpf-side">
            <div class="gpf-diagram"><img src="${assetUrl(f.img)}" alt=""></div>
            <div class="gpf-desc"><p>${f.desc || ''}</p></div>
            <div class="gpf-points">${(f.bullets || []).slice(0, 3).map(bt=>
              `<div class="gpf-pt"><i>&#10003;</i><span>${bt}</span></div>`).join('')}</div>
            <div class="gpf-callab">THE CALLS THAT LIVE HERE</div>
            <div class="gpf-calls">${plays2.map((p, i)=>{
              const tg = (gpSheet.stickyTags || {})[p.id] || [];
              return `<button class="gp-sticky gpf-call${p.type === 'Star Play' ? ' gp-st-star' : ''}"
                  data-play="${p.id}" style="--r:${rot(i)}deg">
                 <b>${gpCrown(p)}${p.name}</b>
                 ${tg.length ? `<span class="gp-tags">${tg.map(t=>`<i>${tagLabel(t)}</i>`).join('')}</span>` : ''}
               </button>`; }).join('')}</div>
          </div>
        </div>
      </div>`;
  }
  /* CUSTOM ADJUSTMENTS (macros), new in College Football 27. Create & Share ->
     Custom Adjustments -> Defense, build it, name it, then call it in game with
     L1 on PlayStation or LB on Xbox. Twenty defensive slots. Every setting below
     is read straight off Reggie's own screenshots, not guessed. */
  const GP_MACROS = [
    { id:'zero', tag:'ZERO BLITZ', name:'The 0 Blitz Macro',
      img:'Bama Assets/0 Blitz Macro.jpg',
      rows:[
        ['D-line technique', 'Spread'],
        ['Point of attack',  'Inside'],
        ['Stunts',           'None'],
        ['LB assignments',   'Blitz All'],
      ], },
    { id:'zone', tag:'ZONE BLITZ', name:'The Zone Blitz Macro',
      img:'Bama Assets/Zone Blitz Macro.jpg',
      rows:[
        ['D-line technique', 'Spread'],
        ['Point of attack',  'Inside'],
        ['Stunts',           'None'],
        ['LB assignments',   'Left alone'],
      ], },
    { id:'run', tag:'RUN DEFENSE', name:'The Run Defense Macro',
      img:'Bama Assets/Custom Marcos Run Defense.jpg',
      rows:[
        ['CB1 and CB2',        'Soft Squat'],
        ['Safety depth',       '9 yards'],
        ['Safety width',       'Spread'],
        ['Defender aggression','Aggressive'],
        ['Gap integrity',      'Aggressive'],
        ['Coverage shell',     'Cover 2'],
      ], },
  ];
  /* the rotator starts on the run defense macro, then cycles */
  let gpmIdx = Math.max(0, GP_MACROS.findIndex(m => m.id === 'run'));
  function gpmCardHTML(i, dir){
    const mm = GP_MACROS[i];
    const cls = dir === 0 ? '' : (dir > 0 ? ' gpm-in-r' : ' gpm-in-l');
    return `<figure class="gpm-card${cls}" data-mi="${i}">
        <figcaption class="gpm-cap">${mm.name}</figcaption>
        <img src="${assetUrl(mm.img)}" alt="${mm.name} settings" decoding="async">
      </figure>`;
  }
  function gpMacroHTML(){
    const tickets = GP_MACROS.map((mm, i)=>
      `<button class="gp-tik gpm-tik${i === gpmIdx ? ' on' : ''}" data-mi="${i}"
          style="--r:${((i%3) - 1)*0.9}deg">
         <span class="gp-tik-tape"></span>
         <b>${mm.tag}</b><span>${mm.rows.length} SETTINGS</span>
       </button>`).join('');
    return `
      <div class="gp-stage gpm-stage" id="gpStage">
        <div class="gpm-note">
          <span class="gpm-notepin"></span>
          <b>HOW TO MAKE ONE</b>
          <span class="gpm-path">Main Menu<i>&#9656;</i>Create &amp; Share<i>&#9656;</i>Custom Adjustments<i>&#9656;</i>Create Adjustment</span>
          <span class="gpm-x">Build it and save it. In game, tap <b>L1</b> (<b>LB</b> on Xbox),
            pick your macro, and everybody moves to their spot on their own.</span>
        </div>
        <div class="gpm-deck">
          <button class="gpm-arrow gpm-prev" aria-label="Previous macro">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4 L7.5 12 L15.5 20"
              fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <div class="gpm-slot" id="gpmSlot">${gpmCardHTML(gpmIdx, 0)}</div>
          <button class="gpm-arrow gpm-next" aria-label="Next macro">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 4 L16.5 12 L8.5 20"
              fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
        <div class="gpm-dots">${GP_MACROS.map((mm, i)=>
          `<button class="gpm-dot${i === gpmIdx ? ' on' : ''}" data-mi="${i}"
             aria-label="${mm.name}"></button>`).join('')}</div>
      </div>
      <div class="gp-rail gpm-rail">${gpKnobs('macros')}<div class="gp-rail-tik">${tickets}</div></div>
      <div class="gp-pop" id="gpPop"></div>`;
  }
  function showMacros(){
    root.innerHTML = gpMacroHTML();
    const slot = root.querySelector('#gpmSlot');
    let gpmBusy = false;
    const flagIdx = ()=>{
      root.querySelectorAll('.gpm-dot').forEach((x, i)=>x.classList.toggle('on', i === gpmIdx));
      root.querySelectorAll('.gpm-tik').forEach((x, i)=>x.classList.toggle('on', i === gpmIdx));
    };
    const go = (next, dir)=>{
      next = (next + GP_MACROS.length) % GP_MACROS.length;
      if(next === gpmIdx || gpmBusy) return;
      const d = dir != null ? dir : 1;
      const cur = slot.firstElementChild;
      gpmIdx = next; flagIdx();
      if(rm || !cur){ slot.innerHTML = gpmCardHTML(gpmIdx, 0); return; }
      /* the card on screen leaves the way you are travelling, then the next
         one comes in behind it. gpmBusy stops a fast double click from
         swapping mid-handoff and leaving a card stuck off screen. */
      gpmBusy = true;
      cur.classList.add(d > 0 ? 'gpm-out-l' : 'gpm-out-r');
      setTimeout(()=>{ slot.innerHTML = gpmCardHTML(gpmIdx, d); gpmBusy = false; }, 215);
    };
    root.querySelector('.gpm-next').addEventListener('click', ()=>go(gpmIdx + 1,  1));
    root.querySelector('.gpm-prev').addEventListener('click', ()=>go(gpmIdx - 1, -1));
    root.querySelectorAll('.gpm-dot, .gpm-tik').forEach(b=>b.addEventListener('click', ()=>{
      const n = +b.dataset.mi; go(n, n > gpmIdx ? 1 : -1);
    }));
    wireKnobs();
  }
  function gpFormHTML(){
    const tickets = WB_FORMATIONS.map((ff, i)=>
      `<button class="gp-tik gpf-tik${i === gpfIdx ? ' on' : ''}" data-fi="${i}"
          style="--r:${((i%3) - 1)*0.9}deg">
         <span class="gp-tik-tape"></span>
         <b>${ff.name}</b><span>${gpfPlays(ff).length} CALLS</span>
       </button>`).join('');
    return `
      <div class="gp-motes" aria-hidden="true"></div>
      <div class="gp-stage" id="gpStage">${gpfSheetHTML()}</div>
      <div class="gp-rail gpf-rail">${gpKnobs('forms')}<div class="gp-rail-tik">${tickets}</div></div>
      <div class="gp-pop" id="gpPop"></div>`;
  }
  function wireFormCalls(){
    root.querySelectorAll('.gpf-call').forEach(b=>
      b.addEventListener('click', ()=>openPlay(b.dataset.play)));
  }
  function wireForm(){
    root.querySelectorAll('.gpf-tik').forEach(b=>b.addEventListener('click', ()=>swapFormation(+b.dataset.fi)));
    wireKnobs();
    wireFormCalls();
  }
  /* the page-pull: current sheet lifts off, the next look rises out of the tray */
  function swapFormation(next, dir){
    if(next === gpfIdx) return;
    const stage = root.querySelector('#gpStage');
    if(!stage || rm){ gpfIdx = next; showFormations(); return; }
    const d = dir != null ? dir : (next > gpfIdx ? 1 : -1);
    const cur = stage.querySelector('.gpf-sheet');
    gpfIdx = next;
    root.querySelectorAll('.gpf-tik').forEach(b=>b.classList.toggle('on', +b.dataset.fi === next));
    cur.classList.add(d > 0 ? 'gpf-out-up' : 'gpf-out-dn');
    const incoming = document.createElement('div');
    incoming.innerHTML = gpfSheetHTML();
    const nsheet = incoming.firstElementChild;
    nsheet.classList.add(d > 0 ? 'gpf-in-up' : 'gpf-in-dn');
    stage.appendChild(nsheet);
    requestAnimationFrame(()=>requestAnimationFrame(()=>nsheet.classList.add('go')));
    setTimeout(()=>{ if(cur.isConnected) cur.remove();
      nsheet.classList.remove('gpf-in-up','gpf-in-dn','go');
      wireFormCalls(); }, 460);
  }
  function showFormations(){
    root.innerHTML = gpFormHTML();
    wireForm();
  }

  function wirePlan(){
    root.querySelectorAll('.gp-tik[data-sec], .gp-add').forEach(b=>
      b.addEventListener('click', ()=>openBuilder(b.dataset.sec)));
    root.querySelectorAll('.gp-sec-h').forEach(b=>
      b.addEventListener('click', ()=>explain(b.dataset.sec, b)));
    root.querySelectorAll('.gp-sticky[data-play]').forEach(b=>
      b.addEventListener('click', (e)=>{ e.stopPropagation(); openStickyMenu(b); }));
    root.querySelectorAll('.gp-con-p[data-play]').forEach(b=>
      b.addEventListener('click', (e)=>{ e.stopPropagation(); openPlay(b.dataset.play); }));
    root.querySelectorAll('.gp-st-form').forEach(b=>
      b.addEventListener('click', ()=>showFormations()));
    const reco = root.querySelector('#gpReco');
    if(reco) reco.addEventListener('click', ()=>useRecommended(true));
    const saveTik = root.querySelector('#gpSaveTik');
    if(saveTik) saveTik.addEventListener('click', async ()=>{
      gpSave();                                     // local cache first (always keeps a draft)
      const sub = saveTik.querySelector('span:last-child');
      const orig = sub ? sub.textContent : '';
      const flash = (txt)=>{ saveTik.classList.add('saved'); if(sub) sub.textContent = txt;
        setTimeout(()=>{ saveTik.classList.remove('saved'); if(sub) sub.textContent = orig; }, 2200); };
      // push to the member's coaching app (Supabase `saved_sheets`); pops the sign-in
      // modal on first save. Cancelling leaves the ticket alone (still cached locally).
      const res = await saveSheetRemote();
      if(res.ok){ flash('Saved to your app ✓'); try{ skToast('Call sheet saved to your app'); }catch(e){} }
      else if(res.reason === 'cancelled'){ /* not signed in / dismissed - local draft kept */ }
      else { flash('Saved on this device'); }   // signed-out or table missing: at least the draft
    });
    const clear = root.querySelector('#gpClear');
    if(clear) clear.addEventListener('click', ()=>{ gpSheet = gpBlankSheet(); gpSave(); dealSheet(); });
    wireKnobs();
  }
  /* deal every sticky currently on the sheet with a staggered slap-in */
  function dealSheet(fromReco){
    render();
    if(rm) return;
    const cards = Array.from(root.querySelectorAll('.gp-sheet .gp-sticky'));
    cards.forEach((c, i)=>{
      c.classList.add('gp-deal');
      c.style.setProperty('--dl', (fromReco ? i*45 : i*30) + 'ms');
    });
    requestAnimationFrame(()=>requestAnimationFrame(()=>
      cards.forEach(c=>c.classList.remove('gp-deal'))));
  }
  wirePlan();
  /* entrance beat: the paper drops in, tickets rise, stickies deal */
  if(!rm){
    const stage = root.querySelector('#gpStage');
    if(stage){ stage.classList.add('gp-enter');
      requestAnimationFrame(()=>requestAnimationFrame(()=>stage.classList.remove('gp-enter'))); }
    const cards = Array.from(root.querySelectorAll('.gp-sheet .gp-sticky'));
    cards.forEach((c, i)=>{ c.classList.add('gp-deal'); c.style.setProperty('--dl', 220 + i*28 + 'ms'); });
    requestAnimationFrame(()=>requestAnimationFrame(()=>cards.forEach(c=>c.classList.remove('gp-deal'))));
  }

  /* presenter: each Space/Right builds the NEXT unbuilt section from the
     recommended picks (the creator narrates the sheet into existence). */
  const order = ['xfactor',
    ...GP_SECTIONS.filter(s=>s.kind === 'plays').map(s=>s.id), 'constraints'];
  const buildNext = ()=>{
    const R = GP.recommended;
    for(const id of order){
      const sec = GP_SECTIONS.find(s=>s.id === id);
      if(gpBuilt(sec)) continue;
      if(id === 'xfactor') gpSheet.xFactor = Object.assign({}, R.xFactor);
      else if(id === 'constraints') gpSheet.constraints = R.constraints.slice();
      else gpSheet[id] = (R[id] || []).slice();
      gpSave(); render(); stamp(id);
      return;
    }
  };
  const onGpKey = (e)=>{
    if(!inner.querySelector('.gp-wrap') || !takeover.classList.contains('open')){
      document.removeEventListener('keydown', onGpKey, true);
      return;
    }
    const pop = root.querySelector('#gpPop');
    if(e.key === 'Escape' && pop && pop.classList.contains('on')){
      e.preventDefault(); e.stopPropagation();
      if(pop._close) pop._close();
      return;
    }
    if(e.key !== ' ' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    if(pop && pop.classList.contains('on')) return;      // let the popup be
    if(root.querySelector('.gpf-sheet')){                 // formations tab: walk the looks
      e.preventDefault(); e.stopPropagation();
      const dir = e.key === 'ArrowLeft' ? -1 : 1;
      swapFormation((gpfIdx + dir + WB_FORMATIONS.length) % WB_FORMATIONS.length, dir);
      return;
    }
    if(e.key === 'ArrowLeft') return;
    if(!root.querySelector('.gp-sheet')) return;
    e.preventDefault(); e.stopPropagation();
    buildNext();
  };
  document.addEventListener('keydown', onGpKey, true);
}
  /* mount: the playbook did pop(gp7HTML(), wireGp7) */
  host.innerHTML = gp7HTML();
  wireGp7();
  return { reload: () => { gpSheet = gpLoad(); host.innerHTML = gp7HTML(); wireGp7(); } };
}
