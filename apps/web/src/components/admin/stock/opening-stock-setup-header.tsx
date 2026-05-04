import { ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  blockedCount: number;
  locationName: string;
  readyCount: number;
};

export function OpeningStockSetupHeader({
  blockedCount,
  locationName,
  readyCount,
}: Props) {
  return (
    <CardHeader className="border-b border-border/50 bg-muted/20">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            Set opening stock
          </CardTitle>
          <CardDescription>
            Search products at {locationName || "this location"}, select one,
            confirm its physical opening quantity, then review before saving.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{readyCount} ready</Badge>
          <Badge variant={blockedCount > 0 ? "destructive" : "outline"}>
            {blockedCount} needs fixing
          </Badge>
        </div>
      </div>
    </CardHeader>
  );
}
