import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { crearBase, type Base } from './ayudantes';

/**
 * Contrato estructural. El front se construye contra esta forma:
 * si un test de acá falla, el front se rompe.
 */
describe('contrato de la base MVP', () => {
  let db: Base;

  beforeAll(async () => {
    db = await crearBase();
  });

  afterAll(async () => {
    await db.close();
  });

  const columnas = async (tabla: string): Promise<string[]> => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name
         from information_schema.columns
        where table_schema = 'public' and table_name = $1
        order by ordinal_position`,
      [tabla],
    );
    return rows.map((fila) => fila.column_name);
  };

  it('expone exactamente las diez tablas del MVP, sin legacy de más', async () => {
    const { rows } = await db.query<{ tabla: string }>(
      `select table_name as tabla
         from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
        order by table_name`,
    );
    const tablas = rows.map((fila) => fila.tabla);

    expect(tablas).toEqual([
      'alerta_de_estado',
      'cliente',
      'comprobante',
      'detalle_del_pedido',
      'estados_comprobante',
      'estados_pedidos',
      'pedido',
      'producto',
      'remitos_de_venta',
      'stock',
    ]);

    // Las tablas del esquema viejo no deben sobrevivir en `public`.
    expect(tablas).not.toContain('productos');
    expect(tablas).not.toContain('pedidos');
    expect(tablas).not.toContain('verificaciones');
    expect(tablas).not.toContain('detalle_carrito');
  });

  it('producto no tiene FKs recíprocas y sí activo e imagen_url', async () => {
    const cols = await columnas('producto');

    expect(cols).toEqual(
      expect.arrayContaining([
        'id_producto',
        'nombre',
        'categoria',
        'tipo',
        'descripcion',
        'precio',
        'tiempo_produccion',
        'activo',
        'imagen_url',
      ]),
    );
    expect(cols).not.toContain('id_stock');
    expect(cols).not.toContain('id_detalle_pedido');
  });

  it('pedido guarda estado_actual y no una FK circular id_estado', async () => {
    const cols = await columnas('pedido');

    expect(cols).toContain('estado_actual');
    expect(cols).not.toContain('id_estado');
  });

  it('detalle_del_pedido tiene PK propia y subtotal generado', async () => {
    const cols = await columnas('detalle_del_pedido');

    expect(cols).toEqual(
      expect.arrayContaining(['id_detalle_pedido', 'id_pedido', 'id_producto', 'cantidad', 'precio_unitario', 'subtotal']),
    );
    expect(cols).not.toContain('total');
    expect(cols).not.toContain('estado');
    expect(cols).not.toContain('id_cliente');

    const { rows } = await db.query<{ is_generated: string; generation_expression: string }>(
      `select is_generated, generation_expression
         from information_schema.columns
        where table_name = 'detalle_del_pedido' and column_name = 'subtotal'`,
    );
    expect(rows[0]?.is_generated).toBe('ALWAYS');
    expect(rows[0]?.generation_expression).toContain('cantidad');
  });

  it('estados_comprobante cuelga del comprobante, no del pedido', async () => {
    const cols = await columnas('estados_comprobante');

    expect(cols).toContain('id_comprobante');
    expect(cols).not.toContain('id_pedido');
  });

  it('remitos_de_venta tiene numero único y no producto_selec', async () => {
    const cols = await columnas('remitos_de_venta');

    expect(cols).toContain('numero');
    expect(cols).not.toContain('producto_selec');
  });

  it('alerta_de_estado usa mensaje y atendida, sin columnas de email', async () => {
    const cols = await columnas('alerta_de_estado');

    expect(cols).toEqual(expect.arrayContaining(['id_alerta', 'id_stock', 'fecha', 'mensaje', 'atendida']));
    expect(cols).not.toContain('email_contacto');
    expect(cols).not.toContain('mes');
    expect(cols).not.toContain('ano');
  });

  it('el dinero es NUMERIC(12,2) en toda la cadena de venta', async () => {
    const { rows } = await db.query<{
      table_name: string;
      column_name: string;
      numeric_precision: number;
      numeric_scale: number;
    }>(
      `select table_name, column_name, numeric_precision, numeric_scale
         from information_schema.columns
        where table_schema = 'public'
          and data_type = 'numeric'
          and column_name in ('precio', 'total', 'monto', 'precio_unitario', 'subtotal')`,
    );

    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const fila of rows) {
      expect(fila.numeric_precision, `${fila.table_name}.${fila.column_name}`).toBe(12);
      expect(fila.numeric_scale, `${fila.table_name}.${fila.column_name}`).toBe(2);
    }
  });

  it('el stock es una fila por producto y no admite reservas por encima del actual', async () => {
    const { rows } = await db.query<{ column_name: string }>(
      `select column_name
         from information_schema.columns
        where table_name = 'stock' and column_name in ('categoria', 'tipo', 'descripcion', 'porcentaje')`,
    );
    expect(rows.map((fila) => fila.column_name)).toEqual([]);

    await db.exec(`
      insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
      values ('Producto Invariante', 'Higiene', 'Sólido', 100, 1);
      update stock set cantidad_actual = 2, cantidad_reservada = 2
       where id_producto = (select id_producto from producto where nombre = 'Producto Invariante');
    `);

    await expect(
      db.exec(`
        update stock set cantidad_reservada = 3
         where id_producto = (select id_producto from producto where nombre = 'Producto Invariante');
      `),
    ).rejects.toThrow(/stock_reserva_valida|reservada/i);
  });

  it('genera una fila de stock al crear un producto', async () => {
    const { rows } = await db.query<{ id_producto: number }>(
      `insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
       values ('Producto Con Stock Automático', 'Higiene', 'Líquido', 900, 2)
       returning id_producto`,
    );

    const stock = await db.query<{ cantidad_actual: number; cantidad_reservada: number }>(
      'select cantidad_actual, cantidad_reservada from stock where id_producto = $1',
      [rows[0].id_producto],
    );
    expect(stock.rows).toHaveLength(1);
    expect(stock.rows[0].cantidad_actual).toBe(0);
    expect(stock.rows[0].cantidad_reservada).toBe(0);
  });
});
