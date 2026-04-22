"use client";

import type { LocationStaffSummary } from "@shop/contracts";
import { Check } from "lucide-react";
import { PersonAvatar } from "@/components/system/person-avatar";
import { cn } from "@/lib/utils";

type Props = {
  onSelect: (worker: LocationStaffSummary) => void;
  selected: LocationStaffSummary | null;
  workers: LocationStaffSummary[];
};

export function AssignmentWorkerGrid({ onSelect, selected, workers }: Props) {
  if (workers.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No active workers are assigned to this location. Add workers from Staff
        first.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {workers.map((worker) => {
        const isSelected = selected?.userId === worker.userId;

        return (
          <button
            className={cn(
              "relative flex flex-col items-center gap-2.5 rounded-lg border bg-card p-4 text-center transition-all hover:border-primary/50 hover:bg-accent/40",
              isSelected
                ? "border-primary bg-primary/5 ring-2 ring-primary ring-offset-1"
                : "border-border",
            )}
            key={worker.userId}
            onClick={() => onSelect(worker)}
            type="button"
          >
            {isSelected && (
              <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Check className="size-3" strokeWidth={3} />
              </span>
            )}
            <PersonAvatar
              className={cn(
                isSelected ? "ring-2 ring-primary ring-offset-2" : "",
              )}
              firstName={worker.firstName}
              imageUrl={worker.primaryImageUrl}
              interactive={false}
              lastName={worker.lastName}
              size="lg"
            />
            <div className="min-w-0 w-full">
              <p className="truncate text-sm font-medium leading-snug">
                {worker.firstName} {worker.lastName}
              </p>
              <p className="text-xs text-muted-foreground">
                {worker.activeAssignmentCount} active{" "}
                {worker.activeAssignmentCount === 1 ? "item" : "items"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
