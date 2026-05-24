import type { IssuedDocumentSnapshotResponse } from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type { EmailService } from "../messaging/email.service.js";
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
import { issueSalesDocumentSnapshotForInvoice } from "./sales-issued-document-snapshot-issue.js";

type InvoiceRepository = {
  findByReference(reference: string): Promise<InvoiceWithLines | null>;
};

type SalesIssuedDocumentSnapshotDependencies = {
  emailService: Pick<EmailService, "sendSalesDocumentEmail">;
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

    return this.getOrIssueSnapshotForInvoice({ ...input, invoice });
  }

  async getPdfDownload(input: {
    actorUserSlug?: string;
    actorUserId: string;
    reference: string;
  }): Promise<IssuedSalesDocumentFile> {
    const snapshot = await this.getOrIssueSnapshot(input);
    return toSalesIssuedDocumentPdfFile(snapshot);
  }

  async getPdfDownloadForAuthorizedInvoice(input: {
    actorUserSlug?: string;
    actorUserId: string;
    invoice: InvoiceWithLines;
  }): Promise<IssuedSalesDocumentFile> {
    const snapshot = await this.getOrIssueSnapshotForInvoice(input);
    return toSalesIssuedDocumentPdfFile(snapshot);
  }

  async sendEmail(input: {
    actorUserSlug?: string;
    actorUserId: string;
    reference: string;
  }): Promise<{ ok: true; recipientEmail: string }> {
    const invoice = await this.dependencies.invoiceRepository.findByReference(
      input.reference,
    );
    if (!invoice) throw new InvoiceNotFoundError(input.reference);

    await this.assertCanViewOfficialSalesDocument({
      actorUserId: input.actorUserId,
      invoice,
    });

    const recipientEmail = invoice.customerEmail?.trim() ?? "";
    if (!recipientEmail) {
      throw missingRecipientEmailError();
    }

    const snapshot = await this.getOrIssueSnapshot(input);
    const file = await toSalesIssuedDocumentPdfFile(snapshot);
    const documentLabel = getDocumentEmailLabel(invoice.type);

    await this.dependencies.emailService.sendSalesDocumentEmail({
      attachment: {
        content: file.body,
        contentType: file.contentType,
        filename: file.filename,
      },
      documentLabel,
      documentReference: invoice.reference,
      locationName: snapshot.profileSnapshot.locationName,
      profileEmail: snapshot.profileSnapshot.email,
      recipientName: invoice.customerName,
      to: recipientEmail,
    });

    return { ok: true, recipientEmail };
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

    if (
      input.invoice.type === "manual" &&
      ((await this.hasPermission({
        locationId: input.invoice.locationId,
        permission: "invoices.manual.view",
        userId: input.actorUserId,
      })) ||
        (await this.hasPermission({
          locationId: input.invoice.locationId,
          permission: "invoices.manual.approve",
          userId: input.actorUserId,
        })))
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

  private async getOrIssueSnapshotForInvoice(input: {
    actorUserSlug?: string;
    actorUserId: string;
    invoice: InvoiceWithLines;
  }): Promise<IssuedDocumentSnapshotResponse> {
    return issueSalesDocumentSnapshotForInvoice({
      ...input,
      settingsService: this.dependencies.settingsService,
      snapshotService: this.dependencies.snapshotService,
    });
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

function getDocumentEmailLabel(invoiceType: InvoiceWithLines["type"]): string {
  if (invoiceType === "credit_note") return "Credit Note";
  if (invoiceType === "pos") return "Sales Receipt";
  return "Sales Invoice";
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

function missingRecipientEmailError(): AppError {
  return new AppError({
    code: "validation_error",
    detail:
      "This document cannot be emailed because no buyer email is stored on the invoice.",
    statusCode: 400,
    title: "Buyer email required",
  });
}
