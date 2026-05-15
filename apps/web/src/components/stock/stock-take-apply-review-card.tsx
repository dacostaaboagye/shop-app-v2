"use client";

import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useId, useState } from "react";
import { AppErrorBanner } from "@/components/system/app-error";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type {
  StockTakeApplyResponse,
  StockTakeImportDryRunResponse,
  StockTakeStatus,
} from "@/lib/react-query/stock-takes";
import { getApplyDisabledReason } from "./stock-take-import-review.support";

type StockTakeApplyReviewCardProps = {
  applyError: Error | null;
  applyResult: StockTakeApplyResponse | null;
  currentFileSignature: string | null;
  dryRun: StockTakeImportDryRunResponse | null;
  importFileName: string | null;
  isApplyPending: boolean;
  onApply: () => void;
  sessionStatus: StockTakeStatus;
  validatedFileSignature: string | null;
};

export function StockTakeApplyReviewCard({
  applyError,
  applyResult,
  currentFileSignature,
  dryRun,
  importFileName,
  isApplyPending,
  onApply,
  sessionStatus,
  validatedFileSignature,
}: StockTakeApplyReviewCardProps) {
  const confirmationInputId = useId();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const disabledReason = getApplyDisabledReason({
    currentFileSignature,
    dryRun,
    isPending: isApplyPending,
    sessionStatus,
    validatedFileSignature,
  });
  const canConfirm = disabledReason === null;
  const reference =
    dryRun?.stockTakeReference ?? applyResult?.stockTakeReference;
  const hasTypedReference = confirmationText.trim() === reference;

  if (!dryRun?.canApply && !applyResult) {
    return null;
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={applyResult ? "default" : "secondary"}>
              {applyResult ? "Applied" : "Requires confirmation"}
            </Badge>
            <Badge variant="secondary">No optimistic stock changes</Badge>
          </div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            Apply reviewed stock-take
          </CardTitle>
          <CardDescription>
            Apply the exact reviewed workbook or CSV fallback to update stock
            balances. This action is only enabled after a clean preview for the
            selected file.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {applyResult ? <ApplySuccessState result={applyResult} /> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <ApplyStat
              label="Rows ready"
              value={
                dryRun?.summary.validRows ??
                applyResult?.summary.appliedRows ??
                0
              }
            />
            <ApplyStat
              label="Variance rows"
              value={
                dryRun?.summary.varianceRows ??
                applyResult?.summary.changedRows ??
                0
              }
            />
          </div>
          <p className="rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
            File:{" "}
            <span className="font-medium text-foreground">
              {importFileName ?? "No reviewed file"}
            </span>
          </p>
          {disabledReason ? (
            <Alert>
              <AlertTitle>Apply unavailable</AlertTitle>
              <AlertDescription>{disabledReason}</AlertDescription>
            </Alert>
          ) : null}
          {applyError ? (
            <AppErrorBanner
              detail="The reviewed import was not applied. Stock balances were not changed by the frontend."
              error={applyError}
              title="Unable to apply stock-take"
            />
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Confirmation is required before stock is changed.
          </p>
          <Button
            disabled={!canConfirm}
            onClick={() => setConfirmOpen(true)}
            type="button"
          >
            {isApplyPending ? <Spinner data-icon="inline-start" /> : null}
            Apply reviewed import
          </Button>
        </CardFooter>
      </Card>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setConfirmationText("");
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Apply reviewed stock-take?</DialogTitle>
            <DialogDescription>
              This will post the reviewed file to the apply endpoint and update
              stock balances after the server accepts it. Type the stock-take
              reference to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-muted/30 p-3 text-sm text-muted-foreground">
            <p>
              {dryRun?.summary.validRows ?? 0} reviewed row(s) from{" "}
              <span className="font-medium text-foreground">
                {importFileName}
              </span>
              .
            </p>
            <label
              className="flex flex-col gap-2 text-foreground"
              htmlFor={confirmationInputId}
            >
              <span className="text-sm font-medium">
                Type {reference} to confirm
              </span>
              <Input
                autoComplete="off"
                id={confirmationInputId}
                onChange={(event) => setConfirmationText(event.target.value)}
                value={confirmationText}
              />
            </label>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setConfirmOpen(false)}
              type="button"
              variant="ghost"
            >
              Cancel
            </Button>
            <Button
              disabled={!canConfirm || !hasTypedReference}
              onClick={() => {
                if (!canConfirm || !hasTypedReference) return;
                onApply();
                setConfirmOpen(false);
                setConfirmationText("");
              }}
              type="button"
            >
              Confirm and apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApplySuccessState({ result }: { result: StockTakeApplyResponse }) {
  return (
    <Alert>
      <CheckCircle2 className="size-4" />
      <AlertTitle>Stock-take applied</AlertTitle>
      <AlertDescription>
        {result.summary.appliedRows} row(s) applied for {result.locationName}.
        Balance and stock-take data are being refreshed from the server.
      </AlertDescription>
    </Alert>
  );
}

function ApplyStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
      <p className="type-support text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">
        {new Intl.NumberFormat().format(value)}
      </p>
    </div>
  );
}
