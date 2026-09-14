/* =====================================================================
   SCHEME KINGS · THE SCHEME SECTION
   The member's side of the playbook database. Loaded after index.html's own
   script, so it shares that page's globals: $, esc, slug, IDX, FORMS,
   SCHEMES, SCHEME, INSTALL, SEC, VIEW, BOOK, CONCEPT, drawFormation,
   setTitle, buildRail, render.

   One scheme = one room. The picker is the front door. Inside, the plan's
   doors run down the right rail (the coaching app's game-plan model):
   THE PLAN, THE INSTALL, CALL SHEET, DRIVES, THE BOARD, PERSONNEL.
   Everything a member writes lives in one plan object per scheme, mirrored
   to localStorage in the same shape the coaching app keeps in game_plans,
   so a remote sync later is a drop-in.
   ===================================================================== */
'use strict';

/* ---------- shared bits ---------- */
const CROWN=`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
  <circle cx="5" cy="7.6" r="1.7"/><circle cx="12" cy="4.4" r="1.9"/><circle cx="19" cy="7.6" r="1.7"/>
  <path d="M4 9.3 L6.4 17 H17.6 L20 9.3 L15.5 12.6 L12 6.7 L8.5 12.6 Z"/>
  <rect x="6" y="17.4" width="12" height="2.9" rx="0.4"/></svg>`;
const LOCK=`<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" width="18" height="18">
  <path d="M7 10V8a5 5 0 0 1 10 0v2h1.5A1.5 1.5 0 0 1 20 11.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19.5v-8A1.5 1.5 0 0 1 5.5 10H7zm2 0h6V8a3 3 0 0 0-6 0v2z"/></svg>`;
const XMARK=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5 L19 18.6 M18.7 5.3 L5.3 18.7" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg>`;
const TAG_LABELS={'vs-all-zone':'Beats Zone','vs-man':'Beats Man','vs-cover-2':'Cover 2','vs-cover-3':'Cover 3',
  'play-action':'Play Action','rpo':'RPO','run-play':'Run Play','screen':'Screen','money-play':'Money Play',
  'bomb':'One Play TD','third-down':'3rd Down','blitz-beater':'Blitz Beater','short-yardage':'Short Yardage',
  'red-zone':'Red Zone','goal-line':'Goal Line','option-run':'Option','vertical-shot':'Vertical Shot'};
const tagLabel=(t)=>TAG_LABELS[t]||String(t).split('-').map(w=>w==='vs'?'Vs':w==='rpo'?'RPO':w.charAt(0).toUpperCase()+w.slice(1)).join(' ');
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)');
const tcase=(s)=>String(s||'').toLowerCase().replace(/(^|[\s-])([a-z])/g,(m,a,b)=>a+b.toUpperCase());
const isStar=(p)=>!!p&&(p.type==='Star Play'||p.exclusive);
const crownOf=(p)=>isStar(p)?`<i class="gpk-crown">${CROWN}</i>`:'';
const artOf=(p)=>(p&&p.images&&(p.images.playCall||p.images.formation))||'';
const shapeOf=(p)=>FORMS&&p&&FORMS[slug(p.libFamily||'')+'__'+slug(p.libSet||'')];

/* ONE function gives the art for a play. Everything in the room asks here and
   nowhere else, so the day the capture rig produces real art the swap is a
   file, not a rewrite. Order: a captured image for this slug if the art index
   has one; else the library's own drawn card for the play (the same card the
   database shows in the Utah book); else the formation alone. No custom
   screenshots, no per-team art. */
let ART_INDEX=null;
fetch('art-index.json').then(r=>r.ok?r.json():{}).then(j=>{ ART_INDEX=j||{}; }).catch(()=>{ ART_INDEX={}; });
function artHTML(sc,p,cls){
  if(!p) return `<span class="${cls} art-none"></span>`;
  const url=ART_INDEX&&p.slug&&ART_INDEX[p.slug];
  if(url) return `<img class="${cls}" src="${esc(url)}" alt="" loading="lazy" decoding="async" draggable="false">`;
  const g=sc&&sc._geo&&p.slug&&sc._geo[p.slug];
  if(g) return `<span class="${cls} art-svg">${drawCard(g)}</span>`;
  const shape=shapeOf(p);
  return `<span class="${cls} art-svg art-form">${shape&&shape.length?drawFormation(shape):''}</span>`;
}
/* the library's card geometry for every play in the scheme, fetched once */
async function loadGeo(sc){
  if(sc._geo) return sc._geo;
  const list=sc.plays.filter(p=>p.libFamily&&p.libSet).map(p=>({family:p.libFamily,set:p.libSet}));
  sc._geo=await mergedGeo(list); return sc._geo;
}
const playOf=(sc,id)=>sc.plays.find(p=>p.id===id);
const tapeCls=(p)=>{ const t=(p.type||'').toLowerCase();
  return t.indexOf('run')>=0?'run':t.indexOf('star')>=0?'star':'pass'; };
const PILLARS=[
  ['Base','The Base','what the offence lives in',
   'The identity. These are the plays the whole offence is built on, the ones you come back to when nothing else is working.'],
  ['Expansion','The Expansion','how it builds once they adjust',
   'The defence starts cheating, so this is where the base grows: the motions, the constraints and the pass game off the same looks.'],
  ['Payoff','The Payoff','what it cashes in',
   'The shots and the money calls. They only work because the first two pillars are already in, which is why they come last.'],
];
const pillarIdx=(k)=>PILLARS.findIndex(x=>x[0]===k);
const teamLogo=(name)=>{ const b=IDX&&IDX.books.find(x=>slug(x.team)===slug(name)); return b&&b.logo?`logos/${b.logo}.png`:''; };
let OPENPLAY=null, CK_EDIT=null, PERS_I=0, CH=-1;   /* CH: which install chapter is on screen, -1 = the current pillar */

/* the SVG filters, once: paper grain and a torn edge for anything that wants one */
document.body.insertAdjacentHTML('beforeend',`<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
  <filter id="skTorn" x="-4%" y="-4%" width="108%" height="108%">
    <feTurbulence type="fractalNoise" baseFrequency=".032" numOctaves="4" seed="7" result="n"/>
    <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/></filter>
</defs></svg><div class="sk-toast" id="sktoast"></div>`);
let toastT=null;
function toast(msg){ const t=$('#sktoast'); t.textContent=msg; t.classList.add('on'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('on'),2200); }

/* =====================================================================
   THE PLAN STORE · one object per scheme, the coaching app's game_plans shape
   ===================================================================== */
const PLANS=new Map();
const PLAN_KEY=(k)=>'sk_plan_'+k;
function seedKeys(sc){
  return ((sc.about&&sc.about.principles)||[]).slice(0,3).map(p=>({t:tcase(p.title),s:p.blurb||'',edited:false}));
}
function blankPlan(sc){
  return { creed:{ keys:seedKeys(sc), feed_player:'',feed_play:'',feed_touches:'',when_stuck:'',go_to_run:'',go_to_pass:'',
                   stop_calling:'',stop_after:'',rule:'',opener0:'',opener1:'',opener2:'' },
           installed:[], notes:{}, drives:[], cases:[], board:{cases:{},pins:[]}, seeded:false, updated:null };
}
function planOf(sc){
  if(PLANS.has(sc.key)) return PLANS.get(sc.key);
  let saved=null; try{ saved=JSON.parse(localStorage.getItem(PLAN_KEY(sc.key))||'null'); }catch(e){}
  const b=blankPlan(sc), p=Object.assign(b, saved||{});
  p.creed=Object.assign(blankPlan(sc).creed, (saved&&saved.creed)||{});
  if(!Array.isArray(p.creed.keys)||!p.creed.keys.length) p.creed.keys=seedKeys(sc);
  p.board=p.board||{}; p.board.cases=p.board.cases||{}; p.board.pins=Array.isArray(p.board.pins)?p.board.pins:[];
  p.drives=Array.isArray(p.drives)?p.drives:[]; p.cases=Array.isArray(p.cases)?p.cases:[];
  p.notes=p.notes||{}; p.installed=Array.isArray(p.installed)?p.installed:[];
  if(!p.seeded){ seedDrives(sc,p); p.seeded=true; }
  p.inked=Array.isArray(p.inked)?p.inked:[];
  PLANS.set(sc.key,p); syncPillars(sc); return p;
}
function savePlan(sc){
  const p=PLANS.get(sc.key); if(!p) return;
  p.updated=new Date().toISOString();
  try{ localStorage.setItem(PLAN_KEY(sc.key),JSON.stringify(p)); }catch(e){}
}
const sheetSecs=(sc)=>(sc.sheet&&sc.sheet.sections)||[];
const sheetCalls=(sc)=>sheetSecs(sc).reduce((n,s)=>n+(s.calls||[]).length,0);
const installedSet=(sc)=>new Set(planOf(sc).installed);
const isInstalled=(sc,p)=>installedSet(sc).has(p.pillar);
const curPillar=(sc)=>{ const s=installedSet(sc); const pls=(sc.install&&sc.install.pillars)||[];
  return pls.length?pls.findIndex(x=>!s.has(x.key)):PILLARS.findIndex(([k])=>!s.has(k)); };
const noteOf=(sc,id)=>String(planOf(sc).notes[id]||'').trim();
const creedEdited=(sc)=>{ const c=planOf(sc).creed;
  return c.keys.some(k=>k.edited)||['feed_player','when_stuck','rule','go_to_run','go_to_pass','opener0'].some(f=>String(c[f]||'').trim()); };

/* the script rack's pockets: the moments a coordinator scripts. sec ties a
   pocket to a call-sheet section so the paperclip can hang on that block. */
const DRIVE_SLOTS=[
  { id:'opening',   label:'Opening Drive', sec:null,        c:'#2e7d43' },
  { id:'redZone',   label:'Red Zone',      sec:'redZone',   c:'#c2554e' },
  { id:'thirdLong', label:'3rd & Long',    sec:'thirdLong', c:'#7a5cc2' },
  { id:'twoMinute', label:'Two-Minute',    sec:null,        c:'#1E54B7' },
  { id:'backedUp',  label:'Backed Up',     sec:null,        c:'#8a6b4a' },
  { id:'shot',      label:'Shot Drive',    sec:'bombs',     c:'#b98a1c' },
];
const slotOf=(id)=>DRIVE_SLOTS.find(s=>s.id===id);
/* no pocket is ever empty on first open: two scripts off the coach's own sheet */
function seedDrives(sc,plan){
  const calls=(id)=>((sheetSecs(sc).find(s=>s.id===id)||{}).calls||[]);
  const pairs=(sc.sheet&&sc.sheet.pairs)||[];
  const node=(c)=>({ play:c.id, sit:c.formation||'', left:[], right:[] });
  const run=calls('run'), pass=calls('pass'), bz=calls('beatZone'), bombs=calls('bombs'), rz=calls('redZone');
  const seq=[run[0],pass[0],run[1]||bz[0],pass[1]||bombs[0]].filter(Boolean);
  if(seq.length){
    const main=seq.map(node);
    const pr=pairs.find(p=>p.base&&seq.some(c=>c.id===p.base.id));
    if(pr){ const n=main.find(x=>x.play===pr.base.id); if(n&&pr.off) n.left.push(node(pr.off)); }
    else if(pairs[0]&&pairs[0].base&&pairs[0].off){ const n=node(pairs[0].base); n.left.push(node(pairs[0].off)); main.push(n); }
    if(bombs[0]&&main.length>1&&!main.some(x=>x.play===bombs[0].id)) main[main.length-1].right.push(node(bombs[0]));
    plan.drives.push({ id:'dr-seed-open', title:'Opening Script', slot:'opening', main, seeded:true, updated:null });
  }
  if(rz.length){
    plan.drives.push({ id:'dr-seed-rz', title:'Red Zone Script', slot:'redZone', main:rz.slice(0,3).map(node), seeded:true, updated:null });
  }
}

/* =====================================================================
   THE CHROME · both rails belong to the open scheme
   ===================================================================== */
const SKVIEWS=[['home','Home','the room'],['plan','The Plan','the creed'],['install','The Install','base, expansion, payoff'],
  ['sheet','Call Sheet','what you take in'],['drives','Drives','the script rack'],
  ['board','The Board','cases and answers'],['personnel','Personnel','who runs it']];
const pkShort=(n)=>{ const t=String(n||'').replace(/\s+(Offense|Defense|Spread-to-Run)$/i,'').trim();
  return t.length<=16?t:t.split(' ').slice(0,2).join(' '); };
const pkCrest=(s)=>s.logo
  ? `<img src="logos/${esc(s.logo)}.png" alt="" loading="lazy" decoding="async">`
  : `<b>${esc((s.name||'?')[0])}</b>`;
const schemeOpen=()=>SCHEME&&SCHEMES&&SCHEMES.find(x=>x.key===SCHEME);

/* the room owns the page: the library's rails and flag hide under body.sk-room
   and the room bar carries the navigation instead */
function schemeRail(on){
  const sc=on&&schemeOpen();
  document.body.classList.toggle('sk-room',!!sc);
  if(!sc) document.body.classList.remove('sk-install');
  if(sc){ document.body.style.setProperty('--tc',sc.c1||'#1E54B7'); document.body.style.setProperty('--tc2',sc.c2||'#F2B50E'); }
  else { document.body.style.removeProperty('--tc'); document.body.style.removeProperty('--tc2'); }
}
/* the live miniatures on the doors */
function miniOf(sc,k){
  const plan=planOf(sc);
  if(k==='plan'){ const keys=plan.creed.keys.slice(0,3);
    return `<span class="skm-creed">${keys.map(x=>`<i class="${x.edited?'':'pr'}">${esc(x.t)}</i>`).join('')}</span>
      <span class="skm-b">${creedEdited(sc)?'creed set':'tap to write yours'}</span>`; }
  if(k==='install'){ const s=installedSet(sc), cur=curPillar(sc), pls=pillarsOf(sc);
    return `<span class="skm-path">${pls.map((x,i)=>`<i class="${s.has(x.key)?'done':i===cur?'cur':''}">${s.has(x.key)?'&#10003;':i+1}</i>${i<pls.length-1?'<u></u>':''}`).join('')}</span>
      <span class="skm-b">${s.size===pls.length?'game ready':s.size+' of '+pls.length+' installed'}</span>`; }
  if(k==='sheet'){ const secs=sheetSecs(sc).filter(s=>s.kind==='plays');
    const INK={run:'#21683c',pass:'#2b4f76',beatMan:'#9e3b32',beatZone:'#1f6e66',bombs:'#b8860b',thirdLong:'#6b4d8e',redZone:'#b8322c'};
    const ink=inkedSet(sc);
    return `<span class="skm-sheet">${secs.map(s=>{ const n=(s.calls||[]).filter(c=>{ const p=playOf(sc,c.id); return p&&(!p.taught||ink.has(p.id)); }).length;
      return `<i style="--sc:${INK[s.id]||'#4a5568'}" class="${n?'':'dim'}">${(s.calls||[]).length}</i>`; }).join('')}</span>
      <span class="skm-b">${sheetCalls(sc)} calls</span>`; }
  if(k==='drives'){ const d=plan.drives;
    if(!d.length) return `<span class="skm-empty">no scripts<b>script one</b></span>`;
    return `<span class="skm-stack">${d.slice(0,3).map(x=>{ const sl=slotOf(x.slot);
      return `<i style="--sc:${sl?sl.c:'#8a6b4a'}">${esc((x.title||'Drive').slice(0,22))}</i>`; }).join('')}</span>
      <span class="skm-b">${d.length} script${d.length!==1?'s':''}${d.length>3?' · +'+(d.length-3)+' more':''}</span>`; }
  if(k==='board'){ const pins=plan.board.pins;
    if(!pins.length) return `<span class="skm-empty">nothing pinned<b>open a case</b></span>`;
    const first=playOf(sc,pins[0].pk);
    return `<span class="skm-pile">${first?artHTML(sc,first,''):''}</span>
      <span class="skm-b">${pins.length} pinned · ${allCases(sc).length} cases</span>`; }
  if(k==='personnel'){ const pl=(sc.personnel&&sc.personnel.players)||[];
    return `<span class="skm-faces">${pl.slice(0,4).map(p=>p.cut?`<img src="${esc(p.cut)}" alt="" loading="lazy">`:'').join('')}</span>
      <span class="skm-b">${pl.length} roles</span>`; }
  return '';
}
function closeAll(){ dbxClose(true); drawerClose(); popClose(); modalClose(); }

