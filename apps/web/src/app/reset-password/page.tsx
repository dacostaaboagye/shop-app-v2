import Link from "next/link";
import { ResetPasswordClient } from "@/components/auth/reset-password-client";
import { AuthPageShell } from "@/components/system/auth-page-shell";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toRoute } from "@/lib/routes";

type ResetPasswordPageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const { token } = await searchParams;

  return (
    <AuthPageShell>
      <Card className="border border-border bg-card shadow-none">
        <CardHeader className="pb-2">
          <CardTitle className="font-sans text-lg font-semibold">
            Set new password
          </CardTitle>
          <CardDescription>
            Choose a strong password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <ResetPasswordClient token={token} />
          <p className="text-sm text-muted-foreground">
            Back to{" "}
            <Link
              className="text-sm font-medium underline-offset-4 hover:underline"
              href={toRoute("/login")}
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </AuthPageShell>
  );
}
