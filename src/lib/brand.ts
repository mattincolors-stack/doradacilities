/** Pasta "brand" é privada (o espaço de trabalho bloqueia pastas públicas); a leitura é liberada a todos por política e servida por link assinado. */
export type Signer = (path: string) => Promise<string | null>;
export async function logoUrl(path: string | null | undefined, sign: Signer): Promise<string | null> {
  const p = (path ?? "").trim();
  return p ? sign(p) : null;
}
export async function fetchLogoUrl(): Promise<string | null> {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data } = await supabase.from("catalog_settings").select("logo_path").maybeSingle();
  return logoUrl(data?.logo_path, async p => (await supabase.storage.from("brand").createSignedUrl(p, 60 * 60 * 24 * 7)).data?.signedUrl ?? null);
}
