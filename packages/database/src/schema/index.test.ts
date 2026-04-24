import assert from "node:assert/strict";
import { getTableName } from "drizzle-orm";
import { permissions, stockOwnershipEvents, users } from "./index.js";

assert.equal(getTableName(users), "users");
assert.equal(getTableName(permissions), "permissions");
assert.equal(getTableName(stockOwnershipEvents), "stock_ownership_events");

console.log("database schema foundation assertions passed");
