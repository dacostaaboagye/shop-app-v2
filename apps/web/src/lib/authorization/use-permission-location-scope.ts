"use client";

import { useActiveLocationScope } from "./use-active-location-scope";

/**
 * @deprecated Use `useActiveLocationScope(permission)` directly.
 * This wrapper exists only for backward compatibility and will be removed
 * in a future cleanup slice.
 */
export function usePermissionLocationScope(permission: string) {
  return useActiveLocationScope(permission);
}
