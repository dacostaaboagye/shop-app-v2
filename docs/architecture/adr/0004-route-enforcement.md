# ADR 0004: Authorization Is Enforced At Route Boundaries

## Status

Accepted

## Context

The workbook explicitly states that frontend visibility is not access control, and every sensitive route must enforce permissions on the server.

## Decision

- Each backend route definition declares an access policy
- Public routes must be explicitly tagged as public
- Protected routes must declare a permission key or authenticated-only policy
- Repository scripts fail the build when route files do not follow the route-definition convention

## Consequences

- Route composition is slightly more structured
- Security reviews become mechanical instead of opinion-based
- Agents can add endpoints without guessing how access control is applied

