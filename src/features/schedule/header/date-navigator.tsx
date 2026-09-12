import { formatDate } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonHover, transition } from "@/features/schedule/animations";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";
import {
  getEventsCount,
  navigateDate,
  rangeText,
} from "@/features/schedule/helpers";
import type { IEvent } from "@/features/schedule/interfaces";
import type { TCalendarView } from "@/features/schedule/types";
import { useLocale } from "@/i18n";

interface IProps {
  view: TCalendarView;
  events: IEvent[];
}

const MotionButton = motion.create(Button);
const MotionBadge = motion.create(Badge);

export function DateNavigator({ view, events }: IProps) {
  const { t } = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const { selectedDate, setSelectedDate } = useCalendar();

  const month = dateFnsLocale
    ? formatDate(selectedDate, "MMMM", { locale: dateFnsLocale })
    : formatDate(selectedDate, "MMMM");
  const year = selectedDate.getFullYear();

  const eventCount = useMemo(
    () => getEventsCount(events, selectedDate, view),
    [events, selectedDate, view],
  );

  const handlePrevious = () =>
    setSelectedDate(navigateDate(selectedDate, view, "previous"));
  const handleNext = () =>
    setSelectedDate(navigateDate(selectedDate, view, "next"));

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-2">
        <motion.span
          className="text-lg font-semibold"
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={transition}
        >
          {month} {year}
        </motion.span>
        <AnimatePresence mode="wait">
          <MotionBadge
            key={eventCount}
            variant="secondary"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={transition}
          >
            {eventCount}{" "}
            {eventCount === 1
              ? t.schedule.header.lessonOne
              : eventCount === 2
                ? t.schedule.header.lessonTwo
                : t.schedule.header.events}
          </MotionBadge>
        </AnimatePresence>
      </div>

      <div className="flex items-center gap-2">
        <MotionButton
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={handlePrevious}
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
        </MotionButton>

        <motion.p
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={transition}
        >
          {rangeText(view, selectedDate, dateFnsLocale)}
        </motion.p>

        <MotionButton
          variant="outline"
          size="icon"
          className="h-6 w-6"
          onClick={handleNext}
          variants={buttonHover}
          whileHover="hover"
          whileTap="tap"
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" />
        </MotionButton>
      </div>
    </div>
  );
}
