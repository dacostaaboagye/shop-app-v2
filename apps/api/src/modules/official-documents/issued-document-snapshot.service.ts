import { createHash } from "node:crypto";
import type {
  IssuedDocumentSnapshotResponse,
  OfficialDocumentProfileResponse,
  OfficialDocumentType,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";

export type IssueDocumentSnapshotInput = {
  documentReference: string;
  documentType: OfficialDocumentType;
  issuedAt: Date;
  issuedBy: string | null;
  locationId: string | null;
  payloadSnapshot: Record<string, unknown>;
  profileSnapshot: OfficialDocumentProfileResponse;
  resourceKind: string;
  resourceReference: string;
};

export type PersistedIssuedDocumentSnapshot = Omit<
  IssuedDocumentSnapshotResponse,
  "issuedAt"
> & {
  issuedAt: Date;
  issuedBy: string | null;
};

type IssuedDocumentSnapshotRepository = {
  create(input: PersistedIssuedDocumentSnapshot): Promise<PersistedIssuedDocumentSnapshot>;
  findByResource(input: {
    documentType: OfficialDocumentType;
    resourceKind: string;
    resourceReference: string;
  }): Promise<PersistedIssuedDocumentSnapshot | null>;
};

const SCHEMA_VERSION = "official-document-v1";

export class IssuedDocumentSnapshotService {
  constructor(private readonly repository: IssuedDocumentSnapshotRepository) {}

  async issueSnapshot(
    input: IssueDocumentSnapshotInput,
  ): Promise<IssuedDocumentSnapshotResponse> {
    const contentHash = createContentHash({
      documentReference: input.documentReference,
      documentType: input.documentType,
      payloadSnapshot: input.payloadSnapshot,
      profileSnapshot: input.profileSnapshot,
      resourceKind: input.resourceKind,
      resourceReference: input.resourceReference,
      schemaVersion: SCHEMA_VERSION,
    });

    const existing = await this.repository.findByResource({
      documentType: input.documentType,
      resourceKind: input.resourceKind,
      resourceReference: input.resourceReference,
    });

    if (existing) {
      if (existing.contentHash !== contentHash) throw snapshotConflictError();
      return toResponse(existing);
    }

    const created = await this.repository.create({
      contentHash,
      documentReference: input.documentReference,
      documentType: input.documentType,
      issuedAt: input.issuedAt,
      issuedBy: input.issuedBy,
      locationId: input.locationId,
      payloadSnapshot: input.payloadSnapshot,
      profileSnapshot: input.profileSnapshot,
      resourceKind: input.resourceKind,
      resourceReference: input.resourceReference,
      schemaVersion: SCHEMA_VERSION,
    });

    return toResponse(created);
  }
}

function toResponse(
  snapshot: PersistedIssuedDocumentSnapshot,
): IssuedDocumentSnapshotResponse {
  return {
    contentHash: snapshot.contentHash,
    documentReference: snapshot.documentReference,
    documentType: snapshot.documentType,
    issuedAt: snapshot.issuedAt.toISOString(),
    locationId: snapshot.locationId,
    payloadSnapshot: snapshot.payloadSnapshot,
    profileSnapshot: snapshot.profileSnapshot,
    resourceKind: snapshot.resourceKind,
    resourceReference: snapshot.resourceReference,
    schemaVersion: snapshot.schemaVersion,
  };
}

function createContentHash(input: Record<string, unknown>) {
  return `sha256:${createHash("sha256").update(stableStringify(input)).digest("hex")}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function snapshotConflictError() {
  return new AppError({
    code: "conflict",
    detail:
      "An issued document snapshot already exists for this resource with different content.",
    statusCode: 409,
    title: "Issued document already exists",
  });
}
