import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function WorkerTransfersPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Transfers"
        title="Stock transfers"
        description="Inbound and outbound stock transfers relevant to your location. Transfer workflows land with the operations backlog."
        badges={["Operations backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Transfer activity"
            description="Pending, in-progress, and completed transfers for your assigned location will appear here."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">transfers.view</code> permission and
              shows transfers for your assigned location only.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
