import type { VariantProps } from "class-variance-authority";
import { cva } from "class-variance-authority";
import { endOfDay, isSameDay, parseISO, startOfDay } from "date-fns";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";
import { EventDetailsDialog } from "@/features/schedule/dialogs/event-details-dialog";
import { DraggableEvent } from "@/features/schedule/dnd/draggable-event";
import { formatTime } from "@/features/schedule/helpers";
import type { IEvent } from "@/features/schedule/interfaces";
import { EventBullet } from "@/features/schedule/views/month-view/event-bullet";
import { useLocale } from "@/i18n";
import { cn } from "@/lib/utils";

const eventBadgeVariants = cva(
  "flex w-full h-6.5 select-none items-center justify-between gap-1.5 truncate whitespace-nowrap rounded-md border px-2 text-xs cursor-grab",
  {
    variants: {
      color: {
        // Colored variants
        blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
        green:
          "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
        red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
        yellow:
          "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
        purple:
          "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
        orange:
          "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",

        // Dot variants
        "blue-dot": "bg-muted text-foreground [&_svg]:fill-blue-600",
        "green-dot": "bg-muted text-foreground [&_svg]:fill-green-600",
        "red-dot": "bg-muted text-foreground [&_svg]:fill-red-600",
        "orange-dot": "bg-muted text-foreground [&_svg]:fill-orange-600",
        "purple-dot": "bg-muted text-foreground [&_svg]:fill-purple-600",
        "yellow-dot": "bg-muted text-foreground [&_svg]:fill-yellow-600",
      },
      multiDayPosition: {
        first: "relative z-10 me-0 rounded-e-none border-e-0 [&>span]:me-2.5",
        middle:
          "relative z-10 mx-0 w-[calc(100%_+_1px)] rounded-none border-x-0",
        last: "ms-0 rounded-s-none border-s-0",
        none: "",
      },
    },
    defaultVariants: {
      color: "blue-dot",
    },
  },
);

interface IProps
  extends Omit<
    VariantProps<typeof eventBadgeVariants>,
    "color" | "multiDayPosition"
  > {
  event: IEvent;
  cellDate: Date;
  eventCurrentDay?: number;
  eventTotalDays?: number;
  className?: string;
  position?: "first" | "middle" | "last" | "none";
}

export function MonthEventBadge({
  event,
  cellDate,
  eventCurrentDay,
  eventTotalDays,
  className,
  position: propPosition,
}: IProps) {
  const { t } = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const { badgeVariant, use24HourFormat } = useCalendar();

  const itemStart = startOfDay(parseISO(event.startDate));
  const itemEnd = endOfDay(parseISO(event.endDate));

  if (cellDate < itemStart || cellDate > itemEnd) return null;

  let position: "first" | "middle" | "last" | "none" | undefined;

  if (propPosition) {
    position = propPosition;
  } else if (eventCurrentDay && eventTotalDays) {
    position = "none";
  } else if (isSameDay(itemStart, itemEnd)) {
    position = "none";
  } else if (isSameDay(cellDate, itemStart)) {
    position = "first";
  } else if (isSameDay(cellDate, itemEnd)) {
    position = "last";
  } else {
    position = "middle";
  }

  const renderBadgeText = ["first", "none"].includes(position);
  const renderBadgeTime = ["last", "none"].includes(position);

  const color = (
    badgeVariant === "dot" ? `${event.color}-dot` : event.color
  ) as VariantProps<typeof eventBadgeVariants>["color"];

  const eventBadgeClasses = cn(
    eventBadgeVariants({ color, multiDayPosition: position, className }),
  );

  const marginClass = {
    first: "ms-1 me-0",
    middle: "mx-0",
    last: "ms-0 me-1",
    none: "mx-1",
  }[position || "none"];

  return (
    <DraggableEvent event={event} className={marginClass}>
      <EventDetailsDialog event={event}>
        <button type="button" className={eventBadgeClasses}>
          <div className="flex items-center gap-1.5 truncate">
            {!["middle", "last"].includes(position) &&
              badgeVariant === "dot" && <EventBullet color={event.color} />}

            {renderBadgeText && (
              <p className="flex-1 truncate font-semibold">
                {eventCurrentDay && (
                  <span className="text-xs">
                    {t.schedule.badge.day} {eventCurrentDay} {t.table.of}{" "}
                    {eventTotalDays} •{" "}
                  </span>
                )}
                {event.title}
              </p>
            )}
          </div>

          <div className="hidden sm:block">
            {renderBadgeTime && (
              <span>
                {formatTime(
                  new Date(event.startDate),
                  use24HourFormat,
                  dateFnsLocale,
                )}
              </span>
            )}
          </div>
        </button>
      </EventDetailsDialog>
    </DraggableEvent>
  );
}
