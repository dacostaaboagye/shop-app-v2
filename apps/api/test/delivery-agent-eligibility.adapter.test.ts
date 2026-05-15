import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PostgresDeliveryAgentEligibilityAdapter } from "../src/modules/deliveries/postgres-delivery-agent-eligibility.adapter.js";

type FakeRoleRow = { userRoleId: string };

class FakeDeliveryAgentEligibilityDb {
  public readonly calls: string[] = [];

  constructor(private readonly rows: FakeRoleRow[]) {}

  select() {
    this.calls.push("select");
    return new FakeDeliveryAgentEligibilityQuery(this.rows, this.calls);
  }
}

class FakeDeliveryAgentEligibilityQuery {
  constructor(
    private readonly rows: FakeRoleRow[],
    private readonly calls: string[],
  ) {}

  from() {
    this.calls.push("from:user_roles");
    return this;
  }

  innerJoin() {
    this.calls.push("innerJoin");
    return this;
  }

  where() {
    this.calls.push("where:active-agent-role-at-location");
    return this;
  }

  async limit(limit: number): Promise<FakeRoleRow[]> {
    this.calls.push(`limit:${limit}`);
    return this.rows.slice(0, limit);
  }
}

describe("PostgresDeliveryAgentEligibilityAdapter", () => {
  it("accepts users with an active agent role at the origin location", async () => {
    const db = new FakeDeliveryAgentEligibilityDb([{ userRoleId: "role-1" }]);
    const adapter = new PostgresDeliveryAgentEligibilityAdapter(db as never);

    const eligible = await adapter.isEligibleAgent({
      locationId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
    });

    assert.equal(eligible, true);
    assert.deepEqual(db.calls, [
      "select",
      "from:user_roles",
      "innerJoin",
      "innerJoin",
      "where:active-agent-role-at-location",
      "limit:1",
    ]);
  });

  it("rejects users without an active agent role at the origin location", async () => {
    const db = new FakeDeliveryAgentEligibilityDb([]);
    const adapter = new PostgresDeliveryAgentEligibilityAdapter(db as never);

    const eligible = await adapter.isEligibleAgent({
      locationId: "22222222-2222-4222-8222-222222222222",
      userId: "11111111-1111-4111-8111-111111111111",
    });

    assert.equal(eligible, false);
  });
});
