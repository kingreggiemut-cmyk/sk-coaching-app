/* sk-app.js — the database page: rails, search, the book and formation grids,
   the map, and the play popup. SHARED BY EVERY DATABASE PAGE. It reads
   `SK_SIDE` (set by the page before this loads) to decide which side of the
   ball it is showing, and it expects sk-cards.js to have been loaded first.

   Extracted from index.html on 2026-09-03, line for line apart from the two
   changes noted at SIDE and at the #sidebox handler. */
'use strict';
const $ = (s) => document.querySelector(s);

let LIVEBOOKS = [], CONF = null;
/* the installs, and which one is open */
let SCHEMES = null, INSTALL = 0, SCHEME = null, SEC = 'install';
const PAGE = 200; let SHOWN = PAGE; let SORT = 'az';
 let FAMPICK = null, CONCEPT = null, SIDE = (typeof SK_SIDE !== 'undefined' ? SK_SIDE : 'O');
let IDX = null, VIEW = (window.SK_SIDE==='D') ? 'schemes' : 'books', FAM = null, SET = null, TYPE = 'all', Q = '', BOOK = null;
const CARDS = new Map();                    // setKey -> geometry
const SAVED = new Set(JSON.parse(localStorage.getItem('sk_saved') || '[]'));
const saveStars = () => { try { localStorage.setItem('sk_saved', JSON.stringify([...SAVED])); localStorage.setItem('sk_saved_meta', JSON.stringify(SAVEDMETA)); } catch(e){} };
/* a star remembers where it was pressed (the playbook open at the time) and when, so Saved can group by them */
let SAVEDMETA = {}; try { SAVEDMETA = JSON.parse(localStorage.getItem('sk_saved_meta') || '{}') || {}; } catch(e){ SAVEDMETA = {}; }
let SAVEDBY = 'book'; try { SAVEDBY = localStorage.getItem('sk_savedby') || 'book'; } catch(e){}
const starAdd = (k) => { SAVED.add(k); SAVEDMETA[k] = { book: (typeof BOOK !== 'undefined' && BOOK) || null, t: Date.now() };
  if (skOnline()) SKDB.stars.set(k, true, SAVEDMETA[k].book); else if (!SK_ASKED) { SK_ASKED = true; skRequireLogin('save plays to your account'); } };
const starDrop = (k) => { SAVED.delete(k); delete SAVEDMETA[k]; if (skOnline()) SKDB.stars.set(k, false); };
/* THE ACCOUNT. Signed in, the stars live on it: what the account has comes
   down and joins the browser's, what the browser had goes up. Signed out,
   the first star asks once and keeps working in the browser either way. */
let SK_ASKED = false;
const skOnline = () => typeof SKDB !== 'undefined' && SKDB.ok();
async function skPullStars(){
  const rows = await SKDB.stars.load(); if (!rows) return;
  const remote = new Set(rows.map(r => r.slug));
  for (const r of rows) { SAVED.add(r.slug); if (!SAVEDMETA[r.slug]) SAVEDMETA[r.slug] = { book: r.book || null, t: Date.parse(r.created_at) || Date.now() }; }
  for (const k of [...SAVED]) if (!remote.has(k)) SKDB.stars.set(k, true, (SAVEDMETA[k] || {}).book || null);
  saveStars();
  document.querySelectorAll('[data-star]').forEach(b => b.classList.toggle('on', SAVED.has(b.dataset.star)));
  if (VIEW === 'saved') render();
}
document.addEventListener('sk-auth', (e) => { if (e.detail && e.detail.signedIn) skPullStars(); });


/* ---------------- data ---------------- */
/* ---------------- formation diagrams ----------------
   One 121 KB file covers all 452 formations, so alignment draws instantly on
   every badge with no per-set fetch. Skill players are discs, linemen are the
   short bars the game uses, the QB is the lone white dot. */
let FORMS=null, SETNAMES=null;
/* THE GAME'S ORDER. Inside a book the game lists formations and plays in a
   fixed order (SMU: Doubles Offset, Stack Y Off, Doubles Offset Wk … Empty
   Quads last; inside 5WR: Switch Shallow Cross, QB Draw, Scissors …), and a
   viewer with the game open wants to match card to card. book-order.json
   (build-book-order.js) holds each book's PlayIDs in that order; with a
   book open the library sorts by it and shows three to a row, as the game
   does. */
let ORDER=null; const ORDERMAP=new Map();
/* book-order.json comes down with the play index, in ensureIndex() */
function rankOf(p){ if(!ORDER||!BOOK||!ORDER[BOOK]) return Infinity;
  let m=ORDERMAP.get(BOOK); if(!m){ m=new Map(); (ORDER[BOOK].ids||[]).forEach((id,i)=>{ if(!m.has(String(id))) m.set(String(id),i); }); ORDERMAP.set(BOOK,m); }
  const r=m.get(String(p.pid)); return r===undefined?Infinity:r; }
const inGameOrder=(list)=>list.slice().sort((a,b)=>rankOf(a)-rankOf(b)||a.name.localeCompare(b.name));
/* the book's own words: "Cross Z Dig" is SMU's name for the record's "Y
   Cross", and a set can carry the book's label too */
const bookPlayName=(p)=>{ const o=ORDER&&BOOK&&ORDER[BOOK]; return (o&&o.names&&o.names[String(p.pid)])||p.name; };
const bookSetName=(f,s)=>{ const o=ORDER&&BOOK&&ORDER[BOOK]; return (o&&o.sets&&o.sets[f+'||'+s])||shownSet(f,s); };
/* the name the game shows for a set, where it differs from the file's name */
const shownSet=(family,set)=>{ const n=SETNAMES&&SETNAMES[slug(family)+'__'+slug(set)]; return n||set; };
/* every playbook that carries a formation, most plays first */
function booksWithSet(family,set){
  const keys=new Set();
  for(const p of IDX.plays){ if(p.family!==family||p.set!==set||p.side!==SIDE||p.drill) continue;
    for(const b of p.books||[]) keys.add(b); }
  return [...keys].map(k=>IDX.books.find(b=>b.key===k)).filter(Boolean)
    .sort((a,b)=>a.team.localeCompare(b.team));
}

/* Formations with no alignment data in the geometry dump used to render as an
   empty field box, which reads as broken rather than as missing. */
function fdiag(shape, cls){
  return (shape&&shape.length)
    ? `<span class="${cls}">${drawFormation(shape)}</span>`
    : `<span class="${cls} none">no alignment data</span>`;
}

/* One aligned board for every play list in the Playbooks section. The header
   and the rows read the same --cols track list, so a column can never drift
   from its label. rows: {shape,name,where,types[],kind,num,attr}. */
function board(rows, heads){
  const cell=(cls,html)=>`<span class="${cls}">${html}</span>`;
  return `<div class="board">
    <div class="bhead">
      ${cell('c-shape','')}
      ${heads.slice(1,3).map((h,i)=>cell(i?'c-where':'c-name',esc(h))).join('')}
      ${cell('c-type',esc(heads[3]))}${cell('c-kind',esc(heads[4]))}
      ${cell('c-num num',esc(heads[5]))}
    </div>
    ${rows.map(r=>`<button class="brow" ${r.attr}>
      <span class="hshape c-shape${r.shape&&r.shape.length?'':' none'}">${
        r.shape&&r.shape.length?drawFormation(r.shape):'no art'}</span>
      <span class="hnm c-name">${esc(r.name)}</span>
      <span class="hfam c-where">${esc(r.where||'')}</span>
      <span class="htags c-type">${(r.types||[]).map(t=>
        `<i class="t-${esc(t)}">${esc(t).toUpperCase()}</i>`).join('')}</span>
      <span class="htags c-kind">${r.kind?`<i>${esc(r.kind).toUpperCase()}</i>`:''}</span>
      <span class="hbooks c-num">${r.num}</span>
    </button>`).join('')}
  </div>`;
}

/* The shipped index is compacted (compact-index.js): playbook keys and tags
   are indexes into two shared lists and the slug is left off, because writing
   them out in full cost nearly two megabytes on every load. Put them back
   before anything reads a play. */
function expandIndex(ix){
  if(!ix||!ix.compact) return ix;
  const bk=ix.bookKeys||[], tg=ix.tagList||[];
  for(const p of ix.plays){
    p.books=(p.b||[]).map(i=>bk[i]); delete p.b;
    p.tags=(p.g||[]).map(i=>tg[i]); delete p.g;
    if(ix.slugFromName) p.slug=`${slug(p.name)}-${slug(p.family)}-${slug(p.set)}`;
    if(p.drill===undefined) p.drill=0;
    if(p.kind===undefined) p.kind='';
  }
  return ix;
}
let IDXP=null, LIBN=null;
/* THE LIBRARY LOADS WHEN IT IS LOOKED AT. The play index (2.3 MB raw) and
   the book order only come down the first time a library view renders; the
   home reads the library's counts from schemes/index.json instead. */
async function ensureIndex(){
  if(IDX) return IDX; if(IDXP) return IDXP;
  IDXP=(async()=>{
    IDX = expandIndex(await (await fetch('play-index.json')).json());
    LIVEBOOKS = IDX.books.filter(b=>!b.drill&&b.plays>0);
    /* a defensive book shares its team's name, so key on sideCode */
    for(const p of IDX.plays) p._s = (p.name+' '+p.family+' '+p.set+' '+p.kind).toLowerCase();
    const live = IDX.plays.filter(p=>!p.drill).length;
    $('#live').innerHTML = `<i>LIBRARY</i><b>${live.toLocaleString()}</b><u>${LIVEBOOKS.length} playbooks</u>`;
    $('#q').placeholder = `Search ${live.toLocaleString()} plays, every playbook and formation — mesh, alabama, trips…`;
    fetch('book-order.json').then(r=>r.ok?r.json():null).then(j=>{ ORDER=j; if(VIEW!=='books') render(); }).catch(()=>{});
    return IDX; })();
  return IDXP;
}
/* A SCHEME IN THE INDEX IS LIGHT (the name, the polaroid, the counts). The
   whole scheme is fetched only when it opens in here. */
async function ensureScheme(k){ const s=(SCHEMES||[]).find(x=>x.key===k); if(!s) return null;
  if(!s.plays){ try{ Object.assign(s, await (await fetch('schemes/'+encodeURIComponent(k)+'.json')).json()); }catch(e){} } return s; }
