import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  comoRol,
  crearBase,
  crearCliente,
  crearProducto,
  simularPrivilegiosSupabase,
  type Base,
} from './ayudantes';

/**
 * RLS en el peor caso: la base ya trae los roles `anon`/`authenticated` con EXECUTE y
 * privilegios por defecto concedidos, como en un proyecto Supabase real.
 *
 * Un `revoke ... from public` NO alcanza en ese escenario: el grant directo sobrevive.
 * Este archivo existe para que esa falsa sensación de seguridad no vuelva a colarse.
 */
describe('RLS con los privilegios por defecto de Supabase', () => {
  let db: Base;
  let idActivo: number;

  beforeEach(async () => {
    db = await crearBase({ privilegiosSupabase: true });
    idActivo = await crearProducto(db, {
      nombre: 'Crema Visible',
      precio: 2500,
      cantidad: 10,
      reservada: 3,
    });
    await crearCliente(db, { dni: '40111222', email: 'cliente@ejemplo.com' });
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('cierra las RPC aunque exista el grant por defecto a anon', async () => {
    for (const llamada of [
      'select aprobar_comprobante(1)',
      'select rechazar_comprobante(1)',
      'select cancelar_pedidos_vencidos()',
      `select crear_pedido(1, '[{"id_producto":1,"cantidad":1}]'::jsonb)`,
    ]) {
      await expect(comoRol(db, 'anon', () => db.query(llamada)), llamada).rejects.toThrow(
        /permission denied|permiso denegado/i,
      );
    }
  });

  it('cierra las RPC para authenticated, no solo para anon', async () => {
    await expect(
      comoRol(db, 'authenticated', () => db.query('select cancelar_pedidos_vencidos()')),
    ).rejects.toThrow(/permission denied|permiso denegado/i);
  });

  it('no deja a anon leer las tablas con datos personales ni de negocio', async () => {
    // `admin` no existe en la base nueva (fase 2): se cubre en migracion-legacy.test.ts,
    // donde la tabla legacy sí está presente.
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
        comoRol(db, 'anon', () => db.query(`select * from ${tabla}`)),
        tabla,
      ).rejects.toThrow(/permission denied|permiso denegado/i);
    }
  });

  it('no deja a anon escribir pese a los privilegios por defecto sobre tablas y secuencias', async () => {
    for (const sql of [
      `insert into producto (nombre, categoria, tipo, precio, tiempo_produccion)
        values ('Intruso', 'Higiene', 'Sólido', 1, 1)`,
      `update producto set precio = 1 where id_producto = ${idActivo}`,
      `delete from producto where id_producto = ${idActivo}`,
      `select nextval('remito_numero_seq')`,
    ]) {
      await expect(comoRol(db, 'anon', () => db.exec(sql)), sql).rejects.toThrow(
        /permission denied|permiso denegado|no existe/i,
      );
    }
  });

  it('mantiene la lectura pública del catálogo', async () => {
    const { rows } = await comoRol(db, 'anon', () =>
      db.query<{ nombre: string; disponible: number }>('select nombre, disponible from vista_catalogo'),
    );

    expect(rows).toEqual([{ nombre: 'Crema Visible', disponible: 7 }]);
  });

  it('deja el respaldo legacy fuera del alcance de anon', async () => {
    await db.exec('create schema if not exists respaldo_legacy');
    await db.exec('create table if not exists respaldo_legacy.secreto (dato text)');
    await simularPrivilegiosSupabase(db);
    await db.exec('revoke all on schema respaldo_legacy from anon, authenticated');

    await expect(
      comoRol(db, 'anon', () => db.query('select * from respaldo_legacy.secreto')),
    ).rejects.toThrow(/permission denied|permiso denegado/i);
  });
});
