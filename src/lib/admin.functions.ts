import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Creds = { email: string; password: string };
function validate(d: Creds): Creds {
  const email = String(d?.email ?? "").trim().toLowerCase();
  const password = String(d?.password ?? "");
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error("E-mail inválido");
  if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres");
  return { email, password };
}

async function createAdminUser(email: string, password: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw new Error(error?.message ?? "Não foi possível criar o usuário");
  const { error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .insert({ user_id: data.user.id, role: "admin" });
  if (roleErr) throw new Error(roleErr.message);
}

/** Public: only works while no admin exists (first user becomes admin). */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    if ((count ?? 0) > 0) throw new Error("Já existe um administrador. Peça acesso a ele.");
    await createAdminUser(data.email, data.password);
    return { ok: true };
  });

/** Admin-only: create another admin. */
export const createAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(validate)
  .handler(async ({ data, context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin");
    if (!isAdmin) throw new Error("Acesso negado");
    await createAdminUser(data.email, data.password);
    return { ok: true };
  });
