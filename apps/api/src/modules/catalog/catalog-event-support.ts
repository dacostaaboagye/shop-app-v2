import { randomUUID } from "node:crypto";
import type { PlatformEventRecord } from "../events/platform-event.types.js";

type CatalogActor = {
  userSlug: string;
};
export type { CatalogActor };

export function createCatalogEvent(input: {
  actor: CatalogActor;
  occurredAt: Date;
  payload: Record<string, string | number | boolean | null>;
  reference: string;
  resourceKind: string;
  summary: string;
  type: string;
}): PlatformEventRecord {
  return {
    actor: { userSlug: input.actor.userSlug },
    audience: [
      { kind: "permission", permission: "catalog.view" },
      { kind: "permission", permission: "admin.dashboard.view" },
    ],
    id: randomUUID(),
    occurredAt: input.occurredAt.toISOString(),
    payload: input.payload,
    resource: {
      kind: input.resourceKind,
      reference: input.reference,
    },
    summary: input.summary,
    type: input.type,
  };
}

export function formatParentSummary(
  parentCategorySlug: string | null | undefined,
) {
  return parentCategorySlug ? ` under ${parentCategorySlug}` : "";
}

export function formatCatalogPathSummary(product: {
  brandSlug?: string | null | undefined;
  categorySlug?: string | null | undefined;
}) {
  const segments = [product.categorySlug, product.brandSlug].filter(Boolean);
  return segments.length > 0 ? ` in ${segments.join(" / ")}` : "";
}
