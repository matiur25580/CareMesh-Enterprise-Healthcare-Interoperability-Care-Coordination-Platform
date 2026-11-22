# Identity, access, and tenant isolation

## Identity model
- Users authenticate with normalized email and a bcrypt password hash (work factor 12).
- Organization membership is stored separately from the user account. A user can belong to multiple organizations.
- Membership roles are scoped to one organization: owner, admin, clinician, coordinator, analyst, or member.

## Session lifecycle
- API access tokens are signed JWTs with a 15-minute lifetime and explicit issuer/audience.
- Refresh tokens are opaque random values, stored only as SHA-256 hashes, rotated atomically on refresh, and delivered in an HttpOnly, SameSite=Strict cookie.
- Logout revokes the matching server-side session. Protected requests verify both token claims and the live session record.
- Production requires a unique high-entropy JWT_SECRET and HTTPS.

## Tenant authorization
- Tenant identity is derived from the verified access token, never trusted from request body or query parameters.
- Tenant switching requires an active membership in the destination organization and updates the server-side session.
- Resource queries must include the authenticated tenant identifier. Do not expose cross-tenant lookup endpoints.
- RBAC middleware is a coarse permission gate; sensitive clinical operations must additionally evaluate consent, purpose of use, and resource-level policy.

## Audit foundation
Audit events are append-only by application convention and capture actor, organization, action, resource type, outcome, request correlation identifier, and timestamp. Do not place clinical payloads, secrets, or unnecessary patient identifiers in audit metadata. Restrict audit reads and writes to dedicated service paths.

## Current limitations
This milestone provides registration, login, refresh/logout, identity introspection, organization listing/switching, role middleware, and an audit-event persistence primitive. Invitations, MFA/SSO, fine-grained ABAC, consent enforcement, audit query APIs, and account recovery are future work. It is not a compliance certification.
