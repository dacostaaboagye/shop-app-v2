import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function AdminOrdersPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Orders"
        title="Platform-wide order management"
        description="View, filter, and manage customer orders across all locations and channels. Full order lifecycle support lands with the commerce backlog."
        badges={["Commerce backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Orders across all channels"
            description="Order search, status tracking, fulfilment state, and refund triggers will be available here."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires <code className="text-xs">orders.view</code>{" "}
              permission and is visible only to admin roles.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
