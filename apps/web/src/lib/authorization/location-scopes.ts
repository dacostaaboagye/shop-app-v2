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
  return resolvePreferredLocationScope(scopes, [locationSlug]);
}

export function resolvePreferredLocationScope(
  scopes: readonly AuthLocationPermissionScope[],
  locationSlugs: readonly (string | null | undefined)[],
): AuthLocationPermissionScope | null {
  for (const locationSlug of locationSlugs) {
    if (!locationSlug) {
      continue;
    }

    const selectedScope = scopes.find(
      (scope) => scope.locationSlug === locationSlug,
    );

    if (selectedScope) {
      return selectedScope;
    }
  }

  return scopes[0] ?? null;
}

export function resolveActiveLocationScope(input: {
  activeLocationSlug: string | null;
  scopes: readonly AuthLocationPermissionScope[];
  urlLocationSlug: string | null;
}): AuthLocationPermissionScope | null {
  return resolvePreferredLocationScope(input.scopes, [
    input.urlLocationSlug,
    input.activeLocationSlug,
  ]);
}
