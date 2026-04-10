import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function ManagerTransfersPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Transfers"
        title="Stock transfers for this location"
        description="View inbound and outbound stock transfers, confirm receipts, and initiate requests. Transfer management lands with the inventory backlog."
        badges={["Inventory backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Inbound and outbound transfers"
            description="Transfer requests, confirmation workflows, and transit tracking will be available for managers at their assigned location."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">transfers.view</code> permission and is
              scoped to your assigned location.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
