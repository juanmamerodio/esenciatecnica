import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { comoAnon, crearBase, crearCliente, crearProducto, type Base } from './ayudantes';

/**
 * Superficie pública de datos. La anon key es pública: cualquiera la tiene.
 * Si estos tests fallan, hay fuga de datos personales.
 */
describe('RLS · lo que puede hacer la anon key', () => {
  let db: Base;
  let idActivo: number;
  let idInactivo: number;

  beforeEach(async () => {
    db = await crearBase();
    idActivo = await crearProducto(db, { nombre: 'Crema Visible', precio: 2500, cantidad: 10, reservada: 3 });
    idInactivo = await crearProducto(db, { nombre: 'Crema Retirada', precio: 1000, cantidad: 5 });
    await db.query('update producto set activo = false where id_producto = $1', [idInactivo]);
    await crearCliente(db, { dni: '40111222', email: 'cliente@ejemplo.com' });
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('lee el catálogo pero solo productos activos', async () => {
    const { rows } = await comoAnon(db, () =>
      db.query<{ nombre: string }>('select nombre from producto order by nombre'),
    );

    expect(rows.map((fila) => fila.nombre)).toEqual(['Crema Visible']);
  });

  it('lee la vista de catálogo con el disponible calculado', async () => {
    const { rows } = await comoAnon(db, () =>
      db.query<{ nombre: string; disponible: number }>('select nombre, disponible from vista_catalogo'),
    );

    expect(rows).toEqual([{ nombre: 'Crema Visible', disponible: 7 }]);
  });

  it('expone el contrato completo del catálogo que necesita el front (HU-1)', async () => {
    await db.query(
      `update producto set imagen_url = '/productos/crema.jpg' where id_producto = $1`,
      [idActivo],
    );

    const { rows } = await comoAnon(db, () =>
      db.query<{
        id_producto: number;
        nombre: string;
        categoria: string;
        tipo: string;
        descripcion: string;
        precio: string;
        tiempo_produccion: number;
        imagen_url: string | null;
        cantidad_actual: number;
        cantidad_reservada: number;
        disponible: number;
        cantidad_warning: number;
      }>('select * from vista_catalogo'),
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id_producto: idActivo,
      nombre: 'Crema Visible',
      categoria: 'Cosmética',
      tipo: 'Emulsión',
      precio: '2500.00',
      imagen_url: '/productos/crema.jpg',
      cantidad_actual: 10,
      cantidad_reservada: 3,
      disponible: 7,
      cantidad_warning: 0,
    });
  });

  it('no expone los productos inactivos en el catálogo', async () => {
    await db.query('update producto set activo = false where id_producto = $1', [idInactivo]);

    const { rows } = await comoAnon(db, () =>
      db.query<{ id_producto: number }>('select id_producto from vista_catalogo'),
    );

    expect(rows.map((fila) => fila.id_producto)).not.toContain(idInactivo);
  });

  it('no puede leer clientes, pedidos, comprobantes, remitos ni alertas', async () => {
    for (const tabla of [
      'cliente',
      'pedido',
      'detalle_del_pedido',
      'comprobante',
      'estados_pedidos',
      'estados_comprobante',
      'remitos_de_venta',
      'alerta_de_estado',
    ]) {
      await expect(
        comoAnon(db, () => db.query(`select * from ${tabla}`)),
        tabla,
      ).rejects.toThrow(/permission denied|permiso denegado/i);
    }
  });

  it('no puede escribir en el catálogo', async () => {
    const intentos = [
      `insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
       values ('Intruso', 'Higiene', 'Sólido', 1, 1)`,
      `update producto set precio = 1 where id_producto = ${idActivo}`,
      `delete from producto where id_producto = ${idActivo}`,
      `update stock set cantidad_actual = 9999 where id_producto = ${idActivo}`,
    ];

    for (const sql of intentos) {
      await expect(comoAnon(db, () => db.exec(sql)), sql).rejects.toThrow(
        /permission denied|permiso denegado/i,
      );
    }
  });

  it('no puede ejecutar las RPC de administración', async () => {
    await expect(
      comoAnon(db, () => db.query('select aprobar_comprobante(1)')),
    ).rejects.toThrow(/permission denied|permiso denegado/i);

    await expect(
      comoAnon(db, () => db.query('select cancelar_pedidos_vencidos()')),
    ).rejects.toThrow(/permission denied|permiso denegado/i);
  });

  it('no puede crear pedidos directamente', async () => {
    await expect(
      comoAnon(db, () => db.query('select crear_pedido(1, $1::jsonb)', ['[]'])),
    ).rejects.toThrow(/permission denied|permiso denegado/i);
  });

  it('no expone la secuencia de remitos ni permite adivinarla', async () => {
    await expect(
      comoAnon(db, () => db.query(`select nextval('remito_numero_seq')`)),
    ).rejects.toThrow(/permission denied|permiso denegado|no existe/i);
  });
});
