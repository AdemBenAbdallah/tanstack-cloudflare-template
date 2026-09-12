import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/i18n";
import { requireRoleFn } from "@/lib/auth-guard";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async () => {
    try {
      return await requireRoleFn({ data: { roles: ["admin"] } });
    } catch {
      throw redirect({ to: "/app" });
    }
  },
  component: AdminPage,
});

function AdminPage() {
  const { t } = useLocale();

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <CardTitle>{t.admin.title}</CardTitle>
          <CardDescription>{t.admin.description}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm">
          <p>{t.admin.body}</p>
        </CardContent>
      </Card>
    </div>
  );
}
