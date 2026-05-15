import type {
  AdminCreateSupplierContactRequest,
  AdminCreateSupplierProcurementOrderRequest,
  AdminSupplierProcurementReceiveRequest,
  AdminUpdateSupplierRequest,
} from "@shop/contracts";
import type { ApiDatabase } from "../../infrastructure/database.js";
import type { EmailService } from "../messaging/email.service.js";
import type { SlugAllocator } from "../public-identifiers/slug.service.js";
import { PostgresAdminSupplierContactEventContextRepository } from "./admin-supplier-contact-event-context.repository.js";
import { PostgresAdminSupplierProductEventContextRepository } from "./admin-supplier-product-event-context.repository.js";
import type { AdminSupplierWriteRepository } from "./admin-supplier-write.types.js";
import {
  addSupplierContact,
  inviteSupplierContactPortal,
  linkSupplierContactPortal,
  removeSupplierContact,
  unlinkSupplierContactPortal,
} from "./postgres-admin-supplier-contact-write.js";
import {
  createSupplierRecord,
  linkSupplierProductRecord,
  unlinkSupplierProductRecord,
} from "./postgres-admin-supplier-create-write.js";
import {
  createSupplierInquiry,
  updateSupplierInquiry,
} from "./postgres-admin-supplier-inquiry-write.js";
import { receiveSupplierProcurementOrder } from "./postgres-admin-supplier-procurement-receive.js";
import {
  createSupplierProcurementOrder,
  transitionSupplierProcurementOrder,
} from "./postgres-admin-supplier-procurement-write.js";
import { PostgresAdminSupplierQueryRepository } from "./postgres-admin-supplier-query.repository.js";
import { updateSupplierProfile } from "./postgres-admin-supplier-write.support.js";

export class PostgresAdminSupplierWriteRepository
  implements AdminSupplierWriteRepository
{
  private readonly reader: PostgresAdminSupplierQueryRepository;
  private readonly contactEventContextRepository: PostgresAdminSupplierContactEventContextRepository;
  private readonly productEventContextRepository: PostgresAdminSupplierProductEventContextRepository;

  constructor(
    private readonly db: ApiDatabase,
    private readonly slugAllocator: SlugAllocator,
    private readonly emailService: EmailService | null = null,
    private readonly webBaseUrl = "http://localhost:3000",
  ) {
    this.reader = new PostgresAdminSupplierQueryRepository(db);
    this.contactEventContextRepository =
      new PostgresAdminSupplierContactEventContextRepository(db);
    this.productEventContextRepository =
      new PostgresAdminSupplierProductEventContextRepository(db);
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
    payload: Parameters<typeof createSupplierRecord>[0]["payload"];
  }) {
    return createSupplierRecord({
      ...input,
      db: this.db,
      reader: this.reader,
      slugAllocator: this.slugAllocator,
    });
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
    payload: Parameters<typeof linkSupplierProductRecord>[0]["payload"];
    supplierSlug: string;
  }) {
    return linkSupplierProductRecord({
      ...input,
      db: this.db,
      reader: this.reader,
    });
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
    return unlinkSupplierProductRecord({ ...input, db: this.db });
  }

  async getSupplierProductEventContext(input: {
    productSlug: string;
    supplierSlug: string;
  }) {
    return this.productEventContextRepository.getSupplierProductEventContext(
      input,
    );
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

  async getPortalContactEventContext(input: {
    contactReference: string;
    supplierSlug: string;
  }) {
    return this.contactEventContextRepository.getPortalContactEventContext(
      input,
    );
  }
}
