import { format, parseISO } from "date-fns";
import type { FC } from "react";
import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";
import { EventDetailsDialog } from "@/features/schedule/dialogs/event-details-dialog";
import {
  formatTime,
  getBgColor,
  getColorClass,
  getEventsForMonth,
  getFirstLetters,
} from "@/features/schedule/helpers";
import type { IEvent } from "@/features/schedule/interfaces";
import { EventBullet } from "@/features/schedule/views/month-view/event-bullet";
import { useLocale } from "@/i18n";
import { cn } from "@/lib/utils";

export const AgendaEvents: FC = () => {
  const { t } = useLocale();
  const {
    events,
    use24HourFormat,
    badgeVariant,
    agendaModeGroupBy,
    selectedDate,
  } = useCalendar();
  const [query, setQuery] = useState("");

  const dateFnsLocale = useDateFnsLocale();
  const monthEvents = getEventsForMonth(events, selectedDate);
  const fmt = (date: Date | string, fmtStr: string) => {
    const d = typeof date === "string" ? parseISO(date) : date;
    return dateFnsLocale
      ? format(d, fmtStr, { locale: dateFnsLocale })
      : format(d, fmtStr);
  };
  const q = query.trim().toLowerCase();
  const searched = q
    ? monthEvents.filter(
        (event) =>
          event.title.toLowerCase().includes(q) ||
          event.description.toLowerCase().includes(q) ||
          event.user.name.toLowerCase().includes(q),
      )
    : monthEvents;

  const grouped = new Map<string, Array<IEvent>>();
  for (const event of searched) {
    const key =
      agendaModeGroupBy === "date"
        ? format(parseISO(event.startDate), "yyyy-MM-dd")
        : event.color;
    const list = grouped.get(key);
    if (list) list.push(event);
    else grouped.set(key, [event]);
  }
  const groupedAndSortedEvents = [...grouped.entries()].sort(
    (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime(),
  );

  function statusLabel(color: string) {
    if (color === "green") return t.schedule.status.completed;
    if (color === "red") return t.schedule.status.cancelled;
    return t.schedule.status.scheduled;
  }

  return (
    <div className="py-4 h-[80vh] bg-transparent overflow-y-auto">
      <div className="mb-4 mx-4">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.schedule.agenda.search}
        />
      </div>
      <div className="max-h-max px-3 border-t">
        {groupedAndSortedEvents.map(([date, groupedEvents]) => (
          <div key={date} className="py-2">
            <p className="text-muted-foreground px-1 py-2 text-sm font-medium">
              {agendaModeGroupBy === "date"
                ? fmt(parseISO(date), "EEEE, MMMM d, yyyy")
                : statusLabel(groupedEvents[0].color)}
            </p>
            {groupedEvents.map((event) => (
              <EventDetailsDialog event={event} key={event.id}>
                <div
                  className={cn(
                    "mb-2 p-4 border rounded-md transition-all hover:cursor-pointer",
                    {
                      [getColorClass(event.color)]: badgeVariant === "colored",
                      "hover:bg-muted": badgeVariant === "dot",
                      "hover:opacity-60": badgeVariant === "colored",
                    },
                  )}
                >
                  <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      {badgeVariant === "dot" ? (
                        <EventBullet color={event.color} />
                      ) : (
                        <Avatar>
                          <AvatarFallback className={getBgColor(event.color)}>
                            {getFirstLetters(event.title)}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col">
                        <p
                          className={cn({
                            "font-medium": badgeVariant === "dot",
                            "text-foreground": badgeVariant === "dot",
                          })}
                        >
                          {event.title}
                        </p>
                        <p className="text-muted-foreground text-sm line-clamp-1 text-ellipsis md:text-clip w-1/3">
                          {event.description}
                        </p>
                      </div>
                    </div>
                    <div className="w-40 flex justify-center items-center gap-1">
                      {agendaModeGroupBy === "date" ? (
                        <>
                          <p className="text-sm">
                            {formatTime(
                              event.startDate,
                              use24HourFormat,
                              dateFnsLocale,
                            )}
                          </p>
                          <span className="text-muted-foreground">-</span>
                          <p className="text-sm">
                            {formatTime(
                              event.endDate,
                              use24HourFormat,
                              dateFnsLocale,
                            )}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm">
                            {fmt(event.startDate, "MM/dd/yyyy")}
                          </p>
                          <span className="text-sm">·</span>
                          <p className="text-sm">
                            {formatTime(
                              event.startDate,
                              use24HourFormat,
                              dateFnsLocale,
                            )}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </EventDetailsDialog>
            ))}
          </div>
        ))}
        {groupedAndSortedEvents.length === 0 && (
          <p className="text-muted-foreground px-1 py-4 text-sm">
            {t.schedule.agenda.empty}
          </p>
        )}
      </div>
    </div>
  );
};
