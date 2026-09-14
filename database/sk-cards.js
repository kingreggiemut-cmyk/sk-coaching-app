/* sk-cards.js — the Scheme Kings card engine.

   THIS FILE IS SHARED BY EVERY SCHEME PAGE. It draws a play card and a
   formation tile from the geometry the build writes, and it knows nothing
   about any particular playbook, any page's navigation, or any user. Keep it
   that way: a page tells it what to draw, never the other way round. A fix in
   here fixes every book at once, which is the whole reason it is not pasted
   into each page.

   Everything it needs is passed in. The only globals it defines are the
   drawing vocabulary below, and they are deliberately short because the two
   renderers (this and install.js) have always shared them.

   Extracted from index.html on 2026-09-03, line for line and unchanged, so a
   card drawn today is byte for byte the card drawn yesterday. */
'use strict';
const slug = (s) => String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------- card drawing (placeholder art) ---------------- */
/* SC is the card's depth. The game's card shows about twenty yards above
   the line; at nine pixels a yard ours showed twenty-seven, and every
   route read shallower than the game's for it. Eleven puts the same
   ten-yard leg at the same share of the card. */
const W=620,H=340,SC=11,LOSY=H*0.68,CX=W/2;   /* 0.68: the pistol and I-form backs at eight yards need the room below */
const px=(x)=>CX+x*SC, py=(y)=>LOSY-y*SC;
const YELLOW='#C9C14E', RED='#C0403A', WHITE='#EDEAE2';
const ICONS=['square','triangle','cross','r1','circle'];

function icon(kind,X,Y){
  const disc=`<circle cx="${X}" cy="${Y}" r="7" fill="#141518" stroke="#0A0B0C"/>`;
  if(kind==='square')   return disc+`<rect x="${X-3.4}" y="${Y-3.4}" width="6.8" height="6.8" fill="none" stroke="#D97BC0" stroke-width="1.8"/>`;
  if(kind==='triangle') return disc+`<path d="M${X} ${Y-4} L${X+3.8} ${Y+3} L${X-3.8} ${Y+3} Z" fill="none" stroke="#43C3B6" stroke-width="1.8"/>`;
  if(kind==='cross')    return disc+`<path d="M${X-3.2} ${Y-3.2} L${X+3.2} ${Y+3.2} M${X-3.2} ${Y+3.2} L${X+3.2} ${Y-3.2}" stroke="#7FA8E8" stroke-width="1.9"/>`;
  if(kind==='circle')   return disc+`<circle cx="${X}" cy="${Y}" r="3.6" fill="none" stroke="#E06A6A" stroke-width="1.8"/>`;
  if(kind==='r1')       return `<rect x="${X-8}" y="${Y-5.5}" width="16" height="11" rx="2.5" fill="#DDDAD2"/>`+
                               `<text x="${X}" y="${Y+3}" text-anchor="middle" font-size="8" font-weight="700" fill="#232323">R1</text>`;
  return `<circle cx="${X}" cy="${Y}" r="3.6" fill="${WHITE}"/>`;
}
function arrow(ax,ay,th,col,L=11){
  const p=(a,l)=>`${(ax+l*Math.cos(th+a)).toFixed(1)} ${(ay+l*Math.sin(th+a)).toFixed(1)}`;
  return `<path d="M${p(0,L*0.55)} L${p(2.5,L)} L${p(-2.5,L)} Z" fill="${col}"/>`;
}
/* THE GROUND. Yard lines every five, and the hash marks as real dashes, one
   per yard, down both hash lines and both sidelines — the same ground the
   install draws, so a card reads the same wherever it appears. */
let FIELD = '';
(function(){
  let f='';
  /* drawn for the whole field, not just the height of an offensive card: a
     defensive card zooms out to show the deep zones and needs ground up there */
  for(let y=-12;y<=34;y+=5){ const yy=py(y); if(y===10)continue;
    f+=`<line x1="0" y1="${yy.toFixed(1)}" x2="${W}" y2="${yy.toFixed(1)}" stroke="rgba(240,231,203,.075)"/>`; }
  for(let y=-12;y<=34;y++){ const yy=py(y);
    for(const hx of [W*0.355,W*0.645])
      f+=`<line x1="${(hx-4).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(hx+4).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(240,231,203,.16)" stroke-width="1.6"/>`;
    for(const sx of [W*0.055,W*0.945])
      f+=`<line x1="${(sx-3).toFixed(1)}" y1="${yy.toFixed(1)}" x2="${(sx+3).toFixed(1)}" y2="${yy.toFixed(1)}" stroke="rgba(240,231,203,.1)" stroke-width="1.4"/>`; }
  /* THE TEN YARD LINE, AT TEN YARDS. It used to be drawn at thirteen, so it
     lined up with nothing and made every route's depth unreadable. */
  f+=`<line x1="0" y1="${py(10).toFixed(1)}" x2="${W}" y2="${py(10).toFixed(1)}" stroke="rgba(242,181,14,.5)" stroke-width="2"/>`;
  f+=`<line x1="0" y1="${LOSY}" x2="${W}" y2="${LOSY}" stroke="rgba(240,231,203,.42)" stroke-width="1.6"/>`;
  FIELD=f;
})();
/* THE DEPTH RULER. Five, ten, fifteen and twenty down both edges, so a
   fifteen-yard dig reads as fifteen yards. Drawn per card rather than baked
   into FIELD because the box moves when a card is fitted to its play, and
   sized against the box so the numerals stay the same size on screen. */
const RULER_FONT='Barlow,Segoe UI,system-ui,sans-serif';
function ruler(bx,by,bw,bh){
  const k=bw/W, fs=10.5*k, inset=8*k, dy=fs*0.36;
  let r='';
  for(const y of [5,10,15,20]){ const yy=py(y);
    if(yy<by+fs*1.4||yy>by+bh-fs*0.4) continue;
    const op=y===10?'.52':'.3';
    const t=(x,anc)=>`<text x="${x.toFixed(1)}" y="${(yy+dy).toFixed(1)}"${anc?' text-anchor="end"':''}`
      +` font-family="${RULER_FONT}" font-size="${fs.toFixed(1)}" font-weight="800" fill="rgba(240,231,203,${op})">${y}</text>`;
    r+=t(bx+inset,0)+t(bx+bw-inset,1);
  }
  return r;
}
/* FIT THE BOX TO THE PLAY. A dive used to draw as a tiny cluster in a sea of
   empty field because every card showed all of it. The box is fitted to the
   ink this play actually puts down, clamped so nothing zooms past about one
   and a half, with the line of scrimmage always in frame. */
