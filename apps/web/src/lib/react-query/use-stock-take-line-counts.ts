"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  type StockTakeLineCountEntry,
  updateStockTakeLineCounts,
} from "@/lib/react-query/stock-take-counts";
import { StockTakeLineCountScheduler } from "@/lib/react-query/stock-take-line-count-scheduler";
import {
  type StockTakePortal,
  stockTakeQueryKey,
} from "@/lib/react-query/stock-takes";

export type LineCountSaveState = "idle" | "pending" | "saved" | "error";

export type LineCountSaveStatus = {
  error: Error | null;
  state: LineCountSaveState;
};

export type UseStockTakeLineCountsResult = {
  flushNow: () => Promise<void>;
  lastError: Error | null;
  lineStatuses: Map<number, LineCountSaveStatus>;
  queueEntry: (entry: StockTakeLineCountEntry) => void;
};

export function useUpdateStockTakeLineCounts({
  portal,
  reference,
}: {
  portal: StockTakePortal;
  reference: string;
}): UseStockTakeLineCountsResult {
  const queryClient = useQueryClient();
  const [lineStatuses, setLineStatuses] = useState<
    Map<number, LineCountSaveStatus>
  >(new Map());
  const [lastError, setLastError] = useState<Error | null>(null);

  const setStatusForLines = useCallback(
    (
      lineNumbers: number[],
      state: LineCountSaveStatus["state"],
      error: Error | null = null,
    ) => {
      setLineStatuses((current) => {
        const next = new Map(current);
        for (const lineNumber of lineNumbers) {
          next.set(lineNumber, { error, state });
        }
        return next;
      });
    },
    [],
  );

  // The scheduler must be stable across renders or rapid edits stop
  // coalescing and the in-flight serialisation guarding flushNow drops
  // its reference. We do NOT depend on a `useMutation` object here —
  // tanstack's mutation hook returns a fresh wrapper every render which
  // would force the scheduler to be rebuilt.
  const schedulerRef = useRef<StockTakeLineCountScheduler | null>(null);
  const scheduler = useMemo(() => {
    const created = new StockTakeLineCountScheduler(
      async (entries) => {
        try {
          await updateStockTakeLineCounts(portal, reference, { entries });
          await queryClient.invalidateQueries({
            queryKey: stockTakeQueryKey(portal, reference),
          });
          return { ok: true };
        } catch (error) {
          const wrapped =
            error instanceof Error ? error : new Error(String(error));
          setLastError(wrapped);
          throw wrapped;
        }
      },
      {
        onFlushBegin: (lineNumbers) =>
          setStatusForLines(lineNumbers, "pending"),
        onFlushDone: (lineNumbers) => {
          setStatusForLines(lineNumbers, "saved");
          setLastError(null);
        },
        onFlushError: (lineNumbers, error) => {
          const wrapped =
            error instanceof Error ? error : new Error(String(error));
          setStatusForLines(lineNumbers, "error", wrapped);
        },
      },
    );
    schedulerRef.current = created;
    return created;
  }, [portal, queryClient, reference, setStatusForLines]);

  const queueEntry = useCallback(
    (entry: StockTakeLineCountEntry) => {
      setStatusForLines([entry.lineNumber], "pending");
      scheduler.queue(entry);
    },
    [scheduler, setStatusForLines],
  );

  const flushNow = useCallback(() => scheduler.flushNow(), [scheduler]);

  useEffect(
    () => () => {
      schedulerRef.current?.dispose();
    },
    [],
  );

  return { flushNow, lastError, lineStatuses, queueEntry };
}
