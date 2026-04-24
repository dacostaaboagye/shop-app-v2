"use client";

import type { ReactNode } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";

type PermissionGateProps = {
  allOf?: readonly string[];
  anyOf?: readonly string[];
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
  permission?: string;
};

export function PermissionGate({
  allOf,
  anyOf,
  children,
  fallback = null,
  loadingFallback = null,
  permission,
}: PermissionGateProps) {
  const { can, canAll, canAny, isLoading } = useAuthorization();

  if (isLoading) {
    return <>{loadingFallback}</>;
  }

  const isAllowed =
    (permission ? can(permission) : true) &&
    (allOf ? canAll(allOf) : true) &&
    (anyOf ? canAny(anyOf) : true);

  return isAllowed ? children : fallback;
}
