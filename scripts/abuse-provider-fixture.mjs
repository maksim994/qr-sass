// Explicit local-only preload for verify-abuse-http.ts. Never used by app/worker startup.
const database = new URL(process.env.DATABASE_URL ?? 'http://invalid');
if (process.env.ABUSE_TEST_FIXTURE !== '1' || !['127.0.0.1', 'localhost'].includes(database.hostname) || database.port !== '55439' || database.pathname !== '/qr_abuse_test') throw new Error('Abuse provider fixture requires the isolated local test database');
const original = globalThis.fetch;
globalThis.fetch = async function(input, init) {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.hostname === 'sba.yandex.net') {
    const entries = JSON.parse(init.body).threatInfo.threatEntries;
    if (entries.some(entry => entry.url.includes('outage.example'))) throw new Error('synthetic_provider_outage');
    return Response.json({ matches: entries.filter(entry => entry.url.includes('malware.testing.google.test')).map(threat => ({ threat, threatType: 'MALWARE' })) });
  }
  if (url.hostname === 'webrisk.googleapis.com') throw new Error('Google must remain disabled in the local HTTP fixture');
  return original.call(this, input, init);
};
