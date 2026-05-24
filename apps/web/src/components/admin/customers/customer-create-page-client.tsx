"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { createAdminCustomer } from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import type { CustomerFormValues } from "./customer-display";
import { CustomerForm } from "./customer-form";

export function CustomerCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createAdminCustomer,
    onSuccess: (customer) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "customers"] });
      toast.success("Customer created");
      router.push(toRoute(`/admin/customers/${customer.slug}`));
    },
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/customers")}
        backLabel="Customers"
        description="Create the customer relationship record before adding contacts, addresses, and portal access."
        title="New customer"
      />
      <CatalogFormCard
        description="Capture only the fields needed to identify, bill, fulfil, and audit the customer relationship."
        title="Customer profile"
      >
        <CustomerForm
          error={mutation.error}
          isPending={mutation.isPending}
          onSubmit={(values: CustomerFormValues) =>
            mutation.mutate({
              creditLimitAmount: values.creditLimitAmount || null,
              customerType: values.customerType,
              defaultCurrencyCode: values.defaultCurrencyCode || null,
              displayName: values.displayName,
              legalName: values.legalName || null,
              notes: values.notes || null,
              paymentTermsDays: values.paymentTermsDays,
              status: values.status,
              taxNumber: values.taxNumber || null,
            })
          }
          submitLabel="Create customer"
        />
      </CatalogFormCard>
    </PageShell>
  );
}
