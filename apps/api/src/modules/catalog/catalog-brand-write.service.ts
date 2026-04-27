import type {
  AdminBrandSummary,
  AdminCreateBrandRequest,
  AdminCreateBrandResponse,
  AdminUpdateBrandRequest,
  AdminUpdateBrandResponse,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import {
  createCatalogBrandCreatedEvent,
  createCatalogBrandDeletedEvent,
  createCatalogBrandUpdatedEvent,
} from "./catalog-events.js";

export type CatalogBrandWriteRepository = {
  createBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateBrandRequest;
  }): Promise<AdminCreateBrandResponse>;
  updateBrand(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateBrandRequest;
    slug: string;
  }): Promise<AdminUpdateBrandResponse | null>;
  getBrand(slug: string): Promise<AdminBrandSummary | null>;
  deleteBrand(input: { slug: string }): Promise<void>;
};

export class CatalogBrandWriteService {
  constructor(
    private readonly repository: CatalogBrandWriteRepository,
    private readonly eventPublisher?: PlatformEventPublisher | null,
  ) {}

  async createBrand(
    actor: { userId: string; userSlug: string },
    payload: AdminCreateBrandRequest,
    now: Date,
  ) {
    const brand = await this.repository.createBrand({
      actorId: actor.userId,
      now,
      payload,
    });

    await this.eventPublisher?.publish(
      createCatalogBrandCreatedEvent({
        actor,
        brand,
        occurredAt: now,
      }),
    );

    return brand;
  }

  async updateBrand(
    actor: { userId: string; userSlug: string },
    slug: string,
    payload: AdminUpdateBrandRequest,
    now: Date,
  ) {
    const brand = await this.repository.updateBrand({
      actorId: actor.userId,
      now,
      payload,
      slug,
    });

    if (brand) {
      await this.eventPublisher?.publish(
        createCatalogBrandUpdatedEvent({
          actor,
          brand,
          occurredAt: now,
        }),
      );
    }

    return brand;
  }

  async deleteBrand(
    actor: { userId: string; userSlug: string },
    slug: string,
    now: Date,
  ) {
    const brand = await this.repository.getBrand(slug);
    await this.repository.deleteBrand({ slug });

    if (brand) {
      await this.eventPublisher?.publish(
        createCatalogBrandDeletedEvent({
          actor,
          brand,
          occurredAt: now,
        }),
      );
    }
  }
}
