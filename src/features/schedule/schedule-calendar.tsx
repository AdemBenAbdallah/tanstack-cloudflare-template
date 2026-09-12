"use client";

import { useMemo } from "react";
import { useLocale } from "@/i18n";
import { CalendarBody } from "./calendar-body";
import { CalendarProvider } from "./contexts/calendar-context";
import { DndProvider } from "./contexts/dnd-context";
import { CalendarHeader } from "./header/calendar-header";
import { type LessonDTO, lessonToEvent, userToInstructor } from "./mapping";

export interface ScheduleUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

/**
 * Driving-school schedule: lessons from D1 rendered in a full calendar
 * (agenda/day/week/month/year). Arabic month and day names come from the
 * explicit date-fns locale (see date-locale.ts); layout mirrors via
 * `dir="rtl"`.
 */
export function ScheduleCalendar({
  lessons,
  users,
}: {
  lessons: Array<LessonDTO>;
  users: Array<ScheduleUser>;
}) {
  const { t } = useLocale();

  const kindLabel = useMemo(() => {
    return (kind: string) => {
      if (kind === "theory") return t.schedule.kinds.theory;
      if (kind === "exam") return t.schedule.kinds.exam;
      return t.schedule.kinds.practice;
    };
  }, [t]);

  const events = useMemo(
    () => lessons.map((lesson) => lessonToEvent(lesson, kindLabel)),
    [lessons, kindLabel],
  );
  const instructors = useMemo(() => users.map(userToInstructor), [users]);

  return (
    <CalendarProvider events={events} users={instructors} view="agenda">
      <DndProvider
        labels={{
          moved: t.schedule.dnd.moved,
          moveFailed: t.schedule.dnd.moveFailed,
        }}
      >
        <div className="w-full border rounded-xl">
          <CalendarHeader />
          <CalendarBody />
        </div>
      </DndProvider>
    </CalendarProvider>
  );
}
