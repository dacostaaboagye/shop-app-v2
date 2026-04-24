import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";
import { WorkerDashboardOverview } from "@/components/worker/worker-dashboard-overview";

export default function WorkerPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Worker portal"
        title="Focused operational hub"
        description="Workers need a narrower, faster workspace centered on individual responsibility. This hub provides real-time status and quick access to core tasks."
        badges={["High-precision workspace"]}
        aside={
          <InsightCard
            eyebrow="Redesigned"
            title="Premium Efficiency"
            description="The worker surface is now optimized for rapid execution with high-fidelity components."
          >
            <p className="text-sm text-muted-foreground">
              This focused view minimizes noise, allowing you to prioritize
              sales, assignments, and stock handovers.
            </p>
          </InsightCard>
        }
      />

      <WorkerDashboardOverview />
    </PageShell>
  );
}
