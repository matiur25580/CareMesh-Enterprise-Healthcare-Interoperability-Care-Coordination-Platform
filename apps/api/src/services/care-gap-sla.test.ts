import { describe, expect, it } from "vitest";
import { summarizeCareGapSla } from "./care-gap-sla.js";

describe("summarizeCareGapSla", () => {
  const now = new Date("2026-11-22T12:00:00.000Z");
  it("classifies unresolved gaps by overdue, due-soon and on-track windows", () => {
    const result = summarizeCareGapSla([
      { status: "open", priority: "urgent", dueAt: "2026-11-22T11:00:00.000Z" },
      { status: "in_progress", priority: "soon", dueAt: "2026-11-23T00:00:00.000Z" },
      { status: "open", priority: "routine", dueAt: "2026-11-24T12:00:00.000Z" },
      { status: "resolved", priority: "urgent", dueAt: "2026-11-20T12:00:00.000Z" }
    ], now);
    expect(result).toMatchObject({
      total: 4, open: 3, resolved: 1, overdue: 1,
      dueWithin24Hours: 1, onTrack: 1,
      overdueByPriority: { urgent: 1, soon: 0, routine: 0 }
    });
  });

  it("handles an empty queue without division or NaN errors", () => {
    expect(summarizeCareGapSla([], now)).toMatchObject({
      total: 0, open: 0, resolved: 0, overdue: 0,
      dueWithin24Hours: 0, onTrack: 0
    });
  });

  it("does not classify a gap due exactly at the measurement time as overdue", () => {
    const result = summarizeCareGapSla([
      { status: "open", priority: "routine", dueAt: now }
    ], now);
    expect(result.overdue).toBe(0);
    expect(result.dueWithin24Hours).toBe(1);
  });
});
