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
import { getMembershipFn, getSessionFn } from "@/lib/auth-guard";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    const session = await getSessionFn().catch(() => null);
    if (!session) throw redirect({ to: "/login" });
    const membership = await getMembershipFn().catch(() => null);
    // Signed in but no school yet (fresh signup) -> onboarding.
    if (!membership) throw redirect({ to: "/onboarding" });
    return { user: session.user, membership };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { t, dir } = useLocale();
  const { user, membership } = Route.useRouteContext() as {
    user: { id: string; name: string; email: string };
    membership: { role: string };
  };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const role = membership.role;
  const title =
    pathname === "/admin"
      ? t.nav.admin
      : pathname === "/calendar"
        ? t.schedule.pageTitle
        : role === "student"
          ? t.overview.myDay
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
        user={{ name: user.name, email: user.email, role }}
        isAdmin={role === "owner"}
        canSchedule={role === "owner" || role === "secretary"}
      />
      <SidebarInset>
        <DashboardHeader
          title={title}
          canCreateLesson={role === "owner" || role === "secretary"}
        />
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
