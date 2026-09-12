import type { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { Toaster } from "sonner";
import { ThemeProvider, themeInitScript } from "@/components/theme-provider";
import { LocaleProvider, localeInitScript } from "@/i18n";
import "../styles.css";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()(
  {
    head: () => ({
      meta: [
        { charSet: "utf-8" },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { title: "Dashboard Template" },
      ],
      scripts: [{ children: themeInitScript }, { children: localeInitScript }],
    }),
    component: RootComponent,
  },
);

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <html lang="en" dir="ltr">
        <head>
          <HeadContent />
        </head>
        <body>
          <ThemeProvider>
            <LocaleProvider>
              <Outlet />
              <Toaster richColors closeButton />
            </LocaleProvider>
          </ThemeProvider>
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}
