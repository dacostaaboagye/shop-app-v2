import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { ActiveReservationQueryService } from "./active-reservation-query.service.js";
import { PostgresActiveReservationQueryRepository } from "./postgres-active-reservation-query.repository.js";
import { PostgresAdminReservationQueryRepository } from "./postgres-admin-reservation-query.repository.js";
import { AdminStockCountRepository } from "./postgres-admin-stock-count.repository.js";
import { PostgresStockBalanceQueryRepository } from "./postgres-stock-balance-query.repository.js";

type StockRuntime = {
  stock: {
    activeReservationQueryService: ActiveReservationQueryService;
    reservationQueryRepo: PostgresAdminReservationQueryRepository;
    stockBalanceQueryRepo: PostgresStockBalanceQueryRepository;
    stockCountRepo: AdminStockCountRepository;
  };
};

export function createStockRuntime(
  databaseRuntime: DatabaseRuntime,
): StockRuntime {
  return {
    stock: {
      activeReservationQueryService: new ActiveReservationQueryService(
        new PostgresActiveReservationQueryRepository(databaseRuntime.db),
      ),
      reservationQueryRepo: new PostgresAdminReservationQueryRepository(
        databaseRuntime.db,
      ),
      stockBalanceQueryRepo: new PostgresStockBalanceQueryRepository(
        databaseRuntime.db,
      ),
      stockCountRepo: new AdminStockCountRepository(databaseRuntime.db),
    },
  };
}
