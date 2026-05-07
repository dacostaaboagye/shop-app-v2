import type { PortalKey } from "@shop/contracts";

export type UserRow = {
  availablePortals: PortalKey[];
  email: string;
  firstName: string;
  id: string;
  lastLoginAt: Date | null;
  lastName: string;
  lockedUntil: Date | null;
  notificationEmailEnabled: boolean;
  notificationInAppEnabled: boolean;
  notificationSoundEnabled: boolean;
  passwordHash: string;
  preferredPortal: PortalKey | null;
  requiresPasswordChange: boolean;
  sessionsRevokedAt: Date | null;
  slug: string;
  status: "active" | "deactivated" | "suspended";
};

export const userSelectSql = `
  SELECT
    id,
    slug,
    first_name AS "firstName",
    last_name AS "lastName",
    email,
    password_hash AS "passwordHash",
    status,
    COALESCE(
      (
        SELECT array_agg(DISTINCT roles.slug ORDER BY roles.slug)
        FROM user_roles
        INNER JOIN roles ON roles.id = user_roles.role_id
        WHERE user_roles.user_id = users.id
          AND user_roles.revoked_at IS NULL
          AND roles.slug IN ('admin', 'manager', 'worker', 'supplier', 'agent')
      ),
      ARRAY[]::text[]
    ) AS "availablePortals",
    preferred_portal AS "preferredPortal",
    notification_email_enabled AS "notificationEmailEnabled",
    notification_in_app_enabled AS "notificationInAppEnabled",
    notification_sound_enabled AS "notificationSoundEnabled",
    last_login_at AS "lastLoginAt",
    locked_until AS "lockedUntil",
    sessions_revoked_at AS "sessionsRevokedAt",
    requires_password_change AS "requiresPasswordChange"
  FROM users
`;

export function isUniqueViolation(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}
