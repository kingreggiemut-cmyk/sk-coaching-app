/* =====================================================================
   THE CONSOLE FRAME, CARDS (his picks 2026-10-15, board "Database Card
   Options": A, A, A). Loaded after console.js. Not live.
     1. Playbooks as trading cards (L-CARDS + C-RARITY + E-HOLO). The
        finish is the book's rank among its side's playbooks by the
        average of its six grades: foil top 5%, gold top quarter, silver,
        bronze. Skim = small front, Peek = front, Deep = flipped to the
        stat back. Hover tilts the card and the light follows.
     2. Formations as play call cards (C-PLAYCARD): the personnel number
        big in a slanted header, the counts under the field; hover draws
        the formation's most used play on it.
     3. A play opens as the play call screen (C-PLAYCARD + L-EAMENU +
        N-TABS): the engine's own play view (hot routes, motion, drawing,
        animate all untouched) re-laid out, with one tab strip that swaps
        the adjustments and the playbooks under the field.
   ===================================================================== */
(function () {
  const D = document, B = D.body, side = (typeof SIDE !== 'undefined' ? SIDE : 'O');
  const GV = { 'A+': 98, A: 94, 'A-': 90, 'B+': 87, B: 83, 'B-': 80, 'C+': 77, C: 73, 'C-': 70, 'D+': 67, D: 63, 'D-': 60, F: 50 };

  /* ---------- 1. trading cards ---------- */
  const DIMS = side === 'D'
    ? [['Zone', 'zone calls', (b) => (b.split || {}).Zone || 0], ['Man', 'man calls', (b) => (b.split || {}).Man || 0], ['Blitz', 'blitzes', (b) => (b.split || {}).Blitz || 0], ['sets', 'fronts', (b) => b.sets || 0]]
    : [['run', 'run plays', (b) => (b.split || {}).Run || 0], ['pass', 'pass plays', (b) => (b.split || {}).Pass || 0], ['rpo', 'RPOs', (b) => (b.split || {}).RPO || 0], ['shots', 'deep shots', (b) => b.deep || 0], ['motion', 'motion plays', (b) => b.motion || 0], ['variety', 'formations', (b) => b.sets || 0]];
  let RANKS = null;
  function ranks() { if (RANKS) return RANKS; const L = IDX.books.filter((b) => !b.drill && b.sideCode === side && b.plays > 0); RANKS = new Map();
    for (const b of L) { let best = null; for (const [k, lab, get] of DIMS) { const v = get(b), rk = L.filter((o) => get(o) > v).length + 1; if (!best || rk < best.rank) best = { rank: rk, label: lab, value: v }; }
      RANKS.set(b.key, Object.assign(best, { of: L.length, tier: best.rank <= 3 ? 'foil' : best.rank <= 12 ? 'gold' : best.rank <= 40 ? 'silver' : 'bronze' })); }
    return RANKS; }
  const bestG = (g) => Object.entries(g).sort((x, y) => (GV[y[1]] || 0) - (GV[x[1]] || 0))[0][0];
  function tradingCards() { const main = D.getElementById('main');
    main.querySelectorAll('.books').forEach((grid) => grid.classList.add('skc-tc'));
    main.querySelectorAll('button.book[data-b]').forEach((btn) => { const b = bookOf(btn.dataset.b); if (!b) return;
      const r = ranks().get(b.key) || { tier: 'bronze' }, g = b.grades, s = b.split || {}, keys = Object.keys(s), tot = keys.reduce((a, k) => a + s[k], 0) || 1, col = ['#5B8CFF', '#E5484D', '#2BB673'];
      const logo = b.logo ? `<img src="logos/${b.logo}.png" alt="" loading="lazy">` : `<span class="glyph">${esc(b.team)}</span>`;
      const mx = (get) => Math.max(1, ...IDX.books.filter((o) => !o.drill && o.sideCode === side && o.plays > 0).map(get));
      const gbars = `<span class="bars">${DIMS.map(([k, lab, get]) => { const v = get(b); return `<span><em>${esc(lab)}</em><i style="--w:${Math.max(4, 100 * v / mx(get)).toFixed(1)}%"></i><b>${v}</b></span>`; }).join('')}</span>`;
      const split = `<span class="split">${keys.map((k, i) => `<i style="width:${(100 * s[k] / tot).toFixed(1)}%;background:${col[i % 3]}"></i>`).join('')}</span><span class="splitl">${keys.map((k) => `<span>${s[k]} ${esc(k)}</span>`).join('')}<span>${b.sets} ${side === 'D' ? 'fronts' : 'sets'}</span></span>`;
      const best = b.best ? `<span class="bestb">#${b.best.rank} most ${esc(({ run: 'run plays', pass: 'pass plays', rpo: 'RPOs', shots: 'deep shots', motion: 'motion plays', variety: 'formations' })[b.best.key] || b.best.label)} in the ${typeof SK_GAMEKEY !== 'undefined' && SK_GAMEKEY ? 'league' : 'country'}</span>` : '';
      const n = D.createElement('button'); n.className = 'skc-card'; n.dataset.b = b.key; n.dataset.tier = 'plain'; n.style.setProperty('--c1', b.c1 || '#2a3a52'); n.setAttribute('aria-label', b.team);
      n.innerHTML = `<span class="face front"><span class="art">${logo}</span><span class="plate"><b>${esc(b.team)}</b><span>Runs as ${esc(b.identity || 'Multiple')} · ${b.plays} plays</span></span><span class="glare"></span></span>`
        + `<span class="face back"><span class="bh">${logo}<b>${esc(b.team)}</b></span>${best}${gbars}${split}<span class="gnote">How much of each is in the book. A full bar is the most any playbook has.</span></span>`;
      btn.replaceWith(n); }); }
  D.addEventListener('pointermove', (e) => { const c = e.target.closest && e.target.closest('.skc-card');
    D.querySelectorAll('.skc-card.tilt').forEach((x) => { if (x !== c) { x.classList.remove('tilt'); x.style.removeProperty('--rx'); x.style.removeProperty('--ry'); } });
    if (!c || B.dataset.skcdens === 'deep') return; const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; c.classList.add('tilt');
    c.style.setProperty('--ry', ((x - .5) * 14).toFixed(1) + 'deg'); c.style.setProperty('--rx', ((.5 - y) * 10).toFixed(1) + 'deg'); c.style.setProperty('--gx', (x * 100).toFixed(0) + '%'); c.style.setProperty('--gy', (y * 100).toFixed(0) + '%'); }, { passive: true });

  /* ---------- 2. play call cards ---------- */
  const persOf = (fam, set) => { const m = (typeof FORMS !== 'undefined' && FORMS && FORMS[slug(fam) + '__' + slug(set)]) || []; if (!m.length) return null;
    /* a defense reads as its front: down linemen, linebackers, defensive backs (4-2-5) */
    if (m.some((x) => /^(DE|DT|LB|CB|FS|SS|NB|S)$/.test(x.p))) { const dl = m.filter((x) => /^(DE|DT)$/.test(x.p)).length, lb = m.filter((x) => x.p === 'LB').length, db = m.filter((x) => /^(CB|FS|SS|NB|S)$/.test(x.p)).length;
      return { code: dl + '-' + lb + '-' + db, def: true, line: dl + ' DL · ' + lb + ' LB · ' + db + ' DB' }; }
    const rb = m.filter((x) => /^(RB|HB|FB)$/.test(x.p)).length, te = m.filter((x) => x.p === 'TE').length, wr = m.filter((x) => x.p === 'WR').length; return { code: '' + rb + te, rb, te, wr, line: rb + ' RB · ' + te + ' TE · ' + wr + ' WR' }; };
  function formationCards() { const main = D.getElementById('main'), bk = VIEW === 'book' && BOOK ? bookOf(BOOK) : null;
    main.querySelectorAll('.fgrid').forEach((gr) => gr.classList.add('skc-fgrid'));
    main.querySelectorAll('button.fbadge[data-s]').forEach((btn) => { const f = btn.dataset.f, s = btn.dataset.s, p = persOf(f, s), tapes = [...btn.querySelectorAll('.ftape b')].map((x) => x.textContent), n = parseInt((btn.querySelector('.fn') || {}).textContent || '0', 10) || 0;
      const diag = btn.querySelector('.fdiag'), c = D.createElement('button'); c.className = 'skc-fc'; c.dataset.f = f; c.dataset.s = s; if (bk) c.style.setProperty('--fc1', bk.c1 || '#1E54B7');
      c.innerHTML = `<span class="hdr"><span class="pers${p && p.def ? ' def' : ''}">${p ? p.code : '--'}<small>${p && p.def ? 'FRONT' : 'PERS'}</small></span><span class="nmw"><b>${esc(bookSetName(f, s))}</b><span>${esc(String(f).replace(/_/g, ' '))}${p ? ` · ${p.line}` : ''}</span></span></span>`
        + `<span class="fld"><span class="fm">${diag ? diag.innerHTML : ''}</span><span class="pl"></span><span class="hint"></span></span>`
        + `<span class="cnt"><span>${n}<u>Plays</u></span><span>${tapes[0] || 0}<u>Pass</u></span><span>${tapes[1] || 0}<u>Run</u></span><span>${tapes[2] || 0}<u>RPO</u></span></span>`;
      btn.replaceWith(c); }); }
  /* hover: the formation's most used play draws itself on the card (fetched once per formation) */
  const PREV = new Map(); let hovT = 0;
  D.addEventListener('pointerover', (e) => { const c = e.target.closest && e.target.closest('.skc-fc'); if (!c || c.dataset.pv || !matchMedia('(pointer:fine)').matches) return; clearTimeout(hovT);
    hovT = setTimeout(async () => { const k = c.dataset.f + '||' + c.dataset.s; c.dataset.pv = '1';
      if (!PREV.has(k)) { const p = IDX.plays.filter((x) => x.family === c.dataset.f && x.set === c.dataset.s && !x.drill).sort((a, b) => (b.books || []).length - (a.books || []).length)[0]; if (!p) return;
        try { const geo = await cardsFor(c.dataset.f, c.dataset.s); PREV.set(k, { svg: drawCard(geo ? geo[p.slug] : null), name: bookPlayName(p) }); } catch (x) { delete c.dataset.pv; return; } }
      const v = PREV.get(k); c.querySelector('.pl').innerHTML = v.svg; c.querySelector('.hint').textContent = v.name; c.classList.add('haspl'); }, 160); });
  D.addEventListener('pointerout', (e) => { const c = e.target.closest && e.target.closest('.skc-fc'); if (c && !c.contains(e.relatedTarget)) clearTimeout(hovT); });

  /* ---------- 3. the play call screen ---------- */
  const pp = D.getElementById('playpop');
  const tabs = D.createElement('div'); tabs.className = 'skc-pvtabs'; tabs.setAttribute('role', 'tablist');
  tabs.innerHTML = '<button role="tab" data-pvt="adj" aria-selected="true">Hot routes and motion</button><button role="tab" data-pvt="books" aria-selected="false">Playbooks</button>';
  pp.dataset.pvt = 'adj';
  tabs.addEventListener('click', (e) => { const t = e.target.closest('[data-pvt]'); if (!t) return; pp.dataset.pvt = t.dataset.pvt; tabs.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', b === t)); });
  const _openPlay = openPlay;
  openPlay = function (p) { const r = _openPlay.apply(this, arguments);
    try { const hd = pp.querySelector('.pp-hd'); if (hd && p && !hd.querySelector('.skc-pers')) { const pe = persOf(p.family, p.set), sp = D.createElement('span'); sp.className = 'skc-pers'; sp.innerHTML = (pe ? pe.code : '--') + '<small>' + (pe && pe.def ? 'FRONT' : 'PERS') + '</small>'; if (pe && pe.def) sp.classList.add('def'); hd.prepend(sp); }
      pp.classList.remove('skc-draw'); void pp.offsetWidth; pp.classList.add('skc-draw'); } catch (x) {}
    return r; };

  /* every render of the playbooks or the formations swaps in the new cards */
  const _render = render;
  render = function () { const r = _render.apply(this, arguments);
    try { if (VIEW === 'books') tradingCards(); if ((VIEW === 'formations' || VIEW === 'book') && !FAM) formationCards(); } catch (x) { console.error(x); }
    return r; };
  if (typeof IDX !== 'undefined' && IDX && D.getElementById('main')) { try { if (VIEW === 'books') tradingCards(); if ((VIEW === 'formations' || VIEW === 'book') && !FAM) formationCards(); } catch (x) {} }
})();
