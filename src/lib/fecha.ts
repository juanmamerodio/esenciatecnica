/**
 * Formato de **fecha** del panel — `deuda-codigo-25-10` · hallazgo 11 (#35 · issue #25).
 *
 * `src/components/admin/comun.ts` mezclaba el transporte HTTP (`pedirAlPanel`, con `fetch` y Zod)
 * con el formato de la fecha: cualquiera que quería formatear una fecha arrastraba el transporte.
 * El formato vive acá, sin red y sin dependencias.
 */

/**
 * Fecha del panel en la hora de la Argentina. El huso va explícito para que el HTML del servidor
 * y el del navegador digan lo mismo (si no, React avisa por un desajuste de hidratación).
 */
export function fechaEnHoraArgentina(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
}
