// netlify/functions/day-brain.js
// The brain behind Reggie's day tracker (/day/). Personal use, one person.
// Reuses the site's ANTHROPIC_API_KEY (same env var the AI coach uses).
//
// Modes (body.mode):
//   command   spoken words about the day -> a list of operations the app applies
//   food      a photo and/or words about a meal -> one food line with macros + micros
//   physique  front/side photos -> an estimated body-fat range
//   wrap      the spoken end-of-day wrap -> a short tidy version plus a title
//
// Every mode answers with JSON only. The app never trusts the shape blindly:
// it checks each op before applying it, and an unparsable answer is reported
// as an error rather than half-applied.

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = 'claude-sonnet-5';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

function json(status, body) {
  return { statusCode: status, headers: CORS, body: JSON.stringify(body) };
}

const NO_DASHES = 'PUNCTUATION: never use em dashes or en dashes in any output. Use periods, commas, or colons.';

const COMMAND_SYSTEM = `You are the brain of a personal day tracker. One person (Reggie) talks into his phone about his day: meals, tasks, workouts, basketball, water, weight, how he feels. You turn what he said into operations the app applies immediately. He can undo anything, so be decisive: infer the obvious, never ask him to clarify.

You receive NOW (local date and time), the STATE of today and the next few days as JSON (every item has an id), and what he SAID.

Reply with ONE JSON object and nothing else:
{
  "say": "one short plain sentence back to him, like a friend confirming, max 14 words",
  "ops": [ ... ]
}

Allowed ops (use the ids from STATE; never invent an id):
  {"op":"complete","target":"task"|"meal","id":"..."}            he did it / ate it
  {"op":"uncomplete","target":"task"|"meal","id":"..."}
  {"op":"skip","target":"task"|"meal","id":"...","reason":"..."}  not doing it today, no move
  {"op":"move","target":"task"|"meal","id":"...","toDate":"YYYY-MM-DD","time":"HH:MM" optional}   push to another day (tomorrow = NOW date + 1)
  {"op":"reschedule","target":"task"|"meal","id":"...","time":"HH:MM"}   same day, new time (24h)
  {"op":"swap_meal","id":"...","name":"...","cal":n,"protein":n,"carbs":n,"fat":n}   he ate something else in that slot; estimate macros for a normal portion; marks it done
  {"op":"log_food","slot":"...","name":"...","cal":n,"protein":n,"carbs":n,"fat":n}   an extra thing eaten, not replacing a planned meal; slot is one of the slot names in STATE (Coffee, Hydration, Meal 1, ...) or "Extra"
  {"op":"add_task","name":"...","date":"YYYY-MM-DD","time":"HH:MM" optional}
  {"op":"add_meal","slot":"...","name":"...","date":"YYYY-MM-DD","time":"HH:MM" optional,"cal":n,"protein":n,"carbs":n,"fat":n}
  {"op":"remove","target":"task"|"meal","id":"..."}
  {"op":"water","count":n}            total bottles so far today (if he says "one more", add 1 to STATE water.count)
  {"op":"log_weight","lb":n,"date":"YYYY-MM-DD"}
  {"op":"note","text":"..."}          anything worth keeping that is not an item
  {"op":"log_steps","steps":n}        his step count so far today ("I'm at 14k steps" = 14000)
  {"op":"answer","text":"..."}        he asked a question (what is left, what is next, how many steps); answer from STATE in one or two sentences

Rules:
- Match items by meaning, not exact words. "gym" matches "Gym · push day". "the Bears thing" matches "Cut the Bears intro". "dinner" matches the Dinner slot meal.
- "Push it to tomorrow", "move it to Friday", "do it Saturday" are move ops. Times like "eight", "8", "8pm" in the evening mean 20:00; use NOW to resolve am/pm sensibly.
- "Instead of X I had Y" is swap_meal on X's slot. "I also had a protein bar" is log_food.
- His plan, in order: two coffees (Stok cold brew with protein powder), MiO hydration packs at 12:30 and 5, Meal 1 at 3 (savory crepe + ground beef), a berry creami after each meal, a diet soda between meals, Meal 2 at 9 (chicken bowl + tomato soup), and at 11 two protein bars plus a protein creami. "Had my coffee" means the first coffee not yet done. "The crepe" or "first meal" is Meal 1. "The bowl" or "chicken" is Meal 2. "Creami" alone means the next creami not yet done; "protein creami" is the 11 PM one. He fasts until mid-afternoon, so an early "ate" usually means a coffee or a hydration pack.
- Walks are tasks with a time window (2 to 3, 8 to 9, 10 to 11 most days; 2:30 to 3 on gym days). "Did my walk" means the walk closest to NOW that is not done. "Walked" plus a step count is complete the walk AND log_steps.
- If he says he could not do something and gives no new day, use skip, not move.
- Several things in one breath means several ops, in the order he said them.
- If nothing actionable was said, return an empty ops array and a "say" that reflects what you heard.
- Macro estimates are for a normal single portion, whole numbers. Calories in kcal, macros in grams.
${NO_DASHES}`;

