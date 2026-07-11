import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";
import { getTableName } from "drizzle-orm";
import {
  customerAddresses,
  customerAddressTypeEnum,
  customerContactStatusEnum,
  customerContacts,
  customerEvents,
  customerEventTypeEnum,
  customerStatusEnum,
  customers,
  customerTypeEnum,
} from "./index.js";

assert.equal(getTableName(customers), "customers");
assert.equal(getTableName(customerContacts), "customer_contacts");
assert.equal(getTableName(customerAddresses), "customer_addresses");
assert.equal(getTableName(customerEvents), "customer_events");

assert.deepEqual(customerTypeEnum.enumValues, ["individual", "business"]);
assert.deepEqual(customerStatusEnum.enumValues, [
  "active",
  "inactive",
  "blocked",
]);
assert.deepEqual(customerContactStatusEnum.enumValues, ["active", "inactive"]);
assert.deepEqual(customerAddressTypeEnum.enumValues, [
  "billing",
  "shipping",
  "both",
]);
assert.deepEqual(customerEventTypeEnum.enumValues, [
  "customer_created",
  "customer_updated",
  "contact_added",
  "address_added",
  "note_added",
  "portal_linked",
  "portal_unlinked",
]);

assert.equal(customers.reference.name, "reference");
assert.equal(customers.displayName.name, "display_name");
assert.equal(customerContacts.customerId.name, "customer_id");
assert.equal(customerContacts.receivesInvoices.name, "receives_invoices");
assert.equal(customerAddresses.addressLines.name, "address_lines");
assert.equal(customerEvents.eventType.name, "event_type");

const migrationSql = readAllMigrationSql();
assert.match(migrationSql, /customer_type/);
assert.match(migrationSql, /customers_reference_idx/);
assert.match(migrationSql, /customer_contacts_primary_unique/);
assert.match(migrationSql, /customer_addresses_default_billing_unique/);
assert.match(migrationSql, /customer_events_customer_idx/);

console.log("customer schema assertions passed");

function readAllMigrationSql(): string {
  const drizzleDirectory = resolve(process.cwd(), "drizzle");
  return readdirSync(drizzleDirectory)
    .filter((entry) => extname(entry) === ".sql")
    .map((entry) => readFileSync(resolve(drizzleDirectory, entry), "utf8"))
    .join("\n");
}
