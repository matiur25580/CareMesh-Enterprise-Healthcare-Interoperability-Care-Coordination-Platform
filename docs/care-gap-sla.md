# Care-gap SLA intelligence

The care-gap API exposes a consent-aware operational summary for care coordination teams.

## Endpoint

`GET /api/v1/care-gaps/sla-summary`

Requires authentication and one of the `owner`, `admin`, `clinician`, `coordinator`, or `analyst` roles. Tenant scope is derived from the authenticated membership; callers cannot supply an organization identifier.

The summary includes only active patients in the caller's organization who have active treatment consent at measurement time. It returns aggregate counts, not patient identifiers or clinical details. The read is recorded in the audit log as `care_gap.sla_summary.read`.

## SLA definitions

- **Overdue:** open or in-progress care gap with `dueAt` earlier than measurement time.
- **Due within 24 hours:** open or in-progress care gap due from measurement time through the next 24 hours.
- **On track:** open or in-progress care gap due after the 24-hour horizon.
- **Resolved:** care gap with resolved status; historical resolution timeliness is not inferred because the current model does not persist a dedicated `resolvedAt` timestamp.

The summary also breaks overdue items down by urgent, soon, and routine priority. The 24-hour horizon is currently fixed by the API contract.

## Bounded result behavior

At most 5,000 care gaps are classified per request. The response metadata includes `truncated`, `scanned`, and `maxRecords`; consumers must not present a truncated summary as a complete organization-wide count. The endpoint returns aggregate operational indicators only and does not expose PHI.

## Example response shape

```json
{
  "data": {
    "total": 125,
    "open": 90,
    "resolved": 35,
    "overdue": 12,
    "dueWithin24Hours": 18,
    "onTrack": 60,
    "overdueByPriority": {
      "urgent": 4,
      "soon": 5,
      "routine": 3
    },
    "measuredAt": "2026-11-22T12:00:00.000Z",
    "horizonHours": 24
  },
  "meta": {
    "truncated": false,
    "scanned": 125,
    "maxRecords": 5000
  }
}
```
