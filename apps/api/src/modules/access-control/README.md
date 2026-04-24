# Access Control Module

Owns:

- permissions
- roles
- user role assignments
- user-level permission overrides
- permission audit history
- permission resolution
- route authorization middleware

Route boundary rules:

- protected routes resolve the current actor from the bearer access token on every request
- deactivated or suspended users fail authentication immediately, regardless of access-token expiry
- permission routes authenticate first, then evaluate permission keys server-side

This module is the only place where permission evaluation rules should live.

Schema rules:

- role grants and override history are append-only; revocation is represented with revocation metadata, not hard deletes
- overrides are explicit `allow` or `deny` records, never free-form strings
- audit rows must preserve actor, target, location scope, and override effect when applicable
