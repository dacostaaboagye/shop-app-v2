import type { ApiDatabase } from "../../infrastructure/database.js";
import type { AuthenticatedActor } from "../auth/access-token-authentication.service.js";
import type { PlatformEventPipelinePublisher } from "../events/platform-event-pipeline.publisher.js";
import type { PlatformEventAppendDatabase } from "../events/postgres-platform-event.repository.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type {
  PostgresSupplyRequestRepository,
  SupplyRequestRow,
} from "./postgres-supply-request.repository.js";
import { createStockSupplyEvent } from "./stock-supply-event-publisher.js";

export type SkuSnapshot = {
  productName: string;
  sku: string;
  variantName: string;
};

export type TransactionalEventPublisher = Pick<
  PlatformEventPipelinePublisher,
  "appendWithinTransaction" | "notifyAppendCommitted"
>;

export type StockSupplyOperationContext = {
  db: ApiDatabase;
  eventPublisher?: TransactionalEventPublisher;
  referenceNumberService: ReferenceNumberService;
  repository: PostgresSupplyRequestRepository;
};

export async function appendStockSupplyEventWithinTransaction(
  context: StockSupplyOperationContext,
  db: PlatformEventAppendDatabase,
  input: {
    actor: AuthenticatedActor;
    payload?: Record<string, string | number | boolean | null>;
    summary: string;
    supplyRequest: SupplyRequestRow;
    type: string;
  },
) {
  if (!context.eventPublisher) {
    return;
  }

  await context.eventPublisher.appendWithinTransaction(
    createStockSupplyEvent(input),
    db,
  );
}

export async function notifyStockSupplyEventsCommitted(
  context: StockSupplyOperationContext,
) {
  await context.eventPublisher?.notifyAppendCommitted();
}
