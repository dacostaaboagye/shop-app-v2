export const USER_PROFILE_EVENT_TYPE_LABELS: Record<string, string> = {
  failed_attempt: "Failed attempt",
  lockout: "Account lockout",
  login: "Login",
  logout: "Logout",
  token_refresh: "Token refresh",
};

export function getUserProfileActivityKey(event: {
  eventType: string;
  ipAddress: string | null;
  occurredAt: string;
}) {
  return `${event.occurredAt}:${event.eventType}:${event.ipAddress ?? "unknown"}`;
}
