import type { PosSaleDeliverySourcePort } from "@shop/contracts";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { OwnershipQueryService } from "../inventory-ownership/ownership-query.service.js";
import { PostgresOwnershipQueryRepository } from "../inventory-ownership/postgres-ownership-query.repository.js";
import { SalesAttributionService } from "../inventory-ownership/sales-attribution.service.js";
import type { OfficialDocumentSettingsService } from "../official-documents/official-document-settings.service.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { InvoiceIssuanceService } from "./invoice-issuance.service.js";
import { ManualInvoiceRequestService } from "./manual-invoice-request.service.js";
import { PosSaleService } from "./pos-sale.service.js";
import { PosSaleDeliverySourceAdapter } from "./pos-sale-delivery-source.adapter.js";
import { PostgresAdminInvoiceQueryRepository } from "./postgres-admin-invoice-query.repository.js";
import { PostgresCustomerInvoiceQueryRepository } from "./postgres-customer-invoice-query.repository.js";
import { PostgresInvoiceRepository } from "./postgres-invoice.repository.js";
import { PostgresInvoiceQueryRepository } from "./postgres-invoice-query.repository.js";
import { PostgresManualInvoiceRequestRepository } from "./postgres-manual-invoice-request.repository.js";
import { PostgresPosCatalogVariantRepository } from "./postgres-pos-catalog.repository.js";
import { PostgresSalesCustomerLinkRepository } from "./postgres-sales-customer-link.repository.js";
import { PostgresSalesEventContextRepository } from "./sales-event-context.repository.js";

type SalesRuntime = {
  sales: {
    invoiceQueryRepository: PostgresInvoiceQueryRepository;
    manualInvoiceRequestRepository: PostgresManualInvoiceRequestRepository;
    manualInvoiceRequestService: ManualInvoiceRequestService;
    adminInvoiceQueryRepository: PostgresAdminInvoiceQueryRepository;
    customerInvoiceQueryRepository: PostgresCustomerInvoiceQueryRepository;
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
    logger?: {
      info?: (fields: Record<string, unknown>, message: string) => void;
    };
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
    {
      onReferenceReserved(event) {
        if (!event.sequenceKey.startsWith("invoice-")) return;

        options.logger?.info?.(
          {
            reference: event.reference,
            sequenceKey: event.sequenceKey,
            sequenceStorageKey: event.sequenceStorageKey,
            sequenceValue: event.sequenceValue,
          },
          "Sales invoice reference reserved.",
        );
      },
    },
  );
  const catalogVariantRepository = new PostgresPosCatalogVariantRepository(
    databaseRuntime.db,
  );
  const invoiceRepository = new PostgresInvoiceRepository(databaseRuntime.db);
  const invoiceQueryRepository = new PostgresInvoiceQueryRepository(
    databaseRuntime.db,
  );
  const adminInvoiceQueryRepository = new PostgresAdminInvoiceQueryRepository(
    databaseRuntime.db,
  );
  const customerInvoiceQueryRepository =
    new PostgresCustomerInvoiceQueryRepository(databaseRuntime.db);
  const manualInvoiceRequestRepository =
    new PostgresManualInvoiceRequestRepository(databaseRuntime.db);
  const customerLinkResolver = new PostgresSalesCustomerLinkRepository(
    databaseRuntime.db,
  );

  const combinedInvoiceRepository = {
    createIssuedInvoiceTransaction:
      invoiceRepository.createIssuedInvoiceTransaction.bind(invoiceRepository),
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

  const invoiceIssuanceService = new InvoiceIssuanceService({
    catalogVariantRepository,
    currencyResolver,
    invoiceRepository: combinedInvoiceRepository,
    referenceNumberService,
  });

  const posSaleService = new PosSaleService({
    customerLinkResolver,
    invoiceIssuanceService,
    invoiceRepository: combinedInvoiceRepository,
    platformEventPublisher: options.platformEventPublisher ?? null,
    referenceNumberService,
    salesEventContextRepository: new PostgresSalesEventContextRepository(
      databaseRuntime.db,
    ),
    salesAttributionService,
  });
  const manualInvoiceRequestService = new ManualInvoiceRequestService({
    catalogVariantRepository,
    currencyResolver,
    customerLinkResolver,
    referenceNumberService,
    repository: manualInvoiceRequestRepository,
  });

  return {
    sales: {
      adminInvoiceQueryRepository,
      customerInvoiceQueryRepository,
      invoiceQueryRepository,
      invoiceRepository,
      manualInvoiceRequestRepository,
      manualInvoiceRequestService,
      posSaleDeliverySourcePort: new PosSaleDeliverySourceAdapter(
        invoiceQueryRepository,
      ),
      posSaleService,
    },
  };
}
