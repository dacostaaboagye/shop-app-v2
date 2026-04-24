"use client";

import { LocationSupplyRequestsPageClient } from "@/components/stock/location-supply-requests-page-client";

export function ManagerSupplyRequestsPageClient() {
  return (
    <LocationSupplyRequestsPageClient
      emptyLocationDescription="Assign a managed location before reviewing supply requests."
      locationPanelDescription="Choose the operating location whose inbound and outbound supply requests you want to review."
      locationPanelTitle="Operations location"
      pageDescription="Review inbound requests for the selected location and dispatch requests sourced from that location."
      pageTitle="Location supply requests"
    />
  );
}
