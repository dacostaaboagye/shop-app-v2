"use client";

import type {
  LocationStaffSummary,
  VariantSearchResult,
} from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { usePermissionLocationScope } from "@/lib/authorization/use-permission-location-scope";
import { DEFAULT_OFFICIAL_DOCUMENT_PROFILE } from "@/lib/documents/official-document-profile";
import {
  fetchManagerStaff,
  managerStaffQueryKey,
} from "@/lib/react-query/manager-staff";
import {
  fetchOfficialDocumentProfile,
  officialDocumentProfileQueryKey,
} from "@/lib/react-query/official-documents";
import {
  locationAssignmentsQueryKey,
  postBatchAssignVariants,
} from "@/lib/react-query/worker-assignments";
import { toRoute } from "@/lib/routes";
import type { SelectedVariantEntry } from "./assignment-quantity-editor";
import {
  AssignmentQuantityStep,
  AssignmentSubmitPanel,
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
  const profileQuery = useQuery({
    enabled: !!selectedLocationScope,
    queryFn: () =>
      fetchOfficialDocumentProfile(selectedLocationScope?.locationId),
    queryKey: officialDocumentProfileQueryKey(
      selectedLocationScope?.locationId,
    ),
    staleTime: 5 * 60_000,
  });
  const moneyProfile = profileQuery.data ?? DEFAULT_OFFICIAL_DOCUMENT_PROFILE;

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
            moneyProfile={moneyProfile}
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

          <AssignmentSubmitPanel
            canSubmit={canSubmit}
            error={assignMutation.error}
            isError={assignMutation.isError}
            isPending={assignMutation.isPending}
            onSubmit={handleSubmit}
            selectedWorker={selectedWorker}
            variantCount={variantCount}
          />
        </div>
      )}
    </PageShell>
  );
}
