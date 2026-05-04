"use client";

import { AppEmptyState } from "@/components/system/app-empty-state";
import { LocationScopePanel } from "@/components/system/location-scope-panel";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { useActiveLocationScope } from "@/lib/authorization/use-active-location-scope";
import { StockTakeSheetCard } from "./stock-take-sheet-card";

export function ManagerStockTakeGenerationPageClient() {
  const {
    accessibleLocationScopes,
    isLoading,
    selectedLocationScope,
    selectedLocationSlug,
    setSelectedLocationSlug,
  } = useActiveLocationScope("inventory.write");
  const locationOptions = accessibleLocationScopes.map((location) => ({
    name: location.locationName,
    slug: location.locationSlug,
  }));

  return (
    <PageShell>
      <PageHeader
        description="Generate blind or assisted stock-take sheets for your managed location."
        title="Stock-take sheets"
      />

      <LocationScopePanel
        description="Sheet generation follows the write access linked to your manager location scope."
        emptyDescription="No managed location is available for stock-take generation."
        isLoading={isLoading}
        locationScopes={accessibleLocationScopes}
        onLocationChange={setSelectedLocationSlug}
        selectedLocationSlug={selectedLocationSlug}
        title="Managed location"
      />

      {selectedLocationScope ? (
        <StockTakeSheetCard
          initialLocationSlug={selectedLocationScope.locationSlug}
          key={selectedLocationScope.locationSlug}
          locationControl="fixed"
          locations={locationOptions}
          portal="manager"
        />
      ) : (
        <AppEmptyState
          description="Choose a managed location with inventory write access to generate a count sheet."
          title="No location selected"
        />
      )}
    </PageShell>
  );
}
