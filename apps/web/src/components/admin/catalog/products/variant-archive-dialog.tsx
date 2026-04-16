"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type VariantArchiveDialogProps = {
  isDefault: boolean;
  isPending: boolean;
  name: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function VariantArchiveDialog({
  isDefault,
  isPending,
  name,
  onConfirm,
  onOpenChange,
  open,
}: VariantArchiveDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Archive variant</DialogTitle>
          <DialogDescription>
            {`Archive "${name}" to remove it from active catalogue use.`}
            {isDefault ? " This variant is currently the default variant." : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="ghost"
          >
            Keep variant
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button">
            {isPending ? "Archiving…" : "Confirm archive"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
