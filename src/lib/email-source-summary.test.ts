import assert from "node:assert/strict";
import { test } from "node:test";
import { emailSourceSummary } from "./email-source-summary.ts";
import { isSiteAnalyticsSurface } from "./analytics-policy.ts";
import { sourceCaptureAllowed } from "./signup-source.ts";

test("source digest preserves mixed source counts and revenue including untracked legacy payers", () => {
  const summary = emailSourceSummary(
    ["vk/cpc/autumn", "vk/cpc/autumn", "прямой заход"],
    [{ source: "vk/cpc/autumn", amount: 299 }, { source: "vk/cpc/autumn", amount: 2990 }, { source: "нет данных", amount: 299 }],
  );
  assert.match(summary, /vk\/cpc\/autumn: регистрации — 2, оплаты — 2, выручка — 3289 ₽/);
  assert.match(summary, /прямой заход: регистрации — 1, оплаты — 0, выручка — 0 ₽/);
  assert.match(summary, /нет данных: регистрации — 0, оплаты — 1, выручка — 299 ₽/);
  assert.match(emailSourceSummary([], []), /событий нет/);
});

test("merged analytics cannot capture email verification or password reset tokens", () => {
  for (const path of ["/verify-email", "/reset-password"]) {
    assert.equal(isSiteAnalyticsSurface(path), false);
    assert.equal(sourceCaptureAllowed(path), false);
  }
});
