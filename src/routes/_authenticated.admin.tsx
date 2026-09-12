import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n";
import { getOverviewFn } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/admin")({
  // Zero-cost guard: parent layout already resolved the membership.
  beforeLoad: ({ context }) => {
    const role = (context as { membership?: { role?: string } }).membership
      ?.role;
    if (role !== "owner") throw redirect({ to: "/app" });
  },
  component: AdminPage,
});

function AdminPage() {
  const { t } = useLocale();
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => getOverviewFn(),
  });
  const overview = overviewQuery.data;

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.admin.title}</CardTitle>
          <CardDescription>{t.admin.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          {overview ? (
            <dl className="grid gap-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t.admin.school}</dt>
                <dd className="font-medium">{overview.schoolName}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t.admin.yourRole}</dt>
                <dd className="font-medium">{overview.role}</dd>
              </div>
            </dl>
          ) : (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>
          )}
          <p className="text-muted-foreground mt-4">{t.admin.body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
