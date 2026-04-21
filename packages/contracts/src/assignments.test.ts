import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  locationStaffListResponseSchema,
  workerAssignmentListResponseSchema,
} from "./assignments.js";

describe("assignment contracts", () => {
  it("accepts worker assignment product brand and category metadata", () => {
    const parsed = workerAssignmentListResponseSchema.parse({
      items: [
        {
          availableQuantity: 2,
          brandName: "Omaya",
          brandSlug: "omaya",
          categoryName: "Backpacks",
          categorySlug: "backpacks",
          effectiveFrom: "2026-04-19T10:00:00.000Z",
          locationId: "4181707d-c61e-4c22-995d-335295748060",
          onHandQuantity: 4,
          primaryImageUrl: null,
          productName: "Omaya 1819 Backpack",
          productSlug: "omaya-1819-backpack",
          quantity: 2,
          sellingPrice: "300.00",
          sku: "OMAYA-BLACK",
          skuId: "3a5e8d69-36cf-4b1f-a5ef-4ad3de7b2111",
          variantName: "Black",
          variantSlug: "black",
          workerId: "5a5e8d69-36cf-4b1f-a5ef-4ad3de7b2111",
        },
      ],
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      locationName: "Downtown Store",
    });

    assert.equal(parsed.items[0]?.brandSlug, "omaya");
    assert.equal(parsed.items[0]?.categorySlug, "backpacks");
  });

  it("accepts location staff performance metrics", () => {
    const parsed = locationStaffListResponseSchema.parse({
      items: [
        {
          activeAssignmentCount: 4,
          assignedAt: "2026-04-19T10:00:00.000Z",
          email: "worker@example.com",
          firstName: "Ama",
          lastName: "Mensah",
          lastSaleAt: "2026-04-20T16:30:00.000Z",
          netSalesAmount: "125.50",
          roleName: "Worker",
          roleSlug: "worker",
          returnsCount: 1,
          returnsTotalAmount: "24.50",
          salesCount: 3,
          salesTotalAmount: "150.00",
          status: "active",
          userId: "3a5e8d69-36cf-4b1f-a5ef-4ad3de7b2111",
          userSlug: "ama-mensah",
        },
      ],
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      locationName: "Downtown Store",
    });

    assert.equal(parsed.items[0]?.salesCount, 3);
    assert.equal(parsed.items[0]?.netSalesAmount, "125.50");
  });

  it("defaults performance metrics for older staff payloads", () => {
    const parsed = locationStaffListResponseSchema.parse({
      items: [
        {
          activeAssignmentCount: 0,
          assignedAt: "2026-04-19T10:00:00.000Z",
          email: "worker@example.com",
          firstName: "Ama",
          lastName: "Mensah",
          roleName: "Worker",
          roleSlug: "worker",
          status: "active",
          userId: "3a5e8d69-36cf-4b1f-a5ef-4ad3de7b2111",
          userSlug: "ama-mensah",
        },
      ],
      locationId: "4181707d-c61e-4c22-995d-335295748060",
      locationName: "Downtown Store",
    });

    assert.equal(parsed.items[0]?.salesCount, 0);
    assert.equal(parsed.items[0]?.lastSaleAt, null);
  });
});
