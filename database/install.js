/* =====================================================================
   THE INSTALL · built from the ground up, 2026-09-02 (second pass, same day).

   The screen he records over, full screen, one play at a time. The frame is
   the dynasty tracker's; the play card is drawn like the game's own card and
   tilts like a holo card under the pointer; reads land as broadcast plates
   on Space and any landed plate can be clicked back to; adjustments are
   buttons that redraw the card; Enter inks the play and the call sheet pops
   up so you watch it land, starting from empty; the pillars unlock in order.
   The section has its own front door (the install home) with the three
   pillars laid out. The member sees exactly this.

   Loaded after schemes.js and shares its scope: the plan store (planOf,
   savePlan, inkPlay, inkedSet, installedSet, pillarsOf, taughtIn, posOf),
   the room's helpers (esc, $, toast, refreshNav, srcBook, tapes, crownOf,
   LOCK, CROWN, artHTML, ART_INDEX, pkCrest) and the library's card geometry
   (drawCard, px, py, W, H, SC, ICONS, RED, YELLOW, WHITE, FIELD, icon, arrow).
   ===================================================================== */

/* the blurred room behind the section, per scheme, tiny on purpose */
const INS_ROOM={ westvirginia:'art/wvu-room.webp' };
/* which adjustments are switched on, per play, this session */
const INS_ADJ=new Map();
const insAdjSet=(id)=>{ if(!INS_ADJ.has(id)) INS_ADJ.set(id,new Set()); return INS_ADJ.get(id); };

/* ---------- the play card, drawn like the game's ----------
   Same geometry the library ships, heavier strokes, each man in his own
   group so a read can light him. Keys are pinned to the men once (left to
   right on the base card) so a flipped or adjusted copy keeps them. */
const INS_ANCH=/^e(\d+)$/;
function keyMen(g){
  if(!g||g._keyed) return g;
  const elig=g.men.filter(m=>!m.b&&!m.qb).sort((a,b)=>a.x-b.x);
  elig.forEach((m,i)=>{ m._i=ICONS[Math.min(i,ICONS.length-1)]; m._k='e'+i; });
  const q=g.men.find(m=>m.qb); if(q) q._k='qb';
  g._keyed=true; return g;
}
/* a copy of the card with the switched-on adjustments applied */
function adjustGeo(g,ops){
  keyMen(g);
  /* the zone array is copied too, and `def` is carried across: without it an
     adjusted defensive card lost the flag and redrew itself as an offence */
  const c={men:g.men.map(m=>Object.assign({},m,{
      pts:m.pts?m.pts.map(p=>p.slice()):m.pts,
      zone:m.zone?m.zone.slice():m.zone })),
    _keyed:true,_flip:false,def:g.def};
  for(const op of ops||[]){ if(!op) continue;
    /* DEFENSIVE ADJUSTMENTS THAT ACTUALLY MOVE SOMETHING. Not all of them can:
       "defender aggression aggressive" is a setting with nothing to draw. But
       a zone drop and an alignment depth are geometry, so they redraw.
         zone : push a kind of zone deeper or shallower
         align: line a group up at a new depth, the zone staying where it is */
    if(op.zone){ const kinds=[].concat(op.zone.kind);
      for(const m of c.men){ if(!m.zone) continue;
        if(kinds.some(k=>DEF_TOKENS[k]&&DEF_TOKENS[k](m))) m.zone[1]+=op.zone.dy; }
      continue; }
    if(op.align){ for(const m of defPick(c,op.align.who)){
        const dy=op.align.y-m.y; m.y=op.align.y;
        /* he moved, the grass did not */
        if(m.zone) m.zone[1]-=dy; }
      continue; }
    if(op.flip){ c._flip=!c._flip; c.men.forEach(m=>{ m.x=-m.x; if(m.pts) m.pts=m.pts.map(([dx,dy])=>[-dx,dy]); }); continue; }
    const m=c.men.find(x=>x._k===op.man); if(!m) continue;
    if(op.mirror){ m.x=-m.x; if(m.pts) m.pts=m.pts.map(([dx,dy])=>[-dx,dy]); }
    if(op.mirrorPts&&m.pts) m.pts=m.pts.map(([dx,dy])=>[-dx,dy]);
    if(op.route){ m.pts=op.route.map(p=>p.slice()); if(c._flip) m.pts=m.pts.map(([dx,dy])=>[-dx,dy]); m._blk=false; }
    if(op.block){ m.pts=null; m._blk=true; }
  }
  return c;
}
/* THE GROUND. The library's flat FIELD is replaced here: a lit centre, yard
   lines every five, and the hash marks as real dashes down both hash lines,
   one per yard. The hashes matter beyond decoration — an adjustment that
   moves the trips to the wide side has to put the formation on a hash. */
const INS_HASH_L=W*0.355, INS_HASH_R=W*0.645;
/* THE GROUND IS DRAWN FOR THE WHOLE FIELD, not just the height of an offensive
   card. These loops used to skip anything outside 3..H-3 pixels, which was
   fine while the box was always 0 0 W H; the moment a defensive card zooms out
   to show its deep zones there is simply no grass above the old edge. The
   viewBox does the cropping now. */
const INS_FIELD=(()=>{ let f='';
  for(let y=-12;y<=34;y+=5){ const yy=py(y); if(y===10) continue;
    f+=`<line x1="0" y1="${yy.toFixed(1)}" x2="${W}" y2="${yy.toFixed(1)}" stroke="rgba(240,231,203,.075)" stroke-width="1"/>`; }
  for(let y=-12;y<=34;y++){ const yy=py(y);
    for(const hx of [INS_HASH_L,INS_HASH_R])
      f+=`<line x1="${(hx-4).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(hx+4).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(240,231,203,.16)" stroke-width="1.6"/>`; }
  for(const sx of [W*0.055,W*0.945])
    for(let y=-12;y<=34;y++){ const yy=py(y);
      f+=`<line x1="${(sx-3).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(sx+3).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(240,231,203,.1)" stroke-width="1.4"/>`; }
  /* the ten yard line, at ten yards; it used to be drawn at thirteen */
  f+=`<line x1="0" y1="${py(10).toFixed(1)}" x2="${W}" y2="${py(10).toFixed(1)}" stroke="rgba(242,181,14,.5)" stroke-width="2"/>`;
  f+=`<line x1="0" y1="${LOSY}" x2="${W}" y2="${LOSY}" stroke="rgba(240,231,203,.42)" stroke-width="1.6"/>`;
  return f; })();
