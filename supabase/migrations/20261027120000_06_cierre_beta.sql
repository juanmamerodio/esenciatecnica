-- 06 · Cierre beta (issue #17). Solo agrega: no reescribe la semántica de 01–05.
--
-- Dos huecos medidos contra el contrato:
-- 1. `producto.precio >= 0` admitía un producto de precio 0, y un pedido de total 0 nunca se
--    puede aprobar porque `comprobante.monto > 0`. Se reemplaza por `precio > 0`.
-- 2. Dejar `cantidad_actual < cantidad_reservada` devolvía el `23514` crudo de la constraint.
--    El trigger lo rechaza con `ET007` y el mensaje del dominio, para que el panel no muestre
--    el texto de PostgreSQL (spec `bd-mvp` §3.5 y HU-6).

-- ── precio > 0 ────────────────────────────────────────────────────────────────
-- Si la base viva tuviera productos de precio 0, esta migración falla a propósito: hay que
-- decidir el dato antes de endurecer la regla (no se corrige un precio en silencio).
alter table public.producto
  drop constraint if exists producto_precio_no_negativo;

alter table public.producto
  drop constraint if exists producto_precio_positivo;

alter table public.producto
  add constraint producto_precio_positivo check (precio > 0);

-- ── ET007 · no dejar la cantidad por debajo de la reserva ─────────────────────
create or replace function public.validar_reserva_de_stock()
returns trigger
language plpgsql
as $$
begin
  if new.cantidad_actual < new.cantidad_reservada then
    raise exception
      'No podés dejar la cantidad por debajo de lo reservado: hay pedidos pendientes que ya tomaron % unidades.',
      new.cantidad_reservada
      using errcode = 'ET007';
  end if;
  return new;
end
$$;

-- `BEFORE` corre antes de las constraints: el error llega con ET007 y no con el 23514.
-- `drop trigger if exists` deja la migración re-ejecutable en la ventana del SQL Editor.
drop trigger if exists stock_valida_reserva on public.stock;

create trigger stock_valida_reserva
  before insert or update on public.stock
  for each row execute function public.validar_reserva_de_stock();

-- Las funciones de trigger no se invocan a mano (mismo criterio que la migración 03).
revoke all on function public.validar_reserva_de_stock() from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.validar_reserva_de_stock() from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on function public.validar_reserva_de_stock() from authenticated';
  end if;
end
$$;
