export type ActiveReservationSummary = {
  createdAt: Date;
  expiresAt: Date | null;
  locationId: string;
  quantity: number;
  skuId: string;
  sourceKey: string;
  sourceType: string;
  status: "active";
  updatedAt: Date;
};

export interface ActiveReservationQueryRepository {
  listActiveReservations(input: {
    expiresAfter?: Date;
    expiresBefore?: Date;
    limit: number;
    locationId: string;
    skuId?: string;
    sourceType?: string;
  }): Promise<ActiveReservationSummary[]>;
}

export class ActiveReservationQueryService {
  constructor(private readonly repository: ActiveReservationQueryRepository) {}

  async listActiveReservations(input: {
    expiresAfter?: Date;
    expiresBefore?: Date;
    limit: number;
    locationId: string;
    skuId?: string;
    sourceType?: string;
  }): Promise<ActiveReservationSummary[]> {
    return this.repository.listActiveReservations(input);
  }
}
