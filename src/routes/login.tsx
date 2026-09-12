import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { authClient } from "@/auth/auth-client";
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

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      if (mode === "sign-up") {
        const res = await authClient.signUp.email({
          email,
          password,
          name: name || email,
        });
        if (res.error) throw new Error(res.error.message);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message);
      }
      await navigate({ to: "/app" });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.login.failed);
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
          <CardTitle>
            {mode === "sign-in" ? t.login.welcomeBack : t.login.createAccount}
          </CardTitle>
          <CardDescription>{t.login.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === "sign-up" && (
              <div className="grid gap-2">
                <Label htmlFor="name">{t.login.name}</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.login.namePlaceholder}
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="email">{t.login.email}</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.login.emailPlaceholder}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">{t.login.password}</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
            <Button type="submit" disabled={pending}>
              {pending
                ? t.login.wait
                : mode === "sign-in"
                  ? t.login.signIn
                  : t.login.signUp}
            </Button>
            <div className="flex items-center text-sm">
              <button
                type="button"
                className="underline"
                onClick={() =>
                  setMode(mode === "sign-in" ? "sign-up" : "sign-in")
                }
              >
                {mode === "sign-in" ? t.login.needAccount : t.login.haveAccount}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