/* a route polyline with its corners rounded, so a break reads as a cut */
function insRouteD(m,r=9){
  const w=[[px(m.x),py(m.y)],...m.pts.map(([dx,dy])=>[px(m.x+dx),py(m.y+dy)])];
  if(w.length<3) return 'M'+w.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L');
  let d=`M${w[0][0].toFixed(1)} ${w[0][1].toFixed(1)}`;
  for(let i=1;i<w.length-1;i++){
    const [ax,ay]=w[i-1],[bx,by]=w[i],[cx,cy]=w[i+1];
    const l1=Math.hypot(bx-ax,by-ay)||1, l2=Math.hypot(cx-bx,cy-by)||1, rr=Math.min(r,l1/2,l2/2);
    d+=` L${(bx-(bx-ax)/l1*rr).toFixed(1)} ${(by-(by-ay)/l1*rr).toFixed(1)} Q${bx.toFixed(1)} ${by.toFixed(1)} ${(bx+(cx-bx)/l2*rr).toFixed(1)} ${(by+(cy-by)/l2*rr).toFixed(1)}`;
  }
  return d+` L${w[w.length-1][0].toFixed(1)} ${w[w.length-1][1].toFixed(1)}`;
}
const insTip=(m)=>{ const w=[[px(m.x),py(m.y)],...m.pts.map(([dx,dy])=>[px(m.x+dx),py(m.y+dy)])];
  const [ax,ay]=w[w.length-1],[bx,by]=w[w.length-2]; return {ax,ay,th:Math.atan2(ay-by,ax-bx)}; };
/* the block mark the game draws: a stem off the man with a bar across the
   end, long and forward on a run, short on a pass set */
const insTee=(X,Y,run,col,w)=>{ const len=run?SC*2.1:SC*1.1;
  return `<path d="M${X} ${Y} L${X} ${(Y-len).toFixed(1)} M${X-7} ${(Y-len).toFixed(1)} L${X+7} ${(Y-len).toFixed(1)}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`; };
/* THE CARD. The game's own marks — the controller icons, the yellow routes,
   the red ball carrier — on a lit broadcast ground with a glow under every
   route. Each man is his own group so a read can light him. */
/* what the screen calls a step through a play. A defender has keys, not
   reads: his own Alabama book says PIN THE KEYS while the offence books say
   PIN THE READS. */
function RDWORD(sc, cap){ const w = (sc && sc.side === 'D') ? 'key' : 'read';
  return cap ? w.charAt(0).toUpperCase() + w.slice(1) + 's' : w; }
