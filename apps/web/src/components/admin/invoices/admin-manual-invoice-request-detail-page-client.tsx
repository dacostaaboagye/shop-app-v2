"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ManualInvoiceRequestDetail } from "@/components/invoices/manual-invoice-request-detail";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPublicReference } from "@/lib/display/format";
import {
  approveManualInvoiceRequest,
  fetchManualInvoiceRequest,
  manualInvoiceRequestQueryKey,
  manualInvoiceRequestsQueryKey,
  rejectManualInvoiceRequest,
} from "@/lib/react-query/manual-invoices";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { ManualInvoiceDecisionDialog } from "./manual-invoice-decision-dialog";

export function AdminManualInvoiceRequestDetailPageClient({
  reference,
}: {
  reference: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuthorization();
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const requestQuery = useQuery({
    queryFn: () => fetchManualInvoiceRequest("admin", reference),
    queryKey: manualInvoiceRequestQueryKey("admin", reference),
    staleTime: 30_000,
  });
  const approveMutation = useMutation({
    mutationFn: (note: string) =>
      approveManualInvoiceRequest(reference, note ? { note } : {}),
    onSuccess(data) {
      toast.success(`Manual invoice ${data.approvedInvoiceReference} issued.`);
      void queryClient.invalidateQueries({
        queryKey: manualInvoiceRequestQueryKey("admin", reference),
      });
      void queryClient.invalidateQueries({
        queryKey: manualInvoiceRequestsQueryKey("admin", {
          page: 1,
          pageSize: 25,
          status: "pending",
        }),
      });
      setDecision(null);
    },
  });
  const rejectMutation = useMutation({
    mutationFn: (reason: string) =>
      rejectManualInvoiceRequest(reference, { reason }),
    onSuccess() {
      toast.success("Manual invoice request rejected.");
      void queryClient.invalidateQueries({
        queryKey: manualInvoiceRequestQueryKey("admin", reference),
      });
      setDecision(null);
    },
  });
  const request = requestQuery.data;
  const canDecide =
    request?.status === "pending" && can("invoices.manual.approve");

  return (
    <PageShell>
      <PageHeader
        backHref={toRoute("/admin/invoices/manual-requests")}
        backLabel="Manual approvals"
        description="Review request evidence before issuing or rejecting an official manual invoice."
        title={formatPublicReference(reference)}
        actions={
          canDecide ? (
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setDecision("reject")}
                type="button"
                variant="outline"
              >
                Reject
              </Button>
              <Button onClick={() => setDecision("approve")} type="button">
                Approve
              </Button>
            </div>
          ) : null
        }
      />

      {requestQuery.isPending ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : requestQuery.isError ? (
        <AppErrorBanner
          detail="Could not load this manual invoice request."
          error={requestQuery.error}
          onRetry={() => void requestQuery.refetch()}
          title="Unable to load request"
        />
      ) : request ? (
        <>
          <ManualInvoiceRequestDetail request={request} />
          {request.approvedInvoiceReference ? (
            <div className="flex justify-end">
              <Button
                onClick={() =>
                  router.push(
                    toRoute(
                      `/admin/sales/${encodeURIComponent(
                        request.approvedInvoiceReference ?? "",
                      )}`,
                    ),
                  )
                }
                type="button"
                variant="outline"
              >
                Open issued invoice
              </Button>
            </div>
          ) : null}
        </>
      ) : null}

      <ManualInvoiceDecisionDialog
        error={
          decision === "approve"
            ? approveMutation.error
            : decision === "reject"
              ? rejectMutation.error
              : null
        }
        isPending={approveMutation.isPending || rejectMutation.isPending}
        mode={decision ?? "approve"}
        onConfirm={(note) => {
          if (decision === "approve") approveMutation.mutate(note);
          if (decision === "reject") rejectMutation.mutate(note);
        }}
        onOpenChange={(open) => {
          if (!open) setDecision(null);
        }}
        open={decision !== null}
      />
    </PageShell>
  );
}
