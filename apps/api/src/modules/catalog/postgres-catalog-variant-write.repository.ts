import type {
  AdminCreateVariantRequest,
  AdminUpdateVariantRequest,
  AdminVariantSummary,
} from "@shop/contracts";
import type { CatalogVariantEventContextRepository } from "./catalog-variant-event-context.repository.js";
import type { CatalogVariantCommands } from "./postgres-catalog-variant-write.commands.js";

export type CatalogVariantRepository = {
  createVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateVariantRequest;
    productSlug: string;
  }): Promise<AdminVariantSummary>;
  updateVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateVariantRequest;
    productSlug: string;
    variantSlug: string;
  }): Promise<AdminVariantSummary | null>;
  deleteVariant(input: {
    productSlug: string;
    variantSlug: string;
  }): Promise<void>;
  getVariantEventContext(input: {
    productSlug: string;
    variantSlug: string;
  }): Promise<
    Awaited<
      ReturnType<CatalogVariantEventContextRepository["getVariantEventContext"]>
    >
  >;
};

export class PostgresCatalogVariantWriteRepository
  implements CatalogVariantRepository, CatalogVariantEventContextRepository
{
  constructor(
    private readonly commands: CatalogVariantCommands,
    private readonly eventContextRepository: CatalogVariantEventContextRepository,
  ) {}

  async createVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateVariantRequest;
    productSlug: string;
  }) {
    return this.commands.create(input);
  }

  async updateVariant(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateVariantRequest;
    productSlug: string;
    variantSlug: string;
  }) {
    return this.commands.update(input);
  }

  async deleteVariant(input: {
    productSlug: string;
    variantSlug: string;
  }): Promise<void> {
    return this.commands.delete(input);
  }

  async getVariantEventContext(input: {
    productSlug: string;
    variantSlug: string;
  }) {
    return this.eventContextRepository.getVariantEventContext(input);
  }
}