async function boot(){
  const [forms, names, idx] = await Promise.all([
    fetch('formations.json').then(r=>r.json()).catch(()=>({})),
    fetch('formation-names.json').then(r=>r.json()).catch(()=>({})),
    fetch('schemes/index.json').then(r=>r.json()).catch(()=>({schemes:[],library:null}))]);
  FORMS=forms; SETNAMES=names; SCHEMES=idx.schemes||[]; LIBN=idx.library||null;
  if(LIBN){ $('#live').innerHTML = `<i>LIBRARY</i><b>${LIBN.plays.toLocaleString()}</b><u>${LIBN.books} playbooks</u>`;
    $('#q').placeholder = `Search ${LIBN.plays.toLocaleString()} plays, every playbook and formation — mesh, alabama, trips…`; }
  /* the new scheme page (scheme.html) keeps drives and the board here until
     they are re-housed, and lands on them by ?scheme=<key>&sec=<section> */
  { const q=new URLSearchParams(location.search), k=q.get('scheme');
    if(k&&SCHEMES.some(s=>s.key===k)){ await ensureScheme(k); VIEW='schemes'; SCHEME=k; SEC=q.get('sec')||'home'; } }
  if(sectionOf(VIEW)!=='schemes'||SCHEME) await ensureIndex();
  buildRail(); render();
}
/* geometry for a list of plays that may span many formations */
async function mergedGeo(list){
  const sets=[...new Set(list.map(p=>p.family+'||'+p.set))];
  const parts=await Promise.all(sets.map(k=>{ const [f,s]=k.split('||'); return cardsFor(f,s); }));
  return Object.assign({},...parts);
}
async function cardsFor(family,set){
  const key = slug(family)+'__'+slug(set);
  if(CARDS.has(key)) return CARDS.get(key);
  try{
    const g = await (await fetch('cards/'+key+'.json')).json();
    CARDS.set(key,g); return g;
  }catch(e){ CARDS.set(key,{}); return {}; }
}

const families = () => {
  const m = new Map();
  for(const p of IDX.plays){ if(p.drill) continue;      // no minigame/drill families
    m.set(p.family,(m.get(p.family)||0)+1); }
  return [...m].sort((a,b)=>b[1]-a[1]);
};
/* minigame / tutorial / skeleton-drill content stays out of the library */
const pass = (p) => !p.drill && p.side===SIDE && (TYPE==='all'||p.type===TYPE)
  && (!Q||p._s.includes(Q)) && (VIEW!=='book' || !BOOK || p.books.includes(BOOK));
const bookOf = (k) => IDX.books.find(b=>b.key===k);

/* ---------------- chrome ----------------
   LEFT = big sections (the whole play database is ONE of them, like the
   tracker's Recruiting / Draft / Teams). RIGHT = views inside the open
   section, the way the tracker switches The Board / Class Report.        */
/* the offense has no schemes up yet (his call, 2026-09-09): its bar holds
   the playbooks and the saved plays only, and it lands on the playbooks */
const ALL_SECTIONS=[['schemes','SCHEMES','your installs'],
                ['library','PLAYBOOKS','the play database'],
                ['saved','SAVED','starred plays']];
const SECTIONS=(window.SK_SIDE==='D')?ALL_SECTIONS:ALL_SECTIONS.filter(([k])=>k!=='schemes');
const VIEWS={library:[['books','TEAM BOOKS','the playbooks'],
                      ['map','THE MAP','by geography'],
                      ['formations','FORMATIONS','by personnel'],
                      ['plays','ALL PLAYS','the full library']]};
/* FOUR PATHS, EACH ITS OWN. Team Books → a book ('book') → its formations →
   its plays. The Map → a book, the same. Formations on its own ('formations')
   is every look in the game with no book attached. All Plays is the whole
   library. A tab click always starts its own path from the top: no book,
   no formation, no concept carries over from another path. Search is a
   fifth, library-wide, and returns you to where you were when cleared. */
const sectionOf = (v) => (v==='books'||v==='formations'||v==='plays'||v==='map'||v==='book'||v==='search') ? 'library'
  : v==='schemes' ? 'schemes' : v;

function buildRail(){
  const sec=sectionOf(VIEW);
  $('#railnav').innerHTML = SECTIONS.map(([k,a,b])=>
    `<button class="nav${sec===k?' on':''}" data-s2="${k}"><b>${a}</b><span>${b}</span></button>`).join('');
  const goSec = e => { const b=e.target.closest('[data-s2]'); if(!b)return;
    const k=b.dataset.s2;
    VIEW = k==='library' ? 'books' : k;
    FAM=null; SET=null; BOOK=null; buildRail(); render(); };
  $('#railnav').onclick = goSec;
  /* the sections live in the bar as torn tabs; the picker owns the whole field */
  const tn=$('#topnav'); if(tn){ tn.innerHTML = SECTIONS.map(([k,a,b])=>`<button class="sktab${sec===k?' on':''}" data-s2="${k}"><b>${a.charAt(0)+a.slice(1).toLowerCase()}</b><span>${b}</span></button>`).join(''); tn.onclick = goSec; }
  document.body.classList.toggle('sk-pick', sec==='schemes' && !(typeof SCHEME!=='undefined' && SCHEME));

  const views=VIEWS[sec];
  $('#vrail').innerHTML = views
    ? `<span class="cap">View</span>`+views.map(([k,a,b])=>
        `<button class="vw${(VIEW===k||(VIEW==='book'&&k==='books'))?' on':''}" data-v="${k}">${a}<i>${b}</i></button>`).join('')
    : '';
  $('#vrail').onclick = e => { const b=e.target.closest('[data-v]'); if(!b)return;
    VIEW=b.dataset.v; BOOK=null; FAM=null; SET=null; CONCEPT=null; FAMPICK=null; SHOWN=PAGE;
    if(Q){ $('#q').value=''; Q=''; PRE=null; $('#qclear').hidden=true; }
    buildRail(); render(); };
  /* an open scheme owns both rails: scheme chips left, the plan's doors right */
  if(typeof schemeRail==='function') schemeRail(sec==='schemes');
}
function setTitle(a,b){ $('#ttl').textContent=a; $('#sub').textContent=b; }

/* the play-type chips mean nothing on the playbook grid; the conference
   switcher means nothing anywhere else. Show whichever fits the view. */
function buildBars(){
  if(!IDX) return; /* the bars belong to the library; the picker hides them and the library is not here yet */
  /* offence and defence do not share play types */
  const TYPES = SIDE==='D' ? ['Zone','Man','Blitz'] : ['Pass','Run','RPO'];
  $('#typebar').innerHTML = `<span class="lbl">${SIDE==='D'?'Coverage':'Play type'}</span>`
    + `<button class="chip${TYPE==='all'?' on':''}" data-t="all">All</button>`
    + TYPES.map(t=>`<button class="chip${TYPE===t?' on':''}" data-t="${t}">${t}</button>`).join('');
  /* conference chips belong to the two team-shaped views; the play-type chips
     belong to everything else */
  const teamView = VIEW==='books' || VIEW==='map';
  const schemeView = sectionOf(VIEW)==='schemes';
  /* play-type chips mean nothing on a playbook grid, a map, or an install */
  $('#typebar').style.display = (teamView||schemeView) ? 'none' : 'flex';
  /* the library search does not filter an install */
  $('#hunt').style.display = schemeView ? 'none' : 'flex';
  const sb=$('#sortbar');
  sb.style.display = VIEW==='plays' ? 'flex' : 'none';
  const cb=$('#confbar');
  cb.style.display = teamView ? 'flex' : 'none';
  if(!teamView) return;
  const live=IDX.books.filter(b=>b.plays>0&&!b.drill&&b.sideCode===SIDE);
  const have=new Set(live.map(b=>b.logo?(b.conf||'Independent'):'Scheme'));
  const keys=[...(IDX.conferences||[]).map(c=>c.key),'Scheme'].filter(k=>have.has(k));
  cb.innerHTML = `<span class="lbl">Conference</span>`
    + `<button class="chip${CONF?'':' on'}" data-c="">All</button>`
    + keys.map(k=>`<button class="chip${CONF===k?' on':''}" data-c="${esc(k)}">${esc(k==='Scheme'?'Scheme':k)}</button>`).join('');
  cb.onclick = e => { const c=e.target.closest('[data-c]'); if(!c)return;
    CONF=c.dataset.c||null; render(); };
}

