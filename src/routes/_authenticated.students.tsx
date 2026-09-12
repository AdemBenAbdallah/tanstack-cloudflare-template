import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { TableSkeleton } from "@/components/loading";
import { Badge } from "@/components/ui/badge";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale } from "@/i18n";
import { createSchoolUserFn, listStudentsFn } from "@/lib/people";

export const Route = createFileRoute("/_authenticated/students")({
  // Zero-cost guard: parent layout already resolved the membership.
  beforeLoad: ({ context }) => {
    const role = (context as { membership?: { role?: string } }).membership
      ?.role;
    if (role !== "owner" && role !== "secretary") {
      throw redirect({ to: "/app" });
    }
  },
  component: StudentsPage,
});

function statusVariant(status: string) {
  if (status === "passed") return "default" as const;
  if (status === "abandoned") return "destructive" as const;
  return "secondary" as const;
}

function NewStudentDialog() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (input: typeof form) =>
      createSchoolUserFn({
        data: {
          name: `${input.firstName.trim()} ${input.lastName.trim()}`.trim(),
          email: input.email.trim(),
          password: input.password,
          role: "student",
          profile: {
            firstName: input.firstName.trim(),
            lastName: input.lastName.trim(),
            phone: input.phone.trim() || undefined,
          },
        },
      }),
    onSuccess: () => {
      setOpen(false);
      setForm({
        firstName: "",
        lastName: "",
        phone: "",
        email: "",
        password: "",
      });
      setError(null);
      toast.success(t.people.created);
      void queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg.includes("EMAIL_TAKEN") ? t.people.emailTaken : t.people.failed,
      );
    },
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">{t.people.newStudent}</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t.people.newStudent}</DialogTitle>
          <DialogDescription>{t.people.passwordHint}</DialogDescription>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate(form);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ns-first">{t.people.firstName}</Label>
              <Input
                id="ns-first"
                required
                minLength={2}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ns-last">{t.people.lastName}</Label>
              <Input
                id="ns-last"
                required
                minLength={2}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns-phone">{t.people.phone}</Label>
            <Input
              id="ns-phone"
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+216 -- --- ---"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns-email">{t.people.email}</Label>
            <Input
              id="ns-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder={t.login.emailPlaceholder}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="ns-password">{t.people.password}</Label>
            <Input
              id="ns-password"
              type="text"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
          </div>
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {t.people.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function StudentsPage() {
  const { t } = useLocale();
  const studentsQuery = useQuery({
    queryKey: ["students"],
    queryFn: () => listStudentsFn(),
  });
  const rows = studentsQuery.data ?? [];

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>{t.people.students}</CardTitle>
              <CardDescription>
                {rows.length} · {t.overview.studentsFootnote}
              </CardDescription>
            </div>
            <NewStudentDialog />
          </div>
        </CardHeader>
        <CardContent>
          {studentsQuery.isLoading ? (
            <TableSkeleton rows={6} className="px-0 lg:px-0" />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t.studentDetail.empty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.people.name}</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    {t.people.phone}
                  </TableHead>
                  <TableHead>{t.people.status}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      <Link
                        to="/students/$id"
                        params={{ id: s.id }}
                        className="underline-offset-4 hover:underline"
                      >
                        {s.firstName} {s.lastName}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {s.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(s.status)}>
                        {t.people.studentStatuses[
                          s.status as keyof typeof t.people.studentStatuses
                        ] ?? s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
