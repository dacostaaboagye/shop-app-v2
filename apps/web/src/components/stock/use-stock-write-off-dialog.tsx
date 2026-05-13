"use client";

import type {
  AdminStockBalanceSummary,
  StockWriteOffRequest,
  StockWriteOffResponse,
} from "@shop/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { StockWriteOffDialog } from "./stock-write-off-dialog";

type UseStockWriteOffDialogInput = {
  invalidateQueryKeys: ReadonlyArray<readonly unknown[]>;
  locationSlug: string;
  mutationFn: (body: StockWriteOffRequest) => Promise<StockWriteOffResponse>;
};

export function useStockWriteOffDialog({
  invalidateQueryKeys,
  locationSlug,
  mutationFn,
}: UseStockWriteOffDialogInput) {
  const queryClient = useQueryClient();
  const [target, setTarget] = useState<AdminStockBalanceSummary | null>(null);
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn,
    onSuccess: () => {
      for (const queryKey of invalidateQueryKeys) {
        void queryClient.invalidateQueries({ queryKey });
      }
      setOpen(false);
      setTarget(null);
    },
  });

  const openWriteOffDialog = useCallback(
    (row: AdminStockBalanceSummary) => {
      setTarget(row);
      mutation.reset();
      setOpen(true);
    },
    [mutation],
  );

  const writeOffDialog = (
    <StockWriteOffDialog
      error={mutation.error}
      isPending={mutation.isPending}
      locationSlug={locationSlug}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) mutation.reset();
      }}
      onSubmit={(request) => {
        mutation.reset();
        mutation.mutate(request);
      }}
      open={open}
      row={target}
    />
  );

  return { openWriteOffDialog, writeOffDialog };
}
