import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ScheduleCalendar } from "@/features/schedule/schedule-calendar";
import { useLocale } from "@/i18n";
import { requireSchoolRoleFn } from "@/lib/auth-guard";
import { listLessonsFn } from "@/lib/lessons";
import { listSchoolPeopleFn } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/calendar")({
  beforeLoad: async () => {
    try {
      return await requireSchoolRoleFn({
        data: { roles: ["owner", "secretary"] },
      });
    } catch {
      throw redirect({ to: "/app" });
    }
  },
  component: SchedulePage,
});

function SchedulePage() {
  const { t } = useLocale();

  // The calendar context owns live state after first load (all mutations
  // flow through it), so never refetch underneath it.
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessonsFn(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
  const peopleQuery = useQuery({
    queryKey: ["school-people"],
    queryFn: () => listSchoolPeopleFn(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (lessonsQuery.isLoading || peopleQuery.isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <p className="text-sm">{t.schedule.loading}</p>
      </div>
    );
  }

  const people = peopleQuery.data ?? { students: [], instructors: [] };

  return (
    <div className="px-4 lg:px-6">
      <ScheduleCalendar
        lessons={(lessonsQuery.data ?? []).map((l) => ({
          id: l.id,
          studentId: l.studentId,
          instructorId: l.instructorId,
          vehicleId: l.vehicleId,
          vehicle: l.vehicle?.name ?? null,
          kind: l.kind,
          status: l.status,
          startsAt:
            l.startsAt instanceof Date
              ? l.startsAt.toISOString()
              : String(l.startsAt),
          endsAt:
            l.endsAt instanceof Date
              ? l.endsAt.toISOString()
              : String(l.endsAt),
          notes: l.notes ?? null,
          student: l.student
            ? {
                id: l.student.id,
                firstName: l.student.firstName,
                lastName: l.student.lastName,
              }
            : null,
          instructor: l.instructor
            ? {
                id: l.instructor.id,
                firstName: l.instructor.firstName,
                lastName: l.instructor.lastName,
              }
            : null,
        }))}
        instructors={people.instructors.map((i) => ({
          profileId: i.profileId,
          name: i.name,
        }))}
        students={people.students.map((s) => ({
          profileId: s.profileId,
          name: s.name,
        }))}
      />
    </div>
  );
}
