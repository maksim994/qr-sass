/**
 * Проверка целостности QR-данных до/после деплоя.
 *
 * Примеры (на сервере Coolify, из каталога compose):
 *
 *   # Отчёт
 *   docker compose exec app node scripts/verify-qr-health.mjs
 *
 *   # Снимок перед деплоем (сохранить на хост)
 *   docker compose exec -T app node scripts/verify-qr-health.mjs --snapshot > qr-baseline.json
 *
 *   # Сравнение после деплоя
 *   cat qr-baseline.json | docker compose exec -T app node scripts/verify-qr-health.mjs --compare -
 *
 *   # Бэкап Postgres + снимок одной командой
 *   docker compose exec postgres pg_dump -U postgres qr_saas > backup.sql && \
 *   docker compose exec -T app node scripts/verify-qr-health.mjs --snapshot > qr-baseline.json
 */

import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CONTENT_TYPE_LABELS = {
  URL: "Ссылка",
  TEXT: "Текст",
  EMAIL: "Email",
  PHONE: "Телефон",
  SMS: "SMS",
  WIFI: "Wi-Fi",
  VCARD: "Визитка",
  LOCATION: "Геолокация",
  PDF: "PDF",
  IMAGE: "Изображение",
  VIDEO: "Видео",
  MP3: "MP3",
  MENU: "Меню",
  BUSINESS: "Бизнес",
  LINK_LIST: "Список ссылок",
  COUPON: "Купон",
  APP_STORE: "Приложение",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  WHATSAPP: "WhatsApp",
  SOCIAL_LINKS: "Соцсети",
};

function parseArgs(argv) {
  const args = { mode: "report", comparePath: null, json: false };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--snapshot") {
      args.mode = "snapshot";
    } else if (arg === "--compare") {
      args.mode = "compare";
      args.comparePath = argv[i + 1] ?? "-";
      i += 1;
    } else if (arg === "--json") {
      args.json = true;
    } else if (arg === "--help" || arg === "-h") {
      args.mode = "help";
    }
  }
  return args;
}

function readBaseline(path) {
  const raw =
    path === "-"
      ? readFileSync(0, "utf8")
      : readFileSync(path, "utf8");
  return JSON.parse(raw);
}

function payloadUrl(payload) {
  if (!payload || typeof payload !== "object") return null;
  const url = payload.url;
  return typeof url === "string" && url.trim() ? url.trim() : null;
}

function summarizeQr(qr) {
  const target =
    (typeof qr.currentTargetUrl === "string" && qr.currentTargetUrl.trim()) ||
    payloadUrl(qr.payload) ||
    null;

  const isDynamic = qr.kind === "DYNAMIC";
  const issues = [];

  if (isDynamic && !qr.shortCode) {
    issues.push("DYNAMIC_WITHOUT_SHORT_CODE");
  }
  if (isDynamic && !target && qr.contentType === "URL") {
    issues.push("DYNAMIC_URL_WITHOUT_TARGET");
  }
  if (qr.isArchived) {
    issues.push("ARCHIVED");
  }

  return {
    id: qr.id,
    name: qr.name,
    kind: qr.kind,
    contentType: qr.contentType,
    contentTypeLabel: CONTENT_TYPE_LABELS[qr.contentType] ?? qr.contentType,
    shortCode: qr.shortCode,
    hasTarget: Boolean(target),
    targetPreview: target ? target.slice(0, 120) : null,
    workspaceId: qr.workspaceId,
    workspaceName: qr.workspace?.name ?? null,
    createdByEmail: qr.createdBy?.email ?? null,
    scanCount: qr._count?.scanEvents ?? 0,
    isArchived: qr.isArchived,
    createdAt: qr.createdAt.toISOString(),
    issues,
  };
}

