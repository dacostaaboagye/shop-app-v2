import { ReceiptText } from "lucide-react";
import { PlannedWorkspacePage } from "@/components/system/planned-workspace-page";

export default function AdminOrdersPage() {
  return (
    <PlannedWorkspacePage
      badge="Commerce Backlog"
      description="Review customer orders across all locations and sales channels from one central admin workspace."
      eyebrow="Orders"
      icon={ReceiptText}
      plannedDescription="Order search, fulfilment progress, status handling, and refund triggers will land here with the commerce backlog."
      plannedSummary="Platform-wide order operations"
      title="Customer Order Management"
    />
  );
}
