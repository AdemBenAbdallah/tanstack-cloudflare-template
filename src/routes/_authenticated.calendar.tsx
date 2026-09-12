import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageSkeleton } from "@/components/loading";
import { ScheduleCalendar } from "@/features/schedule/schedule-calendar";
import { listLessonsFn } from "@/lib/lessons";
import { listSchoolPeopleFn } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/calendar")({
  // No beforeLoad needed: the parent layout guarantees an active
  // membership, and lesson queries are scoped server-side anyway.
  component: SchedulePage,
});

function SchedulePage() {
  const { membership } = Route.useRouteContext() as {
    membership: { role: string };
  };
  const role = membership.role;
  const canCreate = role === "owner" || role === "secretary";
  const canEdit = canCreate || role === "instructor";

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
    retry: false,
  });

  if (lessonsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const people = peopleQuery.data ?? { students: [], instructors: [] };

  return (
    <div className="px-4 lg:px-6">
      <ScheduleCalendar
        canCreate={canCreate}
        canEdit={canEdit}
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
