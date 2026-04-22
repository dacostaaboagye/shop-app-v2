"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Package, ReceiptText, UsersRound } from "lucide-react";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminProductsQueryKey,
  fetchAdminProducts,
} from "@/lib/react-query/admin-catalog-products";
import {
  addAdminSupplierContact,
  adminSupplierQueryKey,
  fetchAdminSupplier,
  linkAdminSupplierProduct,
  transitionAdminSupplierProcurementOrder,
  updateAdminSupplier,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { ContactsPanel } from "./supplier-contact-product-panels";
import {
  ProcurementPanel,
  TransactionsPanel,
  toSupplierFormValues,
} from "./supplier-detail-sections";
import { SupplierForm, type SupplierFormValues } from "./supplier-form";
import { ProductsPanel } from "./supplier-product-panel";

export function SupplierDetailPageClient({ slug }: { slug: string }) {
  const queryClient = useQueryClient();
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
  const updateMutation = useMutation({
    mutationFn: (values: SupplierFormValues) =>
      updateAdminSupplier(slug, {
        email: values.email || null,
        legalName: values.legalName || null,
        name: values.name,
        notes: values.notes || null,
        paymentTermsDays: values.paymentTermsDays,
        phone: values.phone || null,
        status: values.status,
        taxId: values.taxId || null,
        website: values.website || null,
      }),
    onSuccess: (supplier) => {
      queryClient.setQueryData(adminSupplierQueryKey(slug), supplier);
      void queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Supplier updated");
    },
  });
  const contactMutation = useMutation({
    mutationFn: (input: Parameters<typeof addAdminSupplierContact>[1]) =>
      addAdminSupplierContact(slug, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData(adminSupplierQueryKey(slug), supplier);
      toast.success("Supplier contact added");
    },
  });
  const productMutation = useMutation({
    mutationFn: (input: Parameters<typeof linkAdminSupplierProduct>[1]) =>
      linkAdminSupplierProduct(slug, input),
    onSuccess: (supplier) => {
      queryClient.setQueryData(adminSupplierQueryKey(slug), supplier);
      toast.success("Product linked");
    },
  });
  const procurementActionMutation = useMutation({
    mutationFn: (input: {
      action: "approve" | "cancel" | "close" | "order" | "submit";
      reference: string;
    }) =>
      transitionAdminSupplierProcurementOrder(
        slug,
        input.reference,
        input.action,
      ),
    onSuccess: (supplier) => {
      queryClient.setQueryData(adminSupplierQueryKey(slug), supplier);
      toast.success("Supplier order updated");
    },
  });

  if (supplierQuery.isPending) {
    return (
      <PageShell>
        <PageHeader title="Supplier" />
      </PageShell>
    );
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

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/suppliers")}
        backLabel="Suppliers"
        description={supplier.legalName ?? supplier.email ?? "Supplier profile"}
        title={supplier.name}
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
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="procurement">Supply</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-3" value="overview">
          <Card>
            <CardHeader>
              <CardTitle>Organization details</CardTitle>
            </CardHeader>
            <CardContent>
              <SupplierForm
                defaultValues={toSupplierFormValues(supplier)}
                error={updateMutation.error}
                isPending={updateMutation.isPending}
                onSubmit={(values) => updateMutation.mutate(values)}
                submitLabel="Save changes"
              />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent className="pt-3" value="contacts">
          <ContactsPanel
            contacts={supplier.contacts}
            isPending={contactMutation.isPending}
            onAddContact={(input) => contactMutation.mutate(input)}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="products">
          <ProductsPanel
            isPending={productMutation.isPending}
            onLinkProduct={(input) => productMutation.mutate(input)}
            products={productsQuery.data?.items ?? []}
            supplierProducts={supplier.products}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="procurement">
          <ProcurementPanel
            onAction={(reference, action) =>
              procurementActionMutation.mutate({ action, reference })
            }
            orders={supplier.procurementOrders}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="transactions">
          <TransactionsPanel transactions={supplier.recentTransactions} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
