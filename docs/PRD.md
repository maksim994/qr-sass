# QR SaaS PRD (MVP)

## Product scope
- Build a web-first QR SaaS with a future bridge to Telegram Mini App.
- Support mixed ICP: B2C individuals, SMBs, and agencies.
- Deliver freemium onboarding with strong activation in first 3 minutes.

## ICP and JTBD

### B2C / individual
- **JTBD:** "I need a QR quickly for profile/link/event and want instant download."
- **Core value:** no-friction create flow, free static QR, PNG/SVG download.
- **Activation trigger:** user creates and downloads first code within 2 minutes.

### SMB
- **JTBD:** "I need branded QR for menu/offline campaign and want to update links later."
- **Core value:** dynamic QR edits, basic scan analytics, style presets.
- **Activation trigger:** first dynamic QR created and first scan tracked.

### Agency
- **JTBD:** "I manage multiple campaigns and need reusable templates + reporting."
- **Core value:** workspace model, projects/tags, revision history, API-ready architecture.
- **Activation trigger:** >= 3 QR created across projects with analytics usage.

## Functional requirements
- Registration/login and workspace bootstrap.
- Static QR generation for URL, text, email, phone, SMS, Wi-Fi, vCard, location.
- Dynamic QR with redirect short code and editable destination.
- Download formats: PNG and SVG.
- Styling options: foreground/background, margin, shape controls, quality score.
- Basic analytics: scans over time, UTM capture, device classification.
- SEO pages RU/EN for acquisition.
- Telegram Mini App auth adapter via initData verification.

## Non-functional requirements
- SSR-first for SEO and performance.
- Multi-tenant data model with revision and event streams.
- API boundaries ready for future mobile/partner integration.
- Privacy baseline: hashed IP, minimal data retention.

## Freemium packaging (initial)
- Free: unlimited static + 2-3 dynamic QR, 30-day analytics.
- Pro: higher dynamic limits and advanced style/analytics.
- Team: collaboration seats, bulk flow, integrations.
- Enterprise: SSO, SLA, white-label controls.
