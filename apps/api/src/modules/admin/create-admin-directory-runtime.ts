import type { DatabaseRuntime } from "../../infrastructure/database.js";
import { PostgresSlugRepository } from "../public-identifiers/postgres-slug.repository.js";
import { SlugService } from "../public-identifiers/slug.service.js";
import { AdminAccessQueryService } from "./admin-access-query.service.js";
import { AdminAccessWriteService } from "./admin-access-write.service.js";
import { AdminLocationQueryService } from "./admin-location-query.service.js";
import { AdminLocationWriteService } from "./admin-location-write.service.js";
import { AdminUserAccessQueryService } from "./admin-user-access-query.service.js";
import { AdminUserAccessWriteService } from "./admin-user-access-write.service.js";
import { AdminUserQueryService } from "./admin-user-query.service.js";
import { PostgresAdminAccessQueryRepository } from "./postgres-admin-access-query.repository.js";
import { PostgresAdminAccessWriteRepository } from "./postgres-admin-access-write.repository.js";
import { PostgresAdminLocationQueryRepository } from "./postgres-admin-location-query.repository.js";
import { PostgresAdminLocationWriteRepository } from "./postgres-admin-location-write.repository.js";
import { PostgresAdminUserAccessQueryRepository } from "./postgres-admin-user-access-query.repository.js";
import { PostgresAdminUserAccessWriteRepository } from "./postgres-admin-user-access-write.repository.js";
import { PostgresAdminUserQueryRepository } from "./postgres-admin-user-query.repository.js";

type AdminDirectoryRuntime = {
  adminDirectory: {
    adminAccessQueryService: AdminAccessQueryService;
    adminAccessWriteService: AdminAccessWriteService;
    adminLocationQueryService: AdminLocationQueryService;
    adminLocationWriteService: AdminLocationWriteService;
    adminUserAccessQueryService: AdminUserAccessQueryService;
    adminUserAccessWriteService: AdminUserAccessWriteService;
    adminUserQueryService: AdminUserQueryService;
  };
};

export function createAdminDirectoryRuntime(
  databaseRuntime: DatabaseRuntime,
): AdminDirectoryRuntime {
  const slugService = new SlugService(
    new PostgresSlugRepository(databaseRuntime.db),
  );
  const accessQueryRepository = new PostgresAdminAccessQueryRepository(
    databaseRuntime.db,
  );

  return {
    adminDirectory: {
      adminAccessQueryService: new AdminAccessQueryService(
        accessQueryRepository,
      ),
      adminAccessWriteService: new AdminAccessWriteService(
        new PostgresAdminAccessWriteRepository(
          databaseRuntime.db,
          slugService,
          accessQueryRepository,
        ),
      ),
      adminLocationQueryService: new AdminLocationQueryService(
        new PostgresAdminLocationQueryRepository(databaseRuntime.db),
      ),
      adminLocationWriteService: new AdminLocationWriteService(
        new PostgresAdminLocationWriteRepository(
          databaseRuntime.db,
          slugService,
        ),
      ),
      adminUserAccessQueryService: new AdminUserAccessQueryService(
        new PostgresAdminUserAccessQueryRepository(databaseRuntime.db),
      ),
      adminUserAccessWriteService: new AdminUserAccessWriteService(
        new PostgresAdminUserAccessWriteRepository(databaseRuntime.db),
      ),
      adminUserQueryService: new AdminUserQueryService(
        new PostgresAdminUserQueryRepository(databaseRuntime.db),
      ),
    },
  };
}
