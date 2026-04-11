import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AdminVariantSummary } from "@shop/contracts";
import {
  getDefaultVariantFormValues,
  getVariantArchiveRequest,
  getVariantFormValues,
  toVariantCreateRequest,
  toVariantUpdateRequest,
} from "./variant-form.support";

const variant: AdminVariantSummary = {
  archivedAt: null,
  attributes: { Color: "Red", Size: "M" },
  barcode: "123456",
  costPrice: "8.10",
  createdAt: "2026-04-11T00:00:00.000Z",
  customsCode: "9988",
  dimensionsCm: { height: 12, length: 8, width: 4 },
  isDefault: true,
  manufacturerPartNumber: "MPN-12",
  name: "Medium / Red",
  packagingType: "carton",
  sellingPrice: "14.50",
  sku: "SKU-RED-M",
  slug: "medium-red",
  status: "active",
  unitOfMeasure: "each",
  weightGrams: 320,
};

describe("variant form support", () => {
  it("builds default create values", () => {
    assert.deepEqual(getDefaultVariantFormValues(), {
      attributesText: "",
      barcode: "",
      costPrice: "0.00",
      customsCode: "",
      dimensionsHeight: "",
      dimensionsLength: "",
      dimensionsWidth: "",
      isDefault: false,
      manufacturerPartNumber: "",
      name: "",
      packagingType: "",
      sellingPrice: "0.00",
      sku: "",
      status: "active",
      unitOfMeasure: "each",
      weightGrams: "",
    });
  });

  it("derives editable form values from the variant summary", () => {
    assert.deepEqual(getVariantFormValues(variant), {
      attributesText: "Color: Red\nSize: M",
      barcode: "123456",
      costPrice: "8.10",
      customsCode: "9988",
      dimensionsHeight: "12",
      dimensionsLength: "8",
      dimensionsWidth: "4",
      isDefault: true,
      manufacturerPartNumber: "MPN-12",
      name: "Medium / Red",
      packagingType: "carton",
      sellingPrice: "14.50",
      sku: "SKU-RED-M",
      status: "active",
      unitOfMeasure: "each",
      weightGrams: "320",
    });
  });

  it("maps create values into the API payload", () => {
    assert.deepEqual(
      toVariantCreateRequest(
        {
          attributesText: "Color: Blue\nSize: L",
          barcode: " 123 ",
          costPrice: " 9.99 ",
          customsCode: "",
          dimensionsHeight: "10",
          dimensionsLength: "",
          dimensionsWidth: "4.5",
          isDefault: true,
          manufacturerPartNumber: " PART-7 ",
          name: "  Large / Blue  ",
          packagingType: " box ",
          sellingPrice: " 19.99 ",
          sku: " SKU-BLUE-L ",
          status: "active",
          unitOfMeasure: " each ",
          weightGrams: "450",
        },
        true,
      ),
      {
        attributes: { Color: "Blue", Size: "L" },
        barcode: "123",
        costPrice: "9.99",
        customsCode: null,
        dimensionsCm: { height: 10, width: 4.5 },
        isDefault: true,
        manufacturerPartNumber: "PART-7",
        name: "Large / Blue",
        packagingType: "box",
        sellingPrice: "19.99",
        sku: "SKU-BLUE-L",
        status: "active",
        unitOfMeasure: "each",
        weightGrams: 450,
      },
    );
  });

  it("omits cost price updates for users without permission and clears defaults on archive", () => {
    assert.deepEqual(
      toVariantUpdateRequest(
        {
          ...getVariantFormValues(variant),
          costPrice: "12.50",
          isDefault: true,
          status: "archived",
        },
        false,
      ),
      {
        attributes: { Color: "Red", Size: "M" },
        barcode: "123456",
        customsCode: "9988",
        dimensionsCm: { height: 12, length: 8, width: 4 },
        isDefault: false,
        manufacturerPartNumber: "MPN-12",
        name: "Medium / Red",
        packagingType: "carton",
        sellingPrice: "14.50",
        sku: "SKU-RED-M",
        status: "archived",
        unitOfMeasure: "each",
        weightGrams: 320,
      },
    );
  });

  it("produces the archive mutation payload", () => {
    assert.deepEqual(getVariantArchiveRequest(), { status: "archived" });
  });
});
