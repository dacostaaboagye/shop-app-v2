import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { IssuedDocumentSnapshotService } from "./issued-document-snapshot.service.js";
import { OfficialDocumentSettingsRepository } from "./official-document-settings.repository.js";
import { OfficialDocumentSettingsService } from "./official-document-settings.service.js";
import { PostgresIssuedDocumentRepository } from "./postgres-issued-document.repository.js";

export function createOfficialDocumentSettingsRuntime(
  databaseRuntime: DatabaseRuntime,
) {
  const settingsRepository = new OfficialDocumentSettingsRepository(
    databaseRuntime.db,
  );
  const issuedDocumentRepository = new PostgresIssuedDocumentRepository(
    databaseRuntime.db,
  );

  return {
    officialDocuments: {
      issuedDocumentSnapshotService: new IssuedDocumentSnapshotService(
        issuedDocumentRepository,
      ),
      settingsService: new OfficialDocumentSettingsService(settingsRepository),
    },
  };
}
