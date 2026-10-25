import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { crearBase, crearCliente, crearPedido, crearProducto, stockDe, type Base } from './ayudantes';

describe('crear_pedido · reserva de stock', () => {
  let db: Base;
  let idCliente: number;
  let idProducto: number;

  beforeEach(async () => {
    db = await crearBase();
    idCliente = await crearCliente(db, { dni: '40111222', email: 'cliente@ejemplo.com' });
    idProducto = await crearProducto(db, { nombre: 'Crema de Prueba', precio: 2500, cantidad: 10 });
  });

  afterEach(async () => {
    if (db) await db.close();
  });

  it('crea el pedido pendiente y reserva las unidades pedidas', async () => {
    const pedido = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 3 }]);

    expect(pedido.estado_actual).toBe('Pendiente de Pago');
    expect(pedido.total).toBe(7500);
    expect(await stockDe(db, idProducto)).toEqual({ actual: 10, reservada: 3 });
  });

  it('calcula el subtotal en la base y no confía en el precio del cliente', async () => {
    await db.query(
      'select * from crear_pedido($1, $2::jsonb)',
      [idCliente, JSON.stringify([{ id_producto: idProducto, cantidad: 2, precio_unitario: 1 }])],
    );

    const { rows } = await db.query<{ cantidad: number; precio_unitario: number; subtotal: number }>(
      'select cantidad, precio_unitario, subtotal from detalle_del_pedido',
    );

    expect(rows).toHaveLength(1);
    expect(Number(rows[0].precio_unitario)).toBe(2500);
    expect(Number(rows[0].subtotal)).toBe(5000);
  });

  it('registra el estado inicial en el historial', async () => {
    const pedido = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 1 }]);

    const { rows } = await db.query<{ estado: string }>(
      'select estado from estados_pedidos where id_pedido = $1',
      [pedido.id_pedido],
    );

    expect(rows.map((fila) => fila.estado)).toEqual(['Pendiente de Pago']);
  });

  it('rechaza el pedido si no hay stock disponible y no deja rastros', async () => {
    await expect(
      crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 11 }]),
    ).rejects.toThrow(/stock insuficiente/i);

    const pedidos = await db.query<{ total: string }>('select count(*)::text as total from pedido');
    expect(pedidos.rows[0].total).toBe('0');
    expect(await stockDe(db, idProducto)).toEqual({ actual: 10, reservada: 0 });
  });

  it('descuenta del disponible lo ya reservado, no solo el stock actual', async () => {
    await db.query('update stock set cantidad_reservada = 8 where id_producto = $1', [idProducto]);

    await expect(
      crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 3 }]),
    ).rejects.toThrow(/stock insuficiente/i);
  });

  it('rechaza productos inactivos o inexistentes', async () => {
    await db.query('update producto set activo = false where id_producto = $1', [idProducto]);

    await expect(
      crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 1 }]),
    ).rejects.toThrow(/no está disponible/i);

    await expect(
      crearPedido(db, idCliente, [{ id_producto: 999999, cantidad: 1 }]),
    ).rejects.toThrow(/no está disponible/i);
  });

  it('rechaza un carrito vacío, cantidades inválidas y productos repetidos', async () => {
    await expect(crearPedido(db, idCliente, [])).rejects.toThrow(/no tiene items/i);
    await expect(
      crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 0 }]),
    ).rejects.toThrow(/cantidad inválida/i);
    await expect(
      crearPedido(db, idCliente, [
        { id_producto: idProducto, cantidad: 1 },
        { id_producto: idProducto, cantidad: 2 },
      ]),
    ).rejects.toThrow(/repetido/i);
  });

  it('rechaza un cliente inexistente', async () => {
    await expect(
      crearPedido(db, 999999, [{ id_producto: idProducto, cantidad: 1 }]),
    ).rejects.toThrow(/cliente inexistente/i);
  });

  it('mantiene el total igual a la suma de subtotales al editar el detalle', async () => {
    const pedido = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 2 }]);

    await db.query(
      'update detalle_del_pedido set cantidad = 4 where id_pedido = $1',
      [pedido.id_pedido],
    );

    const { rows } = await db.query<{ total: number }>(
      'select total from pedido where id_pedido = $1',
      [pedido.id_pedido],
    );
    expect(Number(rows[0].total)).toBe(10000);
  });

  it('no permite borrar del pedido sin respetar el historial', async () => {
    const pedido = await crearPedido(db, idCliente, [{ id_producto: idProducto, cantidad: 1 }]);

    await db.query('delete from detalle_del_pedido where id_pedido = $1', [pedido.id_pedido]);

    const { rows } = await db.query<{ total: number }>(
      'select total from pedido where id_pedido = $1',
      [pedido.id_pedido],
    );
    expect(Number(rows[0].total)).toBe(0);
  });
});
