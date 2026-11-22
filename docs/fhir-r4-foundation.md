# FHIR R4 interoperability foundation

CareMesh exposes an initial, deliberately limited FHIR R4 Patient read representation.

## Endpoint

`GET /api/v1/fhir/R4/Patient/:patientId?purpose=treatment`

- Requires a valid CareMesh bearer session.
- Resolves the patient only within the authenticated organization.
- Requires an explicit `treatment`, `payment`, or `operations` purpose.
- Requires active, effective, unrevoked consent matching organization, patient, and purpose.
- Records both successful and consent-denied exchange attempts in the organization-scoped audit stream.
- Returns FHIR JSON using `application/fhir+json`; errors use a bounded FHIR `OperationOutcome` shape.

## Supported mapping

| CareMesh field | FHIR R4 Patient element |
| --- | --- |
| `_id` | `id` |
| `medicalRecordNumber` | `identifier` with `urn:caremesh:medical-record-number` |
| `identifiers` | `identifier` |
| `name.given/family` | `name` |
| `administrativeGender` | `gender` |
| `birthDate` | `birthDate` |
| `telecom.phone/email` | `telecom` |
| `address.line/city/region/postalCode/country` | `address` |
| `status` | `active` (only active maps to true) |

## Scope and limitations

The Zod contract validates only the fields emitted by this mapper and rejects unknown fields. It is not a complete FHIR R4 schema, profile validator, terminology service, CapabilityStatement, Bundle implementation, or certification. The MRN system URI is CareMesh-specific. No inbound FHIR writes, conditional interactions, search, history, versioning, Provenance, Observation, Encounter, Condition, or external partner transport is included yet. Those require explicit profiles, terminology bindings, partner identity, transport security, replay protection, and operational governance before production exchange.

Use synthetic data only. Do not treat this initial endpoint as evidence of regulatory compliance or clinical readiness.
