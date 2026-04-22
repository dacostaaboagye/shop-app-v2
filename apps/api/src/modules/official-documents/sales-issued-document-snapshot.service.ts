import {
  type IssuedDocumentSnapshotResponse,
  invoiceResponseSchema,
  type OfficialDocumentType,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { toInvoiceResponse } from "../sales/invoice-response.mapper.js";
import {
  InvoiceNotFoundError,
  type InvoiceWithLines,
} from "../sales/sales.contracts.js";
import type { IssuedDocumentSnapshotService } from "./issued-document-snapshot.service.js";
import type { OfficialDocumentSettingsService } from "./official-document-settings.service.js";
import {
  type IssuedSalesDocumentFile,
  toSalesIssuedDocumentPdfFile,
} from "./sales-issued-document-pdf.js";

type InvoiceRepository = {
  findByReference(reference: string): Promise<InvoiceWithLines | null>;
};

type SalesIssuedDocumentSnapshotDependencies = {
  invoiceRepository: InvoiceRepository;
  permissionService: Pick<PermissionResolutionService, "assertHasPermission">;
  settingsService: Pick<
    OfficialDocumentSettingsService,
    "resolveDocumentProfile"
  >;
  snapshotService: Pick<
    IssuedDocumentSnapshotService,
    "findSnapshotByResource" | "issueSnapshot"
  >;
};

export class SalesIssuedDocumentSnapshotService {
  constructor(
    private readonly dependencies: SalesIssuedDocumentSnapshotDependencies,
  ) {}

  async getOrIssueSnapshot(input: {
    actorUserSlug?: string;
    actorUserId: string;
    reference: string;
  }): Promise<IssuedDocumentSnapshotResponse> {
    const invoice = await this.dependencies.invoiceRepository.findByReference(
      input.reference,
    );
    if (!invoice) throw new InvoiceNotFoundError(input.reference);

    await this.assertCanViewOfficialSalesDocument({
      actorUserId: input.actorUserId,
      invoice,
    });

    const documentType = getDocumentType(invoice.type);
    const existing =
      await this.dependencies.snapshotService.findSnapshotByResource({
        documentType,
        resourceKind: "invoice",
        resourceReference: invoice.reference,
      });
    if (existing) return existing;

    const profile =
      await this.dependencies.settingsService.resolveDocumentProfile({
        locationId: invoice.locationId,
      });

    return this.dependencies.snapshotService.issueSnapshot({
      ...(input.actorUserSlug ? { actorUserSlug: input.actorUserSlug } : {}),
      documentReference: invoice.reference,
      documentType,
      issuedAt: invoice.confirmedAt ?? invoice.createdAt,
      issuedBy: input.actorUserId,
      locationId: invoice.locationId,
      payloadSnapshot: toPayloadSnapshot(invoice),
      profileSnapshot: profile,
      resourceKind: "invoice",
      resourceReference: invoice.reference,
    });
  }

  async getPdfDownload(input: {
    actorUserSlug?: string;
    actorUserId: string;
    reference: string;
  }): Promise<IssuedSalesDocumentFile> {
    const snapshot = await this.getOrIssueSnapshot(input);
    return toSalesIssuedDocumentPdfFile(snapshot);
  }

  private async assertCanViewOfficialSalesDocument(input: {
    actorUserId: string;
    invoice: InvoiceWithLines;
  }): Promise<void> {
    if (
      await this.hasPermission({
        locationId: input.invoice.locationId,
        permission: "pos.sales.manage",
        userId: input.actorUserId,
      })
    ) {
      return;
    }

    if (!isActorSalesOwner(input)) throw forbiddenOfficialDocumentError();

    if (
      await this.hasPermission({
        locationId: input.invoice.locationId,
        permission: "pos.sales.view",
        userId: input.actorUserId,
      })
    ) {
      return;
    }

    throw forbiddenOfficialDocumentError();
  }

  private async hasPermission(input: {
    locationId: string;
    permission: string;
    userId: string;
  }): Promise<boolean> {
    try {
      await this.dependencies.permissionService.assertHasPermission({
        locationId: input.locationId,
        permission: input.permission,
        user: { userId: input.userId },
      });
      return true;
    } catch (error) {
      if (error instanceof AppError && error.statusCode === 403) return false;
      throw error;
    }
  }
}

function toPayloadSnapshot(invoice: InvoiceWithLines): Record<string, unknown> {
  return invoiceResponseSchema.parse(toInvoiceResponse(invoice));
}

function getDocumentType(
  invoiceType: InvoiceWithLines["type"],
): OfficialDocumentType {
  if (invoiceType === "credit_note") return "credit_note";
  if (invoiceType === "pos") return "sales_receipt";
  return "sales_invoice";
}

function isActorSalesOwner(input: {
  actorUserId: string;
  invoice: InvoiceWithLines;
}): boolean {
  return (
    input.invoice.attributedWorkerId === input.actorUserId ||
    input.invoice.createdBy === input.actorUserId
  );
}

function forbiddenOfficialDocumentError(): AppError {
  return new AppError({
    code: "forbidden",
    detail:
      "You do not have permission to access this official sales document.",
    statusCode: 403,
    title: "Forbidden",
  });
}
