# Patient identity and unified health records

## Scope

Milestone 3 adds an organization-scoped patient registry and a first clinical-record store. All examples and fixtures must use synthetic data. This is a foundation for later FHIR mapping and interoperability workflows, not a certified EHR or clinical decision-support system.

## Patient identity

Each patient belongs to exactly one organization in this milestone and has a tenant-local medical record number. Optional identifiers are represented as `system` + `value` pairs so later adapters can map assigning authorities and external identifiers without treating values from different systems as interchangeable.

The API rejects a create request when the medical record number or any supplied identifier pair already exists within the active organization. This is a deterministic duplicate guard, not probabilistic enterprise master-patient-index matching. Cross-organization identity linking, merge review, survivorship rules, and human adjudication are future work.

## Clinical records

Clinical records use a constrained resource type vocabulary (conditions, allergies, medication statements, observations, procedures, encounters, and notes), coded concepts, status, effective time, author, and optional note. These records are tenant-scoped and associated with a patient in the same organization.

## API

- `POST /api/v1/patients` — create a patient (owner, admin, clinician, coordinator)
- `GET /api/v1/patients` — search and cursor-page the active tenant's registry
- `GET /api/v1/patients/:patientId` — retrieve a tenant-scoped patient
- `PATCH /api/v1/patients/:patientId` — update demographics (cannot change MRN)
- `GET /api/v1/patients/:patientId/records` — list up to 100 records
- `POST /api/v1/patients/:patientId/records` — add a clinical record (owner, admin, clinician)

Every route requires an authenticated session. Queries include the verified tenant ID; a patient from another organization is returned as not found. Create and update actions use role authorization.

## Explicit limitations

Consent and purpose-of-use enforcement, cross-tenant patient linking, FHIR R4 resource serialization, terminology validation, document storage, provenance history, record correction workflows, audit-event integration, and clinical safety review are not implemented by this milestone. Do not put real patient information into this system.


## Consent and purpose-of-use foundation

The patient API supports organization-scoped consent records with explicit purposes (`treatment`, `payment`, `operations`), effective/expiry dates, grant source, and revocation metadata. Patient search, patient detail, and clinical-record list requests require an explicit `purpose` query parameter; clinical-record creation requires `purpose` in the request body. Access is denied unless an active, unrevoked consent for that patient, organization, and purpose is effective at request time. Access audit events capture the declared purpose and denied checks.

Consent grants are recorded through `POST /api/v1/patients/:patientId/consents`; revocation uses `POST /api/v1/patients/:patientId/consents/:consentId/revoke`. These endpoints are role-gated and retain the authenticated actor. This is an engineering foundation only: it does not establish legal authority, validate identity of the patient/representative, model jurisdiction-specific exceptions, emergency/break-glass access, granular data categories, or prove regulatory compliance. Use synthetic data only.


## Consent management workspace

Authorized owners, administrators, and clinicians can retrieve a patient's consent history through `GET /api/v1/patients/:patientId/consents`. The endpoint scopes both patient lookup and consent query to the authenticated organization, returns at most 50 newest records, and audits the history read. The patient workspace displays active/revoked status, purposes, source, effective/expiry dates, evidence reference, and revocation time. Authorized users can record additional consent or revoke an active consent. Revocation records the authenticated actor and is audited.

When the clinical-record endpoint returns `CONSENT_REQUIRED`, the workspace displays an explicit access-denial explanation while keeping consent history available to the authorized operator. This is an operator workflow, not proof of patient authorization or legal sufficiency. Consent history is bounded to the latest 50 entries; no export, immutable ledger, patient self-service, or jurisdiction-specific legal review is included. Use synthetic data only.
