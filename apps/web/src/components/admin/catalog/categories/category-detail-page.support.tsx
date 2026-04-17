import { PageShell } from "@/components/system/page-shell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export const CATEGORY_PARENT_QUERY = {
  dir: "asc" as const,
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name" as const,
  status: "active" as const,
};

export function CategoryDetailSkeleton() {
  return (
    <PageShell>
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-48 w-full" />
    </PageShell>
  );
}

export function CategoryDetailError({ message }: { message: string }) {
  return (
    <PageShell>
      <Alert variant="destructive">
        <AlertTitle>Unable to load category</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    </PageShell>
  );
}
