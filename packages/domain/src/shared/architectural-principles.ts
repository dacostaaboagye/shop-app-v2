export const architecturalPrinciples = [
  "Prefer modular-monolith consistency over premature service extraction",
  "Use public identifiers at API boundaries",
  "Keep immutable evidence immutable",
  "Treat authorization as a server-side concern on every protected route",
  "Centralize concurrency-sensitive stock rules in services, not clients",
] as const;
