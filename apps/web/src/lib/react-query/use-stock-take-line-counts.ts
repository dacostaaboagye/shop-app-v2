"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  type StockTakeLineCountEntry,
  type StockTakeLineCountUpdateResponse,
  updateStockTakeLineCounts,
} from "@/lib/react-query/stock-take-counts";
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

const DEBOUNCE_MS = 500;

export function useUpdateStockTakeLineCounts({
  portal,
  reference,
}: {
  portal: StockTakePortal;
  reference: string;
}): UseStockTakeLineCountsResult {
  const queryClient = useQueryClient();
  const pendingRef = useRef<Map<number, StockTakeLineCountEntry>>(new Map());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lineStatuses, setLineStatuses] = useState<
    Map<number, LineCountSaveStatus>
  >(new Map());
  const [lastError, setLastError] = useState<Error | null>(null);
  const mutation = useMutation<
    StockTakeLineCountUpdateResponse,
    Error,
    StockTakeLineCountEntry[]
  >({
    mutationFn: (entries) =>
      updateStockTakeLineCounts(portal, reference, { entries }),
  });

  const setStatusForLines = useCallback(
    (
      lineNumbers: number[],
      status: LineCountSaveStatus["state"],
      error: Error | null = null,
    ) => {
      setLineStatuses((current) => {
        const next = new Map(current);
        for (const lineNumber of lineNumbers) {
          next.set(lineNumber, { error, state: status });
        }
        return next;
      });
    },
    [],
  );

  const flushNow = useCallback(async (): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (pendingRef.current.size === 0) return;

    const entries = [...pendingRef.current.values()];
    pendingRef.current = new Map();
    const flushedLineNumbers = entries.map((entry) => entry.lineNumber);
    setStatusForLines(flushedLineNumbers, "pending");

    try {
      await mutation.mutateAsync(entries);
      setStatusForLines(flushedLineNumbers, "saved");
      setLastError(null);
      await queryClient.invalidateQueries({
        queryKey: stockTakeQueryKey(portal, reference),
      });
    } catch (error) {
      const wrapped = error instanceof Error ? error : new Error(String(error));
      setStatusForLines(flushedLineNumbers, "error", wrapped);
      setLastError(wrapped);
    }
  }, [mutation, portal, queryClient, reference, setStatusForLines]);

  const queueEntry = useCallback(
    (entry: StockTakeLineCountEntry) => {
      pendingRef.current.set(entry.lineNumber, entry);
      setStatusForLines([entry.lineNumber], "pending");

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        void flushNow();
      }, DEBOUNCE_MS);
    },
    [flushNow, setStatusForLines],
  );

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  return { flushNow, lastError, lineStatuses, queueEntry };
}
