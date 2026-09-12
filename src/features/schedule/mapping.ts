import type { LessonKind, LessonStatus } from "@/db/schema";
import type { IEvent, IUser } from "./interfaces";
import type { TEventColor } from "./types";

export interface LessonDTO {
  id: string;
  studentId: string;
  instructorId: string;
  vehicle: string | null;
  kind: string;
  status: string;
  startsAt: string | Date;
  endsAt: string | Date;
  notes: string | null;
  student: { id: string; name: string; email?: string } | null;
  instructor: { id: string; name: string; email?: string } | null;
}

export function statusToColor(status: string): TEventColor {
  if (status === "completed") return "green";
  if (status === "cancelled") return "red";
  return "blue";
}

export function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function lessonToEvent(
  lesson: LessonDTO,
  kindLabel: (kind: string) => string,
): IEvent {
  const studentName = lesson.student?.name ?? "—";
  const instructorName = lesson.instructor?.name ?? "—";
  const kind = (lesson.kind ?? "practice") as LessonKind;
  const status = (lesson.status ?? "scheduled") as LessonStatus;
  const parts = [
    `${instructorName}`,
    lesson.vehicle ? lesson.vehicle : null,
    lesson.notes,
  ].filter(Boolean);

  return {
    id: lesson.id,
    startDate: new Date(lesson.startsAt).toISOString(),
    endDate: new Date(lesson.endsAt).toISOString(),
    title: `${studentName} · ${kindLabel(kind)}`,
    color: statusToColor(status),
    description: parts.join(" · "),
    user: {
      id: lesson.instructorId,
      name: instructorName,
      picturePath: null,
    },
    lesson: {
      lessonId: lesson.id,
      studentId: lesson.studentId,
      studentName,
      instructorId: lesson.instructorId,
      vehicle: lesson.vehicle,
      kind,
      status,
      notes: lesson.notes,
    },
  };
}

export function userToInstructor(user: { id: string; name: string }): IUser {
  return { id: user.id, name: user.name, picturePath: null };
}
