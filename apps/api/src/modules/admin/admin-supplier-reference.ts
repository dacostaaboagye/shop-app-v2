import { AppError } from "../_core/errors/app-error.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";

export async function generateSupplierReference(input: {
  missingDetail: string;
  missingTitle: string;
  now: Date;
  referenceNumberService: Pick<ReferenceNumberService, "generateReference"> | undefined;
  sequenceKey: Parameters<
    Pick<ReferenceNumberService, "generateReference">["generateReference"]
  >[0]["sequenceKey"];
}) {
  if (!input.referenceNumberService) {
    throw new AppError({
      code: "internal_error",
      detail: input.missingDetail,
      statusCode: 503,
      title: input.missingTitle,
    });
  }

  return input.referenceNumberService.generateReference({
    now: input.now,
    sequenceKey: input.sequenceKey,
  });
}
