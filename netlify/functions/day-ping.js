/*
 * The callable half of the nudges, behind the app's "Send me a test" button.
 * Exists separately from day-nudge.js only because Netlify refuses HTTP
 * requests to a scheduled function.
 *
 * GET            send a test notification
 * GET ?real=1    send whatever the schedule would send right now, or nothing
 */
const { run } = require('./lib/nudge.js');

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' };

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };
  const real = !!(event.queryStringParameters && event.queryStringParameters.real);
  const out = await run(!real);
  return {
    statusCode: out.ok === false && out.why ? 400 : 200,
    headers: { ...CORS, 'Content-Type': 'application/json' },
    body: JSON.stringify(out),
  };
};
