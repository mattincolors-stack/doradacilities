import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({ erro: typeof s.erro === "string" ? s.erro : undefined }),
  head: () => ({
    meta: [
      { title: "Entrar — DoraFacilities APP" },
      { name: "description", content: "Acesso do administrador da Dora Facilities." },
      { property: "og:title", content: "Entrar — DoraFacilities APP" },
      { property: "og:description", content: "Acesso do administrador da Dora Facilities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const { erro } = Route.useSearch();
  const bootstrap = useServerFn(bootstrapAdmin);
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.rpc("admin_exists").then(({ data }) => setHasAdmin(Boolean(data)));
    supabase.auth.getUser().then(({ data }) => {
      if (data.user && !erro) navigate({ to: "/pedidos", replace: true });
    });
    if (erro === "sem-permissao") toast.error("Este usuário não é administrador.");
  }, [erro, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (hasAdmin === false) {
        await bootstrap({ data: { email, password } });
        toast.success("Administrador criado!");
      }
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw new Error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      navigate({ to: "/pedidos", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao entrar");
    } finally {
      setBusy(false);
    }
  }

  const first = hasAdmin === false;
  return (
    <div className="flex min-h-screen flex-col justify-center bg-primary px-5 py-10">
      <div className="mx-auto w-full max-w-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary-foreground/70">Dora Facilities</p>
        <h1 className="mt-1 text-3xl font-extrabold text-primary-foreground">DoraFacilities APP</h1>
        <form onSubmit={submit} className="mt-8 space-y-4 rounded-2xl bg-card p-6 shadow-xl">
          <div>
            <h2 className="text-lg font-bold">{first ? "Criar primeiro administrador" : "Entrar"}</h2>
            {first && (
              <p className="mt-1 text-sm text-muted-foreground">
                Ainda não há administrador. A conta criada agora será o administrador do app.
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete={first ? "new-password" : "current-password"} required minLength={first ? 8 : undefined} value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" />
          </div>
          <Button type="submit" disabled={busy || hasAdmin === null} className="h-12 w-full text-base">
            {busy ? "Aguarde..." : first ? "Criar e entrar" : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
