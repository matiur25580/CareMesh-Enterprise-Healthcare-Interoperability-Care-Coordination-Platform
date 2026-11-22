# Security baseline

This document describes engineering guardrails, not a compliance certification.

- Authenticate every non-public route and derive tenant membership from verified server-side claims.
- Enforce role/attribute authorization and evaluate consent plus purpose of use before clinical-data disclosure.
- Use TLS and managed encryption at rest; keep secrets outside source control and rotate keys.
- Apply request-size limits, rate limits, secure headers, and strict CORS allowlists.
- Redact tokens, identifiers, and clinical content from logs and telemetry.
- Record organization-scoped audit events for successful patient and clinical-record reads, searches, creation, and updates; include actor, action, resource reference, outcome, timestamp, and request correlation ID without copying clinical payloads into the audit record.
- Scan uploads, validate content types, and store files outside the web root.
- Define retention, deletion, backup, restore, and incident-response procedures.

Use synthetic data only. Before handling real health information, complete threat modeling, penetration testing, privacy/legal assessment, recovery testing, and applicable jurisdictional compliance work.


## Audit coverage and limitations

The current patient API emits success audit events for patient search/read/create/update and clinical-record list/create operations. Audit persistence is awaited before the API returns the protected response. The current slice does not yet record denied authorization attempts, authentication events, organization administration, exports, or background integration access. It is an application-level audit foundation, not a tamper-proof or compliance-certified audit system; database-level immutability, retention controls, export, and independent monitoring remain future work.


## Consent and purpose-of-use foundation

The patient API supports organization-scoped consent records with explicit purposes (`treatment`, `payment`, `operations`), effective/expiry dates, grant source, and revocation metadata. Patient search, patient detail, and clinical-record list requests require an explicit `purpose` query parameter; clinical-record creation requires `purpose` in the request body. Access is denied unless an active, unrevoked consent for that patient, organization, and purpose is effective at request time. Access audit events capture the declared purpose and denied checks.

Consent grants are recorded through `POST /api/v1/patients/:patientId/consents`; revocation uses `POST /api/v1/patients/:patientId/consents/:consentId/revoke`. These endpoints are role-gated and retain the authenticated actor. This is an engineering foundation only: it does not establish legal authority, validate identity of the patient/representative, model jurisdiction-specific exceptions, emergency/break-glass access, granular data categories, or prove regulatory compliance. Use synthetic data only.


## Consent management workspace

Authorized owners, administrators, and clinicians can retrieve a patient's consent history through `GET /api/v1/patients/:patientId/consents`. The endpoint scopes both patient lookup and consent query to the authenticated organization, returns at most 50 newest records, and audits the history read. The patient workspace displays active/revoked status, purposes, source, effective/expiry dates, evidence reference, and revocation time. Authorized users can record additional consent or revoke an active consent. Revocation records the authenticated actor and is audited.

When the clinical-record endpoint returns `CONSENT_REQUIRED`, the workspace displays an explicit access-denial explanation while keeping consent history available to the authorized operator. This is an operator workflow, not proof of patient authorization or legal sufficiency. Consent history is bounded to the latest 50 entries; no export, immutable ledger, patient self-service, or jurisdiction-specific legal review is included. Use synthetic data only.


## Consent validity states

Consent history now returns a derived `authorizationState` for each record: `active`, `scheduled`, `expired`, `revoked`, or `invalid`. The state is evaluated against the API response time and is separate from the persisted grant/revocation status. Future-dated consent is not yet effective; consent expires at the exact expiry instant; malformed dates fail closed as invalid. Clinical access enforcement continues to query only effective, unrevoked, unexpired consent. This is an operational display aid and does not determine legal validity.
