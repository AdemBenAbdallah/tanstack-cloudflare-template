import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Car,
  LayoutDashboard,
  LayoutDashboardIcon,
  Package,
  ShieldCheck,
  UserCog,
  Users,
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
  role,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  user: NavUserData;
  role: string;
}) {
  const { t } = useLocale();
  const isOwner = role === "owner";
  const isStaff = role === "owner" || role === "secretary";

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
            {
              title: t.sidebar.schedule,
              url: "/calendar",
              icon: CalendarDays,
            },
            ...(isStaff
              ? [
                  {
                    title: t.people.students,
                    url: "/students",
                    icon: Users,
                  },
                  {
                    title: t.people.vehicles,
                    url: "/vehicles",
                    icon: Car,
                  },
                ]
              : []),
            ...(isOwner
              ? [
                  {
                    title: t.people.instructors,
                    url: "/instructors",
                    icon: UserCog,
                  },
                  {
                    title: t.people.packages,
                    url: "/packages",
                    icon: Package,
                  },
                  { title: t.nav.admin, url: "/admin", icon: ShieldCheck },
                ]
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
