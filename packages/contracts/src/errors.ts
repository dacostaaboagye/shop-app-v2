import { z } from "zod";

export const errorCodeSchema = z.enum([
  "validation_error",
  "unauthorized",
  "forbidden",
  "not_found",
  "conflict",
  "payload_too_large",
  "rate_limited",
  "provisioning_failed",
  "internal_error",
]);

export const problemDetailsSchema = z.object({
  code: errorCodeSchema,
  status: z.number().int().min(400).max(599),
  title: z.string().min(1),
  detail: z.string().min(1),
  requestId: z.string().min(1),
  timestamp: z.iso.datetime(),
  details: z.record(z.string(), z.unknown()).optional(),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