/* =====================================================================
   BACK · ONE STACK FOR THE WHOLE APP, 2026-09-04.

   There was none. Every "back" in the page was a hard-coded destination:
   the room bar said "Library" and meant it, the install's Esc meant the
   install home, and the browser's own back button left the site because
   nothing had ever been pushed onto its history. So clicking three levels
   in and backing out dumped you on the front page, which is what he hit.

   The fix is the ordinary one and it is worth stating: the app keeps a
   stack of snapshots, and EVERY back goes through the browser. A forward
   move calls navPush(), which snapshots where you are and pushes a
   matching entry onto history; the bar's back button just calls
   history.back(); popstate pops our stack and puts that state back on the
   screen. One path, so the button, the mouse's back thumb button and the
   keyboard all agree, and the label on the button can name the place it
   actually returns to instead of guessing.
   ===================================================================== */
let NAV=[], NAV_ON=false;
function navSnap(){
  const sc=schemeOpen(), pos=sc&&PLANS.has(sc.key)&&PLANS.get(sc.key).pos;
  return { view:VIEW, book:BOOK, fam:FAM, set:SET, fampick:FAMPICK, type:TYPE,
    scheme:SCHEME, sec:SEC, ch:CH, play:OPENPLAY,
    ins:pos?{ch:pos.ch,st:pos.st,rd:pos.rd}:null,
    pick:(typeof WR_PLAYS!=='undefined'&&WR_PLAYS)?WR_PLAYS.pick:null,
    y:Math.round(scrollY||0) };
}
function navPush(){ if(NAV_ON) return;
  NAV.push(navSnap()); if(NAV.length>90) NAV.shift();
  try{ history.pushState({sk:NAV.length},''); }catch(e){} }
/* true if it took the wheel; false means there is nowhere back to go and the
   caller should do whatever it did before */
function navBack(){ if(!NAV.length) return false; try{ history.back(); }catch(e){ return false; } return true; }
function navApply(s){
  closeAll();
  /* stepping back INSIDE the install must not re-render the whole section:
     the install owns its own stage and hands us a mover while it is open */
  const inIns=(s.scheme&&s.scheme===SCHEME&&s.sec==='install'&&SEC==='install'&&s.ins&&typeof INS_NAV==='function');
  VIEW=s.view; BOOK=s.book; FAM=s.fam; SET=s.set; FAMPICK=s.fampick; TYPE=s.type;
  SCHEME=s.scheme; SEC=s.sec; CH=s.ch; OPENPLAY=s.play;
  if(typeof WR_PLAYS!=='undefined'&&WR_PLAYS&&s.pick) WR_PLAYS.pick=s.pick;
  if(inIns){ INS_NAV(s.ins.ch,s.ins.st,s.ins.rd,'back'); return; }
  /* coming back into the install from somewhere else: the stage always opens
     on its own home, so tell it where to land (the same door WR_JUMP uses) */
  if(s.ins&&s.sec==='install') INS_AT={ch:s.ins.ch,st:s.ins.st,rd:s.ins.rd};
  buildRail(); render(); scrollTo(0,s.y||0);
}
addEventListener('popstate',()=>{ const s=NAV.pop(); if(!s) return;
  NAV_ON=true; try{ navApply(s); } finally { NAV_ON=false; } });
/* what the back button should say: the place the stack actually returns to */
function navLabel(){ const s=NAV[NAV.length-1];
  if(!s||!s.scheme) return 'Library';
  const sc=schemeOpen(), views=(typeof WR!=='undefined'&&WR.is(sc))?WR_VIEWS:SKVIEWS;
  if(s.scheme!==SCHEME||s.sec!==SEC){ const v=views.find(x=>x[0]===s.sec); return v?v[1]:'The room'; }
  if(s.sec==='install'&&s.ins) return s.ins.ch<0?'The install':'Back';
  return 'Back'; }

/* =====================================================================
   ROUTER · index.html's render() lands here for the schemes section
   ===================================================================== */
function renderInstall(){
  const tabs=$('#tabs'), main=$('#main');
  tabs.style.display='none'; tabs.innerHTML='';
  if(!SCHEMES||!SCHEMES.length){
    document.body.classList.remove('sk-room'); document.body.classList.remove('sk-warroom');
    setTitle('SCHEMES','your installs');
    main.innerHTML='<div class="sk-empty">No installs imported yet.</div>'; $('#foot').textContent=''; return;
  }
  const sc=schemeOpen();
  document.body.classList.toggle('sk-room',!!sc);
  if(!sc){ SCHEME=null; document.body.classList.remove('sk-warroom'); renderPicker(); return; }
  /* the library's cards for this scheme: render now, redraw when they land */
  if(!sc._geo&&!sc._geoLoading){ sc._geoLoading=true;
    loadGeo(sc).then(()=>{ sc._geoLoading=false; if(schemeOpen()===sc) render(); }).catch(()=>{ sc._geoLoading=false; }); }
  renderRoom(sc);
}

const srcBook=(sc)=>{ const bk=sc.about&&sc.about.playbook, n=bk?String(bk.cap||'').replace(/\s*playbook\s*/i,'').trim():'';
  return IDX.books.find(b=>b.sideCode===(sc.side==='D'?'D':'O')&&slug(b.team)===slug(n)); };
const roomState=(sc)=>{ const n=installedSet(sc).size;
  return n===3?['ready','Game Ready']:n?['prog',`In Progress · ${n} of 3`]:['open','Open It']; };
function roomBar(sc){
  const st=roomState(sc);
  return `<div class="rb">
    <button class="rb-back" data-back="1">&larr; ${esc(navLabel())}</button>
    <div class="rb-id"><span class="skh-crest">${pkCrest(sc)}</span>
      <div><b>${esc(sc.name)}</b><i>${esc(sc.series||'Scheme Kings Install')}${sc.about&&sc.about.era?' · '+esc(sc.about.era):''}</i></div></div>
    <span class="rb-state ${st[0]}">${st[1]}</span></div>`;
}
/* the sections run down the left, each carrying its own count */
function roomNav(sc){
  const plan=planOf(sc), inst=installedSet(sc);
  const tail={ home:'', plan:creedEdited(sc)?'yours':'seeded', install:`${inst.size} of 3`,
    sheet:`${sheetCalls(sc)}`, drives:`${plan.drives.length}`, board:`${plan.board.pins.length}`,
    personnel:`${((sc.personnel&&sc.personnel.players)||[]).length}` };
  return `<nav class="roomnav">${SKVIEWS.map(([k,a,b])=>
    `<button class="rn${SEC===k?' on':''}" data-view="${k}">${tail[k]?`<i>${esc(tail[k])}</i>`:''}<b>${esc(a)}</b><span>${esc(b)}</span></button>`).join('')}</nav>`;
}
const viewHead=(a,b,cta)=>`<div class="vh"><b>${a}</b><span>${b}</span>${cta||''}</div>`;
/* the counts on the left rail change as you ink and script; redraw it in place */
function refreshNav(sc){ const n=$('.roomnav'); if(n) n.outerHTML=roomNav(sc); if(typeof WR!=='undefined'&&WR.is(sc)) wrRefreshBar(sc); }
function renderRoom(sc){
  const main=$('#main');
  /* A SCHEME CAN WEAR A SKIN. The War Room (warroom.js) brings its own bar,
     its own section list and four screens of its own; everything else in
     the room keeps its renderer and is only re-housed by warroom.css. */
  const skinned=typeof WR!=='undefined'&&WR.is(sc);
  document.body.classList.toggle('sk-warroom',skinned);
  const views=skinned?WR_VIEWS:SKVIEWS;
  const v=views.find(x=>x[0]===SEC)||views[0]; SEC=v[0];
  setTitle(v[1].toUpperCase(), v[2]);
  /* the install takes the whole page; every other view gets the room chrome back */
  document.body.classList.toggle('sk-install',SEC==='install');
  const c1=sc.c1||'#1E54B7', c2=sc.c2||'#F2B50E';
  main.innerHTML=(skinned?wrBar(sc):roomBar(sc))+`<div class="roomwrap">${skinned?'':roomNav(sc)}
    <div class="room"><div id="skbody" style="--tc:${c1};--tc2:${c2};position:relative"></div></div></div>`;
  const body=$('#skbody');
  const R={home:renderHome, plan:renderPlan, install:renderInstallStage, sheet:renderSheet, drives:renderDrives, board:renderBoard, personnel:renderPersonnel};
  if(skinned) Object.assign(R,{home:wrHome, plan:wrPlan, plays:wrPlays, sheet:wrSheet});
  (R[SEC]||R.home)(sc,body);
  main.onclick=e=>{
    /* the back plate walks the stack; only when there is nothing behind it
       does it mean what it used to mean, the library */
    if(e.target.closest('[data-back]')){ if(navBack()) return;
      closeAll(); SCHEME=null; OPENPLAY=null; VIEW='schemes'; buildRail(); render(); scrollTo(0,0); return; }
    const bk=e.target.closest('[data-book]');
    if(bk){ navPush(); closeAll(); VIEW='book'; BOOK=bk.dataset.book; FAM=null; SET=null; FAMPICK=null; buildRail(); render(); return; }
    const vw=e.target.closest('[data-view]');
    if(vw){ navPush(); if(skinned) wrIntent(vw); closeAll(); SEC=vw.dataset.view; OPENPLAY=vw.dataset.play||null; CH=vw.dataset.chap!=null?+vw.dataset.chap:-1; buildRail(); render(); scrollTo(0,0); return; }
    const pl=e.target.closest('[data-play]');
    if(pl){ playDrawer(sc,pl.dataset.play); return; }
    const fm=e.target.closest('[data-form]');
    if(fm){ formationDrawer(sc,fm.dataset.form); return; }
  };
  $('#foot').innerHTML=`<b>${esc(sc.name)}</b> · <b>${sc.plays.length}</b> plays · <b>${sc.counts.matched}</b> joined to the library`;
}

/* =====================================================================
   THE PICKER · the deck. The standing card holds the foil.
   ===================================================================== */
function pkCardStyle(o,sc){
  const ab=Math.abs(o), vis=ab<=2;
  const s=ab===0?1:ab===1?.5:.4, op=!vis?0:ab===0?1:ab===1?.5:0;
  const lay=ab===0?0:1, gray=ab===0?0:.65;
  return `--o:${o};--s:${s};--op:${op};--lay:${lay};--gray:${gray};--z:${20-ab};`
    +`--tc:${sc.c1||'#1E3A6E'};--tc2:${sc.c2||'#F5B935'};--pe:${vis?'auto':'none'}`+(sc.home&&sc.home.card?`;--face:url('${new URL(sc.home.card,location.href).href}')`:'');
}
function pkState(sc){ const n=installedSet(sc).size, t=((sc.install&&sc.install.pillars)||[]).length||3;
  return n>=t?['ready','Game Ready']:n?['prog',`In Progress · ${n} of ${t} sections`]:['open','Open It']; }
/* THE DECK IS ONE SIDE OF THE BALL. An install teaches offence or defence,
   never both, so the picker shows the schemes for whichever side the header
   toggle is on. SCHEMES itself stays whole, because schemeOpen() looks a
   scheme up by key and must still find one from the other side. */
/* AN INSTALL CALLS ITSELF WHAT IT IS. The install copy was written for the
   offence and said "offense" out loud in seven places, which reads wrong on a
   Saban defence. One word, taken from the scheme. */
function SIDEWORD(sc){ return (sc && sc.side === 'D') ? 'defence' : 'offense'; }
const deckOf=()=>(SCHEMES||[]).filter(s=>(s.side||'O')===(typeof SIDE==='undefined'?'O':SIDE));
/* the count line reads in the install's own words, so a defence says
   "3 pressure · 2 disguise" instead of borrowing the offence's headings */
