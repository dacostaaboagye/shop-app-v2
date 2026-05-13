import { AppError } from "../_core/errors/app-error.js";

export type EffectivePermission = {
  key: string;
  source: "override" | "role";
};

export type ActiveLocationScope = {
  locationId: string;
  locationName: string;
  locationSlug: string;
};

export type PermissionResolutionScope = "any_active" | "contextual";

export type PermissionAssignmentRecord = {
  effect: "allow" | "deny" | null;
  key: string;
  locationId: string | null;
  source: "override" | "role";
};

export interface PermissionResolutionRepository {
  getAllActiveLocationScopes(): Promise<ActiveLocationScope[]>;
  getPermissionAssignments(
    userId: string,
  ): Promise<PermissionAssignmentRecord[]>;
  getActiveLocationScopes(userId: string): Promise<ActiveLocationScope[]>;
}

export class PermissionResolutionService {
  constructor(private readonly repository: PermissionResolutionRepository) {}

  async assertHasPermission(input: {
    locationId?: string;
    permission: string;
    scope?: PermissionResolutionScope;
    user: { userId: string };
  }): Promise<void> {
    const permissions =
      input.scope === "any_active"
        ? await this.resolvePermissionsForAnyScope({
            userId: input.user.userId,
          })
        : await this.resolvePermissions({
            ...(input.locationId ? { locationId: input.locationId } : {}),
            userId: input.user.userId,
          });

    if (permissions.some((permission) => permission.key === input.permission)) {
      return;
    }

    throw missingPermissionError();
  }

  async resolvePermissions(input: {
    locationId?: string;
    userId: string;
  }): Promise<EffectivePermission[]> {
    const assignments = await this.repository.getPermissionAssignments(
      input.userId,
    );
    return resolveEffectivePermissions(assignments, input.locationId);
  }

  async resolvePermissionsForAnyScope(input: {
    userId: string;
  }): Promise<EffectivePermission[]> {
    const assignments = await this.repository.getPermissionAssignments(
      input.userId,
    );
    const scopes = Array.from(
      new Set(
        assignments
          .map((assignment) => assignment.locationId)
          .filter((locationId): locationId is string => !!locationId),
      ),
    ).sort((left, right) => left.localeCompare(right));
    const permissions = new Map<string, EffectivePermission>();

    for (const scope of [undefined, ...scopes]) {
      for (const permission of resolveEffectivePermissions(
        assignments,
        scope,
      )) {
        if (!permissions.has(permission.key)) {
          permissions.set(permission.key, permission);
        }
      }
    }

    return Array.from(permissions.values()).sort((left, right) =>
      left.key.localeCompare(right.key),
    );
  }

  async getActiveLocationScopes(input: {
    userId: string;
  }): Promise<ActiveLocationScope[]> {
    return this.repository.getActiveLocationScopes(input.userId);
  }

  async resolveAllPermissions(input: { userId: string }): Promise<{
    anyActivePermissions: EffectivePermission[];
    locationScopes: Array<
      ActiveLocationScope & { permissions: EffectivePermission[] }
    >;
  }> {
    const [assignments, assignedLocationScopes, allLocationScopes] =
      await Promise.all([
        this.repository.getPermissionAssignments(input.userId),
        this.repository.getActiveLocationScopes(input.userId),
        this.repository.getAllActiveLocationScopes(),
      ]);

    const uniqueLocationIds = Array.from(
      new Set(
        assignments.map((a) => a.locationId).filter((id): id is string => !!id),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const anyActiveMap = new Map<string, EffectivePermission>();
    for (const scope of [undefined, ...uniqueLocationIds]) {
      for (const permission of resolveEffectivePermissions(
        assignments,
        scope,
      )) {
        if (!anyActiveMap.has(permission.key)) {
          anyActiveMap.set(permission.key, permission);
        }
      }
    }

    const globalPermissions = resolveEffectivePermissions(
      assignments,
      undefined,
    );
    const locationScopes = mergeOperatingLocationScopes(
      assignedLocationScopes,
      allLocationScopes,
      globalPermissions,
    );

    return {
      anyActivePermissions: Array.from(anyActiveMap.values()).sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
      locationScopes: locationScopes.map((scope) => ({
        ...scope,
        permissions: resolveEffectivePermissions(assignments, scope.locationId),
      })),
    };
  }
}

function mergeOperatingLocationScopes(
  assignedLocationScopes: readonly ActiveLocationScope[],
  allLocationScopes: readonly ActiveLocationScope[],
  globalPermissions: readonly EffectivePermission[],
): ActiveLocationScope[] {
  if (globalPermissions.length === 0) return [...assignedLocationScopes];

  const scopesById = new Map<string, ActiveLocationScope>();
  for (const scope of [...assignedLocationScopes, ...allLocationScopes]) {
    scopesById.set(scope.locationId, scope);
  }

  return Array.from(scopesById.values()).sort(
    (a, b) =>
      a.locationName.localeCompare(b.locationName) ||
      a.locationSlug.localeCompare(b.locationSlug),
  );
}

export function resolveEffectivePermissions(
  assignments: readonly PermissionAssignmentRecord[],
  requestedLocationId: string | undefined,
) {
  const effectivePermissions = new Map<string, EffectivePermission>();

  for (const assignment of assignments) {
    if (!matchesLocationScope(assignment.locationId, requestedLocationId)) {
      continue;
    }

    if (assignment.source === "role") {
      effectivePermissions.set(assignment.key, {
        key: assignment.key,
        source: "role",
      });
      continue;
    }

    if (assignment.effect === "deny") {
      effectivePermissions.delete(assignment.key);
      continue;
    }

    effectivePermissions.set(assignment.key, {
      key: assignment.key,
      source: "override",
    });
  }

  return Array.from(effectivePermissions.values()).sort((left, right) =>
    left.key.localeCompare(right.key),
  );
}

function matchesLocationScope(
  assignmentLocationId: string | null,
  requestedLocationId: string | undefined,
): boolean {
  if (!assignmentLocationId) {
    return true;
  }

  return assignmentLocationId === requestedLocationId;
}

function missingPermissionError(): AppError {
  return new AppError({
    code: "forbidden",
    detail: "You do not have permission to access this route.",
    statusCode: 403,
    title: "Forbidden",
  });
}
