import { AppError } from "../_core/errors/app-error.js";

export function assertOpeningCountAllowed(input: {
  existingBalance: unknown | null | undefined;
  locationSlug: string;
  reasonCode: string;
  sku: string;
}) {
  if (input.reasonCode === "opening_count") {
    throw new AppError({
      code: "conflict",
      detail: `Use the opening stock setup flow to initialize SKU "${input.sku}" at location "${input.locationSlug}". Use cycle count or correction for normal stock counts.`,
      statusCode: 409,
      title: "Opening stock requires setup flow",
    });
  }

  if (input.existingBalance) return;

  throw new AppError({
    code: "conflict",
    detail: `SKU "${input.sku}" has no initialized stock balance at location "${input.locationSlug}". Use opening stock setup before recording counts or corrections.`,
    statusCode: 409,
    title: "Stock balance not initialized",
  });
}
