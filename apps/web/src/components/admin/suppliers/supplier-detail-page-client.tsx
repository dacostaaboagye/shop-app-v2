"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Package, ReceiptText, UsersRound } from "lucide-react";
import { CatalogDetailSkeleton } from "@/components/admin/catalog/catalog-detail-surfaces";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminProductsQueryKey,
  fetchAdminProducts,
} from "@/lib/react-query/admin-catalog-products";
import {
  adminSupplierQueryKey,
  adminUsersQueryKey,
  fetchAdminSupplier,
  fetchAdminUsers,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import { ContactsPanel } from "./supplier-contact-product-panels";
import {
  TransactionsPanel,
  toSupplierFormValues,
} from "./supplier-detail-sections";
import { formatSupplierDisplayName } from "./supplier-display";
import { SupplierForm } from "./supplier-form";
import { SupplierInquiryPanel } from "./supplier-inquiry-panel";
import { ProcurementPanel } from "./supplier-procurement-panel";
import { ProductsPanel } from "./supplier-product-panel";
import { useSupplierDetailActions } from "./use-supplier-detail-actions";

export function SupplierDetailPageClient({ slug }: { slug: string }) {
  const supplierQuery = useQuery({
    queryFn: () => fetchAdminSupplier(slug),
    queryKey: adminSupplierQueryKey(slug),
  });
  const productsQuery = useQuery({
    queryFn: () =>
      fetchAdminProducts({
        brandSlug: "",
        categorySlug: "",
        dir: "asc",
        page: 1,
        pageSize: 100,
        q: "",
        sort: "name",
        status: "active",
      }),
    queryKey: adminProductsQueryKey({
      brandSlug: "",
      categorySlug: "",
      dir: "asc",
      page: 1,
      pageSize: 100,
      q: "",
      sort: "name",
      status: "active",
    }),
    staleTime: 60_000,
  });
  const usersQuery = useQuery({
    queryFn: () =>
      fetchAdminUsers({
        dir: "asc",
        locationSlug: "",
        page: 1,
        pageSize: 100,
        q: "",
        role: "",
        sort: "name",
        status: "active",
      }),
    queryKey: adminUsersQueryKey({
      dir: "asc",
      locationSlug: "",
      page: 1,
      pageSize: 100,
      q: "",
      role: "",
      sort: "name",
      status: "active",
    }),
    staleTime: 60_000,
  });
  const actions = useSupplierDetailActions({
    refetchSupplier: () => void supplierQuery.refetch(),
    slug,
  });

  if (supplierQuery.isPending) {
    return <CatalogDetailSkeleton statCount={4} />;
  }

  if (supplierQuery.isError) {
    return (
      <PageShell>
        <AppErrorBanner
          detail="Could not load supplier."
          error={supplierQuery.error}
          onRetry={() => void supplierQuery.refetch()}
          title="Unable to load supplier"
        />
      </PageShell>
    );
  }

  const supplier = supplierQuery.data;
  const supplierDisplayName = formatSupplierDisplayName(
    supplier.name,
    supplier.slug,
  );

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/suppliers")}
        backLabel="Suppliers"
        description="Manage supplier details, linked contacts, supply activity, and transaction history."
        title={supplierDisplayName}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Linked supplier contacts."
          icon={UsersRound}
          label="Contacts"
          value={supplier.contactCount}
        />
        <StatCard
          description="Products this supplier can provide."
          icon={Package}
          label="Products"
          value={supplier.products.length}
        />
        <StatCard
          description="Portal users connected to contacts."
          icon={Building2}
          label="Portal users"
          value={supplier.linkedUserCount}
        />
        <StatCard
          description="Recorded supplier transactions."
          icon={ReceiptText}
          label="Transactions"
          value={supplier.recentTransactions.length}
        />
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="inquiries">Inquiries</TabsTrigger>
          <TabsTrigger value="procurement">Supply</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-3" value="overview">
          <CatalogFormCard
            description="Keep the supplier profile current before linking contacts, products, and procurement activity."
            title="Organization details"
          >
            <SupplierForm
              defaultValues={toSupplierFormValues(supplier)}
              error={actions.updateMutation.error}
              isPending={actions.updateMutation.isPending}
              onSubmit={(values) => actions.updateMutation.mutate(values)}
              submitLabel="Save changes"
            />
          </CatalogFormCard>
        </TabsContent>
        <TabsContent className="pt-3" value="contacts">
          <ContactsPanel
            contacts={supplier.contacts}
            isPending={
              actions.contactMutation.isPending ||
              actions.removeContactMutation.isPending ||
              actions.linkContactPortalMutation.isPending ||
              actions.inviteContactPortalMutation.isPending ||
              actions.unlinkContactPortalMutation.isPending
            }
            onAddContact={(input) => actions.contactMutation.mutate(input)}
            onInvitePortalUser={(contactReference) =>
              actions.inviteContactPortalMutation.mutate(contactReference)
            }
            onLinkPortalUser={(contactReference, userSlug) =>
              actions.linkContactPortalMutation.mutate({
                contactReference,
                userSlug,
              })
            }
            onRemoveContact={(contactReference) =>
              actions.removeContactMutation.mutate(contactReference)
            }
            onUnlinkPortalUser={(contactReference) =>
              actions.unlinkContactPortalMutation.mutate(contactReference)
            }
            userOptions={usersQuery.data?.items ?? []}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="products">
          <ProductsPanel
            isPending={actions.productMutation.isPending}
            onLinkProduct={(input) => actions.productMutation.mutate(input)}
            onUnlinkProduct={(productSlug) =>
              actions.unlinkProductMutation.mutate(productSlug)
            }
            products={productsQuery.data?.items ?? []}
            supplierProducts={supplier.products}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="inquiries">
          <SupplierInquiryPanel
            inquiries={supplier.inquiries}
            isPending={actions.inquiryMutation.isPending}
            onCreateInquiry={(input) => actions.inquiryMutation.mutate(input)}
            onUpdateInquiry={(reference, status) =>
              actions.inquiryStatusMutation.mutate({ reference, status })
            }
            products={productsQuery.data?.items ?? []}
            supplierSlug={supplier.slug}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="procurement">
          <ProcurementPanel
            isPending={
              actions.procurementCreateMutation.isPending ||
              actions.procurementActionMutation.isPending ||
              actions.procurementReceiveMutation.isPending
            }
            onAction={(reference, action) =>
              actions.procurementActionMutation.mutate({ action, reference })
            }
            onCreateOrder={(input) =>
              actions.procurementCreateMutation.mutate(input)
            }
            onReceive={(reference, lines) =>
              actions.procurementReceiveMutation.mutate({ lines, reference })
            }
            orders={supplier.procurementOrders}
            supplierProducts={supplier.products}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="transactions">
          <TransactionsPanel transactions={supplier.recentTransactions} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
