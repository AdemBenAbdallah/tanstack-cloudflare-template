import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocale } from "@/i18n";

export function DashboardHeader({ title }: { title: string }) {
  const { t } = useLocale();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as {
    q?: string;
  };

  function onSearch(value: string) {
    if (pathname === "/app") {
      void navigate({ to: "/app", search: (prev) => ({ ...prev, q: value }) });
    } else {
      void navigate({ to: "/app", search: { q: value } });
    }
  }

  return (
    <header className="bg-background/90 sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ms-auto flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="text-muted-foreground absolute top-1/2 size-4 -translate-y-1/2 start-2.5" />
            <Input
              id="dashboard-search"
              value={search.q ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder={t.header.searchPlaceholder}
              className="w-48 ps-8 lg:w-64"
            />
          </div>
          <Button
            size="sm"
            className="hidden h-7 sm:flex"
            onClick={() =>
              void navigate({ to: "/app", search: { dialog: "new" } })
            }
          >
            <Plus />
            <span>{t.header.quickCreate}</span>
          </Button>
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
