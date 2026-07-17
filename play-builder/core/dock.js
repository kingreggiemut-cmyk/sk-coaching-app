// DOCK — the shell the whole UI now lives in.
//
// Before this, six cream panels floated at six anchors over the field: nothing
// owned an edge, so the eye had no path and the stadium (the actual product) was
// peeking out between controls. Now there are exactly two chrome surfaces:
//
//   1. a bottom BAR anchored to the bottom edge — identity, section tabs, transport
//   2. ONE side PANEL at a time, opened by a tab
//
// Everything else is field. The bar reads as a broadcast/console HUD, which is the
// vernacular of the subject (football on a screen) rather than of design tools.
//
// This module owns only the shell. Each section's controls are still built and
// wired by the module that owns them (offense.js, app.js) and mounted into a
// panel body here — so no behaviour moved, only where it hangs.

const TABS = [
  { id: 'play',    label: 'Setup',   icon: '📋', title: 'Formation, save, share and export' },
  { id: 'offense', label: 'Offense', icon: '🏈', title: 'Receivers, routes and read order' },
  { id: 'defense', label: 'Defense', icon: '🛡', title: 'Pick the coverage you want to beat' },
  { id: 'view',    label: 'View',    icon: '🎥', title: 'Camera angles and what shows on the field' },
  // SVG (not emoji) so the icon inherits the tab's text colour — navy on cream,
  // white when selected — instead of a washed-out yellow folder on cream.
  { id: 'plays',   label: 'Your Plays', title: 'Your saved plays',
    svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>' },
  { id: 'studio',  label: 'Studio',  icon: '⚙',  title: 'Filming tools', studioOnly: true },
];

// Contextual help — one per section. A tour gets skipped; help you ask for, at the
// moment you're confused, gets read. `?` in the panel header toggles it.
const HELP = {
  play: `<b>Name it, then save it.</b><p>Your play saves to your Scheme Kings account, so it's waiting for you on any device. <b>Share</b> gives you a link anyone can open — they'll watch your play run on the real stadium, no account needed.</p><p><b>Export</b> turns it into a video or an image you can post.</p>`,
  offense: `<b>Click a receiver on the field</b>, then pick his route here.<p><b>Read order</b> is the order the QB looks at them — 1st is your money read and shows up red.</p><p><b>To throw:</b> hit Run, then click any receiver on the field — or use the <b>Throw to</b> buttons in the Controls panel. Each one shows its shortcut key. If you don't throw, the QB finds the money read on his own.</p><p><b>Stem</b> makes a route deeper or shorter. <b>Draw custom route</b> lets you click your own path on the field.</p>`,
  defense: `<b>Pick what you want your play to beat.</b><p><b>Zone</b> defenders drop to areas — the shaded bubbles show where. <b>Man</b> defenders follow one receiver each; the dotted line shows who has who.</p><p>In man, click a defender then a receiver to reassign him, or click the QB to free him. <b>Separation</b> sets how much daylight the receiver gets.</p>`,
  view: `<b>Camera angles.</b><p>Pick a shot and it flies itself while the play runs. <b>Receiver POV</b> watches from behind your receiver looking back at the QB. <b>Free</b> gives you full control — drag to orbit, scroll to zoom.</p><p><b>Reads</b> toggles the on-field tags. <b>H</b> hides all the controls for a clean look.</p>`,
  plays: `<b>Your saved plays.</b><p>Everything you've saved, sorted by formation. Click a play to load it onto the field — then tweak it and hit <b>Save these edits</b> in Setup, or draw something new.</p><p>Members save unlimited plays that follow them to any device.</p>`,
  studio: `<b>Reggie's filming tools.</b><p>Run plays and Full 11 personnel, the Jumbotron end card, camera capture (<b>C</b>), presenter shots (<b>5 6 7</b>), and the 9:16 / bottom-third preview framings for compositing.</p><p><b>Ctrl+Shift+S</b> turns Studio on and off. There's no visible switch on purpose — a normal user should never trip into this tab. Your choice is remembered.</p>`,
};

let side = null, bar = null, current = null, helpOpen = false;
const bodies = {};
const subs = [];

export function onOpen(f) { subs.push(f); }
export function getOpen() { return current; }

export function buildDock() {
  // NOT a bar. A full-width strip read as one heavy slab across the bottom of the
  // stadium; these are separate chunky buttons that float over the field instead,
  // so the field runs edge to edge behind them.
  bar = document.createElement('nav');
  bar.className = 'pd-dock';
  bar.id = 'pd-dock-tabs';
  bar.setAttribute('aria-label', 'Sections');
  // No brand button. The app's own name was sitting in the row as if it were a
  // thing you could click — it isn't, and the stadium already says whose this is.
  bar.innerHTML = TABS.map((t) => `<button class="pd-tab pd-patch${t.studioOnly ? ' studio-only' : ''}" data-tab="${t.id}" title="${t.title}" aria-pressed="false">
        <span class="pd-tab-ico">${t.svg || t.icon}</span><span class="pd-tab-lbl">${t.label}</span>
      </button>`).join('');
  document.body.appendChild(bar);

  // A real control panel, bottom-right: status, scrubber, run/pause/resume/replay,
  // reset. A lone RUN button was too small to find.
  const trans = document.createElement('div');
  trans.className = 'pd-controls'; trans.id = 'pd-dock-transport';
  trans.innerHTML = `<div class="pd-controls-head">Controls</div><div class="pd-controls-body" id="pd-dock-mid"></div>`;
  document.body.appendChild(trans);

  side = document.createElement('aside');
  side.className = 'pd-side'; side.id = 'pd-side';
  side.innerHTML = `
    <div class="pd-side-head">
      <span class="pd-side-title" id="pd-side-title">Play</span>
      <div class="pd-side-acts">
        <button class="pd-side-btn" id="pd-side-help" title="How does this work?" aria-label="Help">?</button>
        <button class="pd-side-btn" id="pd-side-x" title="Close" aria-label="Close">✕</button>
      </div>
    </div>
    <div class="pd-help" id="pd-help" hidden></div>
    <div class="pd-side-body" id="pd-side-body">
      ${TABS.map((t) => `<section class="pd-sec" data-sec="${t.id}"></section>`).join('')}
    </div>`;
  document.body.appendChild(side);

  for (const t of TABS) bodies[t.id] = side.querySelector(`[data-sec="${t.id}"]`);

  bar.onclick = (e) => {   // `bar` IS the tab strip now, not a wrapper around one
    const b = e.target.closest('[data-tab]'); if (!b) return;
    toggle(b.dataset.tab);
  };
  side.querySelector('#pd-side-x').onclick = () => close();
  side.querySelector('#pd-side-help').onclick = () => setHelp(!helpOpen);

  return { bar, side };
}

// Where a section's controls get mounted. Called by whoever builds them.
export function panelBody(name) { return bodies[name] || null; }
export function slot(name) { return document.getElementById('pd-dock-' + name); }

export function open(name) {
  if (!bodies[name]) return;
  current = name;
  side.classList.add('show');
  document.body.classList.add('side-open');
  for (const [id, el] of Object.entries(bodies)) el.classList.toggle('on', id === name);
  bar.querySelectorAll('[data-tab]').forEach((b) => {
    const on = b.dataset.tab === name;
    b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  const t = TABS.find((x) => x.id === name);
  side.querySelector('#pd-side-title').textContent = t ? t.label : '';
  setHelp(false);
  emit();
}

export function close() {
  current = null;
  side.classList.remove('show');
  document.body.classList.remove('side-open');
  bar.querySelectorAll('[data-tab]').forEach((b) => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  setHelp(false);
  emit();
}

export function toggle(name) { (current === name ? close() : open(name)); }

function setHelp(on) {
  helpOpen = !!on && !!current;
  const el = document.getElementById('pd-help'), btn = document.getElementById('pd-side-help');
  if (!el) return;
  el.hidden = !helpOpen;
  if (helpOpen) el.innerHTML = HELP[current] || '';
  if (btn) { btn.classList.toggle('on', helpOpen); btn.setAttribute('aria-expanded', helpOpen ? 'true' : 'false'); }
}

function emit() { for (const f of subs) { try { f(current); } catch (e) { console.error(e); } } }
