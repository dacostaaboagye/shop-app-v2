import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

/**
 * Notifies the affected user that their password was just reset. Targets
 * the user directly (not via permission scope) so the recipient sees a
 * notification in their bell even if they hold no admin permission.
 *
 * Use case: account-compromise detection. If an attacker who has the
 * user's email account triggers a password reset, the legitimate user
 * sees an in-app notification on their next login that something
 * happened to their account — at minimum a breadcrumb to follow up on
 * before the attacker has a chance to lock them out.
 */
export function createSecurityPasswordChangedEvent(input: {
  userId: string;
  userSlug: string;
  occurredAt: Date;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.userSlug },
    audience: [{ kind: "user", userId: input.userId }],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: {
      userSlug: input.userSlug,
    },
    resource: {
      kind: "user_account",
      reference: input.userSlug,
    },
    summary: "Your password was just changed.",
    type: "account.password.changed",
  };
}
