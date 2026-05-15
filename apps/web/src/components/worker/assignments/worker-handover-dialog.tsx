"use client";

import type {
  CurrentAssignment,
  HandoverRecipientSummary,
} from "@shop/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HandCoins } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/system/person-avatar";
import { ProductThumbnail } from "@/components/system/product-thumbnail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCount } from "@/lib/display/format";
import { getAppErrorMessage } from "@/lib/errors/app-error";
import {
  fetchWorkerHandoverRecipients,
  postWorkerHandover,
  workerAssignmentsQueryKey,
  workerHandoverRecipientsQueryKey,
  workerHandoversQueryKey,
} from "@/lib/react-query/worker-assignments";

type Props = {
  locationName: string;
  onOpenChange: (open: boolean) => void;
  onSuccess: (locationId: string) => void;
  open: boolean;
  target: CurrentAssignment | null;
};

export function WorkerHandoverDialog({
  locationName,
  onOpenChange,
  onSuccess,
  open,
  target,
}: Props) {
  const recipientId = useId();
  const [selectedWorkerId, setSelectedWorkerId] = useState("");
  const queryClient = useQueryClient();
  const recipientsQuery = useQuery({
    enabled: open && !!target,
    queryFn: () => {
      if (!target) {
        throw new Error("A handover target is required.");
      }
      return fetchWorkerHandoverRecipients(target.locationId);
    },
    queryKey: workerHandoverRecipientsQueryKey(target?.locationId ?? ""),
    staleTime: 60_000,
  });
  const recipients = recipientsQuery.data?.items ?? [];
  const selectedRecipient =
    recipients.find((worker) => worker.userId === selectedWorkerId) ?? null;

  const mutation = useMutation({
    mutationFn: (input: {
      recipient: HandoverRecipientSummary;
      target: CurrentAssignment;
    }) =>
      postWorkerHandover({
        locationId: input.target.locationId,
        quantity: input.target.quantity,
        skuId: input.target.skuId,
        toWorkerId: input.recipient.userId,
      }),
    onError(error) {
      toast.error(
        getAppErrorMessage(error, {
          fallbackDetail: "Failed to start handover.",
        }),
      );
    },
    onSuccess(_data, input) {
      toast.success("Handover started.");
      setSelectedWorkerId("");
      void queryClient.invalidateQueries({
        queryKey: workerAssignmentsQueryKey(input.target.locationId),
      });
      void queryClient.invalidateQueries({
        queryKey: workerHandoversQueryKey(input.target.locationId),
      });
      onOpenChange(false);
      onSuccess(input.target.locationId);
    },
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!target || !selectedRecipient) {
      return;
    }
    mutation.mutate({ recipient: selectedRecipient, target });
  }

  const disabled =
    mutation.isPending ||
    recipientsQuery.isPending ||
    !target ||
    !selectedRecipient;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedWorkerId("");
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start handover</DialogTitle>
          <DialogDescription>
            Choose the worker who will temporarily hold this assigned stock.
          </DialogDescription>
        </DialogHeader>

        {target ? (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex gap-3 rounded-lg border border-border/60 bg-muted/20 p-3">
              <ProductThumbnail
                className="size-12 shrink-0 rounded-lg"
                imageUrl={target.primaryImageUrl}
                productName={target.productName}
                variantName={target.variantName}
              />
              <div className="min-w-0">
                <p className="type-data-value text-sm">{target.productName}</p>
                <p className="type-support text-xs">
                  {target.variantName} - {target.sku}
                </p>
                <p className="type-support text-xs">
                  {formatCount(target.quantity)} units at {locationName}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor={recipientId}>Receiving worker</Label>
              {recipientsQuery.isPending ? (
                <Skeleton className="h-11 w-full rounded-xl" />
              ) : (
                <Select
                  onValueChange={setSelectedWorkerId}
                  value={selectedWorkerId}
                >
                  <SelectTrigger id={recipientId} className="h-11">
                    <SelectValue placeholder="Select a worker" />
                  </SelectTrigger>
                  <SelectContent>
                    {recipients.map((worker) => (
                      <SelectItem key={worker.userId} value={worker.userId}>
                        {worker.firstName} {worker.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedRecipient ? (
              <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3">
                <PersonAvatar
                  firstName={selectedRecipient.firstName}
                  imageUrl={selectedRecipient.primaryImageUrl}
                  interactive={false}
                  lastName={selectedRecipient.lastName}
                  size="sm"
                />
                <p className="type-support text-sm">
                  {selectedRecipient.firstName} {selectedRecipient.lastName} has{" "}
                  {formatCount(selectedRecipient.activeAssignmentCount)} active
                  assignments.
                </p>
              </div>
            ) : null}

            {recipientsQuery.isError ? (
              <p className="text-sm text-destructive">
                {getAppErrorMessage(recipientsQuery.error, {
                  fallbackDetail: "Could not load workers for this location.",
                })}
              </p>
            ) : null}

            <DialogFooter>
              <Button
                onClick={() => onOpenChange(false)}
                type="button"
                variant="ghost"
              >
                Cancel
              </Button>
              <Button disabled={disabled} type="submit">
                <HandCoins className="size-4" />
                {mutation.isPending ? "Starting..." : "Start handover"}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
