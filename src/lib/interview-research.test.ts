import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { b32AcceptanceFromRegistry, currentUserCardIsBlank, plannedSegmentCounts, type InterviewRegistry } from "./interview-research.ts";

// Synthetic fixtures keep repository tests independent of private research notes.
function registry(): InterviewRegistry {
  return {
    version: 1, updated: "2026-09-19",
    acceptance: { currentUserInterview: false, tenSegmentInterviews: false, note: "fixture" },
    segments: [],
    cards: Array.from({ length: 11 }, (_, index) => ({
      id: `I-${String(index).padStart(2, "0")}`,
      segment: index === 0 ? "current" : index <= 5 ? "agency_print" : "smb_document",
      status: "queued", job: null, alternative: null, frequency: null, obstacles: null,
    })),
  };
}
describe("interview acceptance", () => {
  it("counts planned segments independently of the current customer", () => {
    assert.deepEqual(plannedSegmentCounts(registry().cards), { agency_print: 5, smb_document: 5 });
  });
  it("does not count blank cards as completed interviews", () => {
    const data = registry();
    assert.equal(currentUserCardIsBlank(data.cards[0]), true);
    assert.deepEqual(b32AcceptanceFromRegistry(data), { currentUserInterview: false, tenSegmentInterviews: false, flagsMatchCards: true });
  });
  it("detects stale acceptance flags after substantive interviews", () => {
    const data = registry();
    for (const card of data.cards) Object.assign(card, { job: "job", alternative: "alternative", frequency: "weekly", obstacles: "cost", status: "done" });
    assert.equal(currentUserCardIsBlank(data.cards[0]), false);
    assert.deepEqual(b32AcceptanceFromRegistry(data), { currentUserInterview: true, tenSegmentInterviews: true, flagsMatchCards: false });
  });
});