/* ONE FRAME FOR EVERY PLAY (2026-09-10). Fitting the box to each play's own
   ink made the zoom wander from full field to one and a half times closer
   depending on how deep its routes ran, so a dive sat huge beside a four
   verticals and no two cards read at the same scale. He wants the zoom, but
   standard. So every card now uses the same frame: the ball in the middle,
   the line of scrimmage at the same height, one zoom.
     offence  1.15x   49 yards across, 17.7 above the line, 9.2 below it
     defence  1.05x   the whole field sideline to sideline, 26 yards above
   Measured over all 13,351 offensive cards: 99.4% fit that frame completely
   (every formation out to the widest sets at 23 yards, the deepest pistol and
   I-form backs below); the rest are practice drills with men parked off the
   field, and they keep the fitted box below. Routes that run past the frame
   stop at its edge with their arrow, the way they used to stop at the card's. */
const FRAME={ off:{z:1.15, below:9.2}, def:{z:1.05, below:3.2} };
function frameBox(g){
  const def=!!g.def, F=def?FRAME.def:FRAME.off;
  const bw=W/F.z, bh=H/F.z, bx=CX-bw/2, by=LOSY+F.below*SC-bh;
  const half=(bw/2)/SC, top=(LOSY-by)/SC, low=-F.below;
  const inside=(x,y,mx,my)=>Math.abs(x)<=half-mx&&y>=low+my&&y<=top-my;
  for(const m of g.men){
    if(!inside(m.x,m.y,1.0,0.7)) return null;
    /* a motion line may brush the bottom edge: it is a line, not a man */
    for(const p of (m.mpath||[])) if(!inside(p[0],p[1],1.0,-0.5)) return null;
    /* but where the motion lands him is where he stands at the snap: a man */
    if(m.mpath&&m.mpath.length){ const L=m.mpath[m.mpath.length-1]; if(!inside(L[0],L[1],1.0,0.7)) return null; }
    if(m.shift&&!inside(m.x+m.shift[0],m.y+m.shift[1],1.0,0.7)) return null;
    /* a zone may run a yard off the sideline, never off the top */
    if(m.zone){ const [zx,zy,zrx,zry]=m.zone;
      if(m.y+zy+zry>top-0.2||Math.abs(m.x+zx)-zrx>half) return null; }
  }
  return { bx, by, bw, bh, std:1 };
}
function fitBox(g){
  if(!g||!g.men||!g.men.length) return null;
  const std=frameBox(g); if(std) return std;
  /* an offensive play that will not fit the frame (a practice drill, an orbit
     that lands a man deeper than the frame) shows the whole card, never a
     closer crop: the only two scales anyone sees are the frame and the field.
     Defence keeps the fitted box below for the kick returns whose men stand
     sixty yards downfield. */
  if(!g.def) return null;
  const def=!!g.def;
  /* a defensive card is not clipped to an offensive card's depth: the deep
     zones sit twenty yards upfield and the box zooms out to hold them */
  const XL=px(-X_MAX), XR=px(X_MAX), YT=def?-1e9:py(DEPTH_MAX), YB=def?1e9:py(DEPTH_MIN);
  let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9;
  const put=(x,y)=>{ const X=Math.max(XL,Math.min(XR,px(x))), Y=Math.max(YT,Math.min(YB,py(y)));
    if(X<x0)x0=X; if(X>x1)x1=X; if(Y<y0)y0=Y; if(Y>y1)y1=Y; };
  for(const m of g.men){ put(m.x,m.y);
    for(const [dx,dy] of (m.pts||[])) put(m.x+dx,m.y+dy);
    for(const [dx,dy] of (m.rel||[])) put(m.x+dx,m.y+dy);
    for(const p of (m.mpath||[])) put(p[0],p[1]);
    if(m.shift) put(m.x+m.shift[0],m.y+m.shift[1]);
    /* the whole zone, not just its middle */
    if(m.zone){ const [zx,zy,zrx,zry]=m.zone;
      put(m.x+zx-zrx,m.y+zy-zry); put(m.x+zx+zrx,m.y+zy+zry); } }
  if(x0>x1) return null;
  y0=Math.min(y0,LOSY-SC*2); y1=Math.max(y1,LOSY+SC*1.2);
  const padX=32,padY=def?26:20;
  let bw=Math.max((x1-x0)+padX*2, W/1.55), bh=bw*H/W;
  if((y1-y0)+padY*2>bh){ bh=(y1-y0)+padY*2; bw=bh*W/H; }
  if(!def&&bw>=W) return null;
  const cx=(x0+x1)/2, cy=(y0+y1)/2;
  /* offence stays inside the card; defence may sit above it, so the box is
     free to run past the top */
  if(def) return { bx:cx-bw/2, by:cy-bh/2, bw, bh };
  return { bx:Math.max(0,Math.min(W-bw,cx-bw/2)), by:Math.max(0,Math.min(H-bh,cy-bh/2)), bw, bh };
}
/* ---------------- option routes ----------------
   An option route is a stem and a decision. The game stores the stem (and,
   in the assignment's own name, how long it is: "Run80for05") and the TYPE
   of decision — Hitch_Out, Curl_Dig, Drag_Hitch — but not the break, because
   the break is made against the defender at run time. The game's own card
   draws a canonical shape for each type, and so does this: the stem, the
   first option solid, the second option dashed. "out" is toward the
   sideline the man is on, "in" toward the middle. Yards, relative to him. */
