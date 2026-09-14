/* drive-builder.js: THE DRIVE BUILDER, lifted from war_room_test.html (the Oregon
   original) by Madden27 Engine Reference/extract-drive-builder.js. DO NOT
   EDIT: edit the Oregon builder and re-run the extractor. Lines 4902-5666 of the
   page with 20 guarded edits (the data, the bridge, the crest, the host
   measurements); See on Field and Run Drive are cut, they need the 3D stadium. */
function mountDriveBuilder(DBX, host){

  /* what the builder reached for on the Oregon page, supplied here */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const orbit = { enabled: false }, stadium = null, hud = {}, modelState = { mode: 'builder' };

  host.innerHTML = "<svg id=\"dbFieldWeb\" aria-hidden=\"true\"></svg>\n<div id=\"dbFieldNodes\"></div>\n<div class=\"db-web\" id=\"dbWebLayer\"><div id=\"dbCanvas\">\n  <svg id=\"dbStrands\" aria-hidden=\"true\"></svg>\n  <div id=\"dbNodes\"></div>\n</div></div>\n<aside id=\"dbPlays\">\n  <div class=\"db-cats\" id=\"dbCats\"></div>\n  <div class=\"db-phead\">Plays for this look</div>\n  <div class=\"db-list\" id=\"dbList\"></div>\n</aside>\n<aside class=\"db-install\" id=\"dbInstall\"></aside>\n<div id=\"dbCap\"></div>\n<div id=\"dbBar\">\n  <span class=\"ttl\">The Drive</span>\n  <button class=\"db-dtool\" id=\"dbBtnBuild\">Build</button>\n  <button class=\"db-dtool\" id=\"dbBtnField\">&#9654; See on Field</button>\n  <button class=\"db-dtool\" id=\"dbBtnRun\">&#9654; Run Drive</button>\n  <button class=\"db-dtool\" id=\"dbBtnClear\">Clear</button>\n  <button class=\"db-dtool\" id=\"dbBtnReset\">Recommended</button>\n  <button class=\"db-dtool db-dtool-save\" id=\"dbBtnSave\"><span class=\"db-save-ico\">&#9733;</span><span class=\"db-save-tx\">Save Drive</span></button>\n  <button class=\"db-dtool\" id=\"dbBtnClose\" title=\"Close\">&times;</button>\n</div>\n<div id=\"dbCard\"></div>";
const DB_PLAYS = DBX.plays;
const DB_ROLE_TAGS = ["Opener","Explosive","One-Play TD","3rd & Short","3rd & Long","Red Zone","Chain Mover","Constraint Play","Man Beater"];
function dcall(play, sit, tag, left, right){ return { play, sit, tag:tag||"", roleTags:[], left:left||[], right:right||[] }; }
const DB_RECOMMENDED = DBX.recommended;
const DB_CATS = [
  { btn:"All Calls",   filter: p => true },
  { btn:"Run Plays",   filter: p => p.type === "Run Game" },
  { btn:"Pass Plays",  filter: p => p.type === "Pass Game" },
  { btn:"Star Plays",  filter: p => p.type === "Star Play" },
];

/* The Drive Builder's left panel = a skinny, read-only mirror of the Oregon
   call sheet the user builds in Scheme DNA (auto-saved to localStorage). Only
   the play calls carry over, formations, x-factor, constraint pairs, sticky
   tags and the tempo header are all dropped. The sheet lives in the sealed
   engine scope, so we read it through the ORPB.callSheet() bridge. */
/* The Drive Builder's left panel has three faces. 'normal' is what ships, the
   viewer's saved call sheet mirrored from Scheme DNA. 'empty' and 'video' are
   PRESENTER ONLY (toggled with the P key while in the Drive Builder): the blank
   intro template and the 8-play video install. Normal users only ever see
   'normal'; nothing here is persisted, so a reload starts clean. */
let dbCsMode = 'normal';                                  // 'normal' | 'empty' | 'video'
let dbVideoShown = 0, dbVideoCap = 24;                    // presenter 'video' reveal state
function dbRenderCallSheet(){
  const root = document.getElementById('dbInstall');
  if(!root) return;
  const cs = (DBX.bridge && typeof DBX.bridge.callSheet === 'function')
    ? DBX.bridge.callSheet(dbCsMode) : { mode:'normal', total:0, cap:24, sections:[] };
  // dbCsMode is the source of truth. The bridge only supplies DATA for normal/empty
  // (the saved sheet); the 'video' sheet is self-contained here (DB_VIDEO_INSTALL),
  // so it must NOT depend on cs.mode - the bridge echoes 'normal' for video.
  const mode = dbCsMode;
  const O = DBX.logo;
  const SK = DBX.skLogo;

  const head = mode === 'empty'
    ? `<div class="db-install-head">
         <div class="db-install-crest"><img src="${O}" alt=""></div>
         <div class="db-install-eyebrow">The Call Sheet</div>
         <div class="db-install-title">Build Your Own</div>
       </div>`
    : `<div class="db-install-head">
         <div class="db-install-crest"><img src="${O}" alt=""></div>
         <div class="db-install-eyebrow">${mode === 'video' ? "This Video's Install" : 'Your Game Plan'}</div>
         <div class="db-install-title">${DBX.sheetTitle}</div>
       </div>`;

  const cta = mode === 'empty'
    ? `<div class="db-cs-cta">
         <img class="db-cs-cta-logo" src="${SK}" alt="Scheme Kings">
         <div class="db-cs-cta-txt"><b>Fill out your call sheet</b>
           <span>Unlock the full sheet on <b>Scheme Kings</b> and build your own, up to ${cs.cap} calls.</span></div>
       </div>` : '';

  /* VIDEO / INSTALL: the real call-sheet layout, but it only holds this
     video's 8 plays (one per heading), each HIDDEN until I click the sheet to
     reveal it (script order via data-vi). Every heading shows "+ N more" open
     slots so the viewer sees 8 of 25 filled and plenty of room to install. */
  if(mode === 'video'){
    dbVideoShown = 0; dbVideoCap = DB_INSTALL_CAP;
    const body = DB_INSTALL_SECTIONS.map(sec => {
      const mine = DB_VIDEO_INSTALL
        .map((v, i) => ({ v, i }))
        .filter(o => o.v.bucket === sec.label);
      const rows = mine.map(({ v, i }) => {
        const p = DB_PLAYS.find(x => x.id === v.id) || { name:v.id };
        return `<div class="db-cs-play db-cs-hide" data-vi="${i}">
          <span class="db-cs-dot${p.type === 'Star Play' ? ' star' : ''}"></span>
          <span class="db-cs-txt"><b>${p.name}</b>${p.formation ? `<i>${p.formation}</i>` : ''}</span>
        </div>`;
      }).join('');
      const remaining = Math.max(0, sec.cap - mine.length);
      const ghost = remaining > 0
        ? `<div class="db-cs-ghost">+ ${remaining} more ${sec.ghost}</div>` : '';
      return `<div class="db-cs-sec"><div class="db-cs-lbl">${sec.label}</div>${rows}${ghost}</div>`;
    }).join('');
    root.innerHTML = `${head}
      <div class="db-install-body db-cs-body">${body}</div>
      <div class="db-install-foot db-cs-foot">
        <span class="db-cs-foot-lbl">Installed</span>
        <span class="db-cs-foot-count" id="dbVidCount">0 / ${DB_INSTALL_CAP}</span>
      </div>`;
    const bodyElV = root.querySelector('.db-install-body');
    const moreV = document.createElement('div');
    moreV.className = 'db-cs-more'; moreV.textContent = '▾ Scroll';
    root.appendChild(moreV);
    const updV = () => { const room = bodyElV.scrollHeight - bodyElV.clientHeight;
      moreV.classList.toggle('hide', room < 8 || bodyElV.scrollTop >= room - 6); };
    bodyElV.addEventListener('scroll', updV, { passive:true });
    requestAnimationFrame(updV);
    return;
  }

  let vi = 0;
  const secHTML = cs.sections.map(sec => {
    if(mode === 'normal' && !sec.plays.length) return '';
    const filled = sec.plays.map(p => {
      const vid = mode === 'video';                       // presenter: start hidden, reveal on click
      return `<div class="db-cs-play${vid ? ' db-cs-hide' : ''}"${vid ? ` data-vi="${vi++}"` : ''}>
        <span class="db-cs-dot${p.star ? ' star' : ''}"></span>
        <span class="db-cs-txt"><b>${p.name}</b>${p.formation ? `<i>${p.formation}</i>` : ''}</span>
      </div>`;
    }).join('');
    let ghost = '';
    if(mode === 'empty'){
      ghost = `<div class="db-cs-ghost">Pick ${sec.cap} &middot; fill this in yourself</div>`;
    } else if(mode === 'video'){
      const left = sec.cap - sec.plays.length;
      if(left > 0) ghost = `<div class="db-cs-ghost">+ ${left} more &middot; fill out the rest</div>`;
    }
    return `<div class="db-cs-sec"><div class="db-cs-lbl">${sec.label}</div>${filled}${ghost}</div>`;
  }).join('');

  const bodyInner = mode === 'normal'
    ? (cs.total ? secHTML : `<div class="db-cs-empty">Build your call sheet in the <b>Call Sheet</b> section and every call you pick lands here as the sheet you're calling from.</div>`)
    : cta + secHTML;

  const foot = mode === 'empty'
    ? `<span class="db-cs-foot-lbl">Your Sheet</span><span class="db-cs-foot-count">0 / ${cs.cap}</span>`
    : mode === 'video'
    ? `<span class="db-cs-foot-lbl">Installed</span><span class="db-cs-foot-count" id="dbVidCount">0 / ${cs.cap}</span>`
    : `<span class="db-cs-foot-lbl">On the Sheet</span><span class="db-cs-foot-count">${cs.total} ${cs.total === 1 ? 'Call' : 'Calls'}</span>`;

  root.innerHTML = `${head}
    <div class="db-install-body db-cs-body">${bodyInner}</div>
    <div class="db-install-foot db-cs-foot">${foot}</div>`;

  // clean scroll cue: an inked chevron that hides at the bottom / when nothing overflows
  const bodyEl = root.querySelector('.db-install-body');
  const more = document.createElement('div');
  more.className = 'db-cs-more'; more.textContent = '▾ Scroll';
  root.appendChild(more);
  const updMore = () => {
    const room = bodyEl.scrollHeight - bodyEl.clientHeight;
    more.classList.toggle('hide', room < 8 || bodyEl.scrollTop >= room - 6);
  };
  bodyEl.addEventListener('scroll', updMore, { passive:true });
  requestAnimationFrame(updMore);
}
/* presenter toggle, P cycles the left sheet normal -> intro -> install (mine only) */
if(window.__skDbPKey) window.removeEventListener('keydown', window.__skDbPKey);
window.addEventListener('keydown', window.__skDbPKey = (e) => {
  if((e.key === 'p' || e.key === 'P') && document.body.classList.contains('dbOn')
     && !/^(input|textarea)$/i.test((e.target.tagName || ''))){
    dbCsMode = dbCsMode === 'normal' ? 'empty' : dbCsMode === 'empty' ? 'video' : 'normal';
    dbRenderCallSheet();
  }
});
/* presenter video sheet: the 8 calls start hidden and reveal one at a time,
   with a quick animation, each time I click the sheet (on camera). */
function dbVideoAdvance(){
  if(dbCsMode !== 'video') return;
  const root = document.getElementById('dbInstall');
  if(!root) return;
  const hidden = [...root.querySelectorAll('.db-cs-play.db-cs-hide')];
  if(!hidden.length) return;
  // reveal in script order (lowest data-vi first), wherever its heading sits
  const next = hidden.reduce((a, b) => (+a.dataset.vi <= +b.dataset.vi ? a : b));
  next.classList.remove('db-cs-hide');
  next.classList.add('db-cs-reveal');
  next.scrollIntoView({ block:'nearest', behavior:'smooth' });
  dbVideoShown++;
  const cnt = document.getElementById('dbVidCount');
  if(cnt) cnt.textContent = dbVideoShown + ' / ' + dbVideoCap;
}
document.getElementById('dbInstall')?.addEventListener('click', dbVideoAdvance);

const dbEls = {
  open: document.getElementById('dbOpen'),
  webLayer: document.getElementById('dbWebLayer'),
  canvas: document.getElementById('dbCanvas'),
  strands: document.getElementById('dbStrands'),
  nodes: document.getElementById('dbNodes'),
  fieldWeb: document.getElementById('dbFieldWeb'),
  fieldNodes: document.getElementById('dbFieldNodes'),
  cats: document.getElementById('dbCats'),
  list: document.getElementById('dbList'),
  cap: document.getElementById('dbCap'),
  card: document.getElementById('dbCard'),
};
let dbMode = null;               // null | 'build' | 'reveal'
let dbDrive = null;              // null = recommended showcase; object = editable copy
let dbArmed = null, dbMenuKey = null, dbTagKey = null;
let dbPanX = 0, dbPanY = 0, dbZoom = 1, dbNeedsFit = true;
let dbCat = 0;
let dbRevealGeo = null;
let dbRunning = false, dbRunTimers = [];
let dbCelebrateUntil = -1;
const DB_ROW = 124, DB_HALFW = 118, DB_GAP = 70;
const dbPlayName = id => { const p = DB_PLAYS.find(x => x.id === id); return p ? p.name : id; };
const dbPlaySub  = id => { const p = DB_PLAYS.find(x => x.id === id); return p ? p.formation : ""; };

/* --- tree helpers (ported verbatim) --- */
const dbCloneNode = c => ({ play:c.play, sit:c.sit, tag:c.tag || "", roleTags:[...(c.roleTags || [])],
  left:(c.left || []).map(dbCloneNode), right:(c.right || []).map(dbCloneNode) });
const dbCloneDrive = d => ({ main: d.main.map(dbCloneNode) });
const dbCurrent = () => dbDrive || DB_RECOMMENDED;
function dbEnsureEditable(){
  if(dbDrive === null) dbDrive = dbCloneDrive(DB_RECOMMENDED);
  return dbDrive;
}

/* THE VIDEO INSTALL (the 3rd call sheet, presenter 'video' mode): laid out
   like the real call sheet - situational headings, 25 total openings - but it
   only holds THIS video's 8 plays, one per heading. They start HIDDEN and I
   click the sheet to reveal them one at a time (script order), so on camera
   each play visibly "gets installed" and the open slots show there's room for
   way more. Every bucket shows "+ N more <category>". */
const DB_INSTALL_SECTIONS = DBX.sections;
/* the 8 video plays in script/install order, each dropped under one heading */
const DB_VIDEO_INSTALL = DBX.video;
const DB_INSTALL_CAP = DB_INSTALL_SECTIONS.reduce((n, s) => n + s.cap, 0);   // 25
function dbResolveChain(drive, path){
  let chain = drive.main;
  for(let k = 0; k < path.length; k += 2){ chain = chain[path[k]][path[k+1]]; }
  return chain;
}
function dbResolveNode(drive, nodePath){
  const chain = dbResolveChain(drive, nodePath.slice(0, -1));
  return chain[nodePath[nodePath.length - 1]];
}
const dbPathKey  = p => p.join(".");
const dbChainKey = p => "c:" + p.join(".");
const dbParseKey = k => k.replace(/^c:/, "").split(".").filter(s => s !== "")
                         .map(s => /^\d+$/.test(s) ? +s : s);

/* --- the build-mode web: recursive pan/zoom tree (ported verbatim) --- */
function dbLayoutSpine(chain, chainPath, sideClass, connectBase){
  const res = { nodes:[], strands:[], addSlots:[] };
  let spanMin = -DB_HALFW, spanMax = DB_HALFW, prevY = 0;
  const isTrunk = sideClass === "";
  chain.forEach((node, idx) => {
    const y = prevY - DB_ROW, path = [...chainPath, idx];
    const firstOfBranch = idx === 0 && !isTrunk;
    const goal     = isTrunk && idx === chain.length - 1;
    const chipCls  = goal ? "goal" : (firstOfBranch ? sideClass : "");
    const badge    = firstOfBranch ? (sideClass === "br-left" ? "★" : "↺") : String(idx + 1);
    const badgeCls = firstOfBranch ? sideClass : "";
    res.nodes.push({ x:0, y, path, name:dbPlayName(node.play), sub:dbPlaySub(node.play) || node.sit,
      sit:node.sit, play:node.play, chipCls, badge, badgeCls, roleTags:node.roleTags || [] });
    if(idx > 0 || connectBase)
      res.strands.push({ kind:"L", x1:0, y1:prevY, x2:0, y2:y, cls:"" });
    ["left","right"].forEach(side => {
      const br = node[side];
      if(br && br.length){
        const bCls = side === "left" ? "br-left" : "br-right";
        const sub = dbLayoutSpine(br, [...path, side], bCls, false);
        const offset = side === "left" ? spanMin - DB_GAP - sub.spanMax
                                       : spanMax + DB_GAP - sub.spanMin;
        sub.nodes.forEach(n    => res.nodes.push({ ...n, x:n.x + offset, y:n.y + y }));
        sub.strands.forEach(s  => res.strands.push(dbShiftStrand(s, offset, y)));
        sub.addSlots.forEach(a => res.addSlots.push({ ...a, x:a.x + offset, y:a.y + y }));
        const fy = y - DB_ROW;
        res.strands.push({ kind:"C", cls:bCls,
          x1:0, y1:y, c1x:offset * 0.45, c1y:y, c2x:offset, c2y:y - DB_ROW * 0.5, x2:offset, y2:fy });
        spanMin = Math.min(spanMin, offset + sub.spanMin);
        spanMax = Math.max(spanMax, offset + sub.spanMax);
      }
    });
    prevY = y;
  });
  const tipY = prevY - DB_ROW;
  res.addSlots.push({ x:0, y:tipY, chainPath });
  res.strands.push({ kind:"L", x1:0, y1:prevY, x2:0, y2:tipY, cls:"", stub:true });
  res.spanMin = spanMin; res.spanMax = spanMax;
  return res;
}
const dbShiftStrand = (s, dx, dy) => s.kind === "L"
  ? { ...s, x1:s.x1+dx, y1:s.y1+dy, x2:s.x2+dx, y2:s.y2+dy }
  : { ...s, x1:s.x1+dx, y1:s.y1+dy, c1x:s.c1x+dx, c1y:s.c1y+dy,
      c2x:s.c2x+dx, c2y:s.c2y+dy, x2:s.x2+dx, y2:s.y2+dy };
const dbStrandD = s => s.kind === "L"
  ? `M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} L ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`
  : `M ${s.x1.toFixed(1)} ${s.y1.toFixed(1)} C ${s.c1x.toFixed(1)} ${s.c1y.toFixed(1)}, ${s.c2x.toFixed(1)} ${s.c2y.toFixed(1)}, ${s.x2.toFixed(1)} ${s.y2.toFixed(1)}`;
function dbApplyTransform(){ dbEls.canvas.style.transform = `translate(${dbPanX}px, ${dbPanY}px) scale(${dbZoom})`; }
function dbFitWeb(ctx){
  const pts = ctx.nodes.map(n => ({ x:n.x, y:n.y })).concat(ctx.addSlots.map(s => ({ x:s.x, y:s.y })));
  if(!pts.length) pts.push({ x:0, y:0 });
  let minX=1e9, maxX=-1e9, minY=1e9, maxY=-1e9;
  pts.forEach(p => { minX=Math.min(minX,p.x); maxX=Math.max(maxX,p.x); minY=Math.min(minY,p.y); maxY=Math.max(maxY,p.y); });
  minX-=180; maxX+=180; minY-=80; maxY+=100;
  const _hr = dbEls.webLayer.getBoundingClientRect(), L = DBX.padL || 310, R = DBX.padR || 320;   // install sheet + play panel
  const W = Math.max(420, _hr.width - L - R), H = _hr.height;
  const treeW = Math.max(1, maxX-minX), treeH = Math.max(1, maxY-minY);
  dbZoom = clamp(Math.min((W*0.86)/treeW, (H*0.8)/treeH), 0.3, 1.12);
  dbPanX = L + W/2 - ((minX+maxX)/2) * dbZoom;
  dbPanY = H/2 - ((minY+maxY)/2) * dbZoom;
  dbApplyTransform();
}
function dbRenderWeb(){
  const main = dbCurrent().main;
  const ctx = dbLayoutSpine(main, [], "", true);
  dbEls.strands.innerHTML = ctx.strands.map(s => {
    const d = dbStrandD(s);
    const base = `<path class="db-tstrand ${s.cls}" d="${d}"/>`;
    return s.stub ? base
      : base + `<path class="db-tpulse ${s.cls}" pathLength="100" d="${d}"/>`;
  }).join("");
  let html = ctx.nodes.map(nd => {
    const key = dbPathKey(nd.path);
    return `<div class="db-tnode ${nd.chipCls} ${dbMenuKey===key ? "menu-open":""} ${dbTagKey===key ? "tags-open":""}"
        data-key="${key}" style="left:${nd.x.toFixed(1)}px; top:${nd.y.toFixed(1)}px">
        <span class="db-tnum ${nd.badgeCls}">${nd.badge}</span>
        <span class="db-tnm">${nd.name}</span>
        ${nd.sub ? `<span class="db-tsub">${nd.sub}</span>` : ""}
        ${nd.roleTags.map((t,i) => `<span class="db-ttag pos-${i}">${t}</span>`).join("")}
        <div class="db-tactions">
          <span class="db-tact pos" data-act="left"  data-key="${key}">＋ Counter</span>
          <span class="db-tact neg" data-act="right" data-key="${key}">＋ Fallback</span>
          <span class="db-tact run" data-act="run"   data-key="${key}">▶ Open</span>
          <span class="db-tact tag" data-act="tags"  data-key="${key}">Tags</span>
          <span class="db-tact rm"  data-act="rm"    data-key="${key}">Remove</span>
        </div>
        <div class="db-tagpicker">
          ${DB_ROLE_TAGS.map(t => `<button class="db-tagopt${nd.roleTags.includes(t) ? " on":""}" data-tagkey="${key}" data-tagval="${t}">${t}</button>`).join("")}
        </div>
      </div>`;
  }).join("");
  html += ctx.addSlots.map(sl => {
    const ck = dbChainKey(sl.chainPath);
    const isArmed = dbArmed && dbChainKey(dbArmed.chainPath) === ck;
    const label = (sl.chainPath.length === 0 && !main.length) ? "＋ Add the first call" : "＋ Add Call";
    return `<button class="db-tadd ${isArmed ? "armed":""}" data-chain="${ck}" style="left:${sl.x.toFixed(1)}px; top:${sl.y.toFixed(1)}px">${label}</button>`;
  }).join("");
  if(!main.length){
    html += `<div class="db-tempty" style="left:0px; top:${-DB_ROW*2}px">Pick a play on the right, then tap <strong style="color:#F5A623">＋</strong> to drop it in.</div>`;
  }
  dbEls.nodes.innerHTML = html;
  dbWireWeb();
  dbCapSet(dbPromptText());
  if(dbNeedsFit){ dbFitWeb(ctx); dbNeedsFit = false; } else { dbApplyTransform(); }
}
function dbPromptText(){
  if(dbArmed){
    const p = dbArmed.chainPath, last = p[p.length - 1];
    if(!p.length) return "Adding your next call - tap <strong style=\"color:#F5A623\">＋</strong> on a play.";
    if(last === "left")  return "Adding a <strong style=\"color:#7fe0a0\">counter</strong> (if they bite) - tap <strong style=\"color:#F5A623\">＋</strong> on a play.";
    if(last === "right") return "Adding a <strong style=\"color:#9ab4ff\">fallback</strong> (it stalled) - tap <strong style=\"color:#F5A623\">＋</strong> on a play.";
    return "Adding to this branch - tap <strong style=\"color:#F5A623\">＋</strong> on a play.";
  }
  if(dbDrive === null) return "King Reggie's recommended drive - tap any call to branch it, or ＋ a play to make it your own. Drag to pan, scroll to zoom.";
  return dbCurrent().main.length
    ? "Your drive - tap any call to branch a counter / fallback, or ＋ a play to extend it."
    : "Empty drive - pick a play and tap ＋ to start your script.";
}
function dbWireWeb(){
  dbEls.nodes.querySelectorAll(".db-tadd").forEach(b =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const cp = dbParseKey(b.dataset.chain);
      dbArmed = (dbArmed && dbChainKey(dbArmed.chainPath) === dbChainKey(cp)) ? null : { chainPath:cp };
      dbMenuKey = null; dbTagKey = null; dbRenderWeb();
    }));
  dbEls.nodes.querySelectorAll(".db-tnode").forEach(node =>
    node.addEventListener("click", (e) => {
      if(e.target.closest(".db-tact, .db-tagopt")) return;
      if(dbWasPanning) return;
      const key = node.dataset.key;
      dbMenuKey = (dbMenuKey === key) ? null : key;
      dbTagKey = null; dbArmed = null; dbRenderWeb();
    }));
  dbEls.nodes.querySelectorAll(".db-tagopt").forEach(b =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      dbEnsureEditable();
      const node = dbResolveNode(dbDrive, dbParseKey(b.dataset.tagkey));
      if(!node) return;
      node.roleTags = node.roleTags || [];
      const i = node.roleTags.indexOf(b.dataset.tagval);
      if(i >= 0) node.roleTags.splice(i, 1);
      else if(node.roleTags.length < 3) node.roleTags.push(b.dataset.tagval);
      dbRenderWeb();
    }));
  dbEls.nodes.querySelectorAll(".db-tact").forEach(b =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const path = dbParseKey(b.dataset.key), act = b.dataset.act;
      if(act === "left" || act === "right"){
        dbArmed = { chainPath:[...path, act] };
        dbMenuKey = null; dbRenderWeb();
      } else if(act === "run"){
        const node = dbResolveNode(dbCurrent(), path);
        dbMenuKey = null; if(node) dbShowCard(node.play);
      } else if(act === "tags"){
        dbTagKey = (dbTagKey === b.dataset.key) ? null : b.dataset.key;
        dbMenuKey = null; dbRenderWeb();
      } else if(act === "rm"){
        dbEnsureEditable();
        const container = dbResolveChain(dbDrive, path.slice(0, -1));
        container.splice(path[path.length - 1], 1);
        dbMenuKey = null; dbArmed = null; dbRenderWeb();
      }
    }));
}
function dbAddCall(playId){
  dbEnsureEditable();
  const c = dcall(playId, DB_CATS[dbCat].btn, "");
  const path = (dbArmed && dbArmed.chainPath) ? dbArmed.chainPath : [];
  dbResolveChain(dbDrive, path).push(c);
  dbArmed = null;
  dbRenderWeb();
}
/* pan / zoom on the web canvas */
let dbPanning = false, dbWasPanning = false, dbSX = 0, dbSY = 0, dbSPX = 0, dbSPY = 0;
dbEls.webLayer.addEventListener("pointerdown", (e) => {
  if(dbMode !== 'build') return;
  dbWasPanning = false;
  if(e.target.closest(".db-tnode, .db-tadd, .db-tact")) return;
  dbPanning = true; dbSX = e.clientX; dbSY = e.clientY; dbSPX = dbPanX; dbSPY = dbPanY;
  dbEls.webLayer.classList.add("grabbing");
  try { dbEls.webLayer.setPointerCapture(e.pointerId); } catch(_){}
});
dbEls.webLayer.addEventListener("pointermove", (e) => {
  if(!dbPanning) return;
  const dx = e.clientX - dbSX, dy = e.clientY - dbSY;
  if(Math.abs(dx) + Math.abs(dy) > 4) dbWasPanning = true;
  dbPanX = dbSPX + dx; dbPanY = dbSPY + dy; dbApplyTransform();
});
const dbEndPan = ()=>{ if(!dbPanning) return; dbPanning = false; dbEls.webLayer.classList.remove("grabbing"); };
dbEls.webLayer.addEventListener("pointerup", dbEndPan);
dbEls.webLayer.addEventListener("pointercancel", dbEndPan);
dbEls.webLayer.addEventListener("wheel", (e) => {
  if(dbMode !== 'build') return;
  e.preventDefault();
  const _wr = dbEls.webLayer.getBoundingClientRect(), mx = e.clientX - _wr.left, my = e.clientY - _wr.top;
  const old = dbZoom, vx = (mx - dbPanX) / old, vy = (my - dbPanY) / old;
  dbZoom = clamp(dbZoom * (e.deltaY < 0 ? 1.12 : 0.89), 0.35, 1.5);
  dbPanX = mx - vx * dbZoom; dbPanY = my - vy * dbZoom;
  dbApplyTransform();
}, { passive:false });
dbEls.webLayer.addEventListener("click", (e) => {
  if(dbMode !== 'build' || dbWasPanning) return;
  if(e.target.closest(".db-tnode, .db-tact, .db-tadd")) return;
  if(dbMenuKey !== null || dbArmed !== null || dbTagKey !== null){
    dbMenuKey = null; dbArmed = null; dbTagKey = null; dbRenderWeb();
  }
});

