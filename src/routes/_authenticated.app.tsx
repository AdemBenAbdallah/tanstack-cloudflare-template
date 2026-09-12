import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays } from "lucide-react";
import { SectionCards } from "@/components/dashboard/section-cards";
import { CardsSkeleton } from "@/components/loading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n";
import { intlLocale } from "@/lib/format";
import { listLessonsFn } from "@/lib/lessons";
import { getOverviewFn } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/app")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t, locale } = useLocale();
  const overviewQuery = useQuery({
    queryKey: ["overview"],
    queryFn: () => getOverviewFn(),
  });
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessonsFn(),
    staleTime: 30_000,
  });

  const overview = overviewQuery.data;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today.getTime() + 24 * 3600_000);
  const todaysLessons = (lessonsQuery.data ?? [])
    .filter((l) => {
      const start = new Date(l.startsAt);
      return start >= today && start < tomorrow;
    })
    .slice(0, 8);

  return (
    <>
      {overview ? (
        <SectionCards
          stats={{
            students: overview.students,
            lessonsToday: overview.lessonsToday,
            instructors: overview.instructors,
            outstandingMillimes: overview.outstandingMillimes,
            role: overview.role,
          }}
        />
      ) : (
        <CardsSkeleton />
      )}
      <div className="px-4 lg:px-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle>{t.overview.todayTitle}</CardTitle>
                <CardDescription>{t.overview.todayDescription}</CardDescription>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/calendar">
                  <CalendarDays className="size-4" />
                  {t.sidebar.schedule}
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {lessonsQuery.isLoading && (
              <div className="flex flex-col gap-2">
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md" />
                <Skeleton className="h-14 w-full rounded-md" />
              </div>
            )}
            {!lessonsQuery.isLoading && todaysLessons.length === 0 && (
              <p className="text-muted-foreground text-sm">
                {t.overview.todayEmpty}
              </p>
            )}
            {todaysLessons.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {l.student
                      ? `${l.student.firstName} ${l.student.lastName}`
                      : "—"}
                  </p>
                  <p className="text-muted-foreground">
                    {l.instructor
                      ? `${l.instructor.firstName} ${l.instructor.lastName}`
                      : "—"}
                  </p>
                </div>
                <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                  {new Date(l.startsAt).toLocaleTimeString(intlLocale(locale), {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
