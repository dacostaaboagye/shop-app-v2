"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { createAdminLocation } from "@/lib/react-query/admin-location-write";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { LocationCreateForm } from "./location-create-form";
import {
  DEFAULT_LOCATION_CREATE_VALUES,
  toCreateLocationRequest,
} from "./location-create-page.support";

export function LocationCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);

  const createMutation = useMutation({
    mutationFn: createAdminLocation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "locations"] });
      toast.success("Location created");
      router.push(toRoute("/admin/locations"));
    },
  });

  const form = useForm({
    defaultValues: DEFAULT_LOCATION_CREATE_VALUES,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);

      await createMutation.mutateAsync(toCreateLocationRequest(value));
    },
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/locations")}
        backLabel="Locations"
        description="Register a new store or warehouse. Settings can be updated after creation."
        title="New location"
      />

      <LocationCreateForm
        form={form}
        mutation={createMutation}
        onCancel={() => router.back()}
        setWasSubmitted={setWasSubmitted}
        wasSubmitted={wasSubmitted}
      />
    </PageShell>
  );
}
