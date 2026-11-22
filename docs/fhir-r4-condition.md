# FHIR R4 Condition exchange

CareMesh exposes a bounded, read-only Condition search representation for synthetic clinical-record data.

## Endpoint

`GET /api/v1/fhir/R4/Condition?patient=Patient/{patientId}&purpose=treatment`

- Requires an authenticated CareMesh bearer session and explicit purpose of use.
- Resolves the patient and Condition records only within the authenticated organization.
- Requires active, effective, unrevoked consent matching organization, patient, and purpose.
- Audits successful and consent-denied exchange attempts before responding.
- Returns a FHIR `Bundle` of type `searchset`, capped at 100 records, newest first.
- Returns FHIR `OperationOutcome` errors and `application/fhir+json` responses.

## Supported mapping

| CareMesh clinical record | FHIR R4 Condition |
| --- | --- |
| record ID | `id` |
| code.system/value/display | `code.coding` and `code.text` |
| patient ID | `subject.reference` |
| effectiveAt | `onsetDateTime` |
| createdAt (fallback: effectiveAt) | `recordedDate` |
| active / inactive / resolved | `clinicalStatus` using the HL7 condition-clinical code system |
| entered_in_error | `verificationStatus=entered-in-error`; clinicalStatus omitted |
| note | `note` |

## Terminology and limitations

Known system URIs and codes are passed through as supplied; CareMesh does not currently validate code membership, value-set binding, release version, or terminology licensing. The local status mapping is explicit but requires profile-level clinical review. The mapper does not infer diagnoses or clinical meaning.

The Zod contract validates only the resource subset emitted here. It is not a complete FHIR R4 validator, implementation guide profile, terminology service, CapabilityStatement, certification, or partner exchange guarantee. No inbound writes, paging, Provenance, subscriptions, or external partner transport is included. Use synthetic data only; this feature is not a clinical decision or production-ready interoperability service.
