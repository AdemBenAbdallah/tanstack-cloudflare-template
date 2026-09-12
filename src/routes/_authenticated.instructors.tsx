import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect } from "@tanstack/react-router";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useLocale } from "@/i18n";
import {
  createSchoolUserFn,
  listInstructorsFn,
  updateInstructorFn,
} from "@/lib/people";

export const Route = createFileRoute("/_authenticated/instructors")({
  // Zero-cost guard: parent layout already resolved the membership.
  beforeLoad: ({ context }) => {
    const role = (context as { membership?: { role?: string } }).membership
      ?.role;
    if (role !== "owner") throw redirect({ to: "/app" });
  },
  component: InstructorsPage,
});

const emptyForm = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  password: "",
  role: "instructor",
};

type InstructorForm = typeof emptyForm & {
  id?: string;
  active?: boolean;
  notes?: string;
};

function InstructorDialog({
  initial,
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
  title,
  showAccount,
}: {
  initial?: InstructorForm;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: InstructorForm) => void;
  pending: boolean;
  error: string | null;
  title: string;
  showAccount: boolean;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState<InstructorForm>(initial ?? emptyForm);

  function set<K extends keyof InstructorForm>(
    key: K,
    value: InstructorForm[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {showAccount && (
            <DialogDescription>{t.people.passwordHint}</DialogDescription>
          )}
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t.people.firstName}</Label>
              <Input
                required
                minLength={2}
                value={form.firstName}
                onChange={(e) => set("firstName", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.people.lastName}</Label>
              <Input
                required
                minLength={2}
                value={form.lastName}
                onChange={(e) => set("lastName", e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>{t.people.phone}</Label>
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+216 -- --- ---"
            />
          </div>
          {showAccount && (
            <>
              <div className="grid gap-2">
                <Label>{t.people.email}</Label>
                <Input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t.people.password}</Label>
                <Input
                  required
                  minLength={8}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>{t.people.role}</Label>
                <Select value={form.role} onValueChange={(v) => set("role", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instructor">
                      {t.people.roleInstructor}
                    </SelectItem>
                    <SelectItem value="secretary">
                      {t.people.roleSecretary}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
          {!showAccount && (
            <>
              <div className="grid gap-2">
                <Label>{t.studentDetail.notes}</Label>
                <Textarea
                  value={form.notes ?? ""}
                  onChange={(e) => set("notes", e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.active ?? true}
                  onCheckedChange={(v) => set("active", v)}
                />
                <Label>
                  {(form.active ?? true) ? t.people.active : t.people.inactive}
                </Label>
              </div>
            </>
          )}
          {error && <p className="text-destructive text-sm">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t.common.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {initial?.id ? t.people.save : t.people.create}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function InstructorsPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const instructorsQuery = useQuery({
    queryKey: ["instructors"],
    queryFn: () => listInstructorsFn(),
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["instructors"] });

  const create = useMutation({
    mutationFn: (form: typeof emptyForm) =>
      createSchoolUserFn({
        data: {
          name: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role as "instructor" | "secretary",
          profile: {
            firstName: form.firstName.trim(),
            lastName: form.lastName.trim(),
            phone: form.phone.trim() || undefined,
          },
        },
      }),
    onSuccess: () => {
      setCreating(false);
      setError(null);
      toast.success(t.people.created);
      refresh();
    },
    onError: (e: unknown) =>
      setError(
        e instanceof Error && e.message.includes("EMAIL_TAKEN")
          ? t.people.emailTaken
          : t.people.failed,
      ),
  });

  const save = useMutation({
    mutationFn: (form: InstructorForm) => {
      if (!form.id) throw new Error("missing id");
      return updateInstructorFn({
        data: {
          id: form.id,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          phone: form.phone.trim() || undefined,
          active: form.active ?? true,
          notes: form.notes?.trim() || undefined,
        },
      });
    },
    onSuccess: () => {
      setEditingId(null);
      setError(null);
      toast.success(t.people.updated);
      refresh();
    },
    onError: () => setError(t.people.failed),
  });

  const rows = instructorsQuery.data ?? [];
  const editing = rows.find((r) => r.id === editingId);

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>{t.people.instructors}</CardTitle>
              <CardDescription>
                {rows.length} · {t.overview.instructorsFootnote}
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setError(null);
                setCreating(true);
              }}
            >
              {t.people.newInstructor}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {instructorsQuery.isLoading ? (
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
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.firstName} {r.lastName}
                      <span className="text-muted-foreground block text-xs font-normal">
                        {r.user?.email ?? ""}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {r.phone ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.active ? "secondary" : "destructive"}>
                        {r.active ? t.people.active : t.people.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setError(null);
                          setEditingId(r.id);
                        }}
                      >
                        {t.common.edit}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <InstructorDialog
        open={creating}
        onOpenChange={setCreating}
        onSubmit={(f) => create.mutate(f)}
        pending={create.isPending}
        error={error}
        title={t.people.newInstructor}
        showAccount
      />
      {editing && (
        <InstructorDialog
          key={editing.id}
          initial={{
            ...emptyForm,
            id: editing.id,
            firstName: editing.firstName,
            lastName: editing.lastName,
            phone: editing.phone ?? "",
            active: editing.active,
            notes: editing.notes ?? "",
          }}
          open={editingId !== null}
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
          onSubmit={(f) => save.mutate(f)}
          pending={save.isPending}
          error={error}
          title={t.people.editInstructor}
          showAccount={false}
        />
      )}
    </div>
  );
}
