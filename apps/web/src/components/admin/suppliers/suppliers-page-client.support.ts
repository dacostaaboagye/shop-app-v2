import type { AdminSupplierListQuery } from "@shop/contracts";

export function createSupplierQuery(input: {
  dir: AdminSupplierListQuery["dir"];
  page: number;
  pageSize: number;
  q: string;
  sort: AdminSupplierListQuery["sort"];
  status: AdminSupplierListQuery["status"];
}): AdminSupplierListQuery {
  return {
    dir: input.dir,
    page: input.page,
    pageSize: input.pageSize,
    q: input.q,
    sort: input.sort,
    status: input.status,
  };
}
