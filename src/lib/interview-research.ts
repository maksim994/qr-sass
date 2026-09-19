export type InterviewSegment = "current" | "agency_print" | "smb_document" | "other";

export type InterviewStatus = "not_started" | "queued" | "done" | "declined";

export type InterviewCard = {
  id: string;
  segment: InterviewSegment;
  status: InterviewStatus;
  orgHint?: string;
  job: string | null;
  alternative: string | null;
  frequency: string | null;
  obstacles: string | null;
  printed?: boolean | null;
  changedDestination?: boolean | null;
  quotes?: string[];
};

export type InterviewRegistry = {
  version: number;
  updated: string;
  acceptance: {
    currentUserInterview: boolean;
    tenSegmentInterviews: boolean;
    note: string;
  };
  segments: Array<{ id: string; label: string; planned: number }>;
  cards: InterviewCard[];
};

const FILLED = (value: string | null | undefined) => typeof value === "string" && value.trim().length > 0;

export function isSubstantiveCard(card: InterviewCard): boolean {
  return FILLED(card.job) && FILLED(card.alternative) && FILLED(card.frequency) && FILLED(card.obstacles);
}

/** B32 current-user slot: empty fields mean we did not invent answers. */
export function currentUserCardIsBlank(card: InterviewCard | undefined): boolean {
  if (!card || card.id !== "I-00") return false;
  return (
    card.job == null &&
    card.alternative == null &&
    card.frequency == null &&
    card.obstacles == null &&
    card.status !== "done"
  );
}

export function plannedSegmentCounts(cards: InterviewCard[]): { agency_print: number; smb_document: number } {
  return {
    agency_print: cards.filter((card) => card.segment === "agency_print").length,
    smb_document: cards.filter((card) => card.segment === "smb_document").length,
  };
}

export function b32AcceptanceFromRegistry(registry: InterviewRegistry): {
  currentUserInterview: boolean;
  tenSegmentInterviews: boolean;
  flagsMatchCards: boolean;
} {
  const current = registry.cards.find((card) => card.id === "I-00");
  const currentUserInterview = Boolean(current && isSubstantiveCard(current));
  const tenSegmentInterviews =
    registry.cards.filter((card) => card.id !== "I-00" && isSubstantiveCard(card)).length >= 10;
  return {
    currentUserInterview,
    tenSegmentInterviews,
    flagsMatchCards:
      registry.acceptance.currentUserInterview === currentUserInterview &&
      registry.acceptance.tenSegmentInterviews === tenSegmentInterviews,
  };
}
