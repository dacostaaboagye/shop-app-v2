"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { CatalogFormCard } from "@/components/admin/catalog/catalog-form-surfaces";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { createAdminSupplier } from "@/lib/react-query/admin-directory";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { SupplierForm, type SupplierFormValues } from "./supplier-form";

export function SupplierCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createAdminSupplier,
    onSuccess: (supplier) => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "suppliers"] });
      toast.success("Supplier created");
      router.push(toRoute(`/admin/suppliers/${supplier.slug}`));
    },
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/suppliers")}
        backLabel="Suppliers"
        description="Create a supplier organization before linking contacts, products, and purchasing activity."
        title="New supplier"
      />
      <CatalogFormCard
        description="Capture the supplier profile before adding contacts, linked users, and purchasing records."
        title="Supplier organization"
      >
        <SupplierForm
          error={mutation.error}
          isPending={mutation.isPending}
          onSubmit={(values: SupplierFormValues) =>
            mutation.mutate({
              email: values.email || null,
              legalName: values.legalName || null,
              name: values.name,
              notes: values.notes || null,
              paymentTermsDays: values.paymentTermsDays,
              phone: values.phone || null,
              status: values.status,
              taxId: values.taxId || null,
              website: values.website || null,
            })
          }
          submitLabel="Create supplier"
        />
      </CatalogFormCard>
    </PageShell>
  );
}
