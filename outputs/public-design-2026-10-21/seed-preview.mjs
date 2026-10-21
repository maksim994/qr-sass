// Disposable local design preview only; never target a production database.
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
const url = new URL(process.env.DATABASE_URL);
assert.equal(url.hostname, '127.0.0.1');
assert.equal(url.pathname, '/qr_design');
const db = new PrismaClient();
const rows = [
  ['dinamicheskij-i-staticheskij-qr-kod-raznica','Статический и динамический QR-код: как выбрать','Гайды','guides','dynamic-qr'],
  ['qr-kod-s-analitikoj-i-korotkoj-ssylkoj','Как отслеживать открытия QR-кода','Аналитика','analytics','qr-code-analytics'],
  ['qr-kod-s-utm-metkami','QR-код с UTM-метками для офлайн-материалов','Аналитика','analytics','qr-for-agencies'],
  ['preview-print','Как подготовить QR-код к печати','Гайды','guides','qr-for-packaging'],
  ['preview-menu','Меню кафе в телефоне гостя','Для бизнеса','business','qr-menu'],
  ['preview-event','Программа события по одному QR-коду','Для бизнеса','business','qr-for-events'],
  ['preview-contact','Контакты без ручного ввода','Гайды','guides','qr-for-agencies'],
  ['preview-link','Как обновить ссылку после печати','Гайды','guides','dynamic-qr'],
  ['preview-workspace','QR-коды для материалов команды','Для бизнеса','business','bulk-qr-generator'],
];
for (const [i, [slug,title,name,cat,image]] of rows.entries()) {
  const category = await db.blogCategory.upsert({where:{slug:cat},create:{slug:cat,name},update:{}});
  const markdown = `Локальная демонстрационная статья для проверки оформления. Эти данные не публикуются на рабочем сайте.\n\n## Выберите содержимое\n\nНачните с задачи: открыть сайт, передать контакты или поделиться документом. В QR-код можно поместить ссылку, а расположить его — на печатном материале или экране.\n\n- Подготовьте ссылку и проверьте её в браузере.\n- Выберите цвет и оставьте свободное поле вокруг кода.\n- Проверьте результат камерой телефона.\n\n## Проверьте перед печатью\n\n${Array.from({length:4},()=> 'Сначала сделайте пробный отпечаток в реальном размере. Наведите камеру с обычного расстояния и убедитесь, что открывается нужная страница. Контраст, размер и свободное поле важнее декоративных деталей.').join('\n\n')}\n\n| Что проверить | Как проверить |\n| --- | --- |\n| Ссылка | Открыть в браузере |\n| Контраст | Проверить на светлой бумаге |\n| Сканирование | Навести камеру двух телефонов |\n\n## Сохраните материалы\n\nВекторный SVG подходит для масштабирования. PNG можно использовать в макете при достаточном разрешении. Назовите файл так, чтобы позже найти его среди других материалов.\n\n> Проверяйте код в том виде, в котором его увидит посетитель.\n\n## Что дальше\n\n[Создать QR-код](/#create-qr) или [сравнить тарифы](/pricing).`;
  const html = `<p>Локальная демонстрационная статья старого HTML-формата. Данные используются только для проверки макета.</p><h2>Перед печатью</h2><p>Откройте ссылку в браузере, настройте оформление и сделайте пробный отпечаток. Проверьте QR камерой телефона.</p><h2>Разместите код</h2><p>${'Оставьте свободное поле вокруг кода и добавьте понятную подпись. '.repeat(20)}</p><ul><li>Проверьте размер</li><li>Проверьте контраст</li><li>Проверьте назначение</li></ul><h2>Сохраните результат</h2><p>Используйте <a href="/pricing">тарифы</a> для сравнения возможностей.</p>`;
  const format = i < 6 ? 'markdown' : 'html';
  const publishedAt = new Date(`2026-10-${String(20-i).padStart(2,'0')}T09:00:00Z`);
  await db.blogPost.upsert({where:{slug},update:{},create:{slug,title,excerpt:'Ссылки, оформление и проверка перед печатью. Демонстрационные данные локального макета.',content:format==='markdown'?markdown:html,format,status:'published',publishedAt,firstPublishedAt:publishedAt,contentUpdatedAt:publishedAt,authorName:'Редакция QR-S',categoryId:category.id,readingTimeMinutes:5,coverImageUrl:`/images/landings/${image}.png`,tags:['qr-код','печать']}});
}
await db.$disconnect();
console.log('Local qr_design preview: 9 articles; no production connection or credentials.');
