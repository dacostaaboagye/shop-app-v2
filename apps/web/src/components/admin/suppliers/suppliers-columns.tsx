"use client";

import type { AdminSupplierSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import { PreviewImage } from "@/components/system/preview-image";
import { Badge } from "@/components/ui/badge";
import { formatAdminDate } from "@/lib/admin-models";

export const supplierColumns: ColumnDef<AdminSupplierSummary>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Supplier",
    cell: ({ row }) => {
      const supplier = row.original;

      return (
        <div className="flex items-center gap-3">
          {supplier.primaryImageUrl ? (
            <PreviewImage
              alt={`${supplier.name} logo`}
              className="size-10"
              height={40}
              previewTitle={supplier.name}
              src={supplier.primaryImageUrl}
              width={40}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border">
              <Building2 className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium leading-none">{supplier.name}</p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {supplier.legalName ?? supplier.email ?? "No legal name recorded"}
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: "primaryContact",
    enableSorting: false,
    header: "Primary contact",
    cell: ({ row }) => {
      const contact = row.original.primaryContact;

      return contact ? (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {contact.firstName} {contact.lastName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {contact.email ?? contact.phone ?? "No contact detail"}
          </p>
        </div>
      ) : (
        <span className="text-sm text-muted-foreground">Not assigned</span>
      );
    },
  },
  {
    id: "status",
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "secondary" : "outline"}
      >
        {row.original.status === "active" ? "Active" : "Inactive"}
      </Badge>
    ),
  },
  {
    id: "contacts",
    enableSorting: false,
    header: "Contacts",
    cell: ({ row }) => (
      <div className="text-sm tabular-nums text-muted-foreground">
        {row.original.contactCount} contact
        {row.original.contactCount === 1 ? "" : "s"}
        {row.original.linkedUserCount > 0
          ? `, ${row.original.linkedUserCount} portal`
          : ""}
      </div>
    ),
  },
  {
    id: "paymentTermsDays",
    enableSorting: false,
    header: "Terms",
    cell: ({ row }) => (
      <span className="text-sm tabular-nums text-muted-foreground">
        {row.original.paymentTermsDays > 0
          ? `${row.original.paymentTermsDays} days`
          : "Due on receipt"}
      </span>
    ),
  },
  {
    id: "createdAt",
    accessorKey: "createdAt",
    header: "Created",
    cell: ({ row }) => (
      <span className="tabular-nums text-sm text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
  },
];
