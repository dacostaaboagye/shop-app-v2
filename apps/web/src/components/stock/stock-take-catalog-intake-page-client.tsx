"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, PackagePlus } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppEmptyState } from "@/components/system/app-empty-state";
import { AppErrorBanner, AppErrorState } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminBrandsQueryKey,
  adminCategoriesQueryKey,
  fetchAdminBrands,
  fetchAdminCategories,
} from "@/lib/react-query/admin-catalog";
import {
  fetchStockTakeDetail,
  type StockTakePortal,
  stockTakeQueryKey,
} from "@/lib/react-query/stock-takes";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";
import {
  type CatalogIntakeCreatedDraft,
  getDefaultCatalogIntakeDraft,
  getManualStockTakeLines,
} from "./stock-take-catalog-intake.support";
import { StockTakeCatalogIntakeForm } from "./stock-take-catalog-intake-form";
import { ManualLinePicker } from "./stock-take-catalog-intake-line-picker";
import { StockTakeCatalogStockAction } from "./stock-take-catalog-stock-action";

const ALL_REFERENCE_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

type StockTakeCatalogIntakePageClientProps = {
  portal: StockTakePortal;
  reference: string;
};

export function StockTakeCatalogIntakePageClient({
  portal,
  reference,
}: StockTakeCatalogIntakePageClientProps) {
  const router = useRouter();
  const [selectedLineNumber, setSelectedLineNumber] = useState<number | null>(
    null,
  );
  const [createdDraftsByLine, setCreatedDraftsByLine] = useState<
    Record<number, CatalogIntakeCreatedDraft>
  >({});
  const detailQuery = useQuery({
    queryFn: () => fetchStockTakeDetail(portal, reference),
    queryKey: stockTakeQueryKey(portal, reference),
  });
  const brandsQuery = useQuery({
    queryFn: () => fetchAdminBrands(ALL_REFERENCE_QUERY),
    queryKey: adminBrandsQueryKey(ALL_REFERENCE_QUERY),
  });
  const categoriesQuery = useQuery({
    queryFn: () => fetchAdminCategories(ALL_REFERENCE_QUERY),
    queryKey: adminCategoriesQueryKey(ALL_REFERENCE_QUERY),
  });
  const backHref = getReviewHref(portal, reference);

  return (
    <PageShell>
      <PageHeader
        actions={
          <Link
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            href={backHref}
          >
            <ArrowLeft data-icon="inline-start" />
            Review count
          </Link>
        }
        backHref={backHref}
        backLabel="Stock-take review"
        description="Complete missing catalog defaults from manual blank rows. Created records stay archived until catalog review activates them."
        eyebrow="Catalog intake drafts"
        title={reference}
      />

      {detailQuery.isPending ? (
        <CatalogIntakeSkeleton />
      ) : detailQuery.isError ? (
        <AppErrorState
          detail="The stock-take could not be loaded for catalog intake."
          error={detailQuery.error}
          onRetry={() => void detailQuery.refetch()}
          title="Catalog intake unavailable"
        />
      ) : (
        <CatalogIntakeWorkspace
          brands={brandsQuery.data?.items ?? []}
          canCreate={!getDisabledReason(detailQuery.data.status)}
          categories={categoriesQuery.data?.items ?? []}
          disabledReason={getDisabledReason(detailQuery.data.status)}
          locationName={detailQuery.data.locationName}
          locationSlug={detailQuery.data.locationSlug}
          manualLines={getManualStockTakeLines(detailQuery.data.lines)}
          onBack={() => router.push(backHref)}
          onDraftCreated={(draft) => {
            setCreatedDraftsByLine((current) => ({
              ...current,
              [draft.lineNumber]: draft,
            }));
          }}
          referenceError={brandsQuery.error ?? categoriesQuery.error ?? null}
          onRetryReferences={() => {
            void brandsQuery.refetch();
            void categoriesQuery.refetch();
          }}
          selectedLineNumber={selectedLineNumber}
          setSelectedLineNumber={setSelectedLineNumber}
          createdDraftsByLine={createdDraftsByLine}
          portal={portal}
          reference={reference}
        />
      )}
    </PageShell>
  );
}

function CatalogIntakeWorkspace({
  brands,
  canCreate,
  categories,
  createdDraftsByLine,
  disabledReason,
  locationName,
  locationSlug,
  manualLines,
  onBack,
  onDraftCreated,
  onRetryReferences,
  portal,
  reference,
  referenceError,
  selectedLineNumber,
  setSelectedLineNumber,
}: {
  brands: { name: string; slug: string }[];
  canCreate: boolean;
  categories: { name: string; slug: string }[];
  createdDraftsByLine: Record<number, CatalogIntakeCreatedDraft>;
  disabledReason: string | null;
  locationName: string;
  locationSlug: string;
  manualLines: ReturnType<typeof getManualStockTakeLines>;
  onBack: () => void;
  onDraftCreated: (draft: CatalogIntakeCreatedDraft) => void;
  onRetryReferences: () => void;
  portal: StockTakePortal;
  reference: string;
  referenceError: unknown;
  selectedLineNumber: number | null;
  setSelectedLineNumber: (lineNumber: number) => void;
}) {
  const selectedLine =
    manualLines.find((line) => line.lineNumber === selectedLineNumber) ??
    manualLines[0] ??
    null;

  if (manualLines.length === 0) {
    return (
      <AppEmptyState
        action={
          <Button onClick={onBack} size="lg" type="button">
            Back to stock-take review
          </Button>
        }
        description="This stock-take has no manual blank rows waiting for catalog intake."
        icon={PackagePlus}
        title="No catalog intake rows"
      />
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <ManualLinePicker
        lines={manualLines}
        selectedLineNumber={selectedLine?.lineNumber ?? null}
        onSelect={setSelectedLineNumber}
      />
      <div className="flex min-w-0 flex-col gap-4">
        {referenceError ? (
          <AppErrorBanner
            detail="Brand and category choices could not be loaded. You can retry before creating the draft."
            error={referenceError}
            onRetry={onRetryReferences}
            title="Reference data unavailable"
          />
        ) : null}
        {selectedLine ? (
          <StockTakeCatalogIntakeForm
            brands={brands}
            canCreate={canCreate}
            categories={categories}
            disabledReason={disabledReason}
            draft={getDefaultCatalogIntakeDraft(selectedLine)}
            onCancel={onBack}
            onDraftCreated={onDraftCreated}
          />
        ) : null}
        {selectedLine ? (
          <StockTakeCatalogStockAction
            createdDraft={createdDraftsByLine[selectedLine.lineNumber] ?? null}
            disabledReason={disabledReason}
            line={selectedLine}
            locationName={locationName}
            locationSlug={locationSlug}
            portal={portal}
            reference={reference}
          />
        ) : null}
      </div>
    </div>
  );
}

function CatalogIntakeSkeleton() {
  return (
    <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <Skeleton className="h-96 rounded-xl" />
      <Skeleton className="h-[40rem] rounded-xl" />
    </div>
  );
}

function getDisabledReason(status: string) {
  if (status === "applied") {
    return "This stock-take has already been applied.";
  }
  if (status === "cancelled") {
    return "This stock-take was cancelled.";
  }
  return null;
}

function getReviewHref(portal: StockTakePortal, reference: string): Route {
  return toRoute(`/${portal}/stock/takes/${encodeURIComponent(reference)}`);
}
