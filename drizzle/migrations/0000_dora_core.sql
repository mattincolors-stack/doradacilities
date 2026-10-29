create type public.app_role as enum ('admin');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.has_role(auth.uid(), 'admin')
$$;

create or replace function public.admin_exists()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where role = 'admin')
$$;
grant execute on function public.admin_exists() to anon, authenticated;

create policy "own role read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.is_admin());

-- settings (single row)
create table public.settings (
  id int primary key default 1 check (id = 1),
  company_name text not null default 'Dora Facilities',
  whatsapp_number text not null default '5516995757737',
  txt_width int not null default 32 check (txt_width in (32, 48)),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "admin all settings" on public.settings for all to authenticated using (public.is_admin()) with check (public.is_admin());
insert into public.settings (id) values (1);

-- products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default '',
  unit text not null default 'un' check (unit in ('kg','un','maço','caixa')),
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  photo_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "admin all products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity,
  customer_name text not null,
  customer_phone text not null default '',
  notes text not null default '',
  status text not null default 'finalizado' check (status in ('aberto','finalizado','cancelado')),
  total numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0,
  whatsapp_status text not null default 'pendente' check (whatsapp_status in ('pendente','enviado','falhou')),
  whatsapp_error text,
  whatsapp_sent_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  finalized_at timestamptz
);
grant select, insert, update, delete on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "admin all orders" on public.orders for all to authenticated using (public.is_admin()) with check (public.is_admin());

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit text not null,
  photo_url text,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_cost numeric(12,2) not null,
  unit_price numeric(12,2) not null,
  subtotal numeric(12,2) not null,
  subtotal_cost numeric(12,2) not null
);
create index on public.order_items(order_id);
create index on public.orders(created_at);
grant select, insert, update, delete on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "admin all items" on public.order_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- create order atomically with price snapshot taken from products at sale time
create or replace function public.create_order(_customer_name text, _customer_phone text, _notes text, _items jsonb)
returns uuid language plpgsql security invoker set search_path = public as $$
declare
  _order_id uuid;
  _it jsonb;
  _p public.products;
  _q numeric;
begin
  if not public.is_admin() then raise exception 'Acesso negado'; end if;
  if coalesce(trim(_customer_name),'') = '' then raise exception 'Informe o cliente'; end if;
  if jsonb_array_length(coalesce(_items,'[]'::jsonb)) = 0 then raise exception 'Adicione ao menos um item'; end if;

  insert into public.orders (customer_name, customer_phone, notes, status, created_by, finalized_at)
  values (trim(_customer_name), coalesce(_customer_phone,''), coalesce(_notes,''), 'finalizado', auth.uid(), now())
  returning id into _order_id;

  for _it in select * from jsonb_array_elements(_items) loop
    select * into _p from public.products where id = (_it->>'product_id')::uuid;
    if _p.id is null then raise exception 'Produto não encontrado'; end if;
    _q := (_it->>'quantity')::numeric;
    if _q is null or _q <= 0 then raise exception 'Quantidade inválida'; end if;
    insert into public.order_items (order_id, product_id, product_name, unit, photo_url, quantity, unit_cost, unit_price, subtotal, subtotal_cost)
    values (_order_id, _p.id, _p.name, _p.unit, _p.photo_url, _q, _p.cost_price, _p.sale_price, round(_q * _p.sale_price, 2), round(_q * _p.cost_price, 2));
  end loop;

  update public.orders o set
    total = s.t, total_cost = s.c, profit = s.t - s.c
  from (select coalesce(sum(subtotal),0) t, coalesce(sum(subtotal_cost),0) c from public.order_items where order_id = _order_id) s
  where o.id = _order_id;

  return _order_id;
end $$;
grant execute on function public.create_order(text, text, text, jsonb) to authenticated;

-- storage policies for product photos
create policy "admin upload photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-photos' and public.is_admin());
create policy "admin update photos" on storage.objects for update to authenticated using (bucket_id = 'product-photos' and public.is_admin());
create policy "admin delete photos" on storage.objects for delete to authenticated using (bucket_id = 'product-photos' and public.is_admin());
create policy "read photos" on storage.objects for select using (bucket_id = 'product-photos');