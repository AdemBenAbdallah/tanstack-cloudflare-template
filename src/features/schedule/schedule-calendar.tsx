"use client";

import { useMemo } from "react";
import { useLocale } from "@/i18n";
import { CalendarBody } from "./calendar-body";
import { CalendarProvider } from "./contexts/calendar-context";
import { DndProvider } from "./contexts/dnd-context";
import { CalendarHeader } from "./header/calendar-header";
import { type LessonDTO, lessonToEvent } from "./mapping";

/**
 * Driving-school schedule: lessons from D1 rendered in a full calendar
 * (agenda/day/week/month/year). Arabic month and day names come from the
 * explicit date-fns locale (see date-locale.ts); layout mirrors via
 * `dir="rtl"`.
 */
export function ScheduleCalendar({
  lessons,
  instructors,
  students,
  canCreate,
  canEdit,
}: {
  lessons: Array<LessonDTO>;
  instructors: Array<{ profileId: string; name: string }>;
  students: Array<{ profileId: string; name: string }>;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const { t } = useLocale();

  const events = useMemo(
    () => lessons.map((lesson) => lessonToEvent(lesson, t)),
    [lessons, t],
  );
  const instructorUsers = useMemo(
    () =>
      instructors.map((i) => ({
        id: i.profileId,
        name: i.name,
        picturePath: null,
      })),
    [instructors],
  );
  const studentUsers = useMemo(
    () =>
      students.map((s) => ({
        id: s.profileId,
        name: s.name,
        picturePath: null,
      })),
    [students],
  );

  return (
    <CalendarProvider
      events={events}
      users={instructorUsers}
      students={studentUsers}
      canCreate={canCreate}
      canEdit={canEdit}
      view="agenda"
    >
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
