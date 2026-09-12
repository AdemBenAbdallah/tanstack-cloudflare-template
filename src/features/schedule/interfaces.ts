import type { LessonKind, LessonStatus } from "@/db/schema";
import type { TEventColor } from "@/features/schedule/types";

export interface IUser {
  id: string;
  name: string;
  picturePath: string | null;
}

/** Raw lesson payload carried on calendar events (never rendered directly). */
export interface ILessonData {
  lessonId: string;
  studentId: string;
  studentName: string;
  instructorId: string;
  vehicleId: string | null;
  vehicle: string | null;
  kind: LessonKind;
  status: LessonStatus;
  notes: string | null;
}

export interface IEvent {
  id: string;
  startDate: string;
  endDate: string;
  title: string;
  color: TEventColor;
  description: string;
  user: IUser;
  lesson: ILessonData;
}

export interface ICalendarCell {
  day: number;
  currentMonth: boolean;
  date: Date;
}
