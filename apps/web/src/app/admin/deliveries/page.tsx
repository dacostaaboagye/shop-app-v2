import { Truck } from "lucide-react";
import { PlannedWorkspacePage } from "@/components/system/planned-workspace-page";

export default function AdminDeliveriesPage() {
  return (
    <PlannedWorkspacePage
      badge="Commerce Backlog"
      description="Monitor delivery activity, agent assignments, and fulfilment progress across every active location."
      eyebrow="Deliveries"
      icon={Truck}
      plannedDescription="Delivery tracking, agent assignment, and fulfilment updates will be centralized here once the commerce delivery slice lands."
      plannedSummary="Platform-wide delivery operations"
      title="Delivery Oversight"
    />
  );
}
