# ADR 0017: Testing Environment Deployment Pipeline

## Status

Superseded by ADR 0018

## Context

ADR 0017 captured an earlier testing deployment model based on GHCR images,
Docker Compose, and SSH access to a shared host.

That model no longer matches the intended hosting strategy for this system.
The application is being deployed with:

- Vercel for `apps/web`
- Fly.io for `apps/api`
- a dedicated worker process on Fly.io for platform-event delivery

Keeping the earlier host-based deployment decision as accepted guidance would
create operator confusion and drift between architecture docs and runtime
reality.

## Decision

The previous SSH and Docker Compose testing deployment model is superseded.
Follow ADR 0018 for the current testing deployment path.
