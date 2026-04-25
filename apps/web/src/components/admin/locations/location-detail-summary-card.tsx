import type { AdminLocationSummary } from "@shop/contracts";
import { Building2, Store, Warehouse } from "lucide-react";
import {
  CatalogDetailRow,
  CatalogDetailsCard,
} from "@/components/admin/catalog/catalog-detail-surfaces";
import { Badge } from "@/components/ui/badge";
import { LOCATION_STATUS_META, LOCATION_TYPE_META } from "@/lib/admin-models";
import { cn } from "@/lib/utils";

export function LocationDetailSummaryCard({
  location,
}: {
  location: AdminLocationSummary;
}) {
  const statusMeta = LOCATION_STATUS_META[location.status];
  const typeMeta = LOCATION_TYPE_META[location.type];
  const TypeIcon = location.type === "store" ? Store : Warehouse;

  return (
    <CatalogDetailsCard
      columnsClassName="sm:grid-cols-2"
      title="Location details"
    >
      <CatalogDetailRow label="Name" value={location.name} />
      <CatalogDetailRow
        label="Type"
        value={
          <Badge
            className={cn("w-fit gap-1.5", typeMeta.className)}
            variant="outline"
          >
            <TypeIcon className="size-3" />
            {typeMeta.label}
          </Badge>
        }
      />
      <CatalogDetailRow
        label="Status"
        value={
          <Badge
            className={cn("w-fit", statusMeta.className)}
            variant="outline"
          >
            {statusMeta.label}
          </Badge>
        }
      />
      <CatalogDetailRow
        label="Fulfilment"
        value={
          location.isFulfilmentEnabled ? (
            <Badge className="w-fit gap-1.5" variant="secondary">
              <Building2 className="size-3" />
              Enabled
            </Badge>
          ) : (
            <span className="type-support text-muted-foreground">Disabled</span>
          )
        }
      />
      <CatalogDetailRow label="Slug" tone="identifier" value={location.slug} />
      <CatalogDetailRow
        label="Manager"
        tone={location.managerName ? "default" : "support"}
        value={location.managerName ?? "Unassigned"}
      />
      {location.address ? (
        <CatalogDetailRow
          className="sm:col-span-2"
          label="Address"
          tone="support"
          value={location.address}
        />
      ) : null}
    </CatalogDetailsCard>
  );
}
