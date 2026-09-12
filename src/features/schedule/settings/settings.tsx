import { SettingsIcon } from "lucide-react";
import type { ChangeEvent } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  MAX_SCROLL_HOUR,
  MIN_SCROLL_HOUR,
  useCalendar,
} from "@/features/schedule/contexts/calendar-context";
import { useLocale } from "@/i18n";

export function Settings() {
  const { t } = useLocale();
  const {
    badgeVariant,
    setBadgeVariant,
    use24HourFormat,
    toggleTimeFormat,
    startOfDayHour,
    setStartOfDayHour,
    agendaModeGroupBy,
    setAgendaModeGroupBy,
  } = useCalendar();
  const { theme, setTheme } = useTheme();

  const isDotVariant = badgeVariant === "dot";

  const onChangeStartOfDay = (e: ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (
      !Number.isNaN(val) &&
      val >= MIN_SCROLL_HOUR &&
      val <= MAX_SCROLL_HOUR
    ) {
      setStartOfDayHour(val);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          aria-label={t.schedule.settings.title}
        >
          <SettingsIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>{t.schedule.settings.title}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            {t.theme.dark}
            <span className="ms-auto">
              <Switch
                checked={theme === "dark"}
                onCheckedChange={(checked) =>
                  setTheme(checked ? "dark" : "light")
                }
              />
            </span>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            {t.schedule.settings.dotBadge}
            <span className="ms-auto">
              <Switch
                checked={isDotVariant}
                onCheckedChange={(checked) =>
                  setBadgeVariant(checked ? "dot" : "colored")
                }
              />
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            {t.schedule.settings.hour24}
            <span className="ms-auto">
              <Switch
                checked={use24HourFormat}
                onCheckedChange={toggleTimeFormat}
              />
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            {t.schedule.settings.dayStart}
            <span className="ms-auto flex items-center gap-1">
              <Input
                type="number"
                value={startOfDayHour}
                max={MAX_SCROLL_HOUR}
                min={MIN_SCROLL_HOUR}
                onChange={onChangeStartOfDay}
                className="w-16"
              />
              h
            </span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t.schedule.settings.groupBy}</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={agendaModeGroupBy}
            onValueChange={(value) =>
              setAgendaModeGroupBy(value as "date" | "color")
            }
          >
            <DropdownMenuRadioItem value="date">
              {t.schedule.settings.byDate}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="color">
              {t.schedule.settings.byStatus}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
