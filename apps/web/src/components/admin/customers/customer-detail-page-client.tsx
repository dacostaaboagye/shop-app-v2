"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, History, Mail, MapPin } from "lucide-react";
import { CatalogDetailSkeleton } from "@/components/admin/catalog/catalog-detail-surfaces";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { AppErrorBanner } from "@/components/system/app-error";
import {
  PageHeader,
  PageShell,
  StatCard,
} from "@/components/system/page-shell";
import { PermissionGate } from "@/components/system/permission-gate";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  adminCustomerQueryKey,
  adminUsersQueryKey,
  fetchAdminCustomer,
  fetchAdminUsers,
} from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import {
  AddressesPanel,
  ContactsPanel,
  TimelinePanel,
} from "./customer-detail-panels";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  formatCustomerDisplayName,
  toCustomerFormValues,
} from "./customer-display";
import { CustomerForm } from "./customer-form";
import { useCustomerDetailActions } from "./use-customer-detail-actions";

export function CustomerDetailPageClient({ slug }: { slug: string }) {
  const customerQuery = useQuery({
    queryFn: () => fetchAdminCustomer(slug),
    queryKey: adminCustomerQueryKey(slug),
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
  });
  const actions = useCustomerDetailActions({
    refetchCustomer: () => void customerQuery.refetch(),
    slug,
  });

  if (customerQuery.isPending) {
    return <CatalogDetailSkeleton statCount={4} />;
  }

  if (customerQuery.isError) {
    return (
      <PageShell>
        <AppErrorBanner
          detail="Could not load customer."
          error={customerQuery.error}
          onRetry={() => void customerQuery.refetch()}
          title="Unable to load customer"
        />
      </PageShell>
    );
  }

  const customer = customerQuery.data;

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/customers")}
        backLabel="Customers"
        description={`${customer.reference} | ${CUSTOMER_TYPE_LABELS[customer.customerType]} | ${CUSTOMER_STATUS_LABELS[customer.status]}`}
        title={formatCustomerDisplayName(customer)}
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          description="Linked people who represent this customer."
          icon={Mail}
          label="Contacts"
          value={customer.contactCount}
        />
        <StatCard
          description="Billing and shipping addresses."
          icon={MapPin}
          label="Addresses"
          value={customer.addressCount}
        />
        <StatCard
          description="Current payment terms."
          icon={Building2}
          label="Terms"
          value={
            customer.paymentTermsDays > 0
              ? `${customer.paymentTermsDays} days`
              : "Due now"
          }
        />
        <StatCard
          description="Recorded customer audit events."
          icon={History}
          label="Timeline"
          value={customer.events.length}
        />
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="addresses">Addresses</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>
        <TabsContent className="pt-3" value="overview">
          <CatalogFormCard
            description="Keep the customer identity current without rewriting issued document snapshots."
            title="Customer profile"
          >
            <PermissionGate
              fallback={
                <p className="type-support text-muted-foreground">
                  You can view this customer profile. Customer management
                  permission is required to edit it.
                </p>
              }
              permission="customers.manage"
            >
              <CustomerForm
                defaultValues={toCustomerFormValues(customer)}
                error={actions.updateMutation.error}
                isPending={actions.updateMutation.isPending}
                onSubmit={(values) => actions.updateMutation.mutate(values)}
                submitLabel="Save changes"
              />
            </PermissionGate>
          </CatalogFormCard>
        </TabsContent>
        <TabsContent className="pt-3" value="contacts">
          <ContactsPanel
            contacts={customer.contacts}
            error={actions.contactMutation.error}
            isPending={actions.contactMutation.isPending}
            onAddContact={(values) => actions.contactMutation.mutate(values)}
            onLinkPortalUser={(contactReference, userSlug) =>
              actions.linkPortalMutation.mutate({ contactReference, userSlug })
            }
            onUnlinkPortalUser={(contactReference) =>
              actions.unlinkPortalMutation.mutate(contactReference)
            }
            portalAccessPending={
              actions.linkPortalMutation.isPending ||
              actions.unlinkPortalMutation.isPending
            }
            userOptions={usersQuery.data?.items ?? []}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="addresses">
          <AddressesPanel
            addresses={customer.addresses}
            error={actions.addressMutation.error}
            isPending={actions.addressMutation.isPending}
            onAddAddress={(values) => actions.addressMutation.mutate(values)}
          />
        </TabsContent>
        <TabsContent className="pt-3" value="timeline">
          <TimelinePanel events={customer.events} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
