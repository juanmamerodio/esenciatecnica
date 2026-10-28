import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { crearBase, type Base } from './ayudantes';

describe('seed del catálogo', () => {
  let db: Base;

  beforeAll(async () => {
    db = await crearBase({ seed: true });
  });

  afterAll(async () => {
    await db.close();
  });

  it('deja el catálogo canónico sin duplicados', async () => {
    const { rows } = await db.query<{ nombre: string }>(
      'select nombre from producto order by nombre',
    );

    expect(rows.map((fila) => fila.nombre)).toEqual([
      'Alcohol en Gel',
      'Crema Hidratante Facial',
      'Jabón Líquido Neutro',
    ]);
  });

  it('es idempotente: correrlo dos veces no duplica nada', async () => {
    const seed = readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf8');
    await db.exec(seed);
    await db.exec(seed);

    const { rows } = await db.query<{ total: string }>('select count(*)::text as total from producto');
    expect(rows[0].total).toBe('3');

    const stock = await db.query<{ total: string }>('select count(*)::text as total from stock');
    expect(stock.rows[0].total).toBe('3');
  });

  it('deja stock disponible coherente para vender', async () => {
    const { rows } = await db.query<{ nombre: string; disponible: number }>(
      'select nombre, disponible from vista_catalogo order by nombre',
    );

    expect(rows).toEqual([
      { nombre: 'Alcohol en Gel', disponible: 24 },
      { nombre: 'Crema Hidratante Facial', disponible: 48 },
      { nombre: 'Jabón Líquido Neutro', disponible: 6 },
    ]);
  });

  it('no deja rutas locales muertas en imagen_url', async () => {
    const { rows } = await db.query<{ nombre: string; imagen_url: string | null }>(
      'select nombre, imagen_url from producto order by nombre',
    );

    for (const fila of rows) {
      expect(fila.imagen_url, fila.nombre).toBeNull();
    }
  });

  it('limpia una ruta local heredada del seed viejo al volver a correrlo', async () => {
    await db.query(
      `update producto set imagen_url = '/productos/crema-hidratante.jpg'
        where nombre = 'Crema Hidratante Facial'`,
    );

    await db.exec(readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf8'));

    const { rows } = await db.query<{ imagen_url: string | null }>(
      `select imagen_url from producto where nombre = 'Crema Hidratante Facial'`,
    );
    expect(rows[0].imagen_url).toBeNull();
  });

  it('genera la alerta de stock del producto por debajo del umbral', async () => {
    const { rows } = await db.query<{ mensaje: string; atendida: boolean }>(
      `select a.mensaje, a.atendida
         from alerta_de_estado a
         join stock s on s.id_stock = a.id_stock
         join producto p on p.id_producto = s.id_producto
        where p.nombre = 'Jabón Líquido Neutro'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].atendida).toBe(false);
    expect(rows[0].mensaje).toMatch(/Stock bajo/);
  });
});
