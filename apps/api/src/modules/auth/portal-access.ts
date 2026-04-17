import { type PortalKey, portalKeySchema } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

const portalKeySet = new Set<string>(portalKeySchema.options);

export function getAvailablePortals(portals: readonly string[]): PortalKey[] {
  return portals.filter(isPortalKey);
}

export function normalizePreferredPortal(input: {
  availablePortals: readonly string[];
  preferredPortal: string | null;
}): PortalKey | null {
  if (!input.preferredPortal || !isPortalKey(input.preferredPortal)) {
    return null;
  }

  return getAvailablePortals(input.availablePortals).includes(
    input.preferredPortal,
  )
    ? input.preferredPortal
    : null;
}

export function assertPreferredPortalAllowed(input: {
  availablePortals: readonly string[];
  preferredPortal: string | null;
}): PortalKey | null {
  if (input.preferredPortal === null) {
    return null;
  }

  const preferredPortal = normalizePreferredPortal(input);

  if (preferredPortal) {
    return preferredPortal;
  }

  throw new AppError({
    code: "forbidden",
    detail: "This account cannot select that portal.",
    statusCode: 403,
    title: "Portal unavailable",
  });
}

function isPortalKey(value: string): value is PortalKey {
  return portalKeySet.has(value);
}
