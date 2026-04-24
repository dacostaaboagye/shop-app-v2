import { z } from "zod";
import { authUserStatusSchema, portalKeySchema } from "./auth.js";

export const adminRoleOptionSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().trim().min(1).max(120),
});
export const adminLocationStatusSchema = z.enum(["active", "inactive"]);
export const adminLocationTypeSchema = z.enum(["store", "warehouse"]);
export const adminSortDirectionSchema = z.enum(["asc", "desc"]);

export const adminUserListQuerySchema = z.object({
  dir: adminSortDirectionSchema.default("asc"),
  locationSlug: z.string().trim().max(120).default(""),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(120).default(""),
  role: z.string().trim().max(120).default(""),
  sort: z.enum(["name", "status", "createdAt"]).default("name"),
  status: z.enum(["all", "active", "suspended", "deactivated"]).default("all"),
});

export const adminStaffRoleFilterSchema = z.enum(["all", "manager", "worker"]);

export const adminStaffListQuerySchema = adminUserListQuerySchema.extend({
  role: adminStaffRoleFilterSchema.default("all"),
});

export const adminAssignedLocationSchema = z.object({
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(120),
});

export const adminUserSummarySchema = z.object({
  assignedLocations: z.array(adminAssignedLocationSchema).default([]),
  createdAt: z.iso.datetime(),
  email: z.email(),
  firstName: z.string().min(1).max(120),
  lastLoginAt: z.iso.datetime().nullable(),
  lastName: z.string().min(1).max(120),
  preferredPortal: portalKeySchema.nullable(),
  primaryImageUrl: z.string().nullable().optional(),
  requiresPasswordChange: z.boolean(),
  roles: z.array(adminRoleOptionSchema).default([]),
  slug: z.string().min(1).max(120),
  status: authUserStatusSchema,
});

export const adminUserListResponseSchema = z.object({
  availableRoles: z.array(adminRoleOptionSchema).default([]),
  items: z.array(adminUserSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminStaffListResponseSchema = z.object({
  items: z.array(adminUserSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminLocationListQuerySchema = z.object({
  dir: adminSortDirectionSchema.default("asc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().trim().max(120).default(""),
  sort: z.enum(["name", "type", "status", "createdAt"]).default("name"),
  status: z.enum(["all", "active", "inactive"]).default("all"),
  type: z.enum(["all", "store", "warehouse"]).default("all"),
});

export const adminLocationSummarySchema = z.object({
  address: z.string().nullable().optional(),
  createdAt: z.iso.datetime(),
  isFulfilmentEnabled: z.boolean(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  managerName: z.string().min(1).max(241).nullable(),
  name: z.string().min(1).max(160),
  primaryImageUrl: z.string().nullable().optional(),
  slug: z.string().min(1).max(120),
  staffCount: z.number().int().min(0),
  status: adminLocationStatusSchema,
  type: adminLocationTypeSchema,
  zoneCount: z.number().int().min(0),
});

export const adminLocationListResponseSchema = z.object({
  items: z.array(adminLocationSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  totalCount: z.number().int().min(0),
});

export const adminLocationStaffSummarySchema = z.object({
  activeAssignmentCount: z.number().int().min(0),
  assignedAt: z.iso.datetime(),
  email: z.email(),
  firstName: z.string().min(1).max(120),
  lastName: z.string().min(1).max(120),
  primaryImageUrl: z.string().nullable().optional(),
  roleName: z.string().min(1).max(120),
  roleSlug: z.enum(["manager", "worker"]),
  status: authUserStatusSchema,
  userSlug: z.string().min(1).max(120),
});

export const adminLocationStaffListResponseSchema = z.object({
  items: z.array(adminLocationStaffSummarySchema),
  locationName: z.string().min(1).max(160),
  locationSlug: z.string().min(1).max(120),
});

export type AdminAssignedLocation = z.infer<typeof adminAssignedLocationSchema>;
export type AdminLocationListQuery = z.infer<
  typeof adminLocationListQuerySchema
>;
export type AdminLocationListResponse = z.infer<
  typeof adminLocationListResponseSchema
>;
export type AdminLocationStatus = z.infer<typeof adminLocationStatusSchema>;
export type AdminLocationSummary = z.infer<typeof adminLocationSummarySchema>;
export type AdminLocationStaffListResponse = z.infer<
  typeof adminLocationStaffListResponseSchema
>;
export type AdminLocationStaffSummary = z.infer<
  typeof adminLocationStaffSummarySchema
>;
export type AdminLocationType = z.infer<typeof adminLocationTypeSchema>;
export type AdminRoleOption = z.infer<typeof adminRoleOptionSchema>;
export type AdminSortDirection = z.infer<typeof adminSortDirectionSchema>;
export type AdminStaffListQuery = z.infer<typeof adminStaffListQuerySchema>;
export type AdminStaffListResponse = z.infer<
  typeof adminStaffListResponseSchema
>;
export type AdminStaffRoleFilter = z.infer<typeof adminStaffRoleFilterSchema>;
export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type AdminUserListResponse = z.infer<typeof adminUserListResponseSchema>;
export type AdminUserSummary = z.infer<typeof adminUserSummarySchema>;

export const adminLocationZoneSummarySchema = z.object({
  createdAt: z.string().datetime(),
  description: z.string().nullable().optional(),
  name: z.string().min(1).max(160),
  slug: z.string().min(1).max(120),
});

export type AdminLocationZoneSummary = z.infer<
  typeof adminLocationZoneSummarySchema
>;

export const adminLocationZoneListResponseSchema = z.object({
  items: z.array(adminLocationZoneSummarySchema),
});

export type AdminLocationZoneListResponse = z.infer<
  typeof adminLocationZoneListResponseSchema
>;
