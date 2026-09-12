import type { LessonKind, LessonStatus } from "@/db/schema";
import type { Dict } from "@/i18n/en";
import type { IEvent, IUser } from "./interfaces";
import type { TEventColor } from "./types";

export function kindLabel(kind: string, t: Dict): string {
  switch (kind) {
    case "theory":
      return t.schedule.kinds.theory;
    case "parking":
      return t.schedule.kinds.parking;
    case "exam_drive":
      return t.schedule.kinds.examDrive;
    case "exam_parking":
      return t.schedule.kinds.examParking;
    default:
      return t.schedule.kinds.driving;
  }
}

export interface LessonDTO {
  id: string;
  studentId: string;
  instructorId: string;
  vehicleId: string | null;
  vehicle: string | null;
  kind: string;
  status: string;
  startsAt: string | Date;
  endsAt: string | Date;
  notes: string | null;
  student: { id: string; firstName: string; lastName: string } | null;
  instructor: { id: string; firstName: string; lastName: string } | null;
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

export function lessonToEvent(lesson: LessonDTO, t: Dict): IEvent {
  const kind = (lesson.kind ?? "driving") as LessonKind;
  const status = (lesson.status ?? "scheduled") as LessonStatus;
  const studentName =
    lesson.student != null
      ? `${lesson.student.firstName} ${lesson.student.lastName}`.trim() || "—"
      : "—";
  const instructorName =
    lesson.instructor != null
      ? `${lesson.instructor.firstName} ${lesson.instructor.lastName}`.trim() ||
        "—"
      : "—";
  const parts = [
    `${instructorName}`,
    lesson.vehicle ? lesson.vehicle : null,
    lesson.notes,
  ].filter(Boolean);

  return {
    id: lesson.id,
    startDate: new Date(lesson.startsAt).toISOString(),
    endDate: new Date(lesson.endsAt).toISOString(),
    title: `${studentName} · ${kindLabel(kind, t)}`,
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
      vehicleId: lesson.vehicleId,
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
