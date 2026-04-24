import type { AuthLocationPermissionScope } from "@shop/contracts";
import {
  getPermissionLocationScopes,
  resolvePreferredLocationScope,
  resolveSelectedLocationScope,
} from "./location-scopes";

export type OperatingContextPolicy =
  | {
      kind: "global";
    }
  | {
      kind: "global-or-location";
      permission?: string | null;
    }
  | {
      kind: "location-required";
      permission: string;
    };

export type OperatingContext =
  | {
      kind: "global";
      locationScope: null;
      selectableLocationScopes: AuthLocationPermissionScope[];
    }
  | {
      kind: "location";
      locationScope: AuthLocationPermissionScope;
      selectableLocationScopes: AuthLocationPermissionScope[];
    }
  | {
      kind: "missing-location";
      locationScope: null;
      selectableLocationScopes: AuthLocationPermissionScope[];
    };

export function resolveOperatingContext(input: {
  activeLocationSlug: string | null;
  locationScopes: readonly AuthLocationPermissionScope[];
  policy: OperatingContextPolicy;
  urlLocationSlug: string | null;
}): OperatingContext {
  if (input.policy.kind === "global") {
    return {
      kind: "global",
      locationScope: null,
      selectableLocationScopes: [],
    };
  }

  const selectableLocationScopes = getSelectableLocationScopes(
    input.locationScopes,
    input.policy.permission,
  );
  const selectedScope =
    input.policy.kind === "global-or-location"
      ? resolveExplicitLocationScope(
          selectableLocationScopes,
          input.activeLocationSlug,
          input.urlLocationSlug,
        )
      : resolvePreferredLocationScope(selectableLocationScopes, [
          input.activeLocationSlug,
          input.urlLocationSlug,
        ]);

  if (selectedScope) {
    return {
      kind: "location",
      locationScope: selectedScope,
      selectableLocationScopes,
    };
  }

  if (input.policy.kind === "global-or-location") {
    return {
      kind: "global",
      locationScope: null,
      selectableLocationScopes,
    };
  }

  return {
    kind: "missing-location",
    locationScope: null,
    selectableLocationScopes,
  };
}

function getSelectableLocationScopes(
  scopes: readonly AuthLocationPermissionScope[],
  permission: string | null | undefined,
): AuthLocationPermissionScope[] {
  return permission ? getPermissionLocationScopes(scopes, permission) : [];
}

function resolveExplicitLocationScope(
  scopes: readonly AuthLocationPermissionScope[],
  activeLocationSlug: string | null,
  urlLocationSlug: string | null,
): AuthLocationPermissionScope | null {
  return (
    findLocationScope(scopes, activeLocationSlug) ??
    findLocationScope(scopes, urlLocationSlug)
  );
}

function findLocationScope(
  scopes: readonly AuthLocationPermissionScope[],
  locationSlug: string | null,
): AuthLocationPermissionScope | null {
  if (!locationSlug) {
    return null;
  }

  return resolveSelectedLocationScope(scopes, locationSlug);
}
