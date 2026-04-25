"use client";

import type { LocationAssignmentSummary } from "@shop/contracts";

export function formatAssignmentEventLabel(
  eventType: LocationAssignmentSummary["eventType"],
) {
  switch (eventType) {
    case "assigned":
      return "Assigned";
    case "reassigned":
      return "Reassigned";
    case "handover_in":
      return "Handover in";
  }
}

export function formatActiveItemLabel(count: number) {
  return `${count} active ${count === 1 ? "item" : "items"}`;
}
