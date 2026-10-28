import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { puertoSobre } from '../../src/lib/checkout-servidor';
import { leer } from '../front/ayudantes';
import type { Database } from '../../src/lib/database.types';
import { crearBase, crearCliente, type Base } from './ayudantes';
import { clienteFalso } from './postgrest-falso';

/**
 * #33 · El Cliente se busca por email normalizado, no por patrón (issue #25, hallazgo 1 · 🔴).
 *
 * `buscarCliente` usaba `ilike` con un email que Zod admite con `%`/`_`: un email como
 * `%@ejemplo.com` alcanzaba la fila de **otra persona** y el pedido quedaba a su nombre.
 *
 * El seam es el adaptador `puertoSobre` con el PostgREST falso sobre PGlite: SQL real, sin red. La
 * diferencia que se prueba es la del motor —`=` contra `ilike`—, no una función interna.
 */

const DNI = '40111222';

describe('#33 · un email con comodines no alcanza al Cliente de otra persona', () => {
  let db: Base;
  let puerto: ReturnType<typeof puertoSobre>;

  beforeEach(async () => {
    db = await crearBase();
    puerto = puertoSobre(clienteFalso(db) as unknown as SupabaseClient<Database>);
  });

  afterEach(async () => {
    await db.close();
  });

  it('el patrón `%@ejemplo.com` no encuentra la fila de la víctima', async () => {
    await crearCliente(db, { dni: DNI, email: 'victima@ejemplo.com' });

    expect(await puerto.buscarCliente('%@ejemplo.com')).toBeNull();
  });

  it('el patrón `_ictima@ejemplo.com` tampoco', async () => {
    await crearCliente(db, { dni: DNI, email: 'victima@ejemplo.com' });

    expect(await puerto.buscarCliente('_ictima@ejemplo.com')).toBeNull();
  });

  it('un email inexistente sigue sin encontrar a nadie', async () => {
    await crearCliente(db, { dni: DNI, email: 'victima@ejemplo.com' });

    expect(await puerto.buscarCliente('otra@ejemplo.com')).toBeNull();
  });
});

describe('#33 · el mismo email real encuentra siempre al mismo Cliente', () => {
  let db: Base;
  let puerto: ReturnType<typeof puertoSobre>;

  beforeEach(async () => {
    db = await crearBase();
    puerto = puertoSobre(clienteFalso(db) as unknown as SupabaseClient<Database>);
  });

  afterEach(async () => {
    await db.close();
  });

  it('con o sin mayúsculas devuelve la misma fila', async () => {
    const id = await crearCliente(db, { dni: DNI, email: 'juan@ejemplo.com' });

    expect(await puerto.buscarCliente('juan@ejemplo.com')).toEqual({ id_cliente: id });
    expect(await puerto.buscarCliente('JUAN@Ejemplo.com')).toEqual({ id_cliente: id });
    expect(await puerto.buscarCliente('  Juan@EJEMPLO.COM  ')).toEqual({ id_cliente: id });
  });

  it('no crea un Cliente nuevo cuando el email ya existe', async () => {
    const id = await crearCliente(db, { dni: DNI, email: 'juan@ejemplo.com' });

    const reutilizado = await puerto.crearCliente({
      nombre: 'Juan Pérez',
      email: 'JUAN@ejemplo.com',
      dni: DNI,
      telefono: null,
    });

    expect(reutilizado).toEqual({ id_cliente: id });
    const { rows } = await db.query<{ total: number }>('select count(*)::int as total from cliente');
    expect(rows[0]?.total).toBe(1);
  });
});

describe('#33 · el camino de carrera del alta reutiliza el Cliente correcto', () => {
  let db: Base;
  let puerto: ReturnType<typeof puertoSobre>;

  beforeEach(async () => {
    db = await crearBase();
    puerto = puertoSobre(clienteFalso(db) as unknown as SupabaseClient<Database>);
  });

  afterEach(async () => {
    await db.close();
  });

  it('un alta que choca con el índice único reutiliza la fila del email real', async () => {
    const primero = await crearCliente(db, { dni: DNI, email: 'juan@ejemplo.com' });

    const reutilizado = await puerto.crearCliente({
      nombre: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      dni: '40111333',
      telefono: null,
    });

    expect(reutilizado).toEqual({ id_cliente: primero });
  });

  it('no reutiliza la fila que matcheó por patrón', async () => {
    const victima = await crearCliente(db, { dni: DNI, email: 'victima@ejemplo.com' });
    // Una fila con el comodín literal: el índice único la acepta y el alta siguiente choca con ella.
    const comodin = await crearCliente(db, { dni: '40111333', email: '%@ejemplo.com' });

    const reutilizado = await puerto.crearCliente({
      nombre: 'Otra Persona',
      email: '%@ejemplo.com',
      dni: '40111444',
      telefono: null,
    });

    expect(reutilizado).toEqual({ id_cliente: comodin });
    expect(reutilizado.id_cliente).not.toBe(victima);
    const { rows } = await db.query<{ total: number }>('select count(*)::int as total from cliente');
    expect(rows[0]?.total).toBe(2);
  });
});

describe('#33 · el adaptador no vuelve a usar patrones', () => {
  const fuente = leer('src/lib/checkout-servidor.ts');

  it('no queda ningún `ilike` en el adaptador del checkout', () => {
    expect(fuente).not.toMatch(/ilike/);
  });

  it('busca por igualdad con el email normalizado', () => {
    expect(fuente).toMatch(/normalizarEmail/);
    expect(fuente).toMatch(/\.eq\(\s*"email"/);
  });
});
