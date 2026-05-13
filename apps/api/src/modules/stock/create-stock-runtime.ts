import type { TransferDeliverySourcePort } from "@shop/contracts";
import { catalogProducts, locations, productVariants } from "@shop/database";
import { and, asc, eq } from "drizzle-orm";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { DeliveryCreationStockSideEffectsPort } from "../deliveries/delivery-creation.contracts.js";
import type { PlatformEventPipelinePublisher } from "../events/platform-event-pipeline.publisher.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { ActiveReservationQueryService } from "./active-reservation-query.service.js";
import { PostgresDeliveryStockSideEffectsParticipant } from "./delivery-stock-side-effects.participant.js";
import { PostgresActiveReservationQueryRepository } from "./postgres-active-reservation-query.repository.js";
import { PostgresAdminReservationQueryRepository } from "./postgres-admin-reservation-query.repository.js";
import { AdminStockCountRepository } from "./postgres-admin-stock-count.repository.js";
import { PostgresOpeningStockRepository } from "./postgres-opening-stock.repository.js";
import { PostgresStockBalanceQueryRepository } from "./postgres-stock-balance-query.repository.js";
import { PostgresStockMovementQueryRepository } from "./postgres-stock-movement-query.repository.js";
import { PostgresStockTakeRepository } from "./postgres-stock-take.repository.js";
import { PostgresStockTakeApplyRepository } from "./postgres-stock-take-apply.repository.js";
import { PostgresStockTakeImportRepository } from "./postgres-stock-take-import.repository.js";
import { PostgresStockTakeLifecycleRepository } from "./postgres-stock-take-lifecycle.repository.js";
import { PostgresStockTakeListRepository } from "./postgres-stock-take-list.repository.js";
import { PostgresSupplyRequestRepository } from "./postgres-supply-request.repository.js";
import { StockSupplyService } from "./stock-supply.service.js";
import { StockTakeService } from "./stock-take.service.js";
import { StockTakeApplyService } from "./stock-take-apply.service.js";
import { StockTakeImportService } from "./stock-take-import.service.js";
import { StockTakeLifecycleService } from "./stock-take-lifecycle.service.js";
import { StockTakeListService } from "./stock-take-list.service.js";
import {
  PostgresStockTransferDeliverySourceLookup,
  TransferDeliverySourceAdapter,
} from "./transfer-delivery-source.adapter.js";

type CreateStockRuntimeOptions = {
  platformEventPublisher?: Pick<
    PlatformEventPipelinePublisher,
    "appendWithinTransaction" | "notifyAppendCommitted"
  >;
};

type StockRuntime = {
  stock: {
    activeReservationQueryService: ActiveReservationQueryService;
    deliveryStockSideEffectsPort: DeliveryCreationStockSideEffectsPort;
    locationRepository: {
      listActiveLocations(): Promise<{ id: string; name: string }[]>;
    };
    referenceNumberService: ReferenceNumberService;
    openingStockRepo: PostgresOpeningStockRepository;
    reservationQueryRepo: PostgresAdminReservationQueryRepository;
    stockBalanceQueryRepo: PostgresStockBalanceQueryRepository;
    stockMovementQueryRepo: PostgresStockMovementQueryRepository;
    stockCountRepo: AdminStockCountRepository;
    stockTakeApplyService: StockTakeApplyService;
    stockTakeListService: StockTakeListService;
    stockTakeLifecycleService: StockTakeLifecycleService;
    stockTakeRepository: PostgresStockTakeRepository;
    stockTakeImportService: StockTakeImportService;
    stockTakeService: StockTakeService;
    supplyRequestRepository: PostgresSupplyRequestRepository;
    supplyService: StockSupplyService;
    transferDeliverySourcePort: TransferDeliverySourcePort;
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
  const stockTakeRepository = new PostgresStockTakeRepository(
    databaseRuntime.db,
  );
  const stockTakeListRepository = new PostgresStockTakeListRepository(
    databaseRuntime.db,
  );
  const stockTakeLifecycleRepository = new PostgresStockTakeLifecycleRepository(
    databaseRuntime.db,
  );
  const stockTakeImportRepository = new PostgresStockTakeImportRepository(
    databaseRuntime.db,
  );
  const stockTakeApplyRepository = new PostgresStockTakeApplyRepository(
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
      deliveryStockSideEffectsPort:
        new PostgresDeliveryStockSideEffectsParticipant(),
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
      openingStockRepo: new PostgresOpeningStockRepository(
        databaseRuntime.db,
        options.platformEventPublisher,
      ),
      reservationQueryRepo: new PostgresAdminReservationQueryRepository(
        databaseRuntime.db,
      ),
      stockBalanceQueryRepo: new PostgresStockBalanceQueryRepository(
        databaseRuntime.db,
      ),
      stockMovementQueryRepo: new PostgresStockMovementQueryRepository(
        databaseRuntime.db,
      ),
      stockCountRepo: new AdminStockCountRepository(
        databaseRuntime.db,
        options.platformEventPublisher,
      ),
      stockTakeRepository,
      stockTakeApplyService: new StockTakeApplyService(
        stockTakeApplyRepository,
        stockTakeImportRepository,
      ),
      stockTakeListService: new StockTakeListService(stockTakeListRepository),
      stockTakeLifecycleService: new StockTakeLifecycleService(
        stockTakeLifecycleRepository,
      ),
      stockTakeImportService: new StockTakeImportService(
        stockTakeImportRepository,
      ),
      stockTakeService: new StockTakeService(
        stockTakeRepository,
        referenceNumberService,
      ),
      supplyRequestRepository,
      supplyService,
      transferDeliverySourcePort: new TransferDeliverySourceAdapter(
        new PostgresStockTransferDeliverySourceLookup(databaseRuntime.db),
      ),
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