const OPTION_SHAPES={
  /* the stick: a hitch that turns outside, with the out as the dotted option */
  Hitch_Out:      (s,o)=>({stem:s||5,  main:[[o*1.3,-1]],     alt:[[o*6,0.6]]}),
  Seam_Fade_Curl: (s,o)=>({stem:s||8,  main:[[0,9]],          alts:[[[o*2.5,8]],[[-o*1.4,-1.3]]]}),
  Hitch_In_Out:   (s,o)=>({stem:s||3,  main:[[o*5,0]],        alt:[[-o*5,0]]}),
  Hitch_Fade:     (s,o)=>({stem:s||5,  main:[[-o*1.4,-1]],    alt:[[o*1.5,12]]}),
  Hitch_Fade_Slant:(s,o)=>({stem:s||3, main:[[-o*1.4,-1]],    alt:[[o*1.5,12]]}),
  Out_Fade:       (s,o)=>({stem:s||5,  main:[[o*6,0]],        alt:[[o*1.5,12]]}),
  Out_Fade_Slant: (s,o)=>({stem:s||5,  main:[[o*6,0]],        alt:[[o*1.5,12]]}),
  Curl_Dig:       (s,o)=>({stem:s||10, main:[[-o*1.6,-2]],    alt:[[-o*8,0]]}),
  Curl_Fade:      (s,o)=>({stem:s||10, main:[[-o*1.6,-2]],    alt:[[o*1.5,10]]}),
  /* the game's card: the curl, the post, and the seam — three ways */
  Curl_Post_Seam: (s,o)=>({stem:s||10, main:[[-o*1.6,-2]],    alts:[[[-o*7,5]],[[0,9]]]}),
  Curl_Seam:      (s,o)=>({stem:s||8,  main:[[-o*1.6,-2]],    alt:[[0,10]]}),
  Dig_Post:       (s,o)=>({stem:s||8,  main:[[-o*8,0]],       alt:[[-o*5,8]]}),
  /* mesh: the drag across, with the option to sit down in the window in
     the middle. The sit is drawn as a dashed hook halfway along the drag. */
  Drag_Hitch:     (s,o)=>({stem:s||2,  main:[[-o*14,1.6]],    alt:[[-o*6.5,0.75],[-o*0.5,-1.7]]}),
  Seam_Bender:    (s,o)=>({stem:s||8,  main:[[-o*4,8]],       alts:[[[0,9]]]}),
  Post_Corner:    (s,o)=>({stem:s||10, main:[[-o*6,8]],       alt:[[o*6,8]]}),
  Comeback_Fade:  (s,o)=>({stem:s||12, main:[[o*2,-3]],       alt:[[o*1,8]]}),
  Juke:           (s,o)=>({stem:s||7,  main:[[o*4,1]],        alt:[[-o*4,1]]}),
  Route:          (s,o)=>({stem:s||5,  main:[[o*5,0]],        alt:[[-o*5,0]]}),
  HB_Choice_In_Out:(s,o)=>({stem:0,    pre:[[o*3,s||5]],      main:[[o*5,0]],  alt:[[-o*3,0]]}),
  /* a back's option route the way it is coached (his note 2026-09-14): a hook to three or four yards, then he breaks either way */
  HB_Option:      (s,o)=>({stem:s||8,   pre:[[o*2,2]],         main:[[-o*0.4,-1.4]], alts:[[[o*5,0]],[[-o*5,0]]]}),
  HB_Choice_Out:  (s,o)=>({stem:0,     pre:[[o*3,s||5]],      main:[[o*5,0]],  alt:null}),
  HB_Choice_In:   (s,o)=>({stem:0,     pre:[[o*3,s||5]],      main:[[-o*5,0]], alt:null}),
  /* the run-and-shoot / veer-and-shoot family. The decision is named, the
     ops hold only the stem, so the stem is the man's own path (base:'pts')
     and the branches fork from its tip: a choice is post, corner or sit. */
  Choice:         (s,o)=>({stem:s||12, main:[[-o*7,6]],  alts:[[[0,9]],[[-o*1.4,-1.3]]]}),
  /* a switch release to the outside, then keep going or sit */
  Switch_Choice:  (s,o)=>({stem:s||8,  main:[[o*3,8]],    alts:[[[-o*1.2,-1.4]],[[-o*6,1.5]]]}),
  /* a bunch man's angle release, then hitch or in */
  Angle_Hitch:    (s,o)=>({stem:s||5,  main:[[-o*1.4,-1.3]], alts:[[[-o*7,1]]]}),
  Hitch_Slant:    (s,o)=>({stem:s||5,  main:[[-o*1.4,-1.3]],  alts:[[[-o*7,5]]]}),
  Out_Slant:      (s,o)=>({stem:s||5,  main:[[o*6,0]],        alts:[[[-o*7,5]]]}),
  Hitch_Out_Post: (s,o)=>({stem:s||8,  main:[[-o*1.4,-1.3]],  alts:[[[o*6,0]],[[-o*6,7]]]}),
  Corner_Curl_Seam:(s,o)=>({stem:s||8, main:[[-o*1.6,-2]],    alts:[[[o*6,7]],[[0,10]]]}),
  Hitch_Out_Fade: (s,o)=>({stem:s||10, main:[[-o*1.4,-1.3]],  alts:[[[o*6,0]],[[o*1.5,10]]]}),
  Curl_Out:       (s,o)=>({stem:s||10, main:[[-o*1.6,-2]], alts:[[[o*6,0]]]}),
};
/* THE STEM IS THE MAN'S OWN PATH. The build already draws the stem the
   game stores — an inside release, a switch release, a twenty-yard deep
   read — so every shape forks from the end of that, and falls back to its
   own stem only when the man has no path. The halfback shapes carry their
   swing in `pre` and keep it. */
