import type { StockTakeSessionSummary } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PostgresStockTakeLifecycleRepository } from "./postgres-stock-take-lifecycle.repository.js";

type StockTakeLifecycleRepository = Pick<
  PostgresStockTakeLifecycleRepository,
  "cancelSession"
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
}
