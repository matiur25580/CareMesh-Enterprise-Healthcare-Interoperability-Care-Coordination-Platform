export interface CareGapSlaInput {
  status: "open" | "in_progress" | "resolved";
  priority: "routine" | "soon" | "urgent";
  dueAt: Date | string;
}

export function summarizeCareGapSla(
  gaps: CareGapSlaInput[],
  now: Date = new Date(),
  horizonHours = 24
) {
  const nowMs = now.getTime();
  const horizonMs = nowMs + horizonHours * 60 * 60 * 1000;
  const open = gaps.filter(gap => gap.status !== "resolved");
  const overdue = open.filter(gap => new Date(gap.dueAt).getTime() < nowMs);
  const dueSoon = open.filter(gap => {
    const due = new Date(gap.dueAt).getTime();
    return due >= nowMs && due <= horizonMs;
  });
  const onTrack = open.filter(gap => new Date(gap.dueAt).getTime() > horizonMs);
  return {
    total: gaps.length,
    open: open.length,
    resolved: gaps.length - open.length,
    overdue: overdue.length,
    dueWithin24Hours: dueSoon.length,
    onTrack: onTrack.length,
    overdueByPriority: {
      urgent: overdue.filter(gap => gap.priority === "urgent").length,
      soon: overdue.filter(gap => gap.priority === "soon").length,
      routine: overdue.filter(gap => gap.priority === "routine").length
    },
    measuredAt: now.toISOString(),
    horizonHours
  };
}
