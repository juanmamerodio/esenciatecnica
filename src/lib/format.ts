/**
 * Formateo visual de precios — `src/lib/format.ts` · Issue #55 (#44).
 *
 * Módulo de presentación estricto para la UI: la aritmética y las reglas de precisión del
 * dinero viven en `src/lib/dinero.ts`. La vista sólo formatea visualmente (`formatPrice`).
 */

/**
 * Formatea un monto como precio argentino, con formato adaptativo: un entero se muestra sin
 * decimales (`$ 3.000`) y un monto con centavos, con dos decimales exactos (`$ 4,50`).
 *
 * La vista elige cuántos decimales mostrar, pero **no redondea el valor**: el monto llega ya
 * redondeado por la aritmética (`redondearACentavos` de `src/lib/dinero.ts`).
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
