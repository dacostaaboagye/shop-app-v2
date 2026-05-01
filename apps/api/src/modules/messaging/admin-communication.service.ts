import { mapWithConcurrency } from "../_core/async-concurrency.js";
import { AppError } from "../_core/errors/app-error.js";
import { createAdminCommunicationEvent } from "./admin-communication-events.js";
import type { EmailService } from "./email.service.js";

// Bound parallel email sends per bulk admin communication. Resend's API has
// per-second rate limits and Node's libuv pool is finite — letting an admin
// action fan out 1000 sends in parallel would either trip 429s or starve
// other I/O. 10 is conservative enough to stay under any reasonable provider
// quota while still finishing 100 invites in well under a second.
const BULK_EMAIL_CONCURRENCY = 10;

type AdminCommunicationDependencies = {
  emailService: Pick<EmailService, "sendOperationalEmail">;
  platformEventPublisher: {
    publish: (
      event: ReturnType<typeof createAdminCommunicationEvent>,
    ) => Promise<void>;
  };
  recipientRepository: {
    findActiveRecipientBySlug(input: { userSlug: string }): Promise<{
      email: string | null;
      firstName: string | null;
      notificationEmailEnabled: boolean;
      notificationInAppEnabled: boolean;
      userId: string;
      userSlug: string;
    } | null>;
    listActiveRecipientsWithPermission(input: {
      locationId?: string;
      permission: string;
    }): Promise<
      Array<{
        email: string | null;
        firstName: string | null;
        notificationEmailEnabled: boolean;
        notificationInAppEnabled: boolean;
        userId: string;
        userSlug?: string;
      }>
    >;
  };
};

export class AdminCommunicationService {
  constructor(private readonly dependencies: AdminCommunicationDependencies) {}

  async send(input: {
    actorUserSlug: string;
    messageBody: string;
    now: Date;
    sendEmail: boolean;
    sendNotification: boolean;
    subject: string;
    target:
      | {
          audience: { locationId?: string; permission: string };
          kind: "audience";
        }
      | {
          kind: "user";
          recipient: { userSlug: string };
        };
  }) {
    const recipients =
      input.target.kind === "audience"
        ? await this.dependencies.recipientRepository.listActiveRecipientsWithPermission(
            input.target.audience,
          )
        : await this.resolveDirectRecipient(input.target.recipient.userSlug);

    if (recipients.length === 0) {
      throw new AppError({
        code: "not_found",
        detail:
          input.target.kind === "audience"
            ? "No active recipients matched the selected audience."
            : "The selected recipient is not available for messaging.",
        statusCode: 404,
        title: "No recipients found",
      });
    }

    const notificationRecipients = recipients.filter(
      (recipient) => recipient.notificationInAppEnabled,
    );

    if (input.sendNotification && notificationRecipients.length > 0) {
      const directRecipient = notificationRecipients[0] ?? recipients[0];

      if (!directRecipient) {
        throw new AppError({
          code: "internal_error",
          detail: "No valid notification recipient could be resolved.",
          statusCode: 500,
          title: "Recipient resolution failed",
        });
      }

      await this.dependencies.platformEventPublisher.publish(
        createAdminCommunicationEvent({
          actorUserSlug: input.actorUserSlug,
          messageBody: input.messageBody,
          now: input.now,
          subject: input.subject,
          target:
            input.target.kind === "audience"
              ? input.target
              : {
                  kind: "user",
                  recipient: {
                    userId: directRecipient.userId,
                    userSlug: input.target.recipient.userSlug,
                  },
                },
        }),
      );
    }

    const emailRecipients = recipients.filter(
      (recipient) => recipient.email && recipient.notificationEmailEnabled,
    );
    if (
      input.sendEmail &&
      !input.sendNotification &&
      emailRecipients.length === 0
    ) {
      throw new AppError({
        code: "not_found",
        detail: "No active recipients in this audience have an email address.",
        statusCode: 404,
        title: "No email recipients found",
      });
    }

    if (input.sendEmail && emailRecipients.length > 0) {
      await mapWithConcurrency(
        emailRecipients,
        BULK_EMAIL_CONCURRENCY,
        (recipient) =>
          this.dependencies.emailService.sendOperationalEmail({
            firstName: recipient.firstName,
            messageBody: input.messageBody,
            subject: input.subject,
            to: recipient.email as string,
          }),
      );
    }

    return {
      emailRecipientCount: input.sendEmail ? emailRecipients.length : 0,
      notificationRecipientCount: input.sendNotification
        ? notificationRecipients.length
        : 0,
      ok: true as const,
      totalRecipientCount: recipients.length,
    };
  }

  private async resolveDirectRecipient(userSlug: string) {
    const recipient =
      await this.dependencies.recipientRepository.findActiveRecipientBySlug({
        userSlug,
      });

    return recipient ? [recipient] : [];
  }
}
