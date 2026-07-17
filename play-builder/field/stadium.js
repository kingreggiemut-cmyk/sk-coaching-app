// Originally AUTO-EXTRACTED from war_room_test.html (Reggie's Oregon stadium),
// then HAND-RESKINNED to Scheme Kings (2026-07-11): SK sky/crowd/skyline/logo
// textures, SK end zones, LED ribbon + scoreboard + banners in brand blue/gold.
// Geometry, bowl math and behavior untouched. NOTE: this file has diverged from
// war_room_test.html — re-running field/_extract.js would CLOBBER the reskin.
/* eslint-disable */
export async function buildStadiumWorld(renderer, A) {
  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const scene = new THREE.Group();                       // shadow: everything lands here
  const refs = { group: scene };

  /* --- helpers (stadium-local) --- */
  const smoothstep = (a,b,x)=>{ const t = clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
  const angDist = (a,b)=>{ let d=Math.abs(a-b)%TAU; return d>Math.PI ? TAU-d : d; };
  const plateau = (th,c,inner,outer)=> 1 - smoothstep(inner,outer,angDist(th,c));
  const COL = {
    yellow:'#F5A623', yellowSoft:'#FFC53D', greenDeep:'#175233',
    apron:'#2f5f3a', outside:'#1d3123', mark:'#f2efe2', wall:'#14264a',
    skBlue:'#1f6ef2', skCream:'#F0EAD0', skNavy:'#17284d',
  };
  const SUN_X = 0.24, SUN_Z = 0.97;
  function duskTint(fx, fz){
    const t = ((fx*SUN_X + fz*SUN_Z) + 1) / 2;
    return [ 0.76 + 0.33*t, 0.83 + 0.20*t, 0.99 - 0.12*t ];
  }
  function canvasTex(w, h, draw, opts={}){
    const c = document.createElement('canvas'); c.width=w; c.height=h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if(opts.mirror){ t.wrapS = THREE.MirroredRepeatWrapping; t.wrapT = THREE.MirroredRepeatWrapping; }
    return t;
  }
  function dabs(g, x0,y0,x1,y1, count, colors, rMin,rMax, aMin,aMax){
    for(let i=0;i<count;i++){
      g.globalAlpha = rand(aMin,aMax);
      g.fillStyle = pick(colors);
      const r = rand(rMin,rMax);
      g.beginPath();
      g.ellipse(rand(x0,x1), rand(y0,y1), r, r*rand(0.5,1), rand(0,Math.PI), 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
  function loadImg(src){
    return new Promise((res, rej)=>{
      const i = new Image();
      i.onload = ()=>res(i);
      i.onerror = ()=>rej(new Error('failed to load ' + src));
      i.src = encodeURI(src);
    });
  }
  function processImg(img, w, h, opts={}){
    const c = document.createElement('canvas'); c.width=w; c.height=h;
    const g = c.getContext('2d');
    const cx = (opts.cropX||0)*img.width, cy = (opts.cropY||0)*img.height;
    g.drawImage(img, cx, cy, img.width-cx, img.height-cy, 0, 0, w, h);
    if(opts.fadeTop){
      const fh = h*opts.fadeTop;
      const grd = g.createLinearGradient(0,0,0,fh);
      grd.addColorStop(0,'rgba(0,0,0,1)'); grd.addColorStop(1,'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = grd; g.fillRect(0,0,w,fh);
      g.globalCompositeOperation = 'source-over';
    }
    if(opts.fadeBottom){
      const fh = h*opts.fadeBottom;
      const grd = g.createLinearGradient(0,h,0,h-fh);
      grd.addColorStop(0,'rgba(0,0,0,1)'); grd.addColorStop(1,'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = grd; g.fillRect(0,h-fh,w,fh);
      g.globalCompositeOperation = 'source-over';
    }
    return c;
  }
  function texFromCanvas(c, mirror=true){
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if(mirror){ t.wrapS = THREE.MirroredRepeatWrapping; t.wrapT = THREE.MirroredRepeatWrapping; }
    return t;
  }

  /* --- bowl math --- */
  const FW = 84, FL = 164;
  const IX = 42, IZ = 80, EXPO = 0.62, WALL_H = 2.4;
  function ringPoint(th){
    const c = Math.cos(th), s = Math.sin(th);
    return {
      x: IX * Math.sign(c) * Math.pow(Math.abs(c), EXPO),
      z: IZ * Math.sign(s) * Math.pow(Math.abs(s), EXPO),
    };
  }
  function ringDir(th){
    const p = ringPoint(th);
    const dx = p.x/(IX*IX), dz = p.z/(IZ*IZ);
    const l = Math.hypot(dx,dz) || 1;
    return { x:dx/l, z:dz/l };
  }
  function standH(th){
    return 15
      + 16*plateau(th, 0,        0.68, 1.02)
      -  7*plateau(th, Math.PI/2,0.35, 0.80)
      +  2*plateau(th, Math.PI*1.5, 0.4, 1.0);
  }
  const standDepth = th => 8 + standH(th)*1.55;
  const V3 = (x,y,z)=>({x,y,z});
  const innerAt = (th,y)=>{ const p=ringPoint(th); return V3(p.x,y,p.z); };
  const outerAt = (th,y)=>{
    const p=ringPoint(th), d=ringDir(th), dep=standDepth(th);
    return V3(p.x+d.x*dep, y===null? WALL_H+standH(th) : y, p.z+d.z*dep);
  };

  function buildStrip(th0, th1, segs, fnA, fnB, material, opts={}){
    const pos=[], uv=[], col=[], idx=[];
    let arc=0; const arcs=[0];
    let prev = fnA(th0);
    for(let i=1;i<=segs;i++){
      const th = th0 + (th1-th0)*i/segs;
      const p = fnA(th);
      arc += Math.hypot(p.x-prev.x, p.z-prev.z);
      arcs.push(arc); prev = p;
    }
    for(let i=0;i<=segs;i++){
      const th = th0 + (th1-th0)*i/segs;
      const a = fnA(th), b = fnB(th);
      pos.push(a.x,a.y,a.z, b.x,b.y,b.z);
      const u = opts.uTile ? arcs[i]/opts.uTile : (arcs[i]/arc)*(opts.uRep||1);
      const len = Math.hypot(b.x-a.x, b.y-a.y, b.z-a.z);
      const v1 = opts.vTile ? len/opts.vTile : 1;
      uv.push(u,0, u,v1);
      if(opts.tint){
        const d = ringDir(th);
        const fx = opts.tint==='in' ? -d.x : d.x;
        const fz = opts.tint==='in' ? -d.z : d.z;
        const t = duskTint(fx, fz);
        col.push(...t, ...t);
      }
    }
    for(let i=0;i<segs;i++){
      const k = i*2;
      idx.push(k,k+2,k+1, k+1,k+2,k+3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    if(opts.tint){
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col,3));
      material.vertexColors = true;
    }
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    scene.add(mesh);
    return mesh;
  }

  /* --- field texture --- */
  function roundRectPath(g, x,y,w,h,r, ccw=false){
    g.moveTo(x+r,y);
    if(!ccw){
      g.arcTo(x+w,y, x+w,y+h, r); g.arcTo(x+w,y+h, x,y+h, r);
      g.arcTo(x,y+h, x,y, r);     g.arcTo(x,y, x+w,y, r);
    } else {
      g.arcTo(x,y, x,y+h, r);     g.arcTo(x,y+h, x+w,y+h, r);
      g.arcTo(x+w,y+h, x+w,y, r); g.arcTo(x+w,y, x,y, r);
    }
    g.closePath();
  }
  function makeFieldTexture(grassImg, logoImg, ezImg){
    const W=2048, H=4000;
    const K = W/FW;
    const X = x => (x+FW/2)*K;
    const Z = z => (z+FL/2)*(H/FL);
    const KZ = H/FL;
    const YD = K;
    return canvasTex(W,H,(g)=>{
      const pairW = Math.round(20*K), pairH = Math.round(10*KZ);
      const pc = document.createElement('canvas');
      pc.width = pairW; pc.height = pairH;
      const pg = pc.getContext('2d');
      pg.translate(pairW/2, pairH/2);
      pg.rotate(Math.PI/2);
      // Take the middle HALF of the grass sheet, full height, whatever size the
      // source happens to be. This used to be hardcoded as (968, 0, 1936, 3872) —
      // literally "the middle half of a 3872px square". The moment the texture was
      // resized, that rect hung off the edge of the image, drawImage returned a
      // part-empty tile, and the whole field tiled into a checkerboard.
      const gw = grassImg.width, gh = grassImg.height;
      pg.drawImage(grassImg, gw * 0.25, 0, gw * 0.5, gh, -pairH/2, -pairW/2, pairH, pairW);
      const grassPat = g.createPattern(pc, 'repeat');
      g.save();
      const phase = (Z(-60) % pairH) - pairH;
      g.translate(0, phase);
      g.fillStyle = grassPat;
      g.fillRect(0, -phase, W, H);
      g.restore();

      // mowing stripes — alternating light/dark mow bands every 5 yds (biggest
      // realism-for-cheap win; lines/numbers still paint crisp on top of these)
      for(let z=-60; z<60; z+=5){
        const y0 = Z(z), y1 = Z(z+5);
        g.fillStyle = (Math.floor((z+60)/5) % 2 === 0) ? 'rgba(232,242,222,0.06)' : 'rgba(0,0,0,0.065)';
        g.fillRect(X(-29.2), Math.min(y0,y1), 58.4*K, Math.abs(y1-y0));
      }

      g.save();
      g.beginPath();
      g.rect(0,0,W,H);
      g.rect(X(-26.67), Z(-60), 53.34*K, 120*KZ);
      g.clip('evenodd');
      g.fillStyle = 'rgba(16,42,26,.55)'; g.fillRect(0,0,W,H);
      g.restore();

      g.fillStyle = COL.outside;
      const cr = 34*K;
      g.beginPath();
      g.rect(0,0,W,H);
      roundRectPath(g, 0,0,W,H, cr, true);
      g.fill('evenodd');

      g.strokeStyle = COL.yellow;
      g.lineWidth = 1.15*YD;
      roundRectPath(g, X(-29.2),Z(-62.6), (58.4)*K,(125.2)*KZ, 6*YD);
      g.stroke();

      /* end zones — the Scheme Kings painted end zone art (blue + crown wordmark),
         one per end, far one rotated so it reads from its own sideline */
      const ezDraw = (zc, flip)=>{
        g.save();
        g.translate(X(0), Z(zc));
        if(flip) g.rotate(Math.PI);
        const ew = 53.34*K, eh = 10*KZ;
        // crop the baked-in white sideline strips off the art's top/bottom
        g.drawImage(ezImg, 0, ezImg.height*0.045, ezImg.width, ezImg.height*0.91, -ew/2, -eh/2, ew, eh);
        g.restore();
      };
      ezDraw(-55, false);
      ezDraw( 55, true);

      g.strokeStyle = COL.mark; g.globalAlpha = .95;
      g.lineWidth = 0.55*YD;
      g.strokeRect(X(-26.67), Z(-60), 53.34*K, 120*KZ);
      for(let z=-50; z<=50; z+=5){
        g.lineWidth = (z===-50||z===50||z===0) ? 0.5*YD : 0.35*YD;
        g.beginPath(); g.moveTo(X(-26.67), Z(z)); g.lineTo(X(26.67), Z(z)); g.stroke();
      }
      g.lineWidth = 0.2*YD;
      for(let z=-49; z<50; z++){
        if(z%5===0) continue;
        for(const hx of [-6.67, 6.67]){
          g.beginPath(); g.moveTo(X(hx-0.45), Z(z)); g.lineTo(X(hx+0.45), Z(z)); g.stroke();
        }
        for(const sx of [-26.67, 26.67]){
          const inn = sx<0 ? sx+0.9 : sx-0.9;
          g.beginPath(); g.moveTo(X(sx), Z(z)); g.lineTo(X(inn), Z(z)); g.stroke();
        }
      }
      g.globalAlpha = 1;

      g.font = '900 100px "Arial Black", Arial, sans-serif';
      g.textAlign='center'; g.textBaseline='middle';
      for(let z=-40; z<=40; z+=10){
        const n = 50 - Math.abs(z);
        const digits = [String(n/10), '0'];
        for(const rowX of [19, -19]){
          g.save();
          g.translate(X(rowX), Z(z));
          g.rotate(rowX>0 ? -Math.PI/2 : Math.PI/2);
          g.fillStyle = COL.mark; g.globalAlpha = .93;
          g.fillText(digits[0], -50, 0);
          g.fillText(digits[1],  50, 0);
          g.restore();
        }
      }
      g.globalAlpha = 1;

      /* team areas painted on the apron */
      g.strokeStyle = COL.mark; g.globalAlpha = .55; g.lineWidth = 0.22*YD;
      for(const s of [-1,1]){
        const x0 = X(s*28.2), x1 = X(s*30.0);
        g.beginPath(); g.moveTo(x0, Z(-25)); g.lineTo(x0, Z(25)); g.stroke();
        g.beginPath(); g.moveTo(x1, Z(-25)); g.lineTo(x1, Z(25)); g.stroke();
        for(const zt of [-25, 25]){
          g.beginPath(); g.moveTo(x0, Z(zt)); g.lineTo(x1, Z(zt)); g.stroke();
        }
      }
      g.globalAlpha = 1;

      // midfield crown-S logo — spun 90° so it reads EAST↔WEST (across the field,
      // like a real center-field logo), not up the field north↔south
      {
        const ow = 8.5*YD, oh = ow * (logoImg.height/logoImg.width);   // crown+S is taller than wide
        g.save();
        g.translate(X(0), Z(0));
        g.rotate(-Math.PI/2);
        g.drawImage(logoImg, -ow/2, -oh/2, ow, oh);
        g.restore();
      }

      dabs(g, 0,0,W,H, 1500, ['#5fa257','#2c5a36','#f0e8c8'], 3,7, .02,.045);
    });
  }

  function makeWallTexture(logoImg){
    const t = canvasTex(2048,256,(g,w,h)=>{
      g.fillStyle = COL.wall; g.fillRect(0,0,w,h);
      g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0,0,w,12);
      g.fillStyle = 'rgba(0,0,0,.38)'; g.fillRect(0,h-26,w,26);
      for(let x=0; x<w; x+=146){
        g.fillStyle = 'rgba(0,0,0,.30)'; g.fillRect(x,0,7,h);
        g.fillStyle = 'rgba(255,255,255,.05)'; g.fillRect(x+7,0,4,h);
      }
      dabs(g, 0,0,w,h, 240, ['#0e1c3a','#1a2f57','#0a1530'], 6,16, .05,.11);
      const lh = 112, lw = lh*(logoImg.width/logoImg.height);
      g.globalAlpha = .85;
      g.drawImage(logoImg, 470-lw/2,  h/2-lh/2, lw, lh);
      g.drawImage(logoImg, 1494-lw/2, h/2-lh/2, lw, lh);
      g.globalAlpha = 1;
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  /* --- living-stadium layer --- */
  const FX = { cards:[], flags:[], ribbon:null, crowd:null, sky:null, board:null, flash:null };
  refs.FX = FX;

  function makeRibbonTexture(logoImg){
    // Scheme Kings LED fascia — glowing blue panel, cream SCHEME + gold KINGS,
    // crown-S logo between phrases (per the LED fascia ribbon reference art)
    const t = canvasTex(2048,128,(g,w,h)=>{
      const bg = g.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,'#0a2f86'); bg.addColorStop(0.45,'#1f6ef2'); bg.addColorStop(1,'#0a2a78');
      g.fillStyle = bg; g.fillRect(0,0,w,h);
      g.textBaseline = 'middle';
      const logo = x=>{ const lh = 92, lw = lh*(logoImg.width/logoImg.height); g.drawImage(logoImg, x, h/2-lh/2, lw, lh); return lw; };
      const words = (x, a, b)=>{
        g.font = '900 74px "Arial Narrow", Arial, sans-serif';
        g.shadowColor = 'rgba(255,255,255,.85)'; g.shadowBlur = 14; g.fillStyle = '#fdf8ea';
        g.fillText(a, x, h/2+4);
        const aw = g.measureText(a).width;
        g.shadowColor = 'rgba(245,166,35,.9)'; g.shadowBlur = 14; g.fillStyle = '#f5b83d';
        g.fillText(b, x + aw + 22, h/2+4);
        g.shadowBlur = 0;
      };
      // static band: [logo] SCHEME KINGS  [logo] KING REGGIE’S — repeats around the bowl
      let lw = logo(60);
      words(60+lw+34, 'SCHEME', 'KINGS');
      lw = logo(1084);
      words(1084+lw+34, 'KING', 'REGGIE’S');
      /* LED pixel grid */
      g.fillStyle = 'rgba(0,10,40,.30)';
      for(let y=0; y<h; y+=4) g.fillRect(0,y,w,1.5);
      for(let x=0; x<w; x+=4) g.fillRect(x,0,1.2,h);
    });
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    return t;
  }

  // The giant jumbotron is a promo board for the app — never a score/clock.
  // It just alternates between Reggie's two static ad designs (add 1 / add 2),
  // with a quick cross-fade so the switch isn't a hard pop.
  // Filming Rig — the Jumbotron END-CARD: YouTube thumbnail + red CTA bar + play
  // button. Reggie drops in 'Youtube Thumbnail.jpg'; a placeholder shows otherwise.
  // draw text centered at (x,y), shrinking the font until it fits maxW (robust to
  // whatever condensed font is/ isn't installed)
  function fitText(g, text, x, y, maxW, startPx, weight){
    let px = startPx;
    do { g.font = `${weight} ${px}px "Arial Narrow","Barlow Condensed",system-ui`; if(g.measureText(text).width <= maxW) break; px -= 2; } while(px > 8);
    g.fillText(text, x, y);
  }
  function drawBoardOutro(b){
    const g = b.g, w = b.c.width, h = b.c.height, barH = Math.round(h * 0.20);
    g.fillStyle = '#05060c'; g.fillRect(0,0,w,h);
    if(b.outroImg){
      const iw=b.outroImg.width, ih=b.outroImg.height, tw=w, th=h-barH, s=Math.max(tw/iw, th/ih), dw=iw*s, dh=ih*s;
      g.save(); g.beginPath(); g.rect(0,0,w,h-barH); g.clip();
      g.drawImage(b.outroImg,(w-dw)/2,(h-dh)/2,dw,dh); g.restore();
    } else {
      g.fillStyle='#0d1730'; g.fillRect(0,0,w,h-barH);
      g.fillStyle='#38507e'; g.textAlign='center'; g.textBaseline='middle';
      fitText(g, 'YOUR YOUTUBE THUMBNAIL', w/2, (h-barH)*0.24, w*0.8, Math.round(h*0.06), '800');
    }
    // play button
    const cx=w/2, cy=(h-barH)/2, r=Math.round(h*0.11);
    g.fillStyle='rgba(0,0,0,.45)'; g.beginPath(); g.arc(cx,cy,r*1.18,0,TAU); g.fill();
    g.fillStyle='#ff2d2d'; g.beginPath(); g.arc(cx,cy,r,0,TAU); g.fill();
    g.fillStyle='#fff'; g.beginPath(); g.moveTo(cx-r*0.32,cy-r*0.46); g.lineTo(cx-r*0.32,cy+r*0.46); g.lineTo(cx+r*0.5,cy); g.closePath(); g.fill();
    // red CTA bar
    g.fillStyle='#c4162e'; g.fillRect(0,h-barH,w,barH);
    g.fillStyle='#fff'; g.textAlign='center'; g.textBaseline='middle';
    fitText(g, '▶  WATCH THE FULL BREAKDOWN ON YOUTUBE', w/2, h-barH/2, w*0.94, Math.round(barH*0.42), '900');
    b.tex.needsUpdate = true;
  }
  function drawBoardFace(b, now){
    if(b.outroOn){ drawBoardOutro(b); return; }
    const g = b.g, w = b.c.width, h = b.c.height;
    g.fillStyle = '#060c1c'; g.fillRect(0,0,w,h);
    const ads = b.ads || [];
    // cover-fit an ad image onto the board canvas (crop tiny aspect mismatch)
    const cover = (img)=>{
      if(!img) return;
      const s = Math.max(w/img.width, h/img.height);
      const dw = img.width*s, dh = img.height*s;
      g.drawImage(img, (w-dw)/2, (h-dh)/2, dw, dh);
    };
    const thumbs = b.thumbs || [];
    if(thumbs.length >= 2){                          // Filming Rig: loop the video's thumbnails, cross-fading
      const HOLD = 4.5, t = now/HOLD, n = thumbs.length, idx = Math.floor(t)%n, frac = t-Math.floor(t);
      cover(thumbs[idx]);
      if(frac > 0.9){ g.save(); g.globalAlpha = (frac-0.9)/0.1; cover(thumbs[(idx+1)%n]); g.restore(); }
    } else if(thumbs.length === 1){
      cover(thumbs[0]);                              // only one loaded → hold it
    } else if(b.oregon){                             // fallback: Oregon board
      g.drawImage(b.oregon, 0, 0, w, h);            // STRETCH to fill the 16:9 face (whole image, no crop)
    } else if(ads.length >= 2){
      const HOLD = 4.5, t = now/HOLD, idx = Math.floor(t)%2, frac = t-Math.floor(t);
      cover(ads[idx]);                              // current design
      if(frac > 0.9){                               // brief cross-fade into the next
        g.save(); g.globalAlpha = (frac-0.9)/0.1;
        cover(ads[(idx+1)%2]); g.restore();
      }
    } else if(ads.length === 1){
      cover(ads[0]);
    }
    // subtle LED scanlines
    g.fillStyle = 'rgba(0,0,0,.16)';
    for(let y=0; y<h; y+=5) g.fillRect(0,y,w,2);
    b.tex.needsUpdate = true;
  }
  refs.drawBoardFace = drawBoardFace;

  function makePeopleTexture(){
    return canvasTex(1024,160,(g,w,h)=>{
      const jer  = ['#e8e4d8','#f5a623','#1f6ef2','#23282b','#f5a623','#17284d','#7c1d1d','#1f6ef2'];
      const skin = ['#c9a17a','#8a6142','#5c4030','#e0b48e'];
      for(let i=0;i<34;i++){
        const x = 16 + i*29.5 + rand(-7,7);
        const base = h - rand(2,10);
        const tall = rand(92,126);
        const wdt  = rand(13,18);
        g.globalAlpha = rand(.85,1);
        g.fillStyle = '#1a2320';
        g.fillRect(x-wdt/2+1, base-tall*0.45, wdt*0.36, tall*0.45);
        g.fillRect(x+wdt/2-1-wdt*0.36, base-tall*0.45, wdt*0.36, tall*0.45);
        g.fillStyle = pick(jer);
        g.fillRect(x-wdt/2, base-tall*0.82, wdt, tall*0.40);
        const hr = rand(6.5,8.5);
        g.fillStyle = pick(skin);
        g.beginPath(); g.arc(x, base-tall*0.82-hr, hr, 0, TAU); g.fill();
        if(Math.random()<0.5){
          g.fillStyle = pick(['#f5a623','#1f6ef2','#23282b']);
          g.beginPath(); g.arc(x, base-tall*0.82-hr-1, hr*1.02, Math.PI, TAU); g.fill();
        }
      }
      g.globalAlpha = 1;
    });
  }
  function buildPeopleCards(){
    const tex = makePeopleTexture();
    const mat = new THREE.MeshBasicMaterial({ map:tex, transparent:true, side:THREE.DoubleSide, alphaTest:0.15 });
    const spots = [];
    for(const s of [-1,1]){
      for(let z=-24; z<=24; z+=6) spots.push([s*28.3 + rand(-0.3,0.3), z + rand(-1.5,1.5)]);
      for(let x=-18; x<=18; x+=9) spots.push([x + rand(-1,1), s*63.5 + rand(-0.5,0.5)]);
    }
    for(const [x,z] of spots){
      const wYd = rand(4.5,6.5), hYd = 1.28;
      const geo = new THREE.PlaneGeometry(wYd, hYd);
      const win = wYd*0.034;
      const u0 = rand(0, 1-win);
      const uv = geo.attributes.uv;
      for(let i=0;i<uv.count;i++) uv.setX(i, u0 + uv.getX(i)*win);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, hYd/2 - 0.02, z);
      FX.cards.push(m); scene.add(m);
    }
  }
  function buildSidelineClutter(){
    const grey = new THREE.MeshLambertMaterial({ color:0x394046 });
    const dark = new THREE.MeshLambertMaterial({ color:0x22272b });
    const benchGeo = new THREE.BoxGeometry(0.55,0.5,9);
    const coolCols = [0xf5a623, 0xe8e4d8, 0x1f6ef2, 0x17284d];
    for(const s of [-1,1]){
      for(const bz of [-13,0,13]){
        const b = new THREE.Mesh(benchGeo, grey);
        b.position.set(s*29.4, 0.25, bz); scene.add(b);
      }
      for(let i=0;i<7;i++){
        const hgt = rand(.5,.9);
        const c = new THREE.Mesh(new THREE.BoxGeometry(rand(.5,.8), hgt, rand(.6,1.1)),
          new THREE.MeshLambertMaterial({ color: pick(coolCols) }));
        c.position.set(s*rand(30.3,31.4), hgt/2, rand(-21,21));
        scene.add(c);
      }
      for(let i=0;i<3;i++){
        const k = new THREE.Mesh(new THREE.BoxGeometry(1.1,1.0,1.5), dark);
        k.position.set(s*rand(31,32.5), 0.5, rand(-26,26)); scene.add(k);
      }
      for(const cx of [-15,15]){
        const ped = new THREE.Mesh(new THREE.BoxGeometry(1.3,2.4,1.3), dark);
        ped.position.set(cx, 1.2, s*67.5); scene.add(ped);
        const cam = new THREE.Mesh(new THREE.BoxGeometry(0.8,0.6,1.4), grey);
        cam.position.set(cx, 2.7, s*67.5); cam.lookAt(0,1,0); scene.add(cam);
      }
    }
    const pylMat = new THREE.MeshBasicMaterial({ color:0xff7a1a });
    const pylGeo = new THREE.BoxGeometry(0.18,0.5,0.18);
    for(const px of [-26.5,26.5]) for(const pz of [-60,-50,50,60]){
      const p = new THREE.Mesh(pylGeo, pylMat);
      p.position.set(px, 0.25, pz); scene.add(p);
    }
  }
  /* --- Scheme Kings front entrance (built geometry, not a pasted photo) --- */
  function makeFacadeTex(){
    return canvasTex(1024,1536,(g,w,h)=>{
      const bg=g.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,'#2f7cf7'); bg.addColorStop(0.62,'#1f6ef2'); bg.addColorStop(1,'#1550c0');
      g.fillStyle=bg; g.fillRect(0,0,w,h);
      dabs(g,0,0,w,h*0.62, 130, ['#3f8bff','#1a57c8','#2f74e8'], 22,80, .05,.12);
      // twin gold vertical stripes flanking the logo
      for(const sx of [0.235, 0.72]){
        g.fillStyle='#e0a028'; g.fillRect(w*sx, h*0.045, 48, h*0.6);
        g.fillStyle='rgba(255,214,92,.55)'; g.fillRect(w*sx, h*0.045, 15, h*0.6);
      }
      // big crown-S logo
      const lh=h*0.4, lw=lh*(logoImg.width/logoImg.height);
      g.drawImage(logoImg, w/2-lw/2, h*0.05, lw, lh);
      // name sign band
      g.fillStyle='#0f2350'; g.fillRect(w*0.12, h*0.5, w*0.76, h*0.125);
      g.strokeStyle='#f5a623'; g.lineWidth=7; g.strokeRect(w*0.12, h*0.5, w*0.76, h*0.125);
      g.textAlign='center'; g.textBaseline='middle';
      g.font='900 100px "Arial Narrow",Arial,sans-serif'; g.fillStyle='#F0EAD0';
      g.fillText('SCHEME KINGS', w/2, h*0.542);
      g.font='700 46px "Arial Narrow",Arial,sans-serif'; g.fillStyle='#f5b83d';
      g.fillText('KING REGGIE’S STADIUM', w/2, h*0.6);
      // glass window bands
      for(let i=0;i<4;i++){
        const yy=h*0.655 + i*h*0.072;
        const gl=g.createLinearGradient(0,yy,0,yy+h*0.052);
        gl.addColorStop(0,'#26445c'); gl.addColorStop(0.5,'#5a879c'); gl.addColorStop(1,'#1f3547');
        g.fillStyle=gl; g.fillRect(w*0.07, yy, w*0.86, h*0.052);
        g.fillStyle='rgba(18,28,42,.9)';
        for(let x=w*0.07;x<=w*0.93;x+=w*0.055) g.fillRect(x,yy,5,h*0.052);
      }
      // entrance doors
      g.fillStyle='#0a1420';
      for(let d=0;d<5;d++) g.fillRect(w*0.19+d*w*0.132, h*0.9, w*0.095, h*0.1);
      g.strokeStyle='#c9922a'; g.lineWidth=4;
      for(let d=0;d<5;d++) g.strokeRect(w*0.19+d*w*0.132, h*0.9, w*0.095, h*0.1);
    });
  }
  function makeWingTex(){
    return canvasTex(512,768,(g,w,h)=>{
      g.drawImage(concreteImg,0,0,w,h);
      g.fillStyle='rgba(150,145,135,.42)'; g.fillRect(0,0,w,h);
      for(let r=0;r<6;r++){
        const yy=h*0.1 + r*h*0.145;
        for(let c=0;c<7;c++){
          const xx=w*0.1 + c*w*0.12;
          g.fillStyle = Math.random()<0.68 ? '#39586d' : '#f0d68a';
          g.fillRect(xx, yy, w*0.08, h*0.09);
        }
      }
    });
  }
  function buildEntrance(){
    const grp = new THREE.Group();
    const o = outerAt(0,null);                   // +x sideline (tall grandstand)
    const baseX = o.x + 2.5;
    const concrete = new THREE.MeshLambertMaterial({ map:concreteTex, color:0xbdb6a8, side:THREE.DoubleSide });
    const facadeMat = new THREE.MeshBasicMaterial({ map:makeFacadeTex(), side:THREE.DoubleSide });
    const winMat = new THREE.MeshBasicMaterial({ map:makeWingTex(), side:THREE.DoubleSide });
    const H=31, bayW=22, bayD=5;
    const bay = new THREE.Mesh(new THREE.BoxGeometry(bayD, H, bayW),
      [facadeMat, concrete, concrete, concrete, concrete, concrete]);
    bay.position.set(baseX + bayD/2, H/2, 0); grp.add(bay);
    for(const s of [-1,1]){                       // stepped concrete wings
      const ww=16, wd=4, wh=22;
      const wing = new THREE.Mesh(new THREE.BoxGeometry(wd, wh, ww),
        [winMat, concrete, concrete, concrete, concrete, concrete]);
      wing.position.set(baseX - 0.6 + wd/2, wh/2, s*(bayW/2 + ww/2)); grp.add(wing);
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(9,1.1, bayW+34),
      new THREE.MeshLambertMaterial({ color:0x20262b, side:THREE.DoubleSide }));
    canopy.position.set(baseX+3, H+0.6, 0); canopy.rotation.z = -0.1; grp.add(canopy);
    const plaza = new THREE.Mesh(new THREE.PlaneGeometry(22, bayW+40),
      new THREE.MeshLambertMaterial({ map:concreteTex, color:0x8f8a80 }));
    plaza.rotation.x = -Math.PI/2; plaza.position.set(baseX+12, 0.02, 0); grp.add(plaza);
    scene.add(grp);
    refs.entrance = grp;
  }

  function buildFlags(){
    const flagGrp = new THREE.Group();
    scene.add(flagGrp);
    refs.flagGrp = flagGrp;
    const poleMat = new THREE.MeshLambertMaterial({ color:0x22282b });
    let alt = 0;
    for(const th of [0.95,1.35,1.75,2.15,2.55,3.7,4.2,4.7,5.2,5.6]){
      const o = outerAt(th,null), d = ringDir(th);
      const x = o.x + d.x*1.0, z = o.z + d.z*1.0;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.08,3.2,6), poleMat);
      pole.position.set(x, o.y+1.6, z);
      flagGrp.add(pole);
      const geo = new THREE.PlaneGeometry(1.5, 0.85, 8, 3);
      geo.translate(0.75, 0, 0);
      const flag = new THREE.Mesh(geo,
        new THREE.MeshBasicMaterial({ color: (alt++%2) ? 0xf5a623 : 0x1f6ef2, side:THREE.DoubleSide }));
      flag.position.set(x, o.y+2.8, z);
      flag.rotation.y = 0.5 + rand(-0.2,0.2);
      flag.userData = { base: geo.attributes.position.array.slice(), phase: rand(0,TAU) };
      FX.flags.push(flag); flagGrp.add(flag);
    }
  }
  function buildFlashes(){
    const N = 46;
    const pos = new Float32Array(N*3), col = new Float32Array(N*3), meta = [];
    for(let i=0;i<N;i++){
      const th = rand(0,TAU), f = rand(0.15,0.92);
      const a = innerAt(th,WALL_H), b = outerAt(th,null), d = ringDir(th);
      pos[i*3]   = a.x + (b.x-a.x)*f - d.x*0.4;
      pos[i*3+1] = a.y + (b.y-a.y)*f + 0.3;
      pos[i*3+2] = a.z + (b.z-a.z)*f - d.z*0.4;
      meta.push({ dur: rand(2.5,8), off: rand(0,8) });
    }
    const flashTex = canvasTex(64,64,(g,w,h)=>{
      const grd = g.createRadialGradient(w/2,h/2,1, w/2,h/2,w/2);
      grd.addColorStop(0,'rgba(255,255,255,1)');
      grd.addColorStop(0.35,'rgba(220,235,255,.5)');
      grd.addColorStop(1,'rgba(220,235,255,0)');
      g.fillStyle = grd; g.fillRect(0,0,w,h);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('color', new THREE.BufferAttribute(col,3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({
      size:1.2, vertexColors:true, map:flashTex, transparent:true,
      blending:THREE.AdditiveBlending, depthWrite:false }));
    points.visible = false;              // field mode only — Points don't scale
    FX.flash = { points, meta };         // with the miniature (gl_PointSize)
    scene.add(points);
  }
  function goalPost(sign){
    const grp = new THREE.Group();
    const mat = new THREE.MeshLambertMaterial({ color:0xffdf35, emissive:0x6b5a08 });
    const cyl = (r,len)=>new THREE.Mesh(new THREE.CylinderGeometry(r,r,len,10), mat);
    const base = cyl(0.11, 3.33); base.position.set(0,1.67, sign*62.3); grp.add(base);
    const arm = cyl(0.09, 2.3);  arm.rotation.x = Math.PI/2;
    arm.position.set(0,3.33, sign*61.15); grp.add(arm);
    const bar = cyl(0.09, 6.2);  bar.rotation.z = Math.PI/2;
    bar.position.set(0,3.33, sign*60); grp.add(bar);
    for(const ux of [-3.1,3.1]){
      const up = cyl(0.075, 8.9); up.position.set(ux, 3.33+4.45, sign*60); grp.add(up);
    }
    scene.add(grp);
  }

  /* --- section anchors (visible in field mode only) --- */
  const anchorsGrp = new THREE.Group();
  anchorsGrp.visible = false;
  scene.add(anchorsGrp);
  refs.anchorsGrp = anchorsGrp;
  const anchorGroups = [];
  refs.anchorGroups = anchorGroups;
  const glowTex = canvasTex(128,128,(g,w,h)=>{
    const grd = g.createRadialGradient(w/2,h/2,2, w/2,h/2,w/2);
    grd.addColorStop(0,'rgba(255,235,120,.9)');
    grd.addColorStop(0.35,'rgba(254,225,35,.35)');
    grd.addColorStop(1,'rgba(254,225,35,0)');
    g.fillStyle=grd; g.fillRect(0,0,w,h);
  });
  function labelSprite(text){
    const font = '900 64px "Arial Narrow", Arial, sans-serif';
    const meas = document.createElement('canvas').getContext('2d');
    meas.font = font;
    try{ meas.letterSpacing = '3px'; }catch(e){}
    const tw = meas.measureText(text).width;
    const W = Math.ceil(tw+90), H = 112;
    const tex = canvasTex(W,H,(g)=>{
      g.font = font;
      try{ g.letterSpacing = '3px'; }catch(e){}
      g.textAlign='center'; g.textBaseline='middle';
      g.lineJoin='round';
      g.strokeStyle='#0c2418'; g.lineWidth=14;
      g.strokeText(text, W/2, H/2+4);
      g.fillStyle=COL.yellow;
      g.fillText(text, W/2, H/2+4);
    });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:tex, transparent:true }));
    const hgt = 2.1;
    sp.scale.set(W/H*hgt, hgt, 1);
    return sp;
  }
  const ANCHORS = [
    ['ABOUT',                 52, 30,   0],
    ['PERSONNEL',             30,  3,   0],
    ['SCHEME DNA',           -44, 16,   0],
    ['RUN GAME',               0,  3, -44],
    ['PASS GAME',             -9,  3,  46],
    ['STAR PLAYS',             0,  3.5, 55],
    ['FULL OFFENSE / SERIES',  0, 11.5, 88],
    ['DRIVE BUILDER',          0,  4.5, 0],
  ];
  function buildAnchors(){
    const coreGeo = new THREE.SphereGeometry(0.35, 12, 10);
    const coreMat = new THREE.MeshBasicMaterial({ color:0xffe94a });
    const ringGeo = new THREE.TorusGeometry(0.78, 0.06, 8, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color:0xfee123 });
    for(const [label,x,y,z] of ANCHORS){
      const grp = new THREE.Group();
      grp.position.set(x,y,z);
      grp.add(new THREE.Mesh(coreGeo, coreMat));
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI/2; grp.add(ring);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map:glowTex, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
      glow.scale.set(4,4,1); grp.add(glow);
      const lab = labelSprite(label);
      lab.position.y = 2.2; grp.add(lab);
      grp.userData.phase = Math.random()*TAU;
      grp.userData.baseY = y;
      grp.userData.ring = ring;
      anchorsGrp.add(grp); anchorGroups.push(grp);
    }
  }

  /* ---------------- build it ---------------- */
  /* A provided as parameter */
  const opt = (src)=>loadImg(src).catch(()=>null);   // missing art degrades gracefully
  const [crowdImg, grassImg, concreteImg, logoImg, ezImg, adImg1, adImg2, topperImg, oregonImg, outroImg] = await Promise.all([
    loadImg(A + 'Scheme Kings Crowd Texture.jpg'),
    loadImg(A + 'Field grass texture detail Oregon.jpg'),
    loadImg(A + 'Concrete structure material Oregon.jpg'),
    loadImg(A + 'Scheme Kings Logo.webp'),
    loadImg(A + 'Scheme Kings Endzone.jpg'),
    opt(A + 'Kig reggie play designer add 1.jpg'),   // scoreboard promo — static, alternates
    opt(A + 'Kig reggie play designer add 2.jpg'),
    opt(A + 'Scheme Kings Stadium Jumbotron Top.webp'),  // transparent topper pasted over the cap
    opt(A + 'Oregon Board.jpg'),                     // shown on the board ONLY during the intro swoop
    opt(A + 'Youtube Thumbnail.jpg'),                // Filming Rig: the Jumbotron END-CARD thumbnail (drop-in)
  ]);

  // The Jumbotron cycles Reggie's two promo boards, cross-fading between them every
  // few seconds (drawBoardFace handles the alternation). Bundled locally so they ship
  // with the app; drop replacements in field/assets/ under these names to swap them.
  const boardThumbs = (await Promise.all([
    opt(A + 'Jumbotron new 1.jpg'),
    opt(A + 'Jumbotron new 2.jpg'),
  ])).filter(Boolean);

  const crowdC = (()=>{
    const base = processImg(crowdImg, 2048, 870, { cropX:0.07, cropY:0.16 });
    const c = document.createElement('canvas'); c.width = 2048; c.height = 2610;
    const g = c.getContext('2d');
    for(let deck=0; deck<3; deck++){
      const y = 2610 - (deck+1)*870;
      const off = deck*683;
      g.drawImage(base, off-2048, y); g.drawImage(base, off, y);
      if(deck>0){
        g.fillStyle = '#3d443f'; g.fillRect(0, y+870-14, 2048, 14);
        g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(0, y+870-18, 2048, 4);
      }
    }
    return c;
  })();
  const crowdTex = texFromCanvas(crowdC);
  const concreteTex = texFromCanvas(processImg(concreteImg, 1024, 1024));

  // subtle turf normal map so stadium light catches the grass (stylized, NOT 3D
  // grass blades) — keeps the painted look but stops the field reading dead-flat
  function makeTurfNormal(){
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#8080ff'; g.fillRect(0,0,256,256);   // flat normal (up)
    for(let i=0;i<14000;i++){ const r = 128 + (Math.random()*2-1)*22, gg = 128 + (Math.random()*2-1)*22;
      g.fillStyle = `rgba(${r|0},${gg|0},255,0.5)`; g.fillRect((Math.random()*256)|0, (Math.random()*256)|0, 2, 2); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(20, 44); t.anisotropy = 8; return t;
  }
  const field = new THREE.Mesh(
    new THREE.PlaneGeometry(FW, FL),
    new THREE.MeshStandardMaterial({
      map: makeFieldTexture(grassImg, logoImg, ezImg),
      // scale albedo DOWN so the now-LIT turf lands at the same brightness the old
      // unlit field had (the scene light sums to ~2.6× — without this it blows out)
      color: 0x585858,
      normalMap: makeTurfNormal(), normalScale: new THREE.Vector2(0.45, 0.45),
      roughness: 0.92, metalness: 0.0,
    })
  );
  field.rotation.x = -Math.PI/2;
  field.name = 'field';
  field.receiveShadow = true;
  scene.add(field);
  refs.field = field;   // stylized-premium lit turf (mow stripes + normal map)

  /* (the old infinite ground plane is gone — the cliff summit is the ground) */

  const matCrowd = new THREE.MeshBasicMaterial({ map:crowdTex, side:THREE.DoubleSide });
  const matWall  = new THREE.MeshBasicMaterial({ map:makeWallTexture(logoImg), side:THREE.DoubleSide });
  const matRim   = new THREE.MeshBasicMaterial({ map:concreteTex, color:0xcfc8bd, side:THREE.DoubleSide });
  /* plain gray concrete exterior everywhere — the branding lives on the built
     front entrance (buildEntrance), not smeared around the whole bowl */
  const matSkirt = new THREE.MeshBasicMaterial({ map:concreteTex, color:0x9a948a, side:THREE.DoubleSide });
  const matSteel = new THREE.MeshLambertMaterial({ color:0x2b3136, side:THREE.DoubleSide });

  buildStrip(0, TAU, 128, th=>innerAt(th,WALL_H), th=>outerAt(th,null), matCrowd,
    { uTile:45, vTile:55, tint:'in' });
  FX.crowd = crowdTex;
  buildStrip(0, TAU, 128, th=>innerAt(th,0), th=>innerAt(th,WALL_H), matWall,
    { uRep:22, tint:'in' });
  buildStrip(0, TAU, 128,
    th=>outerAt(th,null),
    th=>{ const o=outerAt(th,null), d=ringDir(th); return V3(o.x+d.x*2.4, o.y, o.z+d.z*2.4); },
    matRim, { uTile:12 });
  buildStrip(0, TAU, 128,
    th=>{ const o=outerAt(th,null), d=ringDir(th); return V3(o.x+d.x*2.4, o.y, o.z+d.z*2.4); },
    th=>{ const o=outerAt(th,null), d=ringDir(th); return V3(o.x+d.x*2.4, 0,   o.z+d.z*2.4); },
    matSkirt, { uTile:26, vTile:26, tint:'out' });

  /* LED ribbon board on the parapet (piece: series) */
  const ribbonTex = makeRibbonTexture(logoImg);
  FX.ribbon = ribbonTex;
  refs.ribbonMesh = buildStrip(0, TAU, 128,
    th=>{ const o=outerAt(th,null), d=ringDir(th); return V3(o.x-d.x*0.25, o.y+0.25, o.z-d.z*0.25); },
    th=>{ const o=outerAt(th,null), d=ringDir(th); return V3(o.x-d.x*0.25, o.y+1.25, o.z-d.z*0.25); },
    new THREE.MeshBasicMaterial({ map:ribbonTex, side:THREE.DoubleSide }),
    { uTile:24 });

  const shadeTex = canvasTex(4,128,(g,w,h)=>{
    const grd = g.createLinearGradient(0,h,0,0);
    grd.addColorStop(0,'rgba(8,14,18,0)'); grd.addColorStop(1,'rgba(8,14,18,.5)');
    g.fillStyle = grd; g.fillRect(0,0,w,h);
  });
  buildStrip(-0.78, 0.78, 40,
    th=>{ const a=innerAt(th,WALL_H), b=outerAt(th,null);
          return V3(a.x+(b.x-a.x)*0.7+ringDir(th).x*0.15, a.y+(b.y-a.y)*0.7+0.15, a.z+(b.z-a.z)*0.7+ringDir(th).z*0.15); },
    th=>{ const b=outerAt(th,null), d=ringDir(th); return V3(b.x+d.x*0.15, b.y+0.15, b.z+d.z*0.15); },
    new THREE.MeshBasicMaterial({ map:shadeTex, transparent:true, depthWrite:false, side:THREE.DoubleSide }),
    { uRep:1 });

  /* roof */
  const ROOF0 = -0.78, ROOF1 = 0.78;
  const roofInner = th=>{
    const p=ringPoint(th), d=ringDir(th), dep=standDepth(th);
    return V3(p.x+d.x*dep*0.30, 38, p.z+d.z*dep*0.30);
  };
  const roofOuter = th=>{
    const p=ringPoint(th), d=ringDir(th), dep=standDepth(th);
    return V3(p.x+d.x*(dep+5), 40.8, p.z+d.z*(dep+5));
  };
  buildStrip(ROOF0, ROOF1, 40, roofInner, roofOuter, matSteel, { uRep:1 });
  buildStrip(ROOF0, ROOF1, 40,
    th=>{ const r=roofInner(th); return V3(r.x, 38,   r.z); },
    th=>{ const r=roofInner(th); return V3(r.x, 36.4, r.z); },
    new THREE.MeshLambertMaterial({ color:0x1d2326, side:THREE.DoubleSide }), { uRep:1 });
  buildStrip(ROOF0, ROOF1, 40,
    th=>{ const r=roofInner(th); return V3(r.x, 36.4, r.z); },
    th=>{ const r=roofInner(th); return V3(r.x, 36.1, r.z); },
    new THREE.MeshBasicMaterial({ color:COL.yellow, side:THREE.DoubleSide }), { uRep:1 });
  buildStrip(ROOF0, ROOF1, 40,
    th=>outerAt(th,null),
    th=>{ const o=outerAt(th,null), d=ringDir(th); return V3(o.x+d.x*4.5, 40.4, o.z+d.z*4.5); },
    new THREE.MeshLambertMaterial({ map:concreteTex, color:0x7a746a, side:THREE.DoubleSide }), { uTile:26 });

  const matColumn = new THREE.MeshLambertMaterial({ color:0x22282b });
  for(const th of [-0.62,-0.31,0,0.31,0.62]){
    const p=ringPoint(th), d=ringDir(th), dep=standDepth(th)+3.6;
    const col = new THREE.Mesh(new THREE.BoxGeometry(1.1,40,1.1), matColumn);
    col.position.set(p.x+d.x*dep, 20, p.z+d.z*dep);
    scene.add(col);
  }
  /* press box (glass strip = piece: pressbox/gameplan) */
  const pb = new THREE.Mesh(new THREE.BoxGeometry(4,5,46),
    new THREE.MeshLambertMaterial({ map:concreteTex, color:0x8a847a }));
  pb.position.set(42 + standDepth(0)*0.62, 35, 0);
  scene.add(pb);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.3,1.6,42),
    new THREE.MeshBasicMaterial({ color:0x9fc3c9 }));
  glass.position.set(pb.position.x-2.1, 35.4, 0);
  scene.add(glass);
  refs.glass = glass;

  /* tunnels */
  const matTunnel = new THREE.MeshLambertMaterial({ color:0x0c1013 });
  const matLintel = new THREE.MeshLambertMaterial({ map:concreteTex, color:0x8a847a });
  for(const th of [0.6, 2.54, 3.14, 3.77, 5.2, 5.9]){
    const p=ringPoint(th), d=ringDir(th), dep=standDepth(th);
    const f = 0.14;
    const y = WALL_H + standH(th)*f + 0.4;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(5.2,2.9,0.5), matLintel);
    frame.position.set(p.x+d.x*(dep*f+0.4), y, p.z+d.z*(dep*f+0.4));
    frame.lookAt(0, y, 0);
    scene.add(frame);
    const port = new THREE.Mesh(new THREE.BoxGeometry(4.0,2.2,0.6), matTunnel);
    port.position.set(p.x+d.x*(dep*f+0.3), y-0.2, p.z+d.z*(dep*f+0.3));
    port.lookAt(0, y-0.2, 0);
    scene.add(port);
  }

  /* scoreboard: video wall + MIGHTY [O] OREGON cap (piece: scoreboard) */
  const matBoardSteel = new THREE.MeshLambertMaterial({ color:0x171c20 });
  for(const px of [-30,30]){
    const leg = new THREE.Mesh(new THREE.BoxGeometry(3.4,15,3.4), matBoardSteel);
    leg.position.set(px, 7.5, 97); scene.add(leg);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(66,2.0,2.4), matBoardSteel);
  beam.position.set(0, 14.3, 97); scene.add(beam);
  const braceGeo = new THREE.BoxGeometry(0.7,6.8,0.7);
  for(const px of [-14,14]){
    const br = new THREE.Mesh(braceGeo, matBoardSteel);
    br.position.set(px, 11, 97); br.rotation.z = px>0 ? -0.6 : 0.6; scene.add(br);
  }
  const BH = 42, BW = +(BH * 16 / 9).toFixed(2);   // jumbotron — locked to a true 16:9 face
                             // (74.67 × 42) so 16:9 graphics/video fill it edge-to-edge, no letterbox
  const boardC = document.createElement('canvas');
  boardC.width = 1024; boardC.height = Math.round(1024*BH/BW);
  const boardTex = new THREE.CanvasTexture(boardC);
  boardTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  FX.board = { c:boardC, g:boardC.getContext('2d'), tex:boardTex, logo:logoImg, last:-1,
    ads:[adImg1, adImg2].filter(Boolean), oregon:oregonImg, cinema:false,
    thumbs:boardThumbs,          // Filming Rig: video thumbnails looped on the Jumbotron
    outroImg, outroOn:false };   // Filming Rig end-card
  refs.setBoardOutro = (on) => { if(FX.board){ FX.board.outroOn = !!on; drawBoardFace(FX.board, 0); } };
  drawBoardFace(FX.board, 0);
  const matFrame = new THREE.MeshLambertMaterial({ color:0x0a0f13 });
  // back of the scoreboard = the SAME Oregon board as the front (Reggie), stretched
  // to fill the 16:9 face. The +z box face reads non-mirrored from behind, so the
  // cold-open camera that starts behind the Jumbotron sees it correctly.
  const boardBackTex = canvasTex(1024, 576, (g,w,h)=>{
    if(oregonImg){
      g.drawImage(oregonImg, 0, 0, w, h);
    } else {
      g.fillStyle = '#0a1430'; g.fillRect(0,0,w,h);
    }
  });
  // the whole 16:9 board assembly (screen + topper + braces + cover) lives in one
  // group so the presenter swoop can hide it all at once when the vertical board
  // slams in
  const board16 = new THREE.Group();
  scene.add(board16);
  refs.board16 = board16;
  const sBoard = new THREE.Mesh(new THREE.BoxGeometry(BW,BH,1.4), [
    matFrame, matFrame, matFrame, matFrame,
    new THREE.MeshBasicMaterial({ map:boardBackTex }), new THREE.MeshBasicMaterial({ map:boardTex })
  ]);
  sBoard.position.set(0, 14.8+BH/2, 97);
  board16.add(sBoard);
  const boardTopY = 14.8 + BH;   // top edge of the board face
  if(topperImg){
    // Reggie's transparent topper webp, pasted on a flat plane so its cut-out
    // shape shows the sky through (no boxy dark backing). ~2/3 the board width,
    // seated on two steel brace posts. The webp carries transparent padding, so
    // TRIM to the opaque bounds first — else the plane edge (and the braces that
    // meet it) sit far below the visible banner.
    const trim = (img)=>{
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const cg = c.getContext('2d'); cg.drawImage(img,0,0);
      const d = cg.getImageData(0,0,c.width,c.height).data;
      let minX=c.width, minY=c.height, maxX=-1, maxY=-1;
      for(let y=0;y<c.height;y++) for(let x=0;x<c.width;x++){
        if(d[(y*c.width+x)*4+3] > 16){ if(x<minX)minX=x; if(x>maxX)maxX=x; if(y<minY)minY=y; if(y>maxY)maxY=y; }
      }
      if(maxX<0) return c;                          // fully transparent — bail
      const w = maxX-minX+1, h = maxY-minY+1;
      const oc = document.createElement('canvas'); oc.width=w; oc.height=h;
      oc.getContext('2d').drawImage(c, minX,minY,w,h, 0,0,w,h);
      return oc;
    };
    const topCanvas = trim(topperImg);
    const topTex = new THREE.CanvasTexture(topCanvas); topTex.needsUpdate = true;
    topTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    const ar = topCanvas.width / topCanvas.height;
    const tw = 56, th2 = tw / ar;                 // SCHEME KINGS STADIUM sign, 15% smaller (was 66)
    const gap = 1.6;                              // short bracket run between board top and banner
    const topBottomY = boardTopY + gap;
    const topGeo = new THREE.PlaneGeometry(tw, th2);
    const topMat = () => new THREE.MeshBasicMaterial({ map:topTex, transparent:true, side:THREE.FrontSide, depthWrite:false, alphaTest:0.02 });
    // FRONT face — reads toward the field (−z), same as the board front
    const topper = new THREE.Mesh(topGeo, topMat());
    topper.position.set(0, topBottomY + th2/2, 97 - 0.6);
    topper.rotation.y = Math.PI;
    board16.add(topper);
    // BACK face — a second plane facing +z so the sign reads correctly (NOT
    // mirrored) when the cold-open camera starts behind the Jumbotron
    const topperBack = new THREE.Mesh(topGeo, topMat());
    topperBack.position.set(0, topBottomY + th2/2, 97 - 0.6);   // rotation.y = 0 → faces +z
    board16.add(topperBack);
    // two steel brace posts that actually span board-top → banner-bottom
    const braceMat = new THREE.MeshLambertMaterial({ color:0x54606a });
    const postBottom = boardTopY - 0.6, postTop = topBottomY + 1.4;
    const braceGeo2 = new THREE.BoxGeometry(1.3, postTop - postBottom, 1.3);
    for(const bx of [-tw*0.30, tw*0.30]){
      const post = new THREE.Mesh(braceGeo2, braceMat);
      post.position.set(bx, (postBottom+postTop)/2, 96.3);
      board16.add(post);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 1.7), braceMat);
      foot.position.set(bx, boardTopY + 0.1, 96.3); board16.add(foot);
    }
  } else {
    // fallback: the old drawn SCHEME · KINGS cap
    const capFace = canvasTex(1024,160,(g,w,h)=>{
      g.fillStyle = '#0a1128'; g.fillRect(0,0,w,h);
      g.strokeStyle = 'rgba(245,166,35,.9)'; g.lineWidth = 6; g.strokeRect(8,8,w-16,h-16);
      g.font = '900 92px "Arial Narrow", Arial, sans-serif';
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = COL.yellowSoft;
      g.fillText('SCHEME', w/2-250, h/2+6);
      g.fillText('KINGS',  w/2+250, h/2+6);
      const lh = 122, lw = lh*(logoImg.width/logoImg.height);
      g.drawImage(logoImg, w/2-lw/2, h/2-lh/2, lw, lh);
    });
    const cap = new THREE.Mesh(new THREE.BoxGeometry(60,4.6,1.6), [
      matFrame, matFrame, matFrame, matFrame,
      matFrame, new THREE.MeshBasicMaterial({ map:capFace })
    ]);
    cap.position.set(0, boardTopY+2.4, 97);
    scene.add(cap);
  }
  /* dark cover shown while the scoreboard face is unlit */
  const coverMat = new THREE.MeshBasicMaterial({ color:0x0a0e08 });
  const boardCover = new THREE.Mesh(new THREE.PlaneGeometry(BW-0.8, BH-0.8), coverMat);
  boardCover.position.set(0, 14.8+BH/2, 97-0.72); boardCover.rotation.y = Math.PI;
  board16.add(boardCover);
  refs.boardCovers = [boardCover];

  /* CTA graphic — the "FULL BREAKDOWN ON KING REGGIE YOUTUBE" sign, sitting UNDER
     the Jumbotron pointing up at it. Shown only during the End CTA (refs.setCTAGraphic). */
  // sits IN FRONT of the board's bottom edge (z 96 < board face) so its red arrow
  // OVERLAPS the thumbnail, pointing up at it. depthTest off → draws over the board.
  const ctaSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map:null, transparent:true, depthWrite:false, depthTest:false }));
  const CTA_REST_Y = 16;                       // raised from 13 so the bottom isn't cut off in the 9:16 crop
  ctaSprite.position.set(0, CTA_REST_Y, 96); ctaSprite.visible = false; ctaSprite.renderOrder = 12;
  const ctaBase = { w: 27, h: 18 };            // baked scale (updated once the texture's aspect is known)
  const setCtaTex = (tex)=>{ tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); ctaSprite.material.map = tex; ctaSprite.material.needsUpdate = true;
    const asp = (tex.image && tex.image.width/tex.image.height) || 1.5, H = 18; ctaBase.w = H*asp; ctaBase.h = H; ctaSprite.scale.set(ctaBase.w, ctaBase.h, 1); };
  // Reggie's "FULL BREAKDOWN ON KING REGGIE YOUTUBE" arrow graphic (drop it into
  // 3d Stadium assets/ as this name); falls back to the plain sign until it exists.
  const TL = new THREE.TextureLoader();
  // The .webp is the same art as the old 7.1MB lossless PNG at 140KB — it was, by
  // itself, half the page weight, for a sign only Studio ever shows.
  TL.load(encodeURI('field/assets/Watch Full YT Video.webp'), setCtaTex, undefined,
    () => TL.load(encodeURI('field/assets/Full breakdown sign.webp'), setCtaTex));
  scene.add(ctaSprite);

  /* CTA sign entrance + attention loop. setCTAGraphic(true) ARMS it (stays hidden);
     tickCTA waits until the End-CTA camera has stopped moving (settled), then SLAMS
     the sign down with an overshoot, then runs a continuous parallax/bob/pulse to
     pull the eye to it. (Reggie: don't just drop in — wait for the camera, slam, animate.) */
  let ctaState = 'hidden';    // hidden | armed | slam | live
  let ctaT = 0, ctaLiveT = 0;
  const CTA_DROP = 26, CTA_SLAM_DUR = 0.55;
  const ctaBackOut = (t)=>{ const c1 = 1.70158, c3 = c1 + 1, u = t - 1; return 1 + c3*u*u*u + c1*u*u; };
  refs.setCTAGraphic = (on)=>{
    if (on) { ctaState = 'armed'; ctaSprite.visible = false; ctaSprite.material.rotation = 0; ctaSprite.position.set(0, CTA_REST_Y, 96); }
    else { ctaState = 'hidden'; ctaSprite.visible = false; ctaSprite.material.rotation = 0; }
  };
  refs.tickCTA = (dt, settled)=>{
    if (ctaState === 'hidden') return;
    if (ctaState === 'armed') {
      if (!settled) return;                        // hold until the camera stops moving
      ctaState = 'slam'; ctaT = 0; ctaLiveT = 0; ctaSprite.visible = true;
    }
    if (ctaState === 'slam') {
      ctaT = Math.min(1, ctaT + dt / CTA_SLAM_DUR);
      const e = ctaBackOut(ctaT);
      ctaSprite.position.y = CTA_REST_Y + CTA_DROP * (1 - e);      // drops from above with an overshoot
      const pop = 1 + 0.14 * Math.sin(Math.PI * ctaT);            // squash-pop on impact
      ctaSprite.scale.set(ctaBase.w * pop, ctaBase.h * pop, 1);
      if (ctaT >= 1) { ctaState = 'live'; ctaLiveT = 0; }
    } else if (ctaState === 'live') {
      ctaLiveT += dt; const t = ctaLiveT;
      ctaSprite.position.y = CTA_REST_Y + Math.sin(t * 2.2) * 0.4;             // gentle bob
      const br = 1 + 0.035 * Math.sin(t * 2.6);                               // breathing pulse
      ctaSprite.scale.set(ctaBase.w * br, ctaBase.h * br, 1);
      ctaSprite.material.rotation = Math.sin(t * 1.7) * 0.02;                 // slight sway
    }
  };

  /* ---- VERTICAL 9:16 board for the TikTok breakdown ----
     Hidden until the presenter swoop swaps it in (it slams down). Sized + placed
     to fill Reggie's Cam3 framing; he composites his breakdown onto its face.
     refs.setBoardVertical(on) hides the 16:9 assembly and shows this, and vice
     versa; refs.boardV.mesh / .restY drive the slam animation from app.js. */
  const VBW = 48, VBH = 85;                                    // 9:16 (48/85 ≈ 0.565)
  const vBoardTex = canvasTex(576, 1024, (g,w,h)=>{
    const bg = g.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#10224c'); bg.addColorStop(1,'#070f26');
    g.fillStyle = bg; g.fillRect(0,0,w,h);
    g.globalAlpha = 0.09;                                      // faint crown-S watermark
    const lw = w*0.62, lh = lw*(logoImg.height/logoImg.width);
    g.drawImage(logoImg, w/2-lw/2, h*0.44-lh/2, lw, lh);
    g.globalAlpha = 1;
    g.strokeStyle = '#f5a623'; g.lineWidth = 18; g.strokeRect(16,16,w-32,h-32);
    g.strokeStyle = 'rgba(245,197,61,.4)'; g.lineWidth = 6; g.strokeRect(38,38,w-76,h-76);
    g.textAlign='center'; g.textBaseline='middle';
    g.fillStyle = '#F0EAD0'; g.font = '800 44px "Arial Narrow", Arial, sans-serif';
    g.fillText('SCHEME KINGS', w/2, h-96);
    g.fillStyle = '#f5b83d'; g.font = '700 30px "Arial Narrow", Arial, sans-serif';
    g.fillText('KING REGGIE’S BREAKDOWN', w/2, h-56);
  });
  // sit the board ON the scoreboard beam/rail (beam top y≈15.3), like the 16:9
  // board did — so it reads as mounted, not floating down to the field
  const vBoardRestY = 15.3 + VBH / 2;                          // bottom rests on the rail
  const vBoard = new THREE.Mesh(new THREE.PlaneGeometry(VBW, VBH),
    new THREE.MeshBasicMaterial({ map:vBoardTex }));
  vBoard.rotation.y = Math.PI;                                 // face the field (−z)
  vBoard.position.set(0, vBoardRestY, 97 - 0.3);
  vBoard.visible = false;
  scene.add(vBoard);
  refs.boardV = { mesh: vBoard, restY: vBoardRestY };
  refs.setBoardVertical = (on) => {
    board16.visible = !on;
    vBoard.visible = !!on;
    // kill the additive crowd-flash twinkles so they don't glow "through" the
    // vertical board (they physically sit in the stands in front of its lower half)
    if (FX.flash && FX.flash.points) FX.flash.points.visible = !on;
  };

  /* ==========================================================================
     THE DIORAMA ENVIRONMENT — ported from war_room_test.html (buildNightBackdrop
     ~L1971 + buildEnvironment ~L1997 + texRadialT ~L2190), the ACTUAL war room
     code. Adaptations only: (1) dimensions scaled from table-units to stadium
     yards (~×20); (2) the single flat sky wall becomes a RING of duplicates —
     the wall texture's side-fades cross-blend so the wrap has no seams; (3) the
     painted star sky also covers a dome above the ring (the war room camera was
     a wedge; ours orbits 360°). Swap the video / rock skin via BACKDROP.
     ========================================================================== */
  const BACKDROP = {
    /* The living landscape. Back on the ORIGINAL clip: the ring geometry below is
       hand-tuned to THIS footage's composition — its glow band sits ~29% up the
       frame with a treeline under it that rides the stadium lip. New Backgorund.mp4
       was tried here and read wrong (its band is at ~57% and far brighter), so it
       stays on the cover only, where it's a flat backdrop and composition is free. */
    loop: A + 'Oregon Skyline Background.mp4',
    /* WHICH SLICE of the footage lands on the sky wall (0 = bottom edge, 1 = top).
       0→1 is the whole frame = the original behaviour exactly. It's only a knob for
       the next clip that frames its horizon somewhere else: cropping re-lands the
       band without touching the geometry.  Live:  window.__backdrop(from, to)  */
    frameFrom: 0, frameTo: 1,
    rockSide: A + 'Rock Left Texture.jpg',       // cliff wall skin — swappable
    rockSideAlt: A + 'Rock Right Texture.jpg',   // alternate wall skin (unused slot, try per lighting)
    rockTop: A + 'Rock Top Texture.jpg',         // summit cap skin — swappable
  };
  function texRadialT(size, stops){
    const c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d'), m = size/2;
    const gr = g.createRadialGradient(m,m,0, m,m,m);
    for(const [k, col] of stops) gr.addColorStop(k, col);
    g.fillStyle = gr; g.fillRect(0,0,size,size);
    return new THREE.CanvasTexture(c);
  }

  /* hidden decoding video (war room #bgVid) */
  const bgVid = document.createElement('video');
  bgVid.src = encodeURI(BACKDROP.loop);
  bgVid.autoplay = bgVid.muted = bgVid.loop = true; bgVid.playsInline = true;
  bgVid.style.cssText = 'position:fixed;left:0;top:0;width:2px;height:2px;opacity:0.01;pointer-events:none;';
  document.body.appendChild(bgVid);
  const kick = ()=>{ bgVid.play().catch(()=>{}); };
  kick();
  document.addEventListener('visibilitychange', kick);
  window.addEventListener('pointerdown', kick, { once:true });

  const envWorld = new THREE.Group();
  scene.add(envWorld);

  /* painted fallback so the wall is never blank (hidden tabs, first frames):
     a quick match of the video's look - teal night, stars, aurora, ridge */
  const fb = document.createElement('canvas'); fb.width = 1024; fb.height = 576;
  { const g = fb.getContext('2d');
    const skyG = g.createLinearGradient(0, 0, 0, 576);
    skyG.addColorStop(0,'#071620'); skyG.addColorStop(0.55,'#0d2733');
    skyG.addColorStop(0.78,'#1a3c46'); skyG.addColorStop(1,'#0a1c24');
    g.fillStyle = skyG; g.fillRect(0, 0, 1024, 576);
    for(let i=0;i<420;i++){
      const y = Math.pow(Math.random(), 1.4)*400, x = Math.random()*1024;
      g.fillStyle = 'rgba(235,244,250,' + (0.1 + Math.random()*0.5*(1 - y/430)).toFixed(2) + ')';
      g.beginPath(); g.arc(x, y, Math.random()*1.2 + 0.2, 0, TAU); g.fill();
    }
    const au = g.createLinearGradient(0, 320, 0, 430);   // aurora band
    au.addColorStop(0,'rgba(80,200,120,0)'); au.addColorStop(0.5,'rgba(110,230,140,.22)');
    au.addColorStop(1,'rgba(80,200,120,0)');
    g.fillStyle = au; g.fillRect(0, 320, 1024, 110);
    g.fillStyle = '#122430';                              // far ridge
    g.beginPath(); g.moveTo(0, 460);
    for(let x=0;x<=1024;x+=16)
      g.lineTo(x, 430 + Math.sin(x*0.008)*18 + Math.sin(x*0.021)*9);
    g.lineTo(1024, 576); g.lineTo(0, 576); g.closePath(); g.fill();
    g.fillStyle = '#0a161d';                              // treeline
    g.beginPath(); g.moveTo(0, 576);
    for(let x=0;x<=1024;x+=8){
      const h = 486 + Math.sin(x*0.05)*10 + Math.sin(x*0.013)*16;
      g.lineTo(x, h - (Math.floor(x/8)%3===0 ? 22 : 0));
    }
    g.lineTo(1024, 576); g.closePath(); g.fill();
  }
  /* the wall DISSOLVES at its bottom and sides (alpha fade) so it never shows
     a movie-screen edge - it hands off to the valley fog below; the side fades
     also cross-blend adjacent duplicates in the ring */
  const fadeC = document.createElement('canvas'); fadeC.width = 256; fadeC.height = 256;
  { const g = fadeC.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256);
    /* long bottom dissolve through the video's dark forest floor — the footage
       melts into the dark + mist below, never a hard cut */
    const bot = g.createLinearGradient(0, 256*0.8, 0, 256);
    bot.addColorStop(0,'rgba(0,0,0,0)'); bot.addColorStop(0.5,'rgba(0,0,0,.6)'); bot.addColorStop(1,'rgba(0,0,0,1)');
    g.fillStyle = bot; g.fillRect(0, 256*0.8, 256, 256*0.2);
    for(const [x0, x1, a0, a1] of [[0, 22, 1, 0], [234, 256, 0, 1]]){
      const gr = g.createLinearGradient(x0, 0, x1, 0);
      gr.addColorStop(0, 'rgba(0,0,0,' + a0 + ')'); gr.addColorStop(1, 'rgba(0,0,0,' + a1 + ')');
      g.fillStyle = gr; g.fillRect(x0, 0, x1 - x0, 256);
    }
  }
  const wallMat = new THREE.MeshBasicMaterial({ map:new THREE.CanvasTexture(fb),
    alphaMap:new THREE.CanvasTexture(fadeC), transparent:true,
    color:0xd4d8dc, fog:false, depthWrite:false });
  /* the ring of duplicates (Reggie: "make duplicates of the video that rotate
     around"): 8 walls, each covering ~50° at 45° spacing — edges overlap inside
     the side-fade zones so the wrap reads seamless */
  /* pulled WAY up (Reggie): the video's treeline (~84% down) rides the stadium
     lip (~y+32), the sky fills the view to ~26°+ elevation so the painted dome
     arc never shows at normal orbits. The tall panels stretch the night sky
     vertically (~1.6×) — invisible on painterly stars/aurora. */
  const wallGrp = new THREE.Group();
  const WALL_N = 8, WALL_R = 560, WALL_W = 520, WALL_HGT = 480, WALL_Y = 178;
  for(let i=0;i<WALL_N;i++){
    const w = new THREE.Mesh(new THREE.PlaneGeometry(WALL_W, WALL_HGT), wallMat);
    const th = i/WALL_N*TAU;
    w.position.set(Math.sin(th)*WALL_R, WALL_Y, Math.cos(th)*WALL_R);
    w.lookAt(0, WALL_Y, 0);
    w.renderOrder = -10;
    wallGrp.add(w);
  }
  envWorld.add(wallGrp);
  /* swap the painted fallback for the live video only once frames are
     actually flowing - a loaded-but-never-played video uploads BLACK */
  { let hooked = false, vTex = null;
    /* Map only BACKDROP.frameFrom..frameTo of the footage onto the wall, so a clip
       that frames its horizon differently still lands its glow band where the ring
       geometry expects one. ClampToEdge (not Repeat) matters: with the default wrap
       a cropped texture tiles, and you'd get a second horizon stacked above the
       real one. */
    const frameIt = (t)=>{
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.offset.y = BACKDROP.frameFrom;
      t.repeat.y = Math.max(0.02, BACKDROP.frameTo - BACKDROP.frameFrom);
      t.needsUpdate = true;
    };
    const hookVideo = ()=>{
      if(hooked || bgVid.currentTime <= 0.03) return;
      hooked = true;
      vTex = new THREE.VideoTexture(bgVid);
      vTex.minFilter = vTex.magFilter = THREE.LinearFilter;
      frameIt(vTex);
      wallMat.map = vTex; wallMat.needsUpdate = true;
      bgVid.removeEventListener('timeupdate', hookVideo);
    };
    bgVid.addEventListener('timeupdate', hookVideo);
    /* Live dial. I can't see the render; Reggie can. Re-frame the horizon without a
       reload:  __backdrop(0.38, 1)  → show the top 62% of the clip.
                __backdrop()         → report where it is now. */
    refs.setBackdropFrame = (from, to)=>{
      if(from != null) BACKDROP.frameFrom = Math.max(0, Math.min(0.95, from));
      if(to != null) BACKDROP.frameTo = Math.max(BACKDROP.frameFrom + 0.02, Math.min(1, to));
      if(vTex) frameIt(vTex);
      return { from: BACKDROP.frameFrom, to: BACKDROP.frameTo };
    };
  }
  /* FULL night-sphere so there is NEVER an uncovered direction: stars in the
     top half, then it goes near-black BELOW the horizon (v>0.5) so looking down
     or out past the video walls finds only dark night + mist, never a coloured
     plane. (Horizon = v 0.5 on a full sphere.) */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(880, 48, 32),
    new THREE.MeshBasicMaterial({ map: canvasTex(1024,1024,(g,w,h)=>{
      const grd = g.createLinearGradient(0,0,0,h);
      grd.addColorStop(0,'#050e16'); grd.addColorStop(0.34,'#071620');
      grd.addColorStop(0.47,'#050b10'); grd.addColorStop(0.5,'#03070a');
      grd.addColorStop(0.7,'#03070a'); grd.addColorStop(1,'#020406');
      g.fillStyle = grd; g.fillRect(0,0,w,h);
      for(let i=0;i<720;i++){
        const y = Math.pow(Math.random(), 1.5)*h*0.44, x = Math.random()*w;   // stars top half only
        g.fillStyle = 'rgba(235,244,250,' + (0.12 + Math.random()*0.5).toFixed(2) + ')';
        g.beginPath(); g.arc(x, y, Math.random()*1.4 + 0.2, 0, TAU); g.fill();
      }
    }), side:THREE.BackSide, fog:false, depthWrite:false })
  );
  sky.userData.base = -Math.PI/2 + 0.38;
  sky.rotation.y = sky.userData.base;
  sky.renderOrder = -20;
  scene.add(sky);
  FX.sky = sky;

  /* ---- the cliff the stadium stands on: BLOCKY columnar rock - big flat
     buttress faces and stacked ledges - skinned with the artist's
     mossy-rock painting (BACKDROP.rockSkin). Verbatim war room build,
     dimensions ×20 so the summit holds the whole stadium + entrance. ---- */
  const CH = 300, topR = 152, botR = 88, SECT = 12;   // wider platform hides the under-side more
  const hash1 = q => { const s = Math.sin(q*127.1)*43758.5453; return s - Math.floor(s); };
  const cliffGeo = new THREE.CylinderGeometry(topR, botR, CH, SECT, 9, false).toNonIndexed();
  { const p = cliffGeo.attributes.position, v = new THREE.Vector3();
    for(let i=0;i<p.count;i++){
      v.fromBufferAttribute(p, i);
      const ang = Math.atan2(v.z, v.x), yn = (v.y + CH/2)/CH;   // 0 bottom .. 1 top
      const rad = Math.hypot(v.x, v.z);
      if(rad > 0.01 && yn < 0.97){
        /* quantized: whole columns and whole ledge-bands shift together,
           so the silhouette breaks into flat rock faces, not ripples */
        const col = Math.floor(((ang + TAU)%TAU)/(TAU/SECT));
        const band = Math.floor(yn*6);
        const push = (hash1(col*13.7) - 0.35)*34
                   + (hash1(col*7.3 + band*29.1) - 0.4)*24*(1 - yn*0.5);
        v.x += Math.cos(ang)*push; v.z += Math.sin(ang)*push;
        v.y += (hash1(col*3.1 + band*11.7) - 0.5)*22*(1 - yn*0.7);
      }
      p.setXYZ(i, v.x, v.y, v.z);
    }
  }
  cliffGeo.computeVertexNormals();
  /* THE ROCK SKIN: one painting drives every rock face; mirrored repeat makes
     the tiling seamless, each surface samples a different patch */
  const rockSample = (src, rx, ry, ox, oy, rot)=>{
    const t = new THREE.TextureLoader().load(encodeURI(src));
    t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
    t.repeat.set(rx, ry);
    t.offset.set(ox, oy);
    t.center.set(0.5, 0.5);
    t.rotation = rot;
    t.anisotropy = 4;
    return t;
  };
  const rockSkinMat = (tex, tint)=> new THREE.MeshStandardMaterial({
    map:tex, color:tint,                              // tint compensates for the warm stadium lights
    emissive:0xffffff, emissiveMap:tex, emissiveIntensity:0.24,
    roughness:1, metalness:0, flatShading:true });
  /* side repeat must be EVEN so the mirrored tiling meets itself on the wrap */
  const cliffMat = rockSkinMat(rockSample(BACKDROP.rockSide, 4, 1.15, 0, 0.06, 0), 0x9aa0ac);
  const topMat = rockSkinMat(rockSample(BACKDROP.rockTop, 2.7, 2.7, 0.18, 0.3, 0.9), 0x777d8a);
  const envFx = { cliffMats:[cliffMat, topMat], mist:[], lights:[] };
  FX.envFx = envFx;
  const cliff = new THREE.Mesh(cliffGeo, [cliffMat, topMat, cliffMat]);
  cliff.position.y = -0.12 - CH/2;                 // summit meets the stadium's base
  envWorld.add(cliff);

  /* ---- THE UNDER-WORLD: looking down must never find black. Layered valley
     fog below the summit (some banks catching the aurora), a fog floor far
     beneath, and a few warm camp lights deep in the mist. ---- */
  const mistT = texRadialT(256,[[0,'rgba(150,172,184,.5)'],[0.55,'rgba(128,152,166,.2)'],[1,'rgba(128,152,166,0)']]);
  const auraT = texRadialT(256,[[0,'rgba(122,196,150,.34)'],[0.55,'rgba(100,170,132,.13)'],[1,'rgba(100,170,132,0)']]);
  /* near mist hugging the cliff, layered right under the video sky's bottom */
  for(let i=0;i<14;i++){
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map:mistT, transparent:true,
      opacity:rand(0.14,0.34), depthWrite:false, fog:false }));
    m.scale.set(rand(160,300), rand(70,140), 1);
    const th = rand(0,TAU), r = rand(90,180);
    m.position.set(Math.cos(th)*r, rand(-170,-30), Math.sin(th)*r);
    envWorld.add(m);
    envFx.mist.push({ s:m, bx:m.position.x, sp:rand(0.03,0.08), ph:rand(0,TAU), amp:rand(8,22) });
  }
  /* big valley banks filling the depth below */
  for(let i=0;i<18;i++){
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map:(i%3 ? mistT : auraT),
      transparent:true, opacity:rand(0.1,0.26), depthWrite:false, fog:false }));
    m.scale.set(rand(440,900), rand(140,280), 1);
    m.position.set(rand(-460,460), rand(-430,-110), rand(-460,460));
    envWorld.add(m);
    envFx.mist.push({ s:m, bx:m.position.x, sp:rand(0.02,0.06), ph:rand(0,TAU), amp:rand(24,60) });
  }
  /* rim mist coalescing INTO the video's bottom dissolve — a ring of banks
     hugging the wall base so the footage melts into fog, never a hard line */
  for(let i=0;i<18;i++){
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map:mistT,
      transparent:true, opacity:rand(0.12,0.26), depthWrite:false, fog:false }));
    m.scale.set(rand(320,560), rand(90,170), 1);
    const th = rand(0,TAU), r = rand(320,480);
    m.position.set(Math.cos(th)*r, rand(-95,5), Math.sin(th)*r);
    envWorld.add(m);
    envFx.mist.push({ s:m, bx:m.position.x, sp:rand(0.02,0.05), ph:rand(0,TAU), amp:rand(16,40) });
  }
  /* (the big fog-floor plane is GONE — it was the teal "green blob" wrapping the
     stadium; the full near-black dome now fills every downward direction, and
     the mist banks below give the sense of depth) */
  const fogFloor = null;
  /* camp lights deep in the valley: tiny warm glimmers that say
     "there is a world down there" */
  const fireT = texRadialT(64,[[0,'rgba(255,198,122,1)'],[0.3,'rgba(255,152,72,.5)'],[1,'rgba(255,140,60,0)']]);
  [[-320,-380,-160],[180,-350,-280],[460,-410,40],[-140,-430,180],[600,-370,-360]].forEach((pp, i)=>{
    const l = new THREE.Sprite(new THREE.SpriteMaterial({ map:fireT, transparent:true,
      opacity:0.45, depthWrite:false, fog:false, blending:THREE.AdditiveBlending }));
    l.scale.set(46, 46, 1);
    l.position.set(pp[0], pp[1], pp[2]);
    envWorld.add(l);
    envFx.lights.push({ s:l, ph:i*2.1 });
  });

  /* ---- cool moonlight so the rock reads as night stone under the stars ---- */
  envWorld.add(new THREE.HemisphereLight(0x93a4b8, 0x1a1714, 0.42));
  const moon = new THREE.DirectionalLight(0xa8bde0, 0.5);
  moon.position.set(-380, 260, 200);
  envWorld.add(moon);

  refs.env = { sky, walls: wallGrp, cliff };

  /* light towers + roofline banks (piece: towers / roofLights) */
  const glowWarm = canvasTex(128,128,(g,w,h)=>{
    const grd = g.createRadialGradient(w/2,h/2,2, w/2,h/2,w/2);
    grd.addColorStop(0,'rgba(255,244,214,.95)');
    grd.addColorStop(0.3,'rgba(255,225,160,.4)');
    grd.addColorStop(1,'rgba(255,225,160,0)');
    g.fillStyle=grd; g.fillRect(0,0,w,h);
  });
  const towerGlows = new THREE.Group();
  scene.add(towerGlows);
  refs.towerGlows = towerGlows;
  for(const th of [Math.PI*0.75, Math.PI*1.25, Math.PI*0.38, Math.PI*0.62]){
    const o = outerAt(th,null), d = ringDir(th);
    const x = o.x+d.x*14, z = o.z+d.z*14, hTop = o.y+15;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.3,hTop,8), matColumn);
    pole.position.set(x, hTop/2, z); scene.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(2.6,1.1,0.5), matColumn);
    head.position.set(x, hTop, z); head.lookAt(0, hTop, 0); scene.add(head);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map:glowWarm, transparent:true, blending:THREE.AdditiveBlending, depthWrite:false }));
    glow.scale.set(9,4.5,1);
    glow.position.set(x, hTop+0.4, z);
    towerGlows.add(glow);
  }
  /* sprites, not Points: gl_PointSize ignores parent scale, which blows the
     lamps up to full size on the desk miniature */
  const roofLights = new THREE.Group();
  scene.add(roofLights);
  refs.roofLights = roofLights;
  {
    const spots = [];
    for(let i=0;i<15;i++){
      const r = roofInner(-0.7 + 1.4*i/14);
      spots.push([r.x, 37.2, r.z]);
    }
    for(let i=0;i<6;i++) spots.push([-7.5+3*i, 32.5, 96.4]);
    const lampMat = new THREE.SpriteMaterial({ map:glowWarm, transparent:true,
      color:0xffeecb, blending:THREE.AdditiveBlending, depthWrite:false });
    for(const [x,y,z] of spots){
      const s = new THREE.Sprite(lampMat);
      s.scale.set(3.2, 2.2, 1);
      s.position.set(x, y, z);
      roofLights.add(s);
    }
  }
  /* bowl glow (piece: run) — the pitch lit from within, reads at desk scale */
  const bowlGlow = new THREE.Sprite(new THREE.SpriteMaterial({
    map:glowWarm, transparent:true, color:0x9db8f0,
    blending:THREE.AdditiveBlending, depthWrite:false, opacity:0.22 }));
  bowlGlow.scale.set(56, 20, 1);
  bowlGlow.position.set(0, 12, 0);
  scene.add(bowlGlow);
  refs.bowlGlow = bowlGlow;

  goalPost(1); goalPost(-1);
  buildEntrance();
  buildSidelineClutter();
  // buildPeopleCards();  // removed — Reggie didn't like the pixel sideline people (and they bloat the frame)
  buildFlags();
  buildFlashes();
  buildAnchors();

  return refs;
}
