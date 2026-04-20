"use client";

import type {
  LocationStaffSummary,
  VariantSearchResult,
} from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import {
  fetchManagerStaff,
  managerStaffQueryKey,
} from "@/lib/react-query/manager-staff";
import {
  locationAssignmentsQueryKey,
  postBatchAssignVariants,
} from "@/lib/react-query/worker-assignments";
import { toRoute } from "@/lib/routes";
import type { SelectedVariantEntry } from "./assignment-quantity-editor";
import {
  AssignmentQuantityStep,
  AssignmentVariantStep,
  AssignmentWorkerStep,
} from "./new-assignment-sections";

export function NewAssignmentPageClient() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    accessibleLocationScopes,
    isLoading: locationLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = usePermissionLocationScope("stock.assignments.manage");

  const [selectedWorker, setSelectedWorker] =
    useState<LocationStaffSummary | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<
    Map<string, SelectedVariantEntry>
  >(new Map());

  const staffQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () => {
      if (!selectedLocationScope) {
        throw new Error("An assignment location is required.");
      }
      return fetchManagerStaff(selectedLocationScope.locationId);
    },
    queryKey: managerStaffQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 60_000,
  });

  const activeWorkers = useMemo(
    () => (staffQuery.data?.items ?? []).filter((m) => m.status === "active"),
    [staffQuery.data?.items],
  );

  const selectedIds = useMemo(
    () => new Set(selectedVariants.keys()),
    [selectedVariants],
  );

  const quantityEntries = useMemo(
    () => Array.from(selectedVariants.values()),
    [selectedVariants],
  );

  const toggleVariant = useCallback((variant: VariantSearchResult) => {
    setSelectedVariants((prev) => {
      const next = new Map(prev);
      if (next.has(variant.variantId)) {
        next.delete(variant.variantId);
      } else {
        next.set(variant.variantId, { quantity: 1, variant });
      }
      return next;
    });
  }, []);

  const updateQuantity = useCallback((skuId: string, quantity: number) => {
    setSelectedVariants((prev) => {
      const next = new Map(prev);
      const entry = next.get(skuId);
      if (entry) next.set(skuId, { ...entry, quantity: Math.max(1, quantity) });
      return next;
    });
  }, []);

  const removeVariant = useCallback((skuId: string) => {
    setSelectedVariants((prev) => {
      const next = new Map(prev);
      next.delete(skuId);
      return next;
    });
  }, []);

  const assignMutation = useMutation({
    mutationFn: postBatchAssignVariants,
    onSuccess: () => {
      if (selectedLocationScope) {
        void queryClient.invalidateQueries({
          queryKey: locationAssignmentsQueryKey(
            selectedLocationScope.locationId,
          ),
        });
        void queryClient.invalidateQueries({
          queryKey: managerStaffQueryKey(selectedLocationScope.locationId),
        });
      }
      router.push(
        toRoute(
          `/manager/assignments${selectedLocationSlug ? `?location=${selectedLocationSlug}` : ""}`,
        ),
      );
    },
  });

  function handleSubmit() {
    if (
      !selectedWorker ||
      !selectedLocationScope ||
      selectedVariants.size === 0
    )
      return;
    assignMutation.mutate({
      items: quantityEntries.map(({ variant, quantity }) => ({
        quantity,
        skuId: variant.variantId,
      })),
      locationId: selectedLocationScope.locationId,
      workerId: selectedWorker.userId,
    });
  }

  const canSubmit =
    !!selectedWorker && selectedVariants.size > 0 && !assignMutation.isPending;

  const variantCount = selectedVariants.size;

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute(
          `/manager/assignments${selectedLocationSlug ? `?location=${selectedLocationSlug}` : ""}`,
        )}
        backLabel="Assignments"
        description="Select a worker, choose the variants to assign, then set quantities before confirming."
        title="New Stock Assignment"
      />

      <LocationScopePanel
        description="Assignment scope follows the managed locations linked to your access."
        emptyDescription="No managed location is available for stock assignments."
        isLoading={locationLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={(slug) => {
          setSelectedWorker(null);
          setSelectedVariants(new Map());
          setSelectedLocationSlug(slug);
        }}
        selectedLocationSlug={selectedLocationSlug}
        title="Assignment location"
      />

      {selectedLocationScope && (
        <div className="flex flex-col gap-8">
          <AssignmentWorkerStep
            activeWorkers={activeWorkers}
            error={staffQuery.error}
            isError={staffQuery.isError}
            isPending={staffQuery.isPending}
            onRetry={() => void staffQuery.refetch()}
            onSelect={setSelectedWorker}
            selectedWorker={selectedWorker}
          />

          <AssignmentVariantStep
            locationId={selectedLocationScope.locationId}
            onToggle={toggleVariant}
            selectedIds={selectedIds}
            variantCount={variantCount}
          />

          <AssignmentQuantityStep
            entries={quantityEntries}
            onQuantityChange={updateQuantity}
            onRemove={removeVariant}
            variantCount={variantCount}
          />

          {/* Submit */}
          <div className="flex flex-col gap-3 border-t border-border pt-4">
            {assignMutation.isError && (
              <AppErrorBanner
                detail={
                  assignMutation.error instanceof Error
                    ? assignMutation.error.message
                    : "Assignment failed. Check that the selected variants are not already assigned to this worker."
                }
                error={assignMutation.error}
                onRetry={handleSubmit}
                title="Assignment failed"
              />
            )}
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {selectedWorker && variantCount > 0
                  ? `Assigning ${variantCount} variant${variantCount !== 1 ? "s" : ""} to ${selectedWorker.firstName} ${selectedWorker.lastName}`
                  : selectedWorker
                    ? "Select at least one variant to continue."
                    : "Select a worker and variants to continue."}
              </p>
              <Button
                disabled={!canSubmit}
                onClick={handleSubmit}
                type="button"
              >
                {assignMutation.isPending
                  ? "Assigning…"
                  : selectedWorker
                    ? `Assign to ${selectedWorker.firstName}`
                    : "Assign"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
