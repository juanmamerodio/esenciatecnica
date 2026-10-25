import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const RAIZ = process.cwd();
const MIGRACIONES = path.join(RAIZ, 'supabase', 'migrations');

export type Base = PGlite;

/**
 * Levanta un PostgreSQL real (WASM) y aplica las migraciones en orden.
 * Sin red, sin Docker y sin tocar la base de producción.
 *
 * `privilegiosSupabase` reproduce lo que ya existe en un proyecto Supabase: los roles
 * `anon`/`authenticated` creados de antemano y con EXECUTE concedido por defecto sobre las
 * funciones nuevas. Sin esto, el test de RPC daría una falsa sensación de seguridad.
 */
export async function crearBase(
  opciones: { seed?: boolean; privilegiosSupabase?: boolean } = {},
): Promise<Base> {
  const db = new PGlite();
  await db.waitReady;

  if (opciones.privilegiosSupabase) {
    await simularPrivilegiosSupabase(db);
  }

  await aplicarMigraciones(db);

  if (opciones.seed) {
    await db.exec(readFileSync(path.join(RAIZ, 'supabase', 'seed.sql'), 'utf8'));
  }

  return db;
}

/** Roles y privilegios por defecto que Supabase ya tiene configurados. */
export async function simularPrivilegiosSupabase(db: Base): Promise<void> {
  await db.exec(
    [
      `do $$ begin
         if not exists (select 1 from pg_roles where rolname = 'anon') then
           create role anon noinherit;
         end if;
         if not exists (select 1 from pg_roles where rolname = 'authenticated') then
           create role authenticated noinherit;
         end if;
       end $$;`,
      'alter default privileges in schema public grant execute on functions to anon, authenticated;',
      'alter default privileges in schema public grant all on tables to anon, authenticated;',
      'alter default privileges in schema public grant all on sequences to anon, authenticated;',
      'grant usage on schema public to anon, authenticated;',
    ].join('\n'),
  );
}

/** Aplica `supabase/migrations/*.sql` en orden sobre una base ya abierta. */
export async function aplicarMigraciones(db: Base): Promise<void> {
  const archivos = readdirSync(MIGRACIONES)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort();

  for (const archivo of archivos) {
    await db.exec(readFileSync(path.join(MIGRACIONES, archivo), 'utf8'));
  }
}

/** Ejecuta como un rol de Supabase (`anon`, `authenticated`). */
export async function comoRol<T>(db: Base, rol: string, fn: () => Promise<T>): Promise<T> {
  await db.exec(`set role ${rol}`);
  try {
    return await fn();
  } finally {
    await db.exec('reset role');
  }
}

/** Ejecuta como `anon`: es el rol que expone la anon key en Supabase. */
export async function comoAnon<T>(db: Base, fn: () => Promise<T>): Promise<T> {
  return comoRol(db, 'anon', fn);
}

export async function crearCliente(db: Base, datos: { dni: string; email: string }): Promise<number> {
  const { rows } = await db.query<{ id_cliente: number }>(
    `insert into cliente (dni, nombre, email, telefono)
     values ($1, 'Cliente de Prueba', $2, '3491-000000')
     returning id_cliente`,
    [datos.dni, datos.email],
  );
  return rows[0].id_cliente;
}

export async function crearProducto(
  db: Base,
  datos: { nombre: string; precio: number; cantidad: number; reservada?: number; warning?: number },
): Promise<number> {
  const { rows } = await db.query<{ id_producto: number }>(
    `insert into producto (nombre, categoria, tipo, descripcion, precio, tiempo_produccion)
     values ($1, 'Cosmética', 'Emulsión', 'Producto de prueba', $2, 2)
     returning id_producto`,
    [datos.nombre, datos.precio],
  );
  const idProducto = rows[0].id_producto;
  await db.query(
    `update stock set cantidad_actual = $2, cantidad_reservada = $3, cantidad_warning = $4
     where id_producto = $1`,
    [idProducto, datos.cantidad, datos.reservada ?? 0, datos.warning ?? 0],
  );
  return idProducto;
}

export async function crearPedido(
  db: Base,
  idCliente: number,
  items: Array<{ id_producto: number; cantidad: number }>,
): Promise<{ id_pedido: number; total: number; estado_actual: string }> {
  const { rows } = await db.query<{ id_pedido: number; total: number; estado_actual: string }>(
    'select * from crear_pedido($1, $2::jsonb)',
    [idCliente, JSON.stringify(items)],
  );
  // PGlite devuelve `numeric` como string; PostgREST lo expone como número.
  return { ...rows[0], total: Number(rows[0].total) };
}

export async function stockDe(
  db: Base,
  idProducto: number,
): Promise<{ actual: number; reservada: number }> {
  const { rows } = await db.query<{ cantidad_actual: number; cantidad_reservada: number }>(
    'select cantidad_actual, cantidad_reservada from stock where id_producto = $1',
    [idProducto],
  );
  return { actual: rows[0].cantidad_actual, reservada: rows[0].cantidad_reservada };
}
