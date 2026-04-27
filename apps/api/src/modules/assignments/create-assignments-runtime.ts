import { stockBalances } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { OwnershipEventWriteService } from "../inventory-ownership/ownership-event-write.service.js";
import { OwnershipHandoverService } from "../inventory-ownership/ownership-handover.service.js";
import { OwnershipQueryService } from "../inventory-ownership/ownership-query.service.js";
import { PostgresOwnershipEventRepository } from "../inventory-ownership/postgres-ownership-event.repository.js";
import { PostgresOwnershipHandoverRepository } from "../inventory-ownership/postgres-ownership-handover.repository.js";
import { PostgresOwnershipQueryRepository } from "../inventory-ownership/postgres-ownership-query.repository.js";
import { AssignmentCommandService } from "./assignment-command.service.js";
import { PostgresAssignmentEventContextRepository } from "./assignment-event-context.repository.js";
import { PostgresWorkerAssignmentQueryRepository } from "./postgres-worker-assignment-query.repository.js";

type AssignmentsRuntime = {
  assignments: {
    assignmentCommandService: AssignmentCommandService;
    assignmentQueryRepository: PostgresWorkerAssignmentQueryRepository;
    handoverRepository: PostgresOwnershipHandoverRepository;
    ownershipEventWriteService: OwnershipEventWriteService;
    ownershipHandoverService: OwnershipHandoverService;
    stockBalanceRepository: {
      getOnHandQuantity(
        skuId: string,
        locationId: string,
      ): Promise<number | null>;
    };
  };
};

export function createAssignmentsRuntime(
  databaseRuntime: DatabaseRuntime,
  options: {
    platformEventPublisher?: PlatformEventPublisher;
  } = {},
): AssignmentsRuntime {
  const ownershipQueryService = new OwnershipQueryService(
    new PostgresOwnershipQueryRepository(databaseRuntime.db),
  );
  const ownershipEventWriteService = new OwnershipEventWriteService(
    new PostgresOwnershipEventRepository(databaseRuntime.db),
    ownershipQueryService,
  );
  const handoverRepository = new PostgresOwnershipHandoverRepository(
    databaseRuntime.db,
  );
  const ownershipHandoverService = new OwnershipHandoverService(
    handoverRepository,
    ownershipQueryService,
  );

  return {
    assignments: {
      assignmentCommandService: new AssignmentCommandService(
        ownershipEventWriteService,
        ownershipHandoverService,
        new PostgresAssignmentEventContextRepository(databaseRuntime.db),
        options.platformEventPublisher ?? null,
      ),
      assignmentQueryRepository: new PostgresWorkerAssignmentQueryRepository(
        databaseRuntime.db,
      ),
      handoverRepository,
      ownershipEventWriteService,
      ownershipHandoverService,
      stockBalanceRepository: {
        async getOnHandQuantity(skuId: string, locationId: string) {
          const rows = await databaseRuntime.db
            .select({ onHandQuantity: stockBalances.onHandQuantity })
            .from(stockBalances)
            .where(
              and(
                eq(stockBalances.skuId, skuId),
                eq(stockBalances.locationId, locationId),
              ),
            )
            .limit(1);
          return rows[0]?.onHandQuantity ?? null;
        },
      },
    },
  };
}
