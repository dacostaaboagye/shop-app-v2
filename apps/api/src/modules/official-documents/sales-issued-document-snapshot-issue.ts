import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import type { InvoiceWithLines } from "../sales/sales.contracts.js";
import type { IssuedDocumentSnapshotService } from "./issued-document-snapshot.service.js";
import type { OfficialDocumentSettingsService } from "./official-document-settings.service.js";
import {
  getSalesDocumentType,
  toSalesDocumentPayloadSnapshot,
} from "./sales-issued-document-snapshot.support.js";

export async function issueSalesDocumentSnapshotForInvoice(input: {
  actorUserSlug?: string;
  actorUserId: string;
  invoice: InvoiceWithLines;
  settingsService: Pick<
    OfficialDocumentSettingsService,
    "resolveDocumentProfile"
  >;
  snapshotService: Pick<
    IssuedDocumentSnapshotService,
    "findSnapshotByResource" | "issueSnapshot"
  >;
}): Promise<IssuedDocumentSnapshotResponse> {
  const documentType = getSalesDocumentType(input.invoice.type);
  const existing = await input.snapshotService.findSnapshotByResource({
    documentType,
    resourceKind: "invoice",
    resourceReference: input.invoice.reference,
  });
  if (existing) return existing;

  const profile = await input.settingsService.resolveDocumentProfile({
    locationId: input.invoice.locationId,
  });
  const profileSnapshot = {
    ...profile,
    currencyCode: input.invoice.currencyCode,
    currencyScale: input.invoice.currencyScale,
  };

  return input.snapshotService.issueSnapshot({
    ...(input.actorUserSlug ? { actorUserSlug: input.actorUserSlug } : {}),
    documentReference: input.invoice.reference,
    documentType,
    issuedAt: input.invoice.confirmedAt ?? input.invoice.createdAt,
    issuedBy: input.actorUserId,
    locationId: input.invoice.locationId,
    payloadSnapshot: toSalesDocumentPayloadSnapshot(input.invoice),
    profileSnapshot,
    resourceKind: "invoice",
    resourceReference: input.invoice.reference,
  });
}
