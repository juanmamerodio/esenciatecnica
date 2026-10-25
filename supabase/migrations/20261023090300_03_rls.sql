-- 03 · RLS y permisos. La anon key es pública: debe poder leer el catálogo y nada más.
-- Defensa en profundidad: RLS + GRANT/REVOKE.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role noinherit bypassrls;
  end if;
end
$$;

-- ── RLS activa en todas las tablas del dominio ─────────────────────────────────
alter table public.cliente enable row level security;
alter table public.producto enable row level security;
alter table public.stock enable row level security;
alter table public.pedido enable row level security;
alter table public.detalle_del_pedido enable row level security;
alter table public.estados_pedidos enable row level security;
alter table public.comprobante enable row level security;
alter table public.estados_comprobante enable row level security;
alter table public.remitos_de_venta enable row level security;
alter table public.alerta_de_estado enable row level security;

-- Tablas de fase 2: si existen, quedan cerradas (la anon key no las toca).
do $$
declare
  v_tabla text;
begin
  foreach v_tabla in array array['admin', 'roll', 'detalle_carrito'] loop
    if to_regclass('public.' || v_tabla) is not null then
      execute format('alter table public.%I enable row level security', v_tabla);
    end if;
  end loop;
end
$$;

-- ── Permisos base ──────────────────────────────────────────────────────────────
revoke all on schema public from anon, authenticated;
grant usage on schema public to anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

grant select on public.producto to anon, authenticated;
grant select on public.stock to anon, authenticated;
grant select on public.vista_catalogo to anon, authenticated;

-- ── Respaldo legacy: se conserva para rollback, pero cerrado ───────────────────
-- Contiene datos personales y `admin.contrasenia` en texto plano. Se decide conservarlo
-- (sirve para volver atrás), con RLS activa y sin grants. La contraseña se considera
-- comprometida y debe rotarse.
do $$
begin
  if to_regclass('respaldo_legacy.producto') is not null then
    execute 'revoke all on schema "respaldo_legacy" from public, anon, authenticated';
    execute 'revoke all on all tables in schema "respaldo_legacy" from anon, authenticated';

    execute $sql$
      do $interno$
      declare
        v_tabla text;
      begin
        for v_tabla in
          select c.relname
            from pg_class c
            join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'respaldo_legacy' and c.relkind = 'r'
        loop
          execute format('alter table "respaldo_legacy".%I enable row level security', v_tabla);
        end loop;
      end
      $interno$;
    $sql$;
  end if;
end
$$;

-- ── Políticas de lectura pública ───────────────────────────────────────────────
create policy producto_lectura_publica
  on public.producto
  for select
  to anon, authenticated
  using (activo);

create policy stock_lectura_publica
  on public.stock
  for select
  to anon, authenticated
  using (
    exists (
      select 1
        from public.producto p
       where p.id_producto = stock.id_producto
         and p.activo
    )
  );

-- El resto de las tablas no tiene políticas: solo service_role (que salta RLS) accede.

-- ── La interfaz pública del dominio es solo para el servidor ───────────────────
-- OJO: revocar solo de `public` NO alcanza. Supabase concede EXECUTE directo a `anon` y
-- `authenticated` vía ALTER DEFAULT PRIVILEGES, y ese grant sobrevive al revoke de PUBLIC.
-- Comprobado con un test que simula los privilegios por defecto de Supabase.
revoke all on function public.crear_pedido(integer, jsonb) from public, anon, authenticated;
revoke all on function public.aprobar_comprobante(integer) from public, anon, authenticated;
revoke all on function public.rechazar_comprobante(integer) from public, anon, authenticated;
revoke all on function public.cancelar_pedidos_vencidos() from public, anon, authenticated;

grant execute on function public.crear_pedido(integer, jsonb) to service_role;
grant execute on function public.aprobar_comprobante(integer) to service_role;
grant execute on function public.rechazar_comprobante(integer) to service_role;
grant execute on function public.cancelar_pedidos_vencidos() to service_role;

-- Las funciones de trigger no se invocan a mano.
do $$
declare
  v_funcion regprocedure;
begin
  for v_funcion in
    select p.oid::regprocedure
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'marcar_actualizacion',
         'crear_stock_del_producto',
         'recalcular_total_pedido',
         'registrar_estado_inicial_pedido',
         'registrar_cambio_estado_pedido',
         'registrar_estado_inicial_comprobante',
         'registrar_cambio_estado_comprobante',
         'validar_pedido_del_comprobante',
         'evaluar_alerta_stock'
       )
  loop
    execute format('revoke all on function %s from public, anon, authenticated', v_funcion);
  end loop;
end
$$;
