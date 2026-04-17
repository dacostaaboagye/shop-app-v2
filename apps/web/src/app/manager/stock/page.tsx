import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function ManagerStockPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Stock"
        title="Location stock levels and availability"
        description="Monitor inventory levels, available stock, and low-stock thresholds for your assigned location. Live stock data lands with the inventory backlog."
        badges={["E-00B"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Real-time stock visibility"
            description="Per-variant availability, reservation pressure, and restocking alerts will surface here for location managers."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires <code className="text-xs">stock.view</code>{" "}
              permission and is scoped to your assigned location.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
