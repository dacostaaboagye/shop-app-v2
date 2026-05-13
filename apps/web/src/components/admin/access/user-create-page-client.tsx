"use client";

import { useForm } from "@tanstack/react-form";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuthorization } from "@/components/providers/authorization-provider";
import { AppErrorBanner } from "@/components/system/app-error";
import { PageHeader, PageShell } from "@/components/system/page-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  adminRolesQueryKey,
  fetchAdminRoles,
} from "@/lib/react-query/admin-access";
import {
  adminLocationsQueryKey,
  adminUsersQueryKey,
  fetchAdminLocations,
} from "@/lib/react-query/admin-directory";
import { createAdminUser } from "@/lib/react-query/admin-user-access";
import { uploadAdminUserProfileImage } from "@/lib/react-query/admin-user-profile-media";
import { toRoute } from "@/lib/routes";
import { toast } from "@/lib/toast";
import { UserCreateForm } from "./user-create-form";
import {
  DEFAULT_USER_CREATE_VALUES,
  filterUserCreateRoles,
  toCreateUserRequest,
} from "./user-create-form.support";

const ROLE_OPTIONS_QUERY = { page: 1, pageSize: 100, q: "" } as const;
const LOCATION_OPTIONS_QUERY = {
  dir: "asc",
  page: 1,
  pageSize: 100,
  q: "",
  sort: "name",
  status: "active",
  type: "all",
} as const;

type UserCreatePageClientProps = {
  backHref?: Route;
  backLabel?: string;
  description?: string;
  detailHrefBase?: Route;
  eyebrow?: string;
  allowedRoleSlugs?: readonly string[];
  submitLabel?: string;
  submittingLabel?: string;
  title?: string;
};

export function UserCreatePageClient({
  allowedRoleSlugs,
  backHref = toRoute("/admin/access/users"),
  backLabel = "User access",
  description = "Create an internal workforce account and attach its starting role coverage.",
  detailHrefBase = toRoute("/admin/access/users"),
  eyebrow = "Access management",
  submitLabel = "Create user",
  submittingLabel = "Creating...",
  title = "Create user",
}: UserCreatePageClientProps = {}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { can } = useAuthorization();
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const canUploadProfileImage = can("catalog.media.manage");

  const rolesQuery = useQuery({
    queryFn: () => fetchAdminRoles(ROLE_OPTIONS_QUERY),
    queryKey: adminRolesQueryKey(ROLE_OPTIONS_QUERY),
  });
  const locationsQuery = useQuery({
    queryFn: () => fetchAdminLocations(LOCATION_OPTIONS_QUERY),
    queryKey: adminLocationsQueryKey(LOCATION_OPTIONS_QUERY),
  });
  const createMutation = useMutation({ mutationFn: createAdminUser });
  const form = useForm({
    defaultValues: DEFAULT_USER_CREATE_VALUES,
    onSubmit: async ({ value }) => {
      setWasSubmitted(true);
      const created = await createMutation.mutateAsync(
        toCreateUserRequest(value),
      );
      await invalidateUserDirectories(queryClient);

      if (value.profileImage && canUploadProfileImage) {
        try {
          await uploadAdminUserProfileImage({
            altText: `${created.firstName} ${created.lastName} profile image`,
            file: value.profileImage,
            userSlug: created.slug,
          });
          await queryClient.invalidateQueries({
            queryKey: ["admin", "access", "users", created.slug],
          });
        } catch {
          toast.error(
            "User created, but the profile image could not be uploaded. You can add it from the user profile.",
          );
        }
      }

      toast.success(created.setupInstruction);
      router.push(
        toRoute(`${detailHrefBase}/${encodeURIComponent(created.slug)}`),
      );
    },
  });
  const isLoading =
    (rolesQuery.isPending && !rolesQuery.data) ||
    (locationsQuery.isPending && !locationsQuery.data);
  const loadError = rolesQuery.error ?? locationsQuery.error;
  const roles = filterUserCreateRoles(
    rolesQuery.data?.items ?? [],
    allowedRoleSlugs,
  );

  return (
    <PageShell>
      <PageHeader
        backHref={backHref}
        backLabel={backLabel}
        description={description}
        eyebrow={eyebrow}
        title={title}
      />

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : loadError ? (
        <AppErrorBanner
          detail="Could not load roles or active locations for user creation."
          error={loadError}
          onRetry={() => {
            void rolesQuery.refetch();
            void locationsQuery.refetch();
          }}
          title="Unable to load create form"
        />
      ) : (
        <UserCreateForm
          canUploadProfileImage={canUploadProfileImage}
          form={form}
          locations={locationsQuery.data?.items ?? []}
          mutation={createMutation}
          onCancel={() => router.back()}
          roles={roles}
          setWasSubmitted={setWasSubmitted}
          submitLabel={submitLabel}
          submittingLabel={submittingLabel}
          wasSubmitted={wasSubmitted}
        />
      )}
    </PageShell>
  );
}

async function invalidateUserDirectories(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["admin", "access", "audit"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
    queryClient.invalidateQueries({ queryKey: ["admin", "staff"] }),
    queryClient.invalidateQueries({
      queryKey: adminUsersQueryKey({
        dir: "asc",
        locationSlug: "",
        page: 1,
        pageSize: 10,
        q: "",
        role: "",
        sort: "name",
        status: "all",
      }),
    }),
  ]);
}
