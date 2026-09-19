import assert from "node:assert/strict";
import { test } from "node:test";
import { publicOrigin, publicSiteUrl } from "@/lib/public-url";

test("publicSiteUrl never emits a double slash after the host", () => {
  const previous = process.env.APP_URL;
  process.env.APP_URL = "https://qr-s.ru/";
  try {
    assert.equal(publicOrigin(), "https://qr-s.ru");
    assert.equal(publicSiteUrl("/blog/qr-kod-dlya-kalendarya"), "https://qr-s.ru/blog/qr-kod-dlya-kalendarya");
  } finally {
    if (previous === undefined) delete process.env.APP_URL;
    else process.env.APP_URL = previous;
  }
});
