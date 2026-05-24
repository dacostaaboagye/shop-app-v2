import { customerEvents, customers } from "@shop/database";
import { eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

type CustomerEventType =
  | "address_added"
  | "contact_added"
  | "customer_created"
  | "customer_updated"
  | "portal_linked"
  | "portal_unlinked";

export function normalizeCurrency(value: string | null | undefined) {
  return value ? value.trim().toUpperCase() : null;
}

export async function findCustomer(db: ApiDatabase, slug: string) {
  const [customer] = await db
    .select({ displayName: customers.displayName, id: customers.id })
    .from(customers)
    .where(eq(customers.slug, slug))
    .limit(1);
  return customer ?? null;
}

export async function insertCustomerEvent(
  tx: ApiDatabase,
  input: {
    actorId: string;
    customerId: string;
    eventType: CustomerEventType;
    now: Date;
    summary: string;
  },
) {
  await tx.insert(customerEvents).values({
    actorId: input.actorId,
    customerId: input.customerId,
    eventType: input.eventType,
    occurredAt: input.now,
    summary: input.summary,
  });
}
