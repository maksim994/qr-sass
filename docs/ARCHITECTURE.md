# Architecture Baseline

## Stack
- **Web frontend:** Next.js App Router + TypeScript + Tailwind.
- **Backend API:** Next.js route handlers.
- **Database:** PostgreSQL with Prisma ORM.
- **Cache/queue:** Redis + BullMQ (prepared for async export/bulk jobs).
- **Storage:** S3-compatible object storage (env placeholders included).
- **Auth:** email/password + JWT session cookie.
- **QR rendering:** server-side `qrcode` for deterministic PNG/SVG + client `qr-code-styling` for visual studio.
- **Telegram adapter:** `@tma.js/init-data-node` validation and session mapping.

## Multi-tenant model
- `User` -> `Membership` -> `Workspace`.
- Optional `Project` under workspace for campaign grouping.
- `QrCode` supports static/dynamic mode.
- `QrRevision` stores destination/content history for audit trail.
- `ScanEvent` uses append-only event records for analytics scale.

## Dynamic QR flow
1. User creates dynamic QR; service generates `shortCode`.
2. Encoded QR payload points to `/r/{shortCode}`.
3. Redirect route loads current destination, tracks scan event, issues HTTP redirect.
4. Destination can be updated later via authenticated endpoint, with revision record.

## SEO architecture
- Marketing homepage at `/`.
- Localized SEO routes at `/{locale}/{slug}`.
- Built-in sitemap and robots endpoints.
- JSON-LD (`SoftwareApplication`, `FAQPage`) to improve SERP richness.

## Telegram Mini App
- `POST /api/telegram/auth` validates initData signature.
- Existing user is found/upserted and mapped to normal web session cookie.
- Billing for Telegram should remain separate from web subscription billing.
