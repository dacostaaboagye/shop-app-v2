import type {
  AdminLocationListQuery,
  AdminLocationStaffSummary,
  AdminLocationSummary,
  AdminLocationZoneSummary,
} from "@shop/contracts";

export type AdminLocationQueryRepository = {
  getLocation(slug: string): Promise<AdminLocationSummary | null>;
  listLocations(input: AdminLocationListQuery): Promise<{
    items: AdminLocationSummary[];
    totalCount: number;
  }>;
  listLocationStaff(locationSlug: string): Promise<{
    items: AdminLocationStaffSummary[];
    locationName: string | null;
    locationSlug: string;
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

  async listLocationStaff(locationSlug: string) {
    return this.repository.listLocationStaff(locationSlug);
  }

  async listLocationZones(locationSlug: string) {
    return this.repository.listLocationZones(locationSlug);
  }
}
