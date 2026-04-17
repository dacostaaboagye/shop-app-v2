import type { AdminVariantSummary } from "@shop/contracts";

type VariantRowDetailsProps = {
  canSeeCostPrice: boolean;
  variant: AdminVariantSummary;
};

export function VariantRowDetails({
  canSeeCostPrice,
  variant,
}: VariantRowDetailsProps) {
  return (
    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
      <div>
        <p className="text-xs text-muted-foreground">Selling price</p>
        <p className="font-medium">{variant.sellingPrice}</p>
      </div>
      {canSeeCostPrice ? (
        <div>
          <p className="text-xs text-muted-foreground">Cost price</p>
          <p className="font-medium">{variant.costPrice}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs text-muted-foreground">Unit</p>
        <p>{variant.unitOfMeasure}</p>
      </div>
      {variant.weightGrams ? (
        <div>
          <p className="text-xs text-muted-foreground">Weight</p>
          <p>{variant.weightGrams} g</p>
        </div>
      ) : null}
      {Object.entries(variant.attributes).length > 0 ? (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Attributes</p>
          <p>
            {Object.entries(variant.attributes)
              .map(([key, value]) => `${key}: ${value}`)
              .join(", ")}
          </p>
        </div>
      ) : null}
      {variant.packagingType ? (
        <div>
          <p className="text-xs text-muted-foreground">Packaging</p>
          <p>{variant.packagingType}</p>
        </div>
      ) : null}
      {variant.barcode ? (
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Barcode</p>
          <p className="font-mono text-[0.72rem]">{variant.barcode}</p>
        </div>
      ) : null}
      {variant.isTaxable !== null ? (
        <div>
          <p className="text-xs text-muted-foreground">Taxable?</p>
          <p>{variant.isTaxable ? "Yes" : "No"}</p>
        </div>
      ) : null}
      {variant.taxCategory ? (
        <div className="col-span-2 sm:col-span-1">
          <p className="text-xs text-muted-foreground">Tax category</p>
          <p>{variant.taxCategory}</p>
        </div>
      ) : null}
    </div>
  );
}
