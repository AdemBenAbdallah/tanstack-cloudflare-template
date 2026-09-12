import { format, isWithinInterval, parseISO } from "date-fns";
import { Calendar, Clock, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { Calendar as MiniCalendar } from "@/components/ui/calendar";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";
import { AddEditEventDialog } from "@/features/schedule/dialogs/add-edit-event-dialog";
import { DroppableArea } from "@/features/schedule/dnd/droppable-area";
import {
  groupEvents,
  HOUR_HEIGHT_PX,
  useScrollPosition,
} from "@/features/schedule/helpers";
import type { IEvent } from "@/features/schedule/interfaces";
import { CalendarTimeline } from "@/features/schedule/views/week-and-day-view/calendar-time-line";
import { DayViewMultiDayEventsRow } from "@/features/schedule/views/week-and-day-view/day-view-multi-day-events-row";
import { RenderGroupedEvents } from "@/features/schedule/views/week-and-day-view/render-grouped-events";
import { useLocale } from "@/i18n";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarDayView({ singleDayEvents, multiDayEvents }: IProps) {
  const { t } = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const { selectedDate, setSelectedDate, users, use24HourFormat } =
    useCalendar();
  const fmt = (date: Date | number, fmtStr: string) =>
    dateFnsLocale
      ? format(date, fmtStr, { locale: dateFnsLocale })
      : format(date, fmtStr);
  const scrollPosition = useScrollPosition();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: scrollPosition });
  }, [scrollPosition]);

  const hours = Array.from({ length: 24 }, (_, i) => i);

  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      if (!scrollAreaRef.current) return;

      const scrollArea = scrollAreaRef.current;
      const rect = scrollArea.getBoundingClientRect();
      const scrollSpeed = 15;

      const scrollContainer =
        scrollArea.querySelector("[data-radix-scroll-area-viewport]") ||
        scrollArea;

      if (e.clientY < rect.top + 60) {
        scrollContainer.scrollTop -= scrollSpeed;
      }

      if (e.clientY > rect.bottom - 60) {
        scrollContainer.scrollTop += scrollSpeed;
      }
    };

    document.addEventListener("dragover", handleDragOver);
    return () => {
      document.removeEventListener("dragover", handleDragOver);
    };
  }, []);

  const getCurrentEvents = (events: IEvent[]) => {
    const now = new Date();

    return (
      events.filter((event) =>
        isWithinInterval(now, {
          start: parseISO(event.startDate),
          end: parseISO(event.endDate),
        }),
      ) || []
    );
  };

  const currentEvents = getCurrentEvents(singleDayEvents);

  const dayEvents = singleDayEvents.filter((event) => {
    const eventDate = parseISO(event.startDate);
    return (
      eventDate.getDate() === selectedDate.getDate() &&
      eventDate.getMonth() === selectedDate.getMonth() &&
      eventDate.getFullYear() === selectedDate.getFullYear()
    );
  });

  const groupedEvents = groupEvents(dayEvents);

  return (
    <div className="flex">
      <div className="flex flex-1 flex-col">
        <div>
          <DayViewMultiDayEventsRow
            selectedDate={selectedDate}
            multiDayEvents={multiDayEvents}
          />

          {/* Day header */}
          <div className="relative z-20 flex border-b">
            <div className="w-18"></div>
            <span className="flex-1 border-s py-2 text-center text-xs font-medium text-muted-foreground">
              {fmt(selectedDate, "EE")}{" "}
              <span className="font-semibold text-foreground">
                {format(selectedDate, "d")}
              </span>
            </span>
          </div>
        </div>
        <div ref={scrollAreaRef} className="h-[800px] overflow-y-auto">
          <div className="flex">
            {/* Hours column */}
            <div className="relative w-18">
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="relative"
                  style={{ height: `${HOUR_HEIGHT_PX}px` }}
                >
                  <div className="absolute -top-3 end-2 flex h-6 items-center">
                    {index !== 0 && (
                      <span className="text-xs text-muted-foreground">
                        {format(
                          new Date().setHours(hour, 0, 0, 0),
                          use24HourFormat ? "HH:00" : "h a",
                        )}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Day grid */}
            <div className="relative flex-1 border-s">
              <div className="relative">
                {hours.map((hour, index) => (
                  <div
                    key={hour}
                    className="relative"
                    style={{ height: `${HOUR_HEIGHT_PX}px` }}
                  >
                    {index !== 0 && (
                      <div className="pointer-events-none absolute inset-x-0 top-0 border-b"></div>
                    )}

                    <DroppableArea
                      date={selectedDate}
                      hour={hour}
                      minute={0}
                      className="absolute inset-x-0 top-0 h-[48px]"
                    >
                      <AddEditEventDialog
                        startDate={selectedDate}
                        startTime={{ hour, minute: 0 }}
                      >
                        <div className="absolute inset-0 cursor-pointer transition-colors hover:bg-secondary" />
                      </AddEditEventDialog>
                    </DroppableArea>

                    <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed"></div>

                    <DroppableArea
                      date={selectedDate}
                      hour={hour}
                      minute={30}
                      className="absolute inset-x-0 bottom-0 h-[48px]"
                    >
                      <AddEditEventDialog
                        startDate={selectedDate}
                        startTime={{ hour, minute: 30 }}
                      >
                        <div className="absolute inset-0 cursor-pointer transition-colors hover:bg-secondary" />
                      </AddEditEventDialog>
                    </DroppableArea>
                  </div>
                ))}

                <RenderGroupedEvents
                  groupedEvents={groupedEvents}
                  day={selectedDate}
                />
              </div>

              <CalendarTimeline />
            </div>
          </div>
        </div>
      </div>

      <div className="hidden w-72 divide-y border-s md:block">
        <MiniCalendar
          className="mx-auto w-fit"
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && setSelectedDate(date)}
          initialFocus
        />

        <div className="flex-1 space-y-3">
          {currentEvents.length > 0 ? (
            <div className="flex items-start gap-2 px-4 pt-4">
              <span className="relative mt-[5px] flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex size-2.5 rounded-full bg-green-600"></span>
              </span>

              <p className="text-sm font-semibold text-foreground">
                {t.schedule.day.happeningNow}
              </p>
            </div>
          ) : (
            <p className="p-4 text-center text-sm italic text-muted-foreground">
              {t.schedule.day.empty}
            </p>
          )}

          {currentEvents.length > 0 && (
            <div className="h-[422px] px-4 overflow-y-auto">
              <div className="space-y-6 pb-4">
                {currentEvents.map((event) => {
                  const user = users.find((user) => user.id === event.user.id);

                  return (
                    <div key={event.id} className="space-y-1.5">
                      <p className="line-clamp-2 text-sm font-semibold">
                        {event.title}
                      </p>

                      {user && (
                        <div className="flex items-center gap-1.5">
                          <User className="size-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {user.name}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {fmt(new Date(event.startDate), "MMM d, yyyy")}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Clock className="size-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {fmt(
                            parseISO(event.startDate),
                            use24HourFormat ? "HH:mm" : "hh:mm a",
                          )}{" "}
                          -
                          {fmt(
                            parseISO(event.endDate),
                            use24HourFormat ? "HH:mm" : "hh:mm a",
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
