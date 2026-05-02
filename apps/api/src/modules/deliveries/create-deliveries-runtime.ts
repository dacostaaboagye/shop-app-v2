import type {
  DeliveryAgentEligibilityPort,
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { DeliveryAgentEligibilityStubAdapter } from "./delivery-agent-eligibility-stub.adapter.js";
import { DeliveryCreationCompose } from "./delivery-creation.compose.js";
import type { DeliveryCreationService } from "./delivery-creation.contracts.js";
import { DeliveryCreationServiceImpl } from "./delivery-creation.service.js";
import type { DeliveryQueryService } from "./delivery-query.contracts.js";
import { DeliveryStatusCompose } from "./delivery-status.compose.js";
import type { DeliveryStatusService } from "./delivery-status.contracts.js";
import { DeliveryStatusServiceImpl } from "./delivery-status.service.js";
import { OnlineOrderDeliverySourceStubAdapter } from "./online-order-delivery-source-stub.adapter.js";
import { PosSaleDeliverySourceStubAdapter } from "./pos-sale-delivery-source-stub.adapter.js";
import { PostgresDeliveryQueryRepository } from "./postgres-delivery-query.repository.js";
import { PostgresDeliveryStatusWriteRepository } from "./postgres-delivery-status-write.repository.js";
import { TransferDeliverySourceStubAdapter } from "./transfer-delivery-source-stub.adapter.js";

type DeliveriesRuntime = {
  deliveries: {
    deliveryCreationService: DeliveryCreationService;
    deliveryStatusService: DeliveryStatusService;
    deliveryQueryService: DeliveryQueryService;
  };
};

type DeliveriesRuntimeOptions = {
  posSaleSourcePort?: PosSaleDeliverySourcePort;
  onlineOrderSourcePort?: OnlineOrderDeliverySourcePort;
  transferSourcePort?: TransferDeliverySourcePort;
  agentEligibilityPort?: DeliveryAgentEligibilityPort;
  platformEventPublisher?: Pick<PlatformEventPublisher, "publish">;
  logger?: { warn: (message: string, meta?: Record<string, unknown>) => void };
};

export function createDeliveriesRuntime(
  databaseRuntime: DatabaseRuntime,
  options: DeliveriesRuntimeOptions = {},
): DeliveriesRuntime {
  const posSaleSourcePort =
    options.posSaleSourcePort ?? new PosSaleDeliverySourceStubAdapter();
  const onlineOrderSourcePort =
    options.onlineOrderSourcePort ?? new OnlineOrderDeliverySourceStubAdapter();
  const transferSourcePort =
    options.transferSourcePort ?? new TransferDeliverySourceStubAdapter();

  if (
    process.env.NODE_ENV === "production" &&
    options.logger &&
    (!options.posSaleSourcePort ||
      !options.onlineOrderSourcePort ||
      !options.transferSourcePort)
  ) {
    options.logger.warn(
      "deliveries runtime is using stub source adapters in production",
      {
        posSale: !options.posSaleSourcePort,
        onlineOrder: !options.onlineOrderSourcePort,
        transfer: !options.transferSourcePort,
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
    },
  };
}
