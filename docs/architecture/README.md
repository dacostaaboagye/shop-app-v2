# Architecture

The system is intentionally starting as a modular monolith.

That choice is deliberate:

- the backlog has heavy transactional coupling between permissions, ownership, reservations, sales, and deliveries
- consistency matters more than independent deployment at this stage
- modular boundaries inside one deployable unit are cheaper to enforce than a microservice mesh

Read the ADRs in this folder before altering repository structure, identity rules, or persistence patterns.

Additional supporting documents:

- `authentication-schema.md`: auth table structure and runtime mapping for `E-01-01`
- `access-control-schema.md`: permission, role, override, and audit structure for `E-00D-01`
