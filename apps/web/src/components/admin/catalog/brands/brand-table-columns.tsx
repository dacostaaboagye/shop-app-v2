"use client";

import type { AdminBrandSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { ImageOff } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { CATALOG_STATUS_META, formatAdminDate } from "@/lib/admin-models";

export const brandTableColumns: Array<ColumnDef<AdminBrandSummary, unknown>> = [
  {
    id: "image",
    header: "",
    size: 56,
    cell: ({ row }) =>
      row.original.primaryImageUrl ? (
        <Image
          alt={row.original.name}
          className="rounded object-cover"
          height={40}
          src={row.original.primaryImageUrl}
          unoptimized
          width={40}
        />
      ) : (
        <div className="flex size-10 items-center justify-center rounded bg-muted">
          <ImageOff className="size-4 text-muted-foreground" />
        </div>
      ),
  },
  {
    id: "name",
    header: "Name",
    cell: ({ row }) => (
      <div>
        <p className="font-medium leading-none">{row.original.name}</p>
        <p className="mt-0.5 font-mono text-[0.68rem] text-muted-foreground">
          {row.original.slug}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "website",
    enableSorting: false,
    header: "Website",
    id: "website",
    cell: ({ row }) =>
      row.original.website ? (
        <span className="text-sm text-muted-foreground">
          {row.original.website}
        </span>
      ) : (
        <span className="text-sm text-muted-foreground">—</span>
      ),
  },
  {
    accessorKey: "status",
    header: "Status",
    id: "status",
    cell: ({ row }) => {
      const meta = CATALOG_STATUS_META[row.original.status];

      return (
        <Badge className={meta.className} variant="outline">
          {meta.label}
        </Badge>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    id: "createdAt",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
