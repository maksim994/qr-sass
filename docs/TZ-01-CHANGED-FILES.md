# Изменённые файлы ТЗ-01

База кода: afdd4f7; рабочая ветка codex/tz-01-conversion-2026-10-18. Файлы с production данными и outputs в Git не включаются.

## 36a3f71 docs: record TZ-01 baseline and price inventory

- `docs/TZ-01-PRICE-INVENTORY.txt`
- `docs/TZ-01-RELEASE-2026-10-18.md`

## 66d5474 feat: publish current pricing and preserve archived offers

- `src/app/changelog/page.tsx`
- `src/app/dashboard/billing/billing-client.tsx`
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/pricing/pricing.module.css`
- `src/app/privacy-policy/page.tsx`
- `src/components/landing/page-goal.tsx`
- `src/lib/commercial-config.ts`
- `src/lib/legal-documents.ts`
- `src/lib/plans.ts`
- `src/lib/trial-policy.ts`
- `src/lib/user-messages.ts`
- `src/lib/workspace-plan.ts`

## bf12bab feat: allow two free dynamic QR codes with serialized quota and upgrade prompts

- `src/app/dashboard/create/[type]/page.tsx`
- `src/app/dashboard/create/page.tsx`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/components/create-qr-client.tsx`
- `src/components/landing/marketing-landing.tsx`
- `src/components/qr/qr-lifetime-note.tsx`
- `src/components/upgrade-prompt.tsx`
- `src/lib/landing-details.ts`
- `src/lib/plans.test.ts`
- `src/lib/product-analytics.ts`
- `src/lib/scenario-landings.ts`

## b10295c feat: render printable QR frames across previews and all exports

- `public/fonts/Manrope-LICENSE.txt`
- `src/app/globals.css`
- `src/components/landing/home-qr-preview.tsx`
- `src/components/landing/home-quick-start.tsx`
- `src/components/qr-designer.tsx`
- `src/components/qr/frame-controls.tsx`
- `src/hooks/use-qr-styling-preview.ts`
- `src/lib/qr-frame-glyphs.ts`
- `src/lib/qr-frame.test.ts`
- `src/lib/qr-frame.ts`
- `src/lib/qr-preview-download.ts`
- `src/lib/qr-style-config.ts`
- `src/lib/qr-styled-render.ts`
- `src/lib/scannability.ts`
- `src/lib/static-qr-download.ts`
- `src/lib/validation.ts`

## 2fdde47 feat: simplify type selection and reveal advanced QR settings on demand

- `src/components/dashboard/create-type-picker.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/qr/qr-advanced-settings.tsx`

## 58c0b86 fix: align scan counts and restore analytics and onboarding controls

- `src/app/dashboard/api-docs/page.tsx`
- `src/app/dashboard/library/page.tsx`
- `src/components/dashboard/onboarding-checklist.tsx`
- `src/components/dashboard/qr-detail.tsx`
- `src/components/qr-library.tsx`
- `src/lib/analytics-metrics.ts`

## 8d57ebf feat: bring generator above the fold and preserve registration intent

- `src/app/globals.css`
- `src/app/home.module.css`
- `src/app/page.tsx`
- `src/app/register/page.tsx`
- `src/app/register/register-page-client.tsx`
- `src/components/cookie-banner.tsx`
- `src/components/landing/create-url-start-form.tsx`
- `src/components/landing/home-experience.module.css`
- `src/components/landing/home-experience.tsx`
- `src/components/landing/home-quick-start.tsx`

## 111ed1d fix: canonicalize public SEO metadata and reject invalid blog filters

- `Dockerfile`
- `src/app/blog/[slug]/page.tsx`
- `src/app/blog/page.tsx`
- `src/app/forgot-password/page.tsx`
- `src/app/page.tsx`
- `src/app/sitemap.ts`
- `src/components/landing/marketing-landing.tsx`
- `src/components/site-footer.tsx`
- `src/components/site-header-client.tsx`
- `src/components/site-header.tsx`
- `src/lib/landing-seo.ts`
- `src/lib/public-url.ts`
- `src/lib/seo-content.ts`
- `src/lib/seo-hygiene.ts`

## 6cb0aca fix: match Metrika funnel identifiers and deduplicate confirmed conversions

