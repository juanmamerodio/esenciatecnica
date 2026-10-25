/** Ayudantes compartidos por los componentes cliente del panel (T7 · issue #13). */

export type ResultadoDeAccion = { ok: true } | { ok: false; mensaje: string };

const SIN_RESPUESTA = "No pudimos comunicarnos con el panel. Revisá tu conexión y volvé a intentar.";

/**
 * Llama a una ruta del panel y devuelve el mensaje del dominio cuando algo falla. El panel está
 * detrás de Basic Auth: el navegador adjunta las credenciales del mismo origen que ya se usaron
 * para entrar, así que no hace falta manejarlas acá.
 */
export async function pedirAlPanel(ruta: string, opciones: RequestInit): Promise<ResultadoDeAccion> {
  try {
    const respuesta = await fetch(ruta, opciones);
    const cuerpo = (await respuesta.json()) as { estado?: unknown; mensaje?: unknown };
    const mensaje = typeof cuerpo.mensaje === "string" ? cuerpo.mensaje : null;

    if (!respuesta.ok || cuerpo.estado === "error") {
      return { ok: false, mensaje: mensaje ?? "No pudimos completar la acción." };
    }

    return { ok: true };
  } catch {
    return { ok: false, mensaje: SIN_RESPUESTA };
  }
}

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
