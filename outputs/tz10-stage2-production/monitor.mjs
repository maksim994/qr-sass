import { appendFile, access } from 'node:fs/promises';
const dir = new URL('./', import.meta.url);
for (;;) {
  try { await access(new URL('stop-monitor', dir)); break; } catch {}
  const at = new Date().toISOString();
  let result;
  try {
    const started = Date.now();
    const response = await fetch('https://qr-s.ru/api/health', { signal: AbortSignal.timeout(8000) });
    result = { at, status: response.status, ms: Date.now() - started };
  } catch (error) { result = { at, error: error.name }; }
  await appendFile(new URL('health.jsonl', dir), JSON.stringify(result) + '\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
}
