# Contributing

CareMesh is an early-stage healthcare interoperability and care-coordination project. Contributions should be small, reviewable, and explicit about what is implemented versus proposed.

## Before starting
- Read the README, security policy, and relevant design notes.
- Open or discuss an issue before large architectural changes.
- Do not use real patient records, PHI, credentials, or production exports in code, tests, screenshots, logs, or issue reports. Use synthetic data only.

## Engineering expectations
- Validate all data at trust boundaries and fail safely.
- Enforce authentication, authorization, and organization scope on the server.
- Minimize sensitive data and avoid logging request/response bodies containing health information.
- Add tests for authorization, tenant boundaries, validation, and failure paths as features are introduced.
- Document interoperability assumptions, data provenance, and operational requirements.

## Pull requests
Describe the problem, scope, implementation status, tests run, security/privacy impact, and known limitations. Do not claim clinical validation or regulatory compliance without independent evidence.
