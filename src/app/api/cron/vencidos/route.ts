import { manejarCron } from "@/lib/cron";
import { puertoCronServidor } from "@/lib/cron-servidor";

/**
 * Cron de vencidos — B4 · issue #18.
 *
 * Vercel Cron invoca el path con **GET** y `Authorization: Bearer <CRON_SECRET>` según
 * `vercel.json` (`59 2 * * 6` UTC = viernes 23:59 en Argentina). También se acepta **POST** para
 * poder dispararlo a mano con `curl` sin esperar al viernes. No es ejecutable por `anon`: sin el
 * secreto correcto responde `401` y sin configuración en el entorno (`CRON_SECRET` o llaves del
 * servidor), `503` explícito. Un fallo transitorio de conexión o de la base responde `500`.
 *
 * Fallback manual documentado en la spec `bd-mvp` §9.3: `select cancelar_pedidos_vencidos();`
 * desde el SQL Editor de Supabase.
 */

export const runtime = "nodejs";

async function manejar(peticion: Request) {
  return manejarCron(peticion, puertoCronServidor());
}

export async function GET(peticion: Request) {
  return manejar(peticion);
}

export async function POST(peticion: Request) {
  return manejar(peticion);
}
