import assert from "node:assert/strict";
import { getTableName } from "drizzle-orm";
import {
  stockTransferEvents,
  stockTransferEventTypeEnum,
  stockTransferStatusEnum,
  stockTransfers,
} from "./index.js";

assert.equal(getTableName(stockTransfers), "stock_transfers");
assert.equal(getTableName(stockTransferEvents), "stock_transfer_events");
assert.deepEqual(stockTransferStatusEnum.enumValues, [
  "requested",
  "approved",
  "in_transit",
  "received",
  "rejected",
  "cancelled",
]);
assert.deepEqual(stockTransferEventTypeEnum.enumValues, [
  "requested",
  "approved",
  "dispatched",
  "received",
  "rejected",
  "cancelled",
]);
assert.equal(stockTransfers.supplyRequestId.name, "supply_request_id");
assert.equal(stockTransferEvents.transferId.name, "transfer_id");

console.log("database stock transfer schema assertions passed");
