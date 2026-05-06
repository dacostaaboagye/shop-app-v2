import type { ApiEnv } from "../../env.js";
import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import { createConfiguredEmailService } from "../messaging/create-email-runtime.js";
import type { EmailService } from "../messaging/email.service.js";
import { PostgresReferenceNumberRepository } from "../public-identifiers/postgres-reference-number.repository.js";
import { PostgresSlugRepository } from "../public-identifiers/postgres-slug.repository.js";
import { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import { SlugService } from "../public-identifiers/slug.service.js";
import { AdminAccessQueryService } from "./admin-access-query.service.js";
import { AdminAccessWriteService } from "./admin-access-write.service.js";
import { AdminLocationQueryService } from "./admin-location-query.service.js";
import { AdminLocationWriteService } from "./admin-location-write.service.js";
import { AdminStaffProvisioningService } from "./admin-staff-provisioning.service.js";
import { AdminSupplierQueryService } from "./admin-supplier-query.service.js";
import { AdminSupplierWriteService } from "./admin-supplier-write.service.js";
import { AdminUserAccessQueryService } from "./admin-user-access-query.service.js";
import { AdminUserAccessWriteService } from "./admin-user-access-write.service.js";
import { AdminUserQueryService } from "./admin-user-query.service.js";
import { PostgresAdminAccessQueryRepository } from "./postgres-admin-access-query.repository.js";
import { PostgresAdminAccessWriteRepository } from "./postgres-admin-access-write.repository.js";
import { PostgresAdminLocationQueryRepository } from "./postgres-admin-location-query.repository.js";
import { PostgresAdminLocationWriteRepository } from "./postgres-admin-location-write.repository.js";
import { PostgresAdminStaffProvisioningRepository } from "./postgres-admin-staff-provisioning.repository.js";
import { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import { PostgresAdminSupplierWriteRepository } from "./postgres-admin-supplier-write.repository.js";
import { PostgresAdminUserAccessQueryRepository } from "./postgres-admin-user-access-query.repository.js";
import { PostgresAdminUserAccessWriteRepository } from "./postgres-admin-user-access-write.repository.js";
import { PostgresAdminUserQueryRepository } from "./postgres-admin-user-query.repository.js";

type AdminDirectoryRuntime = {
  adminDirectory: {
    adminAccessQueryService: AdminAccessQueryService;
    adminAccessWriteService: AdminAccessWriteService;
    adminStaffProvisioningService: AdminStaffProvisioningService;
    adminLocationQueryService: AdminLocationQueryService;
    adminLocationWriteService: AdminLocationWriteService;
    adminSupplierQueryService: AdminSupplierQueryService;
    adminSupplierWriteService: AdminSupplierWriteService;
    adminUserAccessQueryService: AdminUserAccessQueryService;
    adminUserAccessWriteService: AdminUserAccessWriteService;
    adminUserQueryService: AdminUserQueryService;
  };
};

export function createAdminDirectoryRuntime(
  databaseRuntime: DatabaseRuntime,
  options: {
    emailService?: EmailService | null;
    env?: Pick<
      ApiEnv,
      "emailFromAddress" | "nodeEnv" | "resendApiKey" | "webBaseUrl"
    >;
    platformEventPublisher?: PlatformEventPublisher;
    webBaseUrl?: string;
  } = {},
): AdminDirectoryRuntime {
  const slugService = new SlugService(
    new PostgresSlugRepository(databaseRuntime.db),
  );
  const referenceNumberService = new ReferenceNumberService(
    new PostgresReferenceNumberRepository(databaseRuntime.db),
  );
  const accessQueryRepository = new PostgresAdminAccessQueryRepository(
    databaseRuntime.db,
  );
  const emailService =
    options.emailService ??
    (options.env
      ? createConfiguredEmailService(databaseRuntime, options.env)
      : null);

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
        options.platformEventPublisher ?? null,
      ),
      adminStaffProvisioningService: new AdminStaffProvisioningService(
        new PostgresAdminStaffProvisioningRepository(databaseRuntime.db),
        slugService,
        options.platformEventPublisher ?? null,
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
      adminSupplierQueryService: new AdminSupplierQueryService(
        new PostgresAdminSupplierQueryRepository(databaseRuntime.db),
      ),
      adminSupplierWriteService: new AdminSupplierWriteService(
        new PostgresAdminSupplierWriteRepository(
          databaseRuntime.db,
          slugService,
          emailService,
          options.webBaseUrl ??
            options.env?.webBaseUrl ??
            "http://localhost:3000",
        ),
        referenceNumberService,
        options.platformEventPublisher ?? null,
      ),
      adminUserAccessQueryService: new AdminUserAccessQueryService(
        new PostgresAdminUserAccessQueryRepository(databaseRuntime.db),
      ),
      adminUserAccessWriteService: new AdminUserAccessWriteService(
        new PostgresAdminUserAccessWriteRepository(databaseRuntime.db),
        options.platformEventPublisher ?? null,
      ),
      adminUserQueryService: new AdminUserQueryService(
        new PostgresAdminUserQueryRepository(databaseRuntime.db),
      ),
    },
  };
}
