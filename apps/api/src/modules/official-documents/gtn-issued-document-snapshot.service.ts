import {
  gtnResponseSchema,
  type IssuedDocumentSnapshotResponse,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import type {
  GtnRow,
  SupplyRequestRow,
} from "../stock/postgres-supply-request.repository.js";
import { toGtnResponse } from "../stock/supply-request-route-support.js";
import {
  type IssuedGtnDocumentFile,
  toGtnIssuedDocumentPdfFile,
} from "./gtn-issued-document-pdf.js";
import type { IssuedDocumentSnapshotService } from "./issued-document-snapshot.service.js";
import type { OfficialDocumentSettingsService } from "./official-document-settings.service.js";

type SupplyRequestRepository = {
  findById(id: string): Promise<SupplyRequestRow | null>;
  findGtnByReference(reference: string): Promise<GtnRow | null>;
};

type GtnIssuedDocumentSnapshotDependencies = {
  permissionService: Pick<
    PermissionResolutionService,
    "assertHasPermission" | "resolvePermissionsForAnyScope"
  >;
  settingsService: Pick<
    OfficialDocumentSettingsService,
    "resolveDocumentProfile"
  >;
  snapshotService: Pick<
    IssuedDocumentSnapshotService,
    "findSnapshotByResource" | "issueSnapshot"
  >;
  supplyRequestRepository: SupplyRequestRepository;
};

export class GtnIssuedDocumentSnapshotService {
  constructor(
    private readonly dependencies: GtnIssuedDocumentSnapshotDependencies,
  ) {}

  async getOrIssueSnapshot(input: {
    actorUserId: string;
    reference: string;
  }): Promise<IssuedDocumentSnapshotResponse> {
    const gtn =
      await this.dependencies.supplyRequestRepository.findGtnByReference(
        input.reference,
      );
    if (!gtn) throw gtnNotFoundError(input.reference);

    const supplyRequest =
      await this.dependencies.supplyRequestRepository.findById(
        gtn.supplyRequestId,
      );
    if (!supplyRequest) throw supplyRequestNotFoundError(gtn.supplyRequestId);

    await this.assertCanViewGtn({
      actorUserId: input.actorUserId,
      gtn,
      supplyRequest,
    });

    const existing =
      await this.dependencies.snapshotService.findSnapshotByResource({
        documentType: "goods_transfer_note",
        resourceKind: "goods_transfer_note",
        resourceReference: gtn.reference,
      });
    if (existing) return existing;

    const profile =
      await this.dependencies.settingsService.resolveDocumentProfile({
        locationId: gtn.destinationLocationId,
      });

    return this.dependencies.snapshotService.issueSnapshot({
      documentReference: gtn.reference,
      documentType: "goods_transfer_note",
      issuedAt: gtn.dispatchedAt,
      issuedBy: input.actorUserId,
      locationId: gtn.destinationLocationId,
      payloadSnapshot: gtnResponseSchema.parse(toGtnResponse(gtn)),
      profileSnapshot: profile,
      resourceKind: "goods_transfer_note",
      resourceReference: gtn.reference,
    });
  }

  async getPdfDownload(input: {
    actorUserId: string;
    reference: string;
  }): Promise<IssuedGtnDocumentFile> {
    const snapshot = await this.getOrIssueSnapshot(input);
    return toGtnIssuedDocumentPdfFile(snapshot);
  }

  private async assertCanViewGtn(input: {
    actorUserId: string;
    gtn: GtnRow;
    supplyRequest: SupplyRequestRow;
  }): Promise<void> {
    if (
      input.supplyRequest.requesterId === input.actorUserId &&
      (await this.hasLocationPermission({
        locationId: input.supplyRequest.locationId,
        permission: "stock.supply.request",
        userId: input.actorUserId,
      }))
    ) {
      return;
    }

    if (
      await this.hasLocationPermission({
        locationId: input.gtn.sourceLocationId,
        permission: "stock.supply.manage",
        userId: input.actorUserId,
      })
    ) {
      return;
    }

    if (
      await this.hasLocationPermission({
        locationId: input.gtn.destinationLocationId,
        permission: "stock.supply.manage",
        userId: input.actorUserId,
      })
    ) {
      return;
    }

    if (await this.isAdmin(input.actorUserId)) return;

    throw forbiddenGtnDocumentError();
  }

  private async hasLocationPermission(input: {
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

  private async isAdmin(userId: string): Promise<boolean> {
    const permissions =
      await this.dependencies.permissionService.resolvePermissionsForAnyScope({
        userId,
      });

    return permissions.some(
      (permission) => permission.key === "admin.dashboard.view",
    );
  }
}

function gtnNotFoundError(reference: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Goods Transfer Note ${reference} not found.`,
    statusCode: 404,
    title: "GTN not found",
  });
}

function supplyRequestNotFoundError(supplyRequestId: string): AppError {
  return new AppError({
    code: "not_found",
    detail: `Supply request ${supplyRequestId} not found for this GTN.`,
    statusCode: 404,
    title: "Supply request not found",
  });
}

function forbiddenGtnDocumentError(): AppError {
  return new AppError({
    code: "forbidden",
    detail:
      "You do not have permission to access this goods transfer note document.",
    statusCode: 403,
    title: "Forbidden",
  });
}
