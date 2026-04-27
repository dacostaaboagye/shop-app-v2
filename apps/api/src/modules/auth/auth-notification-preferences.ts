import type { AuthNotificationPreferences } from "@shop/contracts";

export type AuthNotificationPreferenceColumns = {
  notificationEmailEnabled: boolean;
  notificationInAppEnabled: boolean;
  notificationSoundEnabled: boolean;
};

export function toAuthNotificationPreferences(
  input: AuthNotificationPreferenceColumns,
): AuthNotificationPreferences {
  return {
    emailEnabled: input.notificationEmailEnabled,
    inAppEnabled: input.notificationInAppEnabled,
    soundEnabled: input.notificationSoundEnabled,
  };
}
