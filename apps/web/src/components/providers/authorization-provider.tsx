"use client";

import { createContextualCan, useAbility } from "@casl/react";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import type { AuthLocationPermissionScope } from "@shop/contracts";
import {
  canUseAllPermissions,
  canUseAnyPermission,
  canUsePermission,
  createEmptyPermissionAbility,
  createPermissionAbility,
  type PermissionAbility,
} from "@/lib/authorization/permission-ability";
import {
  fetchCurrentUserPermissions,
  getCurrentUserPermissionsQueryKey,
} from "@/lib/react-query/auth";
import { useAuthSessionStore } from "@/store/use-auth-session-store";

type AuthorizationContextValue = {
  ability: PermissionAbility;
  can: (permission: string) => boolean;
  canAll: (permissions: readonly string[]) => boolean;
  canAny: (permissions: readonly string[]) => boolean;
  error: Error | null;
  isError: boolean;
  isLoading: boolean;
  locationScopes: readonly AuthLocationPermissionScope[];
  permissions: readonly string[];
  refetch: () => Promise<unknown>;
};

const emptyAbility = createEmptyPermissionAbility();
const AuthorizationAbilityContext =
  createContext<PermissionAbility>(emptyAbility);
const AuthorizationContext = createContext<AuthorizationContextValue | null>(
  null,
);

export const AppCan = createContextualCan(AuthorizationAbilityContext.Consumer);

export function AuthorizationProvider({ children }: { children: ReactNode }) {
  const status = useAuthSessionStore((state) => state.status);
  const user = useAuthSessionStore((state) => state.user);
  const permissionsQuery = useQuery({
    enabled: status === "authenticated",
    queryFn: fetchCurrentUserPermissions,
    queryKey: getCurrentUserPermissionsQueryKey(user?.slug ?? null),
  });
  const locationScopes = permissionsQuery.data?.locationScopes ?? [];
  const permissions = permissionsQuery.data?.permissions ?? [];
  const ability = useMemo(
    () =>
      status === "authenticated"
        ? createPermissionAbility(permissions)
        : emptyAbility,
    [permissions, status],
  );
  const value = useMemo<AuthorizationContextValue>(
    () => ({
      ability,
      can: (permission) => canUsePermission(ability, permission),
      canAll: (requiredPermissions) =>
        canUseAllPermissions(ability, requiredPermissions),
      canAny: (requiredPermissions) =>
        canUseAnyPermission(ability, requiredPermissions),
      error:
        permissionsQuery.error instanceof Error ? permissionsQuery.error : null,
      isError: permissionsQuery.isError,
      isLoading: status === "authenticated" && permissionsQuery.isPending,
      locationScopes,
      permissions,
      refetch: async () => permissionsQuery.refetch(),
    }),
    [ability, locationScopes, permissions, permissionsQuery, status],
  );

  return (
    <AuthorizationAbilityContext.Provider value={ability}>
      <AuthorizationContext.Provider value={value}>
        {children}
      </AuthorizationContext.Provider>
    </AuthorizationAbilityContext.Provider>
  );
}

export function useAuthorization() {
  const context = useContext(AuthorizationContext);

  if (context === null) {
    throw new Error(
      "useAuthorization must be used within AuthorizationProvider",
    );
  }

  return context;
}

export function usePermissionAbility() {
  return useAbility(AuthorizationAbilityContext);
}
