import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { ProjectsChart } from "@/components/dashboard/projects-chart";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { SectionCards } from "@/components/dashboard/section-cards";
import { useLocale } from "@/i18n";
import { listProjectsFn } from "@/lib/projects";

export const Route = createFileRoute("/_authenticated/app")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    q?: string;
    dialog?: "new";
  } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    dialog: search.dialog === "new" ? "new" : undefined,
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { q = "", dialog } = Route.useSearch();
  const { user } = Route.useRouteContext() as {
    user: { id: string; name: string; email: string; role: string };
  };

  const projectsQuery = useQuery({
    queryKey: ["projects"],
    queryFn: () => listProjectsFn(),
  });

  const projects = (projectsQuery.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    createdAt: new Date(p.createdAt),
    ownerId: p.ownerId,
    owner: p.owner,
  }));

  const contributors = new Set(projects.map((p) => p.ownerId)).size;

  return (
    <>
      <SectionCards
        stats={{
          total: projects.length,
          mine: projects.filter((p) => p.ownerId === user.id).length,
          contributors,
          role: user.role,
        }}
      />
      <div className="px-4 lg:px-6">
        <ProjectsChart />
      </div>
      {projectsQuery.isLoading ? (
        <p className="px-4 text-sm lg:px-6">{t.app.loading}</p>
      ) : (
        <ProjectsTable projects={projects} filter={q} />
      )}
      <NewProjectDialog
        open={dialog === "new"}
        onOpenChange={(open) =>
          void navigate({
            to: "/app",
            search: (prev) => ({ ...prev, dialog: open ? "new" : undefined }),
          })
        }
      />
    </>
  );
}
