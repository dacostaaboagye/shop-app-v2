"use client";

import { LayoutList, SquareStack } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ViewMode } from "./worker-assignments-support";

export function ViewModeToggle({
  onViewModeChange,
  viewMode,
}: {
  onViewModeChange: (value: ViewMode) => void;
  viewMode: ViewMode;
}) {
  return (
    <fieldset
      aria-label="Change view"
      className="flex w-fit items-center gap-1 rounded-xl border border-border/50 bg-muted/30 p-[3px]"
    >
      <ViewModeButton
        active={viewMode === "card"}
        icon={<SquareStack className="size-4" />}
        id="view-cards"
        label="Card view"
        onClick={() => onViewModeChange("card")}
      />
      <ViewModeButton
        active={viewMode === "compact"}
        icon={<LayoutList className="size-4" />}
        id="view-compact"
        label="Compact list view"
        onClick={() => onViewModeChange("compact")}
      />
    </fieldset>
  );
}

function ViewModeButton({
  active,
  icon,
  id,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  id: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors focus-visible:outline-ring",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
      id={id}
      onClick={onClick}
      type="button"
    >
      {icon}
    </button>
  );
}
