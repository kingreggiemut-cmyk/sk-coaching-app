/* ============================================================
   Daily Board: the Sports tab. Desk only, loaded after the app.

   Everything here is read fresh from ESPN's public scoreboard
   feeds, straight from the browser. Nothing is synced: what is
   kept (a trimmed copy so the page paints at once, and the games
   he starred) lives in this browser only.

   One small store drives it. A screen asks for what it shows with
   need(key, maxAge, loader); it gets whatever is on hand at once
   and the page repaints when something newer lands.
   ============================================================ */
(function () {
  'use strict';
  const SITE = 'https://site.api.espn.com/apis/site/v2/sports';
  const SITE2 = 'https://site.api.espn.com/apis/v2/sports';
  const CORE = 'https://sports.core.api.espn.com/v2/sports';
  const LG = {
    nfl: { path: 'football/nfl', name: 'NFL', by: 'week' },
    nhl: { path: 'hockey/nhl', name: 'NHL', by: 'day' },
    mlb: { path: 'baseball/mlb', name: 'MLB', by: 'day' },
    nba: { path: 'basketball/nba', name: 'NBA', by: 'day' },
    cfb: { path: 'football/college-football', name: 'College', by: 'week' }
  };
  const TEAMS = [
    { key: 'seahawks', lg: 'nfl', id: '26', nick: 'Seahawks', c1: '#002a5c', c2: '#69be28' },
    { key: 'leafs', lg: 'nhl', id: '21', nick: 'Maple Leafs', short: 'Leafs', c1: '#00205b', c2: '#ffffff' },
    { key: 'jays', lg: 'mlb', id: '14', nick: 'Blue Jays', short: 'Jays', c1: '#134a8e', c2: '#e8291c' },
    { key: 'raptors', lg: 'nba', id: '28', nick: 'Raptors', c1: '#ce1141', c2: '#17130e' },
    { key: 'sixers', lg: 'nba', id: '20', nick: '76ers', short: 'Sixers', c1: '#1d428a', c2: '#ed174c' },
    { key: 'bama', lg: 'cfb', id: '333', nick: 'Alabama', c1: '#9e1b32', c2: '#ffffff' },
    { key: 'usc', lg: 'cfb', id: '30', nick: 'USC', c1: '#990000', c2: '#ffc72c' }
  ];
  /* What "leading the team" means in each sport, by the feed's own category names. */
  const LEAD = {
    nfl: ['Passing Leader', 'Rushing Leader', 'Receiving Leader', 'Tackles', 'Sacks', 'Interceptions'],
    cfb: ['Passing Leader', 'Rushing Leader', 'Receiving Leader', 'Tackles', 'Sacks', 'Interceptions'],
    nhl: ['Points', 'Goals', 'Assists', 'Plus/Minus Rating', 'Goals Against Average', 'Save Percentage'],
    nba: ['Points Per Game', 'Rebounds Per Game', 'Assists Per Game', 'Steals Per Game', 'Blocks Per Game', 'Field Goal Percentage'],
    mlb: ['Batting Average', 'Home Runs', 'Runs Batted In', 'On-Base-Plus-Slugging', 'Stolen Bases', 'Earned Run Average', 'Wins', 'Strikeouts', 'Saves']
  };
  const LEAD_SHORT = { 'Passing Leader': 'Passing', 'Rushing Leader': 'Rushing', 'Receiving Leader': 'Receiving', 'Plus/Minus Rating': 'Plus / minus', 'Goals Against Average': 'Goals against avg', 'Save Percentage': 'Save pct', 'Points Per Game': 'Points a game', 'Rebounds Per Game': 'Rebounds a game', 'Assists Per Game': 'Assists a game', 'Steals Per Game': 'Steals a game', 'Blocks Per Game': 'Blocks a game', 'Field Goal Percentage': 'Field goal pct', 'Runs Batted In': 'RBI', 'On-Base-Plus-Slugging': 'OPS', 'Earned Run Average': 'ERA' };
  const STAND = {
    nfl: [['W', 'wins'], ['L', 'losses'], ['T', 'ties'], ['PF', 'pointsFor'], ['PA', 'pointsAgainst'], ['Strk', 'streak']],
    nhl: [['GP', 'gamesPlayed'], ['W', 'wins'], ['L', 'losses'], ['OTL', 'otLosses'], ['Pts', 'points'], ['Strk', 'streak']],
    nba: [['W', 'wins'], ['L', 'losses'], ['Pct', 'winPercent'], ['GB', 'gamesBehind'], ['Strk', 'streak']],
    mlb: [['W', 'wins'], ['L', 'losses'], ['Pct', 'winPercent'], ['GB', 'gamesBehind'], ['Strk', 'streak']]
  };

  const KEY = 'daily-board-sports', STAR_KEY = 'daily-board-sports-stars';
  const MIN = 60 * 1000;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MO = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const teamOf = (key) => TEAMS.find((t) => t.key === key);
  const mine = (lg, id) => TEAMS.find((t) => t.lg === lg && t.id === String(id));

  /* ---------- colour: a team colour has to stay readable on cream and on its own slab ---------- */
  const lum = (hex) => { const n = parseInt(hex.replace('#', ''), 16); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f((n >> 16) & 255) + 0.7152 * f((n >> 8) & 255) + 0.0722 * f(n & 255); };
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const shade = (hex, k) => { const n = parseInt(hex.replace('#', ''), 16); const c = (v) => pad(Math.round(v * k).toString(16)).slice(-2); return `#${c((n >> 16) & 255)}${c((n >> 8) & 255)}${c(n & 255)}`; };
  const CREAM = '#f6eedc';
  /* the marker on paper: the team's second colour, darkened until it reads; else its first */
  function markerOf(T) {
    let c = T.c2;
    if (ratio(c, '#ffffff') < 1.3) return T.c1;
    for (let i = 0; i < 12 && ratio(c, CREAM) < 4.5; i++) c = shade(c, 0.88);
    return c;
  }
  /* the accent on the team's own slab */
  const slabAccent = (T) => (ratio(T.c2, T.c1) >= 3 ? T.c2 : CREAM);
  const teamVars = (T) => `--team:${T.c1};--team2:${slabAccent(T)};--tmk:${markerOf(T)}`;

  /* ---------- the store ---------- */
  let store = {};
  try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { store = {}; }
  const live = {};                     // things never written to disk (game sheets, scoreboards)
  const pending = {}, failed = {};
  let saveT = null;
  function persist() { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch { /* full or blocked: it still works for this visit */ } }, 400); }
  function need(key, maxAge, loader, keep = true) {
    const box = keep ? store : live, hit = box[key];
    const age = hit ? Date.now() - hit.t : Infinity;
    if (age > maxAge && !pending[key] && !(failed[key] && Date.now() - failed[key] < MIN)) {
      pending[key] = loader()
        .then((v) => { box[key] = { t: Date.now(), v }; delete failed[key]; if (keep) persist(); })
        .catch(() => { failed[key] = Date.now(); })
        .finally(() => { delete pending[key]; schedulePaint(); if (window.renderDesk && document.body.classList.contains('sec-week')) window.renderDesk(); });
    }
    return hit ? hit.v : null;
  }
  const loading = (key) => !!pending[key];
  const broke = (key) => !!failed[key] && !pending[key];
  async function j(url) { const r = await fetch(url.replace(/^http:/, 'https:')); if (!r.ok) throw new Error(String(r.status)); return r.json(); }

  let stars = {};
  try { stars = JSON.parse(localStorage.getItem(STAR_KEY) || '{}') || {}; } catch { stars = {}; }
  function saveStars() { try { localStorage.setItem(STAR_KEY, JSON.stringify(stars)); } catch {} }
  function toggleStar(ev) {
    if (stars[ev.id]) delete stars[ev.id]; else stars[ev.id] = { ...ev, starredAt: Date.now() };
    saveStars();
  }
  /* a starred game drops off three days after it is played */
  (function pruneStars() { const cut = Date.now() - 3 * 24 * 60 * MIN; let ch = false; for (const id of Object.keys(stars)) if (new Date(stars[id].date).getTime() < cut) { delete stars[id]; ch = true; } if (ch) saveStars(); })();

  /* ---------- reading the feeds down to what the screens use ---------- */
  const logoOf = (lg, t) => (lg === 'cfb' ? `https://a.espncdn.com/i/teamlogos/ncaa/500/${t.id}.png` : `https://a.espncdn.com/i/teamlogos/${lg}/500/scoreboard/${String(t.ab || '').toLowerCase()}.png`);
  function trimEvent(e, lg) {
    const c = (e.competitions || [])[0] || {};
    const side = (k) => {
      const x = (c.competitors || []).find((q) => q.homeAway === k) || {}, t = x.team || {};
      const sc = x.score == null ? '' : typeof x.score === 'object' ? (x.score.displayValue ?? '') : String(x.score);
      const rec = (x.records && x.records[0] && x.records[0].summary) || (x.record && x.record[0] && x.record[0].displayValue) || '';
      const rk = x.curatedRank && x.curatedRank.current;
      return { id: String(t.id || ''), ab: t.abbreviation || '', name: t.shortDisplayName || t.displayName || t.location || '', score: sc, rec, rank: rk && rk <= 25 ? rk : 0, win: !!x.winner };
    };
    const s = (c.status || e.status || {}), ty = s.type || {};
    const o = (c.odds || [])[0];
    let spread = null;
    if (o) { if (typeof o.spread === 'number') spread = Math.abs(o.spread); else { const m = /(-?\d+(\.\d+)?)\s*$/.exec(o.details || ''); if (m) spread = Math.abs(Number(m[1])); else if (/EVEN|PK/i.test(o.details || '')) spread = 0; } }
    const tv = [];
    for (const b of c.broadcasts || []) { for (const n of b.names || []) tv.push(n); if (b.media && b.media.shortName) tv.push(b.media.shortName); }
    return {
      id: String(e.id), lg, date: e.date, state: ty.state || 'pre', detail: ty.shortDetail || ty.detail || '', home: side('home'), away: side('away'),
      tv: [...new Set(tv)].slice(0, 2), line: o && o.details ? o.details : '', ou: o && o.overUnder ? o.overUnder : null, spread,
      venue: (c.venue && c.venue.fullName) || '', st: (e.seasonType && e.seasonType.type) || (e.season && e.season.type) || 2
    };
  }
  async function loadBoard(lg, q) {
    const d = await j(`${SITE}/${LG[lg].path}/scoreboard${lg === 'cfb' ? '?groups=80&limit=200' : '?limit=200'}${q || ''}`);
    return { week: d.week ? d.week.number : null, stype: d.season ? d.season.type : null, day: d.day ? d.day.date : null, events: (d.events || []).map((e) => trimEvent(e, lg)).sort((a, b) => a.date.localeCompare(b.date)) };
  }
  async function loadTeam(T) {
    const L = LG[T.lg], base = `${SITE}/${L.path}/teams/${T.id}`;
    const [info, s1] = await Promise.all([j(base), j(`${base}/schedule`)]);
    const t = info.team || {};
    const year = (s1.season && s1.season.year) || new Date().getFullYear(), stype = (s1.season && s1.season.type) || 2;
    let raw = s1.events || [];
    if (stype !== 2) { try { const s2 = await j(`${base}/schedule?season=${year}&seasontype=2`); raw = raw.concat(s2.events || []); } catch {} }
    const seen = new Set(), events = [];
    for (const e of raw) { if (seen.has(e.id)) continue; seen.add(e.id); events.push(trimEvent(e, T.lg)); }
    events.sort((a, b) => a.date.localeCompare(b.date));
    // the roster names the men the leader feed only points at
    const names = {};
    try {
      const r = await j(`${base}/roster`);
      const all = (r.athletes || []).flatMap((g) => (g.items ? g.items : [g]));
      for (const a of all) names[String(a.id)] = { n: a.displayName || a.fullName, p: (a.position && a.position.abbreviation) || '', j: a.jersey || '' };
    } catch {}
    let leaders = [], leadYear = year;
    const core = L.path.replace('/', '/leagues/');
    const lurl = (y) => `${CORE}/${core}/seasons/${y}/types/2/teams/${T.id}/leaders`;
    let ld = null;
    try { ld = await j(lurl(year)); } catch { try { ld = await j(lurl(year - 1)); leadYear = year - 1; } catch {} }
    if (ld && ld.categories) {
      for (const want of LEAD[T.lg]) {
        const cat = ld.categories.find((c) => c.displayName === want); if (!cat || !cat.leaders || !cat.leaders.length) continue;
        const rows = [];
        for (const [i, l] of cat.leaders.slice(0, 3).entries()) {
          const ref = l.athlete && l.athlete.$ref, id = ref ? (/athletes\/(\d+)/.exec(ref) || [])[1] : null;
          let who = id && names[id];
          if (!who && i === 0 && ref) { try { const a = await j(ref); who = { n: a.displayName, p: (a.position && a.position.abbreviation) || '', j: a.jersey || '' }; } catch {} }
          if (who) rows.push({ n: who.n, p: who.p, v: l.displayValue });
        }
        if (rows.length) leaders.push({ k: LEAD_SHORT[want] || want, rows });
      }
    }
    return {
      name: t.displayName || T.nick, ab: t.abbreviation || '', rec: (t.record && t.record.items && t.record.items[0] && t.record.items[0].summary) || '', standing: t.standingSummary || '', rank: t.rank && t.rank <= 25 ? t.rank : 0,
      year, stype, events, leaders, leadYear, seasonName: (s1.season && s1.season.displayName) || String(year)
    };
  }
  async function loadInjuries(lg) {
    const d = await j(`${SITE}/${LG[lg].path}/injuries`);
    const out = {};
    for (const T of TEAMS.filter((t) => t.lg === lg)) {
      const row = (d.injuries || []).find((x) => String(x.id) === T.id);
      out[T.id] = !row ? [] : (row.injuries || []).filter((i) => i.status && i.status !== 'Active').map((i) => ({
        n: i.athlete && i.athlete.displayName, p: (i.athlete && i.athlete.position && i.athlete.position.abbreviation) || '', s: i.status,
        what: [(i.details && i.details.type) || '', (i.details && i.details.detail && i.details.detail !== 'Not Specified' ? i.details.detail : '')].filter(Boolean).join(', '),
        back: (i.details && i.details.returnDate) || '', note: i.shortComment || '', date: i.date || ''
      })).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    }
    return out;
  }
  async function loadStandings(lg) {
    const d = await j(`${SITE2}/${LG[lg].path}/standings?level=3`);
    const groups = [];
    const walk = (node) => {
      if (node.standings && node.standings.entries) {
        const rows = node.standings.entries.map((e) => {
          const st = {}; for (const s of e.stats || []) st[s.name] = s.displayValue;
          return { id: String(e.team.id), ab: e.team.abbreviation, name: e.team.shortDisplayName || e.team.displayName, st, sort: lg === 'nhl' ? Number(st.points) || 0 : Number(st.winPercent) || 0, w: Number(st.wins) || 0 };
        }).sort((a, b) => b.sort - a.sort || b.w - a.w);
        groups.push({ name: node.name.replace(/^American League /, 'AL ').replace(/^National League /, 'NL ').replace(/ Division$/, ''), rows });
      }
      for (const c of node.children || []) walk(c);
    };
    walk(d);
    return groups;
  }
  async function loadRankings() {
    const d = await j(`${SITE}/${LG.cfb.path}/rankings`);
    const ap = (d.rankings || [])[0] || { ranks: [] };
    return { name: ap.name || 'AP Top 25', rows: (ap.ranks || []).map((r) => ({ rank: r.current, prev: r.previous, id: String(r.team.id), name: r.team.location || r.team.nickname, ab: r.team.abbreviation, rec: r.recordSummary || '' })) };
  }
  async function loadGame(lg, id) {
    const d = await j(`${SITE}/${LG[lg].path}/summary?event=${id}`);
    const hc = (d.header && d.header.competitions && d.header.competitions[0]) || {};
    const side = (k) => {
      const x = (hc.competitors || []).find((q) => q.homeAway === k) || {}, t = x.team || {};
      return { id: String(t.id || ''), ab: t.abbreviation || '', name: t.displayName || t.location || '', short: t.shortDisplayName || t.name || t.abbreviation || '', color: t.color ? `#${t.color}` : '#17130e', score: x.score ?? '', rec: (x.record && x.record[0] && (x.record[0].summary || x.record[0].displayValue)) || '', rank: x.rank && x.rank <= 25 ? x.rank : 0, win: !!x.winner, lines: (x.linescores || []).map((l) => l.displayValue) };
    };
    const ty = (hc.status && hc.status.type) || {};
    const pk = (d.pickcenter || [])[0];
    const gi = d.gameInfo || {}, wx = gi.weather;
    const perTeam = (list, fn) => { const o = {}; for (const row of list || []) if (row.team) o[String(row.team.id)] = fn(row); return o; };
    return {
      id: String(id), lg, date: hc.date, state: ty.state || 'pre', detail: ty.shortDetail || ty.detail || '', home: side('home'), away: side('away'),
      tv: [...new Set((hc.broadcasts || d.broadcasts || []).map((b) => (b.media && b.media.shortName) || (b.names && b.names[0]) || '').filter(Boolean))].slice(0, 3),
      line: pk ? { text: pk.details || '', ou: pk.overUnder || null, home: pk.homeTeamOdds && pk.homeTeamOdds.moneyLine, away: pk.awayTeamOdds && pk.awayTeamOdds.moneyLine, by: (pk.provider && pk.provider.name) || '' } : null,
      proj: d.predictor && d.predictor.homeTeam && d.predictor.awayTeam ? { home: Number(d.predictor.homeTeam.gameProjection), away: Number(d.predictor.awayTeam.gameProjection) } : null,
      venue: (gi.venue && gi.venue.fullName) || '', city: gi.venue && gi.venue.address ? [gi.venue.address.city, gi.venue.address.state].filter(Boolean).join(', ') : '',
      wx: wx && wx.temperature != null ? { f: wx.temperature, rain: wx.precipitation, gust: wx.gust } : null,
      leaders: perTeam(d.leaders, (row) => (row.leaders || []).map((l) => { const a = (l.leaders || [])[0]; return a && a.athlete ? { k: l.displayName, n: a.athlete.displayName, p: (a.athlete.position && a.athlete.position.abbreviation) || '', v: a.displayValue } : null; }).filter(Boolean)),
      last5: perTeam(d.lastFiveGames, (row) => (row.events || []).map((e) => ({ r: e.gameResult, s: e.score, at: e.atVs, o: (e.opponent && e.opponent.abbreviation) || '' }))),
      inj: perTeam(d.injuries, (row) => (row.injuries || []).filter((i) => i.status && i.status !== 'Active').map((i) => ({ n: i.athlete && i.athlete.displayName, p: (i.athlete && i.athlete.position && i.athlete.position.abbreviation) || '', s: i.status, what: (i.details && i.details.type) || '' }))),
      stats: perTeam(d.boxscore && d.boxscore.teams, (row) => (row.statistics || []).map((s) => ({ k: s.label || s.name, v: s.displayValue }))),
      news: ((d.news && d.news.articles) || []).slice(0, 4).map((a) => ({ h: a.headline, d: a.description || '', u: (a.links && a.links.web && a.links.web.href) || '' })),
      series: (d.seasonseries && d.seasonseries[0] && d.seasonseries[0].summary) || ''
    };
  }

  /* ---------- what to ask for ---------- */
  const anyLive = (evs) => (evs || []).some((e) => e.state === 'in');
  const boardAge = (b) => (b && anyLive(b.events) ? 40 * 1000 : 5 * MIN);
  const getBoard = (lg, q = '') => { const k = `sb:${lg}:${q}`; return need(k, boardAge((live[k] || {}).v), () => loadBoard(lg, q), false); };
  const getTeam = (T) => need(`team:${T.key}`, 20 * MIN, () => loadTeam(T));
  const getInj = (lg) => need(`inj:${lg}`, 30 * MIN, () => loadInjuries(lg));
  const getStand = (lg) => need(`stand:${lg}`, 30 * MIN, () => loadStandings(lg));
  const getRank = () => need('rank:cfb', 60 * MIN, loadRankings);
  const getGame = (lg, id) => { const k = `g:${lg}:${id}`, hit = live[k]; return need(k, hit && hit.v.state === 'in' ? 40 * 1000 : hit && hit.v.state === 'post' ? 30 * MIN : 5 * MIN, () => loadGame(lg, id), false); };

  /* ---------- small pieces ---------- */
  const when = (iso) => new Date(iso);
  const tm = (iso) => when(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const dayShort = (iso) => { const d = when(iso), t = ymd(), k = ymd(d); if (k === t) return 'Today'; const tom = new Date(); tom.setDate(tom.getDate() + 1); if (k === ymd(tom)) return 'Tomorrow'; return `${WD[d.getDay()]} ${MO[d.getMonth()]} ${d.getDate()}`; };
  const dayOnly = (iso) => { const d = when(iso); return `${WD[d.getDay()]} ${MO[d.getMonth()]} ${d.getDate()}`; };
  function until(iso) {
    const ms = when(iso).getTime() - Date.now();
    if (ms < 0) return '';
    const h = ms / 3600000;
    if (h < 1) return `in ${Math.max(1, Math.round(ms / 60000))} min`;
    if (h < 20) return `in ${Math.round(h)} hour${Math.round(h) === 1 ? '' : 's'}`;
    const days = Math.round((new Date(ymd(when(iso)) + 'T00:00').getTime() - new Date(ymd() + 'T00:00').getTime()) / 86400000);
    return days <= 1 ? 'tomorrow' : `in ${days} days`;
  }
  const logo = (lg, t, cls = '') => `<img class="sp-lg ${cls}" src="${logoOf(lg, t)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">`;
  const TEAM_AB = { seahawks: 'sea', leafs: 'tor', jays: 'tor', raptors: 'tor', sixers: 'phi', bama: 'ala', usc: 'usc' };
  const tlogo = (T, cls = '') => logo(T.lg, { id: T.id, ab: TEAM_AB[T.key] }, cls);
  const STAR = (on) => `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.3 1.1 6.1L12 17.1 6.6 20l1.1-6.1L3.2 9.6l6.1-.8z" fill="${on ? 'var(--sky)' : 'none'}" stroke="${on ? '#17130e' : 'currentColor'}" stroke-width="1.8" stroke-linejoin="round"></path></svg>`;
  const rk = (n) => (n ? `<i class="rk">${n}</i>` : '');
  const paperWait = (txt) => `<div class="sp-wait"><span class="mk">${txt}</span></div>`;
  const evOf = {};                      // every game on screen, by id, so a click can find it
  const keep = (e) => { evOf[e.id] = e; return e; };

  /* a row for one game: who, when, where to watch, the line, a star */
  function gameRow(e, opts = {}) {
    keep(e);
    const liveNow = e.state === 'in', done = e.state === 'post';
    const left = liveNow ? `<span class="tm live"><b>Live</b>${esc(e.detail)}</span>` : done ? `<span class="tm"><b>Final</b>${opts.day ? esc(dayOnly(e.date)) : ''}</span>` : `<span class="tm"><b>${esc(tm(e.date))}</b>${opts.day === false ? '' : esc(dayShort(e.date))}</span>`;
    const tr = (t, other) => `<span class="tr${done && t.win ? ' won' : ''}${done && other.win ? ' lost' : ''}${mine(e.lg, t.id) ? ' mine' : ''}">${logo(e.lg, t)}${rk(t.rank)}<b>${esc(t.name)}</b><em>${esc(t.rec)}</em>${liveNow || done ? `<u>${esc(t.score)}</u>` : ''}</span>`;
    const ex = [e.tv[0], !done && e.line ? e.line : '', opts.why || ''].filter(Boolean);
    return `<div class="sp-g${liveNow ? ' live' : ''}" role="button" tabindex="0" data-sp="game" data-lg="${e.lg}" data-id="${e.id}" aria-label="${esc(e.away.name)} at ${esc(e.home.name)}">
      ${left}<span class="mt">${tr(e.away, e.home)}${tr(e.home, e.away)}</span>
      <span class="ex">${ex.map((x, i) => `<span${i === 2 || (opts.why && x === opts.why) ? ' class="mk"' : ''}>${esc(x)}</span>`).join('')}</span>
      <button class="sp-star${stars[e.id] ? ' on' : ''}${view.popStar === e.id ? ' pop' : ''}" data-sp="star" data-id="${e.id}" aria-label="${stars[e.id] ? 'Unpin' : 'Pin'} this game" aria-pressed="${!!stars[e.id]}">${STAR(!!stars[e.id])}</button></div>`;
  }

  /* ---------- the college week ---------- */
  const pct = (r) => { const m = /^(\d+)-(\d+)/.exec(r || ''); if (!m) return 0.5; const w = +m[1], l = +m[2]; return w + l ? w / (w + l) : 0.5; };
  /* How good an unranked game looks: a close line, two winning teams, a channel he gets. */
  function interest(e) {
    const tv = e.tv.join(' ');
    const a = pct(e.away.rec), h = pct(e.home.rec);
    let s = (a + h) * 5 + (a > 0.5 && h > 0.5 ? 3 : 0);
    if (e.spread != null) s += Math.max(0, 10 - e.spread) * 1.2;
    if (/\b(ABC|CBS|NBC|FOX)\b/i.test(tv)) s += 4; else if (/\bESPN\b(?!\+|U|2)/i.test(tv)) s += 3; else if (/ESPN2|FS1|SEC Network|BTN|ACC Network|\bCW\b|TNT|TBS/i.test(tv)) s += 1.5;
    return s;
  }
  function whyGood(e) {
    const bits = [];
    if (e.spread != null && e.spread <= 3.5) bits.push(e.spread === 0 ? 'a pick' : `${e.spread} point line`);
    if (pct(e.away.rec) > 0.5 && pct(e.home.rec) > 0.5) bits.push('both winning');
    return bits.join(', ');
  }

  /* ---------- screens ---------- */
  const view = { v: 'week', game: null, cfbQ: '', lgQ: {}, tab: 'both', fresh: true };
  let host = null, paintT = null;

  function nextFor(T, b) {
    const now = Date.now();
    const liveG = b.events.find((e) => e.state === 'in');
    if (liveG) return liveG;
    return b.events.find((e) => e.state === 'pre' && when(e.date).getTime() > now - 4 * 3600000) || null;
  }
  const lastFor = (b) => [...b.events].reverse().find((e) => e.state === 'post') || null;
  const oppOf = (T, e) => (e.home.id === T.id ? { t: e.away, at: 'vs' } : { t: e.home, at: 'at' });
  const resultOf = (T, e) => { const us = e.home.id === T.id ? e.home : e.away, them = e.home.id === T.id ? e.away : e.home; return { w: us.win, t: !us.win && !them.win, none: !us.win && !them.win && !(Number(us.score) || Number(them.score)), txt: `${us.win ? 'W' : them.win ? 'L' : 'T'} ${us.score}-${them.score}` }; };

  function ticket(T) {
    const b = getTeam(T);
    const head = (rec) => `<span class="stub">${tlogo(T, 'stk')}<b>${esc(T.short || T.nick)}</b><em>${esc(rec)}</em></span>`;
    if (!b) return `<div class="sp-tix off" style="${teamVars(T)}">${head(LG[T.lg].name)}<span class="tb">${broke(`team:${T.key}`) ? '<span class="meta">The feed did not answer. It tries again in a minute.</span>' : '<span class="mk">reading the schedule</span>'}</span></div>`;
    const e = nextFor(T, b), rec = [b.rank ? `No. ${b.rank}` : '', b.rec].filter(Boolean).join(' · ');
    if (!e) {
      const l = lastFor(b);
      return `<button class="sp-tix off" style="${teamVars(T)}" data-sp="view" data-v="team:${T.key}">${head(rec)}<span class="tb"><span class="lbl">Season over</span><b class="opp">${esc(b.standing || 'No games on the schedule')}</b>${l ? `<span class="meta">Last out: ${esc(resultOf(T, l).txt)} ${oppOf(T, l).at} ${esc(oppOf(T, l).t.ab)}</span>` : ''}<span class="mk">open the season</span></span></button>`;
    }
    keep(e);
    const o = oppOf(T, e), g = (live[`g:${T.lg}:${e.id}`] || {}).v;
    if (!g && when(e.date).getTime() - Date.now() < 8 * 24 * 3600000) getGame(T.lg, e.id);   // the line lives on the game sheet
    const lineTxt = g && g.line && g.line.text ? g.line.text : e.line;
    const us = e.home.id === T.id ? e.home : e.away, them = o.t;
    const mid = e.state === 'in' ? `<span class="lbl live">Live · ${esc(e.detail)}</span><b class="opp">${esc(us.ab)} ${esc(us.score)}, ${esc(them.ab)} ${esc(them.score)}</b>` : `<span class="lbl">${esc(dayShort(e.date))} · ${esc(tm(e.date))}${e.st === 1 ? ' · preseason' : ''}</span><b class="opp">${o.at} ${them.rank ? `<i class="rk">${them.rank}</i>` : ''}${esc(them.name)}</b>`;
    return `<button class="sp-tix${e.state === 'in' ? ' live' : ''}" style="${teamVars(T)}" data-sp="game" data-lg="${T.lg}" data-id="${e.id}" aria-label="${esc(T.nick)} ${o.at} ${esc(them.name)}, ${esc(dayShort(e.date))} ${esc(tm(e.date))}">${head(rec)}<span class="tb">${mid}<span class="meta">${[e.tv[0], lineTxt].filter(Boolean).map(esc).join(' · ') || '&nbsp;'}</span><span class="mk">${e.state === 'in' ? 'on now' : esc(until(e.date))}</span></span></button>`;
  }

  function weekScreen() {
    const b = getBoard('cfb', view.cfbQ);
    let slate;
    if (!b) slate = `<section class="pp sp-stack" style="grid-column:1/-1">${paperWait(broke(`sb:cfb:${view.cfbQ}`) ? 'The college feed did not answer. Trying again shortly.' : 'reading the college slate')}</section>`;
    else {
      const ev = b.events;
      const both = ev.filter((e) => e.home.rank && e.away.rank);
      const one = ev.filter((e) => !!e.home.rank !== !!e.away.rank);
      const rest = ev.filter((e) => !e.home.rank && !e.away.rank).map((e) => ({ e, s: interest(e) })).sort((x, y) => y.s - x.s).slice(0, 6).map((x) => x.e).sort((x, y) => x.date.localeCompare(y.date));
      const lo = ev.length ? when(ev[0].date).getTime() - 36 * 3600000 : 0, hi = ev.length ? when(ev[ev.length - 1].date).getTime() + 36 * 3600000 : 0;
      const picks = Object.values(stars).filter((s) => { const t = when(s.date).getTime(); return t >= lo && t <= hi; }).map((s) => ev.find((e) => e.id === s.id) || s).sort((x, y) => x.date.localeCompare(y.date));
      const stack = (title, note, list, opts) => `<section class="pp sp-stack"><header><h3>${title}</h3><span class="mk">${note}</span></header>${list.length ? list.map((e) => gameRow(e, typeof opts === 'function' ? opts(e) : opts)).join('') : `<div class="sp-none">None this week.</div>`}</section>`;
      slate = `${picks.length ? `<section class="pp sp-stack picks" style="grid-column:1/-1"><header><h3>Your picks</h3><span class="mk">${picks.length} pinned</span></header><div class="sp-cols">${picks.map((e) => gameRow(e)).join('')}</div></section>` : ''}
        ${stack('Ranked against ranked', both.length ? `${both.length} this week` : '', both)}
        ${stack('Top 25 in action', `${one.length} games`, one)}
        ${stack('Best of the rest', 'close lines, winning teams', rest, (e) => ({ why: whyGood(e) }))}`;
    }
    const wk = b && b.week ? `Week ${b.week}` : 'This week';
    return `<div class="sp-tixrow">${TEAMS.map((T, i) => ticket(T).replace('style="--team:', `style="--n:${i};--team:`)).join('')}</div>
      <div class="sp-bar"><h2>College football <span class="mk">${esc(wk)}</span></h2><div class="sp-step"><button class="dchip ar" data-sp="cfbwk" data-n="-1" aria-label="Week before" ${b && b.week > 1 ? '' : 'disabled'}>‹</button><button class="dchip" data-sp="cfbwk" data-n="0">This week</button><button class="dchip ar" data-sp="cfbwk" data-n="1" aria-label="Week after" ${b && b.week < 16 ? '' : 'disabled'}>›</button><button class="dchip" data-sp="view" data-v="lg:cfb">Every game and the Top 25</button></div></div>
      <div class="sp-slate">${slate}</div>`;
  }

  function teamScreen(T) {
    const b = getTeam(T);
    if (!b) return `<section class="sp-slab" style="${teamVars(T)}"><div class="who">${tlogo(T, 'stk big')}<div><h2>${esc(T.nick)}</h2><p>${broke(`team:${T.key}`) ? 'The feed did not answer. It tries again in a minute.' : 'Reading the season'}</p></div></div></section>`;
    const next = nextFor(T, b);
    const reg = b.events.filter((e) => e.st !== 1 || b.stype === 1);
    // short seasons show whole; long ones show the last eight and the next ten
    let strip = reg, cut = '';
    if (reg.length > 20) {
      const i = Math.max(0, reg.findIndex((e) => e.state !== 'post'));
      const at = reg.every((e) => e.state === 'post') ? reg.length : i;
      strip = reg.slice(Math.max(0, at - 8), at + 10);
      cut = at >= reg.length ? `the last ${strip.length} of ${reg.length}` : `last ${Math.min(8, at)} and next ${strip.length - Math.min(8, at)} of ${reg.length}`;
    }
    const tile = (e) => {
      keep(e);
      const o = oppOf(T, e), isNext = next && e.id === next.id;
      const r = e.state === 'post' ? resultOf(T, e) : null;
      return `<button class="sp-tile${isNext ? ' upnext' : ''}${r ? (r.w ? ' w' : r.t ? '' : ' l') : ''}${e.state === 'in' ? ' live' : ''}" data-sp="game" data-lg="${T.lg}" data-id="${e.id}"><span class="lbl">${esc(dayOnly(e.date).replace(/^\w+ /, ''))}${e.st === 1 ? ' · pre' : e.st === 3 ? ' · post' : ''}</span>${logo(T.lg, o.t)}<b>${o.at} ${o.t.rank ? `<i class="rk">${o.t.rank}</i>` : ''}${esc(o.t.ab)}</b><em>${r ? esc(r.none ? (e.detail || 'No result') : r.txt) : e.state === 'in' ? 'Live' : esc(tm(e.date))}</em>${isNext ? '<span class="mk">next</span>' : ''}</button>`;
    };
    const o = next ? oppOf(T, next) : null;
    const g = next ? (live[`g:${T.lg}:${next.id}`] || {}).v || getGame(T.lg, next.id) : null;
    const nextBox = next ? `<button class="sp-next" data-sp="game" data-lg="${T.lg}" data-id="${next.id}"><span class="lbl">${next.state === 'in' ? 'On now' : 'Next up'}</span><b>${o.at} ${o.t.rank ? `<i class="rk">${o.t.rank}</i>` : ''}${esc(o.t.name)}</b><em>${esc(dayShort(next.date))} · ${esc(tm(next.date))}${next.tv[0] ? ` · ${esc(next.tv[0])}` : ''}${g && g.line && g.line.text ? ` · ${esc(g.line.text)}` : ''}</em><span class="mk">${next.state === 'in' ? esc(next.detail) : esc(until(next.date))}</span></button>` : `<div class="sp-next off"><span class="lbl">Season over</span><b>${esc(b.rec)}</b><em>${esc(b.standing)}</em></div>`;
    const leadNote = b.leadYear !== b.year ? `last season, ${b.leadYear - 1}-${String(b.leadYear).slice(2)}` : b.seasonName;
    const leaders = b.leaders.length ? b.leaders.map((c) => `<div class="sp-ld"><span class="lbl">${esc(c.k)}</span><div><b>${esc(c.rows[0].n)}</b><em>${esc(c.rows[0].p)}</em></div><u>${esc(c.rows[0].v)}</u>${c.rows.length > 1 ? `<p>${c.rows.slice(1).map((r) => `${esc(r.n)} ${esc(r.v)}`).join(' · ')}</p>` : ''}</div>`).join('') : `<div class="sp-none">No numbers posted yet.</div>`;
    const injAll = getInj(T.lg), inj = injAll ? injAll[T.id] || [] : null;
    const injHtml = !inj ? paperWait(broke(`inj:${T.lg}`) ? 'The injury feed did not answer.' : 'reading the report')
      : inj.length ? inj.map((i) => `<div class="sp-inj s-${esc(i.s.toLowerCase().replace(/[^a-z]+/g, '-'))}"><div><b>${esc(i.n)}</b><em>${esc(i.p)}</em><span class="st">${esc(i.s)}</span></div><p>${esc([i.what, i.back ? `back ${dayOnly(i.back + 'T12:00')}` : ''].filter(Boolean).join(' · '))}${i.note ? `${i.what || i.back ? '. ' : ''}${esc(i.note)}` : ''}</p></div>`).join('')
      : `<div class="sp-none">${T.lg === 'cfb' ? 'Nothing posted. Most college teams do not publish a report.' : 'Nobody listed.'}</div>`;
    const groups = T.lg === 'cfb' ? null : getStand(T.lg), grp = groups ? groups.find((x) => x.rows.some((r) => r.id === T.id)) : null;
    const third = T.lg === 'cfb'
      ? (() => { const r = getRank(); return `<header><h3>${r ? esc(r.name) : 'AP Top 25'}</h3></header>${r ? `<div class="sp-poll">${r.rows.map((x) => `<div class="${x.id === T.id ? 'fav' : ''}"><i>${x.rank}</i>${logo('cfb', x)}<b>${esc(x.name)}</b><em>${esc(x.rec)}</em></div>`).join('')}</div>` : paperWait('reading the poll')}`; })()
      : `<header><h3>${grp ? esc(grp.name) : 'Standings'}</h3><button class="dchip" data-sp="view" data-v="lg:${T.lg}">Whole league</button></header>${grp ? standTable(T.lg, grp, T.id) : paperWait(broke(`stand:${T.lg}`) ? 'The standings did not answer.' : 'reading the standings')}`;
    return `<section class="sp-slab" style="${teamVars(T)}"><div class="who">${tlogo(T, 'stk big')}<div><h2>${esc(b.name)}</h2><p>${[b.rank ? `No. ${b.rank}` : '', b.rec, b.standing].filter(Boolean).map(esc).join(' · ')}</p></div></div>${nextBox}</section>
      <div class="sp-bar" style="${teamVars(T)}"><h2>The season <span class="mk tmk">${esc(cut || `${reg.length} games`)}</span></h2></div>
      <div class="sp-strip" style="${teamVars(T)}">${strip.map(tile).join('')}</div>
      <div class="sp-three" style="${teamVars(T)}"><section class="pp sp-stack"><header><h3>Leaders</h3><span class="mk tmk">${esc(leadNote)}</span></header>${leaders}</section>
        <section class="pp sp-stack"><header><h3>Injury report</h3><span class="mk tmk">${inj ? `${inj.length} listed` : ''}</span></header>${injHtml}</section>
        <section class="pp sp-stack">${third}</section></div>`;
  }

  function standTable(lg, grp, meId) {
    const cols = STAND[lg];
    return `<table class="sp-tbl"><thead><tr><th class="l">${esc(grp.name)}</th>${cols.map(([h]) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${grp.rows.map((r) => `<tr class="${r.id === meId || mine(lg, r.id) ? 'fav' : ''}"><td class="l">${logo(lg, r)}<b>${esc(r.name)}</b></td>${cols.map(([, k]) => `<td>${esc(r.st[k] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  function leagueScreen(lg) {
    const L = LG[lg], q = view.lgQ[lg] || '';
    const b = lg === 'cfb' ? getBoard('cfb', view.cfbQ) : getBoard(lg, q);
    let title = 'Scores';
    if (b) title = L.by === 'week' ? (b.week ? `Week ${b.week}` : 'This week') : (() => { const d = b.day ? new Date(b.day + 'T12:00') : new Date(); return `${WD[d.getDay()]} ${MO[d.getMonth()]} ${d.getDate()}`; })();
    let games = !b ? paperWait(broke(`sb:${lg}:${lg === 'cfb' ? view.cfbQ : q}`) ? 'The feed did not answer.' : 'reading the scores') : !b.events.length ? `<div class="sp-none">No games on this ${L.by === 'week' ? 'week' : 'day'}.</div>` : '';
    if (b && b.events.length) {
      if (L.by === 'week') { let day = ''; games = b.events.map((e) => { const k = dayOnly(e.date); const h = k !== day ? `<div class="sp-day">${esc(k)}</div>` : ''; day = k; return h + gameRow(e, { day: false }); }).join(''); }
      else games = b.events.map((e) => gameRow(e, { day: false })).join('');
    }
    const step = lg === 'cfb' ? `<button class="dchip ar" data-sp="cfbwk" data-n="-1" aria-label="Week before">‹</button><button class="dchip" data-sp="cfbwk" data-n="0">This week</button><button class="dchip ar" data-sp="cfbwk" data-n="1" aria-label="Week after">›</button>`
      : `<button class="dchip ar" data-sp="lgstep" data-lg="${lg}" data-n="-1" aria-label="Earlier">‹</button><button class="dchip" data-sp="lgstep" data-lg="${lg}" data-n="0">${L.by === 'week' ? 'This week' : 'Today'}</button><button class="dchip ar" data-sp="lgstep" data-lg="${lg}" data-n="1" aria-label="Later">›</button>`;
    let right;
    if (lg === 'cfb') { const r = getRank(); right = `<section class="pp sp-stack"><header><h3>${r ? esc(r.name) : 'AP Top 25'}</h3></header>${r ? `<div class="sp-poll two">${r.rows.map((x) => `<div class="${mine('cfb', x.id) ? 'fav' : ''}"><i>${x.rank}</i>${logo('cfb', x)}<b>${esc(x.name)}</b><em>${esc(x.rec)}</em>${x.prev && x.prev !== x.rank ? `<span class="mv ${x.prev > x.rank ? 'up' : 'dn'}">${x.prev > x.rank ? '▲' : '▼'}${Math.abs(x.prev - x.rank)}</span>` : ''}</div>`).join('')}</div>` : paperWait('reading the poll')}</section>`; }
    else { const gs = getStand(lg); right = gs ? `<div class="sp-stands">${gs.map((g) => `<section class="pp sp-stack">${standTable(lg, g)}</section>`).join('')}</div>` : `<section class="pp sp-stack">${paperWait(broke(`stand:${lg}`) ? 'The standings did not answer.' : 'reading the standings')}</section>`; }
    return `<div class="sp-bar"><h2>${esc(L.name)}${lg === 'cfb' ? ' football' : ''} <span class="mk">${esc(title)}</span></h2><div class="sp-step">${step}</div></div>
      <div class="sp-league"><section class="pp sp-stack">${games}</section>${right}</div>`;
  }

  /* ---------- the game sheet ---------- */
  function sheetHTML() {
    const { lg, id } = view.game, g = getGame(lg, id), e = evOf[id] || stars[id];
    if (!g) {
      return `<div class="sp-sheet pp"><button class="sp-x" data-sp="close" aria-label="Close">×</button><div class="sp-shead"><h2>${e ? `${esc(e.away.name)} at ${esc(e.home.name)}` : 'The game'}</h2></div>${paperWait(broke(`g:${lg}:${id}`) ? 'The game feed did not answer. Trying again shortly.' : 'pulling the game sheet')}</div>`;
    }
    const played = g.state !== 'pre';
    const A = g.away, H = g.home;
    const tA = mine(lg, A.id), tH = mine(lg, H.id);
    const col = (t, T) => (T ? T.c1 : ratio(t.color, CREAM) >= 3 ? t.color : '#17130e');
    const cA = col(A, tA), cH = col(H, tH);
    const big = (t, c, sideName) => `<div class="tm ${sideName}${played && g.state === 'post' && !t.win ? ' lost' : ''}" style="--c:${c}">${logo(lg, t, 'stk big')}<div><span class="lbl">${sideName === 'away' ? 'Away' : 'Home'}${t.rec ? ` · ${esc(t.rec)}` : ''}</span><h2>${t.rank ? `<i class="rk">${t.rank}</i>` : ''}${esc(t.name)}</h2></div>${played ? `<b class="sc">${esc(t.score)}</b>` : ''}</div>`;
    const starred = !!stars[id];
    const facts = [`${dayOnly(g.date)} · ${tm(g.date)}`, g.tv.join(', '), [g.venue, g.city].filter(Boolean).join(', '), g.wx ? `${g.wx.f}°F / ${Math.round((g.wx.f - 32) * 5 / 9)}°C${g.wx.rain != null ? `, ${g.wx.rain}% rain` : ''}${g.wx.gust ? `, gusts ${g.wx.gust} mph` : ''}` : ''].filter(Boolean);
    const lines = played && A.lines.length ? `<table class="sp-tbl ls"><thead><tr><th class="l"></th>${A.lines.map((_, i) => `<th>${i + 1}</th>`).join('')}<th>T</th></tr></thead><tbody>${[A, H].map((t) => `<tr><td class="l"><b>${esc(t.ab)}</b></td>${t.lines.map((v) => `<td>${esc(v)}</td>`).join('')}<td><b>${esc(t.score)}</b></td></tr>`).join('')}</tbody></table>` : '';
    const proj = g.proj ? `<div class="sp-proj"><span class="lbl">Win projection</span><div class="bar"><i style="width:${g.proj.away}%;background:${cA}"></i><i style="width:${g.proj.home}%;background:${cH}"></i></div><div class="pv"><b>${esc(A.ab)} ${g.proj.away.toFixed(0)}%</b><b>${esc(H.ab)} ${g.proj.home.toFixed(0)}%</b></div></div>` : '';
    const ml = (v) => (v == null ? '' : v > 0 ? `+${v}` : String(v));
    const lineBox = g.line && (g.line.text || g.line.ou) ? `<div class="sp-line"><span class="lbl">The line${g.line.by ? ` · ${esc(g.line.by)}` : ''}</span><div><b>${esc(g.line.text || 'No line')}</b>${g.line.ou ? `<em>total ${g.line.ou}</em>` : ''}${g.line.away != null && g.line.home != null ? `<em>${esc(A.ab)} ${ml(g.line.away)} · ${esc(H.ab)} ${ml(g.line.home)}</em>` : ''}</div></div>` : '';
    const five = (t) => { const l = g.last5[t.id]; return l && l.length ? `<div class="sp-l5"><span class="lbl">${esc(t.ab)} last ${l.length}</span><div>${l.map((x) => `<span class="${x.r === 'W' ? 'w' : x.r === 'L' ? 'l' : ''}" title="${esc(`${x.r} ${x.s} ${x.at} ${x.o}`)}"><b>${esc(x.r)}</b>${esc(x.s)}<em>${esc(x.at)} ${esc(x.o)}</em></span>`).join('')}</div></div>` : ''; };
    const cats = [...new Set([...(g.leaders[A.id] || []), ...(g.leaders[H.id] || [])].map((x) => x.k))];
    const ldr = (t, k) => { const x = (g.leaders[t.id] || []).find((q) => q.k === k); return x ? `<div><b>${esc(x.n)}</b><em>${esc(x.v)}</em></div>` : '<div></div>'; };
    const leaders = cats.length ? `<section class="sp-vs"><header><h3>${played ? 'Game leaders' : 'Season leaders'}</h3></header>${cats.map((k) => `<div class="vr">${ldr(A, k)}<span class="lbl">${esc(k)}</span>${ldr(H, k)}</div>`).join('')}</section>` : '';
    const sA = g.stats[A.id] || [], sH = g.stats[H.id] || [];
    const stats = played && sA.length ? `<section class="sp-vs"><header><h3>Team numbers</h3></header>${sA.slice(0, 9).map((s) => { const o = sH.find((q) => q.k === s.k); return `<div class="vr"><div><b>${esc(s.v)}</b></div><span class="lbl">${esc(s.k)}</span><div><b>${esc(o ? o.v : '')}</b></div></div>`; }).join('')}</section>` : '';
    const injBlock = (t) => { const l = g.inj[t.id]; return l && l.length ? `<div><span class="lbl">${esc(t.ab)} injuries</span>${l.slice(0, 7).map((i) => `<p><b>${esc(i.n)}</b> ${esc(i.p)} · ${esc(i.s)}${i.what ? `, ${esc(i.what)}` : ''}</p>`).join('')}${l.length > 7 ? `<p>and ${l.length - 7} more</p>` : ''}</div>` : ''; };
    const inj = injBlock(A) || injBlock(H) ? `<section class="sp-injs"><header><h3>Who is out</h3></header><div class="two">${injBlock(A) || '<div></div>'}${injBlock(H) || '<div></div>'}</div></section>` : '';
    const news = g.news.length ? `<section class="sp-news"><header><h3>Headlines</h3></header>${g.news.map((n) => `<a href="${esc(n.u)}" target="_blank" rel="noopener"><b>${esc(n.h)}</b>${n.d ? `<em>${esc(n.d)}</em>` : ''}</a>`).join('')}</section>` : '';
    return `<div class="sp-sheet pp" role="dialog" aria-label="${esc(A.name)} at ${esc(H.name)}">
      <button class="sp-x" data-sp="close" aria-label="Close">×</button>
      <div class="sp-shead"><span class="skst ${g.state}">${g.state === 'in' ? `Live · ${esc(g.detail)}` : g.state === 'post' ? 'Final' : esc(until(g.date) || 'Soon')}</span>
        <button class="dchip${starred ? ' on' : ''}" data-sp="star" data-id="${id}" aria-pressed="${starred}">${STAR(starred)}<span>${starred ? 'Pinned' : 'Pin this game'}</span></button></div>
      <div class="sp-match">${big(A, cA, 'away')}<span class="at">at</span>${big(H, cH, 'home')}</div>
      <div class="sp-facts">${facts.map((f) => `<span>${esc(f)}</span>`).join('')}${g.series ? `<span>${esc(g.series)}</span>` : ''}</div>
      <div class="sp-sgrid"><div>${lines}${proj}${lineBox}${five(A)}${five(H)}${inj}</div><div>${leaders}${stats}</div><div>${news || '<section class="sp-news"><header><h3>Headlines</h3></header><div class="sp-none">Nothing written yet.</div></section>'}</div></div>
    </div>`;
  }

  /* ---------- painting ---------- */
  function navHTML() {
    const tag = (v, label, extra = '') => `<button class="sp-tag${view.v === v ? ' on' : ''}" data-sp="view" data-v="${v}" ${extra} aria-pressed="${view.v === v}">${label}</button>`;
    return `<nav class="sp-nav" aria-label="Sports">${tag('week', 'This week')}<span class="sp-sep">My teams</span>${TEAMS.map((T) => tag(`team:${T.key}`, `${tlogo(T)}${esc(T.short || T.nick)}`, `style="${teamVars(T)}"`)).join('')}<span class="sp-sep">Leagues</span>${Object.keys(LG).map((k) => tag(`lg:${k}`, esc(LG[k].name))).join('')}</nav>`;
  }
  function paint() {
    if (!host || !document.body.classList.contains('sec-sports')) return;
    const page = host.querySelector('.sp-page'), top = page ? page.scrollTop : 0;
    const focus = document.activeElement && document.activeElement.closest && document.activeElement.closest('#dsports') ? document.activeElement.getAttribute('data-id') : null;
    let body;
    if (view.v === 'week') body = weekScreen();
    else if (view.v.startsWith('team:')) body = teamScreen(teamOf(view.v.slice(5)));
    else body = leagueScreen(view.v.slice(3));
    host.innerHTML = `${navHTML()}<div class="sp-page${view.fresh ? ' fresh' : ''}" data-v="${view.v}">${body}</div>${view.game ? `<div class="sp-back${view.gfresh ? ' fresh' : ''}" data-sp="close">${sheetHTML()}</div>` : ''}`;
    document.body.classList.toggle('sp-open', !!view.game);
    const np = host.querySelector('.sp-page'); if (np) np.scrollTop = view.fresh ? 0 : top;
    if (focus && !view.game) { const el = host.querySelector(`[data-id="${focus}"]`); if (el) el.focus({ preventScroll: true }); }
    view.fresh = false; view.gfresh = false;
  }
  function schedulePaint() { clearTimeout(paintT); paintT = setTimeout(paint, 60); }
  function go(v) { view.v = v; view.fresh = true; view.game = null; paint(); }
  function openGame(lg, id) { view.game = { lg, id: String(id) }; view.gfresh = true; paint(); }

  function wire() {
    host.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-sp]'); if (!b) return;
      const a = b.dataset.sp;
      if (a === 'close') { if (b.classList.contains('sp-back') && ev.target !== b) return; view.game = null; paint(); return; }
      if (a === 'star') { ev.stopPropagation(); const e = evOf[b.dataset.id] || stars[b.dataset.id] || (view.game && live[`g:${view.game.lg}:${view.game.id}`] ? gameAsEvent(live[`g:${view.game.lg}:${view.game.id}`].v) : null); if (e) { toggleStar(e); view.popStar = e.id; paint(); view.popStar = null; if (window.renderDesk) window.renderDesk(); } return; }
      if (a === 'view') { go(b.dataset.v); return; }
      if (a === 'game') { openGame(b.dataset.lg, b.dataset.id); return; }
      if (a === 'cfbwk') { const n = Number(b.dataset.n), cur = (getBoard('cfb', view.cfbQ) || {}).week; view.cfbQ = n === 0 || !cur ? '' : `&week=${Math.max(1, Math.min(16, cur + n))}&seasontype=2`; view.fresh = true; paint(); return; }
      if (a === 'lgstep') {
        const lg = b.dataset.lg, n = Number(b.dataset.n), cur = getBoard(lg, view.lgQ[lg] || '');
        if (n === 0) view.lgQ[lg] = '';
        else if (LG[lg].by === 'week') { if (cur && cur.week) view.lgQ[lg] = `&week=${Math.max(1, Math.min(18, cur.week + n))}&seasontype=2`; }
        else { const d = cur && cur.day ? new Date(cur.day + 'T12:00') : new Date(); d.setDate(d.getDate() + n); view.lgQ[lg] = `&dates=${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`; }
        view.fresh = true; paint();
      }
    });
    host.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.classList && ev.target.classList.contains('sp-g')) { ev.preventDefault(); ev.target.click(); } });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && view.game && document.body.classList.contains('sec-sports')) { view.game = null; paint(); } });
    // a ticket leans toward the pointer, the way a card does in the hand
    host.addEventListener('pointermove', (ev) => {
      const t = ev.target.closest && ev.target.closest('.sp-tix'); if (!t) return;
      const r = t.getBoundingClientRect();
      t.style.setProperty('--rx', `${(((ev.clientY - r.top) / r.height) - 0.5) * -7}deg`);
      t.style.setProperty('--ry', `${(((ev.clientX - r.left) / r.width) - 0.5) * 9}deg`);
    });
    host.addEventListener('pointerout', (ev) => { const t = ev.target.closest && ev.target.closest('.sp-tix'); if (t && !t.contains(ev.relatedTarget)) { t.style.removeProperty('--rx'); t.style.removeProperty('--ry'); } });
    setInterval(() => { if (document.visibilityState === 'visible' && document.body.classList.contains('sec-sports')) paint(); }, 30 * 1000);
  }
  const gameAsEvent = (g) => ({ id: g.id, lg: g.lg, date: g.date, state: g.state, detail: g.detail, home: { id: g.home.id, ab: g.home.ab, name: g.home.short, score: String(g.home.score), rec: g.home.rec, rank: g.home.rank, win: g.home.win }, away: { id: g.away.id, ab: g.away.ab, name: g.away.short, score: String(g.away.score), rec: g.away.rec, rank: g.away.rank, win: g.away.win }, tv: g.tv.slice(0, 2), line: g.line ? g.line.text : '', ou: g.line ? g.line.ou : null, spread: null, venue: g.venue, st: 2 });

  /* ---------- what the rest of the app can ask ---------- */
  /* His teams' games and anything he pinned, by local day, for the Week. Reads what is on hand; never waits. */
  function weekGames(dates) {
    const out = {}, seen = new Set();
    const put = (e, T) => {
      const k = ymd(when(e.date)); if (!dates.includes(k) || seen.has(e.id)) return;
      seen.add(e.id);
      const d = when(e.date), us = T ? (e.home.id === T.id ? e.home : e.away) : null, o = T ? oppOf(T, e) : null;
      (out[k] = out[k] || []).push({
        id: e.id, lg: e.lg, time: `${pad(d.getHours())}:${pad(d.getMinutes())}`, tv: e.tv[0] || '', state: e.state,
        label: T ? `${T.short || T.nick} ${o.at} ${o.t.ab}` : `${e.away.ab} at ${e.home.ab}`,
        note: e.state === 'post' ? (T ? resultOf(T, e).txt : `${e.away.score}-${e.home.score}`) : e.state === 'in' ? `Live ${us ? `${us.score}-${o.t.score}` : ''}` : '', color: T ? T.c1 : '#17130e', pinned: !T
      });
    };
    for (const T of TEAMS) { const b = getTeam(T); if (b) for (const e of b.events) put(e, T); }
    for (const s of Object.values(stars)) put(s, null);
    for (const k of Object.keys(out)) out[k].sort((a, b) => a.time.localeCompare(b.time));
    return out;
  }
  window.dbSports = {
    mount(el) { if (!host) { host = el; wire(); } view.fresh = true; paint(); },
    openGame(lg, id) { openGame(lg, id); },
    weekGames,
    teams: TEAMS,
    _state: () => ({ view, store, live, stars, failed })
  };
  if (document.body.classList.contains('sec-sports') && document.getElementById('dsports')) window.dbSports.mount(document.getElementById('dsports'));
  if (window.renderDesk) window.renderDesk();
})();
