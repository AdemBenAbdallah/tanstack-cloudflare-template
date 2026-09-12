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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale } from "@/i18n";
import {
  createPackageFn,
  listPackagesFn,
  updatePackageFn,
} from "@/lib/billing";
import { formatTND, parseTND } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/packages")({
  // Zero-cost guard: parent layout already resolved the membership.
  beforeLoad: ({ context }) => {
    const role = (context as { membership?: { role?: string } }).membership
      ?.role;
    if (role !== "owner") throw redirect({ to: "/app" });
  },
  component: PackagesPage,
});

const emptyForm = {
  name: "",
  drivingHours: "20",
  parkingSessions: "10",
  theoryHours: "20",
  examDriveAttempts: "1",
  examParkingAttempts: "1",
  priceTND: "",
  active: true,
};

type Form = typeof emptyForm & { id?: string };

function toMinutes(hours: string) {
  const n = Number(hours);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 60);
}

function PackageDialog({
  initial,
  open,
  onOpenChange,
  onSubmit,
  pending,
  error,
  title,
}: {
  initial?: Form;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (form: Form) => void;
  pending: boolean;
  error: string | null;
  title: string;
}) {
  const { t } = useLocale();
  const [form, setForm] = useState(initial ?? emptyForm);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(form);
          }}
        >
          <div className="grid gap-2">
            <Label>{t.people.name}</Label>
            <Input
              required
              minLength={2}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Permis B"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>
                {t.studentDetail.driving} ({t.people.hours})
              </Label>
              <Input
                inputMode="numeric"
                value={form.drivingHours}
                onChange={(e) => set("drivingHours", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                {t.studentDetail.parking} ({t.people.sessions})
              </Label>
              <Input
                inputMode="numeric"
                value={form.parkingSessions}
                onChange={(e) => set("parkingSessions", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                {t.studentDetail.theory} ({t.people.hours})
              </Label>
              <Input
                inputMode="numeric"
                value={form.theoryHours}
                onChange={(e) => set("theoryHours", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label>
                {t.studentDetail.examDrive} ({t.people.attempts})
              </Label>
              <Input
                inputMode="numeric"
                value={form.examDriveAttempts}
                onChange={(e) => set("examDriveAttempts", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>
                {t.studentDetail.examParking} ({t.people.attempts})
              </Label>
              <Input
                inputMode="numeric"
                value={form.examParkingAttempts}
                onChange={(e) => set("examParkingAttempts", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.people.price} (TND)</Label>
              <Input
                required
                inputMode="decimal"
                value={form.priceTND}
                onChange={(e) => set("priceTND", e.target.value)}
                placeholder="1500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.active}
              onCheckedChange={(v) => set("active", v)}
            />
            <Label>{form.active ? t.people.active : t.people.inactive}</Label>
          </div>
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

function PackagesPage() {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const packagesQuery = useQuery({
    queryKey: ["packages"],
    queryFn: () => listPackagesFn(),
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["packages"] });

  const save = useMutation({
    mutationFn: (form: Form) => {
      const drivingMinutes = toMinutes(form.drivingHours);
      const theoryMinutes = toMinutes(form.theoryHours);
      const priceMillimes = parseTND(form.priceTND);
      const parkingSessions = Number(form.parkingSessions);
      const examDriveAttempts = Number(form.examDriveAttempts);
      const examParkingAttempts = Number(form.examParkingAttempts);
      if (
        drivingMinutes === null ||
        theoryMinutes === null ||
        priceMillimes === null ||
        !Number.isInteger(parkingSessions) ||
        !Number.isInteger(examDriveAttempts) ||
        !Number.isInteger(examParkingAttempts)
      ) {
        throw new Error("INVALID_NUMBERS");
      }
      const data = {
        name: form.name.trim(),
        drivingMinutes,
        parkingSessions,
        theoryMinutes,
        examDriveAttempts,
        examParkingAttempts,
        priceMillimes,
        active: form.active,
      };
      return form.id
        ? updatePackageFn({ data: { ...data, id: form.id } })
        : createPackageFn({ data });
    },
    onSuccess: (_d, form) => {
      setCreating(false);
      setEditingId(null);
      setError(null);
      toast.success(form.id ? t.people.updated : t.people.created);
      refresh();
    },
    onError: () => setError(t.people.failed),
  });

  const rows = packagesQuery.data ?? [];
  const editing = rows.find((r) => r.id === editingId);

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>{t.people.packages}</CardTitle>
              <CardDescription>
                {rows.length} · {t.people.packages}
              </CardDescription>
            </div>
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setError(null)}>
                  {t.people.newPackage}
                </Button>
              </DialogTrigger>
              <PackageDialog
                open={creating}
                onOpenChange={setCreating}
                onSubmit={(f) => save.mutate(f)}
                pending={save.isPending}
                error={error}
                title={t.people.newPackage}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {packagesQuery.isLoading ? (
            <TableSkeleton rows={4} className="px-0 lg:px-0" />
          ) : rows.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {t.studentDetail.empty}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t.people.name}</TableHead>
                  <TableHead className="hidden md:table-cell">
                    {t.studentDetail.driving} / {t.studentDetail.parking} /{" "}
                    {t.studentDetail.theory}
                  </TableHead>
                  <TableHead>{t.people.price}</TableHead>
                  <TableHead>{t.people.status}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden tabular-nums md:table-cell">
                      {r.drivingMinutes / 60}h / {r.parkingSessions} /{" "}
                      {r.theoryMinutes / 60}h
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatTND(r.priceMillimes, locale)}
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
      {editing && (
        <PackageDialog
          key={editing.id}
          initial={{
            ...emptyForm,
            id: editing.id,
            name: editing.name,
            drivingHours: String(editing.drivingMinutes / 60),
            parkingSessions: String(editing.parkingSessions),
            theoryHours: String(editing.theoryMinutes / 60),
            examDriveAttempts: String(editing.examDriveAttempts),
            examParkingAttempts: String(editing.examParkingAttempts),
            priceTND: String(editing.priceMillimes / 1000),
            active: editing.active,
          }}
          open={editingId !== null}
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
          onSubmit={(f) => save.mutate(f)}
          pending={save.isPending}
          error={error}
          title={t.people.editPackage}
        />
      )}
    </div>
  );
}
