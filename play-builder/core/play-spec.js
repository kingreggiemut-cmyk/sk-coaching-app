// PLAY SPEC — the portable description of one play.
//
// This is what "Save play" stores and what loading a play restores. It has to be
// plain JSON (it round-trips through Supabase as a jsonb column), so it holds only
// data — never meshes, never THREE objects.
//
// Versioned from day one: `v` lets a future reader migrate an old saved play
// instead of silently mis-reading it.
import { off, getCurrentFormation, setCurrentFormation } from '../offense/offense.js';
import { getCoverage, setCoverage, getManList, setMan, clearMan,
         getManSep, setManSep, setRecSep, getRecSep, hasRecSep,
         getAlignOverrides, applyAlignOverrides, getReactList, setReact, setReactSpot, clearReact } from '../defense/defense.js';
import { getMode, setMode } from './mode.js';
import { LOS_Z } from './units.js';

export const SPEC_V = 1;

// Fields of a player that describe the PLAY (not runtime state). Anything derived
// or transient — mesh handles, live positions during a run — stays out.
const PLAYER_KEYS = ['id', 'type', 'x', 'z', 'wp', 'routeId', 'stem', 'read', 'isTarget', 'block'];

export function capture(name = '') {
  const players = off.players.map((p) => {
    const o = {};
    for (const k of PLAYER_KEYS) if (p[k] !== undefined) o[k] = p[k];
    // deep-copy the waypoint list so later edits can't mutate a saved spec
    if (Array.isArray(o.wp)) o.wp = o.wp.map((w) => ({ ...w }));
    return o;
  });

  // per-receiver separation overrides, only the ones actually set
  const sep = {};
  for (const p of off.players) if (hasRecSep(p.id)) sep[p.id] = getRecSep(p.id);

  return {
    v: SPEC_V,
    name: name || '',
    mode: getMode(),
    playType: off.playType || 'pass',
    // PROVENANCE ONLY — "this play started from Trips Right". The positions above
    // are the play's own. A play must never read its alignment back through a
    // formation, or editing that formation would silently rewrite every play
    // built on it. id is null for the built-ins, which have no row.
    formation: getCurrentFormation(),
    players,
    defense: {
      coverage: getCoverage(),
      man: getManList().map((a) => ({ defId: a.defId, recId: a.recId })),
      manSep: getManSep(),
      sepByRec: sep,
      // defenders you dragged off their default alignment, and the jobs you gave them
      aligns: getAlignOverrides(),
      react: getReactList().map((r) => ({ defId: r.defId, recId: r.recId, spot: r.spot || null })),
    },
  };
}

// Restore a spec into the live app. Returns true on success. Deliberately
// defensive: a malformed/older spec should degrade, never throw into the UI.
export function apply(spec) {
  if (!spec || !Array.isArray(spec.players) || !spec.players.length) return false;
  try {
    if (spec.mode) setMode(spec.mode);
    if (spec.formation) setCurrentFormation(spec.formation);
    off.playType = spec.playType === 'run' ? 'run' : 'pass';
    off.players = spec.players.map((p) => ({ stem: 0, isTarget: false, wp: [], ...p }));
    off.idc = off.players.reduce((m, p) => Math.max(m, (+String(p.id).replace(/\D/g, '') || 0)), 0) + 1;
    off.selId = null;

    const d = spec.defense || {};
    if (d.coverage) setCoverage(d.coverage);
    if (d.manSep != null) setManSep(d.manSep);
    // clear existing man assignments before applying the saved ones
    getManList().forEach((a) => clearMan(a.defId));
    (d.man || []).forEach((a) => { if (a.defId && a.recId) setMan(a.defId, a.recId); });
    Object.entries(d.sepByRec || {}).forEach(([rec, v]) => setRecSep(rec, v));
    applyAlignOverrides(d.aligns || {});           // resets to default, then re-applies
    getReactList().forEach((r) => clearReact(r.defId));
    (d.react || []).forEach((r) => {
      if (!r.defId) return;
      // UNITS TRAP: getReactList() hands back spot.z LOS-RELATIVE, but setReactSpot()
      // expects WORLD z and subtracts LOS_Z itself. Passing it straight back through
      // would subtract twice and fling the defender downfield every save/load.
      if (r.spot) setReactSpot(r.defId, r.spot.x, r.spot.z + LOS_Z);
      else if (r.recId) setReact(r.defId, r.recId);
    });
    return true;
  } catch (e) {
    console.error('[play-spec] apply failed', e);
    return false;
  }
}

// A play is worth saving only if someone actually drew something.
export function hasRoutes() {
  return off.players.some((p) => p.routeId || (Array.isArray(p.wp) && p.wp.length));
}
