import assert from "node:assert/strict";
import { test } from "node:test";
import { COOKIE_CONSENT_VERSION } from "./cookie-consent-version.ts";
import { PRODUCT_GOALS, trackGoal } from "./product-analytics.ts";
import { downloadQrFile } from "./download-qr-file.ts";

test("goals require current consent and a ready counter; payments cannot be forged by the client", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "window");
  const calls: unknown[][] = [];
  let choice = "declined";
  const fake = { location: { pathname: "/" }, __qrsYmId: "106988416", ym: (...args: unknown[]) => calls.push(args), localStorage: {
    getItem: () => JSON.stringify({ choice, version: COOKIE_CONSENT_VERSION, at: Date.now() }),
  } };
  Object.defineProperty(globalThis, "window", { value: fake, configurable: true });
  try {
    assert.equal(trackGoal(PRODUCT_GOALS.trial_started), false);
    assert.equal(trackGoal(PRODUCT_GOALS.hero_cta_click, { where: "hero" }), false);
    assert.equal(calls.length, 0);
    choice = "accepted";
    assert.equal(trackGoal(PRODUCT_GOALS.trial_started, { planId: "PRO" }), true);
    assert.deepEqual(calls, [["106988416", "reachGoal", "trial_started", { plan: "pro" }]]);
    assert.equal(trackGoal(PRODUCT_GOALS.subscription_paid), false);
    assert.equal(calls.length, 1);
    assert.equal(trackGoal(PRODUCT_GOALS.hero_cta_click, { where: "hero" }), true);
    assert.deepEqual(calls[1], ["106988416", "reachGoal", "hero_cta_click", { where: "hero" }]);
    assert.equal(calls.length, 2);
    fake.ym = () => { throw new Error("blocked"); };
    assert.equal(trackGoal(PRODUCT_GOALS.qr_created), false);
  } finally {
    if (original) Object.defineProperty(globalThis, "window", original);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("failed downloads and HTML/JSON error responses do not count as received files", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [new Response("error", { status: 403 }), new Response("<html>Login</html>", { headers: { "content-type": "text/html" } }), new Response('{}', { headers: { "content-type": "application/json" } }), new Response("")]) {
      globalThis.fetch = async () => response;
      await assert.rejects(downloadQrFile("/api/qr/test/download?format=png"));
    }
  } finally { globalThis.fetch = original; }
});

import { goalParams } from "./product-analytics.ts";
test("funnel parameters never include identities, URLs, QR contents or Wi-Fi secrets",()=>{
  assert.deepEqual(goalParams({email:"private@example.test",url:"https://private.test",name:"Private",wifiPassword:"secret",payload:{text:"private"},type:"URL",dynamic:true,where:"home",format:"SVG",frame:true,plan:"PRO"}),{type:"URL",plan:"pro",where:"home",dynamic:true,format:"svg",frame:true});
});
test("public goal identifiers match the ten configured Metrika events",()=>{
  const goals=new Set(Object.values(PRODUCT_GOALS));
  for(const goal of ["registration_completed","qr_created","qr_downloaded","first_external_open","checkout_started","payment_succeeded","dynamic_enabled","pricing_view","trial_started","upgrade_prompt_click"])assert.equal(goals.has(goal as never),true,goal);
});

test("media QR type MP3 retains its type dimension",()=>{assert.deepEqual(goalParams({type:"MP3"}),{type:"MP3"});});

test("scanner success carries only its type and surface, never decoded secrets", () => {
  assert.equal(PRODUCT_GOALS.scan_success,"scan_success");
  assert.deepEqual(goalParams({type:"WIFI",where:"landing",raw:"WIFI:S:private;P:secret;;",password:"secret",domain:"private.example",contact:{name:"Private"}}),{type:"WIFI",where:"landing"});
});
