import type {
  EmailTemplatePreviewRequest,
  emailTemplatePreviewResponseSchema,
} from "@shop/contracts";
import type { EmailTemplateSettings } from "@shop/database";
import type { z } from "zod";
import { resolveEmailConfiguration } from "../messaging/email-configuration.js";
import {
  findTemplateVariables,
  renderConfiguredEmailTemplate,
} from "../messaging/email-template-renderer.js";
import type { OfficialDocumentSettings } from "./official-document-settings.types.js";

type EmailTemplatePreviewResponse = z.infer<
  typeof emailTemplatePreviewResponseSchema
>;

export function previewEmailTemplate(input: {
  draft?: EmailTemplatePreviewRequest;
  emailFromAddress: string | null;
  logoImageUrl: string | null;
  settings: OfficialDocumentSettings;
  type: keyof EmailTemplateSettings;
}): EmailTemplatePreviewResponse {
  const sample = getSampleEmailTemplateData(input.type);
  const template =
    input.draft?.template ?? input.settings.emailTemplates[input.type];
  const allowedVariables = getAllowedVariables(input.type);
  const unknownVariables = findTemplateVariables(template).filter(
    (variable) => !allowedVariables.includes(variable),
  );
  const configuration = resolveEmailConfiguration({
    businessEmail: input.draft?.business.email ?? input.settings.business.email,
    emailFromAddress:
      input.emailFromAddress ??
      input.draft?.business.email ??
      input.settings.business.email,
    emailTemplates: input.settings.emailTemplates,
    brand: {
      accentColor:
        input.draft?.brand.accentColor ?? input.settings.brand.accentColor,
      brandName: input.draft?.brand.brandName ?? input.settings.brand.brandName,
      logoImageUrl: input.draft?.brand.logoImageUrl ?? input.logoImageUrl,
      logoText: input.draft?.brand.logoText ?? input.settings.brand.logoText,
      primaryColor:
        input.draft?.brand.primaryColor ?? input.settings.brand.primaryColor,
    },
  });

  return {
    ...renderConfiguredEmailTemplate({
      actionUrl: sample.actionUrl,
      brand: {
        ...configuration.brand,
        fromAddress: configuration.sender.fromAddress,
        supportEmail: configuration.sender.supportEmail,
      },
      template,
      variables: sample.variables,
    }),
    allowedVariables,
    type: input.type,
    unknownVariables,
  };
}

function getSampleEmailTemplateData(type: keyof EmailTemplateSettings) {
  if (type === "supplierInvite") {
    return {
      actionUrl: "https://app.example.com/reset-password?token=sample-token",
      variables: {
        firstName: "Ama",
        supplierName: "Acme Distribution",
      },
    };
  }

  return {
    actionUrl:
      type === "passwordReset"
        ? "https://app.example.com/reset-password?token=sample-token"
        : "https://app.example.com/verify-email?token=sample-token",
    variables: {
      firstName: "Ama",
    },
  };
}

function getAllowedVariables(type: keyof EmailTemplateSettings) {
  if (type === "supplierInvite") return ["firstName", "supplierName"];
  return ["firstName"];
}
