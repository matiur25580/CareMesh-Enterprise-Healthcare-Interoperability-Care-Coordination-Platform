# Contributing

- Preserve strict TypeScript settings and validate untrusted input at system boundaries.
- Keep tenant context explicit; never trust client-supplied tenant identifiers alone.
- Enforce authorization and consent on the server for every protected resource.
- Keep clinical data out of logs, URLs, analytics, and error messages.
- Use synthetic fixtures only; never commit real patient data or credentials.
- Document API changes and add tests for authorization boundaries.

Create focused branches from `main`. Run `npm run typecheck`, `npm test`, and `npm run build` before requesting review.
