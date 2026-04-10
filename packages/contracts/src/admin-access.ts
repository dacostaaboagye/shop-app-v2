import { z } from "zod";

export const adminRoleListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(120).default(""),
});

export const adminRoleSummarySchema = z.object({
  assignedUserCount: z.number().int().min(0),
  description: z.string().min(1).max(500),
  isSystem: z.boolean(),
  name: z.string().min(1).max(120),
  permissionCount: z.number().int().min(0),
  slug: z.string().min(1).max(120),
});

export const adminRoleListResponseSchema = z.object({
  items: z.array(adminRoleSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminPermissionSummarySchema = z.object({
  assignedRoleCount: z.number().int().min(0),
  description: z.string().min(1),
  key: z.string().min(1).max(120),
});

export const adminPermissionListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  q: z.string().trim().max(120).default(""),
});

export const adminPermissionListResponseSchema = z.object({
  items: z.array(adminPermissionSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminRolePermissionSchema = adminPermissionSummarySchema.extend({
  granted: z.boolean(),
});

export const adminRoleDetailSchema = adminRoleSummarySchema.extend({
  permissions: z.array(adminRolePermissionSchema),
});

export const adminCreateRoleRequestSchema = z.object({
  description: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(120),
  permissionKeys: z.array(z.string().trim().min(1).max(120)).default([]),
});

export const adminUpdateRoleRequestSchema = adminCreateRoleRequestSchema;

export const adminAuditListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
});

export const adminAuditEntrySchema = z.object({
  action: z.enum([
    "role_assigned",
    "role_revoked",
    "override_set",
    "override_removed",
  ]),
  actorName: z.string().min(1).max(241).nullable(),
  createdAt: z.iso.datetime(),
  locationName: z.string().min(1).max(160).nullable(),
  overrideEffect: z.enum(["allow", "deny"]).nullable(),
  permissionKey: z.string().min(1).max(120).nullable(),
  reason: z.string().min(1),
  roleSlug: z.string().min(1).max(120).nullable(),
  targetUserName: z.string().min(1).max(241).nullable(),
});

export const adminAuditListResponseSchema = z.object({
  items: z.array(adminAuditEntrySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export type AdminAuditEntry = z.infer<typeof adminAuditEntrySchema>;
export type AdminAuditListQuery = z.infer<typeof adminAuditListQuerySchema>;
export type AdminAuditListResponse = z.infer<
  typeof adminAuditListResponseSchema
>;
export type AdminCreateRoleRequest = z.infer<
  typeof adminCreateRoleRequestSchema
>;
export type AdminPermissionListQuery = z.infer<
  typeof adminPermissionListQuerySchema
>;
export type AdminPermissionListResponse = z.infer<
  typeof adminPermissionListResponseSchema
>;
export type AdminPermissionSummary = z.infer<
  typeof adminPermissionSummarySchema
>;
export type AdminRoleDetail = z.infer<typeof adminRoleDetailSchema>;
export type AdminRoleListQuery = z.infer<typeof adminRoleListQuerySchema>;
export type AdminRoleListResponse = z.infer<typeof adminRoleListResponseSchema>;
export type AdminRoleSummary = z.infer<typeof adminRoleSummarySchema>;
export type AdminUpdateRoleRequest = z.infer<
  typeof adminUpdateRoleRequestSchema
>;
