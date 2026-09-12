import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    // Home IS the dashboard. Unauthenticated visitors bounce to /login
    // via the _authenticated guard on /app.
    throw redirect({ to: "/app" });
  },
  component: HomeRedirect,
});

function HomeRedirect() {
  return null;
}
