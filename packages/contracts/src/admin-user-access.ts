import { z } from "zod";
import { authUserStatusSchema, portalKeySchema } from "./auth.js";

export const adminUserAccessActivityEventSchema = z.object({
  eventType: z.enum([
    "failed_attempt",
    "lockout",
    "login",
    "logout",
    "token_refresh",
  ]),
  ipAddress: z.string().max(80).nullable(),
  occurredAt: z.iso.datetime(),
  userAgent: z.string().nullable(),
});

export const adminUserAccessLocationSchema = z.object({
  locationName: z.string().min(1).max(160),
  locationSlug: z.string().min(1).max(120),
});

export const adminUserRoleAssignmentSchema = z.object({
  assignedAt: z.iso.datetime(),
  assignedByName: z.string().min(1).max(241).nullable(),
  locationName: z.string().min(1).max(160).nullable(),
  locationSlug: z.string().min(1).max(120).nullable(),
  roleName: z.string().min(1).max(120),
  roleSlug: z.string().min(1).max(120),
});

export const adminUserPermissionOverrideSchema = z.object({
  createdAt: z.iso.datetime(),
  description: z.string().min(1),
  effect: z.enum(["allow", "deny"]),
  locationName: z.string().min(1).max(160).nullable(),
  locationSlug: z.string().min(1).max(120).nullable(),
  permissionKey: z.string().min(1).max(120),
  reason: z.string().min(1),
  setByName: z.string().min(1).max(241).nullable(),
});

export const adminUserResolvedPermissionSchema = z.object({
  description: z.string().min(1),
  key: z.string().min(1).max(120),
  locationName: z.string().min(1).max(160).nullable().default(null),
  locationSlug: z.string().min(1).max(120).nullable().default(null),
  source: z.enum(["override", "role"]),
});

export const adminUserAccessDetailSchema = z.object({
  assignedLocations: z.array(adminUserAccessLocationSchema).default([]),
  availablePortals: portalKeySchema.array().default([]),
  effectivePermissions: z.array(adminUserResolvedPermissionSchema).default([]),
  email: z.email(),
  firstName: z.string().min(1).max(120),
  lastLoginAt: z.iso.datetime().nullable(),
  lastName: z.string().min(1).max(120),
  preferredPortal: portalKeySchema.nullable(),
  recentActivity: z.array(adminUserAccessActivityEventSchema).default([]),
  requiresPasswordChange: z.boolean(),
  roleAssignments: z.array(adminUserRoleAssignmentSchema).default([]),
  slug: z.string().min(1).max(120),
  status: authUserStatusSchema,
  userOverrides: z.array(adminUserPermissionOverrideSchema).default([]),
});

export const adminAssignUserRoleRequestSchema = z.object({
  locationSlug: z.string().trim().min(1).max(120).nullable().default(null),
  reason: z.string().trim().min(1).max(500),
  roleSlug: z.string().trim().min(1).max(120),
});

export const adminRevokeUserRoleRequestSchema = z.object({
  locationSlug: z.string().trim().min(1).max(120).nullable().default(null),
  reason: z.string().trim().min(1).max(500),
});

export const adminSetUserPermissionOverrideRequestSchema = z.object({
  effect: z.enum(["allow", "deny"]),
  locationSlug: z.string().trim().min(1).max(120).nullable().default(null),
  permissionKey: z.string().trim().min(1).max(120),
  reason: z.string().trim().min(1).max(500),
});

export const adminRemoveUserPermissionOverrideRequestSchema = z.object({
  locationSlug: z.string().trim().min(1).max(120).nullable().default(null),
  reason: z.string().trim().min(1).max(500),
});

export const adminUpdateUserProfileRequestSchema = z.object({
  email: z.email(),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
});

export const adminUpdateUserStatusRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
  status: authUserStatusSchema,
});

export const adminForceUserPasswordResetRequestSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export type AdminAssignUserRoleRequest = z.infer<
  typeof adminAssignUserRoleRequestSchema
>;
export type AdminForceUserPasswordResetRequest = z.infer<
  typeof adminForceUserPasswordResetRequestSchema
>;
export type AdminRemoveUserPermissionOverrideRequest = z.infer<
  typeof adminRemoveUserPermissionOverrideRequestSchema
>;
export type AdminRevokeUserRoleRequest = z.infer<
  typeof adminRevokeUserRoleRequestSchema
>;
export type AdminSetUserPermissionOverrideRequest = z.infer<
  typeof adminSetUserPermissionOverrideRequestSchema
>;
export type AdminUpdateUserProfileRequest = z.infer<
  typeof adminUpdateUserProfileRequestSchema
>;
export type AdminUpdateUserStatusRequest = z.infer<
  typeof adminUpdateUserStatusRequestSchema
>;
export type AdminUserAccessActivityEvent = z.infer<
  typeof adminUserAccessActivityEventSchema
>;
export type AdminUserAccessDetail = z.infer<typeof adminUserAccessDetailSchema>;
export type AdminUserAccessLocation = z.infer<
  typeof adminUserAccessLocationSchema
>;
export type AdminUserPermissionOverride = z.infer<
  typeof adminUserPermissionOverrideSchema
>;
export type AdminUserResolvedPermission = z.infer<
  typeof adminUserResolvedPermissionSchema
>;
export type AdminUserRoleAssignment = z.infer<
  typeof adminUserRoleAssignmentSchema
>;