- `src/app/api/analytics/owner-open/route.ts`
- `src/app/api/analytics/payment/route.ts`
- `src/app/api/analytics/registration/route.ts`
- `src/app/api/auth/register/route.ts`
- `src/app/dashboard/billing/page.tsx`
- `src/app/dashboard/create/[type]/page.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/layout.tsx`
- `src/components/confirmed-payment-goal.tsx`
- `src/components/create-qr-client.tsx`
- `src/components/dashboard/tracked-download-link.tsx`
- `src/components/owner-open-goals.tsx`
- `src/components/public-offer-provider.tsx`
- `src/components/qr/qr-wizard-shared.tsx`
- `src/components/registration-goal.tsx`
- `src/components/upgrade-prompt.tsx`
- `src/lib/product-analytics.test.ts`
- `src/lib/product-analytics.ts`

## a500819 test: complete TZ-01 acceptance and preserve production rollback contracts

- `docs/TZ-01-QR-LIFETIME.patch`
- `docs/TZ-01-RELEASE-2026-10-18.md`
- `ops/http-redirect/README.md`
- `ops/http-redirect/nginx.conf`
- `ops/http-redirect/traefik.yaml`
- `public/fonts/Manrope-LICENSE.txt`
- `scripts/verify-product-http.ts`
- `scripts/verify-qr-path-http.ts`
- `scripts/verify-readiness-http.ts`
- `scripts/verify-release-data.ts`
- `scripts/verify-telegram-http.ts`
- `scripts/verify-tz01-http.ts`
- `src/app/dashboard/billing/billing-client.tsx`
- `src/app/dashboard/layout.tsx`
- `src/app/dashboard/library/page.tsx`
- `src/app/dashboard/qr/[id]/page.tsx`
- `src/app/home.module.css`
- `src/app/page.tsx`
- `src/app/privacy-policy/page.tsx`
- `src/app/register/register-page-client.tsx`
- `src/components/dashboard/dashboard-shell.tsx`
- `src/components/dashboard/qr-detail.tsx`
- `src/components/dashboard/qr-library-card-menu.tsx`
- `src/components/landing/home-experience.module.css`
- `src/components/landing/home-experience.tsx`
- `src/components/landing/home-quick-start.tsx`
- `src/components/qr-designer.tsx`
- `src/components/qr-library.tsx`
- `src/components/qr/frame-controls.tsx`
- `src/components/qr/qr-lifetime-note.tsx`
- `src/components/upgrade-link.tsx`
- `src/lib/landing-details.ts`
- `src/lib/legal-consent.test.ts`
- `src/lib/legal-documents.ts`
- `src/lib/legal-history/2026-10-08.ts`
- `src/lib/product-analytics.ts`
- `src/lib/qr-frame-glyphs.ts`
- `src/lib/scenario-landings.ts`
- `src/lib/telegram-identity.ts`
- `src/lib/user-messages.ts`

## b89725d fix: validate printable EPS and complete OpenGraph metadata

- `ops/http-redirect/README.md`
- `ops/http-redirect/traefik.yaml`
- `src/app/blog/page.tsx`
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/pricing/page.tsx`
- `src/lib/product-analytics.test.ts`
- `src/lib/product-analytics.ts`
- `src/lib/qr-frame.test.ts`
- `src/lib/qr-styled-render.ts`

## 3d159b5 chore: finalize verified QR-S production candidate and release evidence

- `src/app/layout.tsx` — удалён повторный type в root metadata.
- `docs/TZ-01-RELEASE-2026-10-18.md`
- `docs/TZ-01-CHANGED-FILES.md`

После первого деплоя обновлены только эти два отчёта с итоговыми результатами.

## c07fbc7 fix: publish owner-approved free dynamic QR lifetime policy

После отдельного согласования владельца по п.2.1:

- `src/app/qr-lifetime/page.tsx` — согласованный текст и description.
- `src/lib/qr-lifetime-policy.ts` — общие пояснения о двух бесплатных динамических кодах.
- `src/lib/scenario-landings.test.ts` — существующая проверка обновлённого текста.
- `docs/TZ-01-RELEASE-2026-10-18.md` — согласование и новая проверка backup/restore.
