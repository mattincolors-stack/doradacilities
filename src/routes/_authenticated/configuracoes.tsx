import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { settingsQuery } from "@/lib/queries";
import { createAdmin } from "@/lib/admin.functions";
import { getWhatsappConfig } from "@/lib/whatsapp.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — DoraFacilities APP" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const settings = useQuery(settingsQuery);
  const getConfig = useServerFn(getWhatsappConfig);
  const config = useQuery({ queryKey: ["wa-config"], queryFn: () => getConfig() });
  const newAdmin = useServerFn(createAdmin);
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [width, setWidth] = useState(32);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!settings.data) return;
    setCompany(settings.data.company_name);
    setPhone(settings.data.whatsapp_number);
    setWidth(settings.data.txt_width);
  }, [settings.data]);

  async function save() {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 12) return toast.error("Número com DDI e DDD, ex.: 5516995757737");
    const { error } = await supabase
      .from("settings")
      .update({ company_name: company.trim() || "Dora Facilities", whatsapp_number: digits, txt_width: width, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Configurações salvas");
    qc.invalidateQueries({ queryKey: ["settings"] });
  }

  async function addAdmin() {
    setBusy(true);
    try {
      await newAdmin({ data: { email, password } });
      toast.success("Administrador criado");
      setEmail("");
      setPassword("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao criar administrador");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <AppShell title="Configurações">
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Empresa</h2>
        <div className="space-y-1.5">
          <Label htmlFor="cname">Nome da empresa</Label>
          <Input id="cname" value={company} onChange={(e) => setCompany(e.target.value)} className="h-12 text-base" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wnum">WhatsApp de destino dos pedidos</Label>
          <Input id="wnum" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12 text-base" />
          <p className="text-xs text-muted-foreground">Com DDI e DDD, só números. Ex.: 5516995757737</p>
        </div>
        <div className="space-y-1.5">
          <Label>Largura do TXT (impressora térmica)</Label>
          <div className="grid grid-cols-2 gap-2">
            {[32, 48].map((w) => (
              <button key={w} type="button" onClick={() => setWidth(w)} className={cn("h-12 rounded-lg border font-semibold", width === w ? "border-primary bg-primary text-primary-foreground" : "bg-card")}>
                {w} colunas
              </button>
            ))}
          </div>
        </div>
        <Button className="h-12 w-full text-base" onClick={save}>Salvar</Button>
      </section>

      <section className="mt-3 space-y-2 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Envio automático pelo WhatsApp</h2>
        {config.data?.configured ? (
          <p className="text-sm text-success">Ativo: os pedidos são enviados automaticamente pela API oficial.</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Não configurado. Os pedidos usam o link do WhatsApp com a mensagem pronta até as credenciais da API oficial serem adicionadas.
          </p>
        )}
      </section>

      <section className="mt-3 space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Novo administrador</h2>
        <Input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 text-base" />
        <Input type="password" placeholder="Senha (mín. 8 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 text-base" />
        <Button variant="secondary" className="h-12 w-full" disabled={busy} onClick={addAdmin}>
          {busy ? "Criando..." : "Criar administrador"}
        </Button>
      </section>

      <Button variant="outline" className="mt-3 h-12 w-full text-destructive" onClick={signOut}>
        <LogOut /> Sair
      </Button>
    </AppShell>
  );
}
