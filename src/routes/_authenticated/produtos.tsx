import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, ImageIcon, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ProductPhoto } from "@/components/ProductPhoto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { productsQuery, type Product } from "@/lib/queries";
import { brl, marginPct, pct } from "@/lib/format";
import { resizeImage } from "@/lib/files";

export const Route = createFileRoute("/_authenticated/produtos")({
  head: () => ({ meta: [{ title: "Produtos — DoraFacilities APP" }] }),
  component: ProductsPage,
});

const UNITS = ["kg", "un", "maço", "caixa"] as const;

function ProductsPage() {
  const qc = useQueryClient();
  const products = useQuery(productsQuery);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Product | "new" | null>(null);

  const list = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (products.data ?? []).filter((p) => !s || p.name.toLowerCase().includes(s) || p.category.toLowerCase().includes(s));
  }, [products.data, search]);

  async function toggle(p: Product) {
    const { error } = await supabase.from("products").update({ active: !p.active }).eq("id", p.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["products"] });
  }
  async function remove(p: Product) {
    if (!confirm(`Excluir "${p.name}"? Pedidos antigos continuam com o histórico.`)) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    if (p.photo_url) await supabase.storage.from("product-photos").remove([p.photo_url]);
    toast.success("Produto excluído");
    qc.invalidateQueries({ queryKey: ["products"] });
  }

  return (
    <AppShell
      title="Produtos"
      action={
        <Button size="lg" onClick={() => setEditing("new")}>
          <Plus className="h-5 w-5" /> Novo
        </Button>
      }
    >
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Buscar por nome ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} className="h-12 pl-10 text-base" />
      </div>
      <div className="mt-4 space-y-2">
        {products.isLoading && <p className="py-8 text-center text-muted-foreground">Carregando...</p>}
        {products.data?.length === 0 && (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">Nenhum produto. Toque em “Novo”.</div>
        )}
        {list.map((p) => {
          const profit = Number(p.sale_price) - Number(p.cost_price);
          return (
            <div key={p.id} className={`rounded-xl border bg-card p-3 ${p.active ? "" : "opacity-60"}`}>
              <div className="flex gap-3">
                <ProductPhoto path={p.photo_url} className="h-16 w-16" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.category || "Sem categoria"} · {p.unit}</p>
                  <p className="mt-1 text-sm">
                    Custo {brl(Number(p.cost_price))} · Venda <b>{brl(Number(p.sale_price))}</b>
                  </p>
                  <p className="text-xs text-success">
                    Lucro {brl(profit)}/{p.unit} · Margem {pct(marginPct(Number(p.cost_price), Number(p.sale_price)))}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-2 border-t pt-2">
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={p.active} onCheckedChange={() => toggle(p)} /> {p.active ? "Ativo" : "Inativo"}
                </label>
                <Button variant="outline" size="sm" className="ml-auto h-10" onClick={() => setEditing(p)}>
                  <Pencil /> Editar
                </Button>
                <Button variant="ghost" size="sm" className="h-10 text-destructive" onClick={() => remove(p)} aria-label="Excluir">
                  <Trash2 />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {editing && <ProductForm product={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </AppShell>
  );
}

function ProductForm({ product, onClose }: { product: Product | null; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(product?.name ?? "");
  const [category, setCategory] = useState(product?.category ?? "");
  const [unit, setUnit] = useState<string>(product?.unit ?? "kg");
  const [cost, setCost] = useState(String(product?.cost_price ?? ""));
  const [sale, setSale] = useState(String(product?.sale_price ?? ""));
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);

  const c = Number(cost.replace(",", ".")) || 0;
  const s = Number(sale.replace(",", ".")) || 0;

  async function onFile(f?: File) {
    if (!f) return;
    try {
      const blob = await resizeImage(f, 800);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
    } catch {
      toast.error("Não foi possível ler a imagem");
    }
  }

  async function save() {
    if (!name.trim()) return toast.error("Informe o nome");
    setBusy(true);
    try {
      let photo_url = product?.photo_url ?? null;
      if (photo) {
        const path = `${crypto.randomUUID()}.jpg`;
        const { error } = await supabase.storage.from("product-photos").upload(path, photo, { contentType: "image/jpeg" });
        if (error) throw error;
        if (product?.photo_url) await supabase.storage.from("product-photos").remove([product.photo_url]);
        photo_url = path;
      }
      const row = { name: name.trim(), category: category.trim(), unit, cost_price: c, sale_price: s, photo_url };
      const { error } = product
        ? await supabase.from("products").update(row).eq("id", product.id)
        : await supabase.from("products").insert(row);
      if (error) throw error;
      toast.success("Produto salvo");
      qc.invalidateQueries({ queryKey: ["products"] });
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {preview ? (
              <img src={preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
            ) : (
              <ProductPhoto path={product?.photo_url} className="h-20 w-20" />
            )}
            <div className="grid flex-1 gap-2">
              <Button type="button" variant="outline" className="h-11" onClick={() => camRef.current?.click()}>
                <Camera /> Câmera
              </Button>
              <Button type="button" variant="outline" className="h-11" onClick={() => galRef.current?.click()}>
                <ImageIcon /> Galeria
              </Button>
            </div>
            <input ref={camRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            <input ref={galRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pn">Nome</Label>
            <Input id="pn" value={name} onChange={(e) => setName(e.target.value)} className="h-12 text-base" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="pc">Categoria</Label>
              <Input id="pc" value={category} onChange={(e) => setCategory(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pu">Unidade</Label>
              <select id="pu" value={unit} onChange={(e) => setUnit(e.target.value)} className="h-12 w-full rounded-md border border-input bg-card px-3 text-base">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pcost">Preço de custo (R$)</Label>
              <Input id="pcost" inputMode="decimal" value={cost} onChange={(e) => setCost(e.target.value)} className="h-12 text-base" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="psale">Preço de venda (R$)</Label>
              <Input id="psale" inputMode="decimal" value={sale} onChange={(e) => setSale(e.target.value)} className="h-12 text-base" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-3 text-sm">
            <p>Lucro/un: <b>{brl(s - c)}</b></p>
            <p>Margem: <b>{pct(marginPct(c, s))}</b></p>
          </div>
          <Button className="h-12 w-full text-base" disabled={busy} onClick={save}>
            {busy ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
