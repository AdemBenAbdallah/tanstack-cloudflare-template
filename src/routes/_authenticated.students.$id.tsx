import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { type ReactNode, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageSkeleton } from "@/components/loading";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocale } from "@/i18n";
import {
  createEnrollmentFn,
  createExamFn,
  getStudentProgressFn,
  listExamsFn,
  listPackagesFn,
  listStudentEnrollmentsFn,
  recordPaymentFn,
  updateExamFn,
  voidPaymentFn,
} from "@/lib/billing";
import { formatTND, intlLocale, parseTND } from "@/lib/format";
import { listLessonsFn } from "@/lib/lessons";
import { listStudentsFn, updateStudentFn } from "@/lib/people";
import { listSchoolPeopleFn } from "@/lib/school";

export const Route = createFileRoute("/_authenticated/students/$id")({
  // Zero-cost guard: parent layout already resolved the membership.
  beforeLoad: ({ context }) => {
    const role = (context as { membership?: { role?: string } }).membership
      ?.role;
    if (role !== "owner" && role !== "secretary") {
      throw redirect({ to: "/app" });
    }
  },
  component: StudentDetailPage,
});

function Section({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  );
}

function StudentDetailPage() {
  const { t, locale } = useLocale();
  const { id } = Route.useParams();
  const queryClient = useQueryClient();

  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudentsFn(),
  });
  const student = studentsQuery.data?.find((s) => s.id === id);

  const peopleQuery = useQuery({
    queryKey: ["school-people"],
    queryFn: () => listSchoolPeopleFn(),
  });
  const instructors = peopleQuery.data?.instructors ?? [];
  const packagesQuery = useQuery({
    queryKey: ["packages"],
    queryFn: () => listPackagesFn(),
  });
  const enrollmentsQuery = useQuery({
    queryKey: ["enrollments", id],
    queryFn: () => listStudentEnrollmentsFn({ data: { studentId: id } }),
  });
  const progressQuery = useQuery({
    queryKey: ["progress", id],
    queryFn: () => getStudentProgressFn({ data: { studentId: id } }),
  });
  const examsQuery = useQuery({
    queryKey: ["exams"],
    queryFn: () => listExamsFn(),
  });
  const lessonsQuery = useQuery({
    queryKey: ["lessons"],
    queryFn: () => listLessonsFn(),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: ["students"] });
    void queryClient.invalidateQueries({ queryKey: ["enrollments", id] });
    void queryClient.invalidateQueries({ queryKey: ["progress", id] });
    void queryClient.invalidateQueries({ queryKey: ["exams"] });
    void queryClient.invalidateQueries({ queryKey: ["lessons"] });
  };

  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    licenseCategory: "B",
    status: "new",
    assignedInstructorId: "",
  });
  useEffect(() => {
    if (student) {
      setProfile({
        firstName: student.firstName,
        lastName: student.lastName,
        phone: student.phone ?? "",
        licenseCategory: student.licenseCategory,
        status: student.status,
        assignedInstructorId: student.assignedInstructorId ?? "",
      });
    }
  }, [student]);

  const saveProfile = useMutation({
    mutationFn: () =>
      updateStudentFn({
        data: {
          id,
          firstName: profile.firstName.trim(),
          lastName: profile.lastName.trim(),
          phone: profile.phone.trim() || undefined,
          licenseCategory: profile.licenseCategory,
          status: profile.status as
            | "new"
            | "in_training"
            | "ready_for_exam"
            | "passed"
            | "abandoned",
          assignedInstructorId: profile.assignedInstructorId || undefined,
        },
      }),
    onSuccess: () => {
      setEditing(false);
      toast.success(t.people.updated);
      refresh();
    },
    onError: () => toast.error(t.people.failed),
  });

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [packageId, setPackageId] = useState("");
  const enroll = useMutation({
    mutationFn: () =>
      createEnrollmentFn({ data: { studentId: id, packageId } }),
    onSuccess: () => {
      setEnrollOpen(false);
      toast.success(t.people.created);
      refresh();
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error && e.message.includes("ALREADY_ENROLLED")
          ? t.people.alreadyEnrolled
          : t.people.failed,
      ),
  });

  const [payOpen, setPayOpen] = useState<string | null>(null);
  const [payForm, setPayForm] = useState({
    amount: "",
    method: "cash",
    note: "",
  });
  const activeEnrollment = enrollmentsQuery.data?.find(
    (e) => e.status === "active",
  );
  const pay = useMutation({
    mutationFn: () => {
      const millimes = parseTND(payForm.amount);
      if (millimes === null || millimes <= 0 || !activeEnrollment) {
        throw new Error("INVALID_AMOUNT");
      }
      return recordPaymentFn({
        data: {
          enrollmentId: activeEnrollment.id,
          amountMillimes: millimes,
          method: payForm.method as
            | "cash"
            | "bank_transfer"
            | "e_dinar"
            | "check",
          note: payForm.note.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      setPayOpen(null);
      setPayForm({ amount: "", method: "cash", note: "" });
      toast.success(t.people.created);
      refresh();
    },
    onError: () => toast.error(t.people.failed),
  });

  const voidPay = useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      voidPaymentFn({ data: input }),
    onSuccess: () => {
      toast.success(t.studentDetail.voided);
      refresh();
    },
    onError: () => toast.error(t.people.failed),
  });
  const [voidId, setVoidId] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const [examOpen, setExamOpen] = useState(false);
  const [examForm, setExamForm] = useState({
    type: "drive",
    scheduledFor: "",
    note: "",
  });
  const addExam = useMutation({
    mutationFn: () =>
      createExamFn({
        data: {
          studentId: id,
          type: examForm.type as "theory" | "drive" | "parking",
          scheduledFor: new Date(examForm.scheduledFor).toISOString(),
          note: examForm.note.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setExamOpen(false);
      toast.success(t.studentDetail.examScheduled);
      refresh();
    },
    onError: () => toast.error(t.people.failed),
  });
  const setExamStatus = useMutation({
    mutationFn: (input: {
      id: string;
      status: "passed" | "failed" | "absent" | "cancelled";
    }) => updateExamFn({ data: input }),
    onSuccess: () => {
      toast.success(t.studentDetail.examUpdated);
      refresh();
    },
    onError: () => toast.error(t.people.failed),
  });

  if (studentsQuery.isLoading || !student) {
    return <PageSkeleton />;
  }

  const progress = progressQuery.data;
  const exams = (examsQuery.data ?? []).filter((e) => e.studentId === id);
  const lessons = (lessonsQuery.data ?? [])
    .filter((l) => l.studentId === id)
    .slice(0, 10);

  return (
    <div className="flex flex-col gap-4 px-4 lg:px-6">
      <Section
        title={`${student.firstName} ${student.lastName}`}
        description={student.user?.email ?? ""}
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing((v) => !v)}
          >
            {t.people.editStudent}
          </Button>
        }
      >
        {editing ? (
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              saveProfile.mutate();
            }}
          >
            <div className="grid gap-2">
              <Label htmlFor="st-first">{t.people.firstName}</Label>
              <Input
                id="st-first"
                value={profile.firstName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, firstName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-last">{t.people.lastName}</Label>
              <Input
                id="st-last"
                value={profile.lastName}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, lastName: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-phone">{t.people.phone}</Label>
              <Input
                id="st-phone"
                value={profile.phone}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, phone: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-cat">{t.people.licenseCategory}</Label>
              <Input
                id="st-cat"
                value={profile.licenseCategory}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, licenseCategory: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-status">{t.people.status}</Label>
              <Select
                value={profile.status}
                onValueChange={(v) => setProfile((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger id="st-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(
                    Object.keys(t.people.studentStatuses) as Array<
                      keyof typeof t.people.studentStatuses
                    >
                  ).map((s) => (
                    <SelectItem key={s} value={s}>
                      {t.people.studentStatuses[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-inst">
                {t.studentDetail.assignInstructor}
              </Label>
              <Select
                value={profile.assignedInstructorId || "none"}
                onValueChange={(v) =>
                  setProfile((p) => ({
                    ...p,
                    assignedInstructorId: v === "none" ? "" : v,
                  }))
                }
              >
                <SelectTrigger id="st-inst">
                  <SelectValue placeholder={t.people.unassigned} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t.people.unassigned}</SelectItem>
                  {instructors.map((i) => (
                    <SelectItem key={i.profileId} value={i.profileId}>
                      {i.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saveProfile.isPending}>
                {t.people.save}
              </Button>
            </div>
          </form>
        ) : (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t.people.phone}</dt>
              <dd>{student.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">
                {t.people.licenseCategory}
              </dt>
              <dd>{student.licenseCategory}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{t.people.status}</dt>
              <dd>
                {
                  t.people.studentStatuses[
                    student.status as keyof typeof t.people.studentStatuses
                  ]
                }
              </dd>
            </div>
          </dl>
        )}
      </Section>

      <Section
        title={t.studentDetail.enrollment}
        action={
          <div className="flex gap-2">
            <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  {t.studentDetail.enroll}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>{t.studentDetail.enroll}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-2">
                  <Label>{t.studentDetail.selectPackage}</Label>
                  <Select value={packageId} onValueChange={setPackageId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(packagesQuery.data ?? [])
                        .filter((p) => p.active)
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} — {formatTND(p.priceMillimes, locale)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    disabled={!packageId || enroll.isPending}
                    onClick={() => enroll.mutate()}
                  >
                    {t.studentDetail.enroll}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {activeEnrollment && (
              <Dialog
                open={payOpen !== null}
                onOpenChange={(o) => setPayOpen(o ? "new" : null)}
              >
                <DialogTrigger asChild>
                  <Button size="sm">{t.studentDetail.recordPayment}</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>{t.studentDetail.recordPayment}</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="pay-amount">
                        {t.studentDetail.amount}
                      </Label>
                      <Input
                        id="pay-amount"
                        inputMode="decimal"
                        value={payForm.amount}
                        onChange={(e) =>
                          setPayForm((f) => ({ ...f, amount: e.target.value }))
                        }
                        placeholder="500"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>{t.studentDetail.method}</Label>
                      <Select
                        value={payForm.method}
                        onValueChange={(v) =>
                          setPayForm((f) => ({ ...f, method: v }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">
                            {t.studentDetail.cash}
                          </SelectItem>
                          <SelectItem value="bank_transfer">
                            {t.studentDetail.bankTransfer}
                          </SelectItem>
                          <SelectItem value="e_dinar">
                            {t.studentDetail.eDinar}
                          </SelectItem>
                          <SelectItem value="check">
                            {t.studentDetail.check}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="pay-note">{t.studentDetail.note}</Label>
                      <Input
                        id="pay-note"
                        value={payForm.note}
                        onChange={(e) =>
                          setPayForm((f) => ({ ...f, note: e.target.value }))
                        }
                      />
                    </div>
                    <Button
                      disabled={pay.isPending}
                      onClick={() => pay.mutate()}
                    >
                      {t.studentDetail.recordPayment}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        }
      >
        {enrollmentsQuery.isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : !activeEnrollment ? (
          <p className="text-muted-foreground text-sm">
            {t.studentDetail.noEnrollment}
          </p>
        ) : (
          <>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t.studentDetail.price}
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatTND(
                    progress?.priceMillimes ?? activeEnrollment.priceMillimes,
                    locale,
                  )}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t.studentDetail.paid}
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatTND(progress?.paidMillimes ?? 0, locale)}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t.studentDetail.balance}
                </dt>
                <dd className="font-medium tabular-nums">
                  {formatTND(progress?.balanceMillimes ?? 0, locale)}
                </dd>
              </div>
            </div>
            {(enrollmentsQuery.data ?? [])
              .flatMap((e) =>
                e.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium tabular-nums">
                        {formatTND(p.amountMillimes, locale)}
                      </p>
                      <p className="text-muted-foreground">
                        {p.method} ·{" "}
                        {new Date(p.createdAt).toLocaleDateString(
                          intlLocale(locale),
                        )}
                      </p>
                    </div>
                    {voidId === p.id ? (
                      <div className="flex gap-2">
                        <Input
                          value={voidReason}
                          onChange={(e) => setVoidReason(e.target.value)}
                          placeholder={t.studentDetail.voidReason}
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!voidReason.trim() || voidPay.isPending}
                          onClick={() =>
                            voidPay.mutate({ id: p.id, reason: voidReason })
                          }
                        >
                          {t.studentDetail.void}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setVoidId(p.id);
                          setVoidReason("");
                        }}
                      >
                        {t.studentDetail.void}
                      </Button>
                    )}
                  </div>
                )),
              )
              .slice(0, 20)}
          </>
        )}
      </Section>

      <Section title={t.studentDetail.progress}>
        {!progress ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        ) : !progress.enrollmentId ? (
          <p className="text-muted-foreground text-sm">
            {t.studentDetail.noEnrollment}
          </p>
        ) : (
          <>
            <Bucket
              label={t.studentDetail.driving}
              included={progress.driving.included}
              used={progress.driving.used}
              unit={t.people.hours}
            />
            <Bucket
              label={t.studentDetail.parking}
              included={progress.parking.included}
              used={progress.parking.used}
              unit={t.people.sessions}
            />
            <Bucket
              label={t.studentDetail.theory}
              included={progress.theory.included}
              used={progress.theory.used}
              unit={t.people.hours}
            />
            <Bucket
              label={t.studentDetail.examDrive}
              included={progress.examDrive.included}
              used={progress.examDrive.used}
              unit={t.people.attempts}
            />
            <Bucket
              label={t.studentDetail.examParking}
              included={progress.examParking.included}
              used={progress.examParking.used}
              unit={t.people.attempts}
            />
          </>
        )}
      </Section>

      <Section
        title={t.studentDetail.exams}
        action={
          <Dialog open={examOpen} onOpenChange={setExamOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                {t.studentDetail.addExam}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{t.studentDetail.addExam}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-2">
                  <Label>{t.studentDetail.examType}</Label>
                  <Select
                    value={examForm.type}
                    onValueChange={(v) =>
                      setExamForm((f) => ({ ...f, type: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theory">
                        {t.schedule.kinds.theory}
                      </SelectItem>
                      <SelectItem value="drive">
                        {t.schedule.kinds.driving}
                      </SelectItem>
                      <SelectItem value="parking">
                        {t.schedule.kinds.parking}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exam-date">{t.studentDetail.examDate}</Label>
                  <Input
                    id="exam-date"
                    type="datetime-local"
                    value={examForm.scheduledFor}
                    onChange={(e) =>
                      setExamForm((f) => ({
                        ...f,
                        scheduledFor: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="exam-note">{t.studentDetail.note}</Label>
                  <Input
                    id="exam-note"
                    value={examForm.note}
                    onChange={(e) =>
                      setExamForm((f) => ({ ...f, note: e.target.value }))
                    }
                  />
                </div>
                <Button
                  disabled={!examForm.scheduledFor || addExam.isPending}
                  onClick={() => addExam.mutate()}
                >
                  {t.studentDetail.addExam}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      >
        {exams.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t.studentDetail.empty}
          </p>
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div>
                <p className="font-medium">{examTypeLabel(exam.type)}</p>
                <p className="text-muted-foreground">
                  {new Date(exam.scheduledFor).toLocaleDateString(
                    intlLocale(locale),
                  )}{" "}
                  · {examStatusLabel(exam.status)}
                </p>
              </div>
              <div className="flex gap-1">
                {(["passed", "failed", "absent", "cancelled"] as const).map(
                  (s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={exam.status === s ? "default" : "outline"}
                      disabled={setExamStatus.isPending}
                      onClick={() =>
                        setExamStatus.mutate({ id: exam.id, status: s })
                      }
                    >
                      {examStatusLabel(s)}
                    </Button>
                  ),
                )}
              </div>
            </div>
          ))
        )}
      </Section>

      <Section title={t.studentDetail.lessons}>
        {lessons.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t.studentDetail.empty}
          </p>
        ) : (
          lessons.map((l) => (
            <div
              key={l.id}
              className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
            >
              <div>
                <p className="font-medium">{l.kind}</p>
                <p className="text-muted-foreground">
                  {l.instructor
                    ? `${l.instructor.firstName} ${l.instructor.lastName}`
                    : "—"}
                </p>
              </div>
              <span className="text-muted-foreground whitespace-nowrap tabular-nums">
                {new Date(l.startsAt).toLocaleDateString(intlLocale(locale))} ·{" "}
                {l.status}
              </span>
            </div>
          ))
        )}
      </Section>
    </div>
  );

  function examTypeLabel(type: string) {
    if (type === "theory") return t.schedule.kinds.theory;
    if (type === "parking") return t.schedule.kinds.parking;
    return t.schedule.kinds.driving;
  }

  function examStatusLabel(status: string) {
    if (status === "passed") return t.schedule.examStatus.passed;
    if (status === "failed") return t.schedule.examStatus.failed;
    if (status === "absent") return t.schedule.examStatus.absent;
    if (status === "cancelled") return t.schedule.status.cancelled;
    return t.schedule.status.scheduled;
  }

  function Bucket({
    label,
    included,
    used,
    unit,
  }: {
    label: string;
    included: number;
    used: number;
    unit: string;
  }) {
    const pct =
      included > 0 ? Math.min(100, Math.round((used / included) * 100)) : 0;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-muted-foreground tabular-nums">
            {t.studentDetail.used}: {used} · {t.studentDetail.remaining}:{" "}
            {Math.max(0, included - used)} / {included} {unit}
          </span>
        </div>
        <Progress value={pct} />
      </div>
    );
  }
}
