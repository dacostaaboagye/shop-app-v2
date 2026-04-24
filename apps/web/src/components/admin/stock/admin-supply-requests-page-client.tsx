"use client";

import { LocationSupplyRequestsPageClient } from "@/components/stock/location-supply-requests-page-client";

export function AdminSupplyRequestsPageClient() {
  return (
    <LocationSupplyRequestsPageClient
      emptyLocationDescription="No active location scopes are available for supply request management."
      locationPanelDescription="Select the location context to inspect its restocking requests and act on requests sourced from that location."
      locationPanelTitle="Supply operations scope"
      pageDescription="Inspect supply requests for the selected location and manage dispatch decisions without leaving the supply workspace."
      pageTitle="Supply requests"
    />
  );
}
