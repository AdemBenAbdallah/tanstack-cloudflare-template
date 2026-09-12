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
import { useLocale } from "@/i18n";
import {
  createVehicleFn,
  deleteVehicleFn,
  listVehiclesFn,
  updateVehicleFn,
} from "@/lib/people";

export const Route = createFileRoute("/_authenticated/vehicles")({
  // Zero-cost guard: parent layout already resolved the membership.
  beforeLoad: ({ context }) => {
    const role = (context as { membership?: { role?: string } }).membership
      ?.role;
    if (role !== "owner" && role !== "secretary") {
      throw redirect({ to: "/app" });
    }
  },
  component: VehiclesPage,
});

const emptyForm = {
  name: "",
  plate: "",
  category: "B",
  transmission: "manual",
  active: true,
};

type Form = typeof emptyForm & { id?: string };

function VehicleDialog({
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
              placeholder="Peugeot 208"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t.people.plate}</Label>
              <Input
                value={form.plate}
                onChange={(e) => set("plate", e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label>{t.people.category}</Label>
              <Input
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>{t.people.transmission}</Label>
              <Select
                value={form.transmission}
                onValueChange={(v) => set("transmission", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">{t.people.manual}</SelectItem>
                  <SelectItem value="auto">{t.people.auto}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => set("active", v)}
              />
              <Label>{form.active ? t.people.active : t.people.inactive}</Label>
            </div>
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

function VehiclesPage() {
  const { t } = useLocale();
  const queryClient = useQueryClient();
  const vehiclesQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => listVehiclesFn(),
  });
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () =>
    void queryClient.invalidateQueries({ queryKey: ["vehicles"] });

  const save = useMutation({
    mutationFn: (form: Form) => {
      const transmission =
        form.transmission === "auto" ? ("auto" as const) : ("manual" as const);
      return form.id
        ? updateVehicleFn({ data: { ...form, id: form.id, transmission } })
        : createVehicleFn({ data: { ...form, transmission } });
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

  const remove = useMutation({
    mutationFn: (id: string) => deleteVehicleFn({ data: { id } }),
    onSuccess: () => {
      toast.success(t.people.deleted);
      refresh();
    },
    onError: (e: unknown) =>
      toast.error(
        e instanceof Error && e.message.includes("VEHICLE_IN_USE")
          ? t.people.vehicleInUse
          : t.people.failed,
      ),
  });

  const rows = vehiclesQuery.data ?? [];
  const editing = rows.find((r) => r.id === editingId);

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div>
              <CardTitle>{t.people.vehicles}</CardTitle>
              <CardDescription>
                {rows.length} · {t.people.vehicles}
              </CardDescription>
            </div>
            <Dialog open={creating} onOpenChange={setCreating}>
              <DialogTrigger asChild>
                <Button size="sm" onClick={() => setError(null)}>
                  {t.people.newVehicle}
                </Button>
              </DialogTrigger>
              <VehicleDialog
                open={creating}
                onOpenChange={setCreating}
                onSubmit={(f) => save.mutate(f)}
                pending={save.isPending}
                error={error}
                title={t.people.newVehicle}
              />
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {vehiclesQuery.isLoading ? (
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
                    {t.people.plate}
                  </TableHead>
                  <TableHead>{t.people.transmission}</TableHead>
                  <TableHead>{t.people.status}</TableHead>
                  <TableHead className="text-end">{t.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-muted-foreground hidden sm:table-cell">
                      {r.plate ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.transmission === "auto"
                        ? t.people.auto
                        : t.people.manual}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.active ? "secondary" : "destructive"}>
                        {r.active ? t.people.active : t.people.inactive}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-1">
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
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(r.id)}
                        >
                          {t.common.delete}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      {editing && (
        <VehicleDialog
          key={editing.id}
          initial={{ ...emptyForm, ...editing, plate: editing.plate ?? "" }}
          open={editingId !== null}
          onOpenChange={(o) => {
            if (!o) setEditingId(null);
          }}
          onSubmit={(f) => save.mutate(f)}
          pending={save.isPending}
          error={error}
          title={t.people.editVehicle}
        />
      )}
    </div>
  );
}
