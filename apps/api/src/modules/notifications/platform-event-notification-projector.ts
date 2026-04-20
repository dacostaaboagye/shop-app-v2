import { AppError } from "../_core/errors/app-error.js";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

type PlatformEventNotificationProjectorDependencies = {
  notificationRecipientRepository: {
    filterActiveUserIds(userIds: readonly string[]): Promise<string[]>;
    listCandidateUserIdsWithPermission(input: {
      locationId?: string;
      permission: string;
    }): Promise<string[]>;
  };
  permissionService: {
    assertHasPermission(input: {
      locationId?: string;
      permission: string;
      user: { userId: string };
    }): Promise<void>;
  };
  userNotificationRepository: {
    createUnreadNotifications(input: {
      eventId: string;
      userIds: readonly string[];
    }): Promise<void>;
  };
};

export class PlatformEventNotificationProjector {
  constructor(
    private readonly dependencies: PlatformEventNotificationProjectorDependencies,
  ) {}

  async project(event: PlatformEventRecord): Promise<void> {
    const recipientIds = new Set<string>();

    for (const audience of event.audience) {
      if (audience.kind === "user") {
        recipientIds.add(audience.userId);
        continue;
      }

      const candidateUserIds =
        await this.dependencies.notificationRecipientRepository.listCandidateUserIdsWithPermission(
          {
            ...(audience.locationId ? { locationId: audience.locationId } : {}),
            permission: audience.permission,
          },
        );

      for (const userId of candidateUserIds) {
        try {
          await this.dependencies.permissionService.assertHasPermission({
            ...(audience.locationId ? { locationId: audience.locationId } : {}),
            permission: audience.permission,
            user: { userId },
          });
          recipientIds.add(userId);
        } catch (error) {
          if (isForbiddenError(error)) {
            continue;
          }

          throw error;
        }
      }
    }

    const activeUserIds =
      await this.dependencies.notificationRecipientRepository.filterActiveUserIds(
        Array.from(recipientIds),
      );
    activeUserIds.sort((left, right) => left.localeCompare(right));

    await this.dependencies.userNotificationRepository.createUnreadNotifications({
      eventId: event.id,
      userIds: activeUserIds,
    });
  }
}

function isForbiddenError(error: unknown) {
  return error instanceof AppError && error.statusCode === 403;
}
