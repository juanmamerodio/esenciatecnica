import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { crearBase, crearProducto, type Base } from './ayudantes';

/**
 * Cierre beta · migración `06` (issue #17).
 *
 * Dos huecos que terminaban en un dato imposible o en un `23514` crudo:
 * - `producto.precio > 0`: un pedido de total 0 nunca se puede aprobar (`comprobante.monto > 0`).
 * - `ET007`: editar el stock por debajo de la reserva devuelve el código del dominio, no el
 *   `23514` de la constraint, para que el panel muestre un mensaje legible.
 *
 * El nombre activo duplicado ya lo garantiza el índice único (`23505`): acá se fija el código
 * que el panel traduce.
 */

async function codigoDeErrorDe(promesa: Promise<unknown>): Promise<string | null> {
  try {
    await promesa;
    return null;
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const codigo = (error as { code: unknown }).code;
      return typeof codigo === 'string' ? codigo : null;
    }
    return null;
  }
}

describe('migración 06 · precio > 0, ET007 y nombre duplicado', () => {
  let db: Base;

  beforeAll(async () => {
    db = await crearBase();
  });

  afterAll(async () => {
    await db.close();
  });

  it('rechaza un producto con precio 0 (antes lo aceptaba con >= 0)', async () => {
    const codigo = await codigoDeErrorDe(
      db.exec(`
        insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
        values ('Producto Gratis', 'Higiene', 'Sólido', 0, 1);
      `),
    );

    expect(codigo).toBe('23514');
    const { rows } = await db.query<{ total: string }>(
      "select count(*)::text as total from producto where nombre = 'Producto Gratis'",
    );
    expect(rows[0].total).toBe('0');
  });

  it('sigue aceptando un precio positivo', async () => {
    const { rows } = await db.query<{ precio: string }>(
      `insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
       values ('Producto Con Precio', 'Higiene', 'Sólido', 0.01, 1)
       returning precio::text`,
    );
    expect(rows[0].precio).toBe('0.01');
  });

  it('dejar cantidad_actual por debajo de la reserva devuelve ET007, no 23514', async () => {
    const idProducto = await crearProducto(db, {
      nombre: 'Producto Con Reserva',
      precio: 500,
      cantidad: 10,
      reservada: 4,
    });

    let capturado: unknown;
    try {
      await db.query('update stock set cantidad_actual = 3 where id_producto = $1', [idProducto]);
    } catch (error) {
      capturado = error;
    }

    expect(capturado).toMatchObject({ code: 'ET007' });
    expect((capturado as Error).message).toMatch(/reservad/i);

    const { rows } = await db.query<{ cantidad_actual: number; cantidad_reservada: number }>(
      'select cantidad_actual, cantidad_reservada from stock where id_producto = $1',
      [idProducto],
    );
    expect(rows[0]).toEqual({ cantidad_actual: 10, cantidad_reservada: 4 });
  });

  it('permite editar el stock mientras respete la reserva', async () => {
    const idProducto = await crearProducto(db, {
      nombre: 'Producto Editable',
      precio: 500,
      cantidad: 10,
      reservada: 4,
    });

    await db.query('update stock set cantidad_actual = 4 where id_producto = $1', [idProducto]);

    const { rows } = await db.query<{ cantidad_actual: number; disponible: number }>(
      'select cantidad_actual, cantidad_actual - cantidad_reservada as disponible from stock where id_producto = $1',
      [idProducto],
    );
    expect(rows[0]).toEqual({ cantidad_actual: 4, disponible: 0 });
  });

  it('un nombre activo repetido sigue devolviendo 23505', async () => {
    await crearProducto(db, { nombre: 'Crema Única', precio: 1000, cantidad: 5 });

    const codigo = await codigoDeErrorDe(
      db.exec(`
        insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
        values ('crema única', 'Cosmética', 'Emulsión', 1000, 1);
      `),
    );

    expect(codigo).toBe('23505');
  });

  it('la migración 06 se puede re-ejecutar en la ventana del SQL Editor', async () => {
    const sql = readFileSync(
      path.join(process.cwd(), 'supabase', 'migrations', '20261027120000_06_cierre_beta.sql'),
      'utf8',
    );

    await db.exec(sql);
    await db.exec(sql);

    // Comportamiento después de re-aplicarla: la regla sigue vigente una sola vez.
    const idProducto = await crearProducto(db, {
      nombre: 'Producto Re-ejecutado',
      precio: 500,
      cantidad: 10,
      reservada: 4,
    });
    let capturado: unknown;
    try {
      await db.query('update stock set cantidad_actual = 3 where id_producto = $1', [idProducto]);
    } catch (error) {
      capturado = error;
    }
    expect(capturado).toMatchObject({ code: 'ET007' });
  });
});
