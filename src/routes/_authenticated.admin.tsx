import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/i18n";
import { requireSchoolRoleFn } from "@/lib/auth-guard";
import { getOverviewFn } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      return await requireSchoolRoleFn({ data: { roles: ["owner"] } });
    } catch {
      throw redirect({ to: "/app" });
    }
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
            <p className="text-muted-foreground">{t.schedule.loading}</p>
          )}
          <p className="text-muted-foreground mt-4">{t.admin.body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
