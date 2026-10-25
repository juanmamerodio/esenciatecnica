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
      'Crema Hidratante Facial',
      'Jabón Líquido Neutro',
    ]);
  });

  it('es idempotente: correrlo dos veces no duplica nada', async () => {
    const seed = readFileSync(path.join(process.cwd(), 'supabase', 'seed.sql'), 'utf8');
    await db.exec(seed);
    await db.exec(seed);

    const { rows } = await db.query<{ total: string }>('select count(*)::text as total from producto');
    expect(rows[0].total).toBe('2');
  });

  it('deja stock disponible coherente para vender', async () => {
    const { rows } = await db.query<{ nombre: string; disponible: number }>(
      'select nombre, disponible from vista_catalogo order by nombre',
    );

    expect(rows).toEqual([
      { nombre: 'Crema Hidratante Facial', disponible: 43 },
      { nombre: 'Jabón Líquido Neutro', disponible: 6 },
    ]);
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
