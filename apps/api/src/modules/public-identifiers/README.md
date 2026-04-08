# Public Identifiers Module

Owns:

- slug allocation, redirect retention, and redirect resolution
- transactional reference-number generation
- public identifier rules shared across API modules

This module exists to keep public identifier policy in one place. Routes and
domain services should consume it rather than formatting slugs or references
inline.
