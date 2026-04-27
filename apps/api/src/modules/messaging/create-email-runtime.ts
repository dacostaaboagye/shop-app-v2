import { APPLICATION_BRAND_MEDIA_ENTITY } from "@shop/contracts";
import type { ApiEnv } from "../../env.js";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { getPrimaryImageUrl } from "../catalog/catalog-primary-image.loader.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { PostgresNotificationRecipientRepository } from "../notifications/postgres-notification-recipient.repository.js";
import { OfficialDocumentSettingsRepository } from "../official-documents/official-document-settings.repository.js";
import { AdminCommunicationService } from "./admin-communication.service.js";
import { AdminCommunicationQueryService } from "./admin-communication-query.service.js";
import { EmailService } from "./email.service.js";
import { resolveEmailConfiguration } from "./email-configuration.js";
import { EmailDeliveryPolicy } from "./email-delivery-policy.js";
import { EmailOperationsService } from "./email-operations.service.js";
import type { EmailTemplateProvider } from "./email-service.types.js";
import { PostgresAdminCommunicationQueryRepository } from "./postgres-admin-communication-query.repository.js";
import { PostgresEmailDeliveryRepository } from "./postgres-email-delivery.repository.js";
import { PostgresEmailDeliveryQueryRepository } from "./postgres-email-delivery-query.repository.js";
import { PostgresEmailDeliveryStatusRepository } from "./postgres-email-delivery-status.repository.js";
import { PostgresEmailRecipientDeliveryStateRepository } from "./postgres-email-recipient-delivery-state.repository.js";
import { ResendEmailWebhookService } from "./resend-email-webhook.service.js";

type MessagingEnv = Pick<
  ApiEnv,
  | "emailFromAddress"
  | "nodeEnv"
  | "resendApiKey"
  | "resendWebhookSecret"
  | "webBaseUrl"
>;

export function createConfiguredEmailService(
  databaseRuntime: DatabaseRuntime,
  env: MessagingEnv,
): EmailService {
  return createMessagingRuntime(databaseRuntime, env).emailService;
}

export function createMessagingRuntime(
  databaseRuntime: DatabaseRuntime,
  env: MessagingEnv,
  options: {
    emailService?: EmailService;
    platformEventPublisher?: Pick<PlatformEventPublisher, "publish">;
  } = {},
) {
  const deliveryStatusRepository = new PostgresEmailDeliveryStatusRepository(
    databaseRuntime.db,
  );
  const recipientDeliveryStateRepository =
    new PostgresEmailRecipientDeliveryStateRepository(databaseRuntime.db);
  const officialDocumentSettingsRepository =
    new OfficialDocumentSettingsRepository(databaseRuntime.db);
  const templateProvider: EmailTemplateProvider = {
    async getEmailTemplateSettings() {
      const settings =
        await officialDocumentSettingsRepository.getGlobalSettings();
      return resolveEmailConfiguration({
        businessEmail: settings.business.email,
        emailFromAddress: env.emailFromAddress,
        emailTemplates: settings.emailTemplates,
        brand: {
          ...settings.brand,
          logoImageUrl: await getPrimaryImageUrl(
            databaseRuntime.db,
            APPLICATION_BRAND_MEDIA_ENTITY.entityType,
            APPLICATION_BRAND_MEDIA_ENTITY.entitySlug,
          ),
        },
      });
    },
  };

  const emailService =
    options.emailService ??
    new EmailService(env.resendApiKey, env.emailFromAddress, {
      allowConsoleFallback: env.nodeEnv !== "production",
      deliveryPolicy: new EmailDeliveryPolicy(recipientDeliveryStateRepository),
      deliveryRecorder: new PostgresEmailDeliveryRepository(databaseRuntime.db),
      templateProvider,
      ...(env.webBaseUrl ? { webBaseUrl: env.webBaseUrl } : {}),
      ...(options.platformEventPublisher
        ? { eventPublisher: options.platformEventPublisher }
        : {}),
    });

  return {
    adminCommunicationQueryService: new AdminCommunicationQueryService(
      new PostgresAdminCommunicationQueryRepository(databaseRuntime.db),
    ),
    adminCommunicationService: options.platformEventPublisher
      ? new AdminCommunicationService({
          emailService,
          platformEventPublisher: options.platformEventPublisher,
          recipientRepository: new PostgresNotificationRecipientRepository(
            databaseRuntime.db,
          ),
        })
      : null,
    emailOperationsService: new EmailOperationsService({
      attemptsRepository: new PostgresEmailDeliveryQueryRepository(
        databaseRuntime.db,
      ),
      emailService,
      providerConfigured: Boolean(env.resendApiKey),
      recentAttemptLimit: 12,
      recipientStateRepository: recipientDeliveryStateRepository,
      templateProvider,
    }),
    emailService,
    resendWebhookService: new ResendEmailWebhookService({
      ...(options.platformEventPublisher
        ? { eventPublisher: options.platformEventPublisher }
        : {}),
      now: () => new Date(),
      statusRepository: deliveryStatusRepository,
      ...(env.resendWebhookSecret
        ? { webhookSecret: env.resendWebhookSecret }
        : {}),
    }),
  };
}
