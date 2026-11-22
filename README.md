# CareMesh

**Enterprise Healthcare Interoperability & Care Coordination Platform**

> One connected healthcare ecosystem. Every organization. Every authorized record. Better coordinated care.

CareMesh is a multi-tenant platform foundation for connecting healthcare organizations, clinical systems, diagnostics providers, payers, clinicians, and patients through consent-aware data exchange and coordinated workflows.

## Product direction

- **Unified health record:** longitudinal patient identity and clinical context.
- **Interoperability:** standards-oriented FHIR resources, integration adapters, validation, and delivery monitoring.
- **Care coordination:** referrals, transitions of care, tasks, and shared clinical context.
- **Consent and privacy:** purpose-aware authorization, explicit sharing permissions, and auditable access.
- **Payer workflows:** eligibility, claims exchange, reconciliation, and exception handling.
- **Operational intelligence:** integration health, turnaround times, workflow bottlenecks, and service-level visibility.

This repository currently contains the engineering foundation. Clinical workflows and production integrations will be introduced incrementally; sample data must remain synthetic.

## Architecture

A TypeScript monorepo using React + Vite + TypeScript, Node.js + Express + TypeScript, MongoDB + Mongoose, and a shared Zod contracts package.

See [Architecture](docs/architecture.md), [Security baseline](docs/security.md), and [Contributing](CONTRIBUTING.md).

## Quick start

Requirements: Node.js 22+, npm 10+, and Docker.

```bash
cp .env.example .env
docker compose up -d mongo
npm install
npm run dev
```

Web: http://localhost:5173  
API health: http://localhost:4000/api/v1/health

To point the web workspace at another API origin, set `VITE_API_BASE_URL` in the web app environment (defaults to `http://localhost:4000`).\n\n## Patient workspace\n\nThe Patient records workspace connects to the authenticated API endpoints introduced in Milestone 3. Sign in with an organization account to search the active tenant's patient registry, register a patient, inspect a patient profile, and add or review basic clinical records. The access token is held in session storage for the browser tab and refresh cookies are sent with credentialed requests. Patient queries remain server-side and tenant-scoped.\n\n## Security audit foundation

The patient API records organization-scoped audit events for successful patient and clinical-record operations. Audit records contain actor/action/resource metadata and request correlation IDs, not patient payloads. Coverage and limitations are documented in [Security baseline](docs/security.md).

## Quality commands

```bash
npm run typecheck
npm test
npm run build
```

## Safety and compliance

CareMesh is a software foundation, not a certified medical device or a claim of HIPAA, GDPR, or other regulatory compliance. Never use real patient information in development, demos, fixtures, or tests. Production deployment requires jurisdiction-specific legal, clinical-safety, privacy, and security review.


## Consent and purpose-of-use

Patient and clinical-record disclosure paths require an explicit purpose and an active matching consent. Consent grants and revocations are organization-scoped and audited. See [Security baseline](docs/security.md) for scope and limitations.


The patient workspace includes a consent management panel for viewing consent history, recording additional purposes, revoking active consent, and explaining consent-related clinical access denials. See [Security baseline](docs/security.md).
