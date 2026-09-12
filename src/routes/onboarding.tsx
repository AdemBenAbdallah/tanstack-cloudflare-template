import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { LocaleToggle } from "@/components/locale-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/i18n";
import { getMembershipFn, getSessionFn } from "@/lib/auth-guard";
import { createSchoolFn } from "@/lib/school";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: async () => {
    const session = await getSessionFn().catch(() => null);
    if (!session) throw redirect({ to: "/login" });
    const membership = await getMembershipFn().catch(() => null);
    if (membership) throw redirect({ to: "/app" });
    return { user: session.user };
  },
  component: OnboardingPage,
});

function OnboardingPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { user } = Route.useRouteContext() as {
    user: { name: string; email: string };
  };
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await createSchoolFn({
        data: {
          name: name.trim(),
          city: city.trim() || undefined,
          phone: phone.trim() || undefined,
        },
      });
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.schedule.dialog.failed);
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-4 p-6">
      <div className="flex justify-end gap-2">
        <LocaleToggle />
        <ThemeToggle />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t.onboarding.title}</CardTitle>
          <CardDescription>
            {t.onboarding.description.replace("{email}", user.email)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="grid gap-2">
              <Label htmlFor="school-name">{t.onboarding.schoolName}</Label>
              <Input
                id="school-name"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.onboarding.schoolPlaceholder}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="school-city">{t.onboarding.city}</Label>
                <Input
                  id="school-city"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={t.onboarding.cityPlaceholder}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="school-phone">{t.onboarding.phone}</Label>
                <Input
                  id="school-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 -- --- ---"
                />
              </div>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={pending || name.trim().length < 2}>
              {pending ? t.login.wait : t.onboarding.create}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