function render(){
  const tabs=$('#tabs'), main=$('#main');
  /* a library view before the library is here: fetch it, then come back */
  if((sectionOf(VIEW)!=='schemes'||SCHEME)&&!IDX){ main.innerHTML='<div class="sk-empty">Loading the library&hellip;</div>'; ensureIndex().then(()=>render()); return; }
  buildBars();
  /* the formation's playbook list belongs to one screen only */
  if(!((VIEW==='formations'||VIEW==='book')&&FAM&&SET)) $('#railbooks').innerHTML='';

  if(VIEW==='books'){
    setTitle('PLAYBOOKS','every team in the game');
    tabs.style.display='none'; tabs.innerHTML='';
    const live=IDX.books.filter(b=>b.plays>0&&!b.drill&&b.sideCode===SIDE);
    const q=Q?b=>(b.team+' '+b.nick+' '+(b.identity||'')).toLowerCase().includes(Q):()=>true;
    const card=b=>{
      const s=b.split||{}; const keys=Object.keys(s);
      const tot=keys.reduce((a,k)=>a+s[k],0)||1;
      const pct=n=>(n/tot*100).toFixed(1)+'%';
      const c1=b.c1||'#2a3a52', c2=b.c2||'#131c29';
      const g=b.grades||{};
      const dims=IDX.gradeDims||[];
      return `<button class="book" data-b="${b.key}"
          style="background:linear-gradient(150deg,${c1} 0%,${c1} 52%,${c2} 210%)">
        <span class="plate"><span class="bt">${esc(b.team)}</span>
          <span class="bp">${b.plays}<u>PLAYS</u></span></span>
        <span class="well">
          ${b.conf?`<span class="conftag">${esc(b.conf)}</span>`:''}
          <span class="arch">${b.logo?`<img src="logos/${b.logo}.png" alt="" loading="lazy">`
                  :`<span class="glyph">${esc(b.team[0])}</span>`}</span>
        </span>
        <span class="idplate"><u>RUNS AS</u><b>${esc(b.identity||'Multiple')}</b></span>
        ${b.best?`<span class="best"><em>Best in the country for</em><b>${esc(b.best.label)}</b>
          <em>#${b.best.rank}</em></span>`:''}
        <span class="chips">${(SIDE==='D' ? [] : dims).map(d=>
          `<span class="cchip"><b>${esc(g[d.key]||'—')}</b><u>${esc(d.label)}</u></span>`).join('')}${SIDE==='D'?keys.map(k=>`<span class="cchip"><b>${s[k]}</b><u>${k.toUpperCase()}</u></span>`).join('')+`<span class="cchip"><b>${b.sets}</b><u>FRONTS</u></span>`:''}
        </span>
        <span class="bar3">${keys.map((k,i)=>`<span class="${['p','r','o'][i]||'p'}" style="width:${pct(s[k])}"></span>`).join('')}</span>
        <span class="mixline">${keys.map(k=>`<span>${s[k]} ${k.toLowerCase()}</span>`).join('')}<span>${b.sets} sets</span></span>
      </button>`;
    };

    /* ALL still groups by conference; a conference chip narrows to one */
    const order=[...(IDX.conferences||[]).map(c=>c.key),'Scheme'];
    const meta=k=>(IDX.conferences||[]).find(c=>c.key===k)||{label:'Scheme Playbooks',color:'#4a4f57'};
    const groups=new Map();
    for(const b of live.filter(q)){
      const k=b.logo?(b.conf||'Independent'):'Scheme';
      if(!groups.has(k)) groups.set(k,[]);
      groups.get(k).push(b);
    }
    const shown=order.filter(k=>groups.has(k)&&(!CONF||CONF===k));
    main.innerHTML = shown.length ? shown.map(k=>{
      const m=meta(k), list=groups.get(k);
      const abbr=k==='Scheme'?'SK':(m.abbr||k.slice(0,3).toUpperCase());
      return `<section class="confwrap"><div class="confhd">
          <span class="confbadge" style="background:${m.color}">${abbr}</span>
          <span><span class="ct">${esc(k==='Scheme'?'Scheme Playbooks':k)}</span>
            <span class="cs">${esc(m.label)} · ${list.length} playbook${list.length===1?'':'s'}</span></span>
        </div><div class="books">${list.map(card).join('')}</div></section>`;
    }).join('') : `<div class="empty">No playbooks match.</div>`;
    main.onclick = e => { const b=e.target.closest('[data-b]'); if(!b)return;
      BOOK=b.dataset.b; VIEW='book'; FAM=null; SET=null; buildRail(); render(); };
    $('#foot').innerHTML = `<b>${live.length}</b> playbooks · conference alignment is authored, everything else is from the game`;
    return;
  }

  if(VIEW==='map'){ renderMap(); return; }
  if(VIEW==='search'){ renderSearch(); return; }

  if((VIEW==='formations'||VIEW==='book') && !FAM){
    const bk=(VIEW==='book'&&BOOK)?bookOf(BOOK):null;
    setTitle(bk?bk.team.toUpperCase():'FORMATIONS',
             bk?`${bk.plays} plays · ${bk.sets} sets`:'every look in the game');
    const groups=new Map();
    for(const p of IDX.plays){ if(!pass(p))continue;
      const k=p.family+'||'+p.set;
      if(!groups.has(k)) groups.set(k,{family:p.family,set:p.set,n:0,t:{},min:Infinity});
      const g=groups.get(k); g.n++; g.t[p.type]=(g.t[p.type]||0)+1; g.min=Math.min(g.min,rankOf(p)); }
    main.classList.toggle('inbook',!!bk);
    /* family tabs so you can jump straight to Gun instead of scrolling past it */
    const fcount=new Map();
    for(const g of groups.values()) fcount.set(g.family,(fcount.get(g.family)||0)+1);
    /* only families worth a jump target get a tab; the one- and two-set
       families still appear as sections under ALL */
    const fams=[...fcount].sort((a,b)=>b[1]-a[1]).filter(([,n])=>n>=5);
    tabs.style.display='flex';
    tabs.innerHTML=[['','ALL',groups.size],...fams.map(([f,n])=>[f,f.toUpperCase(),n])]
      .map(([k,a,n])=>`<button class="tab${(FAMPICK||'')===k?' on':''}" data-fp="${esc(k)}"><b>${a}</b><span>${n} sets</span></button>`).join('');
    tabs.onclick = e => { const b=e.target.closest('[data-fp]'); if(!b)return;
      FAMPICK=b.dataset.fp||null; render(); };
    /* inside a book, offer the way back out to the playbook grid */
    const top = bk ? `<div class="crumb"><button class="back" data-home="1">← Playbooks</button>
      <h2>${esc(bk.team)}</h2><em>${esc(bk.nick||'scheme playbook')}</em></div>` : '';
    /* badges carry the OPEN BOOK's colours — inside Alabama it should feel
       like Alabama, not like the neutral library */
    const c1=(bk&&bk.c1)||'#26364b', c2=(bk&&bk.c2)||'#131c29';
    const badge=g=>`
      <button class="fbadge" data-f="${esc(g.family)}" data-s="${esc(g.set)}"
        style="background:linear-gradient(152deg,${c1} 0%,${c1} 54%,${c2} 205%)">
        <span class="fplate">
          <em>${esc(g.family)}${bookSetName(g.family,g.set)!==g.set?` &middot; ${esc(g.set)} in the files`:''}</em>
          <span class="frow"><b>${esc(bookSetName(g.family,g.set))}</b>${
            personnelTag(FORMS&&FORMS[slug(g.family)+'__'+slug(g.set)])}</span>
          <i class="fn">${g.n} plays</i>
        </span>
        ${fdiag(FORMS&&FORMS[slug(g.family)+'__'+slug(g.set)],'fdiag')}
        <span class="ftapes">${['Pass','Run','RPO'].map(t=>
          `<span class="ftape"><b>${g.t[t]||0}</b><u>${t.toUpperCase()}</u></span>`).join('')}</span>
      </button>`;
    /* Grouped by family, A–Z inside. A flat grid sorted by play count made 440
       sets unscannable — Shotgun alone is 265 of them, so without the family
       break there is no way to find a set you can name. */
    const byFam=new Map();
    for(const g of groups.values()){ if(!byFam.has(g.family)) byFam.set(g.family,[]); byFam.get(g.family).push(g); }
    /* inside a book: the game's order, formations and families alike */
    const famMin=f=>Math.min(...byFam.get(f).map(g=>g.min));
    const famOrder=[...byFam.keys()].sort(bk ? (a,b)=>famMin(a)-famMin(b) : (a,b)=>byFam.get(b).length-byFam.get(a).length);
    const sections=famOrder.filter(f=>!FAMPICK||FAMPICK===f).map(f=>{
      const list=byFam.get(f).sort(bk ? (a,b)=>a.min-b.min||a.set.localeCompare(b.set) : (a,b)=>a.set.localeCompare(b.set));
      return `<section class="confwrap"><div class="confhd">
          <span class="confbadge" style="background:${c1}">${esc(f.slice(0,3).toUpperCase())}</span>
          <span><span class="ct">${esc(f)}</span>
            <span class="cs">${list.length} formation${list.length===1?'':'s'} · ${
              list.reduce((a,g)=>a+g.n,0)} plays</span></span>
        </div><div class="fgrid">${list.map(badge).join('')}</div></section>`;
    }).join('');
    main.innerHTML = top + (groups.size ? sections : `<div class="empty">No formations match.</div>`);
    main.onclick = e => {
      if(e.target.closest('[data-home]')){ BOOK=null; VIEW='books'; buildRail(); render(); return; }
      const b=e.target.closest('[data-s]'); if(!b)return;
      FAM=b.dataset.f; SET=b.dataset.s; render(); };
    const shownSets=[...groups.values()].filter(g=>!FAMPICK||g.family===FAMPICK);
    $('#foot').innerHTML = `<b>${shownSets.length}</b> formations · <b>${
      shownSets.reduce((a,g)=>a+g.n,0)}</b> plays`;
    return;
  }

  if((VIEW==='formations'||VIEW==='book') && FAM){ showCards(FAM,SET); return; }

  if(VIEW==='plays'){
    setTitle(Q?'SEARCH':'ALL PLAYS', Q?`“${Q}” across every playbook`:'the whole library, most-run first');
    /* 21 family chips was a wall of options and most held single digits.
       Keep the families people actually name; fold the tail into Other. */
    const fams=families();
    const MAIN=fams.filter(([,n])=>n>=180), TAIL=fams.filter(([,n])=>n<180);
    const tailTotal=TAIL.reduce((a,[,n])=>a+n,0);
    const liveTotal=fams.reduce((a,[,n])=>a+n,0);
    tabs.style.display='flex';
    tabs.innerHTML=[['','ALL',liveTotal],...MAIN.map(([f,n])=>[f,f.toUpperCase(),n]),
        ...(tailTotal?[['__tail','OTHER',tailTotal]]:[])]
      .map(([k,a,n])=>`<button class="tab${(FAM||'')===k?' on':''}" data-f="${esc(k)}"><b>${a}</b><span>${n}</span></button>`).join('');
    tabs.onclick = e => { const b=e.target.closest('[data-f]'); if(!b)return;
      FAM=b.dataset.f||null; SHOWN=PAGE; CONCEPT=null; render(); };

    const tailSet=new Set(TAIL.map(([f])=>f));
    const inFam=p=>!FAM||(FAM==='__tail'?tailSet.has(p.family):p.family===FAM);
    /* Kicking and Hail Mary sit in every book, so they are noise in a play
       browser — a search still finds them. */
    const SITU=/^(Special|Hail Mary)$/;
    const pool=IDX.plays.filter(p=>pass(p)&&inFam(p)&&(Q||!SITU.test(p.family)));

    /* ONE ROW PER PLAY, not per copy. The library holds 10,464 play instances
       but only 3,852 actual plays — "Inside Zone" alone occupied 160 rows, one
       for every formation it lives in. Collapsing by name turns a wall of
       duplicates into a browsable index; the formations sit one click in. */
    if(!CONCEPT){
      const byName=new Map();
      for(const p of pool){
        const k=p.name.toLowerCase();
        if(!byName.has(k)) byName.set(k,{name:p.name,key:k,inst:[],books:new Set(),types:new Set(),kinds:new Set()});
        const c=byName.get(k);
        c.inst.push(p); c.types.add(p.type); if(p.kind) c.kinds.add(p.kind);
        for(const b of p.books) c.books.add(b);
      }
      const all=[...byName.values()].sort(SORT==='books'
        ? (a,b)=>b.books.size-a.books.size||a.name.localeCompare(b.name)
        : (a,b)=>a.name.localeCompare(b.name)||b.books.size-a.books.size);
      const list=all.slice(0,SHOWN);
      main.innerHTML = list.length ? board(list.map(c=>({
          shape: FORMS&&FORMS[slug(c.inst[0].family)+'__'+slug(c.inst[0].set)],
          name: c.name,
          where: c.inst.length===1 ? c.inst[0].family+' · '+c.inst[0].set
                                   : c.inst.length+' formations',
          types: [...c.types],
          kind: c.kinds.size===1 ? [...c.kinds][0] : (c.kinds.size?c.kinds.size+' concepts':''),
          num: c.books.size,
          attr: `data-concept="${esc(c.key)}"`,
        })), ['Formation','Play','Runs out of','Type','Concept','Books'])
        + (all.length>list.length?`<button class="more" id="more">Show 200 more — ${all.length-list.length} left</button>`:'')
        : `<div class="empty">Nothing matches “${esc(Q)}”.<br><span style="font-size:12px">Try a concept — mesh, flood, sluggo — or a formation.</span></div>`;
      main.onclick = e => {
        if(e.target.closest('#more')){ SHOWN+=PAGE; render(); return; }
        const b=e.target.closest('[data-concept]'); if(!b)return;
        CONCEPT=b.dataset.concept; SHOWN=PAGE; render(); };
      $('#foot').innerHTML = `<b>${list.length}</b> of <b>${all.length}</b> plays${
        Q?` matching “${esc(Q)}”`:''} · ${SORT==='books'?'most playbooks first':'A–Z'}`;
      return;
    }

    /* one play open: every formation that runs it */
    const inst=pool.filter(p=>p.name.toLowerCase()===CONCEPT)
      .sort((a,b)=>b.books.length-a.books.length||a.family.localeCompare(b.family));
    const label=inst.length?inst[0].name:CONCEPT;
    setTitle(String(label).toUpperCase(), `${inst.length} formation${inst.length===1?'':'s'} run it`);
    main.innerHTML = `<div class="crumb"><button class="back" data-allplays="1">← All plays</button>
        <h2>${esc(label)}</h2><em>${inst.length} formations</em></div>`
      + board(inst.map(p=>({
          shape: FORMS&&FORMS[slug(p.family)+'__'+slug(p.set)],
          name: p.set, where: p.family,
          types: [p.type], kind: p.kind||'', num: p.books.length,
          attr: `data-f="${esc(p.family)}" data-s="${esc(p.set)}"`,
        })), ['Formation','Set','Family','Type','Concept','Books']);
    main.onclick = e => {
      if(e.target.closest('[data-allplays]')){ CONCEPT=null; SHOWN=PAGE; render(); return; }
      const b=e.target.closest('[data-s]'); if(!b)return;
      CONCEPT=null; VIEW='formations'; FAM=b.dataset.f; SET=b.dataset.s; buildRail(); render(); };
    $('#foot').innerHTML = `<b>${esc(label)}</b> appears in <b>${inst.length}</b> formations across <b>${
      new Set(inst.flatMap(p=>p.books)).size}</b> playbooks`;
    return;
  }

  if(VIEW==='saved'){
    setTitle('SAVED','starred plays');
    tabs.style.display='none'; tabs.innerHTML='';
    const list=IDX.plays.filter(p=>SAVED.has(p.slug)&&pass(p));
    if(!list.length){ main.innerHTML=`<div class="empty">No saved plays yet — star one from any formation.</div>`;
      $('#foot').textContent=''; return; }
    main.innerHTML=`<div class="empty">Drawing ${list.length} saved plays…</div>`;
    /* saved plays span formations — pull each one's geometry, then merge, then group */
    mergedGeo(list).then(geo => showSaved(list,geo));
    return;
  }

  if(VIEW==='schemes'){ renderInstall(); return; }

  /* unreachable in practice — every view above returns */
  tabs.style.display='none'; tabs.innerHTML='';
  main.innerHTML=`<div class="empty">Nothing here yet.</div>`;
  $('#foot').textContent='';
}

/* ---------------- the map ----------------
   School x/y and the state outlines are both projected onto the same
   975x610 Albers canvas, so the pins need no projection maths here. */
let USMAP=null;
async function renderMap(){
  const main=$('#main');
  setTitle('THE MAP', CONF ? CONF.toUpperCase()+' — where the books live' : 'every playbook, where it plays');
  $('#tabs').style.display='none'; $('#tabs').innerHTML='';
  if(!USMAP){
    main.innerHTML=`<div class="empty">Drawing the country…</div>`;
    try{ USMAP=await (await fetch('us-map.json')).json(); }
    catch(e){ main.innerHTML=`<div class="empty">Map outline missing.</div>`; return; }
  }
  const live=IDX.books.filter(b=>b.plays>0&&!b.drill&&b.loc&&b.sideCode===SIDE);
  const q=Q?b=>(b.team+' '+b.nick).toLowerCase().includes(Q):()=>true;
  const shown=live.filter(q);
  const lit=b=>!CONF||b.conf===CONF;          // conference chip highlights, never hides
  /* draw the dimmed ones first so highlighted crests sit on top */
  const order=[...shown].sort((a,b)=>(lit(a)?1:0)-(lit(b)?1:0));
  const pins=order.map(b=>{
    const on=lit(b), r=on?(CONF?21:16):11;
    return `<g class="pin${on?'':' off'}" data-b="${b.key}" transform="translate(${b.loc.x},${b.loc.y})">
      <title>${esc(b.team)} · ${b.plays} plays</title>
      <circle class="halo" r="${r+3}" fill="${b.c1||'#26364b'}"/>
      <circle class="disc" r="${r}" fill="#F4EBD6"/>
      <image href="logos/${b.logo}.png" x="${-r*0.74}" y="${-r*0.74}"
        width="${r*1.48}" height="${r*1.48}" preserveAspectRatio="xMidYMid meet"/>
    </g>`;
  }).join('');
  main.innerHTML=`<div class="mapwrap"><svg viewBox="0 0 ${USMAP.width} ${USMAP.height}" class="usmap">
      <g class="states">${USMAP.states.map(s=>`<path d="${s.d}"/>`).join('')}</g>
      ${pins}
    </svg></div>`;
  main.onclick=e=>{ const g=e.target.closest('[data-b]'); if(!g)return;
    BOOK=g.dataset.b; VIEW='book'; FAM=null; SET=null; buildRail(); render(); };
  $('#foot').innerHTML = CONF
    ? `<b>${shown.filter(lit).length}</b> ${esc(CONF)} playbooks lit · the rest of the country stays dimmed for context`
    : `<b>${shown.length}</b> playbooks placed · pick a conference to light it up`;
}

async function showCards(family,set){
  const main=$('#main'), tabs=$('#tabs');
  tabs.style.display='none'; tabs.innerHTML='';
  setTitle(String(set).toUpperCase(), String(family).replace(/_/g,' ')+' — formation');
  const list=inGameOrder(IDX.plays.filter(p=>p.family===family&&p.set===set&&pass(p)));
  main.classList.toggle('inbook',VIEW==='book'&&!!BOOK);
  main.innerHTML=`<div class="crumb"><button class="back">← Formations</button>
    <h2>${esc(set)}</h2><em>${esc(String(family).replace(/_/g,' '))}</em></div>
    <div class="empty">Drawing ${list.length} plays…</div>`;
  main.querySelector('.back').onclick=()=>{ FAM=null;SET=null;render(); };
  const geo=await cardsFor(family,set);
  showGrid(list,set,family,geo,true);
}

/* SAVED, ORGANISED. The stars are grouped: by the playbook they were
   pressed in (the first book that runs the play when it was starred from
   a formation), by formation, by play type, or newest first. */
function showSaved(list,geo){
  const main=$('#main');
  const meta=(p)=>SAVEDMETA[p.slug]||{};
  const bookKeyOf=(p)=>meta(p).book||(p.books&&p.books[0])||'';
  const groupOf=(p)=>SAVEDBY==='formation'?`${p.family} ${p.set}`:SAVEDBY==='type'?p.type:SAVEDBY==='recent'?'':bookKeyOf(p);
  const labelOf=(k,p)=>{ if(SAVEDBY==='book'){ const b=bookOf(k); return b?{t:b.team+(b.sideCode==='D'?' defense':''),logo:b.logo}:{t:k||'No playbook',logo:null}; }
    if(SAVEDBY==='formation') return {t:bookSetName(p.family,p.set),sub:String(p.family).replace(/_/g,' ')};
    if(SAVEDBY==='type') return {t:p.type+' plays'}; return {t:'Newest first'}; };
  const groups=new Map();
  const ordered=list.slice().sort((x,y)=>(meta(y).t||0)-(meta(x).t||0));
  for(const p of ordered){ const k=groupOf(p); if(!groups.has(k)) groups.set(k,{k,p,items:[]}); groups.get(k).items.push(p); }
  const card=(p)=>`
    <div class="card" data-slug="${p.slug}">
      <span class="plate">
        <span class="nm">${esc(bookPlayName(p)).toUpperCase()}</span>
        <span class="frm">${esc(p.family).replace(/_/g,' ')} ${esc(p.set)}</span>
      </span>
      <div class="fld">
        ${drawCard(geo?geo[p.slug]:null)}
        <span class="tag t-${p.type}">${p.type.toUpperCase()}</span>
        <span class="calls">${p.books.length} BOOKS${p.kind?' · '+esc(p.kind).toUpperCase():''}</span>
      </div>
      <button class="star${SAVED.has(p.slug)?' on':''}" data-star="${p.slug}">★</button>
    </div>`;
  const by=[['book','Playbook'],['formation','Formation'],['type','Play type'],['recent','Newest']];
  main.innerHTML=`<div class="svby"><span>Group by</span>${by.map(([k,l])=>`<button class="${SAVEDBY===k?'on':''}" data-svby="${k}">${l}</button>`).join('')}<u>${list.length} saved</u></div>`
    +[...groups.values()].map(g=>{ const lb=labelOf(g.k,g.p); return `<div class="svgrp"><h3 class="svh">${lb.logo?`<img src="logos/${esc(lb.logo)}.png" alt="" onerror="this.remove()">`:''}${esc(lb.t)}${lb.sub?`<u>${esc(lb.sub)}</u>`:''}<i>${g.items.length}</i></h3><div class="grid">${g.items.map(card).join('')}</div></div>`; }).join('');
  $('#railbooks').innerHTML=''; $('#foot').textContent='';
  main.onclick=e=>{
    const b=e.target.closest('[data-svby]'); if(b){ SAVEDBY=b.dataset.svby; try{ localStorage.setItem('sk_savedby',SAVEDBY); }catch(x){} showSaved(list,geo); return; }
    const s=e.target.closest('[data-star]');
    if(s){ const k=s.dataset.star; if(SAVED.has(k)){ starDrop(k); s.classList.remove('on'); } else { starAdd(k); s.classList.add('on'); } saveStars(); e.stopPropagation(); return; }
    const c=e.target.closest('[data-slug]');
    if(c) openPlay(list.find(p=>p.slug===c.dataset.slug), geo);
  };
}
function showGrid(list,set,family,geo,withCrumb){
  const main=$('#main');
  const cards=list.map(p=>`
    <div class="card" data-slug="${p.slug}">
      <span class="plate">
        <span class="nm">${esc(bookPlayName(p)).toUpperCase()}</span>
        <span class="frm">${esc(p.family).replace(/_/g,' ')} ${esc(p.set)}</span>
      </span>
      <div class="fld">
        ${drawCard(geo?geo[p.slug]:null)}
        <span class="tag t-${p.type}">${p.type.toUpperCase()}</span>
        <span class="calls">${p.books.length} BOOKS${p.kind?' · '+esc(p.kind).toUpperCase():''}</span>
      </div>
      <button class="star${SAVED.has(p.slug)?' on':''}" data-star="${p.slug}">★</button>
    </div>`).join('');
  const crumb = withCrumb ? `<div class="crumb"><button class="back">← Formations</button>
    <h2>${esc(bookSetName(family,set))}</h2><em>${esc(String(family).replace(/_/g,' '))}${bookSetName(family,set)!==set?` · ${esc(set)} in the files`:''}</em></div>` : '';
  main.innerHTML = crumb + `<div class="grid">${cards}</div>`;
  /* the playbooks that run this formation live under the section buttons in
     the left rail, so the plays stay squared off and centred */
  const rb=$('#railbooks');
  const bs=(family&&set)?booksWithSet(family,set):[];
  rb.innerHTML = bs.length
    ? `<div class="bookrail"><h4>${bs.length} playbook${bs.length===1?'':'s'} run this formation</h4>${bookButtons(bs)}</div>` : '';
  rb.onclick = e => { const g=e.target.closest('[data-gob]'); if(!g)return;
    BOOK=g.dataset.gob; VIEW='book'; FAM=family; SET=set; CONCEPT=null; FAMPICK=null;
    if(Q){ $('#q').value=''; Q=''; PRE=null; $('#qclear').hidden=true; }
    buildRail(); render(); };
  const back=main.querySelector('.back');
  if(back) back.onclick=()=>{ FAM=null;SET=null;render(); };
  main.onclick=e=>{
    /* the rail: open this same formation inside that playbook */
    const gb=e.target.closest('[data-gob]');
    if(gb){ BOOK=gb.dataset.gob; VIEW='book'; FAM=family; SET=set; CONCEPT=null; FAMPICK=null;
      if(Q){ $('#q').value=''; Q=''; PRE=null; $('#qclear').hidden=true; }
      buildRail(); render(); return; }
    const s=e.target.closest('[data-star]');
    if(s){ const k=s.dataset.star;
      if(SAVED.has(k)){starDrop(k);s.classList.remove('on');} else {starAdd(k);s.classList.add('on');}
      saveStars(); e.stopPropagation(); return; }
    const c=e.target.closest('[data-slug]');
    if(c) openPlay(list.find(p=>p.slug===c.dataset.slug), geo);
  };
  $('#foot').innerHTML = `<b>${list.length}</b> plays · art is placeholder, swapped for captures by slug`;
}

/* ---------------- a play, opened big ----------------
   The grid cards are thumbnails; the routes on them are not readable. Click
   one and the play fills the screen with everything the database knows about
   it: the formation it comes from, what kind of call it is, and which
   playbooks carry it. Escape or a click outside closes it. */
const BOOKNAME=(k)=>{ const b=IDX&&IDX.books&&IDX.books.find(x=>x.key===k); return b?b.team+(b.sideCode==='D'?' (D)':''):k; };
/* one rail of playbooks, used beside an open play and beside a formation */
const bookButtons=(books)=>books.map(b=>`<button class="bk${BOOK===b.key?' here':''}" data-gob="${esc(b.key)}">${
  b.logo?`<img src="logos/${b.logo}.png" alt="" loading="lazy">`:`<i class="gl">${esc(b.team[0])}</i>`
}<span>${esc(b.team)}${b.sideCode==='D'?' (D)':''}</span></button>`).join('');
/* WHAT IS WORTH SAYING ABOUT A PLAY. "1 route, 9 blocking" was true and
   useless: every play blocks with five or six and a run has no routes. These
   are the facts a coach reads off a card — who is in the pattern, how deep it
   gets, who pulls, whether anybody moves before the snap. */
function playFacts(p,g){
  const out=[];
  const sh=FORMS&&FORMS[slug(p.family)+'__'+slug(p.set)];
  if(sh&&sh.some(m=>m.p)){ const c={}; for(const m of sh) c[m.p]=(c[m.p]||0)+1;
    const rb=(c.RB||0)+(c.FB||0), te=c.TE||0;
    if(c.QB&&c.OL===5) out.push(`${rb}${te} personnel`); }
  if(!g){ out.push('no art yet'); return out; }
  const men=g.men||[], isRun=!!g.run;
  const pulls=men.filter(m=>m.pull).length;
  if(pulls) out.push(`${pulls} pulling`);
  if(isRun){
    const out2=men.filter(m=>m.b&&!m.pull&&m.rel&&Math.abs(m.x)>6).length;
    if(out2>=2) out.push(`${out2} blocking downfield`);
  } else {
    /* the pattern is the men actually running routes, and the ball carrier
       on a pass is the primary read, so he counts; on a run he is the runner
       and there is no pattern to count. */
    const routes=men.filter(m=>!m.b&&!m.qb&&((m.pts&&m.pts.length)||m.opt));
    if(routes.length) out.push(`${routes.length} in the pattern`);
    /* how deep it gets, as the card draws it: a streak is stored at fifty
       yards and drawn off the top, so it is called what it is. */
    const deep=Math.max(0,...routes.map(m=>Math.max(0,...(m.pts||[]).map(q=>m.y+q[1]))));
    if(deep>=DEPTH_MAX) out.push('verticals');
    else if(deep>=6) out.push(`${Math.round(deep)} yd deepest`);
    if(men.filter(m=>m.b&&m.rel&&!m.pull).length>=2) out.push('linemen release');
    const opt=men.filter(m=>m.opt&&!/^(RB|QB)_/.test(m.opt)).length;
    if(opt) out.push(`${opt} option route${opt===1?'':'s'}`);
  }
  if(men.some(m=>m.mot||m.mpath)) out.push('pre-snap motion');
  return out;
}
/* ---------------- run it, and change it ----------------
   hot-routes.json (build-hot-routes.js) carries the game's own 136 hot
   routes, each already resolved to real geometry, bucketed into the four
   positions the game itself names: outside receiver, slot, tight end, back. */
let HOTR=null;
async function hotRoutes(){
  if(HOTR) return HOTR;
  try{ HOTR=await (await fetch('hot-routes.json')).json(); }catch(e){ HOTR={routes:[],choices:[],menu:{}}; }
  HOTR.byKey=new Map(HOTR.routes.map(r=>[r.key,r]));
  HOTR.choiceBy=new Map((HOTR.choices||[]).map(c=>[c.key,c]));
  return HOTR;
}
/* THE DEFENSIVE MENU, and it is measured rather than shipped. The game has no
   defensive hot-route asset at all: all 136 HotRouteDefine records are
   offensive routes, and none of the six dumps carries a DefHotRoute, audible
   or coverage-adjust record. So def-adjust.json (build-def-adjust.js) is built
   from what the game actually asks each position to do across every defensive
   play, at the rate it asks: an end rushes on 90% of his snaps, a corner plays
   man on 36% and a deep third on 30%, a nose tackle does almost nothing else
   but rush. Every option is a job that exists in the data, drawn with the
   geometry the cards already use. */
let DEFADJ=null;
async function defAdjust(){
  if(DEFADJ) return DEFADJ;
  try{ DEFADJ=await (await fetch('def-adjust.json')).json(); }catch(e){ DEFADJ={positions:{}}; }
  DEFADJ.byKey=new Map();
  for(const [pos,list] of Object.entries(DEFADJ.positions||{}))
    (list||[]).forEach((o,i)=>{ o.key=pos+':'+i; DEFADJ.byKey.set(o.key,o); });
  return DEFADJ;
}
/* the tile carries the game's own position; where it fell back to geometry a
   bare S is read as a strong safety, which is the wider of the two */
const DEFFALL={S:'SS'};
function defPosOf(p,i){
  const shape=FORMS&&FORMS[slug(p.family)+'__'+slug(p.set)];
  const q=shape&&shape[i]; const raw=(q&&q.p)||null;
  if(!raw) return null;
  const pos=DEFFALL[raw]||raw;
  return (DEFADJ&&DEFADJ.positions&&DEFADJ.positions[pos])?pos:null;
}
/* put one defender on a different job. The underneath side rule from the card
   build applies here too: he plays the flat on the side he is standing on. */
function applyDef(m,o){
  const rd=v=>Math.round(v*10)/10;
  delete m.zone; delete m.zk; delete m.zj; delete m.man; delete m.rush; delete m.pts; delete m.gap;
  if(o.kind==='rush'){
    m.rush=1;
    m.pts=[[rd(-Math.sign(m.x||1)*1.1),rd(-Math.min(4.6,3.0+Math.max(0,m.y-1.2)*0.18))]];
    m.lb='Rush the passer'; return;
  }
  if(o.kind==='man'){ m.man=0; m.lb='Man coverage'; return; }
  if(!o.at) return;
  let zx=o.at[0];
  if(o.family!=='deep'&&Math.abs(m.x)>5&&Math.abs(zx)>5&&Math.sign(zx)!==Math.sign(m.x)) zx=-zx;
  m.zone=[rd(zx-m.x),rd(o.at[1]-m.y),o.at[2],o.at[3]];
  m.zk=o.family; m.zj=o.job; m.lb=o.label;
}
/* WHICH MENU A MAN GETS. The game's own position wins wherever he stands, so
   a tight end split outside still gets the tight end's routes. Only among the
   receivers on his own side does width decide outside from slot, which is what
   makes the inverted sets read right: in 54 of 706 formation sides a tight end
   is split WIDER than the receiver, so widest does not mean outside. */
function bucketOf(p,g,i){
  const m=g.men[i]; if(!m||m.qb) return null;
  const shape=FORMS&&FORMS[slug(p.family)+'__'+slug(p.set)];
  const pos=shape&&shape[i]&&shape[i].p;
  if(pos==='OL') return null;
  if(pos==='TE') return 'TE';
  if(pos==='RB'||pos==='FB') return 'RB';
  if(pos==='QB') return null;
  const wr=[];
  if(shape) shape.forEach((s,j)=>{ if(s.p==='WR'&&Math.sign(s.x)===Math.sign(m.x)) wr.push(j); });
  if(pos==='WR'&&wr.length){
    const widest=wr.reduce((a,b)=>Math.abs(shape[b].x)>Math.abs(shape[a].x)?b:a);
    return i===widest?'OutsideWR':'SlotWR';
  }
  /* no personnel for this set: fall back to where he stands */
  if(m.b) return null;
  if(m.y<=-3.5&&Math.abs(m.x)<=8) return 'RB';
  const same=g.men.filter(q=>!q.b&&!q.qb&&Math.sign(q.x)===Math.sign(m.x));
  const widest=same.reduce((a,b)=>Math.abs(b.x)>Math.abs(a.x)?b:a,same[0]||m);
  return Math.abs(m.x)>9.5?(m===widest?'OutsideWR':'SlotWR'):(Math.abs(m.x)<=9.5&&m.y>-1.8?'TE':'SlotWR');
}
/* WHICH WAY IS OUT. His own sideline: the side of the ball he plays from. A
   man in motion runs from where the motion lands him, so the landing spot
   decides; a back straight behind the quarterback goes right, as the game's
   own menu does. */
function outSide(m){
  const x=m.mpath&&m.mpath.length?m.mpath[m.mpath.length-1][0]:m.x;
  return x<-0.25?-1:1;
}
/* THE ROUTE HE IS HANDED. Every standard route carries a canonical shape in
   inside/outside terms (build-hot-routes.js, CANON): x toward his own sideline,
   so one table reads right on both sides of the ball. The game's own left and
   right halves are kept only for the blocks, because its naming is split - some
   halves are named by the man's side, some by the way the route runs - which is
   what mirrored the drag, slant, curl, post-sit and sluggo. */
/* the numbers on the far side of the frame: a route that heads for the
   sideline runs up it here rather than off the edge of the card */
const HOT_EDGE=22.5;
function hotPts(choice,m,bucket,qb){
  if(choice.io){
    /* the game's own shape for his position (build-hot-routes.js), mirrored
       to his side of the ball */
    const io=Array.isArray(choice.io)?choice.io:(choice.io[bucket]||choice.io.OutsideWR||Object.values(choice.io)[0]);
    const o=outSide(m), L=m.mpath&&m.mpath.length?m.mpath[m.mpath.length-1]:[m.x,m.y], sx=L[0], sy=L[1];
    let pts=io.map(([x,y])=>{ let dx=x*o; if(Math.abs(sx+dx)>HOT_EDGE&&Math.sign(sx+dx)===o) dx=o*HOT_EDGE-sx; return [dx,y]; });
    /* A SIT ROUTE SETTLES FACING THE QUARTERBACK (his call on the Post Sit):
       the last step turns toward the passer instead of back down its own line */
    if(choice.sit&&qb&&pts.length>=2){
      const a=pts[pts.length-2], b=pts[pts.length-1];
      const len=Math.max(1.4,Math.min(2,Math.hypot(b[0]-a[0],b[1]-a[1])));
      const dx=qb.x-(sx+a[0]), dy=qb.y-(sy+a[1]), d=Math.hypot(dx,dy)||1;
      pts[pts.length-1]=[a[0]+dx/d*len, a[1]+dy/d*len];
    }
    return {key:choice.key,pts:pts.map(([x,y])=>[Math.round(x*10)/10,Math.round(y*10)/10])};
  }
  const want=outSide(m)<0?'L':'R';
  const key=choice.sides[want]||choice.sides[want==='L'?'R':'L']||choice.sides.X;
  const r=HOTR.byKey.get(key);
  return r?{key,pts:(r.pts||[]).map(([x,y])=>[x,y])}:null;
}
/* a drawn route, simplified so a freehand stroke keeps its cuts and loses the
   wobble (Ramer-Douglas-Peucker, half a yard) */
function simplifyPts(pts,eps=0.5){
  if(pts.length<3) return pts.slice();
  const d=(p,a,b)=>{ const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy)||1e-9; return Math.abs(dy*p[0]-dx*p[1]+b[0]*a[1]-b[1]*a[0])/L; };
  let idx=0,max=0; for(let i=1;i<pts.length-1;i++){ const v=d(pts[i],pts[0],pts[pts.length-1]); if(v>max){max=v;idx=i;} }
  if(max<=eps) return [pts[0],pts[pts.length-1]];
  const L=simplifyPts(pts.slice(0,idx+1),eps), R=simplifyPts(pts.slice(idx),eps);
  return L.slice(0,-1).concat(R);
}
/* true while a custom route is being drawn: Escape leaves the drawing, not the play */
let SK_DRAWING=false;
/* PRESS PLAY. Every route draws itself in at one speed and each man walks
   his own path. The data carries no timing, so this is one tempo for
   everybody, not a real mesh. */
let ANIM=null; /* kept for the callers; the engine (sk-cards.js) owns the animation now */
function stopPlay(box){ const svg=box.querySelector('.pp-fld svg'); skStopCard(svg||undefined); ANIM=null; }
function runPlay(box,btn){
  const svg=box.querySelector('.pp-fld svg'); if(!svg) return;
  const ok=skRunCard(svg, ()=>{ ANIM=null; btn.innerHTML=RUN_LABEL; });
  if(ok){ ANIM=1; btn.textContent='Stop'; }
}
const RUN_LABEL='&#9654; Animate play call';
function openPlay(p,geo){
  if(!p) return;
  const el=$('#playpop'), box=el.querySelector('.pp');
  const g=geo?geo[p.slug]:null;
  const books=(p.books||[]).map(k=>IDX.books.find(b=>b.key===k)).filter(Boolean)
    .sort((a,b)=>a.team.localeCompare(b.team));
  box.innerHTML=`
    <div class="pp-hd">
      <div><span class="frm">${esc(String(p.family).replace(/_/g,' '))} &middot; ${esc(p.set)}</span>
        <span class="nm">${esc(bookPlayName(p))}${bookPlayName(p)!==p.name?` <small style="opacity:.6">· ${esc(p.name)} in the files</small>`:''}</span></div>
      <div class="pp-meta">
        <button class="sb${SAVED.has(p.slug)?' on':''}" data-star="${esc(p.slug)}">&#9733; ${SAVED.has(p.slug)?'Saved':'Save'}</button>
        <button class="pp-close">Close &nbsp;Esc</button>
      </div>
    </div>
    <div class="pp-fld">${drawCard(g)}</div>
    ${coverageKey(g)}
    <div class="pp-tools">
      <button class="tbtn run" data-run="1"${g?'':' disabled'}>${RUN_LABEL}</button>
    </div>
    <div class="pp-ft">
      <span class="chip ${esc(p.type)}">${esc(p.type)}</span>
      ${p.kind?`<span class="chip">${esc(p.kind)}</span>`:''}
      ${playFacts(p,g).map(f=>`<span class="chip">${esc(f)}</span>`).join('')}
    </div>`;
  $('#pprail').innerHTML=`<h4>In ${books.length} playbook${books.length===1?'':'s'}</h4>`+bookButtons(books);
  el.classList.add('on'); el.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden';
  box.querySelector('.pp-close').onclick=closePlay;
  /* ---- run it, and change it ---- */
  const adj=$('#ppadj');
  if(!g){ adj.innerHTML='<h4>Adjustments</h4><span class="ahint">No art for this play yet.</span>'; }
  else{
    const ORIG=JSON.stringify(g);
    /* every adjustment is kept as an instruction, and the play is rebuilt
       from the original each time, so nothing compounds and putting it back
       is exact. Only one man can be in motion, the way the game has it. */
    const HOT=new Map(), CUSTOM=new Map(); let MOTION=null, DRAW=null;
    let LIVE=JSON.parse(ORIG), PICK=null;
    const CHANGED=()=>HOT.size>0||!!MOTION;
    /* the formation's own motion menu, written by the card build */
    const MOMENU=(geo&&geo['_mo_'+slug(p.family)+'__'+slug(p.set)])||null;
    function rebuild(){
      LIVE=JSON.parse(ORIG);
      if(MOTION){
        /* only one man moves before the snap, so any motion the play already
           had is cancelled first */
        for(const m of LIVE.men){ delete m.mpath; delete m.mot; delete m.mk; delete m.shift; }
        const m=LIVE.men[MOTION.i];
        /* `to` is an offset from where he lines up, not a spot on the field */
        const rd=v=>Math.round(v*10)/10, EDGE=26.5;
        if(m){ m.mpath=[[Math.max(-EDGE,Math.min(EDGE,rd(m.x+MOTION.to[0]))),rd(m.y+MOTION.to[1])]];
          m.mot=1; m.mk='mtn'; }
      }
      for(const [i,key] of HOT){
        const m=LIVE.men[i]; if(!m) continue;
        if(LIVE.def){ const o=DEFADJ&&DEFADJ.byKey.get(key); if(o) applyDef(m,o); continue; }
        const c=HOTR&&HOTR.choiceBy.get(key); if(!c) continue;
        delete m.opt; delete m.dd; delete m.stem;
        /* a drawn route: whatever he has been given so far, even nothing */
        if(c.draw){ delete m.b; delete m.bk; delete m.rel; m.pts=(CUSTOM.get(i)||[]).map(p=>p.slice()); continue; }
        /* an option route draws the game's option shape (the stick: hitch, or the out) */
        if(c.opt){ delete m.b; delete m.bk; delete m.rel; m.opt=c.opt; m.stem=c.stem||0; m.pts=[]; continue; }
        const hp=hotPts(c,m,bucketOf(p,LIVE,i),LIVE.men.find(q=>q.qb)); if(!hp) continue;
        if(c.block){ m.b=1; m.bk=/run|lead/i.test(c.key)?'r':'p'; m.rel=hp.pts; delete m.pts; }
        else { delete m.b; delete m.bk; delete m.rel; m.pts=hp.pts; }
      }
    }
    const fld=box.querySelector('.pp-fld');
    const runBtn=box.querySelector('[data-run]');
    const mark=()=>{ fld.querySelectorAll('.mvr').forEach(gm=>gm.classList.toggle('pick',+gm.dataset.i===PICK)); };
    const wireMen=()=>{ fld.querySelectorAll('.mvr').forEach(gm=>{
      gm.onclick=ev=>{ ev.stopPropagation(); if(DRAW!==null||innerWidth<760) return; /* adjustments are a desk thing */ showMenu(+gm.dataset.i); }; });
      /* the route line itself is a target: a four-pixel stroke is too thin to
         hit, so each one gets a wide transparent twin that takes the click */
      if(!LIVE.def&&innerWidth>=760) fld.querySelectorAll('path.rte').forEach(rp=>{
        const hit=document.createElementNS('http://www.w3.org/2000/svg','path');
        hit.setAttribute('d',rp.getAttribute('d')); hit.setAttribute('class','rhit'); hit.dataset.i=rp.dataset.i;
        hit.setAttribute('fill','none'); hit.setAttribute('stroke','transparent'); hit.setAttribute('stroke-width','18');
        hit.setAttribute('pointer-events','stroke');
        hit.onclick=ev=>{ ev.stopPropagation(); if(DRAW!==null) return; showMenu(+hit.dataset.i); };
        rp.parentNode.insertBefore(hit,rp.nextSibling); }); };
    const redraw=()=>{ stopPlay(box); runBtn.innerHTML=RUN_LABEL; fld.innerHTML=drawCard(LIVE); wireMen(); mark(); };
    const NAME={OutsideWR:'outside receiver',SlotWR:'slot receiver',TE:'tight end',RB:'back',
      DE:'defensive end',DT:'defensive tackle',LB:'linebacker',CB:'cornerback',
      FS:'free safety',SS:'strong safety',NB:'nickelback'};
    /* a motion, named by who moves and which way, from the game's own menu */
    function motionList(){
      if(!MOMENU) return '';
      const shape=FORMS&&FORMS[slug(p.family)+'__'+slug(p.set)];
      const seen=new Map();
      const rows=Object.values(MOMENU).map((mv,k)=>{
        const who=(shape&&shape[mv.i]&&shape[mv.i].p)||'';
        const WHO={QB:'quarterback',RB:'back',FB:'back',TE:'tight end',WR:'receiver',OL:'lineman'}[who]||'man';
        /* a man who barely moves sideways is shifting, not motioning across */
        const dir=Math.abs(mv.to[0])<1.5?'shift':(mv.to[0]<0?'left':'right');
        let lab=`${WHO} ${dir}`;
        seen.set(lab,(seen.get(lab)||0)+1);
        if(seen.get(lab)>1) lab+=` ${Math.round(Math.abs(mv.to[0]))} yd`;
        return `<button class="hb" data-mo="${k}">${esc(lab)}</button>`;
      });
      return `<p class="agrp" style="margin-top:13px">Motion &middot; ${rows.length}</p>`
        +(MOTION?'<button class="hb" data-mo="off" style="background:#17130E;color:#F4EBD6">No motion</button>':'')
        +rows.join('');
    }
    /* the rail at rest: what it is, and what to do */
    function idle(){
      PICK=null; mark();
      adj.innerHTML='<h4>Adjustments</h4>'
        +(LIVE.def
          ?'<span class="ahint">Click a defender on the play to change his job.</span>'
          :'<span class="ahint">Click a player icon on the play to change what he runs.</span>')
        +(CHANGED()?'<button class="aback" data-reset="1">Put the play back</button>':'')
        +(LIVE.def?'':motionList());
    }
    async function showMenu(i){
      PICK=i; mark();
      const head='<h4>Adjustments</h4>'
        +`<button class="aback" data-idle="1">&larr; All players</button>`;
      if(LIVE.def){
        const D=await defAdjust();
        const pos=defPosOf(p,i);
        if(!pos){ adj.innerHTML=head+'<span class="ahint">The game does not name this man’s position in this front, so there is no menu for him.</span>'
          +(CHANGED()?'<button class="aback" data-reset="1">Put the play back</button>':''); return; }
        const list=D.positions[pos]||[];
        const now=LIVE.men[i]||{};
        /* the job he already has, so the menu shows where he is starting from */
        const isNow=o=>o.kind==='rush'?!!now.rush:o.kind==='man'?now.man!==undefined:(now.zj===o.job&&(!now.zone||Math.sign(now.x+now.zone[0])===Math.sign(o.at[0])||Math.abs(o.at[0])<=5));
        const btn=o=>`<button class="hb${isNow(o)?' on':''}" data-hot="${esc(o.key)}">${esc(o.label)}`
          +`<em class="apct">${o.pct}%</em></button>`;
        adj.innerHTML=head
          +`<span class="awho">${esc(NAME[pos]||pos)}</span>`
          +(CHANGED()?'<button class="aback" data-reset="1">Put the play back</button>':'')
          +`<p class="agrp">${list.length} jobs the game gives this position</p>${list.map(btn).join('')}`
          +'<span class="ahint" style="margin-top:10px">The share is how often the game actually asks a '
          +esc(NAME[pos]||pos)+' to do it.</span>';
        adj.scrollTop=0; return;
      }
      const H=await hotRoutes();
      const bucket=bucketOf(p,LIVE,i);
      if(!bucket){ adj.innerHTML=head+'<span class="ahint">This man blocks on this play. The game gives him no hot route.</span>'
        +(CHANGED()?'<button class="aback" data-reset="1">Put the play back</button>':''); return; }
      /* the ability-gated routes are left over from the old unlock system and
         are not in the game any more, so they are not offered */
      const base=(H.menu[bucket]||[]).map(k=>H.choiceBy.get(k)).filter(c=>c&&!c.mut);
      const cur=HOT.get(i);
      const btn=c=>`<button class="hb${cur===c.key?' now':''}" data-hot="${esc(c.key)}">${esc(c.label)}${cur===c.key?'<em class="apct">Running</em>':''}</button>`;
      adj.innerHTML=head
        +`<span class="awho">${esc(NAME[bucket])}</span>`
        +(CHANGED()?'<button class="aback" data-reset="1">Put the play back</button>':'')
        +(cur==='CustomRoute'?'<button class="aback adraw" data-redraw="1">Draw his route again</button>':'')
        +`<p class="agrp">${base.length} hot routes</p>${base.map(btn).join('')}`;
      /* keep the one he is running in view */
      const on=adj.querySelector('.hb.now'); adj.scrollTop=0; if(on) on.scrollIntoView({block:'nearest'});
    }
    /* ---- CUSTOM ROUTE: draw it on the field ----
       Click to put down each cut, or hold and drag to draw freehand. The route
       starts from where he stands (or where his motion lands him), snaps to half
       a yard, stays on the field, and draws with its arrow as it goes. */
    const snap=v=>Math.round(v*2)/2;
    function originOf(i){
      const m=LIVE.men[i]; if(!m) return [0,0];
      if(m.mpath&&m.mpath.length) return m.mpath[m.mpath.length-1];
      const qb=LIVE.men.find(q=>q.qb); const mp=typeof motionPre==='function'?motionPre(m,qb,0):null;
      return mp?mp.L:[m.x,m.y];
    }
    function yardsAt(ev){
      const svg=fld.querySelector('svg'); if(!svg||!svg.getScreenCTM) return null;
      const pt=svg.createSVGPoint(); pt.x=ev.clientX; pt.y=ev.clientY;
      const p=pt.matrixTransform(svg.getScreenCTM().inverse());
      return [(p.x-CX)/SC,(LOSY-p.y)/SC];
    }
    function drawRail(){
      const k=CUSTOM.get(DRAW)||[];
      adj.innerHTML='<h4>Adjustments</h4>'
        +'<span class="awho">Custom route</span>'
        +'<span class="ahint">Click on the field to put down each cut. Hold and drag to draw it freehand. It starts from his spot.</span>'
        +'<p class="agrp">'+k.length+' point'+(k.length===1?'':'s')+'</p>'
        +'<button class="aback" data-dend="1">Done</button>'
        +'<button class="hb" data-dundo="1"'+(k.length?'':' disabled')+'>Undo last point <em class="apct">Ctrl Z</em></button>'
        +'<button class="hb" data-dclear="1"'+(k.length?'':' disabled')+'>Clear the route</button>'
        +'<span class="ahint" style="margin-top:10px">Enter finishes it, Escape too.</span>';
    }
    function startDraw(i,fresh){
      DRAW=i; PICK=i; SK_DRAWING=true; HOT.set(i,'CustomRoute'); if(fresh||!CUSTOM.has(i)) CUSTOM.set(i,[]);
      rebuild(); redraw(); fld.classList.add('drawing'); drawRail();
    }
    function endDraw(){
      if(DRAW===null) return; const i=DRAW; DRAW=null; SK_DRAWING=false; fld.classList.remove('drawing');
      /* nothing drawn: he goes back to what the play had him doing */
      if(!(CUSTOM.get(i)||[]).length){ HOT.delete(i); CUSTOM.delete(i); }
      rebuild(); redraw(); showMenu(i);
    }
    function addPt(ev,free){
      const y=yardsAt(ev); if(!y) return false; const [ox,oy]=originOf(DRAW);
      const EDGE=X_MAX-0.5;
      const x=Math.max(-EDGE,Math.min(EDGE,y[0])), yy=Math.max(DEPTH_MIN+0.5,Math.min(DEPTH_MAX-0.2,y[1]));
      const pt=[snap(x-ox),snap(yy-oy)], k=CUSTOM.get(DRAW)||[], last=k[k.length-1]||[0,0];
      if(Math.hypot(pt[0]-last[0],pt[1]-last[1])<(free?1.2:0.5)) return false;
      k.push(pt); CUSTOM.set(DRAW,k); return true;
    }
    let STROKE=null;
    fld.addEventListener('pointerdown',ev=>{
      if(DRAW===null) return; ev.preventDefault(); ev.stopPropagation();
      STROKE={start:(CUSTOM.get(DRAW)||[]).length}; try{ fld.setPointerCapture(ev.pointerId); }catch(e){}
      if(addPt(ev,false)){ rebuild(); redraw(); drawRail(); }
    },true);
    fld.addEventListener('pointermove',ev=>{
      if(DRAW===null||!STROKE) return;
      if(addPt(ev,true)){ rebuild(); redraw(); }
    });
    const lift=()=>{ if(DRAW===null||!STROKE) return;
      /* a freehand stroke keeps its cuts and loses the wobble */
      const k=CUSTOM.get(DRAW)||[], a=STROKE.start; STROKE=null;
      if(k.length-a>2){ const head=k.slice(0,a), seg=simplifyPts([a?k[a-1]:[0,0],...k.slice(a)]).slice(1); CUSTOM.set(DRAW,head.concat(seg)); }
      rebuild(); redraw(); drawRail(); };
    fld.addEventListener('pointerup',lift); fld.addEventListener('pointercancel',lift);
    fld.addEventListener('click',ev=>{ if(DRAW!==null){ ev.stopPropagation(); ev.preventDefault(); } },true);
    const drawKeys=ev=>{
      if(DRAW===null||!$('#playpop').classList.contains('on')) return;
      if(ev.key==='Enter'||ev.key==='Escape'){ ev.preventDefault(); ev.stopImmediatePropagation(); endDraw(); }
      else if((ev.key==='z'&&(ev.ctrlKey||ev.metaKey))||ev.key==='Backspace'){ ev.preventDefault(); const k=CUSTOM.get(DRAW)||[]; k.pop(); rebuild(); redraw(); drawRail(); }
    };
    if(window.__skDrawKeys) removeEventListener('keydown',window.__skDrawKeys,true);
    window.__skDrawKeys=drawKeys; addEventListener('keydown',drawKeys,true);

    idle(); wireMen();
    runBtn.onclick=()=>{ if(ANIM||skCardRunning()){ stopPlay(box); runBtn.innerHTML=RUN_LABEL; } else runPlay(box,runBtn); };
    adj.onclick=async ev=>{
      if(ev.target.closest('[data-dend]')){ endDraw(); return; }
      if(ev.target.closest('[data-dundo]')){ const k=CUSTOM.get(DRAW)||[]; k.pop(); rebuild(); redraw(); drawRail(); return; }
      if(ev.target.closest('[data-dclear]')){ CUSTOM.set(DRAW,[]); rebuild(); redraw(); drawRail(); return; }
      if(ev.target.closest('[data-redraw]')){ if(PICK!==null) startDraw(PICK,true); return; }
      if(ev.target.closest('[data-idle]')){ if(DRAW!==null) endDraw(); idle(); return; }
      if(ev.target.closest('[data-reset]')){ if(DRAW!==null){ DRAW=null; SK_DRAWING=false; fld.classList.remove('drawing'); } HOT.clear(); CUSTOM.clear(); MOTION=null; rebuild(); redraw(); idle(); return; }
      const mo=ev.target.closest('[data-mo]');
      if(mo){
        MOTION = mo.dataset.mo==='off' ? null : Object.values(MOMENU)[+mo.dataset.mo]||null;
        rebuild(); redraw(); idle(); return;
      }
      const b=ev.target.closest('[data-hot]'); if(!b||PICK===null) return;
      if(LIVE.def) await defAdjust(); else await hotRoutes();
      if(!LIVE.def&&b.dataset.hot==='CustomRoute'){ startDraw(PICK,true); return; }
      HOT.set(PICK,b.dataset.hot); CUSTOM.delete(PICK); rebuild(); redraw(); showMenu(PICK); };
  }
  /* jump to the same play in another book, and open it there */
  $('#pprail').onclick=async ev=>{
    const b=ev.target.closest('[data-gob]'); if(!b) return;
    const key=b.dataset.gob; closePlay();
    if(Q){ $('#q').value=''; Q=''; PRE=null; $('#qclear').hidden=true; }
    BOOK=key; VIEW='book'; FAM=p.family; SET=p.set; CONCEPT=null; FAMPICK=null; buildRail(); render();
    const gg=await cardsFor(p.family,p.set);
    const same=IDX.plays.find(x=>x.slug===p.slug);
    if(same) openPlay(same,gg);
  };
  box.querySelector('[data-star]').onclick=(ev)=>{ const k=p.slug, b=ev.currentTarget;
    if(SAVED.has(k)){ starDrop(k); b.classList.remove('on'); b.innerHTML='&#9733; Save'; }
    else { starAdd(k); b.classList.add('on'); b.innerHTML='&#9733; Saved'; }
    saveStars();
    const t=document.querySelector(`[data-star="${k}"].star`); if(t) t.classList.toggle('on',SAVED.has(k)); };
}
function closePlay(){ const el=$('#playpop'); if(!el||!el.classList.contains('on')) return; SK_DRAWING=false;
  if(ANIM){ cancelAnimationFrame(ANIM); ANIM=null; }
  el.classList.remove('on','hasmenu'); el.setAttribute('aria-hidden','true');
  el.querySelector('.pp').innerHTML=''; $('#pprail').innerHTML=''; $('#ppadj').innerHTML='';
  document.body.style.overflow=''; }
$('#playpop').onclick=e=>{ if(e.target.classList.contains('pp-scrim')) closePlay(); };
addEventListener('keydown',e=>{ if(e.key==='Escape'&&!SK_DRAWING&&$('#playpop').classList.contains('on')){ e.preventDefault(); closePlay(); } });

/* ---------------- controls ---------------- */
document.querySelector('.bar').onclick = e => {
  const c=e.target.closest('[data-t]'); if(!c)return;
  document.querySelectorAll('[data-t]').forEach(x=>x.classList.toggle('on',x===c));
  TYPE=c.dataset.t; SHOWN=PAGE; CONCEPT=null; render();
};
let qt, PRE=null;
$('#q').oninput = e => { clearTimeout(qt); qt=setTimeout(()=>{
  const had=!!Q;
  Q=e.target.value.trim().toLowerCase(); SHOWN=PAGE; CONCEPT=null;
  $('#qclear').hidden=!Q;
  if(Q){
    /* searching goes library-wide — playbooks, formations and plays — from
       anywhere, and clearing it puts you back where you were */
    if(!had) PRE={VIEW,FAM,SET,BOOK};
    if(VIEW!=='search'){ VIEW='search'; FAM=null; SET=null; buildRail(); }
  } else if(had && PRE){
    ({VIEW,FAM,SET,BOOK}=PRE); PRE=null; buildRail();
  }
  render();
},110); };
/* leaving a search by picking a result: the search is over, no snap-back */
function endSearch(){ $('#q').value=''; Q=''; PRE=null; $('#qclear').hidden=true; }

/* ---------------- search, across everything ----------------
   A playbook by team, a formation by its name (file name or the game's),
   a play by name or concept. Three sections, each a way in. */
function renderSearch(){
  const main=$('#main'), tabs=$('#tabs');
  tabs.style.display='none'; tabs.innerHTML='';
  main.classList.remove('inbook');
  setTitle('SEARCH', `“${Q}” across playbooks, formations and plays`);
  const books=IDX.books.filter(b=>b.plays>0&&!b.drill&&b.sideCode===SIDE
    &&(b.team+' '+(b.nick||'')+' '+(b.identity||'')+' '+(b.conf||'')).toLowerCase().includes(Q));
  const fm=new Map();
  for(const p of IDX.plays){ if(p.drill||p.side!==SIDE) continue;
    const k=p.family+'||'+p.set;
    if(!fm.has(k)){ const hit=(p.family+' '+p.set+' '+shownSet(p.family,p.set)).toLowerCase().includes(Q); fm.set(k,hit?{family:p.family,set:p.set,n:0}:null); }
    const g=fm.get(k); if(g) g.n++; }
  const forms=[...fm.values()].filter(Boolean).sort((a,b)=>b.n-a.n);
  const byName=new Map();
  for(const p of IDX.plays){ if(p.drill||p.side!==SIDE||(TYPE!=='all'&&p.type!==TYPE)) continue;
    if(!(p.name+' '+(p.kind||'')).toLowerCase().includes(Q)) continue;
    const k=p.name.toLowerCase();
    if(!byName.has(k)) byName.set(k,{name:p.name,key:k,inst:[],books:new Set(),types:new Set(),kinds:new Set()});
    const c=byName.get(k); c.inst.push(p); c.types.add(p.type); if(p.kind) c.kinds.add(p.kind); for(const b of p.books) c.books.add(b); }
  const plays=[...byName.values()].sort((a,b)=>b.books.size-a.books.size||a.name.localeCompare(b.name));
  const sec=(abbr,title,sub,body)=>`<section class="confwrap"><div class="confhd">
      <span class="confbadge" style="background:#26364b">${abbr}</span>
      <span><span class="ct">${title}</span><span class="cs">${sub}</span></span></div>${body}</section>`;
  const bookHTML=books.length?sec('BK',`Playbooks`,`${books.length} match`,
    `<div class="books">${books.map(b=>`<button class="book" data-b="${b.key}" style="background:linear-gradient(150deg,${b.c1||'#2a3a52'} 0%,${b.c1||'#2a3a52'} 52%,${b.c2||'#131c29'} 210%)">
        <span class="plate"><span class="bt">${esc(b.team)}</span><span class="bp">${b.plays}<u>PLAYS</u></span></span>
        <span class="well">${b.conf?`<span class="conftag">${esc(b.conf)}</span>`:''}<span class="arch">${b.logo?`<img src="logos/${b.logo}.png" alt="" loading="lazy">`:`<span class="glyph">${esc(b.team[0])}</span>`}</span></span>
        <span class="idplate"><u>RUNS AS</u><b>${esc(b.identity||'Multiple')}</b></span></button>`).join('')}</div>`):'';
  const formHTML=forms.length?sec('FM',`Formations`,`${forms.length} match`,
    `<div class="fgrid">${forms.slice(0,48).map(g=>`<button class="fbadge" data-f="${esc(g.family)}" data-s="${esc(g.set)}" style="background:linear-gradient(152deg,#26364b 0%,#26364b 54%,#131c29 205%)">
        <span class="fplate"><em>${esc(g.family)}</em><b>${esc(shownSet(g.family,g.set))}</b><i class="fn">${g.n} plays</i></span>
        ${fdiag(FORMS&&FORMS[slug(g.family)+'__'+slug(g.set)],'fdiag')}</button>`).join('')}</div>`):'';
  const playHTML=plays.length?sec('PL',`Plays`,`${plays.length} match`,
    board(plays.slice(0,120).map(c=>({ shape:FORMS&&FORMS[slug(c.inst[0].family)+'__'+slug(c.inst[0].set)], name:c.name,
      where:c.inst.length===1?c.inst[0].family+' · '+c.inst[0].set:c.inst.length+' formations', types:[...c.types],
      kind:c.kinds.size===1?[...c.kinds][0]:(c.kinds.size?c.kinds.size+' concepts':''), num:c.books.size, attr:`data-concept="${esc(c.key)}"` })),
      ['Formation','Play','Runs out of','Type','Concept','Books'])
    +(plays.length>120?`<button class="more" data-allhits="1">See all ${plays.length} in All Plays</button>`:'')):'';
  main.innerHTML = (bookHTML+formHTML+playHTML) || `<div class="empty">Nothing matches “${esc(Q)}”.<br><span style="font-size:12px">Try a team, a formation, or a concept — mesh, flood, sluggo.</span></div>`;
  main.onclick = e => {
    const b=e.target.closest('[data-b]'); if(b){ endSearch(); BOOK=b.dataset.b; VIEW='book'; FAM=null; SET=null; buildRail(); render(); return; }
    const f=e.target.closest('[data-s]'); if(f){ endSearch(); BOOK=null; VIEW='formations'; FAM=f.dataset.f; SET=f.dataset.s; buildRail(); render(); return; }
    const c=e.target.closest('[data-concept]'); if(c){ endSearch(); BOOK=null; VIEW='plays'; CONCEPT=c.dataset.concept; SHOWN=PAGE; buildRail(); render(); return; }
    if(e.target.closest('[data-allhits]')){ PRE=null; BOOK=null; VIEW='plays'; buildRail(); render(); }
  };
  $('#foot').innerHTML = `<b>${books.length}</b> playbooks · <b>${forms.length}</b> formations · <b>${plays.length}</b> plays match “${esc(Q)}”`;
}

$('#qclear').onclick=()=>{ const i=$('#q'); i.value=''; i.dispatchEvent(new Event('input')); i.focus(); };
/* '/' focuses search from anywhere — this is a lookup tool first */
addEventListener('keydown',e=>{ if(e.key==='/'&&document.activeElement!==$('#q')){ e.preventDefault(); $('#q').focus(); }
  if(e.key==='Escape'&&document.activeElement===$('#q')) $('#qclear').click();
  });

$('#sortbar').onclick = e => { const c=e.target.closest('[data-sort]'); if(!c)return;
  document.querySelectorAll('[data-sort]').forEach(x=>x.classList.toggle('on',x===c));
  SORT=c.dataset.sort; SHOWN=PAGE; render(); };

/* TWO PAGES, NOT ONE TOGGLE. Offence and defence are separate documents with
   separate URLs, so the switch is a link: it leaves this page and opens the
   other one. Everything else about them is shared. */
$('#sidebox').onclick = e => { const b=e.target.closest('[data-side]'); if(!b)return;
  if(SIDE===b.dataset.side) return;
  location.href = b.dataset.side==='D' ? 'defense.html' : 'index.html'; };

/* boot() is called at the end of schemes.js, not here: render() reaches into
   renderInstall(), so the scheme section has to be defined before the first
   paint. Calling it here races the play-index fetch against that script. */

