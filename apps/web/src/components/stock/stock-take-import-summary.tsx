import { CheckCircle2, FileWarning } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { StockTakeImportDryRunResponse } from "@/lib/react-query/stock-takes";
import {
  buildSummaryStats,
  buildVarianceStats,
  getDryRunReadinessMessage,
} from "./stock-take-import-review.support";

type StockTakeImportSummaryProps = {
  dryRun: StockTakeImportDryRunResponse;
};

export function StockTakeImportSummary({
  dryRun,
}: StockTakeImportSummaryProps) {
  const Icon = dryRun.canApply ? CheckCircle2 : FileWarning;

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Preview only</Badge>
          <Badge variant={dryRun.canApply ? "default" : "destructive"}>
            {dryRun.canApply ? "Ready for apply review" : "Needs correction"}
          </Badge>
        </div>
        <CardTitle className="flex items-center gap-2">
          <Icon className="size-4 text-primary" />
          Dry-run summary
        </CardTitle>
        <CardDescription>
          No stock has changed. {getDryRunReadinessMessage(dryRun)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {buildSummaryStats(dryRun.summary).map((stat) => (
            <SummaryStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {buildVarianceStats(dryRun.summary).map((stat) => (
            <SummaryStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
      <p className="type-support text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">
        {formatQuantity(value)}
      </p>
    </div>
  );
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(value);
}
