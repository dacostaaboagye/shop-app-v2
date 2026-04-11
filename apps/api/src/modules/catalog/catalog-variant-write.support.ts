import type { AdminUpdateVariantRequest } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export function getVariantStatusPatch(
  payload: Pick<AdminUpdateVariantRequest, "isDefault" | "status">,
  now: Date,
): {
  archivedAt: Date | null | undefined;
  isDefault: boolean | undefined;
} {
  if (payload.status === "archived") {
    if (payload.isDefault === true) {
      throw new AppError({
        code: "invalid_operation",
        detail: "Archived variants cannot remain the default variant.",
        statusCode: 400,
        title: "Invalid variant state",
      });
    }

    return {
      archivedAt: now,
      isDefault: false,
    };
  }

  if (payload.status === "active") {
    return {
      archivedAt: null,
      isDefault: payload.isDefault,
    };
  }

  return {
    archivedAt: undefined,
    isDefault: payload.isDefault,
  };
}
