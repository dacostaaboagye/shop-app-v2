export type UserRow = {
  email: string;
  firstName: string;
  id: string;
  lastLoginAt: Date | null;
  lastName: string;
  lockedUntil: Date | null;
  passwordHash: string;
  preferredPortal: string | null;
  requiresPasswordChange: boolean;
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
    preferred_portal AS "preferredPortal",
    last_login_at AS "lastLoginAt",
    locked_until AS "lockedUntil",
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
