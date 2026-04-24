import { z } from "zod";

export const emailTemplateDefinitionSchema = z.object({
  actionLabel: z.string().trim().min(1).max(80),
  footer: z.string().trim().min(1).max(500),
  heading: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(800),
  subject: z.string().trim().min(1).max(160),
});

export const emailTemplateSettingsSchema = z.object({
  emailVerification: emailTemplateDefinitionSchema,
  passwordReset: emailTemplateDefinitionSchema,
  supplierInvite: emailTemplateDefinitionSchema,
});

export const emailTemplatePreviewTypeSchema = z.enum([
  "emailVerification",
  "passwordReset",
  "supplierInvite",
]);

export const emailTemplatePreviewResponseSchema = z.object({
  allowedVariables: z.array(z.string()),
  html: z.string(),
  subject: z.string(),
  text: z.string(),
  type: emailTemplatePreviewTypeSchema,
  unknownVariables: z.array(z.string()),
});

const emailTemplatePreviewBrandSchema = z.object({
  accentColor: z.string().trim().min(1).max(80),
  brandName: z.string().trim().min(1).max(160),
  logoImageUrl: z.url().max(1000).nullable().optional(),
  logoText: z.string().trim().min(1).max(8),
  primaryColor: z.string().trim().min(1).max(80),
});

export const emailTemplatePreviewRequestSchema = z.object({
  brand: emailTemplatePreviewBrandSchema,
  business: z.object({ email: z.string().trim().email().max(160) }),
  template: emailTemplateDefinitionSchema,
});

export type EmailTemplatePreviewResponse = z.infer<
  typeof emailTemplatePreviewResponseSchema
>;
export type EmailTemplatePreviewRequest = z.infer<
  typeof emailTemplatePreviewRequestSchema
>;
export type EmailTemplatePreviewType = z.infer<
  typeof emailTemplatePreviewTypeSchema
>;
