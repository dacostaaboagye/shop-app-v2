"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";

type LogoutConfirmDialogProps = {
  isPending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
};

export function LogoutConfirmDialog({
  isPending,
  onConfirm,
  onOpenChange,
  open,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Sign Out</DialogTitle>
          <DialogDescription>
            Sign out only if you are finished with this session or you are on a
            shared device.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button disabled={isPending} onClick={onConfirm} type="button">
            {isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <LogOut data-icon="inline-start" />
            )}
            Sign Out
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
