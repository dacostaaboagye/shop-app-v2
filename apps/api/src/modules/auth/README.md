# Auth Module

Owns:

- users
- sessions and refresh tokens
- password reset and email verification flows
- account lockout policy
- current-user profile operations

Does not own permissions. Authorization decisions are delegated to the access-control module.

