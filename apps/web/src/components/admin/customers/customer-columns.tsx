"use client";

import type { AdminCustomerSummary } from "@shop/contracts";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2 } from "lucide-react";
import {
  AccessCountCell,
  AccessNameCell,
  AccessTextCell,
} from "@/components/admin/access/access-table-cells";
import { Badge } from "@/components/ui/badge";
import { formatAdminDate } from "@/lib/admin-models";
import {
  CUSTOMER_STATUS_LABELS,
  CUSTOMER_TYPE_LABELS,
  formatCustomerDisplayName,
} from "./customer-display";

export const customerColumns: ColumnDef<AdminCustomerSummary>[] = [
  {
    accessorKey: "displayName",
    cell: ({ row }) => {
      const customer = row.original;

      return (
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground ring-1 ring-border">
            <Building2 className="size-4" />
          </div>
          <AccessNameCell
            description={customer.legalName ?? customer.reference}
            name={formatCustomerDisplayName(customer)}
            slug={customer.reference}
          />
        </div>
      );
    },
    header: "Customer",
    id: "displayName",
  },
  {
    cell: ({ row }) => (
      <Badge variant="outline">
        {CUSTOMER_TYPE_LABELS[row.original.customerType]}
      </Badge>
    ),
    enableSorting: false,
    header: "Type",
    id: "customerType",
  },
  {
    accessorKey: "status",
    cell: ({ row }) => (
      <Badge
        variant={row.original.status === "active" ? "secondary" : "outline"}
      >
        {CUSTOMER_STATUS_LABELS[row.original.status]}
      </Badge>
    ),
    header: "Status",
    id: "status",
  },
  {
    cell: ({ row }) => {
      const contact = row.original.primaryContact;

      return contact ? (
        <div className="min-w-0">
          <p className="text-balance text-sm font-medium text-foreground">
            {contact.name}
          </p>
          <p className="type-support mt-1 break-all text-muted-foreground">
            {contact.email ?? contact.phone ?? "No contact detail"}
          </p>
        </div>
      ) : (
        <AccessTextCell value="Not assigned" />
      );
    },
    enableSorting: false,
    header: "Primary contact",
    id: "primaryContact",
  },
  {
    cell: ({ row }) => (
      <div className="flex flex-col gap-1">
        <AccessCountCell value={row.original.contactCount} />
        <AccessTextCell value={`${row.original.addressCount} addresses`} />
      </div>
    ),
    enableSorting: false,
    header: "Records",
    id: "records",
  },
  {
    cell: ({ row }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {row.original.paymentTermsDays > 0
          ? `${row.original.paymentTermsDays} days`
          : "Due on receipt"}
      </span>
    ),
    enableSorting: false,
    header: "Terms",
    id: "paymentTermsDays",
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) => (
      <span className="type-support tabular-nums text-muted-foreground">
        {formatAdminDate(row.original.createdAt)}
      </span>
    ),
    header: "Created",
    id: "createdAt",
  },
];
