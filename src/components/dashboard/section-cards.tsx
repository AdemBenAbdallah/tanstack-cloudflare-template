import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLocale } from "@/i18n";

export interface OverviewCards {
  students: number;
  lessonsToday: number;
  instructors: number;
  outstandingMillimes: number | null;
  role: string;
}

function formatTND(millimes: number, locale: string): string {
  return new Intl.NumberFormat(locale === "ar" ? "ar-TN" : "en-US", {
    style: "currency",
    currency: "TND",
  }).format(millimes / 1000);
}

export function SectionCards({ stats }: { stats: OverviewCards }) {
  const { t, locale } = useLocale();

  return (
    <div className="grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.overview.students}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.students}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {t.overview.studentsFootnote}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.overview.lessonsToday}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.lessonsToday}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {t.overview.lessonsFootnote}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>{t.overview.instructors}</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.instructors}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {t.overview.instructorsFootnote}
          </div>
        </CardFooter>
      </Card>
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>
            {stats.outstandingMillimes === null
              ? t.overview.role
              : t.overview.outstanding}
          </CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {stats.outstandingMillimes === null ? (
              <Badge variant="secondary" className="text-base">
                {stats.role}
              </Badge>
            ) : (
              formatTND(stats.outstandingMillimes, locale)
            )}
          </CardTitle>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="text-muted-foreground">
            {stats.outstandingMillimes === null
              ? t.overview.roleFootnote
              : t.overview.outstandingFootnote}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
