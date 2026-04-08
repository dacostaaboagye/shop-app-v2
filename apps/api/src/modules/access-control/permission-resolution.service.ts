import { AppError } from "../_core/errors/app-error.js";

export type EffectivePermission = {
  key: string;
  source: "override" | "role";
};

type PermissionAssignmentRecord = {
  effect: "allow" | "deny" | null;
  key: string;
  locationId: string | null;
  source: "override" | "role";
};

export interface PermissionResolutionRepository {
  getPermissionAssignments(
    userId: string,
  ): Promise<PermissionAssignmentRecord[]>;
}

export class PermissionResolutionService {
  constructor(private readonly repository: PermissionResolutionRepository) {}

  async assertHasPermission(input: {
    locationId?: string;
    permission: string;
    user: { userId: string };
  }): Promise<void> {
    const permissions = await this.resolvePermissions({
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
    const effectivePermissions = new Map<string, EffectivePermission>();

    for (const assignment of assignments) {
      if (!matchesLocationScope(assignment.locationId, input.locationId)) {
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
