import { AppError } from "../_core/errors/app-error.js";

export function customerContactNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested customer contact could not be found.",
    statusCode: 404,
    title: "Customer contact not found",
  });
}

export function customerContactInactiveError() {
  return new AppError({
    code: "conflict",
    detail: "Activate this customer contact before linking portal access.",
    statusCode: 409,
    title: "Customer contact inactive",
  });
}
