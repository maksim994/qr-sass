import { COOKIE_CONSENT_VERSION } from "./cookie-consent-version.ts";
import assert from "node:assert/strict";
import { test } from "node:test";
import { JSDOM } from "jsdom";
import { LEGAL_VERSION, PRIVACY_VERSION, PRIVACY_SECTIONS, TERMS_SECTIONS } from "./legal-documents.ts";
import { LEGAL_VERSION as OLD_LEGAL_VERSION, PRIVACY_VERSION as OLD_PRIVACY_VERSION, PRIVACY_SECTIONS as OLD_PRIVACY } from "./legal-history/2026-10-18.ts";
import { ANALYTICS_POLICY_VERSION, isSiteAnalyticsSurface } from "./analytics-policy.ts";
import { parseCookieChoice, readCookieChoice, isAnalyticsEnabled, saveCookieChoice, acknowledgeCookieNotice, readCookieNotice } from "./cookie-consent.ts";
import { startMetrika, stopMetrika, analyticsPageUrl, trackMetrikaPageView } from "./metrika-runtime.ts";
import { trackGoal, PRODUCT_GOALS } from "./product-analytics.ts";
import { parseMetrikaAttribution } from "./metrika-attribution.ts";
import { partnerVisitSchema } from "./partner-rules.ts";

