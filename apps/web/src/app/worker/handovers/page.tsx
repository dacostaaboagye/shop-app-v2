import { HandCoins } from "lucide-react";
import { PlannedWorkspacePage } from "@/components/system/planned-workspace-page";

export default function WorkerHandoversPage() {
  return (
    <PlannedWorkspacePage
      badge="Worker Backlog"
      description="Review stock custody transfers you initiated or received from one focused worker workspace."
      eyebrow="Handovers"
      icon={HandCoins}
      plannedDescription="Pending handovers awaiting your acceptance, plus a history of completed custody transfers, will appear here when the worker handover slice lands."
      plannedSummary="Handover history and pending requests"
      title="Stock Handover Activity"
    />
  );
}