/* returns {main:[[dx,dy]..], alt:[[dx,dy]..]|null} as full polylines from the man, or null if the type is not one we draw */
function optionRoute(m){
  const fn=m.opt&&OPTION_SHAPES[m.opt]; if(!fn) return null;
  /* "out" is toward his sideline; a drag named Lt or Rt goes the way it says */
  const o=m.dd?-m.dd:(m.x>=0?1:-1), sh=fn(m.stem||0,o);
  const base=[]; let cx=0,cy=0;
  const own=m.pts&&m.pts.length&&!sh.pre&&Math.hypot(m.pts[m.pts.length-1][0],m.pts[m.pts.length-1][1])>=1.5;
  if(own){ for(const p of m.pts) base.push([p[0],p[1]]); [cx,cy]=m.pts[m.pts.length-1]; }
  else{
    for(const [dx,dy] of (sh.pre||[])){ cx+=dx; cy+=dy; base.push([cx,cy]); }
    if(sh.stem){ cy+=sh.stem; base.push([cx,cy]); }
  }
  const fork=(legs)=>{ if(!legs) return null; let x=cx,y=cy; const out=[]; for(const [dx,dy] of legs){ x+=dx; y+=dy; out.push([x,y]); } return out; };
  const alts=(sh.alts||(sh.alt?[sh.alt]:[])).map(fork).filter(Boolean);
  return { main:[...base,...(fork(sh.main)||[])], alt:alts[0]||null, alts, tip:[cx,cy] };
}
/* ---------------- pre-snap motion ----------------
   The path a motion man takes before the snap is an animation in the game,
   not coordinates: an orbit loops behind the quarterback, a return goes in
   behind him and comes back out, a jet crosses just behind the line. The
   data names the kind and where he runs AFTER the snap. So the card draws
   the kind's shape from his spot to a landing point, and his route starts
   from there. side = the way he ends up travelling. */
function motionPre(m,qb,firstDx){
  if(!m||!m.mot||!qb) return null;
  const k=m.mk; if(!/^(orbit|return|jet|across)$/.test(k||'')) return null;
  const side=firstDx?Math.sign(firstDx):(m.x>0?-1:1);
  let L,C;
  if(k==='orbit'){ L=[qb.x+side*4, qb.y+0.4]; C=[qb.x-side*1.5, qb.y-6.5]; }
  else if(k==='return'){ L=[qb.x+side*1.6, qb.y-1.2]; C=[m.x-side*1.2, qb.y-6]; }
  else if(k==='jet'){ L=[qb.x+side*5, -3.2]; C=[qb.x-side*3, -4.8]; }
  else { L=[qb.x+side*6, m.y]; C=[qb.x, m.y-2.2]; }
  return {L,C, d:`M${px(m.x).toFixed(1)} ${py(m.y).toFixed(1)} Q${px(C[0]).toFixed(1)} ${py(C[1]).toFixed(1)} ${px(L[0]).toFixed(1)} ${py(L[1]).toFixed(1)}`};
}
/* NOTHING LEAVES THE CARD. A streak is stored as fifty yards; the arrow
   stops inside the top edge, the way the game's card stops it. Clip a
   polyline (yards, relative to its origin) at the visible depth. */
const DEPTH_MAX=(LOSY-16)/SC, DEPTH_MIN=-(H-LOSY-14)/SC, X_MAX=(W/2-14)/SC;
/* the limits a route is clipped to: the card's by default, the frame's while
   drawCard draws inside a standard frame (see FRAME) */
let CLIPB={top:DEPTH_MAX, bot:DEPTH_MIN, x:X_MAX};
/* clip against the whole card: top, bottom (a pitch man swinging out of a
   deep backfield) and both sides. ox may be omitted for a vertical-only clip. */
function clipDepth(oy,pts,ox){
  if(!pts||!pts.length) return pts;
  const out=[]; let px0=0, py0=0;
  const TOP=CLIPB.top, BOT=CLIPB.bot, XM=CLIPB.x;
  const inside=(dx,dy)=>oy+dy<=TOP&&oy+dy>=BOT&&(ox===undefined||Math.abs(ox+dx)<=XM);
  for(const [dx,dy] of pts){
    if(!inside(dx,dy)){
      /* walk the segment back to the edge it crossed */
      let t=1;
      if(oy+dy>TOP) t=Math.min(t,(TOP-oy-py0)/((dy-py0)||1e-9));
      if(oy+dy<BOT) t=Math.min(t,(BOT-oy-py0)/((dy-py0)||1e-9));
      if(ox!==undefined&&Math.abs(ox+dx)>XM){ const lim=(dx>px0?XM:-XM)-ox; t=Math.min(t,(lim-px0)/((dx-px0)||1e-9)); }
      t=Math.max(0,Math.min(1,t));
      out.push([px0+(dx-px0)*t,py0+(dy-py0)*t]); return out;
    }
    out.push([dx,dy]); px0=dx; py0=dy;
  }
  return out;
}
/* a route's corners rounded, so a break reads as a cut and not a zigzag */
function routeD(m,r=9){
  const w=[[px(m.x),py(m.y)],...m.pts.map(([dx,dy])=>[px(m.x+dx),py(m.y+dy)])];
  if(w.length<3) return 'M'+w.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L');
  let d=`M${w[0][0].toFixed(1)} ${w[0][1].toFixed(1)}`;
  for(let i=1;i<w.length-1;i++){
    const [ax,ay]=w[i-1],[bx,by]=w[i],[cx,cy]=w[i+1];
    const l1=Math.hypot(bx-ax,by-ay)||1,l2=Math.hypot(cx-bx,cy-by)||1,rr=Math.min(r,l1/2,l2/2);
    d+=` L${(bx-(bx-ax)/l1*rr).toFixed(1)} ${(by-(by-ay)/l1*rr).toFixed(1)} Q${bx.toFixed(1)} ${by.toFixed(1)} ${(bx+(cx-bx)/l2*rr).toFixed(1)} ${(by+(cy-by)/l2*rr).toFixed(1)}`;
  }
  return d+` L${w[w.length-1][0].toFixed(1)} ${w[w.length-1][1].toFixed(1)}`;
}

/* THE GAME'S OWN ZONE COLOURS, off his screenshots: deep blue across the
   top, yellow for the hooks and curls, purple in the flats, light blue on
   the curl-to-flat, grey for anything else. The leader from the man is the
   same colour as the zone he has. */
