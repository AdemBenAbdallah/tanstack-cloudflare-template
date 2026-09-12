import { z } from "zod";
import { lessonKinds, lessonStatuses } from "@/db/schema";

export const lessonFormSchema = z.object({
  studentId: z.string().min(1),
  instructorId: z.string().min(1),
  vehicleId: z.string().min(1).optional(),
  kind: z.enum(lessonKinds),
  status: z.enum(lessonStatuses),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  notes: z.string().max(500).optional(),
});

export type TLessonFormData = z.infer<typeof lessonFormSchema>;
