"use client";

import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type FloatingActionBarProps = {
  isVisible: boolean;
  isSaving: boolean;
  onSave: () => void;
  onReset: () => void;
  message?: string;
  saveLabel?: string;
};

export function FloatingActionBar({
  isVisible,
  isSaving,
  onSave,
  onReset,
  message = "You have unsaved changes",
  saveLabel = "Save changes",
}: FloatingActionBarProps) {
  return (
    <div
      className={cn(
        "fixed bottom-8 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-4 rounded-xl border border-border/70 bg-card/95 p-3 pl-5 shadow-panel backdrop-blur-xl transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-12 pointer-events-none opacity-0",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-2 items-center justify-center">
          <div className="size-2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="type-support font-medium text-foreground">{message}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          className="text-muted-foreground"
          disabled={isSaving}
          onClick={onReset}
          size="sm"
          variant="ghost"
        >
          <RotateCcw className="size-3.5" data-icon="inline-start" />
          Reset
        </Button>
        <Button className="min-w-32" disabled={isSaving} onClick={onSave}>
          {isSaving ? (
            <span className="flex items-center gap-2">
              <Spinner data-icon="inline-start" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-3.5" data-icon="inline-start" />
              {saveLabel}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
