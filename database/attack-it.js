/* attack-it.js: ATTACK IT (2026-10-18, his idea for the offenses, the mirror of the Seahawks' Stop it).
   Pick what the defense shows (two safeties deep, one deep, none deep, man, match), the play you need (explosive, move the
   chains, a playmaker in space, the quarterback involved) or the situation (first and ten, third and short, third and long,
   the red zone), and the board answers with our calls and his reason for each.

   Two screens, in the same look as Stop it (scheme.css .sb* classes):
     skAttack.wall(host, cfg)   the questions as big cards, one group in the middle and the others blurred beside it
     skAttack.mount(host, cfg)  THE RAIL: the questions down the left, the field in the middle, the answers down the right.
                                Each answer plays in two beats on the offense film board (offense-film.js): THE LOOK (the call
                                and the defense before the snap) and THE SNAP (the read he breaks down, at its moment).
   Nothing is staged here: every answer is { call, read }, a read already staged in the scheme's film staging file.
   cfg = { scheme, attack (SC.attack), th (the open question), plays {id: fieldPlays() play}, calls {id: the call (reads,
           adjustments)}, blocking, team (SC.film), mark (the team's marker colour), nav(id), still } */
(function () {
  'use strict';
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const KC = { Shot: '#7E93FF', 'Man beater': '#FF6B5E', Pass: '#E8E874', RPO: '#74DCDC', Run: '#69BE28', 'QB run': '#f5c542', Screen: '#D3B0EC', Jet: '#8FD0F0' };
  const GROUPS = (A) => { const g = []; A.threats.forEach((t) => { if (!g.includes(t.group)) g.push(t.group); }); return g; };
  const LAST = {};
  let cur = null, timer = 0, WALLAT = 0, wallHost = null;
  function unmount() { if (cur) { if (window.skOffFilm) skOffFilm.unmount(); cur = null; } clearInterval(timer); timer = 0; }

  /* ---- THE RAIL ---- */
  function mount(host, cfg) { unmount(); const A = cfg.attack, T = A.threats.find((t) => t.id === cfg.th); if (!T || !window.skOffFilm) return false;
    const key = cfg.scheme + '|' + T.id, me = { host, cfg, T, a: clamp(cfg.ans != null ? cfg.ans : LAST[key] || 0, 0, T.answers.length - 1), i: 0, last: performance.now() };
    WALLAT = Math.max(0, GROUPS(A).indexOf(T.group)); host.dataset.on = T.id;
    host.innerHTML = `<div class="sbrail"><a class="sball" href="#attack">&lsaquo; All questions</a>${GROUPS(A).map((g) => `<span class="sbgh">${esc(g)}</span>${A.threats.filter((t) => t.group === g).map((t) => `<a class="sbq${t.id === T.id ? ' on' : ''}" href="#attack/${esc(t.id)}" data-atth="${esc(t.id)}">${esc(t.name)}</a>`).join('')}`).join('')}</div>
      <div class="sbfield"><div class="athost" data-live="" data-scheme="${esc(cfg.scheme)}"></div><div class="sbcap"></div>${T.avoid ? `<div class="sbavoid">${esc(T.avoid)}</div>` : ''}<div class="sbctl"><button type="button" data-atstep="0">The look</button><button type="button" data-atstep="1">The snap</button><button type="button" class="rp" data-atstep="replay">&#8635; Replay</button></div></div><div class="sbans"></div>`;
    const field = host.querySelector('.athost');
    const play = () => { const x = T.answers[me.a], c = cfg.calls[x.call] || {}; field.dataset.live = x.call;
      skOffFilm.mount(field, { scheme: cfg.scheme, id: x.call, offense: true, play: cfg.plays[x.call], blocking: cfg.blocking, reads: c.reads || [], adj: c.adjustments || [], start: x.read, still: cfg.still != null, left: 0, team: cfg.team, look: me.i === 0 }); };
    const ui = () => { const x = T.answers[me.a];
      host.querySelector('.sbans').innerHTML = `<div class="k team">Our answers</div>${T.answers.map((y, j) => (j === me.a
        ? `<div class="sbcard on" style="--kc:${KC[y.kind] || '#EDEAE2'}"><span class="sbkd">${j + 1} &middot; ${esc(y.kind)} &middot; ${esc(y.front)}</span><b>${esc(y.name)}</b><p><strong>${esc(y.label)}.</strong> ${esc(y.why)}</p><span class="sbdo"><b>Set it up</b>${esc(y.do)}</span><a class="btn sm" href="#play/${esc(y.call)}">Open the call &rsaquo;</a></div>`
        : `<button type="button" class="sbcard" data-atans="${j}" style="--kc:${KC[y.kind] || '#EDEAE2'}"><span class="sbkd">${j + 1} &middot; ${esc(y.kind)} &middot; ${esc(y.front)}</span><b>${esc(y.name)}</b></button>`)).join('')}`;
      const cap = host.querySelector('.sbcap'); cap.innerHTML = `<b>${me.i ? 'The snap' : 'The look'}</b>${esc(x.label)}`;
      host.querySelectorAll('[data-atstep]').forEach((b) => b.classList.toggle('on', b.dataset.atstep === String(me.i))); fitCols(host); };
    me.step = (i) => { me.i = i; me.last = performance.now(); if (skOffFilm.id() === T.answers[me.a].call) skOffFilm.look(i === 0); else play(); ui(); };
    me.ans = (j) => { me.a = ((j % T.answers.length) + T.answers.length) % T.answers.length; LAST[key] = me.a; me.i = 0; me.last = performance.now(); play(); ui(); };
    host.onclick = (e) => { const an = e.target.closest('[data-atans]'), sp = e.target.closest('[data-atstep]'), q = e.target.closest('[data-atth]');
      if (q && cfg.nav) { e.preventDefault(); cfg.nav(q.dataset.atth); return; } if (an) { me.ans(+an.dataset.atans); return; }
      if (sp) { if (sp.dataset.atstep === 'replay') { me.i = 1; skOffFilm.look(false); ui(); } else me.step(+sp.dataset.atstep); return; }
      if (e.target.closest('.athost')) api.key(1); };
    cur = me; if (cfg.still != null) me.i = clamp(cfg.still, 0, 1); play(); ui();
    if (cfg.still == null) timer = setInterval(() => { if (!cur || !cur.host.isConnected) { unmount(); return; } if (cur.i === 0 && performance.now() - cur.last > 3600 && !document.querySelector('.modal')) cur.step(1); }, 300);
    return true; }
  function fitCols(host) { host.querySelectorAll('.sbrail,.sbans').forEach((c) => { c.style.zoom = ''; const av = host.clientHeight - 8, h = c.scrollHeight; if (h > av && av > 80) c.style.zoom = Math.max(.56, av / h).toFixed(3); }); }

  /* ---- THE WALL: one group big in the middle, the others blurred beside it; each question drawn on paper ---- */
  function wall(host, cfg) { unmount(); host.dataset.on = 'wall'; wallHost = host; const A = cfg.attack, G = GROUPS(A), n = G.length; if (cfg.group != null) WALLAT = cfg.group; WALLAT = clamp(WALLAT, 0, n - 1);
    host.innerHTML = G.map((g, i) => { const l = A.threats.filter((t) => t.group === g); return `<div class="sbspot" data-i="${i}"><h3>${esc(g)}<small>${l.length} questions</small></h3><div class="sbcards${l.length === 2 || l.length === 4 ? ' two' : ''}" style="--rows:${l.length > 3 ? 2 : 1}">${l.map((t) => `<a class="sbtile${t.name.length > 18 ? ' lg' : ''}" href="#attack/${esc(t.id)}"><span class="sbpic"><canvas data-atpic="${esc(t.id)}"></canvas></span><b>${esc(t.name)}</b><small>${t.answers.length} answers &rsaquo;</small></a>`).join('')}</div></div>`; }).join('') +
      '<button type="button" class="sbarr l" data-atd="-1" aria-label="The group before">&lsaquo;</button><button type="button" class="sbarr r" data-atd="1" aria-label="The next group">&rsaquo;</button><div class="sbpg"></div>';
    const put = () => { host.querySelectorAll('.sbspot').forEach((p) => { const k = ((+p.dataset.i - WALLAT) % n + n) % n; p.className = 'sbspot' + (k === 0 ? '' : k === 1 ? ' off r' : k === n - 1 ? ' off l' : ' off rr'); });
      host.querySelector('.sbpg').innerHTML = G.map((g, i) => `<button type="button" class="${i === WALLAT ? 'on' : ''}" data-atg="${i}">${esc(g)}</button>`).join(''); };
    host._turn = (k) => { WALLAT = ((WALLAT + k) % n + n) % n; put(); };
    host.onclick = (ev) => { const a = ev.target.closest('[data-atd]'), g = ev.target.closest('[data-atg]'); if (a) host._turn(+a.dataset.atd); else if (g) { WALLAT = +g.dataset.atg; put(); } };
    put();
    if (window.skOffFilm && skOffFilm.card) host.querySelectorAll('canvas[data-atpic]').forEach((cv) => { const t = A.threats.find((x) => x.id === cv.dataset.atpic), first = t && t.answers[0]; if (!first || !cfg.plays[first.call]) return; skOffFilm.card(cv, { play: cfg.plays[first.call], cov: t.cov || null, mark: cfg.mark }); });
    return true; }

  const api = { mount, wall, unmount,
    adopt: (host) => !!(host && host.dataset.on && host.firstChild && (host.dataset.on === 'wall' || (cur && cur.host === host))),
    /* the keys: 1 = the next beat (the look, the snap, then the next answer), -1 = back, 'up' / 'down' = the question before or after */
    key(d) { if (!cur) { if (wallHost && wallHost.isConnected && wallHost._turn && (d === 1 || d === -1)) { wallHost._turn(d); return true; } return false; } const T = cur.T, list = cur.cfg.attack.threats, n = list.findIndex((t) => t.id === T.id);
      if (d === 'up' || d === 'down') { const nx = list[(n + (d === 'down' ? 1 : -1) + list.length) % list.length]; if (cur.cfg.nav) cur.cfg.nav(nx.id); return true; }
      if (d > 0) { if (cur.i === 0) cur.step(1); else cur.ans(cur.a + 1); } else { if (cur.i === 1) cur.step(0); else cur.ans(cur.a - 1); } return true; } };
  window.skAttack = api;
})();
