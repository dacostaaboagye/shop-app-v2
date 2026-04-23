import { APPLICATION_BRAND_MEDIA_ENTITY } from "@shop/contracts";
import type { ApiEnv } from "../../env.js";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { getPrimaryImageUrl } from "../catalog/catalog-primary-image.loader.js";
import { OfficialDocumentSettingsRepository } from "../official-documents/official-document-settings.repository.js";
import { EmailService } from "./email.service.js";
import { resolveEmailConfiguration } from "./email-configuration.js";
import { EmailOperationsService } from "./email-operations.service.js";
import type { EmailTemplateProvider } from "./email-service.types.js";
import { PostgresEmailDeliveryRepository } from "./postgres-email-delivery.repository.js";
import { PostgresEmailDeliveryQueryRepository } from "./postgres-email-delivery-query.repository.js";
import { PostgresEmailDeliveryStatusRepository } from "./postgres-email-delivery-status.repository.js";
import { ResendEmailWebhookService } from "./resend-email-webhook.service.js";

type MessagingEnv = Pick<
  ApiEnv,
  "emailFromAddress" | "nodeEnv" | "resendApiKey" | "resendWebhookSecret"
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
) {
  const deliveryStatusRepository = new PostgresEmailDeliveryStatusRepository(
    databaseRuntime.db,
  );
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

  const emailService = new EmailService(
    env.resendApiKey,
    env.emailFromAddress,
    {
      allowConsoleFallback: env.nodeEnv !== "production",
      deliveryRecorder: new PostgresEmailDeliveryRepository(databaseRuntime.db),
      templateProvider,
    },
  );

  return {
    emailOperationsService: new EmailOperationsService({
      attemptsRepository: new PostgresEmailDeliveryQueryRepository(
        databaseRuntime.db,
      ),
      emailService,
      providerConfigured: Boolean(env.resendApiKey),
      recentAttemptLimit: 12,
      templateProvider,
    }),
    emailService,
    resendWebhookService: new ResendEmailWebhookService({
      now: () => new Date(),
      statusRepository: deliveryStatusRepository,
      ...(env.resendWebhookSecret
        ? { webhookSecret: env.resendWebhookSecret }
        : {}),
    }),
  };
}