/* --- play picker panel --- */
function dbRenderPicker(){
  dbEls.cats.innerHTML = DB_CATS.map((c,i) =>
    `<button class="db-cat${i===dbCat ? " on":""}" data-i="${i}">${c.btn}</button>`).join("");
  dbEls.cats.querySelectorAll(".db-cat").forEach(b =>
    b.addEventListener("click", ()=>{ dbCat = +b.dataset.i; dbRenderPicker(); }));
  const dbTypeCls = t => t === "Run Game" ? "db-t-run" : t === "Pass Game" ? "db-t-pass" : t === "Star Play" ? "db-t-star" : "db-t-other";
  dbEls.list.innerHTML = DB_PLAYS.filter(DB_CATS[dbCat].filter).map(p =>
    `<button class="db-pill ${dbTypeCls(p.type)}" data-id="${p.id}"><span class="db-pdot"></span><span class="db-ptext"><span class="db-pname">${p.name}</span>${p.formation ? `<span class="db-pform">${p.formation}</span>` : ""}</span><span class="db-padd" data-add="${p.id}" role="button" title="Add to drive">&#xFF0B;</span></button>`).join("");
  dbEls.list.querySelectorAll(".db-pill").forEach(b =>
    b.addEventListener("click", (e)=>{
      const addEl = e.target.closest(".db-padd");
      dbAddCall((addEl ? addEl.dataset.add : b.dataset.id));
      if(addEl){ addEl.classList.add("added"); addEl.innerHTML = "&#10003;";
        setTimeout(()=>{ addEl.classList.remove("added"); addEl.innerHTML = "&#xFF0B;"; }, 1000); }
    }));
}

