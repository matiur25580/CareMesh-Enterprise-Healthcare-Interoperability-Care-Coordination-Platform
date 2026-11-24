# CareMesh architecture

## System context
CareMesh connects healthcare organizations, clinical systems, diagnostics providers, payers, clinicians, and patients through consent-aware data exchange and coordinated workflows.

## Repository layout
- `apps/api`: Express API, configuration, middleware, routes, and persistence boundary.
- `apps/web`: React operator workspace.
- `packages/contracts`: shared Zod schemas and TypeScript contracts.
- `docs`: architecture and security decisions.

## Trust boundaries
The browser is untrusted. The API authenticates actors, resolves tenant membership from verified identity, authorizes actions, evaluates consent and purpose of use, validates inputs, and emits audit events. Tenant-owned records carry immutable organization identifiers and are always queried with tenant scope.

## Interoperability direction
The integration layer will adopt HL7 FHIR R4-compatible contracts with explicit adapters, terminology mapping, validation, and partner-specific conformance tests. JSON resemblance alone is not FHIR conformance.

## Operations
Use correlation IDs, structured redacted logs, health/readiness checks, versioned APIs, documented compatibility, and durable asynchronous processing for external integration delivery and retries.
