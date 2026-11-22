# Security Policy

## Scope and status

CareMesh is an early-stage healthcare interoperability and care-coordination project. Do not treat this repository as a clinically validated, production-ready, or compliant healthcare system. No real patient information should be used for development, testing, demonstrations, or issue reports.

## Reporting a vulnerability

Do not disclose exploitable vulnerabilities, credentials, patient data, or detailed attack steps in public issues or pull requests. Use GitHub's private vulnerability reporting feature for this repository when available. Include the affected component, impact, reproducible non-sensitive evidence, and a suggested mitigation.

## Security requirements for future implementation

- Keep protected health information (PHI) out of source control, logs, telemetry, fixtures, screenshots, and support tickets.
- Authenticate service-to-service and user access; authorize every resource access on the server.
- Apply least privilege, explicit tenant/organization boundaries, and deny-by-default access.
- Encrypt data in transit and at rest using managed keys and documented rotation.
- Validate and minimize data exchanged through interoperability interfaces.
- Maintain tamper-evident audit records for access and sensitive changes.
- Use synthetic data in tests and demos; never copy production records into lower environments.
- Define retention, deletion, backup, incident response, and breach-handling procedures before production use.

## Disclosure

Please allow maintainers reasonable time to investigate and coordinate a fix before public disclosure.