/* --- Run the Drive: walk the trunk call by call down the field --- */
function dbRunStop(){
  dbRunning = false;
  dbRunTimers.forEach(clearTimeout); dbRunTimers = [];
  dbEls.fieldNodes.classList.remove("db-running");
  dbEls.fieldWeb.querySelectorAll(".db-runball").forEach(b => b.remove());
}
function dbRenderReveal(){}   /* the reveal needs the Oregon stadium: not on this page */
/* --- play card (integration point: opens the play in the real playbook) --- */
function dbShowCard(playId){
  if(DBX.openPlay){ DBX.openPlay(playId); return; }
  const p = DB_PLAYS.find(x => x.id === playId);
  if(!p) return;
  dbEls.card.innerHTML = `
    <div class="nm">${p.name}</div>
    <div class="fm">${p.type}&nbsp;&middot;&nbsp;${p.formation}</div>
    <div class="note">Full breakdown, reads and film live in the playbook. In the integrated build this opens the real play call card.</div>
    <button id="dbCardClose">Back to the field</button>`;
  dbEls.card.classList.add('open');
  dbEls.card.querySelector('#dbCardClose').addEventListener('click', ()=>dbEls.card.classList.remove('open'));
}

/* --- mode transitions --- */
function dbCapSet(html){
  if(!html){ dbEls.cap.classList.remove('open'); return; }
  dbEls.cap.innerHTML = html;
  dbEls.cap.classList.add('open');
}
function dbBtnState(){
  document.getElementById('dbBtnBuild').classList.toggle('on', dbMode==='build');
  document.getElementById('dbBtnField').classList.toggle('on', dbMode==='reveal');
}
function dbGoBuild(){
  dbMode = 'build';
  dbRunStop();
  document.body.classList.add('dbOn','dbBuild'); document.body.classList.remove('dbReveal');
  orbit.enabled = false;
  if(stadium) stadium.anchorsGrp.visible = false;
  dbEls.webLayer.classList.add('open');
  dbEls.fieldWeb.innerHTML = ''; dbEls.fieldNodes.innerHTML = ''; dbRevealGeo = null;
  dbNeedsFit = true;
  dbRenderCallSheet();                       // left panel = the saved Oregon call sheet
  dbRenderWeb(); dbRenderPicker(); dbBtnState();
  hud.textContent = 'Drive Builder · drag to pan · scroll to zoom · ESC to leave';
}
function dbExit(){
  if(dbMode === null) return;
  dbMode = null;
  dbRunStop();
  document.body.classList.remove('dbOn','dbBuild','dbReveal');
  dbEls.webLayer.classList.remove('open');
  dbEls.fieldWeb.innerHTML = ''; dbEls.fieldNodes.innerHTML = ''; dbRevealGeo = null;
  dbEls.card.classList.remove('open');
  dbCapSet(null);
  if(modelState.mode === 'field'){
    orbit.enabled = true;
    hud.textContent = 'Field view · drag orbit · scroll zoom · 1 broadcast · 2 all-22 · 3 goal line · ESC war room';
  }
}
/* left panel is rendered fresh from the saved call sheet on each DB open
   (dbGoBuild / dbGoReveal), the old install-notes render is retired. */
