import type {
  AdminSupplierListQuery,
  AdminSupplierStatus,
  AdminSupplierSummary,
} from "@shop/contracts";
import {
  catalogBrands,
  catalogCategories,
  catalogProducts,
  productVariants,
  supplierContacts,
  supplierProducts,
  suppliers,
  supplierTransactions,
  users,
} from "@shop/database";
import type { SQL } from "drizzle-orm";
import { and, asc, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import type { ApiDatabase } from "../../infrastructure/database.js";

type SupplierContactRow = Awaited<
  ReturnType<typeof listSupplierContacts>
>[number];

export function getSupplierFilter(input: {
  q: string;
  status: AdminSupplierListQuery["status"];
}): SQL | undefined {
  const pattern = `%${input.q.trim()}%`;
  const hasQuery = input.q.trim().length > 0;

  return and(
    hasQuery
      ? or(
          ilike(suppliers.name, pattern),
          ilike(suppliers.legalName, pattern),
          ilike(suppliers.email, pattern),
          ilike(suppliers.taxId, pattern),
        )
      : undefined,
    input.status !== "all"
      ? eq(suppliers.status, input.status as AdminSupplierStatus)
      : undefined,
  );
}

export function getSupplierSortExpression(
  sort: AdminSupplierListQuery["sort"],
  dir: AdminSupplierListQuery["dir"],
) {
  if (sort === "createdAt") {
    return dir === "desc"
      ? desc(suppliers.createdAt)
      : asc(suppliers.createdAt);
  }

  if (sort === "status") {
    return dir === "desc" ? desc(suppliers.status) : asc(suppliers.status);
  }

  return dir === "desc" ? desc(suppliers.name) : asc(suppliers.name);
}

export async function listSupplierContacts(
  db: ApiDatabase,
  supplierIds: readonly string[],
) {
  if (supplierIds.length === 0) return [];

  return db
    .select({
      email: supplierContacts.email,
      firstName: supplierContacts.firstName,
      id: supplierContacts.id,
      isPrimary: supplierContacts.isPrimary,
      jobTitle: supplierContacts.jobTitle,
      lastName: supplierContacts.lastName,
      phone: supplierContacts.phone,
      status: supplierContacts.status,
      supplierId: supplierContacts.supplierId,
      userEmailVerified: users.emailVerified,
      userId: supplierContacts.userId,
      userRequiresPasswordChange: users.requiresPasswordChange,
      userSlug: users.slug,
      userStatus: users.status,
    })
    .from(supplierContacts)
    .leftJoin(users, eq(users.id, supplierContacts.userId))
    .where(inArray(supplierContacts.supplierId, supplierIds))
    .orderBy(
      asc(supplierContacts.supplierId),
      desc(supplierContacts.isPrimary),
      asc(supplierContacts.firstName),
      asc(supplierContacts.lastName),
    );
}

export async function listSupplierProducts(
  db: ApiDatabase,
  supplierId: string,
) {
  return db
    .select({
      brandName: catalogBrands.name,
      categoryName: catalogCategories.name,
      isPreferred: supplierProducts.isPreferred,
      lastCostPrice: supplierProducts.lastCostPrice,
      leadTimeDays: supplierProducts.leadTimeDays,
      minimumOrderQuantity: supplierProducts.minimumOrderQuantity,
      productName: catalogProducts.name,
      productSlug: catalogProducts.slug,
      supplierProductCode: supplierProducts.supplierProductCode,
      variantCount: count(productVariants.id),
    })
    .from(supplierProducts)
    .innerJoin(
      catalogProducts,
      eq(catalogProducts.id, supplierProducts.productId),
    )
    .leftJoin(catalogBrands, eq(catalogBrands.id, catalogProducts.brandId))
    .leftJoin(
      catalogCategories,
      eq(catalogCategories.id, catalogProducts.categoryId),
    )
    .leftJoin(
      productVariants,
      eq(productVariants.productId, catalogProducts.id),
    )
    .where(eq(supplierProducts.supplierId, supplierId))
    .groupBy(
      supplierProducts.id,
      catalogProducts.id,
      catalogBrands.name,
      catalogCategories.name,
    )
    .orderBy(asc(catalogProducts.name));
}

export async function listSupplierTransactions(
  db: ApiDatabase,
  supplierId: string,
) {
  return db
    .select({
      amount: supplierTransactions.amount,
      currencyCode: supplierTransactions.currencyCode,
      description: supplierTransactions.description,
      occurredAt: supplierTransactions.occurredAt,
      reference: supplierTransactions.reference,
      relatedDocumentReference: supplierTransactions.relatedDocumentReference,
      relatedDocumentType: supplierTransactions.relatedDocumentType,
      status: supplierTransactions.status,
      transactionType: supplierTransactions.transactionType,
    })
    .from(supplierTransactions)
    .where(eq(supplierTransactions.supplierId, supplierId))
    .orderBy(desc(supplierTransactions.occurredAt))
    .limit(50);
}

export function toSupplierSummary(
  row: {
    createdAt: Date;
    email: string | null;
    legalName: string | null;
    name: string;
    paymentTermsDays: number;
    phone: string | null;
    slug: string;
    status: AdminSupplierStatus;
    taxId: string | null;
    website: string | null;
  },
  contactSummary:
    | {
        contactCount: number;
        linkedUserCount: number;
        primaryContact: AdminSupplierSummary["primaryContact"];
      }
    | undefined,
  primaryImageUrls: Map<string, string>,
): AdminSupplierSummary {
  return {
    contactCount: contactSummary?.contactCount ?? 0,
    createdAt: row.createdAt.toISOString(),
    email: row.email,
    legalName: row.legalName,
    linkedUserCount: contactSummary?.linkedUserCount ?? 0,
    name: row.name,
    paymentTermsDays: row.paymentTermsDays,
    phone: row.phone,
    primaryContact: contactSummary?.primaryContact ?? null,
    primaryImageUrl: primaryImageUrls.get(row.slug) ?? null,
    slug: row.slug,
    status: row.status,
    taxId: row.taxId,
    website: row.website,
  };
}

export function groupSupplierContacts(rows: SupplierContactRow[]) {
  const summary = new Map<
    string,
    {
      contactCount: number;
      linkedUserCount: number;
      primaryContact: AdminSupplierSummary["primaryContact"];
    }
  >();

  for (const row of rows) {
    const current = summary.get(row.supplierId) ?? {
      contactCount: 0,
      linkedUserCount: 0,
      primaryContact: null,
    };

    current.contactCount += 1;
    current.linkedUserCount += row.userId ? 1 : 0;
    if (!current.primaryContact || row.isPrimary) {
      current.primaryContact = {
        email: row.email,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        userSlug: row.userSlug,
      };
    }
    summary.set(row.supplierId, current);
  }

  return summary;
}

export function getSupplierContactPortalStatus(row: SupplierContactRow) {
  if (row.status === "inactive") return "inactive" as const;
  if (!row.userSlug) return "none" as const;
  if (row.userStatus !== "active") return "inactive" as const;
  if (row.userRequiresPasswordChange || !row.userEmailVerified) {
    return "invited" as const;
  }
  return "linked" as const;
}
