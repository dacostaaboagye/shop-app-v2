# ADR 0008: Permission Resolution Uses Active Grants With Override Precedence

## Status

Accepted

## Context

`E-00D-02` requires server-side permission resolution on every protected request. The schema already supports role grants, location-scoped assignments, and user-specific overrides, but the system still needs a deterministic way to combine them.

## Decision

- Active role grants are the baseline permission set.
- A location-scoped grant or override applies only when the requested location matches that scope.
- Global grants and overrides apply to every request.
- Active user overrides are applied after role grants.
- `deny` overrides remove a permission even if a role grants it.
- `allow` overrides add a permission even when no role grants it.

## Consequences

- Authorization decisions are deterministic and testable.
- Immediate revocation remains server-side because inactive assignments and removed overrides are ignored at read time.
- Future route middleware can pass location context without changing the underlying precedence rules.
