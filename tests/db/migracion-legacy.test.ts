import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { aplicarMigraciones, comoAnon, simularPrivilegiosSupabase, type Base } from './ayudantes';

/**
 * Riesgo principal de esta auditoría: la migración reconstruye tablas que ya existen.
 * Este test simula el esquema legacy real (FKs recíprocas, sin PK, estados cruzados)
 * con datos de prueba, aplica las migraciones y verifica que no se pierda el respaldo.
 */
const ESQUEMA_LEGACY = `
create table producto (
  id_producto serial primary key,
  id_stock integer,
  id_detalle_pedido integer,
  nombre text,
  categoria text,
  tipo text,
  descripcion text,
  precio numeric,
  tiempo_produccion integer
);

create table stock (
  id_stock serial primary key,
  id_producto integer,
  categoria text,
  tipo text,
  descripcion text,
  cantidad_actual integer,
  cantidad_warning integer,
  porcentaje integer,
  cantidad_reservada integer
);

create table detalle_carrito (
  id_detalle_carrito serial primary key,
  id_carrito integer,
  id_producto integer,
  cantidad integer
);

create table cliente (
  id_cliente serial primary key,
  id_carrito integer,
  dni text,
  nombre text,
  email text,
  telefono text
);

create table pedido (
  id_pedido serial primary key,
  id_cliente integer,
  id_estado integer,
  fecha date,
  total numeric
);

create table detalle_del_pedido (
  id_pedido integer,
  id_cliente integer,
  id_producto integer,
  estado text,
  fecha date,
  total numeric,
  cantidad integer,
  precio_unitario numeric
);

create table estados_pedidos (
  id_estado serial primary key,
  id_pedido integer,
  estado text,
  fecha date
);

create table comprobante (
  id_comprobante serial primary key,
  id_pedido integer,
  foto_comprobante text,
  fecha date,
  total numeric
);

create table estados_comprobante (
  id_estado serial primary key,
  id_pedido integer,
  estado text,
  fecha date
);

create table remitos_de_venta (
  id_remito serial primary key,
  id_comprobante integer,
  id_cliente integer,
  fecha date,
  total numeric,
  producto_selec text
);

create table alerta_de_estado (
  id_alerta serial primary key,
  id_stock integer,
  fecha date,
  mes text,
  ano text,
  porcentaje integer,
  descripcion text,
  email_contacto text
);

create table admin (
  id_admin serial primary key,
  dni text,
  nombre text,
  contrasenia text
);

create table roll (
  id_rol serial primary key,
  descripcion_rol text
);

-- FKs recíprocas y circulares del esquema viejo.
alter table producto add constraint fk_producto_stock foreign key (id_stock) references stock (id_stock);
alter table stock add constraint fk_stock_producto foreign key (id_producto) references producto (id_producto);
alter table cliente add constraint fk_cliente_carrito foreign key (id_carrito) references detalle_carrito (id_detalle_carrito);
alter table pedido add constraint fk_pedido_estado foreign key (id_estado) references estados_pedidos (id_estado);
alter table detalle_del_pedido add constraint fk_detalle_pedido foreign key (id_pedido) references pedido (id_pedido);
alter table comprobante add constraint fk_comprobante_pedido foreign key (id_pedido) references pedido (id_pedido);
alter table estados_comprobante add constraint fk_estado_comprobante_pedido foreign key (id_pedido) references pedido (id_pedido);
alter table remitos_de_venta add constraint fk_remito_comprobante foreign key (id_comprobante) references comprobante (id_comprobante);
alter table alerta_de_estado add constraint fk_alerta_stock foreign key (id_stock) references stock (id_stock);

insert into producto (id_producto, nombre, categoria, tipo, descripcion, precio, tiempo_produccion)
values
  (1, 'Crema Hidratante Facial', 'Cosmética', 'Emulsión', 'Base de aloe vera', 2500, 3),
  (2, 'Crema Hidratante Facial', 'Cosmética', 'Emulsión', 'Base de aloe vera', 2500, 3),
  (3, 'Jabón Líquido Neutro', 'Higiene', 'Líquido', 'Fórmula suave', 1800, 2);

insert into stock (id_stock, id_producto, cantidad_actual, cantidad_warning, porcentaje, cantidad_reservada)
values
  (1, 1, 48, 10, 100, 5),
  (2, 2, 50, 10, 100, 3),
  (3, 3, 6, 10, 40, 0);

update producto set id_stock = id_producto;

insert into cliente (id_cliente, dni, nombre, email, telefono)
values (1, '30111222', 'María Gomez', 'maria@ejemplo.com', '3491000000');

insert into estados_pedidos (id_estado, id_pedido, estado, fecha)
values
  (1, 1, 'Pago Validado', '2026-10-22'),
  (7, 3, 'Pendiente de Pago', '2026-10-22'),
  (8, 4, 'Pago Validado', '2026-10-22'),
  (10, 6, 'Pago Validado', '2026-10-22');

insert into pedido (id_pedido, id_cliente, id_estado, fecha, total)
values
  (1, 1, null, '2026-10-21', 5000),
  (3, 1, 1, '2026-10-22', 7500),
  (4, 1, 1, '2026-10-22', 5000),
  (6, 1, 1, '2026-10-22', 3600);

insert into detalle_del_pedido (id_pedido, id_cliente, id_producto, estado, fecha, total, cantidad, precio_unitario)
values
  (3, 1, 2, 'Pendiente', '2026-10-22', 7500, 3, 2500),
  (4, 1, 1, 'Pendiente', '2026-10-22', 5000, 2, 2500),
  (6, 1, 3, 'Pendiente', '2026-10-22', 3600, 2, 1800);

insert into comprobante (id_comprobante, id_pedido, foto_comprobante, fecha, total)
values
  (1, 1, 'foto_transferencia_001.png', '2026-10-21', 5400),
  (2, 4, 'comprobante_prueba.jpg', '2026-10-21', 5000),
  (4, 6, 'comprobante_prueba_frontend.png', '2026-10-22', 2400);

insert into estados_comprobante (id_estado, id_pedido, estado, fecha)
values
  (1, 1, 'Comprobante Subido', '2026-10-21'),
  (2, 1, 'Aprobado por Admin', '2026-10-21');

insert into remitos_de_venta (id_remito, id_comprobante, id_cliente, fecha, total, producto_selec)
values
  (1, 2, 1, '2026-10-22', 5000, 'Crema Hidratante Facial'),
  (3, 4, 1, '2026-10-22', 3600, 'Jabón Líquido Neutro');

insert into alerta_de_estado (id_alerta, id_stock, fecha, mes, ano, porcentaje, descripcion, email_contacto)
values (1, 3, '2026-10-22', '10', '2026', 40, 'Alerta de stock', 'admin@ejemplo.com');

insert into admin (id_admin, dni, nombre, contrasenia)
values (1, '30111222', 'Admin Principal', 'admin123');

insert into roll (id_rol, descripcion_rol) values (1, 'Cliente'), (2, 'Administrador');
`;

