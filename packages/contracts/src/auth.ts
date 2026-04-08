import { z } from "zod";

export const authUserStatusSchema = z.enum([
  "active",
  "suspended",
  "deactivated",
]);

export const authUserSchema = z.object({
  slug: z.string().min(1),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.email(),
  status: authUserStatusSchema,
  preferredPortal: z.string().min(1).max(64).nullable(),
  lastLoginAt: z.iso.datetime().nullable(),
  requiresPasswordChange: z.boolean(),
});

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(128),
});

export const refreshSessionRequestSchema = z.object({
  refreshToken: z.string().min(32),
});

export const authSessionSchema = z.object({
  accessToken: z.string().min(32),
  accessTokenExpiresAt: z.iso.datetime(),
  refreshToken: z.string().min(32),
  refreshTokenExpiresAt: z.iso.datetime(),
  user: authUserSchema,
});

export const logoutRequestSchema = z.object({
  refreshToken: z.string().min(32),
});

export type AuthSession = z.infer<typeof authSessionSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type AuthUserStatus = z.infer<typeof authUserStatusSchema>;
export type LoginRequest = z.infer<typeof loginRequestSchema>;
export type LogoutRequest = z.infer<typeof logoutRequestSchema>;
export type RefreshSessionRequest = z.infer<typeof refreshSessionRequestSchema>;
