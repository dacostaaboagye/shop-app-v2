import { AppError } from "../_core/errors/app-error.js";

export function locationNotFoundError(locationId: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Location ${locationId} does not exist.`,
    statusCode: 404,
    title: "Location not found",
  });
}
