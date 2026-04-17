import type { DatabaseRuntime } from "../../infrastructure/database.js";
import type { R2StorageService } from "../../infrastructure/r2-storage.js";
import { PermissionResolutionService } from "../access-control/permission-resolution.service.js";
import { PostgresPermissionRepository } from "../access-control/postgres-permission.repository.js";
import { PostgresSlugRepository } from "../public-identifiers/postgres-slug.repository.js";
import { SlugService } from "../public-identifiers/slug.service.js";
import { CatalogBrandQueryService } from "./catalog-brand-query.service.js";
import { CatalogBrandWriteService } from "./catalog-brand-write.service.js";
import { CatalogCategoryQueryService } from "./catalog-category-query.service.js";
import { CatalogCategoryWriteService } from "./catalog-category-write.service.js";
import { CatalogMediaService } from "./catalog-media.service.js";
import { CatalogProductQueryService } from "./catalog-product-query.service.js";
import { CatalogProductWriteService } from "./catalog-product-write.service.js";
import { PostgresCatalogBrandQueryRepository } from "./postgres-catalog-brand-query.repository.js";
import { PostgresCatalogBrandWriteRepository } from "./postgres-catalog-brand-write.repository.js";
import { PostgresCatalogCategoryQueryRepository } from "./postgres-catalog-category-query.repository.js";
import { PostgresCatalogCategoryWriteRepository } from "./postgres-catalog-category-write.repository.js";
import { PostgresCatalogDeleteGuard } from "./postgres-catalog-delete-guard.js";
import { PostgresCatalogMediaRepository } from "./postgres-catalog-media.repository.js";
import { PostgresCatalogProductArchiveGuard } from "./postgres-catalog-product-archive-guard.js";
import { PostgresCatalogProductDeleteGuard } from "./postgres-catalog-product-delete-guard.js";
import { PostgresCatalogProductOptionsRepository } from "./postgres-catalog-product-options.repository.js";
import { PostgresCatalogProductQueryRepository } from "./postgres-catalog-product-query.repository.js";
import { CatalogProductCommands } from "./postgres-catalog-product-write.commands.js";
import { PostgresCatalogProductWriteRepository } from "./postgres-catalog-product-write.repository.js";
import { CatalogVariantCommands } from "./postgres-catalog-variant-write.commands.js";
import { PostgresCatalogVariantWriteRepository } from "./postgres-catalog-variant-write.repository.js";

type CatalogRuntime = {
  catalog: {
    catalogBrandQueryService: CatalogBrandQueryService;
    catalogBrandWriteService: CatalogBrandWriteService;
    catalogCategoryQueryService: CatalogCategoryQueryService;
    catalogCategoryWriteService: CatalogCategoryWriteService;
    catalogMediaService: CatalogMediaService;
    catalogProductQueryService: CatalogProductQueryService;
    catalogProductWriteService: CatalogProductWriteService;
    permissionResolutionService: PermissionResolutionService;
    productOptionsRepo: PostgresCatalogProductOptionsRepository;
  };
};

export function createCatalogRuntime(
  databaseRuntime: DatabaseRuntime,
  storage: R2StorageService | null = null,
): CatalogRuntime {
  const slugService = new SlugService(
    new PostgresSlugRepository(databaseRuntime.db),
  );
  const permissionResolutionService = new PermissionResolutionService(
    new PostgresPermissionRepository(databaseRuntime.db),
  );

  const productDeleteGuard = new PostgresCatalogProductDeleteGuard(
    databaseRuntime.db,
  );
  const catalogDeleteGuard = new PostgresCatalogDeleteGuard(databaseRuntime.db);
  const _productArchiveGuard = new PostgresCatalogProductArchiveGuard(
    databaseRuntime.db,
  );

  const productCommands = new CatalogProductCommands(
    databaseRuntime.db,
    slugService,
    productDeleteGuard,
  );
  const variantCommands = new CatalogVariantCommands(
    databaseRuntime.db,
    slugService,
    productDeleteGuard,
  );

  return {
    catalog: {
      catalogBrandQueryService: new CatalogBrandQueryService(
        new PostgresCatalogBrandQueryRepository(databaseRuntime.db),
      ),
      catalogBrandWriteService: new CatalogBrandWriteService(
        new PostgresCatalogBrandWriteRepository(
          databaseRuntime.db,
          slugService,
          catalogDeleteGuard,
        ),
      ),
      catalogCategoryQueryService: new CatalogCategoryQueryService(
        new PostgresCatalogCategoryQueryRepository(databaseRuntime.db),
      ),
      catalogCategoryWriteService: new CatalogCategoryWriteService(
        new PostgresCatalogCategoryWriteRepository(
          databaseRuntime.db,
          slugService,
          catalogDeleteGuard,
        ),
      ),
      catalogMediaService: new CatalogMediaService(
        new PostgresCatalogMediaRepository(databaseRuntime.db),
        storage,
      ),
      catalogProductQueryService: new CatalogProductQueryService(
        new PostgresCatalogProductQueryRepository(databaseRuntime.db),
      ),
      catalogProductWriteService: new CatalogProductWriteService(
        new PostgresCatalogProductWriteRepository(productCommands),
        new PostgresCatalogVariantWriteRepository(variantCommands),
      ),
      permissionResolutionService,
      productOptionsRepo: new PostgresCatalogProductOptionsRepository(
        databaseRuntime.db,
      ),
    },
  };
}
