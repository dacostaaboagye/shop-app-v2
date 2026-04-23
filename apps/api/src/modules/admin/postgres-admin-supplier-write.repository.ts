import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierProcurementOrderRequest,
  AdminCreateSupplierRequest,
  AdminLinkSupplierProductRequest,
  AdminSupplierProcurementReceiveRequest,
  AdminUpdateSupplierRequest,
} from "@shop/contracts";
import { supplierProducts, suppliers } from "@shop/database";
import { and, eq } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailService } from "../messaging/email.service.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import type { AdminSupplierWriteRepository } from "./admin-supplier-write.service.js";
import {
  addSupplierContact,
  inviteSupplierContactPortal,
  linkSupplierContactPortal,
  removeSupplierContact,
  unlinkSupplierContactPortal,
} from "./postgres-admin-supplier-contact-write.js";
import {
  createSupplierInquiry,
  updateSupplierInquiry,
} from "./postgres-admin-supplier-inquiry-write.js";
import {
  createSupplierProcurementOrder,
  receiveSupplierProcurementOrder,
  transitionSupplierProcurementOrder,
} from "./postgres-admin-supplier-procurement-write.js";
import { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import {
  findProduct,
  findSupplier,
  updateSupplierProfile,
} from "./postgres-admin-supplier-write.support.js";

export class PostgresAdminSupplierWriteRepository
  implements AdminSupplierWriteRepository
{
  private readonly reader: PostgresAdminSupplierQueryRepository;

  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly emailService: EmailService | null = null,
    private readonly webBaseUrl = "http://localhost:3000",
  ) {
    this.reader = new PostgresAdminSupplierQueryRepository(db);
  }

  async addContact(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierContactRequest;
    supplierSlug: string;
  }) {
    return addSupplierContact({ ...input, db: this.db, reader: this.reader });
  }

  async linkContactPortal(input: {
    actorId: string;
    contactReference: string;
    now: Date;
    payload: Parameters<typeof linkSupplierContactPortal>[0]["payload"];
    supplierSlug: string;
  }) {
    return linkSupplierContactPortal({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }

  async inviteContactPortal(input: {
    actorId: string;
    contactReference: string;
    now: Date;
    supplierSlug: string;
  }) {
    return inviteSupplierContactPortal({
      ...input,
      db: this.db,
      emailService: this.emailService,
      reader: this.reader,
      slugAllocator: this.slugAllocator,
      webBaseUrl: this.webBaseUrl,
    });
  }

  async createSupplier(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierRequest;
  }) {
    const slug = await this.slugAllocator.allocateSlug({
      entityType: "supplier",
      value: input.payload.name,
    });

    await this.db.insert(suppliers).values({
      createdAt: input.now,
      createdBy: input.actorId,
      email: input.payload.email ?? null,
      legalName: input.payload.legalName ?? null,
      name: input.payload.name,
      notes: input.payload.notes ?? null,
      paymentTermsDays: input.payload.paymentTermsDays,
      phone: input.payload.phone ?? null,
      slug,
      status: input.payload.status,
      taxId: input.payload.taxId ?? null,
      updatedAt: input.now,
      website: input.payload.website ?? null,
    });

    const created = await this.reader.getSupplier(slug);
    if (!created) throw new Error("Unable to load created supplier.");
    return created;
  }

  async createProcurementOrder(input: {
    actorId: string;
    now: Date;
    payload: AdminCreateSupplierProcurementOrderRequest;
    reference: string;
    supplierSlug: string;
  }) {
    return createSupplierProcurementOrder({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }

  async createInquiry(input: {
    actorId: string;
    now: Date;
    payload: Parameters<typeof createSupplierInquiry>[0]["payload"];
    reference: string;
    supplierSlug: string;
  }) {
    return createSupplierInquiry({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }

  async linkProduct(input: {
    actorId: string;
    now: Date;
    payload: AdminLinkSupplierProductRequest;
    supplierSlug: string;
  }) {
    const supplier = await findSupplier(this.db, input.supplierSlug);
    if (!supplier) return null;
    const product = await findProduct(this.db, input.payload.productSlug);

    await this.db
      .insert(supplierProducts)
      .values({
        createdAt: input.now,
        createdBy: input.actorId,
        isPreferred: input.payload.isPreferred,
        lastCostPrice: input.payload.lastCostPrice ?? null,
        leadTimeDays: input.payload.leadTimeDays,
        minimumOrderQuantity: input.payload.minimumOrderQuantity,
        notes: input.payload.notes ?? null,
        productId: product.id,
        supplierId: supplier.id,
        supplierProductCode: input.payload.supplierProductCode ?? null,
        updatedAt: input.now,
      })
      .onConflictDoUpdate({
        target: [supplierProducts.supplierId, supplierProducts.productId],
        set: {
          isPreferred: input.payload.isPreferred,
          lastCostPrice: input.payload.lastCostPrice ?? null,
          leadTimeDays: input.payload.leadTimeDays,
          minimumOrderQuantity: input.payload.minimumOrderQuantity,
          notes: input.payload.notes ?? null,
          supplierProductCode: input.payload.supplierProductCode ?? null,
          updatedAt: input.now,
        },
      });

    return this.reader.getSupplier(input.supplierSlug);
  }

  async removeContact(input: {
    contactReference: string;
    supplierSlug: string;
  }) {
    return removeSupplierContact({ ...input, db: this.db });
  }

  async unlinkContactPortal(input: {
    contactReference: string;
    now: Date;
    supplierSlug: string;
  }) {
    return unlinkSupplierContactPortal({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }

  async unlinkProduct(input: { productSlug: string; supplierSlug: string }) {
    const supplier = await findSupplier(this.db, input.supplierSlug);
    if (!supplier) return false;
    const product = await findProduct(this.db, input.productSlug);
    const result = await this.db
      .delete(supplierProducts)
      .where(
        and(
          eq(supplierProducts.supplierId, supplier.id),
          eq(supplierProducts.productId, product.id),
        ),
      );

    return (result.rowCount ?? 0) > 0;
  }

  async transitionProcurementOrder(input: {
    actorId: string;
    now: Date;
    notes: string | null;
    reference: string;
    status: "submitted" | "approved" | "ordered" | "cancelled" | "closed";
    supplierSlug: string;
  }) {
    return transitionSupplierProcurementOrder({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }

  async receiveProcurementOrder(input: {
    actorId: string;
    lines: AdminSupplierProcurementReceiveRequest["lines"];
    notes: string | null;
    now: Date;
    reference: string;
    supplierSlug: string;
  }) {
    return receiveSupplierProcurementOrder({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }

  async updateSupplier(input: {
    actorId: string;
    now: Date;
    payload: AdminUpdateSupplierRequest;
    supplierSlug: string;
  }) {
    const row = await updateSupplierProfile(this.db, input);

    return row ? this.reader.getSupplier(row.slug) : null;
  }

  async updateInquiry(input: {
    actorId: string;
    now: Date;
    payload: Parameters<typeof updateSupplierInquiry>[0]["payload"];
    reference: string;
    supplierSlug: string;
  }) {
    return updateSupplierInquiry({
      ...input,
      db: this.db,
      reader: this.reader,
    });
  }
}
