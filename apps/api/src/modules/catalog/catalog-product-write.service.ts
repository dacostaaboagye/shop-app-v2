import type {
  AdminCreateProductRequest,
  AdminCreateVariantRequest,
  AdminProductDetail,
  AdminUpdateProductRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import type { CatalogProductRepository } from "./postgres-catalog-product-write.repository.js";
import type { CatalogVariantRepository } from "./postgres-catalog-variant-write.repository.js";

export class CatalogProductWriteService {
  constructor(
    private readonly productRepo: CatalogProductRepository,
    private readonly variantRepo: CatalogVariantRepository,
  ) {}

  async createProduct(
    actorId: string,
    payload: AdminCreateProductRequest,
    now: Date,
  ): Promise<AdminProductDetail> {
    return this.productRepo.createProduct({ actorId, now, payload });
  }

  async updateProduct(
    actorId: string,
    slug: string,
    payload: AdminUpdateProductRequest,
    now: Date,
  ): Promise<AdminProductDetail | null> {
    return this.productRepo.updateProduct({ actorId, now, payload, slug });
  }

  async createVariant(
    actorId: string,
    productSlug: string,
    payload: AdminCreateVariantRequest,
    now: Date,
  ): Promise<AdminVariantSummary> {
    return this.variantRepo.createVariant({
      actorId,
      now,
      payload,
      productSlug,
    });
  }

  async updateVariant(
    actorId: string,
    productSlug: string,
    variantSlug: string,
    payload: AdminUpdateVariantRequest,
    now: Date,
  ): Promise<AdminVariantSummary | null> {
    return this.variantRepo.updateVariant({
      actorId,
      now,
      payload,
      productSlug,
      variantSlug,
    });
  }
}
