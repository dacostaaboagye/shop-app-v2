import { AppError } from "../_core/errors/app-error.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { PlatformEventRecord } from "./platform-event.types.js";

type PlatformEventAccessDependencies = {
  permissionService: {
    assertHasPermission(input: {
      locationId?: string;
      permission: string;
      user: AuthenticatedActor;
    }): Promise<void>;
  };
};

export async function canActorReceivePlatformEvent(
  event: PlatformEventRecord,
  actor: AuthenticatedActor,
  dependencies: PlatformEventAccessDependencies,
): Promise<boolean> {
  for (const audience of event.audience) {
    if (audience.kind === "user" && audience.userId === actor.userId) {
      return true;
    }

    if (audience.kind !== "permission") {
      continue;
    }

    try {
      await dependencies.permissionService.assertHasPermission({
        ...(audience.locationId ? { locationId: audience.locationId } : {}),
        permission: audience.permission,
        user: actor,
      });
      return true;
    } catch (error) {
      if (isForbiddenError(error)) {
        continue;
      }

      throw error;
    }
  }

  return false;
}

function isForbiddenError(error: unknown) {
  return error instanceof AppError && error.statusCode === 403;
}
