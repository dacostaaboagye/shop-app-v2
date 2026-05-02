import type { Route } from "next";
import type { ReactNode } from "react";
import { PageHeader, PageShell } from "@/components/system/page-shell";

type CatalogHistoryPageViewProps = {
  backHref: Route;
  backLabel: string;
  children: ReactNode;
  description: string;
  title: string;
};

// Pure presentation surface for any dedicated change-history page. The page
// client wires the queries + permission gate; this component owns the
// shell, breadcrumb, and heading so the feature reads consistently across
// products, brands, categories, and variants.
export function CatalogHistoryPageView({
  backHref,
  backLabel,
  children,
  description,
  title,
}: CatalogHistoryPageViewProps) {
  return (
    <PageShell>
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        description={description}
        title={title}
      />
      <section className="flex flex-col gap-4">{children}</section>
    </PageShell>
  );
}
