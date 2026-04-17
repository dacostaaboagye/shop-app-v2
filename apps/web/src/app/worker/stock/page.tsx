import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function WorkerStockPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Stock"
        title="Stock at your location"
        description="Current stock levels and item availability at your assigned location. Full stock visibility lands with the operations backlog."
        badges={["Operations backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Location stock levels"
            description="Item counts, availability status, and zone breakdowns for your assigned location will appear here."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires <code className="text-xs">stock.view</code>{" "}
              permission and shows stock for your assigned location only.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
