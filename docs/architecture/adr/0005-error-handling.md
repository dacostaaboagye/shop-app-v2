# ADR 0005: Structured Error Handling On Frontend And Backend

## Status

Accepted

## Context

The platform spans admin workflows, worker portals, supplier access, and public commerce. Silent failures or inconsistent error responses will create support debt quickly.

## Decision

- Backend failures return a typed problem-details envelope with request correlation
- Unexpected backend exceptions are logged and mapped to a generic 500 response
- Domain errors expose stable machine-readable codes
- Frontend routes provide global and route-level fallback UI with safe retry guidance
- UI consumes the shared error contract rather than parsing ad-hoc strings

## Consequences

- Error handling becomes part of the architecture, not component-level improvisation
- Logs and support cases can be correlated with request IDs
- Agents can add new features without inventing new error shapes