function drawGameCard(g){
  if(!g) return drawCard(g);
  /* the same standard frame as the library card, chosen BEFORE the routes are
     drawn so a deep route stops at the frame's edge with its arrow */
  const FB=(typeof fitBox==='function'&&fitBox(g))||null;
  if(typeof frameClip==='function') frameClip(FB);
  try{ return drawGameCardIn(g,FB); } finally { if(typeof frameClip==='function') frameClip(null); }
}
function drawGameCardIn(g,FB){
  keyMen(g);
  const run=!!g.run, GOLD='#E8DF5E', HOT='#FF4D3D', CYAN='#5FD0F5', qb=g.men.find(q=>q.qb);
  let glow='',routes='',bodies='',men='',pre='';
  for(const m of g.men){
    const X=px(m.x), Y=py(m.y), key=m._k||'';
    /* A DEFENSIVE CARD IS NOT AN OFFENSIVE ONE. This used to fall straight
       through to the offence vocabulary below, so a zone defender drew as a
       bare icon with no zone at all and a pass rusher drew as a gold route,
       which is why every card in a defensive install looked wrong. The
       drawing lives in sk-cards.js so the install and the library cannot
       disagree; the man is still wrapped in the same hotspot group as any
       other, so reads and adjustments still land on him. */
    if(g.def){
      const p=defParts(m,'class="rt"');
      glow+=p.glow;
      if(p.routes) routes+=`<g class="man" data-m="${key}">${p.routes}</g>`;
      men+=`<g class="man" data-m="${key}">${p.bodies}<circle class="halo" cx="${X}" cy="${Y}" r="15"/></g>`;
      continue;
    }
    /* the pre-snap shift, drawn the way the game draws motion: a dashed line
       from where the formation puts him to where he actually lines up */
    if(m.shift){
      const SX=px(m.x+m.shift[0]), SY=py(m.y+m.shift[1]);
      pre+=`<g class="mot"><path d="M${SX.toFixed(1)} ${SY.toFixed(1)} L${X} ${Y}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round" opacity=".9"/>`
        +arrow(X,Y,Math.atan2(Y-SY,X-SX),CYAN)
        +`<circle cx="${SX.toFixed(1)}" cy="${SY.toFixed(1)}" r="3.4" fill="none" stroke="${CYAN}" stroke-width="2"/></g>`;
    }
    /* orbit, return, jet, across: the motion shape to a landing spot; what he
       does after the snap starts from there (motionPre lives in index.html) */
    const firstDx=(m.pts&&m.pts[0]&&m.pts[0][0])||(m.rel&&m.rel[0]&&m.rel[0][0])||0;
    const mp=m.mpath?{L:m.mpath[m.mpath.length-1],d:'M'+[[m.x,m.y],...m.mpath].map(([x,y])=>px(x).toFixed(1)+' '+py(y).toFixed(1)).join(' L')}:motionPre(m,qb,firstDx);
    const ox=mp?mp.L[0]:m.x, oy=mp?mp.L[1]:m.y, OX=px(ox), OY=py(oy);
    if(mp) pre+=`<g class="mot"><path d="${mp.d}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/></g>`;
    if(m.b&&!m._blk){
      /* the game says which block this is, and draws them differently: a run
         block drives forward, a pass set is short. A blocker who MOVES — a
         puller, a screen release — gets his path drawn with the block mark
         at the end of it, where he arrives. */
      const rn=m.bk?m.bk==='r':run;
      if(m.rel&&m.rel.length){
        /* a puller gets a heavier line than a screen release: on a run play
           the pulling lineman is most of the story */
        const d=insRouteD({x:ox,y:oy,pts:m.rel},7);
        const e=m.rel[m.rel.length-1], EX=px(ox+e[0]), EY=py(oy+e[1]);
        bodies+=`<path d="${d}" fill="none" stroke="${m.mot?CYAN:'#EDEAE2'}" stroke-width="${m.pull?3.2:2.6}" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="${m.pull?1:.85}"/>`
          +insTee(EX,EY,rn,'#EDEAE2',2.6)+`<circle cx="${X}" cy="${Y}" r="4.4" fill="#0b0f14" stroke="#EDEAE2" stroke-width="2.4"/>`;
      } else {
        bodies+=insTee(X,Y,rn,'#EDEAE2',2.8)+`<circle cx="${X}" cy="${Y}" r="${Math.abs(m.x)<=4.2&&m.y>-2.6?4.4:5}" fill="#0b0f14" stroke="#EDEAE2" stroke-width="2.4"/>`;
      }
      continue;
    }
    /* the man in motion runs in the game's motion colour, so the jet or orbit
       reads at a glance instead of looking like another route */
    const col=m.c?HOT:m.mot?CYAN:GOLD;
    let r='';
    if(m._blk){ r+=insTee(X,Y,run,col,4); }
    else if((m.pts&&m.pts.length)||optionRoute(m)){
      /* an option route draws its canonical shape (stem, first option solid,
         second option dashed); everything else draws the game's polyline.
         An orbit man loops behind the quarterback, an animation in the game,
         so he is drawn as the curve he runs. */
      const orb=optionRoute(m), pts=clipDepth(oy,orb?orb.main:m.pts,ox), mm={x:ox,y:oy,pts};
      const w=[[OX,OY],...pts.map(([dx,dy])=>[px(ox+dx),py(oy+dy)])];
      const d=insRouteD(mm), [ax,ay]=w[w.length-1], [bx,by]=w[w.length-2];
      glow+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="10" stroke-opacity=".2" stroke-linejoin="round" stroke-linecap="round" filter="url(#insGlow)"/>`;
      r+=`<path class="rt" d="${d}" fill="none" stroke="${col}" stroke-width="${m.c?4.6:4}" stroke-linejoin="round" stroke-linecap="round"/>`;
      r+=arrow(ax,ay,Math.atan2(ay-by,ax-bx),col);
      for(const alt0 of (orb&&orb.alts)||[]){ const alt=clipDepth(oy,alt0,ox); const a=[[px(ox+orb.tip[0]),py(oy+orb.tip[1])],...alt.map(([dx,dy])=>[px(ox+dx),py(oy+dy)])];
        r+=`<path d="M${a.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="${col}" stroke-width="2.8" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
        const [ex,ey]=a[a.length-1],[fx,fy]=a[a.length-2]; r+=arrow(ex,ey,Math.atan2(ey-fy,ex-fx),col,8); }
    } else if(m.c){
      /* he has the ball and the game stores no path for him — a QB keep, an
         option pitch man. Draw the carry rather than leave the play blank. */
      r+=`<path class="rt" d="M${OX} ${OY} L${OX} ${(OY-SC*2.6).toFixed(1)}" fill="none" stroke="${HOT}" stroke-width="4.6" stroke-linecap="round"/>`+arrow(OX,OY-SC*2.6,-Math.PI/2,HOT);
    }
    if(r) routes+=`<g class="man" data-m="${key}">${r}</g>`;
    const halo=`<circle class="halo" cx="${X}" cy="${Y}" r="15"/>`;
    men+=`<g class="man" data-m="${key}">${m.qb?`<circle cx="${X}" cy="${Y}" r="5.2" fill="${WHITE}"/>`:icon(m._i||'circle',X,Y)}${halo}</g>`;
  }
  /* FIT THE BOX TO THE PLAY, the way the library card does. A fixed 0 0 W H
     box cut the top off every coverage (the deep thirds sit at twenty yards)
     and left the front seven floating in the middle with dead space beneath
     them. fitBox lets a defensive card zoom out and sit above the line. The
     box is written onto the svg because the read spotlight is positioned as a
     percentage of it. */
  const b=FB;
  const bx=b?b.bx:0, by=b?b.by:0, bw=b?b.bw:W, bh=b?b.bh:H;
  return `<svg viewBox="${bx.toFixed(1)} ${by.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}" class="gcard"`
    +` data-bx="${bx.toFixed(1)}" data-by="${by.toFixed(1)}" data-bw="${bw.toFixed(1)}" data-bh="${bh.toFixed(1)}">
    <defs><radialGradient id="insG" cx="50%" cy="72%" r="82%"><stop offset="0" stop-color="#1a2029"/><stop offset="1" stop-color="#090c13"/></radialGradient>
    <filter id="insGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>
    <rect x="-260" y="-360" width="${W+520}" height="${H+720}" fill="url(#insG)"/>${INS_FIELD}${typeof ruler==='function'?ruler(bx,by,bw,bh):''}${pre}${glow}${routes}${bodies}${men}<g class="dmarks"></g></svg>`;
}
/* WHAT A DEFENSIVE KEY POINTS AT. An offensive read anchors to a numbered
   eligible, which is the right handle when the men are a formation. A defence
   is not a formation, it is a set of JOBS, and the same key ("corners in the
   flats") should light whoever has that job on this call rather than whichever
   man happens to be third from the left. So a defensive anchor is the job
   name, resolved against the card, and it keeps working when the front
   changes or an adjustment moves somebody. */
const DEF_TOKENS={
  deep: (m)=>!!m.zone&&m.zk==='deep',
  hook: (m)=>!!m.zone&&(m.zk==='hook'||m.zk==='curl'),
  flat: (m)=>!!m.zone&&(m.zk==='flat'||m.zk==='seam'||m.zk==='curlflat'),
  zone: (m)=>!!m.zone,
  rush: (m)=>!!m.rush,
  man:  (m)=>m.man!==undefined,
};
function defPick(g,t){
  if(DEF_TOKENS[t]) return g.men.filter(DEF_TOKENS[t]);
  /* the man in the middle of the field, whoever is covering there */
  if(t==='mid'){ const cov=g.men.filter(m=>m.zone||m.man!==undefined);
    if(!cov.length) return [];
    return [cov.reduce((a,b)=>Math.abs(b.x)<Math.abs(a.x)?b:a)]; }
  /* the widest coverage defender on each side: the corners */
  if(t==='wide'){ const out=[];
    for(const s of [-1,1]){ const side=g.men.filter(m=>(m.zone||m.man!==undefined)&&Math.sign(m.x||s)===s);
      if(side.length) out.push(side.reduce((a,b)=>Math.abs(b.x)>Math.abs(a.x)?b:a)); }
    return out; }
  return [];
}
function insAnchors(g,tokens){
  const out={men:[],marks:[]}; if(!g||!tokens) return out;
  keyMen(g); const fl=g._flip?-1:1;
  for(const t of tokens){
    if(Array.isArray(t)){ out.marks.push([px(t[0]*fl),py(t[1])]); continue; }
    if(g.def){ for(const m of defPick(g,t)) out.men.push({k:m._k,X:px(m.x),Y:py(m.y)}); continue; }
    const m=g.men.find(x=>x._k===t); if(m) out.men.push({k:t,X:px(m.x),Y:py(m.y)});
  }
  return out;
}
const insGeo=(sc,p)=>{ const g=sc&&sc._geo&&p.slug&&sc._geo[p.slug]; if(!g) return null;
  const on=INS_ADJ.get(p.id); if(!on||!on.size||!p.adjustOps) return keyMen(g);
  return adjustGeo(g,[...on].sort().map(i=>p.adjustOps[i])); };
