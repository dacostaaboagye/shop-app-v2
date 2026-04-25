import type { LucideIcon } from "lucide-react";
import { Clock3 } from "lucide-react";
import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

type PlannedWorkspacePageProps = {
  badge?: string;
  description: string;
  eyebrow: string;
  icon?: LucideIcon;
  plannedDescription: string;
  plannedEyebrow?: string;
  plannedSummary: string;
  title: string;
};

export function PlannedWorkspacePage({
  badge = "Planned",
  description,
  eyebrow,
  icon: Icon = Clock3,
  plannedDescription,
  plannedEyebrow = "Planned Scope",
  plannedSummary,
  title,
}: PlannedWorkspacePageProps) {
  return (
    <PageShell>
      <HeroPanel
        aside={
          <InsightCard
            description={plannedDescription}
            eyebrow={plannedEyebrow}
            title={plannedSummary}
          >
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/25 p-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Icon className="size-4" />
              </div>
              <p className="type-support">
                This workspace is reserved for the next commerce slice. The page
                will move to live operational data once the supporting backlog
                lands.
              </p>
            </div>
          </InsightCard>
        }
        badges={[badge]}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />
    </PageShell>
  );
}
