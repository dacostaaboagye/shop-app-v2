import type { AuthLocationPermissionScope } from "@shop/contracts";
import { LocationScopePanel } from "@/components/system/location-scope-panel";

type Props = {
  isLoading: boolean;
  locationScopes: AuthLocationPermissionScope[];
  selectedLocationSlug: string;
  onLocationChange: (value: string) => void;
};

export function AdminSalesScopePanel({
  isLoading,
  locationScopes,
  selectedLocationSlug,
  onLocationChange,
}: Props) {
  return (
    <LocationScopePanel
      allOptionLabel="All visible shops"
      description="Stay at all shops to review network invoices, or isolate one location for shop-level finance follow-up."
      emptyDescription="No sales locations are available for your current access."
      isLoading={isLoading}
      locationScopes={locationScopes}
      onLocationChange={onLocationChange}
      selectedLocationSlug={selectedLocationSlug}
      title="Ledger scope"
    />
  );
}
