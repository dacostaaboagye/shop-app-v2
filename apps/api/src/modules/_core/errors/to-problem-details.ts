import { type ProblemDetails, problemDetailsSchema } from "@shop/contracts";
import type { FastifyRequest } from "fastify";
import type { AppError } from "./app-error.js";

export function toProblemDetails(
  error: AppError,
  request: FastifyRequest,
): ProblemDetails {
  return problemDetailsSchema.parse({
    code: error.code,
    status: error.statusCode,
    title: error.title,
    detail: error.message,
    requestId: request.id,
    timestamp: new Date().toISOString(),
    details: error.details,
  });
}

export function toUnexpectedProblemDetails(
  request: FastifyRequest,
): ProblemDetails {
  return problemDetailsSchema.parse({
    code: "internal_error",
    status: 500,
    title: "Internal Server Error",
    detail: "An unexpected error occurred.",
    requestId: request.id,
    timestamp: new Date().toISOString(),
  });
}
