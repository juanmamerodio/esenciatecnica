/**
 * Formatea un número como precio argentino.
 * Ejemplo: 4500 → "$ 4.500"
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price);
}
