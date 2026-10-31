/**
 * Módulo de dominio monetario — `dinero.ts` · Issue #55 (#44).
 *
 * Una sola regla para toda la app (tienda, carrito, panel, remito y checkout): el dinero del
 * modelo es `NUMERIC(12,2)`, así que la **aritmética y el redondeo ocurren acá**
 * (`redondearACentavos`, `subtotalDeLinea`, `totalDelPedido`) y la capa de presentación
 * (`src/lib/format.ts`) sólo formatea visualmente en la UI.
 */

/** Lleva un monto a la precisión del modelo: dos decimales, sin el error del punto flotante. */
export function redondearACentavos(monto: number): number {
  return Math.round((monto + Number.EPSILON) * 100) / 100;
}

/**
 * Subtotal de una línea: `precio × cantidad`, en la precisión del dinero (`NUMERIC(12,2)`).
 * Es la única forma de calcularlo: la usan el carrito, el checkout y el resumen del pedido.
 */
export function subtotalDeLinea(precio: number, cantidad: number): number {
  return redondearACentavos(precio * cantidad);
}

/**
 * Total del pedido: la suma de los subtotales **ya redondeados** (no de los productos crudos),
 * para que el resumen cierre línea por línea y coincida con lo que se cobra.
 */
export function totalDelPedido(
  items: Iterable<{ precio: number; cantidad: number }>,
): number {
  let suma = 0;
  for (const item of items) {
    suma += subtotalDeLinea(item.precio, item.cantidad);
  }
  return redondearACentavos(suma);
}
