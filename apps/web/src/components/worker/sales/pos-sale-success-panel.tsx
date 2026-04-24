"use client";

import type { InvoiceResponse } from "@shop/contracts";
import {
  CheckCircle,
  Download,
  FileText,
  Share2,
  ShoppingCart,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  downloadDocumentFile,
  shareDocumentFile,
} from "@/lib/documents/sales-document";
import { formatMoney, type MoneyProfile } from "@/lib/money/format-money";
import { fetchSalesDocumentDownloadFile } from "@/lib/react-query/official-documents";
import { toRoute } from "@/lib/routes";
import { PosSaleReturnDialog } from "./pos-sale-return-dialog";

export function SaleSuccessPanel({
  invoice,
  moneyProfile,
  onNewSale,
}: {
  invoice: InvoiceResponse;
  moneyProfile: MoneyProfile;
  onNewSale: () => void;
}) {
  const [isDocumentPending, setIsDocumentPending] = useState(false);
  const paymentLabel =
    invoice.paymentMethod === "mobile_money"
      ? "Mobile money"
      : invoice.paymentMethod
        ? invoice.paymentMethod.charAt(0).toUpperCase() +
          invoice.paymentMethod.slice(1)
        : "-";

  async function handleDownload() {
    try {
      setIsDocumentPending(true);
      const file = await fetchSalesDocumentDownloadFile(invoice.reference);
      if (downloadDocumentFile(file)) {
        toast.success("Receipt PDF downloaded.");
        return;
      }
      toast.error("Unable to download this receipt.");
    } catch {
      toast.error("Unable to download this receipt.");
    } finally {
      setIsDocumentPending(false);
    }
  }

  async function handleShare() {
    try {
      setIsDocumentPending(true);
      const file = await fetchSalesDocumentDownloadFile(invoice.reference);
      const result = await shareDocumentFile(
        file,
        `Sales receipt ${invoice.reference}`,
      );
      if (result === "shared") {
        toast.success("Receipt PDF shared.");
        return;
      }
      if (result === "downloaded") {
        toast.success(
          "Receipt PDF downloaded. Share the file from your device.",
        );
        return;
      }
      toast.error("This browser cannot share or download the receipt.");
    } catch {
      toast.error("Unable to share this receipt.");
    } finally {
      setIsDocumentPending(false);
    }
  }

  return (
    <Card className="mx-auto max-w-lg">
      <CardHeader className="items-center text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle className="size-6" />
        </div>
        <CardTitle className="text-lg">Sale confirmed</CardTitle>
        <p className="font-mono text-sm text-muted-foreground">
          {invoice.reference}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="divide-y divide-border rounded-xl border border-border">
          {invoice.lines.map((line) => (
            <div key={line.skuId} className="flex items-center gap-3 px-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {line.skuSnapshot.productName}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {line.skuSnapshot.variantName} &times; {line.quantity} @{" "}
                  {formatMoney(line.unitPrice, moneyProfile)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {formatMoney(line.lineTotal, moneyProfile)}
              </p>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">Total</span>
          <span className="font-semibold tabular-nums">
            {formatMoney(invoice.totalAmount, moneyProfile)}
          </span>
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Payment: {paymentLabel}
        </p>
        <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
          The official PDF receipt is now available for customer handover,
          download, sharing, audit evidence, and future return support.
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <PosSaleReturnDialog invoice={invoice} moneyProfile={moneyProfile} />
        <Link
          className={buttonVariants({
            className: "flex-1",
            variant: "outline",
          })}
          href={toRoute(
            `/worker/sales/${encodeURIComponent(invoice.reference)}`,
          )}
        >
          <FileText data-icon="inline-start" />
          View PDF
        </Link>
        <Button
          className="flex-1"
          disabled={isDocumentPending}
          onClick={() => void handleDownload()}
          variant="outline"
        >
          <Download data-icon="inline-start" />
          Download
        </Button>
        <Button
          className="flex-1"
          disabled={isDocumentPending}
          onClick={() => void handleShare()}
          variant="outline"
        >
          <Share2 data-icon="inline-start" />
          Share
        </Button>
        <Button className="w-full" onClick={onNewSale}>
          <ShoppingCart data-icon="inline-start" />
          New sale
        </Button>
      </CardFooter>
    </Card>
  );
}
