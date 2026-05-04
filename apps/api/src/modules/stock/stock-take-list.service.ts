import type {
  StockTakeSessionListQuery,
  StockTakeSessionListResponse,
} from "@shop/contracts";
import type { PostgresStockTakeListRepository } from "./postgres-stock-take-list.repository.js";

type StockTakeListRepository = Pick<
  PostgresStockTakeListRepository,
  "listSessions"
>;

export class StockTakeListService {
  constructor(private readonly repository: StockTakeListRepository) {}

  async listSessions(input: {
    portal: "admin" | "manager";
    query: StockTakeSessionListQuery;
  }): Promise<StockTakeSessionListResponse> {
    const result = await this.repository.listSessions(input);
    return {
      items: result.items,
      page: input.query.page,
      pageSize: input.query.pageSize,
      totalCount: result.totalCount,
    };
  }
}
