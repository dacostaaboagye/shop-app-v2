import type {
  StockTakeCreateRequest,
  StockTakeSessionDetail,
} from "@shop/contracts";
import { AppError } from "../_core/errors/app-error.js";
import type { ReferenceNumberService } from "../public-identifiers/reference-number.service.js";
import type { PostgresStockTakeRepository } from "./postgres-stock-take.repository.js";

type StockTakeRepository = Pick<
  PostgresStockTakeRepository,
  | "createSession"
  | "findLocationBySlug"
  | "findSessionLocationByReference"
  | "getSessionByReference"
>;

export class StockTakeService {
  constructor(
    private readonly repository: StockTakeRepository,
    private readonly referenceNumberService: Pick<
      ReferenceNumberService,
      "generateReference"
    >,
  ) {}

  async createSession(input: {
    generatedBy?: string;
    generatedBySlug?: string;
    portal: "admin" | "manager";
    request: StockTakeCreateRequest;
  }): Promise<StockTakeSessionDetail> {
    const location = await this.repository.findLocationBySlug(
      input.request.locationSlug,
    );
    if (!location) {
      throw new AppError({
        code: "not_found",
        detail: `Location "${input.request.locationSlug}" was not found.`,
        statusCode: 404,
        title: "Location not found",
      });
    }

    const now = new Date();
    const reference = await this.referenceNumberService.generateReference({
      now,
      sequenceKey: "stock-take",
    });

    return this.repository.createSession({
      ...(input.generatedBy ? { generatedBy: input.generatedBy } : {}),
      ...(input.generatedBySlug
        ? { generatedBySlug: input.generatedBySlug }
        : {}),
      location,
      now,
      portal: input.portal,
      reference,
      request: input.request,
    });
  }

  async findLocationBySlug(locationSlug: string) {
    return this.repository.findLocationBySlug(locationSlug);
  }

  async findSessionLocationByReference(reference: string) {
    return this.repository.findSessionLocationByReference(reference);
  }

  async getSession(input: {
    portal: "admin" | "manager";
    reference: string;
  }): Promise<StockTakeSessionDetail> {
    const session = await this.repository.getSessionByReference(input);

    if (!session) {
      throw new AppError({
        code: "not_found",
        detail: `Stock take "${input.reference}" was not found.`,
        statusCode: 404,
        title: "Stock take not found",
      });
    }

    return session;
  }

  async getAppliedVarianceReportSession(input: {
    portal: "admin" | "manager";
    reference: string;
  }): Promise<StockTakeSessionDetail> {
    const session = await this.getSession(input);

    if (session.status !== "applied") {
      throw new AppError({
        code: "conflict",
        detail:
          "Apply this stock-take before downloading the final variance report.",
        statusCode: 409,
        title: "Variance report unavailable",
      });
    }

    return session;
  }
}
