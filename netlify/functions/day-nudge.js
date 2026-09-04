/*
 * Daily Board nudges.
 *
 * Runs hourly. Reads the one synced day_state row, works out the local time in
 * Edmonton, and sends at most one notification per run. Which nudge fires is
 * decided purely by the local hour, so the function keeps no state of its own
 * and cannot double-send: each rule simply cannot come up twice in a day.
 *
 * The subscription rides inside the same row the app already syncs (data.push),
 * so turning notifications on needs no extra table and no extra endpoint.
 *
 * Set VAPID_PRIVATE_KEY in the Netlify environment. Without it this is a no-op.
 */
const webpush = require('./lib/webpush.js');

const SB_URL = 'https://ksgxrxqvnfpfhidxsxcs.supabase.co';
const SB_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3hyeHF2bmZwZmhpZHhzeGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzkxMTgsImV4cCI6MjA5NzAxNTExOH0.pUD6sbkjhhTlgl5x4KHFJsThoHVlNkNBlSFES_8HHvM';
const ROW_ID = 'reggie';
const VAPID_PUBLIC = 'BLKel7CKq4SiXr6mWZhFJmCRBskpg8PAErTg7dOz93AcngJyfAer8w2uLQRZ7g1FfQ5FRXL7OkIi-tXz6Adq7-o';
const ZONE = 'America/Edmonton';
const SUBJECT = 'mailto:kingreggiemut@gmail.com';

/* Local wall-clock date and hour, so the rules follow him through DST. */
function localNow(zone) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((a, x) => ((a[x.type] = x.value), a), {});
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour === '24' ? 0 : p.hour), minute: Number(p.minute) };
}

const nf = (n) => Number(n || 0).toLocaleString('en-CA');
/* "14:00" -> "2 o'clock", "14:30" -> "2:30". Written the way it would be said. */
function say(hm) {
  const [h, m] = String(hm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return '';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}` : `${h12} o'clock`;
}

/*
 * Pick the one nudge for this hour, or nothing.
 * Each returns { title, body, tag } or null when there is nothing worth saying.
 */
function decide(data, now) {
  const day = (data.days || {})[now.date];
  if (!day) return null;

  const set = data.settings || {};
  const stepGoal = set.stepGoal || 20000;
  // Steps are entered by hand until Fitbit is linked, so "none logged" is not the
  // same as "zero walked". When there is no figure for today, say nothing about
  // steps rather than telling him he has not moved.
  const logged = !!(data.steps && data.steps.date === now.date);
  const steps = logged ? data.steps.today || 0 : 0;

  const meals = (day.meals || []).filter((m) => !m.skipped);
  const tasks = (day.tasks || []).filter((t) => !t.skipped);
  const openItems = [...meals, ...tasks].filter((x) => !x.done);
  const eaten = meals.filter((m) => m.done);
  const cal = eaten.reduce((s, m) => s + (m.cal || 0), 0);
  const protein = eaten.reduce((s, m) => s + (m.protein || 0), 0);

  // Mid-afternoon: is the step count on pace for the day?
  if (now.hour === 14) {
    if (!logged) return null;
    const pace = Math.round(stepGoal * 0.45);
    if (steps < pace) {
      const walk = tasks.find((t) => /walk/i.test(t.name) && !t.done);
      return {
        tag: 'steps-mid',
        title: `${nf(steps)} steps`,
        body: `${nf(stepGoal - steps)} to go.${walk ? ` Your ${say(walk.time)} walk would cover a chunk of it.` : ''}`,
      };
    }
    return null;
  }

  // Early evening: steps plus what is still left to eat.
  if (now.hour === 18) {
    const bits = [];
    if (logged && steps < stepGoal) bits.push(`${nf(stepGoal - steps)} steps to go`);
    const calLeft = (set.calGoal || 2015) - cal;
    const pLeft = (set.proteinGoal || 180) - protein;
    if (pLeft > 0) bits.push(`${pLeft}g protein and ${nf(calLeft)} cal left`);
    if (!bits.length) return null;
    return { tag: 'evening', title: 'Where the day stands', body: `${bits.join('. ')}.` };
  }

  // Late: anything still open, while there is time to actually do it.
  if (now.hour === 22) {
    if (!openItems.length) return null;
    const names = openItems.slice(0, 3).map((x) => x.name).join(', ');
    return {
      tag: 'close',
      title: openItems.length === 1 ? '1 thing left' : `${openItems.length} things left`,
      body: `${names}${openItems.length > 3 ? '...' : ''}`,
    };
  }

  return null;
}

// Exported so the copy can be checked against real days without sending anything.
exports.decide = decide;
exports.localNow = localNow;

exports.handler = async (event) => {
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!priv) return { statusCode: 200, body: 'no VAPID_PRIVATE_KEY set, nothing sent' };

  const r = await fetch(`${SB_URL}/rest/v1/day_state?id=eq.${ROW_ID}&select=data`, {
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` },
  });
  if (!r.ok) return { statusCode: 200, body: `row read failed ${r.status}` };
  const rows = await r.json();
  const data = rows[0] && rows[0].data;
  if (!data) return { statusCode: 200, body: 'no row' };

  const push = data.push;
  if (!push || !push.on || !push.sub) return { statusCode: 200, body: 'notifications off' };

  const now = localNow(ZONE);
  // A manual ping from the app's test button ignores the schedule.
  const forced = event && event.queryStringParameters && event.queryStringParameters.test;
  const msg = forced
    ? { tag: 'test', title: 'Daily Board', body: 'Notifications are working.' }
    : decide(data, now);
  if (!msg) return { statusCode: 200, body: `nothing to say at ${now.hour}:00 local` };

  const out = await webpush.send(push.sub, msg, {
    publicKey: VAPID_PUBLIC, privateKey: priv, subject: SUBJECT, ttl: 3600,
  });
  return { statusCode: 200, body: JSON.stringify({ local: `${now.date} ${now.hour}:00`, sent: msg, push: out }) };
};
