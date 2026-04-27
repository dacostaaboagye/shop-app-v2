import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AdminCommunicationService } from "../src/modules/messaging/admin-communication.service.js";

describe("admin communication service", () => {
  it("publishes in-app updates and emails the resolved audience", async () => {
    const published: string[] = [];
    const emailed: string[] = [];
    const service = new AdminCommunicationService({
      emailService: {
        async sendOperationalEmail(input) {
          emailed.push(`${input.to}:${input.subject}`);
          return {
            attemptId: null,
            status: "console_fallback",
          };
        },
      },
      platformEventPublisher: {
        async publish(event) {
          published.push(event.type);
        },
      },
      recipientRepository: {
        async findActiveRecipientBySlug() {
          return null;
        },
        async listActiveRecipientsWithPermission() {
          return [
            {
              email: "worker.a@example.com",
              firstName: "Worker",
              notificationEmailEnabled: true,
              notificationInAppEnabled: true,
              userId: "11111111-1111-4111-8111-111111111111",
            },
            {
              email: null,
              firstName: "No Email",
              notificationEmailEnabled: false,
              notificationInAppEnabled: false,
              userId: "11111111-1111-4111-8111-111111111112",
            },
          ];
        },
      },
    });

    const result = await service.send({
      actorUserSlug: "admin-user",
      messageBody: "Please review the updated stock-count cut-off.",
      now: new Date("2026-04-26T21:00:00.000Z"),
      sendEmail: true,
      sendNotification: true,
      subject: "Stock Count Update",
      target: {
        audience: {
          permission: "worker.dashboard.view",
        },
        kind: "audience",
      },
    });

    assert.deepEqual(result, {
      emailRecipientCount: 1,
      notificationRecipientCount: 1,
      ok: true,
      totalRecipientCount: 2,
    });
    assert.deepEqual(published, ["admin.communication.sent"]);
    assert.deepEqual(emailed, ["worker.a@example.com:Stock Count Update"]);
  });

  it("sends a direct update to one staff recipient", async () => {
    const published: string[] = [];
    const emailed: string[] = [];
    const service = new AdminCommunicationService({
      emailService: {
        async sendOperationalEmail(input) {
          emailed.push(`${input.to}:${input.subject}`);
          return {
            attemptId: null,
            status: "console_fallback",
          };
        },
      },
      platformEventPublisher: {
        async publish(event) {
          published.push(event.type);
          assert.deepEqual(event.audience, [
            {
              kind: "user",
              userId: "11111111-1111-4111-8111-111111111113",
            },
          ]);
        },
      },
      recipientRepository: {
        async findActiveRecipientBySlug() {
          return {
            email: "worker.b@example.com",
            firstName: "Worker",
            notificationEmailEnabled: true,
            notificationInAppEnabled: true,
            userId: "11111111-1111-4111-8111-111111111113",
            userSlug: "worker-b",
          };
        },
        async listActiveRecipientsWithPermission() {
          return [];
        },
      },
    });

    const result = await service.send({
      actorUserSlug: "admin-user",
      messageBody: "Please call the store manager before closing.",
      now: new Date("2026-04-26T21:15:00.000Z"),
      sendEmail: true,
      sendNotification: true,
      subject: "Direct follow-up",
      target: {
        kind: "user",
        recipient: {
          userSlug: "worker-b",
        },
      },
    });

    assert.deepEqual(result, {
      emailRecipientCount: 1,
      notificationRecipientCount: 1,
      ok: true,
      totalRecipientCount: 1,
    });
    assert.deepEqual(published, ["admin.communication.sent"]);
    assert.deepEqual(emailed, ["worker.b@example.com:Direct follow-up"]);
  });
});
