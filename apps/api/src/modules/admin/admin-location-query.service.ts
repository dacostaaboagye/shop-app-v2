import type {
  AdminLocationListQuery,
  AdminLocationSummary,
  AdminLocationZoneSummary,
} from "@shop/contracts";

export type AdminLocationQueryRepository = {
  getLocation(slug: string): Promise<AdminLocationSummary | null>;
  listLocations(input: AdminLocationListQuery): Promise<{
    items: AdminLocationSummary[];
    totalCount: number;
  }>;
  listLocationZones(locationSlug: string): Promise<AdminLocationZoneSummary[]>;
};

export class AdminLocationQueryService {
  constructor(private readonly repository: AdminLocationQueryRepository) {}

  async getLocation(slug: string) {
    return this.repository.getLocation(slug);
  }

  async listLocations(input: AdminLocationListQuery) {
    return this.repository.listLocations(input);
  }

  async listLocationZones(locationSlug: string) {
    return this.repository.listLocationZones(locationSlug);
  }
}
