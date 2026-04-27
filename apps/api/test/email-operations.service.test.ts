import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveEmailConfiguration } from "../src/modules/messaging/email-configuration.js";
import { EmailOperationsService } from "../src/modules/messaging/email-operations.service.js";

const NOW = new Date("2026-04-26T19:00:00.000Z");

describe("EmailOperationsService", () => {
  it("returns recent attempts with delayed and failed lifecycle states for operators", async () => {
    const service = new EmailOperationsService({
      attemptsRepository: {
        async listRecentAttempts(limit) {
          assert.equal(limit, 12);
          return [
            {
              createdAt: new Date("2026-04-26T18:00:00.000Z"),
              failureReason: null,
              hasLifecycleUpdates: true,
              messageType: "password_reset",
              provider: "resend",
              providerMessageId: "msg_delayed",
              recipientEmail: "worker@example.com",
              status: "delayed" as const,
              statusRecordedAt: new Date("2026-04-26T18:05:00.000Z"),
              subject: "Reset your password",
            },
            {
              createdAt: new Date("2026-04-26T17:00:00.000Z"),
              failureReason: "Provider timeout",
              hasLifecycleUpdates: true,
              messageType: "supplier_invite",
              provider: "resend",
              providerMessageId: "msg_failed",
              recipientEmail: "ama@acme.example",
              status: "failed" as const,
              statusRecordedAt: new Date("2026-04-26T17:02:00.000Z"),
              subject: "Supplier portal invitation",
            },
          ];
        },
      },
      emailService: {
        async sendTestEmail() {
          return {
            attemptId: "attempt_test",
            providerMessageId: "msg_test",
            status: "sent" as const,
          };
        },
      },
      providerConfigured: true,
      recentAttemptLimit: 12,
      recipientStateRepository: {
        async findLatestLifecycleState() {
          return null;
        },
      },
      templateProvider: {
        async getEmailTemplateSettings() {
          return resolveEmailConfiguration({
            brand: {
              accentColor: "hsl(28 72% 48%)",
              brandName: "Shop App",
              logoImageUrl: null,
              logoText: "SA",
              primaryColor: "hsl(174 52% 23%)",
            },
            businessEmail: "accounts@example.com",
            emailFromAddress: "noreply@example.com",
            emailTemplates: {
              emailVerification: {
                actionLabel: "Verify",
                footer: "Footer",
                heading: "Verify",
                intro: "Hi {{firstName}}",
                subject: "Verify",
              },
              passwordReset: {
                actionLabel: "Reset",
                footer: "Footer",
                heading: "Reset",
                intro: "Hi {{firstName}}",
                subject: "Reset",
              },
              supplierInvite: {
                actionLabel: "Join",
                footer: "Footer",
                heading: "Invite",
                intro: "Hi {{firstName}}",
                subject: "Invite",
              },
            },
          });
        },
      },
    });

    const result = await service.getOperationsOverview({ now: NOW });

    assert.equal(result.mode, "live_send");
    assert.equal(result.fromAddress, "noreply@example.com");
    assert.equal(result.replyToAddress, "accounts@example.com");
    assert.equal(result.supportEmail, "accounts@example.com");
    assert.deepEqual(
      result.recentAttempts.map((attempt) => ({
        failureReason: attempt.failureReason,
        recipientEmail: attempt.recipientEmail,
        status: attempt.status,
      })),
      [
        {
          failureReason: null,
          recipientEmail: "worker@example.com",
          status: "delayed",
        },
        {
          failureReason: "Provider timeout",
          recipientEmail: "ama@acme.example",
          status: "failed",
        },
      ],
    );
  });

  it("returns an operator-readable blocked summary for complained recipients", async () => {
    const service = new EmailOperationsService({
      attemptsRepository: {
        async listRecentAttempts() {
          return [];
        },
      },
      emailService: {
        async sendTestEmail() {
          return {
            attemptId: "attempt_test",
            providerMessageId: "msg_test",
            status: "sent" as const,
          };
        },
      },
      providerConfigured: true,
      recentAttemptLimit: 12,
      recipientStateRepository: {
        async findLatestLifecycleState(recipientEmail) {
          assert.equal(recipientEmail, "ops@example.com");
          return {
            occurredAt: new Date("2026-04-24T00:00:00.000Z"),
            status: "complained" as const,
            statusReason: "Recipient marked this message as spam",
          };
        },
      },
      templateProvider: {
        async getEmailTemplateSettings() {
          throw new Error("not used");
        },
      },
    });

    const result = await service.getRecipientState({
      recipientEmail: "ops@example.com",
    });

    assert.equal(result.canSend, false);
    assert.equal(result.status, "complained");
    assert.equal(
      result.summary,
      "This recipient previously complained about email from the app. Do not resend until support reviews it.",
    );
    assert.equal(result.statusReason, "Recipient marked this message as spam");
  });
});
