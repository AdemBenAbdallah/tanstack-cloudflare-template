import { format, parseISO } from "date-fns";
import { Calendar, Car, Clock, NotebookText, User, Users } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDateFnsLocale } from "@/features/schedule/date-locale";
import { AddEditEventDialog } from "@/features/schedule/dialogs/add-edit-event-dialog";
import { formatTime } from "@/features/schedule/helpers";
import type { IEvent } from "@/features/schedule/interfaces";
import { kindLabel } from "@/features/schedule/mapping";
import { useLocale } from "@/i18n";

interface IProps {
  event: IEvent;
  children: ReactNode;
}

export function EventDetailsDialog({ event, children }: IProps) {
  const { t } = useLocale();
  const dateFnsLocale = useDateFnsLocale();
  const startDate = parseISO(event.startDate);
  const endDate = parseISO(event.endDate);
  const fullDate = dateFnsLocale
    ? format(startDate, "EEEE dd MMMM", { locale: dateFnsLocale })
    : format(startDate, "EEEE dd MMMM");
  const { use24HourFormat, removeEvent } = useCalendar();
  const lesson = event.lesson;

  async function deleteLesson() {
    const ok = await removeEvent(event.id);
    if (ok) toast.success(t.schedule.dialog.deleted);
    else toast.error(t.schedule.dialog.failed);
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {event.title}
            <Badge variant="secondary">
              {lesson.status === "completed"
                ? t.schedule.status.completed
                : lesson.status === "cancelled"
                  ? t.schedule.status.cancelled
                  : t.schedule.status.scheduled}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto">
          <div className="space-y-4 p-1">
            <div className="flex items-start gap-2">
              <User className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t.schedule.details.student}
                </p>
                <p className="text-sm text-muted-foreground">
                  {lesson.studentName}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Users className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {t.schedule.details.instructor}
                </p>
                <p className="text-sm text-muted-foreground">
                  {event.user.name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Calendar className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.schedule.details.date}</p>
                <p className="text-sm text-muted-foreground">
                  {fullDate}
                  <span className="mx-1">·</span>
                  {formatTime(
                    parseISO(event.startDate),
                    use24HourFormat,
                    dateFnsLocale,
                  )}
                  {" — "}
                  {formatTime(
                    parseISO(event.endDate),
                    use24HourFormat,
                    dateFnsLocale,
                  )}
                </p>
              </div>
            </div>

            {lesson.vehicle && (
              <div className="flex items-start gap-2">
                <Car className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {t.schedule.details.vehicle}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lesson.vehicle}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Clock className="mt-1 size-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{t.schedule.details.kind}</p>
                <p className="text-sm text-muted-foreground">
                  {kindLabel(lesson.kind, t)} ·{" "}
                  {endDate.getTime() > startDate.getTime()
                    ? Math.round(
                        (endDate.getTime() - startDate.getTime()) / 60000,
                      )
                    : 0}{" "}
                  {t.schedule.details.minutes}
                </p>
              </div>
            </div>

            {lesson.notes && (
              <div className="flex items-start gap-2">
                <NotebookText className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">
                    {t.schedule.details.notes}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {lesson.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <AddEditEventDialog event={event}>
            <Button variant="outline">{t.schedule.dialog.edit}</Button>
          </AddEditEventDialog>
          <Button variant="destructive" onClick={deleteLesson}>
            {t.common.delete}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
