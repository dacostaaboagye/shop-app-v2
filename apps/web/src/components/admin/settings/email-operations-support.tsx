"use client";

import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/display/format";

export function EmailDeliveryStatusBadge({ status }: { status: string }) {
  if (status === "delivered") {
    return <Badge variant="secondary">Delivered</Badge>;
  }

  if (
    status === "bounced" ||
    status === "complained" ||
    status === "suppressed" ||
    status === "failed"
  ) {
    return <Badge variant="destructive">{formatDeliveryStatus(status)}</Badge>;
  }

  return <Badge variant="outline">{formatDeliveryStatus(status)}</Badge>;
}

export function formatDeliveryStatus(status: string) {
  switch (status) {
    case "sent":
      return "Accepted by provider";
    case "delivered":
      return "Delivered";
    case "delayed":
      return "Delivery delayed";
    case "bounced":
      return "Bounced";
    case "complained":
      return "Complained";
    case "suppressed":
      return "Suppressed";
    case "console_fallback":
      return "Console fallback";
    case "failed":
      return "Failed";
    default:
      return status.replaceAll("_", " ");
  }
}

export function formatEmailTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return formatDateTime(value) ?? "Not set";
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