const pkN=(s)=>(s.counts&&s.counts.plays!=null)?s.counts.plays:(s.plays||[]).length;
function pkMeta(s){
  const cp=(s.counts&&s.counts.pillars)||{};
  const pls=(s.install&&s.install.pillars)||[];
  const bits=pls.length
    ? pls.map(p=>`${cp[p.key]||0} ${String(p.name||p.key).replace(/^The\s+/i,'').toLowerCase()}`)
    : Object.entries(cp).map(([k,v])=>`${v} ${k.toLowerCase()}`);
  return `${pkN(s)} plays · ${bits.join(' · ')}`;
}
/* the name huge and faint behind the deck: the team on one line, the rest on the next */
const pkBig=(c)=>{ const w=String(c.name||'').replace(/\s+(Offense|Defense|Defence)$/i,'').split(' '); const a=w.shift(); return `<span>${esc(a)}</span><span>${esc(w.join(' '))}</span>`; };
/* THE SHELF: the card is the scheme's polaroid when it has one */
const pkFace=(s)=>s.home&&s.home.card?`<img class="pk-pol" src="${esc(s.home.card)}" alt="" draggable="false" decoding="async">`:pkCrest(s);
/* a front tile cropped to the players, as the scheme page draws it */
function pkFit(svg){ const pts=[...svg.matchAll(/<circle cx="([-\d.]+)" cy="([-\d.]+)"/g)].map(m=>[+m[1],+m[2]]); if(pts.length<3) return svg;
  const xs=pts.map(p=>p[0]), ys=pts.map(p=>p[1]); let x0=Math.min(...xs)-44, x1=Math.max(...xs)+44, y0=Math.min(...ys)-34, y1=Math.max(...ys)+46;
  let bw=x1-x0, bh=y1-y0; const R=620/340; if(bw/bh>R){ const nh=bw/R; y0-=(nh-bh)/2; bh=nh; } else { const nw=bh*R; x0-=(nw-bw)/2; bw=nw; }
  return svg.replace(/viewBox="[^"]*"/, `viewBox="${x0.toFixed(1)} ${y0.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}"`); }
function pkTile(f){ const key=f.lib?slug(f.lib[0])+'__'+slug(f.lib[1]):'425__'+slug(String(f.name).replace(/^4-?2-?5\s*/i,'')); const sh=FORMS&&FORMS[key];
  return sh&&typeof drawFormation==='function'?pkFit(drawFormation(sh)):''; }
const pkInked=(sc)=>{ const p=planOf(sc); return Array.isArray(p.inked)?p.inked.length:0; };
/* the standing card's dossier: era, the line, the fronts, the counts, Open */
function pkDossier(sc){
  const h=sc.home||{}, st=pkState(sc), pls=(sc.install&&sc.install.pillars)||[], cov=sc.mode==='coverages';
  const films=(sc.counts&&sc.counts.films!=null)?sc.counts.films:(sc.plays||[]).filter(p=>p.videoUrl).length, fr=(sc.formations||[]).slice(0,3);
  const tiles=fr.length?`<div class="pd-lab">The ${sc.side==='D'?(fr.length===1?'front':'fronts'):(fr.length===1?'formation':'formations')}</div><div class="pd-tiles">${fr.map(f=>`<div class="tl">${pkTile(f)}</div>`).join('')}</div><div class="pd-tlab">${fr.map(f=>`<span>${esc(f.name)}</span>`).join('')}</div>`:'';
  const rows=cov?[['Coverages',pkN(sc)],['Films',films],['Fronts','any, the rules travel']]
    :[['Plays',pkN(sc)],['Sections',pls.length?(()=>{ const full=pls.map(p=>String(p.name).replace(/^The\s+/i,'')); const names=full.join(' · ').length>36?pls.map(p=>p.key):full; return names.map(esc).join(' · '); })():'3'],['Films',films],['Inked',`${pkInked(sc)} of ${pkN(sc)}`]];
  return `<span class="pd-tape"></span><div class="pd-k">${cov?'The rules under both':'The standing card'}</div><div class="pd-name" id="pkname">${esc(pkShort(sc.name))}</div>
    ${h.era?`<div><span class="pd-stamp">${esc(h.era)}${h.sub?' · '+esc(h.sub):''}</span></div>`:''}
    ${h.pitch?`<div class="pd-t">${esc(h.pitch)}</div>`:''}${tiles}
    <div class="pd-rows">${rows.map(([u,b])=>`<div class="pd-row"><u>${u}</u><b>${b}</b></div>`).join('')}</div>
    <div class="pd-go"><button class="skb gold pk-go" data-open="1">${cov?'Open the coverages':'Open the install'} &rarr;</button><span class="pk-state ${st[0]}" id="pkstate"><i></i>${st[1]}</span></div>`;
}
/* the book in game, along the bottom */
function pkBook(sc){ const b=sc.home&&sc.home.book; if(!b) return '';
  return `${b.thumb?`<img src="${esc(b.thumb)}" alt="" loading="lazy" decoding="async">`:''}<div><div class="h">In game, this runs out of the <i>${esc(b.team)}</i> ${sc.side==='D'?'defensive':'offensive'} playbook</div><div class="k7">${esc(b.note||'')}</div></div>${(b.copies||[]).length?`<div class="cuts"><u>Same book in Ultimate Team</u>${b.copies.map(t=>`<span>${esc(t)}</span>`).join('')}</div>`:''}`; }
/* THE SERIES POP-UP (his note 2026-09-14): the first time the picker opens it
   says what these installs are together, over the picker, and has to be
   closed. It comes back from the chip beside the installs eyebrow. */
/* once per SESSION, not once ever (his call 2026-09-14): every new visit opens it again, and the gold button under the installs brings it back any time */
const SERIES_SEEN=()=>{ try{ return !!(typeof SERIES!=='undefined'&&SERIES&&sessionStorage.getItem('sk_series_seen_'+SERIES.key)); }catch(e){ return true; } };
function seriesPop(){
  if(typeof SERIES==='undefined'||!SERIES) return; seriesClose();
  const S=SERIES;
  const el=document.createElement('div'); el.className='yg-pop'; el.id='ygpop';
  el.innerHTML=`<div class="yg-scrim" data-ygclose></div><div class="yg-box">
    <a class="yg-x" data-ygclose aria-label="Close">&times;</a>
    <div class="yg-k">${esc(S.kicker||'')}</div><div class="yg-slab"><span>${esc(S.title)}</span></div>
    <div class="yg-qbs">${(S.qbs||[]).map(q=>`<div class="yg-qb"><div class="yg-cut">${q.cut?`<img src="${esc(q.cut)}" alt="">`:''}</div><b>${esc(q.name)}</b><i>${esc(q.team)}</i></div>`).join('')}</div>
    <div class="yg-copy">${(S.copy||[]).map(t=>`<p>${esc(t)}</p>`).join('')}</div>
    <div class="yg-foot">${S.book&&S.book.thumb?`<img class="yg-book" src="${esc(S.book.thumb)}" alt="">`:''}<span class="yg-bk">In game, all three run out of the <b>${esc((S.book||{}).team||'')}</b> playbook</span><button class="skb gold yg-go" data-ygclose>Got it, show me the schemes &rarr;</button></div>
  </div>`;
  document.body.appendChild(el); document.body.classList.add('yg-on');
  el.addEventListener('click',(e)=>{ if(e.target.closest('[data-ygclose]')) seriesClose(); });
  try{ sessionStorage.setItem('sk_series_seen_'+S.key,'1'); }catch(e){}
}
function seriesClose(){ const el=document.getElementById('ygpop'); if(el) el.remove(); document.body.classList.remove('yg-on'); }
document.addEventListener('keydown',(e)=>{ if(e.key==='Escape'&&document.getElementById('ygpop')) seriesClose(); });
function renderPicker(){
  const main=$('#main'); document.body.classList.add('sk-pick');
  const DECK=deckOf();
  const word=(typeof SIDE!=='undefined'&&SIDE==='D')?'defensive installs':'offensive installs';
  setTitle('YOUR SCHEMES', DECK.length+' '+word+' · pick one');
  if(!DECK.length){
    main.innerHTML=`<div class="sk-empty">No ${esc(word)} yet. Flip the side of the ball up top to see the others.</div>`;
    $('#foot').textContent=''; return;
  }
  if(INSTALL>=DECK.length||INSTALL<0) INSTALL=0;
  const N=DECK.length;
  const off=(i)=>{ let o=i-INSTALL; if(o>N/2) o-=N; if(o<-N/2) o+=N; return o; };
  const cur=DECK[INSTALL], st=pkState(cur);
  document.body.style.setProperty('--tc',cur.c1||'#1E54B7');
  main.innerHTML=`<div class="pk" id="pk" style="--tc:${cur.c1||'#1E3A6E'};--tc2:${cur.c2||'#F5B935'}">
    <div class="pk-rail">${DECK.map((s,i)=>
      `<button class="pk-chip${i===INSTALL?' on':''}" data-pk="${i}" style="--tc:${s.c1||'#1E3A6E'};--tc2:${s.c2||'#F5B935'}" title="${esc(s.name)}">
        ${pkCrest(s)}<span>${esc(pkShort(s.name))}</span></button>`).join('')}</div>
    <div class="pk-stage">
      <div class="pk-eyebrow eyebrow">Your Installs</div>${typeof SERIES!=='undefined'&&SERIES?`<button class="yg-chip" data-ygopen="1">&#9733; Learn about ${esc(SERIES.title)}</button>`:''}
      <div class="pk-deck" id="pkdeck">
        ${N>1?`<button class="pk-arrow prev" data-step="-1" aria-label="Previous scheme">&lsaquo;</button>`:''}
        ${DECK.map((s,i)=>{ const o=off(i);
          return `<button class="pk-card${o===0?' mid':''}" data-pk="${i}" style="${pkCardStyle(o,s)}" title="${esc(s.name)}">
            ${pkFace(s)}<span class="pk-foil"></span><span class="pk-glare"></span></button>`; }).join('')}
        ${N>1?`<button class="pk-arrow next" data-step="1" aria-label="Next scheme">&rsaquo;</button>`:''}
      </div>
      ${N>1?`<div class="pk-dots">${DECK.map((_,i)=>`<button class="pk-dot${i===INSTALL?' on':''}" data-pk="${i}" aria-label="Scheme ${i+1}"></button>`).join('')}</div>`:''}
    </div><aside class="pk-dossier" id="pkdoss">${pkDossier(cur)}</aside><div class="pk-book" id="pkbook">${pkBook(cur)}</div></div>`;
  /* the deck moves in place, so the flip animates instead of re-rendering */
  const apply=()=>{
    const c=DECK[INSTALL], s2=pkState(c);
    const pk=$('#pk'); pk.style.setProperty('--tc',c.c1||'#1E3A6E'); pk.style.setProperty('--tc2',c.c2||'#F5B935');
    main.querySelectorAll('.pk-card').forEach(el=>{ const i=+el.dataset.pk, o=off(i);
      el.style.cssText=pkCardStyle(o,DECK[i]); el.classList.toggle('mid',o===0); });
    main.querySelectorAll('.pk-chip,.pk-dot').forEach(el=>el.classList.toggle('on',+el.dataset.pk===INSTALL));
    document.body.style.setProperty('--tc',c.c1||'#1E54B7');
    const ds=$('#pkdoss'); if(ds) ds.innerHTML=pkDossier(c); const bk=$('#pkbook'); if(bk) bk.innerHTML=pkBook(c);
  };
  const go=(n)=>{ INSTALL=(n+N)%N; apply(); };
  /* a scheme with the new page (skin warroom) opens scheme.html; the rest
     still open the old room here */
  const open=async(i)=>{ const s=DECK[i]; if(s.skin==='warroom'){ location.href=`scheme.html?key=${encodeURIComponent(s.key)}`; return; }
    if(typeof ensureScheme==='function') await ensureScheme(s.key); if(!IDX&&typeof ensureIndex==='function') await ensureIndex();
    navPush(); SCHEME=s.key; SEC='home'; CH=-1; OPENPLAY=null; buildRail(); render(); scrollTo(0,0); };
  main.onclick=e=>{ if(e.target.closest('[data-ygopen]')){ seriesPop(); return; }
    const st2=e.target.closest('[data-step]'); if(st2){ go(INSTALL + +st2.dataset.step); return; }
    if(e.target.closest('[data-open]')){ open(INSTALL); return; }
    const pk=e.target.closest('[data-pk]');
    if(pk){ const i=+pk.dataset.pk;
      if(i===INSTALL&&pk.classList.contains('pk-card')){ open(i); return; }
      go(i); }
  };
  /* the foil: the standing card tilts toward the pointer and the holo sweep
     follows it. Nothing on the flat cards, nothing under reduced motion. */
  if(!SERIES_SEEN()) seriesPop();
  const deck=$('#pkdeck');
  if(!REDUCED.matches){
    let raf=0, ev=null;
    const tick=()=>{ raf=0; const el=deck.querySelector('.pk-card.mid'); if(!el||!ev) return;
      const r=el.getBoundingClientRect();
      const px=Math.min(1,Math.max(0,(ev.clientX-r.left)/r.width)), py=Math.min(1,Math.max(0,(ev.clientY-r.top)/r.height));
      el.style.setProperty('--mx',(px*100).toFixed(1)+'%'); el.style.setProperty('--my',(py*100).toFixed(1)+'%');
      el.style.setProperty('--ry',((px-.5)*16).toFixed(2)+'deg'); el.style.setProperty('--rx',((.5-py)*12).toFixed(2)+'deg');
      el.style.setProperty('--fo','1'); };
    deck.addEventListener('pointermove',e=>{ ev=e; if(!raf) raf=requestAnimationFrame(tick); });
    deck.addEventListener('pointerleave',()=>{ ev=null; deck.querySelectorAll('.pk-card').forEach(el=>{
      el.style.removeProperty('--rx'); el.style.removeProperty('--ry'); el.style.setProperty('--fo','0'); }); });
  }
  $('#foot').innerHTML=`<b>${N}</b> installs · &lsaquo; &rsaquo; flips the deck · the standing card opens`;
}
addEventListener('keydown',e=>{
  if(VIEW!=='schemes'||SCHEME||(e.target&&e.target.matches&&e.target.matches('input,textarea'))) return;
  if(e.key==='ArrowLeft'||e.key==='ArrowRight'){ const b=$(`[data-step="${e.key==='ArrowLeft'?-1:1}"]`); if(b){ e.preventDefault(); b.click(); } }
  if(e.key==='Enter'){ const b=$('[data-open]'); if(b) b.click(); }
});

/* =====================================================================
   HOME · a full-bleed hero, then the sections as a list you open one at a time
   ===================================================================== */
/* split a string into per-letter spans that arrive out of focus */
function blurText(s,start,step){
  return String(s).split('').map((ch,i)=>
    `<span class="bl" style="--d:${start+i*step}ms">${ch===' '?'&nbsp;':esc(ch)}</span>`).join('');
}
/* the hero name: the scheme without its side suffix, one word a line */
const heroLines=(sc)=>String(sc.name||'').replace(/\s+(Offense|Defense)$/i,'').trim().split(/\s+/).slice(0,3);

/* drawn, not shipped: one line icon per section */
const SEC_ICON={
  plan:'<path d="M6 3h9l5 5v13H6z"/><path d="M15 3v5h5"/><path d="M9.5 12.5h6M9.5 16.5h4"/>',
  install:'<path d="M3.5 20h17"/><rect x="4.5" y="12" width="4" height="8"/><rect x="10" y="8" width="4" height="12"/><rect x="15.5" y="4" width="4" height="16"/>',
  sheet:'<rect x="3.5" y="4" width="17" height="16" rx="1.5"/><path d="M3.5 9.5h17M3.5 15h17M12 4v16"/>',
  drives:'<circle cx="12" cy="4.6" r="2.1"/><path d="M12 6.7v13"/><circle cx="5" cy="11" r="2"/><path d="M12 11.5 6.8 11"/><circle cx="19" cy="14.5" r="2"/><path d="m12 15 5.1-.4"/>',
  board:'<rect x="3" y="4" width="18" height="15" rx="1.5"/><circle cx="8.5" cy="9.5" r="1.5"/><circle cx="16" cy="13.5" r="1.5"/><path d="m9.8 10.3 5 2.5"/>',
  personnel:'<circle cx="9" cy="8" r="3.1"/><path d="M3.2 19.5c0-3.2 2.6-5.8 5.8-5.8s5.8 2.6 5.8 5.8"/><circle cx="17.6" cy="9.4" r="2.4"/><path d="M16 13.8c2.6.4 4.6 2.7 4.6 5.7"/>',
};
/* not `icon`: index.html already owns that name for the drawn play cards */
const secIcon=(k)=>`<span class="feat-i"><svg viewBox="0 0 24 24" aria-hidden="true">${SEC_ICON[k]||''}</svg></span>`;

/* each section's preview and its one-line pitch, used by the list below */
function featureOf(sc,key){
  const plan=planOf(sc), inst=installedSet(sc), cur=curPillar(sc);
  const INK={run:'#21683c',pass:'#2b4f76',beatMan:'#9e3b32',beatZone:'#1f6e66',bombs:'#b8860b',thirdLong:'#6b4d8e',redZone:'#b8322c'};
  if(key==='install'){ const pls=pillarsOf(sc), N=pls.length||3, nowPl=pls[Math.max(0,cur)];
    return { meta:`${inst.size} of ${N} pillars`, dark:false,
    say:inst.size===N?`Every pillar is in. The whole ${SIDEWORD(sc)} is on the sheet.`
      :`Base, then Expansion, then Payoff, in the order a defence meets them. Ink a play and it lands on the call sheet.`,
    cta:inst.size===N||cur<0?'Open the install':`Continue with ${nowPl.name}`,
    body:`<div class="tp-path">${pls.map((x,i)=>{ const s=inst.has(x.key)?'done':i===cur?'cur':'lock';
        return `<div class="tp-p ${s}"><i>${s==='done'?'&#10003;':s==='lock'?LOCK:i+1}</i><b>${esc(x.name.replace(/^The /,''))}</b><u>${x.plays.length} plays</u></div>`; }).join('')}</div>
      <div class="tp-meter"><i style="--p:${(inst.size/N).toFixed(3)}"></i></div>` }; }
  if(key==='plan') return { meta:creedEdited(sc)?'in your hand':'seeded', dark:false,
    say:`The three things this ${SIDEWORD(sc)} believes, and the calls you promise yourself you will make. Rewrite any of it in your own words.`,
    cta:creedEdited(sc)?'Open the plan':'Make it yours',
    body:`<div class="tp-creed">${plan.creed.keys.slice(0,3).map((k,i)=>`<span class="${k.edited?'mk':''}"><i>${i+1}</i>${esc(k.t)}</span>`).join('')}</div>` };
  if(key==='sheet'){ const secs=sheetSecs(sc).filter(s=>s.kind==='plays');
    return { meta:`${sheetCalls(sc)} calls`, dark:false,
      say:'The paper you take into the game. It fills in as you install, and the constraint pairs sit at the bottom.',
      cta:'Open the call sheet',
      body:`<div class="tp-sheet">${secs.map((s,i)=>{ const ink=inkedSet(sc); const n=(s.calls||[]).length, inked=(s.calls||[]).filter(x=>{ const p=playOf(sc,x.id); return p&&(!p.taught||ink.has(p.id)); }).length;
        return `<i style="--sc:${INK[s.id]||'#4a5568'}" class="${inked?'':'dim'}${i<2?' w':''}" title="${esc(s.label)}">${n}</i>`; }).join('')}</div>` }; }
  if(key==='drives') return { meta:`${plan.drives.length} of 6 scripted`, dark:false,
    say:'Six moments a coordinator scripts. Build a drive and the counters branch left, the fallbacks branch right.',
    cta:'Open the script rack',
    body:`<div class="tp-rack">${DRIVE_SLOTS.map(s=>{ const d=plan.drives.find(x=>x.slot===s.id);
      return d?`<span style="--sc:${s.c}" title="${esc(s.label)}">${esc(d.title)}</span>`:`<span class="empty">${esc(s.label)}</span>`; }).join('')}</div>` };
  if(key==='board') return { meta:plan.board.pins.length?`${plan.board.pins.length} pinned`:'nothing pinned', dark:true,
    say:'Name the problem they are giving you, then pin the answers under it. The categories are yours.',
    cta:'Open the board',
    body:`<div class="tp-cork">${allCases(sc).map(cs=>`<span style="--sc:${cs.c}">${esc(cs.label)}</span>`).join('')}<em>${plan.board.pins.length} pinned</em></div>` };
  if(key==='personnel'){ const pls=(sc.personnel&&sc.personnel.players)||[];
    return { meta:`${pls.length} roles`, dark:false,
      say:`The four jobs this ${SIDEWORD(sc)} is built around, what each one has to be able to do, and who it is modelled on.`,
      cta:'Open personnel',
      body:`<div class="tp-creed">${pls.map((p,i)=>{ const r=((sc.personnel&&sc.personnel.roles)||{})[p.roleRef]||{};
        return `<span><i>${esc(POS_SHORT[p.roleRef]||String(i+1))}</i>${esc(r.role||p.name)}</span>`; }).join('')}</div>` }; }
  return null;
}
function renderHome(sc,body){
  const plan=planOf(sc), inst=installedSet(sc), cur=curPillar(sc), c=plan.creed;
  const src=srcBook(sc), notes=Object.values(plan.notes).filter(v=>String(v||'').trim()).length;
  const lines=heroLines(sc);
  /* the crest rides the middle line, the way a portrait sits inside a wordmark */
  let d=180;
  const nameHTML=lines.map(w=>{ const h=`<span class="hero2-name">${blurText(w,d,38)}</span>`; d+=w.length*38+90; return h; }).join('');
  const list=SKVIEWS.filter(([k])=>k!=='home');
  const feats=list.map(([k,label],i)=>{ const f=featureOf(sc,k); if(!f) return '';
    return `<div class="feat" data-feat="${k}">
      <button class="feat-h"><span class="feat-n">${String(i+1).padStart(2,'0')}</span>${secIcon(k)}
        <span class="feat-tw"><span class="feat-t">${esc(label)}</span><span class="feat-d">${esc(f.say)}</span></span>
        <span class="feat-m">${esc(f.meta)}</span><span class="feat-x"></span></button>
      <div class="feat-p"><div class="feat-pin"><div class="feat-body">
        <div class="feat-prev${f.dark?' dark':''}">${f.body}</div>
        <button class="skb gold feat-go" data-view="${k}">${esc(f.cta)} &rarr;</button>
      </div></div></div></div>`; }).join('');
  body.innerHTML=`<section class="hero2" id="hero2">
      <div class="hero2-bg" id="h2bg"></div><div class="hero2-grain"></div>
      <div class="hero2-ey">${blurText(sc.series||'Scheme Kings Install',60,26)}</div>
      <div class="hero2-stack" id="h2stack">${nameHTML}
        <span class="hero2-crest" id="h2crest">${pkCrest(sc)}</span></div>
      <div class="hero2-tag bl" style="--d:${d+120}ms">${esc(sc.tagline||sc.subtitle||'')}</div>
      <div class="hero2-cta bl" style="--d:${d+280}ms">
        <button class="skb gold" data-view="install"${cur>=0?` data-chap="${cur}"`:''}>${cur<0?'Open the install':cur===0&&!inkedSet(sc).size?`Build out the ${SIDEWORD(sc)} &rarr;`:`Continue the install &rarr;`}</button>
        ${sc.youtubeUrl?`<a class="skb ghost" href="${esc(sc.youtubeUrl)}" target="_blank" rel="noopener">&#9654; Watch the install</a>`:''}
      </div>
      <button class="hero2-down" id="h2down" aria-label="See the rest of the room">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </button>
    </section>
    <div class="feats" id="feats">
      <div class="statline">
        <span><b>${sc.plays.length}</b><u>Plays</u></span><span><b>${sheetCalls(sc)}</b><u>Calls</u></span>
        <span><b>${plan.drives.length}</b><u>Scripts</u></span><span><b>${notes}</b><u>Notes</u></span>
        ${src?`<span><b>${src.plays}</b><u>In the ${esc(src.team)} book</u></span>`:''}
        <span class="creedline"><u>The creed</u><b>${c.keys.slice(0,3).map(k=>esc(k.t)).join(' &middot; ')}</b></span>
      </div>
      <div class="feats-h"><b>The rest of the room</b><span>tap one to look inside</span></div>${feats}</div>`;
  /* let the blur-in start on the next frame so the transition actually runs */
  requestAnimationFrame(()=>body.querySelectorAll('.bl').forEach(el=>el.classList.add('in')));
  fitHero();
  /* scrollIntoView would tuck the heading under the sticky bar, so take the
     bar's real height off the target */
  const barH=()=>{ const b=$('.rb'); return b?b.getBoundingClientRect().height+14:80; };
  $('#h2down').onclick=()=>scrollTo({top:$('#feats').getBoundingClientRect().top+scrollY-barH(),
    behavior:REDUCED.matches?'auto':'smooth'});
  /* one row open at a time */
  body.querySelectorAll('.feat-h').forEach(h=>h.addEventListener('click',()=>{
    const row=h.parentElement, was=row.classList.contains('on');
    body.querySelectorAll('.feat.on').forEach(x=>x.classList.remove('on'));
    if(!was){ row.classList.add('on');
      setTimeout(()=>{ const r=row.getBoundingClientRect();
        if(r.bottom>innerHeight) scrollTo({top:Math.min(r.top+scrollY-barH(),
          document.documentElement.scrollHeight-innerHeight), behavior:REDUCED.matches?'auto':'smooth'}); },360); }
  }));
  homeLoop();
}
/* Size the wordmark to the room it actually has.
   A CSS clamp cannot do this: it tops out on a wide monitor and it has no idea
   how long the name is, so "Oregon Spread-to-Run" and "West Virginia" would
   land at wildly different widths. Measure the longest line once, then solve
   for the font size that makes it fill the same share of the screen every
   time. Everything else in the lockup is sized off that one number. */
function fitHero(){
  const stack=$('#h2stack'), hero=$('#hero2'); if(!stack||!hero) return;
  const lines=[...stack.querySelectorAll('.hero2-name')]; if(!lines.length) return;
  const avail=stack.clientWidth; if(!avail) return;
  const PROBE=200;                                  // measure at a known size
  stack.style.setProperty('--nfs',PROBE+'px');
  const widest=Math.max(...lines.map(l=>l.getBoundingClientRect().width));
  if(!widest) return;
  const byWidth=PROBE*(avail*0.90)/widest;          // fill 90% of the column
  /* and however much vertical room is left once the eyebrow, the tagline and
     the buttons have taken theirs. Sum those siblings directly: the hero is a
     centred flex box, so its scrollHeight reports the box, not the content,
     and using it would fold the leftover whitespace back into the estimate
     and shrink the wordmark a little more on every re-measure. */
  const cs=getComputedStyle(hero);
  const pad=parseFloat(cs.paddingTop)+parseFloat(cs.paddingBottom);
  let others=0;
  for(const el of hero.children){
    if(el===stack) continue;
    const s=getComputedStyle(el);
    if(s.position==='absolute'||s.display==='none') continue;   // wash, grain, chevron
    others+=el.getBoundingClientRect().height+parseFloat(s.marginTop)+parseFloat(s.marginBottom);
  }
  const bar=$('.rb');
  const room=innerHeight-(bar?bar.getBoundingClientRect().height:68)-pad-others;
  const byHeight=room/lines.length/0.82;
  stack.style.setProperty('--nfs',Math.max(44,Math.min(byWidth,byHeight,600)).toFixed(1)+'px');
}
/* the condensed face changes the metrics when it lands, so measure again */
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>fitHero());

/* One frame loop owns the hero: it refits the wordmark whenever the viewport
   changes, and drifts the layers apart as you scroll.

   Everything here is polled rather than event-driven, and that is deliberate.
   Neither the scroll event, the resize event, nor a ResizeObserver reaches
   this page in every host it runs in, and the app is destined for an iframe
   on the membership site. A frame loop that writes only on change costs two
   comparisons and always works. It stops itself when the hero unmounts. */
function homeLoop(){
  const hero=$('#hero2'), bg=$('#h2bg'), stack=$('#h2stack'), crest=$('#h2crest');
  if(!hero||!bg||!stack||!crest) return;
  const still=REDUCED.matches;
  let mx=0, my=0, lastY=-1, lastM=-1, lastW=0, lastH=0;
  const step=()=>{
    if(!hero.isConnected) return;                    // the view changed: stop
    if(innerWidth!==lastW||innerHeight!==lastH){     // also catches the first frame
      lastW=innerWidth; lastH=innerHeight; fitHero(); lastY=-1;
    }
    if(!still){
      const y=Math.max(0,Math.min(scrollY,innerHeight));
      const m=mx*1000+my;
      if(y!==lastY||m!==lastM){
        lastY=y; lastM=m;
        const k=y/Math.max(1,innerHeight);
        bg.style.transform=`translate3d(0,${(y*.34).toFixed(1)}px,0)`;
        stack.style.transform=`translate3d(0,${(y*-.16).toFixed(1)}px,0)`;
        stack.style.opacity=Math.max(0,1-k*1.15).toFixed(3);
        crest.style.transform=`translate3d(${(mx*16).toFixed(1)}px,${(y*.3+my*11).toFixed(1)}px,0) `
          +`rotateX(${(-my*9).toFixed(2)}deg) rotateY(${(mx*13).toFixed(2)}deg) scale(${(1-k*.12).toFixed(3)})`;
      }
    }
    requestAnimationFrame(step);
  };
  hero.addEventListener('pointermove',e=>{ const r=hero.getBoundingClientRect();
    mx=(e.clientX-r.left)/r.width-.5; my=(e.clientY-r.top)/r.height-.5; });
  hero.addEventListener('pointerleave',()=>{ mx=0; my=0; });
  requestAnimationFrame(step);
}

/* =====================================================================
   THE PLAN · the creed, and what is in your hand
   ===================================================================== */
function renderPlan(sc,body){
  const plan=planOf(sc), c=plan.creed;
  const keyRow=(k,i)=>CK_EDIT===i
    ? `<div class="ck" style="cursor:default"><span class="skstamp">${i+1}</span>
        <div class="ck-edit">
          <input id="ckt" maxlength="60" value="${esc(k.t)}" placeholder="the key, in your words">
          <textarea id="cks" maxlength="200" placeholder="one line on what it means">${esc(k.s)}</textarea>
          <div class="row"><button class="skb gold sm" data-cksave="${i}">Write it in</button>
            <button class="skb ghost sm" data-ckcancel="1" style="color:#241A03;background:rgba(20,24,32,.1);box-shadow:none">Cancel</button>
            ${k.edited?`<button class="skb ghost sm" data-ckreset="${i}" style="color:#241A03;background:rgba(20,24,32,.1);box-shadow:none">Back to the seed</button>`:''}</div>
        </div></div>`
    : `<div class="ck" data-ck="${i}" title="Edit this key"><span class="skstamp">${i+1}</span>
        <span class="ck-m"><span class="ck-t${k.edited?' mk':''}">${esc(k.t)}</span><span class="ck-s${k.edited?' mk':''}">${esc(k.s)}</span></span>
        <span class="ck-pen">edit</span></div>`;
  const blank=(f,ghost)=>{ const v=String(c[f]||'').trim();
    return `<button class="blank${v?' filled':''}${window._skJust===f?' just':''}" data-blank="${f}">${v?esc(v):esc(ghost)}</button>`; };
  const believes=((sc.about&&sc.about.principles)||[]).filter(p=>p.detail);
  body.innerHTML=viewHead('The Plan','the creed, and what is in your hand')+`<div class="plan">
    <div class="paper creed halftone"><span class="tape tl"></span><span class="tape tr blue"></span>
      <div class="creed-h"><b>The Creed</b><i>what this ${SIDEWORD(sc)} believes · tap a key to make it yours</i></div>
      ${c.keys.slice(0,3).map(keyRow).join('')}
      <div class="creed-foot">${creedEdited(sc)?'in your hand':'seeded by King Reggie, waiting on you'}</div>
    </div>
    <div class="paper hand halftone"><span class="tape tc"></span>
      <div class="creed-h"><b>In Your Hand</b><i>tap a blank</i></div>
      <p class="hl"><span class="lab">Feed</span>Feed ${blank('feed_player','who')} on ${blank('feed_play','which play')}, about ${blank('feed_touches','how many')} touches.</p>
      <p class="hl"><span class="lab">When it stalls</span>When I am stuck, I ${blank('when_stuck','do what')}.</p>
      <p class="hl"><span class="lab">Go-to calls</span>Run: ${blank('go_to_run','a run')} Pass: ${blank('go_to_pass','a pass')}</p>
      <p class="hl"><span class="lab">Discipline</span>Stop calling ${blank('stop_calling','which play')} after ${blank('stop_after','n')} tries.</p>
      <p class="hl"><span class="lab">My rule</span>${blank('rule','write the one rule')}</p>
      <p class="hl"><span class="lab">Openers</span>1. ${blank('opener0','play')} &nbsp;2. ${blank('opener1','play')} &nbsp;3. ${blank('opener2','play')}</p>
    </div>
    ${believes.length?`<div class="plan-bel">${believes.map(p=>`<div class="paper"><b>${esc(tcase(p.title))}</b><p>${esc(p.detail)}</p></div>`).join('')}</div>`:''}
  </div>`;
  window._skJust=null;
  body.onclick=e=>{
    const ck=e.target.closest('[data-ck]'); if(ck){ CK_EDIT=+ck.dataset.ck; renderPlan(sc,body); $('#ckt').focus(); return; }
    const sv=e.target.closest('[data-cksave]'); if(sv){ const i=+sv.dataset.cksave;
      const t=$('#ckt').value.trim(), s=$('#cks').value.trim(); if(t){ c.keys[i]={t,s,edited:true}; savePlan(sc); }
      CK_EDIT=null; renderPlan(sc,body); buildRail(); return; }
    if(e.target.closest('[data-ckcancel]')){ CK_EDIT=null; renderPlan(sc,body); return; }
    const rs=e.target.closest('[data-ckreset]'); if(rs){ const i=+rs.dataset.ckreset; c.keys[i]=seedKeys(sc)[i]||c.keys[i];
      savePlan(sc); CK_EDIT=null; renderPlan(sc,body); buildRail(); return; }
    const bl=e.target.closest('[data-blank]'); if(bl){ e.stopPropagation(); blankMenu(sc,bl,bl.dataset.blank,()=>{ renderPlan(sc,body); buildRail(); }); return; }
  };
  body.addEventListener('keydown',e=>{ if(e.key==='Enter'&&e.target.id==='ckt'){ e.preventDefault(); const b=body.querySelector('[data-cksave]'); if(b) b.click(); } });
}
/* the blank's popover: options seeded from THEIR sheet, always a write-my-own */
let POP=null;
function popClose(){ if(POP){ POP.remove(); POP=null; } }
function popOpen(anchor,html){
  popClose();
  const host=anchor.closest('.paper,.pocket,.script,#skbody')||document.body;
  if(getComputedStyle(host).position==='static') host.style.position='relative';
  const pop=document.createElement('div'); pop.className='skpop'; pop.innerHTML=html;
  host.appendChild(pop); POP=pop;
  const r=anchor.getBoundingClientRect(), h=host.getBoundingClientRect();
  let left=r.left-h.left, top=r.bottom-h.top+6;
  if(left+pop.offsetWidth>h.width-8) left=Math.max(4,h.width-8-pop.offsetWidth);
  pop.style.left=left+'px'; pop.style.top=top+'px';
  pop.addEventListener('click',e=>e.stopPropagation());
  setTimeout(()=>document.addEventListener('click',function once(){ popClose(); document.removeEventListener('click',once); },{once:true}),0);
  return pop;
}
function blankMenu(sc,anchor,field,done){
  const plan=planOf(sc), c=plan.creed;
  const calls=[]; sheetSecs(sc).forEach(s=>(s.calls||[]).forEach(x=>{ if(!calls.some(y=>y.id===x.id)) calls.push(x); }));
  const byType=(t)=>sc.plays.filter(p=>(p.type||'').toLowerCase().indexOf(t)>=0).map(p=>[p.name,p.name]);
  let opts=[], ghost='write my own';
  if(field==='feed_player'){ const x=sheetSecs(sc).find(s=>s.id==='xfactor'); const xp=x&&x.xfactor&&x.xfactor.player;
    opts=[...(xp?[[xp,xp+' (the X-Factor)']]:[]),...((sc.personnel&&sc.personnel.players)||[]).map(p=>[p.name,p.name])]; }
  else if(field==='feed_play'||field==='stop_calling'||/^opener\d$/.test(field)) opts=calls.map(x=>[x.name,x.name]);
  else if(field==='go_to_run') opts=byType('run');
  else if(field==='go_to_pass') opts=[...byType('pass'),...byType('star')];
  else if(field==='feed_touches') opts=[['8-10','8-10'],['6-8','6-8'],['5-7','5-7'],['3-5','3-5']];
  else if(field==='when_stuck') opts=['go tempo','check to the run','take a shot','get to my X-Factor','run the constraint'].map(v=>[v,v]);
  else if(field==='stop_after') opts=[['3','3'],['4','4'],['5','5'],['6','6']];
  const pop=popOpen(anchor,`${opts.map(([v,l])=>`<button class="skpop-opt" data-v="${esc(v)}">${esc(l)}</button>`).join('')}
    <div class="skpop-free"><input maxlength="90" placeholder="${esc(ghost)}"><button>&#10003;</button></div>`);
  const commit=v=>{ c[field]=String(v||'').trim(); savePlan(sc); window._skJust=field; popClose(); done(); };
  pop.querySelectorAll('.skpop-opt').forEach(b=>b.addEventListener('click',()=>commit(b.dataset.v)));
  const inp=pop.querySelector('input');
  inp.value=String(c[field]||'');
  inp.addEventListener('keydown',e=>{ if(e.key==='Enter') commit(inp.value); if(e.key==='Escape') popClose(); });
  pop.querySelector('.skpop-free button').addEventListener('click',()=>commit(inp.value));
  if(!opts.length) inp.focus();
}

/* =====================================================================
   THE INSTALL · the track the video walks down: three pillars, in order
   ===================================================================== */
function tapes(p){
  const lead=p.subtype||p.type||'';
  const out=[`<span class="tp ${tapeCls(p)}">${esc(lead)}</span>`];
  const said=new Set([lead.toLowerCase()]);
  for(const t of p.tags||[]){ if(out.length>=3) break; const l=tagLabel(t);
    if(said.has(l.toLowerCase())||t==='exclusive') continue; said.add(l.toLowerCase()); out.push(`<span class="tp">${esc(l)}</span>`); }
  return out.join('');
}
function pcardHTML(sc,p,i){
  const noted=!!noteOf(sc,p.id), held=!!p.exclusive;
  const rot=(((i*37)%5)-2)*0.35;
  return `<div class="pcard${held?' held':''}${noted?' dogear':''}" data-open="${esc(p.id)}" style="--r:${rot}deg" role="button" tabindex="0">
    ${artHTML(sc,p,'pcard-art')}
    <div class="pcard-b"><span class="pcard-nm">${crownOf(p)}${esc(p.name)}</span>
      <span class="pcard-fm">${esc(p.formation||p.libSet||'')}</span>
      <span class="pcard-tapes">${tapes(p)}</span>
      <span class="pcard-ft"><span>${(p.reads||[]).length} reads</span><em>${p.books?p.books+' books run it':''}</em></span></div>
    ${held?`<span class="pcard-lock"><b>${LOCK}</b><span>Held back for members</span><u>Scheme Kings</u></span>`:''}
  </div>`;
}
function pcardOpenHTML(sc,p){
  const note=noteOf(sc,p.id), yt=p.videoUrl||sc.youtubeUrl||'', own=/youtu/.test(yt);
  const pins=pinsFor(sc,p.id);
  return `<div class="pcard open" data-id="${esc(p.id)}"><div class="px">
    <div class="px-left">
      ${artHTML(sc,p,'px-shot')}
      <div class="px-head"><div><div class="px-ey">${isStar(p)?CROWN:''}${esc(p.type||'')}${p.subtype?' &middot; '+esc(p.subtype):''}</div>
        <div class="px-title">${esc(p.name)}</div></div>
        <button class="px-x" data-close="1" aria-label="Close">&times;</button></div>
    </div>
    <div class="px-right">
      ${p.whenToUse?`<div class="px-when"><div class="px-lab blue">When to call it</div><p>${esc(p.whenToUse)}</p></div>`:''}
      ${(p.reads||[]).length?`<div><div class="px-lab">The reads, in order</div>${p.reads.map((r,i)=>
        `<div class="rd"><i>${i+1}</i><div><b>${esc(r.label)}</b><p>${esc(r.text)}</p></div></div>`).join('')}</div>`:''}
      ${(p.adjustments||[]).length?`<div class="px-adj"><div class="px-lab">Adjustments</div><ul>${p.adjustments.map(a=>`<li>${esc(a)}</li>`).join('')}</ul></div>`:''}
      <div><div class="px-lab blue">Your note</div><textarea class="note" data-note="${esc(p.id)}" maxlength="500" placeholder="the stuff you learn the hard way">${esc(note)}</textarea></div>
      <div><div class="px-lab">Pin it under</div><div class="px-pins">${allCases(sc).map(cs=>
        `<button class="mbb-chip${pins.includes(cs.id)?' on':''}" style="--sc:${cs.c}" data-pintoggle="${esc(p.id)}" data-case="${esc(cs.id)}">${esc(cs.label)}</button>`).join('')}</div></div>
      <div class="px-acts">
        ${own?`<a class="px-film" href="${esc(yt)}" target="_blank" rel="noopener"><i></i>Roll the film<em>King Reggie breaks it down</em></a>`
             :`<span class="px-film soon"><i></i>Roll the film<em>coming soon</em></span>`}
        <button class="skb ghost sm" data-lib="${esc(p.name)}" style="color:#241A03;background:rgba(20,24,32,.1);box-shadow:none">In the library</button>
      </div>
    </div></div></div>`;
}
/* THE WALL. One long surface with the pillars side by side, and one camera
   that dollies between stops: the pillar opener, one play at a time, the
   sheet, the game. Nothing crossfades; the wall moves. Reads land on the
   card itself: each read is anchored to the man the decision produces, he
   lights up, the rest of the play dims and the card pushes in on him. The
   rail on the left is the timeline, the pillar's plays stand along the
   foot, and the top-right stays clear for the face cam. Position is
   remembered per scheme so re-entry lands on the exact play. */
const pillarsOf=(sc)=>(sc.install&&sc.install.pillars)||[];
const pillarAt=(sc,i)=>pillarsOf(sc)[i]||null;
const taughtIn=(sc,pl)=>(pl?pl.plays:[]).map(id=>playOf(sc,id)).filter(Boolean);
const inkedSet=(sc)=>new Set(planOf(sc).inked||[]);
/* a pillar is installed once every taught play in it is inked */
function syncPillars(sc){
  if(!Array.isArray(sc.plays)) return; /* a light scheme from the index has no plays yet; the whole one syncs when it opens */
  const plan=planOf(sc), ink=inkedSet(sc);
  plan.installed=pillarsOf(sc).filter(pl=>pl.plays.length&&pl.plays.every(id=>ink.has(id))).map(pl=>pl.key);
}
function inkPlay(sc,id,on){
  const plan=planOf(sc); plan.inked=plan.inked||[];
  const has=plan.inked.includes(id);
  if(on&&!has) plan.inked.push(id);
  if(!on&&has) plan.inked=plan.inked.filter(x=>x!==id);
  syncPillars(sc); savePlan(sc);
}
const stopsOf=(sc,pl)=>[{t:'cover'},...taughtIn(sc,pl).map(p=>({t:'play',p})),{t:'landing'},{t:'game'}];
/* where you are, remembered per scheme: pillar, stop, reads shown */
function posOf(sc){ const plan=planOf(sc); plan.pos=plan.pos||{ch:0,st:0,rd:0}; return plan.pos; }
function goStop(sc,ch,st,rd){
  const pos=posOf(sc), N=pillarsOf(sc).length; if(!N) return;
  ch=Math.max(0,Math.min(N-1,ch));
  const stops=stopsOf(sc,pillarAt(sc,ch));
  st=Math.max(0,Math.min(stops.length-1,st));
  if(ch!==pos.ch||st!==pos.st) rd=0;
  pos.ch=ch; pos.st=st; pos.rd=rd||0; CH=ch; savePlan(sc);
}
/* the one line under a play: what it forces. The first sentence of his own
   when-to-use copy, which is where he wrote it. */
const forcesOf=(p)=>{ const s=String(p.whenToUse||'').trim(); const m=s.match(/^[^.!?]+[.!?]/); return m?m[0]:s; };
/* =====================================================================
   THE CALL SHEET · the playbook's own paper, filling as the pillars land
   ===================================================================== */
function renderSheet(sc,body){
  const plan=planOf(sc), sh=sc.sheet||{}, secs=sh.sections||[], inst=installedSet(sc), ink=inkedSet(sc), pls=pillarsOf(sc);
  const rot=(i)=>(((i*37)%5)-2)*0.9;
  let open=0;
  /* a taught play is a ghost until it is inked in the install; the wider
     calls were never taught, so they are simply on the sheet */
  const sticky=(c,i)=>{ const p=playOf(sc,c.id); const ghost=!!(p&&p.taught&&!ink.has(p.id)); const noted=!!noteOf(sc,c.id);
    const pi=p?pls.findIndex(x=>x.plays.includes(p.id)):-1;
    return `<button class="gpk-sticky${c.type==='Star Play'?' gpk-st-star':''}${ghost?' ghost':''}${noted?' noted':''}" data-play="${esc(c.id)}"
      style="--r:${rot(i)}deg" title="${ghost?'lands when it is inked in '+(pi>=0?pls[pi].name:'the install'):'Open the play'}">
      ${ghost&&pi>=0?`<span class="gpk-pill">pillar ${pi+1}</span>`:''}
      <b>${crownOf(c)}${esc(c.name)}</b><span>${esc(c.formation||'')}</span>
      ${(c.tags||[]).length?`<span class="gpk-tags">${c.tags.map(t=>`<i>${esc(tagLabel(t))}</i>`).join('')}</span>`:''}
    </button>`; };
  const clipFor=(sec)=>{ const slot=DRIVE_SLOTS.find(s=>s.sec===sec.id); if(!slot) return '';
    const d=plan.drives.find(x=>x.slot===slot.id); return d?`<button class="gpk-clip" data-view="drives" title="Open the script rack">${esc(d.title||'a script')}</button>`:''; };
  const secHTML=(sec)=>{
    let bits='';
    if(sec.kind==='plays'){
      bits=(sec.calls||[]).map((c,i)=>sticky(c,i+sec.label.length)).join('');
      const more=Math.max(0,(sec.cap||0)-(sec.calls||[]).length); open+=more;
      bits+=more?`<span class="gpk-more">+ ${more} more</span>`:'';
      if(!(sec.calls||[]).length&&!more) bits=`<span class="gpk-empty">open</span>`;
    } else if(sec.id==='formations'){
      bits=(sec.formations||[]).map((f,i)=>`<button class="gpk-sticky gpk-st-form" data-form="${esc(f)}" style="--r:${rot(i+2)}deg"><b>${esc(f)}</b></button>`).join('');
    } else if(sec.id==='xfactor'){
      const x=sec.xfactor;
      bits=x?`<button class="gpk-sticky gpk-st-xf" data-view="personnel" style="--r:-1.2deg" title="The personnel">
          ${x.cut?`<img class="gpk-xf-card" src="${esc(x.cut)}" alt="" loading="lazy">`:''}
          <span class="gpk-xf-txt"><b>&#9733; ${esc(x.player)}</b><span>${x.play?esc(x.play.name)+(x.play.formation?' &middot; '+esc(x.play.formation):''):''}</span></span>
        </button>`:`<span class="gpk-empty">pick the guy</span>`;
    } else if(sec.id==='constraints'){
      bits=(sh.pairs||[]).map((p,i)=>{
        const side=(c)=>`<span class="gpk-con-side"><button class="gpk-con-p" data-play="${esc(c.id)}">${crownOf(c)}${esc(c.name)}</button><i>${esc(c.formation||'')}</i></span>`;
        return `<span class="gpk-sticky gpk-st-con" style="--r:${rot(i+5)*.5}deg">${side(p.base)}
            <svg class="gpk-con-arrow" viewBox="0 0 90 30" aria-hidden="true">
              <path d="M4,16 C28,9 54,10 78,15" fill="none" stroke="#a0342e" stroke-width="3.4" stroke-linecap="round"/>
              <path d="M68,7 L82,15 L67,22" fill="none" stroke="#a0342e" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            ${side(p.off)}</span>${p.note?`<span class="gpk-con-note">${esc(p.note)}</span>`:''}`; }).join('')||`<span class="gpk-empty">no pairs picked</span>`;
    }
    return `<div class="gpk-sec" data-sec="${esc(sec.id)}" style="grid-area:${esc(sec.id)}">
        <span class="gpk-sec-h" title="${esc(sec.info||'')}">${esc(sec.label)}<i>?</i></span>${clipFor(sec)}
        <div class="gpk-slots${sec.kind==='plays'?' gpk-two':''}">${bits}</div></div>`;
  };
  const bodyHTML=secs.map(secHTML).join('');
  const keys=plan.creed.keys.slice(0,3);
  const taught=sc.plays.filter(p=>p.taught).length;
  body.innerHTML=viewHead('Call Sheet',`${inst.size} of ${pls.length} pillars on the sheet · ${ink.size} of ${taught} taught calls inked · ${open} open slots`,
      inst.size<pls.length?`<button class="skb ghost sm" data-view="install">Keep installing &rarr;</button>`:'')
    +`<div class="gpk-wrap"><div class="gpk-sheet">
      <div class="gpk-ph">
        ${sc.logo?`<img class="gpk-ph-o" src="logos/${esc(sc.logo)}.png" alt="">`:''}
        ${sh.headerArt?`<img class="gpk-ph-o" style="height:40px" src="${esc(sh.headerArt)}" alt="">`
          :`<b class="gpk-ph-t">${esc(sh.title||(sc.name+' PLAY CALL SHEET').toUpperCase())}</b>`}
        <div class="gpk-keys">${keys.map(k=>`<button class="gpk-key${k.edited?' mk':''}" data-view="plan" title="The creed"><i>&#10003;</i>${esc(k.t)}</button>`).join('')}</div>
        <span class="gpk-sweep" aria-hidden="true"></span>
      </div>
      <div class="gpk-body">${bodyHTML}</div>
    </div></div>`;
}

/* =====================================================================
   DRIVES · the script rack (the shelf) and the builder (the tool)
   ===================================================================== */
function scriptRows(sc,d){
  const nm=(id)=>{ const p=playOf(sc,id); return p?p.name:id; };
  const main=Array.isArray(d.main)?d.main:[];
  return main.map((n,i)=>{
    const br=(side)=>(n[side]||[]).map(x=>`<span class="script-br ${side==='left'?'ctr':'fb'}">${side==='left'?'&#9664; ':''}${esc(nm(x.play))}${side==='right'?' &#9654;':''}</span>`).join('');
    return `<div class="script-row"><span class="script-num">${i+1}</span><span class="script-name">${esc(nm(n.play))}</span>
      <span class="script-sit">${esc(n.sit||'')}</span>${br('left')}${br('right')}</div>`; }).join('')
    ||`<div class="script-row"><span class="script-empty">Empty script</span></div>`;
}
function renderDrives(sc,body){
  const plan=planOf(sc);
  const card=(d)=>{ const slot=slotOf(d.slot);
    return `<div class="script" data-drive="${esc(d.id)}" title="Open in the builder">
      <div class="script-top"><span class="script-title">${esc(d.title||'Drive')}</span>
        <span class="script-acts"><button class="slotchip" style="--sc:${slot?slot.c:'#8a6b4a'}" data-slotmenu="${esc(d.id)}" title="Move to another pocket">${slot?esc(slot.label):'+ tag a pocket'}</button>
          <button class="x" data-del="${esc(d.id)}" title="Delete">&times;</button></span></div>
      ${scriptRows(sc,d)}</div>`; };
  const pocket=(slot)=>{ const mine=plan.drives.filter(d=>d.slot===slot.id);
    const sec=slot.sec&&sheetSecs(sc).find(s=>s.id===slot.sec);
    return `<div class="pocket" style="--sc:${slot.c}"><div class="pocket-l">${esc(slot.label)}</div>
      ${sec?`<span class="pocket-clip">clips to ${esc(sec.label)}</span>`:''}
      ${mine.length?mine.map(card).join('')+`<button class="ghost sm" data-new="${slot.id}"><b>+ another ${esc(slot.label)} script</b></button>`
        :`<button class="ghost" data-new="${slot.id}"><b>+ script this</b><span>counters branch left, fallbacks right</span></button>`}</div>`; };
  const un=plan.drives.filter(d=>!slotOf(d.slot));
  body.innerHTML=viewHead('Drives',`the script rack · ${plan.drives.length} script${plan.drives.length!==1?'s':''}`,`<button class="skb gold" data-new="">+ Script a Drive</button>`)
    +`<div class="hint">Tap a pocket to script that moment. The builder opens with the pocket picked; save and the script lands on the rack, and a paperclip shows up on the matching block of the call sheet.</div>
    <div class="rack">${DRIVE_SLOTS.map(pocket).join('')}
      ${un.length?`<div class="pocket" style="--sc:#8a6b4a"><div class="pocket-l">Unassigned</div>${un.map(card).join('')}</div>`:''}</div>`;
  body.onclick=e=>{
    const nw=e.target.closest('[data-new]'); if(nw){ dbxOpen(sc,null,nw.dataset.new||null); return; }
    const sm=e.target.closest('[data-slotmenu]'); if(sm){ e.stopPropagation(); slotMenu(sc,sm,sm.dataset.slotmenu,()=>{ renderDrives(sc,body); buildRail(); }); return; }
    const del=e.target.closest('[data-del]'); if(del){ e.stopPropagation();
      plan.drives=plan.drives.filter(d=>d.id!==del.dataset.del); savePlan(sc); renderDrives(sc,body); buildRail(); toast('Script torn up'); return; }
    const dr=e.target.closest('[data-drive]'); if(dr){ const d=plan.drives.find(x=>x.id===dr.dataset.drive); if(d) dbxOpen(sc,d,null); return; }
  };
}
function slotMenu(sc,anchor,driveId,done){
  const plan=planOf(sc);
  const pop=popOpen(anchor,DRIVE_SLOTS.map(s=>`<button class="skpop-opt" data-v="${s.id}" style="--sc:${s.c}"><i></i>${esc(s.label)}</button>`).join('')
    +`<button class="skpop-opt" data-v="" style="--sc:transparent"><i style="border:1.5px dashed #5B5747"></i>Unassigned</button>`);
  pop.querySelectorAll('.skpop-opt').forEach(b=>b.addEventListener('click',()=>{
    const d=plan.drives.find(x=>x.id===driveId); if(d){ d.slot=b.dataset.v||null; savePlan(sc); } popClose(); done(); }));
}

/* ---- the builder: the playbooks' spine layout, ported, on a 2D stage ---- */
const DBX={ sc:null, drive:null, armed:null, menuKey:null, pan:{x:0,y:0,z:1}, needsFit:true, mode:'build', cat:'all', dirty:false, els:null, was:false };
const DB_ROW=124, DB_HALFW=118, DB_GAP=70;
const dbxClone=(n)=>({ play:n.play, sit:n.sit||'', left:(n.left||[]).map(dbxClone), right:(n.right||[]).map(dbxClone) });
function dbxEnsure(){
  if(DBX.els) return DBX.els;
  const el=document.createElement('div'); el.id='skdb';
  el.innerHTML=`<div class="dbx-rail"><div class="dbx-rail-h"><b>The Plays</b><span>tap + to drop one in</span></div>
      <div class="dbx-cats" id="dbxcats"></div><div class="dbx-list" id="dbxlist"></div></div>
    <div class="dbx-stage" id="dbxstage">
      <div class="dbx-modes"><button class="dbx-mode on" data-mode="build">Build</button><button class="dbx-mode" data-mode="field">On the field</button><button class="dbx-mode" data-fit="1">Fit</button></div>
      <div class="dbx-persp"><div class="dbx-web" id="dbxweb"><svg class="dbx-strands" id="dbxstrands" style="overflow:visible"></svg><div id="dbxnodes"></div></div></div>
      <div class="dbx-cap" id="dbxcap"></div></div>
    <div class="dbx-side">
      <div class="paper dbx-card"><span class="tape tl"></span><span class="eyebrow">The Script</span>
        <input class="dbx-title" id="dbxtitle" maxlength="48" placeholder="name this drive">
        <div class="dbx-slots" id="dbxslots"></div></div>
      <div class="paper dbx-sum" id="dbxsum"></div>
      <div class="dbx-key"><span><i style="background:#F5A623"></i>the spine</span><span><i style="background:#4fbf72"></i>counters</span><span><i style="background:#6f93ff"></i>fallbacks</span></div>
      <div class="dbx-acts"><button class="skb gold" id="dbxsave">Save to the rack</button><button class="skb ghost" id="dbxclose">Close</button></div>
    </div>`;
  document.body.appendChild(el);
  const E=DBX.els={ root:el, stage:$('#dbxstage'), web:$('#dbxweb'), strands:$('#dbxstrands'), nodes:$('#dbxnodes'), cap:$('#dbxcap'),
    list:$('#dbxlist'), cats:$('#dbxcats'), title:$('#dbxtitle'), slots:$('#dbxslots'), sum:$('#dbxsum') };
  E.title.addEventListener('input',()=>{ DBX.drive.title=E.title.value; DBX.dirty=true; });
  $('#dbxsave').addEventListener('click',dbxSave);
  $('#dbxclose').addEventListener('click',()=>dbxClose(false));
  E.slots.addEventListener('click',e=>{ const b=e.target.closest('[data-slot]'); if(!b) return;
    DBX.drive.slot=DBX.drive.slot===b.dataset.slot?null:b.dataset.slot; DBX.dirty=true; dbxRenderSide(); });
  E.cats.addEventListener('click',e=>{ const b=e.target.closest('[data-cat]'); if(!b) return; DBX.cat=b.dataset.cat; dbxRenderRail(); });
  E.list.addEventListener('click',e=>{ const b=e.target.closest('[data-add]'); if(b) dbxAdd(b.dataset.add); });
  el.querySelector('.dbx-modes').addEventListener('click',e=>{
    const m=e.target.closest('[data-mode]'); if(m){ DBX.mode=m.dataset.mode; DBX.needsFit=true; dbxRenderWeb(); return; }
    if(e.target.closest('[data-fit]')){ DBX.needsFit=true; dbxRenderWeb(); }
  });
  /* pan and zoom on the stage */
  let st=null;
  E.stage.addEventListener('pointerdown',e=>{ if(e.target.closest('.tn,.tadd,.tact,.dbx-modes')) return;
    st={x:e.clientX,y:e.clientY,px:DBX.pan.x,py:DBX.pan.y,moved:false}; DBX.was=false; E.stage.setPointerCapture(e.pointerId); });
  E.stage.addEventListener('pointermove',e=>{ if(!st) return; const dx=e.clientX-st.x, dy=e.clientY-st.y;
    if(Math.abs(dx)+Math.abs(dy)>4){ st.moved=true; DBX.was=true; }
    DBX.pan.x=st.px+dx; DBX.pan.y=st.py+dy; dbxApply(); });
  E.stage.addEventListener('pointerup',()=>{ if(st&&!st.moved){ DBX.menuKey=null; DBX.armed=null; dbxRenderWeb(); } st=null; });
  E.stage.addEventListener('wheel',e=>{ e.preventDefault();
    const r=E.stage.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
    const z0=DBX.pan.z, z1=Math.max(.3,Math.min(1.6,z0*(e.deltaY<0?1.1:.9)));
    DBX.pan.x=mx-(mx-DBX.pan.x)*(z1/z0); DBX.pan.y=my-(my-DBX.pan.y)*(z1/z0); DBX.pan.z=z1; dbxApply(); },{passive:false});
  return E;
}
function dbxOpen(sc,drive,slot){
  const E=dbxEnsure();
  DBX.sc=sc;
  DBX.drive=drive?{ id:drive.id, title:drive.title||'', slot:drive.slot||null, seeded:!!drive.seeded, main:(drive.main||[]).map(dbxClone) }
                 :{ id:'dr'+Date.now().toString(36), title:'', slot:slot||null, main:[] };
  DBX.armed=drive?null:{chainPath:[]}; DBX.menuKey=null; DBX.needsFit=true; DBX.mode='build'; DBX.cat='all'; DBX.dirty=false;
  E.root.classList.add('open'); document.body.style.overflow='hidden';
  dbxRenderSide(); dbxRenderRail(); dbxRenderWeb();
}
function dbxClose(silent){
  if(!DBX.els||!DBX.els.root.classList.contains('open')) return;
  if(!silent&&DBX.dirty&&!confirm('Close without saving this script?')) return;
  DBX.els.root.classList.remove('open'); document.body.style.overflow='';
}
function dbxSave(){
  const sc=DBX.sc, plan=planOf(sc), d=DBX.drive;
  if(!d.main.length){ toast('Drop a play in first'); return; }
  if(!d.title.trim()){ const p=playOf(sc,d.main[0].play); d.title=(p?p.name:'Drive')+' Script'; }
  const rec={ id:d.id, title:d.title.trim(), slot:d.slot, main:d.main.map(dbxClone), updated:new Date().toISOString() };
  const i=plan.drives.findIndex(x=>x.id===d.id); if(i>=0) plan.drives[i]=rec; else plan.drives.push(rec);
  savePlan(sc); DBX.dirty=false; dbxClose(true);
  const sl=slotOf(d.slot); toast(sl?`On the rack, in ${sl.label}`:'On the rack');
  if(SEC==='drives'){ const body=$('#skbody'); if(body) renderDrives(sc,body); }
  buildRail();
}
function dbxRenderSide(){
  const E=DBX.els, sc=DBX.sc, d=DBX.drive;
  E.title.value=d.title;
  E.slots.innerHTML=DRIVE_SLOTS.map(s=>`<button class="dbx-slot${d.slot===s.id?' on':''}" style="--sc:${s.c}" data-slot="${s.id}">${esc(s.label)}</button>`).join('');
  E.sum.innerHTML=`<b>${d.main.length} call${d.main.length!==1?'s':''} on the spine</b>${scriptRows(sc,d)}`;
}
function dbxRenderRail(){
  const E=DBX.els, sc=DBX.sc;
  const cats=[['all','All'],['Base','Base'],['Expansion','Expansion'],['Payoff','Payoff']];
  E.cats.innerHTML=cats.map(([k,l])=>`<button class="dbx-cat${DBX.cat===k?' on':''}" data-cat="${k}">${l}</button>`).join('');
  const list=sc.plays.filter(p=>DBX.cat==='all'||p.pillar===DBX.cat).sort((a,b)=>a.order-b.order);
  E.list.innerHTML=list.map(p=>`<button class="dbx-play${DBX.armed?' armed':''}" data-add="${esc(p.id)}">
    ${artHTML(sc,p,'')}
    <span><b>${esc(p.name)}</b><i>${esc(p.formation||'')}</i></span><u>+</u></button>`).join('');
}
const dbxChain=(d,path)=>{ let ch=d.main; for(let k=0;k<path.length;k+=2) ch=ch[path[k]][path[k+1]]; return ch; };
const dbxNode=(d,p)=>dbxChain(d,p.slice(0,-1))[p[p.length-1]];
const dbxKey=(p)=>p.join('.'), dbxCKey=(p)=>'c:'+p.join('.');
const dbxParse=(k)=>k.replace(/^c:/,'').split('.').filter(s=>s!=='').map(s=>/^\d+$/.test(s)?+s:s);
function dbxLayout(chain,chainPath,sideClass,connectBase){
  const sc=DBX.sc, res={nodes:[],strands:[],addSlots:[]};
  let spanMin=-DB_HALFW, spanMax=DB_HALFW, prevY=0;
  const isTrunk=sideClass==='';
  chain.forEach((node,idx)=>{
    const y=prevY-DB_ROW, path=[...chainPath,idx];
    const first=idx===0&&!isTrunk, goal=isTrunk&&idx===chain.length-1;
    const p=playOf(sc,node.play);
    res.nodes.push({ x:0, y, path, name:p?p.name:node.play, sub:node.sit||(p&&p.formation)||'',
      chipCls:goal?'goal':(first?sideClass:''), badge:first?(sideClass==='br-left'?'&#9733;':'&#8635;'):String(idx+1), badgeCls:first?sideClass:'' });
    if(idx>0||connectBase) res.strands.push({kind:'L',x1:0,y1:prevY,x2:0,y2:y,cls:''});
    ['left','right'].forEach(side=>{
      const br=node[side]; if(!br||!br.length) return;
      const bCls=side==='left'?'br-left':'br-right';
      const sub=dbxLayout(br,[...path,side],bCls,false);
      const offset=side==='left'?spanMin-DB_GAP-sub.spanMax:spanMax+DB_GAP-sub.spanMin;
      sub.nodes.forEach(n=>res.nodes.push({...n,x:n.x+offset,y:n.y+y}));
      sub.strands.forEach(s=>res.strands.push(dbxShift(s,offset,y)));
      sub.addSlots.forEach(a=>res.addSlots.push({...a,x:a.x+offset,y:a.y+y}));
      res.strands.push({kind:'C',cls:bCls,x1:0,y1:y,c1x:offset*.45,c1y:y,c2x:offset,c2y:y-DB_ROW*.5,x2:offset,y2:y-DB_ROW});
      spanMin=Math.min(spanMin,offset+sub.spanMin); spanMax=Math.max(spanMax,offset+sub.spanMax);
    });
    prevY=y;
  });
  const tipY=prevY-DB_ROW;
  res.addSlots.push({x:0,y:tipY,chainPath});
  res.strands.push({kind:'L',x1:0,y1:prevY,x2:0,y2:tipY,cls:'',stub:true});
  res.spanMin=spanMin; res.spanMax=spanMax; return res;
}
const dbxShift=(s,dx,dy)=>s.kind==='L'?{...s,x1:s.x1+dx,y1:s.y1+dy,x2:s.x2+dx,y2:s.y2+dy}
  :{...s,x1:s.x1+dx,y1:s.y1+dy,c1x:s.c1x+dx,c1y:s.c1y+dy,c2x:s.c2x+dx,c2y:s.c2y+dy,x2:s.x2+dx,y2:s.y2+dy};
const dbxD=(s)=>s.kind==='L'?`M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} L ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`
  :`M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} C ${s.c1x.toFixed(1)} ${s.c1y.toFixed(1)}, ${s.c2x.toFixed(1)} ${s.c2y.toFixed(1)}, ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`;
function dbxApply(){
  const E=DBX.els, tilt=DBX.mode==='field'?'rotateX(50deg)':'';
  E.web.style.transform=`translate(${DBX.pan.x}px,${DBX.pan.y}px) ${tilt} scale(${DBX.pan.z})`;
}
function dbxFit(ctx){
  const E=DBX.els, r=E.stage.getBoundingClientRect();
  const pts=ctx.nodes.map(n=>({x:n.x,y:n.y})).concat(ctx.addSlots.map(s=>({x:s.x,y:s.y})));
  if(!pts.length) pts.push({x:0,y:0});
  let minX=1e9,maxX=-1e9,minY=1e9,maxY=-1e9;
  pts.forEach(p=>{ minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); });
  minX-=180; maxX+=180; minY-=80; maxY+=100;
  const W=r.width, H=r.height, tw=Math.max(1,maxX-minX), th=Math.max(1,maxY-minY);
  DBX.pan.z=Math.max(.3,Math.min(1.1,Math.min((W*.86)/tw,(H*.8)/th)));
  DBX.pan.x=W/2-((minX+maxX)/2)*DBX.pan.z;
  DBX.pan.y=(DBX.mode==='field'?H*.62:H/2)-((minY+maxY)/2)*DBX.pan.z;
  dbxApply();
}
function dbxRenderWeb(){
  const E=DBX.els, d=DBX.drive, main=d.main;
  E.stage.classList.toggle('field',DBX.mode==='field');
  E.root.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('on',b.dataset.mode===DBX.mode));
  const ctx=dbxLayout(main,[],'',true);
  E.strands.innerHTML=ctx.strands.map(s=>`<path class="tstrand ${s.cls}${s.stub?' stub':''}" d="${dbxD(s)}"/>`).join('');
  let html=ctx.nodes.map(nd=>{ const key=dbxKey(nd.path);
    return `<div class="tn ${nd.chipCls}${DBX.menuKey===key?' menu-open':''}" data-key="${key}" style="left:${nd.x.toFixed(1)}px;top:${nd.y.toFixed(1)}px">
      <span class="tnum ${nd.badgeCls}">${nd.badge}</span><span class="tnm">${esc(nd.name)}</span>${nd.sub?`<span class="tsub">${esc(nd.sub)}</span>`:''}
      <div class="tacts">
        <button class="tact pos" data-act="left" data-key="${key}">+ Counter</button>
        <button class="tact neg" data-act="right" data-key="${key}">+ Fallback</button>
        <button class="tact" data-act="open" data-key="${key}">Open</button>
        <button class="tact rm" data-act="rm" data-key="${key}">Remove</button></div></div>`; }).join('');
  html+=ctx.addSlots.map(sl=>{ const ck=dbxCKey(sl.chainPath), armed=DBX.armed&&dbxCKey(DBX.armed.chainPath)===ck;
    const label=(!sl.chainPath.length&&!main.length)?'+ Add the first call':'+ Add call';
    return `<button class="tadd${armed?' armed':''}" data-chain="${ck}" style="left:${sl.x.toFixed(1)}px;top:${sl.y.toFixed(1)}px">${label}</button>`; }).join('');
  if(!main.length) html+=`<div class="tempty" style="left:0px;top:${-DB_ROW*2}px">Pick a play on the left and tap + to drop it in. Every call after that can branch a counter or a fallback.</div>`;
  E.nodes.innerHTML=html;
  E.nodes.querySelectorAll('.tadd').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation();
    const cp=dbxParse(b.dataset.chain);
    DBX.armed=(DBX.armed&&dbxCKey(DBX.armed.chainPath)===dbxCKey(cp))?null:{chainPath:cp}; DBX.menuKey=null; dbxRenderWeb(); dbxRenderRail(); }));
  E.nodes.querySelectorAll('.tn').forEach(n=>n.addEventListener('click',e=>{ if(e.target.closest('.tact')||DBX.was) return;
    const key=n.dataset.key; DBX.menuKey=DBX.menuKey===key?null:key; DBX.armed=null; dbxRenderWeb(); dbxRenderRail(); }));
  E.nodes.querySelectorAll('.tact').forEach(b=>b.addEventListener('click',e=>{ e.stopPropagation();
    const path=dbxParse(b.dataset.key), act=b.dataset.act;
    if(act==='left'||act==='right'){ DBX.armed={chainPath:[...path,act]}; DBX.menuKey=null; dbxRenderWeb(); dbxRenderRail(); }
    else if(act==='open'){ const nd=dbxNode(d,path); DBX.menuKey=null; dbxRenderWeb(); if(nd) playDrawer(DBX.sc,nd.play); }
    else if(act==='rm'){ dbxChain(d,path.slice(0,-1)).splice(path[path.length-1],1); DBX.menuKey=null; DBX.armed=null; DBX.dirty=true; dbxRenderWeb(); dbxRenderSide(); }
  }));
  E.cap.innerHTML=DBX.armed
    ? (DBX.armed.chainPath.length&&DBX.armed.chainPath[DBX.armed.chainPath.length-1]==='left'?'Adding a counter (if they bite): tap + on a play'
      :DBX.armed.chainPath.length&&DBX.armed.chainPath[DBX.armed.chainPath.length-1]==='right'?'Adding a fallback (it stalled): tap + on a play'
      :'Adding the next call: tap + on a play')
    : (main.length?'Tap a call to branch it. Drag to pan, scroll to zoom.':'Empty script. Pick a play and tap + to start.');
  if(DBX.needsFit){ dbxFit(ctx); DBX.needsFit=false; } else dbxApply();
}
function dbxAdd(playId){
  const d=DBX.drive, p=playOf(DBX.sc,playId);
  const c={ play:playId, sit:(p&&p.formation)||'', left:[], right:[] };
  const path=(DBX.armed&&DBX.armed.chainPath)||[];
  dbxChain(d,path).push(c); DBX.armed=null; DBX.dirty=true;
  dbxRenderWeb(); dbxRenderSide(); dbxRenderRail();
}

/* =====================================================================
   THE BOARD · cork wall, your cases, your answers, red string (ported)
   ===================================================================== */
const ANSWER_COLS=[
  { id:'man',   label:'Vs Man',       c:'#c2554e' },
  { id:'zone',  label:'Vs Zone',      c:'#1b8a80' },
  { id:'blitz', label:'Vs the Blitz', c:'#7a5cc2' },
  { id:'money', label:'Money Downs',  c:'#b98a1c' },
];
const CASE_COLORS=['#2e7d43','#1E54B7','#b3541e','#7a5cc2','#1b8a80','#b98a1c','#a0342e'];
const allCases=(sc)=>[...ANSWER_COLS,...planOf(sc).cases];
const pinsFor=(sc,pk)=>[...new Set(planOf(sc).board.pins.filter(p=>p.pk===pk).map(p=>p.caseId))];
function casePos(sc,cases){
  const b=planOf(sc).board, out={}, N=Math.max(1,cases.length);
  cases.forEach((c,i)=>{ const a=-Math.PI/2+(i*2*Math.PI/N);
    out[c.id]=b.cases[c.id]||{x:Math.round(Math.cos(a)*620),y:Math.round(Math.sin(a)*360)}; });
  return out;
}
function pinAdd(sc,caseId,pk,x,y){
  const b=planOf(sc).board;
  if(x==null){ const cp=casePos(sc,allCases(sc))[caseId]||{x:0,y:-320}; const k=b.pins.filter(p=>p.caseId===caseId).length;
    x=cp.x+((k%2)?-125:125); y=cp.y+165+Math.floor(k/2)*200; }
  b.pins.push({ id:'pin'+Date.now().toString(36)+b.pins.length, caseId, pk, x, y }); savePlan(sc);
}
function pinRemove(sc,pinId){ const b=planOf(sc).board; b.pins=b.pins.filter(p=>p.id!==pinId); savePlan(sc); }
function pinToggle(sc,pk,caseId){ const b=planOf(sc).board; const ex=b.pins.find(p=>p.pk===pk&&p.caseId===caseId);
  if(ex) pinRemove(sc,ex.id); else pinAdd(sc,caseId,pk); }
let BOARD_CAM=null;
function renderBoard(sc,body){
  const plan=planOf(sc), b=plan.board, cases=allCases(sc), cpos=casePos(sc,cases);
  const tray=sc.plays.slice().sort((x,y)=>(noteOf(sc,y.id)?1:0)-(noteOf(sc,x.id)?1:0)||x.order-y.order);
  const trayItem=(p)=>{ const n=b.pins.filter(x=>x.pk===p.id).length;
    return `<div class="mbb-tray-i" data-pk="${esc(p.id)}">${artHTML(sc,p,'')}
      <span class="mbb-tray-mid"><b>${esc(p.name)}</b><i>${esc(p.formation||'')}</i></span>${n?`<span class="mbb-tray-n" title="pinned in ${n} case${n!==1?'s':''}">${n}</span>`:''}</div>`; };
  const caseHTML=(c)=>`<div class="mbb-item mbb-case" data-id="case-${esc(c.id)}" data-case="${esc(c.id)}" style="--sc:${c.c}"><span class="mb-pin"></span>${esc(c.label)}</div>`;
  const pinHTML=(pn)=>{ const p=playOf(sc,pn.pk)||{}, note=noteOf(sc,pn.pk);
    return `<div class="mbb-item mbb-print" data-id="${esc(pn.id)}" data-pin="${esc(pn.id)}"><span class="mb-pin"></span>
      ${artHTML(sc,p,'')}
      <b>${isStar(p)?'&#9819; ':''}${esc(p.name||pn.pk)}</b>
      <span class="mbb-noteline${note?' on':''}">${note?esc(note.length>42?note.slice(0,42)+'…':note):'+ add your note'}</span></div>`; };
  const model=[...cases.map(c=>({id:'case-'+c.id,kind:'case',caseId:c.id,x:cpos[c.id].x,y:cpos[c.id].y})),
               ...b.pins.map(p=>({id:p.id,kind:'pin',pin:p,caseId:p.caseId,pk:p.pk,x:p.x,y:p.y}))];
  body.innerHTML=viewHead('The Board',`your cases, your answers · ${b.pins.length} pinned`,`<button class="skb red" data-newcase="1">+ Open a Case</button>`)
    +`<div class="hint">Drag a play from the stack onto a case to pin it there, or tap a case and pick. The categories are yours: name the problem, pin the answers. Grab the wall to move around.</div>
    <div class="mbb-stage" id="mbb-stage"><div class="mbb-canvas" id="mbb-canvas">
        <svg class="mbb-svg" id="mbb-svg" style="overflow:visible"></svg>
        <div class="mbb-item mbb-hub" data-id="hub"><span class="mb-pin"></span>
          ${sc.logo?`<img src="logos/${esc(sc.logo)}.png" alt="" draggable="false">`:''}<span class="mbb-hub-l">${esc(sc.name)}</span></div>
        ${cases.map(caseHTML).join('')}${b.pins.map(pinHTML).join('')}</div>
      <div class="mbb-tray" id="mbb-tray"><div class="mbb-tray-l">Your Plays<i>${tray.length}</i></div><div class="mbb-tray-list">${tray.map(trayItem).join('')}</div></div>
      <div class="mbb-hud"><button class="mbb-zbtn" data-z="in">+</button><button class="mbb-zbtn" data-z="out">&minus;</button><button class="mbb-zbtn" data-z="fit" title="Recenter">&#8962;</button></div>
    </div>`;
  body.onclick=e=>{ if(e.target.closest('[data-newcase]')) newCaseDrawer(sc); };
  boardWire(sc,body,model);
}
function boardWire(sc,body,items){
  const plan=planOf(sc), b=plan.board;
  const stage=$('#mbb-stage'), canvas=$('#mbb-canvas'), svg=$('#mbb-svg'), tray=$('#mbb-tray');
  const byEl=new Map();
  items.forEach(it=>{ it.el=canvas.querySelector(`[data-id="${CSS.escape(it.id)}"]`); if(!it.el) return;
    it.el.style.left=it.x+'px'; it.el.style.top=it.y+'px'; byEl.set(it.el,it); });
  const hub=canvas.querySelector('[data-id="hub"]'); hub.style.left='0px'; hub.style.top='0px';
  const fit=()=>{ const r=stage.getBoundingClientRect(); return {x:r.width/2+90,y:r.height/2,z:Math.max(.3,Math.min(r.width/1750,.9))}; };
  const cam=(BOARD_CAM&&BOARD_CAM.sk===sc.key)?BOARD_CAM:Object.assign(fit(),{sk:sc.key}); BOARD_CAM=cam;
  const apply=()=>{ canvas.style.transform=`translate(${cam.x}px,${cam.y}px) scale(${cam.z})`; }; apply();
  const toCanvas=(sx,sy)=>{ const r=stage.getBoundingClientRect(); return [(sx-r.left-cam.x)/cam.z,(sy-r.top-cam.y)/cam.z]; };
  const pinPt=(it)=>[it.x,it.y-(it.el?it.el.offsetHeight/2:0)+7];
  const strings=()=>{
    const hubPt=[0,-hub.offsetHeight/2+24];
    const seg=(a,c,sag)=>{ const mx=(a[0]+c[0])/2, my=Math.max(a[1],c[1])+(sag||30);
      return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${c[0].toFixed(1)} ${c[1].toFixed(1)} `; };
    let d='';
    items.filter(it=>it.kind==='case').forEach(c=>{ const pins=items.filter(p=>p.kind==='pin'&&p.caseId===c.caseId); if(!pins.length) return;
      d+=seg(hubPt,pinPt(c),52); pins.forEach(p=>{ d+=seg(pinPt(c),pinPt(p)); }); });
    svg.innerHTML=d?`<path d="${d}" fill="none" stroke="#b3261e" stroke-width="2.4" stroke-linecap="round" opacity=".92" style="filter:drop-shadow(0 2px 1.5px rgba(0,0,0,.4))"/>`:'';
  };
  strings();
  let saveT=null;
  const persist=()=>{ items.forEach(it=>{ if(it.kind==='case') b.cases[it.caseId]={x:Math.round(it.x),y:Math.round(it.y)};
      else if(it.pin){ it.pin.x=Math.round(it.x); it.pin.y=Math.round(it.y); it.pin.caseId=it.caseId; } });
    clearTimeout(saveT); saveT=setTimeout(()=>savePlan(sc),500); };
  const caseElAt=(sx,sy)=>{ let hit=null; canvas.querySelectorAll('.mbb-case').forEach(el=>{ const r=el.getBoundingClientRect();
    if(sx>=r.left-34&&sx<=r.right+34&&sy>=r.top-34&&sy<=r.bottom+34) hit=el; }); return hit; };
  const clearDrop=()=>canvas.querySelectorAll('.mbb-case.drop').forEach(el=>el.classList.remove('drop'));
  const refresh=()=>{ const bd=$('#skbody'); if(bd) renderBoard(sc,bd); buildRail(); };
  let st=null;
  stage.addEventListener('pointerdown',e=>{
    if(e.target.closest('.mbb-hud')) return;
    const trayEl=e.target.closest('.mbb-tray-i'), itemEl=e.target.closest('.mbb-item');
    if(trayEl){ const pk=trayEl.dataset.pk, p=playOf(sc,pk)||{};
      const ghost=document.createElement('div'); ghost.className='mbb-ghost';
      ghost.innerHTML=`${artHTML(sc,p,'')}<b>${esc(p.name||pk)}</b>`;
      document.body.appendChild(ghost); ghost.style.left=e.clientX+'px'; ghost.style.top=e.clientY+'px';
      st={mode:'tray',pk,ghost,sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};
    } else if(itemEl&&itemEl.dataset.id!=='hub'){
      st={mode:'item',item:byEl.get(itemEl),sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};
      if(st.item) st.item.el.classList.add('lift');
    } else st={mode:'pan',sx:e.clientX,sy:e.clientY,lx:e.clientX,ly:e.clientY,moved:false};
    stage.setPointerCapture(e.pointerId); e.preventDefault();
  });
  stage.addEventListener('pointermove',e=>{
    if(!st) return; const dx=e.clientX-st.lx, dy=e.clientY-st.ly; st.lx=e.clientX; st.ly=e.clientY;
    if(Math.abs(e.clientX-st.sx)+Math.abs(e.clientY-st.sy)>5) st.moved=true;
    if(st.mode==='tray'){ st.ghost.style.left=e.clientX+'px'; st.ghost.style.top=e.clientY+'px'; clearDrop(); const hit=caseElAt(e.clientX,e.clientY); if(hit) hit.classList.add('drop'); }
    else if(st.mode==='item'){ const it=st.item; if(!it) return; it.x+=dx/cam.z; it.y+=dy/cam.z; it.el.style.left=it.x+'px'; it.el.style.top=it.y+'px';
      if(it.kind==='pin'){ clearDrop(); const hit=caseElAt(e.clientX,e.clientY); if(hit) hit.classList.add('drop'); } strings(); }
    else { cam.x+=dx; cam.y+=dy; apply(); }
  });
  stage.addEventListener('pointerup',e=>{
    if(!st) return; const s=st; st=null; clearDrop();
    if(s.mode==='tray'){ s.ghost.remove(); const hit=s.moved?caseElAt(e.clientX,e.clientY):null;
      if(hit){ const [cx,cy]=toCanvas(e.clientX,e.clientY), c=byEl.get(hit);
        const near=Math.abs(cx-c.x)<110&&Math.abs(cy-c.y)<70;
        pinAdd(sc,c.caseId,s.pk,Math.round(near?c.x:cx),Math.round(near?c.y+165:cy)); refresh(); }
      else if(!s.moved) playDrawer(sc,s.pk); else toast('Drop it on a case');
      return; }
    if(s.mode!=='item'||!s.item) return;
    const it=s.item; it.el.classList.remove('lift');
    if(!s.moved){ it.kind==='case'?caseDrawer(sc,it.caseId):playDrawer(sc,it.pk,it.id); return; }
    if(it.kind==='pin'){ const hit=caseElAt(e.clientX,e.clientY), c=hit&&byEl.get(hit);
      if(c&&c.caseId!==it.caseId){ it.caseId=c.caseId; it.y=Math.max(it.y,c.y+150); it.el.style.top=it.y+'px'; } }
    persist(); strings();
  });
  stage.addEventListener('wheel',e=>{ e.preventDefault(); cam.z=Math.max(.25,Math.min(1.8,cam.z*(e.deltaY<0?1.1:.9))); apply(); },{passive:false});
  stage.querySelectorAll('.mbb-zbtn').forEach(btn=>btn.addEventListener('click',ev=>{ ev.stopPropagation();
    if(btn.dataset.z==='fit') Object.assign(cam,fit()); else cam.z=Math.max(.25,Math.min(1.8,cam.z*(btn.dataset.z==='in'?1.18:.85))); apply(); }));
  if(tray) tray.addEventListener('wheel',e=>e.stopPropagation());
}

