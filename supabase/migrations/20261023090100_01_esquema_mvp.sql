-- 01 · Esquema canónico del MVP (docs/MODELO.md).
-- Sin FKs recíprocas, una sola dirección por relación, dinero NUMERIC(12,2).

drop view if exists public.vista_catalogo cascade;
drop sequence if exists public.remito_numero_seq cascade;
drop table if exists
  public.detalle_carrito,
  public.alerta_de_estado,
  public.remitos_de_venta,
  public.estados_comprobante,
  public.comprobante,
  public.estados_pedidos,
  public.detalle_del_pedido,
  public.stock,
  public.pedido,
  public.cliente,
  public.producto
  cascade;

-- ── Cliente ────────────────────────────────────────────────────────────────────
create table public.cliente (
  id_cliente integer generated always as identity primary key,
  dni text not null,
  nombre text not null,
  email text not null,
  telefono text,
  creado_en timestamptz not null default now(),
  constraint cliente_dni_valido check (dni ~ '^[0-9]{7,8}$'),
  constraint cliente_email_valido check (email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint cliente_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

create unique index cliente_email_uidx on public.cliente (lower(email));

-- ── Producto y stock ───────────────────────────────────────────────────────────
create table public.producto (
  id_producto integer generated always as identity primary key,
  nombre text not null,
  categoria text not null,
  tipo text not null,
  descripcion text not null default '',
  precio numeric(12,2) not null,
  tiempo_produccion integer not null default 0,
  activo boolean not null default true,
  imagen_url text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint producto_precio_no_negativo check (precio >= 0),
  constraint producto_tiempo_no_negativo check (tiempo_produccion >= 0),
  constraint producto_nombre_no_vacio check (length(btrim(nombre)) > 0)
);

-- Un solo producto activo con el mismo nombre: evita el duplicado 1 y 2 detectado.
create unique index producto_nombre_activo_uidx
  on public.producto (lower(nombre))
  where activo;

create table public.stock (
  id_stock integer generated always as identity primary key,
  id_producto integer not null unique
    references public.producto (id_producto) on delete restrict on update cascade,
  cantidad_actual integer not null default 0,
  cantidad_reservada integer not null default 0,
  -- `cantidad_warning = 0` significa "sin umbral configurado": ese producto nunca alerta.
  -- Lo aplica el trigger `stock_evalua_alerta`.
  cantidad_warning integer not null default 0,
  actualizado_en timestamptz not null default now(),
  constraint stock_actual_no_negativo check (cantidad_actual >= 0),
  constraint stock_reservada_no_negativa check (cantidad_reservada >= 0),
  constraint stock_warning_no_negativo check (cantidad_warning >= 0),
  constraint stock_reserva_valida check (cantidad_reservada <= cantidad_actual)
);

-- ── Pedido ─────────────────────────────────────────────────────────────────────
create table public.pedido (
  id_pedido integer generated always as identity primary key,
  id_cliente integer not null references public.cliente (id_cliente) on delete restrict,
  fecha date not null default current_date,
  total numeric(12,2) not null default 0,
  estado_actual text not null default 'Pendiente de Pago',
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint pedido_estado_valido check (
    estado_actual in ('Pendiente de Pago', 'Pago Validado', 'Rechazado', 'Cancelado')
  ),
  constraint pedido_total_no_negativo check (total >= 0)
);

create index pedido_cliente_fecha_idx on public.pedido (id_cliente, fecha desc);
create index pedido_estado_idx on public.pedido (estado_actual);

create table public.detalle_del_pedido (
  id_detalle_pedido integer generated always as identity primary key,
  id_pedido integer not null references public.pedido (id_pedido) on delete restrict,
  id_producto integer not null references public.producto (id_producto) on delete restrict,
  cantidad integer not null,
  precio_unitario numeric(12,2) not null,
  subtotal numeric(12,2)
    generated always as ((cantidad::numeric(12,2) * precio_unitario)::numeric(12,2)) stored,
  constraint detalle_cantidad_positiva check (cantidad > 0),
  constraint detalle_precio_no_negativo check (precio_unitario >= 0),
  constraint detalle_producto_unico_en_pedido unique (id_pedido, id_producto)
);

create index detalle_pedido_idx on public.detalle_del_pedido (id_pedido);
create index detalle_producto_idx on public.detalle_del_pedido (id_producto);

create table public.estados_pedidos (
  id_estado_pedido integer generated always as identity primary key,
  id_pedido integer not null references public.pedido (id_pedido) on delete restrict,
  estado text not null,
  fecha timestamptz not null default clock_timestamp(),
  constraint estados_pedidos_estado_valido check (
    estado in ('Pendiente de Pago', 'Pago Validado', 'Rechazado', 'Cancelado')
  )
);

create index estados_pedidos_pedido_fecha_idx on public.estados_pedidos (id_pedido, fecha);

-- ── Comprobante ────────────────────────────────────────────────────────────────
create table public.comprobante (
  id_comprobante integer generated always as identity primary key,
  id_pedido integer not null references public.pedido (id_pedido) on delete restrict,
  foto_url text not null,
  fecha date not null default current_date,
  monto numeric(12,2) not null,
  estado_actual text not null default 'Comprobante Subido',
  subido_en timestamptz not null default now(),
  constraint comprobante_estado_valido check (
    estado_actual in ('Comprobante Subido', 'Aprobado por Admin', 'Rechazado')
  ),
  -- `monto > 0` (y no `>= 0`): un comprobante por $0 no acredita nada. Un pedido de total 0
  -- solo es posible con productos de precio 0, caso que el MVP no contempla.
  constraint comprobante_monto_positivo check (monto > 0),
  constraint comprobante_foto_no_vacia check (length(btrim(foto_url)) > 0)
);

create index comprobante_pedido_idx on public.comprobante (id_pedido);

-- Un pedido puede reintentar el comprobante, pero no tener dos pendientes a la vez.
create unique index comprobante_pendiente_uidx
  on public.comprobante (id_pedido)
  where estado_actual = 'Comprobante Subido';

create table public.estados_comprobante (
  id_estado_comprobante integer generated always as identity primary key,
  id_comprobante integer not null references public.comprobante (id_comprobante) on delete restrict,
  estado text not null,
  fecha timestamptz not null default clock_timestamp(),
  constraint estados_comprobante_estado_valido check (
    estado in ('Comprobante Subido', 'Aprobado por Admin', 'Rechazado')
  )
);

create index estados_comprobante_comprobante_fecha_idx
  on public.estados_comprobante (id_comprobante, fecha);

-- ── Remito ─────────────────────────────────────────────────────────────────────
create sequence public.remito_numero_seq start with 1;

create table public.remitos_de_venta (
  id_remito integer generated always as identity primary key,
  id_comprobante integer not null unique
    references public.comprobante (id_comprobante) on delete restrict,
  id_cliente integer not null references public.cliente (id_cliente) on delete restrict,
  fecha date not null default current_date,
  total numeric(12,2) not null,
  numero text not null unique default (
    'R-' || to_char(current_date, 'YYYY') || '-' ||
    lpad(nextval('public.remito_numero_seq')::text, 6, '0')
  ),
  constraint remito_total_no_negativo check (total >= 0)
);

create index remitos_cliente_fecha_idx on public.remitos_de_venta (id_cliente, fecha desc);

-- ── Alerta de stock ────────────────────────────────────────────────────────────
create table public.alerta_de_estado (
  id_alerta integer generated always as identity primary key,
  id_stock integer not null references public.stock (id_stock) on delete restrict,
  fecha timestamptz not null default clock_timestamp(),
  mensaje text not null,
  atendida boolean not null default false,
  constraint alerta_mensaje_no_vacio check (length(btrim(mensaje)) > 0)
);

create index alerta_stock_atendida_idx on public.alerta_de_estado (id_stock, atendida);

-- Una sola alerta abierta por stock: el panel no se llena de duplicados.
create unique index alerta_abierta_uidx
  on public.alerta_de_estado (id_stock)
  where not atendida;

-- ── Vista de catálogo ──────────────────────────────────────────────────────────
-- `security_invoker`: la vista respeta la RLS de quien consulta.
create view public.vista_catalogo
with (security_invoker = true) as
select
  p.id_producto,
  p.nombre,
  p.categoria,
  p.tipo,
  p.descripcion,
  p.precio,
  p.tiempo_produccion,
  p.imagen_url,
  coalesce(s.cantidad_actual, 0) as cantidad_actual,
  coalesce(s.cantidad_reservada, 0) as cantidad_reservada,
  greatest(coalesce(s.cantidad_actual, 0) - coalesce(s.cantidad_reservada, 0), 0) as disponible,
  coalesce(s.cantidad_warning, 0) as cantidad_warning
from public.producto p
left join public.stock s on s.id_producto = p.id_producto
where p.activo;