/* COLOUR BY THE JOB, NOT THE FAMILY.
   The game shades a flat defender by what KIND of flat he is playing, and the
   difference is the difference between a spot drop and a match rule. Checked
   against six plays in 3-4 Tite and it separates every one of them:

     Cover 3 Sky, Cover 4 Drop   dark purple   curl-to-flat
     Cover 3 Match               light purple  seam-to-flat
     Cover 4 Quarters            light purple  quarter-flat
     Saw Blitz 2                 light blue    soft squat
     Tampa 2                     teal          cloud flat

   Grouping those five jobs into two families - which is what this table used to
   do - threw the distinction away and painted Sky the same as Match. The job is
   already on every man, so the palette keys on it and falls back to the family
   only for anything without its own shade. */
/* ONE DEFENSIVE VOCABULARY, DRAWN IN ONE PLACE. The library card and the
   install's card both call this, so a coverage looks the same wherever it is
   drawn. Before it existed the install rendered defenders with the OFFENSIVE
   vocabulary: zone men got no line at all and rushers came out as gold routes
   running the wrong way, which is why an install card looked like nothing on
   the field. Returns the three layers; the caller wraps them in whatever
   grouping its own hotspots need, and passes the attributes it wants on the
   route path. */
function defParts(m,routeAttr){
  const X=px(m.x), Y=py(m.y);
  const xmark=`<path d="M${X-4} ${Y-4} L${X+4} ${Y+4} M${X-4} ${Y+4} L${X+4} ${Y-4}" stroke="#F2EEE2" stroke-width="2.4" stroke-linecap="round"/>`;
  /* a zone: a filled ellipse where the zone sits, coloured by what kind it is,
     with a solid leader from the man to it. The leader IS his drop, so it
     animates like a route. */
  if(m.zone){
    const Z=ZONE_COL[m.zj]||ZONE_COL[m.zk]||ZONE_COL.other;
    const [zx,zy,zrx,zry]=m.zone, ZX=px(m.x+zx), ZY=py(m.y+zy), RX=zrx*SC, RY=zry*SC;
    return {
      glow:`<ellipse cx="${ZX.toFixed(1)}" cy="${ZY.toFixed(1)}" rx="${RX.toFixed(1)}" ry="${RY.toFixed(1)}"`
        +` fill="${Z.fill}" stroke="${Z.line}" stroke-width="2"`
        +(m.lb?`><title>${esc(m.lb)}${m.src?', inferred, '+Math.round((m.cf||0)*100)+'% confident':''}</title></ellipse>`:'/>'),
      routes:`<path ${routeAttr||''} d="M${X} ${Y} L${ZX.toFixed(1)} ${ZY.toFixed(1)}" fill="none" stroke="${Z.line}" stroke-width="2.6" stroke-linecap="round"/>`,
      bodies:xmark,
    };
  }
  /* the game draws a man defender no line, and neither do we */
  if(m.man!==undefined) return { glow:'', routes:'',
    bodies:xmark+`<circle cx="${X}" cy="${Y}" r="8.6" fill="none" stroke="rgba(242,238,226,.34)" stroke-width="1.4"/>` };
  let routes='';
  if(m.rush&&m.pts&&m.pts.length){
    const w=[[X,Y],...m.pts.map(([dx,dy])=>[px(m.x+dx),py(m.y+dy)])];
    const d=routeD({x:m.x,y:m.y,pts:m.pts},7);
    routes+=`<path ${routeAttr||''} d="${d}" fill="none" stroke="${RED}" stroke-width="3.4" stroke-linejoin="round" stroke-linecap="round"/>`;
    const [ax,ay]=w[w.length-1],[bx,by]=w[w.length-2];
    routes+=`<g class="rar">${arrow(ax,ay,Math.atan2(ay-by,ax-bx),RED,11)}</g>`;
  }
  /* a rusher is the square the game draws him as */
  return { glow:'', routes, bodies:`<rect x="${(X-4.2).toFixed(1)}" y="${(Y-4.2).toFixed(1)}" width="8.4" height="8.4" fill="#F2EEE2"/>` };
}
const ZONE_COL={
  deep:    {fill:'rgba(43,58,190,.62)', line:'#7E93FF'},
  hook:    {fill:'rgba(150,150,58,.62)',line:'#E8E874'},
  /* ---- the per-job shades ---- */
  'curl-flat':    {fill:'rgba(88,64,146,.66)', line:'#9B7FD4'},   // spot drop
  'seam-flat':    {fill:'rgba(146,112,176,.62)',line:'#D3B0EC'},  // match
  'quarter-flat': {fill:'rgba(146,112,176,.62)',line:'#D3B0EC'},  // match
  'soft-squat':   {fill:'rgba(74,138,186,.62)',line:'#8FD0F0'},   // match
  'cloud-flat':   {fill:'rgba(52,140,140,.62)',line:'#74DCDC'},   // spot drop
  'hard-flat':    {fill:'rgba(52,140,140,.62)',line:'#74DCDC'},   // spot drop
  /* a corner sinking to the flat, the Cover 2 and Tampa 2 look */
  flat:    {fill:'rgba(52,140,140,.62)',line:'#74DCDC'},
  /* CURL-TO-FLAT IS PURPLE, NOT TEAL, and the game is the authority on that.
     It used to borrow the flat's teal, which is why Cover 3 Sky and Cover 4
     Drop came out with teal outside zones where the game draws them purple -
     both of those play curl-to-flat out there. Cover 3 Match already matched
     because its outside men carry seam-to-flat, which was purple all along.
     A pure flat - cloud, hard, soft squat - stays teal, and that is right:
     Saw Blitz 2 and SS 2 Trap are teal in the game too. */
  curlflat:{fill:'rgba(146,112,176,.62)',line:'#D3B0EC'},
  /* a nickel or backer carrying the seam to the flat: the same match colour */
  seam:    {fill:'rgba(146,112,176,.62)',line:'#D3B0EC'},
  other:   {fill:'rgba(150,150,150,.52)',line:'#DEDEDE'},
};
const CARD_DEFS=`<defs><radialGradient id="cardG" cx="50%" cy="72%" r="82%"><stop offset="0" stop-color="#1a2029"/><stop offset="1" stop-color="#090c13"/></radialGradient>`
  +`<filter id="cardGlow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4"/></filter></defs>`;
/* THE COVERAGE, IN WORDS.
   A colour tells you a zone is deep or underneath and nothing else, and "which
   of these four yellow ovals is the lurk" is exactly the question these cards
   were failing to answer. Every line here is the game's own assignment name for
   that defender, read off DefenseZone/DefenseMan/DefenseRush; where the name
   had to be recovered rather than read, the row says so. */
