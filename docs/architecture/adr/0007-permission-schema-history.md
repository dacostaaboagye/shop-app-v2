# ADR 0007: Permission Grants And Overrides Preserve History

## Status

Accepted

## Context

The workbook requires permission-based authorization with immediate revocation and clear accountability for who changed access. That makes role assignments and user-specific overrides operational evidence, not disposable join rows.

## Decision

- Role assignments are stored as historical rows with revocation metadata instead of destructive deletes.
- User permission overrides are explicit `allow` or `deny` records.
- Override removal keeps actor, timestamp, and reason metadata on the existing historical record.
- Permission audit rows must capture actor, target, location scope, action, and override effect when relevant.

## Consequences

- Permission resolution will filter historical rows down to the currently active grants and overrides.
- Access reviews and incident investigation can rely on database evidence instead of reconstructing changes from logs.
- Future mutation services must preserve history instead of replacing access rows in place.