/* the art for a play here: a captured image if the rig made one, else the game-style card */
function insArt(sc,p){
  const url=ART_INDEX&&p.slug&&ART_INDEX[p.slug];
  if(url) return `<img src="${esc(url)}" alt="" decoding="async" draggable="false">`;
  return drawGameCard(insGeo(sc,p));
}

/* ---------- stops: the home, then per pillar the opener, the plays, the game ---------- */
const insStops=(sc,pl)=>[{t:'open'},...taughtIn(sc,pl).map(p=>({t:'play',p})),{t:'game'}];
function insPos(sc){ const plan=planOf(sc); if(!plan.pos) plan.pos={ch:-1,st:0,rd:0};
  const pos=plan.pos, N=pillarsOf(sc).length; pos.ch=Math.max(-1,Math.min(N-1,pos.ch|0));
  if(pos.ch>=0){ const n=insStops(sc,pillarAt(sc,pos.ch)).length; pos.st=Math.max(0,Math.min(n-1,pos.st|0)); } else pos.st=0;
  pos.rd=pos.rd|0; return pos; }
/* THE STAGE IS ON THE BACK STACK. Once the section is live every change of
   stop pushes where you were, so the browser's back button (and the bar's,
   and the mouse's thumb button) walks back through the plays you actually
   looked at instead of throwing you out to the library. INS_LIVE keeps the
   entry insGo — the one that lands you on the install's home — off the
   stack, and navPush ignores anything happening inside a back. */
let INS_LIVE=false, INS_AT=null, INS_NAV=null, INS_FIT=null;
addEventListener('resize',()=>{ if(INS_FIT&&SEC==='install'&&schemeOpen()) INS_FIT(); },{passive:true});
function insGo(sc,ch,st,rd){ const pos=insPos(sc), N=pillarsOf(sc).length; if(!N) return;
  ch=Math.max(-1,Math.min(N-1,ch)); let n=1; if(ch>=0) n=insStops(sc,pillarAt(sc,ch)).length; st=Math.max(0,Math.min(n-1,st));
  if(INS_LIVE&&(ch!==pos.ch||st!==pos.st)&&typeof navPush==='function') navPush();
  if(ch!==pos.ch||st!==pos.st) rd=0; pos.ch=ch; pos.st=st; pos.rd=rd||0; CH=ch; savePlan(sc); }
/* 'avail' rather than 'open': the library stylesheet already owns .open
   NOTHING IS LOCKED, on his call 2026-09-04: "I don't wanna be locked into the
   install where I can only do it in the order you're telling me to. Everything
   should be unlocked." The pillars are still numbered and the install still
   has an order it recommends — the Continue button and the pillar numbers say
   what it is — but the order is advice, not a gate. 'lock' is never returned
   now; the styles and the branches that handled it are left where they are so
   a scheme that genuinely wants a gate can turn one back on here alone. */
const insState=(sc,i)=>{ const inst=installedSet(sc), pls=pillarsOf(sc); return inst.has(pls[i].key)?'done':'avail'; };
/* the next un-inked play anywhere, for "continue" */
function insNext(sc){ const pls=pillarsOf(sc), ink=inkedSet(sc);
  for(let i=0;i<pls.length;i++){ if(insState(sc,i)==='lock') break; const plays=taughtIn(sc,pls[i]);
    for(let j=0;j<plays.length;j++) if(!ink.has(plays[j].id)) return {ch:i,st:j+1,p:plays[j]}; }
  return null; }