const KEY_ORDER=['rush','man','deep','seam','curlflat','hook','flat','spy','other'];
function coverageKey(g){
  if(!g||!g.def||!g.men) return '';
  const rows=g.men.map((m,i)=>({i,m})).filter(({m})=>m.lb);
  if(!rows.length) return '';
  const fam=m=>m.zk||(m.rush?'rush':(m.man!=null?'man':'other'));
  rows.sort((a,b)=>{
    const d=KEY_ORDER.indexOf(fam(a.m))-KEY_ORDER.indexOf(fam(b.m));
    return d||a.m.x-b.m.x;
  });
  /* one row per job, with the men who share it counted rather than repeated */
  const seen=new Map();
  for(const {m} of rows){
    const k=fam(m)+'|'+m.lb+'|'+(m.src||'');
    if(!seen.has(k)) seen.set(k,{f:fam(m),j:m.zj,lb:m.lb,src:m.src,cf:m.cf,n:0});
    seen.get(k).n++;
  }
  const swatch=(f,j)=>((ZONE_COL[j]||ZONE_COL[f]||{}).line)||(f==='rush'?'#FF6B5E':f==='man'?'#F2A14E':'#DEDEDE');
  return `<div class="covkey"><h4>What every defender is doing</h4><ul>`
    +[...seen.values()].map(r=>`<li><i style="background:${swatch(r.f,r.j)}"></i>`
      +`<b>${esc(r.lb)}</b>${r.n>1?`<em>&times;${r.n}</em>`:''}`
      +(r.src?`<u title="not in the play's own record; recovered from how this assignment id is used elsewhere in the game">inferred${r.cf?' &middot; '+Math.round(r.cf*100)+'%':''}</u>`:'')
      +`</li>`).join('')
    +`</ul><p>Read from the game's own assignment names. Zone sizes and landmarks are ours; which side each zone is on is measured from the game's data.</p></div>`;
}
function drawCard(g){
  if(!g) return drawCardEmpty();
  const b=fitBox(g);
  /* inside the standard frame a route stops at the frame's edge (an arrow's
     length in from it), not the card's */
  frameClip(b);
  try{ return drawCardIn(g,b); } finally { frameClip(null); }
}
/* clip routes to a standard frame while it is being drawn; null puts the
   card's own limits back. Shared with install.js, which draws its own card. */
