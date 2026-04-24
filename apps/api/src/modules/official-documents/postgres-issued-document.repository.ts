import type { OfficialDocumentType } from "@shop/contracts";
import { issuedDocuments } from "@shop/database";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { PersistedIssuedDocumentSnapshot } from "./issued-document-snapshot.service.js";

export class PostgresIssuedDocumentRepository {
  constructor(private readonly db: ApiDatabase) {}

  async findByResource(input: {
    documentType: OfficialDocumentType;
    resourceKind: string;
    resourceReference: string;
  }): Promise<PersistedIssuedDocumentSnapshot | null> {
    const row = await this.db.query.issuedDocuments.findFirst({
      where: (table, { and, eq }) =>
        and(
          eq(table.documentType, input.documentType),
          eq(table.resourceKind, input.resourceKind),
          eq(table.resourceReference, input.resourceReference),
        ),
    });

    return row ? toSnapshot(row) : null;
  }

  async create(
    input: PersistedIssuedDocumentSnapshot,
  ): Promise<PersistedIssuedDocumentSnapshot> {
    const rows = await this.db
      .insert(issuedDocuments)
      .values({
        contentHash: input.contentHash,
        documentReference: input.documentReference,
        documentType: input.documentType,
        issuedAt: input.issuedAt,
        issuedBy: input.issuedBy,
        locationId: input.locationId,
        payloadSnapshot: input.payloadSnapshot,
        profileSnapshot: input.profileSnapshot,
        resourceKind: input.resourceKind,
        resourceReference: input.resourceReference,
        schemaVersion: input.schemaVersion,
      })
      .returning();

    const row = rows[0];
    if (!row) throw new Error("Failed to insert issued document snapshot.");

    return toSnapshot(row);
  }
}

function toSnapshot(
  row: typeof issuedDocuments.$inferSelect,
): PersistedIssuedDocumentSnapshot {
  return {
    contentHash: row.contentHash,
    documentReference: row.documentReference,
    documentType: row.documentType,
    issuedAt: row.issuedAt,
    issuedBy: row.issuedBy,
    locationId: row.locationId,
    payloadSnapshot: row.payloadSnapshot,
    profileSnapshot: row.profileSnapshot,
    resourceKind: row.resourceKind,
    resourceReference: row.resourceReference,
    schemaVersion: row.schemaVersion,
  };
}
