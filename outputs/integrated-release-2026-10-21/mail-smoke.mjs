import { getDb } from './src/lib/db.ts';
import { queueEmail, serviceMessage } from './src/lib/email-notifications.ts';
import { OWNER_EMAIL } from './src/lib/email-notification-policy.ts';
import { emailSourceSummary } from './src/lib/email-source-summary.ts';

const db = getDb(), key = 'release-source-smoke:20261022-a4d6b13';
const label = 'release-smoke/direct/night';
const text = 'Проверка ночного релиза a4d6b13. Это тест: аккаунт, оплата и начисление не создавались.\n'
  + `Источник: ${label}\n\nПример сводки на вымышленных данных:\n`
  + emailSourceSummary([label], [{ source: label, amount: 299 }]);
try {
  await db.$transaction(tx => queueEmail(tx, {
    key, kind: 'test', to: OWNER_EMAIL,
    expiresAt: new Date(Date.now() + 15 * 60000),
    message: serviceMessage('Проверка источников в письмах', text, '/admin/notifications', 'Открыть журнал'),
  }));
  console.log(JSON.stringify({ queued: true, key, recipient: OWNER_EMAIL }));
} finally { await db.$disconnect(); }
