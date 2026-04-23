import type {
  AdminSupplierDetail,
  AdminSupplierListQuery,
} from "@shop/contracts";
import { supplierContacts, suppliers } from "@shop/database";
import { and, eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { listPrimaryImageUrls } from "../catalog/catalog-primary-image.loader.js";
import type { AdminSupplierQueryRepository } from "./admin-supplier-query.service.js";
import {
  listSupplierInquiries,
  listSupplierProductVariants,
} from "./postgres-admin-supplier-inquiry-query.js";
import { listSupplierProcurementOrders } from "./postgres-admin-supplier-procurement-query.js";
import {
  getSupplierContactPortalStatus,
  getSupplierFilter,
  getSupplierSortExpression,
  groupSupplierContacts,
  listSupplierContacts,
  listSupplierProducts,
  listSupplierTransactions,
  toSupplierSummary,
} from "./postgres-admin-supplier-query.support.js";

export class PostgresAdminSupplierQueryRepository
  implements AdminSupplierQueryRepository
{
  constructor(private readonly db: ApiDatabase) {}

  async getSupplierForPortalUser(
    userId: string,
  ): Promise<AdminSupplierDetail | null> {
    const [contact] = await this.db
      .select({ supplierSlug: suppliers.slug })
      .from(supplierContacts)
      .innerJoin(suppliers, eq(suppliers.id, supplierContacts.supplierId))
      .where(
        and(
          eq(supplierContacts.userId, userId),
          eq(supplierContacts.status, "active"),
          eq(suppliers.status, "active"),
        ),
      )
      .limit(1);

    return contact ? this.getSupplier(contact.supplierSlug) : null;
  }

  async getSupplier(slug: string): Promise<AdminSupplierDetail | null> {
    const [row] = await this.db
      .select({
        id: suppliers.id,
        slug: suppliers.slug,
        name: suppliers.name,
        legalName: suppliers.legalName,
        email: suppliers.email,
        phone: suppliers.phone,
        website: suppliers.website,
        taxId: suppliers.taxId,
        paymentTermsDays: suppliers.paymentTermsDays,
        status: suppliers.status,
        createdAt: suppliers.createdAt,
      })
      .from(suppliers)
      .where(eq(suppliers.slug, slug))
      .limit(1);

    if (!row) return null;

    const [
      contacts,
      inquiries,
      productRows,
      productVariants,
      procurementOrders,
      transactionRows,
      primaryImageUrls,
    ] = await Promise.all([
      listSupplierContacts(this.db, [row.id]),
      listSupplierInquiries(this.db, row.id),
      listSupplierProducts(this.db, row.id),
      listSupplierProductVariants(this.db, row.id),
      listSupplierProcurementOrders(this.db, row.id),
      listSupplierTransactions(this.db, row.id),
      listPrimaryImageUrls(this.db, "supplier", [row.slug]),
    ]);
    const contactSummary = groupSupplierContacts(contacts).get(row.id);

    return {
      ...toSupplierSummary(row, contactSummary, primaryImageUrls),
      contacts: contacts.map((contact) => ({
        contactReference: contact.id,
        email: contact.email,
        firstName: contact.firstName,
        isPrimary: contact.isPrimary,
        jobTitle: contact.jobTitle,
        lastName: contact.lastName,
        phone: contact.phone,
        portalStatus: getSupplierContactPortalStatus(contact),
        status: contact.status,
        userSlug: contact.userSlug,
      })),
      inquiries: inquiries.map((inquiry) => ({
        attachmentMimeType: inquiry.attachmentMimeType,
        attachmentName: inquiry.attachmentName,
        attachmentUrl: inquiry.attachmentUrl,
        createdAt: inquiry.createdAt.toISOString(),
        message: inquiry.message,
        neededBy: inquiry.neededBy?.toISOString() ?? null,
        productName: inquiry.productName,
        productSlug: inquiry.productSlug,
        reference: inquiry.reference,
        requestedProductName: inquiry.requestedProductName,
        requestedQuantity: inquiry.requestedQuantity,
        status: inquiry.status,
        supplierResponse: inquiry.supplierResponse,
      })),
      procurementOrders,
      products: productRows.map((product) => ({
        brandName: product.brandName,
        categoryName: product.categoryName,
        isPreferred: product.isPreferred,
        lastCostPrice: product.lastCostPrice,
        leadTimeDays: product.leadTimeDays,
        minimumOrderQuantity: product.minimumOrderQuantity,
        productName: product.productName,
        productSlug: product.productSlug,
        supplierProductCode: product.supplierProductCode,
        variantCount: Number(product.variantCount ?? 0),
        variants: productVariants
          .filter((variant) => variant.productSlug === product.productSlug)
          .map((variant) => ({
            sku: variant.sku,
            variantName: variant.variantName,
            variantSlug: variant.variantSlug,
          })),
      })),
      recentTransactions: transactionRows.map((transaction) => ({
        amount: transaction.amount,
        currencyCode: transaction.currencyCode,
        description: transaction.description,
        occurredAt: transaction.occurredAt.toISOString(),
        reference: transaction.reference,
        relatedDocumentReference: transaction.relatedDocumentReference,
        relatedDocumentType: transaction.relatedDocumentType,
        status: transaction.status,
        transactionType: transaction.transactionType,
      })),
    };
  }

  async listSuppliers(input: AdminSupplierListQuery) {
    const { page, pageSize, q, status, sort, dir } = input;
    const offset = (page - 1) * pageSize;
    const filter = getSupplierFilter({ q, status });

    const [totalCountResult, rows] = await Promise.all([
      this.db
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(suppliers)
        .where(filter),
      this.db
        .select({
          id: suppliers.id,
          slug: suppliers.slug,
          name: suppliers.name,
          legalName: suppliers.legalName,
          email: suppliers.email,
          phone: suppliers.phone,
          website: suppliers.website,
          taxId: suppliers.taxId,
          paymentTermsDays: suppliers.paymentTermsDays,
          status: suppliers.status,
          createdAt: suppliers.createdAt,
        })
        .from(suppliers)
        .where(filter)
        .orderBy(getSupplierSortExpression(sort, dir))
        .limit(pageSize)
        .offset(offset),
    ]);

    const supplierIds = rows.map((row) => row.id);
    const [contacts, primaryImageUrls] = await Promise.all([
      listSupplierContacts(this.db, supplierIds),
      listPrimaryImageUrls(
        this.db,
        "supplier",
        rows.map((row) => row.slug),
      ),
    ]);
    const contactMap = groupSupplierContacts(contacts);

    return {
      items: rows.map((row) =>
        toSupplierSummary(row, contactMap.get(row.id), primaryImageUrls),
      ),
      totalCount: totalCountResult[0]?.count ?? 0,
    };
  }
}
