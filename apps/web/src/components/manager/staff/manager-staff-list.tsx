"use client";

import type { LocationStaffSummary } from "@shop/contracts";
import { AppTableWrapper } from "@/components/system/app-table-wrapper";
import { PersonAvatar } from "@/components/system/person-avatar";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { cn } from "@/lib/utils";

export function ManagerStaffList({
  items,
  locationName,
  moneyProfile,
}: {
  items: readonly LocationStaffSummary[];
  locationName: string;
  moneyProfile: MoneyProfile;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-dashed border-border/60 bg-muted/5 p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-foreground">No staff assigned</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground/80">
          Assign workers or managers to this location from admin access before
          managing stock ownership.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60">
        {locationName || "Location team"}
      </h3>
      <AppTableWrapper>
        {items.map((member, index) => (
          <div
            className={cn(
              "flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between",
              index !== items.length - 1 && "border-b border-border/50",
            )}
            key={`${member.userId}:${member.roleSlug}`}
          >
            <div className="flex min-w-0 items-start gap-4">
              <PersonAvatar
                firstName={member.firstName}
                imageUrl={member.primaryImageUrl}
                lastName={member.lastName}
                size="lg"
                className="ring-2 ring-border/5 shadow-sm"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-bold text-foreground">
                    {member.firstName} {member.lastName}
                  </p>
                  <Badge
                    className="rounded-md font-bold uppercase tracking-wider text-[10px]"
                    variant={
                      member.roleSlug === "manager" ? "secondary" : "outline"
                    }
                  >
                    {member.roleName}
                  </Badge>
                  <Badge
                    className="rounded-md font-bold uppercase tracking-wider text-[10px]"
                    variant="outline"
                  >
                    {member.status}
                  </Badge>
                </div>
                <p className="mt-1 text-sm font-medium text-muted-foreground/80">
                  {member.email}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  Assigned{" "}
                  {new Date(member.assignedAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:min-w-[32rem]">
              <StaffMetric
                label="Active stock"
                value={member.activeAssignmentCount}
              />
              <StaffMetric label="Sales" value={member.salesCount} />
              <StaffMetric
                label="Net sales"
                value={formatMoney(member.netSalesAmount, moneyProfile)}
              />
              <StaffMetric
                label="Last sale"
                value={
                  member.lastSaleAt
                    ? new Date(member.lastSaleAt).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                      })
                    : "None"
                }
              />
            </div>
          </div>
        ))}
      </AppTableWrapper>
    </div>
  );
}

function StaffMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-border/50 bg-muted/20 px-4 py-3 transition-colors hover:bg-muted/30">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        {label}
      </p>
      <p className="text-sm font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
