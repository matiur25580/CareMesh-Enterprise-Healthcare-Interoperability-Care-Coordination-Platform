# Security baseline

This document describes engineering guardrails, not a compliance certification.

- Authenticate every non-public route and derive tenant membership from verified server-side claims.
- Enforce role/attribute authorization and evaluate consent plus purpose of use before clinical-data disclosure.
- Use TLS and managed encryption at rest; keep secrets outside source control and rotate keys.
- Apply request-size limits, rate limits, secure headers, and strict CORS allowlists.
- Redact tokens, identifiers, and clinical content from logs and telemetry.
- Record append-only audit events for access and administrative actions.
- Scan uploads, validate content types, and store files outside the web root.
- Define retention, deletion, backup, restore, and incident-response procedures.

Use synthetic data only. Before handling real health information, complete threat modeling, penetration testing, privacy/legal assessment, recovery testing, and applicable jurisdictional compliance work.
