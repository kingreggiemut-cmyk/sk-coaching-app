/*
 * The scheduled half of the nudges. Netlify runs this hourly (see netlify.toml);
 * lib/nudge.js works out the local Edmonton hour and stays quiet on every hour
 * that has no rule, so DST needs no change here and no already-sent flag is
 * stored: a rule keyed to an hour cannot come up twice in a day.
 *
 * Not callable over HTTP. Netlify answers 403 to requests aimed at a scheduled
 * function, which is why the app's test button goes to day-ping.js instead.
 */
const { run } = require('./lib/nudge.js');

exports.handler = async () => {
  const out = await run(false);
  return { statusCode: 200, body: JSON.stringify(out) };
};
