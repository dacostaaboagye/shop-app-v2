import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

export default function ManagerStaffPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Staff"
        title="Team at this location"
        description="View workers and managers assigned to your location, along with their current status and task load. Staff management lands with the people backlog."
        badges={["People backlog"]}
        aside={
          <InsightCard
            eyebrow="Planned scope"
            title="Location-scoped staff visibility"
            description="Active workers, their assigned stock tasks, and shift coverage will be visible to managers from this surface."
          >
            <p className="text-sm text-muted-foreground">
              This surface requires <code className="text-xs">staff.view</code>{" "}
              permission and is scoped to your assigned location.
            </p>
          </InsightCard>
        }
      />
    </PageShell>
  );
}
