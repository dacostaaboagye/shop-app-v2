import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

export function createAdminCommunicationEvent(input: {
  actorUserSlug: string;
  target:
    | {
        audience: { locationId?: string; permission: string };
        kind: "audience";
      }
    | {
        kind: "user";
        recipient: { userId: string; userSlug: string };
      };
  messageBody: string;
  now: Date;
  subject: string;
}): PlatformEventRecord {
  return {
    actor: {
      userSlug: input.actorUserSlug,
    },
    audience:
      input.target.kind === "audience"
        ? [
            {
              ...(input.target.audience.locationId
                ? { locationId: input.target.audience.locationId }
                : {}),
              kind: "permission",
              permission: input.target.audience.permission,
            },
          ]
        : [
            {
              kind: "user",
              userId: input.target.recipient.userId,
            },
          ],
    id: randomUUID(),
    occurredAt: input.now.toISOString(),
    payload: {
      messageBody: input.messageBody,
      subject: input.subject,
    },
    resource: {
      kind: "admin_communication",
      reference:
        input.target.kind === "user"
          ? input.target.recipient.userSlug
          : input.subject,
    },
    summary: input.subject,
    type: "admin.communication.sent",
  };
}
