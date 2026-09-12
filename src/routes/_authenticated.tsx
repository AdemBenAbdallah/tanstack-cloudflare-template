import {
  createFileRoute,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { useLocale } from "@/i18n";
import { getSessionFn } from "@/lib/auth-guard";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    try {
      const session = await getSessionFn();
      if (!session) throw redirect({ to: "/login" });
      return session;
    } catch {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { t, dir } = useLocale();
  const { user } = Route.useRouteContext() as {
    user: { id: string; name: string; email: string; role: string };
  };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const title =
    pathname === "/admin"
      ? t.nav.admin
      : pathname === "/calendar"
        ? t.schedule.pageTitle
        : t.nav.dashboard;

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 64)",
          "--header-height": "calc(var(--spacing) * 12 + 1px)",
        } as React.CSSProperties
      }
    >
      <AppSidebar
        side={dir === "rtl" ? "right" : "left"}
        user={user}
        isAdmin={user.role === "admin"}
        canSchedule={user.role === "admin" || user.role === "manager"}
      />
      <SidebarInset>
        <DashboardHeader title={title} />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <Outlet />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