/* ---------- the screen ---------- */
let INS_KEYS=null, INS_POP=null, INS_POP_T=null;
function renderInstallStage(sc,body){
  const pillars=pillarsOf(sc);
  if(!pillars.length){ body.innerHTML='<div class="sk-empty">No install authored for this scheme.</div>'; return; }
  syncPillars(sc);
  /* coming in from the room always lands on the install's own home; the
     remembered position is one click away on the Continue button */
  INS_LIVE=false;
  const pos=insPos(sc); insGo(sc,-1,0,0); CH=-1;
  /* the back stack asked for a stop it had left open; it wins over everything,
     because the member pressed back and expects to see what they had */
  if(INS_AT){ insGo(sc,INS_AT.ch,INS_AT.st,INS_AT.rd||0); INS_AT=null; }
  /* the War Room's bar can ask for one play straight from its dropdown */
  else if(typeof WR_JUMP!=='undefined'&&WR_JUMP){ insGo(sc,WR_JUMP.ch,WR_JUMP.st,0); WR_JUMP=null; }
  const total=pillars.reduce((n,x)=>n+x.plays.length,0);
  const plan=planOf(sc), keys=plan.creed.keys;
  const room=INS_ROOM[sc.key]||((typeof WR!=='undefined'&&WR.is(sc))?WR.room(sc):'');

  const mast=()=>{ const ink=inkedSet(sc);
    return `<header class="ins-mast">
      <button class="ins-back" data-back="1">&larr; ${esc(navLabel())}</button>
      <button class="ins-id" data-home="1" title="The install"><span class="skh-crest">${pkCrest(sc)}</span><span><b>${esc(sc.name)}</b><i>The install &middot; ${esc(sc.series||'')}</i></span></button>
      <nav class="ins-pillars"><button class="ins-chip home${pos.ch<0?' on':''}" data-home="1"><i>&#8962;</i><span><b>The install</b><span>${installedSet(sc).size} of ${pillars.length} installed</span></span></button>${pillars.map((x,i)=>{ const s=insState(sc,i), plays=taughtIn(sc,x), n=plays.filter(p=>ink.has(p.id)).length;
        return `<button class="ins-chip ${s}${i===pos.ch?' on':''}" data-chap="${i}" ${s==='lock'?'disabled':''}><i>${s==='done'?'&#10003;':s==='lock'?LOCK:i+1}</i><span><b>${esc(x.name.replace(/^The /,''))}</b><span>${plays.length} plays &middot; ${n} inked</span></span>${s==='done'?'<em class="istamp">Installed</em>':''}</button>`; }).join('')}</nav>
      <div class="ins-count"><b>${ink.size}</b><span>of ${total} inked</span><u><i style="--p:${(ink.size/Math.max(1,total)).toFixed(3)}"></i></u></div>
    </header>`; };

  /* ---------- the way in: A2, three columns (his pick 2026-09-04) ----------
     One column per pillar, each headed by its own title-card door, its plays
     stacked underneath as cards you can open directly. Nothing is a gate.

     THE CARDS ARE SIZED BY HEIGHT, NOT WIDTH, and that is the whole trick.
     A pillar can hold one play or four (the offensive books run three, the
     match book runs one), so a fixed card width would either overflow the
     column or waste it. Each play is `flex:1 1 0` inside a column of known
     height and the card is `height:100%` with the 620/340 ratio, so the
     cards divide whatever room is left between however many plays there
     are, and the layout is identical at 1, 2, 3 or 4. */
  const homeHTML=()=>{ const ink=inkedSet(sc), nx=insNext(sc), inst=installedSet(sc);
    return `<div class="ins-home">
      <div class="home-head">
        <div>
          <div class="ins-ey">${esc(sc.name)}${sc.about&&sc.about.era?`<em>${esc(sc.about.era)}</em>`:''}</div>
          <h1>The Install</h1>
          <p class="line">${pillars.length} pillars. ${total} calls. Each one is a phase of the ${SIDEWORD(sc)} you could live in. Start anywhere.</p>
        </div>
        <div class="home-count"><b>${ink.size}</b><span>of ${total}<em>inked</em></span></div>
      </div>
      <div class="home-cols">${pillars.map((x,i)=>{ const s=insState(sc,i), plays=taughtIn(sc,x), n=plays.filter(p=>ink.has(p.id)).length;
        return `<section class="hcol ${s}${nx&&nx.ch===i?' up':''}" style="--n:${plays.length}">
          <button class="hc-top" data-chap="${i}">
            <i class="hc-num">${String(i+1).padStart(2,'0')}</i>
            <b class="hc-name">${esc(x.name)}</b>
            <u class="hc-go">&rarr;</u>
          </button>
          <div class="hc-ey">${esc(x.eyebrow||'')}${n?`<em>${n} of ${plays.length} inked</em>`:''}</div>
          <p class="hc-line">${esc(x.line||'')}</p>
          <div class="hc-plays">${plays.map((p,j)=>`<button class="hp${ink.has(p.id)?' ink':''}" data-jump="${i}|${j+1}">
            <span class="hp-art">${insArt(sc,p)}</span>
            <span class="hp-lab"><b>${esc(p.name)}</b><i>${esc(p.formation||p.libSet||'')}</i>${ink.has(p.id)?'<u>&#10003;</u>':''}</span>
          </button>`).join('')}</div>
        </section>`; }).join('')}</div>
      <div class="home-foot">
        ${nx?`<button class="skb gold" data-jump="${nx.ch}|${nx.st}">Continue with ${esc(nx.p.name)} <em>&rarr;</em></button>`:`<span class="ic gold">The whole ${SIDEWORD(sc)} is on the sheet</span>`}
        <button class="skb ghost" data-view="sheet">See the call sheet</button>
        <a class="skb ghost" href="card-lab.html" target="_blank" rel="noopener" style="text-decoration:none">Card lab <em>four ways to draw a play</em></a>
        <a class="skb ghost" href="card-design.html" target="_blank" rel="noopener" style="text-decoration:none">Card design <em>four ways to frame it</em></a>
      </div>
    </div>`; };

  const stageHTML=()=>{
    if(pos.ch<0) return homeHTML();
    const pl=pillarAt(sc,pos.ch), stops=insStops(sc,pl), stop=stops[pos.st], plays=taughtIn(sc,pl), ink=inkedSet(sc), ch=pos.ch;
    /* ---------- the title card: B2, the split (his pick 2026-09-04) --------
       Every pillar opens with one, because the scheme is built as you go and
       a section has to say what it is before it deals its calls. The words
       own the left: the name, the line, and the three things this pillar's
       game has to show, which used to sit on a screen of their own after the
       plays and are more use here, before them. The calls own the right, and
       they size themselves the same way the home's do. */
    if(stop.t==='open'){ const checks=(pl.game&&pl.game.checks)||[], done=plays.filter(p=>ink.has(p.id)).length;
      return `<div class="ins-open" style="--n:${plays.length}">
        <div class="op-words">
          <div class="ins-ey">Pillar ${ch+1} of ${pillars.length}</div>
          <h1>${esc(pl.name)}</h1>
          <div class="op-ey">${esc(pl.eyebrow||'')}</div>
          <p class="line">${esc(pl.line)}</p>
          ${checks.length?`<div class="op-checks"><div class="ins-ey">What this pillar has to show</div>
            ${checks.map((c,i)=>`<div class="op-ck"><i>${i+1}</i><span>${esc(c)}</span></div>`).join('')}</div>`:''}
        </div>
        <div class="op-calls">
          <div class="ins-ey">The ${plays.length===1?'call':plays.length+' calls'}${done?`<em>${done} inked</em>`:''}</div>
          <div class="op-list">${plays.map((p,i)=>`<button class="opc${ink.has(p.id)?' ink':''}" data-stop="${i+1}">
            <span class="opc-art">${insArt(sc,p)}</span>
            <span class="opc-lab"><i>${String(i+1).padStart(2,'0')}</i><b>${esc(p.name)}</b><span>${esc(p.formation||p.libSet||'')}</span></span>
          </button>`).join('')}</div>
          <div class="ins-acts"><button class="skb gold" data-next="1">Start with ${esc(plays[0]?plays[0].name:'the first play')} <em>&rarr;</em></button></div>
        </div>
      </div>`; }
    if(stop.t==='play'){ const p=stop.p, i=plays.indexOf(p), reads=p.reads||[], adj=p.adjustments||[], ops=p.adjustOps||[], on=insAdjSet(p.id), isInk=ink.has(p.id);
      const door=p.libSet?`<button class="hero-door" data-book-set="${esc(p.libFamily||'')}|${esc(p.libSet||'')}">In the ${esc(srcBook(sc)?srcBook(sc).team:'game')} book &middot; ${esc(p.libSet)} &rarr;</button>`:'';
      /* ---------- the play: C2, the card and the wall (his pick 2026-09-04)
         The name moved OFF the card and above it, so the card's own corner is
         no longer half covered by a plate, and the adjustments moved under
         the card where the thing they redraw is. The right hand column is
         nothing but the keys, and only the landed one carries its text: the
         rest are titles, so five keys read as a wall instead of a wall of
         words. The class names paint() and redraw() key off (.hero,
         .hero-art, .rp, .adj-b, .rd-count) are all still here. */
      return `<div class="ins-play">
        <div class="pl-main">
          <div class="reads-h"><div><div class="ins-ey">${esc(pl.name.replace(/^The /,''))}<em>play ${i+1} of ${plays.length}</em></div><h2>${crownOf(p)}${esc(p.name)}</h2></div></div>
          <div class="hero${isInk?' inked':''}">
            <div class="hero-tilt">
              <div class="hero-art">${insArt(sc,p)}</div>
              <span class="hero-glare"></span>
            </div>
            <span class="hero-stamp">On the sheet</span>
          </div>
          <div class="pl-form">${esc(p.formation||p.libSet||'')}<span class="hero-tags">${tapes(p).replace(/class="tp/g,'class="ic')}</span>${door}</div>
          <div class="ins-acts">
            <button class="skb gold" data-ink="${esc(p.id)}">Ink it onto the sheet <em>Enter</em></button>
            <button class="skb" data-read="1">Land ${RDWORD(sc)} 1 <em>Space</em></button>
            <button class="skb ghost" data-next="1">Next <em>&rarr;</em></button>
          </div>
          ${adj.length?`<div class="adj row"><div class="ins-ey">Adjustments<em>${ops.some(Boolean)?'click one to see it on the card':''}</em></div>
            <div class="adj-list">${adj.map((a,k)=>`<button class="adj-b${on.has(k)?' on':''}${ops[k]?'':' flat'}" data-adj="${k}"><i>${String.fromCharCode(65+k)}</i><span>${esc(a)}</span></button>`).join('')}</div></div>`:''}
        </div>
        <div class="reads">
          <div class="ins-ey">The ${RDWORD(sc,true).toLowerCase()}<em class="rd-count"></em></div>
          ${forcesOf(p)?`<p class="reads-why">${esc(forcesOf(p))}</p>`:''}
          <div class="rp-list">${reads.map((r,k)=>`<button class="rp wait" data-rd="${k}" style="--i:${k}"><i>${k+1}</i><span><b>${esc(r.label)}</b><p>${esc(r.text)}</p></span></button>`).join('')}</div>
        </div>
      </div>`; }
    const g=pl.game||{n:ch+1,checks:[]}, next=pillars[ch+1], n=plays.filter(p=>ink.has(p.id)).length, done=n===plays.length;
    return `<div class="ins-game">
      <div>
        <div class="ins-ey">Prove it<em>${done?`${esc(pl.name)} is installed`:`${n} of ${plays.length} on the sheet`}</em></div>
        <h1>Game ${g.n}</h1>
        <p class="line">${ch===0?'Game one runs on the base alone.':ch===1?'Game two adds the expansion while the base stays live.':'Game three is everything at once.'} ${done?'':'Ink the rest and it is installed.'}</p>
        <div class="chk">${plays.map((p,i)=>`<button class="${ink.has(p.id)?'ink':''}" data-ink="${esc(p.id)}"><i>${ink.has(p.id)?'&#10003;':i+1}</i><b>${esc(p.name)}</b><em>${esc(p.formation||'')}</em></button>`).join('')}</div>
        <div class="ins-acts">
          ${done?'':`<button class="skb gold" data-inkall="1">Ink all ${plays.length} <em>&rarr;</em></button>`}
          <button class="skb ghost" data-view="sheet">See the call sheet</button>
          ${next?`<button class="skb ${done?'gold':'ghost'}" data-chap="${ch+1}">${esc(next.name)} <em>&rarr;</em></button>`:`<button class="skb ${done?'gold':'ghost'}" data-home="1">Back to the install</button>`}
        </div>
      </div>
      ${/* THE CHECKS MOVED TO THE TITLE CARD. B2 puts "what this pillar has to
            show" at the top of the pillar, which is where it is useful: you
            read it before the plays, not after them. Printing the same three
            lines again here was the duplication that shrinks a screen, so the
            game card keeps only what is its own, the checklist and the ink. */''}
      <div class="prove-cards">${plays.map((p)=>`<span class="pv-art${ink.has(p.id)?' ink':''}">${insArt(sc,p)}</span>`).join('')}</div>
    </div>`;
  };

  const footHTML=()=>{ const ink=inkedSet(sc);
    return `<footer class="ins-foot"><div class="foot-groups">${pillars.map((x,i)=>{ const s=insState(sc,i);
      return `<div class="fg${i===pos.ch?' cur':''}${s==='lock'?' lock':''}"><u>${i+1} &middot; ${esc(x.name.replace(/^The /,''))}</u><div class="fg-cards">${taughtIn(sc,x).map((p,j)=>
        `<button class="fc${ink.has(p.id)?' ink':''}" data-jump="${i}|${j+1}" title="${esc(p.name)}"><span class="rank">${j+1}</span><span class="fc-art">${insArt(sc,p)}</span><i class="tick">&#10003;</i><b>${esc(p.name)}</b></button>`).join('')}</div></div>`; }).join('')}</div>
      <div class="ins-keys"><span><b>&larr; &rarr;</b> stops</span><span><b>Space</b> land a read</span><span><b>&uarr; &darr;</b> back through reads</span><span><b>Enter</b> ink it</span><span><b>Esc</b> the room</span></div></footer>`; };

  /* the call sheet, popping up over the screen as a play lands on it */
  const sheetPopHTML=(landing)=>{ const ink=inkedSet(sc), land=new Set(landing||[]);
    return `<div class="pop-scrim"></div><div class="pop-sheet ip">
      <div class="pop-head"><span class="ic">The call sheet</span><b>${esc(sc.name)}</b><i>${ink.size} of ${total} calls inked</i></div>
      <div class="pop-cols">${pillars.map((x,i)=>`<div class="pop-col${insState(sc,i)==='lock'?' lock':''}"><u>${i+1} &middot; ${esc(x.name.replace(/^The /,''))}</u>${taughtIn(sc,x).map((p,j)=>ink.has(p.id)
        ?`<span class="sticky${land.has(p.id)?' land':''}" style="--r:${(((i*3+j)*37)%5-2)*1.1}deg;--d:${[...land].indexOf(p.id)*140}ms"><b>${esc(p.name)}</b><em>${esc(p.formation||'')}</em></span>`
        :`<span class="slot"><i>${j+1}</i></span>`).join('')}</div>`).join('')}</div>
      <div class="pop-foot">Click anywhere, or any key, to go back</div>
    </div>`; };

  document.body.classList.add('sk-install');
  body.innerHTML=`<div class="ins" data-t="">
    <div class="ins-bg">${room?`<i class="ins-room" style="background-image:url('${esc(room)}')"></i>`:''}<i class="ins-wash"></i><i class="ins-grain"></i></div>
    ${mast()}<section class="ins-stage"></section>${footHTML()}<div class="ins-pop" hidden></div></div>`;
  const ins=body.querySelector('.ins'), pop=ins.querySelector('.ins-pop');

  /* pointer parallax on the room and the holo tilt on the hero card, one rAF for both */
  let pmx=0.5, pmy=0.5, tilt=null, raf=0;
  const tick=()=>{ raf=0;
    ins.style.setProperty('--px',(pmx-0.5).toFixed(3)); ins.style.setProperty('--py',(pmy-0.5).toFixed(3));
    const h=ins.querySelector('.hero'); if(h){ if(tilt){ h.style.setProperty('--rx',(tilt.y*-7).toFixed(2)+'deg'); h.style.setProperty('--ry',(tilt.x*9).toFixed(2)+'deg');
        h.style.setProperty('--mx',(tilt.x*50+50).toFixed(1)+'%'); h.style.setProperty('--my',(tilt.y*50+50).toFixed(1)+'%'); h.classList.add('hot'); }
      else { h.style.removeProperty('--rx'); h.style.removeProperty('--ry'); h.classList.remove('hot'); } } };
  const ask=()=>{ if(!raf) raf=requestAnimationFrame(tick); };
  ins.addEventListener('pointermove',e=>{ pmx=e.clientX/innerWidth; pmy=e.clientY/innerHeight;
    const h=e.target.closest&&e.target.closest('.hero'); if(h){ const r=h.getBoundingClientRect(); tilt={x:(e.clientX-r.left)/r.width*2-1,y:(e.clientY-r.top)/r.height*2-1}; } else tilt=null; ask(); });
  ins.addEventListener('pointerleave',()=>{ tilt=null; ask(); });

  /* paint the current play in place: which reads have landed, who is lit */
  const paint=()=>{
    if(pos.ch<0) return;
    const pl=pillarAt(sc,pos.ch), stop=insStops(sc,pl)[pos.st]; if(stop.t!=='play') return;
    const p=stop.p, reads=p.reads||[], shown=Math.min(pos.rd,reads.length), ink=inkedSet(sc);
    const st=ins.querySelector('.ins-stage');
    st.querySelectorAll('.rp').forEach((r,k)=>{ r.classList.toggle('on',k<shown); r.classList.toggle('wait',k>=shown); r.classList.toggle('now',k===shown-1); });
    const art=st.querySelector('.hero-art'), svg=art&&art.querySelector('svg.gcard');
    if(svg){
      const g=insGeo(sc,p), cur=shown?reads[shown-1]:null;
      const a=cur&&cur.at?insAnchors(g,cur.at):{men:[],marks:[]}, hot=new Set(a.men.map(m=>m.k));
      svg.querySelectorAll('.man').forEach(x=>x.classList.toggle('hot',hot.has(x.dataset.m)));
      svg.querySelector('.dmarks').innerHTML=a.marks.map(([X,Y])=>`<g class="dm"><circle cx="${X.toFixed(1)}" cy="${Y.toFixed(1)}" r="13"/><path d="M${(X-6).toFixed(1)} ${(Y-6).toFixed(1)} L${(X+6).toFixed(1)} ${(Y+6).toFixed(1)} M${(X+6).toFixed(1)} ${(Y-6).toFixed(1)} L${(X-6).toFixed(1)} ${(Y+6).toFixed(1)}"/></g>`).join('');
      const pts=[...a.men.map(m=>[m.X,m.Y]),...a.marks], lit=pts.length>0;
      art.classList.toggle('lit',lit);
      if(lit){ const cx=pts.reduce((s,q)=>s+q[0],0)/pts.length, cy=pts.reduce((s,q)=>s+q[1],0)/pts.length;
        /* the spotlight is a percentage of the card on screen, and the card's
           box is no longer always 0 0 W H, so read it off the svg */
        const bx=+svg.dataset.bx||0, by=+svg.dataset.by||0, bw=+svg.dataset.bw||W, bh=+svg.dataset.bh||H;
        art.style.setProperty('--ox',(((cx-bx)/bw)*100).toFixed(1)+'%');
        art.style.setProperty('--oy',(((cy-by)/bh)*100).toFixed(1)+'%'); }
    }
    const hero=st.querySelector('.hero'); if(hero) hero.classList.toggle('inked',ink.has(p.id));
    const rk=st.querySelector('.hero-top .rank'); if(rk){ rk.classList.toggle('gold',ink.has(p.id)); rk.innerHTML=ink.has(p.id)?'&#10003;':String(pos.st); }
    const rc=st.querySelector('.rd-count'); if(rc) rc.textContent=reads.length?`${shown} of ${reads.length}`:'';
    const rb=st.querySelector('[data-read]'); if(rb){ rb.hidden=shown>=reads.length; rb.innerHTML=`Land ${RDWORD(sc)} ${shown+1} <em>Space</em>`; }
    const ib=st.querySelector('[data-ink]'); if(ib){ const on=ink.has(p.id); ib.className='skb '+(on?'ghost':'gold'); ib.innerHTML=on?'On the sheet &#10003; <em>Enter</em>':'Ink it onto the sheet <em>Enter</em>'; }
    st.querySelectorAll('.adj-b').forEach(b=>b.classList.toggle('on',insAdjSet(p.id).has(+b.dataset.adj)));
  };
  /* an adjustment switched on or off: redraw the card in place, keep the lit read */
  const redraw=()=>{ const st=ins.querySelector('.ins-stage'), art=st.querySelector('.hero-art'); if(!art) return;
    const p=insStops(sc,pillarAt(sc,pos.ch))[pos.st].p; art.innerHTML=insArt(sc,p); art.classList.add('flash'); setTimeout(()=>art.classList.remove('flash'),450); paint(); };
  /* a new stop: the stage re-renders and slides in; the chrome updates in place */
  let lastKey='';
  /* HOW MUCH SCREEN THE SECTION ACTUALLY HAS. The home divides its leftover
     height between however many plays each pillar holds, so it needs to be
     exactly one screen tall; but it does not start at the top of one, because
     the room's bar sits above it and that bar is a different height in every
     skin. One number, measured, and the stylesheet does the rest. */
  const fitHome=()=>{ ins.style.removeProperty('--instop');
    ins.style.setProperty('--instop',Math.max(0,Math.round(ins.getBoundingClientRect().top+(window.scrollY||0)))+'px'); };
  /* one handler for the session, pointed at whichever stage is current: the
     section re-renders often and a listener per render would pile up and keep
     every dead stage alive */
  INS_FIT=fitHome;
  const show=(dir)=>{
    const stop=pos.ch<0?{t:'home'}:insStops(sc,pillarAt(sc,pos.ch))[pos.st];
    ins.dataset.t=stop.t; ins.style.setProperty('--cam',pos.ch<0?0:pos.ch*6+pos.st);
    if(stop.t==='home') fitHome();
    const st=ins.querySelector('.ins-stage'); st.style.animation='none'; st.dataset.dir=dir||'fwd'; st.innerHTML=stageHTML(); void st.offsetWidth; st.style.animation='';
    chrome(); paint(); tilt=null; ask();
  };
  const chrome=()=>{ const ink=inkedSet(sc);
    ins.querySelector('.ins-mast').outerHTML=mast();
    ins.querySelectorAll('.fg').forEach((g,i)=>{ g.classList.toggle('cur',i===pos.ch); g.classList.toggle('lock',insState(sc,i)==='lock'); });
    ins.querySelectorAll('.fc').forEach(c=>{ const [a,b]=c.dataset.jump.split('|').map(Number); c.classList.toggle('on',a===pos.ch&&b===pos.st);
      const p=taughtIn(sc,pillars[a])[b-1]; c.classList.toggle('ink',!!(p&&ink.has(p.id))); });
    refreshNav(sc);
  };
  const step=(d)=>{
    if(pos.ch<0){ if(d>0){ insGo(sc,0,0,0); show('fwd'); } return; }
    const n=insStops(sc,pillarAt(sc,pos.ch)).length, s=pos.st+d;
    if(s<0){ if(pos.ch>0){ insGo(sc,pos.ch-1,insStops(sc,pillarAt(sc,pos.ch-1)).length-1,0); } else insGo(sc,-1,0,0); show('back'); return; }
    if(s>=n){ if(pos.ch<pillars.length-1&&insState(sc,pos.ch+1)!=='lock'){ insGo(sc,pos.ch+1,0,0); show('fwd'); } else if(pos.ch===pillars.length-1){ insGo(sc,-1,0,0); show('fwd'); } return; }
    insGo(sc,pos.ch,s,0); show(d>0?'fwd':'back'); };
  const cur=()=>pos.ch<0?{t:'home'}:insStops(sc,pillarAt(sc,pos.ch))[pos.st];
  const landRead=()=>{ const s=cur(); if(s.t!=='play') return false; const n=(s.p.reads||[]).length;
    if(pos.rd<n){ pos.rd++; savePlan(sc); paint(); return true; } return false; };
  const backRead=()=>{ const s=cur(); if(s.t!=='play'||pos.rd<=0) return false; pos.rd--; savePlan(sc); paint(); return true; };
  const popOpen=(landing)=>{ pop.innerHTML=sheetPopHTML(landing); pop.hidden=false; INS_POP=true; clearTimeout(INS_POP_T); INS_POP_T=setTimeout(popClose,3200); };
  const popClose=()=>{ if(!INS_POP) return; INS_POP=false; clearTimeout(INS_POP_T); pop.classList.add('out'); setTimeout(()=>{ pop.hidden=true; pop.classList.remove('out'); pop.innerHTML=''; },260); };
  const inkCur=()=>{ const s=cur(); if(s.t!=='play') return; const on=!inkedSet(sc).has(s.p.id); inkPlay(sc,s.p.id,on);
    chrome(); paint(); if(on) popOpen([s.p.id]); else toast(`${s.p.name} pulled back off the sheet`); };

  INS_KEYS=(e)=>{ const k=e.key, c=e.code;
    if(INS_POP){ e.preventDefault(); popClose(); return; }
    if(k==='ArrowRight'||c==='ArrowRight'){ e.preventDefault(); step(1); }
    else if(k==='ArrowLeft'||c==='ArrowLeft'){ e.preventDefault(); step(-1); }
    else if(k==='ArrowUp'||c==='ArrowUp'){ e.preventDefault(); backRead(); }
    else if(k==='ArrowDown'||c==='ArrowDown'){ e.preventDefault(); landRead(); }
    else if(k===' '||k==='Spacebar'||c==='Space'){ e.preventDefault(); if(!landRead()) step(1); }
    else if(k==='Enter'||c==='Enter'||c==='NumpadEnter'){ e.preventDefault(); inkCur(); }
    else if(k==='Escape'){ if(pos.ch>=0){ insGo(sc,-1,0,0); show('back'); } else { closeAll(); SEC='home'; buildRail(); render(); scrollTo(0,0); } } };

  body.onclick=e=>{
    if(INS_POP){ popClose(); return; }
    if(e.target.closest('[data-home]')){ insGo(sc,-1,0,0); show('back'); return; }
    const ch=e.target.closest('[data-chap]'); if(ch&&!ch.disabled){ insGo(sc,+ch.dataset.chap,0,0); show('fwd'); return; }
    const st=e.target.closest('[data-stop]'); if(st){ insGo(sc,pos.ch,+st.dataset.stop,0); show('fwd'); return; }
    const jp=e.target.closest('[data-jump]'); if(jp){ const [a,b]=jp.dataset.jump.split('|').map(Number); if(insState(sc,a)==='lock') return; insGo(sc,a,b,0); show(a>pos.ch||(a===pos.ch&&b>pos.st)?'fwd':'back'); return; }
    if(e.target.closest('[data-next]')){ step(1); return; }
    if(e.target.closest('[data-read]')){ landRead(); return; }
    const rd=e.target.closest('[data-rd]'); if(rd){ pos.rd=+rd.dataset.rd+1; savePlan(sc); paint(); return; }
    const ad=e.target.closest('[data-adj]'); if(ad){ const s=cur(); if(s.t!=='play') return; const set=insAdjSet(s.p.id), k=+ad.dataset.adj; if(!s.p.adjustOps||!s.p.adjustOps[k]) return; set.has(k)?set.delete(k):set.add(k); redraw(); return; }
    const ik=e.target.closest('[data-ink]'); if(ik){ const id=ik.dataset.ink, on=!inkedSet(sc).has(id); inkPlay(sc,id,on); if(cur().t==='play'){ chrome(); paint(); } else show('fwd'); if(on) popOpen([id]); return; }
    if(e.target.closest('[data-inkall]')){ const pl=pillarAt(sc,pos.ch), ink=inkedSet(sc), fresh=taughtIn(sc,pl).filter(p=>!ink.has(p.id)).map(p=>p.id); taughtIn(sc,pl).forEach(p=>inkPlay(sc,p.id,true)); show('fwd'); popOpen(fresh); return; }
    const bs=e.target.closest('[data-book-set]'); if(bs){ const [fam,set]=bs.dataset.bookSet.split('|'); const src=srcBook(sc);
      closeAll(); SCHEME=null; VIEW=src?'book':'formations'; BOOK=src?src.key:null; FAM=fam||null; SET=set||null; FAMPICK=fam||null; buildRail(); render(); return; }
  };
  show('fwd');
  /* the stage is up: from here every move is a place you can come back to,
     and the back stack has a way to move it without a re-render */
  INS_LIVE=true;
  INS_NAV=(ch,st,rd,dir)=>{ insGo(sc,ch,st,rd); show(dir||'back'); };
}
/* the keys reach the install only while it is the open view and nothing sits over it */
addEventListener('keydown',e=>{
  if(!INS_KEYS||SEC!=='install'||!schemeOpen()) return;
  if(modalOpen()||$('#skdrawer.open')||(DBX.els&&DBX.els.root.classList.contains('open'))) return;
  if(e.target&&e.target.matches&&e.target.matches('input,textarea,select')) return;
  INS_KEYS(e);
});
