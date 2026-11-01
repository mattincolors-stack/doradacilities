import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Minus, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProductPhoto } from "@/components/ProductPhoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { productsQuery, type Product } from "@/lib/queries";
import { brl, qty } from "@/lib/format";
import { sendOrderWhatsapp } from "@/lib/whatsapp.functions";
import { saleLabel } from "@/lib/product-rules";

export const Route = createFileRoute("/_authenticated/pedidos/novo")({
  head: () => ({ meta: [{ title: "Novo pedido — DoraFacilities APP" }] }),
  component: NewOrderPage,
});

type CartLine = { product: Product; quantity: number };

function NewOrderPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const send = useServerFn(sendOrderWhatsapp);
  const products = useQuery(productsQuery);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (products.data ?? []).filter(
      (p) => p.active && (!s || p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s)),
    );
  }, [products.data, search]);

  const total = cart.reduce((s, l) => s + l.quantity * Number(l.product.sale_price), 0);
  const step = (p: Product) => (p.unit === "kg" ? 0.5 : 1);

  function add(p: Product) {
    setCart((c) => {
      const i = c.findIndex((l) => l.product.id === p.id);
      if (i < 0) return [...c, { product: p, quantity: 1 }];
      const n = [...c];
      const line = n[i];
      if (!line) return c;
      n[i] = { ...line, quantity: line.quantity + step(p) };
      return n;
    });
  }
  function setQty(id: string, q: number) {
    setCart((c) => c.map((l) => (l.product.id === id ? { ...l, quantity: Math.max(0, q) } : l)));
  }

  async function finalize() {
    if (!name.trim()) { toast.error("Informe o nome do cliente"); return; }
    const items = cart.filter((l) => l.quantity > 0);
    if (!items.length) { toast.error("Adicione ao menos um produto"); return; }
    setBusy(true);
    try {
      const { data: id, error } = await supabase.rpc("create_order", {
        _customer_name: name,
        _customer_phone: phone,
        _notes: notes,
        _items: items.map((l) => ({ product_id: l.product.id, quantity: l.quantity })),
      });
      if (error) throw error;
      toast.success("Pedido finalizado!");
      try {
        const r = await send({ data: { orderId: id } });
        if (r.status === "enviado") toast.success("Resumo enviado para o WhatsApp");
        else if (r.status === "falhou") toast.error("Falha ao enviar para o WhatsApp");
      } catch {
        /* status shown on the order page */
      }
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate({ to: "/pedidos/$id", params: { id }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar pedido");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell
      title="Novo pedido"
      action={
        <Button asChild variant="ghost" size="sm">
          <Link to="/pedidos"><ArrowLeft className="h-4 w-4" /> Voltar</Link>
        </Button>
      }
    >
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Cliente</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cn">Nome</Label>
            <Input id="cn" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp">Telefone</Label>
            <Input id="cp" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(16) 99999-9999" className="h-12 text-base" />
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar produto" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 pl-10 text-base" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {list.map((p) => (
            <button key={p.id} type="button" onClick={() => add(p)} className="flex items-center gap-2 rounded-xl border bg-card p-2 text-left active:bg-accent">
              <ProductPhoto path={p.photo_url} className="h-14 w-14" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{p.name}</p>
                {p.description && <p className="text-xs text-muted-foreground">{p.description}</p>}
                <p className="text-xs text-muted-foreground">{brl(Number(p.sale_price))}/{saleLabel(p)}</p>
              </div>
            </button>
          ))}
          {products.data && list.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-muted-foreground">
              Nenhum produto ativo. <Link to="/produtos" className="font-semibold text-primary underline">Cadastrar produtos</Link>
            </p>
          )}
        </div>
      </section>

      <section className="mt-4 space-y-2 rounded-xl border bg-card p-4">
        <h2 className="font-bold">Carrinho</h2>
        {cart.length === 0 && <p className="text-sm text-muted-foreground">Toque em um produto para adicionar.</p>}
        {cart.map((l) => (
          <div key={l.product.id} className="flex items-center gap-2 border-b pb-2 last:border-0">
            <ProductPhoto path={l.product.photo_url} className="h-12 w-12" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{l.product.name}</p>
              {l.product.description && <p className="text-xs text-muted-foreground">{l.product.description}</p>}
              <p className="text-xs text-muted-foreground">
                {qty(l.quantity)} {l.product.unit} × {brl(Number(l.product.sale_price))} = <b>{brl(l.quantity * Number(l.product.sale_price))}</b>
              </p>
            </div>
            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setQty(l.product.id, l.quantity - step(l.product))} aria-label="Diminuir">
              <Minus />
            </Button>
            <Input
              type="number"
              inputMode="decimal"
              step="any"
              min={0}
              value={l.quantity}
              onChange={(e) => setQty(l.product.id, Number(e.target.value))}
              className="h-10 w-16 text-center"
            />
            <Button size="icon" variant="outline" className="h-10 w-10" onClick={() => setQty(l.product.id, l.quantity + step(l.product))} aria-label="Aumentar">
              <Plus />
            </Button>
            <Button size="icon" variant="ghost" className="h-10 w-10 text-destructive" onClick={() => setCart((c) => c.filter((x) => x.product.id !== l.product.id))} aria-label="Remover">
              <Trash2 />
            </Button>
          </div>
        ))}
        <div className="space-y-1.5 pt-2">
          <Label htmlFor="obs">Observações</Label>
          <Textarea id="obs" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </section>

      <div className="sticky bottom-20 mt-4 flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-lg">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-2xl font-extrabold">{brl(total)}</p>
        </div>
        <Button size="lg" className="h-12 px-6 text-base" disabled={busy} onClick={finalize}>
          {busy ? "Salvando..." : "Finalizar pedido"}
        </Button>
      </div>
    </AppShell>
  );
}
