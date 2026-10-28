/**
 * Ayudantes de **transporte** de los componentes cliente del panel (T7 · issue #13).
 *
 * El formato de la fecha vivía acá y se fue a `src/lib/fecha.ts`: el que sólo quería formatear una
 * fecha no tiene por qué arrastrar `fetch` ni Zod (#35).
 */

import { z } from "zod";

export type ResultadoDeAccion =
  | {
      ok: true;
      /**
       * Aviso del dominio cuando la acción salió pero algo posterior no (HU-13): hoy lo usa la
       * aprobación del comprobante cuando la base emitió el remito y Resend no pudo mandar el
       * email. Nunca se descarta: el panel lo muestra en vez de un éxito pleno.
       */
      aviso?: string;
    }
  | { ok: false; mensaje: string };

const SIN_RESPUESTA = "No pudimos comunicarnos con el panel. Revisá tu conexión y volvé a intentar.";

/** El borde del panel siempre responde un objeto JSON; el `aviso` es opcional (HU-13). */
const CUERPO_DEL_PANEL = z
  .object({
    estado: z.unknown().optional(),
    mensaje: z.unknown().optional(),
    aviso: z.unknown().optional(),
  })
  .passthrough();

/**
 * Llama a una ruta del panel y devuelve el mensaje del dominio cuando algo falla. El panel está
 * detrás de Basic Auth: el navegador adjunta las credenciales del mismo origen que ya se usaron
 * para entrar, así que no hace falta manejarlas acá.
 */
export async function pedirAlPanel(ruta: string, opciones: RequestInit): Promise<ResultadoDeAccion> {
  try {
    const respuesta = await fetch(ruta, opciones);
    const revision = CUERPO_DEL_PANEL.safeParse(await respuesta.json());
    if (!revision.success) {
      return {
        ok: false,
        mensaje: "El panel devolvió una respuesta que no se entiende. Volvé a intentar.",
      };
    }

    const cuerpo = revision.data;
    const mensaje = typeof cuerpo.mensaje === "string" ? cuerpo.mensaje : null;

    if (!respuesta.ok || cuerpo.estado === "error") {
      return { ok: false, mensaje: mensaje ?? "No pudimos completar la acción." };
    }

    const aviso = typeof cuerpo.aviso === "string" && cuerpo.aviso.trim() ? cuerpo.aviso : null;
    return aviso ? { ok: true, aviso } : { ok: true };
  } catch {
    return { ok: false, mensaje: SIN_RESPUESTA };
  }
}
