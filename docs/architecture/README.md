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
- `catalog-schema.md`: product, category, and variant tables for `E-03-01`
- `delivery-schema.md`: delivery and delivery-item tables for `E-00C-01`
- `public-identifier-schema.md`: slug allocation and redirect retention for `E-00D-03`
- `stock-schema.md`: stock balance and reservation tables for `E-00B-01`
- `adr/0016-dedicated-messaging-module-and-email-runtime.md`: email and messaging architecture direction for `E-03-05B`
