# Access Control Module

Owns:

- permissions
- roles
- user role assignments
- user-level permission overrides
- permission resolution
- route authorization middleware

Route boundary rules:

- protected routes resolve the current actor from the bearer access token on every request
- deactivated or suspended users fail authentication immediately, regardless of access-token expiry
- permission routes authenticate first, then evaluate permission keys server-side

This module is the only place where permission evaluation rules should live.
