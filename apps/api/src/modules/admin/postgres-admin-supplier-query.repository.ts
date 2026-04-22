import type {
  AdminSupplierDetail,
  AdminSupplierListQuery,
} from "@shop/contracts";
import { suppliers } from "@shop/database";
import { eq, sql } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";
import { listPrimaryImageUrls } from "../catalog/catalog-primary-image.loader.js";
import type { AdminSupplierQueryRepository } from "./admin-supplier-query.service.js";
import { listSupplierProcurementOrders } from "./postgres-admin-supplier-procurement-query.js";
import {
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
      productRows,
      procurementOrders,
      transactionRows,
      primaryImageUrls,
    ] = await Promise.all([
      listSupplierContacts(this.db, [row.id]),
      listSupplierProducts(this.db, row.id),
      listSupplierProcurementOrders(this.db, row.id),
      listSupplierTransactions(this.db, row.id),
      listPrimaryImageUrls(this.db, "supplier", [row.slug]),
    ]);
    const contactSummary = groupSupplierContacts(contacts).get(row.id);

    return {
      ...toSupplierSummary(row, contactSummary, primaryImageUrls),
      contacts: contacts.map((contact) => ({
        email: contact.email,
        firstName: contact.firstName,
        isPrimary: contact.isPrimary,
        jobTitle: contact.jobTitle,
        lastName: contact.lastName,
        phone: contact.phone,
        status: contact.status,
        userSlug: contact.userSlug,
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
