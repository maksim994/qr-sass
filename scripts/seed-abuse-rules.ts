import { getDb } from '../src/lib/db.ts';
// Explicit, manual seed. Never run at build/startup or during a migration.
const db = getDb();
const trusted = ['yandex.ru', 'vk.com', 'gosuslugi.ru', 'ozon.ru', 'wildberries.ru', 'qr-s.ru'];
const shorteners = ['bit.ly', 'clck.ru', 'tinyurl.com', 'cutt.ly', 'goo.su', 't.co'];
const words = ['закладк', 'поддельные документы', 'вход в сбербанк', 'госуслуги-вход', 'crypto-airdrop'];
for (const [kind, values] of [['ALLOW_DOMAIN', trusted], ['SHORTENER', shorteners], ['STOPWORD', words]] as const) for (const value of values) await db.abuseRule.upsert({ where: { kind_value: { kind, value } }, create: { kind, value, action: 'REVIEW', createdBy: 'manual-seed' }, update: {} });
await db.$disconnect();
