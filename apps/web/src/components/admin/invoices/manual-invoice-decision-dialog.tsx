"use client";

import { useState } from "react";
import { AppDialog, AppDialogBody } from "@/components/system/app-dialog";
import { AppErrorBanner } from "@/components/system/app-error";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ManualInvoiceDecisionDialog({
  error,
  isPending,
  mode,
  onConfirm,
  onOpenChange,
  open,
}: {
  error: Error | null;
  isPending: boolean;
  mode: "approve" | "reject";
  onConfirm: (note: string) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}) {
  const [note, setNote] = useState("");
  const isReject = mode === "reject";
  const title = isReject ? "Reject manual request" : "Approve manual request";

  return (
    <AppDialog
      description={
        isReject
          ? "Record why this request should not become an official invoice."
          : "Approval issues the official INV-MAN invoice and document snapshot."
      }
      onOpenChange={(nextOpen) => {
        if (!nextOpen) setNote("");
        onOpenChange(nextOpen);
      }}
      open={open}
      size="md"
      title={title}
    >
      <AppDialogBody>
        <Textarea
          maxLength={1000}
          placeholder={isReject ? "Rejection reason" : "Approval note"}
          required={isReject}
          rows={4}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        {error ? (
          <AppErrorBanner
            detail="The request decision could not be saved."
            error={error}
            title={
              isReject
                ? "Unable to reject request"
                : "Unable to approve request"
            }
          />
        ) : null}
      </AppDialogBody>
      <div className="flex flex-col-reverse gap-2 rounded-b-lg border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
        <Button
          onClick={() => onOpenChange(false)}
          type="button"
          variant="outline"
        >
          Cancel
        </Button>
        <Button
          disabled={isPending || (isReject && !note.trim())}
          onClick={() => onConfirm(note.trim())}
          type="button"
          variant={isReject ? "destructive" : "default"}
        >
          {isPending
            ? isReject
              ? "Rejecting..."
              : "Approving..."
            : isReject
              ? "Reject request"
              : "Approve request"}
        </Button>
      </div>
    </AppDialog>
  );
}
