"use client";

import type {
  LocationStaffSummary,
  VariantSearchResult,
} from "@shop/contracts";
import { AppErrorBanner } from "@/components/system/app-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/display/format";
import type { MoneyProfile } from "@/lib/money/format-money";
import {
  AssignmentQuantityEditor,
  type SelectedVariantEntry,
} from "./assignment-quantity-editor";
import { AssignmentVariantList } from "./assignment-variant-list";
import { AssignmentWorkerGrid } from "./assignment-worker-grid";

const STAFF_SKELETON_KEYS = [1, 2, 3, 4];

export function AssignmentWorkerStep({
  activeWorkers,
  error,
  isError,
  isPending,
  onRetry,
  onSelect,
  selectedWorker,
}: {
  activeWorkers: LocationStaffSummary[];
  error: unknown;
  isError: boolean;
  isPending: boolean;
  onRetry: () => void;
  onSelect: (worker: LocationStaffSummary | null) => void;
  selectedWorker: LocationStaffSummary | null;
}) {
  return (
    <section className="flex flex-col gap-3">
      <StepHeading
        description="Choose who will take ownership of the assigned stock."
        title="1. Select worker"
      />
      {isPending ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {STAFF_SKELETON_KEYS.map((key) => (
            <Skeleton className="h-28 w-full rounded-lg" key={key} />
          ))}
        </div>
      ) : isError ? (
        <AppErrorBanner
          detail="Could not load staff for this location."
          error={error}
          onRetry={onRetry}
          title="Unable to load workers"
        />
      ) : (
        <AssignmentWorkerGrid
          onSelect={onSelect}
          selected={selectedWorker}
          workers={activeWorkers}
        />
      )}
    </section>
  );
}

export function AssignmentVariantStep({
  locationId,
  moneyProfile,
  onToggle,
  selectedIds,
  variantCount,
}: {
  locationId: string;
  moneyProfile: MoneyProfile;
  onToggle: (variant: VariantSearchResult) => void;
  selectedIds: Set<string>;
  variantCount: number;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <StepHeading
          description="Search and check the product variants to include."
          title="2. Select variants"
        />
        {variantCount > 0 ? (
          <Badge>{formatCount(variantCount)} selected</Badge>
        ) : null}
      </div>
      <AssignmentVariantList
        locationId={locationId}
        moneyProfile={moneyProfile}
        onToggle={onToggle}
        selectedIds={selectedIds}
      />
    </section>
  );
}

export function AssignmentQuantityStep({
  entries,
  onQuantityChange,
  onRemove,
  variantCount,
}: {
  entries: SelectedVariantEntry[];
  onQuantityChange: (skuId: string, quantity: number) => void;
  onRemove: (skuId: string) => void;
  variantCount: number;
}) {
  if (variantCount <= 0) return null;

  return (
    <section className="flex flex-col gap-3">
      <StepHeading
        description="Confirm how many units of each variant to assign."
        title="3. Set quantities"
      />
      <AssignmentQuantityEditor
        entries={entries}
        onQuantityChange={onQuantityChange}
        onRemove={onRemove}
      />
    </section>
  );
}

export function AssignmentSubmitPanel({
  canSubmit,
  error,
  isError,
  isPending,
  onSubmit,
  selectedWorker,
  variantCount,
}: {
  canSubmit: boolean;
  error: unknown;
  isError: boolean;
  isPending: boolean;
  onSubmit: () => void;
  selectedWorker: LocationStaffSummary | null;
  variantCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-4">
      {isError ? (
        <AppErrorBanner
          detail={
            error instanceof Error
              ? error.message
              : "Assignment failed. Check that the selected variants are not already assigned to this worker."
          }
          error={error}
          onRetry={onSubmit}
          title="Assignment failed"
        />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="type-support">
          {getSubmitSummary(selectedWorker, variantCount)}
        </p>
        <Button disabled={!canSubmit} onClick={onSubmit} type="button">
          {getSubmitLabel(selectedWorker, isPending)}
        </Button>
      </div>
    </div>
  );
}

function StepHeading({
  description,
  title,
}: {
  description: string;
  title: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="feedback-title">{title}</h2>
      <p className="feedback-description">{description}</p>
    </div>
  );
}

function getSubmitSummary(
  selectedWorker: LocationStaffSummary | null,
  variantCount: number,
) {
  if (selectedWorker && variantCount > 0) {
    return `Assigning ${formatCount(variantCount)} variant${variantCount !== 1 ? "s" : ""} to ${selectedWorker.firstName} ${selectedWorker.lastName}.`;
  }

  return selectedWorker
    ? "Select at least one variant to continue."
    : "Select a worker and variants to continue.";
}

function getSubmitLabel(
  selectedWorker: LocationStaffSummary | null,
  isPending: boolean,
) {
  if (isPending) return "Assigning...";
  return selectedWorker ? `Assign to ${selectedWorker.firstName}` : "Assign";
}
