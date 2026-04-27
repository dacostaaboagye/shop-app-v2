import { AppError } from "../_core/errors/app-error.js";

export function cannotCancelError() {
  return new AppError({
    code: "not_found",
    detail: "Request not found or cannot be cancelled at this stage.",
    statusCode: 404,
    title: "Cannot cancel",
  });
}
