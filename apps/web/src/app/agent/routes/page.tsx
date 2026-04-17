import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function AgentRoutesPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Routes"
        title="Your delivery route"
        description="The optimised stop sequence for your assigned delivery run. Route maps and navigation tools land with the delivery backlog."
        badges={["Delivery backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Route map and stop sequence"
            description="Your delivery route, stop order, customer details, and navigation links will be available here once delivery routing ships."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">agent.routes.view</code> permission and
              is scoped to your agent assignment.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
