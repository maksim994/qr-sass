import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { SignJWT } from "jose";
import { getDb } from "../src/lib/db.ts";
import { defaultQrStyle } from "../src/lib/qr-style-config.ts";
import { prepareStaticQr } from "../src/lib/static-qr.ts";
import sharp from "sharp";
import jsQR from "jsqr";

const base = "http://localhost:3108";
const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
if (database.hostname !== "127.0.0.1" || database.port !== "55438" || database.pathname !== "/qr_readiness") throw new Error("Requires isolated qr_readiness DB on localhost:55438");
const db = getDb(), run = randomUUID(), workspaceIds: string[] = [];
let userId = "", checks = 0;
function passed(text: string) { checks++; console.log(`PASS ${text}`); }
try {
  const u = await db.user.create({ data: { email: `qr-path-${run}@example.test`, passwordHash: "synthetic-unusable-password" } }); userId = u.id;
  const token = await new SignJWT({ sub: u.id, email: u.email, sv: u.sessionVersion }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h").sign(new TextEncoder().encode("synthetic-readiness-secret-at-least-32-characters"));
  async function workspace(plan: "FREE" | "PRO") {
    const ws = await db.workspace.create({ data: { name: "Synthetic QR path", slug: `qr-path-${plan}-${run}`, plan, accessMode: plan === "PRO" ? "friends" : "standard", memberships: { create: { userId, role: "OWNER" } } } }); workspaceIds.push(ws.id); return ws;
  }
  const free = await workspace("FREE"), pro = await workspace("PRO");
  function headers(ws = free.id) { return { Cookie: `qr_saas_session=${token}; qr_workspace_id=${ws}; csrf_token=qr-path-csrf`, Origin: base, "X-CSRF-Token": "qr-path-csrf", "Content-Type": "application/json" }; }
  const api = (path: string, body: unknown, method = "POST", ws = free.id) => fetch(base + path, { method, headers: headers(ws), body: JSON.stringify(body) });
  async function create(type: string, payload: Record<string, unknown>) {
    const prepared = prepareStaticQr(type, payload); assert.ok(prepared.ok);
    const r = await api("/api/qr", { workspaceId: free.id, kind: "STATIC", contentType: type, name: type, payload: prepared.payload, style: { ...defaultQrStyle, quietZoneModules: 4 } });
    assert.equal(r.status, 200, await r.clone().text());
    const id = (await r.json()).data.qrId as string;
    const row = await db.qrCode.findUniqueOrThrow({ where: { id } });
    assert.equal(row.kind, "STATIC"); assert.equal(row.shortCode, null); assert.equal(row.encodedContent, prepared.data); return row;
  }
  const examples = { URL: { url: "https://example.com/original" }, TEXT: { text: "Привет 🌍" }, WIFI: { ssid: " Cafe; ", password: " secret ", encryption: "WPA" }, VCARD: { firstName: "Иван", lastName: "Иванов;старший" }, EMAIL: { email: "hello@example.com" }, PHONE: { phone: "+79991234567" }, SMS: { phone: "+79991234567", message: "Да" }, LOCATION: { latitude: "55.75", longitude: "37.6" } };
  const saved = [];
  for (const [type, payload] of Object.entries(examples)) saved.push(await create(type, payload));
  passed("FREE archive stores all 8 independent static formats without managed paths");
  const textQr = saved.find(qr => qr.contentType === "TEXT")!;
  for (const format of ["png", "svg"]) {
    const response = await fetch(`${base}/api/qr/${textQr.id}/download?format=${format}`, { headers: headers() });
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, examples.TEXT.text);
  }
  passed("saved Russian text and emoji round-trip through actual PNG and SVG downloads");
  const vcard = saved.find(qr => qr.contentType === "VCARD")!;
  const page = await fetch(`${base}/dashboard/qr/${vcard.id}`, { headers: headers() }); assert.equal(page.status, 200); assert.match(await page.text(), /Статический код работает без отслеживания/);
  assert.equal((await api(`/api/qr/${vcard.id}`, { name: "Контакты переименованы" }, "PATCH")).status, 200);
  const after = await db.qrCode.findUniqueOrThrow({ where: { id: vcard.id } }); assert.equal(after.encodedContent, vcard.encodedContent); assert.equal(after.shortCode, null);
  assert.equal((await api(`/api/qr/${vcard.id}/duplicate`, {})).status, 200);
  passed("view, rename and duplicate preserve inline vCard on FREE");
  const original = saved[0];
  const version = prepareStaticQr("URL", { url: "https://example.com/new-version" }); assert.ok(version.ok);
  const competing = await Promise.all([1, 2].map(i => api("/api/qr", { workspaceId: free.id, kind: "STATIC", contentType: "URL", name: `version ${i}`, payload: version.payload, style: defaultQrStyle })));
  assert.deepEqual(competing.map(r => r.status).sort(), [200, 403]);
  const revisionId = (await competing.find(r => r.status === 200)!.json()).data.qrId; assert.notEqual(revisionId, original.id);
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: original.id } })).encodedContent, original.encodedContent);
  assert.equal((await api("/api/qr", { workspaceId: free.id, kind: "STATIC", contentType: "TEXT", name: "over quota", payload: { text: "extra", staticDirect: true }, style: defaultQrStyle })).status, 403);
  passed("new static version keeps original; archive quota remains unchanged");
  const freeDynamic = await api("/api/qr", { workspaceId: free.id, kind: "DYNAMIC", contentType: "URL", name: "must not downgrade", payload: { url: "https://example.com" }, style: defaultQrStyle }); assert.equal(freeDynamic.status, 403);
  passed("FREE dynamic request fails explicitly instead of creating static");
  const r = await api("/api/qr", { workspaceId: pro.id, kind: "DYNAMIC", contentType: "URL", name: "Dynamic path", payload: { url: "https://example.com/before" }, style: defaultQrStyle }, "POST", pro.id); assert.equal(r.status, 200);
  const dynamicId = (await r.json()).data.qrId;
  const dynamic = await db.qrCode.findUniqueOrThrow({ where: { id: dynamicId } });
  const image = await fetch(`${base}/api/qr/${dynamic.id}/download?format=png`, { headers: headers(pro.id) }); assert.equal(image.status, 200); assert.equal(image.headers.get("content-type"), "image/png");
  await image.arrayBuffer();
  let opening = await fetch(dynamic.encodedContent, { redirect: "manual" }); assert.equal(opening.status, 307); assert.equal(opening.headers.get("location"), "https://example.com/before");
  assert.equal((await api(`/api/qr/${dynamic.id}/target`, { targetUrl: "https://example.com/after" }, "PATCH", pro.id)).status, 200);
  opening = await fetch(dynamic.encodedContent, { redirect: "manual" }); assert.equal(opening.headers.get("location"), "https://example.com/after");
  assert.equal((await db.qrCode.findUniqueOrThrow({ where: { id: dynamic.id } })).encodedContent, dynamic.encodedContent);
  passed("dynamic create, PNG download, open, destination change and same printed URL work");
  await db.subscription.create({ data: { workspaceId: pro.id, plan: "PRO", status: "expired", currentPeriodEnd: new Date(0) } });
  await db.workspace.update({ where: { id: pro.id }, data: { accessMode: "standard", plan: "FREE" } });
  opening = await fetch(dynamic.encodedContent, { redirect: "manual" }); assert.equal(opening.headers.get("location"), "https://example.com/after");
  await db.workspace.update({ where: { id: pro.id }, data: { accessMode: "friends", plan: "PRO" } });
  passed("expired access does not disable existing printed dynamic URL");
  async function bulk(text: string, key: string) {
    const fd = new FormData(); fd.set("workspaceId", pro.id); fd.set("batchKey", key); fd.set("file", new File([text], "test.csv", { type: "text/csv" }));
    const h: Record<string, string> = headers(pro.id); delete h["Content-Type"];
    return fetch(`${base}/api/qr/bulk`, { method: "POST", headers: h, body: fd });
  }
  const tooMany = "url\n" + Array.from({ length: 51 }, (_, i) => `https://example.com/${i}`).join("\n");
  const fdLimit = new FormData(); fdLimit.set("workspaceId", free.id); fdLimit.set("file", new File([tooMany], "large.csv"));
  const limitHeaders: Record<string, string> = headers(); delete limitHeaders["Content-Type"];
  assert.equal((await fetch(`${base}/api/qr/bulk`, { method: "POST", headers: limitHeaders, body: fdLimit })).status, 403);
  const before = await db.qrCode.count({ where: { workspaceId: pro.id } });
  assert.equal((await bulk("url\nhttps://example.com/valid\ninvalid", randomUUID())).status, 400);
  assert.equal(await db.qrCode.count({ where: { workspaceId: pro.id } }), before);
  const csv = "url,name\n" + Array.from({ length: 50 }, (_, i) => `https://example.com/${i},Код ${i}`).join("\n"), key = randomUUID();
  const started = performance.now();
  const first = await bulk(csv, key); assert.equal(first.status, 200, await first.clone().text());
  const zip = Buffer.from(await first.arrayBuffer()), end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06])); assert.ok(end >= 0); assert.equal(zip.readUInt16LE(end + 10), 50);
  console.log(`BULK 50 rows ${Math.round(performance.now() - started)}ms ${zip.length} bytes`);
  const retry = await bulk(csv, key); assert.equal(retry.status, 200); await retry.arrayBuffer();
  assert.equal(await db.qrCode.count({ where: { workspaceId: pro.id } }), before + 50);
  assert.equal((await bulk("url\nhttps://example.com/different", key)).status, 409);
  passed("bulk rejects whole invalid CSV, returns 50 PNGs and replays without duplicates; changed payload conflicts");
  const ckey = randomUUID(), pair = await Promise.all([bulk("url\nhttps://example.com/concurrent", ckey), bulk("url\nhttps://example.com/concurrent", ckey)]);
  assert.deepEqual(pair.map(r => r.status), [200, 200]); for (const response of pair) await response.arrayBuffer();
  assert.equal(await db.qrCode.count({ where: { workspaceId: pro.id } }), before + 51);
  passed("concurrent replay reserves one bulk batch");
  console.log(`${checks} QR path HTTP checks passed`);
} finally {
  await db.workspace.deleteMany({ where: { id: { in: workspaceIds } } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
}
