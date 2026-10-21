import { spawn } from 'node:child_process';
const mode = process.argv[2];
const env = {
  PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR,
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://mvmolkov@127.0.0.1:5432/notifications_test_integrated_20261021?schema=public',
  APP_URL: 'http://127.0.0.1:3339', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3339',
  JWT_SECRET: 'integrated-release-synthetic-local-jwt-20261021',
  ADMIN_INTEGRATIONS_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  TRUST_PROXY: 'true', YANDEX_AUTH_ENABLED: 'true', YANDEX_CLIENT_ID: 'local-fixture-client',
  YANDEX_CLIENT_SECRET: 'local-fixture-secret', YANDEX_REDIRECT_URI: 'http://127.0.0.1:3339/api/auth/yandex/callback',
};
const commands = {
  build: ['node_modules/next/dist/bin/next', 'build'],
  start: ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3339'],
  migrate: ['scripts/migrate-deploy.mjs'],
  email: ['--experimental-strip-types', '--import', './scripts/register-src-alias.mjs', 'scripts/test-email-notifications.ts'],
  http: ['--experimental-strip-types', '--import', './scripts/register-src-alias.mjs', 'scripts/test-email-http.ts'],
  sources: ['--experimental-strip-types', '--import', './scripts/register-src-alias.mjs', 'scripts/test-owner-email-sources.ts'],
};
if (!commands[mode]) throw new Error('Unknown local verification command');
const child = spawn(process.execPath, commands[mode], { env, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