const FOOD_SYSTEM = `You read a meal from a photo and/or a spoken description and estimate its nutrition for a personal tracker. One person, his own food, he can correct you by voice afterwards, so give your best single estimate rather than hedging.

Reply with ONE JSON object and nothing else:
{
  "name": "short plain name, like Chicken bowl, rice, avocado",
  "portion": "one short phrase, like About 1.5 cups",
  "cal": n, "protein": n, "carbs": n, "fat": n,
  "micros": {"fiber_g": n, "sodium_mg": n, "potassium_mg": n, "iron_mg": n, "vitamin_c_mg": n, "calcium_mg": n, "vitamin_d_mcg": n, "magnesium_mg": n},
  "confidence": "high"|"medium"|"low",
  "note": "one short sentence on what would change the estimate most, or empty"
}
Whole numbers everywhere. If the words and the photo disagree, the words win (he is describing what he actually ate). ${NO_DASHES}`;

const PHYSIQUE_SYSTEM = `You estimate body-fat percentage from physique photos for one person's own private tracker. He knows this is an estimate and reads it as a trend, week over week, alongside a tape measurement. Give a range, not false precision. Front and side views in similar light and pose each week are what he aims for.

Reply with ONE JSON object and nothing else:
{
  "low": n, "high": n,
  "mid": n,
  "read": "two short sentences on what you see: where fat sits, what definition shows, what changed if a previous estimate is given",
  "photo_tip": "one short sentence on how to make next week's photos more comparable, or empty"
}
Whole numbers. A single photo gets a range about 6 points wide; front plus side about 4. Be direct and matter-of-fact, never judgmental. ${NO_DASHES}`;

const WRAP_SYSTEM = `Tidy a spoken end-of-day wrap-up into a short written entry for one person's private journal. Keep his own words and tone, trim filler and restarts, do not add anything he did not say, no advice.

Reply with ONE JSON object and nothing else:
{
  "title": "a plain label for the day in under eight words",
  "lines": ["two to five short lines in his words"],
  "mood": "one word he would use, taken from what he said, or empty"
}
${NO_DASHES}`;

function imageBlocks(images) {
  return (images || []).slice(0, 4).map((img) => {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/i.exec(img || '');
    if (!m) return null;
    return { type: 'image', source: { type: 'base64', media_type: m[1].toLowerCase(), data: m[2] } };
  }).filter(Boolean);
}

function parseJson(text) {
  let t = (text || '').trim();
  t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < 0) throw new Error('no json in answer');
  return JSON.parse(t.slice(a, b + 1));
}

async function ask(system, content, maxTokens) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`model ${res.status}: ${data?.error?.message || 'unknown'}`);
  const text = (data.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n');
  return { parsed: parseJson(text), usage: data.usage };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  if (!ANTHROPIC_API_KEY) return json(500, { error: 'ANTHROPIC_API_KEY is not set on this site' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'bad json' }); }
  const mode = body.mode || 'command';

  try {
    if (mode === 'command') {
      const transcript = String(body.transcript || '').trim();
      if (!transcript) return json(400, { error: 'nothing said' });
      const user =
        `NOW: ${body.now || ''} (${body.weekday || ''})\n` +
        `TOMORROW: ${body.tomorrow || ''}\n\n` +
        `STATE:\n${JSON.stringify(body.state || {})}\n\n` +
        `SAID:\n${transcript}`;
      const { parsed, usage } = await ask(COMMAND_SYSTEM, [{ type: 'text', text: user }], 1500);
      const ops = Array.isArray(parsed.ops) ? parsed.ops : [];
      return json(200, { say: String(parsed.say || ''), ops, usage });
    }

    if (mode === 'food') {
      const blocks = imageBlocks(body.images);
      const words = String(body.transcript || '').trim();
      if (!blocks.length && !words) return json(400, { error: 'need a photo or some words' });
      const text = (words ? `HE SAID: ${words}\n` : '') + (blocks.length ? 'Read the photo.' : '') + '\nReturn the JSON.';
      const { parsed, usage } = await ask(FOOD_SYSTEM, [...blocks, { type: 'text', text }], 700);
      return json(200, { food: parsed, usage });
    }

    if (mode === 'physique') {
      const blocks = imageBlocks(body.images);
      if (!blocks.length) return json(400, { error: 'need at least one photo' });
      const extra = [];
      if (body.previous) extra.push(`PREVIOUS ESTIMATE: ${JSON.stringify(body.previous)}`);
      if (body.tape) extra.push(`TAPE (Navy formula): ${JSON.stringify(body.tape)}`);
      if (body.weight) extra.push(`WEIGHT: ${body.weight} lb`);
      const text = (extra.join('\n') || 'No previous data.') + '\nReturn the JSON.';
      const { parsed, usage } = await ask(PHYSIQUE_SYSTEM, [...blocks, { type: 'text', text }], 500);
      return json(200, { physique: parsed, usage });
    }

    if (mode === 'wrap') {
      const transcript = String(body.transcript || '').trim();
      if (!transcript) return json(400, { error: 'nothing said' });
      const text = `DATE: ${body.now || ''}\nSCORE: ${body.score ?? ''}\n\nHE SAID:\n${transcript}`;
      const { parsed, usage } = await ask(WRAP_SYSTEM, [{ type: 'text', text }], 600);
      return json(200, { wrap: parsed, usage });
    }

    return json(400, { error: `unknown mode ${mode}` });
  } catch (err) {
    return json(502, { error: err.message || 'brain failed' });
  }
};
