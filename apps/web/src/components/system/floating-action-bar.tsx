"use client";

import { RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        "fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-6 rounded-xl border border-border bg-white/80 p-3 pl-6 shadow-panel backdrop-blur-xl transition-all duration-300",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-12 pointer-events-none opacity-0",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex size-2 items-center justify-center">
          <div className="size-2 animate-pulse rounded-full bg-primary" />
        </div>
        <p className="text-sm font-bold text-foreground">{message}</p>
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={onReset}
          size="sm"
          variant="ghost"
          disabled={isSaving}
          className="text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCcw className="mr-2 size-3.5" />
          Reset
        </Button>
        <Button
          onClick={onSave}
          disabled={isSaving}
          className="bg-foreground font-bold text-background shadow-sm hover:bg-foreground/90"
        >
          {isSaving ? (
            <span className="flex items-center gap-2">
              <div className="size-3 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="size-3.5" />
              {saveLabel}
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