describe('migración sobre el esquema legacy', () => {
  let db: Base;

  beforeAll(async () => {
    db = new PGlite();
    await db.waitReady;
    await db.exec(ESQUEMA_LEGACY);
    // Se corre con los roles y privilegios por defecto de Supabase ya presentes: es el
    // escenario real, y el único en el que `revoke ... from public` no alcanza.
    await simularPrivilegiosSupabase(db);
    await aplicarMigraciones(db);
  });

  afterAll(async () => {
    await db.close();
  });

  it('respalda las tablas legacy antes de reconstruirlas', async () => {
    const producto = await db.query<{ total: string }>(
      'select count(*)::text as total from respaldo_legacy.producto',
    );
    const cliente = await db.query<{ total: string }>(
      'select count(*)::text as total from respaldo_legacy.cliente',
    );
    const admin = await db.query<{ total: string }>(
      'select count(*)::text as total from respaldo_legacy.admin',
    );

    expect(producto.rows[0].total).toBe('3');
    expect(cliente.rows[0].total).toBe('1');
    expect(admin.rows[0].total).toBe('1');
  });

  it('deja el catálogo limpio de duplicados y sin columnas recíprocas', async () => {
    const { rows } = await db.query<{ total: string }>('select count(*)::text as total from producto');
    expect(rows[0].total).toBe('0');

    const columnas = await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns
        where table_schema = 'public'
          and table_name = 'producto'
          and column_name in ('id_stock', 'id_detalle_pedido')`,
    );
    expect(columnas.rows).toEqual([]);
  });

  it('conserva admin y roll para la fase 2 pero los cierra a la anon key', async () => {
    const tablas = await db.query<{ table_name: string }>(
      `select table_name from information_schema.tables
        where table_schema = 'public' and table_name in ('admin', 'roll')`,
    );
    expect(tablas.rows).toHaveLength(2);

    await expect(
      comoAnon(db, () => db.query('select * from admin')),
    ).rejects.toThrow(/permission denied|permiso denegado/i);
  });

  it('deja el esquema legacy inaccesible desde la anon key', async () => {
    await expect(
      comoAnon(db, () => db.query('select * from respaldo_legacy.producto')),
    ).rejects.toThrow(/permission denied|permiso denegado/i);
  });

  it('permite operar el flujo completo después de migrar', async () => {
    const cliente = await db.query<{ id_cliente: number }>(
      `insert into cliente (dni, nombre, email)
       values ('40111222', 'Cliente Nuevo', 'nuevo@ejemplo.com')
       returning id_cliente`,
    );
    const producto = await db.query<{ id_producto: number }>(
      `insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
       values ('Crema Nueva', 'Cosmética', 'Emulsión', 2500, 3)
       returning id_producto`,
    );
    const idProducto = producto.rows[0].id_producto;

    await db.query('update stock set cantidad_actual = 10 where id_producto = $1', [idProducto]);

    const pedido = await db.query<{ id_pedido: number; total: string }>(
      'select * from crear_pedido($1, $2::jsonb)',
      [cliente.rows[0].id_cliente, JSON.stringify([{ id_producto: idProducto, cantidad: 2 }])],
    );
    expect(Number(pedido.rows[0].total)).toBe(5000);

    const comprobante = await db.query<{ id_comprobante: number }>(
      `insert into comprobante (id_pedido, foto_url, monto)
       values ($1, 'comprobantes/nuevo.png', 5000)
       returning id_comprobante`,
      [pedido.rows[0].id_pedido],
    );

    const remito = await db.query<{ numero: string }>(
      'select * from aprobar_comprobante($1)',
      [comprobante.rows[0].id_comprobante],
    );
    expect(remito.rows[0].numero).toMatch(/^R-\d{4}-\d{6}$/);
  });
});
