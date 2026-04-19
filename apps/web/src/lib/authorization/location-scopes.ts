import type { AuthLocationPermissionScope } from "@shop/contracts";

export function getPermissionLocationScopes(
  scopes: readonly AuthLocationPermissionScope[],
  permission: string,
): AuthLocationPermissionScope[] {
  return scopes.filter((scope) => scope.permissions.includes(permission));
}

export function resolveSelectedLocationScope(
  scopes: readonly AuthLocationPermissionScope[],
  locationSlug: string | null,
): AuthLocationPermissionScope | null {
  if (locationSlug) {
    const selectedScope = scopes.find(
      (scope) => scope.locationSlug === locationSlug,
    );

    if (selectedScope) {
      return selectedScope;
    }
  }

  return scopes[0] ?? null;
}
