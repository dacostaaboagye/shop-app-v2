"use client";

import type { LocationStaffSummary, VariantSearchResult } from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { AssignmentQuantityEditor } from "./assignment-quantity-editor";
import type { SelectedVariantEntry } from "./assignment-quantity-editor";
import { AssignmentVariantList } from "./assignment-variant-list";
import { AssignmentWorkerGrid } from "./assignment-worker-grid";

const STAFF_SKELETON_KEYS = [1, 2, 3, 4];

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
    queryFn: () => fetchManagerStaff(selectedLocationScope!.locationId),
    queryKey: managerStaffQueryKey(selectedLocationScope?.locationId ?? ""),
    staleTime: 60_000,
  });

  const activeWorkers = useMemo(
    () =>
      (staffQuery.data?.items ?? []).filter(
        (m) => m.status === "active",
      ),
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
          queryKey: locationAssignmentsQueryKey(selectedLocationScope.locationId),
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
    if (!selectedWorker || !selectedLocationScope || selectedVariants.size === 0)
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
    !!selectedWorker &&
    selectedVariants.size > 0 &&
    !assignMutation.isPending;

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
          {/* Step 1 */}
          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-base font-semibold">1. Select worker</h2>
              <p className="text-sm text-muted-foreground">
                Choose who will take ownership of the assigned stock.
              </p>
            </div>
            {staffQuery.isPending ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {STAFF_SKELETON_KEYS.map((k) => (
                  <Skeleton className="h-28 w-full rounded-lg" key={k} />
                ))}
              </div>
            ) : staffQuery.isError ? (
              <AppErrorBanner
                detail="Could not load staff for this location."
                error={staffQuery.error}
                onRetry={() => void staffQuery.refetch()}
                title="Unable to load workers"
              />
            ) : (
              <AssignmentWorkerGrid
                onSelect={setSelectedWorker}
                selected={selectedWorker}
                workers={activeWorkers}
              />
            )}
          </section>

          {/* Step 2 */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">2. Select variants</h2>
                <p className="text-sm text-muted-foreground">
                  Search and check the product variants to include.
                </p>
              </div>
              {variantCount > 0 && (
                <span className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground">
                  {variantCount} selected
                </span>
              )}
            </div>
            <AssignmentVariantList
              locationId={selectedLocationScope.locationId}
              onToggle={toggleVariant}
              selectedIds={selectedIds}
            />
          </section>

          {/* Step 3 */}
          {variantCount > 0 && (
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-base font-semibold">3. Set quantities</h2>
                <p className="text-sm text-muted-foreground">
                  Confirm how many units of each variant to assign.
                </p>
              </div>
              <AssignmentQuantityEditor
                entries={quantityEntries}
                onQuantityChange={updateQuantity}
                onRemove={removeVariant}
              />
            </section>
          )}

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
