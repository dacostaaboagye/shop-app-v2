import type {
  OnlineOrderDeliverySourcePort,
  PosSaleDeliverySourcePort,
  TransferDeliverySourcePort,
} from "@shop/contracts";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { DeliveryCreationCompose } from "./delivery-creation.compose.js";
import type { DeliveryCreationService } from "./delivery-creation.contracts.js";
import { DeliveryCreationServiceImpl } from "./delivery-creation.service.js";
import { OnlineOrderDeliverySourceStubAdapter } from "./online-order-delivery-source-stub.adapter.js";
import { PosSaleDeliverySourceStubAdapter } from "./pos-sale-delivery-source-stub.adapter.js";
import { TransferDeliverySourceStubAdapter } from "./transfer-delivery-source-stub.adapter.js";

type DeliveriesRuntime = {
  deliveries: {
    deliveryCreationService: DeliveryCreationService;
  };
};

type DeliveriesRuntimeOptions = {
  posSaleSourcePort?: PosSaleDeliverySourcePort;
  onlineOrderSourcePort?: OnlineOrderDeliverySourcePort;
  transferSourcePort?: TransferDeliverySourcePort;
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

  return {
    deliveries: {
      deliveryCreationService,
    },
  };
}
