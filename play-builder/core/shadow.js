// A soft round contact shadow — the same "lift it off the grass" trick used on
// the routes, for the player markers (offense rings + defense X's) so they read
// as 3D objects sitting on the field instead of decals painted into it.
let _tex = null;
function shadowTexture() {
  if (_tex) return _tex;
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 3, 64, 64, 62);
  grd.addColorStop(0, 'rgba(0,0,0,0.5)');
  grd.addColorStop(0.5, 'rgba(0,0,0,0.26)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  _tex = new THREE.CanvasTexture(c); _tex.anisotropy = 4; return _tex;
}
export function makeGroundShadow(radius = 1.4, opacity = 0.85) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, opacity, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; m.renderOrder = 0;
  return m;
}
