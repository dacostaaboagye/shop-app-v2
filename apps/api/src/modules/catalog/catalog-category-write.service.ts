import type {
  AdminCategorySummary,
  AdminCreateCategoryRequest,
  AdminCreateCategoryResponse,
  AdminUpdateCategoryRequest,
  AdminUpdateCategoryResponse,
} from "@shop/contracts";
import type { PlatformEventPublisher } from "../events/platform-event.types.js";
import {
  createCatalogCategoryCreatedEvent,
  createCatalogCategoryDeletedEvent,
  createCatalogCategoryUpdatedEvent,
} from "./catalog-events.js";

export type CatalogCategoryWriteRepository = {
  createCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateCategoryRequest;
  }): Promise<AdminCreateCategoryResponse>;
  updateCategory(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateCategoryRequest;
    slug: string;
  }): Promise<AdminUpdateCategoryResponse | null>;
  getCategory(slug: string): Promise<AdminCategorySummary | null>;
  deleteCategory(input: { slug: string }): Promise<void>;
};

export class CatalogCategoryWriteService {
  constructor(
    private readonly repository: CatalogCategoryWriteRepository,
    private readonly eventPublisher?: PlatformEventPublisher | null,
  ) {}

  async createCategory(
    actor: { userId: string; userSlug: string },
    payload: AdminCreateCategoryRequest,
    now: Date,
  ) {
    const category = await this.repository.createCategory({
      actorId: actor.userId,
      now,
      payload,
    });

    await this.eventPublisher?.publish(
      createCatalogCategoryCreatedEvent({
        actor,
        category,
        occurredAt: now,
      }),
    );

    return category;
  }

  async updateCategory(
    actor: { userId: string; userSlug: string },
    slug: string,
    payload: AdminUpdateCategoryRequest,
    now: Date,
  ) {
    const category = await this.repository.updateCategory({
      actorId: actor.userId,
      now,
      payload,
      slug,
    });

    if (category) {
      await this.eventPublisher?.publish(
        createCatalogCategoryUpdatedEvent({
          actor,
          category,
          occurredAt: now,
        }),
      );
    }

    return category;
  }

  async deleteCategory(
    actor: { userId: string; userSlug: string },
    slug: string,
    now: Date,
  ) {
    const category = await this.repository.getCategory(slug);
    await this.repository.deleteCategory({ slug });

    if (category) {
      await this.eventPublisher?.publish(
        createCatalogCategoryDeletedEvent({
          actor,
          category,
          occurredAt: now,
        }),
      );
    }
  }
}
