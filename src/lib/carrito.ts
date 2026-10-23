/**
 * Módulo de carrito — T4 · issue #9.
 *
 * Funciones puras: reciben el carrito y devuelven uno nuevo. No tocan la base, no reservan
 * stock y no saben nada del navegador; el adaptador de persistencia vive en
 * `src/lib/store.ts`. El carrito del MVP vive en el cliente (AGENTS §5.2): la reserva de
 * stock ocurre recién al confirmar el pedido (T5).
 */

/** Una línea del carrito: un producto, una sola vez. */
export type ItemCarrito = {
  id: number;
  nombre: string;
  precio: number;
  cantidad: number;
  /** Unidades disponibles cuando se agregó: el carrito no promete más que eso. */
  disponible: number;
};

/** Lo que necesita el carrito para agregar un producto del catálogo. */
export type ProductoParaAgregar = {
  id: number;
  nombre: string;
  precio: number;
  disponible: number;
};

export const CARRITO_VACIO: ItemCarrito[] = [];

export function agregar(
  items: ItemCarrito[],
  producto: ProductoParaAgregar,
  cantidad = 1,
): ItemCarrito[] {
  const aSumar = Math.trunc(cantidad);
  const disponible = Math.max(0, Math.trunc(producto.disponible));
  if (aSumar < 1 || disponible < 1) return items;

  const linea = items.find((item) => item.id === producto.id);
  const cantidadActual = linea?.cantidad ?? 0;
  const cantidadFinal = Math.min(cantidadActual + aSumar, disponible);
  if (cantidadFinal === cantidadActual && linea) return items;

  const actualizada: ItemCarrito = {
    id: producto.id,
    nombre: producto.nombre,
    precio: producto.precio,
    cantidad: cantidadFinal,
    disponible,
  };

  return linea
    ? items.map((item) => (item.id === producto.id ? actualizada : item))
    : [...items, actualizada];
}

export function cambiarCantidad(items: ItemCarrito[], id: number, cantidad: number): ItemCarrito[] {
  const linea = items.find((item) => item.id === id);
  if (!linea) return items;

  const pedida = Math.trunc(cantidad);
  if (pedida < 1) return quitar(items, id);

  const cantidadFinal = Math.min(pedida, Math.max(1, linea.disponible));
  if (cantidadFinal === linea.cantidad) return items;

  return items.map((item) => (item.id === id ? { ...item, cantidad: cantidadFinal } : item));
}

export function quitar(items: ItemCarrito[], id: number): ItemCarrito[] {
  return items.filter((item) => item.id !== id);
}

/** Total del pedido: la suma de los subtotales, en pesos con dos decimales. */
export function total(items: ItemCarrito[]): number {
  const suma = items.reduce((acumulado, item) => acumulado + item.precio * item.cantidad, 0);
  return Math.round((suma + Number.EPSILON) * 100) / 100;
}

/** Unidades del carrito (lo que muestra el contador del header), no líneas. */
export function totalUnidades(items: ItemCarrito[]): number {
  return items.reduce((acumulado, item) => acumulado + item.cantidad, 0);
}
