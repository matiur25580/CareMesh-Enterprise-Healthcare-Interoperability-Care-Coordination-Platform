# FHIR R4 Observation exchange

CareMesh supports a bounded, read-only Observation search representation for synthetic clinical-record data.

## Endpoint

\`GET /api/v1/fhir/R4/Observation?patient=Patient/{patientId}&purpose=treatment\`

- Requires a valid CareMesh bearer session.
- Requires a patient reference and explicit purpose of use.
- Resolves the patient and observations only inside the authenticated organization.
- Requires active, effective, unrevoked consent matching organization, patient, and purpose.
- Audits successful and consent-denied exchange attempts.
- Returns a FHIR \`Bundle\` of type \`searchset\` with at most 100 observations, sorted newest first.
- Returns FHIR \`OperationOutcome\` errors and \`application/fhir+json\` responses.

## Supported mapping

| CareMesh clinical record | FHIR R4 Observation |
| --- | --- |
| record ID | \`id\` |
| active | \`status=final\` |
| inactive | \`status=cancelled\` |
| resolved | \`status=final\` |
| entered_in_error | \`status=entered-in-error\` |
| code.system/value/display | \`code.coding\` and \`code.text\` |
| patient ID | \`subject.reference\` |
| effectiveAt | \`effectiveDateTime\` |
| createdAt | \`issued\` |
| note | \`note\` |

## Important limitations

CareMesh clinical records currently store observation code and descriptive metadata, not a measured result. This mapping therefore does not invent a \`value[x]\` such as a quantity, interpretation, reference range, or unit. The status mapping is an explicit local translation and requires profile-level review before partner exchange. The schema validates only the subset CareMesh emits; it is not a complete FHIR R4 validator, profile validator, terminology service, or certification.

No inbound Observation writes, paging, date/code filters, Provenance, subscriptions, partner transport, or external terminology validation is included. Use synthetic data only; this feature is not a clinical decision or production interoperability service.
