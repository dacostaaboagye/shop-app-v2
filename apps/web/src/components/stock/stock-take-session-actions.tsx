"use client";

import { FileDown, FileSearch, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  StockTakePortal,
  StockTakeSessionListResponse,
  StockTakeStatus,
} from "@/lib/react-query/stock-takes";
import { toRoute } from "@/lib/routes";
import { cn } from "@/lib/utils";

type StockTakeSessionSummary = StockTakeSessionListResponse["items"][number];

type StockTakeSessionActionsProps = {
  deletingReference?: string | null;
  downloadingReference?: string | null;
  onDelete?: (reference: string) => void;
  onDownloadWorkbook?: (reference: string) => void;
  portal: StockTakePortal;
  session: StockTakeSessionSummary;
};

export function StockTakeSessionActions({
  deletingReference = null,
  downloadingReference = null,
  onDelete,
  onDownloadWorkbook,
  portal,
  session,
}: StockTakeSessionActionsProps) {
  return (
    <div className="flex flex-wrap gap-2 border-border/60 border-t pt-4">
      {onDownloadWorkbook ? (
        <Button
          disabled={downloadingReference === session.stockTakeReference}
          onClick={() => onDownloadWorkbook(session.stockTakeReference)}
          size="sm"
          type="button"
        >
          {downloadingReference === session.stockTakeReference ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <FileDown data-icon="inline-start" />
          )}
          Workbook
        </Button>
      ) : null}
      <Link
        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        href={toRoute(`/${portal}/stock/takes/${session.stockTakeReference}`)}
      >
        <FileSearch data-icon="inline-start" />
        Review
      </Link>
      <Link
        className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
        href={toRoute(session.printableBookletUrl)}
      >
        <Printer data-icon="inline-start" />
        Booklet
      </Link>
      {canDelete(session.status) && onDelete ? (
        <Button
          disabled={deletingReference === session.stockTakeReference}
          onClick={() => {
            if (
              window.confirm(
                `Delete stock-take ${session.stockTakeReference}? This will cancel the session and keep an audit record.`,
              )
            ) {
              onDelete(session.stockTakeReference);
            }
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          <Trash2 data-icon="inline-start" />
          {deletingReference === session.stockTakeReference
            ? "Deleting..."
            : "Delete"}
        </Button>
      ) : null}
    </div>
  );
}

function canDelete(status: StockTakeStatus) {
  return status !== "applied" && status !== "cancelled";
}
