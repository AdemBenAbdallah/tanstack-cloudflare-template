import { addDays, format, isSameDay, parseISO, startOfWeek } from "date-fns";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import {
  fadeIn,
  staggerContainer,
  transition,
} from "@/features/schedule/animations";
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
import { RenderGroupedEvents } from "@/features/schedule/views/week-and-day-view/render-grouped-events";
import { WeekViewMultiDayEventsRow } from "@/features/schedule/views/week-and-day-view/week-view-multi-day-events-row";
import { useLocale } from "@/i18n";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarWeekView({ singleDayEvents, multiDayEvents }: IProps) {
  const { t } = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const { selectedDate, use24HourFormat } = useCalendar();
  const scrollPosition = useScrollPosition();
  const dayName = (day: Date, fmt: string) =>
    dateFnsLocale
      ? format(day, fmt, { locale: dateFnsLocale })
      : format(day, fmt);

  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollAreaRef.current?.scrollTo({ top: scrollPosition });
  }, [scrollPosition]);

  const weekStart = startOfWeek(selectedDate);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <motion.div
      initial="initial"
      animate="animate"
      exit="exit"
      variants={fadeIn}
      transition={transition}
    >
      <motion.div
        className="flex flex-col items-center justify-center border-b p-4 text-sm sm:hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
      >
        <p>{t.schedule.week.smallScreen1}</p>
        <p>{t.schedule.week.smallScreen2}</p>
      </motion.div>

      <motion.div className="flex-col sm:flex" variants={staggerContainer}>
        <div>
          <WeekViewMultiDayEventsRow
            selectedDate={selectedDate}
            multiDayEvents={multiDayEvents}
          />

          {/* Week header */}
          <motion.div
            className="relative z-20 flex border-b"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={transition}
          >
            {/* Time column header - responsive width */}
            <div className="w-18"></div>
            <div className="grid flex-1 grid-cols-7 border-s">
              {weekDays.map((day, index) => (
                <motion.span
                  key={day.toISOString()}
                  className="py-1 sm:py-2 text-center text-xs font-medium text-muted-foreground"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, ...transition }}
                >
                  {/* Mobile: Show only day abbreviation and number */}
                  <span className="block sm:hidden">
                    {dayName(day, "EEE").charAt(0)}
                    <span className="block font-semibold text-foreground text-xs">
                      {format(day, "d")}
                    </span>
                  </span>
                  {/* Desktop: Show full format */}
                  <span className="hidden sm:inline">
                    {dayName(day, "EE")}{" "}
                    <span className="ms-1 font-semibold text-foreground">
                      {format(day, "d")}
                    </span>
                  </span>
                </motion.span>
              ))}
            </div>
          </motion.div>
        </div>

        <div ref={scrollAreaRef} className="h-[736px] overflow-y-auto">
          <div className="flex">
            {/* Hours column */}
            <motion.div className="relative w-18" variants={staggerContainer}>
              {hours.map((hour, index) => (
                <motion.div
                  key={hour}
                  className="relative"
                  style={{ height: `${HOUR_HEIGHT_PX}px` }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.02, ...transition }}
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
                </motion.div>
              ))}
            </motion.div>

            {/* Week grid */}
            <motion.div
              className="relative flex-1 border-s"
              variants={staggerContainer}
            >
              <div className="grid grid-cols-7 divide-x">
                {weekDays.map((day, dayIndex) => {
                  const dayEvents = singleDayEvents.filter(
                    (event) =>
                      isSameDay(parseISO(event.startDate), day) ||
                      isSameDay(parseISO(event.endDate), day),
                  );
                  const groupedEvents = groupEvents(dayEvents);

                  return (
                    <motion.div
                      key={day.toISOString()}
                      className="relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: dayIndex * 0.1, ...transition }}
                    >
                      {hours.map((hour, index) => (
                        <motion.div
                          key={hour}
                          className="relative"
                          style={{ height: `${HOUR_HEIGHT_PX}px` }}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.01, ...transition }}
                        >
                          {index !== 0 && (
                            <div className="pointer-events-none absolute inset-x-0 top-0 border-b"></div>
                          )}

                          <DroppableArea
                            date={day}
                            hour={hour}
                            minute={0}
                            className="absolute inset-x-0 top-0  h-[48px]"
                          >
                            <AddEditEventDialog
                              startDate={day}
                              startTime={{ hour, minute: 0 }}
                            >
                              <div className="absolute inset-0 cursor-pointer transition-colors hover:bg-secondary" />
                            </AddEditEventDialog>
                          </DroppableArea>

                          <div className="pointer-events-none absolute inset-x-0 top-1/2 border-b border-dashed"></div>

                          <DroppableArea
                            date={day}
                            hour={hour}
                            minute={30}
                            className="absolute inset-x-0 bottom-0 h-[48px]"
                          >
                            <AddEditEventDialog
                              startDate={day}
                              startTime={{ hour, minute: 30 }}
                            >
                              <div className="absolute inset-0 cursor-pointer transition-colors hover:bg-secondary" />
                            </AddEditEventDialog>
                          </DroppableArea>
                        </motion.div>
                      ))}

                      <RenderGroupedEvents
                        groupedEvents={groupedEvents}
                        day={day}
                      />
                    </motion.div>
                  );
                })}
              </div>

              <CalendarTimeline />
            </motion.div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