function browser() {
  const dom = new JSDOM("<!doctype html><html><head></head><body></body></html>", { url: "https://preview.example/" });
  const old = new Map(["window", "document", "Event"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.defineProperty(globalThis, "window", { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, "document", { value: dom.window.document, configurable: true });
  Object.defineProperty(globalThis, "Event", { value: dom.window.Event, configurable: true });
  return { dom, close() { dom.window.close(); for (const [key, value] of old) { if (value) Object.defineProperty(globalThis, key, value); else Reflect.deleteProperty(globalThis, key); } } };
}

test("refusal survives old policy and expiry; retired storage is ignored", () => {
  for (const record of [{choice:"declined",version:"2026-09-20.1",at:1}, {choice:"declined"}, {choice:"declined",at:Date.now()+1}]) assert.equal(parseCookieChoice(JSON.stringify(record)), "declined");
  const b = browser();
  try {
    window.localStorage.setItem("cookie_consent", "declined");
    assert.equal(readCookieChoice(), "none");
    assert.equal(isAnalyticsEnabled(), true);
    saveCookieChoice("accepted");
    assert.equal(readCookieChoice(), "accepted");
    assert.equal(window.localStorage.getItem("cookie_consent"), null);
    saveCookieChoice("declined");
    assert.match(document.cookie, /qrs_analytics_disabled=1/);
    window.localStorage.setItem("qrs_cookie_choice", JSON.stringify({choice:"accepted",version:COOKIE_CONSENT_VERSION,at:Date.now()}));
    assert.equal(readCookieChoice(), "declined", "server-visible refusal wins over stale local state");
    saveCookieChoice("accepted");
    assert.doesNotMatch(document.cookie, /qrs_analytics_disabled=1/);
  } finally { b.close(); }
});

test("new visitor starts one Webvisor counter; acknowledging the notice is not explicit consent", () => {
  const b = browser();
  try {
    assert.equal(readCookieChoice(), "none");
    assert.equal(isAnalyticsEnabled(), true);
    assert.equal(readCookieNotice(), false);
    acknowledgeCookieNotice();
    assert.equal(readCookieNotice(), true);
    assert.equal(window.localStorage.getItem("qrs_cookie_choice"), null);
    startMetrika("106988416"); startMetrika("106988416");
    assert.equal(document.querySelectorAll("script[data-qrs-analytics]").length, 1);
    const w = window as Window & { ym: { a: unknown[][] } };
    assert.deepEqual(w.ym.a, [["106988416", "init", {defer:true, clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true}]]);
    assert.equal(trackGoal(PRODUCT_GOALS.scan_success, {type:"TEXT",where:"landing",raw:"secret"}), true);
    assert.deepEqual(w.ym.a[1], ["106988416", "reachGoal", "scan_success", {type:"TEXT",where:"landing"}]);
    assert.equal(trackGoal(PRODUCT_GOALS.subscription_paid), false);
    document.cookie = "_ym_uid=123; Path=/";
    document.cookie = "csrf_token=keep; Path=/";
    window.localStorage.setItem("_ym_retryReqs", "secret");
    window.sessionStorage.setItem("_ym_debugger_state", "secret");
    saveCookieChoice("declined");
    assert.equal(stopMetrika(), true);
    assert.equal(document.querySelectorAll("script[data-qrs-analytics]").length, 0);
    assert.equal(document.documentElement.dataset.ymId, undefined);
    assert.equal(w.ym.a.some(call => call[1] === "init"), false, "pending init is removed before a late script can run it");
    assert.equal(window.localStorage.getItem("_ym_retryReqs"), null);
    assert.equal(window.sessionStorage.getItem("_ym_debugger_state"), null);
    assert.match(document.cookie, /csrf_token=keep/);
    assert.doesNotMatch(document.cookie, /_ym_uid/);
    assert.equal(trackGoal(PRODUCT_GOALS.scan_success), false);
    startMetrika("106988416");
    assert.equal(document.querySelectorAll("script[data-qrs-analytics]").length, 0);
  } finally { b.close(); }
});

test("policy markers do not claim a fabricated consent click and reject stale/disabled referral input", () => {
  const value = {clientId:"123",counterId:"106988416",policyVersion:ANALYTICS_POLICY_VERSION,collectionMode:"opt-out"};
  assert.deepEqual(parseMetrikaAttribution(value,"106988416"), value);
  assert.equal(parseMetrikaAttribution({...value,policyVersion:"old"},"106988416"),null);
  assert.equal(parseMetrikaAttribution(value,"999"),null);
  assert.equal(partnerVisitSchema.safeParse({code:"demo",analyticsEnabled:true,policyVersion:ANALYTICS_POLICY_VERSION}).success,true);
  assert.equal(partnerVisitSchema.safeParse({code:"demo",analyticsEnabled:false,policyVersion:ANALYTICS_POLICY_VERSION}).success,false);
  assert.equal(partnerVisitSchema.safeParse({code:"demo",analyticsEnabled:true,policyVersion:"old"}).success,false);
});

test("new legal edition keeps the former privacy snapshot and stable public anchors", () => {
  assert.equal(OLD_LEGAL_VERSION,"2026-10-08.1");
  assert.equal(OLD_PRIVACY_VERSION,"2026-10-18.1");
  assert.match(JSON.stringify(OLD_PRIVACY),/Вебвизор отключён/);
  assert.notEqual(LEGAL_VERSION,OLD_LEGAL_VERSION);
  assert.notEqual(PRIVACY_VERSION,OLD_PRIVACY_VERSION);
  const current=JSON.stringify(PRIVACY_SECTIONS);
  assert.doesNotMatch(current,/Вебвизор отключён|Само продолжение использования сайта не включает/);
  for(const id of ["section-4","section-5","section-6"]) assert.ok(PRIVACY_SECTIONS.some(s=>s.id===id));
  assert.doesNotMatch(JSON.stringify(TERMS_SECTIONS),/аналитика включается только после отдельного выбора/);
});


test("page views keep campaign attribution and omit QR content; SPA changes count once", () => {
  assert.equal(analyticsPageUrl("https://name:password@example.com/qr-wifi?content=secret&utm_source=blog&token=secret#password"), "https://example.com/qr-wifi?utm_source=blog");
  assert.equal(analyticsPageUrl("javascript:alert(1)"), "");
  const b=browser();
  try {
    startMetrika("106988416"); trackMetrikaPageView("106988416"); trackMetrikaPageView("106988416");
    const w=window as Window & {ym:{a:unknown[][]}};
    assert.equal(w.ym.a.filter(c=>c[1]==="hit").length,1);
    window.history.pushState({},"","/blog/demo?payload=secret&utm_source=article");
    trackMetrikaPageView("106988416");
    const hit=w.ym.a.filter(c=>c[1]==="hit")[1];
    assert.equal(hit[2],"https://preview.example/blog/demo?utm_source=article");
    saveCookieChoice("declined"); trackMetrikaPageView("106988416");
    assert.equal(w.ym.a.filter(c=>c[1]==="hit").length,2);
  } finally {b.close();}
});

test("a late ClientID result is discarded after opting out", async () => {
  const {getMetrikaAttribution}=await import('./metrika-client-id.ts');
  const b=browser();
  try {
    let callback:((id:string)=>void)|undefined;
    document.documentElement.dataset.ymId='106988416';
    Object.assign(window,{ym:(_id:string,method:string,cb:(id:string)=>void)=>{if(method==='getClientID')callback=cb;}});
    const pending=getMetrikaAttribution();
    saveCookieChoice('declined');
    callback?.('123456789');
    assert.equal(await pending,null);
  } finally {b.close();}
});

test("unreadable preferences fail closed; an explicit choice still works in session memory", () => {
  const b=browser();
  try {
    Object.defineProperty(window,'localStorage',{configurable:true,get(){throw Error('blocked');}});
    assert.equal(isAnalyticsEnabled(),false);
    saveCookieChoice('accepted');
    assert.equal(isAnalyticsEnabled(),true);
    saveCookieChoice('declined');
    assert.equal(isAnalyticsEnabled(),false);
  } finally {b.close();}
});


test("the main-site counter does not run on hosted customer QR pages", () => {
  for(const path of ["/r/demo","/p/demo","/v/demo","/g/demo","/preview/demo","/mini"])assert.equal(isSiteAnalyticsSurface(path),false);
  for(const path of ["/pricing","/privacy-policy","/register","/dashboard","/qr-wifi","/skaner-qr-koda"])assert.equal(isSiteAnalyticsSurface(path),true);
  const b=browser();
  try {window.history.replaceState({},"","/p/demo"); assert.equal(isAnalyticsEnabled(),false);startMetrika("106988416");assert.equal(document.querySelectorAll('script[data-qrs-analytics]').length,0);}finally{b.close();}
});

test("denied cookie access cannot crash preferences or prevent storing a refusal", () => {
  const b=browser();
  try {
    let changes=0;window.addEventListener('qrs:cookie-change',()=>changes++);
    Object.defineProperty(document,'cookie',{configurable:true,get(){throw new DOMException('denied','SecurityError');},set(){throw new DOMException('denied','SecurityError');}});
    assert.equal(readCookieChoice(),'unavailable');
    assert.equal(isAnalyticsEnabled(),false);
    assert.doesNotThrow(()=>saveCookieChoice('declined'));
    assert.equal(JSON.parse(window.localStorage.getItem('qrs_cookie_choice')!).choice,'declined');
    assert.equal(changes,1);
    assert.doesNotThrow(()=>stopMetrika());
    Reflect.deleteProperty(document,'cookie');
    assert.equal(readCookieChoice(),'declined');
    // With only cookie writes blocked, both local storage and dispatch still work.
    Object.defineProperty(document,'cookie',{configurable:true,get(){return '';},set(){throw new DOMException('denied','SecurityError');}});
    assert.doesNotThrow(()=>saveCookieChoice('accepted'));
    assert.equal(readCookieChoice(),'accepted');
    assert.doesNotThrow(()=>saveCookieChoice('declined'));
    assert.equal(readCookieChoice(),'declined');
  }finally{b.close();}
});
