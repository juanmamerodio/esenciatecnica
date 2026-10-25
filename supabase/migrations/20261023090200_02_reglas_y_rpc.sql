-- 02 · Reglas de negocio en la base: triggers e interfaz pública (RPC).
-- La base es la que garantiza los invariantes; el cliente no es confiable.

-- ── Marcas de tiempo ───────────────────────────────────────────────────────────
create or replace function public.marcar_actualizacion()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en := clock_timestamp();
  return new;
end
$$;

create trigger producto_marca_actualizacion
  before update on public.producto
  for each row execute function public.marcar_actualizacion();

create trigger stock_marca_actualizacion
  before update on public.stock
  for each row execute function public.marcar_actualizacion();

create trigger pedido_marca_actualizacion
  before update on public.pedido
  for each row execute function public.marcar_actualizacion();

-- ── Todo producto nace con su fila de stock ────────────────────────────────────
create or replace function public.crear_stock_del_producto()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.stock (id_producto) values (new.id_producto)
  on conflict (id_producto) do nothing;
  return null;
end
$$;

create trigger producto_crea_stock
  after insert on public.producto
  for each row execute function public.crear_stock_del_producto();

-- ── El total del pedido se deriva de sus detalles ──────────────────────────────
create or replace function public.recalcular_total_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido integer;
begin
  v_pedido := case when tg_op = 'DELETE' then old.id_pedido else new.id_pedido end;

  update public.pedido p
     set total = coalesce(
       (select sum(d.subtotal) from public.detalle_del_pedido d where d.id_pedido = v_pedido),
       0
     )
   where p.id_pedido = v_pedido;

  if tg_op = 'UPDATE' and new.id_pedido is distinct from old.id_pedido then
    update public.pedido p
       set total = coalesce(
         (select sum(d.subtotal) from public.detalle_del_pedido d where d.id_pedido = old.id_pedido),
         0
       )
     where p.id_pedido = old.id_pedido;
  end if;

  return null;
end
$$;

create trigger detalle_recalcula_total
  after insert or update or delete on public.detalle_del_pedido
  for each row execute function public.recalcular_total_pedido();

-- ── Historial: estado actual y auditoría siempre juntos ────────────────────────
create or replace function public.registrar_estado_inicial_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.estados_pedidos (id_pedido, estado)
  values (new.id_pedido, new.estado_actual);
  return null;
end
$$;

create or replace function public.registrar_cambio_estado_pedido()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado_actual is distinct from old.estado_actual then
    insert into public.estados_pedidos (id_pedido, estado)
    values (new.id_pedido, new.estado_actual);
  end if;
  return null;
end
$$;

create trigger pedido_registra_estado_inicial
  after insert on public.pedido
  for each row execute function public.registrar_estado_inicial_pedido();

create trigger pedido_registra_cambio_estado
  after update of estado_actual on public.pedido
  for each row execute function public.registrar_cambio_estado_pedido();

create or replace function public.registrar_estado_inicial_comprobante()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.estados_comprobante (id_comprobante, estado)
  values (new.id_comprobante, new.estado_actual);
  return null;
end
$$;

create or replace function public.registrar_cambio_estado_comprobante()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.estado_actual is distinct from old.estado_actual then
    insert into public.estados_comprobante (id_comprobante, estado)
    values (new.id_comprobante, new.estado_actual);
  end if;
  return null;
end
$$;

create trigger comprobante_registra_estado_inicial
  after insert on public.comprobante
  for each row execute function public.registrar_estado_inicial_comprobante();

create trigger comprobante_registra_cambio_estado
  after update of estado_actual on public.comprobante
  for each row execute function public.registrar_cambio_estado_comprobante();

-- ── Un comprobante solo existe para un pedido pendiente de pago ────────────────
create or replace function public.validar_pedido_del_comprobante()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_estado text;
begin
  select p.estado_actual into v_estado
    from public.pedido p
   where p.id_pedido = new.id_pedido
     for update;

  if v_estado is null then
    raise exception 'pedido inexistente' using errcode = 'ET006';
  end if;

  if v_estado <> 'Pendiente de Pago' then
    raise exception 'el pedido no está pendiente de pago' using errcode = 'ET006';
  end if;

  return new;
end
$$;

create trigger comprobante_valida_pedido
  before insert on public.comprobante
  for each row execute function public.validar_pedido_del_comprobante();

