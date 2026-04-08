import type { FastifyRequest } from "fastify";

export function resolveRequestLocationId(
  request: FastifyRequest,
): string | undefined {
  const headerValue = request.headers["x-location-id"];

  if (typeof headerValue === "string" && headerValue.trim()) {
    return headerValue.trim();
  }

  if (Array.isArray(headerValue) && headerValue[0]?.trim()) {
    return headerValue[0].trim();
  }

  const query = request.query;

  if (!query || typeof query !== "object") {
    return undefined;
  }

  if ("locationId" in query && typeof query.locationId === "string") {
    const locationId = query.locationId.trim();
    return locationId ? locationId : undefined;
  }

  return undefined;
}
