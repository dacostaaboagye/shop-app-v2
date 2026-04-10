import { Barcode, PackageSearch } from "lucide-react";
import {
  HeroPanel,
  InsightCard,
  PageShell,
} from "@/components/system/page-shell";

const catalogueWork = [
  "Product and variant creation with SKU, price, and unit fields.",
  "Bulk import with row-level error reporting.",
  "Image upload, supplier linking, and change history views.",
];

export default function AdminProductsPage() {
  return (
    <PageShell>
      <HeroPanel
        eyebrow="Catalogue"
        title="Products and variants"
        description="This route is the stable home for the catalogue backlog. Product creation, bulk import, supplier links, and audit history will all grow inside this permission-gated surface."
        badges={["E-03-01", "E-03-06"]}
        aside={
          <InsightCard
            eyebrow="Next slice"
            title="Catalogue control plane"
            description="The page is shaped for operational product work rather than a storefront merchandising layout."
          >
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              {catalogueWork.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <Barcode className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </InsightCard>
        }
      />

      <InsightCard
        eyebrow="Route status"
        title="Permission-gated destination is in place"
        description="Sidebar visibility now depends on `catalog.view`. The real catalogue screens can now land without changing portal chrome."
      >
        <div className="token-row text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-2">
            <PackageSearch className="size-4 text-primary" />
            `/admin/products`
          </span>
        </div>
      </InsightCard>
    </PageShell>
  );
}
