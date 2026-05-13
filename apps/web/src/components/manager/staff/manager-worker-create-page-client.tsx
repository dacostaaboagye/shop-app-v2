"use client";

import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserCreateAccountFields } from "@/components/admin/access/user-create-account-fields";
import type { UserCreateFormHandle } from "@/components/admin/access/user-create-form.types";
import {
  CatalogFormActions,
  CatalogFormCard,
  CatalogFormError,
} from "@/components/admin/catalog/catalog-form-surfaces";
import { AppBanner } from "@/components/system/app-banner";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { useActiveLocationScope } from "@/lib/authorization/use-active-location-scope";
import {
  createManagerWorker,
  managerStaffQueryKey,
} from "@/lib/react-query/manager-staff";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import {
  DEFAULT_MANAGER_WORKER_CREATE_VALUES,
  type ManagerWorkerCreateFormValues,
  toManagerCreateWorkerRequest,
  validateManagerWorkerCreateValues,
} from "./manager-worker-create-form.support";

export function ManagerWorkerCreatePageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScope("access.assignments.manage");
  const createMutation = useMutation({ mutationFn: createManagerWorker });
  const form = useForm({
    defaultValues: DEFAULT_MANAGER_WORKER_CREATE_VALUES,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      if (!selectedLocationScope) return;
      const created = await createMutation.mutateAsync(
        toManagerCreateWorkerRequest({
          locationSlug: selectedLocationScope.locationSlug,
          values: value,
        }),
      );
      await queryClient.invalidateQueries({
        queryKey: managerStaffQueryKey(selectedLocationScope.locationId),
      });
      toast.success(created.setupInstruction);
      router.push(toRoute("/manager/staff"));
    },
    validators: {
      onSubmit: ({ value }: { value: ManagerWorkerCreateFormValues }) =>
        validateManagerWorkerCreateValues(value),
    },
  });

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/manager/staff")}
        backLabel="Staff"
        description="Add a worker to one of the locations you manage."
        eyebrow="Team management"
        title="Add worker"
      />

      <LocationScopePanel
        description="Workers can only be added to locations where you manage access."
        emptyDescription="No location is available for worker creation."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Worker location"
      />

      {!isLoading && !selectedLocationScope ? (
        <AppErrorBanner
          detail="You need access management permission at a location before adding workers."
          title="No eligible location"
        />
      ) : (
        <form
          className="flex flex-col gap-5"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setWasSubmitted(true);
            void form.handleSubmit();
          }}
        >
          <AppBanner
            description="After creation, ask the worker to open the sign-in page and use Forgot password to set their password."
            title="Password setup"
            tone="info"
          />

          <CatalogFormError
            error={createMutation.isError ? createMutation.error : null}
            title="Unable to add worker"
          />

          <CatalogFormCard
            description="Use the worker's real identity. The worker role is applied automatically."
            title="Worker details"
          >
            <UserCreateAccountFields
              disabled={createMutation.isPending || !selectedLocationScope}
              form={form as UserCreateFormHandle}
              showProfileImage={false}
              wasSubmitted={wasSubmitted}
            />
          </CatalogFormCard>

          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {(state) => (
              <CatalogFormActions
                canSubmit={Boolean(state.canSubmit && selectedLocationScope)}
                isBusy={state.isSubmitting || createMutation.isPending}
                onCancel={() => router.back()}
                submitLabel="Add worker"
                submittingLabel="Adding..."
              />
            )}
          </form.Subscribe>
        </form>
      )}
    </PageShell>
  );
}
