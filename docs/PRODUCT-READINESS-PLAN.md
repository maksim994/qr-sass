# Product readiness — план после visual rollout

**Дата:** 2026-07-23  
**Статус:** Волна A ✅ · Волна B ✅ (в коде)  
**Связь:** оценка GPT (beta ~80–85%) + закрытый [`VISUAL-ROLLOUT-PLAN.md`](./VISUAL-ROLLOUT-PLAN.md)  
**Короткий указатель также в:** [`README.md`](../README.md) → секция «Не забыть»

## Принцип

Не плодить новые типы QR. Усиливать активацию, упаковку ценности, лимиты и критичный путь `/r`.

## Волна A (сделано)

| # | Задача | Статус | Где |
|---|--------|--------|-----|
| 1 | Единые лимиты create + bulk (`assertCanCreateQrCodes`) | ✅ | `src/lib/plans.ts`, `api/qr`, `api/qr/bulk` |
| 2 | UX «осталось N» / блок динамических на FREE | ✅ | create, bulk, overview |
| 3 | Empty states аналитики + «0 за 7 дней ≠ 0 всего» | ✅ | `dashboard/analytics` |
| 4 | Onboarding-чек-лист на overview | ✅ | `OnboardingChecklist` |
| 5 | Product goals Я.Метрики | ✅ | `src/lib/product-analytics.ts` |
| 6 | Hero / pricing / сценарии на лендинге | ✅ | `src/app/page.tsx` |
| 7 | SEO-страницы сегментов | ✅ | `src/lib/seo-content.ts` |
| 8 | Async `trackScan` на `/r` через `after()` | ✅ | `src/app/r/[slug]/route.ts` |

### Цели Метрики (создать в кабинете счётчика)

> **TODO ops:** без этого шага воронка в UI Метрики пустая.

`registration_completed`, `qr_type_selected`, `qr_created`, `dynamic_qr_created`, `qr_downloaded`, `pricing_viewed`, `checkout_started`, `subscription_paid`, `member_invited`, `api_key_created`

## Волна B (сделано в коде)

| # | Задача | Статус | Где |
|---|--------|--------|-----|
| 1 | Поиск + группы типов при создании | ✅ | `CreateTypePicker` |
| 2 | Аналитика: период 7/30/90 + экспорт CSV | ✅ | `dashboard/analytics`, `api/analytics/export` |
| 3 | Дублирование + меню действий в библиотеке | ✅ | `api/qr/[id]/duplicate`, `QrLibraryCardMenu` |
| 4 | Rate limit на `/r` (120/мин/IP) | ✅ | `redirectRateLimiter` |
| 5 | SSRF baseline для URL (private/local hosts) | ✅ | `src/lib/url.ts` + validation |

### Примечания B

- Кэш правил редиректа (Redis) — **отложен**: rate limit + async scan уже снижают риск; полноценный edge-cache — отдельная задача.
- Экспорт CSV: до 5000 событий за период; cookie-auth через тот же session (ссылка `<a href>`).
- Дубликат не копирует `passwordHash` (нужно задать пароль заново).

## Волна C (по спросу)

- Папки / теги
- Audit log команды
- Email expiry / limit notifications
- Контент блога 5–7 статей + реальные кейсы
- Newsletter backend
- Redis-кэш правил `/r`

## Не делаем сейчас

Новые типы QR, white-label, custom domains, client webhooks.

## Ручная проверка после деплоя

### A
- [ ] FREE: нельзя создать DYNAMIC / hosted / VCARD / bulk
- [ ] Overview чек-лист; скачивание отмечает шаг
- [ ] SEO-slug’и открываются
- [ ] Метрика goals созданы в кабинете

### B
- [ ] Create: поиск и чипы групп работают
- [ ] Analytics: переключение 7/30/90 меняет график
- [ ] Analytics: «Экспорт CSV» скачивает файл
- [ ] Library: «⋯» → Дублировать создаёт копию
- [ ] `/r` при флуде отдаёт 429
- [ ] URL на localhost/private IP отклоняется при create/target
