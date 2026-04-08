import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ColumnDef } from "@tanstack/react-table";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppDataTable } from "./app-data-table";

Object.assign(globalThis, { React });

type Row = {
  module: string;
  status: string;
};

const columns: Array<ColumnDef<Row, unknown>> = [
  {
    accessorKey: "module",
    header: "Module",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
];

describe("AppDataTable", () => {
  it("renders rows through the shared table wrapper", () => {
    const markup = renderToStaticMarkup(
      <AppDataTable
        columns={columns}
        data={[{ module: "Identity", status: "Ready" }]}
        emptyDescription="Nothing to show."
        emptyTitle="No rows"
      />,
    );

    assert.match(markup, /Identity/);
    assert.match(markup, /Ready/);
  });

  it("renders the shared empty state when there are no rows", () => {
    const markup = renderToStaticMarkup(
      <AppDataTable
        columns={columns}
        data={[]}
        emptyDescription="Nothing to show."
        emptyTitle="No rows"
      />,
    );

    assert.match(markup, /No rows/);
    assert.match(markup, /Nothing to show\./);
  });
});
