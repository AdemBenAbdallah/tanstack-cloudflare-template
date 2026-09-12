import { createFileRoute } from "@tanstack/react-router";

const handler = async ({ request }: { request: Request }) => {
  // Lazy import: this route module ships to the client (without `server`
  // handlers), where `cloudflare:workers` cannot be resolved.
  const { createAuth } = await import("@/auth/auth.server");
  return createAuth().handler(request);
};

export const Route = createFileRoute("/api/auth/$")({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
});
