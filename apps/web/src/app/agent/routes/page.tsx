import { MapPinned } from "lucide-react";
import { PlannedWorkspacePage } from "@/components/system/planned-workspace-page";

export default function AgentRoutesPage() {
  return (
    <PlannedWorkspacePage
      badge="Delivery Backlog"
      description="Follow your assigned delivery route from one guided workspace with stop sequence and route context."
      eyebrow="Routes"
      icon={MapPinned}
      plannedDescription="Route maps, stop order, customer details, and navigation tools will appear here when delivery routing ships."
      plannedSummary="Route map and stop sequence"
      title="Assigned Delivery Route"
    />
  );
}
