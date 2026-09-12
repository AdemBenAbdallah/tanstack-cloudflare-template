import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useLocale } from "@/i18n";

export interface NavMainItem {
  title: string;
  url: string;
  icon: LucideIcon;
}

export function NavMain({ items }: { items: Array<NavMainItem> }) {
  const { t } = useLocale();

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarGroupLabel>{t.sidebar.home}</SidebarGroupLabel>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild tooltip={item.title}>
                <Link
                  to={item.url}
                  activeProps={{
                    "data-active": true,
                  }}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