document.getElementById('dbBtnBuild').addEventListener('click', dbGoBuild);
document.getElementById('dbBtnClear').addEventListener('click', ()=>{
  dbDrive = { main:[] }; dbArmed = null; dbMenuKey = null;
  dbMode==='reveal' ? dbRenderReveal() : dbRenderWeb();
});
document.getElementById('dbBtnReset').addEventListener('click', ()=>{
  dbDrive = null; dbArmed = null; dbMenuKey = null;
  dbMode==='reveal' ? dbRenderReveal() : dbRenderWeb();
});

/* Save the built drive to the member's profile via the sealed auth/Supabase
   layer (DBX.bridge.saveDrive). Free to browse; the sign-in modal pops on the
   first save only. Saves whatever is on screen, a custom script or King
   Reggie's recommended drive if they haven't edited it. */
let dbSaving = false;
async function dbSaveDrive(){
  if(dbSaving) return;
  const btn = document.getElementById('dbBtnSave');
  const bridge = DBX.bridge;
  if(!bridge || typeof bridge.saveDrive !== 'function'){
    dbCapSet('Saving isn\'t available right now, try reopening the playbook.'); return;
  }
  const drive = dbCloneDrive(dbCurrent());
  if(!drive.main || !drive.main.length){
    dbCapSet('Add at least one call to your drive before saving it.'); return;
  }
  const first = drive.main[0];
  const fp = first ? DB_PLAYS.find(p => p.id === first.play) : null;
  const title = (fp ? `${fp.name} Drive` : 'Drive') + ` · ${new Date().toLocaleDateString()}`;

  dbSaving = true;
  btn.classList.add('saving');
  btn.querySelector('.db-save-tx').textContent = 'Saving…';
  dbCapSet('Saving your drive to your profile…');

  const res = await bridge.saveDrive(drive, { title, reason:'save this drive' });

  dbSaving = false;
  btn.classList.remove('saving');
  const tx = btn.querySelector('.db-save-tx');
  if(res && res.ok){
    btn.classList.add('saved');
    tx.textContent = 'Saved';
    dbCapSet('Drive saved to your profile, it\'s in your coaching app under Play Library.');
    setTimeout(()=>{ btn.classList.remove('saved'); tx.textContent = 'Save Drive'; }, 2800);
  } else if(res && res.reason === 'cancelled'){
    tx.textContent = 'Save Drive';
    dbCapSet(dbPromptText());
  } else {
    tx.textContent = 'Save Drive';
    dbCapSet('Couldn\'t save the drive, try again or check your connection.');
  }
}
document.getElementById('dbBtnSave').addEventListener('click', dbSaveDrive);
document.getElementById('dbBtnClose').addEventListener('click', dbExit);

  dbGoBuild();
  return { exit: dbExit, refresh: () => { dbRenderCallSheet(); dbNeedsFit = true; dbRenderWeb(); } };
}
