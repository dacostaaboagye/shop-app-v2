import type {
  AdminCreateProductRequest,
  AdminCreateVariantRequest,
  AdminProductDetail,
  AdminUpdateProductRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import {
  createCatalogProductCreatedEvent,
  createCatalogProductDeletedEvent,
  createCatalogProductUpdatedEvent,
  createCatalogVariantCreatedEvent,
  createCatalogVariantDeletedEvent,
  createCatalogVariantUpdatedEvent,
} from "./catalog-events.js";
import type { CatalogProductRepository } from "./postgres-catalog-product-write.repository.js";
import type { CatalogVariantRepository } from "./postgres-catalog-variant-write.repository.js";

export class CatalogProductWriteService {
  constructor(
    private readonly productRepo: CatalogProductRepository,
    private readonly variantRepo: CatalogVariantRepository,
    private readonly eventPublisher?: PlatformEventPublisher | null,
  ) {}

  async createProduct(
    actor: { userId: string; userSlug: string },
    payload: AdminCreateProductRequest,
    now: Date,
  ): Promise<AdminProductDetail> {
    const product = await this.productRepo.createProduct({
      actorId: actor.userId,
      now,
      payload,
    });

    await this.eventPublisher?.publish(
      createCatalogProductCreatedEvent({
        actor,
        occurredAt: now,
        product,
      }),
    );

    return product;
  }

  async updateProduct(
    actor: { userId: string; userSlug: string },
    slug: string,
    payload: AdminUpdateProductRequest,
    now: Date,
  ): Promise<AdminProductDetail | null> {
    const product = await this.productRepo.updateProduct({
      actorId: actor.userId,
      now,
      payload,
      slug,
    });

    if (product) {
      await this.eventPublisher?.publish(
        createCatalogProductUpdatedEvent({
          actor,
          occurredAt: now,
          product,
        }),
      );
    }

    return product;
  }

  async deleteProduct(
    actor: { userId: string; userSlug: string },
    slug: string,
    now: Date,
  ): Promise<void> {
    return this.productRepo.deleteProduct({
      actorId: actor.userId,
      now,
      slug,
    });
  }

  async deleteProductWithActor(
    actor: { userId: string; userSlug: string },
    slug: string,
    now: Date,
  ): Promise<void> {
    const product = await this.productRepo.getProductForDeleteEvent(slug);
    await this.productRepo.deleteProduct({
      actorId: actor.userId,
      now,
      slug,
    });

    if (product) {
      await this.eventPublisher?.publish(
        createCatalogProductDeletedEvent({
          actor,
          occurredAt: now,
          product,
        }),
      );
    }
  }

  async createVariant(
    actor: { userId: string; userSlug: string },
    productSlug: string,
    payload: AdminCreateVariantRequest,
    now: Date,
  ): Promise<AdminVariantSummary> {
    const variant = await this.variantRepo.createVariant({
      actorId: actor.userId,
      now,
      payload,
      productSlug,
    });

    await this.eventPublisher?.publish(
      createCatalogVariantCreatedEvent({
        actor,
        occurredAt: now,
        productSlug,
        variant,
      }),
    );

    return variant;
  }

  async updateVariant(
    actor: { userId: string; userSlug: string },
    productSlug: string,
    variantSlug: string,
    payload: AdminUpdateVariantRequest,
    now: Date,
  ): Promise<AdminVariantSummary | null> {
    const variant = await this.variantRepo.updateVariant({
      actorId: actor.userId,
      now,
      payload,
      productSlug,
      variantSlug,
    });

    if (variant) {
      await this.eventPublisher?.publish(
        createCatalogVariantUpdatedEvent({
          actor,
          occurredAt: now,
          productSlug,
          variant,
        }),
      );
    }

    return variant;
  }

  async deleteVariant(
    actor: { userId: string; userSlug: string },
    productSlug: string,
    variantSlug: string,
    now: Date,
  ): Promise<void> {
    const context = await this.variantRepo.getVariantEventContext({
      productSlug,
      variantSlug,
    });

    await this.variantRepo.deleteVariant({
      actorId: actor.userId,
      now,
      productSlug,
      variantSlug,
    });

    if (context) {
      await this.eventPublisher?.publish(
        createCatalogVariantDeletedEvent({
          actor,
          occurredAt: now,
          variant: context,
        }),
      );
    }
  }
}
