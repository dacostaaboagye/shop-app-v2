import { APPLICATION_BRAND_MEDIA_ENTITY } from "@shop/contracts";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { getPrimaryImageUrl } from "../catalog/catalog-primary-image.loader.js";
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
      settingsService: new OfficialDocumentSettingsService(settingsRepository, {
        getLogoImageUrl: () =>
          getPrimaryImageUrl(
            databaseRuntime.db,
            APPLICATION_BRAND_MEDIA_ENTITY.entityType,
            APPLICATION_BRAND_MEDIA_ENTITY.entitySlug,
          ),
      }),
    },
  };
}
