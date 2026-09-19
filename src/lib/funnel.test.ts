import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyOpen,
  FUNNEL_DEFINITIONS,
  isInternalReferer,
  isPrivateOrLocalIp,
  sanitizeFunnelSource,
} from "./funnel.ts";

describe("funnel open classification", () => {
  it("treats owner, bot and local IP as test, not activation", () => {
    assert.equal(
      classifyOpen({
        userAgent: "Mozilla/5.0 iPhone",
        ip: "8.8.8.8",
        viewerUserId: "u1",
        ownerUserIds: ["u2"],
      }).isExternal,
      true,
    );
    assert.equal(
      classifyOpen({
        userAgent: "Mozilla/5.0 iPhone",
        ip: "8.8.8.8",
        viewerUserId: "u1",
        ownerUserIds: ["u1"],
      }).isExternal,
      false,
    );
    assert.equal(classifyOpen({ userAgent: "Googlebot/2.1" }).isExternal, false);
    assert.equal(classifyOpen({ userAgent: "Mozilla/5.0", ip: "127.0.0.1" }).isExternal, false);
    assert.equal(classifyOpen({ userAgent: "Mozilla/5.0", ip: "::ffff:127.0.0.1" }).isExternal, false);
    assert.equal(isPrivateOrLocalIp("::ffff:10.1.2.3"), true);
    assert.equal(classifyOpen({ userAgent: "Mozilla/5.0", ip: "192.168.0.12" }).isExternal, false);
    assert.equal(classifyOpen({ userAgent: "Mozilla/5.0", ip: "10.0.0.4" }).isExternal, false);
    assert.equal(
      classifyOpen({ userAgent: "Mozilla/5.0", referer: "https://qr-s.ru/dashboard/library" }).isExternal,
      false,
    );
  });

  it("detects private IPs used in self-tests", () => {
    assert.equal(isPrivateOrLocalIp("127.0.0.1"), true);
    assert.equal(isPrivateOrLocalIp("172.16.3.9"), true);
    assert.equal(isPrivateOrLocalIp("8.8.8.8"), false);
    assert.equal(isInternalReferer("https://qr-s.ru/preview/landings"), true);
  });
});

describe("funnel source sanitizer", () => {
  it("keeps a path or utm token and drops secrets", () => {
    assert.equal(sanitizeFunnelSource("/qr-menu"), "/qr-menu");
    assert.equal(sanitizeFunnelSource("google"), "google");
    assert.equal(sanitizeFunnelSource("user@example.com"), null);
    assert.equal(sanitizeFunnelSource("https://cafe.example/menu?token=secret"), "/menu");
    assert.equal(sanitizeFunnelSource("javascript:alert(1)"), null);
  });
});

describe("funnel copy", () => {
  it("does not equate a widget click with payment", () => {
    assert.match(FUNNEL_DEFINITIONS.payment, /не являются/i);
    assert.match(FUNNEL_DEFINITIONS.activation, /внешнее открытие/i);
  });
});
