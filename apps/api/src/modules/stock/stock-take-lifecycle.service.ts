import type {
  StockTakeLineCountEntry,
  StockTakeLineCountUpdateResponse,
  StockTakeSessionSummary,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PostgresStockTakeLifecycleRepository } from "./postgres-stock-take-lifecycle.repository.js";

type StockTakeLifecycleRepository = Pick<
  PostgresStockTakeLifecycleRepository,
  "cancelSession" | "updateLineCounts"
>;

export class StockTakeLifecycleService {
  constructor(private readonly repository: StockTakeLifecycleRepository) {}

  async cancelSession(input: {
    cancelledBy?: string;
    portal: "admin" | "manager";
    reference: string;
  }): Promise<StockTakeSessionSummary> {
    const session = await this.repository.cancelSession({
      ...(input.cancelledBy ? { cancelledBy: input.cancelledBy } : {}),
      now: new Date(),
      portal: input.portal,
      reference: input.reference,
    });

    if (!session) {
      throw new AppError({
        code: "conflict",
        detail: `Stock take "${input.reference}" is no longer cancellable.`,
        statusCode: 409,
        title: "Stock take cannot be deleted",
      });
    }

    return session;
  }

  async updateLineCounts(input: {
    entries: StockTakeLineCountEntry[];
    reference: string;
  }): Promise<StockTakeLineCountUpdateResponse> {
    const outcome = await this.repository.updateLineCounts({
      entries: input.entries,
      now: new Date(),
      reference: input.reference,
    });

    if (outcome.kind === "not_found") {
      throw new AppError({
        code: "not_found",
        detail: `Stock take "${input.reference}" was not found.`,
        statusCode: 404,
        title: "Stock take not found",
      });
    }

    if (outcome.kind === "conflict") {
      throw new AppError({
        code: "conflict",
        detail: `Stock take "${input.reference}" is ${outcome.status} and cannot be edited.`,
        statusCode: 409,
        title: "Stock take cannot be edited",
      });
    }

    if (outcome.kind === "validation_error") {
      throw new AppError({
        code: "validation_error",
        detail: "One or more line-count entries could not be applied.",
        details: { errors: outcome.errors },
        statusCode: 400,
        title: "Line-count validation failed",
      });
    }

    return {
      errors: [],
      status: outcome.status,
      stockTakeReference: outcome.stockTakeReference,
      updatedCount: outcome.updatedCount,
    };
  }
}
