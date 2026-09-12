import { type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { lessonKinds } from "@/db/schema";
import { useCalendar } from "@/features/schedule/contexts/calendar-context";
import { useDisclosure } from "@/features/schedule/hooks";
import type { IEvent } from "@/features/schedule/interfaces";
import { lessonToEvent, toLocalInputValue } from "@/features/schedule/mapping";
import {
  lessonFormSchema,
  type TLessonFormData,
} from "@/features/schedule/schemas";
import { useLocale } from "@/i18n";

interface IProps {
  children: ReactNode;
  startDate?: Date;
  startTime?: { hour: number; minute: number };
  event?: IEvent;
}

export function AddEditEventDialog({
  children,
  startDate,
  startTime,
  event,
}: IProps) {
  const { t } = useLocale();
  const { isOpen, onClose, onToggle } = useDisclosure();
  const { addEvent, updateEvent, users } = useCalendar();
  const isEditing = !!event;

  const initial = useMemo(() => {
    if (event) {
      return {
        studentId: event.lesson.studentId,
        instructorId: event.lesson.instructorId,
        vehicle: event.lesson.vehicle ?? "",
        kind: event.lesson.kind,
        status: event.lesson.status,
        startsAt: toLocalInputValue(new Date(event.startDate)),
        endsAt: toLocalInputValue(new Date(event.endDate)),
        notes: event.lesson.notes ?? "",
      };
    }
    const start = new Date(startDate ?? new Date());
    if (startTime) start.setHours(startTime.hour, startTime.minute, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    return {
      studentId: "",
      instructorId: "",
      vehicle: "",
      kind: "practice" as const,
      status: "scheduled" as const,
      startsAt: toLocalInputValue(start),
      endsAt: toLocalInputValue(end),
      notes: "",
    };
  }, [event, startDate, startTime]);

  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setForm(initial);
      setError(null);
    }
  }, [isOpen, initial]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function kindLabel(kind: string) {
    if (kind === "theory") return t.schedule.kinds.theory;
    if (kind === "exam") return t.schedule.kinds.exam;
    return t.schedule.kinds.practice;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = lessonFormSchema.safeParse({
      ...form,
      vehicle: form.vehicle || undefined,
      notes: form.notes || undefined,
    });
    if (!parsed.success) {
      setError(t.schedule.dialog.invalid);
      return;
    }
    const data: TLessonFormData = parsed.data;
    if (new Date(data.endsAt) <= new Date(data.startsAt)) {
      setError(t.schedule.dialog.invalid);
      return;
    }
    setPending(true);
    try {
      if (isEditing && event) {
        const dto = {
          id: event.lesson.lessonId,
          studentId: data.studentId,
          instructorId: data.instructorId,
          vehicle: data.vehicle ?? null,
          kind: data.kind,
          status: data.status,
          startsAt: new Date(data.startsAt).toISOString(),
          endsAt: new Date(data.endsAt).toISOString(),
          notes: data.notes ?? null,
          student: users.find((u) => u.id === data.studentId) ?? {
            id: data.studentId,
            name: "",
            email: "",
          },
          instructor: users.find((u) => u.id === data.instructorId) ?? {
            id: data.instructorId,
            name: "",
            email: "",
          },
        };
        const mapped = lessonToEvent(dto, kindLabel);
        const updated: IEvent = { ...mapped, id: event.id };
        const ok = await updateEvent(updated);
        if (!ok) throw new Error("update failed");
        toast.success(t.schedule.dialog.updated);
      } else {
        const student = users.find((u) => u.id === data.studentId);
        const instructor = users.find((u) => u.id === data.instructorId);
        if (!student || !instructor) {
          setError(t.schedule.dialog.invalid);
          return;
        }
        const dto = {
          id: "",
          studentId: data.studentId,
          instructorId: data.instructorId,
          vehicle: data.vehicle ?? null,
          kind: data.kind,
          status: data.status,
          startsAt: new Date(data.startsAt).toISOString(),
          endsAt: new Date(data.endsAt).toISOString(),
          notes: data.notes ?? null,
          student: { ...student, email: "" },
          instructor: { ...instructor, email: "" },
        };
        const mapped = lessonToEvent(dto, kindLabel);
        const created = await addEvent({
          startDate: mapped.startDate,
          endDate: mapped.endDate,
          title: mapped.title,
          color: mapped.color,
          description: mapped.description,
          user: mapped.user,
          lesson: mapped.lesson,
        });
        if (!created) throw new Error("create failed");
        toast.success(t.schedule.dialog.created);
      }
      onClose();
    } catch {
      setError(t.schedule.dialog.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
        else onToggle();
      }}
    >
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t.schedule.dialog.editTitle
              : t.schedule.dialog.newTitle}
          </DialogTitle>
          <DialogDescription>{t.schedule.dialog.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="grid gap-2">
            <Label htmlFor="lesson-student">{t.schedule.form.student}</Label>
            <Select
              value={form.studentId}
              onValueChange={(v) => set("studentId", v)}
            >
              <SelectTrigger id="lesson-student">
                <SelectValue placeholder={t.schedule.form.selectStudent} />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lesson-instructor">
              {t.schedule.form.instructor}
            </Label>
            <Select
              value={form.instructorId}
              onValueChange={(v) => set("instructorId", v)}
            >
              <SelectTrigger id="lesson-instructor">
                <SelectValue placeholder={t.schedule.form.selectInstructor} />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lesson-start">{t.schedule.form.startsAt}</Label>
              <Input
                id="lesson-start"
                type="datetime-local"
                value={form.startsAt}
                onChange={(e) => set("startsAt", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lesson-end">{t.schedule.form.endsAt}</Label>
              <Input
                id="lesson-end"
                type="datetime-local"
                value={form.endsAt}
                onChange={(e) => set("endsAt", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="lesson-kind">{t.schedule.form.kind}</Label>
              <Select
                value={form.kind}
                onValueChange={(v) =>
                  set("kind", v as (typeof lessonKinds)[number])
                }
              >
                <SelectTrigger id="lesson-kind">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {lessonKinds.map((k) => (
                    <SelectItem key={k} value={k}>
                      {kindLabel(k)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="lesson-status">{t.schedule.form.status}</Label>
              <Select
                value={form.status}
                onValueChange={(v) =>
                  set("status", v as "scheduled" | "completed" | "cancelled")
                }
              >
                <SelectTrigger id="lesson-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">
                    {t.schedule.status.scheduled}
                  </SelectItem>
                  <SelectItem value="completed">
                    {t.schedule.status.completed}
                  </SelectItem>
                  <SelectItem value="cancelled">
                    {t.schedule.status.cancelled}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lesson-vehicle">{t.schedule.form.vehicle}</Label>
            <Input
              id="lesson-vehicle"
              value={form.vehicle}
              onChange={(e) => set("vehicle", e.target.value)}
              placeholder={t.schedule.form.vehiclePlaceholder}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lesson-notes">{t.schedule.form.notes}</Label>
            <Textarea
              id="lesson-notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? t.login.wait
                : isEditing
                  ? t.schedule.dialog.save
                  : t.schedule.dialog.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
