import { createHash } from "node:crypto";

// JSON object order is immaterial; array order is part of QR content.
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value ?? null;
}

export function qrContractHash(qr) {
  const fields = [
    "encodedContent", "currentTargetUrl", "payload", "expireAt", "maxScans", "passwordHash",
  ];
  const contract = Object.fromEntries(fields.map((key) => [key, canonical(qr[key])]));
  // Compare full content without writing Wi-Fi passwords / protected payloads to the snapshot.
  return createHash("sha256").update(JSON.stringify(contract)).digest("hex");
}

export function compareSnapshots(baseline, current) {
  const errors = [];
  if (baseline.version !== 2 || current.version !== 2) {
    errors.push("Нужен снимок версии 2: снимите baseline новым скриптом ДО обновления приложения.");
  }
  if (!baseline.appUrl || !current.appUrl || baseline.appUrl.replace(/\/$/, "") !== current.appUrl.replace(/\/$/, "")) {
    errors.push("APP_URL отсутствует или изменился: проверьте сохранение публичного домена.");
  }
  const before = new Map(baseline.qrCodes.map((qr) => [qr.id, qr]));
  const after = new Map(current.qrCodes.map((qr) => [qr.id, qr]));
  const missing = baseline.qrCodes.filter((qr) => !after.has(qr.id));
  const added = current.qrCodes.filter((qr) => !before.has(qr.id));
  if (missing.length) errors.push(`Пропали QR (${missing.length}): ${missing.map((qr) => qr.id).join(", ")}`);
  for (const field of ["qrCodes", "users", "workspaces", "scanEvents"]) {
    if (current.totals[field] < baseline.totals[field]) {
      errors.push(`${field}: количество уменьшилось (${baseline.totals[field]} → ${current.totals[field]})`);
    }
  }
  const changed = [];
  for (const base of baseline.qrCodes) {
    const now = after.get(base.id);
    if (!now) continue;
    for (const field of ["shortCode", "kind", "contentType", "workspaceId", "isArchived", "hasTarget", "contractHash"]) {
      if (base[field] !== now[field]) changed.push(`${base.id}: изменено поле ${field}`);
    }
    if (!base.contractHash || !now.contractHash) errors.push(`${base.id}: отсутствует отпечаток содержимого QR`);
  }
  errors.push(...changed);
  if (current.critical.length) errors.push(`QR с критическими флагами: ${current.critical.length}`);
  return { errors, missing, added, changed };
}
