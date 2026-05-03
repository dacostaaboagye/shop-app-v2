import type {
  DeliveryAgentEligibilityPort,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { DeliveryAgentEligibilityStubAdapter } from "./delivery-agent-eligibility-stub.adapter.js";
import { DeliveryCreationCompose } from "./delivery-creation.compose.js";
import type {
  DeliveryCreationService,
  DeliveryCreationStockSideEffectsPort,
} from "./delivery-creation.contracts.js";
import { DeliveryCreationServiceImpl } from "./delivery-creation.service.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { DeliveryStatusCompose } from "./delivery-status.compose.js";
import type { DeliveryStatusService } from "./delivery-status.contracts.js";
import { DeliveryStatusServiceImpl } from "./delivery-status.service.js";
import type { DeliveryStatusEventPublisher } from "./delivery-status-event-publisher.js";
import { OnlineOrderDeliverySourceStubAdapter } from "./online-order-delivery-source-stub.adapter.js";
import { PostgresDeliveryQueryRepository } from "./postgres-delivery-query.repository.js";
import { PostgresDeliveryStatusWriteRepository } from "./postgres-delivery-status-write.repository.js";

type DeliveriesRuntime = {
  deliveries: {
    deliveryCreationService: DeliveryCreationService;
    deliveryStatusService: DeliveryStatusService;
    deliveryQueryService: DeliveryQueryService;
    onlineOrderSourcePort: OnlineOrderDeliverySourcePort;
    posSaleSourcePort: PosSaleDeliverySourcePort;
    transferSourcePort: TransferDeliverySourcePort;
  };
};

type DeliveriesRuntimeOptions = {
  posSaleSourcePort: PosSaleDeliverySourcePort;
  onlineOrderSourcePort?: OnlineOrderDeliverySourcePort;
  transferSourcePort: TransferDeliverySourcePort;
  stockSideEffectsPort: DeliveryCreationStockSideEffectsPort;
  agentEligibilityPort?: DeliveryAgentEligibilityPort;
  platformEventPublisher?: DeliveryStatusEventPublisher;
  logger?: {
    error?: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
  };
};

export function createDeliveriesRuntime(
  databaseRuntime: DatabaseRuntime,
  options: DeliveriesRuntimeOptions,
): DeliveriesRuntime {
  const posSaleSourcePort = options.posSaleSourcePort;
  const onlineOrderSourcePort =
    options.onlineOrderSourcePort ?? new OnlineOrderDeliverySourceStubAdapter();
  const transferSourcePort = options.transferSourcePort;

  if (
    process.env.NODE_ENV === "production" &&
    options.logger &&
    !options.onlineOrderSourcePort
  ) {
    options.logger.warn(
      "deliveries runtime is using the online order stub source adapter in production",
      {
        onlineOrder: true,
      },
    );
  }

  const referenceNumberService = new ReferenceNumberService(
    new PostgresReferenceNumberRepository(databaseRuntime.db),
  );

  const compose = new DeliveryCreationCompose({
    db: databaseRuntime.db,
    posSaleSourcePort,
    onlineOrderSourcePort,
    transferSourcePort,
    stockSideEffectsPort: options.stockSideEffectsPort,
    referenceNumberService,
  });

  const deliveryCreationService = new DeliveryCreationServiceImpl(compose);

  const statusRepository = new PostgresDeliveryStatusWriteRepository(
    databaseRuntime.db,
  );
  const agentEligibilityPort =
    options.agentEligibilityPort ?? new DeliveryAgentEligibilityStubAdapter();
  const statusCompose = new DeliveryStatusCompose({
    repository: statusRepository,
    agentEligibilityPort,
    ...(options.platformEventPublisher
      ? { platformEventPublisher: options.platformEventPublisher }
      : {}),
    ...(options.logger?.error
      ? { logger: { error: options.logger.error } }
      : {}),
  });
  const deliveryStatusService = new DeliveryStatusServiceImpl(statusCompose);

  const deliveryQueryService = new PostgresDeliveryQueryRepository(
    databaseRuntime.db,
  );

  return {
    deliveries: {
      deliveryCreationService,
      deliveryStatusService,
      deliveryQueryService,
      onlineOrderSourcePort,
      posSaleSourcePort,
      transferSourcePort,
    },
  };
}
