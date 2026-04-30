import { PageShell } from "@/components/system/page-shell";
import { WorkerDashboardOverview } from "@/components/worker/worker-dashboard-overview";

export default function WorkerPage() {
  return (
    <PageShell>
      <WorkerDashboardOverview />
    </PageShell>
  );
}
