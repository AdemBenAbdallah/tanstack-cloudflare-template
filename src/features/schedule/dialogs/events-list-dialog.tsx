import { format } from "date-fns";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";
import { EventDetailsDialog } from "@/features/schedule/dialogs/event-details-dialog";
import { formatTime } from "@/features/schedule/helpers";
import type { IEvent } from "@/features/schedule/interfaces";
import { dayCellVariants } from "@/features/schedule/views/month-view/day-cell";
import { EventBullet } from "@/features/schedule/views/month-view/event-bullet";
import { useLocale } from "@/i18n";
import { cn } from "@/lib/utils";

interface EventListDialogProps {
  date: Date;
  events: IEvent[];
  maxVisibleEvents?: number;
  children?: ReactNode;
}

export function EventListDialog({
  date,
  events,
  maxVisibleEvents = 3,
  children,
}: EventListDialogProps) {
  const { t } = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const cellEvents = events;
  const hiddenEventsCount = Math.max(cellEvents.length - maxVisibleEvents, 0);
  const { badgeVariant, use24HourFormat } = useCalendar();

  const defaultTrigger = (
    <span className="cursor-pointer">
      <span className="sm:hidden">+{hiddenEventsCount}</span>
      <span className="hidden sm:inline py-0.5 px-2 my-1 rounded-xl border">
        {hiddenEventsCount}
        <span className="mx-1">{t.schedule.list.more}</span>
      </span>
    </span>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>{children || defaultTrigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="my-2">
            <div className="flex items-center gap-2">
              <EventBullet color={cellEvents[0]?.color} className="" />
              <p className="text-sm font-medium">
                {t.schedule.list.title}{" "}
                {dateFnsLocale
                  ? format(date, "EEEE, MMMM d, yyyy", {
                      locale: dateFnsLocale,
                    })
                  : format(date, "EEEE, MMMM d, yyyy")}
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-2">
          {cellEvents.length > 0 ? (
            cellEvents.map((event) => (
              <EventDetailsDialog event={event} key={event.id}>
                <div
                  className={cn(
                    "flex items-center gap-2 p-2 border rounded-md hover:bg-muted cursor-pointer",
                    {
                      [dayCellVariants({ color: event.color })]:
                        badgeVariant === "colored",
                    },
                  )}
                >
                  <EventBullet color={event.color} />
                  <div className="flex justify-between items-center w-full">
                    <p className="text-sm font-medium">{event.title}</p>
                    <p className="text-xs">
                      {formatTime(
                        event.startDate,
                        use24HourFormat,
                        dateFnsLocale,
                      )}
                    </p>
                  </div>
                </div>
              </EventDetailsDialog>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">
              {t.schedule.list.empty}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
