import type { PosSaleDeliverySourcePort } from "@shop/contracts";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { OwnershipQueryService } from "../inventory-ownership/ownership-query.service.js";
import { PostgresOwnershipQueryRepository } from "../inventory-ownership/postgres-ownership-query.repository.js";
import { SalesAttributionService } from "../inventory-ownership/sales-attribution.service.js";
import type { OfficialDocumentSettingsService } from "../official-documents/official-document-settings.service.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { PosSaleService } from "./pos-sale.service.js";
import { PosSaleDeliverySourceAdapter } from "./pos-sale-delivery-source.adapter.js";
import { PostgresInvoiceRepository } from "./postgres-invoice.repository.js";
import { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";
import { PostgresPosCatalogVariantRepository } from "./postgres-pos-catalog.repository.js";
import { PostgresSalesEventContextRepository } from "./sales-event-context.repository.js";

type SalesRuntime = {
  sales: {
    invoiceQueryRepository: PostgresInvoiceQueryRepository;
    invoiceRepository: PostgresInvoiceRepository;
    posSaleDeliverySourcePort: PosSaleDeliverySourcePort;
    posSaleService: PosSaleService;
  };
};

export function createSalesRuntime(
  databaseRuntime: DatabaseRuntime,
  options: {
    documentProfileResolver: Pick<
      OfficialDocumentSettingsService,
      "resolveDocumentProfile"
    >;
    platformEventPublisher?: PlatformEventPublisher;
  },
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

  const currencyResolver = {
    async resolveCurrencySnapshot(input: { locationId: string }) {
      const profile =
        await options.documentProfileResolver.resolveDocumentProfile({
          locationId: input.locationId,
        });

      return {
        currencyCode: profile.currencyCode,
        currencyScale: profile.currencyScale,
      };
    },
  };

  const posSaleService = new PosSaleService({
    catalogVariantRepository,
    currencyResolver,
    invoiceRepository: combinedInvoiceRepository,
    platformEventPublisher: options.platformEventPublisher ?? null,
    referenceNumberService,
    salesEventContextRepository: new PostgresSalesEventContextRepository(
      databaseRuntime.db,
    ),
    salesAttributionService,
  });

  return {
    sales: {
      invoiceQueryRepository,
      invoiceRepository,
      posSaleDeliverySourcePort: new PosSaleDeliverySourceAdapter(
        invoiceQueryRepository,
      ),
      posSaleService,
    },
  };
}