-- ── Alerta cuando el disponible toca el umbral ─────────────────────────────────
create or replace function public.evaluar_alerta_stock()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_disponible integer;
begin
  -- `cantidad_warning = 0` significa "sin umbral configurado".
  if new.cantidad_warning <= 0 then
    return null;
  end if;

  v_disponible := new.cantidad_actual - new.cantidad_reservada;

  if v_disponible <= new.cantidad_warning then
    insert into public.alerta_de_estado (id_stock, mensaje)
    values (
      new.id_stock,
      format(
        'Stock bajo: quedan %s unidades disponibles (umbral %s).',
        v_disponible,
        new.cantidad_warning
      )
    )
    on conflict (id_stock) where not atendida do nothing;
  end if;

  return null;
end
$$;

create trigger stock_evalua_alerta
  after insert or update of cantidad_actual, cantidad_reservada, cantidad_warning
  on public.stock
  for each row execute function public.evaluar_alerta_stock();

-- ── RPC pública: confirmar pedido y reservar stock ─────────────────────────────
create or replace function public.crear_pedido(p_id_cliente integer, p_items jsonb)
returns public.pedido
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido public.pedido;
  v_item record;
  v_precio numeric(12,2);
  v_nombre text;
  v_activo boolean;
  v_disponible integer;
  v_total_items integer;
  v_items_distintos integer;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'el pedido no tiene items' using errcode = 'ET003';
  end if;

  if not exists (select 1 from public.cliente c where c.id_cliente = p_id_cliente) then
    raise exception 'cliente inexistente' using errcode = 'ET002';
  end if;

  select count(*), count(distinct (item ->> 'id_producto'))
    into v_total_items, v_items_distintos
    from jsonb_array_elements(p_items) as item;

  if v_total_items <> v_items_distintos then
    raise exception 'producto repetido en el pedido' using errcode = 'ET003';
  end if;

  insert into public.pedido (id_cliente, estado_actual)
  values (p_id_cliente, 'Pendiente de Pago')
  returning * into v_pedido;

  -- Se recorren ordenados por id_producto para tomar los locks siempre en el mismo orden.
  for v_item in
    select
      (item ->> 'id_producto')::integer as id_producto,
      (item ->> 'cantidad')::integer as cantidad
    from jsonb_array_elements(p_items) as item
    order by 1
  loop
    if v_item.id_producto is null or v_item.cantidad is null or v_item.cantidad <= 0 then
      raise exception 'cantidad inválida' using errcode = 'ET003';
    end if;

    select p.precio, p.nombre, p.activo
      into v_precio, v_nombre, v_activo
      from public.producto p
     where p.id_producto = v_item.id_producto;

    if not found or not v_activo then
      raise exception 'producto % no está disponible', v_item.id_producto using errcode = 'ET002';
    end if;

    select s.cantidad_actual - s.cantidad_reservada
      into v_disponible
      from public.stock s
     where s.id_producto = v_item.id_producto
       for update;

    if coalesce(v_disponible, 0) < v_item.cantidad then
      raise exception 'stock insuficiente para %', v_nombre using errcode = 'ET001';
    end if;

    insert into public.detalle_del_pedido (id_pedido, id_producto, cantidad, precio_unitario)
    values (v_pedido.id_pedido, v_item.id_producto, v_item.cantidad, v_precio);

    update public.stock
       set cantidad_reservada = cantidad_reservada + v_item.cantidad
     where id_producto = v_item.id_producto;
  end loop;

  select * into v_pedido from public.pedido where id_pedido = v_pedido.id_pedido;
  return v_pedido;
end
$$;

-- ── RPC admin: aprobar comprobante → venta + remito ────────────────────────────
create or replace function public.aprobar_comprobante(p_id_comprobante integer)
returns public.remitos_de_venta
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comprobante public.comprobante;
  v_pedido public.pedido;
  v_remito public.remitos_de_venta;
  v_detalle record;
