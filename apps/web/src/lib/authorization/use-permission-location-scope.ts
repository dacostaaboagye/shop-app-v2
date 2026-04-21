"use client";

import { useActiveLocationScope } from "./use-active-location-scope";

export function usePermissionLocationScope(permission: string) {
  return useActiveLocationScope(permission);
}
