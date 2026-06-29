// netlify/functions/ai-coach.js
// AI Coaching proxy — keeps the Anthropic key server-side.
// Env vars required in Netlify dashboard:
//   SUPABASE_URL        (same project URL as the app)
//   SUPABASE_ANON_KEY   (public anon key)
//   ANTHROPIC_API_KEY   (secret — never in client code)

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const SESSIONS_PER_MONTH = 10;

// King Reggie's distilled football understanding + voice — rides every "coach" call.
// (Condensed from FOOTBALL-BRAIN.md. The installed-scheme play data layers in on top of this later.)
const FOOTBALL_BRAIN = `HOW KING REGGIE THINKS ABOUT FOOTBALL — reason like this:
1. This is ONLINE video-game football, not real football. You've never seen this opponent, so DIAGNOSE first: open with a run and easy quick reads to see man vs zone and whether they blitz, THEN attack. Don't hunt shots until you know the coverage. (Exception: CFM/Dynasty — you can scout.)
2. It's all about the USER — the human-controlled defender (usually the Mike) who sees the whole field at once. Every decision runs through: where is the user → attack away from him, or pull him out of position and hit the grass he leaves. That's constraint football: run something (RB swing, screen) to bait him, then take what he vacates.
3. Read man vs zone FAST: a defender turning his hips and running with a receiver = man; a defender over the top sinking to a flat/hook = zone. Reads are flexible, not a rigid 1-2-3 — take what they give, pre-read pre-snap.
4. Attack ZONE by creating grass: sit in the windows, flood a side (more bodies than defenders), high-low a defender, pull one zone defender to open another, hit the grass the user vacates with crossers/digs, and use play-action to drag the LBs/user down then throw behind them.
5. Attack MAN with separation and keeping the ball away from the user: hard-breaking routes (outs, comebacks, whips, slants), picks/rubs/mesh, isolate a burner in space, out-breakers to the sideline (away from the user), motion to confirm man + create leverage, scramble drill if it breaks down.
6. Take shots only once you UNDERSTAND the coverage AND have something cooked for that look.
7. Offense identity varies by scheme: pro-style = downhill run then PA off the same look; spread = spacing/tempo/RPO/QB legs; option = make every defender right or get gashed; wide zone = run blend + elite PA + motion to get playmakers in space. Universal threads: constraint play-calling, motion to diagnose/create, get playmakers the ball in space.
8. Defense: stop the run first, force predictable passing, then confuse. MATCH coverage is the foundation (aggressive zone with rules — read receivers post-snap, lock man / double / play zone; corners MOD, backside MEG). DISGUISE — show one shell pre-snap, rotate post-snap. Pick ONE identity: blitz-heavy (force them to keep blockers in, then drop and confuse) OR coverage-heavy (~70% coverage so they send everyone out, then steal a free blitz). USER the linebacker (Mike / 3-rec hook) normally; user the SAFETIES in match (Quarters/Palms).
VOICE: confident, declarative, teach the WHY before the HOW, calm when they're tilted ("keep it calm, back to the playbook, we know what to do"). Real coach on the headset — tight, no bullet points.`;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
};

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  // ── Auth ────────────────────────────────────────────────────────────────────
  const authHeader = (event.headers.authorization || event.headers.Authorization || '').trim();
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json(401, { error: 'No auth token' });

  const sbHeaders = {
    apikey:        SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  const userRes  = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: sbHeaders });
  const userData = await userRes.json();
  if (!userData.id) return json(401, { error: 'Invalid or expired session' });
  const userId = userData.id;

  // ── Onboarding welcome recommendation ────────────────────────────────────────
  // Runs during profile setup, before any games are logged. Does NOT count against
  // the monthly session limit and is not recorded as a coaching session. Prompt is
  // built server-side from posted profile fields (no game data needed yet).
  let obBody = {};
  try { obBody = JSON.parse(event.body || '{}'); } catch (_) {}
  if (obBody.mode === 'onboarding') {
    const p = obBody.profile || {};
    const obSystem = `You are an elite video game football coach for CFB 26 and Madden 27, welcoming a brand-new Scheme Kings member who just built their coach profile. Write a short, warm, specific welcome recommendation. Talk like a real coach — direct and encouraging, never generic. No bullet points.`;
    const obPrompt = `A new member just finished setting up their coach.

THEIR COACH PROFILE:
- Coaching Style: ${p.coaching_style || 'Not set'}
- Role: ${p.role || 'Head Coach'}
- Philosophy: ${p.philosophy || 'Not set'}
- Goal: ${p.goal || 'Not set'}
- Scheme Approach: ${p.scheme_approach || 'Not set'}
- Primary Game: ${p.primary_game || 'Not specified'} (${p.game_mode || 'mode not set'})
- Experience: ${p.experience_level || 'Not set'}
- Offensive lean: ${p.offense_style || 'Not set'} | Defensive lean: ${p.defense_style || 'Not set'}
${p.onboarding_notes ? `- Their notes: ${p.onboarding_notes}` : ''}

Respond in exactly this format, using these exact bold headers, each section 1-2 sentences:

**Where to Start:** Name 1-2 specific scheme types from the Scheme Kings library that fit their style and preferences. Be concrete (e.g. "RPO-heavy spread", "power run game out of I-form", "cover-2 shell with edge pressure").
**Your Edge:** One sentence on the strength their build leans into.
**Log to Unlock:** Encourage them to log their games — the more they log, the sharper their stats and AI coaching get.`;

    let obText = '';
    try {
      const ar = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model:      'claude-haiku-4-5-20251001',
          max_tokens: 350,
          system:     obSystem,
          messages:   [{ role: 'user', content: obPrompt }]
        })
      });
      const ad = await ar.json();
      obText = ad.content?.[0]?.text || '';
    } catch (_) { obText = ''; }
    if (!obText) return json(500, { error: 'AI service unavailable' });
    return json(200, { response: obText });
  }

  // ── Second Brain: live "Talk to Your Coach" chat ─────────────────────────────
  // Credit-metered (handled client-side), NOT capped by the monthly session limit.
  // Briefed from the member's Second Brain profile (their intake answers). The full
  // three-layer briefing (Football Brain voice doc + installed scheme data) layers in here later.
  if (obBody.mode === 'coach') {
    const b = obBody.brain || {};
    const raw = Array.isArray(obBody.messages) ? obBody.messages.slice(-12) : [];
    const messages = raw
      .filter(m => m && m.content && (m.role === 'user' || m.role === 'assistant'))
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }));
    const cname = b.display_name || 'coach';

    // ── Post-game DEBRIEF: summarize the in-game conversation into a short coach's note ──
    // Fires once when a game is logged out of an In-Game chat. The transcript comes in as
    // `messages` (ends on the coach's turn, so it skips the user-message guard below) and the
    // logged game facts come in as `game`. Returns one tight paragraph in the coach's voice.
    if ((obBody.context || '') === 'debrief') {
      const g = obBody.game || {};
      const transcript = messages
        .map(m => `${m.role === 'user' ? cname : 'Coach'}: ${String(m.content).slice(0, 1500)}`)
        .join('\n');
      const dSystem = `${FOOTBALL_BRAIN}

You just coached ${cname} through a game of CFB 26 / Madden live on the headset. Write a SHORT post-game debrief in your coach voice — 3 to 4 sentences, ONE tight paragraph, no bullet points, no headers. Recap how it actually went: what the opponent was doing, how ${cname} adjusted, what worked, and ONE thing to clean up next time. Talk straight TO ${cname} ("you"). Weave the result in naturally, don't recite the score robotically. Be specific to what really happened in the conversation — if the conversation was thin, keep it short and honest rather than inventing detail.`;
      const dUser = `GAME: ${g.your_team || 'You'} vs ${g.opponent || 'the opponent'} — ${g.result || 'result n/a'}${g.game ? ` (${g.game})` : ''}.
${g.what_worked ? `What they said worked: ${g.what_worked}.` : ''}${g.biggest_struggle ? ` Biggest struggle: ${g.biggest_struggle}.` : ''}

OUR IN-GAME CONVERSATION:
${transcript || '(no conversation captured)'}

Write the debrief now.`;
      let dText = '', dUsage = null;
      try {
        const ar = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 300, system: dSystem, messages: [{ role: 'user', content: dUser }] })
        });
        const ad = await ar.json();
        dText = ad.content?.[0]?.text || '';
        dUsage = ad.usage || null;
      } catch (_) { dText = ''; }
      if (!dText) return json(500, { error: 'AI service unavailable' });
      let dcost = 8;
      if (dUsage) dcost = Math.max(1, Math.round((dUsage.input_tokens || 0) * 0.002 + (dUsage.output_tokens || 0) * 0.01));
      return json(200, { response: dText, cost: dcost });
    }

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      return json(400, { error: 'No user message' });
    }

    // Pull the member's logged-game data for a quick form/tendency brief.
    let statsLine = '';
    try {
      const gr = await fetch(`${SUPABASE_URL}/rest/v1/performance_cards?member_id=eq.${userId}&select=result,performance_score,scheme_id,what_worked,biggest_struggle&order=created_at.desc&limit=20`, { headers: sbHeaders });
      const games = await gr.json();
      if (Array.isArray(games) && games.length) {
        const wins = games.filter(g => g.result === 'Win').length;
        const losses = games.filter(g => g.result === 'Loss').length;
        const recent = games.slice(0, 5).map(g => g.result === 'Win' ? 'W' : 'L').join('-');
        let streak = 0, st = '';
        for (const g of games) { if (!st) { st = g.result; streak = 1; } else if (g.result === st) streak++; else break; }
        const freq = k => { const f = {}; games.forEach(g => { if (g[k]) f[g[k]] = (f[g[k]] || 0) + 1; }); return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]).join('; '); };
        statsLine = `LOGGED GAMES (${games.length}): ${wins}W-${losses}L | recent ${recent || 'n/a'} | ${streak > 1 ? `${streak}-game ${st} streak` : 'no current streak'} | working: ${freq('what_worked') || 'n/a'} | struggling: ${freq('biggest_struggle') || 'n/a'}.`;
      }
    } catch (_) { /* non-fatal */ }

    const ctx = obBody.context || 'free';
    const ctxFrame = ({
      ingame:   `MODE: IN-GAME (live). You are on the headset mid-drive, right now. Be FAST and TERSE — under 70 words, get straight to the call or the read. Diagnose-first if they don't know the coverage yet. No preamble, no lists. Talk like you're in their ear between snaps.`,
      practice: `MODE: PRACTICE (out of game). You're game-planning and teaching, not mid-snap. You can go a bit longer (up to ~220 words), explain the WHY, build a plan, or drill a concept. Still no bullet points — coach talk.`,
      guided:   `MODE: GUIDED. They used the question tree to specify exactly what they need. Give a sharp, specific answer to that exact request — name concrete looks/calls from their scheme. Under 170 words.`,
      free:     `MODE: FREE TALK. Open conversation. Answer whatever they ask, tight and specific, under 160 words.`
    })[ctx] || `MODE: FREE TALK. Under 160 words.`;

    const coachSystem = `${FOOTBALL_BRAIN}

You are coaching ${cname} for CFB 26 / Madden, like a real coach on the headset. Teach the WHY before the HOW. Never use bullet points or headers. Open by proving you know THEIR specifics (their scheme, a tendency, or their recent form) when relevant, then give a concrete answer. Coach through their profile and scheme below, in their language.

${ctxFrame}

${cname.toUpperCase()}'S SECOND BRAIN PROFILE:
${JSON.stringify(b, null, 1).slice(0, 5000)}
${statsLine ? '\n' + statsLine : ''}`;

    let cText = '', usage = null;
    try {
      const ar = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        // cache_control on the system block: the coaching brain + profile are identical across a
        // session, so messages after the first hit the cache (~10x cheaper input). 5-min TTL fits
        // a live in-game chat. Prompt caching is GA; no beta header needed.
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 500, system: [{ type: 'text', text: coachSystem, cache_control: { type: 'ephemeral' } }], messages })
      });
      const ad = await ar.json();
      cText = ad.content?.[0]?.text || '';
      usage = ad.usage || null;
    } catch (_) { cText = ''; }
    if (!cText) return json(500, { error: 'AI service unavailable' });
    // credits ≈ real token cost (10,000 credits ≈ $5 of Haiku). With prompt caching the bulk of the
    // input (brain + football brain) is a cache READ at ~0.1x, so repeat in-game messages cost ~1-2.
    let cost = 6;
    if (usage) {
      const inp = usage.input_tokens || 0;
      const cacheRead = usage.cache_read_input_tokens || 0;
      const cacheWrite = usage.cache_creation_input_tokens || 0;
      const out = usage.output_tokens || 0;
      cost = Math.max(1, Math.round(inp * 0.002 + cacheRead * 0.0002 + cacheWrite * 0.0025 + out * 0.01));
    }
    return json(200, { response: cText, cost });
  }

  // ── Session limit ────────────────────────────────────────────────────────────
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);

  let usedThisMonth = 0;
  try {
    const cr = await fetch(
      `${SUPABASE_URL}/rest/v1/coaching_sessions?select=id&member_id=eq.${userId}&created_at=gte.${monthStart.toISOString()}`,
      { headers: { ...sbHeaders, Prefer: 'count=exact', Range: '0-0' } }
    );
    const range = cr.headers.get('Content-Range') || '';
    usedThisMonth = parseInt(range.split('/')[1]) || 0;
  } catch (_) { /* table may not exist yet — allow */ }

  if (usedThisMonth >= SESSIONS_PER_MONTH) {
    return json(429, { error: 'Monthly session limit reached', limit: SESSIONS_PER_MONTH });
  }

  // ── Parse body ───────────────────────────────────────────────────────────────
  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  // New stepped-flow fields (with legacy fallbacks)
  const side      = body.side      || body.topic    || '';
  const scheme_id = body.scheme_id || '';
  const scheme_name = body.scheme_name || body.scheme || '';
  const area      = body.area      || body.situation || body.struggle || '';
  const help_type = body.help_type || body.focus     || '';
  const notes     = body.notes     || '';

  // ── Fetch member + game data ─────────────────────────────────────────────────
  const fetchList = [
    fetch(`${SUPABASE_URL}/rest/v1/members?member_id=eq.${userId}&select=display_name,coach_title,coach_profile,primary_game,game_mode&limit=1`, { headers: sbHeaders }),
    fetch(`${SUPABASE_URL}/rest/v1/performance_cards?member_id=eq.${userId}&select=result,performance_score,scheme_id,what_worked,biggest_struggle,created_at&order=created_at.desc&limit=20`, { headers: sbHeaders })
  ];

  if (scheme_id) {
    fetchList.push(
      fetch(`${SUPABASE_URL}/rest/v1/performance_cards?member_id=eq.${userId}&scheme_id=eq.${scheme_id}&select=result,what_worked,biggest_struggle,performance_score&order=created_at.desc&limit=20`, { headers: sbHeaders })
    );
  }

  const responses = await Promise.all(fetchList);
  const jsonData  = await Promise.all(responses.map(r => r.json()));
  const [memberArr, gamesArr, schemeGamesRaw] = jsonData;

  const member = (Array.isArray(memberArr) ? memberArr[0] : null) || {};
  const games  = Array.isArray(gamesArr) ? gamesArr : [];

  // ── Overall stats ─────────────────────────────────────────────────────────────
  const total   = games.length;
  const wins    = games.filter(g => g.result === 'Win').length;
  const losses  = games.filter(g => g.result === 'Loss').length;
  const winPct  = total > 0 ? Math.round(wins / total * 100) : 0;
  const recent5 = games.slice(0, 5).map(g => g.result === 'Win' ? 'W' : 'L').join('-');
  const avgScore = total > 0
    ? (games.reduce((s, g) => s + (g.performance_score || 0), 0) / total).toFixed(1)
    : '0';

  let streak = 0, streakType = '';
  for (const g of games) {
    if (!streakType) { streakType = g.result; streak = 1; }
    else if (g.result === streakType) streak++;
    else break;
  }
  const streakLine = streak > 1 ? `${streak}-game ${streakType} streak` : 'no current streak';

  const schemeMap = {};
  games.forEach(g => {
    if (!g.scheme_id) return;
    schemeMap[g.scheme_id] = schemeMap[g.scheme_id] || { w: 0, t: 0 };
    schemeMap[g.scheme_id].t++;
    if (g.result === 'Win') schemeMap[g.scheme_id].w++;
  });
  const topScheme = Object.entries(schemeMap).sort((a, b) => b[1].t - a[1].t)[0];

  const freq = (key, data = games) => {
    const f = {};
    (data || []).forEach(g => { if (g[key]) f[g[key]] = (f[g[key]] || 0) + 1; });
    return Object.entries(f).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]).join('; ');
  };
  const topWorked   = freq('what_worked');
  const topStruggle = freq('biggest_struggle');

  // ── Scheme-specific stats ─────────────────────────────────────────────────────
  let schemeContext = '';
  if (scheme_id && Array.isArray(schemeGamesRaw) && schemeGamesRaw.length > 0) {
    const sg = schemeGamesRaw;
    const sw = sg.filter(g => g.result === 'Win').length;
    const sl = sg.filter(g => g.result === 'Loss').length;
    const sAvg = (sg.reduce((s, g) => s + (g.performance_score || 0), 0) / sg.length).toFixed(1);
    const sWorked   = freq('what_worked', sg);
    const sStruggle = freq('biggest_struggle', sg);
    schemeContext = `
SCHEME DEEP DIVE — ${scheme_name || 'Selected scheme'} (${sg.length} games):
Record with this scheme: ${sw}W-${sl}L | Avg score: ${sAvg}/10
${sWorked   ? `What's worked in this scheme: ${sWorked}`   : ''}
${sStruggle ? `Struggles in this scheme: ${sStruggle}` : ''}`.trim();
  }

  // ── Coach identity ─────────────────────────────────────────────────────────────
  const cp    = member.coach_profile || {};
  const name  = member.display_name  || 'Coach';
  const title = member.coach_title   || '';

  // ── Build prompts ─────────────────────────────────────────────────────────────
  const system = `You are an elite video game football coach specializing in CFB 26 and Madden 27. You give sharp, personalized coaching advice grounded entirely in each member's real logged game data. You write like a real football coach talking to a player — direct, specific, encouraging. Never use bullet points or generic advice. Keep responses between 160 and 240 words.`;

  const userPrompt = `You are coaching ${name}${title ? `, the ${title}` : ''}.

COACHING PROFILE:
Role: ${cp.role || 'Head Coach'} | Style: ${cp.coaching_style || 'Not set'} | Philosophy: ${cp.philosophy || 'Not set'} | Goal: ${cp.goal || 'Not set'}
Game: ${member.primary_game || 'Not specified'} | Mode: ${member.game_mode || 'Not specified'}

OVERALL GAME DATA (${total} games logged):
Record: ${wins}W-${losses}L (${winPct}% win rate) | Recent form: ${recent5 || 'none yet'} | Streak: ${streakLine} | Avg score: ${avgScore}/10
${topScheme ? `Most used scheme: ${topScheme[0]} — ${topScheme[1].w}W-${topScheme[1].t - topScheme[1].w}L in ${topScheme[1].t} games` : ''}
${topWorked   ? `What's been working overall: ${topWorked}`   : ''}
${topStruggle ? `Recurring struggles overall: ${topStruggle}` : ''}
${schemeContext ? `\n${schemeContext}` : ''}

TODAY'S SESSION:
Side of the ball: ${side || 'General'}
${scheme_name ? `Scheme: ${scheme_name}` : ''}
Focus area: ${area || 'Not specified'}
Type of help: ${help_type || 'General breakdown'}
${notes ? `Their words: "${notes}"` : ''}

IMPORTANT: Open with 1-2 sentences that prove you know their specific data — mention their actual record, streak, or scheme-specific stats if a scheme was chosen. Then give concrete, actionable coaching. End with one specific thing to focus on next game. No bullet points. Coach talk only.`;

  // ── Call Anthropic ────────────────────────────────────────────────────────────
  let response = '';
  try {
    const ar = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 450,
        system,
        messages: [{ role: 'user', content: userPrompt }]
      })
    });
    const ad = await ar.json();
    response = ad.content?.[0]?.text || '';
    if (!response) return json(500, { error: 'Empty AI response' });
  } catch (_) {
    return json(500, { error: 'AI service unavailable' });
  }

  // ── Record session (best-effort) ──────────────────────────────────────────────
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/coaching_sessions`, {
      method:  'POST',
      headers: { ...sbHeaders, Prefer: 'return=minimal' },
      body:    JSON.stringify({
        member_id:        userId,
        topic:            side     || null,
        tags:             { side, scheme_id, scheme_name, area, help_type },
        notes:            notes    || null,
        response_preview: response.slice(0, 400)
      })
    });
  } catch (_) { /* non-fatal */ }

  return json(200, {
    response,
    sessionsUsed: usedThisMonth + 1,
    sessionsLeft: SESSIONS_PER_MONTH - usedThisMonth - 1
  });
};
