import type { StockSupplyRequestResponse } from "@shop/contracts";
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  type LucideIcon,
  PackageCheck,
  XCircle,
} from "lucide-react";

type StatusAccent = {
  badge: string;
  bar: string;
  border: string;
  icon: string;
};

export type SupplyRequestStatusPresentation = {
  accent: StatusAccent;
  icon: LucideIcon;
  label: string;
};

export function getSupplyRequestStatusPresentation(
  status: StockSupplyRequestResponse["status"],
): SupplyRequestStatusPresentation {
  switch (status) {
    case "approved":
      return {
        accent: successAccent(),
        icon: CheckCircle2,
        label: "Approved",
      };
    case "dispatched":
      return {
        accent: {
          badge: "bg-primary/10 text-primary",
          bar: "bg-primary",
          border: "border-primary/30",
          icon: "bg-primary/10 text-primary",
        },
        icon: ArrowRight,
        label: "In transit",
      };
    case "received":
      return {
        accent: successAccent(),
        icon: PackageCheck,
        label: "Received",
      };
    case "rejected":
      return {
        accent: {
          badge: "bg-destructive/10 text-destructive",
          bar: "bg-destructive",
          border: "border-destructive/30 dark:border-destructive/20",
          icon: "bg-destructive/10 text-destructive",
        },
        icon: XCircle,
        label: "Rejected",
      };
    case "cancelled":
      return {
        accent: {
          badge: "bg-muted text-muted-foreground dark:bg-muted/30",
          bar: "bg-muted-foreground/40",
          border: "border-border",
          icon: "bg-muted text-muted-foreground dark:bg-muted/30",
        },
        icon: XCircle,
        label: "Cancelled",
      };
    default:
      return {
        accent: {
          badge: "bg-warning/20 text-warning-foreground",
          bar: "bg-warning",
          border: "border-warning/30",
          icon: "bg-warning/20 text-warning-foreground",
        },
        icon: Clock,
        label: "Pending",
      };
  }
}

export function formatReservationStatusLabel(
  status: StockSupplyRequestResponse["sourceReservationStatus"],
) {
  switch (status) {
    case "active":
      return "Reserved at source";
    case "confirmed":
      return "Consumed on dispatch";
    case "released":
      return "Released";
    case "cancelled":
      return "Cancelled";
    case "expired":
      return "Expired";
    default:
      return "Not reserved";
  }
}

function successAccent() {
  return {
    badge: "bg-success/10 text-success",
    bar: "bg-success",
    border: "border-success/30",
    icon: "bg-success/10 text-success",
  };
}
