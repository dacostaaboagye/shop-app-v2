import { z } from "zod";

export const authUserStatusSchema = z.enum([
  "active",
  "suspended",
  "deactivated",
]);

export const portalKeySchema = z.enum([
  "admin",
  "manager",
  "worker",
  "supplier",
  "agent",
]);

export const updateProfileRequestSchema = z.object({
  preferredPortal: portalKeySchema.nullable(),
});

export const authUserSchema = z.object({
  slug: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  emailVerified: z.boolean(),
  status: authUserStatusSchema,
  availablePortals: portalKeySchema.array().default([]),
  preferredPortal: portalKeySchema.nullable(),
  lastLoginAt: z.iso.datetime().nullable(),
  requiresPasswordChange: z.boolean(),
});

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const registerRequestSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters.")
    .refine(
      (v) => /[A-Z]/.test(v),
      "Password must contain an uppercase letter.",
    )
    .refine((v) => /[a-z]/.test(v), "Password must contain a lowercase letter.")
    .refine((v) => /[0-9]/.test(v), "Password must contain a number."),
});

export const verifyEmailRequestSchema = z.object({
  token: z.string().min(1),
});

export const forgotPasswordRequestSchema = z.object({
  email: z.email(),
});

export const resetPasswordRequestSchema = z.object({
  token: z.string().min(1),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password must be at most 128 characters.")
    .refine(
      (v) => /[A-Z]/.test(v),
      "Password must contain an uppercase letter.",
    )
    .refine((v) => /[a-z]/.test(v), "Password must contain a lowercase letter.")
    .refine((v) => /[0-9]/.test(v), "Password must contain a number."),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(32),
  accessTokenExpiresAt: z.iso.datetime(),
  user: authUserSchema,
});

export const authLocationPermissionScopeSchema = z.object({
  locationId: z.string().uuid(),
  locationName: z.string().min(1).max(160),
  locationSlug: z.string().min(1).max(120),
  permissions: z.array(z.string().min(1)).default([]),
});

export const authPermissionSetSchema = z.object({
  locationScopes: z.array(authLocationPermissionScopeSchema).default([]),
  permissions: z.array(z.string().min(1)).default([]),
});

export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthLocationPermissionScope = z.infer<
  typeof authLocationPermissionScopeSchema
>;
export type AuthPermissionSet = z.infer<typeof authPermissionSetSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthUserStatus = z.infer<typeof authUserStatusSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordRequestSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type PortalKey = z.infer<typeof portalKeySchema>;
export type RegisterRequest = z.infer<typeof registerRequestSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type VerifyEmailRequest = z.infer<typeof verifyEmailRequestSchema>;
