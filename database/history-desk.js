/* history-desk.js: HISTORY AND PERSONNEL on the Paper Desk (rebuilt 2026-11-22).
   His note: "break down the positions, break down what the offense is and some facts about it", on a few pages he clicks
   between, never a presentation. A scheme opts in with a `desk` block (Madden27 Engine Reference/niners-desk.js).
   skDesk.html(SC, page, H) returns the stage's markup. The styles are the .hd- rules at the end of scheme.css.
   Every position is drawn at once, stacked in one cell, so each play card has a size to paint at. */
(() => {
'use strict';
const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PAGES = ['offense', 'positions', 'facts'];
const TOP = 184;          // the pages start under the tabs and under the face cam
const at = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
let who = 0;              // the position that is open

const sheet = (cls, box, inner) => `<section class="hd-sheet ${cls}" style="${box}"><i class="hd-tape"></i>${inner}</section>`;
const playOf = (SC, id) => (SC.plays || []).find((q) => q.id === id) || {};
const card = (SC, id, focus) => `<canvas data-ldcall="${esc(id)}" data-ldfocus="${esc(JSON.stringify(focus))}" role="img" aria-label="${esc(playOf(SC, id).name)}"></canvas>`;

function offense(D, SC, h) {
  const call = (label, c) => `<div class="hd-call"><em>${label}</em>${card(SC, c.play, c.focus)}<b>${esc(playOf(SC, c.play).name)}</b><p>${esc(c.line)}</p></div>`;
  return sheet('hd-intro', at(44, TOP, 1512, 134), D.intro.map(([t, p]) => `<div><h2>${esc(t)}</h2><p>${esc(p)}</p></div>`).join(''))
    + D.parts.map((p, i) => sheet('hd-part', at(44 + i * 512, TOP + 150, 488, h - 150),
      `<h3>${esc(p.name)}</h3><p>${esc(p.why)}</p><div class="hd-pair">${call('We show them', p.show)}${call('Then we hit them with', p.then)}</div>`)).join('');
}

function positions(D, SC, h) {
  const pick = (p, i) => `<button type="button" class="hd-pick" data-hd-who="${i}" aria-pressed="${i === who}"><i>${p.no}</i><span><b>${esc(p.pos)}</b>${esc(p.name)}</span></button>`;
  const panel = (p, i) => `<article class="hd-pos${i === who ? ' on' : ''}">
      <div class="hd-say">
        <h2>${esc(p.pos)}</h2>
        <p class="hd-who"><b>${p.no} ${esc(p.name)}</b>${p.with ? `<span>${esc(p.with)}</span>` : ''}</p>
        <p class="hd-what">${esc(p.what)}</p>
        <h4>The job in this offense</h4>
        <ol class="hd-job">${p.job.map(([t, s]) => `<li><b>${esc(t)}</b>${esc(s)}</li>`).join('')}</ol>
        <div class="hd-nums">${p.facts.map(([n, l]) => `<p><b>${esc(n)}</b>${esc(l)}</p>`).join('')}</div>
        <p class="hd-src">Source: ${esc(p.src)}</p>
      </div>
      <div class="hd-see">
        <h4>On ${esc(playOf(SC, p.play).name)}</h4>
        ${card(SC, p.play, p.focus)}
        <p class="hd-on">${esc(p.on)}</p>
        <h4>The calls to watch</h4>
        <p class="hd-calls">${p.calls.map((id) => `<a href="#play/${esc(id)}">${esc(playOf(SC, id).name)}</a>`).join('')}</p>
      </div></article>`;
  return sheet('hd-rail', at(44, TOP, 340, h), D.list.map(pick).join(''))
    + sheet('hd-main', at(408, TOP, 1148, h), `<div class="hd-stack" aria-live="polite">${D.list.map(panel).join('')}</div>`);
}

function facts(D, SC, h) {
  const N = D.now, P = D.past, TH = { 1: '1st', 2: '2nd', 3: '3rd' };
  const rank = ([r, n, l, note]) => `<div class="hd-rank"><p><b>${TH[r] || r + 'th'}</b><span>${esc(n)}</span></p><h4>${esc(l)}</h4>
      <i aria-hidden="true">${Array.from({ length: 32 }, (x, k) => `<u${k + 1 === r ? ' class="hot"' : ''}></u>`).join('')}</i><em>${esc(note)}</em></div>`;
  return sheet('hd-now', at(44, TOP, 920, h), `<h2>${esc(N.head)}</h2><p>${esc(N.label)}</p><div class="hd-ranks">${N.v.map(rank).join('')}</div><p class="hd-src">${esc(N.src)}</p>`)
    + sheet('hd-past', at(988, TOP, 568, h), `<h2>${esc(P.head)}</h2><ol class="hd-path">${P.v.map(([y, t, s]) => `<li><b>${esc(y)}<span>${esc(t)}</span></b><p>${esc(s)}</p></li>`).join('')}</ol><p class="hd-src">${esc(P.src)}</p>`);
}

function html(SC, page, H) {
  const key = PAGES[page] || PAGES[0], draw = { offense, positions, facts }[key];
  return `<header class="hd-head" style="${at(44, 48, 1112, 58)}"><h1>History &amp; Personnel</h1></header>
    <nav class="hd-tabs" style="${at(44, 116, 1112, 48)}" aria-label="History and Personnel pages">${PAGES.map((k, i) => `<a href="#personnel/${i}"${k === key ? ' aria-current="page"' : ''}>${esc(SC.desk[k].tab)}</a>`).join('')}</nav>
    ${draw(SC.desk[key], SC, H - 96 - TOP)}`;
}

document.addEventListener('click', (e) => {
  const b = e.target.closest && e.target.closest('[data-hd-who]');
  if (!b) return;
  who = +b.dataset.hdWho;
  document.querySelectorAll('[data-hd-who]').forEach((x, i) => x.setAttribute('aria-pressed', String(i === who)));
  document.querySelectorAll('.hd-pos').forEach((x, i) => x.classList.toggle('on', i === who));
  const main = document.querySelector('.hd-main');
  if (main && document.body.classList.contains('mob')) main.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
});

window.skDesk = { html };
})();
