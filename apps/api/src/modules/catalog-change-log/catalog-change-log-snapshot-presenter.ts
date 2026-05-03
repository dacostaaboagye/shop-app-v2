import type { CatalogChangeSnapshot } from "./catalog-change-log.types.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * DB snapshots may keep internal IDs for audit integrity. Public history DTOs
 * must not expose them, so the read boundary strips referent IDs and suppresses
 * legacy UUID-only values before contract parsing.
 */
export function sanitizePublicSnapshot(
  snapshot: CatalogChangeSnapshot,
): CatalogChangeSnapshot {
  if (snapshot === null) return null;
  return sanitizeRecord(snapshot);
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === "string") {
    return UUID_PATTERN.test(value) ? null : value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return sanitizeRecord(value as Record<string, unknown>);
}

function sanitizeRecord(
  record: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (key === "id" && typeof value === "string" && UUID_PATTERN.test(value)) {
      continue;
    }
    sanitized[key] = sanitizeValue(value);
  }

  return sanitized;
}
