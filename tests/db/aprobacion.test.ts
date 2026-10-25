import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearBase, crearCliente, crearPedido, crearProducto, stockDe, type Base } from './ayudantes';

describe('aprobación, rechazo y vencimiento', () => {
  let db: Base;
  let idCliente: number;
  let idProducto: number;
  let idPedido: number;
  let idComprobante: number;

  beforeEach(async () => {
    db = await crearBase();
    idCliente = await crearCliente(db, { dni: '40111222', email: 'cliente@ejemplo.com' });
    idProducto = await crearProducto(db, { nombre: 'Jabón de Prueba', precio: 2500, cantidad: 10 });
    const pedido = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 3 }]);
    idPedido = pedido.id_pedido;

    const { rows } = await db.query<{ id_comprobante: number }>(
      `insert into comprobante (id_pedido, foto_url, monto)
       values ($1, 'comprobantes/prueba.png', 7500)
       returning id_comprobante`,
      [idPedido],
    );
    idComprobante = rows[0].id_comprobante;
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('al aprobar convierte la reserva en venta y emite un remito', async () => {
    const { rows } = await db.query<{ id_remito: number; numero: string; total: number }>(
      'select * from aprobar_comprobante($1)',
      [idComprobante],
    );

    expect(rows).toHaveLength(1);
    expect(Number(rows[0].total)).toBe(7500);
    expect(rows[0].numero).toMatch(/^R-\d{4}-\d{6}$/);
    expect(await stockDe(db, idProducto)).toEqual({ actual: 7, reservada: 0 });

    const pedido = await db.query<{ estado_actual: string }>(
      'select estado_actual from pedido where id_pedido = $1',
      [idPedido],
    );
    expect(pedido.rows[0].estado_actual).toBe('Pago Validado');

    const comprobante = await db.query<{ estado_actual: string }>(
      'select estado_actual from comprobante where id_comprobante = $1',
      [idComprobante],
    );
    expect(comprobante.rows[0].estado_actual).toBe('Aprobado por Admin');
  });

  it('registra el historial de ambos estados en la misma transacción', async () => {
    await db.query('select aprobar_comprobante($1)', [idComprobante]);

    const pedido = await db.query<{ estado: string }>(
      'select estado from estados_pedidos where id_pedido = $1 order by id_estado_pedido',
      [idPedido],
    );
    expect(pedido.rows.map((fila) => fila.estado)).toEqual(['Pendiente de Pago', 'Pago Validado']);

    const comprobante = await db.query<{ estado: string }>(
      'select estado from estados_comprobante where id_comprobante = $1 order by id_estado_comprobante',
      [idComprobante],
    );
    expect(comprobante.rows.map((fila) => fila.estado)).toEqual([
      'Comprobante Subido',
      'Aprobado por Admin',
    ]);
  });

  it('no aprueba si el monto del comprobante no coincide con el total', async () => {
    await db.query('update comprobante set monto = 5400 where id_comprobante = $1', [idComprobante]);

    await expect(
      db.query('select aprobar_comprobante($1)', [idComprobante]),
    ).rejects.toThrow(/monto no coincide/i);

    expect(await stockDe(db, idProducto)).toEqual({ actual: 10, reservada: 3 });
    const remitos = await db.query<{ total: string }>('select count(*)::text as total from remitos_de_venta');
    expect(remitos.rows[0].total).toBe('0');
  });

  it('no aprueba dos veces el mismo comprobante', async () => {
    await db.query('select aprobar_comprobante($1)', [idComprobante]);

    await expect(
      db.query('select aprobar_comprobante($1)', [idComprobante]),
    ).rejects.toThrow(/no está pendiente/i);

    const remitos = await db.query<{ total: string }>('select count(*)::text as total from remitos_de_venta');
    expect(remitos.rows[0].total).toBe('1');
  });

  it('garantiza un solo remito por comprobante a nivel de base', async () => {
    await db.query('select aprobar_comprobante($1)', [idComprobante]);

    await expect(
      db.query(
        `insert into remitos_de_venta (id_comprobante, id_cliente, total)
         values ($1, $2, 7500)`,
        [idComprobante, idCliente],
      ),
    ).rejects.toThrow(/duplicate key|llave duplicada|unique/i);
  });

  it('al rechazar libera la reserva y no descuenta stock', async () => {
    await db.query('select rechazar_comprobante($1)', [idComprobante]);

    expect(await stockDe(db, idProducto)).toEqual({ actual: 10, reservada: 0 });

    const pedido = await db.query<{ estado_actual: string }>(
      'select estado_actual from pedido where id_pedido = $1',
      [idPedido],
    );
    expect(pedido.rows[0].estado_actual).toBe('Rechazado');

    await expect(
      db.query('select aprobar_comprobante($1)', [idComprobante]),
    ).rejects.toThrow(/no está pendiente/i);
  });

  it('no permite un comprobante nuevo si el pedido ya fue rechazado', async () => {
    await db.query('select rechazar_comprobante($1)', [idComprobante]);

    await expect(
      db.query(
        `insert into comprobante (id_pedido, foto_url, monto)
         values ($1, 'comprobantes/reintento.png', 7500)`,
        [idPedido],
      ),
    ).rejects.toThrow(/no está pendiente de pago/i);
  });

  it('no permite dos comprobantes pendientes para el mismo pedido', async () => {
    await expect(
      db.query(
        `insert into comprobante (id_pedido, foto_url, monto)
         values ($1, 'comprobantes/duplicado.png', 7500)`,
        [idPedido],
      ),
    ).rejects.toThrow(/duplicate key|llave duplicada|unique/i);
  });

  it('cancela los pedidos vencidos y libera la reserva', async () => {
    const segundo = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 2 }]);

    const { rows } = await db.query<{ cancelar_pedidos_vencidos: number }>(
      'select cancelar_pedidos_vencidos()',
    );

    expect(rows[0].cancelar_pedidos_vencidos).toBe(2);
    expect(await stockDe(db, idProducto)).toEqual({ actual: 10, reservada: 0 });

    const estados = await db.query<{ estado_actual: string }>(
      'select estado_actual from pedido where id_pedido = any($1::int[]) order by id_pedido',
      [[idPedido, segundo.id_pedido]],
    );
    expect(estados.rows.map((fila) => fila.estado_actual)).toEqual(['Cancelado', 'Cancelado']);
  });

  it('no toca los pedidos ya pagados al cancelar vencidos', async () => {
    await db.query('select aprobar_comprobante($1)', [idComprobante]);
    const nuevo = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 1 }]);

    const { rows } = await db.query<{ cancelar_pedidos_vencidos: number }>(
      'select cancelar_pedidos_vencidos()',
    );

    expect(rows[0].cancelar_pedidos_vencidos).toBe(1);

    const pagado = await db.query<{ estado_actual: string }>(
      'select estado_actual from pedido where id_pedido = $1',
      [idPedido],
    );
    expect(pagado.rows[0].estado_actual).toBe('Pago Validado');

    const vencido = await db.query<{ estado_actual: string }>(
      'select estado_actual from pedido where id_pedido = $1',
      [nuevo.id_pedido],
    );
    expect(vencido.rows[0].estado_actual).toBe('Cancelado');
    expect(await stockDe(db, idProducto)).toEqual({ actual: 7, reservada: 0 });
  });

  it('marca como rechazado el comprobante pendiente del pedido vencido', async () => {
    await db.query('select cancelar_pedidos_vencidos()');

    const comprobante = await db.query<{ estado_actual: string }>(
      'select estado_actual from comprobante where id_comprobante = $1',
      [idComprobante],
    );
    expect(comprobante.rows[0].estado_actual).toBe('Rechazado');
  });

  it('es idempotente: correr el cron dos veces no libera la reserva dos veces', async () => {
    const primera = await db.query<{ cancelar_pedidos_vencidos: number }>(
      'select cancelar_pedidos_vencidos()',
    );
    expect(primera.rows[0].cancelar_pedidos_vencidos).toBe(1);

    // Si el cron se dispara de nuevo (reintento, dos instancias), no debe volver a restar.
    const segunda = await db.query<{ cancelar_pedidos_vencidos: number }>(
      'select cancelar_pedidos_vencidos()',
    );
    expect(segunda.rows[0].cancelar_pedidos_vencidos).toBe(0);

    expect(await stockDe(db, idProducto)).toEqual({ actual: 10, reservada: 0 });

    const historial = await db.query<{ estado: string }>(
      'select estado from estados_pedidos where id_pedido = $1 order by id_estado_pedido',
      [idPedido],
    );
    expect(historial.rows.map((fila) => fila.estado)).toEqual(['Pendiente de Pago', 'Cancelado']);
  });

  it('no aprueba un comprobante de un pedido ya cancelado', async () => {
    await db.query('select cancelar_pedidos_vencidos()');

    await expect(
      db.query('select aprobar_comprobante($1)', [idComprobante]),
    ).rejects.toThrow(/no está pendiente/i);
  });

  it('rechaza un estado de pedido fuera del catálogo canónico', async () => {
    await expect(
      db.query(`update pedido set estado_actual = 'En Preparación' where id_pedido = $1`, [idPedido]),
    ).rejects.toThrow(/pedido_estado_valido|check/i);
  });

  it('rechaza un total negativo', async () => {
    await expect(
      db.query('update pedido set total = -1 where id_pedido = $1', [idPedido]),
    ).rejects.toThrow(/pedido_total_no_negativo|check/i);
  });
});
