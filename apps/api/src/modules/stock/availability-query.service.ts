export type StockAvailabilityWarning = {
  activeReservationQuantity: number;
  locationId: string;
  onHandQuantity: number;
  reason: "missing_balance_row" | "over_reserved";
  skuId: string;
};

export type StockAvailabilitySnapshot = {
  activeReservationQuantity: number;
  onHandQuantity: number;
  reservedQuantity: number;
};

export interface StockAvailabilityRepository {
  getStockAvailabilitySnapshot(input: {
    excludeReservationId?: string;
    locationId: string;
    lock?: "for_update";
    skuId: string;
  }): Promise<StockAvailabilitySnapshot | null>;
}

type StockAvailabilityServiceOptions = {
  onWarning?: (warning: StockAvailabilityWarning) => void;
};

export class StockAvailabilityService {
  constructor(
    private readonly repository: StockAvailabilityRepository,
    private readonly options: StockAvailabilityServiceOptions = {},
  ) {}

  async getAvailableStock(input: {
    excludeReservationId?: string;
    locationId: string;
    lock?: "for_update";
    skuId: string;
  }): Promise<number> {
    const snapshot = await this.repository.getStockAvailabilitySnapshot(input);

    if (!snapshot) {
      this.options.onWarning?.({
        activeReservationQuantity: 0,
        locationId: input.locationId,
        onHandQuantity: 0,
        reason: "missing_balance_row",
        skuId: input.skuId,
      });
      return 0;
    }

    const reservedQuantity =
      input.excludeReservationId == null
        ? snapshot.reservedQuantity
        : snapshot.activeReservationQuantity;
    const availableQuantity = snapshot.onHandQuantity - reservedQuantity;

    if (availableQuantity < 0) {
      this.options.onWarning?.({
        activeReservationQuantity: snapshot.activeReservationQuantity,
        locationId: input.locationId,
        onHandQuantity: snapshot.onHandQuantity,
        reason: "over_reserved",
        skuId: input.skuId,
      });
      return 0;
    }

    return availableQuantity;
  }
}
