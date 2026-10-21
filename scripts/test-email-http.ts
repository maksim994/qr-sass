import assert from "node:assert/strict";
import { getDb } from "../src/lib/db.ts";
import { LEGAL_VERSION } from "../src/lib/legal-documents.ts";
import { decryptIntegrationSecret } from "../src/lib/integration-secrets.ts";
if (!process.env.DATABASE_URL?.includes("/notifications_test"))
  throw new Error("Synthetic DB only");
const base = "http://localhost:3339",
  db = getDb();
let checks = 0,
  cookie = "";
function check(value: unknown, label: string) {
  assert.ok(value, label);
  checks++;
}
async function call(path: string, body: unknown, method = "POST") {
  const response = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify(body),
  });
  const cookies = response.headers.getSetCookie().map((s) => s.split(";")[0]);
  if (cookies.length) {
    const jar = new Map(
      cookie
        .split("; ")
        .filter(Boolean)
        .map((s) => [s.slice(0, s.indexOf("=")), s.slice(s.indexOf("=") + 1)]),
    );
    for (const item of cookies)
      jar.set(
        item.slice(0, item.indexOf("=")),
        item.slice(item.indexOf("=") + 1),
      );
    cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  return { response, body: await response.json() };
}
async function link(userId: string, kind: string) {
  const job = await db.emailOutbox.findFirstOrThrow({
    where: { userId, kind },
    orderBy: { createdAt: "desc" },
  });
  return {
    job,
    url: new URL(
      JSON.parse(decryptIntegrationSecret(job.payloadCipher!)).text.match(
        /http[^\s]+/,
      )[0],
    ),
  };
}
try {
  const name = `http-email-${Date.now()}`,
    email = `${name}@example.test`,
    password = "Synthetic-password-8832";
  const registered = await call("/api/auth/register", {
    name: "Почтовый тест",
    email,
    password,
    workspaceName: name,
    termsAccepted: true,
    consent: true,
    legalVersion: LEGAL_VERSION,
  });
  check(registered.response.ok, JSON.stringify(registered.body));
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  check(
    (await db.emailOutbox.count({
      where: { userId: user.id, kind: "verify_email" },
    })) === 1,
    "Registration queues one verification",
  );
  let verification = await link(user.id, "verify_email");
  const page = await fetch(verification.url);
  check(page.ok, "Verification landing loads");
  check(
    page.headers.get("referrer-policy") === "no-referrer",
    "Verification page protects URL from referrer leakage",
  );
  check(
    (await db.user.findUniqueOrThrow({ where: { id: user.id } }))
      .emailVerifiedAt === null,
    "GET or mail scanner does not confirm email",
  );
  let confirm = await call("/api/auth/verify-email", {
    token: verification.url.searchParams.get("token"),
  });
  check(confirm.response.ok, "Valid token confirms email");
  confirm = await call("/api/auth/verify-email", {
    token: verification.url.searchParams.get("token"),
  });
  check(confirm.response.status === 400, "Verification link is one-use");
  check(
    !!(await db.user.findUniqueOrThrow({ where: { id: user.id } }))
      .emailVerifiedAt,
    "Confirmation saved",
  );
  const csrf = await fetch(base + "/api/auth/verify-email", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ token: "a".repeat(64) }),
  });
  check(csrf.status === 403, "Browser verification requires CSRF");
  const forgot = await call("/api/auth/forgot-password", { email });
  check(forgot.response.ok, "Reset request succeeds");
  const reset = await link(user.id, "password_reset");
  const changed = await call(
    "/api/user/profile",
    { email: `changed-${email}`, currentPassword: password },
    "PATCH",
  );
  check(changed.response.ok, "Profile email change succeeds");
  check(
    !(await db.user.findUniqueOrThrow({ where: { id: user.id } }))
      .emailVerifiedAt,
    "Changed address needs fresh proof",
  );
  check(
    (await db.emailOutbox.count({
      where: { userId: user.id, kind: "email_changed" },
    })) === 1,
    "Old mailbox gets security notice",
  );
  const obsolete = await call("/api/auth/reset-password", {
    token: reset.url.searchParams.get("token"),
    password: "New-synthetic-password-3321",
  });
  check(
    obsolete.response.status === 401,
    "Old mailbox reset cannot take over changed address",
  );
  verification = await link(user.id, "verify_email");
  confirm = await call("/api/auth/verify-email", {
    token: verification.url.searchParams.get("token"),
  });
  check(confirm.response.ok, "New email can be verified");
  const changedPassword = await call(
    "/api/user/profile",
    {
      currentPassword: password,
      newPassword: "Another-synthetic-password-3000",
    },
    "PATCH",
  );
  check(changedPassword.response.ok, "Password change succeeds");
  check(
    (await db.emailOutbox.count({
      where: { userId: user.id, kind: "password_changed" },
    })) === 1,
    "Password change queues security notification",
  );
  const resetRequest = await call("/api/auth/forgot-password", {
    email: `changed-${email}`,
  });
  check(resetRequest.response.ok, "Second reset request succeeds");
  const validReset = await link(user.id, "password_reset");
  const resetSuccess = await call("/api/auth/reset-password", {
    token: validReset.url.searchParams.get("token"),
    password: "Reset-synthetic-password-5522",
  });
  check(resetSuccess.response.ok, "Password reset succeeds with valid link");
  const usedReset = await call("/api/auth/reset-password", {
    token: validReset.url.searchParams.get("token"),
    password: "Never-applied-password-5522",
  });
  check(usedReset.response.status === 401, "Reset link is one-use");
  check(
    (await db.emailOutbox.count({
      where: { userId: user.id, kind: "password_changed" },
    })) === 2,
    "Reset also queues password change notice",
  );
  const anonymous = await fetch(base + "/api/user/verify-email", {
    method: "POST",
  });
  check(anonymous.status === 401, "Resend is protected by session");
  console.log(JSON.stringify({ ok: true, checks, externalMessages: 0 }));
} finally {
  await db.$disconnect();
}
