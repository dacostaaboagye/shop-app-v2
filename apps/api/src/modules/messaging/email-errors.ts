import { AppError } from "../_core/errors/app-error.js";

export function assertValidFromAddress(fromAddress: string): void {
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(fromAddress)) return;
  if (/^.+ <[^@\s]+@[^@\s]+\.[^@\s]+>$/.test(fromAddress)) return;

  throw new Error("EMAIL_FROM_ADDRESS must be a valid email sender address.");
}

export function emailDeliveryError(
  details?: Record<string, unknown>,
): AppError {
  return new AppError({
    code: "internal_error",
    detail:
      "The email provider could not deliver this message. Try again later or contact support.",
    ...(details ? { details } : {}),
    statusCode: 502,
    title: "Email delivery failed",
  });
}
