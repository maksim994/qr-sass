// Test-only server transport fixture; never imported by application source.
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const url = new URL(raw);
  if (url.href === 'https://oauth.yandex.ru/token') {
    const code = new URLSearchParams(init?.body).get('code');
    if (!code?.startsWith('pd-fixture-')) throw new Error('Unknown local OAuth fixture');
    return Response.json({ access_token: code, token_type: 'bearer' });
  }
  if (url.hostname === 'login.yandex.ru') {
    const token = new Headers(init?.headers).get('authorization')?.replace('OAuth ', '');
    if (!token?.startsWith('pd-fixture-')) throw new Error('Unknown local OAuth fixture');
    return Response.json({ id: token, default_email: `${token}@example.invalid`, real_name: 'Локальный тест согласия' });
  }
  if (!['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('External request blocked in local acceptance fixture');
  return originalFetch(input, init);
};
