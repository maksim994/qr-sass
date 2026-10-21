import { spawn } from 'node:child_process';
const mode = process.argv[2];
const childEnv = { ...process.env, DATABASE_URL: 'postgresql://mvmolkov@127.0.0.1:5432/qr_tz11_20261021', JWT_SECRET: 'tz11-synthetic-local-only-secret-20261021', APP_URL: 'http://127.0.0.1:3016', NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3016', JWT_PREVIOUS_SECRET: '', JWT_ROTATED_AT: '', YANDEX_AUTH_ENABLED: 'true', YANDEX_CLIENT_ID: 'tz11-local', YANDEX_CLIENT_SECRET: 'tz11-local', YANDEX_REDIRECT_URI: 'http://127.0.0.1:3016/api/auth/yandex/callback', TELEGRAM_BOT_TOKEN: '', METRIKA_OAUTH_TOKEN: '', REDIS_URL: undefined };
const args = mode === 'build' ? ['build'] : ['start', '--hostname', '127.0.0.1', '--port', '3016'];
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', ...args], { env: childEnv, stdio: 'inherit' });
child.on('exit', code => process.exit(code ?? 1));
