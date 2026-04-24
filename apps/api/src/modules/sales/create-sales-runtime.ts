import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { OwnershipQueryService } from "../inventory-ownership/ownership-query.service.js";
import { PostgresOwnershipQueryRepository } from "../inventory-ownership/postgres-ownership-query.repository.js";
import { SalesAttributionService } from "../inventory-ownership/sales-attribution.service.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { PosSaleService } from "./pos-sale.service.js";
import { PostgresInvoiceRepository } from "./postgres-invoice.repository.js";
import { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";
import { PostgresPosCatalogVariantRepository } from "./postgres-pos-catalog.repository.js";

type SalesRuntime = {
  sales: {
    invoiceQueryRepository: PostgresInvoiceQueryRepository;
    invoiceRepository: PostgresInvoiceRepository;
    posSaleService: PosSaleService;
  };
};

export function createSalesRuntime(
  databaseRuntime: DatabaseRuntime,
): SalesRuntime {
  const ownershipQueryService = new OwnershipQueryService(
    new PostgresOwnershipQueryRepository(databaseRuntime.db),
  );
  const salesAttributionService = new SalesAttributionService(
    ownershipQueryService,
  );
  const referenceNumberService = new ReferenceNumberService(
    new PostgresReferenceNumberRepository(databaseRuntime.db),
  );
  const catalogVariantRepository = new PostgresPosCatalogVariantRepository(
    databaseRuntime.db,
  );
  const invoiceRepository = new PostgresInvoiceRepository(databaseRuntime.db);
  const invoiceQueryRepository = new PostgresInvoiceQueryRepository(
    databaseRuntime.db,
  );

  const combinedInvoiceRepository = {
    createSaleTransaction:
      invoiceRepository.createSaleTransaction.bind(invoiceRepository),
    createReturnTransaction:
      invoiceRepository.createReturnTransaction.bind(invoiceRepository),
    findByReference: invoiceQueryRepository.findByReference.bind(
      invoiceQueryRepository,
    ),
  };

  const posSaleService = new PosSaleService({
    catalogVariantRepository,
    invoiceRepository: combinedInvoiceRepository,
    referenceNumberService,
    salesAttributionService,
  });

  return {
    sales: {
      invoiceQueryRepository,
      invoiceRepository,
      posSaleService,
    },
  };
}
