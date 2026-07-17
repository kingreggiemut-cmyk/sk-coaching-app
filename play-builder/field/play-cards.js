// Presenter play cards — the play-call + formation art that stands in the green
// zone during a TikTok breakdown, each with its "USE THIS" banner arrow-pointing
// down at it. The cards STAND UP and yaw-billboard to face the camera.
//
// The art PNGs carry transparent padding (esp. the "USE THIS" banners, which are
// small graphics inside a big 9:16 canvas), so every plane is ALPHA-TRIMMED to its
// opaque bounds first — otherwise sizing shrinks the real artwork to nothing.
// Both cards use cardH and both banners use bannerH, so the two banners always
// sit at the SAME level. Art lives in the shared "Oregon Assets" folder.
//
// DIAL LIVE via the GROUPS table (field position + heights) + reload. Yards:
// midfield z=0, attacking goal (Jumbotron end) z=+50, x=0 = field center.

const ASSETS = '/Oregon Assets/';

const GROUPS = [
  { key: 'formation', card: 'Wing Trio WK Formation.png', banner: 'Use this formation.png',
    x: -14.5, y: 8, z: 30, cardH: 13, bannerH: 6, overlap: 0.15 },
  { key: 'play',      card: 'PA Y Flood Play.jpg',        banner: 'Use this play.png',
    x:  14.5, y: 8, z: 30, cardH: 13, bannerH: 6, overlap: 0.15 },
];

function loadImg(src) {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('play-card art failed to load: ' + src));
    i.src = encodeURI(src);
  });
}

// crop an image to its opaque bounds (no-op for fully-opaque JPGs)
function trimToOpaque(img) {
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
  const cg = c.getContext('2d'); cg.drawImage(img, 0, 0);
  let d;
  try { d = cg.getImageData(0, 0, c.width, c.height).data; } catch (e) { return c; }
  let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (d[(y * c.width + x) * 4 + 3] > 16) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  }
  if (maxX < 0) return c;
  const w = maxX - minX + 1, h = maxY - minY + 1;
  const oc = document.createElement('canvas'); oc.width = w; oc.height = h;
  oc.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, w, h);
  return oc;
}

// sized by target HEIGHT (width follows the TRIMMED aspect) so cards/banners align
function makePlane(img, h, renderer) {
  const canvas = trimToOpaque(img);
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const w = h * (canvas.width / canvas.height);
  const mat = new THREE.MeshBasicMaterial({
    map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, alphaTest: 0.02,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.userData.w = w; m.userData.h = h;
  return m;
}

export async function buildPlayCards(scene, renderer) {
  const groups = [];
  for (const spec of GROUPS) {
    const [cardImg, bannerImg] = await Promise.all([
      loadImg(ASSETS + spec.card),
      loadImg(ASSETS + spec.banner),
    ]);
    const g = new THREE.Group();
    g.position.set(spec.x, spec.y, spec.z);
    const card = makePlane(cardImg, spec.cardH, renderer);
    const banner = makePlane(bannerImg, spec.bannerH, renderer);
    // banner rides above the card; shared cardH/bannerH → both banners at the SAME y
    banner.position.set(0, spec.cardH / 2 + spec.bannerH * (0.5 - spec.overlap), 0.05);
    g.add(card); g.add(banner);
    g.userData.key = spec.key;
    scene.add(g);
    groups.push(g);
  }

  return {
    groups,
    // FULL billboard — each card faces the camera in yaw AND pitch, so it stands
    // up when the camera is low (breakdown view) and lays flat on the field when
    // the camera is overhead (view 6), transitioning smoothly in between.
    update(camera) {
      for (const g of groups) g.lookAt(camera.position);
    },
    setVisible(v) { for (const g of groups) g.visible = !!v; },
  };
}
