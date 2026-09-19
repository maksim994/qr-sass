import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateScannability, styleToScannability } from "./scannability.ts";
import { createQrSchema } from "./validation.ts";

test("white gradient and finders are not safe to use", () => {
  const score = evaluateScannability(
    styleToScannability({
      dotColor: "#111111",
      bgColor: "#ffffff",
      dotGradient: { colors: ["#ffffff", "#ffffff"] },
      cornerSquareColor: "#ffffff",
      cornerDotColor: "#ffffff",
    }),
  );
  assert.equal(score.safeToUse, false);
  assert.ok(score.score < 70);
});

test("transparent gradient and finders are not safe to use", () => {
  const score = evaluateScannability({
    dotColor: "#111111",
    bgColor: "#ffffff",
    dotGradient: { colors: ["transparent", "transparent"] },
    cornerSquareColor: "transparent",
    cornerDotColor: "transparent",
  });
  assert.equal(score.safeToUse, false);
  assert.equal(score.score, 0);
});

test("styleSchema rejects mapped-loopback logo URLs", async () => {
  const { styleSchema } = await import("./validation.ts");
  assert.equal(
    styleSchema.safeParse({ logoUrl: "http://[::ffff:127.0.0.1]:9/x", logoScale: 0.2 }).success,
    false,
  );
});

test("styleSchema rejects transparent gradient and finder colors", async () => {
  const { styleSchema } = await import("./validation.ts");
  assert.equal(
    styleSchema.safeParse({
      dotColor: "#111111",
      bgColor: "#ffffff",
      dotGradient: { type: "linear", colors: ["transparent", "transparent"] },
      cornerSquareColor: "transparent",
      cornerDotColor: "transparent",
    }).success,
    false,
  );
});

test("empty MENU, VCARD and LOCATION payloads are rejected", () => {
  const base = { workspaceId: "w", name: "n", kind: "STATIC", style: {} };
  for (const contentType of ["MENU", "VCARD", "LOCATION"]) {
    assert.equal(createQrSchema.safeParse({ ...base, contentType, payload: {} }).success, false);
  }
});
