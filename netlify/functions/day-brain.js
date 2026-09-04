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

You receive NOW (local date and time), his PROFILE and GOALS, the STATE of today and the next few days as JSON (every item has an id, plus his standing meal plan under STATE.plan with a "pid" for each row, today's macro totals, water, steps, latest weight and trend, resting heart rate, energy burned), the recent HISTORY of this conversation (his words and your replies), and what he SAID now. He can also attach PHOTOS.

He can also just talk to you: ask about his plan, his numbers, what to eat, whether the day is on track, or ask you to clarify something you said earlier. For that, put the full reply in ONE "answer" op. It can be several sentences, plain and specific, using his real numbers. Never say "consult a professional" style filler. Do not repeat the answer in "say".

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
  {"op":"note","title":"...","text":"...","bucket":"..."}   a thought worth keeping that is not an errand and not an item. "text" is everything he said about it, tidied but not shortened. "title" is a short label for the list, under about eight words, specific enough to recognise later ("Bears run game out of heavy" beats "Video idea").
  {"op":"add_reminder","text":"..."}  an errand or one-off he needs to do soon ("grab eggs on my walk", "book the dentist")
  {"op":"done_reminder","id":"..."}   he did one of the open reminders in STATE (use its id)
  {"op":"log_steps","steps":n}        his step count so far today ("I'm at 14k steps" = 14000)
  {"op":"answer","text":"..."}        he asked something or wants to talk; the full reply goes here (short for "what is next", longer for real questions)
  {"op":"edit_plan","pid":"...","name":"...","parts":"...","cal":n,"protein":n,"carbs":n,"fat":n,"micros":{"sodium_mg":n,"potassium_mg":n,...}}
        a STANDING change to his meal plan, every day from now on, not just today. "pid" comes from STATE.plan. Send only the fields that actually change; anything you leave out keeps its current value.

Rules:
- Match items by meaning, not exact words. "gym" matches "Gym · push day". "the Bears thing" matches "Cut the Bears intro". "dinner" matches the Dinner slot meal.
- "Push it to tomorrow", "move it to Friday", "do it Saturday" are move ops. Times like "eight", "8", "8pm" in the evening mean 20:00; use NOW to resolve am/pm sensibly.
- "Instead of X I had Y" is swap_meal on X's slot. "I also had a protein bar" is log_food.
- His plan, in order: two coffees (Stok cold brew with Revolution whey), MiO Hydrate packs at 12:30 and 5, Meal 1 at 3 (savory crepe + extra lean ground beef), a berry creami after each meal, a Crush Zero between meals, Meal 2 at 9 (chicken bowl + tomato soup), and at 11 two Nature Valley protein bars plus a protein creami. "Had my coffee" means the first coffee not yet done. "The crepe" or "first meal" is Meal 1. "The bowl" or "chicken" is Meal 2. "Creami" alone means the next creami not yet done; "protein creami" is the 11 PM one. "A bar" completes one bar, "the bars" completes both. He fasts until mid-afternoon, so an early "ate" usually means a coffee or a hydration pack.
- The plan totals about 2040 cal, 180 g protein, 190 g carbs, 67 g fat, 4200 mg sodium and 5900 mg potassium a day. When he asks about swapping something, use the real per-item numbers in STATE, not round guesses.
- Walks are tasks with a time window (2 to 3, 8 to 9, 10 to 11 most days; 2:30 to 3 on gym days). "Did my walk" means the walk closest to NOW that is not done. "Walked" plus a step count is complete the walk AND log_steps.

PHOTOS. He photographs things and expects you to read them, usually a package he just bought. Most often it is a nutrition label he wants swapped into his plan: "I got this rice instead", "use these tomatoes".
- Read the label properly. Note the SERVING SIZE first, then scale to the amount he actually uses. STATE.plan holds his real portions in "parts" (for example 145 g of the riced veg blend, 350 g of soup). If the amount is not changing, keep his portion and only recompute the numbers for the new product. If the label is per 100 g and he uses 145 g, multiply by 1.45. Do the arithmetic; do not copy the per-serving figures across unchanged.
- Then use edit_plan on the right pid, sending the new name, the new "parts" text with his portion in it, and every macro and micro that changed. Sodium and potassium matter to him more than most, so always carry those.
- Say what actually changed in the numbers, briefly, in the "say" line: "Sodium drops 597 mg a day."
- A photo of a cooked meal or a plate is log_food or swap_meal for today, NOT edit_plan. A photo of a receipt or a shopping list is a reminder or a note. A Fitbit screenshot means log_steps or log_weight from what it shows.
- If a label is blurry or cut off, use what you can read and say which part you could not; never invent a number you cannot see. If you genuinely cannot tell what the photo is, say so in an answer op rather than guessing at ops.
- When he sends a photo and says nothing, assume he means "read this and put it where it belongs", and tell him what you did.

NOTES VERSUS REMINDERS. Three different things, and picking the right one is most of the job here:
  - Something he must DO soon, usually an errand: add_reminder. "I need to grab eggs on my walk", "remind me to book the dentist", "pick up more protein powder". These sit on a strip at the bottom of his screen until he taps them off. Keep the text short and imperative, the way he would read it in passing: "Grab eggs and coffee".
  - Something he wants to KEEP, an idea or a thought with no deadline: note, with a bucket. Pick the bucket from the ones already in STATE when one fits, otherwise make a short new one. He runs a YouTube channel about Madden and college football schemes (Scheme Kings), so content ideas are common: bucket them as "Content". Other natural buckets: Training, Food, Money, Home, Random. One or two words, capitalised.
  - Something scheduled at a time, or part of his plan: that is add_task or a meal op, not a reminder.
When he is clearly dumping a thought ("idea for a video about...", "thinking about...", "note that..."), use note. When it has a verb he owes someone or himself, use add_reminder. If he says he did an errand that is on the open list, use done_reminder with that id.
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

const PHYSIQUE_SYSTEM = `You estimate body-fat percentage from physique photos for one person's own private tracker. He knows this is an estimate and reads it as a trend, week over week. Give a range, not false precision. Front and side views in similar light and pose each week are what he aims for.

Reply with ONE JSON object and nothing else:
{
  "low": n, "high": n,
  "mid": n,
  "read": "two short sentences on what you see: where fat sits, what definition shows, what changed if a previous estimate is given",
  "photo_tip": "one short sentence on how to make next week's photos more comparable, or empty"
}
Whole numbers. A single photo gets a range about 6 points wide; front plus side about 4. Be direct and matter-of-fact, never judgmental. ${NO_DASHES}`;

const REVIEW_SYSTEM = `You review one person's day for his private tracker and tell him straight how it went and what the scale is likely to do. You get his PROFILE, GOALS, and the DAY: every planned item with whether it was done, the macro and micro totals of what he actually ate, water, steps against his goal, walks and workouts done or missed, his latest weight and trend, resting heart rate, and average energy burned.

Reply with ONE JSON object and nothing else:
{
  "title": "a plain four to seven word label for the day",
  "lines": ["four to seven short lines: food against his goals (protein, calories, what was skipped or swapped), movement (steps, walks, gym or basketball), hydration and sodium/potassium, anything from heart rate or trend worth noting, and errands still open if any are sitting there"],
  "weight_outlook": "two or three sentences on what tomorrow's scale is likely to show and why: sodium and carbs pull water in, a big deficit plus 20k steps pulls it down, a late heavy meal shows as a morning bump. Give a rough number range if you can, framed as an estimate.",
  "tomorrow": "one concrete thing to do tomorrow",
  "grade": "A"|"B"|"C"|"D"
}
Be direct and specific with his numbers, like a coach who knows him, never preachy. If the day is incomplete (items still to come tonight), say so and review what is there. ${NO_DASHES}`;

const WEEK_SYSTEM = `You review one person's week for his private tracker: the pattern, not the day. You get his PROFILE, GOALS, and WEEK: seven days each with its score, what was eaten against his targets, steps, workouts and walks done or missed, plus his weigh-ins across the period, resting heart rate and average energy burned.

The daily review already tells him about yesterday. Your job is the thing only a week can show: whether the pattern holds, which day of the week keeps breaking, whether the scale agrees with the food, and what one change would matter most.

Reply with ONE JSON object and nothing else:
{
  "title": "a plain four to seven word label for the week",
  "lines": ["four to six short lines: adherence (how many days on target, which ones slipped and whether they share a pattern), food averages against his goals, movement, and what the scale did against what the food says it should have done"],
  "pattern": "one or two sentences naming the strongest pattern you can actually see in these seven days. If a particular weekday keeps failing, say which. If there is no pattern yet, say that instead of inventing one.",
  "focus": "the single change for next week, concrete enough to act on tomorrow",
  "grade": "A"|"B"|"C"|"D"
}
Use his real numbers. Compare like with like: a partial week is a partial week, say so rather than projecting it. ${NO_DASHES}`;

const ADVISE_SYSTEM = `You answer "what should I eat" for one person, before he eats it. You get his PROFILE, GOALS, what he has eaten TODAY with the running macro totals, what is still LEFT on his plan for today, his SAVED meals, the time, and his QUESTION.

He eats close to the same thing every day, so the interesting cases are the exceptions: he is going out, something is not available, he is short on time, or he wants to know what still fits. Answer that, with his real remaining numbers.

Reply with ONE JSON object and nothing else:
{
  "answer": "two to four sentences. Lead with the numbers that decide it: what is left in calories and protein today. Then the recommendation, in his own vocabulary.",
  "options": [ {"name": "...", "why": "one short line", "cal": n, "protein": n} ],
  "watch": "one short line on the thing most likely to trip him up here, or empty"
}
Two or three options, never more. Prefer what he already eats and already has when that fits; only suggest something new when the situation calls for it. If a restaurant is involved, name dish types he can actually order, not brands. Numbers are estimates and whole. ${NO_DASHES}`;

const FITBIT_SYSTEM = `You read screenshots from the Fitbit app (or any health app) and pull the numbers out for one person's private tracker, so his charts fill in without a live link. Read every number you can see with its date or period. Be literal: copy the values on screen, do not estimate what is not shown.

Reply with ONE JSON object and nothing else:
{
  "metric": "steps"|"weight"|"resting_hr"|"energy"|"sleep"|"heart_rate"|"other",
  "unit": "steps"|"lb"|"kg"|"bpm"|"cal"|"h"|"",
  "view": "day"|"week"|"month"|"3months"|"year"|"",
  "headline": {"value": n, "label": "what the big number is, e.g. steps per day avg over Aug 4 to Sep 3"},
  "today": n or null,
  "entries": [ {"date": "YYYY-MM-DD", "period": "day"|"week"|"month", "value": n, "label": "as written on screen"} ],
  "streak_days": n or null,
  "goal": n or null,
  "notes": "one short sentence on anything ambiguous, or empty"
}
Rules:
- The screenshot's own date range decides the year. Assume the current date given to you when a label has no year.
- A list of months (June 174.4, May 177.7) becomes month entries dated the 15th of that month. A list of week ranges (Aug 23 to 29) becomes week entries dated the first day of the range. A bar chart of days becomes day entries only when the bars are labeled with readable values; otherwise leave the bars out and keep the listed numbers.
- "today" is set only when the screen clearly shows today's own value (a day view, or a today row).
- Whole numbers for steps, calories and bpm; one decimal for weight.
${NO_DASHES}`;

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
  if (data.stop_reason === 'max_tokens') throw new Error('the answer ran past its length limit, try again');
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
      const shots = imageBlocks(body.images);
      // A photo on its own is a real message: he holds up a package and expects
      // it to be read. Only silence with no photo is nothing.
      if (!transcript && !shots.length) return json(400, { error: 'nothing said' });
      const history = Array.isArray(body.history) ? body.history.slice(-12).map((m) => `${m.role === 'user' ? 'HE SAID' : 'YOU SAID'}: ${m.text}`).join('\n') : '';
      const user =
        `NOW: ${body.now || ''} (${body.weekday || ''})\n` +
        `TOMORROW: ${body.tomorrow || ''}\n\n` +
        `PROFILE: ${JSON.stringify(body.profile || {})}\n` +
        `GOALS: ${body.goals || ''}\n\n` +
        `STATE:\n${JSON.stringify(body.state || {})}\n\n` +
        (history ? `HISTORY (oldest first):\n${history}\n\n` : '') +
        (shots.length ? `PHOTOS ATTACHED: ${shots.length}\n\n` : '') +
        `SAID NOW:\n${transcript || '(nothing said, just the photo)'}`;
      const { parsed, usage } = await ask(COMMAND_SYSTEM, [...shots, { type: 'text', text: user }], 4000);
      const ops = Array.isArray(parsed.ops) ? parsed.ops : [];
      return json(200, { say: String(parsed.say || ''), ops, usage });
    }

    if (mode === 'review') {
      const text =
        `NOW: ${body.now || ''}\n` +
        `PROFILE: ${JSON.stringify(body.profile || {})}\n` +
        `GOALS: ${body.goals || ''}\n\n` +
        `DAY:\n${JSON.stringify(body.day || {})}\n\nReturn the JSON.`;
      const { parsed, usage } = await ask(REVIEW_SYSTEM, [{ type: 'text', text }], 4000);
      return json(200, { review: parsed, usage });
    }

    if (mode === 'food') {
      const blocks = imageBlocks(body.images);
      const words = String(body.transcript || '').trim();
      if (!blocks.length && !words) return json(400, { error: 'need a photo or some words' });
      const text = (words ? `HE SAID: ${words}\n` : '') + (blocks.length ? 'Read the photo.' : '') + '\nReturn the JSON.';
      const { parsed, usage } = await ask(FOOD_SYSTEM, [...blocks, { type: 'text', text }], 2000);
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
      const { parsed, usage } = await ask(PHYSIQUE_SYSTEM, [...blocks, { type: 'text', text }], 1500);
      return json(200, { physique: parsed, usage });
    }

    if (mode === 'week') {
      const text =
        `NOW: ${body.now || ''}\n` +
        `PROFILE: ${JSON.stringify(body.profile || {})}\n` +
        `GOALS: ${body.goals || ''}\n\n` +
        `WEEK:\n${JSON.stringify(body.week || {})}\n\nReturn the JSON.`;
      const { parsed, usage } = await ask(WEEK_SYSTEM, [{ type: 'text', text }], 4000);
      return json(200, { week: parsed, usage });
    }

    if (mode === 'advise') {
      const text =
        `NOW: ${body.now || ''}\n` +
        `PROFILE: ${JSON.stringify(body.profile || {})}\n` +
        `GOALS: ${body.goals || ''}\n\n` +
        `TODAY:\n${JSON.stringify(body.today || {})}\n\n` +
        `QUESTION: ${body.question || 'What should I eat with what is left today?'}\n\nReturn the JSON.`;
      const { parsed, usage } = await ask(ADVISE_SYSTEM, [{ type: 'text', text }], 2500);
      return json(200, { advise: parsed, usage });
    }

    if (mode === 'fitbit') {
      const blocks = imageBlocks(body.images);
      if (!blocks.length) return json(400, { error: 'need a screenshot' });
      const text = `TODAY IS: ${body.now || ''}\nRead the screenshot and return the JSON.`;
      const { parsed, usage } = await ask(FITBIT_SYSTEM, [...blocks, { type: 'text', text }], 3000);
      return json(200, { fit: parsed, usage });
    }

    if (mode === 'wrap') {
      const transcript = String(body.transcript || '').trim();
      if (!transcript) return json(400, { error: 'nothing said' });
      const text = `DATE: ${body.now || ''}\nSCORE: ${body.score ?? ''}\n\nHE SAID:\n${transcript}`;
      const { parsed, usage } = await ask(WRAP_SYSTEM, [{ type: 'text', text }], 1500);
      return json(200, { wrap: parsed, usage });
    }

    return json(400, { error: `unknown mode ${mode}` });
  } catch (err) {
    return json(502, { error: err.message || 'brain failed' });
  }
};
