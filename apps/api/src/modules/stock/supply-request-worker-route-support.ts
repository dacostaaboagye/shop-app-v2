import { AppError } from "../_core/errors/app-error.js";

export function cannotCancelError() {
  return new AppError({
    code: "not_found",
    detail: "Request not found or cannot be cancelled at this stage.",
    statusCode: 404,
    title: "Cannot cancel",
  });
}

export function cannotConfirmReceiptError() {
  return new AppError({
    code: "not_found",
    detail: "Supply request not found or goods have not been dispatched yet.",
    statusCode: 404,
    title: "Cannot confirm receipt",
  });
}
