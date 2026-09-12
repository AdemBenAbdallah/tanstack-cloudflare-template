import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  LayoutDashboard,
  LayoutDashboardIcon,
  ShieldCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLocale } from "@/i18n";
import { NavMain } from "./nav-main";
import { NavUser, type NavUserData } from "./nav-user";

export function AppSidebar({
  user,
  isAdmin,
  canSchedule,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUserData;
  isAdmin: boolean;
  canSchedule: boolean;
}) {
  const { t } = useLocale();

  return (
    <Sidebar {...props}>
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:p-1.5!"
            >
              <Link to="/app">
                <LayoutDashboardIcon className="size-5!" />
                <span className="text-base font-semibold">
                  {t.sidebar.brand}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={[
            { title: t.sidebar.overview, url: "/app", icon: LayoutDashboard },
            ...(canSchedule
              ? [
                  {
                    title: t.sidebar.schedule,
                    url: "/calendar",
                    icon: CalendarDays,
                  },
                ]
              : []),
            ...(isAdmin
              ? [{ title: t.nav.admin, url: "/admin", icon: ShieldCheck }]
              : []),
          ]}
        />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