function frameClip(b){
  if(b&&b.std){ const k=b.bw/W; CLIPB={top:(LOSY-b.by-15*k)/SC, bot:-(b.by+b.bh-LOSY-13*k)/SC, x:(b.bw/2-13*k)/SC}; }
  else CLIPB={top:DEPTH_MAX, bot:DEPTH_MIN, x:X_MAX};
}
function drawCardEmpty(){ return `<svg viewBox="0 0 ${W} ${H}">${CARD_DEFS}<rect width="${W}" height="${H}" fill="url(#cardG)"/>${FIELD}${ruler(0,0,W,H)}</svg>`; }
function drawCardIn(g,box){
  let pre='',glow='',routes='',bodies='',ico='';
  const CYAN='#5FD0F5', qb=g.men.find(q=>q.qb);
  const elig=g.men.filter(m=>!m.b&&!m.qb).sort((a,b)=>a.x-b.x);
  elig.forEach((m,i)=>{ m._i=ICONS[Math.min(i,ICONS.length-1)]; });
  for(const m of g.men){
    const X=px(m.x), Y=py(m.y);
    /* THE WALK-DOWN. He is drawn SOLID where he ends up and a faint hollow ring
       marks where he lined up, joined by a dash - the game's own card shows him
       at his walked-down spot, and the dash is what makes it readable as a
       movement rather than a mistake. Both ends come out of the game's files:
       the sheet's OverrideFormPos gives an absolute spot, its creep op gives
       waypoints. */
    if(m.from){
      const FX=px(m.x+m.from[0]), FY=py(m.y+m.from[1]);
      const WC='#9AA6B8';
      pre+=`<path d="M${FX.toFixed(1)} ${FY.toFixed(1)} L${X} ${Y}" fill="none" stroke="${WC}" stroke-width="2"`
        +` stroke-dasharray="4 5" stroke-linecap="round" opacity=".62"><title>Walks down before the snap: lines up here, plays from where the marker is${m.mvc?' ('+m.mvc+'% of the time)':''}</title></path>`
        +`<circle cx="${FX.toFixed(1)}" cy="${FY.toFixed(1)}" r="3.6" fill="none" stroke="${WC}" stroke-width="1.8" opacity=".62"/>`;
    }
    /* the pre-snap shift, in the game's motion colour */
    if(m.shift){
      const SX=px(m.x+m.shift[0]), SY=py(m.y+m.shift[1]);
      pre+=`<path d="M${SX.toFixed(1)} ${SY.toFixed(1)} L${X} ${Y}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round" opacity=".9"/>`
        +arrow(X,Y,Math.atan2(Y-SY,X-SX),CYAN)
        +`<circle cx="${SX.toFixed(1)}" cy="${SY.toFixed(1)}" r="3.4" fill="none" stroke="${CYAN}" stroke-width="2"/>`;
    }
    /* orbit, return, jet, across: the motion shape to a landing spot, and
       whatever he does after the snap starts from there */
    const firstDx=(m.pts&&m.pts[0]&&m.pts[0][0])||(m.rel&&m.rel[0]&&m.rel[0][0])||0;
    /* the game's own motion waypoints when the sheet has them; the kind's
       canonical curve otherwise */
    const mp=m.mpath?{L:m.mpath[m.mpath.length-1],d:'M'+[[m.x,m.y],...m.mpath].map(([x,y])=>px(x).toFixed(1)+' '+py(y).toFixed(1)).join(' L')}:motionPre(m,qb,firstDx);
    const ox=mp?mp.L[0]:m.x, oy=mp?mp.L[1]:m.y, OX=px(ox), OY=py(oy);
    if(mp) pre+=`<path d="${mp.d}" fill="none" stroke="${CYAN}" stroke-width="3" stroke-dasharray="7 5" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`;
    if(m.b){
      /* the game's block mark: a stem with a bar across the end, long and
         forward on a run block, short on a pass set. A blocker who moves —
         a puller, a screen release — gets the path he takes, with the mark
         where he arrives. */
      const rn=m.bk?m.bk==='r':!!g.run, len=rn?SC*2.1:SC*1.1;
      const tee=(ax,ay)=>`<path d="M${ax} ${ay} L${ax} ${(ay-len).toFixed(1)} M${ax-6.5} ${(ay-len).toFixed(1)} L${ax+6.5} ${(ay-len).toFixed(1)}" fill="none" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round"/>`;
      if(m.rel&&m.rel.length){
        const w=[[OX,OY],...m.rel.map(([dx,dy])=>[px(ox+dx),py(oy+dy)])];
        bodies+=`<path d="M${w.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="${m.mot?CYAN:WHITE}" stroke-width="${m.pull?3:2.4}" stroke-linejoin="round" stroke-linecap="round" stroke-opacity="${m.pull?1:.85}"/>`
          +tee(w[w.length-1][0],w[w.length-1][1]);
      } else bodies+=tee(X,Y);
      bodies+=`<circle cx="${X}" cy="${Y}" r="4.2" fill="#242526" stroke="${WHITE}" stroke-width="2.2"/>`;
      continue;
    }
    /* THE DEFENCE. A rusher gets his path in red, a zone defender gets the
       zone the game names him to, drawn where it sits, and a man defender
       gets the number of the receiver he has. */
    if(g.def){
      /* every defender is a real mark, so Run it can walk him to his spot and
         a click can open his adjustments, exactly as on offence */
      const gi=g.men.indexOf(m);
      const p=defParts(m,`class="rte" data-i="${gi}"`);
      glow+=p.glow; routes+=p.routes;
      bodies+=`<g class="mvr" data-i="${gi}" data-x="${X}" data-y="${Y}">${p.bodies}</g>`;
      continue;
    }
    const col=m.c?RED:m.mot?CYAN:YELLOW;
    /* an option route draws its canonical shape; everything else draws the
       game's own polyline */
    const orb=optionRoute(m), pts=clipDepth(oy,orb?orb.main:m.pts,ox);
    if(pts&&pts.length){
      const w=[[OX,OY],...pts.map(([dx,dy])=>[px(ox+dx),py(oy+dy)])];
      const d=routeD({x:ox,y:oy,pts}), [ax,ay]=w[w.length-1], [bx,by]=w[w.length-2];
      glow+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="10" stroke-opacity=".2" stroke-linejoin="round" stroke-linecap="round" filter="url(#cardGlow)"/>`;
      routes+=`<path class="rte" data-i="${g.men.indexOf(m)}" d="${d}" fill="none" stroke="${col}" stroke-width="${m.c?4.4:4}" stroke-linejoin="round" stroke-linecap="round"/>`;
      routes+=`<g class="rar">${arrow(ax,ay,Math.atan2(ay-by,ax-bx),col)}</g>`;
      for(const alt0 of (orb&&orb.alts)||[]){ const alt=clipDepth(oy,alt0,ox); const a=[[px(ox+orb.tip[0]),py(oy+orb.tip[1])],...alt.map(([dx,dy])=>[px(ox+dx),py(oy+dy)])];
        routes+=`<path d="M${a.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join(' L')}" fill="none" stroke="${col}" stroke-width="2.8" stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>`;
        const [ex,ey]=a[a.length-1],[fx,fy]=a[a.length-2]; routes+=arrow(ex,ey,Math.atan2(ey-fy,ex-fx),col,8); }
    } else if(m.c){
      /* the ball carrier with no stored path — a QB keep, an option pitch
         man. Draw the carry rather than leave the whole play blank. */
      routes+=`<path d="M${OX} ${OY} L${OX} ${OY-SC*2.6}" fill="none" stroke="${RED}" stroke-width="4"/>`+arrow(OX,OY-SC*2.6,-Math.PI/2,RED);
    }
    /* every man is tagged so he can be picked and moved: the play button walks
       him down his own route, and a click on him opens his hot routes */
    const tag=`class="mvr" data-i="${g.men.indexOf(m)}" data-x="${X}" data-y="${Y}"`;
    if(m.qb) bodies+=`<g ${tag}><circle cx="${X}" cy="${Y}" r="5.2" fill="${WHITE}"/></g>`;
    else ico+=`<g ${tag}>${icon(m._i,X,Y)}</g>`;
  }
  const b=box, bx=b?b.bx:0, by=b?b.by:0, bw=b?b.bw:W, bh=b?b.bh:H;
  return `<svg viewBox="${bx.toFixed(1)} ${by.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}">${CARD_DEFS}`
    +`<rect x="-260" y="-360" width="${W+520}" height="${H+720}" fill="url(#cardG)"/>`
    +`${FIELD}${ruler(bx,by,bw,bh)}${pre}${glow}${routes}${bodies}${ico}</svg>`;
}

/* THE FORMATION TILE. Drawn on the same ground as a play card, at the same
   scale, so a formation reads as the play it is about to become: the line
   as our linemen (circle and set), skill players as white discs, the
   quarterback as the white dot. The box is a band of field around the men
   rather than a fitted strip, so the tile has height and the alignment has
   room to breathe. */
const FORM_ASPECT=620/260;      /* must match .fdiag's aspect-ratio */
function drawFormation(shape){
  const ground=`${CARD_DEFS}<rect width="${W}" height="${H}" fill="url(#cardG)"/>${FIELD}`;
  if(!shape||!shape.length){ const t=Math.floor(py(11)); return `<svg viewBox="0 ${t} ${W} ${Math.round(W/FORM_ASPECT)}">${ground}</svg>`; }
  /* EVERY SKILL MAN CARRIES HIS POSITION, so the tile reads as a personnel
     grouping and not just as dots. The five are the game's circle and set;
     the label sits under each of the rest. `p` comes from the set's own
     alignment; `l`/`q` are the old play-derived flags, still honoured. */
  let g='', lab='', x0=W, x1=0, y0=H, y1=0;
  for(const m of shape){
    const X=px(m.x), Y=py(m.y), p=m.p||(m.l?'OL':m.q?'QB':'');
    x0=Math.min(x0,X); x1=Math.max(x1,X); y0=Math.min(y0,Y); y1=Math.max(y1,Y);
    if(p==='OL'){
      g+=`<path d="M${X} ${Y} L${X} ${(Y-SC*1.1).toFixed(1)} M${X-6} ${(Y-SC*1.1).toFixed(1)} L${X+6} ${(Y-SC*1.1).toFixed(1)}" fill="none" stroke="${WHITE}" stroke-width="2.6" stroke-linecap="round"/>`
        +`<circle cx="${X}" cy="${Y}" r="4.6" fill="#0b0f14" stroke="${WHITE}" stroke-width="2.4"/>`;
      continue;
    }
    g+=p==='QB'
      ? `<circle cx="${X}" cy="${Y}" r="5.6" fill="${WHITE}"/>`
      : `<circle cx="${X}" cy="${Y}" r="6.6" fill="${WHITE}" stroke="rgba(9,13,20,.65)" stroke-width="1.6"/>`;
    if(p) lab+=`<text x="${X}" y="${(Y+19).toFixed(1)}" text-anchor="middle" font-family="${RULER_FONT}"`
      +` font-size="12.5" font-weight="800" letter-spacing=".5" fill="rgba(240,231,203,.82)">${p}</text>`;
  }
  y1+=13;                                  /* the labels sit under the men */
  /* fit the box to the men, not the whole field: a bunch set gets drawn
     large, a five-wide set fills the width. The box keeps the tile's aspect
     so nothing is stretched, and stays inside the card so the ground and
     the hashes are always real. */
  let bw=Math.max(x1-x0+2*44, 300); bw=Math.min(bw,W);
  let bh=bw/FORM_ASPECT;
  const cy=(y0+y1)/2+4;
  let bx=Math.max(0,Math.min(W-bw,(x0+x1)/2-bw/2)), by=Math.max(0,Math.min(H-bh,cy-bh/2));
  return `<svg viewBox="${bx.toFixed(1)} ${by.toFixed(1)} ${bw.toFixed(1)} ${bh.toFixed(1)}" preserveAspectRatio="xMidYMid meet">${ground}${g}${lab}</svg>`;
}

/* THE PERSONNEL GROUPING, named the way a coach names it: the first digit is
   the number of backs, the second the number of tight ends, and the
   receivers are whatever is left. One back and one tight end is 11. */
function personnelTag(shape){
  if(!shape||!shape.length||!shape.some(m=>m.p)) return '';
  const c={}; for(const m of shape) c[m.p]=(c[m.p]||0)+1;
  const rb=(c.RB||0)+(c.FB||0), te=c.TE||0, wr=c.WR||0;
  /* a heavy or jumbo set has a sixth or seventh lineman and a wildcat can have a
     second quarterback split out: the badge says so rather than going blank */
  if(!c.QB||(c.OL||0)<5) return '';
  const extra=(c.OL>5?` &nbsp;&middot;&nbsp; ${c.OL} OL`:'')+(c.QB>1?` &nbsp;&middot;&nbsp; ${c.QB} QB`:'');
  return `<span class="fmeta"><i class="fpn">${rb}${te}</i>`
    +`<i class="fpb">${rb} RB &nbsp;&middot;&nbsp; ${te} TE &nbsp;&middot;&nbsp; ${wr} WR${extra}</i></span>`;
}

/* ---------- ANIMATE A CARD. Every route draws itself along its own path
   and every mover rides it; one tempo for everybody. Works on any svg the
   engine drew (routes .rte with data-i, movers .mvr with data-i/x/y,
   arrowheads .rar). One animation at a time, page-wide. ---------- */
let SK_ANIM=null, SK_ANIM_SVG=null;
function skCardRunning(){ return !!SK_ANIM; }
function skStopCard(svg){
  if(SK_ANIM){ cancelAnimationFrame(SK_ANIM); SK_ANIM=null; }
  const s=svg||SK_ANIM_SVG; SK_ANIM_SVG=null; if(!s) return;
  s.querySelectorAll('.rte').forEach(p=>{ p.style.strokeDasharray=''; p.style.strokeDashoffset=''; });
  s.querySelectorAll('.rar').forEach(a=>{ a.style.opacity=''; });
  s.querySelectorAll('.mvr').forEach(gm=>gm.removeAttribute('transform'));
}
function skRunCard(svg, onEnd){
  if(!svg) return false;
  skStopCard(SK_ANIM_SVG); SK_ANIM_SVG=svg;
  const marks=new Map(); svg.querySelectorAll('.mvr').forEach(gm=>marks.set(gm.dataset.i,gm));
  const lines=[...svg.querySelectorAll('.rte')].map(el=>({el,len:el.getTotalLength()})).filter(o=>o.len>1);
  if(!lines.length){ SK_ANIM_SVG=null; return false; }
  const arrows=[...svg.querySelectorAll('.rar')];
  const longest=Math.max(...lines.map(o=>o.len));
  for(const o of lines){ o.el.style.strokeDasharray=o.len; o.el.style.strokeDashoffset=o.len; }
  for(const a of arrows) a.style.opacity='0';
  const DUR=2400, t0=performance.now();
  (function frame(t){
    const kk=Math.min(1,(t-t0)/DUR);
    for(const o of lines){
      const own=Math.min(1,kk*longest/o.len);
      o.el.style.strokeDashoffset=String(o.len*(1-own));
      const gm=marks.get(o.el.dataset.i);
      if(gm){ const pt=o.el.getPointAtLength(o.len*own);
        gm.setAttribute('transform',`translate(${(pt.x-gm.dataset.x).toFixed(1)} ${(pt.y-gm.dataset.y).toFixed(1)})`); }
    }
    if(kk<1){ SK_ANIM=requestAnimationFrame(frame); }
    else { for(const a of arrows) a.style.opacity=''; SK_ANIM=null; SK_ANIM_SVG=null; if(onEnd) onEnd(); }
  })(t0);
  return true;
}
