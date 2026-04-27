import type {
  AdminSentCommunicationListQuery,
  AdminSentCommunicationListResponse,
} from "@shop/contracts";

type AdminCommunicationQueryRepository = {
  listSent(
    input: AdminSentCommunicationListQuery,
  ): Promise<AdminSentCommunicationListResponse>;
};

export class AdminCommunicationQueryService {
  constructor(private readonly repository: AdminCommunicationQueryRepository) {}

  async listSent(input: AdminSentCommunicationListQuery) {
    return this.repository.listSent(input);
  }
}
