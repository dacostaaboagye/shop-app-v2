import type { RouteDefinition } from "../_core/route-contract.js";

export const createFromPosSaleRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.create_from_sale",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/from-sale",
};

export const createFromOnlineOrderRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.create_from_online_order",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/from-online-order",
};

export const createFromTransferRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.create_from_transfer",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/from-transfer",
};

export const assignDeliveryRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.assign",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/:deliveryId/assign",
};

export const reassignDeliveryRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.reassign",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/:deliveryId/reassign",
};

export const dispatchDeliveryRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.dispatch",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/:deliveryId/dispatch",
};

export const completeDeliveryRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.complete",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/:deliveryId/complete",
};

export const cancelDeliveryRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.cancel",
    scope: "any_active",
  },
  method: "POST",
  url: "/api/deliveries/:deliveryId/cancel",
};

export const findDeliveryRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.view",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/deliveries/:deliveryId",
};

export const listDeliveriesRoute: RouteDefinition = {
  access: {
    kind: "permission",
    permission: "deliveries.view",
    scope: "any_active",
  },
  method: "GET",
  url: "/api/deliveries",
};
