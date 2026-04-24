# Access Control Schema

Backlog ticket: `E-00D-01`

This document records the persistence shape for permissions, roles, user role assignments, user-specific permission overrides, and permission audit history.

## Tables

### `permissions`

Canonical permission catalog.

- `id`: internal UUID primary key
- `key`: stable machine-readable permission key
- `description`: human-readable purpose

Constraints:

- unique `key`

### `roles`

Named bundles of permissions.

- `id`: internal UUID primary key
- `slug`: stable role identifier
- `name`: display name
- `description`: role purpose
- `is_system`: distinguishes platform-defined roles from future custom roles
- `created_at`: creation timestamp

Constraints:

- unique `slug`

### `role_permissions`

Join table linking roles to granted permissions.

- `role_id`: owning role
- `permission_id`: granted permission
- `granted_at`: grant timestamp

Constraints:

- unique `(role_id, permission_id)` pair so a role cannot grant the same permission twice

### `user_roles`

Append-only role assignment history for a user, optionally scoped to a location.

- `id`: internal UUID primary key
- `user_id`: target user
- `role_id`: assigned role
- `location_id`: nullable location scope
- `assigned_by`: nullable actor for bootstrap or system-created roles
- `assigned_at`: assignment timestamp
- `revoked_at`, `revoked_by`, `revoked_reason`: revocation metadata

Notes:

- role removal is represented by revocation metadata, not row deletion
- later permission resolution must ignore revoked assignments

### `user_permission_overrides`

Append-only user-specific grants or denials, optionally scoped to a location.

- `id`: internal UUID primary key
- `user_id`: target user
- `permission_id`: overridden permission
- `location_id`: nullable location scope
- `effect`: enum `allow | deny`
- `reason`: required rationale for the override
- `set_by`: actor who created the override
- `created_at`: creation timestamp
- `removed_at`, `removed_by`, `removed_reason`: removal metadata

Notes:

- overrides are explicit typed effects, not free-form text values
- override removal is preserved as metadata on the historical row

### `permission_audit_log`

Append-only audit trail for role and override changes.

- `id`: internal UUID primary key
- `actor_id`: user who made the change
- `target_user_id`: user whose access changed
- `action`: enum `role_assigned | role_revoked | override_set | override_removed`
- `location_id`: nullable location scope for scoped grants
- `permission_key`: nullable permission key for override events
- `role_slug`: nullable role slug for role events
- `override_effect`: nullable `allow | deny` effect for override events
- `reason`: required rationale
- `created_at`: audit timestamp

Notes:

- audit rows must be sufficient to explain who changed what, for whom, where, and why

## Resolution rules

- global role grants always participate in permission resolution
- location-scoped role grants participate only when the request is evaluating that same location
- active overrides are applied after role grants
- `deny` overrides remove an already-granted permission
- `allow` overrides can add a permission even without a role grant
- revoked role assignments and removed overrides never participate in effective permission resolution

## Route and navigation scope

- contextual route checks use the request location when one is present; without a location they see only global grants
- session navigation and selected read-only catalogue routes may resolve permissions across any active scope
- any-active resolution unions effective permissions from global scope and each active location scope after local overrides are applied
- write routes remain contextual unless they explicitly opt into a broader rule

## Supporting artifacts

- Schema source: [access-control.ts](/D:/work/personal/shop-app/shop-app-v2/packages/database/src/schema/access-control.ts)
- Generated migrations: [packages/database/drizzle](/D:/work/personal/shop-app/shop-app-v2/packages/database/drizzle)
