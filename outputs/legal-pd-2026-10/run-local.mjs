// Explicit local-only configuration. No project .env or live integration credentials.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://mvmolkov@127.0.0.1:5432/qr_legal_pd_20261021?schema=public',
  APP_URL: 'http://127.0.0.1:3020', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3020',
  JWT_SECRET: randomBytes(32).toString('hex'), TRUST_PROXY: 'true',
  YANDEX_AUTH_ENABLED: 'true', YANDEX_CLIENT_ID: 'local-fixture-client',
  YANDEX_CLIENT_SECRET: 'local-fixture-secret',
  YANDEX_REDIRECT_URI: 'http://127.0.0.1:3020/api/auth/yandex/callback',
};
const build = process.argv[2] === 'build';
const args = build ? ['node_modules/next/dist/bin/next', 'build']
  : ['--import', './outputs/legal-pd-2026-10/oauth-fixture.mjs', 'node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3020'];
const child = spawn(process.execPath, args, { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
