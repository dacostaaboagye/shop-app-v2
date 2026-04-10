import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function AdminDeliveriesPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Deliveries"
        title="Platform-wide delivery operations"
        description="Monitor active deliveries, agent assignments, and fulfilment status across all locations. Full delivery management lands with the commerce backlog."
        badges={["Commerce backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Deliveries across all locations"
            description="Delivery tracking, agent assignment, and status updates will be centralised here for admin oversight."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">deliveries.view</code> permission and is
              visible only to admin roles.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