begin
  select * into v_comprobante
    from public.comprobante
   where id_comprobante = p_id_comprobante
     for update;

  if not found then
    raise exception 'comprobante inexistente' using errcode = 'ET004';
  end if;

  select * into v_pedido
    from public.pedido
   where id_pedido = v_comprobante.id_pedido
     for update;

  if v_comprobante.estado_actual <> 'Comprobante Subido' then
    raise exception 'el comprobante no está pendiente' using errcode = 'ET004';
  end if;

  if v_pedido.estado_actual <> 'Pendiente de Pago' then
    raise exception 'el pedido no está pendiente de pago' using errcode = 'ET006';
  end if;

  if v_comprobante.monto <> v_pedido.total then
    raise exception 'el monto no coincide con el total del pedido' using errcode = 'ET005';
  end if;

  for v_detalle in
    select d.id_producto, d.cantidad
      from public.detalle_del_pedido d
     where d.id_pedido = v_pedido.id_pedido
     order by d.id_producto
  loop
    update public.stock s
       set cantidad_actual = s.cantidad_actual - v_detalle.cantidad,
           cantidad_reservada = s.cantidad_reservada - v_detalle.cantidad
     where s.id_producto = v_detalle.id_producto
       and s.cantidad_actual >= v_detalle.cantidad
       and s.cantidad_reservada >= v_detalle.cantidad;

    if not found then
      raise exception 'stock inconsistente para el producto %', v_detalle.id_producto
        using errcode = 'ET001';
    end if;
  end loop;

  update public.comprobante
     set estado_actual = 'Aprobado por Admin'
   where id_comprobante = v_comprobante.id_comprobante;

  update public.pedido
     set estado_actual = 'Pago Validado'
   where id_pedido = v_pedido.id_pedido;

  insert into public.remitos_de_venta (id_comprobante, id_cliente, total)
  values (v_comprobante.id_comprobante, v_pedido.id_cliente, v_pedido.total)
  returning * into v_remito;

  return v_remito;
end
$$;

-- ── RPC admin: rechazar comprobante → libera reserva ───────────────────────────
create or replace function public.rechazar_comprobante(p_id_comprobante integer)
returns public.pedido
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_comprobante public.comprobante;
  v_pedido public.pedido;
  v_detalle record;
begin
  select * into v_comprobante
    from public.comprobante
   where id_comprobante = p_id_comprobante
     for update;

  if not found then
    raise exception 'comprobante inexistente' using errcode = 'ET004';
  end if;

  select * into v_pedido
    from public.pedido
   where id_pedido = v_comprobante.id_pedido
     for update;

  if v_comprobante.estado_actual <> 'Comprobante Subido' then
    raise exception 'el comprobante no está pendiente' using errcode = 'ET004';
  end if;

  if v_pedido.estado_actual <> 'Pendiente de Pago' then
    raise exception 'el pedido no está pendiente de pago' using errcode = 'ET006';
  end if;

  for v_detalle in
    select d.id_producto, d.cantidad
      from public.detalle_del_pedido d
     where d.id_pedido = v_pedido.id_pedido
     order by d.id_producto
  loop
    update public.stock s
       set cantidad_reservada = s.cantidad_reservada - v_detalle.cantidad
     where s.id_producto = v_detalle.id_producto
       and s.cantidad_reservada >= v_detalle.cantidad;

    if not found then
      raise exception 'stock inconsistente para el producto %', v_detalle.id_producto
        using errcode = 'ET001';
    end if;
  end loop;

  update public.comprobante
     set estado_actual = 'Rechazado'
   where id_comprobante = v_comprobante.id_comprobante;

  update public.pedido
     set estado_actual = 'Rechazado'
   where id_pedido = v_pedido.id_pedido;

  select * into v_pedido from public.pedido where id_pedido = v_pedido.id_pedido;
  return v_pedido;
end
$$;

-- ── RPC cron: pedidos vencidos del viernes ─────────────────────────────────────
create or replace function public.cancelar_pedidos_vencidos()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pedido record;
  v_detalle record;
  v_cancelados integer := 0;
begin
  for v_pedido in
    select p.id_pedido
      from public.pedido p
     where p.estado_actual = 'Pendiente de Pago'
     order by p.id_pedido
       for update
  loop
    for v_detalle in
      select d.id_producto, d.cantidad
        from public.detalle_del_pedido d
       where d.id_pedido = v_pedido.id_pedido
       order by d.id_producto
    loop
      update public.stock s
         set cantidad_reservada = greatest(s.cantidad_reservada - v_detalle.cantidad, 0)
       where s.id_producto = v_detalle.id_producto;
    end loop;

    update public.comprobante c
       set estado_actual = 'Rechazado'
     where c.id_pedido = v_pedido.id_pedido
       and c.estado_actual = 'Comprobante Subido';

    update public.pedido p
       set estado_actual = 'Cancelado'
     where p.id_pedido = v_pedido.id_pedido;

    v_cancelados := v_cancelados + 1;
  end loop;

  return v_cancelados;
end
$$;
