import { z } from "zod";

export const adminSupplierContactLatestInviteSchema = z.object({
  attemptedAt: z.iso.datetime(),
  deliveryReason: z.string().nullable(),
  deliveryStatus: z.enum([
    "bounced",
    "complained",
    "console_fallback",
    "delayed",
    "delivered",
    "failed",
    "sent",
    "suppressed",
  ]),
  expiresAt: z.iso.datetime(),
  recipientEmail: z.email(),
});

export const adminSupplierContactSchema = z.object({
  contactReference: z.string().uuid(),
  email: z.email().nullable(),
  firstName: z.string().min(1).max(120),
  isPrimary: z.boolean(),
  jobTitle: z.string().max(160).nullable(),
  lastName: z.string().min(1).max(120),
  latestInvite: adminSupplierContactLatestInviteSchema.nullable().default(null),
  phone: z.string().max(80).nullable(),
  portalStatus: z.enum(["none", "invited", "linked", "inactive"]),
  status: z.enum(["active", "inactive"]),
  userSlug: z.string().min(1).max(120).nullable(),
});

export const adminCreateSupplierContactRequestSchema = z.object({
  email: z.email().nullable().optional(),
  firstName: z.string().trim().min(1).max(120),
  isPrimary: z.boolean().default(false),
  jobTitle: z.string().trim().max(160).nullable().optional(),
  lastName: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(80).nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active"),
  userSlug: z.string().trim().max(120).nullable().optional(),
});

export const adminLinkSupplierContactPortalRequestSchema = z.object({
  userSlug: z.string().trim().min(1).max(120),
});

export type AdminCreateSupplierContactRequest = z.infer<
  typeof adminCreateSupplierContactRequestSchema
>;
export type AdminLinkSupplierContactPortalRequest = z.infer<
  typeof adminLinkSupplierContactPortalRequestSchema
>;