/* =====================================================================
   THE DRAWER · one cream panel: a play, a case, a formation, a new case
   ===================================================================== */
function drawerEnsure(){
  let el=$('#skdrawer'); if(el) return el;
  el=document.createElement('div'); el.id='skdrawer';
  el.innerHTML=`<button id="skdrawer-x" aria-label="Close">&times;</button><div id="skdrawer-in"></div>`;
  document.body.appendChild(el);
  $('#skdrawer-x').addEventListener('click',drawerClose);
  return el;
}
function drawer(html,onClick){ const el=drawerEnsure(); const inn=$('#skdrawer-in'); inn.innerHTML=html; inn.onclick=onClick||null; el.classList.add('open'); }
function drawerClose(){ const el=$('#skdrawer'); if(el) el.classList.remove('open'); }
addEventListener('keydown',e=>{ if(e.key!=='Escape') return;
  popClose();
  if(modalOpen()) modalClose();
  else if($('#skdrawer.open')) drawerClose();
  else if(DBX.els&&DBX.els.root.classList.contains('open')&&!e.target.matches('input')) dbxClose(false); });
const refreshView=(sc)=>{ const bd=$('#skbody'); if(bd&&SEC){ ({home:renderHome,plan:renderPlan,install:renderInstallStage,sheet:renderSheet,drives:renderDrives,board:renderBoard,personnel:renderPersonnel})[SEC](sc,bd); } refreshNav(sc); };

