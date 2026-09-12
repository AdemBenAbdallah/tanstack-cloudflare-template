import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useLocale } from "@/i18n";

export function DashboardHeader({
  title,
  canCreateLesson,
}: {
  title: string;
  canCreateLesson: boolean;
}) {
  const { t } = useLocale();
  const navigate = useNavigate();

  return (
    <header className="bg-background/90 sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <h1 className="text-base font-medium">{title}</h1>
        <div className="ms-auto flex items-center gap-2">
          {canCreateLesson && (
            <Button
              size="sm"
              className="hidden h-7 sm:flex"
              onClick={() => void navigate({ to: "/calendar", search: {} })}
            >
              <Plus />
              <span>{t.header.quickCreate}</span>
            </Button>
          )}
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
