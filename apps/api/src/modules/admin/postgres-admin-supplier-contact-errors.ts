import { AppError } from "../_core/errors/app-error.js";

export function supplierContactNotFoundError() {
  return new AppError({
    code: "not_found",
    detail: "The requested supplier contact could not be found.",
    statusCode: 404,
    title: "Supplier contact not found",
  });
}

export function supplierContactEmailRequiredError() {
  return new AppError({
    code: "validation_error",
    detail:
      "Add an email address to this supplier contact before sending a portal invite.",
    statusCode: 400,
    title: "Supplier contact email required",
  });
}

export function supplierContactUserAlreadyLinkedError() {
  return new AppError({
    code: "conflict",
    detail:
      "This user account is already linked to another supplier contact. Unlink it before assigning it again.",
    statusCode: 409,
    title: "Supplier portal user already linked",
  });
}

export function supplierContactInactiveError() {
  return new AppError({
    code: "conflict",
    detail:
      "Activate this supplier contact before linking or inviting portal access.",
    statusCode: 409,
    title: "Supplier contact inactive",
  });
}

export function supplierPortalInviteEmailUnavailableError() {
  return new AppError({
    code: "internal_error",
    detail: "Supplier invite email delivery is not configured.",
    statusCode: 503,
    title: "Supplier invite unavailable",
  });
}

export function supplierPortalInviteFailedError() {
  return new AppError({
    code: "internal_error",
    detail: "The supplier portal invite account could not be created.",
    statusCode: 500,
    title: "Supplier invite failed",
  });
}
