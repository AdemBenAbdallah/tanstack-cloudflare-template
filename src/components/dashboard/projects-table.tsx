import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useLocale } from "@/i18n";
import { deleteProjectFn } from "@/lib/projects";

export interface TableProject {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  owner: { name: string; email: string } | null;
}

const PAGE_SIZE = 8;

type SortKey = "name" | "createdAt";

export function ProjectsTable({
  projects,
  filter,
}: {
  projects: Array<TableProject>;
  filter: string;
}) {
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [page, setPage] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProjectFn({ data: { id } }),
    onSuccess: () => {
      setDeleteId(null);
      toast.success(t.app.deleted);
      void queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
    onError: () => toast.error(t.app.deleteFailed),
  });

  const rows = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const filtered = q
      ? projects.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? "").toLowerCase().includes(q) ||
            (p.owner?.name ?? "").toLowerCase().includes(q),
        )
      : [...projects];
    filtered.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * sortDir;
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
        sortDir
      );
    });
    return filtered;
  }, [projects, filter, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE,
  );

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(key);
      setSortDir(key === "name" ? 1 : -1);
    }
  }

  function SortButton({
    column,
    children,
  }: {
    column: SortKey;
    children: React.ReactNode;
  }) {
    const active = sortKey === column;
    return (
      <button
        type="button"
        onClick={() => toggleSort(column)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        {active ? (
          sortDir === 1 ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 opacity-50" />
        )}
      </button>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground px-4 py-8 text-center text-sm lg:px-6">
        {filter ? t.table.noResults : t.app.empty}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2 px-4 lg:px-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortButton column="name">{t.app.name}</SortButton>
            </TableHead>
            <TableHead className="hidden md:table-cell">
              {t.app.description}
            </TableHead>
            <TableHead className="hidden sm:table-cell">
              {t.table.owner}
            </TableHead>
            <TableHead>
              <SortButton column="createdAt">{t.table.created}</SortButton>
            </TableHead>
            <TableHead className="text-end">{t.table.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.name}</TableCell>
              <TableCell className="text-muted-foreground hidden max-w-64 truncate md:table-cell">
                {p.description ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground hidden sm:table-cell">
                {p.owner?.name ?? "—"}
              </TableCell>
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {new Date(p.createdAt).toLocaleDateString(
                  locale === "ar" ? "ar" : "en-US",
                  { year: "numeric", month: "short", day: "numeric" },
                )}
              </TableCell>
              <TableCell className="text-end">
                <Dialog
                  open={deleteId === p.id}
                  onOpenChange={(open) => setDeleteId(open ? p.id : null)}
                >
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      {t.app.delete}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{p.name}</DialogTitle>
                      <DialogDescription>
                        {t.app.deleteFailed}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setDeleteId(null)}
                      >
                        {t.common.cancel}
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate(p.id)}
                      >
                        {t.app.delete}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pageCount > 1 && (
        <div className="flex items-center justify-end gap-2 py-2 text-sm">
          <span className="text-muted-foreground">
            {t.table.pageOf} {safePage + 1} {t.table.of} {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage === 0}
            onClick={() => setPage(safePage - 1)}
          >
            <ChevronLeft className="size-4 rtl:rotate-180" />
            {t.table.previous}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage(safePage + 1)}
          >
            {t.table.next}
            <ChevronRight className="size-4 rtl:rotate-180" />
          </Button>
        </div>
      )}
    </div>
  );
}
