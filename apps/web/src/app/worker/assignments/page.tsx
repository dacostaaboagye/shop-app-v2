import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function WorkerAssignmentsPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Assignments"
        title="Your assigned stock"
        description="Stock items currently in your custody and awaiting action. Full assignment workflows land with the worker task backlog."
        badges={["Worker backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Stock in your custody"
            description="Items assigned to you, their current state, and the actions available at each step will appear here."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">worker.assignments.view</code>{" "}
              permission and shows only your assigned stock.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