function playDrawer(sc,pk,pinId){
  const p=playOf(sc,pk); if(!p) return;
  /* a drawer is a place you went, so back closes it instead of leaving */
  navPush();
  const note=noteOf(sc,pk), cases=allCases(sc), pins=pinsFor(sc,pk), locked=!p.taught;
  const chips=cases.map(c=>`<button class="mbb-chip${pins.includes(c.id)?' on':''}" style="--sc:${c.c}" data-pin="${esc(c.id)}">${esc(c.label)}</button>`).join('');
  drawer(`<div class="dr-eye" style="color:color-mix(in srgb,var(--sk-blue) 80%,#000)">${isStar(p)?'&#9819; ':''}${esc(p.name)}</div>
    <div class="dr-int">${esc(p.formation||'')}${p.subtype?' · '+esc(p.subtype):''}${p.books?' · run by '+p.books+' playbooks':''}</div>
    ${artHTML(sc,p,'dr-art')}
    ${p.whenToUse?`<div class="dr-lab">When to call it</div><p class="dr-p">${esc(p.whenToUse)}</p>`:''}
    ${(p.reads||[]).length?`<div class="dr-lab">The reads</div>${p.reads.map((r,i)=>`<div class="rd"><i>${i+1}</i><div><b>${esc(r.label)}</b><p>${esc(r.text)}</p></div></div>`).join('')}`:''}
    <div class="dr-lab">Pinned under</div><div class="mbb-chips">${chips}</div>
    <div class="dr-lab">Your note</div><textarea class="note" id="dr-note" maxlength="500" placeholder="the stuff you learn the hard way">${esc(note)}</textarea>
    <div class="dr-acts"><button class="skb gold sm" data-savenote="1">Save note</button>
      ${locked?'':`<button class="skb sm" data-goinstall="1">Open in the install</button>`}
      ${pinId?`<button class="skb red sm" data-unpin="${esc(pinId)}">Take it down</button>`:''}</div>`,
    e=>{
      const pn=e.target.closest('[data-pin]'); if(pn){ pinToggle(sc,pk,pn.dataset.pin); pn.classList.toggle('on'); if(SEC==='board'||SEC==='install') refreshView(sc); else buildRail(); return; }
      if(e.target.closest('[data-savenote]')){ planOf(sc).notes[pk]=$('#dr-note').value; savePlan(sc); drawerClose(); toast('Note saved'); refreshView(sc); return; }
      const un=e.target.closest('[data-unpin]'); if(un){ pinRemove(sc,un.dataset.unpin); drawerClose(); refreshView(sc); return; }
      if(e.target.closest('[data-goinstall]')){ drawerClose(); closeAll();
        const ci=pillarsOf(sc).findIndex(x=>x.plays.includes(pk)), st=ci>=0?1+pillarsOf(sc)[ci].plays.indexOf(pk):0;
        goStop(sc,Math.max(0,ci),st,0); SEC='install'; buildRail(); render(); scrollTo(0,0); return; }
    });
}
function caseDrawer(sc,caseId){
  const col=allCases(sc).find(c=>c.id===caseId); if(!col) return;
  const custom=planOf(sc).cases.some(c=>c.id===caseId), b=planOf(sc).board;
  const row=(p)=>{ const on=b.pins.some(x=>x.pk===p.id&&x.caseId===caseId);
    return `<button class="dr-pick${on?' on':''}" data-toggle="${esc(p.id)}">${artHTML(sc,p,'')}
      <span><b>${esc(p.name)}</b><i>${esc(p.formation||'')}</i></span><u>${on?'&#10003;':'+'}</u></button>`; };
  drawer(`<div class="dr-eye" style="color:${col.c}">${esc(col.label)}</div>
    <div class="dr-int">When they do this, what do you go to? Tap a play to pin it up here.</div>
    <div class="dr-list">${sc.plays.slice().sort((a,c)=>a.order-c.order).map(row).join('')}</div>
    ${custom?`<div class="dr-acts"><button class="skb red sm" data-delcase="1">&times; Close this case</button></div>`:''}`,
    e=>{
      const t=e.target.closest('[data-toggle]'); if(t){ pinToggle(sc,t.dataset.toggle,caseId); caseDrawer(sc,caseId); refreshView(sc); return; }
      if(e.target.closest('[data-delcase]')){ const plan=planOf(sc); plan.cases=plan.cases.filter(c=>c.id!==caseId);
        plan.board.pins=plan.board.pins.filter(p=>p.caseId!==caseId); delete plan.board.cases[caseId]; savePlan(sc); drawerClose(); refreshView(sc); return; }
    });
}
function newCaseDrawer(sc){
  drawer(`<div class="dr-eye">Open a Case</div>
    <div class="dr-int">Name the problem. "Cover 3 shells." "The guy who QB spies all game." Then pin your answers under it.</div>
    <div class="dr-free"><input id="dr-case" maxlength="32" placeholder="what are they doing to you?"><button data-go="1">&#10003;</button></div>`,
    e=>{ if(e.target.closest('[data-go]')) commit(); });
  const commit=()=>{ const v=String($('#dr-case').value||'').trim(); if(!v) return; const plan=planOf(sc);
    plan.cases.push({ id:'cs'+Date.now().toString(36), label:v.slice(0,32), c:CASE_COLORS[plan.cases.length%CASE_COLORS.length] });
    savePlan(sc); drawerClose(); refreshView(sc); toast('Case opened'); };
  const inp=$('#dr-case'); inp.addEventListener('keydown',e=>{ if(e.key==='Enter') commit(); }); setTimeout(()=>inp.focus(),60);
}
function formationDrawer(sc,name){
  const f=(sc.formations||[]).find(x=>slug(x.name)===slug(name)); if(!f){ toast(name); return; }
  const plays=(f.tags||[]).map(t=>sc.plays.find(p=>slug(p.name)===slug(t))).filter(Boolean);
  drawer(`<div class="dr-eye" style="color:#4a5568">${esc(f.name)}</div>
    ${f.img?`<img class="dr-art" src="${esc(f.img)}" alt="">`:''}
    <p class="dr-p">${esc(f.desc||'')}</p>
    ${(f.bullets||[]).length?`<ul class="dr-bul">${f.bullets.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}
    ${plays.length?`<div class="dr-lab">Runs out of it</div><div class="dr-tags">${plays.map(p=>`<button data-p="${esc(p.id)}">${esc(p.name)}</button>`).join('')}</div>`:''}`,
    e=>{ const b=e.target.closest('[data-p]'); if(b) playDrawer(sc,b.dataset.p); });
}

/* =====================================================================
   PERSONNEL · the film session, generated: position groups down the side,
   the standee, the scouting report, the non-negotiables, the role models
   ===================================================================== */
/* a non-negotiable, and the plays in this book that lean on it. The tags do
   the matching; the role's featured calls are the fallback. */
const WANT_TAGS={
  'speed':['vertical-shot','bomb','option-run','screen'],'top speed':['bomb','vertical-shot','option-run'],'deep speed':['bomb','vertical-shot'],
  'acceleration':['run-play','screen','option-run'],'agility':['screen','option-run','money-play'],'open field vision':['screen','run-play'],
  'throw on the run':['play-action','vs-all-zone'],'short accuracy':['rpo','screen','third-down'],'soft hands':['screen','play-action'],
  'ball skills':['vs-man','bomb','red-zone'],'release':['vs-man','third-down'],
};
function wantPlays(sc,want,role){
  const tags=WANT_TAGS[String(want||'').toLowerCase()]||[];
  const hits=sc.plays.filter(p=>(p.tags||[]).some(t=>tags.includes(t))).sort((a,b)=>a.order-b.order);
  const feat=(role.plays||[]).map(id=>playOf(sc,id)).filter(Boolean);
  /* the whole list, uncapped: the count on the card has to be a real number */
  const out=[]; for(const p of [...feat,...hits]) if(!out.some(x=>x.id===p.id)) out.push(p);
  return out;
}
const POS_OF={qb:'Quarterback',rb:'Running Back',slot:'Slot receiver',x:'X receiver',te:'Tight end',ol:'Offensive line'};
const POS_SHORT={qb:'QB',rb:'HB',slot:'SLOT',x:'X',te:'TE',ol:'OL'};

/* One card per role, four across, all of them the same shape so they read at
   a glance. The only number on a card is a real one: how many calls in this
   book lean on that trait. The writing lives in the drawer. */
function renderPersonnel(sc,body){
  const P=sc.personnel||{}, players=P.players||[], roles=P.roles||{};
  if(!players.length){ body.innerHTML=viewHead('Personnel','who runs it')+'<div class="sk-empty">No personnel authored for this scheme yet.</div>'; return; }
  const card=(pl,i)=>{
    const r=roles[pl.roleRef]||{}, call=(r.plays||[]).map(id=>playOf(sc,id)).filter(Boolean)[0];
    const trs=(r.wants||[]).map((w,k)=>{ const n=wantPlays(sc,w[0],r).length;
      return `<span class="role-t${k?'':' lead'}"><b>${esc(w[0])}</b>${k?'':`<i>must have</i>`}${n?`<u>${n}</u>`:''}</span>`; }).join('');
    const lin=(pl.lineage||[]).map(c=>{ const lg=teamLogo(c.team);
      return `<span class="role-ln">${lg?`<img src="${esc(lg)}" alt="">`:'<span></span>'}<b>${esc(c.name)}</b><i>${esc(c.era||'')}</i></span>`; }).join('');
    return `<div class="role" data-role="${esc(pl.roleRef)}" role="button" tabindex="0">
      <div class="role-h"><span class="role-rk">${i+1}</span>
        <span class="role-pos">${esc(POS_SHORT[pl.roleRef]||pl.roleRef)}</span>
        <span class="role-nm">${esc(r.role||pl.name)}</span>
        <span class="role-who">In this ${SIDEWORD(sc)} <b>${esc(pl.name)}</b></span></div>
      ${(r.jobs||[]).length?`<div class="role-s"><span class="role-l">The job</span><span class="role-job">${esc(r.jobs[0])}</span></div>`:''}
      ${trs?`<div class="role-s"><span class="role-l">Non negotiables <em style="font-style:normal;opacity:.7">· calls that lean on it</em></span><div class="role-tr">${trs}</div></div>`:''}
      ${lin?`<div class="role-s"><span class="role-l">Built like</span><div class="role-lin">${lin}</div></div>`:''}
      ${call?`<div class="role-call">${artHTML(sc,call,'')}
        <div><b>${esc(call.name)}</b><i>${esc(call.formation||'')}</i></div><u>&rarr;</u></div>`:''}
    </div>`; };
  body.innerHTML=viewHead('Personnel',`${players.length} roles · the offense is the same in all three books`)
    +`<div class="roles">${players.map(card).join('')}</div>`;
  const open=(k)=>{ const i=players.findIndex(x=>x.roleRef===k); if(i>=0){ PERS_I=i; roleModal(sc,i); } };
  body.onclick=e=>{ const c=e.target.closest('[data-role]'); if(c) open(c.dataset.role); };
  body.onkeydown=e=>{ if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-role]')){ e.preventDefault(); open(e.target.dataset.role); } };
}
/* ---- the takeover: a card opens over the blurred room ---- */
function modalEnsure(){
  let el=$('#skmodal'); if(el) return el;
  el=document.createElement('div'); el.id='skmodal';
  el.innerHTML=`<div class="mo-scrim" data-moclose="1"></div><div class="mo-sheet" id="mo-sheet"></div>
    <button class="mo-x" data-moclose="1" aria-label="Close">&times;</button>`;
  document.body.appendChild(el);
  el.addEventListener('click',e=>{ if(e.target.closest('[data-moclose]')) modalClose(); });
  return el;
}
function modal(html,onClick){
  const el=modalEnsure(), sheet=$('#mo-sheet');
  sheet.innerHTML=html;
  sheet.onclick=onClick||null; sheet.scrollTop=0;
  el.classList.add('open'); document.body.style.overflow='hidden';
}
function modalClose(){ const el=$('#skmodal'); if(el){ el.classList.remove('open'); $('#mo-sheet').innerHTML=''; } document.body.style.overflow=''; }
const modalOpen=()=>!!$('#skmodal.open');

/* the role, full screen: the identity column, then what we want, the non
   negotiables as real counts, the role models, the featured call */
function roleModal(sc,i){
  const players=(sc.personnel&&sc.personnel.players)||[], roles=(sc.personnel&&sc.personnel.roles)||{};
  const pl=players[i]; if(!pl) return;
  const r=roles[pl.roleRef]||{};
  const call=(r.plays||[]).map(id=>playOf(sc,id)).filter(Boolean)[0];
  const traits=(r.wants||[]).map(w=>({name:w[0],note:w[1]||'',plays:wantPlays(sc,w[0],r)}));
  /* the headline number: every call in this book that touches one of the
     role's traits, counted once */
  const reach=new Set(); traits.forEach(t=>t.plays.forEach(p=>reach.add(p.id)));
  const tiles=traits.map((t,k)=>`<div class="mo-tile${k?'':' lead'}"><u>${esc(t.name)}</u><b>${t.plays.length}</b><i>${k?'calls lean on it':'the non negotiable'}</i></div>`).join('');
  const chips=traits.filter(t=>t.plays.length).map(t=>`<div class="mo-chips"><u>${esc(t.name)}</u>${
    t.plays.slice(0,7).map(p=>`<button data-p="${esc(p.id)}">${esc(p.name)}</button>`).join('')}${
    t.plays.length>7?`<u>+${t.plays.length-7} more</u>`:''}</div>`).join('');
  const models=(pl.lineage||[]).map(c=>{ const lg=teamLogo(c.team);
    return `<div class="mo-model"><div class="mo-model-h">${lg?`<img src="${esc(lg)}" alt="">`:''}
        <div><b>${esc(c.name)}</b><i>${esc(c.team||'')}${c.era?' · '+esc(c.era):''}</i></div></div>
      <div class="mo-model-s">${(c.stats||[]).map(s=>`<span>${esc(s)}</span>`).join('')}</div>
      ${c.brought?`<p>${esc(c.brought)}</p>`:''}</div>`; }).join('');
  const vital=(l,v)=>`<div class="mo-v"><u>${l}</u><b>${esc(v)}</b></div>`;
  modal(`<div class="mo-id">
      <div class="mo-arch"><b>${esc(POS_SHORT[pl.roleRef]||'?')}</b></div>
      <div class="mo-plate"><b>${esc(r.role||pl.name)}</b></div>
      <div class="mo-sub"><span>${esc(POS_OF[pl.roleRef]||'')}</span><i>Role ${i+1} of ${players.length}</i></div>
      <div class="mo-ovr"><b>${reach.size}</b><u>Calls</u></div>
      <div class="mo-vitals">
        ${vital('In this offense',pl.name)}
        ${vital('Position',POS_OF[pl.roleRef]||'')}
        ${traits[0]?vital('Non negotiable',traits[0].name):''}
        ${call?vital('Featured call',call.name):''}
        ${call&&call.books?vital('Books that run it',call.books):''}
        ${vital('Built like',(pl.lineage||[]).length+' role models')}
      </div></div>
    <div class="mo-body">
      ${(r.jobs||[]).length?`<div class="mo-sec"><div class="mo-h">What we want</div>
        <div class="mo-jobs">${r.jobs.map((j,k)=>`<div class="mo-job${k?'':' lead'}"><i>${k+1}</i>${esc(j)}</div>`).join('')}</div></div>`:''}
      ${tiles?`<div class="mo-sec"><div class="mo-h">The non negotiables</div><div class="mo-tiles">${tiles}</div>${chips}</div>`:''}
      ${call?`<div class="mo-sec"><div class="mo-h">The featured call</div>
        <div class="mo-call">${artHTML(sc,call,'')}
          <div><b>${esc(call.name)}</b><i>${esc(call.formation||'')}${call.books?' · '+call.books+' books run it':''}</i>
            <button class="skb gold sm" data-p="${esc(call.id)}">Open the play &rarr;</button></div></div></div>`:''}
      ${models?`<div class="mo-sec"><div class="mo-h">Built like</div><div class="mo-models">${models}</div></div>`:''}
    </div>`,
    e=>{ const b=e.target.closest('[data-p]'); if(b){ modalClose(); playDrawer(sc,b.dataset.p); } });
}

/* everything the scheme section needs is defined, so the page can boot now.
   index.html no longer calls boot() itself: render() reaches into
   renderInstall(), so this file has to be in memory before the first paint. */
boot();
