import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  b32AcceptanceFromRegistry,
  currentUserCardIsBlank,
  plannedSegmentCounts,
  type InterviewRegistry,
} from "./interview-research.ts";

const researchDir = join(dirname(fileURLToPath(import.meta.url)), "../../docs/research-2026-09-18");

function loadRegistry(): InterviewRegistry {
  return JSON.parse(readFileSync(join(researchDir, "interviews.json"), "utf8")) as InterviewRegistry;
}

describe("B32 interview registry", () => {
  const registry = loadRegistry();

  it("plans five agency and five document interviews besides the current user", () => {
    const counts = plannedSegmentCounts(registry.cards);
    assert.equal(counts.agency_print, 5);
    assert.equal(counts.smb_document, 5);
    assert.equal(registry.cards.some((card) => card.id === "I-00"), true);
    assert.equal(registry.cards.length, 11);
  });

  it("does not invent current-user jobs, alternatives, frequency or obstacles", () => {
    const current = registry.cards.find((card) => card.id === "I-00");
    assert.equal(currentUserCardIsBlank(current), true);
    assert.equal(registry.acceptance.currentUserInterview, false);
    assert.equal(registry.acceptance.tenSegmentInterviews, false);
    const acceptance = b32AcceptanceFromRegistry(registry);
    assert.equal(acceptance.currentUserInterview, false);
    assert.equal(acceptance.flagsMatchCards, true);
  });
});

describe("B32 protocol copy", () => {
  it("forbids leading product questions", () => {
    const guide = readFileSync(join(researchDir, "INTERVIEW-GUIDE.md"), "utf8");
    assert.match(guide, /Запрещено спрашивать первым/);
    assert.match(guide, /менять ссылку после печати/);
    assert.match(guide, /Готовы платить/);
    const findings = readFileSync(join(researchDir, "FINDINGS.md"), "utf8");
    assert.match(findings, /Пока нет/);
    assert.doesNotMatch(findings, /собеседник сказал, что ему нужна динамика/i);
  });
});
