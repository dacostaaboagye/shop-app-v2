import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function WorkerHandoversPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Handovers"
        title="Ownership handover records"
        description="Transfers of stock custody you have initiated or received. Full handover workflows land with the worker task backlog."
        badges={["Worker backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Handover history and pending requests"
            description="Pending handovers awaiting your acceptance, and a history of completed transfers, will be centralised here."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires{" "}
              <code className="text-xs">worker.handovers.view</code> permission
              and shows only your handover activity.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
