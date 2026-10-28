/**
 * Comparación de secretos en tiempo constante.
 *
 * Vive en un módulo propio porque la usan dos bordes distintos —el Basic Auth del panel
 * (`admin-auth.ts`) y el `Bearer` del cron (`cron-auth.ts`)— y no conviene tener dos copias de la
 * misma primitiva. No se filtra cuántos caracteres coincidieron.
 */
export function coincideEnTiempoConstante(uno: string, otro: string): boolean {
  const a = new TextEncoder().encode(uno);
  const b = new TextEncoder().encode(otro);

  let diferencia = a.length ^ b.length;
  const largo = Math.max(a.length, b.length);
  for (let indice = 0; indice < largo; indice += 1) {
    diferencia |= (a[indice] ?? 0) ^ (b[indice] ?? 0);
  }

  return diferencia === 0;
}
