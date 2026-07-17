// The route library — pre-drawn routes you place from the tray instead of
// hand-drawing. Evolved from play-builder.html's ROUTE_LIB, upgraded to REAL
// YARDS and relative-to-the-player offsets (dx across, dz downfield), so a
// placed route travels with its player and depths land on true yard lines.
//
// Every route auto-mirrors: `out` = toward the near sideline, `mid` = toward
// the middle of the field, decided by which side of the ball the player is on.

// gen(player) -> { wp:[{dx,dz}...], rounded }
const R = (wp, rounded = false) => ({ wp, rounded });

function dirs(p) {
  const out = p.x >= 0 ? 1 : -1;     // toward the near sideline
  return { out, mid: -out };
}

export const ROUTES = [
  // ---- quick game ----
  { id: 'hitch',    label: 'Hitch',      cat: 'Quick', gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 6 }, { dx: mid * 0.7, dz: 5 }]); } },
  { id: 'slant',    label: 'Slant',      cat: 'Quick', gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 3 }, { dx: mid * 10, dz: 10 }]); } },
  { id: 'shallow',  label: 'Drag',       cat: 'Quick', gen: (p) => { const { mid } = dirs(p); return R([{ dx: mid * 4, dz: 4.5 }, { dx: mid * 22, dz: 5.5 }], true); } },
  { id: 'flat',     label: 'Flat',       cat: 'Quick', gen: (p) => { const { out } = dirs(p); return R([{ dx: out * 8, dz: 2 }], true); } },
  { id: 'bubble',   label: 'Bubble',     cat: 'Quick', gen: (p) => { const { out } = dirs(p); return R([{ dx: out * 5, dz: -2 }, { dx: out * 9, dz: -0.5 }], true); } },
  // whip: sell inside, then whip back out to the flat (~5 yд)
  { id: 'whip',     label: 'Whip',       cat: 'Quick', gen: (p) => { const { out, mid } = dirs(p); return R([{ dx: mid * 3, dz: 4 }, { dx: out * 9, dz: 5 }], true); } },
  // return: sell outside, then cut back in (~5 yд) — the mirror of a whip
  { id: 'return',   label: 'Return',     cat: 'Quick', gen: (p) => { const { out, mid } = dirs(p); return R([{ dx: out * 3, dz: 4 }, { dx: mid * 9, dz: 5 }], true); } },

  // ---- intermediate ----
  { id: 'out',      label: 'Out',        cat: 'Mid',   gen: (p) => { const { out } = dirs(p); return R([{ dx: 0, dz: 10 }, { dx: out * 9, dz: 10 }]); } },
  { id: 'dig',      label: 'Dig',        cat: 'Mid',   gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 12 }, { dx: mid * 12, dz: 12 }]); } },
  { id: 'curl',     label: 'Curl',       cat: 'Mid',   gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 12 }, { dx: mid * 1.4, dz: 10.5 }]); } },
  // post-sit: up 12, break 3 yд to the post, then sit down (curl back ~1 yд)
  { id: 'postsit',  label: 'Post Sit',   cat: 'Mid',   gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 12 }, { dx: mid * 3, dz: 15 }, { dx: mid * 3.2, dz: 14 }], true); } },
  // comeback: outside release, up to ~15, break back down + out toward the sideline
  { id: 'comeback', label: 'Comeback',   cat: 'Mid',   gen: (p) => { const { out } = dirs(p); return R([{ dx: out * 1.5, dz: 15 }, { dx: out * 4, dz: 13 }], true); } },
  { id: 'deepcross',label: 'Deep Cross', cat: 'Mid',   gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 6 }, { dx: mid * 16, dz: 14 }, { dx: mid * 24, dz: 16 }]); } },

  // ---- deep ----
  { id: 'go',       label: 'Go',         cat: 'Deep',  gen: () => R([{ dx: 0, dz: 32 }]) },
  { id: 'seam',     label: 'Seam',       cat: 'Deep',  gen: (p) => { const { mid } = dirs(p); return R([{ dx: mid * 2.5, dz: 12 }, { dx: mid * 2.5, dz: 32 }]); } },
  { id: 'post',     label: 'Post',       cat: 'Deep',  gen: (p) => { const { mid } = dirs(p); return R([{ dx: 0, dz: 12 }, { dx: mid * 8, dz: 21 }]); } },
  { id: 'corner',   label: 'Corner',     cat: 'Deep',  gen: (p) => { const { out } = dirs(p); return R([{ dx: 0, dz: 12 }, { dx: out * 7, dz: 20 }]); } },
  { id: 'postcorner', label: 'Post-Corner', cat: 'Deep', gen: (p) => { const { out, mid } = dirs(p); return R([{ dx: 0, dz: 10 }, { dx: mid * 3, dz: 13 }, { dx: out * 7, dz: 19 }]); } },
  { id: 'wheel',    label: 'Wheel',      cat: 'Deep',  gen: (p) => { const { out } = dirs(p); return R([{ dx: out * 8, dz: 0.5 }, { dx: out * 10.5, dz: 3 }, { dx: out * 10.5, dz: 24 }], true); } },

  // ---- backfield ----
  { id: 'swing',    label: 'Swing',      cat: 'Back',  gen: (p) => { const { out } = dirs(p); return R([{ dx: out * 5, dz: -1.5 }, { dx: out * 9, dz: 0.5 }], true); } },
  { id: 'angle',    label: 'Angle',      cat: 'Back',  gen: (p) => { const { out, mid } = dirs(p); return R([{ dx: out * 3.5, dz: 1.5 }, { dx: mid * 5, dz: 7 }]); } },
  { id: 'check',    label: 'Check Rel',  cat: 'Back',  gen: (p) => { const { out } = dirs(p); return R([{ dx: out * 6, dz: 3.5 }], true); } },
];

export function getRoute(id) {
  return ROUTES.find((r) => r.id === id) || null;
}

// A tiny SVG preview of the route shape for the tray cards.
export function routeSVG(route, color = '#4cc56a') {
  const fake = { x: 10 };                 // preview drawn as a right-side player
  const { wp } = route.gen(fake);
  const pts = [{ dx: 0, dz: 0 }, ...wp];
  const xs = pts.map((p) => p.dx), zs = pts.map((p) => p.dz);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minZ = Math.min(...zs), maxZ = Math.max(...zs);
  const spanX = Math.max(6, maxX - minX), spanZ = Math.max(6, maxZ - minZ);
  const s = 30 / Math.max(spanX, spanZ);
  const px = (p) => (4 + (p.dx - minX) * s + (34 - spanX * s) / 2).toFixed(1);
  const py = (p) => (38 - ((p.dz - minZ) * s + (34 - spanZ * s) / 2)).toFixed(1);
  const d = 'M' + pts.map((p) => `${px(p)},${py(p)}`).join(' L');
  const last = pts[pts.length - 1];
  return `<svg viewBox="0 0 42 42" width="42" height="42">
    <path d="${d}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${px(pts[0])}" cy="${py(pts[0])}" r="3" fill="${color}"/>
  </svg>`;
}
