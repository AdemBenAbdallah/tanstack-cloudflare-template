import { addDays, format } from "date-fns";
import { motion } from "motion/react";
import { useMemo } from "react";
import { staggerContainer, transition } from "@/features/schedule/animations";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";

import {
  calculateMonthEventPositions,
  getCalendarCells,
} from "@/features/schedule/helpers";

import type { IEvent } from "@/features/schedule/interfaces";
import { DayCell } from "@/features/schedule/views/month-view/day-cell";

interface IProps {
  singleDayEvents: IEvent[];
  multiDayEvents: IEvent[];
}

export function CalendarMonthView({ singleDayEvents, multiDayEvents }: IProps) {
  const { selectedDate } = useCalendar();
  const dateFnsLocale = useDateFnsLocale();
  const weekDays = useMemo(() => {
    const sunday = new Date(2024, 0, 7);
    return Array.from({ length: 7 }, (_, i) =>
      dateFnsLocale
        ? format(addDays(sunday, i), "EEE", { locale: dateFnsLocale })
        : format(addDays(sunday, i), "EEE"),
    );
  }, [dateFnsLocale]);

  const allEvents = [...multiDayEvents, ...singleDayEvents];

  const cells = useMemo(() => getCalendarCells(selectedDate), [selectedDate]);

  const eventPositions = useMemo(
    () =>
      calculateMonthEventPositions(
        multiDayEvents,
        singleDayEvents,
        selectedDate,
      ),
    [multiDayEvents, singleDayEvents, selectedDate],
  );

  return (
    <motion.div initial="initial" animate="animate" variants={staggerContainer}>
      <div className="grid grid-cols-7">
        {weekDays.map((day, index) => (
          <motion.div
            key={day}
            className="flex items-center justify-center py-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, ...transition }}
          >
            <span className="text-xs font-medium text-muted-foreground">
              {day}
            </span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-7 overflow-hidden">
        {cells.map((cell) => (
          <DayCell
            key={cell.date.toISOString()}
            cell={cell}
            events={allEvents}
            eventPositions={eventPositions}
          />
        ))}
      </div>
    </motion.div>
  );
}
