import { z } from "zod";
import {
  adminLocationStatusSchema,
  adminLocationSummarySchema,
  adminLocationTypeSchema,
  adminLocationZoneSummarySchema,
} from "./admin.js";

export const adminCreateLocationRequestSchema = z.object({
  address: z.string().max(500).optional(),
  isFulfilmentEnabled: z.boolean().default(false),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  name: z.string().trim().min(1).max(160),
  status: adminLocationStatusSchema.default("active"),
  type: adminLocationTypeSchema,
});

export const adminCreateLocationResponseSchema =
  adminLocationSummarySchema.extend({});

export const adminUpdateLocationRequestSchema = z.object({
  address: z.string().max(500).nullable().optional(),
  isFulfilmentEnabled: z.boolean().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  name: z.string().trim().min(1).max(160).optional(),
  status: adminLocationStatusSchema.optional(),
  type: adminLocationTypeSchema.optional(),
});

export const adminUpdateLocationResponseSchema =
  adminLocationSummarySchema.extend({});

export type AdminCreateLocationRequest = z.infer<
  typeof adminCreateLocationRequestSchema
>;
export type AdminCreateLocationResponse = z.infer<
  typeof adminCreateLocationResponseSchema
>;
export type AdminUpdateLocationRequest = z.infer<
  typeof adminUpdateLocationRequestSchema
>;
export type AdminUpdateLocationResponse = z.infer<
  typeof adminUpdateLocationResponseSchema
>;

export const adminCreateLocationZoneRequestSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  name: z.string().trim().min(1).max(160),
});
export const adminCreateLocationZoneResponseSchema =
  adminLocationZoneSummarySchema.extend({});

export const adminUpdateLocationZoneRequestSchema = z.object({
  description: z.string().max(1000).nullable().optional(),
  name: z.string().trim().min(1).max(160).optional(),
});
export const adminUpdateLocationZoneResponseSchema =
  adminLocationZoneSummarySchema.extend({});

export type AdminCreateLocationZoneRequest = z.infer<
  typeof adminCreateLocationZoneRequestSchema
>;
export type AdminCreateLocationZoneResponse = z.infer<
  typeof adminCreateLocationZoneResponseSchema
>;
export type AdminUpdateLocationZoneRequest = z.infer<
  typeof adminUpdateLocationZoneRequestSchema
>;
export type AdminUpdateLocationZoneResponse = z.infer<
  typeof adminUpdateLocationZoneResponseSchema
>;
