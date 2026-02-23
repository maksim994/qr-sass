# QR SaaS

Web-first QR SaaS platform with:
- registration/login and workspaces
- static and dynamic QR creation
- PNG/SVG downloads
- dynamic redirects with editable target URL
- scan analytics baseline
- style studio with scannability guardrails
- RU/EN SEO landing architecture
- Telegram Mini App auth adapter

## Quick start

1. Copy environment file:

```bash
cp .env.example .env
```

2. Start PostgreSQL and update `DATABASE_URL` in `.env`.

3. Push Prisma schema and generate client:

```bash
npm run prisma:generate
npm run prisma:push
```

4. Run development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Important routes

- `/` - marketing homepage
- `/register` and `/login` - auth
- `/dashboard` - QR Studio and library
- `/r/{shortCode}` - dynamic redirect endpoint
- `/mini` - Telegram Mini App auth adapter
- `/en/qr-code-generator`, `/ru/generator-qr-kodov` - SEO pages

## API overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/qr?workspaceId=...`
- `POST /api/qr`
- `PATCH /api/qr/{id}/target`
- `GET /api/qr/{id}/download?format=png|svg`
- `POST /api/telegram/auth`

## Documentation

- Product scope and JTBD: `docs/PRD.md`
- Architecture decisions: `docs/ARCHITECTURE.md`
