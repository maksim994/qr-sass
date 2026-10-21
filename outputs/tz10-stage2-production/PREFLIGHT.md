# Production release preflight — 21 October 2026

Candidate: `b3a929d`, branch `qr-robokassa-integration`. Current remote revision: `a6fa101794a01198fec2d1204640c5c373ad48bb` (stage 1).

Scope: unified public design and authentication pages, private browser QR scanner with final copy, public logo QR generator with final copy, corrected homepage logo entry. No dashboard/admin redesign, no additional blog maintenance apply, no stage 2.3–2.6 work.

Local preflight: 269/269 tests pass, full ESLint passes; prior successful production build retained in `../tz10-logo-copy/build.log`. No candidate diff in Prisma schema/migrations, Dockerfile, docker-compose, migration runner or QR-health scripts. Customer QR handlers unchanged.

Release gate before production push (webhook is enabled): fresh protected DB dump and QR v2 baseline; restore into isolated PostgreSQL without production volumes; run candidate migration runner; compare all original QR and customer data; preserve rollback image and original volume/resource bindings. Run the existing encrypted backup/restore verification for DB/S3 where available. No emails, payments or workers on isolated copy.

Rollback: restore previous compatible application image/revision on the existing resource and original mounts. Do not restore old data over live writers, do not reset migrations or remove volumes. If DB repair becomes necessary, restore on a separate stopped copy and review differences first, per DEPLOY.md.

Post-release: health and worker state, QR v2 comparison, prior safe HTTP contracts, public routes/legal/auth pages, exact scanner/logo metadata and FAQ, actual PNG/SVG downloads from main and logo generators with decode, scanner upload and explicit-open behavior, attempt real Webvisor replay. Physical paper scans on iPhone/Android require the user's device; do not claim them from desktop checks.

Access at preflight: direct SSH rejected the available existing keys. Chrome automation reports a blocking extension interface; user access assistance requested. No push or production mutation performed at this point.
