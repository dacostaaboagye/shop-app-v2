import { catalogProducts, locations, productVariants } from "@shop/database";
import { and, asc, eq } from "drizzle-orm";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PlatformEventPipelinePublisher } from "../events/platform-event-pipeline.publisher.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { ActiveReservationQueryService } from "./active-reservation-query.service.js";
import { PostgresActiveReservationQueryRepository } from "./postgres-active-reservation-query.repository.js";
import { PostgresAdminReservationQueryRepository } from "./postgres-admin-reservation-query.repository.js";
import { AdminStockCountRepository } from "./postgres-admin-stock-count.repository.js";
import { PostgresStockBalanceQueryRepository } from "./postgres-stock-balance-query.repository.js";
import { PostgresSupplyRequestRepository } from "./postgres-supply-request.repository.js";
import { StockSupplyService } from "./stock-supply.service.js";

type CreateStockRuntimeOptions = {
  platformEventPublisher?: Pick<
    PlatformEventPipelinePublisher,
    "appendWithinTransaction" | "notifyAppendCommitted"
  >;
};

type StockRuntime = {
  stock: {
    activeReservationQueryService: ActiveReservationQueryService;
    locationRepository: {
      listActiveLocations(): Promise<{ id: string; name: string }[]>;
    };
    referenceNumberService: ReferenceNumberService;
    reservationQueryRepo: PostgresAdminReservationQueryRepository;
    stockBalanceQueryRepo: PostgresStockBalanceQueryRepository;
    stockCountRepo: AdminStockCountRepository;
    supplyRequestRepository: PostgresSupplyRequestRepository;
    supplyService: StockSupplyService;
    variantSnapshotRepository: {
      getVariantSnapshot(skuId: string): Promise<{
        sku: string;
        productName: string;
        variantName: string;
      } | null>;
    };
  };
};

export function createStockRuntime(
  databaseRuntime: DatabaseRuntime,
  options: CreateStockRuntimeOptions = {},
): StockRuntime {
  const referenceNumberService = new ReferenceNumberService(
    new PostgresReferenceNumberRepository(databaseRuntime.db),
  );

  const supplyRequestRepository = new PostgresSupplyRequestRepository(
    databaseRuntime.db,
  );
  const supplyService = new StockSupplyService(
    databaseRuntime.db,
    referenceNumberService,
    options.platformEventPublisher,
  );

  return {
    stock: {
      activeReservationQueryService: new ActiveReservationQueryService(
        new PostgresActiveReservationQueryRepository(databaseRuntime.db),
      ),
      locationRepository: {
        async listActiveLocations() {
          return databaseRuntime.db
            .select({ id: locations.id, name: locations.name })
            .from(locations)
            .where(eq(locations.status, "active"))
            .orderBy(asc(locations.name));
        },
      },
      referenceNumberService,
      reservationQueryRepo: new PostgresAdminReservationQueryRepository(
        databaseRuntime.db,
      ),
      stockBalanceQueryRepo: new PostgresStockBalanceQueryRepository(
        databaseRuntime.db,
      ),
      stockCountRepo: new AdminStockCountRepository(databaseRuntime.db),
      supplyRequestRepository,
      supplyService,
      variantSnapshotRepository: {
        async getVariantSnapshot(skuId) {
          const rows = await databaseRuntime.db
            .select({
              productName: catalogProducts.name,
              sku: productVariants.sku,
              variantName: productVariants.name,
            })
            .from(productVariants)
            .innerJoin(
              catalogProducts,
              eq(productVariants.productId, catalogProducts.id),
            )
            .where(
              and(
                eq(productVariants.id, skuId),
                eq(productVariants.status, "active"),
              ),
            )
            .limit(1);
          const row = rows[0];
          if (!row) return null;
          return {
            productName: row.productName,
            sku: row.sku,
            variantName: row.variantName,
          };
        },
      },
    },
  };
}
