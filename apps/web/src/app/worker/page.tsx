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
        title="Daily operations"
        description="Review assigned stock, current sales activity, and operational updates from the team before moving into POS, assignment, or handover work."
        badges={["Location-scoped workflow"]}
        aside={
          <InsightCard
            eyebrow="Production focus"
            title="Sales And Alerts"
            description="The worker landing view now prioritizes real work signals instead of placeholder overview copy."
          >
            <p className="text-sm text-muted-foreground">
              Use the active location scope to monitor assigned variants,
              same-day sales, and unread notifications before starting the next
              task.
            </p>
          </InsightCard>
        }
      />

      <WorkerDashboardOverview />
    </PageShell>
  );
}
