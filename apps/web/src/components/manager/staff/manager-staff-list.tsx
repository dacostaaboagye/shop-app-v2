"use client";

import type { LocationStaffSummary } from "@shop/contracts";
import { PersonAvatar } from "@/components/system/person-avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";

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
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>No staff assigned</CardTitle>
          <CardDescription>
            Assign workers or managers to this location from admin access before
            managing stock ownership.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{locationName || "Location team"}</CardTitle>
        <CardDescription>
          Staff available for stock assignment and day-to-day supervision at
          this location.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col divide-y divide-border">
        {items.map((member) => (
          <div
            className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
            key={`${member.userId}:${member.roleSlug}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              <PersonAvatar
                firstName={member.firstName}
                imageUrl={member.primaryImageUrl}
                lastName={member.lastName}
                size="md"
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <Badge
                    variant={
                      member.roleSlug === "manager" ? "secondary" : "outline"
                    }
                  >
                    {member.roleName}
                  </Badge>
                  <Badge variant="outline">{member.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {member.email}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Assigned{" "}
                  {new Date(member.assignedAt).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
            <div className="grid gap-3 text-sm sm:grid-cols-4 lg:min-w-[32rem]">
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
                    ? new Date(member.lastSaleAt).toLocaleDateString("en-GB")
                    : "None"
                }
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
    </div>
  );
}
