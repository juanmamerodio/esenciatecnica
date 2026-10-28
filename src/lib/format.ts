/**
 * Módulo del dinero — `formato-del-dinero` · issue #44.
 *
 * Una sola regla para toda la app (tienda, panel, remito y checkout): el dinero del modelo es
 * `NUMERIC(12,2)`, así que el **redondeo ocurre en la aritmética** (`redondearACentavos`) y la
 * vista sólo muestra el número (`formatPrice`). La vista no decide el valor.
 */

/** Lleva un monto a la precisión del modelo: dos decimales, sin el error del punto flotante. */
export function redondearACentavos(monto: number): number {
  return Math.round((monto + Number.EPSILON) * 100) / 100;
}

/**
 * Formatea un monto como precio argentino, con formato adaptativo: un entero se muestra sin
 * decimales (`$ 3.000`) y un monto con centavos, con dos decimales exactos (`$ 4,50`).
 *
 * La vista elige cuántos decimales mostrar, pero **no redondea el valor**: el monto llega ya
 * redondeado por la aritmética (`redondearACentavos`).
 *
 * Ejemplos: `3000 → "$ 3.000"`, `4.5 → "$ 4,50"`, `3001.65 → "$ 3.001,65"`.
 */
export function formatPrice(monto: number): string {
  const decimales = Number.isInteger(monto) ? 0 : 2;

  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(monto);
}
