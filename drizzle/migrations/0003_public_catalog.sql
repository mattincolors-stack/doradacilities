alter table public.products add column size_label text not null default '';
alter table public.orders add column origin text not null default 'admin' check (origin in ('admin','catalogo'));
alter table public.orders add column client_ref uuid unique;
alter table public.orders add column seen_at timestamptz;
alter table public.settings add column logo_path text;

create view public.catalog_products with (security_invoker = false) as
  select id, name, category, description, sale_price, unit, size_label, photo_url, created_at
  from public.products where active = true;
grant select on public.catalog_products to anon, authenticated;

create view public.catalog_settings with (security_invoker = false) as
  select company_name, whatsapp_number, logo_path from public.settings where id = 1;
grant select on public.catalog_settings to anon, authenticated;

create or replace function public.create_public_order(_customer_name text, _customer_phone text, _notes text, _items jsonb, _client_ref uuid, _hp text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  _o public.orders; _name text := trim(coalesce(_customer_name,'')); _phone text := trim(coalesce(_customer_phone,''));
  _n text := trim(coalesce(_notes,'')); _it record; _p public.products; _count int;
begin
  if coalesce(_hp,'') <> '' then raise exception 'Não foi possível enviar o pedido'; end if;
  if _client_ref is not null then
    select * into _o from public.orders where client_ref = _client_ref;
    if _o.id is not null then return jsonb_build_object('id',_o.id,'number',_o.number,'total',_o.total); end if;
  end if;
  if length(_name) < 1 or length(_name) > 80 then raise exception 'Informe seu nome (até 80 caracteres)'; end if;
  if length(_phone) > 20 then raise exception 'Telefone muito longo (até 20 caracteres)'; end if;
  if length(_n) > 300 then raise exception 'Observações muito longas (até 300 caracteres)'; end if;
  if _items is null or jsonb_typeof(_items) <> 'array' then raise exception 'Adicione ao menos um item'; end if;
  _count := jsonb_array_length(_items);
  if _count < 1 or _count > 40 then raise exception 'O pedido deve ter de 1 a 40 itens'; end if;
  if exists (select 1 from jsonb_array_elements(_items) e
    where coalesce(e->>'quantity','') !~ '^[0-9]+$' or (e->>'quantity')::int not between 1 and 99
       or coalesce(e->>'product_id','') !~* '^[0-9a-f-]{36}$') then
    raise exception 'Quantidade inválida: use de 1 a 99 unidades por item';
  end if;
  insert into public.orders (customer_name, customer_phone, notes, status, origin, whatsapp_status, client_ref, seen_at)
  values (_name, _phone, _n, 'aberto', 'catalogo', 'pendente', _client_ref, null) returning * into _o;
  for _it in select (e->>'product_id')::uuid pid, sum((e->>'quantity')::int) q from jsonb_array_elements(_items) e group by 1 loop
    select * into _p from public.products where id = _it.pid and active = true;
    if _p.id is null then
      raise exception 'Produto indisponível: %', coalesce((select name from public.products where id = _it.pid), _it.pid::text);
    end if;
    if _it.q > 99 then raise exception 'Quantidade inválida: use de 1 a 99 unidades por item'; end if;
    insert into public.order_items (order_id, product_id, product_name, unit, photo_url, quantity, unit_cost, unit_price, subtotal, subtotal_cost)
    values (_o.id, _p.id, _p.name, _p.unit, _p.photo_url, _it.q, _p.cost_price, _p.sale_price, round(_it.q * _p.sale_price, 2), round(_it.q * _p.cost_price, 2));
  end loop;
  update public.orders o set total = s.t, total_cost = s.c, profit = s.t - s.c
  from (select coalesce(sum(subtotal),0) t, coalesce(sum(subtotal_cost),0) c from public.order_items where order_id = _o.id) s
  where o.id = _o.id returning o.* into _o;
  return jsonb_build_object('id',_o.id,'number',_o.number,'total',_o.total);
exception when unique_violation then
  select * into _o from public.orders where client_ref = _client_ref;
  if _o.id is null then raise; end if;
  return jsonb_build_object('id',_o.id,'number',_o.number,'total',_o.total);
end $$;
revoke all on function public.create_public_order(text,text,text,jsonb,uuid,text) from public;
grant execute on function public.create_public_order(text,text,text,jsonb,uuid,text) to anon, authenticated;

create policy "read brand" on storage.objects for select using (bucket_id = 'brand');
create policy "admin upload brand" on storage.objects for insert to authenticated with check (bucket_id = 'brand' and public.is_admin());
create policy "admin update brand" on storage.objects for update to authenticated using (bucket_id = 'brand' and public.is_admin());
create policy "admin delete brand" on storage.objects for delete to authenticated using (bucket_id = 'brand' and public.is_admin());