async function collectSnapshot() {
  const [qrRows, userCount, workspaceCount, scanEventCount] = await Promise.all([
    prisma.qrCode.findMany({
      include: {
        workspace: { select: { name: true } },
        createdBy: { select: { email: true } },
        _count: { select: { scanEvents: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.count(),
    prisma.workspace.count(),
    prisma.scanEvent.count(),
  ]);

  const qrCodes = qrRows.map(summarizeQr);
  const byKind = { STATIC: 0, DYNAMIC: 0 };
  const byContentType = {};
  const critical = [];
  const warnings = [];

  for (const qr of qrCodes) {
    byKind[qr.kind] = (byKind[qr.kind] ?? 0) + 1;
    byContentType[qr.contentType] = (byContentType[qr.contentType] ?? 0) + 1;

    const criticalIssues = qr.issues.filter(
      (issue) => issue !== "ARCHIVED"
    );
    if (criticalIssues.length > 0) {
      critical.push({ ...qr, issues: criticalIssues });
    } else if (qr.issues.includes("ARCHIVED")) {
      warnings.push(qr);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    appUrl: process.env.APP_URL ?? null,
    totals: {
      qrCodes: qrCodes.length,
      users: userCount,
      workspaces: workspaceCount,
      scanEvents: scanEventCount,
      staticQr: byKind.STATIC ?? 0,
      dynamicQr: byKind.DYNAMIC ?? 0,
      archivedQr: qrCodes.filter((q) => q.isArchived).length,
    },
    byContentType,
    qrCodes,
    critical,
    warnings,
  };
}

function printReport(snapshot) {
  const { totals, byContentType, critical, warnings } = snapshot;

  console.log("=== QR health report ===");
  console.log(`Время:        ${snapshot.generatedAt}`);
  console.log(`APP_URL:      ${snapshot.appUrl ?? "(не задан)"}`);
  console.log("");
  console.log("Сводка:");
  console.log(`  QR-кодов:     ${totals.qrCodes} (static: ${totals.staticQr}, dynamic: ${totals.dynamicQr})`);
  console.log(`  Сканов:       ${totals.scanEvents}`);
  console.log(`  Workspaces:   ${totals.workspaces}`);
  console.log(`  Пользователей:${totals.users}`);
  console.log(`  В архиве:     ${totals.archivedQr}`);
  console.log("");

  const types = Object.entries(byContentType).sort((a, b) => b[1] - a[1]);
  if (types.length > 0) {
    console.log("По типам:");
    for (const [type, count] of types) {
      const label = CONTENT_TYPE_LABELS[type] ?? type;
      console.log(`  ${label}: ${count}`);
    }
    console.log("");
  }

  console.log("Список QR:");
  for (const qr of snapshot.qrCodes) {
    const code = qr.shortCode ?? "—";
    const flag = qr.issues.length > 0 ? ` [${qr.issues.join(", ")}]` : "";
    console.log(
      `  - ${qr.name} | ${qr.contentTypeLabel} | ${qr.kind} | код: ${code} | сканы: ${qr.scanCount} | ${qr.workspaceName ?? "—"}${flag}`
    );
  }
  console.log("");

  if (critical.length > 0) {
    console.log("КРИТИЧНО (проверьте до/после деплоя):");
    for (const qr of critical) {
      console.log(`  ! ${qr.name} (${qr.id}): ${qr.issues.join(", ")}`);
    }
    console.log("");
  }

  if (warnings.length > 0) {
    console.log("Предупреждения (архив):");
    for (const qr of warnings) {
      console.log(`  ~ ${qr.name} (${qr.id})`);
    }
    console.log("");
  }

  if (critical.length === 0) {
    console.log("OK: критических проблем с QR не найдено.");
    console.log("Статические ссылки без короткого кода — норма (URL зашит в сам QR).");
  } else {
    console.log("ВНИМАНИЕ: есть QR с потенциальными проблемами редиректа.");
  }
}

function compareSnapshots(baseline, current) {
  const errors = [];
  const baselineIds = new Set(baseline.qrCodes.map((q) => q.id));
  const currentIds = new Set(current.qrCodes.map((q) => q.id));

  const missing = baseline.qrCodes.filter((q) => !currentIds.has(q.id));
  const added = current.qrCodes.filter((q) => !baselineIds.has(q.id));

  if (current.totals.qrCodes < baseline.totals.qrCodes) {
    errors.push(
      `Количество QR уменьшилось: было ${baseline.totals.qrCodes}, стало ${current.totals.qrCodes}`
    );
  }
  if (current.totals.scanEvents < baseline.totals.scanEvents) {
    errors.push(
      `Количество сканов уменьшилось: было ${baseline.totals.scanEvents}, стало ${current.totals.scanEvents}`
    );
  }
  if (missing.length > 0) {
    errors.push(`Пропали QR (${missing.length}): ${missing.map((q) => q.name).join(", ")}`);
  }

  const changed = [];
  for (const base of baseline.qrCodes) {
    const now = current.qrCodes.find((q) => q.id === base.id);
    if (!now) continue;
    if (base.shortCode !== now.shortCode) {
      changed.push(`${base.name}: shortCode ${base.shortCode ?? "—"} → ${now.shortCode ?? "—"}`);
    }
    if (base.kind !== now.kind) {
      changed.push(`${base.name}: kind ${base.kind} → ${now.kind}`);
    }
    if (base.hasTarget !== now.hasTarget) {
      changed.push(`${base.name}: hasTarget ${base.hasTarget} → ${now.hasTarget}`);
    }
  }

  return { errors, missing, added, changed };
}

function printCompareResult(baseline, current, result) {
  console.log("=== QR compare (до → после деплоя) ===");
  console.log(`Baseline: ${baseline.generatedAt} (${baseline.totals.qrCodes} QR)`);
  console.log(`Current:  ${current.generatedAt} (${current.totals.qrCodes} QR)`);
  console.log("");

  if (result.added.length > 0) {
    console.log(`Новые QR (${result.added.length}):`);
    for (const qr of result.added) {
      console.log(`  + ${qr.name} (${qr.id})`);
    }
    console.log("");
  }

  if (result.changed.length > 0) {
    console.log("Изменённые поля:");
    for (const line of result.changed) {
      console.log(`  * ${line}`);
    }
    console.log("");
  }

  if (result.errors.length === 0) {
    console.log("OK: регрессии данных не обнаружено.");
    if (current.critical.length > 0) {
      console.log(`Замечание: ${current.critical.length} QR с критическими флагами (см. --snapshot отчёт).`);
    }
    return;
  }

  console.log("ОШИБКА: обнаружена регрессия данных:");
  for (const err of result.errors) {
    console.log(`  ! ${err}`);
  }
}

function printHelp() {
  console.log(`Usage:
  node scripts/verify-qr-health.mjs [--json]
  node scripts/verify-qr-health.mjs --snapshot [--json]
  node scripts/verify-qr-health.mjs --compare <file|-> [--json]

Flags:
  --snapshot   JSON-снимок для сравнения после деплоя
  --compare    Сравнить с baseline (файл или "-" для stdin)
  --json       Только JSON на stdout
  --help       Эта справка
`);
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.mode === "help") {
    printHelp();
    process.exit(0);
  }

  const snapshot = await collectSnapshot();

  if (args.mode === "snapshot") {
    const out = JSON.stringify(snapshot, null, 2);
    if (args.json || args.mode === "snapshot") {
      console.log(out);
    }
    process.exit(snapshot.critical.length > 0 ? 2 : 0);
  }

  if (args.mode === "compare") {
    const baseline = readBaseline(args.comparePath);
    const result = compareSnapshots(baseline, snapshot);
    if (args.json) {
      console.log(JSON.stringify({ baseline: baseline.totals, current: snapshot.totals, result }, null, 2));
    } else {
      printCompareResult(baseline, snapshot, result);
    }
    process.exit(result.errors.length > 0 ? 1 : 0);
  }

  if (args.json) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else {
    printReport(snapshot);
  }

  process.exit(snapshot.critical.length > 0 ? 2 : 0);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(2);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
