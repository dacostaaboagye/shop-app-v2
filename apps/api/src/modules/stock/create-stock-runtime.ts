import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { ActiveReservationQueryService } from "./active-reservation-query.service.js";
import { PostgresActiveReservationQueryRepository } from "./postgres-active-reservation-query.repository.js";

type StockRuntime = {
  stock: {
    activeReservationQueryService: ActiveReservationQueryService;
  };
};

export function createStockRuntime(
  databaseRuntime: DatabaseRuntime,
): StockRuntime {
  return {
    stock: {
      activeReservationQueryService: new ActiveReservationQueryService(
        new PostgresActiveReservationQueryRepository(databaseRuntime.pool),
      ),
    },
  };
}
