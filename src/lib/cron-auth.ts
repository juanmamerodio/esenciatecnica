import { coincideEnTiempoConstante } from "./comparacion";

/**
 * Decisión del cron de vencidos — B4 · issue #18.
 *
 * Una sola función pública, `revisarCron(encabezado, secreto)`, con el mismo criterio que
 * `revisarBasicAuth`: el scheduler de Vercel manda `Authorization: Bearer <CRON_SECRET>` y este
 * módulo decide, sin red y sin runtime de Next. El scheduler real se verifica a mano una vez.
 *
 * - `sin-secreto`: falta `CRON_SECRET`. El borde responde `503` explícito y no `401`: un 401 mudo
 *   mandaría a buscar un secreto que no existe (AGENTS §7.10).
 * - `no-autorizado`: falta el encabezado, no es `Bearer` o el secreto no coincide.
 * - `ok`: se puede ejecutar la RPC.
 */

export type RevisionCron = "ok" | "sin-secreto" | "no-autorizado";

/** Esquema Bearer: `Bearer` + espacio + secreto. Vercel lo manda así, en minúsculas o mayúsculas. */
const ESQUEMA_BEARER = /^bearer\s+(\S+)$/i;

export function revisarCron(
  encabezado: string | null,
  secreto: string | null | undefined,
): RevisionCron {
  if (!secreto) return "sin-secreto";
  if (!encabezado || !encabezado.trim()) return "no-autorizado";

  const coincidencia = encabezado.trim().match(ESQUEMA_BEARER);
  if (!coincidencia) return "no-autorizado";

  return coincideEnTiempoConstante(coincidencia[1], secreto) ? "ok" : "no-autorizado";
}
