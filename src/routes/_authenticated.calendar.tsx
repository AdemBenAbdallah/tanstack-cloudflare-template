import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { ScheduleCalendar } from "@/features/schedule/schedule-calendar";
import { useLocale } from "@/i18n";
import { requireRoleFn } from "@/lib/auth-guard";
import { listLessonsFn, listUsersFn } from "@/lib/lessons";

export const Route = createFileRoute("/_authenticated/calendar")({
  beforeLoad: async () => {
    try {
      return await requireRoleFn({ data: { roles: ["admin", "manager"] } });
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
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: () => listUsersFn(),
    staleTime: Infinity,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  if (lessonsQuery.isLoading || usersQuery.isLoading) {
    return (
      <div className="px-4 lg:px-6">
        <p className="text-sm">{t.schedule.loading}</p>
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-6">
      <ScheduleCalendar
        lessons={(lessonsQuery.data ?? []).map((l) => ({
          ...l,
          startsAt:
            l.startsAt instanceof Date ? l.startsAt.toISOString() : l.startsAt,
          endsAt: l.endsAt instanceof Date ? l.endsAt.toISOString() : l.endsAt,
        }))}
        users={usersQuery.data ?? []}
      />
    </div>
  );
}
