import { CheckIcon, Filter, RefreshCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Toggle } from "@/components/ui/toggle";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { getBgColor } from "@/features/schedule/helpers";
import type { TEventColor } from "@/features/schedule/types";
import { useLocale } from "@/i18n";

export default function FilterEvents() {
  const { t } = useLocale();
  const { selectedColors, filterEventsBySelectedColors, clearFilter } =
    useCalendar();

  const colors: TEventColor[] = ["blue", "green", "red"];

  function colorLabel(color: TEventColor) {
    if (color === "green") return t.schedule.status.completed;
    if (color === "red") return t.schedule.status.cancelled;
    return t.schedule.status.scheduled;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Toggle variant="outline" className="cursor-pointer w-fit">
          <Filter className="h-4 w-4" />
        </Toggle>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[150px]">
        {colors.map((color) => (
          <DropdownMenuItem
            key={color}
            className="flex items-center gap-2 cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              filterEventsBySelectedColors(color);
            }}
          >
            <div className={`size-3.5 rounded-full ${getBgColor(color)}`} />
            <span className="capitalize flex justify-center items-center gap-2">
              {colorLabel(color)}
              <span>
                {selectedColors.includes(color) && (
                  <span className="text-blue-500">
                    <CheckIcon className="size-4" />
                  </span>
                )}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
        <Separator className="my-2" />
        <DropdownMenuItem
          disabled={selectedColors.length === 0}
          className="flex gap-2 cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            clearFilter();
          }}
        >
          <RefreshCcw className="size-3.5" />
          {t.schedule.filter.clear}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
