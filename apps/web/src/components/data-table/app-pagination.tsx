"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCount } from "@/lib/display/format";
import { getPageCount } from "@/lib/url-state";
import { cn } from "@/lib/utils";

export type AppPaginationProps = {
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  page: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
  totalCount: number;
};

export function AppPagination({
  onPageChange,
  onPageSizeChange,
  page,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  totalCount,
}: AppPaginationProps) {
  const totalPages = getPageCount(totalCount, pageSize);
  const safePage = Math.min(page, totalPages);
  const rangeStart = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const rangeEnd = Math.min(safePage * pageSize, totalCount);
  const visiblePages = getVisiblePages(safePage, totalPages);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
        <span className="tabular-nums">
          Showing {formatCount(rangeStart)}-{formatCount(rangeEnd)} of{" "}
          {formatCount(totalCount)}
        </span>
        {onPageSizeChange ? (
          <div className="flex items-center gap-2 text-sm">
            <span>Rows</span>
            <Select
              onValueChange={(value) =>
                onPageSizeChange(Number.parseInt(value, 10))
              }
              value={String(pageSize)}
            >
              <SelectTrigger className="h-8 min-w-[70px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Button
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          <ChevronLeft data-icon="inline-start" />
          Prev
        </Button>

        <div className="flex flex-wrap items-center gap-1">
          {visiblePages.map((item) =>
            item.kind === "ellipsis" ? (
              <span
                key={item.key}
                className="px-2 text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <Button
                key={item.key}
                aria-current={item.page === safePage ? "page" : undefined}
                className={cn(
                  "min-w-9 shrink-0 px-0",
                  item.page === safePage && "shadow-none",
                )}
                onClick={() => onPageChange(item.page)}
                size="sm"
                type="button"
                variant={item.page === safePage ? "default" : "outline"}
              >
                {item.page}
              </Button>
            ),
          )}
        </div>

        <Button
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          size="sm"
          type="button"
          variant="outline"
        >
          Next
          <ChevronRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  );
}

function getVisiblePages(page: number, totalPages: number) {
  const items: Array<number | "ellipsis"> =
    totalPages <= 5
      ? Array.from({ length: totalPages }, (_, index) => index + 1)
      : page <= 3
        ? [1, 2, 3, 4, "ellipsis", totalPages]
        : page >= totalPages - 2
          ? [
              1,
              "ellipsis",
              totalPages - 3,
              totalPages - 2,
              totalPages - 1,
              totalPages,
            ]
          : [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];

  let ellipsisCount = 0;

  return items.map((item) =>
    item === "ellipsis"
      ? { key: `ellipsis-${ellipsisCount++}`, kind: "ellipsis" as const }
      : { key: `page-${item}`, kind: "page" as const, page: item },
  );
}
